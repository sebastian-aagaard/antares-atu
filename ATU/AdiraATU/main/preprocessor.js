/************************************************************
 * Preprocessor
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
const LAYER = requireBuiltin('bsModelLayer');
const TILE = require('main/tileing.js');
const CONST = require('main/constants.js');
const LASER = require('main/laser_designation.js');
const UTIL = require('main/utility_functions.js');


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
  
  
 //process.print('modelLayerCount: ' + modelLayerCount);

  ///////////////////////////////////////////////////////////////////
  // Define Scanner Array and set display Colour, store it in tray //
  //////////////////////////////////////////////////////////////////
  
  LASER.defineScannerArray(modelDataTarget);
  LASER.setLaserDisplayColor(modelDataTarget);
  
  //////////////////////////////////////////////////
  // Get Boundaries of Work Area / build Envelope //
  /////////////////////////////////////////////////
  const workAreaLimits = UTIL.getWorkAreaLimits();
   
  /////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
 
//   let srcModel = modelDataSrc.getModel(0);
//   
//   modelDataTarget.addEmptyModel();
//     
//   modelDataTarget.addModelCopy(srcModel);
      
  const modelCount = modelDataSrc.getModelCount();
  
   for(let modelIndex=0; modelIndex < modelCount && !progress.cancelled(); ++modelIndex)
  {  
    // Gets the source model.
    let sourceModel = modelDataSrc.getModel(modelIndex);
    modelDataTarget.addModelCopy(sourceModel);

    //progress.step(1);
  }    
      
      
  for( let modelIndex=0; modelIndex < modelDataTarget.getModelCount() && !progress.cancelled(); modelIndex++ ){
    
    let currentModel = modelDataTarget.getModel(modelIndex);
  
    const modelLayerCount = modelDataSrc.getLayerCount()+1; //get layer count
    progress.initSteps(modelLayerCount);
    
    let minMaxZValue = {};
    currentModel.getMinMaxLayerIntZ(minMaxZValue);  
    const layerHeight = modelDataTarget.getLayerThickness();
    const minZValue = minMaxZValue.min_layer_z;
    const maxZValue = minMaxZValue.max_layer_z;
    
    let layerNumber = 1;
    let thisLayerHeight = minZValue;
    
    while (thisLayerHeight <= maxZValue && !progress.cancelled()) {
          
      // retrieve current model layer
      let modelLayer =  currentModel.getModelLayer(thisLayerHeight);
      
      if (modelLayer==undefined){
        process.printError(layerNumber + " undefined");
        continue;
        };
      
      if (!isLayerProcessable(modelLayer)) {       
          process.printWarning('PreprocessLayerStack | failed to access layer ' + layerNumber +"/"+ thisLayerHeight + ', in ' + currentModel.getAttribEx('ModelName') + " min layer is at: " + minZValue);
      }
                    
      // get this model layer boundaries      
      let thisModelLayerBounds = modelLayer.tryGetBounds2D();
               
      // check if this boundary exceeds the previous and store it
      addLayerBoundariesToAllLayerBoundaries(modelDataTarget,thisModelLayerBounds,workAreaLimits,thisLayerHeight,currentModel);                            

      layerNumber++;
      thisLayerHeight += layerHeight;
      
      progress.step(1);     

    } //layer iterator 
      progress.update(100);

  }
  
}; //preprocessLayerStack

//---------------------------------------------------------------------------------------------//


const isLayerProcessable = (modelLayer) => {
    return (
        modelLayer.isValid() &&
        modelLayer.tryGetBounds2D() &&
        modelLayer.hasData(
            LAYER.nLayerDataTypeIsland |
            LAYER.nLayerDataTypeOpenPolyline |
            LAYER.nLayerDataTypeExposurePolyline
        )
    );
};


const isModelOutsideWorkArea = (boundsArray,limits,layerNr,model) => {
  
  const bounds = {
    xmin: boundsArray[0],
    xmax: boundsArray[1],
    ymin: boundsArray[2],
    ymax: boundsArray[3]
  }
  

if(bounds.xmin < limits.xmin || bounds.xmax > limits.xmax ||
   bounds.ymin < limits.ymin || bounds.ymax > limits.ymax){
   
     process.printError("Preprocessor: model outside workarea limits, breach found at layerheigt: " + layerNr + "model " + model.getAttribEx('ModelName') + 
     " b" + bounds.xmin +"/"+ bounds.xmax +";"+ bounds.ymin +"/"+ bounds.ymax + " l" + limits.xmin +"/"+ limits.xmax +";"+ limits.ymin +"/"+ limits.ymax);
     
     }
};

// ADD LAYER BOUNDARIES
const addLayerBoundariesToAllLayerBoundaries = (modelData, thisLayerBoundaries, workAreaLimits, layerHeight,srcModel) => {
  let boundsArray = [
    undefined, // xmin
    undefined, // xmax
    undefined, // ymin
    undefined  // ymax
  ];

  if (thisLayerBoundaries) {
    boundsArray = [
      thisLayerBoundaries.m_min.m_coord[0], // xmin
      thisLayerBoundaries.m_max.m_coord[0], // xmax
      thisLayerBoundaries.m_min.m_coord[1], // ymin
      thisLayerBoundaries.m_max.m_coord[1]  // ymax
    ];
  }

  // Check if boundaries lie outside the allowed area
  isModelOutsideWorkArea(boundsArray, workAreaLimits, layerHeight,srcModel);

  // Retrieve allLayerBoundaries from modelData
  let allLayerBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');

  // If allLayerBoundaries is undefined, initialize it as an empty object
  if (allLayerBoundaries == undefined) {
    allLayerBoundaries = {};
  }

  // If there is nothing yet for this layer height, assign this boundary
  if (allLayerBoundaries[layerHeight] == undefined) {
    allLayerBoundaries[layerHeight] = boundsArray;
  } else {
    // Check if this layer boundaries exceed the already stored boundaries, if true update the boundary
    if (boundsArray[0] < allLayerBoundaries[layerHeight][0]) allLayerBoundaries[layerHeight][0] = boundsArray[0]; // xmin
    if (boundsArray[1] > allLayerBoundaries[layerHeight][1]) allLayerBoundaries[layerHeight][1] = boundsArray[1]; // xmax
    if (boundsArray[2] < allLayerBoundaries[layerHeight][2]) allLayerBoundaries[layerHeight][2] = boundsArray[2]; // ymin
    if (boundsArray[3] > allLayerBoundaries[layerHeight][3]) allLayerBoundaries[layerHeight][3] = boundsArray[3]; // ymax
  }

  // Store boundaries in modelData tray
  modelData.setTrayAttribEx('allLayerBoundaries', allLayerBoundaries);
};

// const addLayerBoundariesToAllLayerBoundaries = (modelData,thisLayerBoundaries,workAreaLimits,layerNr) => {
//   
//   let boundsArray = [
//         undefined,  // xmin
//         undefined,  // xmax
//         undefined,  // ymin
//         undefined]; // ymax 
//     
//   if(thisLayerBoundaries){
//      boundsArray = [
//         thisLayerBoundaries.m_min.m_coord[0],   // xmin
//         thisLayerBoundaries.m_max.m_coord[0],   // xmax
//         thisLayerBoundaries.m_min.m_coord[1],   // ymin
//         thisLayerBoundaries.m_max.m_coord[1]];  // ymax
//     
//     }
//     
//  
//   //check if model is outside boundaries 
//     
//   //check if boundaries lies outside the allowed area
//   isModelOutsideWorkArea(boundsArray,workAreaLimits,layerNr);
//     
//   let allLayerBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
//   
//   // if allLayerBoundaries has nothing this is first layer
//   if (allLayerBoundaries == undefined) {
//     
//     allLayerBoundaries = [];
//     allLayerBoundaries[0] = undefined; // add empty layer for layer 0
//     }
//   
//   // if there is nothing yet for this layer, push this boundary 
//   if (allLayerBoundaries[layerNr] == undefined) {
//     
//     allLayerBoundaries[layerNr] = (boundsArray);
//     
// 
//     
//   } else { // check 
//     
//     // check if this layer boundaries exceeds the already stored, if true update the boundary
//     if (boundsArray[0] < allLayerBoundaries[layerNr][0]) allLayerBoundaries[layerNr][0] = boundsArray[0]; //xmin
//     if (boundsArray[1] > allLayerBoundaries[layerNr][1]) allLayerBoundaries[layerNr][1] = boundsArray[1]; //xmax
//     if (boundsArray[2] < allLayerBoundaries[layerNr][2]) allLayerBoundaries[layerNr][2] = boundsArray[2]; //ymin
//     if (boundsArray[3] > allLayerBoundaries[layerNr][3]) allLayerBoundaries[layerNr][3] = boundsArray[3]; //ymax
//   
//   }
//   
//   // store boundaries in modelData tray
//   modelData.setTrayAttribEx('allLayerBoundaries',allLayerBoundaries);
// } // addLayerBoundariesToAllLayerBoundaries

//---------------------------------------------------------------------------------------------//