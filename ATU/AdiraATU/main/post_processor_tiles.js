/************************************************************
 * Post Processing Assign Tiles
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
const HATCH = requireBuiltin('bsHatch');
const PATH_SET = requireBuiltin('bsPathSet');

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
const UTIL = require('main/utility_functions.js');
const TILE = require('main/tileing.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const LASER = require('main/laser_designation.js');

exports.postprocessDivideHatchBlocksIntoTiles_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){

  let startTime = Date.now();
    
  let layerCount = layer_end_nr - layer_start_nr + 1;
  let modelCount = modelData.getModelCount();
    
  progress.initSteps(layerCount);
     
  let layerIterator = modelData.getPreferredLayerProcessingOrderIterator(
    layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
    
  while(layerIterator.isValid() && !progress.cancelled()){
    
    let layerNumber = layerIterator.getLayerNr();
    let layerZ = layerIterator.getLayerZ();
    let zUnit = modelData.getZUnit();
    let modelZero = modelData.getModel(0);
    let modelLayer = modelZero.maybeGetModelLayerByNr(layerNumber);
    
    if(!modelLayer) {
      process.printError("Couldn't get modelLayer " + layerNumber + " at " + layerZ + "mm"); 
      }
            
    let exposureArray = modelData.getLayerPolylineArray(layerNumber,
    POLY_IT.nLayerExposure,'rw');

    let allHatches = new HATCH.bsHatch();
    let tiledHatches = new HATCH.bsHatch();
    let nonContourHatch = new HATCH.bsHatch();  
    let contourHatch = new HATCH.bsHatch();  
    let polylineHatch = new HATCH.bsHatch();
     
    exposureArray.forEach(function(polyline) {
      
      polyline.setAttributeInt('modelIndex',polyline.getModelIndex());
      let typeId = polyline.getAttributeInt('type');      
      polyline.polylineToHatch(polylineHatch);
            
      //assign hatch to tiles according to their types
      if(typeId === CONST.typeDesignations.part_contour.value 
        || typeId === CONST.typeDesignations.downskin_contour.value 
        || typeId === CONST.typeDesignations.support_contour.value
        || typeId === CONST.typeDesignations.support_open_polyline.value 
        || typeId === CONST.typeDesignations.open_polyline.value)
      {
        // contour and open polyline - assign tileID and laser Options
        //1. contours reachable by single laser (does not alter the vectors)
        let bounds = polylineHatch.tryGetBounds2D();
        let tileTable = modelLayer.getAttribEx('tileTable');
        let isAssigned = assignSingleOpContours(polylineHatch, bounds, tileTable, modelData);

        //2. assign and clip hatches needing collaborating lasers (will cut vectors and create additional hatchblocks)
        if(!isAssigned){
          assignMultiOpContours(polylineHatch, bounds, tileTable, modelData, modelLayer);
        }
      } else if (typeId === CONST.typeDesignations.part_hatch.value 
        || typeId === CONST.typeDesignations.downskin_hatch.value 
        || typeId === CONST.typeDesignations.support_hatch.value)
      {
        // infill (does not alter any vectors)
        infillHatchOperations(polylineHatch,modelLayer,modelData,progress)
      } else {     
        process.printError('type ID unknown, type:' + type)
      }
     
      allHatches.moveDataFrom(polylineHatch)

      polylineHatch.makeEmpty()
      polyline.deletePolyline()
    });
       
    sortHatchblocksalongX(allHatches);
    UTIL.assignDurationtoHatchblocks(allHatches,modelData);
    let tileGroups = preCalculateDistribution(allHatches);
    allHatches = distributeLoadHatchBlocks(tileGroups,progress); 
    
    LASER.assignProcessParameters(allHatches,modelData,layerNumber,modelLayer); 
    allHatches = UTIL.removeEmptyHatches(allHatches,'tileID_3mf');
    sortByProcessingOrderAndPosition(allHatches);  
    modelLayer.createExposurePolylinesFromHatch(allHatches);
    
    layerIterator.next();
  };
 
  let endTime = Date.now()  
  process.print('tile: Calculation time: ' + (endTime - startTime) + ' ms');
}

function infillHatchOperations(hatches,modelLayer,modelData,progress){
  TP2TILE.assignHatchblocksToTiles(hatches,modelLayer);
  if(PARAM.getParamStr('laserAssignment', 'assignmentMode') === 'static'){
    LASER.staticDistribution(modelData,hatches,modelLayer);
    hatches=UTIL.adjustInterfaceVectors(hatches,modelLayer,false);

  } else {
    LASER.staticDistributionKeepVectors(modelData,hatches,modelLayer);  
  }
} 

function assignMultiOpContours(contourHatch, bounds, tileTable, modelData,modelLayer){  
  
  let resultingHatch = new HATCH.bsHatch();
  
  tileTable.forEach(function(tile){ // iterate through all tiles

    let hatch = contourHatch.clone(); 
    
    let offsetTileLimits = getMidwayInterfaceTileLimits(tile);
    // offset internal borders the shift
    const shiftXY = getShiftXY(tile.layerNr);
    offsetTileLimits = shiftInsideTileBorders(offsetTileLimits,tile,shiftXY);  
   
    let clippedHatch = UTIL.ClipHatchByRect(hatch,UTIL.get2DVecArrayFromLim(offsetTileLimits));
    clippedHatch.setAttributeInt('tileID_3mf',tile.tileID);
    //clippedHatch = UTIL.adjustContourInterface(clippedHatch,modelLayer,false);

    resultingHatch.moveDataFrom(clippedHatch);
  });//tile  
  
  LASER.staticDistribution(modelData,resultingHatch,modelLayer)
  //UTIL.adjustContourInterface(allHatches,thisLayer,true)
  UTIL.assignDurationtoHatchblocks(resultingHatch,modelData)
  contourHatch.makeEmpty();
  contourHatch.moveDataFrom(resultingHatch);
  return resultingHatch;    
};

function getMidwayInterfaceTileLimits(tile){
  let outline = tile.outline;
  if(outline === undefined) process.printError('unable to read outline'); 

  let overlap = tile.overlap;
  if(overlap === undefined) process.printError('unable to read overlap'); 
  
  let offsetValue = { x: Math.abs(tile.overlap.x/2),
                      y: Math.abs(tile.overlap.y/2)};
       
  let offsetTileLimits = getOffsetInsideTileBorders(tile.outline,tile,offsetValue);
                      
  return offsetTileLimits;
};

function getOffsetInsideTileBorders(outline,tile,offsetValue){
  let lim = outline;
  
  if(tile.tile_number != 1){
    lim.ymin += offsetValue.y
  };
  
  if(tile.tile_number != tile.requiredPasses.y){
     lim.ymax -= offsetValue.y
  };
    
  if(tile.passNumber != 1){
    lim.xmin += offsetValue.x;
  };
    
  if(tile.passNumber != tile.requiredPasses.x){
     lim.xmax -= offsetValue.x;
  };
  
  return lim; 
};

function shiftInsideTileBorders(outline,tile,offsetValue){
  let lim = outline;
  
  if(tile.tile_number != 1){
    lim.ymin += offsetValue.y
  };
  
  if(tile.tile_number != tile.requiredPasses.y){
     lim.ymax += offsetValue.y
  };
    
  if(tile.passNumber != 1){
    lim.xmin += offsetValue.x;
  };
    
  if(tile.passNumber != tile.requiredPasses.x){
     lim.xmax += offsetValue.x;
  };
  
  return lim; 
};
  
function getShiftXY (layerNumber){
  if(layerNumber === undefined) process.printError('unable to read layerNumber'); 
  return {x: getShift(layerNumber,0),
          y: getShift(layerNumber,1)}
};

function getShift(layerNumber,axis) {
  if(axis === undefined) process.printError('unable to read axis'); 
  
  let layerCount = !axis ? PARAM.getParamInt('tileing', 'number_x') : PARAM.getParamInt('tileing', 'number_y');
  let shiftIncrement =!axis ? PARAM.getParamReal('tileing', 'step_x') : PARAM.getParamReal('tileing', 'step_y');
  let middleLayer = Math.floor(layerCount / 2); // Determine the middle layer

  // Calculate the cycle position of the layer number
  let cyclePosition = layerNumber % layerCount;
      
  // Calculate the distance from the middle layer
  let distanceFromMiddle = cyclePosition - middleLayer;
      
  // Compute the shift value based on the distance from the middle layer
  let shiftValue = distanceFromMiddle * shiftIncrement;
  
  if (!shiftValue || shiftIncrement == 0) {
    shiftValue = 0;
  }
  return shiftValue;
};

function assignSingleOpContours(hatch, bounds, tileTable, modelData){
  let assignedSingle = false;
  
  tileTable.forEach(function(tile){ // iterate through all tiles
  
    if(!UTIL.isBoundsInside(bounds,tile.outline)) return;
    
    let hatchBlockIterator = hatch.getHatchBlockIterator();
    
    while(hatchBlockIterator.isValid()){  
      let hatchBlock = hatchBlockIterator.get();
      addTileIdToHatchBlock(hatchBlock,tile.tileID); 
      let singleScanOptions = LASER.getLasersAbleToFullyReachContourWithinTile(hatchBlock,tile,modelData);
      
      if(!singleScanOptions){
        hatchBlockIterator.next();
        continue;
      };
         
      singleScanOptions.forEach(function(laserId){
        hatchBlock.setAttributeInt('isSingleSource',1);
        assignedSingle = true;
        addBsidToHatchBlock(hatchBlock,laserId,tile.tileID);
      });
      hatchBlockIterator.next();
    }; // hatchBlock iterator
  }); // tile
  
  return assignedSingle;
};  

function addTileIdToHatchBlock(hatchBlock,thisTileId){
  if(hatchBlock.getAttributeInt('tileID_3mf') !== 0){ // already preallocated
    let overlapCount = hatchBlock.getAttributeInt('overlapTileCount');
    overlapCount++;
    hatchBlock.setAttributeInt('overlappingTile_' + overlapCount,thisTileId);
    hatchBlock.setAttributeInt('overlapTileCount',overlapCount);
  } else {
    hatchBlock.setAttributeInt('tileID_3mf',thisTileId);   
  };
};

function getBsid(type,laserIndex) {
  return (laserIndex*10 + type);
};

function addBsidToHatchBlock(hatchBlock,laserId,tileId){
  
  let bsid = getBsid(hatchBlock.getAttributeInt('type'),laserId);
  
  if(hatchBlock.getAttributeInt('bsid') !== 0){ // already preallocated
    let overlapCount = hatchBlock.getAttributeInt('overlapLaserCount');
    
    overlapCount++;

    hatchBlock.setAttributeInt('overlappingLaser_' + overlapCount.toString(),bsid);
    hatchBlock.setAttributeInt('overlapLaserCount',overlapCount);
  } else {
    hatchBlock.setAttributeInt('bsid',bsid);   
  };
};

function flattenIntoHatchBlock(tileGroups){
  let returnHatch = new HATCH.bsHatch();  
  Object.values(tileGroups).forEach(function(tile){
    Object.values(tile).forEach(function(type){
      Object.values(type.assignedHatchBlocks).forEach(function(hatchBlockArray){
        hatchBlockArray.forEach(function(hatchblock){
          returnHatch.addHatchBlock(hatchblock);
        });
      });
    });
  });
  return returnHatch;
}


function flattenTileTypeIntoHatchBlock(tileGroups){
  let returnHatch = new HATCH.bsHatch();  
  Object.values(tileGroups).forEach(function(tile){
    Object.values(tile).forEach(function(type){
      Object.values(type.assignedHatch).forEach(function(hatch){
        returnHatch.moveDataFrom(hatch);
      });
    });
  });
  return returnHatch;
}

function distributeLoadHatchBlocks(tileGroups,progress){
  Object.keys(tileGroups).forEach(function(tileKey){
    let thisTile = tileGroups[tileKey];    
    Object.values(thisTile).forEach(function(tileTypeObj){
      
      let ignoreList = [];
      while(Object.keys(tileTypeObj.openHatchBlocks).length !== 0 && !progress.cancelled()){
        
        // Step 1: find out what laser currently is attributed the least
        let leastLoadedLaser = Object.entries(tileTypeObj.loadInfo).reduce(function (min, current) {
            // Skip keys that are in the ignoreList
            if (ignoreList.includes(current[0])) {
                return min;
            }
            return current[1] < min[1] ? current : min;
        }, [null, Infinity])[0];

        let matchingEntries = Object.keys(tileTypeObj.openHatchBlocks).filter(function(key) {
            return key.includes(leastLoadedLaser);
        });
        
        if(matchingEntries.length === 0){
          ignoreList.push(leastLoadedLaser);
          continue;
          }
        
        let largestOpenGroupKey = [];
        // get the group with most unassigned scanning duratio
        matchingEntries.forEach(function(openGroupKey){
          largestOpenGroupKey = getExposureTimeSumOfHatchBlocksInArray(tileTypeObj.openHatchBlocks[openGroupKey]) 
          > getExposureTimeSumOfHatchBlocksInArray(tileTypeObj.openHatchBlocks[largestOpenGroupKey]) ? openGroupKey : largestOpenGroupKey;
        });  
            
        if(!largestOpenGroupKey){
          process.printError("Load Distribution: no hatchblock available to scanner " + smallestKey);
        }
        
        let listOpenHatchBlocks =  largestOpenGroupKey.match(/\d+/g).map(Number); // extract overlapping laser numbers

         // Step 2: Find the smallest and largest numbers
        const smallest = Math.min(...listOpenHatchBlocks);
        const largest = Math.max(...listOpenHatchBlocks);
          
        // Step 3: Check if leastLoadedLaser matches the smallest or largest
        
        let movingHatchBlock;
        if (leastLoadedLaser == smallest) { // shift
            movingHatchBlock = tileTypeObj.openHatchBlocks[largestOpenGroupKey].shift();
                      
        } else{ //pop
            movingHatchBlock = tileTypeObj.openHatchBlocks[largestOpenGroupKey].pop();
        }
        
        // Step 4: if the openhatchblock group is empty delete it and 
        // add if no more available for the key include it into the ignoreList
        if(tileTypeObj.openHatchBlocks[largestOpenGroupKey].length === 0){
          delete tileTypeObj.openHatchBlocks[largestOpenGroupKey];
            if(matchingEntries.length === 1){ 
            ignoreList.push(leastLoadedLaser)};
          }

        // Step 5: Update hatch Block Designation
        reassignAttributes(movingHatchBlock,leastLoadedLaser);

        // Step 6: include added time
        let exposureToAdd = movingHatchBlock.getAttributeInt('hatchExposureTime');
        tileTypeObj.loadInfo[leastLoadedLaser] += exposureToAdd;

        // Step 7: push hatchblock to 
        tileTypeObj.assignedHatchBlocks[leastLoadedLaser].push(movingHatchBlock);      
        
      };
    });
  });
  
  return flattenIntoHatchBlock(tileGroups);
};

function getExposureTimeSumOfHatchBlocksInArray(array){
  
  if (!array) return 0;
  
  let sum =  array.reduce( function (accumulator, currentValue){
    
    return accumulator + currentValue.getAttributeInt('hatchExposureTime'); 
    
    },0)
  
  return sum
};

function getExposureTimeHatch(hatch){
  if(!hatch || hatch.isEmpty()) return 0;
  return getExposureTimeSumOfHatchBlocksInArray(hatch.getHatchBlockArray());
};

function reassignAttributesHatch(hatch,laserId){
  let hatchBlockArray = hatch.getHatchBlockArray();
  hatchBlockArray.forEach(function(hatchBlock){
    reassignAttributes(hatchBlock,laserId);   
  });
}

function reassignAttributes(hatchBlock,laserId){
  let type = hatchBlock.getAttributeInt('type');
  let bsid = laserId * 10 + type;
  hatchBlock.setAttributeInt('bsid',bsid);
  hatchBlock.removeAttributes('overlapLaserCount');
  hatchBlock.removeAttributes('overlappingLaser_1');
  hatchBlock.removeAttributes('overlappingLaser_2');
  hatchBlock.removeAttributes('overlappingLaser_3');
  hatchBlock.removeAttributes('overlappingLaser_4');

};
  
function preCalculateDistribution(allHatches){
  
  let tileGroups = UTIL.getGroupedHatchObjectByTileType(allHatches);

  Object.keys(tileGroups).forEach(function(tileKey){
    
    let thisTile = tileGroups[tileKey];

    Object.keys(thisTile).forEach(function(typeKey){
    
      let thisType = thisTile[typeKey];
      let tileArray = thisType.getHatchBlockArray();

      thisType.loadInfo = {};
      thisType.openInfo = {};
      thisType.assignedHatchBlocks = {};
      thisType.assignedHatch = {};
      thisType.openHatchBlocks = {};
      thisType.openHatch = {};
      thisType.duration_us = null;
      thisType.idealLoad_us = null;
      thisType.sortedLeftToRight = isSortedLeftToRight(tileArray);
      
      tileArray.forEach(function(hatchBlock){
        
        let exposureTime = hatchBlock.getAttributeInt('hatchExposureTime');
        thisType.duration_us += exposureTime;
        thisType.idealLoad_us += exposureTime / PARAM.getParamInt('scanhead', 'laserCount');
        let laserID = Math.floor(hatchBlock.getAttributeInt('bsid')/10);
        
        let laserAssignTag = String(laserID);
        
        if (!thisType.loadInfo[laserAssignTag]) {
            thisType.loadInfo[laserAssignTag] = 0; // Initialize if it doesn't exist
            thisType.assignedHatchBlocks[laserAssignTag] = [];
            thisType.assignedHatch[laserAssignTag] = new HATCH.bsHatch();
        }

        let overLapCount = hatchBlock.getAttributeInt('overlapLaserCount');
        
        //assign hatcblocks that does not overlap
        if(!overLapCount){
          thisType.loadInfo[laserAssignTag] += exposureTime;
          thisType.assignedHatchBlocks[laserAssignTag].push(hatchBlock);
          thisType.assignedHatch[laserAssignTag].addHatchBlock(hatchBlock);
        } else {        
          let laserIdArray = [laserID];
          
          for(let i = 1 ; i < overLapCount+1 ; i++ ){
            let overlapAttributeTag = 'overlappingLaser_' + i;
            let overlapID = Math.floor(hatchBlock.getAttributeInt(overlapAttributeTag)/10);
            laserIdArray.push(overlapID);
            }
                
            laserIdArray.sort(function (a,b){
              return a-b;
            });
            
            let loadStorageTag = 'open';
            
            laserIdArray.forEach(function(laserId){
              loadStorageTag += '_' + laserId; //build distribution tag
            });
            
            if (!thisType.openHatchBlocks[loadStorageTag]) {
              thisType.openInfo[loadStorageTag] =  0; // Initialize if it doesn't exist
              thisType.openHatchBlocks[loadStorageTag] = [];
              thisType.openHatch[loadStorageTag] = new HATCH.bsHatch();
            }
            
            thisType.openHatchBlocks[loadStorageTag].push(hatchBlock);
            thisType.openHatch[loadStorageTag].addHatchBlock(hatchBlock);
            thisType.openInfo[loadStorageTag] += exposureTime;
          };
        }); //hatchblocks        
      }); //type
   }); //tile
   return tileGroups;
  };



function sortHatchblocksalongX(allHatches){
  
  let hatchBlockArray = allHatches.getHatchBlockArray(); 
  
  hatchBlockArray.sort(function(a, b) {

    let centerXA = a.getBounds2D().getCenter().x ;
    let centerXB = b.getBounds2D().getCenter().x ;

    return centerXA - centerXB;    
  });

  allHatches.makeEmpty();
  
  hatchBlockArray.forEach(function(hatchBlock){
    allHatches.addHatchBlock(hatchBlock);
    });  
}

function isSortedLeftToRight(tileArray){
  let firstHatchBlockCenterX = tileArray[0].getBounds2D().getCenter().x;
  let lastHatchBlockCenterX = tileArray[tileArray.length-1].getBounds2D().getCenter().x;

  if(firstHatchBlockCenterX > lastHatchBlockCenterX){
    return false
  }
  return true
}


  
function sortByProcessingOrderAndPosition(allHatches){
  
  let hatchBlockArray = allHatches.getHatchBlockArray();
  
  hatchBlockArray.sort(function(a,b){
    
    let aProccesingOrder = a.getAttributeInt('stripeId');
    let bProcessingOrder = b.getAttributeInt('stripeId');
    
    if(aProccesingOrder !== bProcessingOrder){
      return aProccesingOrder - bProcessingOrder;
    }
    
    let aMaxY = a.tryGetBounds2D().maxY;
    let bMaxY = b.tryGetBounds2D().maxY;
    
//     let aMaxY = a.tryGetBounds2D().getCenter().y;
//     let bMaxY = b.tryGetBounds2D().getCenter().y;
    
    return bMaxY - aMaxY;
  })
  
  allHatches.makeEmpty();
  
  hatchBlockArray.forEach(function(hatchBlock,index){
    //hatchBlock.setAttributeInt('_processing_order',index+1);
    allHatches.addHatchBlock(hatchBlock);
  })
  
};