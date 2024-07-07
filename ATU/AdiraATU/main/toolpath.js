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

// try{
//  const allBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
//  } catch(e) {
//  
//    const layerZ = modelData.getLayerPosZ(nLayerNr);
//    modelData.setTrayAttrib('layerOffsetZ',layerZ);
//    modelData.setTrayAttrib('layerOffsetNumber',nLayerNr);
// 
//    process.printWarning("allLayerBoundaries unavailable");
//  
//    return;
//    }
// 
// const layerOffsetNumber =  modelData.getTrayAttrib('layerOffsetNumber');
// if(layerOffsetNumber) nLayerNr -= layerOffsetNumber;

  //nLayerNr += 1;

 let thisModel = modelData.getModel(0);
 let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
 let modelName = thisModel.getAttrib('ModelName');  

try{
  
 const layerZ = modelData.getLayerPosZ(nLayerNr);
    if (!layerZ) throw new Error ("failed getting layerZ");
 const allBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
    if (!allBoundaries) throw new Error ("failed getting allLayerBoundaries");
 const layerZBoundary = allBoundaries[layerZ];
    if (!layerZBoundary) throw new Error ("failed getting layerZBoundary");

} catch(e) {
  //const names = modelData.getTrayAttribEx('allLayerBoundaries').map(obj => obj.name).join(', ');
  process.printError('makeExposureLayer | getBoundaryData Failed: cannot access boundaries at layer nr: ' + nLayerNr + "/" + layerZ + ' - ' + e.message);

  };
  
//   if(!layerZBoundary) {
//    process.printError("no Boundary for layer " + nlayerNr + "at z " + layerZ);
//    return;
//    };
  

 //let scannerArray = modelData.getTrayAttribEx('scanhead_array');
   // check if this layer is valid, if not move on
  if(!thisLayer.isValid()) 
  {
    throw new Error("Make ExposureLayer: Invalid Layer " + nLayerNr + ' in: ' + modelName);
  }
  
  TILE.getTileArray(thisLayer,nLayerNr,modelData);
  
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
