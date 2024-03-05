/************************************************************
 * Adira AddCreative Buildstyle
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */

'use strict';

// -------- INCLUDES -------- //
var RND = requireBuiltin('random');
var RGBA = requireBuiltin('bsColRGBAi');
var MODEL = requireBuiltin('bsModel');
var HATCH = requireBuiltin('bsHatch');
var ISLAND = requireBuiltin('bsIsland');
var BOUNDS = requireBuiltin('bsBounds2D');
var PARAM = requireBuiltin('bsParam');
var VEC2 = requireBuiltin('vec2');
var SEG2D = requireBuiltin('seg2d');
var PATH_SET = requireBuiltin('bsPathSet');
var EXPORT_FILTER = requireBuiltin('bsExportFilter');
var POLY_IT = requireBuiltin('bsPolylineIterator');
var EXPOSURETIME = requireBuiltin('bsExposureTime');

var CLI = require('main/export_cli.js');
var LOCALIZER = require('localization/localizer.js');

// -------- CONFIG INCLUDES -------- //
var MACHINE_CONFIG = require('../configuration/machine_declaration.js');
var PARAM_CONFIG = require('../configuration/parameter_declaration.js');
var ATTRIB_CONFIG = require('../configuration/attribute_declaration.js');
var POST_PROCESS = require('main/post_processor.js');

// -------- BUILDSTYLE INCLUDES -------- //
var UTIL = require('main/utility_functions.js');
var TILE = require('main/tileing.js');
var LASER = require('main/laser_designation.js');

// -------- CONSTANTS -------- //

//  global
const laser_count = 5;
const bIncludeScanningAttributes = false;
const nBufferduration = 0;//1500000;//500000;//1000000; //us
//if openpolyline support is required set to false
//when not in development mode set to false
const bDrawTile = true; // this inversly toggles the ability to handle CAD generated openpolilines (eg in support)

// type designation 

const type_openPolyline = 0;
const type_part_hatch = 1;
const type_part_contour = 2;
const type_downskin_hatch = 3;
const type_downskin_contour = 4;
const type_support_hatch = 5;
const type_support_contour = 6;

// -------- GENERAL INFORMATION -------- //
/** @param  aboutInfo  bsAboutInfo */

exports.about = function(aboutInfo){
  
   aboutInfo.addCommentLine('AddCreator');
   aboutInfo.addCommentLine('Adira');
   aboutInfo.addCommentLine('Copyright 2023');
  
};

// -------- MACHINE CONFIGURATION -------- //
/** @param  machineConfig   bsMachineConfig */

exports.declareMachine = function(machineConfig){
  
  MACHINE_CONFIG.declareMachine(machineConfig);
  
};

// -------- PARAMETER CONFIGURATION -------- //
/** @param  parameter   bsBuildParam */

exports.declareParameters = function(parameter){
    
    PARAM_CONFIG.declareParameters(parameter)
  
};

// -------- ATTRIBUTE CONFIGURATION -------- //
/** @param  buildAttrib   bsBuildAttribute */

exports.declareBuildAttributes = function(buildAttrib){
    
  ATTRIB_CONFIG.declareBuildAttributes(buildAttrib,laser_count);
    
};
  



// -------- CONFIGURE POST PROCESSING -------- //
/** @param  a_config    bsPostProcessingConfig */

exports.configurePostProcessingSteps = function(a_config)
{
  // Postprocessing the toolpaths using the given function:
  a_config.addPostProcessingStep(POST_PROCESS.postprocessLayerStack_MT,{bMultithread: true, nProgressWeight: 1});
};


/**
* the buildstyle declares its export filters to the main application
* 'filter-id', 'display string', 'file extension'
*
* @param  exportFilter  bsExportFilter
*/
exports.declareExportFilter = function(exportFilter){    
  exportFilter.declareFilterEx({
    'sFilterId' : 'CLI-C108C8EC-70C4-40AE-94D2-75B778311531',
    'sFilterName' : LOCALIZER.GetMessage('cli_format'),
    'sFilterExtension' : 'cli',
    'nVersionMajor' : CLI.version.major,
    'nVersionMinor' : CLI.version.minor,
    'isMultifile' : false
  });  
};


/**
* Prepare a part for calculation. Checking configuration
* and adding properties to the part
* @param  model   bsModel
*/

exports.prepareModelExposure = function(model){
  
  let layer_thickness = model.getLayerThickness();
  let material_name = model.getMaterialID(); 
  
 if(material_name == 'IN718'){
    model.setAttrib('melting-point', '1260');
    model.setAttrib('density','5.4');
    model.setAttrib('gas','Argon');
     
    let openpolyline = {
    power_watt: 221.92,
    power_percent: 55.48,
    markspeed: 600,
    defocus:0.0
    };
    model.setAttribEx('openpolyline',openpolyline);
    
    let hatch = {
    power_watt: 259.52,
    power_percent: 64.88,
    markspeed: 800,
    defocus: 0.0
    };
    model.setAttribEx('hatch',hatch);
    
    let contour = {
    power_watt: 221.92,
    power_percent: 55.48 ,
    markspeed: 600,
    defocus: 0.0
    };
    model.setAttribEx('contour',contour);
    
    let overhang_hatch = {
    power_watt: 106.2,
    power_percent: 26.55 ,
    markspeed: 667,
    defocus: 0.0
    };   
    model.setAttribEx('downskin_hatch',overhang_hatch);
    
    let overhang_contour = {
    power_watt: 201.4,
    power_percent: 50.35 ,
    markspeed: 1600,
    defocus: 0.0
    };   
    model.setAttribEx('downskin_contour',overhang_contour);
    
    let support_hatch = {
    power_watt: 259.52,
    power_percent: 64.88,
    markspeed: 800,
    defocus: 0.0
    };   
    model.setAttribEx('support_hatch',support_hatch);
    
    let support_contour = {
    power_watt: 221.92,
    power_percent: 55.48 ,
    markspeed: 600,
    defocus: 0.0
    };   
    model.setAttribEx('support_contour',support_contour);
    
  } else if (material_name == 'unspecified') {
  
    model.setAttrib('melting-point', '0');
    model.setAttrib('density','0');
    model.setAttrib('gas','undefined');

    let openpolyline = {
    power_watt:PARAM.getParamReal('ScanningParameters','openpolyline_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','openpolyline_power'))*100,
    markspeed: PARAM.getParamReal('ScanningParameters','openpolyline_markspeed'),
    defocus:PARAM.getParamReal('ScanningParameters','openpolyline_defocus')
    };
    model.setAttribEx('openpolyline',openpolyline);
    
    let hatch = {
    power_watt: PARAM.getParamReal('ScanningParameters','hatch_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','hatch_power'))*100,
    markspeed: PARAM.getParamReal('ScanningParameters','hatch_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','hatch_defocus'),
    };
    model.setAttribEx('hatch',hatch);
    
    let contour = {
    power_watt: PARAM.getParamReal('ScanningParameters','contour_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','contour_power'))*100,
    markspeed: PARAM.getParamReal('ScanningParameters','contour_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','contour_defocus')
    };
    model.setAttribEx('contour',contour);
    
    let overhang_hatch = {
    power_watt: PARAM.getParamReal('ScanningParameters','overhang_hatch_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','overhang_hatch_power'))*100 ,
    markspeed: PARAM.getParamReal('ScanningParameters','overhang_hatch_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','overhang_hatch_defocus')
    };   
    model.setAttribEx('downskin_hatch',overhang_hatch);
    
    let overhang_contour = {
    power_watt: PARAM.getParamReal('ScanningParameters','overhang_contour_power'),
    power_percent:(500/PARAM.getParamReal('ScanningParameters','overhang_contour_power'))*100 ,
    markspeed: PARAM.getParamReal('ScanningParameters','overhang_contour_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','overhang_contour_defocus')
    };   
    model.setAttribEx('downskin_contour',overhang_contour);
    
    let support_hatch = {
    power_watt: PARAM.getParamReal('ScanningParameters','support_hatch_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','support_hatch_power'))*100,
    markspeed: PARAM.getParamReal('ScanningParameters','support_hatch_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','support_hatch_defocus')
    };   
    model.setAttribEx('support_hatch',support_hatch);
    
    let support_contour = {
    power_watt: PARAM.getParamReal('ScanningParameters','support_contour_power'),
    power_percent: (500/PARAM.getParamReal('ScanningParameters','support_contour_power'))*100,
    markspeed: PARAM.getParamReal('ScanningParameters','support_contour_markspeed'),
    defocus: PARAM.getParamReal('ScanningParameters','support_contour_defocus')
    };   
    model.setAttribEx('support_contour',support_contour);  
    
  } // if
  
  
  
  //////
  var openPolyLine_power = model.getAttribEx('openpolyline').power_watt;
  var openPolyLine_speed = model.getAttribEx('openpolyline').markspeed;
  var openPolyLine_defocus = model.getAttribEx('openpolyline').power_defocus;
  
  var part_hatch_power = model.getAttribEx('hatch').power_watt;
  var part_hatch_speed = model.getAttribEx('hatch').markspeed;
  var part_hatch_defocus = model.getAttribEx('hatch').defocus;
  
  var part_contour_power = model.getAttribEx('contour').power_watt;
  var part_contour_speed = model.getAttribEx('contour').markspeed;
  var part_contour_defocus = model.getAttribEx('contour').defocus;
  
  var downskin_hatch_power =  model.getAttribEx('downskin_hatch').power_watt;
  var downskin_hatch_speed = model.getAttribEx('downskin_hatch').markspeed;
  var downskin_hatch_defocus =model.getAttribEx('downskin_hatch').defocus;
  
  var downskin_contour_power =  model.getAttribEx('downskin_contour').power_watt;
  var downskin_contour_speed = model.getAttribEx('downskin_contour').markspeed;
  var downskin_contour_defocus = model.getAttribEx('downskin_contour').defocus;
  
  var support_hatch_power = model.getAttribEx('support_hatch').power_watt; 
  var support_hatch_speed = model.getAttribEx('support_hatch').markspeed;
  var support_hatch_defocus = model.getAttribEx('support_hatch').defocus;
  
  var support_contour_power = model.getAttribEx('support_contour').power_watt;
  var support_contour_speed = model.getAttribEx('support_contour').markspeed;
  var support_contour_defocus = model.getAttribEx('support_contour').defocus;
    


  // Create custom table
  //generates a custom  table containing different parameters depending on laser number
  
  let skywritingAttributes = {      
    "schema": "http://schemas.scanlab.com/skywriting/2023/01",          
    "mode": PARAM.getParamInt('skywriting','skywritingMode'),
    "timelag": PARAM.getParamInt('skywriting','timelag'),
    "laseronshift": PARAM.getParamInt('skywriting','laserOnShift')*64,
    "limit": PARAM.getParamReal('skywriting','mode3limit'),
    "nprev": PARAM.getParamInt('skywriting','nprev')/10,
    "npost": PARAM.getParamInt('skywriting','npost')/10
  };
  
    let scanningAttributes = {      
    "schema": "http://schemas.scanlab.com/scanning/2023/01",
    "laserondelay": PARAM.getParamInt('durationSim','laserOnDelay'),
    "laseroffdelay": PARAM.getParamInt('durationSim','laserOffDelay'),      
    "jumpspeed": PARAM.getParamReal('durationSim','JumpSpeed'),
    "jumplengthlimit": PARAM.getParamReal('durationSim','JumpLengthLimit'),
    "jumpdelay": PARAM.getParamInt('durationSim','JumpDelay'),
    "minjumpdelay": PARAM.getParamInt('durationSim','MinJumpDelay'),
    "markdelay": PARAM.getParamInt('durationSim','MarkDelay'),
    "polygondelay": PARAM.getParamInt('durationSim','PolygonDelay'),
    "polygondelaymode" : PARAM.getParamStr('durationSim','PolygonDelayMode')
  };
  
  if(bIncludeScanningAttributes){
    var additionalAttributes = [ skywritingAttributes, scanningAttributes];
  } else {
    var additionalAttributes = [ skywritingAttributes];
  }
  var customTable = [];  
  for(let l_laser_nr = 1; l_laser_nr<=laser_count;++l_laser_nr)
  {
    // Open Polylines
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_openPolyline); //laser no * 10
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_openpolyline";
    bsid_obj.power = openPolyLine_power;
    bsid_obj.focus = openPolyLine_defocus;
    bsid_obj.speed = openPolyLine_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'openPolyline_priority');   
    bsid_obj.attributes = additionalAttributes;
        
    customTable.push(bsid_obj);

    // Part Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_part_hatch); // laser no * 10 + 1
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_parthatch";
    bsid_obj.power = part_hatch_power;
    bsid_obj.focus = part_hatch_defocus;
    bsid_obj.speed = part_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'part_hatch_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
    // part Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_part_contour); // laser no * 10 + 2
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_partcontour";
    bsid_obj.power = part_contour_power;
    bsid_obj.focus = part_contour_defocus;
    bsid_obj.speed = part_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'part_contour_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
    // downskin Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_downskin_hatch); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_downskinhatch";
    bsid_obj.power = downskin_hatch_power;
    bsid_obj.focus = downskin_hatch_defocus;
    bsid_obj.speed = downskin_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'downskin_hatch_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
    // downskin Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_downskin_contour); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_downkskincontour";
    bsid_obj.power = downskin_contour_power;
    bsid_obj.focus = downskin_contour_defocus;
    bsid_obj.speed = downskin_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'downskin_contour_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
    // Support Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_support_hatch); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_supporthatch";
    bsid_obj.power = support_hatch_power;
    bsid_obj.focus = support_hatch_defocus;
    bsid_obj.speed = support_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'support_hatch_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
    // Support Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+type_support_contour); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_supportcontour";
    bsid_obj.power = support_contour_power;
    bsid_obj.focus = support_contour_defocus;
    bsid_obj.speed = support_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'support_contour_priority');    
    bsid_obj.attributes = additionalAttributes;
    customTable.push(bsid_obj);
    
  } // for
  model.setAttribEx('customTable', customTable);


 ////////////////////////////////////////
 // generate scannerhead data objects //
 ///////////////////////////////////////
    
  function scanner(laserIndex){
    
    this.laserIndex = laserIndex;
    this.x_ref = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) + '_ref_mm');
    this.rel_x_max = PARAM.getParamReal('scanhead','x_scanner' + (laserIndex) +'_max_mm'); // max
    this.rel_x_min =  PARAM.getParamReal('scanhead','x_scanner'+ (laserIndex) + '_min_mm'); // min

    if(PARAM.getParamInt('tileing','ScanningMode') == 0){ // moveandshoot
      this.rel_y_min = 0;
      this.rel_y_max = PARAM.getParamReal('scanhead','y_scanfield_size_mm');
    } else { //onthefly
      this.rel_y_min = 0;
      this.rel_y_max = PARAM.getParamReal('otf','tile_size');
    }
    this.abs_x_min = this.x_ref+this.rel_x_min;//+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
    this.abs_x_max = this.x_ref+this.rel_x_max;//+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
  }
  
  let scanhead_array = [];
  
  for (let i = 0; i < laser_count; i++) {
    scanhead_array[i] = new scanner(i+1);
   }
  model.setAttribEx('scanhead_array',scanhead_array);  


////////////////////////////////
  //  Laser display color def   //
  ////////////////////////////////
  let l_rnd_gen = new RND.Rand(239803);
  //let laser_count = PARAM.getParamInt('exposure', 'laser_count');
  let laser_color = new Array();
   
  let l_col = new Array(laser_count);
   // using the currently defined color scheme for displaying lasers
   l_col[0] = new RGBA.bsColRGBAi(247,4,4,255);  // red
   l_col[1] = new RGBA.bsColRGBAi(72,215,85,255); // green
   l_col[2] = new RGBA.bsColRGBAi(10,8,167,255); // blue
   l_col[3] = new RGBA.bsColRGBAi(249,9,254,255); // purple
   l_col[4] = new RGBA.bsColRGBAi(13,250,249,255); // light blue

  for(let l_laser_nr = 0;l_laser_nr<laser_count;l_laser_nr++)
  {
    if (l_laser_nr > 4) // support for auto generating colors for additional lasers
    {
    l_col[l_laser_nr] = new RGBA.bsColRGBAi(215 - (l_rnd_gen.getNextRandom()*100),
      215 - (l_rnd_gen.getNextRandom()*100),
      215 - (l_rnd_gen.getNextRandom()*100),
      255);  
    } // if
    laser_color[l_laser_nr] = l_col[l_laser_nr].rgba();
  } // for
  model.setAttribEx('laser_color',laser_color);  
 // modelDataTarget.setTrayAttribEx('laser_color',laser_color);

}; //prepareModelExposure

/**
* Preprocessing step. This function is optional.
* If no preprocessing is required then remove this function.
* If the function exists then it has to add data to modelDataTarget
* Otherwise the preprocessing result is empty and nothing 
* is processed further on.
* @param  modelDataSrc     bsModelData
* @param  modelDataTarget  bsModelData
* @param  progress         bsProgress
*/
exports.preprocessLayerStack = function(modelDataSrc, modelDataTarget, progress)
{  
  
  var modelCount = modelDataSrc.getModelCount(); 
  var modelLayerCount = modelDataSrc.getLayerCount();
  var modelLayerHeight = modelDataSrc.getLayerThickness();
  let layerBoundaries = new Array();
  
  ////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
  
  //!!!!! OBS: currently limited to 1 model, therefore if there is more models they are merged !!!!!!
  // run through all models
    // find the tile position of each layer
       // add all islands to shadow islands
  
  // merge all models on the platform into modelDataTarget
   for( let modelIndex=0; modelIndex < modelCount && !progress.cancelled(); modelIndex++ )
    {
      let thisModel = modelDataSrc.getModel(modelIndex);
      //let targetModel = new MODEL.bsModel();
      //thisModel.unifyPartWithSolidSupports(targetModel, progress, true) ;
      
      modelDataTarget.addModelCopy(thisModel);  
      //modelDataTarget.addModelCopy(targetModel);  
    }
       
  // run through all layers and find the boundaries
  for( let modelIndex=0; modelIndex < modelCount && !progress.cancelled(); modelIndex++ )
    {
    let thisModel = modelDataTarget.getModel(modelIndex); // look at the joint models
      
      for (let layerIt = 1; layerIt <modelLayerCount+1;layerIt++){
       var modelLayer =  thisModel.getModelLayer((layerIt)*modelLayerHeight);
        
        if (modelLayer.isValid()){  
          
          let thisLayerBounds = modelLayer.tryGetBounds2D();
          
          if (thisLayerBounds !== undefined) {
            layerBoundaries[layerIt] = thisLayerBounds;
        
            modelLayer.setAttribEx('boundaries',layerBoundaries[layerIt]);          
            // calculate the tileArray and stores it layer
            TILE.getTileArray(modelLayer,bDrawTile,layerIt);  
          }
        } 
      }
    }
}; //preprocessLayerStack

/**
* Calculate the exposure data / hatch vectors for one layer of a part
* @param  modelData    bsModelData
* @param  hatchResult  bsHatch
* @param  nLayerNr      int
*/

exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr)
{  
     
  var thisModel = modelData.getModel(0);
  
  let l_cur_layer = thisModel.getModelLayerByNr(nLayerNr);
  if(!l_cur_layer.isValid()) 
    throw new Error("Invalid Layer " + nLayerNr);
    
    
  let thisLayerBounds = l_cur_layer.tryGetBounds2D();
  if(thisLayerBounds == undefined) 
    return;
  
  let hatch_density = PARAM.getParamReal('exposure', '_hdens');
  
  var beam_compensation = PARAM.getParamReal("exposure", "beam_compensation");
  var boarder_offset = PARAM.getParamReal("exposure", "boarder_offset"); 
  
  let hatch_param = thisModel.getAttribEx('hatch');
  
  let fill_power = hatch_param.power_watt;
  let fill_speed = hatch_param.markspeed;
  let fill_defocus = hatch_param.defocus;
  
  let contour_param = thisModel.getAttribEx('contour');
  
  let border_power = contour_param.power_watt;
  let border_speed = contour_param.markspeed;
  let border_defocus = contour_param.defocus;
  
  let downskin_hatch_param = thisModel.getAttribEx('downskin_hatch');
  
  let down_skin_fill_power = downskin_hatch_param.power_watt;
  let down_skin_fill_speed = downskin_hatch_param.markspeed;
  let down_skin_defocus = downskin_hatch_param.defocus;
  
  let downskin_contour_param = thisModel.getAttribEx('downskin_contour');
  
  let down_skin_contour_power = downskin_contour_param.power_watt;
  let down_skin_contour_speed = downskin_contour_param.markspeed;
  let down_skin_contour_defocus = downskin_contour_param.defocus;
  
  let openpolyline_param = thisModel.getAttribEx('openpolyline');
  
  let openpolyline_power = openpolyline_param.power_watt;
  let openpolyline_speed = openpolyline_param.markspeed;
  let openpolyline_defocus = openpolyline_param.defocus;
  
 
  var hatch_angle_increment =  PARAM.getParamReal("exposure", "hatch_angle_increment");
  var cur_hatch_angle = (PARAM.getParamReal("exposure", "hatch_angle_init") + (nLayerNr * hatch_angle_increment)) % 360;
  
    // if the angle falls in the 1st or 2nd quadrant, move it to the 3rd or 4th
    //this ensures that the hatching is always against the gas flow
      
  if (cur_hatch_angle >= 0.0 && cur_hatch_angle <= 180.0){     
    cur_hatch_angle += 180.0;
    }
    
  var down_skin_surface_angle = PARAM.getParamReal("downskin", "down_skin_surface_angle");
  var down_skin_layer_reference = PARAM.getParamInt("downskin", "down_skin_layer_reference");
  var down_skin_hatch_density = PARAM.getParamReal("downskin", "down_skin_hdens");
  var down_skin_hatch_angle_increment =  PARAM.getParamReal("downskin", "down_skin_hangle_increment");
  var down_skin_cur_hatch_angle = (PARAM.getParamReal("downskin", "down_skin_hangle") + (nLayerNr * down_skin_hatch_angle_increment)) % 360;
  
    // if the angle falls in the 1st or 2nd quadrant, move it to the 3rd or 4th
    //this ensures that the hatching is always against the gas flow
      
  if (down_skin_cur_hatch_angle >= 0.0 && down_skin_cur_hatch_angle <= 180.0){     
    down_skin_cur_hatch_angle += 180.0; 
    }
    
  let down_skin_overlap = PARAM.getParamReal("downskin", "down_skin_overlap");
  
  let support_hatch_density = PARAM.getParamReal("support","support_hdens");
  let support_skin_hatch_angle_increment =  PARAM.getParamReal("support", "support_hatch_angle_increment");
  let support_skin_cur_hatch_angle = (PARAM.getParamReal("support", "support_hatch_angle_init") + (nLayerNr * down_skin_hatch_angle_increment))
  let laser_color = new Array();
  laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 

  /////////////////////////////////////////
  /// Merge all islands into one object ///
  /////////////////////////////////////////
 
    function generateOffset (islandObj,offset){
      
      var offsetIsland = new ISLAND.bsIsland(); 
      var borderHatch = new HATCH.bsHatch();
      
      islandObj.createOffset(offsetIsland, -offset);   
      offsetIsland.borderToHatch(borderHatch); 
      return {
        'offsetIsland' : offsetIsland,
        'borderHatch' : borderHatch
      };
    }
 
  let all_islands = new ISLAND.bsIsland(); // generate island object
  var allContourHatch = new HATCH.bsHatch();

  var island_it = modelData.getFirstIsland(nLayerNr); // get island Iterator
  
  let all_islands_part = new ISLAND.bsIsland(); // generate island object
  let all_islands_support = new ISLAND.bsIsland(); // generate island object
   
  let allDownSkinContourHatch = new HATCH.bsHatch();  
  
  var allHatch = new HATCH.bsHatch();
    
  var islandId = 0;  
  while(island_it.isValid())
    { 
      let is_part = MODEL.nSubtypePart == island_it.getModelSubtype();
      let is_support = MODEL.nSubtypeSupport == island_it.getModelSubtype();
      
      //let bulkIsland = new ISLAND.bsIsland();
      //let downSkinbulkIsland = new ISLAND.bsIsland();
      
      let island = island_it.getIsland().clone();
  
      //addBlockedPath(island,islandId);
      
      let islandOffset = generateOffset(island,beam_compensation).offsetIsland;
      let islandOffsetx2 = generateOffset(island,beam_compensation*2).offsetIsland;
      let islandContourHatch = new HATCH.bsHatch();
      islandOffset.borderToHatch(islandContourHatch);
      let islandBorderClipper = generateOffset(islandOffset,0.0004).offsetIsland;
      //check if the model is part or support and store them.
      if(is_part)
        {          
                    
          //find down skin area
          let down_skin_island = new ISLAND.bsIsland();
          let not_down_skin_island = new ISLAND.bsIsland();
          let down_skin_island_no_overhang = new ISLAND.bsIsland();
          
          if(PARAM.getParamInt('downskin','downskintoggle')){
          
            islandOffset.splitMultiLayerOverhang(down_skin_surface_angle, down_skin_overlap, down_skin_layer_reference,
            not_down_skin_island, down_skin_island,down_skin_island_no_overhang);
            
            let emm = 0;
          } else {
            
             not_down_skin_island.copyFrom(islandOffset);
              
          }
          

          if(!down_skin_island.isEmpty())
            {
              
              let downSkinbulkIsland = generateOffset(down_skin_island,beam_compensation).offsetIsland;
              
              let downSkinContourHatch = new HATCH.bsHatch(); 
              down_skin_island.borderToHatch(downSkinContourHatch);        
              downSkinContourHatch.setAttributeReal('power', down_skin_contour_power);
              downSkinContourHatch.setAttributeReal('speed', down_skin_contour_speed);
              downSkinContourHatch.setAttributeInt('type',type_downskin_contour);
              downSkinContourHatch.setAttributeInt('islandId',islandId);
              downSkinContourHatch.clip(islandBorderClipper,false);   
              allContourHatch.moveDataFrom(downSkinContourHatch); // move downskin border to results                          

                let hatchingArgs = {
               "fHatchDensity" : down_skin_hatch_density,
               "fHatchAngle" : down_skin_cur_hatch_angle,
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
        
              downSkin_hatch.setAttributeReal('power', down_skin_fill_power);
              downSkin_hatch.setAttributeReal('speed', down_skin_fill_speed);
              downSkin_hatch.setAttributeInt('type',type_downskin_hatch);
              downSkin_hatch.setAttributeInt('islandId',islandId);    
              allHatch.moveDataFrom(downSkin_hatch);  // move down skin hatch to results  
              
            }
      
          // not down skin islands
          if(!not_down_skin_island.isEmpty())
          {
            
            let contourHatch = new HATCH.bsHatch();
            let downskinContourClipper = generateOffset(down_skin_island,-0.0005).offsetIsland;
            islandOffset.borderToHatch(contourHatch); // temp solutions
            //not_down_skin_island.borderToHatch(contourHatch);            
            contourHatch.setAttributeReal('power', border_power);
            contourHatch.setAttributeReal('speed', border_speed);
            contourHatch.setAttributeInt('type',type_part_contour);
            contourHatch.setAttributeInt('islandId',islandId);
            contourHatch.clip(downskinContourClipper,false);// WIP this clip splits it between different scanners
            allContourHatch.moveDataFrom(contourHatch);
            
                       
            
            let bulkIsland = generateOffset(not_down_skin_island,beam_compensation*1).offsetIsland;
                
            
            let hatchingArgs = {
               "fHatchDensity" : hatch_density,
               "fHatchAngle" : cur_hatch_angle,
               "nCycles" : 1,
               "fCollinearBorderSnapTol" : 0.0,
               "fBlocksortRunAheadLimit": 2.0,
               "hatchOrigin" : {x: 0.0, y: 0.0},
               "blocksortVec" : {x: 0.0, y: -1.0},
               "nFlags" : HATCH.nHatchFlagAlternating | 
                HATCH.nHatchFlagBlocksortEnhanced |
                HATCH.nHatchFlagFlexDensity
              };             
            
            
            // Hatching remaining area (not down skin)
            var fill_hatch = new HATCH.bsHatch();
            bulkIsland.hatchExt2(fill_hatch,hatchingArgs);
              
            
            fill_hatch.setAttributeReal('power', fill_power);
            fill_hatch.setAttributeReal('speed', fill_speed);      
            fill_hatch.setAttributeInt('type',type_part_hatch);
            fill_hatch.setAttributeInt('islandId',islandId);            
              
            //fill_hatch.clip(down_skin_island_no_overhang,false);
              
            allHatch.moveDataFrom(fill_hatch);
          }
          
        } else { // is support
          
          if(PARAM.getParamInt('support','param_supportContourToogle')){
          let supportBorderHatch = new HATCH.bsHatch();  
          islandOffset.borderToHatch(supportBorderHatch);
          supportBorderHatch.setAttributeReal('power', support_contour_power);
          supportBorderHatch.setAttributeReal('speed', support_contour_speed);
          supportBorderHatch.setAttributeInt('type',type_support_contour);
          supportBorderHatch.setAttributeInt('islandId',islandId);
          allContourHatch.moveDataFrom(supportBorderHatch);
          }
          
          let hatchingArgs = {
               "fHatchDensity" : support_hatch_density,
               "fHatchAngle" : support_skin_cur_hatch_angle,
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

          
          support_hatch.setAttributeReal('power', support_hatch_power);
          support_hatch.setAttributeReal('speed', support_hatch_speed);      
          support_hatch.setAttributeInt('type',type_support_hatch);
          support_hatch.setAttributeInt('islandId',islandId);
          allHatch.moveDataFrom(support_hatch);       
        }
        
      
      //let thisIsland = island_it.getFirstPolyline(0);
      all_islands.addIslands(islandOffset);    
      island_it.next();
      islandId++;
    } // while
  
  // process all open polylines on the layer
  // open polylines are usually support/fixtures
  var polyline_it = modelData.getFirstLayerPolyline(
    nLayerNr, POLY_IT.nLayerOpenPolylines);

//var polylineArray = modelData.getLayerPolylineArray(nLayerNr, POLY_IT.nLayerOpenPolylines, 'rw'); 

  if (!bDrawTile){
    while(polyline_it.isValid()) // check if exists
    {         
      let is_part = MODEL.nSubtypePart == polyline_it.getModelSubtype(); // is it a part
      let is_support = MODEL.nSubtypeSupport == polyline_it.getModelSubtype(); // is it support
      
      let polyline_hatch_paths = new HATCH.bsHatch(); // new container for exposure data
      
      polyline_it.polylineToHatch(polyline_hatch_paths);
      
      if(is_part)
      {      
        // part
        polyline_hatch_paths.setAttributeInt("islandId",islandId);
        polyline_hatch_paths.setAttributeReal("power", openpolyline_power);
        polyline_hatch_paths.setAttributeReal("speed", openpolyline_speed);
        polyline_hatch_paths.setAttributeInt("type", type_openPolyline);
      }
      else
      {
        // support/fixtures
        polyline_hatch_paths.setAttributeInt("islandId",islandId);
        polyline_hatch_paths.setAttributeReal("power", openpolyline_power);
        polyline_hatch_paths.setAttributeReal("speed", openpolyline_speed);
        polyline_hatch_paths.setAttributeInt("type", type_openPolyline);
      }
      
      hatchResult.moveDataFrom(polyline_hatch_paths); // moves polyline_hatch_paths to hatchResult
      
      polyline_it.next(); // looks at next polyline
    }
  }
      
 //divide into stripes (GLOBAL) 
  
  let fStripeWidth = PARAM.getParamReal('strategy','fStripeWidth');
  let fMinWidth = PARAM.getParamReal('strategy','fMinWidth');
  let fStripeOverlap = PARAM.getParamReal('strategy','fStripeOverlap');
  let fStripeLength = PARAM.getParamReal('strategy','fStripeLength');
  let fpatternShift = PARAM.getParamReal('strategy','fPatternShift');
  
  let stripeRefPoint = new VEC2.Vec2(nLayerNr*fpatternShift,0);
  
  //process.printInfo(nLayerNr*fpatternShift);
  
  let allIsland_array = all_islands.getIslandArray();

    let stripeIslands = new ISLAND.bsIsland();
    all_islands.createStripes(stripeIslands,fStripeWidth,fMinWidth,fStripeOverlap,fStripeLength,cur_hatch_angle,stripeRefPoint); // 
    
    //let islandToStripe_it = all_islands.getFirstIsland;
  
    let stripeHatch = new HATCH.bsHatch();  
    // clip islands into stripes 
    let stripeCount = stripeIslands.getIslandCount();
    let stripeArr = stripeIslands.getIslandArray();
    //walk trough all stripes and assign islands to each stripe
    for(let i = 0; i<stripeCount;i++)
      {
        let clippedHatch = new HATCH.bsHatch();
        clippedHatch = allHatch.clone();
        
        clippedHatch.clip(stripeArr[i],true);
        clippedHatch.setAttributeInt('stripeID',i+1);
        
        hatchResult.moveDataFrom(clippedHatch); 
      } 

  

  hatchResult.moveDataFrom(allContourHatch);
  
  function addBlockedPath(island,ilandId) {
      ///////////////////////////////////////////////////////////////////////
      // narrow bridges
      let narrow_bridge = new HATCH.bsHatch();

      island.createNarrowBridgePolylines(
          narrow_bridge, -beam_compensation);
      
      narrow_bridge.setAttributeReal("power", border_power);
      narrow_bridge.setAttributeReal("speed", border_speed);
      narrow_bridge.setAttributeInt("type", type_openPolyline);
      narrow_bridge.setAttributeInt("islandId", ilandId);
      
      hatchResult.moveDataFrom(narrow_bridge);

      /////////////////////////////////////////////////////////////////////
      
      // narrow appendixes
      let narrow_app = new HATCH.bsHatch();

      island.createNarrowAppendixPolylines(
          narrow_app, 
          -beam_compensation, 
          beam_compensation
          );  

      narrow_app.setAttributeReal("power", border_power);
      narrow_app.setAttributeReal("speed", border_speed);
      narrow_app.setAttributeInt("type",type_openPolyline);       
      narrow_app.setAttributeInt("islandId", ilandId);
      
      hatchResult.moveDataFrom(narrow_app);
    }  
      /////////////////////////////////////////////////////////////////////     
  
  ///////////////////////////////////////////// 
  /// get the required passes in this layer ///
  /////////////////////////////////////////////
 

  var thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  
  var required_passes_x = thisLayer.getAttrib('requiredPassesX');
  var required_passes_y = thisLayer.getAttrib('requiredPassesY');
  var tileArray = new Array();
  tileArray = thisLayer.getAttribEx('tileTable');
  
  // get the tile array sorting by tile number

  if(tileArray.length > 1){
    tileArray.sort(function(a, b) {
      return a.tile_number - b.tile_number;
    });
  }
  
  var scanheadArray = thisModel.getAttribEx('scanhead_array');
  
   ///////////////////////////////////////////////////
  /// generate containers for hatching and islands ///
  ////////////////////////////////////////////////////
  
  var vec2_tile_array = new Array();
  //var allTileHatch = new HATCH.bsHatch();
 
  //var tile_island = new ISLAND.bsIsland(); // generate islands object to clip my
  var tileSegmentArr = new Array();
  //var tile_exposure_time_array = new Array();
  
  //var tempContourHatch = new HATCH.bsHatch();
  let hatch = new HATCH.bsHatch();
  hatch.moveDataFrom(hatchResult);
  //process.printInfo('hatch lenght before: ' + hatch.getExposureLength());
  
  /////////////////////////////////////////////////////////////////////////////
  /// Index the tiles (passnumber, tile_index, scanhead xcoord and ycoord)  ///
  /////////////////////////////////////////////////////////////////////////////
 
      let Margs = {
        "bConvertToHatchMode": true,
        "nConvertToHatchMaxPointCount": 2,
        //"nMaxBlockSize": 512,
        "bCheckAttributes": true
      };
      
     hatch.mergeHatchBlocks(Margs);
 
  for(let j = 0; j<tileArray.length;j++)
    {
     // get the coordinates of the current tile 
     let tile_x_min = tileArray[j].scanhead_outline[0].m_coord[0]//
     let tile_x_max = tileArray[j].scanhead_outline[2].m_coord[0]//
     let tile_x_cen = (tile_x_min+tile_x_max)/2;
     let tile_y_min = tileArray[j].scanhead_outline[0].m_coord[1];//
     let tile_y_max = tileArray[j].scanhead_outline[2].m_coord[1];//
     let tile_y_cen = (tile_y_min+tile_y_max)/2;
      
     // add the corrdinates to vector pointset
     let tile_points = new Array(4);
     tile_points[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
     tile_points[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
     tile_points[2] = new VEC2.Vec2(tile_x_max, tile_y_max); // max,max
     tile_points[3] = new VEC2.Vec2(tile_x_max, tile_y_min); // max,min
        
     vec2_tile_array[j] =  tile_points;
     // generate Segment obejct containing the tiles to 
     //process.printInfo(tile_points);
     let startVec2 = new VEC2.Vec2(tile_x_min,tile_y_cen);
     let endVec2 = new VEC2.Vec2(tile_x_max,tile_y_cen);
      
     tileSegmentArr[j] = new SEG2D.Seg2d(startVec2,endVec2);  
      //var hatchClone = hatch.clone();
      
      
      let tileHatch = new HATCH.bsHatch();  // generate hatching object
      let hatchOutside = new HATCH.bsHatch();
      tileHatch = UTIL.ClipHatchByRect(hatch,vec2_tile_array[j],true);
      //hatchOutside = ClipHatchByRect(hatch,vec2_tile_array[j],false);
//       process.printInfo('tilehatch: ' + tileHatch.getHatchBlockCount());
//       process.printInfo('tilehatch length: ' + tileHatch.getExposureLength() );
//       process.printInfo('hatchOutside: ' + tileHatch.getHatchBlockCount());
//       process.printInfo('hatchOutside length: ' + tileHatch.getExposureLength() );

     // add some attributes to hatchblocks
  
     tileHatch.setAttributeInt('passNumber', tileArray[j].passNumber);
     tileHatch.setAttributeInt('passNumber_3mf', (tileArray[j].passNumber+1)*1000);
     tileHatch.setAttributeInt('tile_index',tileArray[j].tile_number);
     tileHatch.setAttributeInt('tileID_3mf',tileArray[j].tile_number+1+(tileArray[j].passNumber+1)*1000);
     tileHatch.setAttributeReal('xcoord', tileArray[j].scanhead_x_coord);
     tileHatch.setAttributeReal('ycoord', tileArray[j].scanhead_y_coord);
     
//      hatch.makeEmpty();
//      hatch.moveDataFrom(hatchOutside);
//      hatch.moveDataFrom(tileHatch);

    hatchResult.moveDataFrom(tileHatch);

    } //for
     
    
    thisLayer.setAttribEx('tileSegmentArr',tileSegmentArr);   
    
    // generate data for 3mf exporter
    if (PARAM.getParamInt('tileing','ScanningMode') == 0){
      var type = 'moveandshoot';
      } else {
      var type = 'onthefly';
    };
  var required_passes_x = thisLayer.getAttrib('requiredPassesX');
  var required_passes_y = thisLayer.getAttrib('requiredPassesY');

    
  let thistiletable = thisLayer.getAttribEx('tileTable_3mf');    

    
  /////////////////////////////////////
  /// Assign laser options to hatch /// currently not used - only relevant for smart tileing !
  /////////////////////////////////////
     
  /* currently limited to keeping the x pos static during one pass */
          
  var tempTileHatch = new HATCH.bsHatch();
 
  tempTileHatch.moveDataFrom(hatchResult); // move all tiles to temp hatch object
     
      let mergeblock = new HATCH.bsHatch();
         mergeblock.moveDataFrom(tempTileHatch);
      
         
         //tempTileHatch = mergeblock.mergeHatchBlocks(mergeArgs);  
         var allTileHatch = new HATCH.bsHatch();
         tempTileHatch.moveDataFrom(mergeblock);   
         
         var args = {
          sSegRegionFillingMode             : "PositiveX",
          bInvertFillingSequence            : false,
          fSegRegionFillingGridSize         : 0.0,
          sSetAssignedRegionIndexMemberName : "regionIndex"
         }; 
         
         //process.printInfo('sortutil' + SortUtil.nSortMinDistToSegmentsMethod_MinJumpLength);
         
         tempTileHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr,0,args);
      
         allTileHatch.moveDataFrom(tempTileHatch);
  

  LASER.defineSharedZones(allTileHatch,laser_count);

// let tempVar = PARAM.getParamInt('tileing', 'TilingMode');

 //allTileHatch.moveDataFrom(allContourHatch); // ADD contour hatches to be divided bewteen lasers!

 if (PARAM.getParamInt('tileing', 'TilingMode') == 0){ // static tiling
   
 allTileHatch = LASER.staticDistribution(allTileHatch,
                                         modelData,
                                         scanheadArray,
                                         tileArray,
                                         required_passes_x,
                                         required_passes_y,
                                         nLayerNr,
                                         laser_count);  

 } else { // smarttileing
   
 allTileHatch = smartLaserWorkload(allTileHatch,modelData,scanheadArray,tileArray,required_passes_x,required_passes_y,nLayerNr,vec2_tile_array,tileSegmentArr);  
   
 }
 
//  // merge short lines
//  let tempAllHatch = new HATCH.bsHatch();
//  tempAllHatch.moveDataFrom(allTileHatch);
//  
//  let minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
//  let maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
//  
//  tempAllHatch.deleteShortLines(minVectorLenght/10); // remove really small segments
//  
//  let mergesNo = tempAllHatch.mergeShortLines(allTileHatch,minVectorLenght,maxMergeDistance,
//     HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagPreferHatchMode);
//  
//  allTileHatch.deleteShortLines(minVectorLenght); // remove remaing segments smaller than min vector
 
//sort the tile to get accurate processing order
 
var allHatchBlockArray = allTileHatch.getHatchBlockArray();

// sort the array based on bsid
allHatchBlockArray.sort(function(a, b) {
  return a.getAttributeInt('bsid') - b.getAttributeInt('bsid');
});

// sort based on tileIndex
allHatchBlockArray.sort(function(a, b) {
  return a.getAttributeInt('tile_index') - b.getAttributeInt('tile_index');
});

// sort based on pass number
allHatchBlockArray.sort(function(a, b) {
  return a.getAttributeInt('passNumber') - b.getAttributeInt('passNumber');
});


// the tile in the first pass, set processing order

let sortedHatchArray = new HATCH.bsHatch();

for (let i = 0; i<allHatchBlockArray.length;i++)
 {
  let thisBlock = allHatchBlockArray[i]; // remove attributed used for calculation to allow merging hatchblocks
  thisBlock.removeAttributes('laser_index_1');
  thisBlock.removeAttributes('laser_index_2'); 
  thisBlock.removeAttributes('laser_index_3');  
  thisBlock.removeAttributes('laser_index_4');  
  thisBlock.removeAttributes('laser_index_5'); 
  thisBlock.removeAttributes('sharedZone');
  thisBlock.removeAttributes('zoneIndex');

 sortedHatchArray.addHatchBlock(thisBlock);
 }
 
//mergehatchBlocks 
let simplifiedDataHatch = new HATCH.bsHatch();
//simplifiedDataHatch = mergeBlocks(sortedHatchArray);  
simplifiedDataHatch.moveDataFrom(sortedHatchArray);

var simplHatchArray = simplifiedDataHatch.getHatchBlockArray();
 
// assign tiles to pass groups
var passNumberGroups = {};

for (let i = 0; i<simplHatchArray.length;i++)
{
    let thisBlock = simplHatchArray[i];
    let passNumber = thisBlock.getAttributeInt('passNumber');
    
    if (!passNumberGroups[passNumber]) {
        passNumberGroups[passNumber] = {
            'passExposureDuration': 0,
            'blocks': [thisBlock]
        };
    } else {
        passNumberGroups[passNumber].blocks.push(thisBlock);
    }
}


///// merge and delete short lines based on the pass groups

simplifiedDataHatch.makeEmpty();

for (let passNumber in passNumberGroups){
  
  let thisPassHatch = new HATCH.bsHatch();
  let thisPassHatchArray = passNumberGroups[passNumber].blocks;
  let passXCoord = 0;
  let passYCoord = [];
  
  for(let i = 0; i<thisPassHatchArray.length;i++){ // store blocks into hatch container
  passXCoord = thisPassHatchArray[i].getAttributeReal('xcoord');
  passYCoord[i] = thisPassHatchArray[i].getAttributeReal('ycoord');
  thisPassHatch.addHatchBlock(thisPassHatchArray[i]);
  }
  
  //calculate merge blocking geometry
  let blocking_min_x = passXCoord;
  let blocking_max_x = passXCoord+scanheadArray[4].abs_x_max;
  let blocking_min_y = Math.min(passYCoord);
  let blocking_max_y = Math.max(passYCoord)+scanheadArray[0].rel_y_max;

  let firstBlock2Dvec = new Array();
  firstBlock2Dvec[0] = new VEC2.Vec2(blocking_min_x, blocking_min_y); //min,min
  firstBlock2Dvec[1] = new VEC2.Vec2(blocking_min_x, blocking_max_y); //min,max
  firstBlock2Dvec[2] = new VEC2.Vec2(blocking_max_x, blocking_min_y); // max,min
  firstBlock2Dvec[3] = new VEC2.Vec2(blocking_max_x, blocking_max_y); // max,max

  //  let secondBlock2Dvec = new Array(2);
  //  secondBlock2Dvec[0] = new VEC2.Vec2(blocking_max_x, blocking_min_y); // max,min
  //  secondBlock2Dvec[1] =  new VEC2.Vec2(blocking_max_x, blocking_max_y); // max,max 
    
  let blocking_pathset = new PATH_SET.bsPathSet();
  blocking_pathset.addNewPath(firstBlock2Dvec);
  //blocking_pathset.addNewPath(secondBlock2Dvec);

  let mergedHatch = new HATCH.bsHatch();

  let minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
  let maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");

  let mergecount = thisPassHatch.mergeShortLines(mergedHatch,minVectorLenght,maxMergeDistance,
  HATCH.nMergeShortLinesFlagAllowSameHatchBlock | HATCH.nMergeShortLinesFlagPreferHatchMode,blocking_pathset);
   
  mergedHatch.deleteShortLines(minVectorLenght); // remove small vectors
    
  passNumberGroups[passNumber].blocks = mergedHatch.getHatchBlockArray();

  simplifiedDataHatch.moveDataFrom(mergedHatch);
}



// get BSID table:
var bsidTable = thisModel.getAttribEx('customTable');
let tileTable =  thisLayer.getAttribEx('tileTable');  
var tileMap = {};
// fill the passgroup object with all passes -> tiles -> lasers -> hatchblocks
for (let passNumber in passNumberGroups){
    let thisPass = passNumberGroups[passNumber];
    let zoneMap = {
          "uuid": UTIL.generateUUID(),
          "startx": 0,
          "starty": 0,
          "sequencetransferspeed": PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms'),
          "type": "onthefly",
          "requiredPasses": required_passes_x,
          "tilesInPass": required_passes_y,
          "tiles" : []
      }; 
    
  for(let i = 0; i<thisPass.blocks.length;i++){
    let hatchBlock = thisPass.blocks[i];
    let tileID = hatchBlock.getAttributeInt('tile_index');
    
    //get process and laser information
    let bsid = hatchBlock.getAttributeInt('bsid'); 
    let laserID = Math.floor(bsid/10); 

    // If the tile with the current tileID doesn't exist in zoneMap, create a new tile
    if (!zoneMap.tiles[tileID]) {
        zoneMap.tiles[tileID] = {
            'tileExposureDuration': 0,
            'tileID':  hatchBlock.tileID_3mf, // add
            'tileID_3mf': hatchBlock.tileID_3mf,
            'xcoord': hatchBlock.getAttributeReal('xcoord'),
            'ycoord': hatchBlock.getAttributeReal('ycoord'),
            'speedx':0,
            'speedy':0,
            'laser': []
        };
    }
    
    // If the laser with the current laserID doesn't exist in the current tile, create a new laser
    if (!zoneMap.tiles[tileID].laser[laserID]) {
        zoneMap.tiles[tileID].laser[laserID] = {
            'hatchBlocks': [],
            'laserProcessDuration': 0
        };
    }
    
    let thisProcessParameters = bsidTable.find(function (item) {
        return item.bsid === bsid;
    });
    
    hatchBlock.setAttributeInt('priority',thisProcessParameters.priority);
    
    zoneMap.tiles[tileID].laser[laserID].hatchBlocks.push(hatchBlock);
    
  } // for hatchblock iterator

  passNumberGroups[passNumber] = zoneMap;
      
}//for passnumber
    
// define where the scanner starts


for(let pass in passNumberGroups){
      
  let thisPass = passNumberGroups[pass];
  let indices = Object.keys(thisPass.tiles);
  
    if(pass % 2 === 0) {

      let startingTile = Math.min.apply(Math,indices); // from front to back
      thisPass.startx = thisPass.tiles[startingTile].xcoord;
      thisPass.starty = thisPass.tiles[startingTile].ycoord;
      
    } else {
      
      let startingTile = Math.min.apply(Math,indices); // from front to back // update to get backtofront
      thisPass.startx = thisPass.tiles[startingTile].xcoord;
      thisPass.starty = thisPass.tiles[startingTile].ycoord;
      
    }
}
    
///////////////////////////////////////////
// Prioritize and find the scan duration //
///////////////////////////////////////////
    
tileArray.sort(function(a, b) {
    if (a.passNumber === b.passNumber) {
      return a.tile_number - b.tile_number;
    } else {
      return a.passNumber - b.passNumber;
    }
  }
);

// run through the passNumberGroups to prioritize scanning seqence and calculate scanning duration
var processing_order = 0; // global processing order
for (let passNumber in passNumberGroups){
  passNumber = parseInt(passNumber);
  let pass = passNumberGroups[passNumber].tiles; // access the individual passes
  let lastPointArray = [];
  for(let tileNumber in pass){
    
    tileNumber = parseInt(tileNumber);
    //process.printInfo(tileNumber);
    let tile = pass[tileNumber]; // access the individual tiles
    let tileExposureArray = [];
    let skipcountArray = [];
    let pathcountArray =[];  
    
    for(let laserId in tile.laser){
      let nlaserId = parseInt(laserId);
      
      if(Number.isInteger(nlaserId)){ // only perfom task if the laserId is an integer
        //process.printInfo("laserid: " + nlaserId);
        let processLaser = tile.laser[nlaserId]; // access whats is designated to each laser
        
        let thisHatch = new HATCH.bsHatch();
        thisHatch = processLaser.hatchBlocks; // get the hatchs blocks designated to each laser
        
        // prioritise hatchblocks 
        
        // group islands by ilands id (finalize islands before progressing = avoid a state of jumping madness!)
        var groups = thisHatch.reduce(function(groups, item) {
          var group = (groups[item.getAttributeInt('islandId')] = groups[item.getAttributeInt('islandId')] || []);
          group.push(item);
          return groups;
        }, {});
        
        var groupsArray = Object.keys(groups).map(function(key) {
          return groups[key];
        });
        
        // Sort 'groupsArray' by largest 'maxY' value and size of the items within each group
        // Sort 'groupsArray' by largest 'maxY' value of the items within each group, and then by smallest 'minY' when 'maxY' values are the same
        groupsArray.sort(function(a, b) {
          var aMaxY = Math.max.apply(Math, a.map(function(item) { return item.getBounds().maxY; }));
          var bMaxY = Math.max.apply(Math, b.map(function(item) { return item.getBounds().maxY; }));

          if (aMaxY === bMaxY) {
            var aMinY = Math.min.apply(Math, a.map(function(item) { return item.getBounds().minY; }));
            var bMinY = Math.min.apply(Math, b.map(function(item) { return item.getBounds().minY; }));
            return bMinY - aMinY; // largest minY comes first if maxY is same
          }
          
          return bMaxY - aMaxY; // highest maxY comes first
        });
                            
        // Sort each group array by 'priority', then 'maxY', then 'size'
        groupsArray.forEach(function(group) {
          group.sort(function(a, b) {
            var priorityDifference = a.getAttributeInt('priority') - b.getAttributeInt('priority'); 
            if (priorityDifference !== 0) {
              return priorityDifference;
            } else {
              var yDifference = b.getBounds().maxY - a.getBounds().maxY; 
              if (yDifference !== 0) {
                return yDifference;
              } else {
                let aheight = a.getBounds().maxY - a.getBounds().minY;                      
                let bheight = b.getBounds().maxY - b.getBounds().minY;
                        
                let awidth = a.getBounds().maxX - a.getBounds().minX;
                let bwidth = b.getBounds().maxX - b.getBounds().minX;
                        
                let aarea =  aheight * awidth;
                let barea =  bheight * bwidth;
                          
                return aarea - barea; // smallest size first when priority and maxY are the same
              }
            }
          });
        });
        
        // Flatten groupsArray into a single sorted array one pass - one tile - one laser
        let newHatch = new HATCH.bsHatch();
        newHatch = [].concat.apply([], groupsArray);
        
        let timeFromOrigo_us = 0;
        let timeFromStartPosToHatch_us = 0;
        let skywritingDur = 0;
        let timeToNextStartPos_us = 0;
        let thisLaserInTileExposureDuration = new EXPOSURETIME.bsExposureTime(); // duration for this laser scanning in this tile
                
        
        let lastPoint = new VEC2.Vec2();       
    
        
        //laser is started at the center of each laser in X and the topside of the tile in Y
        //process.printInfo('scanhead_x: ' +tile.xcoord);
        let laserStartPosX = tile.xcoord + scanheadArray[nlaserId-1].x_ref;
        let laserStartPosY = tile.ycoord;// + scanheadArray[nlaserId].rel_y_max;
       
        let exposureDur = 0;
        let skipDur = 0;
        
        for (let i=0; i<newHatch.length;i++){
          let hatchblock = newHatch[i]; // individual hatchblocks
          
          hatchblock.setAttributeInt('_processing_order', processing_order++);

          let firstPoint = hatchblock.getPoint(0); // get first point in hatchblock
                                    
          // calculate jump duration from previous hatchblock         
          let prevPosX = 0;
          let prevPosY = 0;
          
             
          
          if (i==0){
          
            prevPosX = laserStartPosX;
            prevPosY = laserStartPosY;
            
           //the first hatch added to timeExposure is calculated from Origo, this is removed by finding the time: 
           let distToOrigo = Math.sqrt((firstPoint.x)*(firstPoint.x) + (firstPoint.y)*(firstPoint.y));    
           timeFromOrigo_us = (distToOrigo/PARAM.getParamReal('durationSim', 'JumpSpeed'))*1000*1000; 
           //process.printInfo('timeFromOrigo_us: ' + timeFromOrigo_us);
           let jumpingDistance = Math.sqrt((prevPosX-firstPoint.x)*(prevPosX-firstPoint.x) + (prevPosY-firstPoint.y)*(prevPosY-firstPoint.y));
           timeFromStartPosToHatch_us = ((jumpingDistance/PARAM.getParamReal('durationSim', 'JumpSpeed')))*1000*1000; 
           //process.printInfo('start: ' + laserStartPosX + '/' + laserStartPosY);  

          } else {
              
            prevPosX = lastPoint.x;
            prevPosY = lastPoint.y;
              
          }           
          
                
          let prevDuration_us = thisLaserInTileExposureDuration.getExposureTimeMicroSeconds();
          
          let exposureSettings =  {
            'fJumpSpeed' :PARAM.getParamReal('durationSim', 'JumpSpeed'),
            'fMeltSpeed' : hatchblock.getAttributeReal('speed'),
            'fJumpLengthLimit' : PARAM.getParamReal('durationSim', 'JumpLengthLimit'),
            'nJumpDelay' : PARAM.getParamInt('durationSim', 'JumpDelay'),
            'nMinJumpDelay': PARAM.getParamInt('durationSim', 'MinJumpDelay'),
            'nMarkDelay' : PARAM.getParamInt('durationSim', 'MarkDelay'),
            'nPolygonDelay': PARAM.getParamInt('durationSim', 'PolygonDelay'),
            'polygonDelayMode' : PARAM.getParamStr('durationSim', 'PolygonDelayMode'),
          };    
           
          thisLaserInTileExposureDuration.addHatchBlock(hatchblock,exposureSettings); // add the current hatchblock with the 
        
          let tempHatch = new HATCH.bsHatch();
          let thisHatchDuration_ms = (thisLaserInTileExposureDuration.getExposureTimeMicroSeconds()-prevDuration_us)/1000;
          if(i == 0){
            thisHatchDuration_ms-=timeFromOrigo_us/1000;
            }
          //process.printInfo('duration: ' + thisLaserInTileExposureDuration.getExposureTimeMicroSeconds()/1000);
          hatchblock.setAttributeReal('Hatch_Duration_ms',thisHatchDuration_ms);
          tempHatch.addHatchBlock(hatchblock);
          
//           let tempHatchArray = tempHatch.getHatchBlockArray();
//           let tempHatchArrayCount = tempHatchArray.length;
//           process.printInfo(tempHatchArray[tempHatchArrayCount-1].getPolyLineMode());
          
          //lastPoint = hatchblock.getPoint(hatchblock.getPointCount()-1);
          
         
          timeToNextStartPos_us =0;
          if (i == newHatch.length-1) { // duration to move to next tile starting position
              lastPoint = hatchblock.getPoint(0); // this will get the first points which is also the last point when contouring
              //let nextTileStartX = tileArray[tileNumber+1].scanhead_x_coord+scanheadArray[nlaserId-1].x_ref;
              //let nextTileStartY = tileArray[tileNumber+1].scanhead_y_coord;
              
              let nextTileStartX = laserStartPosX;
              let nextTileStartY = laserStartPosY+tileArray[tileNumber].tile_height;             
              
              //process.printInfo('next: ' + nextTileStartX + '/' + nextTileStartY);    
              
              let tileFinalJumpLengt = Math.sqrt((lastPoint.x-nextTileStartX)*(lastPoint.x-nextTileStartX) + (lastPoint.y-nextTileStartY)*(lastPoint.y-nextTileStartY));
              timeToNextStartPos_us = (tileFinalJumpLengt/PARAM.getParamReal('durationSim', 'JumpSpeed'))*1000*1000
            }       
          
          let hatcblockPath = new PATH_SET.bsPathSet();
          hatcblockPath.addHatches(tempHatch);
          
          let skipCount = hatchblock.getSkipCount();
          let pathCount = hatcblockPath.getPathCount();            
          
          
          let pathpoint_1 = hatchblock.getPoint[i];
          let pathpoint_2 = hatchblock.getPoint[i+2];
            
          skipcountArray.push(skipCount);
          pathcountArray.push(pathCount);
            
          let skywritingPostConst = 0; 
          let skywritingPrevConst = 0;
          
          if(PARAM.getParamInt('skywriting','skywritingMode') == 0){
            
            skywritingPostConst = 0;
            skywritingPrevConst = 0;
            
            } else if (PARAM.getParamInt('skywriting','skywritingMode') == 1){
              
              skywritingPostConst = 20;
              skywritingPrevConst = 20;
              
            } else {
              
              skywritingPostConst = 10;
              skywritingPrevConst = 10;
              
            }           
            
          let npostDur = PARAM.getParamInt('skywriting','npost')*skywritingPostConst/10;
          let nprevDur = PARAM.getParamInt('skywriting','nprev')*skywritingPrevConst/10;
          
          //let switchOnDur = Math.abs(PARAM.getParamInt('skywriting','timelag')) + Math.abs(PARAM.getParamInt('skywriting','laserOnShift'))/64;
          //let switchOffDur = Math.abs(PARAM.getParamInt('skywriting','timelag'));
          
          skywritingDur += (npostDur + nprevDur)*skipCount;
          //skywritingDur += (npostDur + nprevDur + switchOnDur + switchOffDur)*skipCount;
          
          hatchResult.moveDataFrom(tempHatch); // move hatches to result 
         }//for hatch
                      
        //store the processing duration for this laser in this tile
        let exposureTimeMicroSeconds = thisLaserInTileExposureDuration.getExposureTimeMicroSeconds();
        //Process.printInfo();
        exposureTimeMicroSeconds += Math.ceil(nBufferduration); // add buffer duration        
        exposureTimeMicroSeconds -= Math.ceil(timeFromOrigo_us); // remove traveltime from orego
        //exposureTimeMicroSeconds += Math.ceil(timeBetweenBlocks_us); // add traveltime between blocks
        if(PARAM.getParamInt('skywriting','skywritingMode') != 0){
          exposureTimeMicroSeconds += Math.ceil(skywritingDur); // add delay from skywriting
        }
        exposureTimeMicroSeconds += Math.ceil(timeToNextStartPos_us);
        exposureTimeMicroSeconds += Math.ceil(timeFromStartPosToHatch_us);
        
        passNumberGroups[passNumber].tiles[tileNumber].laser[laserId].laserProcessDuration = exposureTimeMicroSeconds;
        tileExposureArray.push(exposureTimeMicroSeconds);
             
      }//if integer         
  }//for laser
     
  // get exposure duration for laser with the largest workload
 let maxLaserScanningDuration = Math.max.apply(Math,tileExposureArray);
 let maxPathCount = Math.max.apply(Math,pathcountArray);
 let maxskipCount = Math.max.apply(Math,skipcountArray);
 //process.printInfo('laynr: '+ nLayerNr + ' stripe: '+ (passNumber+1) + ' tile: '+ (tileNumber+1) + ' dur[ms]: ' + maxLaserScanningDuration/1000);
  //process.printInfo(maxPathCount + ' / ' + maxskipCount);
  let speedy = 0;
   if(PARAM.getParamInt('tileing','ScanningMode') == 0){ // moveandshoot
         speedy = PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms');
    } else { //onthefly
      let tileSize = PARAM.getParamReal('otf','tile_size');
      let speedLimit = PARAM.getParamReal('otf','axis_max_speed');
      
      if (maxLaserScanningDuration > 0) {
         speedy = tileSize / (maxLaserScanningDuration/(1000*1000));
      }else{
        speedy = speedLimit;
        }           
     }
    
    if (speedy>PARAM.getParamReal('otf','axis_max_speed')){
      speedy = PARAM.getParamReal('otf','axis_max_speed');
      }
  passNumberGroups[passNumber].tiles[tileNumber].speedy = speedy;  
  passNumberGroups[passNumber].tiles[tileNumber].tileExposureDuration = maxLaserScanningDuration;  
  
 }//for tile
  
  let passDuration = 0;
  for(let tileID in passNumberGroups[passNumber].tiles){ // calculate scanning duration of each pass
        passDuration += passNumberGroups[passNumber].tiles[tileID].tileExposureDuration;
  } // for  
  
  passNumberGroups[passNumber].passExposureDuration = passDuration; // add the passDuration to the passNumberGroups
    
}//for passgroups        

let layerExposureDuration = 0;

for (let pass in passNumberGroups){ // the the sum of pass durations and store as layer duration
    if(passNumberGroups[pass].passExposureDuration){
        layerExposureDuration += passNumberGroups[pass].passExposureDuration;
    }
}

passNumberGroups.layerExposureDuration = layerExposureDuration;

//exporter_3mf.content[0].attributes.layerScanningDuration = layerExposureDuration;


var exporter_3mf = {
      
    "segment_attributes": [
          {
           "segmenttype": "hatch",
           "datatype": "uint32",
           "attribute_name": 1,
           "attribute_value": 1,
           "namespace": "http://adira.com/tilinginformation/202305"
           }
    ],
        "content": []
    };

for (let passNr in passNumberGroups){
    
   if(Number.isInteger(Number(passNr))){ // only perfom task if the passNr is an integer*/
      let thispass = passNumberGroups[passNr];

      exporter_3mf.content[passNr] = {
             "name": "sequence",
             "namespace": "http://adira.com/tilinginformation/202305",
             "attributes": {
                "uuid": thispass.uuid,
                "startx": thispass.startx,
                "starty": thispass.starty,//-scanheadArray[0].rel_y_max,
                "sequencetransferspeed": thispass.sequencetransferspeed,
                "type": thispass.type,
                "requiredPasses": thispass.requiredPasses,
                "tilesInPass": thispass.tilesInPass,
                "layerScanningDuration":passNumberGroups.layerExposureDuration
              },
              "children": thistiletable[passNr]
          };
      
      let activeTile = [];     
      for (let tileNr in thispass.tiles){ // consider substituting for OF
         let tile =  thispass.tiles[tileNr];
         activeTile.push(Number(tileNr));
        
        //process.printInfo('typeof:' + typeof(tile.tileExposureDuration));
        
         exporter_3mf.content[passNr].children[tileNr] = {
           "name": "movement",
                      "attributes": {
                        "tileID":  thistiletable[passNr][tileNr].attributes.tileID,
                        "targetx": tile.xcoord,
                        "targety": thistiletable[passNr][tileNr].attributes.targety,
                        "positiony": thistiletable[passNr][tileNr].attributes.positiony,
                        "speedx":  tile.speedx,
                        "speedy":  tile.speedy,
                        "tileExposureTime": tile.tileExposureDuration         
                      }			
           };
      
           
      }//tileNr
             
      let firstTile = Math.min.apply(Math,activeTile);
      let lastTile = Math.max.apply(Math,activeTile);
      let currentTiles =exporter_3mf.content[passNr].children;
      exporter_3mf.content[passNr].attributes.tilesInPass = lastTile-firstTile + 1;
      let tilesToRemove = [];
      for(let i =0; i<required_passes_y;i++){
        if (i < firstTile || i > lastTile){
          tilesToRemove.push(i);// remove unused tiles if they first or last in the pass   
          }
        }
        
       exporter_3mf.content[passNr].children = exporter_3mf.content[passNr].children.filter(function(child,index) {
       return tilesToRemove.indexOf(index) === -1;
         });   
      
   } // pass is pass (integer)
} //passNr


thisLayer.setAttribEx('exporter_3mf', exporter_3mf);

}; // makeExposureLayer
  
/**
* Export exposure data to file
* @param  exportFile     bsFile
* @param  sFilter        string
* @param  modelData      bsModelData
* @param  progress       bsProgress
*/
exports.exportToFile = function(
  exportFile, 
  sFilter, 
  modelData, 
  progress)
{
  if('CLI-C108C8EC-70C4-40AE-94D2-75B778311531' != sFilter){
    throw new Error('Unsupported export filter');
  }
  
  // make it an ascii file containing part and fixtures exposure data
  var cli_exporter = new CLI.cliExport(
    1.0, 
    CLI.options.ascii | CLI.options.buildPart | CLI.options.support | CLI.options.exposure
  );
  
  // Declare vector attributes to exporter
  // Note: By adding this we are breaking the official CLI standard
  cli_exporter.addExportAttributeInt('bsid', 'BSID');
  cli_exporter.addExportAttributeInt('power', 'POWER');
  cli_exporter.addExportAttributeReal('speed', 'SPEED');
  
  // do the export
  cli_exporter.exportCli(exportFile, modelData, progress);  
};

/**
* Export exposure data to given directory
* @param  exportDir      bsDirectory
* @param  sFilter        string
* @param  modelData      bsModelData
* @param  progress       bsProgress
*/
exports.exportToDirectory = function(
  exportDir, 
  sFilter, 
  modelData, 
  progress)
{
  throw new Error('Unsupported export filter');
};

/**
* Define arbitrary additional properties.
* These properties can be read by the host program (e.g. ATU or Netfabb) directly.
*
* There are predefined properties located within adsk_main :
* lower_layers_dependence :
*   How many additional layers below influence the toolpath
*   result of a current layer. E.g. if overhang calculation is applied then
*   the toolpath of a current layer would depend on one or more layers below.
*   This information is important to ATU and Netfabb for creating
*   a correct toolpath preview for individual layers.
* upper_layers_dependence :
*   How many additional layers above influence the
*   toolpath result of a current layer.
* custom_thickness_allowed :
*   Custom layer thickness is supported.
*
* @param sMaterial    Material name string
* @param nThickness   Layer thickness
* @param properties   Property object
*/
exports.declareBuildstyleProperties = function(
  sMaterial,
  nThickness,
  properties)
{
  // Any layer thickness is allowed
  properties.adsk_main.custom_thickness_allowed = true;
};
