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
const KIN = require('main/kinematicsCalculator.js');
const VEC2 = requireBuiltin('vec2');


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
     
  let passStartPos = {x : undefined,
                      y : undefined};
  
  exposureArray.forEach(function(pass, passIndex) {
    
    if(pass.length === 0) return;
        
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
        
        let startYMaxPosition = CONST.maxTargetY - pass[0].tileHeight;
            
        if(startY > startYMaxPosition){
          let targetY = pass[0].ycoord;
          startY = targetY + PARAM.getParamReal('tileing','tileTravelForBreachingYLimit');
        };
        
        if(startY+processHeadOffsetY > CONST.maxTargetY) {
          
          let processHeadOffsetYAdjustment = startY + processHeadOffsetY - CONST.maxTargetY;
          processHeadOffsetY -= processHeadOffsetYAdjustment;
          processHeadOffsetY -= 0.001; // extra offset to ensure we are within travel if round down to allowed position
          };
            
          passStartPos.x = pass[0].xcoord;
          passStartPos.y = startY;
            
         exporter_3mf.metadata[passIndex] = {
          "name": "onthefly",
          "namespace": "http://nikonslm.com/tilinginformation/202305",
          "attributes": {
            "uuid": UTIL.generateUUID(),
            "startx": passStartPos.x.toFixed(3),
            "starty": passStartPos.y.toFixed(3),
            "sequencetransferspeed": PARAM.getParamReal('movementSettings', 'axis_transport_speed').toFixed(3),
            "processHeadOffsetX" : processHeadOffsetX.toFixed(3),
            "processHeadOffsetY" : processHeadOffsetY.toFixed(3),
            "layerScanningDuration_us": null,
            "layerTotalDuration_us": null
          },
          "nodes": []
        };
        
      } else { // moveandshoot
    
        
         if(PARAM.getParamInt('tileing','processHeadAlignment') == 0) { //default / automatic
          
           
          processHeadOffsetX = PARAM.getParamReal('scanhead','x_scanner3_ref_mm');
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
    
    let previousTargetPosition = passStartPos;
    let prevSpeedY = 0;
    let prevExposureDuration = 0;
    pass.forEach(function(tile, tileIndex){
      // Determine next y-coordinate
      let nextTileYCoord, nextTileXCoord;
      
      if(tileIndex === 0){ // if first tile
      tile.exposureTime += PARAM.getParamInt('tileing','firstTileInStripeAddedDuration_us');
      }
    
      if (tileIndex === pass.length - 1) { // if last tile
        nextTileYCoord = tile.ycoord + (tile.ProcessHeadFromFront ? tile.tileHeight : 0);
        nextTileXCoord = tile.xcoord;
      } else {
        nextTileXCoord = pass[tileIndex + 1].xcoord;        
        nextTileYCoord = tile.ProcessHeadFromFront ? pass[tileIndex + 1].ycoord : tile.ycoord;
      }

      if(nextTileYCoord > CONST.tilePositionHardLimit.ymax){ // does next tile coord breach
        nextTileYCoord = nextTileYCoord-tile.tileHeight+PARAM.getParamReal('tileing','tileTravelForBreachingYLimit');
      };

      if (nextTileXCoord === undefined || nextTileYCoord === undefined) {
        throw new Error('failed to get next tile coord, at pass ' + passIndex + ', tile ' + tileIndex);
      }
      
      let travel = Math.abs(previousTargetPosition.y-nextTileYCoord);
      
      previousTargetPosition.y = nextTileYCoord;
      previousTargetPosition.x = nextTileXCoord;
      
      // Add time to tile if it is below least procesing time for tile

      if(tile.exposureTime<PARAM.getParamInt('tileing','minimumTileTime_us')){
        tile.exposureTime = PARAM.getParamInt('tileing','minimumTileTime_us');  
      }      

      let speedY, tileTime_us,tileMovementDuration;
      const acceleration = PARAM.getParamInt('movementSettings', 'acceleration');

      if (PARAM.getParamInt('tileing', 'ScanningMode')) {// onthefly

        tileTime_us = tile.exposureTime;
        
        // least time needed to travel the distance at max velocity
        let minTime_us = (travel/PARAM.getParamReal('movementSettings', 'axis_max_speed')) * 1e6;
        
        if(tileTime_us < minTime_us){
           tileTime_us = minTime_us;
        }
        
        if(acceleration > 0){

          speedY = KIN.calculateTileFinalVelocity(prevSpeedY,travel,tileTime_us,prevExposureDuration,acceleration);
          if(speedY > PARAM.getParamReal('movementSettings', 'axis_max_speed')) speedY = PARAM.getParamReal('movementSettings', 'axis_max_speed');

          const tileTime_s = tileTime_us * 1e-6;
          const accelerationDuration_s = Math.abs((speedY - prevSpeedY)/acceleration);
          const accelerationDistance =  Math.abs(speedY * speedY - prevSpeedY * prevSpeedY) / (2 * acceleration);
          const coastingDistance = travel - accelerationDistance;
          const coastingDuration = coastingDistance / speedY;
          const calculatedTotalDuration = coastingDuration + accelerationDuration_s;
          tileMovementDuration = calculatedTotalDuration * 1e6;
          
          const calculatedTotalDistance = accelerationDistance + coastingDistance;
          if(calculatedTotalDistance.toFixed(3) !== travel.toFixed(3)){
            process.printError("error in acceleration / coasting calculation: otf | tileID: " + tile.tileID + " | layer: " + layerNr);
          }

        } else {
          speedY =  travel / (tileTime_us / (1000 * 1000));  
          if(speedY > PARAM.getParamReal('movementSettings', 'axis_max_speed')) speedY = PARAM.getParamReal('movementSettings', 'axis_max_speed');
          tileMovementDuration = (travel / speedY) * 1000 * 1000;
        };
                
      } else { // move and shoot
        
        tileMovementDuration = tile.exposureTime
        speedY = PARAM.getParamReal('movementSettings', 'axis_transport_speed');
        const accelerationDuration_s = Math.abs((speedY)/acceleration);
        
        if(tileIndex != 0){
          
          let fromPoint = new VEC2.Vec2(pass[tileIndex-1].xcoord, pass[tileIndex-1].ycoord); 
          let toPoint = new VEC2.Vec2(pass[tileIndex].xcoord, pass[tileIndex].ycoord); 
          let distance = fromPoint.distance(toPoint);
          
          const velocity = PARAM.getParamReal('movementSettings', 'axis_transport_speed')
          
          const accelerationDuration_s = (acceleration > 0) ? velocity/acceleration : 0;
          const accelerationDistance = (acceleration > 0) ?  Math.abs(velocity * velocity) / (2 * acceleration) : 0;
          const coastingDistance = distance - accelerationDistance;
          const coastingDuration_s = coastingDistance / velocity;
          const calculatedTotalDuration = coastingDuration_s + accelerationDuration_s;
          const calculatedTotalDistance = accelerationDistance + coastingDistance;
          if(calculatedTotalDistance.toFixed(3) !== distance.toFixed(3)){
            process.printError("moveandshoot: error in acceleration / coasting calculation: mas | tileID: " + tile.tileID + " | layer: " + layerNr);
          }
          tileMovementDuration += (calculatedTotalDuration * 1e6)
        }
      }

      prevSpeedY = speedY;
      prevExposureDuration=tileTime_us;
      
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
            "tileExposureTime_us": tile.exposureTime.toFixed(0),
            "tileTotalTime_us": tileMovementDuration.toFixed(0)
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

  UTIL.getModelsInLayer(modelData,layerNr)[0]
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