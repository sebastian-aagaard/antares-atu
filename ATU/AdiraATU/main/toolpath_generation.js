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
exports.getHatchAngle = function(nLayerNr) {
  let hatch_angle_init = PARAM.getParamReal("exposure", "hatch_angle_init");
  let hatch_angle_increment =  PARAM.getParamReal("exposure", "hatch_angle_increment");
  
  let hatchAngle = (hatch_angle_init + (nLayerNr * hatch_angle_increment)) % 360;
  
  // if the angle falls in the 1st or 2nd quadrant, move it to the 3rd or 4th
  //this ensures that the hatching is always against the gas flow
  if (hatchAngle >= 0.0 && hatchAngle <= 180.0){     
    hatchAngle += 180.0;
    }
  
  return hatchAngle;
};

// Generates offset and return the offset Island (bsIsland()) and the border (bsHatch()) 

const generateOffset = function (islandObj,offset) {
  
      var offsetIsland = new ISLAND.bsIsland(); 
      var borderHatch = new HATCH.bsHatch();
      
      islandObj.createOffset(offsetIsland, -offset);   
      offsetIsland.borderToHatch(borderHatch);
      return {
        'offsetIsland' : offsetIsland,
        'borderHatch' : borderHatch
      };
}

/** --- Get Blocked Path --- //
   thisModel @bsModel 
   island @bsIsland
   islandId @integer

   returns blockedPath @bsHatch() **/

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
 
  // CREATE HATCH CONTAINERS
  let allContourHatch = new HATCH.bsHatch();
  let allHatch = new HATCH.bsHatch();
  let allDownSkinHatch = new HATCH.bsHatch();
  let allDownSkinContourHatch = new HATCH.bsHatch();
  let allSupportHatch = new HATCH.bsHatch();
  let allSupportContourHatch = new HATCH.bsHatch();
  
  //find this layer hatch angle
  const hatchAngle = exports.getHatchAngle(nLayerNr);
    
  //determine if the island is support or part  
  let is_part = MODEL.nSubtypePart == island_it.getModelSubtype();
  let is_support = MODEL.nSubtypeSupport == island_it.getModelSubtype();
  
  //retrieve current island
  let thisIsland = island_it.getIsland().clone(); 
  
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
  
  }
     
  // create borders, and decrease size of bulkIsland
  let { allBorderHatch , bulkIsland } = makeBorders(thisIsland);
  
  // sort borders
  
  sortBorders(allBorderHatch);
  
  
  if (!allBorderHatch || !bulkIsland) {
    throw new Error('Layer: ' + nLayerNr + ' IslandID: ' + islandId + '. Failed to create borders or modify the island.');
  }
    
  // sort Borders  
  
  //let islandBorderClipper = generateOffset(islandOffset,0.0004).offsetIsland;
  
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

        let hatchingArgs = {
         "fHatchDensity" : PARAM.getParamReal("downskin", "down_skin_hdens"),
         "fHatchAngle" : hatchAngle,
         "nCycles" : 1,
         "fCollinearBorderSnapTol" : 0.0,
         "fBlocksortRunAheadLimit": 2.0,
         "hatchOrigin" : {x: 0.0, y: 0.0},
         "blocksortVec" : {x: 0.0, y: -1.0},
         "nFlags" : HATCH.nHatchFlagAlternating | 
          HATCH.nHatchFlagBlocksortEnhanced |
          HATCH.nHatchFlagFlexDensity
        }; 
       
        let downSkinBulkIsland = bulkIsland.clone();
        downSkinBulkIsland.intersect(down_skin_island);
        
        // down skin hatching
        let downSkin_hatch = new HATCH.bsHatch();
        downSkinBulkIsland.hatchExt2(downSkin_hatch,hatchingArgs);
        
        //assign type designation
        downSkin_hatch.setAttributeInt('type',CONST.typeDesignations.downskin_hatch.value);
        downSkin_hatch.setAttributeInt('islandId',islandId);
        
       allDownSkinHatch.moveDataFrom(downSkin_hatch);  // move down skin hatch to results  
        
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
      
      //make stripes 
      let bulkStripeIslands = createStripes(partBulkIsland,nLayerNr);
      
      let hatchingArgs = {
         "fHatchDensity" : PARAM.getParamReal('exposure', '_hdens'),
         "fHatchAngle" : hatchAngle,
         "nCycles" : 1,
         "fCollinearBorderSnapTol" : 0.0,
         "fBlocksortRunAheadLimit": 2.0,
         "hatchOrigin" : {x: 0.0, y: 0.0},
         "blocksortVec" : {x: 0.0, y: -1.0},
         "nFlags" : HATCH.nHatchFlagAlternating | 
          HATCH.nHatchFlagBlocksortEnhanced |
          HATCH.nHatchFlagFixedOrigin
        };             

      // Hatching stripes
      let fill_hatch = new HATCH.bsHatch();
      bulkStripeIslands.hatchExt2(fill_hatch,hatchingArgs);
   
      fill_hatch.setAttributeInt('type',CONST.typeDesignations.part_hatch.value);
      fill_hatch.setAttributeInt('islandId',islandId);            
                    
      allHatch.moveDataFrom(fill_hatch);
    }
    
  } else { // is support
    
    if(PARAM.getParamInt('support','supportContourToogle')){
    let supportBorderHatch = new HATCH.bsHatch();  
    thisIsland.borderToHatch(supportBorderHatch);

    supportBorderHatch.setAttributeInt('type',CONST.typeDesignations.support_contour.value);
    supportBorderHatch.setAttributeInt('islandId',islandId);
    allSupportContourHatch.moveDataFrom(supportBorderHatch);
    }
    
    let hatchingArgs = {
         "fHatchDensity" : PARAM.getParamReal('support','support_hdens'),
         "fHatchAngle" : hatchAngle,  
         "nCycles" : 1,
         "fCollinearBorderSnapTol" : 0.0,
         "fBlocksortRunAheadLimit": 2.0,
         "hatchOrigin" : {x: 0.0, y: 0.0},
         "blocksortVec" : {x: 0.0, y: -1.0},
         "nFlags" : HATCH.nHatchFlagAlternating | 
          HATCH.nHatchFlagBlocksortEnhanced |
          HATCH.nHatchFlagFlexDensity
        };              
    
    let supportBulk = generateOffset(thisIsland,beam_compensation).offsetIsland;
    var support_hatch = new HATCH.bsHatch();
    supportBulk.hatchExt2(support_hatch,hatchingArgs);
      
    support_hatch.setAttributeInt('type',CONST.typeDesignations.support_hatch.value);
    support_hatch.setAttributeInt('islandId',islandId);
    allSupportHatch.moveDataFrom(support_hatch);       
  }
  
  return {
        'partHatch' : allHatch,
        'downSkinHatch' :  allDownSkinHatch,
        'downSkinContourHatch' :  allDownSkinContourHatch,
        'contourHatch': allContourHatch,
        'supportHatch': allSupportHatch,
        'supportContourHatch':allSupportContourHatch
      };
}


const sortBorders = (hatchObj) => {

 if (!PARAM.getParamInt('border','bBorderOrderOutsideIn')){
  
   hatchObj.flip(true,false);
   
   };
}

const makeBorders = (islandObj) => {
  
  const numberOfBorders = PARAM.getParamInt('border','nNumberOfBorders');
  const distanceBetweenBorders = PARAM.getParamReal('border','fDistanceBetweenBorders');
  const distanceBorderToHatch = PARAM.getParamReal('border','fDistanceBorderToHatch');
  let allBorderHatch = new HATCH.bsHatch();
  let island = islandObj.clone();
  let offsetIsland = new ISLAND.bsIsland();
  
  
  for (let borderIndex = 1; borderIndex < numberOfBorders+1 ; borderIndex++){
    
    island.borderToHatch(allBorderHatch);
    
    let offsetBorderBy = distanceBetweenBorders;
    
    if(borderIndex == numberOfBorders) offsetBorderBy = distanceBorderToHatch;
    
    island.createOffset(island,-offsetBorderBy);
  
    if(island.isEmpty()) break;
      
  }
                    
return {'allBorderHatch' : allBorderHatch,
        'bulkIsland' : island}
}

exports.getOpenPolyLinesHatch = function (modelData,nLayerNr){
  
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
  
  //process.print(HATCH.nSortFlagShortestPath,HATCH.nSortFlagUseHotSpot,HATCH.nSortFlagFlipOrientation);  
    
  allPolyLineHatch.pathReordering(new VEC2.Vec2(1000,1000),HATCH.nSortFlagShortestPath|HATCH.nSortFlagFlipOrientation|HATCH.nSortFlagUseHotSpot  );

  return allPolyLineHatch;
}  

//=============================================================================

function createStripes(islandObj,nLayerNr) {
  
  let fStripeWidth = PARAM.getParamReal('strategy','fStripeWidth');
  let fMinWidth = PARAM.getParamReal('strategy','fMinWidth');
  let fStripeOverlap = PARAM.getParamReal('strategy','fStripeOverlap');
  let fStripeLength = PARAM.getParamReal('strategy','fStripeLength');
  let fpatternShift = PARAM.getParamReal('strategy','fPatternShift');
  let stripeRefPoint = new VEC2.Vec2(nLayerNr*fpatternShift,0);
  
  let stripeIslands = new ISLAND.bsIsland();
  
  let stripeAngle = exports.getHatchAngle(nLayerNr);
  if (stripeAngle<270) stripeAngle-=180;
  
  islandObj.createStripes(stripeIslands,fStripeWidth,fMinWidth,fStripeOverlap,
    fStripeLength,stripeAngle,stripeRefPoint);

  return stripeIslands;

} //createStripes

//============================================================================

exports.sortHatchByPriority = (allHatches) => {

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
                .sort((a,b) => {
                  let prioA = typePriorityMap.get(a.getAttributeInt('type'));
                  let prioB = typePriorityMap.get(b.getAttributeInt('type'));
                  return prioA - prioB;
                });
                
  allHatches.makeEmpty();
          
  sortedHatches.forEach(hatchBlock => allHatches.addHatchBlock(hatchBlock));             

} //sortHatchByPriority

//============================================================================
