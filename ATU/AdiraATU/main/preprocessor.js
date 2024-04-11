/************************************************************
 * Preprocessor
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //

let TILE = require('main/tileing.js');
let CONST = require('main/constants.js');
let LASER = require('main/laser_designation.js');


// -------- TOC -------- //

  // preprocessLayerStack (modelDataSrc, modelDataTarget, progress)
  // addLayerBoundariesToAllLayerBoundaries(modelData,thisLayerBoundaries,layerIt)

// -------- CODE -------- //

// PREPROCESS LAYER STACK //
  /** preprocess layer stack is run once for each model.
   *  finds the boundaries of all models for each layer
   *  sets up the tile layout based on all layer boundaries for each layers
   */
exports.preprocessLayerStack = (modelDataSrc, modelDataTarget, progress) => {  
  
  let srcModelCount = modelDataSrc.getModelCount(); // get number of models
  let modelLayerCount = modelDataSrc.getLayerCount(); //get layer count
  
  process.print('modelLayerCount: ' + modelLayerCount);

  ///////////////////////////////////////////////////////////////////
  // Define Scanner Array and set display Colour, store it in tray //
  //////////////////////////////////////////////////////////////////
  
  LASER.defineScannerArray(modelDataTarget);
  LASER.setLaserDisplayColor(modelDataTarget);
  
  /////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
  
    //progress.initSteps(srcModelCount);

  // add all models on the platform into modelDataTarget
   for( let modelIndex=0; modelIndex < srcModelCount && !progress.cancelled(); modelIndex++ )
    {
      let srcModel = modelDataSrc.getModel(modelIndex);      
      modelDataTarget.addModelCopy(srcModel);
    }
    
  let targetModelCount = modelDataTarget.getModelCount();
 
  progress.initSteps(modelLayerCount+1);
    
// run trough all layers and all models to get all boundaries
  for ( let layerIt = 1; layerIt < modelLayerCount && !progress.cancelled();layerIt++ )
    { 
    for( let modelIndex=0; modelIndex < targetModelCount && !progress.cancelled(); modelIndex++ )
      {
        
       // retrieve current model
       let thisModel = modelDataTarget.getModel(0);
       let modelLayer =  thisModel.getModelLayerByNr(layerIt);
        
        if (modelLayer.isValid() ) {          
          // get this model layer boundaries       
          let thisModelLayerBounds = modelLayer.tryGetBounds2D();
                   
          // check if this boundary exceeds the previous and store it
          addLayerBoundariesToAllLayerBoundaries(modelDataTarget,thisModelLayerBounds,layerIt)
                 
          // calculate the tileArray and stores it in modelLayer 
          TILE.getTileArray(modelLayer,CONST.bDrawTile,layerIt,modelDataTarget); 
          
          } // is model layer valid
          
     progress.step(1);
          
    } //model iterator 
  } //layer iterator
}; //preprocessLayerStack

//---------------------------------------------------------------------------------------------//

// ADD LAYER BOUNDARIES

let addLayerBoundariesToAllLayerBoundaries = (modelData,thisLayerBoundaries,layerIt) => {
    
  if (layerIt == 101){
  
    let dummy = 0;
    }
  
  let boundsArray = [
        undefined, // xmin
        undefined, // xmax
        undefined, // ymin
        undefined];  // ymax 
    
  if(thisLayerBoundaries){
     boundsArray = [
        thisLayerBoundaries.m_min.m_coord[0], // xmin
        thisLayerBoundaries.m_max.m_coord[0], // xmax
        thisLayerBoundaries.m_min.m_coord[1], // ymin
        thisLayerBoundaries.m_max.m_coord[1]];  // ymax
    
    }
    
 
  let allLayerBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
  
  // if allLayerBoundaries has nothing this is first layter
  if (allLayerBoundaries == undefined) {
    
    allLayerBoundaries = [];
    allLayerBoundaries.push(undefined); // add empty layer for layer 0
    
    }
  
  // if there is nothing yet for this layer, push this boundary 
  if (allLayerBoundaries[layerIt] == undefined) {
    
    allLayerBoundaries.push(boundsArray);
    
  } else { // check 
    
    // check if this layer boundaries exceeds the already stored, if true update the boundary
    if (boundsArray[0] < allLayerBoundaries[layerIt][0]) allLayerBoundaries[layerIt][0] = boundsArray[0]; //xmin
    if (boundsArray[1] > allLayerBoundaries[layerIt][1]) allLayerBoundaries[layerIt][1] = boundsArray[1]; //xmax
    if (boundsArray[2] < allLayerBoundaries[layerIt][2]) allLayerBoundaries[layerIt][2] = boundsArray[2]; //ymin
    if (boundsArray[3] > allLayerBoundaries[layerIt][3]) allLayerBoundaries[layerIt][3] = boundsArray[3]; //ymax
  
  }
  
  // store boundaries in modelData tray
  modelData.setTrayAttribEx('allLayerBoundaries',allLayerBoundaries);
} // addLayerBoundariesToAllLayerBoundaries

//---------------------------------------------------------------------------------------------//