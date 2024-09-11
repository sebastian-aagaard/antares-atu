/************************************************************
 * Laser Designation
 * - defines how the laser workload is distributed among the lasers
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
const ISLAND = requireBuiltin('bsIsland');
const MODEL = requireBuiltin('bsModel');
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

const getLaserDisplayColors = function(){
  
  const l_rnd_gen = new RND.Rand(239803);
  
  const laser_color = [];
   
  const l_col = new Array(CONST.nLaserCount);
  // using the previously defined color scheme for displaying lasers
  l_col[1] = new RGBA.bsColRGBAi(247,4,4,255);  // red
  l_col[2] = new RGBA.bsColRGBAi(72,215,85,255); // green
  l_col[3] = new RGBA.bsColRGBAi(10,8,167,255); // blue
  l_col[4] = new RGBA.bsColRGBAi(249,9,254,255); // purple
  l_col[5] = new RGBA.bsColRGBAi(45,234,238,255); // light blue

  for(let l_laser_nr = 1;l_laser_nr<CONST.nLaserCount+1;l_laser_nr++)
    {
      if (l_laser_nr > 5) {// support for auto generating colors for additional lasers
      l_col[l_laser_nr] = new RGBA.bsColRGBAi(215 - (l_rnd_gen.getNextRandom()*100),
        215 - (l_rnd_gen.getNextRandom()*100),
        215 - (l_rnd_gen.getNextRandom()*100),
        255);  
      } // if
      laser_color[l_laser_nr] = l_col[l_laser_nr];
    } // for
    return laser_color;
};

//---------------------------------------------------------------------------------------------//

// static distributing the lasing zone by 
// finding the midway point of the scanner reach
exports.staticDistribution = function(thisModel,bsModelData,nLayerNr,hatchObj) {
    
  let returnHatch = new HATCH.bsHatch(); // to be returned
    
  let thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  let tileTable = thisLayer.getAttribEx('tileTable');
  let groupedHatchByTileId = UTIL.getGroupedHatchObjectByTileId(hatchObj);
  let xDiv = getScanheadLaserAllocationArrayX(bsModelData);

  Object.entries(groupedHatchByTileId).forEach(function (tileEntry) {
    let tileId = tileEntry[0];
    let tileHatch = tileEntry[1];
   
    let thisTile = tileTable.find(function (tile) {     
     return tile.tileID == tileId;
     });
     
    let thisTileLayout = thisTile.scanhead_outline;
     
    let clip_min_y = thisTileLayout[0].m_coord[1];
    let clip_max_y = thisTileLayout[2].m_coord[1];
    let xTileOffset = thisTileLayout[0].m_coord[0];

    let halfVectorOverlap = PARAM.getParamReal('interface', 'interfaceOverlap')/2;

    for(let laserIndex = 0; laserIndex < CONST.nLaserCount; laserIndex++){ // run trough all laser dedication zones
      
      let clip_min_x = xTileOffset+xDiv[laserIndex]-halfVectorOverlap; // laserZoneOverLap
      let clip_max_x = xTileOffset+xDiv[laserIndex+1]+halfVectorOverlap; //laserZoneOverLap

      // add the corrdinates to vector pointset
      let clipPoints = [
       new VEC2.Vec2(clip_min_x, clip_min_y), //min,min
       new VEC2.Vec2(clip_min_x, clip_max_y), //min,max
       new VEC2.Vec2(clip_max_x, clip_max_y), // max,max
       new VEC2.Vec2(clip_max_x, clip_min_y) // max,min
      ];

      let tileHatchInside = UTIL.ClipHatchByRect(tileHatch,clipPoints,true);
      let tileHatchOutside = UTIL.ClipHatchByRect(tileHatch,clipPoints,false);

      anotateHatchBlocks(tileHatchInside,laserIndex,tileId);

      tileHatch.makeEmpty();

      tileHatch.moveDataFrom(tileHatchInside);
      tileHatch.moveDataFrom(tileHatchOutside);
        
     }
   
  returnHatch.moveDataFrom(tileHatch);
  });

  return returnHatch;
} //fixedLaserWorkload

const removeEmptyHatches = function(tileHatch){
  
  // getHatchBlockArray
  let hatchBlockArray = tileHatch.getHatchBlockArray();

  // remove empty hatches
  let nonEmptyHatches = hatchBlockArray.reduce(function(reducedArray, currentHatch) {         
    if (!currentHatch.isEmpty() && !currentHatch.getAttributeInt('bsid')==0) {
        reducedArray.addHatchBlock(currentHatch);           
    }
    return reducedArray;         
  }, new HATCH.bsHatch());
  
  return nonEmptyHatches
  
  };

const getScanheadLaserAllocationArrayX = function(bsModelData){
  
  let scanheadArray = bsModelData.getTrayAttribEx('scanhead_array'); 

  // get generic tile division based on laser reach
  // take shift in x into consideration only between lasers, outside is not shifted
  let xDiv = [];
  
  for (let i = 0; i<scanheadArray.length+1;i++){
    
      if (i===0) { // if first elements 
        
        xDiv[i] = scanheadArray[i].abs_x_min;
        
      }else if (i === scanheadArray.length) { // if arraylength is reached
        
            xDiv[i] = scanheadArray[i-1].abs_x_max;
        
      } else {
        
      xDiv[i] = (scanheadArray[i-1].x_ref+scanheadArray[i-1].rel_x_max + scanheadArray[i].x_ref + scanheadArray[i].rel_x_min)/2;
        
        } //if else
    } // for  
    
    return xDiv;
};
  
const anotateHatchBlocks = function(tileHatch,laserIndex,curTileId){
    // add bsid attribute to hatchblocks
  let hatchIterator = tileHatch.getHatchBlockIterator();

  while(hatchIterator.isValid()){
   let currHatcBlock = hatchIterator.get();
    
   let tileID = currHatcBlock.getAttributeInt('tileID_3mf');
   
   if(tileID != curTileId){
      hatchIterator.next();
      continue;
     }  
     
   if(PARAM.getParamInt('laserAllocation','laserAssignedToModel') === 0 || PARAM.getParamInt('laserAllocation','laserAssignedToModel') == laserIndex+1){
         
    let prevBsid = currHatcBlock.getAttributeInt('bsid');       

    if(prevBsid > 0){
      let overlappingNumber = +currHatcBlock.getAttributeInt('numberOfOverlappingLasers')
      
        overlappingNumber++;
        
        let overlappingDesignation = 'overlappingLaser_' + overlappingNumber.toString();
        currHatcBlock.setAttributeInt(overlappingDesignation,prevBsid);
        currHatcBlock.setAttributeInt('numberOfOverlappingLasers',overlappingNumber);
      }
    
    let type = currHatcBlock.getAttributeInt('type');
    let bsid = (10 * (laserIndex+1))+type;
    currHatcBlock.setAttributeInt('bsid',bsid); // set attributes      
     
     }
   hatchIterator.next();
  }
};

//---------------------------------------------------------------------------------------------//


exports.assignProcessParameters = function(bsHatch,bsModelData,bsModel,nLayerNr){

  const laser_color = getLaserDisplayColors();

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

//-----------------------------------------------------------------------------------------//

const getDisplayColor = function (type, displayMode, laserId, tileNumber, laser_color) {
    switch (displayMode) {
        case 0:
            return laser_color[laserId].rgba();
        
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

//-----------------------------------------------------------------------------------------//

exports.adjustInterfaceVectorsBetweenLasers = function (hatch) {

  let hatchBlockIterator = hatch.getHatchBlockIterator();
  let resultHatch = new HATCH.bsHatch();

  while (hatchBlockIterator.isValid()) {   
    
    let thisHatchBlock = hatchBlockIterator.get();
    let overlapNumber = thisHatchBlock.getAttributeInt('numberOfOverlappingLasers');
    let borderIndex = thisHatchBlock.getAttributeInt('borderIndex');
    
    if(overlapNumber === 0 || borderIndex > 0) {
      
        resultHatch.addHatchBlock(thisHatchBlock);
      
      } else {
        
        let adjustedHatch = applyLaserInterface(thisHatchBlock);
        
        adjustedHatch.mergeHatchBlocks({
          "bConvertToHatchMode": true,
          "bCheckAttributes": true
        });
        
        resultHatch.moveDataFrom(adjustedHatch);
    }
    
  hatchBlockIterator.next();
    
  };
  
  return resultHatch;
}; // adjustInterfaceVectorsBetweenLasers

//-----------------------------------------------------------------------------------------//

exports.mergeLaserInterfaceVectors = function(hatch){
   
  let returnHatch = new HATCH.bsHatch();
  let mergeHatchContainer = new HATCH.bsHatch();

  let groupedHatchObjectTileTypeBsid = getGroupedHatchObjectByTileTypeBsid(hatch);
  
  Object.entries(groupedHatchObjectTileTypeBsid).forEach(function(entryTile) {
    let tileKey = entryTile[0];
    let tile = entryTile[1];
    
    Object.entries(tile).forEach(function(entryType) {
      let type = +entryType[0];
      let typeGroup = entryType[1];
      
      Object.entries(typeGroup).forEach(function(laserEntry) {
        let laserId = laserEntry[0];
        let laserHatch = laserEntry[1];
       
        let mergeHatchContainer = laserHatch.clone(); 
       
        if(type === 1 || type === 3 || type === 5){ //hatch types
              
              mergeHatchContainer.mergeShortLines(
                  mergeHatchContainer,PARAM.getParamReal('exposure','min_vector_lenght'), 0.001,
                  HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
              );
          
        } else {
          
          mergeHatchContainer = UTIL.connectHatchBlocksSetAttributes(mergeHatchContainer);  
          
        }
           
        returnHatch.moveDataFrom(mergeHatchContainer);
        
      });
    });
  });

  return returnHatch;
};

//-----------------------------------------------------------------------------------------//

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

//-----------------------------------------------------------------------------------------//

const applyLaserInterface = function(hatchBlock){
    
  let firstBsid = hatchBlock.getAttributeInt('overlappingLaser_1');
  let secondBsid = hatchBlock.getAttributeInt('bsid');
  let tileID = hatchBlock.getAttributeInt('tileID_3mf');
  let hatchType = hatchBlock.getAttributeInt('type');
  let islandId = hatchBlock.getAttributeInt('islandId');
  let borderIndex = hatchBlock.getAttributeInt('borderIndex');
  let subType = hatchBlock.getModelSubtype();
  
  let overLappingPathSet = new PATH_SET.bsPathSet();

  let firstOverlapPathsSet = new PATH_SET.bsPathSet();
  let secondOverlapPathsSet = new PATH_SET.bsPathSet(); 

  let overlappingHatch = new HATCH.bsHatch();
  overlappingHatch.addHatchBlock(hatchBlock);

  overLappingPathSet.addHatches(overlappingHatch);
  
  overLappingPathSet = UTIL.preDistributeNonFullInterfaceVectors(overLappingPathSet,firstOverlapPathsSet,secondOverlapPathsSet,false);
  
  let shouldVectorsOverlap = UTIL.doesTypeOverlap(hatchType,false);
  
  let fullWidthOverlapPathsetCount = overLappingPathSet.getPathCount();
  
  for(let pathNumber = 0 ; pathNumber < fullWidthOverlapPathsetCount; pathNumber++){
    
    if (pathNumber % 2 !== 0 || shouldVectorsOverlap) {
      firstOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
      }
      
    if (pathNumber % 2 === 0 || shouldVectorsOverlap) {
      secondOverlapPathsSet.addSinglePaths(overLappingPathSet,pathNumber);
    }
  }
  
  UTIL.adjustZipperInterfaceDistance(false,firstOverlapPathsSet,secondOverlapPathsSet,hatchType);

  let firstHatch = new HATCH.bsHatch();
  let secondHatch = new HATCH.bsHatch();

  let addPathArgs = {
     nModelSubtype : subType,
     nOpenPathPolylineMode : POLY_IT.nPolyOpen,
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
  (borderIndex === 0) ? null : adjustedHatch.setAttributeInt('borderIndex',borderIndex);
  
  return adjustedHatch; 
};

//-----------------------------------------------------------------------------------------//

exports.handleContour = function(hatch){
  
  let hatchGroupedByTileType = UTIL.getGroupedHatchObjectByTileType(hatch);
  
  Object.values(hatchGroupedByTileType).forEach(function(tile) {
    
    Object.keys(tile).forEach(function(typeKey){
            
      if(+typeKey === 2 || +typeKey === 4 || +typeKey === 6) {
        
        let contourHatch = tile[typeKey];
        let tem = 0;
        
        }
      });
    });

  };