/************************************************************
 * ToolPath
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
//var PARAM = requireBuiltin('bsParam');
var ISLAND = requireBuiltin('bsIsland');
var HATCH = requireBuiltin('bsHatch');
//var MODEL = requireBuiltin('bsModel');
//var CONST = require('main/constants.js');
var TPGEN = require('main/toolpath_generation.js');
var TP2TILE = require('main/toolpath_to_tile.js');
var TP2PASS = require('main/tile_to_passnumbergroup.js')
//var SEG2D = requireBuiltin('seg2d');
//var UTIL = require('main/utility_functions.js');
var LASER = require('main/laser_designation.js');
//var PATH_SET = requireBuiltin('bsPathSet');
//var EXPOSURETIME = requireBuiltin('bsExposureTime');

exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr)
{  

 let thisModel = modelData.getModel(0);
 let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  
 // check if this layer is valid, if not move on
  if(!thisLayer.isValid()) 
  {
    //throw new Error("Invalid Layer " + nLayerNr);
    return;
  }
    
  let island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator

  //CREATE CONTAINERS
  let allFillHatch = new HATCH.bsHatch();
  let allFillIsland = new ISLAND.bsIsland();
  let allContourHatch = new HATCH.bsHatch();
  let allBlockedPathHatch = new HATCH.bsHatch();
  let allHatches = new HATCH.bsHatch();


  // RUN THROUGH ISLANDS
  let islandId = 1; 

  while(island_it.isValid()){
    // --- CREATE TOOLPATH --- //
        
    // process islands
    let processedIslands = TPGEN.processIslands(thisModel,island_it,nLayerNr,islandId);
    
    // store hatch from processed islands
    allFillHatch.moveDataFrom(processedIslands.fillHatch);
    allContourHatch.moveDataFrom(processedIslands.contourHatch);
    
    // add blocked path
    let blockedPathHatch = TPGEN.getBlockedPathHatch(thisModel,island_it,islandId);
    allBlockedPathHatch.moveDataFrom(blockedPathHatch);
    
    island_it.next();
    islandId++;
    }
    
  allHatches.moveDataFrom(allFillHatch);  
  // add contours
  allHatches.moveDataFrom(allContourHatch);
    
  // add blocked path
  allHatches.moveDataFrom(allBlockedPathHatch);
    
  // process open poly lines
  let polyLineHatch = TPGEN.getOpenPolyLinesHatch(modelData,nLayerNr);
  allHatches.moveDataFrom(polyLineHatch);
    
  // --- TILE OPERATIONS --- //
    
  allHatches = TP2TILE.assignToolpathToTiles(thisModel,nLayerNr,allHatches);
  //allHatches = TP2TILE.sortHatchBlocks(thisModel,nLayerNr,allHatches);
  allHatches = LASER.staticDistribution(thisModel,nLayerNr,allHatches);

  // --- PASS OPERATIONS --- //
  let passNumberGroups = TP2PASS.generatePassNumberGroup(allHatches);

  //merge shortlines within same pass and delete remaining short lines
  allHatches = TP2TILE.handleShortLines(passNumberGroups,thisModel); 

    
  //POST PROCESS TOOLPATH
  // toolpath to tiles and passnumber

  // group all all tiles by passnumber  
   
  // send all processed hatches to hatchResults for postprocessing  
  hatchResult.moveDataFrom(allHatches);
}; // makeExposureLayer
