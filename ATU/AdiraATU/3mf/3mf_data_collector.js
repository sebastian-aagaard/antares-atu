/************************************************************
 * Create Meta Data Export Data Structures
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const PARAM = requireBuiltin('bsParam');
const UTIL = require('main/utility_functions.js');


exports.createExporter3mf = (exposureArray,layerIt,modelData,layerNr) => {
  
  const arrayOfModels = UTIL.getModelsInLayer(modelData,layerNr);
      
  let exporter_3mf = {    
    "segment_attributes": [
        {
         "segmenttype": "hatch",
         "datatype": "uint32",
         "attribute_name": 1,
         "attribute_value": 1,
         "namespace": "http://adira.com/tilinginformation/202305"
         }
    ],
      "content": []
  };
  
  exposureArray.forEach((pass,passIndex) => {
    
    if(passIndex == 1){
      let stop =0;
        }
    
    exporter_3mf.content[passIndex] = {
     "name": "sequence",
     "namespace": "http://adira.com/tilinginformation/202305",
     "attributes": {
        "uuid": UTIL.generateUUID(),
        "startx": pass[0].exposure[0].getAttribReal('xcoord'),
        "starty": pass[0].exposure[0].getAttribReal('ycoord'),
        "sequencetransferspeed": PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms'),
        "type": PARAM.getParamStr('tileing','ScanningMode').toLowerCase().replace(/\s+/g, ''),
        "requiredPasses": exposureArray.length,
        "tilesInPass": pass.length,
        "layerScanningDuration":null,
        "layerTotalDuration" : null
      },
      "children": [] //tileTable_3mf
      };

    
    pass.forEach((tile, tileIndex) => {
       
      let speedY,tileSize;
           
      //find tile size and y speed
      if(PARAM.getParamInt('tileing','ScanningMode')) 
      {

      tileSize = PARAM.getParamReal('otf','tile_size');
      speedY = tile.exposureTime > 0 ? tileSize / (tile.exposureTime /(1000*1000)) : PARAM.getParamReal('otf','axis_max_speed');
      speedY = speedY > PARAM.getParamReal('otf','axis_max_speed') ? PARAM.getParamReal('otf','axis_max_speed') : speedY;

      } else { // point and shoot
       
      tileSize = PARAM.getParamReal('scanhead','y_scanfield_size_mm');
      speedY = PARAM.getParamReal('movementSettings','sequencetransfer_speed_mms');
       
      }
      
      const tileMovementDuration = (tileSize/speedY)*1000*1000;
      
      //find next ycoordinate
      
      let nextTileYCoord = undefined;
      let nextTileXCoord = undefined;
      
      process.print('pass ' + passIndex + ' / '+tile.tileID + ' / ' + tileIndex);
      
      if (tileIndex == pass.length-1) {
        
        nextTileYCoord =  tile.ycoord + ((tile.ProcessHeadFromFront) ? tileSize : -tileSize);
        nextTileXCoord =  tile.xcoord;
        
      } else {
       
        nextTileYCoord = pass[tileIndex + 1].ycoord;        
        nextTileXCoord = pass[tileIndex + 1].xcoord;
        
      }
      
      if(!nextTileXCoord || !nextTileYCoord) 
        throw new Error('failed to get next tile coord, at pass ' + passIndex + ', tile ' + tileIndex);

      // create objects
      exporter_3mf.content[passIndex].children[tileIndex] = ({
        "name": "movement",
        "attributes": {
          "tileID": tile.tileID,
          "targetx": nextTileXCoord,
          "targety": nextTileYCoord,
          "positiony": tile.ycoord,
          "speedx": 0,
          "speedy": speedY,
          "tileExposureTime": tile.exposureTime,
          "tileTotalTime": tileMovementDuration
        }
      });    
    });
  });
  
  
  assignLayerTotals(exporter_3mf);
  
  exporter_3mf = removeEmptyTilesIfFirstOrLast (exporter_3mf);

  // set the exporter_3mf for all models
  arrayOfModels.forEach(m => {
    m.getModelLayerByNr(layerNr).setAttribEx('exporter_3mf', exporter_3mf)
    });
        
}


const assignLayerTotals = (exporter_3mf) => {
  exporter_3mf.content.forEach((passContent, passIndex) => {
    // Initialize total durations
    let layerScanningDuration = 0;
    let layerTotalDuration = 0;

    passContent.children.forEach(tile => {
      layerScanningDuration += tile.attributes.tileExposureTime;
      layerTotalDuration += tile.attributes.tileTotalTime;
    });

    // Assign the calculated durations to the respective pass
    passContent.attributes.layerScanningDuration = layerScanningDuration;
    passContent.attributes.layerTotalDuration = layerTotalDuration;
  });
}



const removeEmptyTilesIfFirstOrLast = (exporter_3mf) => {
 
  exporter_3mf.content = exporter_3mf.content.map(pass => {
    
    const firstNonZeroIndex = pass.children.findIndex(tile => tile.attributes.tileExposureTime !== 0);
    const lastNonZeroIndex = [...pass.children].reverse().findIndex(tile => tile.attributes.tileExposureTime !== 0);
    const actualLastNonZeroIndex = lastNonZeroIndex !== -1 ? pass.children.length - 1 - lastNonZeroIndex : -1;
    let filteredTiles = pass.children.filter((tile, index) => {
      return index >= firstNonZeroIndex && index <= actualLastNonZeroIndex;
    });
    return { ...pass, children: filteredTiles };
  }).filter(pass => pass.children.length > 0);
  return exporter_3mf;
};