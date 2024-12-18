/************************************************************
 * Post Processing Initalization
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';
// -------- INCLUDES -------- //
const MODEL = requireBuiltin('bsModel');
const PARAM = requireBuiltin('bsParam');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const EXPOSURE = requireBuiltin('bsExposureTime');
const HATCH = requireBuiltin('bsHatch');

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
const UTIL = require('main/utility_functions.js');
const TILE = require('main/tileing.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const LASER = require('main/laser_designation.js');


    // 1. get tile
    // 2. assign toolpath to tiles

exports.postprocess_storeScannerArray = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
    
  progress.initSteps(1);
  LASER.storeScannerArrayInTray(modelData);  
  progress.update(100);
    
}

exports.storeTileLayoutInLayer_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
  
  let startTime = Date.now();
    
  let layerCount = layer_end_nr - layer_start_nr + 1;
  let modelCount = modelData.getModelCount();
    
  progress.initSteps(layerCount);
     
  let layerIterator = modelData.getPreferredLayerProcessingOrderIterator(
    layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
    
  while(layerIterator.isValid() && !progress.cancelled()){
    
    let layerNumber = layerIterator.getLayerNr();
    let layerZ = layerIterator.getLayerZ();
    let modelZero = modelData.getModel(0);
    let modelLayer = modelZero.maybeGetModelLayerByNr(layerNumber);
    
    if(!modelLayer) {
      process.printError("Couldn't get modelLayer " + layerNumber + " at " + layerZ + "mm"); 
    }
      
    TILE.storeTileTableAsLayerAttrib(modelLayer, layerNumber, modelData);
    
    progress.step(1);
    layerIterator.next();
    
  };
  
  let endTime = Date.now()  
  process.print('storeTileLayoutInLayer_MT: Calculation time: ' + (endTime - startTime) + ' ms');
}

exports.reassignIslandIdGlobally_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
    
  let layerCount = layer_end_nr - layer_start_nr + 1;
  progress.initSteps(layerCount);

  let layerIterator = modelData.getPreferredLayerProcessingOrderIterator(
  layer_start_nr, layer_end_nr, POLY_IT.nIslandBorderPolygons);
    
  while(layerIterator.isValid() && !progress.cancelled()){
    
    let layerNumber = layerIterator.getLayerNr();
    let layerZ = layerIterator.getLayerZ();
    let modelCount = modelData.getModelCount();
    
    let globalIslandId = 0;
    
    for (let modelId = 0; modelId < modelCount; modelId++){
      let model = modelData.getModel(modelId);
      let modelLayer = model.maybeGetModelLayerByNr(layerNumber);
      if(!modelLayer) {
        continue; 
      }
      
      let modelPolylineArray =  modelData.getLayerPolylineArrayEx({
       "nLayerNr" : layerNumber,
       "nIterateOn" : POLY_IT.nLayerExposure,
       "sAccess" : "rw",
       "models" : [modelId]
      })
      
      let previousIslandId = 0; 
      modelPolylineArray.forEach(polylineIterator => {
        if(previousIslandId != polylineIterator.getAttributeInt('islandId')){
          globalIslandId++;
        }
        previousIslandId = polylineIterator.getAttributeInt('islandId');
        polylineIterator.setAttributeInt('islandId',globalIslandId);
      })
    }
    progress.step(1);
    layerIterator.next(); 
  }    
}