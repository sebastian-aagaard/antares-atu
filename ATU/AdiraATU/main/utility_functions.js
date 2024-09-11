/************************************************************
 * Utility Functions
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


// -------- INCLUDES -------- //
const HATCH = requireBuiltin('bsHatch');
const PATH_SET = requireBuiltin('bsPathSet');
const ISLAND = requireBuiltin('bsIsland');
const PARAM = requireBuiltin('bsParam');
const VEC2 = requireBuiltin('vec2');
const CONST = require('main/constants.js');


// -------- FUNCTION TOC -------- //
// generateUUID()
// getArraySum(array)
// getValueAtIndex(array, index)
// ClipHatchByRect(hatchObj, arr_2dVec, bKeepInside)

// -------- FUNCTIONS -------- //

exports.getModelsInLayer = function(modelData,layerNr){
 
  let modelCount = modelData.getModelCount(); 
  let arrayofModels = [];
  
  for (let modelIt = 0; modelIt < modelCount; modelIt++){
    
    if (modelData.getModelMaxLayerNr(modelIt) >= layerNr 
      && modelData.getModelMinLayerNr(modelIt) <= layerNr)
      arrayofModels.push(modelData.getModel(modelIt))
  };
    
    if(!arrayofModels) return false;
      
    return arrayofModels;
}

//-----------------------------------------------------------------------------------------//

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

//-----------------------------------------------------------------------------------------//

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

//-----------------------------------------------------------------------------------------//

// check if there is anything at the given index
exports.getValueAtIndex = function (array, index) {
	if (index >= 0 && index < array.length) {
		return index;
	} else {
		return false;
	}
}

//-----------------------------------------------------------------------------------------//

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

//-----------------------------------------------------------------------------------------//

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

//-----------------------------------------------------------------------------------------//

exports.getTileTable = function(modelData,layerNr){

  const tiletable_3mf = exports.getModelsInLayer(modelData,layerNr)[0].getModelLayerByNr(layerNr).getAttribEx('tileTable_3mf');

  if(!tiletable_3mf) return false;
    
  return tiletable_3mf;
};

//-----------------------------------------------------------------------------------------//

exports.getWorkAreaLimits = function() {
return {  
      xmin: PARAM.getParamInt('workarea', 'x_workarea_min_mm'),
      ymin: PARAM.getParamInt('workarea', 'y_workarea_min_mm'),
      xmax: PARAM.getParamInt('workarea', 'x_workarea_max_mm'),
      ymax: PARAM.getParamInt('workarea', 'y_workarea_max_mm')
  };
}

//-----------------------------------------------------------------------------------------//


exports.appendInteger = function(currentInt, newInt) {
    // Convert the current integer and new integer to strings
    let currentStr = currentInt.toString();
    let newStr = newInt.toString();

    // Concatenate the strings
    let concatenatedStr = currentStr + newStr;

    // Convert the concatenated string back to an integer
    let resultInt = parseInt(concatenatedStr, 10);

    return resultInt;
}

//-----------------------------------------------------------------------------------------//

// Function to find the color and alpha based on value
exports.findColorFromType = function (value) {
  for (let key in CONST.typeDesignations) {
    if (CONST.typeDesignations[key].value === value) {
      return {
        color1: CONST.typeDesignations[key].color1,
        color2: CONST.typeDesignations[key].color2
      };
    }
  }
  return null; // Return null if value is not found
}

//-----------------------------------------------------------------------------------------//

const intersectPathset = function (xmin,xmax,ymin,ymax,pathset){
  
  let intersecArrayVec2D = new Array(4);
  intersecArrayVec2D[0] = new VEC2.Vec2(xmin, ymin); //min,min
  intersecArrayVec2D[1] = new VEC2.Vec2(xmin, ymax); //min,max
  intersecArrayVec2D[2] = new VEC2.Vec2(xmax, ymax); // max,max
  intersecArrayVec2D[3] = new VEC2.Vec2(xmax, ymin); // max,min

  let intersectPath = new PATH_SET.bsPathSet();
  intersectPath.addNewPath(intersecArrayVec2D); // add tiles zones to pathset  
  intersectPath.setClosed(true); // set the zones to closed polygons
  
  pathset.booleanOpIntersect(intersectPath);
};

//-----------------------------------------------------------------------------------------//

const getDistanceBetweenThisTypeInterfaceVectors = function (type) {
  switch (type) {
    case 0:
      return PARAM.getParamReal('interface','distanceBewteenOpenPolyLineInterfaceVectors');
    case 1:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceHatchVectors');
    case 2:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceContourVectors');
    case 3:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceHatchVectors');
    case 4:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceContourVectors');
    case 5:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceHatchVectors');
    case 6:
      return PARAM.getParamReal('interface','distanceBewteenInterfaceContourVectors');
    case 7:
      return PARAM.getParamReal('interface','distanceBewteenOpenPolyLineInterfaceVectors');
    default:
            process.printError('Unexpected type:', type);
            return null;  // or a default color if appropriate
  }
};

//-----------------------------------------------------------------------------------------//

exports.getGroupedHatchObjectByTileType = function(hatch) {
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  let groupedHatchblocksByTileType = {};

  // Iterate over each hatchblock
  
  hatchBlocksArray.forEach(function(hatchblock) {
    
    const tileID = hatchblock.getAttributeInt('tileID_3mf');
    const vectorType = hatchblock.getAttributeInt('type');


    if (!groupedHatchblocksByTileType[tileID]) {
        groupedHatchblocksByTileType[tileID] = {};
    };
    
    if (!groupedHatchblocksByTileType[tileID][vectorType]) {
        groupedHatchblocksByTileType[tileID][vectorType] = new HATCH.bsHatch();
    };
    
    groupedHatchblocksByTileType[tileID][vectorType].addHatchBlock(hatchblock);
    
  });
  
  return groupedHatchblocksByTileType;
};

//-----------------------------------------------------------------------------------------//

exports.getGroupedHatchObjectByType = function(hatch) {
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  let groupedHatchblocksByType = {};

  // Iterate over each hatchblock
  hatchBlocksArray.forEach(function(hatchblock) {
    // Get the tileID and bsid of the current hatchblock
    const vectorType = hatchblock.getAttributeInt('type');

    if (!groupedHatchblocksByType[vectorType]) {
        groupedHatchblocksByType[vectorType] = new HATCH.bsHatch();
    };
    
    groupedHatchblocksByType[vectorType].addHatchBlock(hatchblock);
    
  });
  
  return groupedHatchblocksByType;
};

//-----------------------------------------------------------------------------------------//

exports.getGroupedHatchObjectByTileId = function(hatch) {
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  let groupedHatchblocksByTileId = {};

  // Iterate over each hatchblock
  hatchBlocksArray.forEach(function(hatchblock) {
    // Get the tileID and bsid of the current hatchblock
    const tileId = hatchblock.getAttributeInt('tileID_3mf');

    if (!groupedHatchblocksByTileId[tileId]) {
        groupedHatchblocksByTileId[tileId] = new HATCH.bsHatch();
    };
    
    groupedHatchblocksByTileId[tileId].addHatchBlock(hatchblock);
    
  });
  
  return groupedHatchblocksByTileId;
};

//-----------------------------------------------------------------------------------------//

exports.doesTypeOverlap = function (type,isTileInterface) {
  switch (type) {
    case 0:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceOpenPolyLine') : PARAM.getParamInt('interface','laserInterfaceOpenPolyLine')) === 0;
    case 1:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceHatch') : PARAM.getParamInt('interface','laserInterfaceHatch')) === 0;
    case 2:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceContour') : PARAM.getParamInt('interface','laserInterfaceContour')) === 0;
    case 3:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceHatch') : PARAM.getParamInt('interface','laserInterfaceHatch')) === 0;
    case 4:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceContour') : PARAM.getParamInt('interface','laserInterfaceContour')) === 0;
    case 5:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceHatch') : PARAM.getParamInt('interface','laserInterfaceHatch')) === 0;
    case 6:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceContour') : PARAM.getParamInt('interface','laserInterfaceContour')) === 0;
    case 7:
      return (isTileInterface ? PARAM.getParamInt('interface','tileInterfaceOpenPolyLine') : PARAM.getParamInt('interface','laserInterfaceOpenPolyLine')) === 0;
    default:
            process.printError('Unexpected type:', type);
            return null;  // or a default color if appropriate
  }
};

//-----------------------------------------------------------------------------------------//

exports.adjustZipperInterfaceDistance = function(adjustInY,firstPathset,secondPathset,type){
    
  const firstBounds = firstPathset.getBounds2D();
  const secondBounds = secondPathset.getBounds2D();
    
  const distanceBewteenInterfaceVectors = getDistanceBetweenThisTypeInterfaceVectors(type); 
  
  if(adjustInY){//inY
    
    intersectPathset(firstBounds.minX,firstBounds.maxX,firstBounds.minY,firstBounds.maxY-distanceBewteenInterfaceVectors,firstPathset);
    intersectPathset(secondBounds.minX,secondBounds.maxX,secondBounds.minY+distanceBewteenInterfaceVectors,secondBounds.maxY,secondPathset);

    } else {//inX
      
    intersectPathset(firstBounds.minX,firstBounds.maxX-distanceBewteenInterfaceVectors,firstBounds.minY,firstBounds.maxY,firstPathset);
    intersectPathset(secondBounds.minX+distanceBewteenInterfaceVectors,secondBounds.maxX,secondBounds.minY,secondBounds.maxY,secondPathset);
      
  };
}; //adjustOverlapBetweenIntefaceHatch

//-----------------------------------------------------------------------------------------//

exports.preDistributeNonFullInterfaceVectors = function(overLappingPathSet,firstOverlapPathSet,secondOverlapPathSet,adjustInY){
  
  let fullWidthOverlapPathSet = new PATH_SET.bsPathSet(); 

  let overlappingPathSetBounds = overLappingPathSet.getBounds2D();
  let overlappingPathSetSize = adjustInY ? overlappingPathSetBounds.getHeight() : overlappingPathSetBounds.getWidth();
  let pathCount = overLappingPathSet.getPathCount();
  
  for(let pathNumber = 0 ; pathNumber < pathCount; pathNumber++){
    
    let pathLength = overLappingPathSet.getPathLen(pathNumber);
    let currentPathSet = new PATH_SET.bsPathSet();

    currentPathSet.addSinglePaths(overLappingPathSet,pathNumber);

    let currentPathSetBounds = currentPathSet.getBounds2D();
    let currentPathSize = adjustInY ? currentPathSetBounds.getHeight() : currentPathSetBounds.getWidth();

    if (currentPathSize < overlappingPathSetSize){
    //if (currentPathSize < PARAM.getParamReal('interface','interfaceOverlap')){  

      // d1 distance below or left, d2 above or right
      let d1 = Math.abs(adjustInY ? currentPathSetBounds.minY - overlappingPathSetBounds.minY : currentPathSetBounds.minX - overlappingPathSetBounds.minX);
      let d2 = Math.abs(adjustInY ? overlappingPathSetBounds.maxY - currentPathSetBounds.maxY : overlappingPathSetBounds.maxX - currentPathSetBounds.maxX);
            
      (d1 < d2) ? firstOverlapPathSet.addSinglePaths(overLappingPathSet,pathNumber) : secondOverlapPathSet.addSinglePaths(overLappingPathSet,pathNumber);  

      } else {
       
        fullWidthOverlapPathSet.addSinglePaths(overLappingPathSet,pathNumber);
    }
  }
  
  return fullWidthOverlapPathSet; 
};

//-----------------------------------------------------------------------------------------//

exports.connectHatchBlocksSetAttributes = function(hatch) {
  
  let hatchArray = hatch.getHatchBlockArray();  
  let returnHatch = new HATCH.bsHatch();
  let hatchBlockToConnect = new HATCH.bsHatch();

  let groupedByBorderIndex = hatchArray.reduce(function (acc, obj) {
    let currentBorderIndex = obj.getAttributeInt('borderIndex');
    
    // If the group doesn't exist, create an empty array for it
    if (!acc[currentBorderIndex]) {
      acc[currentBorderIndex] = [];
    }
    
    acc[currentBorderIndex].push(obj);
    
    return acc;
  }, {});
  
  // Iterate over groupedByBorderIndex object keys
  Object.keys(groupedByBorderIndex).forEach(function(borderIndex) {
     let group = groupedByBorderIndex[borderIndex];

     group.forEach(function (hatchBlock) {
       hatchBlockToConnect.addHatchBlock(hatchBlock);
     });
       
     let storedTileID_3mf = group[0].getAttributeInt('tileID_3mf');
     let storedIslandId = group[0].getAttributeInt('islandId');
     let storedType = group[0].getAttributeInt('type');
     let storedBsid = group[0].getAttributeInt('bsid');
     let storedBorderIndex = group[0].getAttributeInt('borderIndex');
     let storedModelSubType = group[0].getModelSubtype();

     hatchBlockToConnect.connectHatchBlocks({
       bEnableSelfConnect: true,
       fSelfConnectMaxDist: 0.001,
       fMaxConnectDist: 0.001,
       fPointReductionDeviationTol: 0.001,
       fPointReductionEdgeLengthLimit: 0.001,
       iModelSubtype: storedModelSubType
     });
       
     hatchBlockToConnect.setAttributeInt('tileID_3mf', storedTileID_3mf);
     hatchBlockToConnect.setAttributeInt('islandId', storedIslandId);
     hatchBlockToConnect.setAttributeInt('type', storedType);
     if (storedBsid !== 0) {
       hatchBlockToConnect.setAttributeInt('bsid', storedBsid);
     }
     if (storedBorderIndex !== 0) {
       hatchBlockToConnect.setAttributeInt('borderIndex', storedBorderIndex);
     }

     hatchBlockToConnect.mergeHatchBlocks({
       "bConvertToHatchMode": true,
       "bCheckAttributes": true
     });
     
     returnHatch.moveDataFrom(hatchBlockToConnect);
  });

  return returnHatch;
};


