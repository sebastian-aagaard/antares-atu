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
 
 
exports.postprocessMeta_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
  
  removeCustomTableScanningSchema(modelData);

} // postprocessSortExposure_MT

 const removeCustomTableScanningSchema = (modelData) => {
       
  for(let modelId = 0; modelId < modelData.getModelCount(); modelId++){
    let customTable = modelData
    .getModel(modelId)
    .getAttribEx('customTable')

    customTable.forEach(entry => {
     entry.attributes = entry.attributes.filter(attr =>
        attr.schema !==CONST.scanningSchema)
     });

     modelData
     .getModel(modelId)
     .setAttribEx('customTable',customTable);

  }
  
  const done = 0;
}