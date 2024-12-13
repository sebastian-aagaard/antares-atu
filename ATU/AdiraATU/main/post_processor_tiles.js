/************************************************************
 * Post Processing Assign Tiles
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';
// -------- INCLUDES -------- //
const MODEL = requireBuiltin('bsModel');
const PARAM = requireBuiltin('bsParam');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const EXPOSURE = requireBuiltin('bsExposureTime');
const HATCH = requireBuiltin('bsHatch');

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
const UTIL = require('main/utility_functions.js');
const TILE = require('main/tileing.js');
const TP2TILE = require('main/toolpath_to_tile.js');
const LASER = require('main/laser_designation.js');

exports.postprocessDivideHatchBlocksIntoTiles_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){

  let startTime = Date.now();
    
  let layerCount = layer_end_nr - layer_start_nr + 1;
  let modelCount = modelData.getModelCount();
    
  progress.initSteps(layerCount);
     
  let layerIterator = modelData.getPreferredLayerProcessingOrderIterator(
    layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);
    
  while(layerIterator.isValid() && !progress.cancelled()){
    
    let layerNumber = layerIterator.getLayerNr();
    let layerZ = layerIterator.getLayerZ();
    let zUnit = modelData.getZUnit();
    let modelZero = modelData.getModel(0);
    let modelLayer = modelZero.maybeGetModelLayerByNr(layerNumber);
    
    if(!modelLayer) {
      process.printError("Couldn't get modelLayer " + layerNumber + " at " + layerZ + "mm"); 
      }
            
    let exposureArray = modelData.getLayerPolylineArray(layerNumber,
    POLY_IT.nLayerExposure,'rw');

    let allHatches = new HATCH.bsHatch();
    let contourHatch = new HATCH.bsHatch();

    exposureArray.forEach(function(polyline) {
      polyline.setAttributeInt('modelIndex',polyline.getModelIndex());
      let typeId = polyline.getAttributeInt('type');
      if(typeId === CONST.typeDesignations.part_contour.value || typeId === CONST.typeDesignations.downskin_contour.value || typeId === CONST.typeDesignations.support_contour.value){
        polyline.polylineToHatch(contourHatch);
      } else {
        polyline.polylineToHatch(allHatches);
      }
      polyline.deletePolyline();
      });
     
    allHatches = TP2TILE.mergeShortLines(allHatches);

    allHatches.setAttributeInt('_processing_order', 0);

    allHatches.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
    });

    //  --- TILE OPERATIONS --- //
    TP2TILE.assignHatchblocksToTiles(allHatches,modelLayer);

    sortByProcessingOrderAndPosition(allHatches);  

    LASER.staticDistributionKeepVectors(modelData,allHatches,modelLayer);

    sortByProcessingOrderAndPosition(allHatches);  

    assignExposureProcessingTimeAsAttribute(allHatches,modelData);

    let tileGroups = preCalculateDistribution(allHatches);

    allHatches = distributeLoad(tileGroups,progress);

    allHatches = LASER.mergeShortLinesForEachBsid(allHatches);

    LASER.assignProcessParameters(allHatches,modelData,layerNumber,modelLayer); 

    modelLayer.createExposurePolylinesFromHatch(allHatches);

    layerIterator.next();
  };
  
  let endTime = Date.now()  
  process.print('tile: Calculation time: ' + (endTime - startTime) + ' ms');
}

function flattenIntoHatchBlock(tileGroups){
  
  let returnHatch = new HATCH.bsHatch();
  
  Object.values(tileGroups).forEach(function(tile){
    
    Object.values(tile.assignedHatchBlocks).forEach(function(hatchBlockArray){
      
      hatchBlockArray.forEach(function(hatchblock){
        
        returnHatch.addHatchBlock(hatchblock);
        
        })
      });
    })
  let te = 0;
  
  return returnHatch;
  }

function distributeLoad(tileGroups,progress){
  
  Object.keys(tileGroups).forEach(function(tileKey){
    
    let ignoreList = [];
    let thisTile = tileGroups[tileKey];    
    
    while(Object.keys(thisTile.openHatchBlocks).length !== 0 && !progress.cancelled()){
      // Step 1: find out what laser currently is attributed the least
      let smallestKey = Object.entries(thisTile.loadInfo).reduce(function (min, current) {
          // Skip keys that are in the ignoreList
          if (ignoreList.includes(current[0])) {
              return min;
          }
          return current[1] < min[1] ? current : min;
      }, [null, Infinity])[0];

      let matchingEntries = Object.keys(thisTile.openHatchBlocks).filter(function(key) {
          return key.includes(smallestKey);
      });
      
      if(matchingEntries.length === 0){
        ignoreList.push(smallestKey);
        continue;
        }
      
      let largestOpenGroupKey = [];

      matchingEntries.forEach(function(openGroupKey)
      {
        largestOpenGroupKey = returnExposureTimeSumOfHatchBlocksInArray(thisTile.openHatchBlocks[openGroupKey]) > returnExposureTimeSumOfHatchBlocksInArray(thisTile.openHatchBlocks[largestOpenGroupKey]) ? openGroupKey : largestOpenGroupKey;
      });  
          
      if(!largestOpenGroupKey){
        process.printError("Load Distribution: no hatchblock available to scanner " + smallestKey);
      }
      
      let listOpenHatchBlocks =  largestOpenGroupKey.match(/\d+/g).map(Number); // extract overlapping laser numbers

       // Step 2: Find the smallest and largest numbers
      const smallest = Math.min(...listOpenHatchBlocks);
      const largest = Math.max(...listOpenHatchBlocks);
      let movingHatchBlock;
        
      // Step 3: Check if `myNumber` matches the smallest or largest
      if (smallestKey == smallest) { // shift
        if(thisTile.sortedLeftToRight) {
          movingHatchBlock = thisTile.openHatchBlocks[largestOpenGroupKey].shift();
        } else {
          movingHatchBlock = thisTile.openHatchBlocks[largestOpenGroupKey].pop();
        }
      } else{ //pop
        if(thisTile.sortedLeftToRight) {
          movingHatchBlock = thisTile.openHatchBlocks[largestOpenGroupKey].pop();
        } else {
          movingHatchBlock = thisTile.openHatchBlocks[largestOpenGroupKey].shift();
        }        
      }
      
      // Step 4: if the openhatchblock group is empty delete it and 
      // add if no more available for the key include it into the ignoreList
      if(thisTile.openHatchBlocks[largestOpenGroupKey].length === 0){
        delete thisTile.openHatchBlocks[largestOpenGroupKey];
          if(matchingEntries.length === 1){ 
          ignoreList.push(smallestKey)};
        }

      // Step 5: Update hatch Block Designation
      reassignAttributes(movingHatchBlock,smallestKey);

      // Step 6: include added time
      let exposureToAdd = movingHatchBlock.getAttributeInt('hatchExposureTime');
      thisTile.loadInfo[smallestKey] += exposureToAdd;

      // Step 7: push hatchblock to 
      thisTile.assignedHatchBlocks[smallestKey].push(movingHatchBlock);      
      
    };
  });
  
  return flattenIntoHatchBlock(tileGroups);
};

function returnExposureTimeSumOfHatchBlocksInArray(array){
  
  if (!array) return 0;
  
  let sum =  array.reduce( function (accumulator, currentValue){
    
    return accumulator + currentValue.getAttributeInt('hatchExposureTime'); 
    
    },0)
  
  return sum
  }

function reassignAttributes(hatchBlock,laserId){
  
  let type = hatchBlock.getAttributeInt('type');
  let bsid = laserId * 10 + type;
  hatchBlock.setAttributeInt('bsid',bsid);
  hatchBlock.removeAttributes('overlapLaserCount');
  
  };
function preCalculateDistribution(allHatches){
  
  let tileGroups = UTIL.getGroupedHatchObjectByTileId(allHatches);

 Object.keys(tileGroups).forEach(function(tileKey){
   
    let thisTile = tileGroups[tileKey];
    let tileArray = thisTile.getHatchBlockArray();

    thisTile.loadInfo = {};
    thisTile.openInfo = {};
    thisTile.assignedHatchBlocks = {};
    thisTile.openHatchBlocks = {};
    thisTile.sortedLeftToRight = isSortedLeftToRight(tileArray);
    
    tileArray.forEach(function(hatchBlock){
      
      let exposureTime = hatchBlock.getAttributeInt('hatchExposureTime')
      
      let laserID = Math.floor(hatchBlock.getAttributeInt('bsid')/10);
      
      let laserAssignTag = String(laserID);
      
      if (!thisTile.loadInfo[laserAssignTag]) {
          thisTile.loadInfo[laserAssignTag] = 0; // Initialize if it doesn't exist
          thisTile.assignedHatchBlocks[laserAssignTag] = [];
      }

      let overLapCount = hatchBlock.getAttributeInt('overlapLaserCount');

      if(!overLapCount){
        thisTile.loadInfo[laserAssignTag] += exposureTime;
        thisTile.assignedHatchBlocks[laserAssignTag].push(hatchBlock);
      } else {        
        let laserIdArray = [laserID];
        
        for(let i = 1 ; i < overLapCount+1 ; i++ ){
          let overlapAttributeTag = 'overlappingLaser_' + i;
          let overlapID = Math.floor(hatchBlock.getAttributeInt(overlapAttributeTag)/10);
          laserIdArray.push(overlapID);
          }
              
          laserIdArray.sort(function (a,b){
            return a-b;
          });
          
          let loadStorageTag = 'open';
          
          laserIdArray.forEach(function(laserId){
            loadStorageTag += '_' + laserId; //build distribution tag
          });
          
          if (!thisTile.openHatchBlocks[loadStorageTag]) {
            thisTile.openInfo[loadStorageTag] =  0; // Initialize if it doesn't exist
            thisTile.openHatchBlocks[loadStorageTag] = [];
          }
          
          thisTile.openHatchBlocks[loadStorageTag].push(hatchBlock);
          thisTile.openInfo[loadStorageTag] += exposureTime;
        };
      }); //hatchblocks in tile
   }); //tile
   
   return tileGroups;
  };

function isSortedLeftToRight(tileArray){
  let firstHatchBlockCenterX = tileArray[0].getBounds2D().getCenter().x;
  let lastHatchBlockCenterX = tileArray[tileArray.length-1].getBounds2D().getCenter().x;

  if(firstHatchBlockCenterX > lastHatchBlockCenterX){
    return false
  }
  return true
}

function assignExposureProcessingTimeAsAttribute(allHatches,modelData){

  let hatchBlockArray = allHatches.getHatchBlockArray();
  
  hatchBlockArray.forEach(function(hatchBlock){
    
    let exposureTime = new EXPOSURE.bsExposureTime();
    const cur_bsid = hatchBlock.getAttributeInt('bsid');

    const processProfile = modelData
          .getModel(hatchBlock.getAttributeInt('modelIndex'))
          .getAttribEx('customTable')
          .find(function(profile) {
            return profile.bsid === cur_bsid;
          });
          
    const scanParamters = processProfile       
          .attributes
          .find(function(attr) {
            return attr.schema === CONST.scanningSchema;
          });
          
    const laserStartPos = {
      'x': hatchBlock.getPoint(0).x,
      'y': hatchBlock.getPoint(0).y
    }; 
     
    const exposureSettings = {
      'fJumpSpeed': scanParamters.jumpSpeed,
      'fMeltSpeed': processProfile.speed,
      'fJumpLengthLimit': scanParamters.jumpLengthLimit,
      'nJumpDelay': scanParamters.jumpDelay,
      'nMinJumpDelay': scanParamters.minJumpDelay,
      'nMarkDelay': scanParamters.markDelay,
      'nPolygonDelay': scanParamters.polygonDelay,
      'polygonDelayMode': scanParamters.polygonDelayMode,
      'laserPos': laserStartPos
    };
    
    exposureTime.addHatchBlock(hatchBlock,exposureSettings);
    
    hatchBlock.setAttributeInt('hatchExposureTime',exposureTime.getExposureTimeMicroSeconds())
  });
  
  allHatches.makeEmpty();
  
  hatchBlockArray.forEach(function(hatchBlock){
    allHatches.addHatchBlock(hatchBlock);
  });
  
};

function sortByProcessingOrderAndPosition(allHatches){
  
  let hatchBlockArray = allHatches.getHatchBlockArray();
  
  hatchBlockArray.sort(function(a,b){
    
    let aProccesingOrder = a.getAttributeInt('stripeId');
    let bProcessingOrder = b.getAttributeInt('stripeId');
    
    if(aProccesingOrder !== bProcessingOrder){
      return aProccesingOrder - bProcessingOrder;
    }
    
//     let aMaxY = a.tryGetBounds2D().maxY;
//     let bMaxY = b.tryGetBounds2D().maxY;
    
    let aMaxY = a.tryGetBounds2D().getCenter().y;
    let bMaxY = b.tryGetBounds2D().getCenter().y;
    
    return bMaxY - aMaxY;
  })
  
  allHatches.makeEmpty();
  
  hatchBlockArray.forEach(function(hatchBlock,index){
    hatchBlock.setAttributeInt('_processing_order',index+1);
    allHatches.addHatchBlock(hatchBlock);
  })
  
};