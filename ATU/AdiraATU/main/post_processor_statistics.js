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
  const buildTime_ms = getBuildTime_ms(modelData,progress,layer_start_nr,layer_end_nr);
  modelData.setTrayAttrib('built_time_estimation_ms', (buildTime_ms).toFixed(0));
    
  const totalPowder = (layer_end_nr 
      * modelData.getLayerThickness() 
      * PARAM.getParamInt('workarea','x_workarea_max_mm') 
      * PARAM.getParamInt('workarea','y_workarea_max_mm')
      * PARAM.getParamReal('material','density_g_cc') ) / (1000*1000*1000);
  
   //if(CONST.bVERBOSE){ 
    //process.print('buildtime_us: ' + buildTime_us);
    process.print('buildtime_s: ' + buildTime_ms/(1000));
    process.print('buildtime_min: ' + buildTime_ms/(1000)/60);
    process.print('buildtime_hours: ' + buildTime_ms/(3600*1000));
    process.print('buildtime_days: ' + buildTime_ms/(3600*1000)/24);
   //}

  let myConfiguration = {
    "data": "test",
    "writtenat": "XXX"
  };

// Initialize the customJSON object with static data
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
      "attachments": [], // This will be filled dynamically
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
              "build_time_hours": (buildTime_ms / (3600 * 1000)).toFixed(3),
              "part_mass_kg": partMassKg.toFixed(3),
              "powderbed_kg": totalPowder.toFixed(3)
          }
      },
      {
          "name": "origin",
          "namespace": "http://nikonslm.com/origin/202305",
          "attributes": {
              "created_at": new Date().toISOString(),
              "created_by": process.username
          },
          "nodes": [{
              "name": "node20",
              "attributes": {
                  "attribute1": 5,
                  "attributexxx": "250 something"
              }
          }]
      }]
  };

  // Dynamically add the attachments based on the model data
  let modelCount = modelData.getModelCount();
  for (let modelId = 0; modelId < modelCount; modelId++) {
      let model = modelData.getModel(modelId);
      customJSON.attachments.push({
          "path": "/ATU/configuration_" + model.getAttribEx("ModelName") + ".json",
          "encoding": "string",
          "relationship": "http://test.com/configurationjson/202305",
          "data": model.getAttribEx("parameterJSON")
      });
  }

  customJSON.attachments.push({
      "path": "/ATU/toolpath.log",
      "encoding": "string",
      "relationship": "http://test.com/configurationjson/202305",
      "data": "log"
  });

  modelData.setTrayAttribEx('custom', customJSON);

};

const getBuildTime_ms = function(modelData,progress,layer_start_nr,layer_end_nr){
  
  let layerCount = layer_end_nr-layer_start_nr+1;
 
  progress.initSteps(layerCount);
  
  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
      layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);

  let buildTime_ms = 0;
  while(layerIt.isValid() && !progress.cancelled())
  {
    const layerNr = layerIt.getLayerNr();
    
    const recoatingTime_ms = PARAM.getParamInt('buildTimeEstimation','recoatingDuration_ms');
    const powderFillingTime_ms = PARAM.getParamInt('buildTimeEstimation', 'powderfillingDuration_ms');
    const minimumLayerTime_ms = PARAM.getParamInt('buildTimeEstimation', 'minimumLayerDuration_ms');
    
    let exportData = UTIL.getModelsInLayer(modelData,layerNr)[0]
      .getModelLayerByNr(layerNr)
      .getAttribEx('exporter_3mf')
      .metadata;

    let layerDuration_ms = exportData[0]
      .attributes
      .layerTotalDuration/1000;
//     
    let transport_mm = getTransportationDistance_mm(exportData);
    let transportTime_ms = (transport_mm/PARAM.getParamReal('movementSettings', 'axis_transport_speed'))*1000;
    
    let tempDurationContainer = 0;
        
    tempDurationContainer += transportTime_ms;  
    tempDurationContainer += (layerDuration_ms < powderFillingTime_ms) ? powderFillingTime_ms : layerDuration_ms;
    tempDurationContainer += recoatingTime_ms; // 26
    
    buildTime_ms += (tempDurationContainer < minimumLayerTime_ms) ? minimumLayerTime_ms : tempDurationContainer;
        
    progress.step(1);
    layerIt.next();
  };
  
  return buildTime_ms;
} 

const getTransportationDistance_mm = function(exportData){
  
  let transport_mm = 0;
    
  exportData.forEach(function(pass, index){
    
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
      
     };
      
    if (index == exportData.length-1) { // if last
      //back to park
      let parkPos = new VEC2.Vec2(CONST.parkingPosition.x,CONST.parkingPosition.y);
      transport_mm += passTarget.distance(parkPos); 
      
      };
  });

  return transport_mm;
};

const getPartMassKg = function(modelData,progress,layer_start_nr,layer_end_nr){
  
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
  
  
  return mass_kilograms;
} 