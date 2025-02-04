/************************************************************
 * PostProcessorPlot
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
const PATH_SET = requireBuiltin('bsPathSet');
const VEC2 = requireBuiltin('vec2');

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
const UTIL = require('main/utility_functions.js');

/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.drawTileArray_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
        
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
     layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
  
  while(layerIt.isValid() && !progress.cancelled()){
    
    const layerNr = layerIt.getLayerNr();
    

    const model = UTIL.getModelsInLayer(modelData,layerNr)[0];
    
    if (!model) {
      process.printWarning("No model found in " + layerNr + ' / ' + layerIt.getLayerZ() + ' mm');
      layerIt.next();
      progress.step(1);
      continue;
    }
    
    let thisModelLayer = model.maybeGetModelLayerByNr(layerNr);
    
    if(!UTIL.isLayerProcessable(thisModelLayer)) return;
   
    if(!thisModelLayer) {           
     throw new Error('postProcessor | drawTileArray_MT: modelLayer ' + layerNr + ' , in model ' +  model.getAttribEx('ModelName'));
    };
          
    let tileTable = thisModelLayer
    .getAttribEx('tileTable');
         
    if (!tileTable) {               
      throw new Error('postProcessor | drawTileArray_MT: tile table at layer ' + layerNr + ' , in model ' +  model.getAttribEx('ModelName') + ' not defined');
    };
       
    tileTable.forEach(function(tile) {
      let thisTile = new PATH_SET.bsPathSet();
      let pointArray = [
        new VEC2.Vec2(tile.outline.xmin, tile.outline.ymin),
        new VEC2.Vec2(tile.outline.xmin, tile.outline.ymax),      
        new VEC2.Vec2(tile.outline.xmax, tile.outline.ymax),    
        new VEC2.Vec2(tile.outline.xmax, tile.outline.ymin)
      ]
      
      thisTile.addNewPath(pointArray);
      thisTile.setClosed(false); 
      
      let laserRange = [];
      
      tile.laserClipPoints.forEach(function(scanner){
        laserRange.push(new VEC2.Vec2(scanner.xmin , scanner.ymin));
        laserRange.push(new VEC2.Vec2(scanner.xmin , scanner.ymax));
        laserRange.push(new VEC2.Vec2(scanner.xmax , scanner.ymax)); 
        laserRange.push(new VEC2.Vec2(scanner.xmax , scanner.ymin));
        laserRange.push(new VEC2.Vec2(scanner.xmin , scanner.ymin));
      })      
      
      thisTile.addNewPath(laserRange);
      //thisTile.setClosed(false); 
      thisModelLayer.addPathSet(thisTile,MODEL.nSubtypeSupport);
    });  

    layerIt.next();
    progress.step(1);      
  };
};