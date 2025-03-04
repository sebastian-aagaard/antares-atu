 /************************************************************
 * Tieling
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //

const PARAM = requireBuiltin('bsParam');
const PATH_SET = requireBuiltin('bsPathSet');
const VEC2 = requireBuiltin('vec2');
const MODEL = requireBuiltin('bsModel');
const UTIL = require('main/utility_functions.js');
const CONST = require('main/constants.js');
// -------- FUNCTIONS -------- //

// local
// getShiftX(layerNr)
// getShiftY(layerNr)
// getTilePos(x_pos,y_pos,overlap_x,overlap_y)

// public
// getTileArray(modelLayer,bDrawTile,layerNr)

////////////////////////////////
//   get tile shift in X      //
////////////////////////////////  

function getShiftX(layerNr) {
  
  let layerCount = PARAM.getParamInt('tileing', 'number_x');
  let shiftIncrement = PARAM.getParamReal('tileing', 'step_x');
  let middleLayer = Math.floor(layerCount / 2); // Determine the middle layer

  // Calculate the cycle position of the layer number
  let cyclePosition = layerNr % layerCount;
      
  // Calculate the distance from the middle layer
  let distanceFromMiddle = cyclePosition - middleLayer;
      
  // Compute the shift value based on the distance from the middle layer
  let shiftValue = distanceFromMiddle * shiftIncrement;
  
  if (!shiftValue || shiftIncrement == 0) {
    shiftValue = 0;
  }
      
  return shiftValue;
}

////////////////////////////////
//   get tile shift in Y      //
////////////////////////////////  

function getShiftY(layerNr) {
  let layerCount = PARAM.getParamInt('tileing', 'number_y');
  let shiftIncrement = PARAM.getParamReal('tileing', 'step_y');
  let middleLayer = Math.floor(layerCount / 2); // Determine the middle layer

  // Calculate the cycle position of the layer number
  let cyclePosition = layerNr % layerCount;
     
  // Calculate the distance from the middle layer
  let distanceFromMiddle = cyclePosition - middleLayer;
     
  // Compute the shift value based on the distance from the middle layer
  let shiftValue = distanceFromMiddle * shiftIncrement;
  
  if (!shiftValue || shiftIncrement == 0) {
    shiftValue = 0;
  }
  return shiftValue;
}

////////////////////////////////
//     get Tile Position      //
////////////////////////////////

// get all relevant information for the tiling providing the origin of the scanhead
function getTilePosition(x_pos, y_pos,tileSize_x = undefined, tileSize_y = undefined, overlap_x = undefined, overlap_y = undefined) {
    // Retrieve overlap values if they are the default zero, meaning they weren't explicitly passed
    if (overlap_x === undefined) overlap_x = PARAM.getParamReal('tileing', 'tile_overlap_x');
    if (overlap_y === undefined) overlap_y = PARAM.getParamReal('tileing', 'tile_overlap_y');
    if (tileSize_x === undefined) tileSize_x = PARAM.getParamReal('scanhead', 'x_scanfield_size_mm');
    if (tileSize_y === undefined) tileSize_y = PARAM.getParamReal('tileing', 'tile_size');
      
    return {
        xmin: x_pos,
        xmax: x_pos + tileSize_x,
        ymin: y_pos,
        ymax:  y_pos + tileSize_y,
        tile_height: tileSize_y,
        tile_width: tileSize_x,
        next_x_coord: x_pos + tileSize_x + overlap_x,
        next_y_coord: y_pos + tileSize_y + overlap_y
    };
}


function getBoundaryData(modelData, layerNr) {
    try {
        const layerPosZ = modelData.getLayerPosZ(layerNr); 
        const allBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
        const boundaries = allBoundaries[layerPosZ];
        
        if (!boundaries) {
            throw new Error("No boundaries found for layer position Z: " + layerPosZ);
        }
        
        // Return the boundary data
        return {
            xmin: boundaries[0],
            xmax: boundaries[1],
            ymin: boundaries[2],
            ymax: boundaries[3]
        };
    } catch (e) {
        process.printWarning('tiling | getBoundaryData Failed: cannot access boundaries at layer nr: ' + layerNr + ' - ' + e.message);
        return null; 
    }
}


function calculateSceneSize(modelBoundaries, maxShiftX, maxShiftY) {
    return {
        scene_size_x: (modelBoundaries.xmax - modelBoundaries.xmin) + Math.abs(maxShiftX),
        scene_size_y: (modelBoundaries.ymax - modelBoundaries.ymin) + Math.abs(maxShiftY),
        model_size_x: modelBoundaries.xmax - modelBoundaries.xmin,
        model_size_y: modelBoundaries.ymax - modelBoundaries.ymin
    };
}

function calculateRequiredPasses(sceneSize, tileWidth, tileHeight, overlapX, overlapY) {
    let required_passes_x = Math.ceil(sceneSize.scene_size_x / tileWidth);
    let required_passes_y = Math.ceil(sceneSize.scene_size_y / tileHeight);

    if (required_passes_x > 1 && overlapX !== 0) {
        required_passes_x = Math.ceil(sceneSize.scene_size_x / (tileWidth + overlapX));
    }

    if (required_passes_y > 1 && overlapY !== 0) {
        required_passes_y = Math.ceil(sceneSize.model_size_y / (tileHeight + overlapY));
    }
    
    return {
        required_passes_x,
        required_passes_y
    };
}

function adjustTileLayout(minCoord, maxCoord, workareaMin, workareaMax, tileSize,
  requiredPasses, overlap, shift, maxshift, modelCenterLocation,tilePosHardLimitMax) {
  
    let adjustedOverlap = overlap;
    let adjustedTileSize = tileSize;
    
    let tileReach = tileSize*requiredPasses + overlap * (requiredPasses - 1);
          
    let modelSize = maxCoord - minCoord;
    
    let startingPos = minCoord;
  
    if(modelCenterLocation!==0){
      
      startingPos -= modelCenterLocation;
      
      };
  

    if (startingPos + tileReach + shift < maxCoord ) { // if model is outside workingarea
        requiredPasses++;
    }
    
    if (startingPos + tileReach > workareaMax) { // if outside of workarea
        startingPos = workareaMax + shift - tileReach;
    }
    

    if (startingPos < workareaMin) {
        //overlap = (startingPos - workareaMin) / (requiredPasses - 1);
        //startingPos = workareaMin;
        adjustedOverlap = (modelSize - tileReach + maxshift) / (requiredPasses - 1);
        adjustedTileSize = (tileReach+adjustedOverlap)/requiredPasses;
        let adjustedTileReach = tileSize*requiredPasses + adjustedOverlap * (requiredPasses - 1);
        
        startingPos = maxCoord-adjustedTileReach+maxshift;
    }
    
    let lastTileStartPos = startingPos+tileReach-tileSize+maxshift;
    
    if(lastTileStartPos > tilePosHardLimitMax){
      let requiredAddedOverlap = lastTileStartPos-tilePosHardLimitMax;
      adjustedOverlap = requiredAddedOverlap / (requiredPasses - 1);
      adjustedOverlap *=-1;
      if(requiredPasses === 1) { // if only one pass the start position needs to be moved back
        startingPos=tilePosHardLimitMax+shift;
      }
    }    
    

    return {
        startingPos,
        adjustedOverlap,
        requiredPasses,
        adjustedTileSize
    };
};

exports.storeTileTableAsLayerAttrib = function (modelLayer, layerNr, modelData) {
  
  if(!modelData) {
    throw new Error ("getTileArray: modelData could not be obtained for layer " + layerNr);
  }
      
  if(!modelLayer) {
    throw new Error ("getTileArray: modelLayer could not be obtained for layer " + layerNr);
  }  
      
  // Calculate shifts
  const shiftX = getShiftX(layerNr);
  const shiftY = getShiftY(layerNr);

  // Max distance shifted
  const maxShiftX = (PARAM.getParamInt('tileing', 'number_x') - 1) * PARAM.getParamReal('tileing', 'step_x');
  const maxShiftY = (PARAM.getParamInt('tileing', 'number_y') - 1) * PARAM.getParamReal('tileing', 'step_y');

  // Get boundary data
  const modelBoundaries = getBoundaryData(modelData, layerNr);
    
  // Calculate scene size
  const sceneSize = calculateSceneSize(modelBoundaries, maxShiftX, maxShiftY);

  // Get tile layout information
  let tileOutlineOrigin = getTilePosition(0, 0);
  let returnPassContainer = calculateRequiredPasses(
      sceneSize, tileOutlineOrigin.tile_width, tileOutlineOrigin.tile_height,
      PARAM.getParamReal('tileing', 'tile_overlap_x'), PARAM.getParamReal('tileing', 'tile_overlap_y'));
  
  let required_passes_x = returnPassContainer.required_passes_x;
  let required_passes_y = returnPassContainer.required_passes_y;
  
  const workAreaLimits = UTIL.getWorkAreaLimits();
  
  // Adjust starting positions

  let adjustedTileLayoutX = adjustTileLayout(
      modelBoundaries.xmin,modelBoundaries.xmax, workAreaLimits.xmin, workAreaLimits.xmax, tileOutlineOrigin.tile_width,
      required_passes_x, PARAM.getParamReal('tileing', 'tile_overlap_x'),shiftX,maxShiftX,PARAM.getParamReal('tileShift', 'shiftTileInX'),CONST.tilePositionHardLimit.xmax);
      
  let scanhead_x_starting_pos = adjustedTileLayoutX.startingPos;
  let overlap_x = adjustedTileLayoutX.adjustedOverlap;
  required_passes_x = adjustedTileLayoutX.requiredPasses;
  let tileSize_x = adjustedTileLayoutX.adjustedTileSize;


  let adjustedTileLayoutY = adjustTileLayout(
    modelBoundaries.ymin,modelBoundaries.ymax, workAreaLimits.ymin, workAreaLimits.ymax, tileOutlineOrigin.tile_height,
    required_passes_y, PARAM.getParamReal('tileing', 'tile_overlap_y'),shiftY,maxShiftY,PARAM.getParamReal('tileShift', 'shiftTileInY'),CONST.tilePositionHardLimit.ymax);
      
  let scanhead_y_starting_pos = adjustedTileLayoutY.startingPos;
  let overlap_y = adjustedTileLayoutY.adjustedOverlap;
  required_passes_y = adjustedTileLayoutY.requiredPasses;
  let tileSize_y = adjustedTileLayoutY.adjustedTileSize;
  
  // Offset starting position for shifts
  scanhead_x_starting_pos += shiftX - maxShiftX / 2;
  scanhead_y_starting_pos += shiftY - maxShiftY / 2;
  //process.print('shiftXtot: ' + (shiftX - maxShiftX / 2));
  //process.print('scanhead_startPos 2: ' + scanhead_x_starting_pos);
  
  // Initialize tile tables
  let tileTable = [];
  let tileTable3mf = [];

  // Generate tiles
  let cur_tile_coord_x = scanhead_x_starting_pos;
  let cur_tile_coord_y = scanhead_y_starting_pos;
  
  if (cur_tile_coord_x === undefined || cur_tile_coord_y === undefined)
    throw new Error ("current tile coordinate not defined, layer nr: " + layerNr + ' at z: ' + modelLayer.getLayerZ());
    
  if (!required_passes_x || !required_passes_y)
    throw new Error ("no passes defined, layer nr: " + layerNr);

  for (let passnumber_x = 0; passnumber_x < required_passes_x; passnumber_x++) {
      //let cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y,tileSize_x,tileSize_y, overlap_x, overlap_y);
      let cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y,undefined,undefined, overlap_x, overlap_y);

      let next_tile_coord_x = cur_tile.next_x_coord;

      for (let j = 0; j < required_passes_y; j++) {
          //cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y,tileSize_x,tileSize_y, overlap_x, overlap_y);
          cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y,undefined,undefined, overlap_x, overlap_y);


          let scanhead_outlines = [
              new VEC2.Vec2(cur_tile.xmin, cur_tile.ymin),
              new VEC2.Vec2(cur_tile.xmin, cur_tile.ymax),
              new VEC2.Vec2(cur_tile.xmax, cur_tile.ymax),
              new VEC2.Vec2(cur_tile.xmax, cur_tile.ymin),
              new VEC2.Vec2(cur_tile.xmin, cur_tile.ymin)
          ];

          let tile_obj = {
              passNumber: passnumber_x + 1,
              tile_number: j + 1,
              tileID: j + 1 + (passnumber_x + 1) * 1000,
              scanhead_outline: scanhead_outlines,
              scanhead_x_coord: cur_tile_coord_x,
              scanhead_y_coord: cur_tile_coord_y,
              tile_height: cur_tile.tile_height,
              requiredPassesX: required_passes_x,
              requiredPassesY:required_passes_y,
              overlapX: overlap_x,
              overlapY: overlap_y,
              shiftX: shiftX,
              shiftY: shiftY,
              layer: layerNr,
              laserClipPoints : [],
              clipPoints : [],
          };
          tileTable.push(tile_obj);

          let defaultSpeedY = PARAM.getParamInt('tileing', 'ScanningMode') === 0 ?
              PARAM.getParamReal('movementSettings', 'axis_transport_speed') :
              PARAM.getParamReal('movementSettings', 'axis_max_speed');

          let TileEntry3mf = {
              name: "movement",
              attributes: {
                  tileID: j + 1 + (passnumber_x + 1) * 1000,
                  xcoord: cur_tile_coord_x,
                  ycoord: cur_tile_coord_y,
                  tileHeight: tileSize_y,
                  targetx: 0,
                  targety: 0,
                  positiony: cur_tile_coord_y,
                  speedx: 0,
                  speedy: defaultSpeedY,
                  tileExposureTime: 0
              }
          };

          if (!tileTable3mf[passnumber_x]) tileTable3mf[passnumber_x] = [];
            
          tileTable3mf[passnumber_x].push(TileEntry3mf);

          cur_tile_coord_y = cur_tile.next_y_coord;
      }

      cur_tile_coord_y = scanhead_y_starting_pos; // reset y coord
      cur_tile_coord_x = next_tile_coord_x; // set next stripe pass
  }
  
  let attemptCounter;
  
  saveTileTable(modelLayer,tileTable,tileTable3mf,attemptCounter,layerNr);
  
  return tileTable;
};

const saveTileTable = function(modelLayer,tileTable,tileTable3mf,attemptCounter,layerNr){
  
  modelLayer.setAttribEx('tileTable', tileTable);
  modelLayer.setAttribEx('tileTable_3mf', tileTable3mf);
  
  if(!modelLayer.getAttribEx('tileTable') || !modelLayer.getAttribEx('tileTable_3mf')){
  
    if (!modelLayer.getAttribEx('tileTable')) process.printWarning("failed to access tileTable, in model layer: " + layerNr);
    if (!modelLayer.getAttribEx('tileTable_3mf')) process.printWarning("failed to access tileTable_3mf, in model layer: " + layerNr);  
    
    if(typeof attemptCounter === 'undefined') {
      attemptCounter = 0
    };
  
  attemptCounter++;
  
  if(attemptCounter>100) throw new Error("Tileing | Tilearray : Failed to retrieve tileArray at layer: " + layerNr);
  
    process.printWarning("re-attempt to get tileArray, layer nr " + layerNr + " attempt nr: " + attemptCounter);
    saveTileTable(modelLayer,tileTable,tileTable3mf);
  };
}