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
  
exports.storeScannerArrayInTray = function(bsModelData) {

  let scannerArray = [];
  
  for (let i = 0; i < PARAM.getParamInt("scanhead", "laserCount"); i++) {
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
  const laser_count = PARAM.getParamInt("scanhead", "laserCount"); 
  
  const l_col = new Array(laser_count);
  // using the previously defined color scheme for displaying lasers
  l_col[0] = new RGBA.bsColRGBAi(128, 128, 128, 120); // grey for undecided
  l_col[1] = new RGBA.bsColRGBAi(247,4,4,255);  // red
  l_col[2] = new RGBA.bsColRGBAi(72,215,85,255); // green
  l_col[3] = new RGBA.bsColRGBAi(10,8,167,255); // blue
  l_col[4] = new RGBA.bsColRGBAi(249,9,254,255); // purple
  l_col[5] = new RGBA.bsColRGBAi(45,234,238,255); // light blue

  for(let l_laser_nr = 0;l_laser_nr<laser_count+1;l_laser_nr++)
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
exports.staticDistribution = function(bsModelData,hatchObj,thisLayer) {
    
  let tileTable = thisLayer.getAttribEx('tileTable');
  let returnHatch = new HATCH.bsHatch();
  let laserCount = PARAM.getParamInt("scanhead", "laserCount");  
  
  let groupedHatchByTileId = UTIL.getGroupedHatchObjectByTileId(hatchObj);
  let xDiv;
  if(PARAM.getParamStr('laserAssignment', 'assignmentMode') === 'static'){
    xDiv = getScanheadLaserAllocationArrayX(bsModelData);  
  }
  

  Object.entries(groupedHatchByTileId).forEach(function (tileEntry) {
    let tileId = +tileEntry[0];
    let tileHatch = tileEntry[1];
    
    if(tileId === 0){
      return;
      process.printError('invalid tileId at ' + thisLayer.getLayerZ() + ', tileId: ' + tileId);
    }
    
    let thisTile = tileTable.find(function (tile) {     
     return tile.tileID == tileId;
     });
    
    if(!thisTile) {
      return;
      process.printError('cannot read thisTile.scanhead_outline at ' + thisLayer.getLayerZ() + ', recieved:' + tileId);
      }
    
    let thisTileLayout = thisTile.scanhead_outline;
    let clip_min_y = thisTileLayout[0].m_coord[1];
    let clip_max_y = thisTileLayout[2].m_coord[1];
    let xTileOffset = thisTileLayout[0].m_coord[0];
            
    for(let laserIndex = 0; laserIndex < laserCount; laserIndex++){ // run trough all laser dedication zones
      
      let clip_min_x, clip_max_x;
      
      let assignmentMode = PARAM.getParamStr('laserAssignment', 'assignmentMode');
      let scanner = getScanner(laserIndex+1)

      
      if(PARAM.getParamStr('laserAssignment', 'assignmentMode') === 'static'){
        
        // set clip width, account for overlap
        if(laserIndex === 0){ // if first laser only overlap max x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1];
        } else if (laserIndex === laserCount-1) { // if last laser only overlap min x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1];
        } else { // else overlap both min and max x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1]; 
        }
        
      } else {
        clip_min_x = scanner.abs_x_min;
        clip_max_x = scanner.abs_x_max;
      }
      
      //check if laser allocation zone is outside the preset range
      
      if(scanner.abs_x_min > clip_min_x) {
        clip_min_x = scanner.abs_x_min;
        process.printWarning('laser ' + (laserIndex+1) + " is trying to allocate outside min x limit")
      }; 
      
      if(scanner.abs_x_max < clip_max_x) {
        clip_max_x = scanner.abs_x_max;
        process.printWarning('laser ' + (laserIndex+1) + " is trying to allocate outside max x limit")
      };
      
      //Assign tile offset
      clip_min_x += xTileOffset;
      clip_max_x += xTileOffset;
      
      // add the corrdinates to vector pointset
      let clipPoints = [
       new VEC2.Vec2(clip_min_x, clip_min_y), //min,min
       new VEC2.Vec2(clip_min_x, clip_max_y), //min,max
       new VEC2.Vec2(clip_max_x, clip_max_y), // max,max
       new VEC2.Vec2(clip_max_x, clip_min_y) // max,min
      ];

      let tileHatchInside = UTIL.ClipHatchByRect(tileHatch,clipPoints,true);
      let tileHatchOutside = UTIL.ClipHatchByRect(tileHatch,clipPoints,false);

      anotateHatchBlocks(tileHatchInside,laserIndex+1,tileId,thisLayer,bsModelData); 
      
      
      thisTile.laserClipPoints[laserIndex] = {xmin : clip_min_x,
                                         xmax : clip_max_x,
                                         ymin : clip_min_y,
                                         ymax : clip_max_y};

      tileHatch.makeEmpty();

      tileHatch.moveDataFrom(tileHatchInside);
      tileHatch.moveDataFrom(tileHatchOutside);
        
     }
        
    thisLayer.setAttribEx('tileTable',tileTable);    

    tileHatch = removeEmptyHatches(tileHatch);   
     
    returnHatch.moveDataFrom(tileHatch);     
  });

  return returnHatch;
} //fixedLaserWorkload

exports.staticDistributionKeepVectors = function(bsModelData,hatchObj,thisLayer) {
    
  let tileTable = thisLayer.getAttribEx('tileTable');
  let returnHatch = new HATCH.bsHatch();
  let laserCount = PARAM.getParamInt("scanhead", "laserCount");  
  let layerHeight_mm = thisLayer.getLayerZ()/1000;  
  
  let groupedHatchByTileId = UTIL.getGroupedHatchObjectByTileId(hatchObj);
  hatchObj.makeEmpty();
  
  let xDiv;
  if(PARAM.getParamStr('laserAssignment', 'assignmentMode') === 'static'){
    xDiv = getScanheadLaserAllocationArrayX(bsModelData);  
  }

  Object.entries(groupedHatchByTileId).forEach(function (tileEntry) {
    let tileId = +tileEntry[0];
    let tileHatch = tileEntry[1];
    
    if(tileId === 0){
      return;
      process.printError('invalid tileId at ' + thisLayer.getLayerZ() + ', tileId: ' + tileId);
    }
    
    let thisTile = tileTable.find(function (tile) {     
     return tile.tileID == tileId;
     });
    
    if(!thisTile) {
      process.printError('cannot read thisTile.scanhead_outline at ' + thisLayer.getLayerZ() + ', recieved:' + tileId);
      return;
      }
    
    let thisTileLayout = thisTile.scanhead_outline;
    let clip_min_y = thisTileLayout[0].m_coord[1];
    let clip_max_y = thisTileLayout[2].m_coord[1];
    let xTileOffset = thisTileLayout[0].m_coord[0];
            
    for(let laserIndex = 0; laserIndex < laserCount; laserIndex++){ // run trough all laser dedication zones
      
      let clip_min_x, clip_max_x;
      
      let assignmentMode = PARAM.getParamStr('laserAssignment', 'assignmentMode');
      let scanner = getScanner(laserIndex+1)

      
      if(PARAM.getParamStr('laserAssignment', 'assignmentMode') === 'static'){
        
        // set clip width, account for overlap
        if(laserIndex === 0){ // if first laser only overlap max x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1];
        } else if (laserIndex === laserCount-1) { // if last laser only overlap min x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1];
        } else { // else overlap both min and max x
          clip_min_x = xDiv[laserIndex];
          clip_max_x = xDiv[laserIndex+1]; 
        }
        
      } else {
        clip_min_x = scanner.abs_x_min;
        clip_max_x = scanner.abs_x_max;
      }
      
      //check if laser allocation zone is outside the preset range
      if(scanner.abs_x_min > clip_min_x) {
        clip_min_x = scanner.abs_x_min;
        process.printWarning('laser ' + (laserIndex+1) + " is trying to allocate outside min x limit")
      }; 
      
      if(scanner.abs_x_max < clip_max_x) {
        clip_max_x = scanner.abs_x_max;
        process.printWarning('laser ' + (laserIndex+1) + " is trying to allocate outside max x limit")
      };
      
      //Assign tile offset
      clip_min_x += xTileOffset;
      clip_max_x += xTileOffset;
      
      // add the corrdinates to vector pointset
      let clipPoints = [
       new VEC2.Vec2(clip_min_x, clip_min_y), //min,min
       new VEC2.Vec2(clip_min_x, clip_max_y), //min,max
       new VEC2.Vec2(clip_max_x, clip_max_y), // max,max
       new VEC2.Vec2(clip_max_x, clip_min_y) // max,min
      ];

      let insideHatchHorizontal = new HATCH.bsHatch();
      let tileHatchOutside = new HATCH.bsHatch();
      let tileHatchInside = new HATCH.bsHatch();

      tileHatch.axisFilter(insideHatchHorizontal,tileHatchOutside,HATCH.nAxisY,clip_min_y,clip_max_y,layerHeight_mm);
      insideHatchHorizontal.axisFilter(tileHatchInside,tileHatchOutside,HATCH.nAxisX,clip_min_x,clip_max_x,layerHeight_mm);

      anotateHatchBlocks(tileHatchInside,laserIndex+1,tileId,thisLayer,bsModelData); 
      
      thisTile.laserClipPoints[laserIndex] = {xmin : clip_min_x,
                                         xmax : clip_max_x,
                                         ymin : clip_min_y,
                                         ymax : clip_max_y};

      tileHatch.makeEmpty();
      tileHatch.moveDataFrom(tileHatchInside);
      tileHatch.moveDataFrom(tileHatchOutside);
        
     }
        
    thisLayer.setAttribEx('tileTable',tileTable);    

    tileHatch = removeEmptyHatches(tileHatch);   
    hatchObj.moveDataFrom(tileHatch);     
  });

  return hatchObj;
} //staticDistributionKeepVectors

const anotateHatchBlocks = function(tileHatch, laserIndex, curTileId, thisLayer,modelData) {
    // add bsid attribute to hatch blocks
    let hatchIterator = tileHatch.getHatchBlockIterator();

    while (hatchIterator.isValid()) {
        let currHatchBlock = hatchIterator.get(); // Fixed typo in currHatcBlock
        
        let tileID = currHatchBlock.getAttributeInt('tileID_3mf');
        let modelIndex = currHatchBlock.getAttributeInt('modelIndex');
        let processedByLaser = Number(modelData.getModel(modelIndex).getAttrib('processedByLaser'));
        // Check if laser is assigned to the model or to the specific laserIndex
        if (processedByLaser === 0 || 
            processedByLaser === laserIndex) {
            
            let prevBsid = currHatchBlock.getAttributeInt('bsid');

            if (prevBsid > 0) {
              
                let overlapCount = currHatchBlock.getAttributeInt('overlapLaserCount');
                
                overlapCount++;
                
                let overlappingDesignation = 'overlappingLaser_' + overlapCount.toString();
                currHatchBlock.setAttributeInt(overlappingDesignation, prevBsid);
                currHatchBlock.setAttributeInt('overlapLaserCount', overlapCount);
            }
            
            // Set bsid based on laserIndex and type
            let type = currHatchBlock.getAttributeInt('type');
            let bsid = (10 * laserIndex) + type;
            currHatchBlock.setAttributeInt('bsid', bsid); // set attributes
            
            if(bsid == 0){
               process.printError('Error in assigning bsid to tile: ' + curTileId + ' at ' + thisLayer.getLayerZ() + 
                                   ' type: ' + type + ' bsid: ' + bsid + ' laserIndex: ' + laserIndex);
              };
            
            if (!type || !bsid || !laserIndex) {
                process.printError('Error in assigning bsid to tile: ' + curTileId + ' at ' + thisLayer.getLayerZ() + 
                                   ' type: ' + type + ' bsid: ' + bsid + ' laserIndex: ' + laserIndex);
            }
        }
        hatchIterator.next();  // Move to the next hatch block
    }
};


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
  
//---------------------------------------------------------------------------------------------//


exports.assignProcessParameters = function(bsHatch,modelData,nLayerNr,modelLayer){

  const laser_color = getLaserDisplayColors();
  
  let hatchIterator = bsHatch.getHatchBlockIterator();
  
  while(hatchIterator.isValid()){
    
    let thisHatchBlock = hatchIterator.get();
    let bsid = thisHatchBlock.getAttributeInt('bsid');
    let laserId = Math.floor(bsid/10);
    let doesItOverlap = thisHatchBlock.getAttributeInt('overlapLaserCount') != 0;
    let type = thisHatchBlock.getAttributeInt('type');
    let tileNumber = thisHatchBlock.getAttributeInt('tileID_3mf') % 1000;
    
    if(!bsid){
      hatchIterator.next();
      continue;
      throw new Error('bsid undefined: at layer nr '+nLayerNr + ' tileId: ' +thisHatchBlock.getAttributeInt('tileID_3mf') + '/ type: ' + type);
      };
    
    let modelIndex = thisHatchBlock.getAttributeInt('modelIndex');
    let model = modelData.getModel(modelIndex);
    let customTable = model.getAttribEx('customTable');
      
    let thisProcessParameters = customTable.find(function (item) {
        return item.bsid === bsid;
    });
    
    if(thisProcessParameters===undefined){
      throw new Error('cannot read process parameters: at layer nr '+nLayerNr + ' tileId: ' +thisHatchBlock.getAttributeInt('tileID_3mf') + '/ type: ' + type + '/ bsid:' + bsid);
      };
    
    let tileArray = modelLayer.getAttribEx('tileTable');
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
    const colorToSet = getDisplayColor(type, displayMode, laserId, tileNumber,laser_color, doesItOverlap);

    if (colorToSet) {
        thisHatchBlock.setAttributeInt('_disp_color', colorToSet);
    };

    hatchIterator.next();
  }
}; // assignProcessParameters

//-----------------------------------------------------------------------------------------//

const getDisplayColor = function (type, displayMode, laserId, tileNumber, laser_color, doesItOverlap) {
    
    switch (displayMode) {
        case 0:
            return doesItOverlap ? laser_color[0].rgba() : laser_color[laserId].rgba();
        
        case 1:
            return UTIL.findColorFromType(type).color1.rgba();
        
        case 2:
            const colorData = UTIL.findColorFromType(type);
            let color = (tileNumber % 2 === 0) ? colorData.color2 : colorData.color1;
            color.a(255 * (laserId / PARAM.getParamInt("scanhead", "laserCount")));
            return color.rgba();
        
        default:
            process.printWarning('Unexpected displayMode:', displayMode);
            return null;  // or a default color if appropriate
    }
}; // getDisplayColor

//-----------------------------------------------------------------------------------------//

exports.mergeShortLinesForEachBsid = function(hatch){
  
  let returnHatch = new HATCH.bsHatch();
  let groupedHatches = UTIL.getGroupedHatchObjectByTileTypeLaserId(hatch);
  
  Object.values(groupedHatches).forEach(function(tiles){
    Object.entries(tiles).forEach(function(typeEntry){
      let type = typeEntry[0];
      let typeGroup = typeEntry[1];
      
      Object.values(typeGroup).forEach(function(laserIdHatch){
      
      if(type == 1 || type == 3 || type == 5){ //hatch types  
        
        laserIdHatch.mergeShortLines(
                  laserIdHatch,PARAM.getParamReal('shortVectorHandling','vector_lenght_merge_attempt'),PARAM.getParamReal("shortVectorHandling", "small_vector_merge_distance") ,
                  HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagOnlyHatchMode
                  );
      }
      
      returnHatch.moveDataFrom(laserIdHatch);
      
      });
    });
  });
  
  return returnHatch;
  };
  
//-----------------------------------------------------------------------------------------//

exports.adjustHatchBlockAssignment = function(allHatches,modelLayer){
  
  let hatchBlockIterator = allHatches.getHatchBlockIterator();
  let tileTable = modelLayer.getAttribEx('tileTable');

  while(hatchBlockIterator.isValid()){
    
    let thisHatchBlock = hatchBlockIterator.get();
    let tileId = thisHatchBlock.getAttributeInt('tileID_3mf');
    let overlapLaserCount = thisHatchBlock.getAttributeInt('overlapLaserCount');
    let overLapTileCount = thisHatchBlock.getAttributeInt('overlapCount');
    
    let thisTile = tileTable.find(function (tile) {     
      return tile.tileID == tileId;
    });
          
    if(overLapTileCount != 0){
      
      let bounds = thisHatchBlock.tryGetBounds2D();
      if (!bounds) throw new Error('could not retrieve bound2D object from hatch block');
      
      let tileBounds = thisTile.clipPoints;
      
      if(bounds.minX < tileBounds.xmin || bounds.maxX > tileBounds.xmax || bounds.minY < tileBounds.ymin || bounds.maxY > tileBounds.ymax){
        
        thisHatchBlock.removeAttributes('tileID_3mf');
        updateTileDesignation(thisHatchBlock,tileTable);
        
      }
    }
    
    hatchBlockIterator.next();
    }
  
}; //adjustHatchBlockAssignment  

const updateTileDesignation = function(hatchBlock,tileTable){
  
  let overlapCount = hatchBlock.getAttributeInt("overlapCount");
  let hatchBlockBounds = hatchBlock.tryGetBounds2D();
  if (!hatchBlockBounds) throw new Error('could not retrieve bound2D object from hatch block');

  
  for(let i=1; i < overlapCount+1; i++){
    let tileId = hatchBlock.getAttributeInt('overlappingTile_' + i);
    let thisTile = tileTable.find(function (tile) {     
      return tile.tileID == tileId;
    });
    let tileBounds = thisTile.clipPoints;
    
    if(isBoundsInside(hatchBlockBounds,tileBounds)){
      hatchBlock.setAttributeInt('tileID_3mf',tileId);
      hatchBlock.removeAttributes('overlapCount');
      hatchBlock.removeAttributes('overlappingTile_' + i);
      return;
    };
  };
  
  process.printWarning('could not fully assign this hatchblock')
};

const isBoundsInside = function(bounds,tileBounds){
       
  if(bounds.minX < tileBounds.xmin || bounds.maxX > tileBounds.xmax || bounds.minY < tileBounds.ymin || bounds.maxY > tileBounds.ymax){
    return false
    }
    
  return true;
};

