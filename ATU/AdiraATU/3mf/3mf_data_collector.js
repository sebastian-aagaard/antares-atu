/************************************************************
 * Create Meta Data Export Data Structures
 *
 * @author []
 * Copyright (c). All rights reserved.
 ***********************************************************/
'use strict';

const PARAM = requireBuiltin('bsParam');
const UTIL = require('main/utility_functions.js');

exports.createExporter3mf = (exposureArray, layerIt, modelData, layerNr) => {
  let exporter_3mf = {    
    "segmentattributes": [
      {
        "segmenttype": "hatch",
        "datatype": "uint32",
        "attribute_name": "tileid",
        "attribute_value": "tileid",
        "namespace": "http://test.com/test/202305"
      }
    ],
    "metadata": []
  };
  
  exposureArray.forEach((pass, passIndex) => {
    try {
      if(PARAM.getParamInt('tileing','ScanningMode')) {
        exporter_3mf.metadata[passIndex] = {
          "name": "onthefly",
          "namespace": "http://test.com/test/202305",
          "attributes": {
            "uuid": UTIL.generateUUID(),
            "type": PARAM.getParamStr('tileing', 'ScanningMode').toLowerCase().replace(/\s+/g, ''),
            "direction": pass[0].ProcessHeadFromFront ? "fromfront" : "fromback",
            "startx": pass[0].xcoord.toFixed(3),
            "starty": pass[0].ProcessHeadFromFront ? pass[0].ycoord : pass[0].ycoord + PARAM.getParamReal('otf', 'tile_size').toFixed(3),
            "sequencetransferspeed": PARAM.getParamReal('movementSettings', 'axis_transport_speed'),
            "requiredPasses": exposureArray.length,
            "tilesInPass": pass.length
            //"layerScanningDuration": null,
            //"layerTotalDuration": null
          },
          "nodes": []
        };
        
      } else { // moveandshoot
    
        exporter_3mf.metadata[passIndex] = {
          "name": "moveandshoot",
          "namespace": "http://test.com/test/202305",
          "attributes": {
            "uuid": UTIL.generateUUID(),
            "type": PARAM.getParamStr('tileing', 'ScanningMode').toLowerCase().replace(/\s+/g, '')
          },
          "nodes": []
        };
        
    }
    } catch (e) {
      throw new Error('failed at pass ' + passIndex + ', layer ' + layerNr);
    }
    
    pass.forEach((tile, tileIndex) => {
      let speedY, tileSize;

      // Determine tile size and y speed
      if (PARAM.getParamInt('tileing', 'ScanningMode')) {
        tileSize = PARAM.getParamReal('tileing', 'tile_size');
        speedY = tile.exposureTime > 0 ? tileSize / (tile.exposureTime / (1000 * 1000)) : PARAM.getParamReal('movementSettings', 'axis_max_speed');
        speedY = speedY > PARAM.getParamReal('movementSettings', 'axis_max_speed') ? PARAM.getParamReal('movementSettings', 'axis_max_speed') : speedY;
      } else { // point and shoot
        tileSize = PARAM.getParamReal('tileing', 'tile_size');
        speedY = PARAM.getParamReal('movementSettings', 'axis_transport_speed');
      }

      const tileMovementDuration = (tileSize / speedY) * 1000 * 1000;

      // Determine next y-coordinate
      let nextTileYCoord, nextTileXCoord;
      if (tileIndex === pass.length - 1) { // if last tile
        nextTileYCoord = tile.ycoord + (tile.ProcessHeadFromFront ? tileSize : -tileSize);
        nextTileXCoord = tile.xcoord;
      } else {
        nextTileXCoord = pass[tileIndex + 1].xcoord;        
        nextTileYCoord = tile.ProcessHeadFromFront ? pass[tileIndex + 1].ycoord : tile.ycoord;
      }

      if (nextTileXCoord === undefined || nextTileYCoord === undefined) {
        throw new Error('failed to get next tile coord, at pass ' + passIndex + ', tile ' + tileIndex);
      }

      
      if(PARAM.getParamInt('tileing','ScanningMode')) {
      

      // Create node object
        exporter_3mf.metadata[passIndex].nodes[tileIndex] = {
          "namespace" : "http://tile.com/moveandshoot/202305",
          "name": "movement",
          "attributes": {
            "tileID": tile.tileID,
            "targetx": nextTileXCoord.toFixed(3),
            "targety": nextTileYCoord.toFixed(3),
            "positiony": tile.ycoord.toFixed(3),
            "speedx": 0,
            "speedy": speedY.toFixed(3),
            "tileExposureTime": tile.exposureTime,
            "tileTotalTime": tileMovementDuration
          }
        };
    } else {
     // Create node object
        exporter_3mf.metadata[passIndex].nodes[tileIndex] = {
          "name": "movement",
          "attributes": {
            "tileID": tile.tileID,
            "startx": tile.xcoord.toFixed(3),
            "starty": tile.ycoord.toFixed(3),
            "speed": PARAM.getParamReal('movementSettings', 'axis_transport_speed')
          }
        };
        }


      });
  });

  assignLayerTotals(exporter_3mf);

  // Set the exporter_3mf for all models in this layer
  const arrayOfModels = UTIL.getModelsInLayer(modelData, layerNr);

  arrayOfModels.forEach(m => {
    m.getModelLayerByNr(layerNr).setAttribEx('exporter_3mf', exporter_3mf);
  });
};

const assignLayerTotals = (exporter_3mf) => {
  // Initialize total durations
  let layerScanningDuration = 0;
  let layerTotalDuration = 0;

  exporter_3mf.metadata.forEach(pass => {
    let passScanningDuration = 0;
    let passTotalDuration = 0;

    pass.nodes.forEach(tile => {
      let tileExposureDuration = tile.attributes.tileExposureTime;

      passScanningDuration += tileExposureDuration;
      passTotalDuration += tile.attributes.tileTotalTime;
    });

    // Assign the calculated durations to the respective pass
    pass.attributes.sequenceScanningDuration = passScanningDuration;
    pass.attributes.sequenceTotalDuration = passTotalDuration;

    layerScanningDuration += passScanningDuration;
    layerTotalDuration += passTotalDuration;
  });

  exporter_3mf.metadata.forEach(pass => {
    pass.attributes.layerScanningDuration = layerScanningDuration;
    pass.attributes.layerTotalDuration = layerTotalDuration;
  });
};
