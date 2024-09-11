/************************************************************
 * ToolPath
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const CONST = require('main/constants.js');
const TPGEN = require('main/toolpath_generation.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const TP2PASS = require('main/tile_to_passnumbergroup.js')
const LASER = require('main/laser_designation.js');
const TILE = require('main/tileing.js');

exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr){  

 let thisModel = modelData.getModel(0);
 let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
 let modelName = thisModel.getAttrib('ModelName');  
  
 //let scannerArray = modelData.getTrayAttribEx('scanhead_array');
   // check if this layer is valid, if not move on
  if(!thisLayer.isValid()) 
  {
    return;
    //throw new Error("Make ExposureLayer: Invalid Layer " + nLayerNr + ' in: ' + modelName);
  }
  
  let island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator

  //CREATE CONTAINERS
  let allHatches = new HATCH.bsHatch();


  // RUN THROUGH ISLANDS
  let islandId = 1; 

  while(island_it.isValid()){
    // --- CREATE TOOLPATH --- //
        
    // process islands
     allHatches.moveDataFrom(TPGEN.processIslands(thisModel,island_it,nLayerNr,islandId));
    
    // get blocked path hatches
    let blockedPathHatch = TPGEN.getBlockedPathHatch(thisModel,island_it,islandId);

    // store hatch from processed islands  
    allHatches.moveDataFrom(blockedPathHatch);
             
    island_it.next();
    islandId++;
  };
  // process open poly lines
  let polyLineHatch = TPGEN.getOpenPolyLinesHatch(modelData,nLayerNr);
  allHatches.moveDataFrom(polyLineHatch);
  
  TILE.getTileArray(thisLayer,nLayerNr,modelData);
 
  allHatches = TP2TILE.mergeShortLines(allHatches);
  
  //  --- TILE OPERATIONS --- //
  allHatches = TP2TILE.assignToolpathToTiles(thisModel,nLayerNr,allHatches);

  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  
  
  allHatches = TP2TILE.adjustInterfaceVectors(allHatches,thisLayer);

  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  

  allHatches = TP2TILE.mergeInterfaceVectors(allHatches); 
  
  allHatches = LASER.staticDistribution(thisModel,modelData,nLayerNr,allHatches);
  
   allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  
  
  //allhatches = LASER.handleContour(allHatches);
  
  allHatches = LASER.adjustInterfaceVectorsBetweenLasers(allHatches);

  allHatches = LASER.mergeLaserInterfaceVectors(allHatches);

  LASER.assignProcessParameters(allHatches,modelData,thisModel,nLayerNr);
 
  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  



//  allHatches = TP2TILE.deleteShortHatchLines(allHatches);
  
//allHatches = TP2TILE.mergeShortLinesByType(allHatches);  
  

  
  allHatches = TP2TILE.sortHatchByPriorityInTiles(allHatches);
  
  hatchResult.moveDataFrom(allHatches);
  
}; // makeExposureLayer