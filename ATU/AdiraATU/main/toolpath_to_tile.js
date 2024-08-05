/************************************************************
 * Toolpath Indexing
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
// var MODEL = requireBuiltin('bsModel');
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const CONST = require('main/constants.js');
// var POLY_IT = requireBuiltin('bsPolylineIterator');
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

  ////////////////////////////////////////////////
  /// Merge Hatch Blocks with Same Attributes  ///
  ////////////////////////////////////////////////
   
  allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "nConvertToHatchMaxPointCount": 2,
      //"nMaxBlockSize": 512,
      "bCheckAttributes": true
    }
  );
 
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
  //let assignedHatch = new HATCH.bsHatch();
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
      
      
            // SPECIAL CASE - move to tileing!
  //    if tileoverlap is greater than requested
      if(tileArray[j].overlapX < PARAM.getParamReal('scanhead','tile_overlap_x')){
      
        let halfOverlap = Math.abs(tileArray[j].overlapX/2);
        let overLapCompensation = halfOverlap + PARAM.getParamReal('scanhead','tile_overlap_x');
           
        switch(tileArray[j].passNumber) {
          case 1:
            tile_x_max -= overLapCompensation;//
            break;
          case 2:
            tile_x_min += overLapCompensation;
            //if there is 3 passes
            if(tileArray[j].requiredPassesX>2){
              tile_x_max -= overLapCompensation;
              }           
            break;
          case 3:
            tile_x_min += overLapCompensation;
            break;
          };  
         };
      // CREATE CLIPPING MASK
      
      
        
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
      anotateIntefaceHatchblocks(tileHatch,tileID_3mf);
  
        
      // assign attributes to hatches within tile
      //tileHatch.setAttributeInt('passNumber', tileArray[j].passNumber);
      //tileHatch.setAttributeInt('passNumber_3mf', (tileArray[j].passNumber)*1000);
      //tileHatch.setAttributeInt('tile_index',tileArray[j].tile_number);
      tileHatch.setAttributeInt('tileID_3mf',tileID_3mf);
      tileHatch.setAttributeReal('xcoord', tileArray[j].scanhead_x_coord);
      tileHatch.setAttributeReal('ycoord', tileArray[j].scanhead_y_coord);

      assignedHatch.moveDataFrom(tileHatch);
      assignedHatch.moveDataFrom(tileHatch_outside);
      
      // generate Segment obejct containing the tiles to 
      let startVec2 = new VEC2.Vec2(tile_x_cen,tile_y_max);
      let endVec2 = new VEC2.Vec2(tile_x_cen,tile_y_min);
      tileSegmentArray[j] = new SEG2D.Seg2d(startVec2,endVec2).toString();  
          
    } //for
    
    //thisLayer.setAttribEx('tileSegmentArray',tileSegmentArray);
    
    return assignedHatch;
    
} //assignToolpathToTiles


const anotateIntefaceHatchblocks = function(hatch,tileID) {

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
                             
          let sOverLapNumber = overlapNumber.toString();          
          let overlapping_designation = 'overlappingTile_' + sOverLapNumber;
          
          thisHatchBlock.setAttributeInt(overlapping_designation,tileID);
          thisHatchBlock.setAttributeInt('numberofOverlappingTiles',overlapNumber);
          
        };  

    hatchBlockIterator.next();
    };
  };

exports.sortHatchBlocks = (thisModel,nLayerNr,allHatches) => {
 
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

}

exports.adjustInterfaceVectors = function(bsModel,nLayerNr,allHatches){

  let hatchBlockIterator = allHatches.getHatchBlockIterator();
  let adjustedHatch = new HATCH.bsHatch();
  let nonAdjustedHatch = new HATCH.bsHatch();


  while (hatchBlockIterator.isValid()) {   
    let thisHatchBlock = hatchBlockIterator.get();
    let overlapNumber = thisHatchBlock.getAttributeInt('numberofOverlappingTiles');
    
    if(overlapNumber === 0) {
      
        nonAdjustedHatch.addHatchBlock(thisHatchBlock);
      
      } else {
       
       // let mode = thisHatchBlock.getPolylineMode();

        //if (mode === 1) { // 1 = open polyline

          //adjustedHatch.addHatchBlock(thisHatchBlock);

        //};
              
        //if(mode === 2){ // 2 = hatch

        //splitOverlappingExposure(thisHatchBlock);
        
        adjustedHatch.moveDataFrom(applyZipperInterface(thisHatchBlock, PARAM.getParamInt('interface','tileInterface')===0));
        //};
    };
    
  hatchBlockIterator.next();
  };
    
  allHatches.makeEmpty();
  allHatches.moveDataFrom(nonAdjustedHatch);
  allHatches.moveDataFrom(adjustedHatch);
  
  return allHatches;
}


const applyZipperInterface = function(hatchBlock,bOverlap){
            
  let firstTileId = hatchBlock.getAttributeInt('overlappingTile_1');
  let secondTileId = hatchBlock.getAttributeInt('overlappingTile_2');
  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  
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
     
  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  firstHatch.addPaths(firstOverlapPathsSet);
  secondHatch.addPaths(secondOverlapPathsSet);
  
  firstHatch.setAttributeInt('tileID_3mf', firstTileId);
  secondHatch.setAttributeInt('tileID_3mf', secondTileId);
  
  let adjustedHatch = new HATCH.bsHatch();

  adjustedHatch.moveDataFrom(firstHatch);
  adjustedHatch.moveDataFrom(secondHatch);

  adjustedHatch.setAttributeInt('type',hatchType);
  adjustedHatch.setAttributeInt('islandId',islandId);
  
  return adjustedHatch; 
}; 

exports.mergeShortLines = (hatch,thisLayer) => {
  
  const mergedHatch = new HATCH.bsHatch();
  const resultHatch = new HATCH.bsHatch();
  const collectorHatch = new HATCH.bsHatch();

  const minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
  const maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
  
  let hatchBlockIterator = hatch.getHatchBlockIterator();
  
  let tileTable3mf = thisLayer.getAttribEx('tileTable_3mf');
  let currentTileID = tileTable3mf[0][0].attributes.tileID; 
  
  while(hatchBlockIterator.isValid()){
        
    let hatchBlock = hatchBlockIterator.get();
    let thisTileID = hatchBlock.getAttributeInt('tileID_3mf');
    
    hatchBlockIterator.next();
    
    let nextIsValid = hatchBlockIterator.isValid();
    
    hatchBlockIterator.prev();
    
    if(thisTileID !== currentTileID || !nextIsValid) {
      
      collectorHatch.mergeShortLines(collectorHatch,1,
      0.01,HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode);
      
      collectorHatch.mergeShortLines(mergedHatch,minVectorLenght,
      maxMergeDistance,HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode);
      
      resultHatch.moveDataFrom(mergedHatch);
      collectorHatch.makeEmpty();
      
      currentTileID = thisTileID; 
      
      }
      
    collectorHatch.addHatchBlock(hatchBlock);
    
    hatchBlockIterator.next();
    };
  

  return resultHatch;
  
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

exports.mergeInterfaceVectors = function(hatch,thisLayer){
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  
  // Create an object to hold arrays of hatchBlocksArray grouped by tileID
    const groupedHatchblocks = {};

    // Iterate through each hatchblock
    hatchBlocksArray.forEach(hatchblock => {
        // Get the tileID of the current hatchblock
        const tileID = hatchblock.getAttributeInt('tileID_3mf');
        
        // If the tileID does not exist in the groupedHatchblocks object, create a new array for it
        if (!groupedHatchblocks[tileID]) {
            groupedHatchblocks[tileID] = new HATCH.bsHatch();
        }

        // Add the hatchblock to the appropriate array based on its tileID
        groupedHatchblocks[tileID].addHatchBlock(hatchblock);
    });
    
    let mergedHatchAll = new HATCH.bsHatch();
    Object.values(groupedHatchblocks).forEach(tileHatch => {

      let mergeHatch = new HATCH.bsHatch();
      let mergecount = tileHatch.mergeShortLines(mergeHatch,0.2,0.01,0);

      mergedHatchAll.moveDataFrom(mergeHatch);
      });
      
    //merge remaining short lines
    let blockingIslands = getBlockingGeometry(thisLayer);   
    //mergedHatchAll.mergeShortLines(mergedHatchAll,0.2,0.01,0,blockingIslands.getIslandArray());

    return mergedHatchAll;
  };
  
const getBlockingGeometry = function (modelLayer){
  
  let tileTable = modelLayer
  .getAttribEx('tileTable');
  
  let allBlockingPaths = new PATH_SET.bsPathSet();
  let blockingIslands = new ISLAND.bsIsland();
  
  tileTable.forEach(tile => {
    let thisTile = new PATH_SET.bsPathSet();
    let pointArray = [];

    tile.scanhead_outline.forEach (point => {
      pointArray.push(new VEC2.Vec2(point.m_coord[0] , point.m_coord[1]));      
    });
    
    thisTile.addNewPath(pointArray);
    thisTile.setClosed(true); 
    thisTile.createOffset(2*PARAM.getParamReal('scanhead', 'tile_overlap_x'));
    
    blockingIslands.addPathSet(thisTile);
  });  

  return blockingIslands;
};
 
  
