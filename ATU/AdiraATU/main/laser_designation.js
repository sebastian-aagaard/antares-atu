/************************************************************
 * [Laser Designation
 * - defines how the laser workload is distributed among the lasers
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
var HATCH = requireBuiltin('bsHatch');
var PARAM = requireBuiltin('bsParam');
var VEC2 = requireBuiltin('vec2');

var UTIL = require('main/utility_functions.js');

// -------- TOC -------- //

// -------- FUNCTIONS -------- //


// function statically distributing the lasing zone <- not smart !
exports.staticDistribution = function (
  hatchObj,
  modelData,
  scanheadArray,
  tileArray,
  required_passes_x,
  required_passes_y,
  nLayerNr,
  laser_count)
  {
    
  let thisModel = modelData.getModel(0);
  let curHatch = new HATCH.bsHatch(); 
  curHatch.moveDataFrom(hatchObj);
  
  //get divison of scanfields in x!
  let xDiv = new Array();
  let yDiv = new Array();

// get generic tile division based on laser reach
    // take shift in x into consideration only between lasers, outside is not shifted
  for (let i = 0; i<scanheadArray.length+1;i++)
    {
      if (i==0) { // if first elements 
        xDiv[i] = scanheadArray[i].abs_x_min;
      }else if (i == scanheadArray.length) { // if arraylength is reached
            xDiv[i] = scanheadArray[i-1].abs_x_max;
      } else {      
      xDiv[i] = (scanheadArray[i-1].x_ref + scanheadArray[i].x_ref)/2;// + shiftX;
        } //if else       
    } // for

 // first get each tile, x laser seperation with overlap.
  
 for (let i = 0; i<tileArray.length;i++){
   
    let clip_min_y = tileArray[i].scanhead_outline[0].m_coord[1];
    let clip_max_y = tileArray[i].scanhead_outline[2].m_coord[1];
    
    let currentTileNr = tileArray[i].tile_number;
    let currentPassNr = tileArray[i].passNumber;
      
    let laserIndex = 0;
    let laser_color = thisModel.getAttribEx('laser_color'); // retrive laser_color 
    
    let tileOverlap = PARAM.getParamReal('scanhead', 'tile_overlap_x');
    for(let j = 0; j<xDiv.length-1; j++){
      
      let xTileOffset = tileArray[i].scanhead_x_coord;
      let clip_min_x = xTileOffset+xDiv[j]+tileOverlap/2; // laserZoneOverLap
      let clip_max_x = xTileOffset+xDiv[j+1]-tileOverlap/2; //laserZoneOverLap
      
       // add the corrdinates to vector pointset
       let clipPoints = new Array(4);
       clipPoints[0] = new VEC2.Vec2(clip_min_x, clip_min_y); //min,min
       clipPoints[1] = new VEC2.Vec2(clip_min_x, clip_max_y); //min,max
       clipPoints[2] = new VEC2.Vec2(clip_max_x, clip_max_y); // max,max
       clipPoints[3] = new VEC2.Vec2(clip_max_x, clip_min_y); // max,min
       //vec2LaserZoneArray[j] =  clipPoints;
       
       //let tileHatch = new HATCH.bsHatch();
       let tileHatch = UTIL.ClipHatchByRect(curHatch,clipPoints);
  //    let outsideHatch = ClipHatchByRect(curHatch,clipPoints,false);
  //      curHatch.makeEmpty();
  //      curHatch.moveDataFrom(outsideHatch);
       
       // add display and bsid attributes to hatchblocks
       let hatchIterator = tileHatch.getHatchBlockIterator();
       while(hatchIterator.isValid())
       {
         let currHatcBlock = hatchIterator.get();
          
         if(currHatcBlock.getAttributeInt('passNumber') == currentPassNr && currHatcBlock.getAttributeInt('tile_index') == currentTileNr){      
           
           let type = currHatcBlock.getAttributeInt('type');
           currHatcBlock.setAttributeInt('_disp_color',laser_color[laserIndex]);
           currHatcBlock.setAttributeInt('bsid', (10 * (laserIndex+1))+type); // set attributes
           
           } else {
           currHatcBlock.makeEmpty();
             }
         hatchIterator.next();
       }
      
       laserIndex++;
       if (laserIndex>laser_count-1)
       {
         laserIndex=0;
       }
        
        
        hatchObj.moveDataFrom(tileHatch);
     }   
   }
   return hatchObj;
  } //fixedLaserWorkload
  
exports.defineSharedZones = function (allTileHatch,laser_count){
  
  /////////////////////////////////////
  /// Define zones shared by lasers /// 
  /////////////////////////////////////
   
  let hatchblockIt = allTileHatch.getHatchBlockIterator();         
  let allocatedLasers = [];
  let zoneId = 0;
  
  while(hatchblockIt.isValid())
    {
    let hatchBlock = new HATCH.bsHatch();
    hatchBlock = hatchblockIt.get();
    
    hatchBlock.setAttributeInt('zoneIndex',zoneId++);
      
    for(let m = 0; m<laser_count; m++)
      {     
        if(hatchblockIt.isValid())
          {             
            allocatedLasers[m] = hatchBlock.getAttributeInt('laser_index_' + (m+1));
                   
          }         
      }
      
    if (UTIL.getArraySum(allocatedLasers)>1)
      {            
        hatchBlock.setAttributeInt('sharedZone', 1);        
        
      } else {       
        
        hatchBlock.setAttributeInt('sharedZone', 0);  
        
      }
    hatchblockIt.next();
    }
}  