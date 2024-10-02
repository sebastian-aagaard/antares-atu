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

// -------- SCRIPT INCLUDES -------- //
const UTIL = require('main/utility_functions.js');
const CONST = require('main/constants.js');
const TPGEN = require('main/toolpath_generation.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const TP2PASS = require('main/tile_to_passnumbergroup.js')
const LASER = require('main/laser_designation.js');
const TILE = require('main/tileing.js');

// -------- FUNCTIONS -------- //
exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr){  

  let thisModel = modelData.getModel(0);
  let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  let modelName = thisModel.getAttrib('ModelName');  

  // check if this layer is valid, if not move on
  if(!thisLayer.isValid()) return;

  //CREATE CONTAINERS
  let allHatches = new HATCH.bsHatch();
  let stripeIslands = new ISLAND.bsIsland();
  
  // RUN THROUGH ISLANDS
  let island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator
  let islandId = 1; 
  let stripeAngle;

  while(island_it.isValid()){
    // --- CREATE TOOLPATH --- //
        
    // process islands
    let processedToolpath = TPGEN.processIslands(thisModel,island_it,nLayerNr,islandId);
    
     allHatches.moveDataFrom(processedToolpath.resultHatch);
     stripeIslands.addIslands(processedToolpath.stripe.islands); 
     stripeAngle = processedToolpath.stripe.angle;
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
  
  TILE.storeTileTableAsLayerAttrib(thisLayer,nLayerNr,modelData);

  allHatches = TP2TILE.mergeShortLines(allHatches);

  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });

  //  --- TILE OPERATIONS --- //
  allHatches = TP2TILE.assignToolpathToTiles(allHatches,thisLayer);
  allHatches = UTIL.adjustContourInterface(allHatches,thisLayer,false);
  allHatches = UTIL.adjustInterfaceVectors(allHatches,thisLayer,false);

  allHatches = UTIL.mergeInterfaceVectors(allHatches, UTIL.getGroupedHatchObjectByTileType,false); 

  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  

  allHatches = LASER.staticDistribution(modelData,allHatches,thisLayer);
  allHatches = UTIL.adjustContourInterface(allHatches,thisLayer,true);
  allHatches = UTIL.adjustInterfaceVectors(allHatches,thisLayer,true);

  allHatches = UTIL.mergeInterfaceVectors(allHatches, UTIL.getGroupedHatchObjectByTileTypeLaserId,true);

  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });
  
  ////TP2Tile.combineSmallStripeIslands(stripeIslands); TODO
  allHatches = TP2TILE.clipIntoStripes(allHatches,stripeIslands)
  
  allHatches = LASER.mergeShortLinesForEachBsid(allHatches);
  
  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });
  
  allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });

  allHatches = TP2TILE.sortHatches(allHatches,stripeAngle);
  
  LASER.assignProcessParameters(allHatches,modelData,thisModel,nLayerNr);

  allHatches = TP2TILE.sortHatchByPriorityInTiles(allHatches);

  allHatches = TP2TILE.deleteShortHatchLines(allHatches);

  hatchResult.moveDataFrom(allHatches);
  
}; // makeExposureLayer