/************************************************************
 * Post Processing
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

// -------- SCRIPTS INCLUDES -------- //
const CONST = require('main/constants.js');
const EXP3MF = require('../3mf/3mf_data_collector.js');
/** 
 * Multithreaded post-processing.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
 
 
exports.postprocessSortExposure_MT = function( 
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr){
  
  let layerCount = layer_end_nr - layer_start_nr + 1;
  progress.initSteps(layerCount);

  let layerIt = modelData.getPreferredLayerProcessingOrderIterator(
     layer_start_nr, layer_end_nr, POLY_IT.nLayerExposure);

   while(layerIt.isValid() && !progress.cancelled()) {
     
    let layerNr = layerIt.getLayerNr();

    // calculate the processing order based on tiles and hatchtype
    let tileExposureArray = getTileExposureArray(modelData,layerNr);
    
    // remove undefined entries from tile exposure array
    let filteredExposureArray = 
        tileExposureArray.filter(innerArray => 
        innerArray.some(entry => entry !== undefined))
        .map(innerArray => 
        innerArray.filter(entry => entry !== undefined));


    let sortedExposureArray = sortMovementDirectionOfTiles(filteredExposureArray);
     
    updateProcessingOrder(sortedExposureArray);
     
    getTileExposureDuration(sortedExposureArray,modelData);
    
     
    //process.print('layerNr: ' + layerNr); 
    EXP3MF.createExporter3mf (sortedExposureArray,layerIt,modelData,layerNr);
    
    
    layerIt.next();
    progress.step(1);
    
   }
   
   // MOVE TO NON PARALELL POSTProcess
   assignCustomJSON(modelData); //
     
} // postprocessSortExposure_MT
 

const assignCustomJSON  = (modelData) => {

const isoDateString = new Date().toISOString(); // get date of file generation

  var customJSON = {
    
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
          "build_time": null,//buildTimeEstimate,
          "total_mass": null,//totalPartMass,
          "total_packed_powder":null,// totalPackedPowder                
        }        
      },
      
      {
        "name": "generation",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "created_at": isoDateString,
          "created_by": "engineer"
        }        
      },

      {
        "name": "material",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "layerthickness": null, //layerThickness,
          "identifier": null,//model.getMaterialID(),
          "density": null,//,
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

}

const getTileExposureDuration = (exposureArray,modelData) => {
  
  exposureArray.forEach(pass => {
    pass.forEach(tile => {
      // Initialize an object to store exposure durations for each laser
      let exposureTimeObj = {};
      let skywritingTime = {};
      let nextLaserStartPos = {};
      tile.laserExposureTime = {};
      tile.exposureTime = 0;

      tile.exposure.forEach((cur,curIndex) => {
        const cur_bsid = cur.getAttributeInt('bsid');
        const laserID = Math.floor(cur_bsid / 10); // Calculate the laser ID
        
        const scanParamters = modelData
          .getModel(cur.getModelIndex())
          .getAttribEx('customTable')
          .find(profile => profile.bsid === cur_bsid)
          .attributes
          .find(attr => attr.schema === CONST.scanningSchema);
        
        const scanner = JSON.parse(modelData
          .getTrayAttrib('scanhead_array'))
          .find(scn => scn.laserIndex === laserID);
        
        const laserStartPos = {
          'x': cur.getAttributeReal('xcoord') + scanner.x_ref,
          'y': cur.getAttributeReal('ycoord') + scanner.rel_y_max };
          
        nextLaserStartPos[laserID] = {
          'x': laserStartPos.x,
          'y': laserStartPos.y += 
            cur.getAttributeInt('bMoveFromFront') ? scanner.rel_y_max : -scanner.rel_y_max};  
         
        const exposureSettings = {
          'fJumpSpeed': scanParamters.jumpSpeed,
          'fMeltSpeed': cur.getAttributeReal('speed'),
          'fJumpLengthLimit': scanParamters.jumpLengthLimit,
          'nJumpDelay': scanParamters.jumpDelay,
          'nMinJumpDelay': scanParamters.minJumpDelay,
          'nMarkDelay': scanParamters.markDelay,
          'nPolygonDelay': scanParamters.polygonDelay,
          'polygonDelayMode': scanParamters.polygonDelayMode,
          'laserPos' : laserStartPos };  
 
        // If the laser ID doesn't exist in tile.laserDuration, create a new entry
        if (!tile.laserExposureTime[laserID]) {
          exposureTimeObj[laserID] = new EXPOSURE.bsExposureTime();
          skywritingTime[laserID] = 0;
          tile.laserExposureTime[laserID] = 0;
        };

        // Add polyline to the corresponding laser exposure time
        exposureTimeObj[laserID].addPolyline(cur, exposureSettings);
        // Get the added duration caused by skywriting
        skywritingTime[laserID] += getSkywritingDuration(cur,modelData);
        // At last exposure polyline add position jump to next start pos plus added duration from skywriting
        if (curIndex === tile.exposure.length - 1) {
          
          Object.keys(exposureTimeObj).forEach( key => {
            
            exposureTimeObj[key].setLaserPosition(
              nextLaserStartPos[key].x,
              nextLaserStartPos[key].y,
              'jump');
            
            //get exposuretime of each laser in tile
            tile.laserExposureTime[key] = exposureTimeObj[key].getExposureTimeMicroSeconds();
            tile.laserExposureTime[key] += skywritingTime[key];
            tile.exposureTime = tile.exposureTime < tile.laserExposureTime[key] ? tile.laserExposureTime[key] : tile.exposureTime;
          }); // for each laser object
        } // if
        
      }); // forEach .exposure
    }); // forEach .tile
  }); // forEach .pass
  
} //getTileExposureDuration


const getSkywritingDuration = (cur,modelData) => {
  
  const skyWritingParamters = modelData
          .getModel(cur.getModelIndex())
          .getAttribEx('customTable')
          .find(profile => profile.bsid === cur.getAttributeInt('bsid'))
          .attributes
          .find(attr => attr.schema === CONST.skywritingSchema);

  let skywritingPostConst = 10; 
  let skywritingPrevConst = 10;

  if (skyWritingParamters.mode == 0) {
    
    let skywritingPostConst = 0; 
    let skywritingPrevConst = 0;
    
    } else if (skyWritingParamters.mode == 1) {
    
    skywritingPostConst = 20;
    skywritingPrevConst = 20;
    
  }  

  let npostDur = skyWritingParamters.npost*skywritingPostConst/10; // do we still divide by 10 ? we also do it in perparemodelexposure
  let nprevDur = skyWritingParamters.nprev*skywritingPrevConst/10; // do we still divide by 10 ?
  
  let skipCount = cur.getSkipCount();
    
  return (npostDur + nprevDur)*cur.getSkipCount()
}

   

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
} //getTileExposureArray

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
    
    let bFromFront = 1;
    
    if ((index % 2 === 0 || !isPassDirectionAlternating) === !isFirstPassFrontToBack) {
      entry.sort().reverse();
      bFromFront = 0;
    };
    
    entry.forEach(tile => {
      tile.exposure.forEach(polyIt => {
        polyIt.setAttributeInt('bMoveFromFront', bFromFront)
      });
    })
    
  });
  
  return filteredExposureArray;
  
}; // sortMovementDirectionOfTiles


  
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

//};