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
  layer_end_nr)
  {
    
  if(CONST.bDrawTile){
    const layerCount = layer_end_nr - layer_start_nr;
    const modelCount = modelData.getModelCount();
      
    
    
    for (let layerNr = layer_start_nr; layerNr < layer_end_nr+1; layerNr++){
        
      const arrayOfModels = UTIL.getModelsInLayer(modelData,layerNr);  
      
       for (let modelIt = 0; modelIt < arrayOfModels.length; modelIt++ ) {
         
         
         let thisModelLayer = arrayOfModels[modelIt]
           .getModelLayerByNr(layerNr);
         
         if(!thisModelLayer) {           
           throw new Error('modelLayer ' + layerNr + ' ,in model ' +  modelData.getModel(modelIt).getAttribEx('ModelName'));
         }
            
           let tileTable = thisModelLayer
           .getAttribEx('tileTable');
           
        if (!tileTable) {               
          throw new Error('tile table at layer ' + layerNr + ' ,in model ' +  modelData.getModel(modelIt).getAttribEx('ModelName'));
        }  
        
       
         
        tileTable.forEach(tile => {
           let thisTile = new PATH_SET.bsPathSet();
           let pointArray = [];
          
           tile.scanhead_outline.forEach (point => {
             pointArray.push(new VEC2.Vec2(point.m_coord[0] , point.m_coord[1]));      
             })
           thisTile.addNewPath(pointArray);
           thisTile.setClosed(false); 
           thisModelLayer.addPathSet(thisTile,MODEL.nSubtypeSupport);

          })  
        }      
      } 
    }
    
  }