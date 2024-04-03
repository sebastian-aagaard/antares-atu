/************************************************************
 * ToolPath
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
//var PARAM = requireBuiltin('bsParam');
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
//var MODEL = requireBuiltin('bsModel');
const CONST = require('main/constants.js');
const TPGEN = require('main/toolpath_generation.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const TP2PASS = require('main/tile_to_passnumbergroup.js')
//var SEG2D = requireBuiltin('seg2d');
//var UTIL = require('main/utility_functions.js');
const LASER = require('main/laser_designation.js');
//var PATH_SET = requireBuiltin('bsPathSet');
//var EXPOSURETIME = requireBuiltin('bsExposureTime');

exports.makeExposureLayer = (modelData, hatchResult, nLayerNr) => {  

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

    // store hatch from processed islands 
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
    
  // --- TILE OPERATIONS --- //
  allHatches = TP2TILE.assignToolpathToTiles(thisModel,nLayerNr,allHatches);
  //allHatches = TP2TILE.sortHatchBlocks(thisModel,nLayerNr,allHatches);
  allHatches = LASER.staticDistribution(thisModel,modelData,nLayerNr,allHatches);
  
  LASER.assignProcessParameters(allHatches,thisModel);
  //  LASER.sortPriority(allHatches);
  // --- PASS OPERATIONS --- //
  let passNumberGroups = TP2PASS.generatePassNumberGroup(allHatches);

  //merge shortlines within same pass and delete remaining short lines
  allHatches = TP2TILE.handleShortLines(passNumberGroups,thisModel,modelData); 

    
  //POST PROCESS TOOLPATH
  // toolpath to tiles and passnumber

  // group all all tiles by passnumber  
   
  // send all processed hatches to hatchResults for postprocessing  
  hatchResult.moveDataFrom(allHatches);
}; // makeExposureLayer
