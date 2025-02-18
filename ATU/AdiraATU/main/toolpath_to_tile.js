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

exports.assignHatchblocksToTiles = function(allHatches,thisLayer) {
  
  let tileTable = thisLayer.getAttribEx('tileTable');
  
  /////////////////////////////////////////////////////////////
  ///                 Index hatces to tiles                 ///
  /// (passnumber, tile_index, scanhead xcoord and ycoord)  ///
  /////////////////////////////////////////////////////////////

  for(let j = 0; j<tileTable.length;j++){ 
    filterAndAssignHatchBlocks(allHatches,thisLayer,tileTable[j]);
  } //for

  allHatches = UTIL.removeEmptyHatches(allHatches,'tileID_3mf');
  
  return allHatches;
}; //assignHatchblocksToTiles

function filterAndAssignHatchBlocks(allHatches,thisLayer,tileInfo){
  
  let minY = tileInfo.outline.ymin;
  let minX = tileInfo.outline.xmin;
  let maxY = tileInfo.outline.ymax;
  let maxX = tileInfo.outline.xmax;
  
  if(allHatches.isEmpty()){
    return;
  };

  let insideHatchHorizontal = new HATCH.bsHatch();
  let insideHatchTile = new HATCH.bsHatch();
  let outsideHatch = new HATCH.bsHatch();
  
  let layerHeight_mm = thisLayer.getLayerZ()/1000;      
    
  if(tileInfo.tile_number != 1){
    minY += Math.abs(tileInfo.overlap.y/2);
  };
  
  if(tileInfo.tile_number != tileInfo.requiredPassesY){
     maxY -= Math.abs(tileInfo.overlap.y/2);
  };
    
  if(tileInfo.passNumber != 1){
    minX += Math.abs(tileInfo.overlap.x/2);
  };
    
  if(tileInfo.passNumber != tileInfo.requiredPassesX){
     maxX -= Math.abs(tileInfo.overlap.x/2);
  };
    
  allHatches.axisFilter(insideHatchHorizontal,outsideHatch,HATCH.nAxisY,minY,maxY,layerHeight_mm);
  insideHatchHorizontal.axisFilter(insideHatchTile,outsideHatch,HATCH.nAxisX,minX,maxX,layerHeight_mm);

  if(insideHatchTile.isEmpty()){
    return;
  };
    
  anotateTileIntefaceHatch(insideHatchTile,tileInfo);
  
  allHatches.makeEmpty();
  allHatches.moveDataFrom(insideHatchTile);
  allHatches.moveDataFrom(outsideHatch);
} // filterHatchBlocks

const anotateTileIntefaceHatchBlock = function(hatchBlock,tileID) {
  
  let prevTileID = hatchBlock.getAttributeInt('tileID_3mf');       

  if (prevTileID > 0 ){
    let overlapCount = hatchBlock.getAttributeInt('overlapCount');

    overlapCount++;
                       
    let overlappingDesignation = 'overlappingTile_' + overlapCount.toString();
    hatchBlock.setAttributeInt(overlappingDesignation,prevTileID);
    hatchBlock.setAttributeInt('overlapCount',overlapCount);
  };
  
  hatchBlock.setAttributeInt('tileID_3mf',tileID);
    
} // anotateTileIntefaceHatchBlock

const anotateTileIntefaceHatch = function(hatch,tileInfo) {
  let returnHatch = new HATCH.bsHatch();
  let hatchBlockIterator = hatch.getHatchBlockIterator();

  while (hatchBlockIterator.isValid()) {   
    let currHatchBlock = hatchBlockIterator.get();
    
    if(!isHatchBlockFullyWithinTile(currHatchBlock,tileInfo)) {
      hatchBlockIterator.next();
      continue;
      }
    
    let prevTileID = currHatchBlock.getAttributeInt('tileID_3mf');       
   
    if (prevTileID > 0 ){
      let overlapCount = currHatchBlock.getAttributeInt('overlapCount');
      
      overlapCount++;
                         
      let overlappingDesignation = 'overlappingTile_' + overlapCount.toString();
      currHatchBlock.setAttributeInt(overlappingDesignation,prevTileID);
      currHatchBlock.setAttributeInt('overlapCount',overlapCount);
                  
    };  
      currHatchBlock.setAttributeInt('tileID_3mf',tileInfo.tileID);

    hatchBlockIterator.next();
    }
  };

const isHatchBlockFullyWithinTile = function(currHatchBlock,tileInfo){
    
  if(Object.keys(tileInfo.outline).length === 0 && tileInfo.outline.constructor === Object) process.printError('No outline found for tile ' + tileInfo.tileID);
  
  let bounds = currHatchBlock.tryGetBounds2D();
  if (!bounds) process.printError('could not retrieve bound2D object from hatch block');
  
  return UTIL.isBoundsInside(bounds,tileInfo.outline);
};

exports.mergeShortLines = function(hatch){

  const minVectorLenght = PARAM.getParamReal("shortVectorHandling", "min_vector_lenght");
  const maxMergeDistance = PARAM.getParamReal("shortVectorHandling", "small_vector_merge_distance");
  
  hatch.mergeShortLines(hatch,minVectorLenght,maxMergeDistance,
    HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode);

  return hatch;
  
} //handleShortLines

exports.deleteShortHatchLines = function (hatch) {
  
  const minVectorLenght = PARAM.getParamReal("shortVectorHandling", "min_vector_lenght");
  
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


exports.generateTileIslands = function(tileIslands, layerNumber, modelData){
  
  let stripeObject = [];

  let tileIntersectIslands = {};

  Object.entries(tileIslands).forEach(function(tileIslandEntry){    
    let tileId = tileIslandEntry[0];
    let tileIsland = tileIslandEntry[1].getIslandArray()[0];
    
    let islandIterator = modelData.getFirstIsland(layerNumber);

    while (islandIterator.isValid()){
      
      let thisIsland = islandIterator.getIsland();
      let thisTile = tileIsland.clone();
      
      thisTile.intersect(thisIsland);
            
      if(!thisTile.isEmpty()){
        
        if(tileIntersectIslands[tileId] === undefined){
          tileIntersectIslands[tileId] = new ISLAND.bsIsland();
        }
       
        tileIntersectIslands[tileId].addIslands(thisTile);
      }
      
      islandIterator.next();
    }        
  })

return  tileIntersectIslands;
};

exports.generateTileStripes = function(tileIntersectIslands,nLayerNr,stripeAngle){
  
  let tileStripes = {};
  
  Object.entries(tileIntersectIslands).forEach(function (tileIslandEntry){
    
    let tileId = tileIslandEntry[0];
    let tileIslands = tileIslandEntry[1];
    
    if(tileStripes[tileId] === undefined){
      tileStripes[tileId] = new ISLAND.bsIsland();
    }
    
  let fStripeWidth = PARAM.getParamReal('strategy','fStripeWidth');
  let fMinWidth = PARAM.getParamReal('strategy','fMinWidth');
  let fStripeOverlap = PARAM.getParamReal('strategy','fStripeOverlap');
  let fStripeLength = PARAM.getParamReal('strategy','fStripeLength');
  let fpatternShift = PARAM.getParamReal('strategy','fPatternShift');
  let stripeRefPoint = new VEC2.Vec2(nLayerNr*fpatternShift,0);
  
  let stripeIslands = new ISLAND.bsIsland();
    
  tileIslands.createStripes(tileStripes[tileId],fStripeWidth,fMinWidth,fStripeOverlap,
    fStripeLength,stripeAngle,stripeRefPoint);
        
  });
  
  return tileStripes;
  
};

exports.clipIntoStripes = function (hatch,tileStripes,thisLayer) {
    
  let resultHatch = new HATCH.bsHatch();
  
  let groupedHatch = UTIL.getGroupedHatchObjectByTileType(hatch);

  Object.entries(groupedHatch).forEach(function (tileEntry){
    let tileId = tileEntry[0];
    let tileGroup = tileEntry[1];
    
    Object.entries(tileGroup).forEach(function (typeEntry){
            
      let typeId = typeEntry[0];
      let typeHatch = typeEntry[1];
      
      if (typeId == 1 || typeId == 3 || typeId == 5) {
        
        if(tileStripes[tileId].isEmpty()){
          return;
        }
        
        let islandArray = tileStripes[tileId].getIslandArray();
        
        let allHatches = typeHatch.clone();
        let stripeId = 1;
        islandArray.forEach(function(island) {
          
          let clippedHatch = allHatches.clone();
          
          clippedHatch.clip(island,true);
          clippedHatch.setAttributeInt('stripeId',stripeId);
          resultHatch.moveDataFrom(clippedHatch);
          
          stripeId++;
        });

      } else {
      
        resultHatch.moveDataFrom(typeHatch);
        
        }
    });
  });
  return resultHatch;
};

exports.sortHatches = function(allHatches,stripeAngle){
  stripeAngle = UTIL.invertAngleIfQ1orQ2(stripeAngle);
  let stripeAngleRadians = stripeAngle * Math.PI / 180;
  
  let returnHatch = new HATCH.bsHatch();
  let sortingHatch = new HATCH.bsHatch();
  let groupedHatches = UTIL.getGroupedHatchObjectByTileTypeLaserId(allHatches);
  
  Object.values(groupedHatches).forEach(function(tiles){
    Object.entries(tiles).forEach(function(typeEntry){
      let typeKey = typeEntry[0];
      let typeGroup = typeEntry[1];
      
      Object.values(typeGroup).forEach(function(laserIdHatch){
        
        if (typeKey == 1 || typeKey == 3 || typeKey == 5) {

          let sortedArray = sortStripes(laserIdHatch.getHatchBlockArray());
          
          //let sortedArray = laserIdHatch.getHatchBlockArray();
          
          sortedArray.forEach(function (hatchBlock){
          
          let type = hatchBlock.getAttributeInt('type');
          
          let tileID_3mf = hatchBlock.getAttributeInt('tileID_3mf');
          let islandId = hatchBlock.getAttributeInt('islandId');
          let bsid = hatchBlock.getAttributeInt('bsid');
          let borderIndex = hatchBlock.getAttributeInt('borderIndex');
          let stripeId = hatchBlock.getAttributeInt('stripeId');
            
          sortingHatch.addHatchBlock(hatchBlock);  
          
          sortingHatch.mergeShortLines( // merge if vectors are on almost sharing start and end point.
            sortingHatch,10,0.05,
            HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
          );  
            
          sweepLineSort(sortingHatch,stripeAngleRadians);
            
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
  
function sweepLineSort(hatch, sweepAngle) {
  let pathSet = new PATH_SET.bsPathSet();
  pathSet.addHatches(hatch);

  let pathCount = pathSet.getPathCount();
  let pathsWithProjections = [];

  // Calculate the sweep direction vector from the sweep angle
  let sweepDirection = new VEC2.Vec2(Math.cos(sweepAngle), Math.sin(sweepAngle));
  

  // Step 1: Iterate through all paths and calculate their projections onto the sweep direction
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

      let center = new VEC2.Vec2(centerX, centerY);

      // Calculate the projection of the center onto the sweep direction
      let projection = center.dot(sweepDirection);

      // Store the path index, projection, and points
      pathsWithProjections.push({
          index: i,
          projection: projection,
          center: center,
          points: points
      });
  }

    // Step 2: Sort the paths by their projection (which is equivalent to sorting by how they are "swept")
    pathsWithProjections.sort(function (a, b) {
        return a.projection - b.projection; //sort in ascending order
    });

    // Step 3: Create a new pathSet for the sorted paths
    let sortedPathSet = new PATH_SET.bsPathSet();
    for (let i = 0; i < pathsWithProjections.length; i++) {
        sortedPathSet.addSinglePaths(pathSet, pathsWithProjections[i].index);
    }

    // Step 4: Replace the original hatch paths with the sorted ones
    hatch.clear();
    hatch.addPaths(sortedPathSet);

    return hatch;  // Return the sorted hatch for reference
}

  
function sortStripes(boundsArray) {
    return boundsArray.sort(function(a, b) {

        
      // If stripeIds are equal, compare by center Y (descending order)
      let maxYA = a.getBounds2D().maxY;
      let maxYB = b.getBounds2D().maxY;
      
      if (maxYA !== maxYB){
        return maxYB - maxYA; // Sort by center Y in decending order
      }
      
      let stripeIdA = a.getAttributeInt('stripeId');
      let stripeIdB = b.getAttributeInt('stripeId');
      
      return stripeIdB - stripeIdA; // Sort by stripeId in decending order        
        
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

//-----------------------------------------------------------------------------------------//

exports.adjustHatchBlockAssignment = function(allHatches,modelLayer){
  
  let hatchBlockIterator = allHatches.getHatchBlockIterator();
  let tileTable = modelLayer.getAttribEx('tileTable');

  while(hatchBlockIterator.isValid()){
    
    let thisHatchBlock = hatchBlockIterator.get();
    let tileId = thisHatchBlock.getAttributeInt('tileID_3mf');
    let overlapLaserCount = thisHatchBlock.getAttributeInt('overlapLaserCount');
    let overLapTileCount = thisHatchBlock.getAttributeInt('overlapCount');
    
    let thisTile = tileTable.find(function (tile) {     
      return tile.tileID == tileId;
    });
          
    if(overLapTileCount != 0){
      
      let bounds = thisHatchBlock.tryGetBounds2D();
      if (!bounds) throw new Error('could not retrieve bound2D object from hatch block');
      
      let tileBounds = thisTile.clipPoints;
      
      if(bounds.minX < tileBounds.xmin || bounds.maxX > tileBounds.xmax || bounds.minY < tileBounds.ymin || bounds.maxY > tileBounds.ymax){
        
        thisHatchBlock.removeAttributes('tileID_3mf');
        updateTileDesignation(thisHatchBlock,tileTable);
        
      }
    }
    
    hatchBlockIterator.next();
    }
  
}; //adjustHatchBlockAssignment  

const updateTileDesignation = function(hatchBlock,tileTable){
  
  let overlapCount = hatchBlock.getAttributeInt("overlapCount");
  let hatchBlockBounds = hatchBlock.tryGetBounds2D();
  if (!hatchBlockBounds) throw new Error('could not retrieve bound2D object from hatch block');

  
  for(let i=1; i < overlapCount+1; i++){
    let tileId = hatchBlock.getAttributeInt('overlappingTile_' + i);
    let thisTile = tileTable.find(function (tile) {     
      return tile.tileID == tileId;
    });
    let tileBounds = thisTile.clipPoints;
    
    if(isBoundsInside(hatchBlockBounds,tileBounds)){
      hatchBlock.setAttributeInt('tileID_3mf',tileId);
      hatchBlock.removeAttributes('overlapCount');
      hatchBlock.removeAttributes('overlappingTile_1');
      return;
    };
  };
  
  process.printWarning('updateTileDesignation: could not fully assign this hatchblock')
};