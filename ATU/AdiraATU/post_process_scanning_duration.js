/************************************************************
 * Post Processing Get Scanning Duration
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
var MODEL = requireBuiltin('bsModel');
var PARAM = requireBuiltin('bsParam');
var POLY_IT = requireBuiltin('bsPolylineIterator');

/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.postprocessSortExposure_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){

  }