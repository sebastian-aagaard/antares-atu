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
      if(tileArray[j].overlapX < -PARAM.getParamReal('interface', 'interfaceOverlap')){
      
        let halfOverlap = Math.abs(tileArray[j].overlapX/2);
        let overLapCompensation = halfOverlap - PARAM.getParamReal('interface', 'interfaceOverlap')/2;
           
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
       
     if(tileArray[j].overlapY < -PARAM.getParamReal('interface', 'interfaceOverlap')){
      
        let overLapCompensationY = (Math.abs(tileArray[j].overlapY) - PARAM.getParamReal('interface', 'interfaceOverlap'))/2;
        
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

      vec2_tile_array[j] =  tile_points;  
      
      // clip allHatches to get hatches within this tile
      let tileHatch = UTIL.ClipHatchByRect(assignedHatch,vec2_tile_array[j],true);
      let tileHatch_outside = UTIL.ClipHatchByRect(assignedHatch,vec2_tile_array[j],false);
        
      assignedHatch.makeEmpty();
      
      let tileID_3mf = tileArray[j].tile_number+(tileArray[j].passNumber)*1000;
      
      anotateTileIntefaceHatchblocks(tileHatch,tileID_3mf);
        
      // assign tileID to hatches within tile
      tileHatch.setAttributeInt('tileID_3mf',tileID_3mf);

      // generate Segment obejct containing the tiles to 
      let startVec2 = new VEC2.Vec2(tile_x_cen,tile_y_max);
      let endVec2 = new VEC2.Vec2(tile_x_cen,tile_y_min);
      tileSegmentArray[j] = new SEG2D.Seg2d(startVec2,endVec2).toString();  
          
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
          
          let overlapNumber = thisHatchBlock.getAttributeInt('numberofOverlappingTiles');
          
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
  let adjustedHatch = new HATCH.bsHatch();
  let nonAdjustedHatch = new HATCH.bsHatch();
  let resultHatch = new HATCH.bsHatch();

  while (hatchBlockIterator.isValid()) {   
    let thisHatchBlock = hatchBlockIterator.get();
    let overlapNumber = thisHatchBlock.getAttributeInt('numberofOverlappingTiles');
    
    if(overlapNumber === 0) {
      
        resultHatch.addHatchBlock(thisHatchBlock);
      
      } else {
        
        resultHatch.moveDataFrom(applyZipperInterface(thisHatchBlock,thisLayer, PARAM.getParamInt('interface','tileInterface')===0));
    };
    
    
  hatchBlockIterator.next();
  };
    
//   allHatches.makeEmpty();
//   allHatches.moveDataFrom(nonAdjustedHatch);
//   allHatches.moveDataFrom(adjustedHatch);
  
  return resultHatch;
}

const applyZipperInterface = function(hatchBlock,thisLayer,bOverlap){
            
  
  let tileTable = thisLayer.getAttribEx('tileTable');
  let firstTileId = hatchBlock.getAttributeInt('overlappingTile_1');
  let secondTileId = hatchBlock.getAttributeInt('overlappingTile_2');
  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  let subType = hatchBlock.getModelSubtype();
  let polylineMode = hatchBlock.getPolylineMode();
  
  let overlappingHatch = new HATCH.bsHatch();
  overlappingHatch.addHatchBlock(hatchBlock);
  
  let overLappingPathSet = new PATH_SET.bsPathSet();
  
  let firstOverlapPathsSet = new PATH_SET.bsPathSet();
  let secondOverlapPathsSet = new PATH_SET.bsPathSet(); 

  overLappingPathSet.addHatches(overlappingHatch);
  
  let pathCount = overLappingPathSet.getPathCount();
  
  for(let pathNumber = 0 ; pathNumber < pathCount; pathNumber++){
    
    if (pathNumber % 2 !== 0 || bOverlap) {
      firstOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      };
      
    if (pathNumber % 2 === 0 || bOverlap) {
      secondOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      
    };
  };
  
  adjustZipperInterfaceDistance(firstTileId,secondTileId,firstOverlapPathsSet,secondOverlapPathsSet);
  
  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  let addPathArgs = {
     nModelSubtype : subType,
     nOpenPathPolylineMode : polylineMode,
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
  
  return adjustedHatch; 
}; 

const adjustZipperInterfaceDistance = function(firstTileId,secondTileId,firstPathset,secondPathset){
  
  let boundsArray = firstPathset.getBounds2D().toArray();
  
  let firstBounds = firstPathset.getBounds2D();
  let secondBounds = secondPathset.getBounds2D();
  
  if(Math.floor(firstTileId / 1000) === Math.floor(secondTileId / 1000) ){    //same stripe
    
    intersectPathset(firstBounds.minX,firstBounds.maxX,firstBounds.minY,firstBounds.maxY+PARAM.getParamReal('interface', 'interfaceOverlap'),firstPathset);
    intersectPathset(secondBounds.minX,secondBounds.maxX,secondBounds.minY-PARAM.getParamReal('interface', 'interfaceOverlap'),secondBounds.maxY,secondPathset);

    } else { //different stripe
      
    intersectPathset(firstBounds.minX,firstBounds.maxX+PARAM.getParamReal('interface', 'interfaceOverlap'),firstBounds.minY,firstBounds.maxY,firstPathset);
    intersectPathset(secondBounds.minX-PARAM.getParamReal('interface', 'interfaceOverlap'),secondBounds.maxX,secondBounds.minY,secondBounds.maxY,secondPathset);
      
  };
}; //adjustOverlapBetweenIntefaceHatch

const intersectPathset = function (xmin,xmax,ymin,ymax,pathset){
  
  let intersecArrayVec2D = new Array(4);
  intersecArrayVec2D[0] = new VEC2.Vec2(xmin, ymin); //min,min
  intersecArrayVec2D[1] = new VEC2.Vec2(xmin, ymax); //min,max
  intersecArrayVec2D[2] = new VEC2.Vec2(xmax, ymax); // max,max
  intersecArrayVec2D[3] = new VEC2.Vec2(xmax, ymin); // max,min

  let intersectPath = new PATH_SET.bsPathSet();
  intersectPath.addNewPath(intersecArrayVec2D); // add tiles zones to pathset  
  intersectPath.setClosed(true); // set the zones to closed polygons
  
  pathset.booleanOpIntersect(intersectPath);
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
    let hatchBlocksArray = hatch.getHatchBlockArray();
    
    // Create objects to hold arrays of hatchBlocksArray grouped by tileID and type
    let groupedHatchblocksByType = {
        1: {},
        3: {},
        5: {}
    };
    let groupedHatchblocksContour = {};

    // Iterate through each hatchblock
    hatchBlocksArray.forEach(function(hatchblock) {
        // Get the tileID of the current hatchblock
        const tileID = hatchblock.getAttributeInt('tileID_3mf');
        const type = hatchblock.getAttributeInt('type');
        
        // Initialize tileID arrays for the specific types if they don't exist
        if (type === 1 || type === 3 || type === 5) {
            if (!groupedHatchblocksByType[type][tileID]) {
                groupedHatchblocksByType[type][tileID] = new HATCH.bsHatch();
            }
            groupedHatchblocksByType[type][tileID].addHatchBlock(hatchblock);
        } else {
            if (!groupedHatchblocksContour[tileID]) {
                groupedHatchblocksContour[tileID] = new HATCH.bsHatch();
            }
            groupedHatchblocksContour[tileID].addHatchBlock(hatchblock);
        }
    });
    
    let mergedHatchAll = new HATCH.bsHatch();

    // Merge hatch blocks for each type (1, 3, 5) separately
    Object.keys(groupedHatchblocksByType).forEach(function(type) {
        Object.entries(groupedHatchblocksByType[type]).forEach(function(entry) {
            let tileId = +entry[0];
            let tileHatch = entry[1];
            
            let mergeHatch = new HATCH.bsHatch();
            
            tileHatch.mergeShortLines(
                mergeHatch,2, Math.abs(PARAM.getParamReal('interface', 'interfaceOverlap'))+0.001,
                HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode
            );
  
            mergedHatchAll.moveDataFrom(mergeHatch);
        });
    });

    // Merge contour hatch blocks
    Object.entries(groupedHatchblocksContour).forEach(function(entry) {
        let tileId = +entry[0];
        let contourHatch = entry[1];
        
    contourHatch.mergeShortLines(
          contourHatch,3, 0.001,
          HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
      );  
        
        mergedHatchAll.moveDataFrom(contourHatch);
    });
    
    return mergedHatchAll;
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
  
    // Sort each tile's hatchblocks by priority and add them to the returnHatch
    Object.keys(groupedHatchblocks).forEach(function(tileID) {
        let hatchInTileArray = groupedHatchblocks[tileID];

        hatchInTileArray.sort(function(a, b) {
            let prioA = typePriorityMap.get(a.getAttributeInt('type'));
            let prioB = typePriorityMap.get(b.getAttributeInt('type'));
            return prioA - prioB;
        });

        hatchInTileArray.forEach(function(hatchBlock) {
            returnHatch.addHatchBlock(hatchBlock);
        });
    });
  
    return returnHatch;
}; // sortDownSkinByPosition

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