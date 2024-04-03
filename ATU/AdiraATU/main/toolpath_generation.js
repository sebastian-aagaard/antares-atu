/************************************************************
 * Toolpath Generation Toolbox
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
var PARAM = requireBuiltin('bsParam');
var MODEL = requireBuiltin('bsModel');
var ISLAND = requireBuiltin('bsIsland');
var HATCH = requireBuiltin('bsHatch');
var CONST = require('main/constants.js');
var POLY_IT = requireBuiltin('bsPolylineIterator');
var VEC2 = requireBuiltin('vec2');

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

exports.generateOffset = function (islandObj,offset) {
  
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
  
  let beam_compensation = PARAM.getParamReal("exposure", "beam_compensation");
  
  let contour_param = thisModel.getAttribEx('contour');
    let border_power = contour_param.power_watt;
    let border_speed = contour_param.markspeed;
    let border_defocus = contour_param.defocus;  
  
  ///////////////////////////////////////////////////////////////////////
  // narrow bridges
  let narrow_bridge = new HATCH.bsHatch();

  thisIsland.createNarrowBridgePolylines(narrow_bridge, -beam_compensation);

  narrow_bridge.setAttributeInt("type", CONST.nType_openPolyline);
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

  narrow_app.setAttributeInt("type",CONST.nType_openPolyline);       
  narrow_app.setAttributeInt("islandId", islandId);

  blockedPath.moveDataFrom(narrow_app);
  
  return blockedPath;
}  

exports.processIslands = function(thisModel,island_it,nLayerNr,islandId){
  
  // DOWNSKIN SETTINGS
  let down_skin_surface_angle = PARAM.getParamReal("downskin", "down_skin_surface_angle");
  let down_skin_layer_reference = PARAM.getParamInt("downskin", "down_skin_layer_reference");
  let down_skin_hatch_density = PARAM.getParamReal("downskin", "down_skin_hdens");
  let down_skin_overlap = PARAM.getParamReal("downskin", "down_skin_overlap");
  
  // BEAM COMPENSATION
  let beam_compensation = PARAM.getParamReal("exposure", "beam_compensation");
 
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
  let  thisIsland = island_it.getIsland().clone(); 
  
  // offset islands
  let islandOffset = exports.generateOffset(thisIsland,beam_compensation).offsetIsland;
  let fillIsland = exports.generateOffset(thisIsland,beam_compensation*2).offsetIsland;
  let islandContourHatch = new HATCH.bsHatch();
  islandOffset.borderToHatch(islandContourHatch);
  let islandBorderClipper = exports.generateOffset(islandOffset,0.0004).offsetIsland;
  
  //check if the model is part or support and store them.
  if(is_part)
   {          
              
    //find down skin area
    let down_skin_island = new ISLAND.bsIsland();
    let not_down_skin_island = new ISLAND.bsIsland();
    let down_skin_island_no_overhang = new ISLAND.bsIsland();
    
    // find overhangs
    if(PARAM.getParamInt('downskin','downskintoggle')){
      
      // split into downskin and not_downskins
      islandOffset.splitMultiLayerOverhang(down_skin_surface_angle, down_skin_overlap, down_skin_layer_reference,
      not_down_skin_island, down_skin_island,down_skin_island_no_overhang);
      
    } else {
      
       not_down_skin_island.copyFrom(islandOffset);
    
    }
    
    if(!down_skin_island.isEmpty())
      {
        
        let downSkinbulkIsland = exports.generateOffset(down_skin_island,beam_compensation).offsetIsland;
        
        let downSkinContourHatch = new HATCH.bsHatch(); 
        down_skin_island.borderToHatch(downSkinContourHatch);
        
        downSkinContourHatch.setAttributeInt('type',CONST.nType_downskin_contour);
        downSkinContourHatch.setAttributeInt('islandId',islandId);
        
        downSkinContourHatch.clip(islandBorderClipper,false);   
        allDownSkinContourHatch.moveDataFrom(downSkinContourHatch); // move downskin border to results                          

          let hatchingArgs = {
         "fHatchDensity" : down_skin_hatch_density,
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
       
        // down skin hatching
        var downSkin_hatch = new HATCH.bsHatch();
        downSkinbulkIsland.hatchExt2(downSkin_hatch,hatchingArgs);
  
        downSkin_hatch.setAttributeInt('type',CONST.nType_downskin_hatch);
        downSkin_hatch.setAttributeInt('islandId',islandId);    
        allDownSkinHatch.moveDataFrom(downSkin_hatch);  // move down skin hatch to results  
        
      }

    // not down skin islands
    if(!not_down_skin_island.isEmpty())
    {
      
      let contourHatch = new HATCH.bsHatch();
      let downskinContourClipper = exports.generateOffset(down_skin_island,-0.0005).offsetIsland;
      islandOffset.borderToHatch(contourHatch); // temp solutions        

      contourHatch.setAttributeInt('type',CONST.nType_downskin_contour);
      contourHatch.setAttributeInt('islandId',islandId);
      
      contourHatch.clip(downskinContourClipper,false);// WIP this clip splits it between different scanners
      allDownSkinContourHatch.moveDataFrom(contourHatch);
                 
      let bulkIsland = exports.generateOffset(not_down_skin_island,beam_compensation).offsetIsland;    
      
      //make stripes 
      let bulkStripeIslands = createStripes(bulkIsland,nLayerNr);
      
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
   
      fill_hatch.setAttributeInt('type',CONST.nType_part_hatch);
      fill_hatch.setAttributeInt('islandId',islandId);            
                    
      allHatch.moveDataFrom(fill_hatch);
    }
    
  } else { // is support
    
    if(PARAM.getParamInt('support','param_supportContourToogle')){
    let supportBorderHatch = new HATCH.bsHatch();  
    islandOffset.borderToHatch(supportBorderHatch);

    supportBorderHatch.setAttributeInt('type',CONST.nType_support_contour);
    supportBorderHatch.setAttributeInt('islandId',islandId);
    allSupportContourHatch.moveDataFrom(supportBorderHatch);
    }
    
    let hatchingArgs = {
         "fHatchDensity" : support_hatch_density,
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
    
    let supportBulk = generateOffset(islandOffset,beam_compensation).offsetIsland;
    var support_hatch = new HATCH.bsHatch();
    supportBulk.hatchExt2(support_hatch,hatchingArgs);
      
    support_hatch.setAttributeInt('type',CONST.nType_support_hatch);
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

exports.getOpenPolyLinesHatch = function (modelData,nLayerNr){
  
  // process all open polylines on the layer
  // open polylines are usually support/fixtures
 
  let allPolyLineHatch = new HATCH.bsHatch();
  
  var polyline_it = modelData.getFirstLayerPolyline(
    nLayerNr, POLY_IT.nLayerOpenPolylines);
  
  if (!CONST.bDrawTile){
    while(polyline_it.isValid()) // check if exists
    {         
      let is_part = MODEL.nSubtypePart == polyline_it.getModelSubtype(); // is it a part
      let is_support = MODEL.nSubtypeSupport == polyline_it.getModelSubtype(); // is it support
      
      let polyline_hatch_paths = new HATCH.bsHatch(); // new container for exposure data
      
      polyline_it.polylineToHatch(polyline_hatch_paths);
      
      if(is_part)
      {      
        // part
        polyline_hatch_paths.setAttributeInt("type", CONST.nType_openPolyline);
      }
      else
      {
        // support/fixtures
        polyline_hatch_paths.setAttributeInt("type", CONST.nType_openPolyline);
      }
      
      allPolyLineHatch.moveDataFrom(polyline_hatch_paths); // moves polyline_hatch_paths to hatchResult
      
      polyline_it.next(); // looks at next polyline
    }
  }
  
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

//=============================================================================