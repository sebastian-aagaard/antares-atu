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
  
const modelZeroAtThisLayer = modelData.getModel(0).getModelLayerByNr(layerNr); // the first model of the platform will be where 
  
const tileTable_3mf = modelZeroAtThisLayer.getAttribEx('tileTable_3mf');
  
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
      "sequencetransferspeed": 0,
      "type": pass[0].exposure[0].getAttribReal('ycoord'),
      "requiredPasses": exposureArray.length,
      "tilesInPass": pass.length,
      "layerScanningDuration":layerScanningDuration
    },
    "children": tileTable_3mf[passIndex]
    
    };
})


// for (let passNr in passNumberGroups){
//     
//    if(Number.isInteger(Number(passNr))){ // only perfom task if the passNr is an integer*/
//       let thispass = passNumberGroups[passNr];
// 
//       exporter_3mf.content[passNr] = {
//              "name": "sequence",
//              "namespace": "http://adira.com/tilinginformation/202305",
//              "attributes": {
//                 "uuid": UTIL.generateUUID(),
//                 "startx": thispass.startx,
//                 "starty": thispass.starty,//-scanheadArray[0].rel_y_max,
//                 "sequencetransferspeed": thispass.sequencetransferspeed,
//                 "type": thispass.type,
//                 "requiredPasses": thispass.requiredPasses,
//                 "tilesInPass": thispass.tilesInPass,
//                 "layerScanningDuration":passNumberGroups.layerExposureDuration
//               },
//               "children": thistiletable[passNr]
//           };
//       
//       let activeTile = [];     
//       for (let tileNr in thispass.tiles){
//          let tile =  thispass.tiles[tileNr];
//          activeTile.push(tileNr);
//         
//         process.printInfo('typeof:' + typeof(tile.tileExposureDuration));
//         
//          exporter_3mf.content[passNr].children[tileNr] = {
//            "name": "movement",
//                       "attributes": {
//                         "tileID":  thistiletable[passNr][tileNr].attributes.tileID,
//                         "targetx": tile.xcoord,
//                         "targety": thistiletable[passNr][tileNr].attributes.targety,
//                         "positiony": thistiletable[passNr][tileNr].attributes.positiony,
//                         "speedx":  tile.speedx,
//                         "speedy":  tile.speedy,
//                         "tileExposureTime": tile.tileExposureDuration         
//                       }			
//            };
//       
//            
//       }//tileNr
//       
//       
//       let firstTile =Math.min(...activeTile);
//       let lastTile =Math.max(...activeTile);
//       let currentTiles =exporter_3mf.content[passNr].children;
//       exporter_3mf.content[passNr].attributes.tilesInPass = lastTile-firstTile + 1;
//       let tilesToRemove = [];
//       for(let i =0; i<required_passes_y;i++){
//         if (i < firstTile || i > lastTile){
//           tilesToRemove.push(i);// remove unused tiles if they first or last in the pass   
//           }
//         }
//         
//        exporter_3mf.content[passNr].children = exporter_3mf.content[passNr].children.filter(function(child,index) {
//        return tilesToRemove.indexOf(index) === -1;
//          });   
//       
//   } // pass is pass (integer)
// } //passNr


modelZeroAtThisLayer.setAttribEx('exporter_3mf', exporter_3mf);



}

exports.createCustomJson = (model,modelData) => {

  const isoDateString = new Date().toISOString();

  let customJSON = {

  "namespaces": [
    {
      "schema": "http://schemas.scanlab.com/skywriting/2023/01",
      "prefix": "skywriting"
    },      
    {
      "schema": "http://adira.com/addcreator/202305",
      "prefix": "adira"
    },
    {
      "schema": "http://adira.com/tilinginformation/202305",
      "prefix": "tiling"
    }    
  ],
    
  toolpathdata: [
    {
      "name": "statistics",
      "schema": "http://adira.com/addcreator/202305",
      attributes: {
        "build_time": buildTimeEstimate,
        "total_mass": totalPartMass,
        "total_packed_powder": totalPackedPowder                
      }        
    },
    
    {
      "name": "generation",
      "schema": "http://adira.com/addcreator/202305",
      attributes: {
        "created_at": isoDateString,
        "created_by": "engineer"
      }        
    },

    {
      "name": "material",
      "schema": "http://adira.com/addcreator/202305",
      attributes: {
        "layerthickness": layerThickness,
        "identifier": model.getMaterialID(),
        "density": parseFloat(model.getAttrib('density')),
        "gas": model.getAttrib('gas')          
      }        
    },
    
    {
      "name": "process",
      "schema": "http://adira.com/addcreator/202305",
      "children": [
        {
          "name": "recoating",
          attributes: {
            "speed": PARAM.getParamInt('movementSettings','recoating_speed_mms')
          }        
        
        }
      ]
              
    }

  ]};

  //"type": PARAM.getParamStr('tileing','ScanningMode'),
    
  modelData.setTrayAttribEx('custom', customJSON);
    
}