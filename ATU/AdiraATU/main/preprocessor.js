/************************************************************
 * Preprocessor
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
const TILE = require('main/tileing.js');
const CONST = require('main/constants.js');
const LASER = require('main/laser_designation.js');

// -------- TOC -------- //

  // preprocessLayerStack (modelDataSrc, modelDataTarget, progress)
  // addLayerBoundariesToAllLayerBoundaries(modelData,thisLayerBoundaries,layerIt)

// -------- CODE -------- //

// PREPROCESS LAYER STACK //pre
  /** preprocess layer stack is run once for each model.
   *  finds the boundaries of all models for each layer
   *  sets up the tile layout based on all layer boundaries for each layers
   */
exports.preprocessLayerStack = (modelDataSrc, modelDataTarget, progress) => {  
  
  const modelLayerCount = modelDataSrc.getLayerCount(); //get layer count
  
 //process.print('modelLayerCount: ' + modelLayerCount);

  ///////////////////////////////////////////////////////////////////
  // Define Scanner Array and set display Colour, store it in tray //
  //////////////////////////////////////////////////////////////////
  
  LASER.defineScannerArray(modelDataTarget);
  LASER.setLaserDisplayColor(modelDataTarget);
  
  
  //////////////////////////////////////////////////
  // Get Boundaries of Work Area / build Envelope //
  /////////////////////////////////////////////////
    const workAreaLimits = {
      xmin: PARAM.getParamInt('workarea', 'x_workarea_min_mm'),
      ymin: PARAM.getParamInt('workarea', 'y_workarea_min_mm'),
      xmax: PARAM.getParamInt('workarea', 'x_workarea_max_mm'),
      ymax: PARAM.getParamInt('workarea', 'y_workarea_max_mm')
    }
    
    modelDataTarget.setTrayAttribEx('workAreaLimits',workAreaLimits);
  
  
  /////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
 
  let srcModel = modelDataSrc.getModel(0);      
  modelDataTarget.addModelCopy(srcModel);
 
  progress.initSteps(modelLayerCount+1);
  

    
// run trough all layers and all models to get all boundaries
  for ( let layerIt = 1; layerIt < modelLayerCount+1 && !progress.cancelled() ; layerIt++ )
    { 

       // retrieve current model layer
       let modelLayer =  srcModel.getModelLayerByNr(layerIt);
        
        if (modelLayer.isValid() && modelLayer.tryGetBounds2D()) {          
          // get this model layer boundaries      
          let thisModelLayerBounds = modelLayer.tryGetBounds2D();
                   
          // check if this boundary exceeds the previous and store it
          addLayerBoundariesToAllLayerBoundaries(modelDataTarget,thisModelLayerBounds,workAreaLimits,layerIt)                 
               
          } else {
            
            throw new Error('failed to access layer ' + layerIt + ', in ' + srcModel.getAttribEx('ModelName'));     
            
            }
                      
     progress.step(1);
          
  } //layer iterator
}; //preprocessLayerStack

//---------------------------------------------------------------------------------------------//

const isModelOutsideWorkArea = (boundsArray,limits,layerNr) => {
  
  const bounds = {
    xmin: boundsArray[0],
    xmax: boundsArray[1],
    ymin: boundsArray[2],
    ymax: boundsArray[3]
  }
  

if(bounds.xmin < limits.xmin || bounds.xmax > limits.xmax ||
   bounds.ymin < limits.ymin || bounds.ymax > limits.ymax){
   
     throw new Error ("model outside workarea limits, breach found in layer: " + layerNr);
     
     }
};

// ADD LAYER BOUNDARIES

const addLayerBoundariesToAllLayerBoundaries = (modelData,thisLayerBoundaries,workAreaLimits,layerNr) => {
  
  let boundsArray = [
        undefined,  // xmin
        undefined,  // xmax
        undefined,  // ymin
        undefined]; // ymax 
    
  if(thisLayerBoundaries){
     boundsArray = [
        thisLayerBoundaries.m_min.m_coord[0],   // xmin
        thisLayerBoundaries.m_max.m_coord[0],   // xmax
        thisLayerBoundaries.m_min.m_coord[1],   // ymin
        thisLayerBoundaries.m_max.m_coord[1]];  // ymax
    
    }
    
 
  //check if model is outside boundaries 
    
  //check if boundaries lies outside the allowed area
  isModelOutsideWorkArea(boundsArray,workAreaLimits,layerNr);
    
  let allLayerBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
  
  // if allLayerBoundaries has nothing this is first layer
  if (allLayerBoundaries == undefined) {
    
    allLayerBoundaries = [];
    allLayerBoundaries.push(undefined); // add empty layer for layer 0
    //allLayerBoundaries.push(undefined); // add empty layer for layer 0
    }
  
    
  // if there is nothing yet for this layer, push this boundary 
  if (allLayerBoundaries[layerNr] == undefined) {
    
    allLayerBoundaries.push(boundsArray);
    
  } else { // check 
    
    // check if this layer boundaries exceeds the already stored, if true update the boundary
    if (boundsArray[0] < allLayerBoundaries[layerNr][0]) allLayerBoundaries[layerNr][0] = boundsArray[0]; //xmin
    if (boundsArray[1] > allLayerBoundaries[layerNr][1]) allLayerBoundaries[layerNr][1] = boundsArray[1]; //xmax
    if (boundsArray[2] < allLayerBoundaries[layerNr][2]) allLayerBoundaries[layerNr][2] = boundsArray[2]; //ymin
    if (boundsArray[3] > allLayerBoundaries[layerNr][3]) allLayerBoundaries[layerNr][3] = boundsArray[3]; //ymax
  
  }
  
  // store boundaries in modelData tray
  modelData.setTrayAttribEx('allLayerBoundaries',allLayerBoundaries);
} // addLayerBoundariesToAllLayerBoundaries

//---------------------------------------------------------------------------------------------//