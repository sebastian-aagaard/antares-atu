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
  let thisModelLayer = thisModel.getModelLayerByNr(nLayerNr);
  let modelName = thisModel.getAttrib('ModelName');  

  // check if this layer is valid, if not move on
  if(!thisModelLayer.isValid()) return;
    
  // check if model in layer is outside buildplate
  checkifModelLayerisOutsideWorkArea(thisModelLayer,nLayerNr,modelName);  

  //CREATE CONTAINERS
  let allHatches = new HATCH.bsHatch();
  //let stripeIslands = new ISLAND.bsIsland();
  
  // RUN THROUGH ISLANDS
  let island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator
  let islandId = 1; 
  let stripeAngle;

  while(island_it.isValid()){
    // --- CREATE TOOLPATH --- //
    
    // process islands
    let processedToolpath = TPGEN.processIslands(thisModel,island_it,nLayerNr,islandId);
    
     allHatches.moveDataFrom(processedToolpath.resultHatch);
     //stripeIslands.addIslands(processedToolpath.stripe.islands); 
     stripeAngle = processedToolpath.stripeAngle;
    // get blocked path hatches
    let blockedPathHatch = TPGEN.getBlockedPathHatch(thisModel,island_it,islandId);

    // store hatch from processed islands  
    allHatches.moveDataFrom(blockedPathHatch);
    island_it.next();
    islandId++;
  };
  
  thisModelLayer.setAttribEx("stripeAngle",stripeAngle);
  
  // process open poly lines
  let polyLineHatch = TPGEN.getOpenPolyLinesHatch(modelData,nLayerNr);
  allHatches.moveDataFrom(polyLineHatch);
  
  hatchResult.moveDataFrom(allHatches);
  
}; // makeExposureLayer

  
const checkifModelLayerisOutsideWorkArea = function(modelLayer,layerNr,modelName){
    
  const limits = UTIL.getWorkAreaLimits();
    
  if(limits.xmin >= limits.xmax || limits.ymin >= limits.ymax){
    process.printError('Invalid Work Area Limits: would result in a zero or negative workspace area');
  }  
    
  const bounds = modelLayer.tryGetBounds2D();
  
  if(!bounds) {
    process.printError('Undefined model layer bounds at layer ' + layerNr + ' model ' + modelName);
  }
  
  if(bounds.minX < limits.xmin || bounds.maxX > limits.xmax || bounds.minY < limits.ymin || bounds.maxY > limits.ymax){
    
    throw new Error("Model outside workarea limits, breach found at layer number " 
    + layerNr + " model " + modelName + " modelBoundaries: " + bounds.minX +"/"+ bounds.maxX +";"
    + bounds.minY +"/"+ bounds.maxY + " limits: " + limits.xmin +"/"+ limits.xmax +";"+ limits.ymin +"/"+ limits.ymax);
  
    }
  
};