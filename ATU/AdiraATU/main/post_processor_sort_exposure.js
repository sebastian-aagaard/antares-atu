/************************************************************
 * Post Processing
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


// -------- INCLUDES -------- //
const MODEL = requireBuiltin('bsModel');
const PARAM = requireBuiltin('bsParam');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const EXPOSURE = requireBuiltin('bsExposureTime');
const HATCH = requireBuiltin('bsHatch')

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
const UTIL = require('main/utility_functions.js');

/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.postprocessSortExposure_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
  
  let layerCount = layer_end_nr - layer_start_nr + 1;
  progress.initSteps(layerCount);

  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
     layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);

   while(layerIt.isValid() && !progress.cancelled()) {
     
      const layerNr = layerIt.getLayerNr();

      const tileTable_3mf = UTIL.getTileTable(modelData,layerNr);
     
      if (!tileTable_3mf) {
        process.printWarning("Nothing to postprocess in layer " + layerNr + ' / ' + layerIt.getLayerZ() + ' mm');
        layerIt.next();
        progress.step(1);
        continue;
        }

      const tileExposureData = mapTileExposureData(modelData,layerNr,tileTable_3mf);

      let exposureArray = createExposureArray(tileExposureData);
     
      sortProcessingOrderWithinTile(exposureArray);  
        
      fillVoidsinExposureArray(exposureArray);
   
      let sortedExposureArray = sortMovementDirectionOfTiles(exposureArray);
        
      sortedExposureArray = trimAwayEmptyLeadingAndTrailingTiles(sortedExposureArray);

      combineIntoTypes(sortedExposureArray);

      mergeHatchBlocks(sortedExposureArray);

      getExposureDuration(sortedExposureArray,modelData);
      
      createDurationExportData(sortedExposureArray,modelData,layerNr);
        
      getTileExposureDuration(sortedExposureArray,modelData);
              
      deletePolylines(sortedExposureArray);

      updateProcessingOrder(sortedExposureArray,modelData,layerNr); // <- actual change the duration of the hatchblocks
        
      EXP3MF.createExporter3mf(sortedExposureArray,layerIt,modelData,layerNr);
    
      layerIt.next();
      progress.step(1);
   };
} // postprocessSortExposure_MT

//-----------------------------------------------------------------------------------------//

const createDurationExportData =  function(sortedExposureArray,modelData,layerNr){
  
  let laserCount = PARAM.getParamInt("scanhead", "laserCount");
  let data = "tile, type, ";
  
  for(let laserNumber = 1; laserNumber <= laserCount; laserNumber++){
    data += 'laser' + laserNumber + ', ';
  }
  
  data  += 'mean, min, max, longestIdleTime, standard deviation, coefficient of variation, distribution efficiency \n'
    
  sortedExposureArray.forEach(function(pass){
    pass.forEach(function(tile){
      Object.keys(tile.exposureDurationTypes).forEach(function(typeKey){
        data += tile.tileID + ', ' + typeKey + ', ';
        let laser = tile.exposureDurationTypes[typeKey].laser;
        let durationArray = [];
        for(let laserNumber = 1; laserNumber <= laserCount; laserNumber++){
          if(!laser[laserNumber]){
            data += '0, ';
            durationArray.push(0);
          }else{
            let duration = laser[laserNumber]
            data += duration + ', '
            durationArray.push(duration);
            
            }
        }
        
          let stats = getMeanandStandardDeviation(durationArray);
          
          let min = Math.min( ...durationArray);
          let max = Math.max( ...durationArray);
          let idleTime = max-min;
          let CV = stats.stdev/stats.mean;
          let efficiency = 1- CV;
        
        data += stats.mean +', '+ min + ', '+ max + ', '+ idleTime +', ' + stats.stdev.toFixed(3) + ', ' + CV.toFixed(3) + ', ' + efficiency.toFixed(3) + '\n' 

        });
      });
    });
      
  modelData.getModel(0).setAttribEx('durationLog_layer' + layerNr,data);
    
};

function getMeanandStandardDeviation(arr) {
  if (!arr.length) return 0;

  // 1) Calculate the mean (average)
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;

  // 2) Calculate the variance
  //    (average of the squared differences from the mean)
  const variance = arr.reduce((acc, val) => {
    const diff = val - mean;
    return acc + diff * diff;
  }, 0) / arr.length;

  // 3) Return the square root of the variance
  return { mean : mean,
           stdev : Math.sqrt(variance)};
}

//-----------------------------------------------------------------------------------------//

const mergeHatchBlocks = function(sortedExposureArray){
   sortedExposureArray.forEach(function(pass) {
    pass.forEach(function(tile) {
      Object.values(tile.type).forEach(function(type) {
        let t = 0;
        Object.values(type).forEach(function(laser) {
          Object.values(laser).forEach(function(hatch) {
            
            hatch.removeAttributes(['patternX','patternY', 'hatchExposureTime','stripeId']);
            hatch.setAttributeInt('_processing_order',0);
            process.print('b: ' + hatch.getHatchBlockCount());
            hatch.mergeHatchBlocks({
              "bConvertToHatchMode": true,
              "bCheckAttributes": true
            });
            process.print('a: ' + hatch.getHatchBlockCount());
          });        
        });
      });
    });
  });  
}

//-----------------------------------------------------------------------------------------//

const combineIntoTypes = function (sortedExposureArray){
  sortedExposureArray.forEach(function(pass) {
    pass.forEach(function(tile) {
      tile.type = {}; // Reset or initialize tile.type
      tile.exposure.forEach(function(polyline) {
        let typeId = polyline.getAttributeInt('type');
        let laserId = Math.floor(polyline.getAttributeInt('bsid') / 10);

        if (!tile.type[typeId]) {
          tile.type[typeId] = {};
        }
        
        if (!tile.type[typeId].laser) {
          tile.type[typeId].laser = {};
        }
        
        if (!tile.type[typeId].laser[laserId]) {
          tile.type[typeId].laser[laserId] = new HATCH.bsHatch();
        }
        polyline.polylineToHatch(tile.type[typeId].laser[laserId]);
      });
    });
  });  
}; 

const sortProcessingOrderWithinTile = function(exposureArray) {
  
  exposureArray.forEach(function (pass){
    pass.forEach(function (tile){
      tile.exposure = groupAndSortExposure(tile.exposure);
    })
  })
}//sortProcessingOrderWithinTile

function groupAndSortExposure(exposure) {
    // Step 1: Group exposure by modelIndex and check if islandId === 0 exists
    var groups = {};

    exposure.forEach(function(polyline) {
        var modelIndex = polyline.getModelIndex();
        var islandId = polyline.getAttributeInt('islandId');

        if (!groups[modelIndex]) {
            groups[modelIndex] = { hasIslandIdZero: false, polylines: [] };
        }

        // If any polyline has islandId === 0, set the flag to merge the whole group
        // this should only be valid for open polylines
        if (islandId === 0) {
            groups[modelIndex].hasIslandIdZero = true;
        }

        groups[modelIndex].polylines.push(polyline);
    });

    // Step 2: Handle merging all islands into islandId === 0 if needed
    var mergedGroups = Object.keys(groups).map(function(modelIndex) {
        var group = groups[modelIndex];

        // If islandId === 0 exists in this modelIndex, merge all into the islandId === 0 container
        if (group.hasIslandIdZero) {
            group.polylines.forEach(function(polyline) {
                // Set all islandId to 0 for this group
                polyline.setAttributeInt('islandId', 0);
            });
        }

        // Sort each group by priority and position
        group.polylines.sort(function(a, b) {
            // Sort by priority (ascending order)
            let priorityA = a.getAttributeInt('priority');
            let priorityB = b.getAttributeInt('priority');

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
// 
            // Sort by position
            let maxYA = a.tryGetBounds2D().maxY;
            let maxYB = b.tryGetBounds2D().maxY;

            // Sort by maxY (largest first)
            if (maxYA !== maxYB && PARAM.getParamInt('sortingMode','scanningOrder')) {
                return maxYB - maxYA;
            }
//             
            let stripeIdA = a.getAttributeInt('stripeId');
            let stripeIdB = b.getAttributeInt('stripeId');
            
            if (stripeIdA !== stripeIdB){
              return stripeIdA - stripeIdB  // Sort by stripeId in decending order    
            }
            
            let laserIdA = Math.floor(a.getAttributeInt('bsid')/10);
            let laserIdB = Math.floor(b.getAttributeInt('bsid')/10);

            return laserIdA - laserIdB; 
        });
        
                // Sort each group by priority and position
        group.polylines.sort(function(a, b) {
          
            let laserIdA = Math.floor(a.getAttributeInt('bsid')/10);
            let laserIdB = Math.floor(b.getAttributeInt('bsid')/10);

            return laserIdA - laserIdB; 
        });

        return group.polylines;
    });

    // Step 3: Sort groups based on the object with the largest maxY in the group
    mergedGroups.sort(function(groupA, groupB) {
        // Find the object with the largest maxY in each group
        var maxYA = Math.max.apply(null, groupA.map(function(obj) {
            return obj.tryGetBounds2D().maxY;
        }));

        var maxYB = Math.max.apply(null, groupB.map(function(obj) {
            return obj.tryGetBounds2D().maxY;
        }));

        // Sort the groups by the largest maxY in the group (largest first)
        return maxYB - maxYA;
    });

    // Step 4: Flatten the sorted groups back into a single array
    var sortedObjects = [];
    mergedGroups.forEach(function(group) {
        sortedObjects.push.apply(sortedObjects, group);
    });

    return sortedObjects;
}

const trimAwayEmptyLeadingAndTrailingTiles = function(exposureArray) {
  exposureArray = exposureArray.filter(function(pass) {
    // Remove leading zeroes
    while (pass.length > 0 && pass[0].exposureTime === 0) {
      pass.shift();
    }
    // Remove trailing zeroes
    while (pass.length > 0 && pass[pass.length - 1].exposureTime === 0) {
      pass.pop();
    }
    // Return true if the pass is not empty, false if it is empty (filtering out empty passes)
    return pass.length > 0;
  });
  return exposureArray;
};

const fillVoidsinExposureArray = function(exposureArray) {
  
    exposureArray.forEach(function(pass) {
        if (pass.length > 0) {
            // Find the minimum and maximum tileID in this pass
            const minTileID = Math.min.apply(null, pass.map(function(tile) {
                return tile.tileID;
            }));
            const maxTileID = Math.max.apply(null, pass.map(function(tile) {
                return tile.tileID;
            }));

            // Ensure every tileID from min to max is present
            for (let tileID = minTileID; tileID <= maxTileID; tileID++) {
              
                let isTileIdMissing = !pass.some(function(tile) {
                    return tile.tileID === tileID;
                });

                if (isTileIdMissing) {
                    // If tileID is missing, append it with default structure
                    
                    throw new Error("error in function fillVoidsinExposureArray");
                  
                    pass.push({
                        tileID: tileID,
                        xcoord: thisTile.attributes.xcoord,
                        ycoord: thisTile.attributes.ycoord,
                        exposure: []
                    });
                }
            }
        }
    });

    exposureArray.forEach(function(pass) {
        pass.sort(function(a, b) {
            return a.tileID - b.tileID;
        });
    });
}; // fillVoidsinExposureArray


const createExposureArray = function(tileObj) {
    let exposureArray = [];

    // Iterate over each tile in the tileObj
    Object.keys(tileObj).forEach(function(tileID) {
        const tile = tileObj[tileID];
        const passNumber = Math.floor(tileID / 1000); // Use tileID to determine the pass

        // Ensure there is an array to hold the current pass's tiles
        if (!exposureArray[passNumber]) {
            exposureArray[passNumber] = [];
        }

        // Add the tile to the appropriate pass
        exposureArray[passNumber].push(tile);
    });

    // Filter out any empty entries if passes are not sequential
    return exposureArray.filter(function(pass) {
        return pass !== undefined;
    });
};

const getTileExposureDuration = function(exposureArray, modelData) {
  
  exposureArray.forEach(function(pass) {
    pass.forEach(function(tile) {
      // Initialize an object to store exposure durations for each laser
      let exposureTimeObj = {};
      let skywritingTime = {};
      let nextLaserStartPos = {};
      let tileHeight = tile.tileHeight;
      
      tile.laserExposureTime = {};
      tile.exposureTime = 0;      

      tile.exposure.forEach(function(cur, curIndex) {
        const cur_bsid = cur.getAttributeInt('bsid');
        const laserID = Math.floor(cur_bsid / 10); // Calculate the laser ID
        
        const scanParamters = modelData
          .getModel(cur.getModelIndex())
          .getAttribEx('customTable')
          .find(function(profile) {
            return profile.bsid === cur_bsid;
          })
          .attributes
          .find(function(attr) {
            return attr.schema === CONST.scanningSchema;
          });
        
        const scanner = JSON.parse(modelData
          .getTrayAttrib('scanhead_array'))
          .find(function(scn) {
            return scn.laserIndex === laserID;
          });
        
        const laserStartPos = {
          'x': cur.getAttributeReal('xcoord') + scanner.x_ref,
          'y': cur.getAttributeReal('ycoord') + tileHeight 
        }; 
         
        const exposureSettings = {
          'fJumpSpeed': scanParamters.jumpSpeed,
          'fMeltSpeed': cur.getAttributeReal('speed'),
          'fJumpLengthLimit': scanParamters.jumpLengthLimit,
          'nJumpDelay': scanParamters.jumpDelay,
          'nMinJumpDelay': scanParamters.minJumpDelay,
          'nMarkDelay': scanParamters.markDelay,
          'nPolygonDelay': scanParamters.polygonDelay,
          'polygonDelayMode': scanParamters.polygonDelayMode,
          'laserPos': laserStartPos
        };  
          
        nextLaserStartPos[laserID] = {
          'x': laserStartPos.x,
          'y': laserStartPos.y + (cur.getAttributeInt('bMoveFromFront') ? tileHeight : -tileHeight)
        };
 
        // If the laser ID doesn't exist in tile.laserDuration, create a new entry
        if (tile.laserExposureTime[laserID] === undefined) {
          exposureTimeObj[laserID] = new EXPOSURE.bsExposureTime();
          exposureTimeObj[laserID].configure(exposureSettings);
          
          skywritingTime[laserID] = 0;
          tile.laserExposureTime[laserID] = 0;
        }

        // Add polyline to the corresponding laser exposure time
        exposureTimeObj[laserID].addPolyline(cur, exposureSettings);

        // Get the added duration caused by skywriting
        skywritingTime[laserID] += getSkywritingDuration(cur, modelData);
        
        // At last exposure polyline add position jump to next start pos plus added duration from skywriting
        if (curIndex === tile.exposure.length - 1) {
          Object.keys(exposureTimeObj).forEach(function(key) {
            exposureTimeObj[key].setLaserPosition(
              nextLaserStartPos[key].x,
              nextLaserStartPos[key].y,
              'jump'
            );

            // Get exposure time of each laser in tile
            tile.laserExposureTime[key] = exposureTimeObj[key].getExposureTimeMicroSeconds();
            tile.laserExposureTime[key] += skywritingTime[key];
            tile.laserExposureTime[key] += PARAM.getParamInt('tileing','tileBufferDuration_us');

            // Update the maximum exposure time for the tile
            tile.exposureTime = Math.max(tile.exposureTime, tile.laserExposureTime[key]);
          });
        }
      });
    });
  });
};

const getExposureDuration = function(exposureArray, modelData) {
  
  exposureArray.forEach(function(pass) {
    pass.forEach(function(tile) {
      
      tile.exposureDurationTypes = {};
      Object.keys(tile.type).forEach(function(typeKey) {
        Object.keys(tile.type[typeKey].laser).forEach(function(laserId){
          let typeId = +typeKey;
          let hatch = tile.type[typeId].laser[laserId];
          let bsid = laserId*10 + typeId;
      
          if(!tile.exposureDurationTypes[typeKey]){
            tile.exposureDurationTypes[typeKey] = {}
          };
          
          if(!tile.exposureDurationTypes[typeKey].laser){
            tile.exposureDurationTypes[typeKey].laser = {}
          };
          
          if(!tile.exposureDurationTypes[typeKey].laser[laserId]){
            tile.exposureDurationTypes[typeKey].laser[laserId] = {}
          };
          let exposureDuration = UTIL.assignDurationtoHatchblocks(hatch,modelData);
          tile.exposureDurationTypes[typeKey].laser[laserId] = exposureDuration;
          });
        });
    });
  });
};

const getSkywritingDuration = function(cur,modelData){
  
  const skyWritingParamters = modelData
          .getModel(cur.getModelIndex())
          .getAttribEx('customTable')
          .find(function(profile){return profile.bsid === cur.getAttributeInt('bsid')})
          .attributes
          .find(function(attr){return attr.schema === CONST.skywritingSchema});

  let skywritingPostConst,skywritingPrevConst;

  if (skyWritingParamters.mode == 0) {
    //no skywriting
    skywritingPostConst = 0; 
    skywritingPrevConst = 0;
    
    } else if (skyWritingParamters.mode == 1 ) {
    //skywriting mode 1
    skywritingPostConst = 20;
    skywritingPrevConst = 20;  
    
  }  else if (skyWritingParamters.mode >= 2) { 
     //skywriting mode 2 and 3
     skywritingPostConst = 10; 
     skywritingPrevConst = 10; 
    }
  
  
  const polylineMode = cur.getPolylineMode()
  let skywritingOccurances = 0;
  
    
  if(polylineMode == 0 ||polylineMode == 1) { //closed or open polyline
    
  //process.print(polylineMode);  

    const pointCount = cur.getPointCount();
    const args = {
       "bAttributes" : false,
       "nStartIndex" : 0,
       "nEndIndex" : pointCount-1};
       
    const polylinePointArray = cur.getPointArray(args);
          
     skywritingOccurances += getSkywritingCountForPolyline(polylinePointArray,skyWritingParamters);
     skywritingOccurances += .5; // add extra instance for stop
     skywritingOccurances += 1; // all polylines will start with a skywriting mode 1 move  

    } else if (polylineMode == 2) { //hatch
    
      let skipcount = cur.getSkipCount();
      skywritingOccurances += skipcount*2;
      skywritingOccurances += 1; // add extra instance for start and stop
      
    } else if (polylineMode === 3) { // mode invalid
    
      throw new Error("polyline mode invalid");
      
    }
    

  let npostDur = skyWritingParamters.npost*skywritingPostConst;
  let nprevDur = skyWritingParamters.nprev*skywritingPrevConst;
    
  return (npostDur + nprevDur)*skywritingOccurances;
}

const getSkywritingCountForPolyline = function(points,skyWritingParamters){
  
  let count = 2; // adding to instances for start and stop.
  
    for (let i = 1; i < points.length - 1; i++) {
        const currentPoint = points[i].vec;
        const previousPoint = points[i-1].vec;
        const nextPoint = points[i+1].vec;
        const angleBetweenVectors = currentPoint.getAngleDeg(previousPoint, nextPoint);
        const angularChangeDeg = 180-angleBetweenVectors;
        const angularChangeRad = angularChangeDeg * (Math.PI / 180); // Convert to radians  
        const cosTheta = Math.cos(angularChangeRad);
        
        if (cosTheta < skyWritingParamters.limit) count++;
    }
    
    return count; 
}  

const mapTileExposureData = function(modelData, layerNr, tileTable_3mf){
  let exposurePolylineIt = modelData.getFirstLayerPolyline(layerNr, POLY_IT.nLayerExposure, 'rw');
  let tileExposureObj = {};
    
  // front load tileExposureObj
  tileTable_3mf.forEach(function(pass){
    pass.forEach(function(tile){
      tileExposureObj[tile.attributes.tileID] = {        
        tileID: tile.attributes.tileID,
        xcoord: tile.attributes.xcoord,
        ycoord: tile.attributes.ycoord,
        tileHeight: tile.attributes.tileHeight,
        exposure: []
        }
      });
    });

  while (exposurePolylineIt.isValid()) {
    const thisExposurePolyline = exposurePolylineIt.clone();
    const tileID = thisExposurePolyline.getAttributeInt('tileID_3mf');
    
    // Add the polyline to the exposures array for this tileID
    tileExposureObj[tileID].exposure.push(thisExposurePolyline);

    // Move to the next polyline
    exposurePolylineIt.next();
  }

  // Return the object containing all tile data
  return tileExposureObj;
}; //mapTileExposureData


const deletePolylines = function(sortedExposureArray){
  sortedExposureArray.forEach(function(pass){ 
    pass.forEach(function(tile){ 
      tile.exposure.forEach(function(polyline){
        polyline.deletePolyline();
      })
    })
  });
};

const updateProcessingOrder = function(sortedExposureArray,modelData,layerNumber){

  let processingOrder = 0;
  
  sortedExposureArray.forEach(function(pass){ 
    pass.forEach(function(tile){ 
      Object.values(tile.type).forEach(function(type){
        Object.values(type).forEach(function(laser){
          Object.values(laser).forEach(function(hatch){
            
            hatch.removeAttributes(['patternX','patternY', 'hatchExposureTime','stripeId']);
            let hatchblockArray  = hatch.getHatchBlockArray();
            hatchblockArray.forEach(function(hatchblock){
              hatchblock.setAttributeInt('_processing_order',processingOrder++);
              let modelId = hatchblock.getAttributeInt('modelIndex');
              let model = modelData.getModel(modelId);
              let modelLayer = model.getModelLayerByNr(layerNumber);
              modelLayer.createExposurePolylinesFromHatch(hatchblock);
              });
                  

            let t = 0;
            
          }) 
        })
      })
    })
  });
} //updateProcessingOrder

const sortMovementDirectionOfTiles = function(tileExposureArray){

  const isFirstPassFrontToBack = PARAM.getParamInt('movementSettings','isFirstPassFrontToBack'); 
  const isPassDirectionAlternating = PARAM.getParamInt('movementSettings','isPassDirectionAlternating'); 
  
  // filter out false values  
  const filteredExposureArray =  tileExposureArray.filter(function(entry){
    return entry;
  });
    
  filteredExposureArray.forEach(function(entry, index){
    let bFromFront = true;
    
    if ((index % 2 === 0 || !isPassDirectionAlternating) === !isFirstPassFrontToBack) {
      entry.sort().reverse();
      bFromFront = false;
    };
    
    entry.forEach(function(obj){obj.ProcessHeadFromFront = bFromFront});        
  });
  return filteredExposureArray;
}; // sortMovementDirectionOfTiles