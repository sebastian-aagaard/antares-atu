/************************************************************
 * Laser Designation
 * - defines how the laser workload is distributed among the lasers
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
var ISLAND = requireBuiltin('bsIsland');
var HATCH = requireBuiltin('bsHatch');
var PARAM = requireBuiltin('bsParam');
var VEC2 = requireBuiltin('vec2');
var PATH_SET = requireBuiltin('bsPathSet');
var RND = requireBuiltin('random');
var RGBA = requireBuiltin('bsColRGBAi');

// -------- SCRIPT INCLUDES -------- //
var UTIL = require('main/utility_functions.js');
var CONST = require('main/constants.js');

// -------- TOC -------- //
/* getScanner (laserIndex)
 * defineScannerArray (bsModel)
 * setLaserDisplayColor (bsModel)
 * staticDistribution (thisModel,nLayerNr,hatchObj)
 * defineSharedZones(bsHatch)
*/
// -------- FUNCTIONS -------- //


 ////////////////////////////////////////
 //   generate scan head objects       //
 ///////////////////////////////////////
    
const getScanner = function(laserIndex){
    
  let x_ref = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) + '_ref_mm');
  //let y_ref
  let rel_x_max = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) +'_max_mm'); // max
  let rel_x_min =  PARAM.getParamReal('scanhead','x_scanner'+ (laserIndex) + '_min_mm'); // min
  let rel_y_min = 0;
  let abs_x_min = x_ref+rel_x_min;
  let abs_x_max = x_ref+rel_x_max;
  let rel_y_max =  PARAM.getParamReal('tileing','tile_size');

  return {
    'laserIndex': laserIndex,
    'x_ref': x_ref,
    'rel_x_max': rel_x_max,
    'rel_x_min': rel_x_min,
    'rel_y_min': rel_y_min,
    'rel_y_max' : rel_y_max,
    'abs_x_min' : abs_x_min,
    'abs_x_max' : abs_x_max
    }
  }

//---------------------------------------------------------------------------------------------//
  
  ///////////////////////////////////////
  //  Define and store scanner array   //
  ///////////////////////////////////////
  
exports.defineScannerArray = function(bsModelData) {

  let scannerArray = [];
  
  for (let i = 0; i < CONST.nLaserCount; i++) {
  scannerArray[i] = getScanner(i+1);
    };
    
  bsModelData.setTrayAttribEx('scanhead_array',scannerArray);  
  };

//---------------------------------------------------------------------------------------------//
    
  ////////////////////////////////
  //  Laser display color def   //
  ////////////////////////////////

exports.setLaserDisplayColor = function(bsModelData){
  
  const l_rnd_gen = new RND.Rand(239803);
  let laser_color = [];
   
  let l_col = new Array(CONST.nLaserCount);
  // using the previously defined color scheme for displaying lasers
  l_col[0] = new RGBA.bsColRGBAi(247,4,4,255);  // red
  l_col[1] = new RGBA.bsColRGBAi(72,215,85,255); // green
  l_col[2] = new RGBA.bsColRGBAi(10,8,167,255); // blue
  l_col[3] = new RGBA.bsColRGBAi(249,9,254,255); // purple
  l_col[4] = new RGBA.bsColRGBAi(13,250,249,255); // light blue

  for(let l_laser_nr = 0;l_laser_nr<CONST.nLaserCount;l_laser_nr++)
    {
      if (l_laser_nr > 4) {// support for auto generating colors for additional lasers
      l_col[l_laser_nr] = new RGBA.bsColRGBAi(215 - (l_rnd_gen.getNextRandom()*100),
        215 - (l_rnd_gen.getNextRandom()*100),
        215 - (l_rnd_gen.getNextRandom()*100),
        255);  
      } // if
      laser_color[l_laser_nr] = l_col[l_laser_nr].rgba();
    } // for
    bsModelData.setTrayAttribEx('laser_color',laser_color);
  }

//---------------------------------------------------------------------------------------------//

// static distributing the lasing zone by 
// finding the midway point of the scanner reach
exports.staticDistribution = function(thisModel,bsModelData,nLayerNr,hatchObj) {
    
  let laserAssignedHatches = new HATCH.bsHatch(); // to be returned
    
  let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  let tileArray = thisLayer.getAttribEx('tileTable');
  let scanheadArray = bsModelData.getTrayAttribEx('scanhead_array'); 
  
  let laser_color = bsModelData.getTrayAttribEx('laser_color'); // retrive laser_color 
  
  //get divison of scanfields in x!
  let xDiv = new Array();

  // get generic tile division based on laser reach
  // take shift in x into consideration only between lasers, outside is not shifted
  for (let i = 0; i<scanheadArray.length+1;i++)
    {
      if (i==0) { // if first elements 
        xDiv[i] = scanheadArray[i].abs_x_min;
      }else if (i == scanheadArray.length) { // if arraylength is reached
            xDiv[i] = scanheadArray[i-1].abs_x_max;
      } else {      
      xDiv[i] = (scanheadArray[i-1].x_ref+scanheadArray[i-1].rel_x_max + scanheadArray[i].x_ref + scanheadArray[i].rel_x_min)/2;// + shiftX;
        } //if else
    } // for

 // first get each tile, x laser seperation with overlap.
  
 for (let tileIndex = 0; tileIndex < tileArray.length; tileIndex++){
    let clip_min_y = tileArray[tileIndex].scanhead_outline[0].m_coord[1];
    let clip_max_y = tileArray[tileIndex].scanhead_outline[2].m_coord[1];
    
    let currentTileNr = tileArray[tileIndex].tile_number;
    let currentPassNr = tileArray[tileIndex].passNumber;
       
    let tileOverlap = PARAM.getParamReal('scanhead', 'tile_overlap_x'); // used twicxe
   
    for(let laserIndex = 0; laserIndex<xDiv.length-1; laserIndex++){ // run trough all laser dedication zones
      
      let xTileOffset = tileArray[tileIndex].scanhead_x_coord;
      let clip_min_x = xTileOffset+xDiv[laserIndex]+tileOverlap/2; // laserZoneOverLap
      let clip_max_x = xTileOffset+xDiv[laserIndex+1]-tileOverlap/2; //laserZoneOverLap
      
       // add the corrdinates to vector pointset
       let clipPoints = new Array(4);
       clipPoints[0] = new VEC2.Vec2(clip_min_x, clip_min_y); //min,min
       clipPoints[1] = new VEC2.Vec2(clip_min_x, clip_max_y); //min,max
       clipPoints[2] = new VEC2.Vec2(clip_max_x, clip_max_y); // max,max
       clipPoints[3] = new VEC2.Vec2(clip_max_x, clip_min_y); // max,min

       let tileHatch = UTIL.ClipHatchByRect(hatchObj,clipPoints);
       
       // add display and bsid attributes to hatchblocks
       let hatchIterator = tileHatch.getHatchBlockIterator();
       while(hatchIterator.isValid())
       {
         let currHatcBlock = hatchIterator.get();
          
         let tileID = currHatcBlock.getAttributeInt('tileID_3mf');
         
         let curTileID = currentPassNr*1000 + currentTileNr;
         
         if(tileID === curTileID){      
           
           if(PARAM.getParamInt('laserAllocation','laserAssignedToModel') === 0 
             || PARAM.getParamInt('laserAllocation','laserAssignedToModel') == laserIndex+1){
             
                 let type = currHatcBlock.getAttributeInt('type');
                 currHatcBlock.setAttributeInt('_disp_color',laser_color[laserIndex]);
                 currHatcBlock.setAttributeInt('bsid', (10 * (laserIndex+1))+type); // set attributes                
             };
           }  else currHatcBlock.makeEmpty();
                   
         hatchIterator.next();
       }
             
       if (laserIndex > CONST.nLaserCount-1){
         laserIndex = 0;
       };
   
       // getHatchBlockArray
        let hatchBlockArray = tileHatch.getHatchBlockArray();
        // remove empty hatches
        let nonEmptyHatches = hatchBlockArray.reduce(function(reducedArray, currentHatch) {         
            if (!currentHatch.isEmpty() && !currentHatch.getAttributeInt('bsid')==0) {
                reducedArray.addHatchBlock(currentHatch);           
            }
            return reducedArray;         
        }, new HATCH.bsHatch());

       laserAssignedHatches.moveDataFrom(nonEmptyHatches);
     }   
   }
   
   return laserAssignedHatches;
  } //fixedLaserWorkload

//---------------------------------------------------------------------------------------------//


exports.assignProcessParameters = function(bsHatch,bsModel,nLayerNr){

  const bsidTable = bsModel.getAttribEx('customTable');
  
  let hatchIterator = bsHatch.getHatchBlockIterator();
  
  while(hatchIterator.isValid()){
    
    let thisHatchBlock = hatchIterator.get();
    let bsid = thisHatchBlock.getAttributeInt('bsid');
    let laserId = Math.floor(bsid/10);
    let type = thisHatchBlock.getAttributeInt('type');
    let tileNumber = thisHatchBlock.getAttributeInt('tileID_3mf') % 1000;
    
    let thisProcessParameters = bsidTable.find(function (item) {
        return item.bsid === bsid;
    });
    
    let thisLayer = bsModel.getModelLayerByNr(nLayerNr);
    let tileArray = thisLayer.getAttribEx('tileTable');
    let tileID = thisHatchBlock.getAttributeInt('tileID_3mf');
    let xcoord, ycoord;
    tileArray.forEach(function(tileObj) {
      if (tileObj.tileID == tileID) {
          xcoord = tileObj.scanhead_x_coord;
          ycoord = tileObj.scanhead_y_coord;
      };
    });
    
//     if(!bsid){
//       thisHatchBlock.setAttributeReal('speed',0);
//       thisHatchBlock.setAttributeReal('power',0);
//       thisHatchBlock.setAttributeInt('priority',0);
//       } else {
      thisHatchBlock.setAttributeReal('speed',thisProcessParameters.speed);
      thisHatchBlock.setAttributeReal('power',thisProcessParameters.power);
      thisHatchBlock.setAttributeInt('priority',thisProcessParameters.priority);
/*    };*/
        
    thisHatchBlock.setAttributeReal('xcoord',xcoord);
    thisHatchBlock.setAttributeReal('ycoord',ycoord);
    
    const displayMode = PARAM.getParamInt('display','displayColors');
    
    if (displayMode == 1){
      thisHatchBlock.setAttributeInt('_disp_color',UTIL.findColorFromType(type).color1.rgba());  
      };
    
    if (displayMode == 2){
      let color = UTIL.findColorFromType(type).color1;
      if(tileNumber % 2 === 0) {
        color = UTIL.findColorFromType(type).color2;
        };

      color.a((255*(laserId/CONST.nLaserCount)));
      thisHatchBlock.setAttributeInt('_disp_color',color.rgba());  
      };  
    
    hatchIterator.next();
  }
}



//---------------------------------------------------------------------------------------------//
  
exports.defineSharedZones = function(bsHatch){

/////////////////////////////////////
  /// Define zones shared by lasers /// 
  /////////////////////////////////////
   
  let hatchblockIt = bsHatch.getHatchBlockIterator();         
  let allocatedLasers = new Array();
  let zoneId = 0;
  
  while(hatchblockIt.isValid())
    {
    let thisHatchBlock = hatchblockIt.get();
    
    thisHatchBlock.setAttributeInt('zoneIndex',zoneId++);
      
    for(let m = 0; m<CONST.nLaserCount; m++)
      {     
        if(hatchblockIt.isValid())
          {             
            allocatedLasers[m] = thisHatchBlock.getAttributeInt('laser_index_' + (m+1));
                   
          }         
      }
      
    if (UTIL.getArraySum(allocatedLasers)>1)
      {            
        thisHatchBlock.setAttributeInt('sharedZone', 1);        
        
      } else {       
        
        thisHatchBlock.setAttributeInt('sharedZone', 0);  
        
      }
    hatchblockIt.next();
    }
}