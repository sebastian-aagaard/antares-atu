/************************************************************
 * Post Processing Assign Tiles
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

exports.postprocessCutVectorsIntoTiles_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
        
  let layerCount = layer_end_nr - layer_start_nr + 1;
  let modelCount = modelData.getModelCount();
    
  progress.initSteps(layerCount);
     
  let layerIterator = modelData.getPreferredLayerProcessingOrderIterator(
    layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
    
  while(layerIterator.isValid() && !progress.cancelled()){
    
    let layerNumber = layerIterator.getLayerNr();
    let layerZ = layerIterator.getLayerZ();
    let zUnit = modelData.getZUnit();
    let modelZero = modelData.getModel(0);
    let modelLayer = modelZero.maybeGetModelLayerByNr(layerNumber);
    
    if(!modelLayer) {
      process.printError("Couldn't get modelLayer " + layerNumber + " at " + layerZ + "mm"); 
      }
            
    let exposureArray = modelData.getLayerPolylineArray(layerNumber,
    POLY_IT.nLayerExposure,'rw');

    let allHatches = new HATCH.bsHatch();
    exposureArray.forEach(function(polyline) {
      polyline.setAttributeInt('modelIndex',polyline.getModelIndex());
      polyline.setAttributeInt('_processing_order',1);
      polyline.polylineToHatch(allHatches);
      
      polyline.deletePolyline();
      });
    
    ////////////////////////////////////////////////
    /// Merge Hatch Blocks with Same Attributes  ///
    ////////////////////////////////////////////////
     
    allHatches.mergeHatchBlocks({
        "bConvertToHatchMode": true,
        "nConvertToHatchMaxPointCount": 2,
        //"nMaxBlockSize": 1024,
        "bCheckAttributes": true});
     
        
    //let assignedHatch = TP2TILE.categorizeToolPath(modelData,LayerNumber,allHatches);  
    //let assignedHatch = TP2TILE.assignToolpathToTiles(allHatches,modelLayer).allHatches;
    
    allHatches = TP2TILE.mergeShortLines(allHatches);

    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });

    //  --- TILE OPERATIONS --- //
    let assignContainer = TP2TILE.assignToolpathToTiles(allHatches,modelLayer);
    allHatches = assignContainer.allHatches; 
    allHatches = UTIL.adjustContourInterface(allHatches,modelLayer,false);
    allHatches = UTIL.adjustInterfaceVectors(allHatches,modelLayer,false);

    allHatches = UTIL.mergeInterfaceVectors(allHatches, UTIL.getGroupedHatchObjectByTileType,false); 

    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });  

    allHatches = LASER.staticDistribution(modelData,allHatches,modelLayer);
    allHatches = UTIL.adjustContourInterface(allHatches,modelLayer,true);
    allHatches = UTIL.adjustInterfaceVectors(allHatches,modelLayer,true);

    allHatches = UTIL.mergeInterfaceVectors(allHatches, UTIL.getGroupedHatchObjectByTileTypeLaserId,true);

    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });
      
//     let tileIslands = assignContainer.tileIslands;
//     let tileIntersectIslands = TP2TILE.generateTileIslands(tileIslands,layerNumber,modelData);
     let stripeAngle = Number(modelLayer.getAttrib("stripeAngle"));
//     let tileStripes = TP2TILE.generateTileStripes(tileIntersectIslands,layerNumber,stripeAngle);
// 
//     allHatches = TP2TILE.clipIntoStripes(allHatches,tileStripes,modelLayer);

    allHatches = LASER.mergeShortLinesForEachBsid(allHatches);
      
    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });
    //allHatches = TP2TILE.sortHatches(allHatches,stripeAngle);

    //allHatches.removeAttributes('stripeId');

    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });  

    LASER.assignProcessParameters(allHatches,modelData,layerNumber,modelLayer); 
        
    modelLayer.createExposurePolylinesFromHatch(allHatches);

    layerIterator.next();
  };   
}

exports.postprocessDivideHatchBlocksIntoTiles_MT = function( 
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
    let zUnit = modelData.getZUnit();
    let modelZero = modelData.getModel(0);
    let modelLayer = modelZero.maybeGetModelLayerByNr(layerNumber);
    
    if(!modelLayer) {
      process.printError("Couldn't get modelLayer " + layerNumber + " at " + layerZ + "mm"); 
      }
            
    let exposureArray = modelData.getLayerPolylineArray(layerNumber,
    POLY_IT.nLayerExposure,'rw');

    let allHatches = new HATCH.bsHatch();
    exposureArray.forEach(function(polyline, index) {
      polyline.setAttributeInt('modelIndex',polyline.getModelIndex());
      polyline.setAttributeInt('stripeId',index);
      polyline.setAttributeInt('_processing_order',1);
      polyline.polylineToHatch(allHatches);
      
      polyline.deletePolyline();
      });
     
    allHatches = TP2TILE.mergeShortLines(allHatches);

    allHatches.mergeHatchBlocks({
      "bConvertToHatchMode": true,
      "bCheckAttributes": true
    });

    //  --- TILE OPERATIONS --- //
    let assignContainer = TP2TILE.assignToolpathToTiles(allHatches,modelLayer);
    allHatches = assignContainer.allHatches; 

    //allHatches = LASER.staticDistribution(modelData,allHatches,modelLayer);
      
    allHatches = LASER.mergeShortLinesForEachBsid(allHatches);

    //LASER.assignProcessParameters(allHatches,modelData,layerNumber,modelLayer); 
        
    modelLayer.createExposurePolylinesFromHatch(allHatches);

    layerIterator.next();
  };
  
  let endTime = Date.now()  
  process.print('tile: Calculation time: ' + (endTime - startTime) + ' ms');
}