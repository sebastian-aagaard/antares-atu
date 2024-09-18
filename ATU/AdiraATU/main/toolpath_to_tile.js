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

exports.assignToolpathToTiles = function(allHatches,thisLayer) {
  
  let tileTable = thisLayer.getAttribEx('tileTable');
  
  /////////////////////////////////////
  /// sort tilearray by tile number  ///
  //////////////////////////////////////
    
  if(tileTable.length > 1){
    tileTable.sort(function(a, b) {
      return a.tile_number - b.tile_number;
    });
  }
  
  ///////////////////////////////////////////////////
  /// generate containers for hatching and islands ///
  ////////////////////////////////////////////////////
  
  let assignedHatch = allHatches.clone(); 

  /////////////////////////////////////////////////////////////
  ///                 Index hatces to tiles                 ///
  /// (passnumber, tile_index, scanhead xcoord and ycoord)  ///
  /////////////////////////////////////////////////////////////

  for(let j = 0; j<tileTable.length;j++)
    {
      
      // get the coordinates of the current tile 
      let tile_x_min = tileTable[j].scanhead_outline[0].m_coord[0]//
      let tile_x_max = tileTable[j].scanhead_outline[2].m_coord[0]//
      let tile_y_min = tileTable[j].scanhead_outline[0].m_coord[1];//
      let tile_y_max = tileTable[j].scanhead_outline[2].m_coord[1];//
      
      
      //if tileoverlap is greater than requested
      if(tileTable[j].overlapX < PARAM.getParamReal('tileing','tile_overlap_x')){
      
        let overLapCompensation = (Math.abs(tileTable[j].overlapX) + PARAM.getParamReal('tileing','tile_overlap_x'))/2;
           
        switch(tileTable[j].passNumber) {
          case 1:
            tile_x_max -= overLapCompensation-PARAM.getParamReal('stripeOverlapAllocation','firstOverlapShift');//
            break;
          case 2:
            tile_x_min += overLapCompensation+PARAM.getParamReal('stripeOverlapAllocation','firstOverlapShift');
            //if there is 3 passes
            if(tileTable[j].requiredPassesX>2){
              tile_x_max -= overLapCompensation-PARAM.getParamReal('stripeOverlapAllocation','secondOverlapShift');
              }           
            break;
          case 3:
            tile_x_min += overLapCompensation+PARAM.getParamReal('stripeOverlapAllocation','secondOverlapShift');
            break;
          };  
         };
         
     // CREATE CLIPPING MASK
     if(tileTable[j].overlapY < PARAM.getParamReal('tileing', 'tile_overlap_y')){
      
      let overLapCompensationY = (Math.abs(tileTable[j].overlapY) + PARAM.getParamReal('tileing','tile_overlap_y'))/2;
       
      if(tileTable[j].tile_number !== 1 && tileTable[j].tile_number !== tileTable[j].requiredPassesY) {
           
           tile_y_min += overLapCompensationY;
           tile_y_max -= overLapCompensationY;
           
           } else if(tileTable[j].tile_number === 1) {
           
           tile_y_max -= overLapCompensationY;
           
        } else if(tileTable[j].tile_number === tileTable[j].requiredPassesY) {
           
             tile_y_min += overLapCompensationY;
           
        };
      };   
          
      // add the corrdinates to vector pointset
      let clipPoints = [
        new VEC2.Vec2(tile_x_min, tile_y_min), //min,min
        new VEC2.Vec2(tile_x_min, tile_y_max), //min,max
        new VEC2.Vec2(tile_x_max, tile_y_max), // max,max
        new VEC2.Vec2(tile_x_max, tile_y_min) // max,min
      ];
      
      tileTable[j].clipPoints = {xmin : tile_x_min,
                                 xmax : tile_x_max,
                                 ymin : tile_y_min,
                                 ymax : tile_y_max};
                                 
      // clip allHatches to get hatches within this tile
      let tileHatch = UTIL.ClipHatchByRect(allHatches,clipPoints,true);
      let tileHatch_outside = UTIL.ClipHatchByRect(allHatches,clipPoints,false);        
      allHatches.makeEmpty();
                                 
      let tileId = tileTable[j].tileID;           
      anotateTileIntefaceHatchblocks(tileHatch,tileId);
          
      allHatches.moveDataFrom(tileHatch);
      allHatches.moveDataFrom(tileHatch_outside);
        
    } //for
    
    thisLayer.setAttribEx('tileTable',tileTable);    
    
    return allHatches;
    
} //assignToolpathToTiles


const anotateTileIntefaceHatchblocks = function(hatch,tileID) {
  let returnHatch = new HATCH.bsHatch();
  let hatchBlockIterator = hatch.getHatchBlockIterator();

  while (hatchBlockIterator.isValid()) {   
    let currHatchBlock = hatchBlockIterator.get();

        let prevTileID = currHatchBlock.getAttributeInt('tileID_3mf');       
       
        if (prevTileID > 0 ){
          let overlapCount = currHatchBlock.getAttributeInt('overlapCount');
          
          overlapCount++;
                             
          let overlappingDesignation = 'overlappingTile_' + overlapCount.toString();
          currHatchBlock.setAttributeInt(overlappingDesignation,prevTileID);
          currHatchBlock.setAttributeInt('overlapCount',overlapCount);
                      
        };  
          currHatchBlock.setAttributeInt('tileID_3mf',tileID);

    hatchBlockIterator.next();
    }
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
    
    if(type === 2 || type === 4 || type === 6){
      resultHatch.addHatchBlock(hatchBlock);
      hatchBlockIterator.next();
      continue;
    }
      
    hatchBlock.deleteShortLines(minVectorLenght);
    
    if(!hatchBlock.isEmpty()){
      
      resultHatch.addHatchBlock(hatchBlock);
      
      };
      
    hatchBlockIterator.next();
  };
  
  return resultHatch;
  };

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

// exports.combineSmallStripeIslands = function(stripeIslands){
//   
//   let islandArray = 
//   // unify
//   
//   
//   
//   
//   };

exports.clipIntoStripes = function (hatch,island) {
    
  let resultHatch = new HATCH.bsHatch();
  
  let groupedHatchByType = UTIL.getGroupedHatchObjectByType(hatch);

  Object.keys(groupedHatchByType).forEach(function (type){
    
    if (type == 1 || type == 3 || type == 5) {
      
      let islandArray = island.getIslandArray();
      
      let allHatches = groupedHatchByType[type].clone();
      let stripeId = 0;
      islandArray.forEach(function(island) {
        
        let patternInfo = island.getPatternInfo();
        let clippedHatch = allHatches.clone();
        
        clippedHatch.clip(island,true);
        clippedHatch.setAttributeInt('stripeId',stripeId);
        resultHatch.moveDataFrom(clippedHatch);
        
        stripeId++;
      });

    } else {
    
      resultHatch.moveDataFrom(groupedHatchByType[type]);
      
      }
  });
  return resultHatch;
  };
  
exports.sortHatches = function(allHatches,stripeAngle){
  let returnHatch = new HATCH.bsHatch();
  let sortingHatch = new HATCH.bsHatch();
  let groupedHatches = UTIL.getGroupedHatchObjectByTileTypeLaserId(allHatches);
  
  Object.values(groupedHatches).forEach(function(tiles){
    Object.entries(tiles).forEach(function(typeEntry){
      let typeKey = typeEntry[0];
      let typeGroup = typeEntry[1];
      
      Object.values(typeGroup).forEach(function(laserIdHatch){
        
        if (typeKey == 1 || typeKey == 3 || typeKey == 5) {

          let sortedArray = sortByStripeIdAndCenterY(laserIdHatch.getHatchBlockArray());
          
          sortedArray.forEach(function (hatchBlock){
          
          let type = hatchBlock.getAttributeInt('type');
          
          let tileID_3mf = hatchBlock.getAttributeInt('tileID_3mf');
          let islandId = hatchBlock.getAttributeInt('islandId');
          let bsid = hatchBlock.getAttributeInt('bsid');
          let borderIndex = hatchBlock.getAttributeInt('borderIndex');
          let stripeId = hatchBlock.getAttributeInt('stripeId');
            
          sortingHatch.addHatchBlock(hatchBlock);   
            
          //sortPathsWithMinimizedLineDistance(sortingHatch,5);
          sortPathsByStripeAngle(sortingHatch, 2, stripeAngle * Math.PI / 180);
          //sortPathsByCenterY(sortingHatch);
            
          sortingHatch.setAttributeInt('tileID_3mf',tileID_3mf);
          sortingHatch.setAttributeInt('islandId',islandId);
          sortingHatch.setAttributeInt('type',type);
          sortingHatch.setAttributeInt('bsid',bsid);
          sortingHatch.setAttributeInt('borderIndex',borderIndex);
          sortingHatch.setAttributeInt('stripeId',stripeId);
            
          returnHatch.moveDataFrom(sortingHatch);
          });
        
          } else {
        
            returnHatch.moveDataFrom(laserIdHatch);

        };
      
        });

    });
  });
  
  return returnHatch;
  };
  
function sortByStripeIdAndCenterY(boundsArray) {
    return boundsArray.sort(function(a, b) {
        // First, compare by stripeId (ascending order)
        var stripeIdA = a.getAttributeInt('stripeId');
        var stripeIdB = b.getAttributeInt('stripeId');
        
        if (stripeIdA !== stripeIdB) {
            return stripeIdA - stripeIdB; // Sort by stripeId in ascending order
        }
        
        // If stripeIds are equal, compare by center Y (descending order)
        var centerA = a.getBounds2D().getCenter();
        var centerB = b.getBounds2D().getCenter();
        
        return centerB.y - centerA.y; // Sort by center Y in descending order
    });
}

const sortPathsByCenterY = function (hatch) {
    let pathSet = new PATH_SET.bsPathSet();
    pathSet.addHatches(hatch);

    let pathCount = pathSet.getPathCount();
    let pathsWithCenters = [];

    // Iterate through all paths in the hatch
    for (let i = 0; i < pathCount; i++) {
        let points = pathSet.getPathPoints(i);  // Get the points of the path
        
        // Calculate the center point (average of X and Y coordinates of all points)
        let centerX = 0;
        let centerY = 0;
        let pointCount = points.length;

        for (let j = 0; j < pointCount; j++) {
            centerX += points[j].x;
            centerY += points[j].y;
        }

        centerX /= pointCount;
        centerY /= pointCount;

        // Store the path index and centerY for sorting
        pathsWithCenters.push({ index: i, centerY: centerY });
    }

    // Sort paths based on centerY (ascending order)
    pathsWithCenters.sort(function(a, b) {
        return b.centerY - a.centerY;
    });

    // Create a new pathSet for sorted paths
    let sortedPathSet = new PATH_SET.bsPathSet();

    // Add paths to the sorted pathSet in the new order
    for (let i = 0; i < pathsWithCenters.length; i++) {
        sortedPathSet.addSinglePaths(pathSet, pathsWithCenters[i].index);
    }

    // Clear the original hatch paths and replace with sorted ones
    hatch.clear();
    hatch.addPaths(sortedPathSet);

    return hatch;  // Return the sorted hatch for reference
}

function sortPathsWithMinimizedLineDistance(hatch, maxJumpDistance) {
    let pathSet = new PATH_SET.bsPathSet();
    pathSet.addHatches(hatch);

    let pathCount = pathSet.getPathCount();
    let pathsWithCenters = [];

    // Step 1: Iterate through all paths and calculate their center points
    for (let i = 0; i < pathCount; i++) {
        let points = pathSet.getPathPoints(i);  // Get the points of the path

        // Calculate the center point (average of X and Y coordinates)
        let centerX = 0;
        let centerY = 0;
        let pointCount = points.length;

        for (let j = 0; j < pointCount; j++) {
            centerX += points[j].x;
            centerY += points[j].y;
        }

        centerX /= pointCount;
        centerY /= pointCount;

        // Store the path index, centerY, and start/end points
        pathsWithCenters.push({ 
            index: i, 
            centerX: centerX, 
            centerY: centerY, 
            startPoint: points[0], 
            endPoint: points[points.length - 1] 
        });
    }

    // Step 2: Sort paths by centerY in descending order (start with the topmost vector)
    pathsWithCenters.sort(function(a, b) {
        return b.centerY - a.centerY;
    });

    // Step 3: Initialize sorted paths and start with the topmost vector
    let sortedPaths = [];
    let currentPath = pathsWithCenters[0];  // Start with the first path (highest centerY)
    sortedPaths.push(currentPath);
    pathsWithCenters.splice(0, 1);  // Remove it from the list

    // Step 4: Loop through the remaining paths
    while (pathsWithCenters.length > 0) {
        let closestPathIndex = -1;
        let minLineDistance = Infinity;

        // Find the path that minimizes the distance between the lines (current vector and next vector)
        for (let i = 0; i < pathsWithCenters.length; i++) {
            let distance = getLineDistance(currentPath, pathsWithCenters[i]);  // Calculate line-to-line distance
            if (distance < minLineDistance) {
                minLineDistance = distance;
                closestPathIndex = i;
            }
        }

        // Step 5: Check if the line distance exceeds the maxJumpDistance
        if (minLineDistance > maxJumpDistance) {
            // If the line distance exceeds the limit, pick the next path from the top of the remaining paths (highest centerY)
            currentPath = pathsWithCenters[0];  // Take the top-most vector from the remaining list
            sortedPaths.push(currentPath);
            pathsWithCenters.splice(0, 1);  // Remove it from the list
        } else {
            // If the line distance is within the limit, add the closest path
            currentPath = pathsWithCenters[closestPathIndex];
            sortedPaths.push(currentPath);
            pathsWithCenters.splice(closestPathIndex, 1);  // Remove it from the list
        }
    }

    // Step 6: Create a new pathSet for the sorted paths
    let sortedPathSet = new PATH_SET.bsPathSet();

    for (let i = 0; i < sortedPaths.length; i++) {
        sortedPathSet.addSinglePaths(pathSet, sortedPaths[i].index);
    }

    // Step 7: Replace the original hatch paths with the sorted ones
    hatch.clear();
    hatch.addPaths(sortedPathSet);

    return hatch;  // Return the sorted hatch for reference
}
function sortPathsByStripeAngle(hatch, maxJumpDistance, stripeAngle) {
    let pathSet = new PATH_SET.bsPathSet();
    pathSet.addHatches(hatch);

    let pathCount = pathSet.getPathCount();
    let pathsWithProjections = [];

    // Calculate the direction vector from the stripe angle
    let stripeDirection = new VEC2.Vec2(Math.sin(stripeAngle), Math.cos(stripeAngle));  // Direction vector for the stripe

    // Step 1: Iterate through all paths and calculate their center points and projections
    for (let i = 0; i < pathCount; i++) {
        let points = pathSet.getPathPoints(i);  // Get the points of the path

        // Calculate the center point (average of X and Y coordinates)
        let centerX = 0;
        let centerY = 0;
        let pointCount = points.length;

        for (let j = 0; j < pointCount; j++) {
            centerX += points[j].x;
            centerY += points[j].y;
        }

        centerX /= pointCount;
        centerY /= pointCount;

        // Calculate the projection of the center point onto the stripe direction
        let center = new VEC2.Vec2(centerX, centerY);
        let projection = center.dot(stripeDirection);

        // Store the path index, projection, and start/end points
        pathsWithProjections.push({ 
            index: i, 
            projection: projection, 
            center: center,
            startPoint: points[0], 
            endPoint: points[points.length - 1],
            bounds: {
                xMin: Math.min.apply(null, points.map(function(p) { return p.x; })),
                xMax: Math.max.apply(null, points.map(function(p) { return p.x; }))
            }
        });
    }

    // Step 2: Sort paths by projection (to start with topmost vectors relative to the angle)
    pathsWithProjections.sort(function(a, b) {
        return b.projection - a.projection;  // Start with topmost vector relative to angle
    });

    // Step 3: Initialize sorted paths and set of unvisited paths
    let sortedPaths = [];
    let currentPath = pathsWithProjections[0];  // Start with the first path (highest projection)
    sortedPaths.push(currentPath);
    pathsWithProjections.splice(0, 1);  // Remove it from the list

    // Step 4: Loop through the remaining paths and find the closest path along the stripe direction
    while (pathsWithProjections.length > 0) {
        let closestPathIndex = -1;
        let minLineDistance = Infinity;
        let topmostValidIndex = -1;
        let topmostY = -Infinity;  // Track topmost Y coordinate

        // Track X bounds for the current path
        let currentXMin = currentPath.bounds.xMin;
        let currentXMax = currentPath.bounds.xMax;

        // Step 5: Find immediate neighbors based on proximity (line-to-line distance)
        for (let i = 0; i < pathsWithProjections.length; i++) {
            let distance = getLineDistance(currentPath, pathsWithProjections[i]);  // Calculate line-to-line distance
            let yCoord = pathsWithProjections[i].center.y;

            // If the current path and the other path are close enough
            if (distance < maxJumpDistance) {
                if (distance < minLineDistance) {
                    minLineDistance = distance;
                    closestPathIndex = i;
                }
            }

            // Keep track of the topmost valid vector by actual Y coordinate
            if (yCoord > topmostY) {
                topmostY = yCoord;
                topmostValidIndex = i;
            }
        }

        // Step 6: If a neighbor was found, process it, otherwise jump to the topmost vector
        if (closestPathIndex !== -1) {
            // Add the closest neighbor to the sorted paths
            currentPath = pathsWithProjections[closestPathIndex];
            sortedPaths.push(currentPath);
            pathsWithProjections.splice(closestPathIndex, 1);  // Remove it from the list
        } else if (topmostValidIndex !== -1) {
            // **MUST** jump to the topmost vector relative to the angle
            currentPath = pathsWithProjections[topmostValidIndex];
            sortedPaths.push(currentPath);
            pathsWithProjections.splice(topmostValidIndex, 1);  // Remove it from the list
        }
    }

    // Step 7: Create a new pathSet for the sorted paths
    let sortedPathSet = new PATH_SET.bsPathSet();

    for (let i = 0; i < sortedPaths.length; i++) {
        sortedPathSet.addSinglePaths(pathSet, sortedPaths[i].index);
    }

    // Step 8: Replace the original hatch paths with the sorted ones
    hatch.clear();
    hatch.addPaths(sortedPathSet);

    return hatch;  // Return the sorted hatch for reference
}

// Function to calculate the line-to-line distance
function getLineDistance(vector1, vector2) {
    let start1 = vector1.startPoint;
    let end1 = vector1.endPoint;
    let start2 = vector2.startPoint;
    let end2 = vector2.endPoint;

    let distanceStartToLine2 = pointToLineDistance(start1, start2, end2);
    let distanceEndToLine2 = pointToLineDistance(end1, start2, end2);
    let distanceStartToLine1 = pointToLineDistance(start2, start1, end1);
    let distanceEndToLine1 = pointToLineDistance(end2, start1, end1);

    return Math.min(distanceStartToLine2, distanceEndToLine2, distanceStartToLine1, distanceEndToLine1);
}

// Function to calculate the shortest distance from a point to a line
function pointToLineDistance(point, lineStart, lineEnd) {
    let lineLengthSquared = lineStart.distanceSq(lineEnd);
    if (lineLengthSquared === 0) {
        return point.distance(lineStart);
    }
    let t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));  // Clamp t between 0 and 1
    let projection = new VEC2.Vec2(lineStart.x + t * (lineEnd.x - lineStart.x), lineStart.y + t * (lineEnd.y - lineStart.y));
    return point.distance(projection);
}





// function sortPathsByStripeAngle(hatch, maxJumpDistance, stripeAngle) {
//     let pathSet = new PATH_SET.bsPathSet();
//     pathSet.addHatches(hatch);
// 
//     let pathCount = pathSet.getPathCount();
//     let pathsWithProjections = [];
// 
//     // Calculate the reversed direction vector from the stripe angle
//     let stripeDirection = new VEC2.Vec2(-Math.cos(stripeAngle), -Math.sin(stripeAngle));  // Reverse direction vector for the stripe
// 
//     // Step 1: Iterate through all paths and calculate their center points and projections
//     for (let i = 0; i < pathCount; i++) {
//         let points = pathSet.getPathPoints(i);  // Get the points of the path
// 
//         // Calculate the center point (average of X and Y coordinates)
//         let centerX = 0;
//         let centerY = 0;
//         let pointCount = points.length;
// 
//         for (let j = 0; j < pointCount; j++) {
//             centerX += points[j].x;
//             centerY += points[j].y;
//         }
// 
//         centerX /= pointCount;
//         centerY /= pointCount;
// 
//         // Calculate the projection of the center point onto the reversed stripe direction
//         let center = new VEC2.Vec2(centerX, centerY);
//         let projection = center.dot(stripeDirection);
// 
//         // Store the path index, projection, and start/end points
//         pathsWithProjections.push({ 
//             index: i, 
//             projection: projection, 
//             center: center,
//             startPoint: points[0], 
//             endPoint: points[points.length - 1] 
//         });
//     }
// 
//     // Step 2: Sort paths by the projection in descending order (or ascending if needed)
//     pathsWithProjections.sort(function(a, b) {
//         return b.projection - a.projection;
//     });
// 
//     // Step 3: Initialize sorted paths and start with the first projected path
//     let sortedPaths = [];
//     let currentPath = pathsWithProjections[0];  // Start with the first path (highest projection)
//     sortedPaths.push(currentPath);
//     pathsWithProjections.splice(0, 1);  // Remove it from the list
// 
//     // Step 4: Loop through the remaining paths and find the closest path along the stripe direction
//     while (pathsWithProjections.length > 0) {
//         let closestPathIndex = -1;
//         let minLineDistance = Infinity;
// 
//         // Find the path that minimizes the distance between the lines (current vector and next vector)
//         for (let i = 0; i < pathsWithProjections.length; i++) {
//             let distance = getLineDistance(currentPath, pathsWithProjections[i]);  // Calculate line-to-line distance
//             if (distance < minLineDistance) {
//                 minLineDistance = distance;
//                 closestPathIndex = i;
//             }
//         }
// 
//         // Step 5: Check if the line distance exceeds the maxJumpDistance
//         if (minLineDistance > maxJumpDistance) {
//             // If the line distance exceeds the limit, pick the next path based on projection
//             currentPath = pathsWithProjections[0];  // Take the next highest projection
//             sortedPaths.push(currentPath);
//             pathsWithProjections.splice(0, 1);  // Remove it from the list
//         } else {
//             // If the line distance is within the limit, add the closest path
//             currentPath = pathsWithProjections[closestPathIndex];
//             sortedPaths.push(currentPath);
//             pathsWithProjections.splice(closestPathIndex, 1);  // Remove it from the list
//         }
//     }
// 
//     // Step 6: Create a new pathSet for the sorted paths
//     let sortedPathSet = new PATH_SET.bsPathSet();
// 
//     for (let i = 0; i < sortedPaths.length; i++) {
//         sortedPathSet.addSinglePaths(pathSet, sortedPaths[i].index);
//     }
// 
//     // Step 7: Replace the original hatch paths with the sorted ones
//     hatch.clear();
//     hatch.addPaths(sortedPathSet);
// 
//     return hatch;  // Return the sorted hatch for reference
// }
// 
// // Function to calculate the line-to-line distance
// function getLineDistance(vector1, vector2) {
//     let start1 = vector1.startPoint;
//     let end1 = vector1.endPoint;
//     let start2 = vector2.startPoint;
//     let end2 = vector2.endPoint;
// 
//     let distanceStartToLine2 = pointToLineDistance(start1, start2, end2);
//     let distanceEndToLine2 = pointToLineDistance(end1, start2, end2);
//     let distanceStartToLine1 = pointToLineDistance(start2, start1, end1);
//     let distanceEndToLine1 = pointToLineDistance(end2, start1, end1);
// 
//     return Math.min(distanceStartToLine2, distanceEndToLine2, distanceStartToLine1, distanceEndToLine1);
// }
// 
// // Function to calculate the shortest distance from a point to a line
// function pointToLineDistance(point, lineStart, lineEnd) {
//     let lineLengthSquared = lineStart.distanceSq(lineEnd);
//     if (lineLengthSquared === 0) {
//         return point.distance(lineStart);
//     }
//     let t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / lineLengthSquared;
//     t = Math.max(0, Math.min(1, t));  // Clamp t between 0 and 1
//     let projection = new VEC2.Vec2(lineStart.x + t * (lineEnd.x - lineStart.x), lineStart.y + t * (lineEnd.y - lineStart.y));
//     return point.distance(projection);
// }


//--------------------------------------------------------//