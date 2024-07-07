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
// var ISLAND = requireBuiltin('bsIsland');
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
  let assignedHatch = new HATCH.bsHatch();
   

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
      // if tileoverlap is greater than requested
      if(tileArray[j].overlapX < PARAM.getParamReal('scanhead','tile_overlap_x')){
      
        let halfOverlap = Math.abs(tileArray[j].overlapX/2);
        let overLapCompensation = halfOverlap + PARAM.getParamReal('scanhead','tile_overlap_x');
           
        switch(tileArray[j].passNumber) {
          case 1:
            tile_x_max -= overLapCompensation;//
            break;
          case 2:
            tile_x_min += overLapCompensation;
            // if there is 3 passes
            if(thisLayer.getAttribEx('requiredPassesX')>2){
              tile_x_max -= overLapCompensation;
              }           
            break;
          case 3:
            tile_x_min += overLapCompensation;
            break;
          }  
        }
      
      // CREATE CLIPPING MASK
        
      // add the corrdinates to vector pointset
      let tile_points = new Array(4);
      tile_points[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
      tile_points[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
      tile_points[2] = new VEC2.Vec2(tile_x_max, tile_y_max); // max,max
      tile_points[3] = new VEC2.Vec2(tile_x_max, tile_y_min); // max,min

      vec2_tile_array[j] =  tile_points;  
      
      // clip allHatches to get hatches within this tile
      let tileHatch = UTIL.ClipHatchByRect(allHatches,vec2_tile_array[j],true);
      
      // assign attributes to hatches within tile
      tileHatch.setAttributeInt('passNumber', tileArray[j].passNumber);
      tileHatch.setAttributeInt('passNumber_3mf', (tileArray[j].passNumber)*1000);
      tileHatch.setAttributeInt('tile_index',tileArray[j].tile_number);
      tileHatch.setAttributeInt('tileID_3mf',tileArray[j].tile_number+(tileArray[j].passNumber)*1000);
      tileHatch.setAttributeReal('xcoord', tileArray[j].scanhead_x_coord);
      tileHatch.setAttributeReal('ycoord', tileArray[j].scanhead_y_coord);

      assignedHatch.moveDataFrom(tileHatch);
      
      // generate Segment obejct containing the tiles to 
      let startVec2 = new VEC2.Vec2(tile_x_cen,tile_y_max);
      let endVec2 = new VEC2.Vec2(tile_x_cen,tile_y_min);
      tileSegmentArray[j] = new SEG2D.Seg2d(startVec2,endVec2).toString();  
          
    } //for
    
    //thisLayer.setAttribEx('tileSegmentArray',tileSegmentArray);
    
    return assignedHatch;
    
} //assignToolpathToTiles

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

// exports.handleShortLines = (thisModel,nLayerNr,hatchObj) => {
//   
//   let scanheadArray = thisModel.getAttribEx('scanhead_array');  
//   let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
//   let tileArray = thisLayer.getAttribEx('tileTable');
//   let returnHatch = new HATCH.bsHatch();
//   let mergedHatch = new HATCH.bsHatch();
//   
//   let minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
//   let maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
//   
//   let hatchIterator = hatchObj.getHatchBlockIterator();
//   
//   let scannerReachX = PARAM.getParamReal('scanhead','x_scanner_actual_allowed_reach');
//   let scannerReachY = PARAM.getParamReal('scanhead','y_scanner_actual_allowed_reach');
//   
//   let hatchArray = hatchObj.getHatchBlockArray();
//   
//   for(let tileIterator = 0; tileIterator<tileArray.length;tileIterator++){
//     
//     let scanheadPosX = tileArray[tileIterator].scanhead_x_coord;
//     let scanheadPosY = tileArray[tileIterator].scanhead_y_coord;
//     
//     // get the border of the current tile 
//     let tile_x_min = tileArray[tileIterator].scanhead_outline[0].m_coord[0]//
//     let tile_x_max = tileArray[tileIterator].scanhead_outline[2].m_coord[0]//
//     let tile_y_min = tileArray[tileIterator].scanhead_outline[0].m_coord[1];//
//     let tile_y_max = tileArray[tileIterator].scanhead_outline[2].m_coord[1];//
//       
//     // add the corrdinates to vector pointset
//     let tile_points = new Array(4);
//     tile_points[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
//     tile_points[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
//     tile_points[2] = new VEC2.Vec2(tile_x_max, tile_y_max); // max,max
//     tile_points[3] = new VEC2.Vec2(tile_x_max, tile_y_min); // max,min
// 
//     
//     // clip allHatches to get hatches within this tile
//     let tileHatch = UTIL.ClipHatchByRect(hatchObj,tile_points,true);
//     
//     for(let laserIterator = 0;laserIterator<scanheadArray.length;laserIterator++){
//       
//       //find merge blocking geometry
//       // find distance from scanheadposition to the center of the laser and 
//       // the allow the scanner to mark merged lines within its reach
//       let blocking_min_x = scanheadPosX+scanheadArray[laserIterator].xref-scannerReachX/2;
//       let blocking_max_x = scanheadPosX+scanheadArray[laserIterator].xref+scannerReachX/2;
//       let blocking_min_y = scanheadPosY+scanheadArray[laserIterator].yref-scannerReachY/2;
//       let blocking_max_y = scanheadPosY+scanheadArray[laserIterator].yref+scannerReachY/2;
//     
//       let blockingPathArray = new Array();
//       blockingPathArray[0] = new VEC2.Vec2(blocking_min_x, blocking_min_y); //min,min
//       blockingPathArray[1] = new VEC2.Vec2(blocking_min_x, blocking_max_y); //min,max
//       blockingPathArray[2] = new VEC2.Vec2(blocking_max_x, blocking_min_y); // max,min
//       blockingPathArray[3] = new VEC2.Vec2(blocking_max_x, blocking_max_y); // max,max
//       
//       let blocking_pathset = new PATH_SET.bsPathSet();
//       blocking_pathset.addNewPath(blockingPathArray);
//               
//       let mergecount = tileHatch.mergeShortLines(mergedHatch,minVectorLenght,maxMergeDistance,
//       HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagPreferHatchMode,blocking_pathset);
//       
//       returnHatch.moveDataFrom(mergedHatch);
//       
//       }
//     }
  
// //   while(hatchIterator.isValid){
// //     
// //     let thisPassHatch = new HATCH.bsHatch();
// //     let thisPassHatchArray = passNumberGroups[passNumber].blocks;
// //     let passXCoord = 0;
// //     let passYCoord = [];
// //     
// //     for(let i = 0; i<thisPassHatchArray.length;i++){ // store blocks into hatch container
// //       passXCoord = thisPassHatchArray[i].getAttributeReal('xcoord');
// //       passYCoord[i] = thisPassHatchArray[i].getAttributeReal('ycoord');
// //       thisPassHatch.addHatchBlock(thisPassHatchArray[i]);
// //     }
// //     
// //     //find merge blocking geometry
// //     let blocking_min_x = passXCoord;
// //     let blocking_max_x = passXCoord+scanheadArray[4].abs_x_max;
// //     let blocking_min_y = Math.min(passYCoord);
// //     let blocking_max_y = Math.max(passYCoord)+scanheadArray[0].rel_y_max;
// // 
// //     let firstBlock2Dvec = new Array();
// //     firstBlock2Dvec[0] = new VEC2.Vec2(blocking_min_x, blocking_min_y); //min,min
// //     firstBlock2Dvec[1] = new VEC2.Vec2(blocking_min_x, blocking_max_y); //min,max
// //     firstBlock2Dvec[2] = new VEC2.Vec2(blocking_max_x, blocking_min_y); // max,min
// //     firstBlock2Dvec[3] = new VEC2.Vec2(blocking_max_x, blocking_max_y); // max,max
// //       
// //     let blocking_pathset = new PATH_SET.bsPathSet();
// //     blocking_pathset.addNewPath(firstBlock2Dvec);
// // 
// //     let mergecount = thisPassHatch.mergeShortLines(mergedHatch,minVectorLenght,maxMergeDistance,
// //     HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagPreferHatchMode,blocking_pathset);
// //      
// //     mergedHatch.deleteShortLines(minVectorLenght); // remove small vectors
// //       
// //     passNumberGroups[passNumber].blocks = mergedHatch.getHatchBlockArray();
// // 
// //     returnHatch.moveDataFrom(mergedHatch);
// //     
// //   hatchIterator.next();
// //   }
  
//   return returnHatch;
//   
// } //handleShortLines

exports.handleShortLines = (passNumberGroups,thisModel,bsModelData) => {
  
  const scanheadArray = bsModelData.getTrayAttribEx('scanhead_array');  
  const returnHatch = new HATCH.bsHatch();
  const mergedHatch = new HATCH.bsHatch();
  
  const minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
  const maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
  
  for (let passNumber in passNumberGroups){
    
    const thisPassHatch = new HATCH.bsHatch();
    const thisPassHatchArray = passNumberGroups[passNumber].blocks;
    const passYCoord = [];
    let passXCoord = 0;
    
    for(let i = 0; i<thisPassHatchArray.length;i++){ // store blocks into hatch container
      
      passXCoord = thisPassHatchArray[i].getAttributeReal('xcoord');
      passYCoord[i] = thisPassHatchArray[i].getAttributeReal('ycoord');
      thisPassHatch.addHatchBlock(thisPassHatchArray[i]);
      
    }
    
    //find merge blocking geometry
    const blocking_min_x = passXCoord;
    const blocking_max_x = passXCoord+scanheadArray[4].abs_x_max;
    const blocking_min_y = Math.min(passYCoord);
    const blocking_max_y = Math.max(passYCoord)+scanheadArray[0].rel_y_max;

    const firstBlock2Dvec = new Array();
    firstBlock2Dvec[0] = new VEC2.Vec2(blocking_min_x, blocking_min_y); //min,min
    firstBlock2Dvec[1] = new VEC2.Vec2(blocking_min_x, blocking_max_y); //min,max
    firstBlock2Dvec[2] = new VEC2.Vec2(blocking_max_x, blocking_min_y); // max,min
    firstBlock2Dvec[3] = new VEC2.Vec2(blocking_max_x, blocking_max_y); // max,max
      
    const blocking_pathset = new PATH_SET.bsPathSet();
    blocking_pathset.addNewPath(firstBlock2Dvec);

//     let mergecount = thisPassHatch.mergeShortLines(mergedHatch,minVectorLenght,
//     maxMergeDistance, HATCH.nMergeShortLinesFlagAllowSameHatchBlock ,blocking_pathset);

    mergedHatch.moveDataFrom(thisPassHatch)

    mergedHatch.deleteShortLines(minVectorLenght); // remove small vectors
      
    passNumberGroups[passNumber].blocks = mergedHatch.getHatchBlockArray();

    returnHatch.moveDataFrom(mergedHatch);

  }
  
  return returnHatch;
  
} //handleShortLines