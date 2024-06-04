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

  return shiftValue;
}

////////////////////////////////
//     get Tile Position      //
////////////////////////////////

// get all relevant information for the tiling providing the origin of the scanhead
function getTilePosition(x_pos, y_pos, overlap_x = 0, overlap_y = 0) {
    // Retrieve overlap values if they are the default zero, meaning they weren't explicitly passed
    if (overlap_x === 0) overlap_x = PARAM.getParamReal('scanhead', 'tile_overlap_x');
    if (overlap_y === 0) overlap_y = PARAM.getParamReal('scanhead', 'tile_overlap_y');

    let xmin = x_pos;
    let xmax = x_pos + PARAM.getParamReal('scanhead', 'x_scanfield_size_mm');
    let ymin = y_pos;
    let ymax;

    if (PARAM.getParamInt('tileing', 'ScanningMode') === 0) { // moveandshoot
        ymax = y_pos + PARAM.getParamReal('scanhead', 'y_scanfield_size_mm');
    } else { // onthefly
        ymax = y_pos + PARAM.getParamReal('otf', 'tile_size');
    }

    return {
        xmin: xmin,
        xmax: xmax,
        ymin: ymin,
        ymax: ymax,
        tile_height: ymax - ymin,
        tile_width: xmax - xmin,
        next_x_coord: x_pos + (xmax - xmin) + overlap_x,
        next_y_coord: y_pos + (ymax - ymin) + overlap_y
    };
}


function getBoundaryData(modelData, layerNr) {
    try {
        let boundaries = modelData.getTrayAttribEx('allLayerBoundaries');
        //process.printInfo(layerNr);
        return {
            xmin: boundaries[layerNr][0],
            xmax: boundaries[layerNr][1],
            ymin: boundaries[layerNr][2],
            ymax: boundaries[layerNr][3]
        };
    } catch (err) {
       throw new Error('Tileing: Failed to access boundaries at layer nr: ' + layerNr);
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

function adjustTileLayout(minCoord, maxCoord, workareaMin, workareaMax, tileSize, requiredPasses, overlap,shift) {
  
    let tileReach = tileSize * requiredPasses + overlap * (requiredPasses - 1);
      
    let startingPos = minCoord;

    if (startingPos + tileReach > workareaMax) { // if outside of workarea
        startingPos = workareaMax + shift - tileReach;
    }

    if(startingPos + tileReach + shift <= maxCoord) {
      process.print("adjusted passes in layer");
     //requiredPasses++;
    }

    if (startingPos < workareaMin) {
        overlap = (startingPos - workareaMin) / (requiredPasses - 1);
        startingPos = workareaMin;
    }
    

    return {
        startingPos,
        overlap,
        requiredPasses
      
    };
}



exports.getTileArray = function (modelLayer, layerNr, modelData) {
  
    if(!modelData) {
      throw new Error ("modelData could not be obtained for layer " + layerNr);
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
    const tileOutlineOrigin = getTilePosition(0, 0);
    let { required_passes_x, required_passes_y } = calculateRequiredPasses(
        sceneSize, tileOutlineOrigin.tile_width, tileOutlineOrigin.tile_height,
        PARAM.getParamReal('scanhead', 'tile_overlap_x'), PARAM.getParamReal('scanhead', 'tile_overlap_y')
    );
    
    const workAreaLimits = modelData.getTrayAttribEx('workAreaLimits');
        
    // Adjust starting positions
    let { startingPos: scanhead_x_starting_pos, overlap: overlap_x, requiredPasses: required_passes_x_new } = adjustTileLayout(
        modelBoundaries.xmin,modelBoundaries.xmax, workAreaLimits.xmin, workAreaLimits.xmax, tileOutlineOrigin.tile_width,
        required_passes_x, PARAM.getParamReal('scanhead', 'tile_overlap_x'),shiftX
    );

  required_passes_x = required_passes_x_new; 

    let { startingPos: scanhead_y_starting_pos, overlap: overlap_y, requiredPasses: required_passes_y_new  } = adjustTileLayout(
        modelBoundaries.ymin,modelBoundaries.ymax, workAreaLimits.ymin, workAreaLimits.ymax, tileOutlineOrigin.tile_height,
        required_passes_y, PARAM.getParamReal('scanhead', 'tile_overlap_y'),shiftY
    );
    
    required_passes_y = required_passes_y_new; 
    
    // Offset starting position for shifts
    scanhead_x_starting_pos += shiftX - maxShiftX / 2;
    scanhead_y_starting_pos += shiftY - maxShiftY / 2;

    // Initialize tile tables
    let tileTable = [];
    let tileTable3mf = [];

    // Generate tiles
    let cur_tile_coord_x = scanhead_x_starting_pos;
    let cur_tile_coord_y = scanhead_y_starting_pos;
    
    if (!cur_tile_coord_x || !cur_tile_coord_y)
      throw new Error ("current tile coordinate not defined, layer nr: " + layerNr);
      
    if (!required_passes_x || !required_passes_y)
      throw new Error ("no passes defined, layer nr: " + layerNr);

    for (let i = 0; i < required_passes_x; i++) {
        let cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y, overlap_x, overlap_y);
        let next_tile_coord_x = cur_tile.next_x_coord;

        for (let j = 0; j < required_passes_y; j++) {
            cur_tile = getTilePosition(cur_tile_coord_x, cur_tile_coord_y, overlap_x, overlap_y);

            let scanhead_outlines = [
                new VEC2.Vec2(cur_tile.xmin, cur_tile.ymin),
                new VEC2.Vec2(cur_tile.xmin, cur_tile.ymax),
                new VEC2.Vec2(cur_tile.xmax, cur_tile.ymax),
                new VEC2.Vec2(cur_tile.xmax, cur_tile.ymin),
                new VEC2.Vec2(cur_tile.xmin, cur_tile.ymin)
            ];

            let tile_obj = {
                passNumber: i + 1,
                tile_number: j + 1,
                scanhead_outline: scanhead_outlines,
                scanhead_x_coord: cur_tile_coord_x,
                scanhead_y_coord: cur_tile_coord_y,
                tile_height: cur_tile.tile_height,
                overlapX: overlap_x,
                overlapY: overlap_y,
                shiftX: shiftX,
                shiftY: shiftY,
                layer: layerNr
            };
            tileTable.push(tile_obj);

            let defaultSpeedY = PARAM.getParamInt('tileing', 'ScanningMode') === 0 ?
                PARAM.getParamInt('movementSettings', 'sequencetransfer_speed_mms') :
                PARAM.getParamReal('otf', 'axis_max_speed');

            let TileEntry3mf = {
                name: "movement",
                attributes: {
                    tileID: j + 1 + (i + 1) * 1000,
                    xcoord: cur_tile_coord_x,
                    ycoord: cur_tile_coord_y,
                    targetx: 0,
                    targety: 0,
                    positiony: cur_tile_coord_y,
                    speedx: 0,
                    speedy: defaultSpeedY,
                    tileExposureTime: 0
                }
            };

            if (!tileTable3mf[i]) tileTable3mf[i] = [];
            tileTable3mf[i].push(TileEntry3mf);

            cur_tile_coord_y = cur_tile.next_y_coord;
        }

        cur_tile_coord_y = scanhead_y_starting_pos; // reset y coord
        cur_tile_coord_x = next_tile_coord_x; // set next stripe pass
    }

    modelLayer.setAttribEx('tileTable', tileTable);
    modelLayer.setAttribEx('tileTable_3mf', tileTable3mf); //<-- 
};