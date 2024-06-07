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
    
const getScanner = (laserIndex) => {
    
  let x_ref = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) + '_ref_mm');
  //let y_ref
  let rel_x_max = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) +'_max_mm'); // max
  let rel_x_min =  PARAM.getParamReal('scanhead','x_scanner'+ (laserIndex) + '_min_mm'); // min
  let rel_y_min = 0;
  let abs_x_min = x_ref+rel_x_min;
  let abs_x_max = x_ref+rel_x_max;
  let rel_y_max = undefined;
  //define rel_y_max from the scanningMode
  if (PARAM.getParamInt('tileing','ScanningMode') == 0) {
    
    rel_y_max = PARAM.getParamReal('scanhead','y_scanfield_size_mm');

  } else {
    
    rel_y_max = PARAM.getParamReal('otf','tile_size');
    
    }

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
  
exports.defineScannerArray = (bsModelData) => {

  let scannerArray = [];
  
  for (let i = 0; i < CONST.nLaserCount; i++) {
  scannerArray[i] = getScanner(i+1);
    }
    
  bsModelData.setTrayAttribEx('scanhead_array',scannerArray);  
  }

//---------------------------------------------------------------------------------------------//
    
  ////////////////////////////////
  //  Laser display color def   //
  ////////////////////////////////

exports.setLaserDisplayColor = (bsModelData) => {
  
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
exports.staticDistribution = (thisModel,bsModelData,nLayerNr,hatchObj) => {
    
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
      xDiv[i] = (scanheadArray[i-1].x_ref + scanheadArray[i].x_ref)/2;// + shiftX;
        } //if else       
    } // for

 // first get each tile, x laser seperation with overlap.
  
 for (let tileIndex = 0; tileIndex < tileArray.length ; tileIndex++){
   
    let clip_min_y = tileArray[tileIndex].scanhead_outline[0].m_coord[1];
    let clip_max_y = tileArray[tileIndex].scanhead_outline[2].m_coord[1];
    
    let currentTileNr = tileArray[tileIndex].tile_number;
    let currentPassNr = tileArray[tileIndex].passNumber;
       
    let tileOverlap = PARAM.getParamReal('scanhead', 'tile_overlap_x');
   
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
          
         if(currHatcBlock.getAttributeInt('passNumber') == currentPassNr &&
           currHatcBlock.getAttributeInt('tile_index') == currentTileNr){      
                
           let type = currHatcBlock.getAttributeInt('type');
           currHatcBlock.setAttributeInt('_disp_color',laser_color[laserIndex]);
           currHatcBlock.setAttributeInt('bsid', (10 * (laserIndex+1))+type); // set attributes
           
           }  else currHatcBlock.makeEmpty();
                   
         hatchIterator.next();
       }
             
       if (laserIndex > CONST.nLaserCount-1) laserIndex = 0;
   
       // gethatchBlockArray
       let hatchBlockArray = tileHatch.getHatchBlockArray();
       // remove empty hatches
       let nonEmptyHatches = hatchBlockArray.reduce((reducedArray,currentHatch) => {         
         if(!currentHatch.isEmpty()) reducedArray.addHatchBlock(currentHatch);           
         return reducedArray;         
       },new HATCH.bsHatch());

       laserAssignedHatches.moveDataFrom(nonEmptyHatches);
     }   
   }
   
   return laserAssignedHatches;
  } //fixedLaserWorkload

//---------------------------------------------------------------------------------------------//

// exports.assignLasersToHatchesInTiles = (thisModel,nLayerNr,allHatches) => {
//   
//   let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
//   let passesInX = thisLayer.getAttribEx('requiredPassesX');
//   let passesInY = thisLayer.getAttribEx('requiredPassesY');
//   
//   let tileArray = thisLayer.getAttribEx('tileTable');
//   let scanheadArray = thisModel.getAttribEx('scanhead_array');  
//   
//   let laserAssignedHatches = new HATCH.bsHatch();
//   
//   for (let i = 0; i< passesInX*passesInY;i++) // run through all tiles
//   {
//       
//     let scanheadXCoord = tileArray[i].scanhead_x_coord;
//     let scanheadYCoord = tileArray[i].scanhead_y_coord;
// 
//     for (let j=0;j<CONST.nLaserCount;j++) // run through the available lasers
//       {
//       // get information about the lasing zone in X
//         let curLaserId = scanheadArray[j].laserIndex; // get laser ID
//         let curXref = scanheadArray[j].x_ref; 
//         let curRelXmin = scanheadArray[j].rel_x_min;
//         let curRelXmax = scanheadArray[j].rel_x_max;
//         
//         let curLaserXmin = curXref + curRelXmin + scanheadXCoord;
//         let curLaserXmax = curXref + curRelXmax + scanheadXCoord;
//         
//         let curYref = scanheadArray[j].y_ref;
//         let curRelYmin = scanheadArray[j].rel_y_min;
//         let curRelYmax = scanheadArray[j].rel_y_max;
//         
//         let curLaserYmin = curYref + curRelYmin + scanheadYCoord;
//         let curLaserYmax = curYref + curRelYmax + scanheadYCoord;
//          
//        // add the corrdinates to vector pointset
//        let laserZonePoints = new Array(4);
//        laserZonePoints[0] = new VEC2.Vec2(curLaserXmin, curLaserYmin); //min,min
//        laserZonePoints[1] = new VEC2.Vec2(curLaserXmin, curLaserYmax); //min,max
//        laserZonePoints[2] = new VEC2.Vec2(curLaserXmax, curLaserYmax); // max,max
//        laserZonePoints[3] = new VEC2.Vec2(curLaserXmax, curLaserYmin); // max,min
//               
//        let laserZone_pathset = new PATH_SET.bsPathSet(); // generate pathset object
//        laserZone_pathset.addNewPath(laserZonePoints); // add tiles zones to pathset  
//        laserZone_pathset.setClosed(true); // set the zones to closed polygons
//        
//        let laserZone_clipping_island = new ISLAND.bsIsland(); // generate island object
//        laserZone_clipping_island.addPathSet(laserZone_pathset); // add pathset as new island
//        
//        let laserZoneHatch = allHatches.clone(); // clone overall hatching
//        let laserZoneHatchOutside = allHatches.clone(); // clone overall hatching
//        //tempTileHatch.makeEmpty(); // empty the container to refill it later
//         
//        laserZoneHatch.clip(laserZone_clipping_island,true); // clip the hatching with the tile_islands
//        laserZoneHatchOutside.clip(laserZone_clipping_island,false); // get outside of currentzone
//         
// //       let clippingHatch = tempTileHatch.clone();                    
// //       laserZoneHatch = ClipHatchByRect(clippingHatch,laserZonePoints);
// //       laserZoneHatchOutside = ClipHatchByRect(clippingHatch,laserZonePoints,false);
// //       tempTileHatch.clear();
//             
//       //laserZoneHatchOutside=ClipHatchByRect(clippingHatch,laserZonePoints,false);
//       //assign laser index
//       laserZoneHatch.setAttributeInt('laser_index_' + (curLaserId), 1);
//        
// 
//         laserAssignedHatches = laserZoneHatch.clone();
//         laserAssignedHatches.moveDataFrom(laserZoneHatchOutside);      
//       } // for laser count       
//   }   // all tiles
// 
// }

exports.assignProcessParameters = (bsHatch,bsModel) => {

  const bsidTable = bsModel.getAttribEx('customTable');
  
  let hatchIterator = bsHatch.getHatchBlockIterator();
  
  while(hatchIterator.isValid()){
    
    let thisHatchBlock = hatchIterator.get();
    let bsid = thisHatchBlock.getAttributeInt('bsid');
    
    let thisProcessParameters = bsidTable.find(function (item) {
        return item.bsid === bsid;
    });
    
    thisHatchBlock.setAttributeReal('speed',thisProcessParameters.speed);
    thisHatchBlock.setAttributeReal('power',thisProcessParameters.power);
    thisHatchBlock.setAttributeInt('priority',thisProcessParameters.priority);
    
    hatchIterator.next();
  }
}

//---------------------------------------------------------------------------------------------//
  
exports.defineSharedZones = (bsHatch) => {

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