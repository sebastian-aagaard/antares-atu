/************************************************************
 * Toolpath Generation Toolbox
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
const PARAM = requireBuiltin('bsParam');
const MODEL = requireBuiltin('bsModel');
const ISLAND = requireBuiltin('bsIsland');
const HATCH = requireBuiltin('bsHatch');
const CONST = require('main/constants.js');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const VEC2 = requireBuiltin('vec2');

// -------- TOC ---------- //

// getHatchAngle
// generateOffset
// getBlockedPath
// processIslands
// processOpenPolyLines
// createGlobalStripes

// -------- FUNCTIONS -------- //
// Define globally accessible acceptable ranges


const getHatchAngle = function (nLayerNr, hatch_angle_init, hatch_angle_increment) {
  
  let hatchAngle = (hatch_angle_init + nLayerNr * hatch_angle_increment) % 360;

  let toogleRange = nLayerNr % 2 === 0;

  let shiftAcceptableRange = PARAM.getParamInt('strategy','bShiftLimitRange') === 1;

  let acceptableRanges = [];
  
  let limit_1 = PARAM.getParamReal('strategy','fAngleLimit_1a');
  let limit_2 = PARAM.getParamReal('strategy','fAngleLimit_1b');
  
  if(limit_1 > limit_2)
    {process.printError('alpha limit 1 is larger than limit 2')}
  
  let limit_3 = PARAM.getParamReal('strategy','fAngleLimit_2a');
  let limit_4 = PARAM.getParamReal('strategy','fAngleLimit_2b');
  
  if(limit_3 > limit_4)
    {process.printError('beta limit 1 is larger than limit 2')}  
    
  if(shiftAcceptableRange && toogleRange){
    acceptableRanges.push([limit_1,limit_2]);  
    
  } else if (shiftAcceptableRange && !toogleRange) {
    acceptableRanges.push([limit_3,limit_4]);
    
  } else if(!shiftAcceptableRange) {
    acceptableRanges.push([limit_1,limit_2]);  
    acceptableRanges.push([limit_3,limit_4]);   
  }
  

// Normalize the angle to be within 0-360
  if (hatchAngle < 0) {
    hatchAngle += 360;
  }

  // Function to check if an angle is within the acceptable ranges
  function isAcceptable(angle,ranges) {
    for (let i = 0; i < ranges.length; i++) {
      let lower = ranges[i][0];
      let upper = ranges[i][1];
      if (angle >= lower && angle <= upper) {
        return true;
      }
    }
    return false;
  }
  
  let incremententalValue = PARAM.getParamReal('strategy','fSeachIncrements');
  
  if(hatchAngle < 90 || hatchAngle > 270) incremententalValue *=-1;
  let counter = 0;
  
  // Keep adjusting the angle until it is within an acceptable range
  while (!isAcceptable(hatchAngle,acceptableRanges) && counter<20) {
    counter++;
    hatchAngle = (hatchAngle + incremententalValue) % 360; // Increment and recheck
    if(hatchAngle<0) hatchAngle +=360;
  }
  
  return hatchAngle;
}

// Generates offset and return the offset Island (bsIsland()) and the border (bsHatch()) 

const generateOffset = function (islandObj,offset) {
  
      let offsetIsland = new ISLAND.bsIsland(); 
      let borderHatch = new HATCH.bsHatch();
      
      islandObj.createOffset(offsetIsland, -offset);   
      offsetIsland.borderToHatch(borderHatch);
      return {
        'offsetIsland' : offsetIsland,
        'borderHatch' : borderHatch
      };
};

// /** --- Get Blocked Path --- //
//    thisModel @bsModel 
//    island @bsIsland
//    islandId @integer
// 
//    returns blockedPath @bsHatch() **//

exports.getBlockedPathHatch = function(thisModel, island_it, islandId) {
  
  let thisIsland = island_it.getIsland().clone();
  
  // Create hatch container for blockedPath
  let blockedPath = new HATCH.bsHatch();
  
  let beam_compensation = PARAM.getParamReal("border", "fBeamCompensation");
  

  ///////////////////////////////////////////////////////////////////////
  // narrow bridges
  let narrow_bridge = new HATCH.bsHatch();

  thisIsland.createNarrowBridgePolylines(narrow_bridge, -beam_compensation);

  narrow_bridge.setAttributeInt("type", CONST.typeDesignations.open_polyline.value);
  narrow_bridge.setAttributeInt("islandId", islandId);

  blockedPath.moveDataFrom(narrow_bridge);

  /////////////////////////////////////////////////////////////////////

  // narrow appendixes
  let narrow_app = new HATCH.bsHatch();

  thisIsland.createNarrowAppendixPolylines(
    narrow_app,
    -beam_compensation,
    beam_compensation
      );  

  narrow_app.setAttributeInt("type",CONST.typeDesignations.open_polyline.value);       
  narrow_app.setAttributeInt("islandId", islandId);

  blockedPath.moveDataFrom(narrow_app);
  
  return blockedPath;
}  

exports.processIslands = function(thisModel,island_it,nLayerNr,islandId){
  
  // BEAM COMPENSATION
  let beam_compensation = PARAM.getParamReal("border", "fBeamCompensation");
 
  // HatchArguments:
  
  let  hatchingArgs = {
    "fHatchDensity" : undefined,
    "fHatchAngle" : undefined,
    "fBlocksortRunAheadLimit": 5.0,    
    //"fCollinearBorderSnapTol": 0.001,
    "hatchOrigin" : {x: 0.0, y: 0.0},
    "blocksortVec" : {x: 0.0, y: -1.0},
    "nMinBlockSegmentCount" : 15,         
    "nFlags" : 
    HATCH.nHatchFlagAlternating | 
    HATCH.nHatchFlagBlocksortEnhanced |
    HATCH.nHatchFlagFixedOrigin |
    HATCH.nHatchFlagJointIslands
  }; 
  
  // CREATE HATCH CONTAINERS
  let allContourHatch = new HATCH.bsHatch();
  let allHatch = new HATCH.bsHatch();
  let allDownSkinHatch = new HATCH.bsHatch();
  let allDownSkinContourHatch = new HATCH.bsHatch();
  let allSupportHatch = new HATCH.bsHatch();
  let allSupportContourHatch = new HATCH.bsHatch();
  
  //find this layer hatch angle
  const hatchAngle = getHatchAngle(nLayerNr,PARAM.getParamReal("exposure", "hatch_angle_init"),PARAM.getParamReal("exposure", "hatch_angle_increment"));
  
  if(!hatchAngle) {
    process.printError('hatchAngle not defined at layer ' + nLayerNr);
    }
    
  //determine if the island is support or part  
  let is_part = MODEL.nSubtypePart == island_it.getModelSubtype();
  let is_support = MODEL.nSubtypeSupport == island_it.getModelSubtype();
  
  //retrieve current island
  let thisIsland = island_it.getIsland().clone(); 
  let stripeIslands = new ISLAND.bsIsland();
  let returnStripeObj = [];
  
  //model island containers
  let down_skin_island = new ISLAND.bsIsland();
  let part_island = new ISLAND.bsIsland();
    
  // offset islands by beam compensation
  thisIsland.createOffset(thisIsland,-beam_compensation);
 
  //find overhangs
  if(PARAM.getParamInt('downskin','downskintoggle')){
    
    //DOWNSKIN SETTINGS
    let down_skin_surface_angle = PARAM.getParamReal("downskin", "down_skin_surface_angle");
    let down_skin_layer_reference = PARAM.getParamInt("downskin", "down_skin_layer_reference");
    let down_skin_overlap = PARAM.getParamReal("downskin", "down_skin_overlap");
    
    // split into downskin islands and part islands
    thisIsland.splitMultiLayerOverhang(down_skin_surface_angle, down_skin_overlap, down_skin_layer_reference,
    part_island, down_skin_island);
    
  } else {
    
     part_island.copyFrom(thisIsland);
  
  };
     
  // create borders, and decrease size of bulkIsland
  let makeBordersContainer = makeBorders(thisIsland,islandId);
  let allBorderHatch = makeBordersContainer.allBorderHatch;
  let bulkIsland = makeBordersContainer.bulkIsland;
  
  if (!allBorderHatch || !bulkIsland) {
    throw new Error('Layer: ' + nLayerNr + ' IslandID: ' + islandId + '. Failed to create borders or modify the island.');
  }

  //check if the model is part or support and store them.
  if(is_part) {          
              
    if(!down_skin_island.isEmpty())
      {
        
        //retrieve downskin contour borders from all borders
        let downSkinContourHatch = allBorderHatch.clone();
        let larger_down_skin_island = new ISLAND.bsIsland();
        down_skin_island.createOffset(larger_down_skin_island,0.1);
        downSkinContourHatch.clip(larger_down_skin_island,true);  
        
        //remove already assigned borderHatch
        allBorderHatch.clip(larger_down_skin_island,false);
       
        //assign type designation
        downSkinContourHatch.setAttributeInt('type',CONST.typeDesignations.downskin_contour.value);
        downSkinContourHatch.setAttributeInt('islandId',islandId);
        
        // move downskin border to results  
        allDownSkinContourHatch.moveDataFrom(downSkinContourHatch);                         
       
        let downSkinBulkIsland = bulkIsland.clone();
        downSkinBulkIsland.intersect(down_skin_island);
        
        // down skin hatching
        let downSkin_hatch = new HATCH.bsHatch();
        // create stripes
        let downskinBulkStripeIslands = createStripes(downSkinBulkIsland,nLayerNr,hatchAngle);

        // hatch stripes
        hatchingArgs.fHatchDensity = PARAM.getParamReal("downskin", "down_skin_hdens");
        hatchingArgs.fHatchAngle = getHatchAngle(nLayerNr,PARAM.getParamReal('downskin', 'down_skin_hangle'),PARAM.getParamReal('downskin', 'down_skin_hangle_increment'));
        
        hatchStripes(downskinBulkStripeIslands,hatchingArgs,islandId,CONST.typeDesignations.downskin_hatch.value,allDownSkinHatch);
      }

    // not down skin islands
    if(!part_island.isEmpty())
    {
      
      //retrieve contour borders from all borders
      let contourHatch = allBorderHatch.clone();
        
      let larger_part_island = new ISLAND.bsIsland();
      part_island.createOffset(larger_part_island,0.1);

      contourHatch.clip(larger_part_island,true);
      
      //assign type designation
      contourHatch.setAttributeInt('type',CONST.typeDesignations.part_contour.value);
      contourHatch.setAttributeInt('islandId',islandId);
      
      //move border to results
      allContourHatch.moveDataFrom(contourHatch);
       
      //get part islands
      let partBulkIsland = bulkIsland.clone();
      partBulkIsland.intersect(part_island);

      // Hatching stripes
      let fill_hatch = new HATCH.bsHatch();
      
      let bulkStripes = createStripes(partBulkIsland,nLayerNr,hatchAngle);

      hatchingArgs.fHatchDensity = PARAM.getParamReal('exposure', '_hdens');
      hatchingArgs.fHatchAngle = hatchAngle;
        
      hatchStripes(bulkStripes,hatchingArgs,islandId,CONST.typeDesignations.part_hatch.value,allHatch);      
    }
    
  } else { // is support
    
    if(PARAM.getParamInt('support','supportContourToogle')){
    let supportBorderHatch = new HATCH.bsHatch();  
    thisIsland.borderToHatch(supportBorderHatch);

    supportBorderHatch.setAttributeInt('type',CONST.typeDesignations.support_contour.value);
    supportBorderHatch.setAttributeInt('islandId',islandId);
    allSupportContourHatch.moveDataFrom(supportBorderHatch);
    }
    
    let supportBulkIslands = generateOffset(thisIsland,beam_compensation).offsetIsland;
    let supportHatch = new HATCH.bsHatch();
    
    let supportStripeIslands = createStripes(supportBulkIslands,nLayerNr,hatchAngle);

    hatchingArgs.fHatchDensity = PARAM.getParamReal('support','support_hdens');
    hatchingArgs.fHatchAngle = getHatchAngle(nLayerNr,PARAM.getParamReal('support', 'support_hatch_angle_init'),PARAM.getParamReal('support', 'support_hatch_angle_increment'));

    hatchStripes(supportStripeIslands,hatchingArgs,islandId,CONST.typeDesignations.supportHatch.value,allSupportHatch);
  }
  
  
  let resultHatch = new HATCH.bsHatch();
  
  mergeShortLines(allHatch);
  mergeShortLines(allDownSkinHatch);
  mergeShortLines(allSupportHatch);
  
  resultHatch.moveDataFrom(allSupportHatch);
  resultHatch.moveDataFrom(allSupportContourHatch);
  resultHatch.moveDataFrom(allHatch);
  resultHatch.moveDataFrom(allDownSkinHatch);
  resultHatch.moveDataFrom(allContourHatch);
  resultHatch.moveDataFrom(allDownSkinContourHatch);
  
  let stripeAngle = hatchAngle;
 
  return {resultHatch: resultHatch,
          stripeAngle: stripeAngle};
};

const mergeHatchBlocks = function(hatch){
  hatch.mergeHatchBlocks({
    "bConvertToHatchMode": true,
    "bCheckAttributes": true
  });  
};

function hatchStripes(islands,hatchingArgs,islandId,typeInt,resultHatch){
      
      let hatchContainer = new HATCH.bsHatch();
  
      let stripeIslandArrayArray = islands.getIslandArray();
          
      stripeIslandArrayArray.forEach(function(island,index){
        let tempHatch = new HATCH.bsHatch();
        island.hatchExt2(tempHatch,hatchingArgs);        
        tempHatch.setAttributeInt('stripeId',index+1);
        hatchContainer.moveDataFrom(tempHatch);
      });  

      hatchContainer.setAttributeInt('type',typeInt);
      hatchContainer.setAttributeInt('islandId',islandId);            
                    
      resultHatch.moveDataFrom(hatchContainer);
  
  }; 


const mergeShortLines = function(hatch){
  hatch.mergeShortLines(
    hatch, PARAM.getParamReal('shortVectorHandling','vector_lenght_merge_attempt'), PARAM.getParamReal('shortVectorHandling','small_vector_merge_distance'),
    HATCH.nMergeShortLinesFlagOnlyHatchMode
    //| HATCH.nMergeShortLinesFlagAllowSameHatchBlock 
    // |HATCH.nMergeShortLinesFlagAllowDifferentPolylineMode
  );
}


const makeBorders = function(islandObj,islandId){
  
  const numberOfBorders = PARAM.getParamInt('border','nNumberOfBorders');
  const distanceBetweenBorders = PARAM.getParamReal('border','fDistanceBetweenBorders');
  const distanceBorderToHatch = PARAM.getParamReal('border','fDistanceBorderToHatch');
  let allBorderHatch = new HATCH.bsHatch();
  let island = islandObj.clone();
  
  for (let borderIndex = 1; borderIndex < numberOfBorders+1 ; borderIndex++){
    
    let tempBorderHatch = new HATCH.bsHatch();
        
    island.borderToHatch(tempBorderHatch);
    
    let borderIndexAttrib = (!PARAM.getParamInt('border','bBorderOrderOutsideIn')) ? numberOfBorders+1 - borderIndex : borderIndex;
    
    tempBorderHatch.setAttributeInt('borderIndex',borderIndexAttrib);
    tempBorderHatch.setAttributeInt('islandId',islandId);

    allBorderHatch.moveDataFrom(tempBorderHatch)
    
    let offsetBorderBy = distanceBetweenBorders;
    
    if(borderIndex == numberOfBorders) offsetBorderBy = distanceBorderToHatch;
    
    island.createOffset(island,-offsetBorderBy);
  
    if(island.isEmpty()) break;
      
  }
                      
return {'allBorderHatch' : allBorderHatch,
        'bulkIsland' : island}
}

exports.getOpenPolyLinesHatch = function(modelData,nLayerNr){
  
  // process all open polylines on the layer
  // open polylines are usually support/fixtures
 
  let allPolyLineHatch = new HATCH.bsHatch();
  
  var polyline_it = modelData.getFirstLayerPolyline(
    nLayerNr, POLY_IT.nLayerOpenPolylines);
  
    while(polyline_it.isValid()) // check if exists
    {         
      let is_part = MODEL.nSubtypePart == polyline_it.getModelSubtype(); // is it a part
      let is_support = MODEL.nSubtypeSupport == polyline_it.getModelSubtype(); // is it support
      
      let polyline_hatch_paths = new HATCH.bsHatch(); // new container for exposure data
      
      polyline_it.polylineToHatch(polyline_hatch_paths);
      
      if(is_part)
      {      
        // part
        polyline_hatch_paths.setAttributeInt("type", CONST.typeDesignations.open_polyline.value);
      }
      else
      {
        // support/fixtures
        polyline_hatch_paths.setAttributeInt("type", CONST.typeDesignations.support_open_polyline.value);
      }
      
      
      allPolyLineHatch.moveDataFrom(polyline_hatch_paths); // moves polyline_hatch_paths to hatchResult
      
      polyline_it.next(); // looks at next polyline
    }
  
  
  if(!allPolyLineHatch.isEmpty()){
    let polylineBounds = allPolyLineHatch.tryGetBounds2D();
    allPolyLineHatch.pathReordering(new VEC2.Vec2(polylineBounds.maxX,polylineBounds.maxY),HATCH.nSortFlagShortestPath|HATCH.nSortFlagFlipOrientation|HATCH.nSortFlagUseHotSpot);
  }
  
  return allPolyLineHatch;
}  


//============================================================================

function createStripes(islands,nLayerNr,stripeAngle){

  let fpatternShift = PARAM.getParamReal('strategy','fPatternShift');
  let sortStripesFromRight = true;
  if(stripeAngle>270) sortStripesFromRight = false;  
    
  let stripeArgs = {
    "fStripeWidth" : PARAM.getParamReal('strategy','fStripeWidth'),
    "fMinWidth" : PARAM.getParamReal('strategy','fMinWidth'),
    "fStripeOverlap" : PARAM.getParamReal('strategy','fStripeOverlap'),
    "fStripeLength" : PARAM.getParamReal('strategy','fStripeLength'),
    "fStripeAngle": stripeAngle,
    "referencePoint" : new VEC2.Vec2(nLayerNr*fpatternShift,nLayerNr*fpatternShift),
    "bStripeOrderLeft" : sortStripesFromRight
    };
  
  let stripeIslands = new ISLAND.bsIsland();
  islands.createStripesExt(stripeIslands,stripeArgs);
  
  return stripeIslands
};

exports.sortHatchByPriority = function(allHatches){

  const typePriorityMap = new Map([
  [CONST.typeDesignations.open_polyline.value, PARAM.getParamInt('scanning_priority','open_polyline_priority')],
  [CONST.typeDesignations.part_hatch.value, PARAM.getParamInt('scanning_priority','part_hatch_priority')],
  [CONST.typeDesignations.part_contour.value, PARAM.getParamInt('scanning_priority','part_contour_priority')],
  [CONST.typeDesignations.downskin_hatch.value, PARAM.getParamInt('scanning_priority','downskin_hatch_priority')],
  [CONST.typeDesignations.downskin_contour.value, PARAM.getParamInt('scanning_priority','downskin_contour_priority')],
  [CONST.typeDesignations.support_hatch.value, PARAM.getParamInt('scanning_priority','support_hatch_priority')],
  [CONST.typeDesignations.support_contour.value, PARAM.getParamInt('scanning_priority','support_contour_priority')],
  ]);

  let sortedHatches = allHatches.getHatchBlockArray()
                .sort(function(a,b) {
                  let prioA = typePriorityMap.get(a.getAttributeInt('type'));
                  let prioB = typePriorityMap.get(b.getAttributeInt('type'));
                  return prioA - prioB;
                });
                
  allHatches.makeEmpty();
                
  sortedHatches.forEach(function(hatchBlock) {
    allHatches.addHatchBlock(hatchBlock)
  });
}; //sortHatchByPriority