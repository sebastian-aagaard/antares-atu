/************************************************************
 * Post Processing
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


// -------- INCLUDES -------- //
var MODEL = requireBuiltin('bsModel');
var PARAM = requireBuiltin('bsParam');
var POLY_IT = requireBuiltin('bsPolylineIterator');

const getTileExposureArray = (modelData,layerNr) => {
  
  let exposurePolylineIt = modelData.getFirstLayerPolyline(layerNr,POLY_IT.nLayerExposure,'rw');
  let tileObj =  [];
    
  while(exposurePolylineIt.isValid()){
          
    const thisExposurePolyline = exposurePolylineIt.clone();
    
    const tileID = thisExposurePolyline.getAttributeInt('tileID_3mf');
    
    const passNumber = Math.floor(tileID / 1000 );
        
    if (tileObj[passNumber] === undefined) tileObj[passNumber] = [];
  
    if(tileObj[passNumber][tileID] === undefined) tileObj[passNumber][tileID] = {tileID : tileID , exposure : []};
    tileObj[passNumber][tileID].tileID = tileID;
    tileObj[passNumber][tileID].exposure.push(thisExposurePolyline);
    
    exposurePolylineIt.next();
      
    } // exposurePolyLines 
    
    return tileObj;
}

/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.postprocessLayerStack_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){

process.print(`layer start:  ${layer_start_nr}, layer end: ${layer_end_nr}`);
  
  let layerCount = layer_end_nr - layer_start_nr + 1;
  progress.initSteps(layerCount);

  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
     layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);

   while(layerIt.isValid() && !progress.cancelled()) {
     
    let layerNr = layerIt.getLayerNr();

    // calculate the processing order based on tiles and hatchtype
    let tileExposureArray = getTileExposureArray(modelData,layerNr);
    
    // remove undefined entries from tile exposure array
    let filteredExposureArray = tileExposureArray
        .filter(innerArray => innerArray
        .some(entry => entry !== undefined))
        .map(innerArray => innerArray
        .filter(entry => entry !== undefined));


    let sortedExposureArray = sortMovementDirectionOfTiles(filteredExposureArray);
    updateProcessingOrder(sortedExposureArray);

    layerIt.next();
    progress.step(1); 
   }
}

const updateProcessingOrder = (sortedExposureArray ) => {

  let runningNumber = 0;
  
  sortedExposureArray.forEach(innerArray => 
      innerArray.forEach(entry => 
          entry.exposure.forEach(obj => 
              obj.setAttributeInt('_processing_order',runningNumber++)
          )
      )
  );
} //updateProcessingOrder

const sortMovementDirectionOfTiles = (tileExposureArray) => {

  
  const isFirstPassFrontToBack = PARAM.getParamInt('movementSettings','isFirstPassFrontToBack'); 
  const isPassDirectionAlternating = PARAM.getParamInt('movementSettings','isPassDirectionAlternating'); 
    
  const filteredExposureArray =  tileExposureArray.filter (entry => {
    return entry;
  });
    
  filteredExposureArray.forEach((entry, index) => {
       
    if ((index % 2 === 0 || !isPassDirectionAlternating) === !isFirstPassFrontToBack) {
      entry.sort().reverse();
    }

  });
  
  return filteredExposureArray;
  
} // sortMovementDirectionOfTiles


  
//   var surfaceAreaTotal = 0;
//   var buildTimeEstimate = 0;
//   //process.printInfo("postprocess model count: " + modelData.getModelCount());
//   let model = modelData.getModel(0);
// 
//   var layerThickness = model.getLayerThickness();
//   for(let layer_nr = layer_start_nr; layer_nr <= layer_end_nr; ++layer_nr)
//   {
//     progress.step(1);
//      
//     let modelLayer = model.getModelLayerByNr(layer_nr);   
//     
// 
//  
//     let exporter_3mf = modelLayer.getAttribEx('exporter_3mf');
//    
//    
//     let totalMoveDuration=0;
//     // calculate distance travelled single
//     for (let i = 0; i < exporter_3mf.content.length;i++){
//       
//     
//     let requiredPasses = exporter_3mf.content[i].attributes.requiredPasses;
//     let tilesInPass = exporter_3mf.content[i].attributes.tilesInPass;
//     let startx = exporter_3mf.content[i].attributes.startx;
//     let starty = exporter_3mf.content[i].attributes.starty;
//     let transferSpeed = exporter_3mf.content[i].attributes.sequencetransferspeed;
//       
//       let movementSpeed = transferSpeed;
//       
//       for (let j = 0; j< tilesInPass;j++){
//         
//         let targetx = exporter_3mf.content[i].children[j].attributes.targetx;
//         let targety = exporter_3mf.content[i].children[j].attributes.targety;
// 
//         let a = startx-targetx;
//         let b = starty-targety;
//         let c = Math.sqrt(a*a+b*b);
//         
//         startx = targetx;
//         starty = targety;
//         
//         var moveDuration = c/transferSpeed;
//         totalMoveDuration += moveDuration;   
//       
//         movementSpeed = exporter_3mf.content[i].children[j].attributes.speedy;
//     
//         }
//       }
//     
//     
//     let recoatingDuration = PARAM.getParamInt('movementSettings','recoating_time_ms');
//     let thisLayerDuration = exporter_3mf.content[0].attributes.layerScanningDuration; 
//     
//     buildTimeEstimate += thisLayerDuration+recoatingDuration+totalMoveDuration;
//     
//     let islandIT = modelLayer.getFirstIsland();
//     
//     while(islandIT.isValid())
//     {
//       let thisIland = islandIT.getIsland();
//       surfaceAreaTotal += thisIland.getSurfaceArea();
//       islandIT.next();
//     }    
//   } //for (iterate through layers)
//   
//       
//   var totalPartMass = surfaceAreaTotal*layerThickness*model.getAttrib('density')/(1000*1000*1000);
//   var totalPackedPowder = layer_end_nr * layerThickness * PARAM.getParamInt('workarea','x_workarea_max_mm') * PARAM.getParamInt('workarea','y_workarea_max_mm')*model.getAttrib('density') / (1000*1000*1000);
//   
//   
//   var isoDateString = new Date().toISOString(); // get date of file generation
// 
//   var customJSON = {
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
//     toolpathdata: [
//       {
//         "name": "statistics",
//         "schema": "http://adira.com/addcreator/202305",
//         attributes: {
//           "build_time": buildTimeEstimate,
//           "total_mass": totalPartMass,
//           "total_packed_powder": totalPackedPowder                
//         }        
//       },
//       
//       {
//         "name": "generation",
//         "schema": "http://adira.com/addcreator/202305",
//         attributes: {
//           "created_at": isoDateString,
//           "created_by": "engineer"
//         }        
//       },
// 
//       {
//         "name": "material",
//         "schema": "http://adira.com/addcreator/202305",
//         attributes: {
//           "layerthickness": layerThickness,
//           "identifier": model.getMaterialID(),
//           "density": parseFloat(model.getAttrib('density')),
//           "gas": model.getAttrib('gas')          
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
//           
//    modelData.setTrayAttribEx('custom', customJSON);
//};