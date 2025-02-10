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
const POLY_IT = requireBuiltin('bsPolylineIterator');
const LAYER = requireBuiltin('bsModelLayer');
const EXPOSURE = requireBuiltin('bsExposureTime');


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
    
  if(arrayofModels === undefined) return false;
    
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


exports.removeEmptyHatches = function(tileHatch,nonZeroAttributeName){
  
  // getHatchBlockArray
  let hatchBlockArray = tileHatch.getHatchBlockArray();
  let filteredHatch = new HATCH.bsHatch();

  hatchBlockArray = hatchBlockArray
    .filter(hatchBlock => hatchBlock.getAttributeInt(nonZeroAttributeName) !== 0 && !hatchBlock.isEmpty())
    .forEach(hatchBlock => filteredHatch.addHatchBlock(hatchBlock))

  let prevCount = tileHatch.getHatchBlockCount();
  let filteredCount = filteredHatch.getHatchBlockCount();
  
  if(prevCount != filteredCount){
   process.printWarning('removed hatches with null value for ' + nonZeroAttributeName + ', was ' + prevCount + ', now ' + filteredCount);
   }

 return filteredHatch;
}

//-----------------------------------------------------------------------------------------//

exports.invertAngleIfQ1orQ2 = function(angleDeg){
    
 angleDeg %= 360; 
  
  if(angleDeg < 180.0 && angleDeg > 0.0){
    angleDeg = (angleDeg + 180.0) % 360;
    };
  
  return angleDeg;
};
  
//-----------------------------------------------------------------------------------------//
exports.isBoundsInside = function(bounds,tileBounds){
    
  if(bounds.minX < tileBounds.xmin || bounds.maxX > tileBounds.xmax || bounds.minY < tileBounds.ymin || bounds.maxY > tileBounds.ymax){
    return false;
  }
  return true;
};

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

exports.get2DVecArrayFromLim = function(limits){
    return [
          new VEC2.Vec2(limits.xmin, limits.ymin),
          new VEC2.Vec2(limits.xmin, limits.ymax),
          new VEC2.Vec2(limits.xmax, limits.ymax),
          new VEC2.Vec2(limits.xmax, limits.ymin)
    ];
};

//-----------------------------------------------------------------------------------------//

// clip hatch by rectangle
exports.ClipHatchByRect = function (hatchObj, arr_2dVec, bKeepInside) {
  if (typeof bKeepInside === 'undefined') bKeepInside = true;
    
  let tile_clipping_island = exports.generateIslandFromCoordinates(arr_2dVec,true);
	
	let clippedHatch = hatchObj.clone(); // clone overall hatching
	clippedHatch.clip(tile_clipping_island, bKeepInside); // clip the hatching with the tile_islands
	
	return clippedHatch;
}

//-----------------------------------------------------------------------------------------//

exports.generateIslandFromCoordinates = function (arr_2dVec,shouldBeClosed){
  let tiles_pathset = new PATH_SET.bsPathSet(); // generate pathset object
	tiles_pathset.addNewPath(arr_2dVec); // add tiles zones to pathset  
	tiles_pathset.setClosed(shouldBeClosed); // set the zones to closed polygons
	let island = new ISLAND.bsIsland(); // generate island object
	island.addPathSet(tiles_pathset); // add pathset as new island
  
  return island;
  };

//-----------------------------------------------------------------------------------------//

exports.mergeBlocks = function(unmergedHatchBlocks) {
	let mergeblock = new HATCH.bsHatch();
	let mergedblock = new HATCH.bsHatch();
	mergeblock.moveDataFrom(unmergedHatchBlocks);

	let mergeArgs = {
		'bConvertToHatchMode': true,
		//'nConvertToHatchMaxPointCount': 2,
		//'nMaxBlockSize': 1024,
		'bCheckAttributes': true
	};

	mergedblock = mergeblock.mergeHatchBlocks(mergeArgs);

	return mergedblock;
}

//-----------------------------------------------------------------------------------------//

exports.getTileTable = function(modelData,layerNr){

  let arrayOfModels = exports.getModelsInLayer(modelData,layerNr);

  if(!arrayOfModels[0]) { 
    process.printWarning ('failed to retrieve model in layer ' + layerNr);
    return false;
  }
  
  const tiletable_3mf = arrayOfModels[0].maybeGetModelLayerByNr(layerNr).getAttribEx('tileTable_3mf');

  if(!tiletable_3mf){ 
    process.printWarning ('failed to retrieve tile table from model in layer ' + layerNr);
    return false;
  }
    
  return tiletable_3mf;
};

//-----------------------------------------------------------------------------------------//

exports.getWorkAreaLimits = function() {
  
  let useProcessingArea = PARAM.getParamInt('activeWorkArea', 'setAtiveBuildArea') === 0;
  
return {  
      xmin: (useProcessingArea) ? PARAM.getParamInt('workarea', 'x_workarea_min_mm') : PARAM.getParamInt('calibrationArea', 'x_calibrationArea_min_mm'),
      ymin: (useProcessingArea) ? PARAM.getParamInt('workarea', 'y_workarea_min_mm') : PARAM.getParamInt('calibrationArea', 'y_calibrationArea_min_mm'),
      xmax: (useProcessingArea) ? PARAM.getParamInt('workarea', 'x_workarea_max_mm') : PARAM.getParamInt('calibrationArea', 'x_calibrationArea_max_mm'),
      ymax: (useProcessingArea) ? PARAM.getParamInt('workarea', 'y_workarea_max_mm') : PARAM.getParamInt('calibrationArea', 'y_calibrationArea_max_mm')
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
exports.isLayerProcessable = function(modelLayer){
    return (
        modelLayer.isValid() &&
        modelLayer.tryGetBounds2D() &&
        modelLayer.hasData(
            LAYER.nLayerDataTypeIsland |
            LAYER.nLayerDataTypeOpenPolyline |
            LAYER.nLayerDataTypeExposurePolyline
        )
    );
};
//-----------------------------------------------------------------------------------------//
function getHeight (bsBounds2D){
  return bsBounds2D.maxY-bsBounds2D.minY;
};

function getWidth (bsBounds2D){
  return bsBounds2D.maxX-bsBounds2D.minX;
};

//-----------------------------------------------------------------------------------------//
const intersectPathset = function (xmin,xmax,ymin,ymax,pathset){
  
  let slightOffset = 0.001;
  
  if(xmin === xmax){
    xmin -= slightOffset;
    xmax += slightOffset;
    };
    
  if(ymin === ymax){
    ymin -= slightOffset;
    ymax += slightOffset;
    };   
  
  let intersecArrayVec2D = [
    new VEC2.Vec2(xmin, ymin), //min,min
    new VEC2.Vec2(xmin, ymax), //min,max
    new VEC2.Vec2(xmax, ymax), // max,max
    new VEC2.Vec2(xmax, ymin) // max,min
  ];
  let intersectPath = new PATH_SET.bsPathSet();
  intersectPath.addNewPath(intersecArrayVec2D); // add tiles zones to pathset  
  intersectPath.setClosed(true); // set the zones to closed polygons
  
  pathset.booleanOpIntersect(intersectPath);
};

//----------------------------------------------------------------------------------------//
const getDistanceBetweenThisTypeInterfaceVectors = function (type) {
  switch (type) {
 
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
    case 8:
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
exports.getGroupedHatchObjectByTileTypeLaserId = function(hatch) {
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  let groupedHatchblocksByBsid = {};

  // Iterate over each hatchblock
  hatchBlocksArray.forEach(function(hatchblock) {
    // Get the tileID and bsid of the current hatchblock
    const tileID = hatchblock.getAttributeInt('tileID_3mf');
    const vectorType = hatchblock.getAttributeInt('type');
    const laserID = Math.floor(hatchblock.getAttributeInt('bsid')/10);
    
    if (!groupedHatchblocksByBsid[tileID]) {
        groupedHatchblocksByBsid[tileID] = {};
    };
    
    if (!groupedHatchblocksByBsid[tileID][vectorType]) {
        groupedHatchblocksByBsid[tileID][vectorType] = {};
    };

    if (!groupedHatchblocksByBsid[tileID][vectorType][laserID]) {
        groupedHatchblocksByBsid[tileID][vectorType][laserID] = new HATCH.bsHatch();
    };

    groupedHatchblocksByBsid[tileID][vectorType][laserID].addHatchBlock(hatchblock);
    
  });
  
  return groupedHatchblocksByBsid;
};

//-----------------------------------------------------------------------------------------//
const doesTypeOverlap = function (type, isLaserOperation) {
  switch (type) {
    case 1:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceHatch') : PARAM.getParamInt('interface','tileInterfaceHatch')) === 0;
    case 2:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceContour') : PARAM.getParamInt('interface','tileInterfaceContour')) === 0;
    case 3:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceHatch') : PARAM.getParamInt('interface','tileInterfaceHatch')) === 0;
    case 4:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceContour') : PARAM.getParamInt('interface','tileInterfaceContour')) === 0;
    case 5:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceHatch') : PARAM.getParamInt('interface','tileInterfaceHatch')) === 0;
    case 6:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceContour') : PARAM.getParamInt('interface','tileInterfaceContour')) === 0;
    case 7:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceOpenPolyLine') : PARAM.getParamInt('interface','tileInterfaceOpenPolyLine')) === 0;
    case 8:
      return (isLaserOperation ? PARAM.getParamInt('interface','laserInterfaceOpenPolyLine') : PARAM.getParamInt('interface','tileInterfaceOpenPolyLine')) === 0;    
    default:
      process.printError('Unexpected type:', type);
      return null;  // Handle unexpected cases
  }
};

//-----------------------------------------------------------------------------------------//
const copyAttributes = function(originalHatchBlock, newHatchBlock) {
  // List the specific attributes that need to be copied
  let attributesToCopy = [
    'tileID_3mf',
    'overlappingTile_1',
    'overlappingTile_2',
    'overlappingTile_3',
    'type',
    'islandId',
    'borderIndex',
    'overlapCount',
    'bisd',
    'overlappingLaser_1',
    'overlappingLaser_2'
  ];

  // Iterate through each attribute and copy its value from the original to the new hatch block
  for (let i = 0; i < attributesToCopy.length; i++) {
    let key = attributesToCopy[i];
    let value = originalHatchBlock.getAttributeInt(key);  // Assuming attributes are integers
    if(value>0) newHatchBlock.setAttributeInt(key, value);  // Set the same attribute in the new hatch block
  }
}

//----------------------------------------------------------------------------------------//
exports.connectHatchBlocksSetAttributes = function(hatch) {

  let hatchArray = hatch.getHatchBlockArray();  
  let returnHatch = new HATCH.bsHatch();
  let hatchBlockToConnect = new HATCH.bsHatch();

  // Group by borderIndex first
  let groupedByBorderIndex = hatchArray.reduce(function (acc, obj) {
    let currentBorderIndex = obj.getAttributeInt('borderIndex');
    
    // If the group for the borderIndex doesn't exist, create an empty array for it
    if (!acc[currentBorderIndex]) {
      acc[currentBorderIndex] = {};
    }
    
    // Further group by islandId within each borderIndex group
    let currentIslandId = obj.getAttributeInt('islandId');
    if (!acc[currentBorderIndex][currentIslandId]) {
      acc[currentBorderIndex][currentIslandId] = [];
    }
    
    acc[currentBorderIndex][currentIslandId].push(obj);
    
    return acc;
  }, {});

  // Iterate over groupedByBorderIndex object keys
  Object.keys(groupedByBorderIndex).forEach(function(borderIndex) {
     let groupsByIslandId = groupedByBorderIndex[borderIndex];

     // Iterate over the groups by islandId within each borderIndex
     Object.keys(groupsByIslandId).forEach(function(islandId) {
         let group = groupsByIslandId[islandId];

         group.forEach(function (hatchBlock) {
           hatchBlockToConnect.addHatchBlock(hatchBlock)
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
  });

  return returnHatch;
};

//-----------------------------------------------------------------------------------------//
exports.adjustContourInterface = function(hatch,thisLayer,isLaserOperation){
  
  let tileTable = thisLayer.getAttribEx('tileTable');
  let returnHatch = new HATCH.bsHatch();
  let hatchGroupedByTileType = exports.getGroupedHatchObjectByTileType(hatch);
  
  Object.entries(hatchGroupedByTileType).forEach(function(tileEntry) {
    let tileId = tileEntry[0];
    let tileGroup = tileEntry[1];
    Object.keys(tileGroup).forEach(function(type){
      let typeInt = +type;
      
      if(typeInt === CONST.typeDesignations.part_contour.value 
        || typeInt === CONST.typeDesignations.downskin_contour.value 
        || typeInt === CONST.typeDesignations.support_contour.value){
      
      let currentHatch = hatchGroupedByTileType[tileId][type];

      if(currentHatch.isEmpty()) {
        printError('hatch is empty at layer' + thisLayer.getLayerZ() + ',tileId ' + tileId + ', type' + typeInt );
        return
        }

      let connectedHatchBlocks = divideHatchIntoUnbrokenSegments(currentHatch)
        
      let hatchBlockIterator = connectedHatchBlocks.getHatchBlockIterator();

      while(hatchBlockIterator.isValid()){
        let currentHatchBlock = hatchBlockIterator.get();
        
        if (currentHatchBlock.isEmpty()){
          hatchBlockIterator.next();
          continue;
        } 
                
        let borderIndex = currentHatchBlock.getAttributeInt('borderIndex');
        let borderOverlap = currentHatchBlock.getAttributeInt('overlapCount');
        
        if(borderIndex > 0 && borderOverlap > 0) {
          let adjustedHatch = applyInterface(currentHatchBlock,tileTable,isLaserOperation);  // Use the provided adjustment function
          returnHatch.moveDataFrom(adjustedHatch);
          
        } else {
          returnHatch.addHatchBlock(currentHatchBlock);
          
        }
        hatchBlockIterator.next();
      }
    } else {
    
    returnHatch.moveDataFrom(hatchGroupedByTileType[tileId][type]);
      
    }
    });
  });
  
  return returnHatch;
};

//-----------------------------------------------------------------------------------------//
exports.adjustInterfaceVectors = function(hatch,thisLayer,isLaserOperation) {

  let tileTable = thisLayer.getAttribEx('tileTable');

  let hatchBlockIterator = hatch.getHatchBlockIterator();
    
  let resultHatch = new HATCH.bsHatch();
  let adjustedOverlapVectors = new HATCH.bsHatch();
      
  while (hatchBlockIterator.isValid()) {   
    
    let thisHatchBlock = hatchBlockIterator.get();
    let overlapCount = thisHatchBlock.getAttributeInt('overlapCount');
    let borderIndex = thisHatchBlock.getAttributeInt('borderIndex');
    
    if (overlapCount === 0 || borderIndex > 0) {
      
        resultHatch.addHatchBlock(thisHatchBlock);
      
    } else if (overlapCount > 1 && !isLaserOperation){
      
      let adjustedHatch = adjustMultipleOverlappingHatchBlocks(thisHatchBlock);
      
      resultHatch.moveDataFrom(adjustedHatch);
      
    } else {
      
        let adjustedHatch = applyInterface(thisHatchBlock,tileTable,isLaserOperation);

        resultHatch.moveDataFrom(adjustedHatch);
    }

    hatchBlockIterator.next();
  }

  return resultHatch;
};

//-----------------------------------------------------------------------------------------//
const adjustMultipleOverlappingHatchBlocks = function(hatchBlock) {
  
  if(hatchBlock.isEmpty() || hatchBlock.getPointCount()<2) return;

  let returnHatch = new HATCH.bsHatch();
  
  let overlappingTileArray = [ 
    hatchBlock.getAttributeInt('overlappingTile_1'),
    hatchBlock.getAttributeInt('overlappingTile_2'),
    hatchBlock.getAttributeInt('overlappingTile_3'),
    hatchBlock.getAttributeInt('tileID_3mf')
  ];

  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  let borderIndex = hatchBlock.getAttributeInt('borderIndex');
  let subType = hatchBlock.getModelSubtype();
  
  // Sort the tile IDs
  overlappingTileArray.sort(function(a, b) {
    return a - b;
  });

  let overlapHatch = new HATCH.bsHatch();
  overlapHatch.addHatchBlock(hatchBlock);

  let overlapPathSet = new PATH_SET.bsPathSet();
  overlapPathSet.addHatches(overlapHatch);

  let pathCount = overlapPathSet.getPathCount();
  let storedHatch = new HATCH.bsHatch();
  let storedPathSet = new PATH_SET.bsPathSet();

  for (let j = 0; j < pathCount; j++) {

    let pathPoints = overlapPathSet.getPathPoints(j);
    let startPoint = pathPoints[0];
    let endPoint = pathPoints[pathPoints.length - 1];

    if(startPoint.distance(endPoint) < getDistanceBetweenThisTypeInterfaceVectors(hatchType)) continue;

    // Calculate the vector direction by subtracting startPoint from endPoint
    let directionVector = {
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    };

    // Determine the quadrant or region based on the direction of the vector
    let toAssignFirstId;
    if (directionVector.x < 0 && directionVector.y > 0) {
      // Vector points toward top-left
      toAssignFirstId = overlappingTileArray[1];

    } else if (directionVector.x > 0 && directionVector.y > 0) {
      // Vector points toward top-right
      toAssignFirstId = overlappingTileArray[3];

    } else if (directionVector.x < 0 && directionVector.y < 0) {
      // Vector points toward bottom-left
      toAssignFirstId = overlappingTileArray[0];

    } else {
      // Vector points toward bottom-right
      toAssignFirstId = overlappingTileArray[2];
    }

    // Add the path and assign attributes
    storedPathSet.makeEmpty();
    storedPathSet.addNewPath(startPoint, endPoint);
      
    adjustVectorLength(storedPathSet, 'end', hatchType);  


    storedHatch.addPaths(storedPathSet);
    storedHatch.setAttributeInt('tileID_3mf', toAssignFirstId);
    storedHatch.setAttributeInt('type', hatchType);
    storedHatch.setAttributeInt('islandId', islandId);
    storedHatch.setAttributeInt('borderIndex', borderIndex);

    storedHatch.setModelSubtype(subType);

    returnHatch.moveDataFrom(storedHatch);
  }

  return returnHatch;
};

//-----------------------------------------------------------------------------------------//
exports.mergeInterfaceVectors = function(hatch, getGroupedHatchFunction, isLaserGrouping) {

  let groupedHatchblocksByTileType = getGroupedHatchFunction(hatch);
  let returnHatch = new HATCH.bsHatch();

  function processHatchBlock(hatchBlock, type) {
    let mergeHatchContainer = hatchBlock.clone();
    
    if (type === 1 || type === 3 || type === 5) {
      mergeHatchContainer.mergeShortLines(
        mergeHatchContainer, 5, 0.1,
        HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
      );
    } else {
      mergeHatchContainer = exports.connectHatchBlocksSetAttributes(mergeHatchContainer);
    }

    returnHatch.moveDataFrom(mergeHatchContainer);
  }

  // Loop through tile groups
  Object.entries(groupedHatchblocksByTileType).forEach(function(tileEntry) {
    let tileGroup = tileEntry[1];

    if (!tileGroup || typeof tileGroup !== 'object') return;

    // Loop through type groups
    Object.entries(tileGroup).forEach(function(typeEntry) {
      let type = parseInt(typeEntry[0]);
      let typeGroup = typeEntry[1];

      if (!typeGroup || typeof typeGroup !== 'object') return;

      if (isLaserGrouping) {
        // Handle laser-specific grouping
        Object.values(typeGroup).forEach(function(laserHatch) {
          processHatchBlock(laserHatch, type);
        });
      } else {
        // Handle non-laser grouping
        processHatchBlock(typeGroup, type);
      }
    });
  });

  return returnHatch;
};

//-----------------------------------------------------------------------------------------//
const applyInterface = function(hatchBlock, tileTable, isLaserOperation) {
  
  if(hatchBlock.isEmpty() || hatchBlock.getPointCount()<2) return;
  
  // Determine attribute names based on whether it's a tile interface or laser interface
  let overlapAttr1 = isLaserOperation ? 'overlappingLaser_1' : 'overlappingTile_1';
  let overlapAttr2 = isLaserOperation ? 'bsid' : 'tileID_3mf';
  
  let overlap1 = hatchBlock.getAttributeInt(overlapAttr1);
  let overlap2 = hatchBlock.getAttributeInt(overlapAttr2);
  
  // Assign firstId and secondId dynamically based on laser operation
  let firstId = Math.min(overlap1, overlap2);
  let secondId = Math.max(overlap1, overlap2);

  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  let borderIndex = hatchBlock.getAttributeInt('borderIndex');
  let subType = hatchBlock.getModelSubtype();
  let tileId = hatchBlock.getAttributeInt('tileID_3mf');
  
  let overlappingHatch = new HATCH.bsHatch();
  overlappingHatch.addHatchBlock(hatchBlock);
  
  let overLappingPathSet = new PATH_SET.bsPathSet();
  overLappingPathSet.addHatches(overlappingHatch);

  if(overLappingPathSet.isEmpty()) return;

  let interfaceOverlapPreAllocateLimit = PARAM.getParamReal('interface', 'interfaceOverlap') - 0.001; // reduce abit to ensure shorter vectors get preallocated
  let firstOverlapPathsSet = new PATH_SET.bsPathSet();
  let secondOverlapPathsSet = new PATH_SET.bsPathSet();

  let shouldVectorsOverlap = doesTypeOverlap(hatchType, isLaserOperation);
  let adjustInY = determineAdjustmentDirection(isLaserOperation, firstId, secondId);
  
  let overlapLimits = getClipIntersectionCoordinates(tileTable, firstId, secondId, adjustInY, tileId, isLaserOperation);
  
  if(!isLaserOperation){
    // Check if the start and end points lie on the boundary of either the firstId or secondId tiles
    let startPoint = overLappingPathSet.getPathPoints(0)[0];  // Get the start point of the first path
    let endPoint = overLappingPathSet.getPathPoints(overLappingPathSet.getPathCount() - 1).slice(-1)[0];  // Get the end point of the last path
    
    let closestTile = findClosestTileOnBoundary(tileTable, firstId, secondId, startPoint, endPoint);

    // If both points lie on the boundary of the same tile, allocate the entire hatchBlock
    if (closestTile && borderIndex > 0) {
      hatchBlock.setAttributeInt('tileID_3mf', closestTile.tileID);
      
      let adjustedHatch = new HATCH.bsHatch();
      adjustedHatch.addHatchBlock(hatchBlock);
      
      return adjustedHatch;  // Return the adjusted hatch directly since it's fully assigned
    }
  }

  // Iterate through all paths (vectors) if they need to be split
  let pathCount = overLappingPathSet.getPathCount();
  
  for (let pathNumber = 0; pathNumber < pathCount; pathNumber++) {
    let currentPathSet = new PATH_SET.bsPathSet();
    currentPathSet.addSinglePaths(overLappingPathSet, pathNumber);
    if(currentPathSet.isEmpty()) continue;

    let currentPathSetBounds = currentPathSet.getBounds2D();
    
    let currentPathSize = (adjustInY) ? getHeight(currentPathSetBounds) : getWidth(currentPathSetBounds);

    if (currentPathSize < interfaceOverlapPreAllocateLimit && borderIndex === 0) {
      // Pre-distribute vectors that don't cover full interface
      preDistributeNonFullInterfaceVectors(currentPathSet, firstOverlapPathsSet, secondOverlapPathsSet, adjustInY, shouldVectorsOverlap, overlapLimits);
      
    } else {
      let fixedVectorEnd = (borderIndex % 2 !== 0) ? 'start' : 'end';
      
      adjustVectorLength(currentPathSet, fixedVectorEnd, hatchType);  

      // Based on the coordinates, add to the correct overlap paths set
      addToCorrectOverlapSet(currentPathSet, firstOverlapPathsSet, secondOverlapPathsSet, firstId, secondId, isLaserOperation, shouldVectorsOverlap, fixedVectorEnd);
    }
  }

  // Prepare the final hatch objects for both containers
  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  let addPathArgs = {
    nModelSubtype: subType,
    nOpenPathPolylineMode: POLY_IT.nPolyOpen,
    nOpenPathTryPolyClosedPolylineModeTol: 0.0,
    nClosedPathPolylineMode: POLY_IT.nPolyClosed,
    bMergePolyHatch: false,
    bTwoPointsPathAsPolyHatch: false
  };

  firstHatch.addPathsExt(firstOverlapPathsSet, addPathArgs);
  secondHatch.addPathsExt(secondOverlapPathsSet, addPathArgs);

  firstHatch.setAttributeInt(overlapAttr2, firstId);
  secondHatch.setAttributeInt(overlapAttr2, secondId);

  // Combine the two hatches into one adjusted hatch object
  let adjustedHatch = new HATCH.bsHatch();
  adjustedHatch.moveDataFrom(firstHatch);
  adjustedHatch.moveDataFrom(secondHatch);

  adjustedHatch.setAttributeInt('type', hatchType);
  adjustedHatch.setAttributeInt('islandId', islandId);
  if (borderIndex !== 0) adjustedHatch.setAttributeInt('borderIndex', borderIndex);
  if (isLaserOperation) adjustedHatch.setAttributeInt('tileID_3mf', tileId);

  return adjustedHatch;  // Return the final adjusted hatch
};

// Helper function to find the closest tile where both start and end points lie on the boundary
function findClosestTileOnBoundary(tileTable, firstId, secondId, startPoint, endPoint) {
  let candidateTiles = [];

  for (let i = 0; i < tileTable.length; i++) {
    let tile = tileTable[i];

    if (tile.tileID === firstId || tile.tileID === secondId) {
      let tileBounds = tile.clipPoints;

      // Check if start and end points lie on the boundary of the tile
      let isStartOnBoundary = isPointOnBoundary(startPoint, tileBounds);
      let isEndOnBoundary = isPointOnBoundary(endPoint, tileBounds);

      if (isStartOnBoundary && isEndOnBoundary) {
        candidateTiles.push(tile);
      }
    }
  }

  // Return the first candidate tile that fits the criteria
  return candidateTiles.length > 0 ? candidateTiles[0] : null;
}

// Helper function to check if a point lies on the boundary of a tile
function isPointOnBoundary(point, tileBounds) {
  return (
    (point.x === tileBounds.xmin || point.x === tileBounds.xmax) ||
    (point.y === tileBounds.ymin || point.y === tileBounds.ymax)
  );
}
//-----------------------------------------------------------------------------------------//
const preDistributeNonFullInterfaceVectors = function(currentPathSet,firstOverlapPathSet,secondOverlapPathSet,adjustInY,shouldTypeOverlap,overlapLimits){
  
   if (shouldTypeOverlap) {
    // If shouldTypeOverlap is true, add pathSet to both overlap sets
    firstOverlapPathSet.addPaths(currentPathSet);
    secondOverlapPathSet.addPaths(currentPathSet);
    return; 
  }
  
  let currentPathSetBounds = currentPathSet.getBounds2D();

  // d1 distance below or left, d2 above or right
  let d1 = Math.abs(adjustInY ? currentPathSetBounds.minY - overlapLimits.firstIdBorder : currentPathSetBounds.minX - overlapLimits.firstIdBorder);
  let d2 = Math.abs(adjustInY ? currentPathSetBounds.maxY - overlapLimits.secondIdBorder : currentPathSetBounds.maxX  - overlapLimits.secondIdBorder);
  
  (d1 < d2) ? firstOverlapPathSet.addPaths(currentPathSet) : secondOverlapPathSet.addPaths(currentPathSet);
}

//-----------------------------------------------------------------------------------------//
const getClipIntersectionCoordinates = function(tileTable, firstId, secondId, adjustInY, tileId, isLaserOperation) {

    let firstClipPoints, secondClipPoints;  // Declare the clip points variables here to avoid scope issues

    if (isLaserOperation) {
        let tableEntry = tileTable.find(function(tile) { 
            return tile.tileID === tileId; 
        });

        if (!tableEntry) {
            throw new Error(tileId + " : Laser operation tileID not found in the provided tile array.");
        }
        
        let firstLaserId = Math.floor(firstId/10);
        let secondLaserId = Math.floor(secondId/10);
        
        firstClipPoints = tableEntry.laserClipPoints[firstLaserId-1];  
        secondClipPoints = tableEntry.laserClipPoints[secondLaserId-1]; 
      
    } else {
        
        let firstTileTableEntry = tileTable.find(function(tile) { 
            return tile.tileID === firstId; 
        });
        let secondTileTableEntry = tileTable.find(function(tile) { 
            return tile.tileID === secondId; 
        });

        if (!firstTileTableEntry || !secondTileTableEntry) {
            throw new Error(firstId + '/ ' + secondId + "TileID not found in the provided tile array.");
        }

        firstClipPoints = firstTileTableEntry.clipPoints;  
        secondClipPoints = secondTileTableEntry.clipPoints;
    }

    // Ensure that firstClipPoints and secondClipPoints are defined before accessing properties
    if (!firstClipPoints || !secondClipPoints) {
        throw new Error("Clip points not found for the provided tile IDs.");
    }

    // Determine which clip points to use based on adjustInY
    let intersectionMax = adjustInY ? firstClipPoints.ymax : firstClipPoints.xmax;
    let intersectionMin = adjustInY ? secondClipPoints.ymin : secondClipPoints.xmin;

    // Return the result with both borders and the calculated distance
    return { 
        firstIdBorder: intersectionMin,
        secondIdBorder: intersectionMax,
        distance: Math.abs(intersectionMax - intersectionMin)
    };
};

//-----------------------------------------------------------------------------------------//
const determineAdjustmentDirection = function(isLaserOperation, firstId, secondId) {

    // If pathWidth equals pathHeight, we need to apply custom logic
    if (isLaserOperation) {
        // If laser operation, adjust in X direction
        return false; // adjust in X
    } else {
        // If not laser operation, compare firstId and secondId
        let firstIdThousands = Math.floor(firstId / 1000);
        let secondIdThousands = Math.floor(secondId / 1000);

        // If firstId and secondId are in the same thousand block, adjust in Y
        return firstIdThousands === secondIdThousands; // true means adjust in Y, false means adjust in X
    }
}

function adjustVectorLength(pathSet, fixedPointType, type) {
  
    if(pathSet.isEmpty()) return;
    // Step 1: Get the adjustment amount (distance) from the interface function
    const adjustmentAmount = getDistanceBetweenThisTypeInterfaceVectors(type);  // Get distance from the provided function

    // Step 2: Get the path points from the pathset (considering paths with more than two points)
    let points = pathSet.getPathPoints(0);  // Array of vec2 objects representing the path
  
    if (points.length < 2) {
        process.printError('Path contains fewer than 2 points, cannot adjust length.');
        return pathSet;
    }

    // Step 3: Determine which point should remain fixed (either "start" or "end")
    let fixedPoint, movablePoints;
    if (fixedPointType === "start") {
        fixedPoint = points[0].clone();  // Fix the start point
        movablePoints = points.slice(1);  // All points except the first are "movable"
    } else if (fixedPointType === "end") {
        fixedPoint = points[points.length - 1].clone();  // Fix the end point
        movablePoints = points.slice(0, points.length - 1).reverse();  // Reverse to process from the last point backward
    } else {
        throw new Error("Invalid fixedPointType. Use 'start' or 'end'.");
    }

    // Step 4: Adjust the total path length by shortening segments starting from the last one
    let remainingAdjustment = adjustmentAmount;  // Track how much adjustment is left

    for (let i = 0; i < movablePoints.length && remainingAdjustment > 0; i++) {
        let direction = movablePoints[i].sub(fixedPoint);  // Get the direction vector of the current segment
        let segmentLength = direction.length();  // Length of the current segment

        if (segmentLength > remainingAdjustment) {
            // Step 5: Adjust the current segment if it can accommodate the remaining adjustment
            let newLength = segmentLength - remainingAdjustment;
            let scaleFactor = newLength / segmentLength;
            let newDirection = direction.mulByScalar(scaleFactor);  // Scale the direction vector
            let newMovablePoint = fixedPoint.add(newDirection);  // Calculate the new position

            // Update the point in the path
            if (fixedPointType === "start") {
                points[i + 1] = newMovablePoint;  // Adjust in the original direction
            } else {
                points[points.length - 2 - i] = newMovablePoint;  // Adjust backward if end is fixed
            }

            // Adjustment is done
            remainingAdjustment = 0;
        } else {
            // Step 6: If the segment is too short, remove its entire length and move to the next segment
            remainingAdjustment -= segmentLength;

            // The movable point should collapse onto the fixed point
            if (fixedPointType === "start") {
                points[i + 1] = fixedPoint.clone();  // Collapse the movable point onto the fixed point
            } else {
                points[points.length - 2 - i] = fixedPoint.clone();  // Collapse for the reverse case
            }

            // Move the fixed point to the next point in the path
            fixedPoint = points[fixedPointType === "start" ? i + 1 : points.length - 2 - i];
        }
    }

    // Step 7: Set the modified points back into the pathset
    pathSet.setPathPoints(0, points);

    // Return the updated pathset for reference
    return pathSet;
}


// Function to add the path to the correct overlap pathset based on passed uncutPoint information
function addToCorrectOverlapSet(pathSet, firstOverlapPathsSet, secondOverlapPathsSet, firstId, secondId, isLaserOperation, shouldTypeOverlap, uncutEndType) {
  let points = pathSet.getPathPoints(0);  // Get the vector points
  let startPoint = points[0];  // Start point of the vector
  let endPoint = points[1];    // End point of the vector

  // Determine which point is the uncut end
  let uncutPoint = (uncutEndType === 'start') ? startPoint : endPoint;
  let cutPoint = (uncutEndType === 'start') ? endPoint : startPoint;

  if (shouldTypeOverlap) {
    // If shouldTypeOverlap is true, add pathSet to both overlap sets
    firstOverlapPathsSet.addPaths(pathSet);
    secondOverlapPathsSet.addPaths(pathSet);
    return;  // Skip further logic, since it's added to both
  }

  if (isLaserOperation) {
    // For laser operations, compare X-coordinates of the uncut point
    if (uncutPoint.x < cutPoint.x) {
      firstOverlapPathsSet.addPaths(pathSet);  // Add to first set if X of uncut point is smaller than cut point
    } else {
      secondOverlapPathsSet.addPaths(pathSet);  // Add to second set if X of uncut point is larger than cut point
    }
  } else {
    // For non-laser operations, we have two cases based on the IDs
    const firstIdThousands = Math.floor(firstId / 1000);
    const secondIdThousands = Math.floor(secondId / 1000);

    if (firstIdThousands === secondIdThousands) {
      // If IDs are in the same range (e.g., 1002 and 1003), compare Y-coordinates of the uncut point
      if (uncutPoint.y < cutPoint.y) {
        firstOverlapPathsSet.addPaths(pathSet);  // Add to first set if Y of uncut point is smaller than cut point
      } else {
        secondOverlapPathsSet.addPaths(pathSet);  // Add to second set if Y of uncut point is larger than cut point
      }
    } else {
      // If IDs are in different ranges (e.g., 1002 and 2002), compare X-coordinates like laser operations
      if (uncutPoint.x < cutPoint.x) {
        firstOverlapPathsSet.addPaths(pathSet);  // Add to first set if X of uncut point is smaller than cut point
      } else {
        secondOverlapPathsSet.addPaths(pathSet);  // Add to second set if X of uncut point is larger than cut point
      }
    }
  }
}

//-----------------------------------------------------------------------------------------//
const divideHatchIntoUnbrokenSegments = function(hatch) {
    let dividedHatch = new HATCH.bsHatch();  // New hatch object to store separated hatch blocks
    let currentHatchBlock = null;  // Temporary variable to store the current hatch block
    let currentPathSet = null;  // Temporary variable to store the current path set
    if(hatch.isEmpty) return hatch;
    // Get the iterator for the hatch blocks in the hatch object
    let hatchBlockIterator = hatch.getHatchBlockIterator();

    while (hatchBlockIterator.isValid()) {
        // Get the current hatch block
        let hatchBlock = hatchBlockIterator.get();

        let carrierHatch = new HATCH.bsHatch(); 
        carrierHatch.addHatchBlock(hatchBlock);

        // Get the paths (vectors) from the hatch block
        let pathSet = new PATH_SET.bsPathSet();
        pathSet.addHatches(carrierHatch);

        let pathCount = pathSet.getPathCount();

        for (let i = 0; i < pathCount; i++) {
            // Get the points (start and end) of the current path
            let pathPoints = pathSet.getPathPoints(i);
            let startPoint = pathPoints[0];
            let endPoint = pathPoints[pathPoints.length - 1];

            // If this is the first segment or if the end of the previous segment does not connect to this one
            if (currentPathSet === null || !arePointsConnected(currentPathSet.getPathPoints(currentPathSet.getPathCount() - 1)[1], startPoint)) {
                // Finalize the current unbroken hatch block before starting a new one
                if (currentHatchBlock && currentPathSet) {
                    // Manually add points from the current path set to the new hatch block
                    addPathsToHatchBlock(currentHatchBlock, currentPathSet);
                    dividedHatch.addHatchBlock(currentHatchBlock);
                }

                // Clone the current hatch block to retain its attributes
                currentHatchBlock = hatchBlock.clone();
                currentHatchBlock.clear();  // Clear existing paths from the block, but keep its attributes

                // Create a new path set for a new unbroken segment
                currentPathSet = new PATH_SET.bsPathSet();
            }

            // Add the current path to the path set
            currentPathSet.addSinglePaths(pathSet, i);

            // If this is the last path or the next path is not connected, finalize the current hatch block
            if (i === pathCount - 1 || !arePointsConnected(endPoint, getNextStartPoint(pathSet, i))) {
                // Manually add points from the current path set to the new hatch block
                addPathsToHatchBlock(currentHatchBlock, currentPathSet);
                dividedHatch.addHatchBlock(currentHatchBlock);

                // Reset for the next unbroken segment
                currentPathSet = null;
                currentHatchBlock = null;
            }
        }

        hatchBlockIterator.next();
    }

    return dividedHatch;  // Return the new hatch containing separated unbroken segments
};

// Helper function to check if two points are connected
function arePointsConnected(prevEndPoint, nextStartPoint) {
    let distance = prevEndPoint.distance(nextStartPoint);
    let tolerance = 0.001;  // Define the tolerance level for connectivity (small distance)
    return distance <= tolerance;
}

// Helper function to get the start point of the next path, or return null if there is no next path
function getNextStartPoint(pathSet, currentIndex) {
    if (currentIndex + 1 < pathSet.getPathCount()) {
        return pathSet.getPathPoints(currentIndex + 1)[0];
    }
    return null;
}

// Helper function to manually add paths from a path set to a hatch block
function addPathsToHatchBlock(hatchBlock, pathSet) {
    let pathCount = pathSet.getPathCount();
    
    for (let i = 0; i < pathCount; i++) {
        let pathPoints = pathSet.getPathPoints(i);
        for (let j = 0; j < pathPoints.length; j++) {
            hatchBlock.appendPoint(pathPoints[j]);  // Manually add each point to the hatch block
        }
    }
}

//-----------------------------------------------------------------------------------------//
exports.assignDurationtoHatchblocks = function(bsHatch,modelData){

  let hatchBlockArray = bsHatch.getHatchBlockArray();
  let fullExposureHatch = new EXPOSURE.bsExposureTime();
  
  hatchBlockArray.forEach(function(hatchBlock){
        
    let exposureTime = new EXPOSURE.bsExposureTime();

    const cur_type = hatchBlock.getAttributeInt('type');

    const processProfile = modelData
          .getModel(hatchBlock.getAttributeInt('modelIndex'))
          .getAttribEx('customTable')
          .find(function(profile) {
            return profile.type === cur_type;
          });
          
    const scanParamters = processProfile       
          .attributes
          .find(function(attr) {
            return attr.schema === CONST.scanningSchema;
          });
          
    const laserStartPosition = {
      'x': hatchBlock.getPoint(0).x,
      'y': hatchBlock.getPoint(0).y
    }; 
     
    const exposureSettings = {
      'fJumpSpeed': scanParamters.jumpSpeed,
      'fMeltSpeed': processProfile.speed,
      'fJumpLengthLimit': scanParamters.jumpLengthLimit,
      'nJumpDelay': scanParamters.jumpDelay,
      'nMinJumpDelay': scanParamters.minJumpDelay,
      'nMarkDelay': scanParamters.markDelay,
      'nPolygonDelay': scanParamters.polygonDelay,
      'polygonDelayMode': scanParamters.polygonDelayMode,
      'laserPos': laserStartPosition
    };
    
    exposureTime.addHatchBlock(hatchBlock,exposureSettings);
    fullExposureHatch.addHatchBlock(hatchBlock,exposureSettings);
    
    hatchBlock.setAttributeInt('hatchExposureTime',exposureTime.getExposureTimeMicroSeconds())
  });
  
  return fullExposureHatch.getExposureTimeMicroSeconds();
  
  //allHatches.makeEmpty();
  
  //hatchBlockArray.forEach(function(hatchBlock){
  //  bsHatch.addHatchBlock(hatchBlock);
  //});
  
};