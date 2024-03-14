/************************************************************
 * Preprocessor
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //

var TILE = require('main/tileing.js');
var CONST = require('main/constants.js');
var doLogging = CONST.ENABLE_LOGGING;

// -------- CODE -------- //

// preprocess layer stack is run once for each model. no obvious way to flow information from one model to another. eg scene boundaries
exports.preprocessLayerStack = function(modelDataSrc, modelDataTarget, progress)
{  
  
  let srcModelCount = modelDataSrc.getModelCount(); // get number of models
  let modelLayerCount = modelDataSrc.getLayerCount(); //get layer count
  let modelLayerHeight = modelDataSrc.getLayerThickness(); // get layer height
  
  let layerBoundaries = new Array();
  
 
//   if(doLogging){
//     process.print('PREPROCESS -> Src Model Count: ' + srcModelCount);
//     process.print('PREPROCESS -> Layer Count : ' + modelLayerCount);
//     process.print('PREPROCESS -> Layer Height : ' + modelLayerHeight + ' um');
// 
//     }
    
  ////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
  
    //progress.initSteps(srcModelCount);

  // add all models on the platform into modelDataTarget
   for( let modelIndex=0; modelIndex < srcModelCount && !progress.cancelled(); modelIndex++ )
    {
      let srcModel = modelDataSrc.getModel(modelIndex);      
      modelDataTarget.addModelCopy(srcModel);
      //progress.step(1);
    }
    

  let targetModelCount = modelDataTarget.getModelCount();
    
  if(doLogging){
    process.printInfo('PREPROCESS -> Target Model Count: ' + targetModelCount);
  }
 
  progress.initSteps(modelLayerCount+1);
// run trough all layers and get all boundaries
  for (let layerIt = 1; layerIt < modelLayerCount+1 && !progress.cancelled();layerIt++){ // run trough all layers
      
    for( let modelIndex=0; modelIndex < targetModelCount && !progress.cancelled(); modelIndex++ )
      {
         
      
     let thisModel = modelDataTarget.getModel(modelIndex); // retrieve current model

     let modelLayer =  thisModel.getModelLayerByNr(layerIt);
      
      if (modelLayer.isValid()){  
        
        
        let thisModelLayerBounds = modelLayer.tryGetBounds2D();
        
        addLayerBoundariesToAllLayerBoundaries(modelDataTarget,thisModelLayerBounds,layerIt)
        //caclulate new scene boundaries
                 
          // calculate the tileArray and stores it layer
          TILE.getTileArray(modelLayer,CONST.bDrawTile,layerIt,modelDataTarget);  
        
      }
     progress.step(1); 
    }
  }
  
  
  
}; //preprocessLayerStack


let addLayerBoundariesToAllLayerBoundaries = (modelData,thisLayerBoundaries,layerIt) => {

//   let boundsString = '' + boundaries.minX + ';' + boundaries.maxX + ';' + 
//                           boundaries.minY + ';' + boundaries.maxY;
  
  
  let boundsArray = [
    thisLayerBoundaries.m_min.m_coord[0], // xmin
    thisLayerBoundaries.m_max.m_coord[0], // xmax
    thisLayerBoundaries.m_min.m_coord[1], // ymin
    thisLayerBoundaries.m_max.m_coord[1]  // y
  ];

  
  let allLayerBoundaries = modelData.getTrayAttribEx('allLayerBoundaries');
  
  if (allLayerBoundaries == undefined) {
    allLayerBoundaries = [];
    allLayerBoundaries.push(undefined); // add empty layer for layer 0
    }

   allLayerBoundaries.push(boundsArray);

  if (boundsArray[0] < allLayerBoundaries[layerIt][0]) allLayerBoundaries[layerIt][0] = boundsArray[0];
  if (boundsArray[1] > allLayerBoundaries[layerIt][1]) allLayerBoundaries[layerIt][1] = boundsArray[1];
  if (boundsArray[2] < allLayerBoundaries[layerIt][2]) allLayerBoundaries[layerIt][2] = boundsArray[2];
  if (boundsArray[3] > allLayerBoundaries[layerIt][3]) allLayerBoundaries[layerIt][3] = boundsArray[3];
  
  
 
  modelData.setTrayAttribEx('allLayerBoundaries',allLayerBoundaries);

}