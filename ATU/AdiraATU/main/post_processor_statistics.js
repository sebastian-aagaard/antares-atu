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
const POLY_IT = requireBuiltin('bsPolylineIterator');
const UTIL = require('main/utility_functions.js');

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
  const buildTime = getBuildTime(modelData,progress,layer_start_nr,layer_end_nr);
  
  process.print('buildtime_ms: ' + buildTime);
  process.print('buildtime_hours: ' + buildTime/3600000);
  
    
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
          "build_time": buildTime,
          "total_mass": partMassKg,
          "total_packed_powder":null,// totalPackedPowder                
        }        
      },
      
      {
        "name": "generation",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "created_at": new Date().toISOString(),
          "created_by": "engineer"
        }        
      },

      {
        "name": "material",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "layerthickness": modelData.getLayerThickness(),
          "identifier": null,//model.getMaterialID(),
          "density": PARAM.getParamReal('material','density_g_cc'),//,
          "gas": null,//         
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
          
   modelData.setTrayAttribEx('custom', customJSON);
   let done =0;
}

const getBuildTime = (modelData,progress,layer_start_nr,layer_end_nr) => {
  
  let layerCount = layer_end_nr-layer_start_nr+1;
 
  progress.initSteps(layerCount);
  
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
      layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
  
  let buildTime = 0;
  
  while(layerIt.isValid() && !progress.cancelled())
  {
    let layerNr = layerIt.getLayerNr();
    buildTime += 
      UTIL.getModelsInLayer(modelData,layerNr)[0]
      .getModelLayerByNr(layerNr)
      .getAttribEx('exporter_3mf')
      .content[0]
      .attributes
      .layerScanningDuration;
     
    progress.step(1);
    layerIt.next();
  }
  
  return buildTime
} 

const getPartMassKg = (modelData,progress,layer_start_nr,layer_end_nr) => {
  
  let layerCount = layer_end_nr-layer_start_nr+1;
 
  progress.initSteps(layerCount);
  
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
      layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
  
  let surface_area_mm2 = 0;
  
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
  
  
  return mass_kilograms
} 