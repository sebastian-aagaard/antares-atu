/************************************************************
 * ToolPath
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const CONST = require('main/constants.js');
const TPGEN = require('main/toolpath_generation.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const TP2PASS = require('main/tile_to_passnumbergroup.js')
const LASER = require('main/laser_designation.js');
let TILE = require('main/tileing.js');

exports.makeExposureLayer = (modelData, hatchResult, nLayerNr) => {  

 let thisModel = modelData.getModel(0);
 let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
 let modelName = thisModel.getAttrib('ModelName');  
  
 //let scannerArray = modelData.getTrayAttribEx('scanhead_array');
   // check if this layer is valid, if not move on
  if(!thisLayer.isValid()) 
  {
    throw new Error("Make ExposureLayer: Invalid Layer " + nLayerNr + ' in: ' + modelName);
  }
  
  let island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator

  //CREATE CONTAINERS
  let allHatches = new HATCH.bsHatch();


  // RUN THROUGH ISLANDS
  let islandId = 1; 

  while(island_it.isValid()){
    // --- CREATE TOOLPATH --- //
        
    // process islands
    let { partHatch,
          downSkinHatch,
          downSkinContourHatch,
          contourHatch,
          supportHatch,
          supportContourHatch  } = 
      TPGEN.processIslands(thisModel,island_it,nLayerNr,islandId);
    
    // get blocked path hatches
    let blockedPathHatch = TPGEN.getBlockedPathHatch(thisModel,island_it,islandId);

    // store hatch from processed islands  (TODO move everythning to same hatch initially)
    allHatches.moveDataFrom(supportHatch);
    allHatches.moveDataFrom(supportContourHatch);      
    allHatches.moveDataFrom(partHatch);
    allHatches.moveDataFrom(downSkinHatch);
    allHatches.moveDataFrom(contourHatch);
    allHatches.moveDataFrom(downSkinContourHatch);
    allHatches.moveDataFrom(blockedPathHatch);
    
    TPGEN.sortHatchByPriority(allHatches);             
          
    island_it.next();
    islandId++;
    }
    
  // process open poly lines
  let polyLineHatch = TPGEN.getOpenPolyLinesHatch(modelData,nLayerNr);
  allHatches.moveDataFrom(polyLineHatch);
    
    
  TILE.getTileArray(thisLayer,nLayerNr,modelData);
    
  // --- TILE OPERATIONS --- //
  allHatches = TP2TILE.assignToolpathToTiles(thisModel,nLayerNr,allHatches);
  allHatches = TP2TILE.adjustInterfaceVectors(thisModel,nLayerNr,allHatches);

  let hatchBlockArray = TP2TILE.groupHatchblocksByTileID(allHatches);
    
    
    
  allHatches.makeEmpty();
//      
// allHatchesArray.sort((a, b) => {
//     // Compare by IslandID first
//     let islandA = a.getAttributeInt('islandId');
//     let islandB = b.getAttributeInt('islandId');
//     if (islandA !== islandB) {
//         return islandA - islandB;
//     }
// 
//     // If IslandID is the same, then compare by minY
//     let minYA = a.getBounds2D().minY;
//     let minYB = b.getBounds2D().minY;
//     return minYA - minYB;
// });
//     

// allHatchesArray.forEach(hatchBlock => {
//   
//   allHatches.addHatchBlock(hatchBlock);
//   
//   });
// 
//     let mergedAllHatch = new HATCH.bsHatch();
//     allHatches.mergeShortLines(mergedAllHatch,1,1,0);

    //adjust interface hatchblocks!
    
    //allHatches = TP2TILE.sortHatchBlocks(thisModel,nLayerNr,allHatches);
    
    
    
 //  allHatches = LASER.staticDistribution(thisModel,modelData,nLayerNr,allHatches);
//   
//   LASER.assignProcessParameters(allHatches,thisModel);
//   //  LASER.sortPriority(allHatches);
//   // --- PASS OPERATIONS --- //
//   let passNumberGroups = TP2PASS.generatePassNumberGroup(allHatches);
// 
//   //merge shortlines within same pass and delete remaining short lines
//   allHatches = TP2TILE.handleShortLines(passNumberGroups,thisModel,modelData); 

   
  hatchResult.moveDataFrom(allHatches);
  
  
}; // makeExposureLayer


