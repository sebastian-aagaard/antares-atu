/************************************************************
 * Meta Data Export
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


// -------- INCLUDES -------- //
const MODEL = requireBuiltin('bsModel');

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.postprocessMeta = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
  
  removeCustomTableScanningSchema(modelData,progress);

} // postprocessSortExposure_MT

const removeCustomTableScanningSchema = function(modelData,progress){
  
  const modelCount = modelData.getModelCount();
  progress.initSteps(modelCount-1);
       
  for(let modelId = 0; modelId < modelCount; modelId++)
    {
    let customTable = modelData
    .getModel(modelId)
    .getAttribEx('customTable');

    customTable.forEach(entry => {
     entry.attributes = entry.attributes.filter(attr =>
        attr.schema !==CONST.scanningSchema)
     });

    modelData
    .getModel(modelId)
    .setAttribEx('customTable',customTable);

    progress.step(1);    
  };
}