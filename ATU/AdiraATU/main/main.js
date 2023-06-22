/** todo
* implement unit testing
 *  - is geometry inside build area
*/

'use strict';

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
var CLI = require('main/export_cli.js');
var LOCALIZER = require('localization/localizer.js');
//var TILEING = require('tileing.js');
var EXPOSURETIME = requireBuiltin('bsExposureTime');


// different types of scanning
const type_openPolyline = 0;
const type_part_hatch = 1;
const type_part_contour = 2;
const type_downskin_hatch = 3;
const type_downskin_contour = 4;
const type_support_hatch = 5;
const type_support_contour = 6;

/** 
* Specify general information
* @param  aboutInfo  bsAboutInfo
*/
exports.about = function(aboutInfo)
{
   aboutInfo.addCommentLine('AddCreator');
   aboutInfo.addCommentLine('Adira');
   aboutInfo.addCommentLine('Copyright 2023');
};

/**
*  Declare machine configuration
*
* @param  machineConfig   bsMachineConfig
*/
exports.declareMachine = function(machineConfig)
{
  machineConfig.setBuildstyleName('OTF');
  machineConfig.setMachineName('AddCreator');
  machineConfig.addMaterialName('IN718');
  machineConfig.addMaterialName('DevelopmentMode');
  machineConfig.addLayerThickness(50);
  machineConfig.addLayerThickness(200);

};

/**
* The buildstyle declares its parameters to the main application. 
* These parameters can be modified by the user within the specified range.
* Parameters are always declared like this:
* 'group-id', 'name', 'display string', min, max, default
*
* @param  parameter   bsBuildParam
*/
exports.declareParameters = function(parameter)
{
  // declare hatch parameter groups (volume/overhang)
  // later on parameters are declared within these groups
  // Parameter groups are always declared like this:
  // 'group-id', 'display string'
  
 
  
  parameter.declareParameterGroup('exposure', LOCALIZER.GetMessage('grp_exposure'));
  parameter.declareParameterReal('exposure', 'min_vector_lenght', LOCALIZER.GetMessage('param_min_vector_length'), 0.0, 10.0, 0.1);
  parameter.declareParameterReal('exposure', 'small_vector_merge_distance', LOCALIZER.GetMessage('param_small_vector_merge_distance'), 0.0, 10.0, 0.05);

  parameter.declareParameterReal('exposure', 'beam_compensation', LOCALIZER.GetMessage('param_beam_compensation'), 0.0, 10.0, 0.05);
  parameter.declareParameterReal('exposure', 'boarder_offset', LOCALIZER.GetMessage('param_boarder_offset'), 0.0, 10.0, 0.05);
  parameter.declareParameterReal('exposure', '_hdens', LOCALIZER.GetMessage('param_hatch_density'), 0.001, 20.0, 0.1);
  
  parameter.declareParameterReal('exposure', 'hatch_angle_init', LOCALIZER.GetMessage('param_hatch_angle_init'), 0, 360, 45);
  parameter.declareParameterReal('exposure', 'hatch_angle_increment', LOCALIZER.GetMessage('param_hatch_angle_increment'), -360, 360, 90.0);
  
  parameter.declareParameterReal("exposure", "down_skin_surface_angle", LOCALIZER.GetMessage('param_down_skin_surface_angle'), 0.0, 89.0, 60.0);
  parameter.declareParameterInt("exposure", "down_skin_layer_reference", LOCALIZER.GetMessage('param_down_skin_layer_reference'), 1, 9, 5);
  parameter.declareParameterReal("exposure", "down_skin_hdens", LOCALIZER.GetMessage('param_hatch_down_skin_density'), 0.001, 2.0, 0.1);
  parameter.declareParameterReal("exposure", "down_skin_hangle", LOCALIZER.GetMessage('param_hatch_down_skin_angle'), 0, 360, 45);
  parameter.declareParameterReal('exposure', 'down_skin_hangle_increment', LOCALIZER.GetMessage('param_hatch_down_skin_angle_increment'), -360.0, 360.0, 90.0);
  parameter.declareParameterReal('exposure', 'down_skin_overlap', LOCALIZER.GetMessage('param_down_skin_overlap'), 0.0, 100.0, 0.7);

  parameter.declareParameterReal('exposure', 'JumpSpeed', LOCALIZER.GetMessage('param_JumpSpeed'), 0.001, 2000, 1000);
  parameter.declareParameterReal('exposure', 'MeltSpeed', LOCALIZER.GetMessage('param_MeltSpeed'), 0.001, 2000, 200);
  parameter.declareParameterReal('exposure', 'JumpLengthLimit', LOCALIZER.GetMessage('param_JumpLengthLimit'), 0.001, 1000, 1000);
  parameter.declareParameterInt('exposure', 'JumpDelay', LOCALIZER.GetMessage('param_JumpDelay'), 0.0, 100.0, 50.0);
  parameter.declareParameterInt('exposure', 'MinJumpDelay', LOCALIZER.GetMessage('param_MinJumpDelay'), 0.0, 20.0, 10.0);
  parameter.declareParameterInt('exposure', 'MarkDelay', LOCALIZER.GetMessage('param_MarkDelay'), 0.0, 100.0, 60.0);
  parameter.declareParameterInt('exposure', 'PolygonDelay', LOCALIZER.GetMessage('param_PolygonDelay'), 0.0, 100.0, 65.0);
  parameter.declareParameterChoice('exposure', 'PolygonDelayMode', 
     LOCALIZER.GetMessage('param_PolygonDelayMode'),
      [LOCALIZER.GetMessage('param_PolygonDelayMode_Variable'),
      LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')],
      LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')
      );


  parameter.declareParameterInt('exposure', 'laser_count', LOCALIZER.GetMessage('param_laser_count'), 2, 16, 5);
  parameter.declareParameterReal('exposure', 'field_size_x', LOCALIZER.GetMessage('param_hatch_field_size_x'), 0.1, 200.0, 10);
  parameter.declareParameterReal('exposure', 'field_size_y', LOCALIZER.GetMessage('param_hatch_field_size_y'), 0.1, 100.0, 33.3);
  parameter.declareParameterReal('exposure', 'field_overlap_x', LOCALIZER.GetMessage('param_hatch_field_overlap_x'), -100.0, 100.0, 0.1);
  parameter.declareParameterReal('exposure', 'field_overlap_y', LOCALIZER.GetMessage('param_hatch_field_overlap_y'), -100, 100.0, 0.1);
  parameter.declareParameterReal('exposure', 'field_min_area', LOCALIZER.GetMessage('param_hatch_field_min_area'), 0.05, 100.0, 0.05);


  
  parameter.declareParameterGroup('workarea',LOCALIZER.GetMessage('grp_workarea'));
  parameter.declareParameterInt('workarea', 'x_workarea_min_mm',LOCALIZER.GetMessage('param_x_workarea_min_mm'),0,1010,0);
  parameter.declareParameterInt('workarea', 'x_workarea_max_mm',LOCALIZER.GetMessage('param_x_workarea_max_mm'),0,1010,1000);
  parameter.declareParameterInt('workarea', 'y_workarea_min_mm',LOCALIZER.GetMessage('param_y_workarea_min_mm'),0,1010,0);
  parameter.declareParameterInt('workarea', 'y_workarea_max_mm',LOCALIZER.GetMessage('param_y_workarea_max_mm'),0,1010,995);
  
  parameter.declareParameterGroup('travelrange',LOCALIZER.GetMessage('grp_travelrange'));
  parameter.declareParameterInt('travelrange', 'x_travel_range_min_mm',LOCALIZER.GetMessage('param_x_travel_range_min_mm'),-10,650,-10);
  parameter.declareParameterInt('travelrange', 'x_travel_range_max_mm',LOCALIZER.GetMessage('param_x_travel_range_max_mm'),-10,650,650);
  parameter.declareParameterInt('travelrange', 'y_travel_range_min_mm',LOCALIZER.GetMessage('param_y_travel_range_min_mm'),-525,995,-525);
  parameter.declareParameterInt('travelrange', 'y_travel_range_max_mm',LOCALIZER.GetMessage('param_y_travel_range_max_mm'),-525,995,995);
  
  // scanner head
  parameter.declareParameterGroup('scanhead',LOCALIZER.GetMessage('grp_scanhead'));

    parameter.declareParameterReal('scanhead', 'y_global_max_limit', 'parm_y_global_max_limit',0,1000,995);
    parameter.declareParameterReal('scanhead', 'x_global_max_limit', 'param_y_global_max_limit',0,1000,660);
    
    parameter.declareParameterReal('scanhead', 'stripe_min_y_mm', LOCALIZER.GetMessage('param_y_stripe_min_mm'),-100, 0, -16.5); // -60
    parameter.declareParameterReal('scanhead', 'stripe_max_y_mm',LOCALIZER.GetMessage('param_y_stripe_max_mm'),0,100,16.5); // 50
    parameter.declareParameterReal('scanhead', 'stripe_ref_mm',LOCALIZER.GetMessage('param_y_stripe_ref_mm'),-100,100,0);
    
    parameter.declareParameterReal('scanhead', 'tile_overlap_x',LOCALIZER.GetMessage('param_tile_overlap_x'),-100,100,0);
    parameter.declareParameterReal('scanhead', 'tile_overlap_y',LOCALIZER.GetMessage('param_tile_overlap_y'),-100,100,0);

    parameter.declareParameterReal('scanhead', 'x_scanner1_max_mm2',LOCALIZER.GetMessage('param_x_scanner1_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner1_min_mm2',LOCALIZER.GetMessage('param_x_scanner1_min_mm'),-100,0,-40);
    parameter.declareParameterReal('scanhead', 'x_scanner1_ref_mm',LOCALIZER.GetMessage('param_x_scanner1_ref_mm'),0,390,0);

    parameter.declareParameterReal('scanhead', 'x_scanner2_max_mm2',LOCALIZER.GetMessage('param_x_scanner2_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner2_min_mm2',LOCALIZER.GetMessage('param_x_scanner2_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner2_ref_mm',LOCALIZER.GetMessage('param_x_scanner2_ref_mm'),0,390,85);

    parameter.declareParameterReal('scanhead', 'x_scanner3_max_mm2',LOCALIZER.GetMessage('param_x_scanner3_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner3_min_mm2',LOCALIZER.GetMessage('param_x_scanner3_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner3_ref_mm',LOCALIZER.GetMessage('param_x_scanner3_ref_mm'),0,390,170);

    parameter.declareParameterReal('scanhead', 'x_scanner4_max_mm2',LOCALIZER.GetMessage('param_x_scanner4_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner4_min_mm2',LOCALIZER.GetMessage('param_x_scanner4_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner4_ref_mm',LOCALIZER.GetMessage('param_x_scanner4_ref_mm'),0,390,255);

    parameter.declareParameterReal('scanhead', 'x_scanner5_max_mm2',LOCALIZER.GetMessage('param_x_scanner5_max_mm'),0,100,50);
    parameter.declareParameterReal('scanhead', 'x_scanner5_min_mm2',LOCALIZER.GetMessage('param_x_scanner5_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner5_ref_mm',LOCALIZER.GetMessage('param_x_scanner5_ref_mm'),0,390,340);
  

  
  // onthefly
  parameter.declareParameterGroup('otf', LOCALIZER.GetMessage('grp_otf'));
    parameter.declareParameterReal('otf','tile_size', LOCALIZER.GetMessage('param_tile_size'),0.0,160.0,30.0);
    parameter.declareParameterReal('otf','axis_max_speed', LOCALIZER.GetMessage('param_axis_max_speed'),0.0,100.0,80.0);
    parameter.declareParameterReal('otf','tile_rest_period', LOCALIZER.GetMessage('param_tile_rest_period'),0.0,120.0,0);
    
    // group tileing
  parameter.declareParameterGroup('tileing',LOCALIZER.GetMessage('grp_tileing'));
    parameter.declareParameterReal('tileing','overlap', LOCALIZER.GetMessage('param_overlap'),0.0,100.0,0.1);
    parameter.declareParameterReal('tileing','step_x', LOCALIZER.GetMessage('param_step_x'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_x', LOCALIZER.GetMessage('param_number_x'),0,10,2);
    parameter.declareParameterReal('tileing','step_y', LOCALIZER.GetMessage('param_step_y'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_y', LOCALIZER.GetMessage('param_number_y'),0,10,0);
    parameter.declareParameterChoice('tileing', 'TilingMode', 
     LOCALIZER.GetMessage('param_TilingMode'),
      [LOCALIZER.GetMessage('param_TilingMode_Static'),
      LOCALIZER.GetMessage('param_TilingMode_Smart')],
      LOCALIZER.GetMessage('param_TilingMode_Smart')
      ); 
   
  parameter.declareParameterGroup('laser', LOCALIZER.GetMessage('grp_laser'));
    parameter.declareParameterInt('laser', 'fill_power', LOCALIZER.GetMessage('param_hatch_power'), 0, 1000, 190);
    parameter.declareParameterReal('laser', 'fill_speed', LOCALIZER.GetMessage('param_hatch_speed'), 0, 10000, 1900);
    parameter.declareParameterInt('laser', 'open_border_power', LOCALIZER.GetMessage('param_openline_power'), 0, 1000, 170);
    parameter.declareParameterReal('laser', 'open_border_speed', LOCALIZER.GetMessage('param_openline_speed'), 0, 10000, 1700);

  parameter.declareParameterGroup('scanning_priority', LOCALIZER.GetMessage('grp_scanning_priority'));
    parameter.declareParameterInt('scanning_priority','bulk_hatch', LOCALIZER.GetMessage('param_hatch_bulk'),0,2000,100);
    
    

    
    
};

/** 
* @param  a_config    bsPostProcessingConfig 
*/
exports.configurePostProcessingSteps = function(a_config)
{
  // Postprocessing the toolpaths using the given function:
  a_config.addPostProcessingStep(postprocessLayerStack_MT,{bMultithread: true, nProgressWeight: 1});
}

/**
*  Declare attributes to be stored within exposure vectors
*
* @param  buildAttrib   bsBuildAttribute
*/
exports.declareBuildAttributes = function(buildAttrib)
{
  
  buildAttrib.declareAttributeInt('bsid'); // buildstyle ID
  buildAttrib.declareAttributeReal('power'); // beam laser power
  buildAttrib.declareAttributeReal('speed'); // scanning speed
  buildAttrib.declareAttributeInt('type'); // scanning type
  buildAttrib.declareAttributeInt('passNumber');//
  buildAttrib.declareAttributeReal('xcoord');
  buildAttrib.declareAttributeReal('ycoord');
  buildAttrib.declareAttributeInt('tile_index');
  buildAttrib.declareAttributeInt('isl_exposureDuration_ms');
  buildAttrib.declareAttributeReal('tile_exposure_time');
  buildAttrib.declareAttributeInt('tileDuration');
  buildAttrib.declareAttributeReal('Subtile_Duration');
  buildAttrib.declareAttributeInt('scanzone');
  buildAttrib.declareAttributeReal('exposure_lenght');
  buildAttrib.declareAttributeInt('scanning_priority');
  buildAttrib.declareAttributeInt('laser_index');
  buildAttrib.declareAttributeInt('sharedZone');
  buildAttrib.declareAttributeInt('zoneExposure');
  buildAttrib.declareAttributeInt('zoneIndex');
  buildAttrib.declareAttributeReal('ScanheadMoveSpeed');
  
  for(let i = 0; i<PARAM.getParamInt('exposure', 'laser_count');i++)
  {
    buildAttrib.declareAttributeInt(`laser_index_${i+1}`);
  }
  
  
};


/**
* the buildstyle declares its export filters to the main application
* 'filter-id', 'display string', 'file extension'
*
* @param  exportFilter  bsExportFilter
*/
exports.declareExportFilter = function(exportFilter)
{    
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
* Activate additional features which requires additional resources
* like memory or cpu time.
* Only activate features if they are actually used.
* @param  modelFeatures  bsModelFeatures
*/
exports.declareModelFeatures = function(modelFeatures)
{

};

/**
* Prepare a part for calculation. Checking configuration
* and adding properties to the part
* @param  model   bsModel
*/

exports.prepareModelExposure = function(model)
{
  
  var layer_thickness = model.getLayerThickness();
  var material_name = model.getMaterialID();
  
    
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
     

 
  let openPolyLine_power = openpolyline.power_watt;
  let openPolyLine_speed = openpolyline.markspeed;
  let openPolyLine_defocus = openpolyline.power_defocus;
  
  let part_hatch_power = hatch.power_watt;
  let part_hatch_speed = hatch.markspeed;
  let part_hatch_defocus = hatch.defocus;
  
  let part_contour_power = contour.power_watt;
  let part_contour_speed = contour.markspeed;
  let part_contour_defocus = contour.defocus;
  
  let downskin_hatch_power = overhang_hatch.power_watt;
  let downskin_hatch_speed = overhang_hatch.markspeed;
  let downskin_hatch_defocus = overhang_hatch.defocus;
  
  let downskin_contour_power =  overhang_contour.power_watt;
  let downskin_contour_speed = overhang_contour.markspeed;
  let downskin_contour_defocus = overhang_contour.defocus;
  
  let support_hatch_power = support_hatch.power_watt; 
  let support_hatch_speed = support_hatch.markspeed;
  let support_hatch_defocus = support_hatch.defocus;
  
  let support_contour_power = support_contour.power_watt;
  let support_contour_speed = support_contour.markspeed;
  let support_contour_defocus = support_contour.defocus;
  
  
 
 // let part_hatch_power = PARAM.getParamInt('laser', 'fill_power');
//  let part_hatch_speed = PARAM.getParamReal('laser', 'fill_speed');
    
 // let open_border_power = PARAM.getParamInt('laser', 'open_border_power');
  //let open_border_speed = PARAM.getParamReal('laser', 'open_border_speed');
  
  let laser_count = PARAM.getParamInt('exposure', 'laser_count')

  // Create custom table
  //generates a custom  table containing different parameters depending on laser number
  var customTable = [];  
  for(let l_laser_nr = 1; l_laser_nr<=laser_count;++l_laser_nr)
  {
    // Open Polylines
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr); //laser no * 10
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = openPolyLine_power;
    bsid_obj.focus = openPolyLine_defocus;
    bsid_obj.speed = openPolyLine_speed;
    customTable.push(bsid_obj);

    // Part Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+1); // laser no * 10 + 1
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = part_hatch_power;
    bsid_obj.focus = part_hatch_defocus;
    bsid_obj.speed = part_hatch_speed;
    customTable.push(bsid_obj);
    
    // part Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+2); // laser no * 10 + 2
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = part_contour_power;
    bsid_obj.focus = part_contour_defocus;
    bsid_obj.speed = part_contour_speed;
    customTable.push(bsid_obj);
    
    // downskin Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+3); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = downskin_hatch_power;
    bsid_obj.focus = downskin_hatch_defocus;
    bsid_obj.speed = downskin_hatch_speed;
    customTable.push(bsid_obj);
    
    // downskin Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+4); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = downskin_contour_power;
    bsid_obj.focus = downskin_contour_defocus;
    bsid_obj.speed = downskin_contour_speed;
    customTable.push(bsid_obj);
    
    // Support Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+5); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = support_hatch_power;
    bsid_obj.focus = support_hatch_defocus;
    bsid_obj.speed = support_hatch_speed;
    customTable.push(bsid_obj);
    
    // Support Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+6); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.power = support_contour_power;
    bsid_obj.focus = support_contour_defocus;
    bsid_obj.speed = support_contour_speed;
    customTable.push(bsid_obj);
    
  } // for
  model.setAttribEx('customTable', customTable);

};

// get all relevant information for the tiling providing the origin of the scanhead
function getTilePosition(x_pos,y_pos){
  this.xpos;
  this.ypos;
  this.x_min = x_pos + PARAM.getParamReal('scanhead','x_scanner1_ref_mm') + PARAM.getParamReal('scanhead','x_scanner1_min_mm2');
  this.x_max = x_pos + PARAM.getParamReal('scanhead','x_scanner5_ref_mm') + PARAM.getParamReal('scanhead','x_scanner5_max_mm2');
  this.y_min = y_pos + PARAM.getParamReal('scanhead','stripe_ref_mm') + PARAM.getParamReal('scanhead','stripe_min_y_mm');
  this.y_max = y_pos + PARAM.getParamReal('scanhead','stripe_ref_mm') + PARAM.getParamReal('scanhead','stripe_max_y_mm');
  this.x_global_limit = PARAM.getParamReal('scanhead','x_global_max_limit');
  this.y_global_limit = PARAM.getParamReal('scanhead','y_global_max_limit');
  this.tile_height = this.y_max - this.y_min;
  this.tile_width =  this.x_max - this.x_min;
  this.next_x_coord = x_pos + this.tile_width + PARAM.getParamReal('scanhead','tile_overlap_x');
  this.next_y_coord = y_pos + this.tile_height + PARAM.getParamReal('scanhead','tile_overlap_y');
} 


function getTileArrayPre(modelLayer,bDrawTile){
   
   var boundaries = modelLayer.getAttribEx('boundaries');
   let maxX = boundaries.m_max.m_coord[0];
   let minX = boundaries.m_min.m_coord[0];
   let maxY = boundaries.m_max.m_coord[1];
   let minY = boundaries.m_min.m_coord[1];
  
  ////////////////////////////////
  // Define and store Tiles     //
  ////////////////////////////////
  
   let scene_size_x = maxX - minX;
   let scene_size_y = maxY - minY;     
   let scence_center_x = minX + scene_size_x/2;
   let scence_center_y = minY + scene_size_y/2;
   // add some check cannot be larger then required
   
   let scanhead_global_pass_position = new Array;
   let scanhead_x_starting_pos = 0;
   let scanhead_y_starting_pos = 0;
   
  // find the tileOutlineOrigin if scannerarray positioned at origo (0,0)
   let tileOutlineOrigin = new getTilePosition(scanhead_x_starting_pos,scanhead_y_starting_pos); // get the tile layout information.
   
   // calculate the required tiles both in x and y (rounded up to make fit into whole passes)
   var required_passes_x = Math.ceil(scene_size_x/tileOutlineOrigin.tile_width);
   var required_passes_y = Math.ceil(scene_size_y/tileOutlineOrigin.tile_height);
   

   ///// find the actual starting position of the scanner_head (defined by the scenesize)

   // check boundaries in y
   
   if(minY < 0 ){ // if the bounds are outside the powderbed force the tiling to start within // should'nt happen
       scanhead_y_starting_pos = 0;
     } else {
     scanhead_y_starting_pos = minY-PARAM.getParamReal('scanhead','stripe_min_y_mm');
     }
    
     let maxPositionY = scanhead_y_starting_pos+(tileOutlineOrigin.tile_height+PARAM.getParamReal('scanhead','tile_overlap_y'))*(required_passes_y-1);
        
     if (maxPositionY > PARAM.getParamReal('scanhead','y_global_max_limit'))
       {
     scanhead_y_starting_pos -= maxPositionY - PARAM.getParamReal('scanhead','y_global_max_limit');
       }
     
   // check boundaries in x    
       
   if(minX < 0 ){
       scanhead_x_starting_pos = 0;
   } else {
   scanhead_x_starting_pos = minX;
     }
   
   let maxPositionX = scanhead_x_starting_pos+(tileOutlineOrigin.tile_width+PARAM.getParamReal('scanhead','tile_overlap_x'))*(required_passes_x-1);
     
   if (maxPositionX > PARAM.getParamReal('scanhead','x_global_max_limit'))
     {
     scanhead_x_starting_pos -= maxPositionX - PARAM.getParamReal('scanhead','x_global_max_limit');
     }
   
   // add empty model to display the tilepositions 
      
   var tileTable = [];  // store the tilelayout
     
    let cur_tile_coord_x =  scanhead_x_starting_pos;
    let cur_tile_coord_y =  scanhead_y_starting_pos;
       
  for (let i=0; i <required_passes_x; i++)
  {
    
    let cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y);
    let next_tile_coord_x = cur_tile.next_x_coord;
    
    
    for(let j =0; j<required_passes_y;j++)
    {       
         
      cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y);
      
      var tile = new PATH_SET.bsPathSet();
      
       var scanhead_outlines = new Array(4);
       scanhead_outlines[0] = new  VEC2.Vec2(cur_tile.x_min, cur_tile.y_min); //min,min
       scanhead_outlines[1] = new VEC2.Vec2(cur_tile.x_min, cur_tile.y_max); //min,max
       scanhead_outlines[2] = new VEC2.Vec2(cur_tile.x_max, cur_tile.y_max); //max,max
       scanhead_outlines[3] = new VEC2.Vec2(cur_tile.x_max, cur_tile.y_min); //max,min
       
      
       if (bDrawTile)
       {
         tile.addNewPath(scanhead_outlines);
         tile.setClosed(false);
              
         modelLayer.addPathSet(tile,MODEL.nSubtypeSupport);         
       }

      
      // get laser zones within each tile
            
      // dataToPass
      var tile_obj = new Object();
      tile_obj.passNumber = i; 
      tile_obj.tile_number = j; 
      tile_obj.scanhead_outline = scanhead_outlines;
      tile_obj.scanhead_x_coord = cur_tile_coord_x;
      tile_obj.scanhead_y_coord = cur_tile_coord_y;
      tileTable.push(tile_obj);
      
      cur_tile_coord_y = cur_tile.next_y_coord;
    }
    
    cur_tile_coord_y = scanhead_y_starting_pos; // resest y coord
    cur_tile_coord_x = next_tile_coord_x; // set next stripe pass
  }
  
  modelLayer.setAttribEx('tileTable',tileTable);
  modelLayer.setAttrib('requiredPassesX',required_passes_x.toString());
  modelLayer.setAttrib('requiredPassesY',required_passes_y.toString());
}


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
  
  
  // to be implemented - ATDSK 
  var connectArgs = {
   bConnectPartOpenPolylines : true,
   bConnectSupportOpenPolylines : true,
   fPartOpenPolylinesMaxConnectionDist : 0.2,
   fSupportOpenPolylinesMaxConnectionDist : 0.2,
   fPartOpenPolylinesPointReductionTol : 0.005,
   fSupportOpenPolylinesPointReductionTol : 0.005,
   fPartOpenPolylinesPointReductionEdgeLen : 0.001,
   fSupportOpenPolylinesPointReductionEdgeLen : 0.001,
   bEnablePartOpenPolylinesSelfConnection : true,
   fPartOpenPolylinesMaxSelfConnectionDist : 0.001,
   bEnableSupportOpenPolylinesSelfConnection : true,
   fSupportOpenPolylinesMaxSelfConnectionDist : 0.001
  }; 
  
  let bCopyOtherData = true;

  //modelDataSrc.connectOpenPolylines(modelDataTarget, progress, bCopyOtherData, connectArgs);
  
  
  var overallBounds = new Object();
  var modelCount = modelDataSrc.getModelCount(); 
  var modelLayerCount = modelDataSrc.getLayerCount();
  var modelLayerHeight = modelDataSrc.getLayerThickness();
  var layerBoundaries = new Array;
  ////////////////////////////////////////
  // Caclulate Scene Boundaries pr Layer //
  /////////////////////////////////////////
  
  //!!!!! OBS: currently limited to 1 model !!!!!!
  // run through all models
    // find the tile position of each layer
       // add all islands to shadow islands
  
  
  //modelDataTarget.addEmptyModel(); // add empty model to modelDataTarget
  
  //first connectOpenPolylines and merge all islands on the platform into modelDataTarget
   for( var modelIndex=0; modelIndex < modelCount && !progress.cancelled(); modelIndex++ )
    {
      let thisModel = modelDataSrc.getModel(modelIndex);
      var currentModel = modelDataSrc.getModel(modelIndex);
      var connectedModel = new MODEL.bsModel();
    
     //thisModel.connectOpenPolylines(connectedModel, progress, bCopyOtherData, connectArgs);
    
     //jointModel.addModelCopy(currentModel);
     //jointModel.addModelCopy(connectedModel);
//        var reducedModel = modelDataTarget.getModel(0);
//        for (let layerIt = 0; layerIt <modelLayerCount;layerIt++)
//       {
//         var modelLayer =  thisModel.getModelLayer((layerIt+1)*modelLayerHeight);
//         var newPathSet = new PATH_SET.bsPathSet();
//         
//         var layerPathSet = modelLayer.getAllIslandsPathSet().clone(); // get and clone pathset from source current layer
//         
//        
//      
//         let newModelLayer = reducedModel.createModelLayer((layerIt+1)*modelLayerHeight);
//         
//         
//         //reduce point tolerances
//           
//           var removedPoints = layerPathSet.reducePointsInTolerance(0.005,0.00100);
//          
//           newModelLayer.addPathSet(layerPathSet,0);
//         
//       }     
      
     //modelDataTarget.addModelCopy(reducedModel);
      modelDataTarget.addModelCopy(thisModel);
      
      
    }
    
  // run through all layers and find the boundaries
  for( var modelIndex=0; modelIndex < modelCount && !progress.cancelled(); modelIndex++ )
    {
    let thisModel = modelDataTarget.getModel(modelIndex); // look at the joint models
      
      for (let layerIt = 0; layerIt <modelLayerCount;layerIt++)
      {
       var modelLayer =  thisModel.getModelLayer((layerIt+1)*modelLayerHeight);
        
        if (modelLayer.isValid())
        {
          

          var thisLayerBounds = modelLayer.getBounds();
          layerBoundaries[layerIt] = thisLayerBounds;
        
          modelLayer.setAttribEx('boundaries',thisLayerBounds);          
        }
       
       // calculate the tileArray
       
          let bDrawTile = true;  
          getTileArrayPre(modelLayer,bDrawTile);  

        
      }
    }
    
   ////////////////////////////////
  //  global exposureSettings   //
  ////////////////////////////////
       //  
 let exposureSettings =  
      {
        'fJumpSpeed' : PARAM.getParamReal('exposure', 'JumpSpeed'),
        'fMeltSpeed' : PARAM.getParamReal('exposure', 'MeltSpeed'),
        'fJumpLengthLimit' : PARAM.getParamReal('exposure', 'JumpLengthLimit'),
        'nJumpDelay' : PARAM.getParamInt('exposure', 'JumpDelay'),
        'nMinJumpDelay': PARAM.getParamInt('exposure', 'MinJumpDelay'),
        'nMarkDelay' : PARAM.getParamInt('exposure', 'MarkDelay'),
        'nPolygonDelay': PARAM.getParamInt('exposure', 'PolygonDelay'),
        'polygonDelayMode' : PARAM.getParamStr('exposure', 'PolygonDelayMode'),
      };
  
  
  modelDataTarget.setTrayAttribEx('exposureSettings',exposureSettings);
   
   
  ////////////////////////////////
  //  Laser display color def   //
  ////////////////////////////////
  let l_rnd_gen = new RND.Rand(239803);
  let laser_count = PARAM.getParamInt('exposure', 'laser_count');
  let laser_color = new Array;
   
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
  
  modelDataTarget.setTrayAttribEx('laser_color',laser_color);  
   
 ////////////////////////////////////////
 // generate scannerhead data obejcts //
 ///////////////////////////////////////
    

  function scanner(x_max_range,x_min_range,x_ref,laserIndex){
    this.laserIndex = laserIndex;
    this.rel_x_max = x_max_range;
    this.rel_x_min = x_min_range;
    this.x_ref = x_ref;
    this.rel_y_max = PARAM.getParamReal('scanhead','stripe_max_y_mm');
    this.rel_y_min = PARAM.getParamReal('scanhead','stripe_min_y_mm');
    this.y_range = Math.abs(this.rel_y_max)+Math.abs(this.rel_y_min);
    this.y_ref = PARAM.getParamReal('scanhead','stripe_ref_mm');
    this.x_range = Math.abs(x_max_range)+Math.abs(x_min_range);
    this.abs_x_min = x_ref+x_min_range+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
    this.abs_x_max = x_ref+x_max_range+Math.abs(PARAM.getParamReal('scanhead','x_scanner1_min_mm2'));
    this.displayColor = l_col[laserIndex];
  }
  
  let scanhead_array = [];
  
  for (let i = 0; i < laser_count; i++) {
    scanhead_array[i] = new scanner(
      PARAM.getParamReal('scanhead',`x_scanner${i+1}_max_mm2`), // max
      PARAM.getParamReal('scanhead',`x_scanner${i+1}_min_mm2`), // min
      PARAM.getParamReal('scanhead',`x_scanner${i+1}_ref_mm`), // ref post
      i+1, // scanner index
      );
   }
  
  modelDataTarget.setTrayAttribEx('scanhead_array',scanhead_array);  

   
  // generate and define different scanhead zones
  let scanhead_zones = new Array(laser_count*2-1);
  let scanhead_zones_array = new Array;

  
  function setZoneProperties(boarder_min,boarder_max, designation) {
    this.designation = designation // mix or single
    this.xMin = boarder_min;
    this.xMax = boarder_max
    }
 
    let m = 0;
  for (let scanner_iterator = 0; scanner_iterator<laser_count;scanner_iterator++){
    scanhead_zones_array[scanner_iterator] = new setZoneProperties (scanhead_array[scanner_iterator].abs_x_min,scanhead_array[scanner_iterator].abs_x_max, scanhead_array[scanner_iterator].laserIndex);
    scanhead_zones[m++] = scanhead_array[scanner_iterator].abs_x_min;
    scanhead_zones[m++] = scanhead_array[scanner_iterator].abs_x_max;
  }
  
   scanhead_zones.sort(function(a, b) {
      return a - b;
    }); // sort the zones in consequtive order
 
   modelDataTarget.setTrayAttribEx('scanhead_zones',scanhead_zones); 
    
}

/**
* Calculate the exposure data / hatch vectors for one layer of a part
* @param  modelData    bsModelData
* @param  hatchResult  bsHatch
* @param  nLayerNr      int
*/
exports.makeExposureLayer = function(modelData, hatchResult, nLayerNr)
{  
     
  var thisModel = modelData.getModel(0);
  
  let hatch_density = PARAM.getParamReal('exposure', '_hdens');
  let laser_count = PARAM.getParamInt('exposure', 'laser_count');
  
  var beam_compensation = PARAM.getParamReal("exposure", "beam_compensation");
  var boarder_offset = PARAM.getParamReal("exposure", "boarder_offset"); 
  //var number_of_borders = PARAM.getParamReal("exposure", "number_of_border");
  
  let hatch_param = thisModel.getAttribEx('hatch');
  
  let fill_power = hatch_param.power_watt;
  let fill_speed = hatch_param.markspeed;
  let fill_defocus = hatch_param.defocus;
  
  let contour_param = thisModel.getAttribEx('contour')
  
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
  
  let open_border_power = PARAM.getParamInt('laser', 'open_border_power');
  let open_border_speed = PARAM.getParamReal('laser', 'open_border_speed');
  
  var hatch_angle_increment =  PARAM.getParamReal("exposure", "hatch_angle_increment");
  var cur_hatch_angle = (PARAM.getParamReal("exposure", "hatch_angle_init") + (nLayerNr * hatch_angle_increment)) % 360

  var down_skin_surface_angle = PARAM.getParamReal("exposure", "down_skin_surface_angle");
  var down_skin_layer_reference = PARAM.getParamInt("exposure", "down_skin_layer_reference");
  var down_skin_hatch_density = PARAM.getParamReal("exposure", "down_skin_hdens");
  var down_skin_hatch_angle_increment =  PARAM.getParamReal("exposure", "down_skin_hangle_increment");
  var down_skin_cur_hatch_angle = (PARAM.getParamReal("exposure", "down_skin_hangle") + (nLayerNr * down_skin_hatch_angle_increment)) % 360
  var down_skin_overlap = PARAM.getParamReal("exposure", "down_skin_overlap");
  
  let exposureTime = new EXPOSURETIME.bsExposureTime();  
  exposureTime.configure(modelData.getTrayAttribEx('exposureSettings'));
   
  var laser_color = new Array;
  laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 

  /////////////////////////////////////////
  /// Merge all islands into one object ///
  /////////////////////////////////////////
 
  let all_islands = new ISLAND.bsIsland(); // generate island object

  var island_it = modelData.getFirstIsland(nLayerNr);
  
  let all_islands_part = new ISLAND.bsIsland(); // generate island object
  let all_islands_support = new ISLAND.bsIsland(); // generate island object
  
  while(island_it.isValid())
    { 
      var is_part = MODEL.nSubtypePart == island_it.getModelSubtype();
      var is_support = MODEL.nSubtypeSupport == island_it.getModelSubtype();
      
      var island = island_it.getIsland().clone();
      
      //check if the model is part or support and store them.
      if(is_part)
        {          
          all_islands_part.addIslands(island_it.getIsland().clone()); //merging all islands into one object (consists of vertices)
          
        } else { // is support
          
           all_islands_support.addIslands(island_it.getIsland().clone()); //merging all islands into one object (consists of vertices)
        }    
      island_it.next();
    } // while

  // generate Stripes and hatching
  
    // join islands
     all_islands.addIslands(all_islands_part);
     all_islands.addIslands(all_islands_support);  
        
 
    
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
      
 

  // check for downskin
   var allHatch = new HATCH.bsHatch(); 
   var down_skin_island = new ISLAND.bsIsland();
   var not_down_skin_island = new ISLAND.bsIsland();

   all_islands.splitMultiLayerOverhang(down_skin_surface_angle, down_skin_overlap, down_skin_layer_reference,
        not_down_skin_island, down_skin_island);
        
   var downSkinContourHatch = new HATCH.bsHatch();
   var contourHatch = new HATCH.bsHatch();
   var partIsland = new ISLAND.bsIsland();
   var downSkinIsland = new ISLAND.bsIsland();
   
   if(!down_skin_island.isEmpty())
      {
        
        // create contour and offset
        let downSkinContour = generateOffset(down_skin_island,beam_compensation);
        
        downSkinContourHatch.moveDataFrom(downSkinContour.borderHatch);
        
//         let reducePointsArgs = {
//            "fDeviationTolerance" : 1,
//            "fEdgeLengthLimit" : 0.001,
//            "bAvoidIntersections" : false
//           }; 
          
//           let allContourPathSet = new PATH_SET.bsPathSet();
//            allContourPathSet.addHatches(downSkinContourHatch);
//           downSkinContourHatch.makeEmpty();
//           allContourPathSet.reducePointsInToleranceExt(reducePointsArgs);
//           downSkinContourHatch.addPaths(allContourPathSet);
        
        
        downSkinContourHatch.setAttributeReal('power', down_skin_contour_power);
        downSkinContourHatch.setAttributeReal('speed', down_skin_contour_speed);
        downSkinContourHatch.setAttributeInt('type',type_downskin_contour);
               
        downSkinIsland = generateOffset(down_skin_island,2*beam_compensation).offsetIsland;
     
        // Down skin hatching
        var downSkin_hatch = new HATCH.bsHatch();
          downSkinIsland.hatch(downSkin_hatch, down_skin_hatch_density, cur_hatch_angle, 
          HATCH.nHatchFlagAlternating | 
          HATCH.nHatchFlagBlocksort |
          HATCH.nHatchFlagFlexDensity
        );
        
        downSkin_hatch.setAttributeReal('power', down_skin_fill_power);
        downSkin_hatch.setAttributeReal('speed', down_skin_fill_speed);
        downSkin_hatch.setAttributeInt('type',type_downskin_hatch);    
        allHatch.moveDataFrom(downSkin_hatch);       
        
      }
      
      if(!not_down_skin_island.isEmpty())
      {
        let hatchContour = generateOffset(not_down_skin_island,beam_compensation);
        
               
        contourHatch.moveDataFrom(hatchContour.borderHatch);
        contourHatch.setAttributeReal('power', border_power);
        contourHatch.setAttributeReal('speed', border_speed);
        contourHatch.setAttributeInt('type',type_part_contour);
        contourHatch.clip(downSkinIsland,false);
        
        //hatchResult.moveDataFrom(contourHatch);
        partIsland = generateOffset(not_down_skin_island,beam_compensation*2).offsetIsland;
        
        // Hatching remaining area (not down skin)
        var fill_hatch = new HATCH.bsHatch();
          partIsland.hatch(fill_hatch, hatch_density, cur_hatch_angle, 
          HATCH.nHatchFlagAlternating | 
          HATCH.nHatchFlagBlocksort |
          HATCH.nHatchFlagFlexDensity
        );
        
        fill_hatch.setAttributeReal('power', fill_power);
        fill_hatch.setAttributeReal('speed', fill_speed);      
        fill_hatch.setAttributeInt('type',type_part_hatch);
        allHatch.moveDataFrom(fill_hatch);
      }

 // clip to fit

 if(!downSkinContourHatch.isEmpty())
 {
   downSkinContourHatch.clip(partIsland,false);
   contourHatch.clip(downSkinIsland,false);
 }
  
 let allContourHatch = new HATCH.bsHatch();
 allContourHatch.moveDataFrom(downSkinContourHatch);
 allContourHatch.moveDataFrom(contourHatch);
 
  let mergeColArgs =  {
  "fCollinearTol": 1,
  "fMaxSkipDist": 100,
  "bFlipLines": true
}; 
 allContourHatch.mergeCollinearLines(mergeColArgs);
 
// let allContourPathSet = new PATH_SET.bsPathSet();
//  
//  allContourPathSet.addHatches(allContourHatch);

let reducePointsArgs = {
 "fDeviationTolerance" : 0.01,
 "fEdgeLengthLimit" : 0.001,
 "bAvoidIntersections" : true
}; 
 //allContourPathSet.reducePointsInToleranceExt(reducePointsArgs);
 //allContourHatch.makeEmpty();
 //allContourHatch.addPaths(allContourPathSet);

 //hatchResult.moveDataFrom(allContourHatch);
 //hatchResult.moveDataFrom(contourHatch);

 

   
  //hatchResult.moveDataFrom(contour_hatch_part); // store contour in hatch
      
 //divide into stripes
  var stripeIslands = new ISLAND.bsIsland();  
  all_islands.createStripes(stripeIslands,10,2,-0.03,0,cur_hatch_angle); // createStripes-0.03
  var stripeHatch = new HATCH.bsHatch();
 
  // clip islands into stripes 
  let stripeCount = stripeIslands.getIslandCount();
  let stripeArr = stripeIslands.getIslandArray();
  let stripedHatch = new HATCH.bsHatch();
  for(let i = 0; i<stripeCount;i++)
  {
    let clippedHatch = new HATCH.bsHatch();
    clippedHatch = allHatch.clone();
    
    clippedHatch.clip(stripeArr[i],true);
    
    hatchResult.moveDataFrom(clippedHatch); 
  }

    // currently Support is treated similar to part !!
  
      ///////////////////////////////////////////////////////////////////////
      // narrow bridges
      var narrow_bridge = new HATCH.bsHatch();

      all_islands.createNarrowBridgePolylines(
          narrow_bridge, -beam_compensation);
      
      narrow_bridge.setAttributeReal("power", border_power);
      narrow_bridge.setAttributeReal("speed", border_speed);
      narrow_bridge.setAttributeInt("type", type_openPolyline);
      
      hatchResult.moveDataFrom(narrow_bridge);

      /////////////////////////////////////////////////////////////////////
      
      // narrow appendixes
      var narrow_app = new HATCH.bsHatch();

      all_islands.createNarrowAppendixPolylines(
          narrow_app, 
          -beam_compensation, 
          beam_compensation
          );  

      narrow_app.setAttributeReal("power", border_power);
      narrow_app.setAttributeReal("speed", border_speed);
      narrow_app.setAttributeInt("type",type_openPolyline);       

      hatchResult.moveDataFrom(narrow_app);
      
      ///////////////////////////////////////////////////////////////////// 
  
  ///////////////////////////////////////////// 
  /// get the required passes in this layer ///
  /////////////////////////////////////////////
 
  
  // fetch tiling information from tray
  //let tray_tile_array = new Array;
  //tray_tile_array = modelData.getTrayAttribEx('tile_vertice_array'); // retrive tile_vertices  
  //var tileObject = new getTileArray(all_islands,MODEL,modelData);
  
  var thisLayer = thisModel.getModelLayerByNr(nLayerNr);
  
  var required_passes_x = thisLayer.getAttrib('requiredPassesX');
  var required_passes_y = thisLayer.getAttrib('requiredPassesY');
  var tileArray = new Array;
  tileArray = thisLayer.getAttribEx('tileTable');
  let tileArrayLenght = tileArray.length;
  // get the tile array sorting by tile number

  if(tileArrayLenght>1){
  tileArray.sort((a,b) => a.tile_number - b.tile_number);
  }
  
  var scanheadArray = new Array;
  scanheadArray = modelData.getTrayAttribEx('scanhead_array');
 
   ///////////////////////////////////////////////////
  /// generate containers for hatching and islands ///
  ////////////////////////////////////////////////////
  var vec2_tile_array = new Array;
  var allTileHatch = new HATCH.bsHatch();
 
  var tile_island = new ISLAND.bsIsland(); // generate islands object to clip my
  var tileSegmentArr = new Array;
  var tile_exposure_time_array = new Array;
  
  let hatch = new HATCH.bsHatch;
  hatch.moveDataFrom(hatchResult);
  
  /////////////////////////////////////////////////////////////////////////////
  /// Index the tiles (passnumber, tile_index, scanhead xcoord and ycoord) ///
  /////////////////////////////////////////////////////////////////////////////
 
  //let model = modelData.getModel(0);
  //let modelLayer = model.getModelLayerByNr(nLayerNr);
 
  for(let j = 0; j<tileArray.length;j++)
    {
     // get the coordinates of the current tile 
     let tile_x_min = tileArray[j].scanhead_outline[0].m_coord[0];
     let tile_x_max = tileArray[j].scanhead_outline[2].m_coord[0];
     let tile_x_cen = (tile_x_min+tile_x_max)/2
     let tile_y_min = tileArray[j].scanhead_outline[1].m_coord[1];
     let tile_y_max = tileArray[j].scanhead_outline[0].m_coord[1];
     let tile_y_cen = (tile_y_min+tile_y_max)/2
      
     // add the corrdinates to vector pointset
     let tile_points = new Array(4);
     tile_points[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
     tile_points[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
     tile_points[2] = new VEC2.Vec2(tile_x_max, tile_y_max); // max,max
     tile_points[3] = new VEC2.Vec2(tile_x_max, tile_y_min); // max,min
        
     vec2_tile_array[j] =  tile_points;
     // generate Segment obejct containing the tiles to 
      
     let startVec2 = new VEC2.Vec2(tile_x_min,tile_y_cen);
     let endVec2 = new VEC2.Vec2(tile_x_max,tile_y_cen);
      
     tileSegmentArr[j] = new SEG2D.Seg2d(startVec2,endVec2);  
      
      let tileHatch= new HATCH.bsHatch();  // generate hatching object
      tileHatch = ClipHatchByRect(hatch,vec2_tile_array[j]);

     
     // add some attributes to hatchblocks
     tileHatch.setAttributeInt('passNumber', tileArray[j].passNumber);
     tileHatch.setAttributeInt('tile_index',tileArray[j].tile_number);
     tileHatch.setAttributeReal('xcoord', tileArray[j].scanhead_x_coord);
     tileHatch.setAttributeReal('ycoord', tileArray[j].scanhead_y_coord);
     
     //exposuretime of each tile:
     let total_tile_exposure = new EXPOSURETIME.bsExposureTime();
     total_tile_exposure.configure(modelData.getTrayAttribEx('exposureSettings'));
     total_tile_exposure.addHatch(tileHatch);
     tile_exposure_time_array[j] = total_tile_exposure.getExposureTimeMicroSeconds();
     
     tileHatch.setAttributeReal('tile_exposure_time', tile_exposure_time_array[j]);
     
     allTileHatch.moveDataFrom(tileHatch);     
    }     
    
    thisLayer.setAttribEx('tileSegmentArr',tileSegmentArr);
    
    let exporter_3mf = {
        "namespace": "http://adira.com/tilinginformation/202305",
        "prefix": "adira",
        "content": {
           "name": "sequence",
	         "attributes": {
		          "uuid": "7b85d4a4-bc8b-44eb-b5f4-59fb25cb9d77",
		          "startx": 0.0,
		          "starty": 0.0,
		          "sequencetransferspeed": 120,
		          "type": "moveandshoot"
	          },
	          "children": [
		          {
			          "name": "movement",
			          "attributes": {
				          "tileid": 1,
                  "targetx": 0.0,
                  "targety": 20.0,
                  "speedy": 100.0
			          }			
		          }
            ]
        }

    };
    
    thisLayer.setAttribEx('exporter_3mf', exporter_3mf);
    
  /////////////////////////////////////
  /// Assign laser options to hatch /// 
  /////////////////////////////////////
     
  /* currently limited to keeping the x pos static during one pass */
     
  //var vec2LaserZoneArray = new Array;
     
  var tempTileHatch = new HATCH.bsHatch();
 
  tempTileHatch.moveDataFrom(allTileHatch); // move all tiles to temp hatch object
             
  for (let i = 0; i< required_passes_x*required_passes_y;i++) // run through the different passes
    {
       
      let scanheadXCoord = tileArray[i].scanhead_x_coord;
      let scanheadYCoord = tileArray[i].scanhead_y_coord;

      //var sceneMinY = currentLayerBoundaries.minY;
      //var sceneMaxY = currentLayerBoundaries.maxY;
        
      for (let j=0;j<laser_count;j++)
        {
        // get information about the lasing zone in X
          let curLaserId = scanheadArray[j].laserIndex; // get laser ID
          let curXref = scanheadArray[j].x_ref;
          let curRelXmin = scanheadArray[j].rel_x_min;
          let curRelXmax = scanheadArray[j].rel_x_max;
          
          let curLaserXmin = curXref + curRelXmin + scanheadXCoord;
          let curLaserXmax = curXref + curRelXmax + scanheadXCoord;
          
          let curYref = scanheadArray[j].y_ref;
          let curRelYmin = scanheadArray[j].rel_y_min;
          let curRelYmax = scanheadArray[j].rel_y_max;
          
          let curLaserYmin = curYref + curRelYmin + scanheadYCoord;
          let curLaserYmax = curYref + curRelYmax + scanheadYCoord;
           
         // add the corrdinates to vector pointset
         let laserZonePoints = new Array(4);
         laserZonePoints[0] = new VEC2.Vec2(curLaserXmin, curLaserYmin); //min,min
         laserZonePoints[1] = new VEC2.Vec2(curLaserXmin, curLaserYmax); //min,max
         laserZonePoints[2] = new VEC2.Vec2(curLaserXmax, curLaserYmax); // max,max
         laserZonePoints[3] = new VEC2.Vec2(curLaserXmax, curLaserYmin); // max,min
         
         let laserZoneHatch = new HATCH.bsHatch();
         let laserZoneHatchOutside = new HATCH.bsHatch();
         
         let laserZone_pathset = new PATH_SET.bsPathSet(); // generate pathset object
         laserZone_pathset.addNewPath(laserZonePoints); // add tiles zones to pathset  
         laserZone_pathset.setClosed(true); // set the zones to closed polygons
         let laserZone_clipping_island = new ISLAND.bsIsland(); // generate island object
         laserZone_clipping_island.addPathSet(laserZone_pathset); // add pathset as new island
         laserZoneHatch = tempTileHatch.clone(); // clone overall hatching
         laserZoneHatchOutside = tempTileHatch.clone(); // clone overall hatching
         tempTileHatch.makeEmpty(); // empty the container to refill it later
          
         laserZoneHatch.clip(laserZone_clipping_island,true); // clip the hatching with the tile_islands
         laserZoneHatchOutside.clip(laserZone_clipping_island,false); // get ouside of currentzone
           
         // assign laser index
         laserZoneHatch.setAttributeInt(`laser_index_${curLaserId}`, 1);                    
                                
         tempTileHatch.moveDataFrom(laserZoneHatch);
         tempTileHatch.moveDataFrom(laserZoneHatchOutside);      
        } // for laser count       
      }   // all tiles
 
      let mergeblock = new HATCH.bsHatch;
         mergeblock.moveDataFrom(tempTileHatch);
         
         // merge similar hatch blocks to speed up process
         let mergeArgs = {
           'bConvertToHatchMode': true,
           'nConvertToHatchMaxPointCount': 2,
           //'nMaxBlockSize': 1024,
           'bCheckAttributes': true
         }  
         
         tempTileHatch = mergeblock.mergeHatchBlocks(mergeArgs);  
        
         var args = {
          sSegRegionFillingMode             : "PositiveX",
          bInvertFillingSequence            : false,
          fSegRegionFillingGridSize         : 0.0,
          sSetAssignedRegionIndexMemberName : "regionIndex"
         }; 
         
         tempTileHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr,0,args);
      
  allTileHatch.moveDataFrom(tempTileHatch);
  

  defineSharedZones();
  

function defineSharedZones(){
  
  /////////////////////////////////////
  /// Define zones shared by lasers /// 
  /////////////////////////////////////
   
  let hatchblockIt = allTileHatch.getHatchBlockIterator();         
  let allocatedLasers = [];
  let zoneId = 0;
  
  while(hatchblockIt.isValid())
    {
    let hatchBlock = new HATCH.bsHatch;
    hatchBlock = hatchblockIt.get();
    
    hatchBlock.setAttributeInt('zoneIndex',zoneId++);
      
    for(let m = 0; m<laser_count; m++)
      {     
        if(hatchblockIt.isValid())
          {             
            allocatedLasers[m] = hatchBlock.getAttributeInt(`laser_index_${m+1}`);
                   
          }         
      }        
    if (getArraySum(allocatedLasers)>1)
      {            
        hatchBlock.setAttributeInt('sharedZone', 1);        
        
      } else {       
        
        hatchBlock.setAttributeInt('sharedZone', 0);  
        
//         //assign color to single laser zones
//         for(let j = 0; j<allocatedLasers.length;j++)
//         {
//           if(allocatedLasers[j] == 1){
//             let laserid = j;
//             //hatchBlock.setAttributeInt('_disp_color',laser_color[j]);
//             //hatchBlock.setAttributeInt('bsid', (10 * j)); // set attributes
//           }
//         }    
      }
    hatchblockIt.next();
    }
}  
  

// let tempVar = PARAM.getParamInt('tileing', 'TilingMode');

allTileHatch.moveDataFrom(allContourHatch); // ADD contour hatches to be divided bewteen lasers!

 if (PARAM.getParamInt('tileing', 'TilingMode') == 0){ // static tiling
   
 allTileHatch = fixedLaserWorkload(allTileHatch,modelData,scanheadArray,tileArray,required_passes_x,nLayerNr);  

 } else { // smarttileing
   
 allTileHatch = smartLaserWorkload(allTileHatch,modelData,scanheadArray,tileArray,required_passes_x,required_passes_y,nLayerNr,vec2_tile_array,tileSegmentArr);  
   
 }
 
 // merge short lines
 
 let tempAllHatch = new HATCH.bsHatch();
 tempAllHatch.moveDataFrom(allTileHatch);
 
 let minVectorLenght = PARAM.getParamReal("exposure", "min_vector_lenght");
 let maxMergeDistance = PARAM.getParamReal("exposure", "small_vector_merge_distance");
 
 let mergesNo = tempAllHatch.mergeShortLines(allTileHatch,minVectorLenght,maxMergeDistance,
    HATCH.nMergeShortLinesFlagAllowSameHatchBlock|HATCH.nMergeShortLinesFlagPreferHatchMode);
 
 // delete remaining short vectors that could not be merged
   
  allTileHatch.deleteShortLines(minVectorLenght);
 
 // sort the tile to get accurate processing order
 
var allHatchBlockArray = allTileHatch.getHatchBlockArray();

// sort the array based on bsid
allHatchBlockArray.sort((a, b) => a.getAttributeInt('bsid') - b.getAttributeInt('bsid'));

// sort based on tileIndex
allHatchBlockArray.sort((a, b) => a.getAttributeInt('tile_index') - b.getAttributeInt('tile_index'));

// sort based on pass number
allHatchBlockArray.sort((a, b) => a.getAttributeInt('passNumber') - b.getAttributeInt('passNumber'));


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
  thisBlock.removeAttributes('tile_exposure_time');

 sortedHatchArray.addHatchBlock(thisBlock);
 }

 
let simplifiedDataHatch = new HATCH.bsHatch();
simplifiedDataHatch = mergeBlocks(sortedHatchArray);  
 

hatchResult.moveDataFrom(simplifiedDataHatch); // move hatches to result 

  
}; // makeExposureLayer

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 /////////////////////////
  /// Custom Functions /// 
  ////////////////////////


// return the sum of the array
function getArraySum(arr) 
{
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if(arr[i])
    {
      sum += arr[i]; 
    }
  }
    return sum;
}

// check if there is anything at the given index
function getValueAtIndex(array, index) {
  if (index >= 0 && index < array.length) {
    return index;
  } else {
    return false;
  }
}

// clip hatch by rectangle
 function ClipHatchByRect(hatchObj,arr_2dVec)
    {
     var clippedHatch = new HATCH.bsHatch; 
     var tiles_pathset = new PATH_SET.bsPathSet(); // generate pathset object
     tiles_pathset.addNewPath(arr_2dVec); // add tiles zones to pathset  
     tiles_pathset.setClosed(true); // set the zones to closed polygons
     var tile_clipping_island = new ISLAND.bsIsland(); // generate island object
     tile_clipping_island.addPathSet(tiles_pathset); // add pathset as new island
     clippedHatch = hatchObj.clone() ; // clone overall hatching
      
     clippedHatch.clip(tile_clipping_island,true); // clip the hatching with the tile_islands
      
      return clippedHatch;
    }

//



// smart tileing
function smartLaserWorkload(hatchObj,modelData,scanheadArray,tileArray,required_passes_x,required_passes_y,nLayerNr,vec2_tile_array,tileSegmentArr){
  
  let curHatch = new HATCH.bsHatch; 
  curHatch.moveDataFrom(hatchObj);
  
  let hatchIt = curHatch.getHatchBlockIterator();
  let activeLasers = new Array;
  let zoneWorkload = new Array;
  var clipArray = new Array; 
  let clipIt =  0;
  while(hatchIt.isValid())
    {
     let thisHatch = new HATCH.bsHatch;
     thisHatch = hatchIt.get(); 
      
     let zoneIndex = thisHatch.getAttributeInt('zoneIndex');
     //let thisWorkload = thisHatch.getAttributeReal('zoneExposure');
     let thisSharedZone = thisHatch.getAttributeInt('sharedZone');
     var laserCount = PARAM.getParamInt('exposure', 'laser_count');
       
     if(thisSharedZone > 0)
       {     
          for(let curLaserId = 0 ; curLaserId<laserCount;curLaserId++)
          {              
             activeLasers[curLaserId] = thisHatch.getAttributeInt(`laser_index_${curLaserId+1}`);
             
          }
    
       // subdivide each sharedzone into smaller zones to allow smart sorting
       let zoneBounds = new BOUNDS.bsBounds2D;
       zoneBounds = thisHatch.getBounds2D();
       
       let zoneMinY = zoneBounds.m_min.y;
       let zoneMaxY = zoneBounds.m_max.y;

       let zoneLengthX = zoneBounds.m_max.x - zoneBounds.m_min.x;
       let subdivsizeX = 50;
       let subdivcount = Math.ceil(zoneLengthX/subdivsizeX);
       let subdivHatch = new HATCH.bsHatch;
       
        
          
       for (let subdivIt = 0; subdivIt<subdivcount;subdivIt++)
       {
         if(subdivIt==subdivcount-1)
         {
          let subdivMinX = zoneBounds.m_min.x + subdivIt*subdivsizeX;
          let subdivMaxX = zoneBounds.m_max.x;  
           
         }else{
           let subdivMinX = zoneBounds.m_min.x + subdivIt*subdivsizeX;
           let subdivMaxX = subdivMinX + subdivsizeX;                  
           
         } 
         let subdivMinX = zoneBounds.m_min.x + subdivIt*subdivsizeX;
         let subdivMaxX = subdivMinX + subdivsizeX;          
         
         let subdivPoints = new Array;
         subdivPoints[0] = new VEC2.Vec2(subdivMinX, zoneMinY); //min,min
         subdivPoints[1] = new VEC2.Vec2(subdivMinX, zoneMaxY); //min,max
         subdivPoints[2] = new VEC2.Vec2(subdivMaxX, zoneMaxY); //max,max
         subdivPoints[3] = new VEC2.Vec2(subdivMaxX, zoneMinY); //max,min
         
         clipArray[clipIt++] = subdivPoints;
       }
      }         
     hatchIt.next(); 
    }
    
  
  /// Clip hatches by clipArray subdivide to subhatch
   for(let i = 0; i < clipArray.length;i++)
   {
    
    let clipHatch = new HATCH.bsHatch();
    let clipHatchOutside = new HATCH.bsHatch();
         
    let clipZonePathset = new PATH_SET.bsPathSet(); // generate pathset object
    clipZonePathset.addNewPath(clipArray[i]); // add tiles zones to pathset  
    clipZonePathset.setClosed(true); // set the zones to closed polygons
    let clippingiIsland = new ISLAND.bsIsland(); // generate island object
    clippingiIsland.addPathSet(clipZonePathset); // add pathset as new island
    clipHatch = curHatch.clone(); // clone overall hatching
    clipHatchOutside = curHatch.clone(); // clone overall hatching
    curHatch.makeEmpty(); // empty the container to refill it later
          
    clipHatch.clip(clippingiIsland,true); // clip the hatching with the tile_islands
    clipHatchOutside.clip(clippingiIsland,false); // get ouside of currentzone
                                                             
    curHatch.moveDataFrom(clipHatch);
    curHatch.moveDataFrom(clipHatchOutside);          
   }
    
   
   // add exposure for all zones
   let hatchIt2 = curHatch.getHatchBlockIterator();
    while(hatchIt2.isValid())
    {
     let thisHatch = new HATCH.bsHatch;
     thisHatch = hatchIt2.get(); 
      
     let thisExposureDuration = new EXPOSURETIME.bsExposureTime();
     thisExposureDuration.configure(modelData.getTrayAttribEx('exposureSettings'));  
     thisExposureDuration.addHatchBlock(thisHatch); 
     thisHatch.setAttributeInt('zoneExposure',thisExposureDuration.getExposureTimeMicroSeconds());     
      
     hatchIt2.next(); 
    }

// createZoneObjects  
  function setLaserObjects (laserId)
     {
       this.id = laserId;
       this.workload = 0; 
     }
     
  var lasers = new Array;  
  for (let i = 0; i<laserCount;i++)
  {
    lasers[i] = new setLaserObjects(i);
  }
    
  function setZoneProperties(hatchBlock,iterator){
    this.hatch = hatchBlock; 
    this.zoneDuration = hatchBlock.getAttributeInt('zoneExposure');
    this.passNumber =   hatchBlock.getAttributeInt('passNumber');
    this.zoneID = iterator;
    hatchBlock.setAttributeInt('zoneIndex',iterator);
    let lasersInReach = new Array;
    
    for(let i = 0 ; i<laserCount;i++)
      {  
           
        let laserID = hatchBlock.getAttributeInt(`laser_index_${i+1}`);
        
        if(laserID>0)
        {
          lasersInReach.push(i);
        }        
      }
      
    this.reachableBy =  lasersInReach;
    this.bsid = null;
  }
  
  var laser_color = new Array;
  laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 

 //run trough each scanzone looking at the entire width
 
  let smartHatch = new HATCH.bsHatch;
  
  for (let tileIt = 0; tileIt < required_passes_y ; tileIt++) // clip into fullwidth tiles
  {
    
    let tile_x_min = tileArray[tileIt*required_passes_x].scanhead_outline[0].m_coord[0];
    let tile_y_min = tileArray[tileIt*required_passes_x].scanhead_outline[0].m_coord[1];
          
    // get max coordinates for full width tile
    let tile_x_max = tileArray[(tileIt+1)*required_passes_x-1].scanhead_outline[2].m_coord[0];
    let tile_y_max = tileArray[(tileIt+1)*required_passes_x-1].scanhead_outline[2].m_coord[1];
      
    let fullWidthClip = new Array;
    fullWidthClip[0] = new VEC2.Vec2(tile_x_min,tile_y_min) //min,min
    fullWidthClip[1] = new VEC2.Vec2(tile_x_min,tile_y_max) //min,max
    fullWidthClip[2] = new VEC2.Vec2(tile_x_max,tile_y_max) //max,max
    fullWidthClip[3] = new VEC2.Vec2(tile_x_max,tile_y_min) //max,min
      
    let hatchBlockArr = new HATCH.bsHatch;  
    let clippedHatch = ClipHatchByRect(curHatch,fullWidthClip);
    
       // sort hatchblocks
    var args = {
            sSegRegionFillingMode             : "PositiveX",
            bInvertFillingSequence            : false,
            fSegRegionFillingGridSize         : 0.0,
            sSetAssignedRegionIndexMemberName : "regionIndex"
           }; 
           
   clippedHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr,0,args); 
    
   hatchBlockArr = clippedHatch.getHatchBlockArray();      
    
    var smartZones = new Array;  
    for (let i = 0; i<hatchBlockArr.length;i++)
    {  
      smartZones[i] = new setZoneProperties(hatchBlockArr[i],i);
    }  
    
    // Sort zones by zoneDuration in descending order within each fulltile
    
    //smartZones.sort((a, b) => b.zoneDuration - a.zoneDuration);
      
    
    // Group smartZones by passNumber
    let passGroups = {};
    let passMaxDurations = {};
    for (let x = 0; x < smartZones.length; x++) {
        let curZone = smartZones[x];
        if (!passGroups[curZone.passNumber]) {
            passGroups[curZone.passNumber] = [];
        }
        passGroups[curZone.passNumber].push(curZone);
        passMaxDurations[curZone.passNumber] = Math.max(passMaxDurations[curZone.passNumber], curZone.zoneDuration);
    }
    
    let passZones = new Array;
    // iterate through and divdie workload within each pass
    for (let passNumber = 0 ; passNumber< required_passes_x ; passNumber++)
    {
      passZones = passGroups[passNumber];
      if (!passZones) continue; // if no zones for this passNumber, skip to the next passNumber
      let temp =1;
       for (let x = 0; x < passZones.length; x++) 
        {
          let curZone = passZones[x];
              
             // If a laser has already been assigned to this zone, skip to the next zone
             if(curZone.bsid) continue;
             
             // what lasers are capable of reaching the current zone  
             let capableLasers = curZone.reachableBy.map(id => lasers.find(laser => laser.id === id));
             
             let minWorkloadLaser;
             let minWorkload = Infinity;
             let lastTaskZone = null;
             
             for (let j = 0; j < capableLasers.length; j++)
             {
               let laser = capableLasers[j];

               // if the workload of the laser is less than current minWorkload
               // or if the laser's last task was the immediate neighbour of the current zone (i.e., curZone),
               // update the minWorkload and minWorkloadLaser
               if (laser.workload < minWorkload || (laser.lastTask && laser.lastTask.id === curZone.id - 1))
               {
                 minWorkload = laser.workload;
                 minWorkloadLaser = laser;
                 lastTaskZone = laser.lastTask;
               }
             }
             
         minWorkloadLaser.workload += curZone.zoneDuration;
         minWorkloadLaser.lastTask = curZone;  // Update the last task of this laser  

         // set 

         curZone.bsid = (minWorkloadLaser.id + 1) * 10; // Assign bsid to the task based on the assigned laser's id        
         curZone.hatch.setAttributeInt('bsid', curZone.bsid);
         curZone.hatch.setAttributeInt('_disp_color',laser_color[minWorkloadLaser.id]); 
             
                     
        }
  
        // get the tile duration, by finding the longest required for most worked laser
       
       // After assigning all tasks, find the laser with max duration
      let laserWithMaxDuration = lasers[0];
      for (let i = 1; i < lasers.length; i++) 
        {
          if (lasers[i].workload > laserWithMaxDuration.workload) {
              laserWithMaxDuration = lasers[i];
          }
        } 
       
       let maxLaserDuration = laserWithMaxDuration.workload;
        
        
       for (let i = 0; i < passZones.length; i++) 
        {
          let curZone = passZones[i];
          curZone.hatch.setAttributeInt('tileDuration', maxLaserDuration);
          smartHatch.addHatchBlock(curZone.hatch);          
        }        
      }
  }
        
  
   
   hatchObj.moveDataFrom(smartHatch);
   return hatchObj;
  }  

// function statically distributing the lasing zone <- not smart !
function fixedLaserWorkload(hatchObj,modelData,scanheadArray,tileArray,required_passes_x,nLayerNr){
  let curHatch = new HATCH.bsHatch; 
  curHatch.moveDataFrom(hatchObj);
  
  let scanheadZones = new Array;
  scanheadZones = modelData.getTrayAttribEx('scanhead_zones');
  
  
  //get divison of scanfields in x!
  let xDiv = new Array;
  
  // get shifting parameters 
  function calculateShiftX(layerNr) {
    let layerCount = PARAM.getParamInt('tileing', 'number_x');
    let shiftIncrement =  PARAM.getParamReal('tileing', 'step_x');
    let resetLayer = layerCount - 1;

    let cyclePosition = layerNr % (layerCount * (resetLayer + 1));
    let layerWithinCycle = cyclePosition % layerCount;
    let shiftValue = layerWithinCycle * shiftIncrement;

    return shiftValue;
  }
  
  let shiftX =  calculateShiftX(nLayerNr);

  for (let i = 0; i<scanheadArray.length+1;i++)
    {
      if (i==0) { // if first elements 
        xDiv[i] = scanheadArray[i].rel_x_min;
      }else if (i == scanheadArray.length) { // if arraylength is reached
            xDiv[i] = scanheadArray[i-1].rel_x_max + scanheadArray[i-1].x_ref;
      } else {      
      xDiv[i] = (scanheadArray[i-1].x_ref + scanheadArray[i].x_ref)/2 + shiftX;
        } //if else       
    } // for
    
    // get clipping coordinates for entire scene
    let XClipPos = new Array; 
    for(let i = 0; i<required_passes_x;i++)
    {
      
      let tileOffset =  tileArray[i].scanhead_x_coord; // the 
      
      for(let j = 0; j<xDiv.length;j++)
      {
        if(j == xDiv.length-1 && i < required_passes_x-1)
        {
          
        } else 
        {
          XClipPos.push(xDiv[j]+tileOffset);
        }
      }
    }
    
    let clip_min_y = tileArray[0].scanhead_outline[0].m_coord[1];
    let clip_max_y = tileArray[tileArray.length-1].scanhead_outline[2].m_coord[1];
    let laserIndex = 0;
    //let fill_power = PARAM.getParamInt('laser', 'fill_power');
    //let fill_speed = PARAM.getParamReal('laser', 'fill_speed');
    
    var laser_color = new Array;
    laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 
    
   for(let i = 0; i<XClipPos.length-1; i++)
   {
     let clip_min_x = XClipPos[i];
     let clip_max_x = XClipPos[i+1];
    
     // add the corrdinates to vector pointset
     let clipPoints = new Array(4);
     clipPoints[0] = new VEC2.Vec2(clip_min_x, clip_min_y); //min,min
     clipPoints[1] = new VEC2.Vec2(clip_min_x, clip_max_y); //min,max
     clipPoints[2] = new VEC2.Vec2(clip_max_x, clip_max_y); // max,max
     clipPoints[3] = new VEC2.Vec2(clip_max_x, clip_min_y); // max,min
     //vec2LaserZoneArray[j] =  clipPoints;
     
     let tileHatch = new HATCH.bsHatch;
     tileHatch = ClipHatchByRect(curHatch,clipPoints);
     
     // add display and bsid attributes to hatchblocks
     
     let hatchIterator = tileHatch.getHatchBlockIterator();
     while(hatchIterator.isValid())
     {
       let currHatcBlock = hatchIterator.get();
       
       let type = currHatcBlock.getAttributeInt('type');
       currHatcBlock.setAttributeInt('_disp_color',laser_color[laserIndex]);
       currHatcBlock.setAttributeInt('bsid', (10 * (laserIndex+1))+type); // set attributes
       
       hatchIterator.next();
     }
    
     laserIndex++;
     if (laserIndex>PARAM.getParamInt('exposure', 'laser_count')-1)
     {
       laserIndex=0;
     }
     
      hatchObj.moveDataFrom(tileHatch);
   }
    
   
   return hatchObj
  } 
  
  
  function mergeBlocks(unmergedHatchBlocks) {
     let mergeblock = new HATCH.bsHatch();
     let mergedblock = new HATCH.bsHatch();
     mergeblock.moveDataFrom(unmergedHatchBlocks);
      
    
     // merge similar hatch blocks to speed up process
     let bCheckAttributes = true;
      let mergeArgs = {
           'bConvertToHatchMode': true,
           //'nConvertToHatchMaxPointCount': 2,
           //'nMaxBlockSize': 1024,
           'bCheckAttributes': true
      }  
         
      mergedblock = mergeblock.mergeHatchBlocks(mergeArgs);
      
      let blockcount = mergedblock.getHatchBlockCount();
      process.printInfo(blockcount);   
      return mergedblock;
  }

/** 
 * Multithreaded post-processing. This function may be called
 * several times with a different layer range.
 * @param  modelData        bsModelData
 * @param  progress         bsProgress
 * @param  layer_start_nr   Integer. First layer to process
 * @param  layer_end_nr     Integer. Last layer to process
 */
var postprocessLayerStack_MT = function(
  modelData, 
  progress, 
  layer_start_nr, 
  layer_end_nr)
{  
  // calculate the porocessign order based on tiles and hatchtype
    progress.initSteps(layer_end_nr-layer_start_nr+1);
  var surfaceAreaTotal = 0;
  let model = modelData.getModel(0);

  var layerThickness = model.getLayerThickness();
  for(let layer_nr = layer_start_nr; layer_nr <= layer_end_nr; ++layer_nr)
  {
    progress.step(1);
     
    let modelLayer = model.getModelLayerByNr(layer_nr);
    
    let ilandIT = modelLayer.getFirstIsland();
    
    while(ilandIT.isValid())
    {
      let thisIland = ilandIT.getIsland();
      surfaceAreaTotal += thisIland.getSurfaceArea();
      ilandIT.next();
    }
    
    // get model data polylinearray
    var exposure_array = modelData.getLayerPolylineArray(layer_nr, POLY_IT.nLayerExposure, 'rw');
    
    
     // Sort array by bounding box in Y direction 
      // and assign processing order
      exposure_array.sort(function(a,b){   
        return a.getBounds().minY - b.getBounds().minY
      });   
   
      
      //sort into different scan
      
      for(var i=0; i < exposure_array.length; ++i){         
        exposure_array[i].setAttributeInt('_processing_order', i);
      }   
    
    
  } //for (iterate through layers)
  
  var totalMass = surfaceAreaTotal*layerThickness*10;
  let temm = 0;
};

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
