 /************************************************************
 * Post Processing Get Statistics
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
//const MODEL = requireBuiltin('bsModel');
const PARAM = requireBuiltin('bsParam');
const VEC2 = requireBuiltin('vec2');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const UTIL = require('main/utility_functions.js');
const CONST = require('main/constants.js');

/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
  
exports.getStatistics = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){

  
  const partMassKg = getPartMassKg(modelData,progress,layer_start_nr,layer_end_nr);
  const buildTime_us = getBuildTime_us(modelData,progress,layer_start_nr,layer_end_nr);
    
  const totalPowder = (layer_end_nr 
      * modelData.getLayerThickness() 
      * PARAM.getParamInt('workarea','x_workarea_max_mm') 
      * PARAM.getParamInt('workarea','y_workarea_max_mm')
      * PARAM.getParamReal('material','density_g_cc') ) / (1000*1000*1000);
   
  process.print('buildtime_us: ' + buildTime_us);
  process.print('buildtime_s: ' + buildTime_us/(1000*1000));
  process.print('buildtime_min: ' + buildTime_us/(1000*1000)/60);
  process.print('buildtime_hours: ' + buildTime_us/(3600*1000*1000));
  process.print('buildtime_days: ' + buildTime_us/(3600*1000*1000)/24);
  
    
//   let customJSON = {
//     
//     "namespaces": [
//       {
//         "schema": "http://schemas.scanlab.com/skywriting/2023/01",
//         "prefix": "skywriting"
//       },      
//       {
//         "schema": "http://adira.com/addcreator/202305",
//         "prefix": "adira"
//       },
//       {
//         "schema": "http://adira.com/tilinginformation/202305",
//         "prefix": "tiling"
//       }    
//     ],
//       
//     metadata: [ 
//       {
//         "name": "statistics",
//         "schema": "http://adira.com/addcreator/202305",
//         attributes: {
//           "build_time": buildTime_us,
//           "total_mass": partMassKg,
//           "total_packed_powder":totalPowder,// totalPackedPowder                
//         }        
//       },
//       
//       {
//         "name": "generation",
//         "schema": "http://adira.com/addcreator/202305",
//         attributes: {
//           "created_at": new Date().toISOString(),
//           "created_by": "engineer"
//         }        
//       },
// 
//       {
//         "name": "material",
//         "schema": "http://adira.com/addcreator/202305",
//         att/ributes: {
//           "layerthickness": modelData.getLayerThickness(),
//           "identifier": null,//model.getMaterialID(),
//           "density": PARAM.getParamReal('material','density_g_cc'),//,
//           "gas": totalPowder,//         
//         }        
//       },
//       
//       {
//         "name": "process",
//         "schema": "http://adira.com/addcreator/202305",
//         "children": [
//           {
//             "name": "recoating",
//             attributes: {
//               "speed": PARAM.getParamInt('movementSettings','recoating_speed_mms')
//             }        
//           
//           }
//         ]
//                 
//       }
// 
//     ]};

  let myConfiguration = {
    "data": "test",
    "writtenat": "XXX"
  };

let customJSON = {

    "namespaces": [
      {
        "schema": "http://schemas.scanlab.com/skywriting/2023/01",
        "prefix": "skywriting"
      },      
      {
        "schema": "http://nikonslm.com/origin/202305",
        "prefix": "origin"
      },
      {
        "schema": "http://nikonslm.com/tilinginformation/202305",
        "prefix": "tile"
      },
      {
        "schema": "http://nikonslm.com/statistics/202305",
        "prefix": "stats"
      },
      {
       "schema": "http://test.com/test/202305",
       "prefix": "tiles"
      }
    ],
        
    "attachments": [
        {
          "path": "/ATU/configuration.json",
          "encoding": "string",
          "relationship": "http://test.com/configurationjson/202305",
          "data": JSON.stringify (myConfiguration)
        },
        {
          "path": "/ATU/configuration2.txt",
          "encoding": "string",
          "relationship": "http://test.com/configurationjson/202305",
          "data": "TEST"
        }
        
    ],
        
        
    "segmentattributes": [
          {
           "segmenttype": "hatch",
           "datatype": "int32",
           "name_3mf": "tileid",
           "name_atu": "tileID_3mf",
           "namespace": "http://nikonslm.com/tilinginformation/202305"
           }
    ],
           
    "metadata": [{
            "name": "totals",
            "namespace": "http://nikonslm.com/statistics/202305",
            "attributes": {
                "build_time_hours": buildTime_us.toFixed(0)/(3600*1000*1000),
                "part_mass_kg": partMassKg.toFixed(3),
                "powderbed_kg": totalPowder.toFixed(3),
              }
            },
            {
            "name":"origin",
            "namespace": "http://nikonslm.com/origin/202305",
            "attributes": {
              "created_at": new Date().toISOString(),
              "created_by": process.username
            },
            "nodes": [{
                    "name": "node20",
                    "attributes": {
                        "attribute1": 5,
                        "attributexxx": "250 something",
                    }
                }
            ]
        }
    ]
};
          
   modelData.setTrayAttribEx('custom', customJSON);
}

const getBuildTime_us = (modelData,progress,layer_start_nr,layer_end_nr) => {
  
  let layerCount = layer_end_nr-layer_start_nr+1;
 
  progress.initSteps(layerCount);
  
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
      layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
  
  let buildTime_us = 0;
  let dayCounter = 0;
  while(layerIt.isValid() && !progress.cancelled())
  {
    const layerNr = layerIt.getLayerNr();
    
    const recoatingTime_us = PARAM.getParamInt('movementSettings','recoating_time_ms') * 1000;
    const powderFillingTime_us = PARAM.getParamInt('movementSettings', 'powderfilling_time_ms') * 1000;
    
    let exportData = UTIL.getModelsInLayer(modelData,layerNr)[0]
      .getModelLayerByNr(layerNr)
      .getAttribEx('exporter_3mf')
      .metadata;
    
    let layerDuration_us = exportData[1]
      .attributes
      .layerTotalDuration_us;
    
    let transport_mm = getTransportationDistance_mm(exportData);
    let transportTime_us = (transport_mm/PARAM.getParamReal('movementSettings', 'axis_transport_speed'))*1000*1000;
              
    buildTime_us += transportTime_us;  
    buildTime_us += (layerDuration_us<powderFillingTime_us) ? powderFillingTime_us : layerDuration_us ;
    buildTime_us += recoatingTime_us;
    
    progress.step(1);
    layerIt.next();
  }
  
  return buildTime_us
} 

const getTransportationDistance_mm = (exportData) => {
  
  let transport_mm = 0;
    
  exportData.forEach((pass, index) => {
    
    if(index == 0) return;
    
    
    if (index == 1) { // if first
      //from park
      let parkPos = new VEC2.Vec2(CONST.parkingPosition.x,CONST.parkingPosition.y);
      let startPos = new VEC2.Vec2(pass.attributes.startx,pass.attributes.starty);
      transport_mm += startPos.distance(parkPos);
      //process.print('from park ' + startPos.distance(parkPos))
      }
   
    let passTarget = new VEC2.Vec2(
      pass.nodes[pass.nodes.length-1].attributes.targetx, 
      pass.nodes[pass.nodes.length-1].attributes.targety);
      
    if(index < exportData.length-1){ // if not last
     //move to next start
     let nextPassStart = new VEC2.Vec2(
     exportData[index+1].attributes.startx,
     exportData[index+1].attributes.starty);
     
     transport_mm += passTarget.distance(nextPassStart); 
      
      //process.print('from pass to pass ' + passTarget.distance(nextPassStart))
     }
      
    if (index == exportData.length-1) { // if last
      //back to park
      let parkPos = new VEC2.Vec2(CONST.parkingPosition.x,CONST.parkingPosition.y);
      transport_mm += passTarget.distance(parkPos); 
      
      
      //process.print('back to park ' + passTarget.distance(parkPos))
      // do we move back to park?
      }
  });

  return transport_mm;
};

const getPartMassKg = (modelData,progress,layer_start_nr,layer_end_nr) => {
  
  let layerCount = layer_end_nr-layer_start_nr+1;
 
  progress.initSteps(layerCount);
  
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
      layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
  
  let surface_area_mm2 = 0;
  
  let thisModel = modelData.getModel(0);
//     var thisLayer = thisModel.getModelLayerByNr(layerNr);
//    thisLayer.setAttribEx('exporter_3mf', exporter_3mf);  
  
  while(layerIt.isValid() && !progress.cancelled())
  {
    let layerNr = layerIt.getLayerNr();
    let islandIt = modelData.getFirstIsland(layerNr);  
    
    while(islandIt.isValid() && !progress.cancelled())
    {
      let thisIsland = islandIt.getIsland();
      surface_area_mm2 += thisIsland.getSurfaceArea();
      islandIt.next();
    }    
    
    progress.step(1);
    layerIt.next();
  }
 
  let height_cm = modelData.getLayerThickness() / 10000 ;
  let surface_area_cm2 = surface_area_mm2 / 100 ;
  let volume_cc = surface_area_cm2 * height_cm ;
  let mass_grams = volume_cc * PARAM.getParamReal('material','density_g_cc') ;
  let mass_kilograms = mass_grams / 1000 ;
  
  
  return mass_kilograms;
} 