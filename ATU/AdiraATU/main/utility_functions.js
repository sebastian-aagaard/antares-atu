/************************************************************
 * Utility Functions
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


// -------- INCLUDES -------- //
var HATCH = requireBuiltin('bsHatch');
var PATH_SET = requireBuiltin('bsPathSet');
var ISLAND = requireBuiltin('bsIsland');

var CONST = require('main/constants.js');


// -------- FUNCTION TOC -------- //
// generateUUID()
// getArraySum(array)
// getValueAtIndex(array, index)
// ClipHatchByRect(hatchObj, arr_2dVec, bKeepInside)

// -------- FUNCTIONS -------- //

exports.getModelsInLayer = (modelData,layerNr) => {
 
  let modelCount = modelData.getModelCount(); 
  let arrayofModels = [];
  
  for (let modelIt = 0; modelIt < modelCount; modelIt++){
  
    if (modelData.getModelMaxLayerNr(modelIt) >= layerNr 
      && modelData.getModelMinLayerNr(modelIt) <= layerNr)
      arrayofModels.push(modelData.getModel(modelIt))
    }
    
    return arrayofModels;
}

////////////////////////////////
//        generateUUID        //
//////////////////////////////// 

exports.generateUUID = function() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// return the sum of the array
exports.getArraySum = function (array) {
	let sum = 0;
	for (let i = 0; i < array.length; i++) {
		if (array[i]) {
			sum += array[i];
		}
	}
	return sum;
}

// check if there is anything at the given index
exports.getValueAtIndex = function (array, index) {
	if (index >= 0 && index < array.length) {
		return index;
	} else {
		return false;
	}
}

// clip hatch by rectangle
exports.ClipHatchByRect = function (hatchObj, arr_2dVec, bKeepInside) {
  if (typeof bKeepInside === 'undefined') bKeepInside = true;
	let clippedHatch = new HATCH.bsHatch();
	let tiles_pathset = new PATH_SET.bsPathSet(); // generate pathset object
	tiles_pathset.addNewPath(arr_2dVec); // add tiles zones to pathset  
	tiles_pathset.setClosed(true); // set the zones to closed polygons
	let tile_clipping_island = new ISLAND.bsIsland(); // generate island object
	tile_clipping_island.addPathSet(tiles_pathset); // add pathset as new island
	
	clippedHatch = hatchObj.clone(); // clone overall hatching
	clippedHatch.clip(tile_clipping_island, bKeepInside); // clip the hatching with the tile_islands
	
	return clippedHatch;
}

exports.mergeBlocks = function(unmergedHatchBlocks) {
	let mergeblock = new HATCH.bsHatch();
	let mergedblock = new HATCH.bsHatch();
	mergeblock.moveDataFrom(unmergedHatchBlocks);


	// merge similar hatch blocks to speed up process
	let mergeArgs = {
		'bConvertToHatchMode': true,
		//'nConvertToHatchMaxPointCount': 2,
		//'nMaxBlockSize': 1024,
		'bCheckAttributes': true
	};

	mergedblock = mergeblock.mergeHatchBlocks(mergeArgs);

	let blockcount = mergedblock.getHatchBlockCount();
	return mergedblock;
}