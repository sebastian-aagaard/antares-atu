/************************************************************
 * Adira AddCreative Buildstyle
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */

'use strict';

// -------- INCLUDES -------- //
var PARAM = requireBuiltin('bsParam');
var EXPORT_FILTER = requireBuiltin('bsExportFilter');
var CLI = require('main/export_cli.js');
var LOCALIZER = require('localization/localizer.js');

// -------- CONFIG INCLUDES -------- //
var MACHINE_CONFIG = require('../configuration/machine_declaration.js');
var PARAM_CONFIG = require('../configuration/parameter_declaration.js');
var ATTRIB_CONFIG = require('../configuration/attribute_declaration.js');
var POST_PROCESS = require('main/post_processor.js');

// -------- BUILDSTYLE INCLUDES -------- //
var UTIL = require('main/utility_functions.js');
//var TILE = require('main/tileing.js');
//var LASER = require('main/laser_designation.js');
var CONST = require('main/constants.js');
//var TPGEN = require('main/toolpath_generation.js');
var PREPROCESSOR = require('main/preprocessor.js');
var TOOLPATH = require('main/Toolpath.js');

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
    
  ATTRIB_CONFIG.declareBuildAttributes(buildAttrib);
    
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
    power_watt: PARAM.getParamReal('ScanningParameters','openpolyline_power'),
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
  
  if(CONST.bIncludeScanningAttributes){
    var additionalAttributes = [ skywritingAttributes, scanningAttributes];
  } else {
    var additionalAttributes = [ skywritingAttributes];
  }
  var customTable = [];  
  for(let l_laser_nr = 1; l_laser_nr<=CONST.nLaserCount;++l_laser_nr)
  {
    // Open Polylines
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_openPolyline); //laser no * 10
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_part_hatch); // laser no * 10 + 1
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_part_contour); // laser no * 10 + 2
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_downskin_hatch); // laser no * 10 + 3
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_downskin_contour); // laser no * 10 + 3
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_support_hatch); // laser no * 10 + 3
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
    bsid_obj.bsid = (10 * l_laser_nr+CONST.nType_support_contour); // laser no * 10 + 3
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
 //   generate scan head objects       //
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
    this.y_ref = 
    this.abs_x_min = this.x_ref+this.rel_x_min;//+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
    this.abs_x_max = this.x_ref+this.rel_x_max;//+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
  }
  
  let scanhead_array = [];
  
  for (let i = 0; i < CONST.nLaserCount; i++) {
    scanhead_array[i] = new scanner(i+1);
   }
  model.setAttribEx('scanhead_array',scanhead_array);  


UTIL.setLaserDisplayColor(model);
   
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

PREPROCESSOR.preprocessLayerStack(modelDataSrc, modelDataTarget, progress);
  
}; //preprocessLayerStack

/**
* Calculate the exposure data / hatch vectors for one layer of a part
* @param  modelData    bsModelData
* @param  hatchResult  bsHatch
* @param  nLayerNr      int
*/
exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr)
{  

  TOOLPATH.makeExposureLayer(modelData, hatchResult, nLayerNr);
  
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
