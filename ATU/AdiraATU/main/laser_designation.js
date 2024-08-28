/************************************************************
 * Laser Designation
 * - defines how the laser workload is distributed among the lasers
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const PARAM = requireBuiltin('bsParam');
const VEC2 = requireBuiltin('vec2');
const PATH_SET = requireBuiltin('bsPathSet');
const RND = requireBuiltin('random');
const RGBA = requireBuiltin('bsColRGBAi');
const POLY_IT = requireBuiltin('bsPolylineIterator');

// -------- SCRIPT INCLUDES -------- //
const UTIL = require('main/utility_functions.js');
const CONST = require('main/constants.js');

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
  l_col[1] = new RGBA.bsColRGBAi(247,4,4,255);  // red
  l_col[2] = new RGBA.bsColRGBAi(72,215,85,255); // green
  l_col[3] = new RGBA.bsColRGBAi(10,8,167,255); // blue
  l_col[4] = new RGBA.bsColRGBAi(249,9,254,255); // purple
  l_col[5] = new RGBA.bsColRGBAi(13,250,249,255); // light blue

  for(let l_laser_nr = 1;l_laser_nr<CONST.nLaserCount+1;l_laser_nr++)
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
    
  //get divison of scanfields in x!
  let xDiv = new Array();

  // get generic tile division based on laser reach
  // take shift in x into consideration only between lasers, outside is not shifted
  for (let i = 0; i<scanheadArray.length+1;i++){
    
      if (i==0) { // if first elements 
        
        xDiv[i] = scanheadArray[i].abs_x_min;
        
      }else if (i == scanheadArray.length) { // if arraylength is reached
        
            xDiv[i] = scanheadArray[i-1].abs_x_max;
        
      } else {
        
      xDiv[i] = (scanheadArray[i-1].x_ref+scanheadArray[i-1].rel_x_max + scanheadArray[i].x_ref + scanheadArray[i].rel_x_min)/2;
        
        } //if else
    } // for

 // first get each tile, x laser seperation with overlap.
  
 for (let tileIndex = 0; tileIndex < tileArray.length; tileIndex++){
    let clip_min_y = tileArray[tileIndex].scanhead_outline[0].m_coord[1];
    let clip_max_y = tileArray[tileIndex].scanhead_outline[2].m_coord[1];
    
    let currentTileNr = tileArray[tileIndex].tile_number;
    let currentPassNr = tileArray[tileIndex].passNumber;
       
    let vectorOverlap = PARAM.getParamReal('interface', 'interfaceOverlap'); // used twice
   
    for(let laserIndex = 0; laserIndex<xDiv.length-1; laserIndex++){ // run trough all laser dedication zones
      
      let xTileOffset = tileArray[tileIndex].scanhead_x_coord;
      let clip_min_x = xTileOffset+xDiv[laserIndex]-vectorOverlap/2; // laserZoneOverLap
      let clip_max_x = xTileOffset+xDiv[laserIndex+1]+vectorOverlap/2; //laserZoneOverLap
      
       // add the corrdinates to vector pointset
       let clipPoints = new Array(4);
       clipPoints[0] = new VEC2.Vec2(clip_min_x, clip_min_y); //min,min
       clipPoints[1] = new VEC2.Vec2(clip_min_x, clip_max_y); //min,max
       clipPoints[2] = new VEC2.Vec2(clip_max_x, clip_max_y); // max,max
       clipPoints[3] = new VEC2.Vec2(clip_max_x, clip_min_y); // max,min

       let tileHatch = UTIL.ClipHatchByRect(hatchObj,clipPoints);
       
       // add bsid attribute to hatchblocks
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
                 let bsid = (10 * (laserIndex+1))+type;
                 currHatcBlock.setAttributeInt('bsid',bsid); // set attributes                
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


exports.assignProcessParameters = function(bsHatch,bsModelData,bsModel,nLayerNr){

  const laser_color = bsModelData.getTrayAttribEx('laser_color'); // retrive laser_color 

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
    
    thisHatchBlock.setAttributeReal('speed',thisProcessParameters.speed);
    thisHatchBlock.setAttributeReal('power',thisProcessParameters.power);
    thisHatchBlock.setAttributeInt('priority',thisProcessParameters.priority);
    
    thisHatchBlock.setAttributeReal('xcoord',xcoord);
    thisHatchBlock.setAttributeReal('ycoord',ycoord);
    
    const displayMode = PARAM.getParamInt('display', 'displayColors');
    const colorToSet = getDisplayColor(type, displayMode, laserId, tileNumber,laser_color);

    if (colorToSet) {
        thisHatchBlock.setAttributeInt('_disp_color', colorToSet);
    };

    hatchIterator.next();
  }
}; // assignProcessParameters

const getDisplayColor = function (type, displayMode, laserId, tileNumber, laser_color) {
    switch (displayMode) {
        case 0:
            return laser_color[laserId];
        
        case 1:
            return UTIL.findColorFromType(type).color1.rgba();
        
        case 2:
            const colorData = UTIL.findColorFromType(type);
            let color = (tileNumber % 2 === 0) ? colorData.color2 : colorData.color1;
            color.a(255 * (laserId / CONST.nLaserCount));
            return color.rgba();
        
        default:
            process.printWarning('Unexpected displayMode:', displayMode);
            return null;  // or a default color if appropriate
    }
}; // getDisplayColor

exports.adjustInterfaceVectorsBetweenLasers = function (hatch){
  
  let resultHatch = new HATCH.bsHatch();
  
  let groupedHatchObjectTileTypeBsid = getGroupedHatchObjectByTileTypeBsid(hatch);

  Object.values(groupedHatchObjectTileTypeBsid).forEach(function(tile){
    let adjustedInterFaceHatch
    Object.values(tile).forEach(function(type){
      
      let previousLaserIdBlock = undefined;
      let previousBsid = undefined;
      
      const values = Object.values(type); 
      
      values.forEach(function(laserIdBlock,index){

        if(index === 0){
         previousLaserIdBlock = laserIdBlock;
         previousBsid = laserIdBlock.getHatchBlockArray()[0].getAttributeInt('bsid');
         return;
        };

        let previousBounds = previousLaserIdBlock.getBounds2D();

        // get clipping from bounds2D
        let prevOutline = new Array(4);
        prevOutline[0] = new VEC2.Vec2(previousBounds.minX, previousBounds.minY); //min,min
        prevOutline[1] = new VEC2.Vec2(previousBounds.minX, previousBounds.maxY); //min,max
        prevOutline[2] = new VEC2.Vec2(previousBounds.maxX, previousBounds.maxY); // max,max
        prevOutline[3] = new VEC2.Vec2(previousBounds.maxX, previousBounds.minY); // max,min

        let interfaceHatch = UTIL.ClipHatchByRect(laserIdBlock,prevOutline,true);

        let nextLaserIdBlock = UTIL.ClipHatchByRect(laserIdBlock,prevOutline,false);

        let adjustedInterfaceHatch = applyLaserInterface(interfaceHatch,laserIdBlock,previousBsid);
        
        let currentBounds = laserIdBlock.getBounds2D();
        
         // get clipping from bounds2D
        let currOutline = new Array(4);
        currOutline[0] = new VEC2.Vec2(currentBounds.minX, currentBounds.minY); //min,min
        currOutline[1] = new VEC2.Vec2(currentBounds.minX, currentBounds.maxY); //min,max
        currOutline[2] = new VEC2.Vec2(currentBounds.maxX, currentBounds.maxY); // max,max
        currOutline[3] = new VEC2.Vec2(currentBounds.maxX, currentBounds.minY); // max,min
        
        let previousHatch = UTIL.ClipHatchByRect(previousLaserIdBlock,currOutline,false);
        
        resultHatch.moveDataFrom(previousHatch);
        
        if(adjustedInterfaceHatch!==undefined){
          resultHatch.moveDataFrom(adjustedInterfaceHatch);
        }
        
        if(index === values.length-1) {
          
          resultHatch.moveDataFrom(nextLaserIdBlock);
          return;
          
          };
        
        previousBsid = laserIdBlock.getHatchBlockArray()[0].getAttributeInt('bsid');
        previousLaserIdBlock = nextLaserIdBlock; 
         
      });
    });
  });
  
  return resultHatch;
};//adjustInterfaceVectorsBetweenLasers

exports.mergeLaserInterfaceVectors = function(hatch){
  
  let returnHatch = new HATCH.bsHatch();
  let mergedHatchContainer = new HATCH.bsHatch();

  let groupedHatchObjectTileTypeBsid = getGroupedHatchObjectByTileTypeBsid(hatch);
  
  Object.values(groupedHatchObjectTileTypeBsid).forEach(function(tile){
    Object.values(tile).forEach(function(type){    
      Object.values(type).forEach(function(laserIdBlock,index){
        
        laserIdBlock.mergeShortLines(
                mergedHatchContainer,2, Math.abs(PARAM.getParamReal('interface', 'interfaceOverlap'))+0.001,
                HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode
            );
        
        returnHatch.moveDataFrom(mergedHatchContainer);
        
      });
    });
  });

  return returnHatch;
};

const getGroupedHatchObjectByTileTypeBsid = function(hatch) {
  
  let hatchBlocksArray = hatch.getHatchBlockArray();
  let groupedHatchblocksByBsid = {};

  // Iterate over each hatchblock
  hatchBlocksArray.forEach(function(hatchblock) {
    // Get the tileID and bsid of the current hatchblock
    const tileID = hatchblock.getAttributeInt('tileID_3mf');
    const vectorType = hatchblock.getAttributeInt('type');
    const laserID = Math.floor(hatchblock.getAttributeInt('bsid')/10);

    if (!groupedHatchblocksByBsid[tileID]) {
        groupedHatchblocksByBsid[tileID] = {};
    };
    
    if (!groupedHatchblocksByBsid[tileID][vectorType]) {
        groupedHatchblocksByBsid[tileID][vectorType] = {};
    };

    if (!groupedHatchblocksByBsid[tileID][vectorType][laserID]) {
        groupedHatchblocksByBsid[tileID][vectorType][laserID] = new HATCH.bsHatch();
    };

    groupedHatchblocksByBsid[tileID][vectorType][laserID].addHatchBlock(hatchblock);
  });
  
  return groupedHatchblocksByBsid;
  
};

const applyLaserInterface = function(interfaceHatch,laserIdBlock,previousBsid){
  
  if(interfaceHatch.isEmpty()) return;
  
  let interfaceHatchBlock = interfaceHatch.getHatchBlockArray()[0];
  
  let firstBsid = previousBsid;
  let secondBsid = interfaceHatchBlock.getAttributeInt('bsid');
  
  let tileID = interfaceHatchBlock.getAttributeInt('tileID_3mf');
  let hatchType = interfaceHatchBlock.getAttributeInt('type');
  let islandId = interfaceHatchBlock.getAttributeInt('islandId');
  let subType = interfaceHatchBlock.getModelSubtype();
  let polylineMode = interfaceHatchBlock.getPolylineMode();
  
  let overLappingPathSet = new PATH_SET.bsPathSet();
  
  let firstOverlapPathsSet = new PATH_SET.bsPathSet();
  let secondOverlapPathsSet = new PATH_SET.bsPathSet(); 

  overLappingPathSet.addHatches(interfaceHatch);
  
  let pathCount = overLappingPathSet.getPathCount();
  
  let shouldVectorsOverlap = PARAM.getParamInt('interface','laserInterface') === 0;
  
  for(let pathNumber = 0 ; pathNumber < pathCount; pathNumber++){
    
    if (pathNumber % 2 !== 0 || shouldVectorsOverlap) {
      firstOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      };
      
    if (pathNumber % 2 === 0 || shouldVectorsOverlap) {
      secondOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      
    };
    
    adjustZipperInterfaceDistance(firstOverlapPathsSet,secondOverlapPathsSet);

  };
  
  
  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  let addPathArgs = {
     nModelSubtype : subType,
     nOpenPathPolylineMode : polylineMode,
     nOpenPathTryPolyClosedPolylineModeTol : 0.0,
     nClosedPathPolylineMode : POLY_IT.nPolyClosed,
     bMergePolyHatch : false,
     bTwoPointsPathAsPolyHatch : false
  };

  firstHatch.addPathsExt(firstOverlapPathsSet,addPathArgs);
  secondHatch.addPathsExt(secondOverlapPathsSet,addPathArgs);
  
  firstHatch.setAttributeInt('bsid', firstBsid);
  secondHatch.setAttributeInt('bsid', secondBsid);
    
  let adjustedHatch = new HATCH.bsHatch();

  adjustedHatch.moveDataFrom(firstHatch);
  adjustedHatch.moveDataFrom(secondHatch);
  
  adjustedHatch.setAttributeInt('tileID_3mf',tileID);
  adjustedHatch.setAttributeInt('type',hatchType);
  adjustedHatch.setAttributeInt('islandId',islandId);
  
  return adjustedHatch; 
};

const adjustZipperInterfaceDistance = function(firstPathset,secondPathset){
    
  let firstBounds = firstPathset.getBounds2D();
  let secondBounds = secondPathset.getBounds2D();
  
  UTIL.intersectPathset(firstBounds.minX,firstBounds.maxX,firstBounds.minY,firstBounds.maxY-PARAM.getParamReal('interface', 'distanceBewteenInterfaceVectors'),firstPathset);
  UTIL.intersectPathset(secondBounds.minX,secondBounds.maxX,secondBounds.minY+PARAM.getParamReal('interface', 'distanceBewteenInterfaceVectors'),secondBounds.maxY,secondPathset);

}; //adjustOverlapBetweenIntefaceHatch