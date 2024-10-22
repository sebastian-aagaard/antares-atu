/************************************************************
 * Create Meta Data Export Data Structures
 *
 * @author []
 * Copyright (c). All rights reserved.
 ***********************************************************/
'use strict';

const PARAM = requireBuiltin('bsParam');
const ISLAND = requireBuiltin('bsIsland');
const UTIL = require('main/utility_functions.js');
const CONST = require('main/constants.js');

exports.createExporter3mf = function(exposureArray, layerIt, modelData, layerNr){
  
  const layerPart_kg = getPartLayerMass(modelData,layerNr);
  const powderbed_kg = (modelData.getLayerThickness() 
    * PARAM.getParamInt('workarea','x_workarea_max_mm') 
    * PARAM.getParamInt('workarea','y_workarea_max_mm')
    * PARAM.getParamReal('material','density_g_cc') ) / (1000*1000*1000); 

  
  let exporter_3mf = {    
    "metadata": []
  };
 
  let processHeadOffsetX, processHeadOffsetY;
  
  let scanfieldCenterXOffset = PARAM.getParamReal('scanhead','x_scanfield_size_mm')/2-PARAM.getParamReal('scanhead','x_scanner3_ref_mm');
  scanfieldCenterXOffset = scanfieldCenterXOffset < 0 ? 0 : scanfieldCenterXOffset;
  
  let scanfieldCenterYOffset = PARAM.getParamReal('tileing','tile_size')/2-(PARAM.getParamReal('scanhead','y_scanfield_size_mm')-PARAM.getParamReal('scanhead','y_scanfield_ref_mm'));
  scanfieldCenterYOffset = scanfieldCenterYOffset < 0 ? 0 : scanfieldCenterYOffset;
     
  exposureArray.forEach(function(pass, passIndex) {
    
    let shouldYOffsetBeCorrected = false;
    
    try {
      if(PARAM.getParamInt('tileing','ScanningMode')) { // onthefly
        
        //set process head offset
        
        if(PARAM.getParamInt('tileing','processHeadAlignment') == 0) { //default / automatic
          
          processHeadOffsetX = PARAM.getParamReal('scanhead','x_scanner3_ref_mm'); // offset distance from tile edge to center ref scanner 3
          processHeadOffsetY = pass[0].ProcessHeadFromFront ? 0 : pass[0].tileHeight; // offset along the movement direction
          
          } else { // custom
            
          processHeadOffsetX = PARAM.getParamReal('tileing','processHeadCustomOffset_x');
          processHeadOffsetY = PARAM.getParamReal('tileing','processHeadCustomOffset_y');
            
            };
        
         // find start Y
        
        let startY = pass[0].ProcessHeadFromFront ? pass[0].ycoord : pass[0].ycoord + pass[0].tileHeight;
        
        let startYMaxPosition = CONST.maxTargetY - PARAM.getParamReal('tileing','processheadRampOffset') - pass[0].tileHeight;
            
        if(startY > startYMaxPosition){
          let targetY = pass[0].ycoord;
          startY = targetY + PARAM.getParamReal('tileing','tileTravelForBreachingYLimit');
          shouldYOffsetBeCorrected = true;
        };
        
        if(startY+processHeadOffsetY > CONST.maxTargetY) {
          
          let processHeadOffsetYAdjustment = startY + processHeadOffsetY + PARAM.getParamReal('tileing','processheadRampOffset') - CONST.maxTargetY;
          //process.print('processHeadOffsetYAdjustment: ' + Math.ceil(processHeadOffsetYAdjustment));
          processHeadOffsetY -= processHeadOffsetYAdjustment;
          processHeadOffsetY -= 0.001; // extra offset to ensure we are within travel if round down to allowed position
          };
            
            
         exporter_3mf.metadata[passIndex] = {
          "name": "onthefly",
          "namespace": "http://nikonslm.com/tilinginformation/202305",
          "attributes": {
            "uuid": UTIL.generateUUID(),
            "startx": pass[0].xcoord.toFixed(3),
            "starty": startY.toFixed(3),
            "sequencetransferspeed": PARAM.getParamReal('movementSettings', 'axis_transport_speed').toFixed(3),
            "processHeadOffsetX" : processHeadOffsetX.toFixed(3),
            "processHeadOffsetY" : processHeadOffsetY.toFixed(3),
            //"processHeadRampOffsetY" : (PARAM.getParamReal('tileing','processheadRampOffset') * (pass[0].ProcessHeadFromFront ? -1 : 1)).toFixed(3),
            //"requiredPasses": exposureArray.length,
            //"tilesInPass": pass.length,
            "layerScanningDuration_us": null,
            "layerTotalDuration_us": null
          },
          "nodes": []
        };
        
      } else { // moveandshoot
    
        
         if(PARAM.getParamInt('tileing','processHeadAlignment') == 0) { //default / automatic
          
           
          processHeadOffsetX = PARAM.getParamReal('scanhead','x_scanfield_size_mm')/2-scanfieldCenterXOffset;
          processHeadOffsetY = PARAM.getParamReal('tileing', 'tile_size')/2+scanfieldCenterYOffset;
  
          
          } else { // custom
            
          processHeadOffsetX = PARAM.getParamReal('tileing','processHeadCustomOffset_x');
          processHeadOffsetY = PARAM.getParamReal('tileing','processHeadCustomOffset_y');
            
          };
        
        exporter_3mf.metadata[passIndex] = {
          "name": "moveandshoot",
          "namespace": "http://nikonslm.com/tilinginformation/202305",
          "attributes": {
            "uuid": UTIL.generateUUID(),
            "speed": PARAM.getParamReal('movementSettings', 'axis_transport_speed'),
            "processHeadOffsetX" : processHeadOffsetX.toFixed(3),
            "processHeadOffsetY" : processHeadOffsetY.toFixed(3),
          },
          "nodes": []
        };
      };
      
    } catch (e) {
      process.printWarning('PostProcess | createExporter3mf: failed at pass ' + passIndex + ', layer ' + layerNr +" "+ e.message);
    }
    
    pass.forEach(function(tile, tileIndex){
      let speedY;
      let travel = tile.tileHeight;
      
      // Determine tile size and y speed
      if (PARAM.getParamInt('tileing', 'ScanningMode')) { // onthefly
        //if startY was above limit correct actual travel distance
        if(shouldYOffsetBeCorrected){ 
          travel = PARAM.getParamReal('tileing','tileTravelForBreachingYLimit');
          shouldYOffsetBeCorrected = false;
          };
        speedY = tile.exposureTime > 0 ? travel / (tile.exposureTime / (1000 * 1000)) : PARAM.getParamReal('movementSettings', 'axis_max_speed');
        speedY = speedY > PARAM.getParamReal('movementSettings', 'axis_max_speed') ? PARAM.getParamReal('movementSettings', 'axis_max_speed') : speedY;
      } else { // move and shoot
        speedY = PARAM.getParamReal('movementSettings', 'axis_transport_speed');
      }

      const tileMovementDuration = (travel / speedY) * 1000 * 1000;

      // Determine next y-coordinate
      let nextTileYCoord, nextTileXCoord;
      if (tileIndex === pass.length - 1) { // if last tile
        nextTileYCoord = tile.ycoord + (tile.ProcessHeadFromFront ? tile.tileHeight : 0);
        nextTileXCoord = tile.xcoord;
      } else {
        nextTileXCoord = pass[tileIndex + 1].xcoord;        
        nextTileYCoord = tile.ProcessHeadFromFront ? pass[tileIndex + 1].ycoord : tile.ycoord;
      }

      if (nextTileXCoord === undefined || nextTileYCoord === undefined) {
        throw new Error('failed to get next tile coord, at pass ' + passIndex + ', tile ' + tileIndex);
      }

      
      if(PARAM.getParamInt('tileing','ScanningMode')) { // onthefly
      // Create node object
        exporter_3mf.metadata[passIndex].nodes[tileIndex] = {
          "name": "movement",
          "attributes": {
            "tileid": tile.tileID,
            "targetx": nextTileXCoord.toFixed(3),
            "targety": nextTileYCoord.toFixed(3),
            "speedy": speedY.toFixed(3),
            "tileExposureTime_us": tile.exposureTime.toFixed(0),
            "tileTotalTime_us": tileMovementDuration.toFixed(0)
          }
        };
    } else { // moveandshoot
     // Create node object
        exporter_3mf.metadata[passIndex].nodes[tileIndex] = {
          "name": "movement",
          "attributes": {
            "tileid": tile.tileID,
            "startx": tile.xcoord.toFixed(3),
            "starty": tile.ycoord.toFixed(3),
            "tileExposureTime_us": tile.exposureTime.toFixed(0)
          }
        };
        }
      });
  });

  let layerData =  {
        "name": "layertotals",
        "namespace": "http://nikonslm.com/statistics/202305",
         "attributes" : {
           "tilebuffer_us" : PARAM.getParamInt('tileing','tileBufferDuration_us'),
           "layerScanningDuration_s" : null,
           "layerTotalDuration_s" : null,
           "ConsolidatedPowderInLayer_kg" : layerPart_kg.toFixed(3),
           "FullPowderLayer_kg" : powderbed_kg.toFixed(3) 
           }
    };
    
  exporter_3mf.metadata.unshift(layerData);
    
  assignLayerTotals(exporter_3mf);  

  modelData.getModel(0)
    .getModelLayerByNr(layerNr)
    .setAttribEx('exporter_3mf', exporter_3mf);
  
};

const getPartLayerMass = function(modelData,layerNr){

  const arrayOfModels = UTIL.getModelsInLayer(modelData, layerNr);
  
  if(!arrayOfModels) process.printError("no models found in layer" + layerNr);

  const surface_area_mm2 = arrayOfModels.reduce(function(acc, model){
    const islandArray = new ISLAND.bsIsland();
    const layer = model.getModelLayerByNr(layerNr);
    islandArray.addPathSet(layer.getAllIslandsPathSet());
    const surface = islandArray.getSurfaceArea();
    
    return acc + surface;
  },0);
  
  const height_cm = arrayOfModels[0].getLayerThickness() / 1000;
  const surface_area_cm2 = surface_area_mm2 / 100;
  const volume_cc = surface_area_cm2 * height_cm ;
  const mass_grams = volume_cc * PARAM.getParamReal('material','density_g_cc') ;
  const mass_kilograms = mass_grams / 1000 ; 
    
  return mass_kilograms;
}

const assignLayerTotals = function(exporter_3mf){
  // Initialize total durations
  let layerScanningDuration = 0;
  let layerTotalDuration = 0;

  exporter_3mf.metadata.forEach(function(pass,index){
    
    if(index == 0) return;
    
    let passScanningDuration = 0;
    let passTotalDuration = 0;

    pass.nodes.forEach(function(tile){
      let tileExposureDuration = Number(tile.attributes.tileExposureTime_us);
      let tileTotalTime = Number(tile.attributes.tileTotalTime_us);

      passScanningDuration += tileExposureDuration;
      passTotalDuration += tileTotalTime;
    });

    // Assign the calculated durations to the respective pass
    pass.attributes.sequenceScanningDuration = passScanningDuration;
    pass.attributes.sequenceTotalDuration = passTotalDuration;

    layerScanningDuration += passScanningDuration;
    layerTotalDuration += passTotalDuration;
  });

  exporter_3mf.metadata[0].attributes.layerScanningDuration = layerScanningDuration;
  exporter_3mf.metadata[0].attributes.layerTotalDuration = layerTotalDuration;  
}; //