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
    
  const tileTable_3mf = arrayOfModels[0].getModelLayerByNr(layerNr).getAttribEx('tileTable_3mf');
  
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

  const layerScanningDuration = exposureArray.reduce((totalPassSum, currentPass) => {
      const passSum = currentPass.reduce((totalTileSum, currentTile) => {
          // Assuming each `currentTile` is an array with a single number, extract that number.
          return totalTileSum + currentTile.exposureTime;
      }, 0);
      return totalPassSum + passSum;
  }, 0);
  
  exposureArray.forEach((pass,passIndex) => {
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
        "layerScanningDuration":layerScanningDuration
      },
      "children": tileTable_3mf[passIndex]
      
      };

    
    pass.forEach((tile, tileIndex) => {
       
      let speedY,tileSize;
           
      //find tile size and y speed
      if(PARAM.getParamInt('tileing','ScanningMode')) 
      {

      tileSize = PARAM.getParamReal('otf','tile_size');
      speedY = tile.exposureTime > 0 ? tileSize / (tile.exposureTime /(1000*1000)) : PARAM.getParamReal('otf','axis_max_speed');
      speedY = speedY > PARAM.getParamReal('otf','axis_max_speed') ? PARAM.getParamReal('otf','axis_max_speed') : speedY;

      } else { // point ans shoot
       
      tileSize = PARAM.getParamReal('scanhead','y_scanfield_size_mm');
      speedY = PARAM.getParamReal('movementSettings','sequencetransfer_speed_mms');
       
      }

      //find next ycoordinate

      let nextTileYCoord;

      if ( tileIndex + 1 < pass.length) {
        nextTileYCoord = pass[tileIndex + 1].exposure[0].getAttribReal('ycoord');
      } else {
        nextTileYCoord =  pass[tileIndex].exposure[0].getAttribReal('ycoord') + tileSize
      }
      
      exporter_3mf.content[passIndex].children[tileIndex] = {
        "name": "movement",
          "attributes": {
            "tileID":  tile.tileID,
            "targetx": tile.exposure[0].getAttribReal('xcoord'),
            "targety": nextTileYCoord,
            "positiony": tile.exposure[0].getAttribReal('ycoord'),
            "speedx":  0,
            "speedy": speedY,
            "tileExposureTime": tile.exposureTime         
        }			
      }
    })
  })
  
  exporter_3mf = removeEmptyTilesIfFirstOrLast (exporter_3mf);

 arrayOfModels.forEach(m => {
    m.getModelLayerByNr(layerNr).setAttribEx('exporter_3mf', exporter_3mf)
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