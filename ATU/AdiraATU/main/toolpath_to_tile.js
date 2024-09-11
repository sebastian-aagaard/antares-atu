/************************************************************
 * Toolpath Indexing
 *
 * @author Sebasitan Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
const MODEL = requireBuiltin('bsModel');
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const CONST = require('main/constants.js');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const VEC2 = requireBuiltin('vec2');
const SEG2D = requireBuiltin('seg2d');
const UTIL = require('main/utility_functions.js');
const PATH_SET = requireBuiltin('bsPathSet');
// ----- TOC ----- //


// ----- CODE ---- //

exports.assignToolpathToTiles = function(bsModel,nLayerNr,allHatches) {

  let thisLayer = bsModel.getModelLayerByNr(nLayerNr);
  let tileArray = thisLayer.getAttribEx('tileTable');
  
  if(!tileArray) throw new Error("tileArray empty, layer: " + nLayerNr + ", model: " + bsModel.getAttribEx("ModelName"));
 
  /////////////////////////////////////
  /// sort tilearray by tile number  ///
  //////////////////////////////////////
    
  if(tileArray.length > 1){
    tileArray.sort(function(a, b) {
      return a.tile_number - b.tile_number;
    });
  }
  
  ///////////////////////////////////////////////////
  /// generate containers for hatching and islands ///
  ////////////////////////////////////////////////////
  
  let vec2_tile_array = new Array();
  let tileSegmentArray = new Array();
  let assignedHatch = allHatches.clone(); 

  /////////////////////////////////////////////////////////////
  ///                 Index hatces to tiles                 ///
  /// (passnumber, tile_index, scanhead xcoord and ycoord)  ///
  /////////////////////////////////////////////////////////////

  for(let j = 0; j<tileArray.length;j++)
    {
      
      // get the coordinates of the current tile 
      let tile_x_min = tileArray[j].scanhead_outline[0].m_coord[0]//
      let tile_x_max = tileArray[j].scanhead_outline[2].m_coord[0]//
      let tile_y_min = tileArray[j].scanhead_outline[0].m_coord[1];//
      let tile_y_max = tileArray[j].scanhead_outline[2].m_coord[1];//
      let tile_y_cen = (tile_y_min+tile_y_max)/2;
      let tile_x_cen = (tile_x_min+tile_x_max)/2;
      
      
      //if tileoverlap is greater than requested
      if(tileArray[j].overlapX < PARAM.getParamReal('tileing','tile_overlap_x')){
      
        let halfOverlap = Math.abs(tileArray[j].overlapX/2);
        let overLapCompensation = halfOverlap + PARAM.getParamReal('tileing','tile_overlap_x')/2;
           
        switch(tileArray[j].passNumber) {
          case 1:
            tile_x_max -= overLapCompensation-PARAM.getParamReal('stripeOverlapAllocation','firstOverlapShift');//
            break;
          case 2:
            tile_x_min += overLapCompensation+PARAM.getParamReal('stripeOverlapAllocation','firstOverlapShift');
            //if there is 3 passes
            if(tileArray[j].requiredPassesX>2){
              tile_x_max -= overLapCompensation-PARAM.getParamReal('stripeOverlapAllocation','secondOverlapShift');
              }           
            break;
          case 3:
            tile_x_min += overLapCompensation+PARAM.getParamReal('stripeOverlapAllocation','secondOverlapShift');
            break;
          };  
         };
     // CREATE CLIPPING MASK
       
     if(tileArray[j].overlapY < PARAM.getParamReal('tileing', 'tile_overlap_y')){
      
      let overLapCompensationY = (Math.abs(tileArray[j].overlapY) + PARAM.getParamReal('tileing','tile_overlap_y'))/2;
       
      if(tileArray[j].tile_number !== 1 && tileArray[j].tile_number !== tileArray[j].requiredPassesY) {
           
           tile_y_min += overLapCompensationY;
           tile_y_max -= overLapCompensationY;
           
           } else if(tileArray[j].tile_number === 1) {
           
           tile_y_max -= overLapCompensationY;
           
        } else if(tileArray[j].tile_number === tileArray[j].requiredPassesY) {
           
             tile_y_min += overLapCompensationY;
           
        };
      };   
         
      // add the corrdinates to vector pointset
      let tile_points = new Array(4);
      tile_points[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
      tile_points[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
      tile_points[2] = new VEC2.Vec2(tile_x_max, tile_y_max); // max,max
      tile_points[3] = new VEC2.Vec2(tile_x_max, tile_y_min); // max,min

      //vec2_tile_array[j] =  tile_points;  
      
      // clip allHatches to get hatches within this tile
      let tileHatch = UTIL.ClipHatchByRect(assignedHatch,tile_points,true);
      let tileHatch_outside = UTIL.ClipHatchByRect(assignedHatch,tile_points,false);
        
      assignedHatch.makeEmpty();
      
      let tileID_3mf = tileArray[j].tile_number+(tileArray[j].passNumber)*1000;
      
      anotateTileIntefaceHatchblocks(tileHatch,tileID_3mf);
        
      // assign tileID to hatches within tile
      tileHatch.setAttributeInt('tileID_3mf',tileID_3mf);
          
      assignedHatch.moveDataFrom(tileHatch);
      assignedHatch.moveDataFrom(tileHatch_outside);
        
    } //for
        
    return assignedHatch;
    
} //assignToolpathToTiles


const anotateTileIntefaceHatchblocks = function(hatch,tileID) {

  let hatchBlockIterator = hatch.getHatchBlockIterator();

  while (hatchBlockIterator.isValid()) {   
    let thisHatchBlock = hatchBlockIterator.get();

        let prevTileID = thisHatchBlock.getAttributeInt('tileID_3mf');       
       
        if (prevTileID > 0 ){
          
          let overlapNumber = +thisHatchBlock.getAttributeInt('numberofOverlappingTiles');
          
          if(overlapNumber == 0) {
            thisHatchBlock.setAttributeInt('overlappingTile_1',prevTileID);
            overlapNumber++;
            };
          
          overlapNumber++;
                             
          let overlapping_designation = 'overlappingTile_' + overlapNumber.toString();
          
          thisHatchBlock.setAttributeInt(overlapping_designation,tileID);
          thisHatchBlock.setAttributeInt('numberofOverlappingTiles',overlapNumber);
                      
        };  

    hatchBlockIterator.next();
    };
  };

exports.sortHatchBlocks = function(thisModel,nLayerNr,allHatches){
 
  const thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  const tileSegmentArray = thisLayer.getAttribEx('tileSegmentArray');
  
  const sortingArguments = {
    sSegRegionFillingMode             : "NegativeY",
    bInvertFillingSequence            : false,
    fSegRegionFillingGridSize         : 0.0,
    sSetAssignedRegionIndexMemberName : "regionIndex"
    };
    
    allHatches.sortHatchBlocksForMinDistToSegments(tileSegmentArray,0,sortingArguments);
      
    return allHatches;
};

exports.adjustInterfaceVectors = function(allHatches,thisLayer){

  let hatchBlockIterator = allHatches.getHatchBlockIterator();
  let resultHatch = new HATCH.bsHatch();

  while (hatchBlockIterator.isValid()) {   
    
    let thisHatchBlock = hatchBlockIterator.get();
    let overlapNumber = thisHatchBlock.getAttributeInt('numberofOverlappingTiles');
    
    if(overlapNumber === 0) {
      
        resultHatch.addHatchBlock(thisHatchBlock);
      
      } else {
        
        let adjustedHatch = applyInterface(thisHatchBlock);
        
        adjustedHatch.mergeHatchBlocks({
          "bConvertToHatchMode": true,
          "bCheckAttributes": true
        });
        
        resultHatch.moveDataFrom(adjustedHatch);
    }
    
  hatchBlockIterator.next();
    
  };
  
  return resultHatch;
}; // adjustInterfaceVectors

const applyInterface = function(hatchBlock){
  
  //if(hatchBlock.isEmpty()) return;  
  
  let firstTileId = hatchBlock.getAttributeInt('overlappingTile_1');
  let secondTileId = hatchBlock.getAttributeInt('overlappingTile_2');
  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  let borderIndex = hatchBlock.getAttributeInt('borderIndex');
  let subType = hatchBlock.getModelSubtype();
    
  let isSameStripe = Math.floor(firstTileId / 1000) === Math.floor(secondTileId / 1000);

  let overlappingHatch = new HATCH.bsHatch();
  overlappingHatch.addHatchBlock(hatchBlock);
  
  let overLappingPathSet = new PATH_SET.bsPathSet();
  
  let firstOverlapPathsSet = new PATH_SET.bsPathSet();
  let secondOverlapPathsSet = new PATH_SET.bsPathSet(); 

  overLappingPathSet.addHatches(overlappingHatch);
  
  overLappingPathSet = UTIL.preDistributeNonFullInterfaceVectors(overLappingPathSet,firstOverlapPathsSet,secondOverlapPathsSet,isSameStripe);
  
  let pathCount = overLappingPathSet.getPathCount();
  
  let shouldVectorsOverlap = UTIL.doesTypeOverlap(hatchType,true);
    
  for(let pathNumber = 0 ; pathNumber < pathCount; pathNumber++){
    
    if (pathNumber % 2 !== 0 || shouldVectorsOverlap) {
      firstOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      }
      
    if (pathNumber % 2 === 0 || shouldVectorsOverlap) {
      secondOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      
    }
  }
  
  UTIL.adjustZipperInterfaceDistance(isSameStripe,firstOverlapPathsSet,secondOverlapPathsSet,hatchType);
  
  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  let addPathArgs = {
     nModelSubtype : subType,
     nOpenPathPolylineMode : POLY_IT.nPolyOpen,
     nOpenPathTryPolyClosedPolylineModeTol : 0.0,
     nClosedPathPolylineMode : POLY_IT.nPolyClosed,
     bMergePolyHatch : false,
     bTwoPointsPathAsPolyHatch : false
  };
    
  firstHatch.addPathsExt(firstOverlapPathsSet,addPathArgs);
  secondHatch.addPathsExt(secondOverlapPathsSet,addPathArgs);
  
  firstHatch.setAttributeInt('tileID_3mf', firstTileId);
  secondHatch.setAttributeInt('tileID_3mf', secondTileId);
    
  let adjustedHatch = new HATCH.bsHatch();

  adjustedHatch.moveDataFrom(firstHatch);
  adjustedHatch.moveDataFrom(secondHatch);

  adjustedHatch.setAttributeInt('type',hatchType);
  adjustedHatch.setAttributeInt('islandId',islandId);
  (borderIndex === 0) ? null : adjustedHatch.setAttributeInt('borderIndex',borderIndex);
  
  return adjustedHatch; 
}; 

exports.mergeShortLines = function(hatch){

  const minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
  const maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
  
  hatch.mergeShortLines(hatch,minVectorLenght,maxMergeDistance,
    HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode);

  return hatch;
  
} //handleShortLines

exports.deleteShortHatchLines = function (hatch) {
  
  const minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
  
  let resultHatch = new HATCH.bsHatch();
  let hatchBlockIterator = hatch.getHatchBlockIterator();
  
  while(hatchBlockIterator.isValid()){
        
    let hatchBlock = hatchBlockIterator.get();
    let type = hatchBlock.getAttributeInt('type');
    
    if (type === 1 || type === 3 || type === 5) {
      
        hatchBlock.deleteShortLines(minVectorLenght);
        
      };    
    
    if(!hatchBlock.isEmpty()){
      
      resultHatch.addHatchBlock(hatchBlock);
      
      };
      
    hatchBlockIterator.next();
  };
  
  return resultHatch;
  };

exports.mergeInterfaceVectors = function(hatch) {

    let groupedHatchblocksByTileType = UTIL.getGroupedHatchObjectByTileType(hatch);
    let returnHatch = new HATCH.bsHatch();

    // Merge hatch blocks for each type (1, 3, 5) separately
    Object.values(groupedHatchblocksByTileType).forEach(function(tile) {
        Object.entries(tile).forEach(function(entryType) {
            let type = +entryType[0];
            let typeHatch = entryType[1];
            
            if(type === 1 || type === 3 || type === 5){ //hatch types
              
              typeHatch.mergeShortLines(
                  typeHatch,PARAM.getParamReal('exposure','min_vector_lenght'), 0.001,
                  HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
              );
              
            } else { // non hatch types

            typeHatch = UTIL.connectHatchBlocksSetAttributes(typeHatch);     
            }
            returnHatch.moveDataFrom(typeHatch);
        });
    });
    
    return returnHatch;
}; // mergeInterfaceVectors

  
exports.rearrangeHatchblocks = function(hatch) {
    let returnHatch = new HATCH.bsHatch();
    let hatchBlocksArray = hatch.getHatchBlockArray();
  
    // Create an object to hold arrays of hatchBlocksArray grouped by tileID
    let groupedHatchblocks = {};
  
    // Iterate through each hatchblock
    hatchBlocksArray.forEach(function(hatchblock) {
        // Get the tileID of the current hatchblock
        let tileID = hatchblock.getAttributeInt('tileID_3mf');
      
        // If the tileID does not exist in the groupedHatchblocks object, create a new array for it
        if (!groupedHatchblocks[tileID]) {
            groupedHatchblocks[tileID] = [];
        }
      
        // Add the hatchblock to the appropriate array based on its tileID
        groupedHatchblocks[tileID].push(hatchblock);
    });

    Object.values(groupedHatchblocks).forEach(function(groupOfHatchBlocksIntile) {
      
      let tileHatch = new HATCH.bsHatch();
      
      Object.values(groupOfHatchBlocksIntile).forEach(function(hatchBlock) {
        
        tileHatch.addHatchBlock(hatchBlock);
        
        });
        
        let hatchBlockArray = tileHatch.getHatchBlockArray();
        let xcoord = hatchBlockArray[0].getAttributeReal('xcoord');
        let ycoord = hatchBlockArray[0].getAttributeReal('ycoord');
        
        xcoord += 1000;
        ycoord += PARAM.getParamReal('tileing','tile_size');
        
       let bounds = tileHatch.getBounds2D();
       let center = bounds.getCenter(); 
        
        
        let hotspot = new VEC2.Vec2(center.maxX,bounds.maxY);
        
        tileHatch.pathReordering(hotspot,HATCH.nSortFlagShortestPath | HATCH.nSortFlagUseHotSpot | HATCH.nSortFlagFlipOrientation);    

        returnHatch.moveDataFrom(tileHatch);

  });
    
    return returnHatch;
};

exports.sortHatchByPriorityInTiles = function(hatch) {
    let returnHatch = new HATCH.bsHatch();
    let hatchBlocksArray = hatch.getHatchBlockArray();
  
    // Create an object to hold arrays of hatchBlocksArray grouped by tileID
    let groupedHatchblocks = {};
  
    // Iterate through each hatchblock
    hatchBlocksArray.forEach(function(hatchblock) {
        // Get the tileID of the current hatchblock
        let tileID = hatchblock.getAttributeInt('tileID_3mf');
      
        // If the tileID does not exist in the groupedHatchblocks object, create a new array for it
        if (!groupedHatchblocks[tileID]) {
            groupedHatchblocks[tileID] = [];
        }
      
        // Add the hatchblock to the appropriate array based on its tileID
        groupedHatchblocks[tileID].push(hatchblock);
    });
  
    // Define the priority map for different hatch types
    const typePriorityMap = new Map([
        [CONST.typeDesignations.open_polyline.value, PARAM.getParamInt('scanning_priority', 'open_polyline_priority')],
        [CONST.typeDesignations.part_hatch.value, PARAM.getParamInt('scanning_priority', 'part_hatch_priority')],
        [CONST.typeDesignations.part_contour.value, PARAM.getParamInt('scanning_priority', 'part_contour_priority')],
        [CONST.typeDesignations.downskin_hatch.value, PARAM.getParamInt('scanning_priority', 'downskin_hatch_priority')],
        [CONST.typeDesignations.downskin_contour.value, PARAM.getParamInt('scanning_priority', 'downskin_contour_priority')],
        [CONST.typeDesignations.support_hatch.value, PARAM.getParamInt('scanning_priority', 'support_hatch_priority')],
        [CONST.typeDesignations.support_contour.value, PARAM.getParamInt('scanning_priority', 'support_contour_priority')],
    ]);
  
    // Sort each tile's hatchblocks by type priority first, then by borderIndex if applicable
    Object.keys(groupedHatchblocks).forEach(function(tileID) {
        let hatchInTileArray = groupedHatchblocks[tileID];

        // Sort first by type priority, then by borderIndex if it's greater than 0
        hatchInTileArray.sort(function(a, b) {
            // Get priority of types from the map
            let prioA = typePriorityMap.get(a.getAttributeInt('type'));
            let prioB = typePriorityMap.get(b.getAttributeInt('type'));

            // First, compare based on type priority
            if (prioA !== prioB) {
                return prioA - prioB;
            }

            // If types are the same, check and sort by borderIndex if both are greater than 0
            let borderIndexA = a.getAttributeInt('borderIndex');
            let borderIndexB = b.getAttributeInt('borderIndex');

            if (borderIndexA > 0 && borderIndexB > 0) {
                return borderIndexA - borderIndexB;  // Sort by borderIndex within the same type
            }

            // If only one has a borderIndex greater than 0, prioritize it
            if (borderIndexA > 0) {
                return -1;  // a comes before b
            }
            if (borderIndexB > 0) {
                return 1;   // b comes before a
            }

            // If neither has a borderIndex, they are equal within the type
            return 0;
        });

        // Add sorted hatch blocks back into the returnHatch
        hatchInTileArray.forEach(function(hatchBlock) {
            returnHatch.addHatchBlock(hatchBlock);
        });
    });
  
    return returnHatch;
};
 // sortHatchByPriorityInTiles



exports.sortPartHatchByPositionInTiles = function(hatch) {
    let returnHatch = new HATCH.bsHatch();
    let hatchBlocksArray = hatch.getHatchBlockArray();
  
    // Create an object to hold arrays of hatchBlocksArray grouped by tileID
    let groupedHatchblocks = {};
  
    // Iterate through each hatchblock
    hatchBlocksArray.forEach(function(hatchblock) {
      
        // Get the tileID of the current hatchblock
        let tileID = hatchblock.getAttributeInt('tileID_3mf');
      
        // If the tileID does not exist in the groupedHatchblocks object, create a new array for it
        if (!groupedHatchblocks[tileID]) {
            groupedHatchblocks[tileID] = [];
        }
      
        // Add the hatchblock to the appropriate array based on its tileID
        groupedHatchblocks[tileID].push(hatchblock);
    });
         
  
    // Sort each tile's hatchblocks by priority and add them to the returnHatch
    Object.keys(groupedHatchblocks).forEach(function(tileID) {
      
      let hatchInTileArray = groupedHatchblocks[tileID];
      
      let nonDownSkin = hatchInTileArray.filter(function(obj) {
          return obj.getAttributeInt('type')!==CONST.typeDesignations.part_hatch.value;
      });
      
      let sortedDownSkin = hatchInTileArray
        .filter(function(obj) {
          return obj.getAttributeInt('type')==CONST.typeDesignations.part_hatch.value;
      })
      .sort(function(a, b) {
        return b.getBounds2D().maxY - a.getBounds2D().maxY;
    });
      
    let returnArray = nonDownSkin.concat(sortedDownSkin);
    
        returnArray.forEach(function(hatchBlock) {
            returnHatch.addHatchBlock(hatchBlock);
        });
    });
  
    return returnHatch;
}; // sortPartHatchByPositionInTiles

 exports.sortDownSkinByPositionInTiles = function(hatch) {
    let returnHatch = new HATCH.bsHatch();
    let hatchBlocksArray = hatch.getHatchBlockArray();
  
    // Create an object to hold arrays of hatchBlocksArray grouped by tileID
    let groupedHatchblocks = {};
  
    // Iterate through each hatchblock
    hatchBlocksArray.forEach(function(hatchblock) {
      
        // Get the tileID of the current hatchblock
        let tileID = hatchblock.getAttributeInt('tileID_3mf');
      
        // If the tileID does not exist in the groupedHatchblocks object, create a new array for it
        if (!groupedHatchblocks[tileID]) {
            groupedHatchblocks[tileID] = [];
        }
      
        // Add the hatchblock to the appropriate array based on its tileID
        groupedHatchblocks[tileID].push(hatchblock);
    });
         
  
    // Sort each tile's hatchblocks by priority and add them to the returnHatch
    Object.keys(groupedHatchblocks).forEach(function(tileID) {
      
      let hatchInTileArray = groupedHatchblocks[tileID];
      
      let nonDownSkin = hatchInTileArray.filter(function(obj) {
          return obj.getAttributeInt('type')!==CONST.typeDesignations.part_hatch.value;
      });
      
      let sortedDownSkin = hatchInTileArray
        .filter(function(obj) {
          return obj.getAttributeInt('type')==CONST.typeDesignations.part_hatch.value;
      })
      .sort(function(a, b) {
        return b.getBounds2D().maxY - a.getBounds2D().maxY;
    });
      
    let returnArray = nonDownSkin.concat(sortedDownSkin);
    
        returnArray.forEach(function(hatchBlock) {
            returnHatch.addHatchBlock(hatchBlock);
        });
    });
  
    return returnHatch;
}; // sortDownSkinByPositionInTiles 

exports.mergeShortLinesByType = function(hatches) {
  
  let groupedHatchblocksByType = UTIL.getGroupedHatchObjectByType(hatches);
  let mergedHatch = new HATCH.bsHatch();
  let returnHatch = new HATCH.bsHatch();

  Object.values(groupedHatchblocksByType).forEach(function(vectorType) {
    
    vectorType.mergeShortLines(
        mergedHatch,PARAM.getParamReal('exposure','min_vector_lenght'), 0.1,
        HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode
    );
    returnHatch.moveDataFrom(mergedHatch);
  });
  
  return returnHatch;
  
};