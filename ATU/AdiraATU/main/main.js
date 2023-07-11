'use strict';

var RND = requireBuiltin('random');
var RGBA = requireBuiltin('bsColRGBAi');
var MODEL = requireBuiltin('bsModel');
var HATCH = requireBuiltin('bsHatch');
var ISLAND = requireBuiltin('bsIsland');
var BOUNDS = requireBuiltin('bsBounds2D');
var PARAM = requireBuiltin('bsParam');
var BUILD = requireBuiltin('bsBuildParam');
var VEC2 = requireBuiltin('vec2');
var SEG2D = requireBuiltin('seg2d');
var PATH_SET = requireBuiltin('bsPathSet');
var EXPORT_FILTER = requireBuiltin('bsExportFilter');
var POLY_IT = requireBuiltin('bsPolylineIterator');
var CLI = require('main/export_cli.js');
var LOCALIZER = require('localization/localizer.js');
//var TILEING = require('tileing.js');
var EXPOSURETIME = requireBuiltin('bsExposureTime');

const type_openPolyline = 0;
const type_part_hatch = 1;
const type_part_contour = 2;
const type_downskin_hatch = 3;
const type_downskin_contour = 4;
const type_support_hatch = 5;
const type_support_contour = 6;

const laser_count = 5;

//if openpolyline support is required set to false
//when not in development mode set to false
const bDrawTile = true; // this inversly toggle the ability to handle CAD generated openpolilines (eg in support)


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
  machineConfig.setBuildstyleName('Adira');
  machineConfig.setMachineName('AddCreator');
  machineConfig.addMaterialName('IN718');
  machineConfig.addLayerThicknessToMaterial('IN718', 50);
  machineConfig.addLayerThicknessToMaterial('IN718', 60);
  machineConfig.addMaterialName('unspecified');
  machineConfig.addLayerThicknessToMaterial('unspecified', 10);
  machineConfig.addLayerThicknessToMaterial('unspecified', 20);
  machineConfig.addLayerThicknessToMaterial('unspecified', 30);
  machineConfig.addLayerThicknessToMaterial('unspecified', 40);
  machineConfig.addLayerThicknessToMaterial('unspecified', 50);
  machineConfig.addLayerThicknessToMaterial('unspecified', 60);
  machineConfig.addLayerThicknessToMaterial('unspecified', 70);
  machineConfig.addLayerThicknessToMaterial('unspecified', 80);
  machineConfig.addLayerThicknessToMaterial('unspecified', 90);
  machineConfig.addLayerThicknessToMaterial('unspecified', 100);
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
    parameter.declareParameterReal('exposure', '_hdens', LOCALIZER.GetMessage('param_hatch_density'), 0.001, 50.0, 0.1);//0.1 50.0   
    parameter.declareParameterReal('exposure', 'hatch_angle_init', LOCALIZER.GetMessage('param_hatch_angle_init'), 0, 360, 45);
    parameter.declareParameterReal('exposure', 'hatch_angle_increment', LOCALIZER.GetMessage('param_hatch_angle_increment'), -360, 360, 90.0);   
  
 parameter.declareParameterGroup('support',LOCALIZER.GetMessage('grp_support'));
    parameter.declareParameterReal('support', 'support_hdens', LOCALIZER.GetMessage('param_hatch_support_density'), 0.001, 2.0, 0.1);
    parameter.declareParameterReal('support', 'support_hatch_angle_init', LOCALIZER.GetMessage('param_support_hatch_angle_init'), 0, 360, 45);
    parameter.declareParameterReal('support', 'support_hatch_angle_increment', LOCALIZER.GetMessage('param_support_hatch_angle_increment'), -360, 360, 90.0);
    parameter.declareParameterChoice('support', 'supportContourToogle', 
       LOCALIZER.GetMessage('param_supportContourToogle'),
       [LOCALIZER.GetMessage('param_supportContourToogle_disable'),
       LOCALIZER.GetMessage('param_supportContourToogle_enable')],
       LOCALIZER.GetMessage('param_supportContourToogle_enable')
    );
 
 parameter.declareParameterGroup('downskin',LOCALIZER.GetMessage('grp_downskin'));
    parameter.declareParameterChoice('downskin', 'downskintoggle', 
       LOCALIZER.GetMessage('param_downskintoggle'),
       [LOCALIZER.GetMessage('param_downskintoggle_disable'),
       LOCALIZER.GetMessage('param_downskintoggle_enable')],
       LOCALIZER.GetMessage('param_downskintoggle_enable')
        );
    parameter.declareParameterReal('downskin', "down_skin_surface_angle", LOCALIZER.GetMessage('param_down_skin_surface_angle'), 0.0, 89.0, 60.0);
    parameter.declareParameterInt('downskin', "down_skin_layer_reference", LOCALIZER.GetMessage('param_down_skin_layer_reference'), 1, 9, 5);
    parameter.declareParameterReal('downskin', "down_skin_hdens", LOCALIZER.GetMessage('param_hatch_down_skin_density'), 0.001, 2.0, 0.1);
    parameter.declareParameterReal('downskin', "down_skin_hangle", LOCALIZER.GetMessage('param_hatch_down_skin_angle'), 0, 360, 45);
    parameter.declareParameterReal('downskin', 'down_skin_hangle_increment', LOCALIZER.GetMessage('param_hatch_down_skin_angle_increment'), -360.0, 360.0, 90.0);
    parameter.declareParameterReal('downskin', 'down_skin_overlap', LOCALIZER.GetMessage('param_down_skin_overlap'), 0.0, 100.0, 0.7);
    

 parameter.declareParameterGroup('ScanningParameters',LOCALIZER.GetMessage('grp_ScanningParameters'));
    parameter.declareParameterReal('ScanningParameters', 'hatch_power', LOCALIZER.GetMessage('param_hatch_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'hatch_markspeed', LOCALIZER.GetMessage('param_hatch_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'hatch_defocus', LOCALIZER.GetMessage('param_hatch_defocus'), 0.0, 100.0, 0.0);
 
    parameter.declareParameterReal('ScanningParameters', 'contour_power', LOCALIZER.GetMessage('param_contour_power'), 0.0, 500.0, 220.0);
    parameter.declareParameterReal('ScanningParameters', 'contour_markspeed', LOCALIZER.GetMessage('param_contour_markspeed'), 0.0, 9000.0, 600.0);
    parameter.declareParameterReal('ScanningParameters', 'contour_defocus', LOCALIZER.GetMessage('param_contour_defocus'), 0.0, 100.0, 0.0);
    
    parameter.declareParameterReal('ScanningParameters', 'overhang_hatch_power', LOCALIZER.GetMessage('param_overhang_hatch_power'), 0.0, 500.0, 106.0);
    parameter.declareParameterReal('ScanningParameters', 'overhang_hatch_markspeed', LOCALIZER.GetMessage('param_overhang_hatch_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'overhang_hatch_defocus', LOCALIZER.GetMessage('param_overhang_hatch_defocus'), 0.0, 100.0, 0.0);
    
    parameter.declareParameterReal('ScanningParameters', 'overhang_contour_power', LOCALIZER.GetMessage('param_overhang_contour_power'), 0.0, 500.0, 201.0);
    parameter.declareParameterReal('ScanningParameters', 'overhang_contour_markspeed', LOCALIZER.GetMessage('param_overhang_contour_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'overhang_contour_defocus', LOCALIZER.GetMessage('param_overhang_contour_defocus'), 0.0, 100.0, 0.0); 
 
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_power', LOCALIZER.GetMessage('param_support_hatch_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_markspeed', LOCALIZER.GetMessage('param_support_hatch_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_defocus', LOCALIZER.GetMessage('param_support_hatch_defocus'), 0.0, 100.0, 0.0);
  
    parameter.declareParameterReal('ScanningParameters', 'support_contour_power', LOCALIZER.GetMessage('param_support_contour_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'support_contour_markspeed', LOCALIZER.GetMessage('param_support_contour_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'support_contour_defocus', LOCALIZER.GetMessage('param_support_contour_defocus'), 0.0, 100.0, 0.0);    

    parameter.declareParameterReal('ScanningParameters', 'openpolyline_power', LOCALIZER.GetMessage('param_openpolyline_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'openpolyline_markspeed', LOCALIZER.GetMessage('param_openpolyline_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'openpolyline_defocus', LOCALIZER.GetMessage('param_openpolyline_defocus'), 0.0, 100.0, 0.0);      

// parameter.declareParameterGroup('partExposure')
// parameter.declareParameterGroup('downSkinExposure') 
    
parameter.declareParameterGroup('durationSim', LOCALIZER.GetMessage('grp_durationSim'));
    parameter.declareParameterReal('durationSim', 'JumpSpeed', LOCALIZER.GetMessage('param_JumpSpeed'), 0.001, 2000, 1000);
    //parameter.declareParameterReal('durationSim', 'MeltSpeed', LOCALIZER.GetMessage('param_MeltSpeed'), 0.001, 2000, 200);
    parameter.declareParameterReal('durationSim', 'JumpLengthLimit', LOCALIZER.GetMessage('param_JumpLengthLimit'), 0.001, 1000, 1000);
    parameter.declareParameterInt('durationSim', 'JumpDelay', LOCALIZER.GetMessage('param_JumpDelay'), 0.0, 100.0, 50.0);
    parameter.declareParameterInt('durationSim', 'MinJumpDelay', LOCALIZER.GetMessage('param_MinJumpDelay'), 0.0, 20.0, 10.0);
    parameter.declareParameterInt('durationSim', 'MarkDelay', LOCALIZER.GetMessage('param_MarkDelay'), 0.0, 100.0, 60.0);
    parameter.declareParameterInt('durationSim', 'PolygonDelay', LOCALIZER.GetMessage('param_PolygonDelay'), 0.0, 100.0, 65.0);
    parameter.declareParameterChoice('durationSim', 'PolygonDelayMode', 
       LOCALIZER.GetMessage('param_PolygonDelayMode'),
        [LOCALIZER.GetMessage('param_PolygonDelayMode_Variable'),
        LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')],
        LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')
        );
   

    
    //parameter.declareParameterReal('exposure', 'field_size_x', LOCALIZER.GetMessage('param_hatch_field_size_x'), 0.1, 200.0, 10);
    //parameter.declareParameterReal('exposure', 'field_size_y', LOCALIZER.GetMessage('param_hatch_field_size_y'), 0.1, 100.0, 33.3);
    //parameter.declareParameterReal('exposure', 'field_overlap_x', LOCALIZER.GetMessage('param_hatch_field_overlap_x'), -100.0, 100.0, 0);//0.1
    //parameter.declareParameterReal('exposure', 'field_overlap_y', LOCALIZER.GetMessage('param_hatch_field_overlap_y'), -100, 100.0, 0); //0.1
    //parameter.declareParameterReal('exposure', 'field_min_area', LOCALIZER.GetMessage('param_hatch_field_min_area'), 0.05, 100.0, 0.05);
    
//     "param_hatch_field_size_x": "Field Size X (mm)",
//     "param_hatch_field_size_y": "Field Size Y (mm)",
//     "param_hatch_field_overlap_x": "Field Overlap X (mm)",
//     "param_hatch_field_overlap_y": "Field Overlap Y (mm)",
//     "param_hatch_field_min_area": "Min Field Area (mm^2)",
  
  parameter.declareParameterGroup('workarea',LOCALIZER.GetMessage('grp_workarea'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('workarea', 'x_workarea_min_mm',LOCALIZER.GetMessage('param_x_workarea_min_mm'),0,1010,0);
    parameter.declareParameterInt('workarea', 'x_workarea_max_mm',LOCALIZER.GetMessage('param_x_workarea_max_mm'),0,1010,1000);
    parameter.declareParameterInt('workarea', 'y_workarea_min_mm',LOCALIZER.GetMessage('param_y_workarea_min_mm'),0,1010,0);
    parameter.declareParameterInt('workarea', 'y_workarea_max_mm',LOCALIZER.GetMessage('param_y_workarea_max_mm'),0,1010,995);
  
//   parameter.declareParameterGroup('travelrange',LOCALIZER.GetMessage('grp_travelrange'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
//     parameter.declareParameterInt('travelrange', 'x_travel_range_min_mm',LOCALIZER.GetMessage('param_x_travel_range_min_mm'),-10,650,-10);
//     parameter.declareParameterInt('travelrange', 'x_travel_range_max_mm',LOCALIZER.GetMessage('param_x_travel_range_max_mm'),-10,650,650);
//     parameter.declareParameterInt('travelrange', 'y_travel_range_min_mm',LOCALIZER.GetMessage('param_y_travel_range_min_mm'),-525,995,-525);
//     parameter.declareParameterInt('travelrange', 'y_travel_range_max_mm',LOCALIZER.GetMessage('param_y_travel_range_max_mm'),-525,995,995);
// put in lang_en if needed:
//   "grp_travelrange": "Axes Travel range",
//     "param_x_travel_range_min_mm": "X-Axes Travel Range min (mm)",
//     "param_x_travel_range_max_mm": "X-Axes Travel Range max (mm)",
//     "param_y_travel_range_min_mm": "Y-Axes Travel Range min (mm)",
//     "param_y_travel_range_max_mm": "Y-Axes Travel Range max (mm)", 
    
  parameter.declareParameterGroup('movementSettings',LOCALIZER.GetMessage('grp_movementSettings'),'Movement Settings',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('movementSettings', 'recoating_time_ms',LOCALIZER.GetMessage('param_recoating_time'),0,100000,26000);
    parameter.declareParameterInt('movementSettings', 'sequencetransfer_speed_mms',LOCALIZER.GetMessage('param_sequencetransfer_speed_mms'),0,1000,120);
    parameter.declareParameterInt('movementSettings', 'recoating_speed_mms',LOCALIZER.GetMessage('param_recoating_speed_mms'),0,1000,120);
    parameter.declareParameterReal('movementSettings', 'head_startpos_x',LOCALIZER.GetMessage('param_head_startpos_x'),0.0,1000.0,0.0);
    parameter.declareParameterReal('movementSettings', 'head_startpos_y',LOCALIZER.GetMessage('param_head_startpos_y'),-500.0,1000.0,0.0);

  

  // scanner head
  parameter.declareParameterGroup('scanhead',LOCALIZER.GetMessage('grp_scanhead'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    //parameter.declareParameterReal('scanhead', 'y_global_max_limit', LOCALIZER.GetMessage('param_y_global_max_limit'),0,1000,995);
    //parameter.declareParameterReal('scanhead', 'x_global_max_limit', LOCALIZER.GetMessage('param_x_global_max_limit'),0,1000,660);
    
    
    parameter.declareParameterReal('scanhead', 'tile_overlap_x',LOCALIZER.GetMessage('param_tile_overlap_x'),-100,100,-5); //-5
    parameter.declareParameterReal('scanhead', 'tile_overlap_y',LOCALIZER.GetMessage('param_tile_overlap_y'),-100,100,-5); //-5
    
    parameter.declareParameterReal('scanhead', 'x_scanfield_size_mm',LOCALIZER.GetMessage('param_x_scanfield_size_mm'),0,430,430); //430
    parameter.declareParameterReal('scanhead', 'y_scanfield_size_mm',LOCALIZER.GetMessage('param_y_scanfield_size_mm'),0,110,110);//110;
    
    parameter.declareParameterReal('scanhead', 'x_scanfield_size_limit',LOCALIZER.GetMessage('param_x_scanfield_size_mm'),0,430,430); //fixed values
    parameter.declareParameterReal('scanhead', 'y_scanfield_size_limit',LOCALIZER.GetMessage('param_y_scanfield_size_mm'),0,110,110); //fixed values

    parameter.declareParameterReal('scanhead', 'x_scanner1_max_mm',LOCALIZER.GetMessage('param_x_scanner1_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner1_min_mm',LOCALIZER.GetMessage('param_x_scanner1_min_mm'),-100,0,-40);
    parameter.declareParameterReal('scanhead', 'x_scanner1_ref_mm',LOCALIZER.GetMessage('param_x_scanner1_ref_mm'),0,390,40);

    parameter.declareParameterReal('scanhead', 'x_scanner2_max_mm',LOCALIZER.GetMessage('param_x_scanner2_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner2_min_mm',LOCALIZER.GetMessage('param_x_scanner2_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner2_ref_mm',LOCALIZER.GetMessage('param_x_scanner2_ref_mm'),0,390,125);

    parameter.declareParameterReal('scanhead', 'x_scanner3_max_mm',LOCALIZER.GetMessage('param_x_scanner3_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner3_min_mm',LOCALIZER.GetMessage('param_x_scanner3_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner3_ref_mm',LOCALIZER.GetMessage('param_x_scanner3_ref_mm'),0,390,210);

    parameter.declareParameterReal('scanhead', 'x_scanner4_max_mm',LOCALIZER.GetMessage('param_x_scanner4_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner4_min_mm',LOCALIZER.GetMessage('param_x_scanner4_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner4_ref_mm',LOCALIZER.GetMessage('param_x_scanner4_ref_mm'),0,390,265);

    parameter.declareParameterReal('scanhead', 'x_scanner5_max_mm',LOCALIZER.GetMessage('param_x_scanner5_max_mm'),0,100,50);
    parameter.declareParameterReal('scanhead', 'x_scanner5_min_mm',LOCALIZER.GetMessage('param_x_scanner5_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner5_ref_mm',LOCALIZER.GetMessage('param_x_scanner5_ref_mm'),0,390,380);    
    
 parameter.declareParameterGroup('skywriting', LOCALIZER.GetMessage('grp_skywriting')); 
      parameter.declareParameterChoice('skywriting','skywritingMode',
          LOCALIZER.GetMessage('param_skywritingMode'),
          [LOCALIZER.GetMessage('param_skywritingMode_0'),
          LOCALIZER.GetMessage('param_skywritingMode_1'),
          LOCALIZER.GetMessage('param_skywritingMode_2'),
          LOCALIZER.GetMessage('param_skywritingMode_3')],
          LOCALIZER.GetMessage('param_skywritingMode_3')
          );
          
      parameter.declareParameterInt('skywriting','timelag', LOCALIZER.GetMessage('param_timelag'),0,1000,174);
      parameter.declareParameterInt('skywriting','laserOnShift', LOCALIZER.GetMessage('param_laserOnShift'),-1000,1000,-40);
      parameter.declareParameterInt('skywriting','nprev', LOCALIZER.GetMessage('param_nprev'),0,1000,110);
      parameter.declareParameterInt('skywriting','npost', LOCALIZER.GetMessage('param_npost'),0,1000,90);
      parameter.declareParameterReal('skywriting','mode3limit', LOCALIZER.GetMessage('param_mode3limit'),0.0,100.0,0.9);
    

  // onthefly
  parameter.declareParameterGroup('otf', LOCALIZER.GetMessage('grp_otf'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('otf','tile_size', LOCALIZER.GetMessage('param_tile_size'),0.0,160.0,33.0);
    parameter.declareParameterReal('otf','axis_max_speed', LOCALIZER.GetMessage('param_axis_max_speed'),0.0,100.0,80.0);
    parameter.declareParameterReal('otf','tile_rest_period', LOCALIZER.GetMessage('param_tile_rest_period'),0.0,120.0,0);
    
    // group tileing
  parameter.declareParameterGroup('tileing',LOCALIZER.GetMessage('grp_tileing'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterChoice('tileing', 'TilingMode', 
     LOCALIZER.GetMessage('param_TilingMode'),
      [LOCALIZER.GetMessage('param_TilingMode_Static'),
      LOCALIZER.GetMessage('param_TilingMode_Smart')],
     LOCALIZER.GetMessage('param_TilingMode_Static')
      );
   parameter.declareParameterChoice('tileing', 'ScanningMode', 
     LOCALIZER.GetMessage('param_ScanningMode'),
      [LOCALIZER.GetMessage('param_ScanningMode_MoveAndShoot'),
      LOCALIZER.GetMessage('param_ScanningMode_OnTheFly')],
      LOCALIZER.GetMessage('param_ScanningMode_MoveAndShoot')
      );
 

    parameter.declareParameterReal('tileing','overlap', LOCALIZER.GetMessage('param_overlap'),0.0,100.0,0.1);
    parameter.declareParameterReal('tileing','step_x', LOCALIZER.GetMessage('param_step_x'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_x', LOCALIZER.GetMessage('param_number_x'),0,10,7);
    parameter.declareParameterReal('tileing','step_y', LOCALIZER.GetMessage('param_step_y'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_y', LOCALIZER.GetMessage('param_number_y'),0,10,7); 
   
//   parameter.declareParameterGroup('laser', LOCALIZER.GetMessage('grp_laser'));
//     parameter.declareParameterInt('laser', 'fill_power', LOCALIZER.GetMessage('param_hatch_power'), 0, 1000, 190);
//     parameter.declareParameterReal('laser', 'fill_speed', LOCALIZER.GetMessage('param_hatch_speed'), 0, 10000, 1900);
//     parameter.declareParameterInt('laser', 'open_border_power', LOCALIZER.GetMessage('param_openline_power'), 0, 1000, 170);
//     parameter.declareParameterReal('laser', 'open_border_speed', LOCALIZER.GetMessage('param_openline_speed'), 0, 10000, 1700);

  parameter.declareParameterGroup('scanning_priority', LOCALIZER.GetMessage('grp_scanning_priority'));
    parameter.declareParameterInt('scanning_priority','part_hatch_priority', LOCALIZER.GetMessage('param_part_hatch_priority'),0,2000,100);
    parameter.declareParameterInt('scanning_priority','downskin_hatch_priority', LOCALIZER.GetMessage('param_downskin_hatch_priority'),0,2000,200);
    parameter.declareParameterInt('scanning_priority','support_hatch_priority', LOCALIZER.GetMessage('param_support_hatch_priority'),0,2000,300);
    parameter.declareParameterInt('scanning_priority','part_contour_priority', LOCALIZER.GetMessage('param_part_contour_priority'),0,2000,400);
    parameter.declareParameterInt('scanning_priority','downskin_contour_priority', LOCALIZER.GetMessage('param_downskin_contour_priority'),0,2000,500);
    parameter.declareParameterInt('scanning_priority','support_contour_priority', LOCALIZER.GetMessage('param_support_contour_priority'),0,2000,600);
    parameter.declareParameterInt('scanning_priority','openPolyline_priority', LOCALIZER.GetMessage('param_openPolyline_priority'),0,2000,700);
};



/** 
* @param  a_config    bsPostProcessingConfig 
*/
exports.configurePostProcessingSteps = function(a_config)
{
  // Postprocessing the toolpaths using the given function:
  a_config.addPostProcessingStep(postprocessLayerStack_MT,{bMultithread: true, nProgressWeight: 1});
};

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
  buildAttrib.declareAttributeInt('3mf_attribute');
  buildAttrib.declareAttributeInt('atu_attribute');
  buildAttrib.declareAttributeInt('priority');
  buildAttrib.declareAttributeInt('passNumber');
  buildAttrib.declareAttributeInt('passNumber_3mf');//
  buildAttrib.declareAttributeReal('xcoord');
  buildAttrib.declareAttributeReal('ycoord');
  buildAttrib.declareAttributeInt('tile_index');
  buildAttrib.declareAttributeInt('tileID_3mf');
  buildAttrib.declareAttributeReal('Subtile_Duration');
  buildAttrib.declareAttributeInt('scanning_priority');
  buildAttrib.declareAttributeInt('laser_index');
  buildAttrib.declareAttributeInt('sharedZone');
  buildAttrib.declareAttributeInt('zoneExposure');
  buildAttrib.declareAttributeInt('zoneIndex');
  buildAttrib.declareAttributeInt('islandId');
  buildAttrib.declareAttributeReal('ScanheadMoveSpeed');
  for(let i = 0 ; i<laser_count ; i++){
    buildAttrib.declareAttributeInt('laser_index_'+(i+1));
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
// exports.declareModelFeatures = function(modelFeatures)
// {
// 
// };

/**
* Prepare a part for calculation. Checking configuration
* and adding properties to the part
* @param  model   bsModel
*/

exports.prepareModelExposure = function(model)
{
  

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
    
 
 // let part_hatch_power = PARAM.getParamInt('laser', 'fill_power');
//  let part_hatch_speed = PARAM.getParamReal('laser', 'fill_speed');
    
 // let open_border_power = PARAM.getParamInt('laser', 'open_border_power');
  //let open_border_speed = PARAM.getParamReal('laser', 'open_border_speed');
  
  //let laser_count = PARAM.getParamInt('exposure', 'laser_count');

  // Create custom table
  //generates a custom  table containing different parameters depending on laser number
  
  let skywritingAttributes = {      
    "schema": "http://schemas.scanlab.com/skywriting/2023/01",          
    "mode": PARAM.getParamInt('skywriting','skywritingMode'),
    "timelag": PARAM.getParamInt('skywriting','timelag'),
    "laseronshift": PARAM.getParamInt('skywriting','laserOnShift'),
    "limit": PARAM.getParamReal('skywriting','mode3limit'),
    "nprev": PARAM.getParamInt('skywriting','nprev'),
    "npost": PARAM.getParamInt('skywriting','npost')
  };
  
  var customTable = [];  
  for(let l_laser_nr = 1; l_laser_nr<=laser_count;++l_laser_nr)
  {
    // Open Polylines
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr); //laser no * 10
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_openpolyline";
    bsid_obj.power = openPolyLine_power;
    bsid_obj.focus = openPolyLine_defocus;
    bsid_obj.speed = openPolyLine_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'openPolyline_priority');
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);

    // Part Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+1); // laser no * 10 + 1
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_parthatch";
    bsid_obj.power = part_hatch_power;
    bsid_obj.focus = part_hatch_defocus;
    bsid_obj.speed = part_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'part_hatch_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
    // part Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+2); // laser no * 10 + 2
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_partcontour";
    bsid_obj.power = part_contour_power;
    bsid_obj.focus = part_contour_defocus;
    bsid_obj.speed = part_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'part_contour_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
    // downskin Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+3); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_downskinhatch";
    bsid_obj.power = downskin_hatch_power;
    bsid_obj.focus = downskin_hatch_defocus;
    bsid_obj.speed = downskin_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'downskin_hatch_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
    // downskin Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+4); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_downkskincontour";
    bsid_obj.power = downskin_contour_power;
    bsid_obj.focus = downskin_contour_defocus;
    bsid_obj.speed = downskin_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'downskin_contour_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
    // Support Hatch
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+5); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_supporthatch";
    bsid_obj.power = support_hatch_power;
    bsid_obj.focus = support_hatch_defocus;
    bsid_obj.speed = support_hatch_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'support_hatch_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
    // Support Contour
    var bsid_obj = new Object();
    bsid_obj.bsid = (10 * l_laser_nr+6); // laser no * 10 + 3
    bsid_obj.laserIndex = l_laser_nr;
    bsid_obj.name = "laser" + l_laser_nr + "_supportcontour";
    bsid_obj.power = support_contour_power;
    bsid_obj.focus = support_contour_defocus;
    bsid_obj.speed = support_contour_speed;
    bsid_obj.priority = PARAM.getParamInt('scanning_priority', 'support_contour_priority');    
    bsid_obj.attributes = [ skywritingAttributes ];
    customTable.push(bsid_obj);
    
  } // for
  model.setAttribEx('customTable', customTable);


 ////////////////////////////////////////
 // generate scannerhead data obejcts //
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
   
//   // generate and define different scanhead zones
//   let scanhead_zones = new Array(laser_count*2-1);
//   let scanhead_zones_array = new Array;
// 
//   function setZoneProperties(boarder_min,boarder_max, designation) {
//     this.designation = designation // mix or single
//     this.xMin = boarder_min;
//     this.xMax = boarder_max
//     }


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

// get all relevant information for the tiling providing the origin of the scanhead
function getTilePosition(x_pos,y_pos,overlap_x,overlap_y){
  
  this.xpos = x_pos;
  this.ypos = y_pos;
  this.x_min = x_pos;// + PARAM.getParamReal('scanhead','x_scanner1_ref_mm') + PARAM.getParamReal('scanhead','x_scanner1_min_mm2');
  this.x_max = x_pos + PARAM.getParamReal('scanhead','x_scanfield_size_mm');//(PARAM.getParamReal('scanhead','x_scanner5_ref_mm') + PARAM.getParamReal('scanhead','x_scanner5_max_mm2');
  this.y_min = y_pos;// + PARAM.getParamReal('scanhead','stripe_ref_mm') + PARAM.getParamReal('scanhead','stripe_min_y_mm');
  
    if(PARAM.getParamInt('tileing','ScanningMode') == 0){ // moveandshoot     
      this.y_max = y_pos + PARAM.getParamReal('scanhead','y_scanfield_size_mm'); 
    } else { //onthefly   
      this.y_max = y_pos + PARAM.getParamReal('otf','tile_size');
    }  
    
  //this.x_global_limit = PARAM.getParamReal('scanhead','x_global_max_limit');
  //this.y_global_limit = PARAM.getParamReal('scanhead','y_global_max_limit');
  this.tile_height = this.y_max - this.y_min;
  this.tile_width =  this.x_max - this.x_min;
    
    if(typeof overlap_x === "undefined") overlap_x = PARAM.getParamReal('scanhead','tile_overlap_x');
    if(typeof overlap_y === "undefined") overlap_y = PARAM.getParamReal('scanhead','tile_overlap_y');
    
  this.next_x_coord = x_pos + this.tile_width + overlap_x;
  this.next_y_coord = y_pos + this.tile_height + overlap_y;
} 


function getTileArray(modelLayer,bDrawTile,layerNr){
   
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
  
   //let scence_center_x = minX + scene_size_x/2;
  // let scence_center_y = minY + scene_size_y/2;
   // add some check cannot be larger then required
   
   //let scanhead_global_pass_position = new Array();
   let scanhead_x_starting_pos = 0;
   let scanhead_y_starting_pos = 0;
   
  // find the tileOutlineOrigin if scannerarray positioned at origo (0,0)
   let tileOutlineOrigin = new getTilePosition(scanhead_x_starting_pos,scanhead_y_starting_pos); // get the tile layout information.
   
   // calculate the required tiles both in x and y (rounded up to make fit into whole passes)
   var required_passes_x = Math.ceil(scene_size_x/tileOutlineOrigin.tile_width);
   var required_passes_y = Math.ceil(scene_size_y/tileOutlineOrigin.tile_height);
   
   //get overlap
   let overlap_y = PARAM.getParamReal('scanhead','tile_overlap_y');
   let overlap_x = PARAM.getParamReal('scanhead','tile_overlap_x');
   
   // readjust required passes based on overlapping tiles
   if (required_passes_x > 1 && overlap_x!=0) {
    required_passes_x = Math.ceil(scene_size_x/(tileOutlineOrigin.tile_width+overlap_x));
     }
     
   if (required_passes_y > 1 && overlap_y!=0) {
    required_passes_y = Math.ceil(scene_size_y/(tileOutlineOrigin.tile_height+overlap_y));
     }  
     
   ///// find the actual starting position of the scanner_head (defined by the scenesize)
   

   var workarea_min_x = PARAM.getParamInt('workarea','x_workarea_min_mm');
   var workarea_min_y = PARAM.getParamInt('workarea','y_workarea_min_mm');
   var workarea_max_x = PARAM.getParamInt('workarea','x_workarea_max_mm');
   var workarea_max_y = PARAM.getParamInt('workarea','y_workarea_max_mm');  

   // check boundaries in y   
   let tile_reach_y = tileOutlineOrigin.tile_height*required_passes_y+overlap_y*(required_passes_y-1);  
           
   if((scene_size_y-PARAM.getParamReal('scanhead','y_scanfield_size_mm'))/2+minY < workarea_min_y ){ // if the bounds are outside the powderbed force the tiling to start within // shouldn't happen
       scanhead_y_starting_pos = workarea_min_y;
     } else {
     scanhead_y_starting_pos = (scene_size_y-tile_reach_y)/2+minY;
     }
    
     let maxPositionY = scanhead_y_starting_pos+tile_reach_y;
        
     if (maxPositionY > workarea_max_y)
       { // pull back the position with overshoot
         let yOverShoot = maxPositionY - workarea_max_y;
         scanhead_y_starting_pos -= yOverShoot;
       }
     
   // check boundaries in x   
   let tile_reach_x = tileOutlineOrigin.tile_width*required_passes_x+overlap_x*(required_passes_x-1); 
       
   if((scene_size_x-PARAM.getParamReal('scanhead','x_scanfield_size_mm'))/2+minX < workarea_min_x  ){
       scanhead_x_starting_pos = workarea_min_x ; // cannot scan outside 
   } else {
      scanhead_x_starting_pos = minX;//<- this code sets the xmin as starting pos (scene_size_x-tile_reach_x)/2+minX; <- this codes centers scanfield 
     }
   
   let maxPositionX = scanhead_x_starting_pos+tile_reach_x;
     
   if (maxPositionX > workarea_max_x)
     { // pull back the position with overshoot
       let xOverShoot = maxPositionX - workarea_max_x;
       scanhead_x_starting_pos -= xOverShoot;
     }
  
   // if the required passes STILL does not fit within the working area update the overlap bewteen tiles

  //x first
  if(scanhead_x_starting_pos<workarea_min_x){
    let outsideby = scanhead_x_starting_pos-workarea_min_x; // calculate how much outside
    overlap_x = outsideby/(required_passes_x-1); //calculate overlap needed per pass
    scanhead_x_starting_pos = workarea_min_x; // set start to min x
  }
  
    //y
  if(scanhead_y_starting_pos<workarea_min_y){
    let outsideby = scanhead_y_starting_pos-workarea_min_y; // calculate how much outside
    overlap_y = outsideby/(required_passes_y-1); //calculate overlap needed per pass
    scanhead_y_starting_pos = workarea_min_y; // set start to min x
  }
     
   // calulate the free distance (play) from the tile start to the part top and bottom
   
  
     
   var tileTable = [];  // store the tilelayout
   var tileTable3mf = [];  
     
     
    let cur_tile_coord_x =  scanhead_x_starting_pos;
    let cur_tile_coord_y =  scanhead_y_starting_pos;
       
  for (let i=0; i <required_passes_x; i++)
  {
    
    let cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y,overlap_x,overlap_y);
    let next_tile_coord_x = cur_tile.next_x_coord;
    
    
    for(let j =0; j<required_passes_y;j++)
    {       
         
      cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y,overlap_x,overlap_y);
      
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
       
       let defaultSpeedY;
       if(PARAM.getParamInt('tileing','ScanningMode') == 0) { // moveandshoot
          defaultSpeedY = PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms');
       } else { //onthefly
          defaultSpeedY = PARAM.getParamReal('otf','axis_max_speed');
       }
       
       //3mf data:
       var tile3mf = new Object;
       let TileEntry3mf = {
         "name": "movement",
         "attributes": {
            "tileID": j+1,
            "targetx": cur_tile_coord_x,
            "targety": cur_tile_coord_y,
            "speedx" : 0,
            "speedy": defaultSpeedY,
            "tileExposureTime" : 0
         }
       };
       if (!tileTable3mf[i]) tileTable3mf[i] = [];
       
       tileTable3mf[i].push(TileEntry3mf);
      
      cur_tile_coord_y = cur_tile.next_y_coord;
    }
    
    cur_tile_coord_y = scanhead_y_starting_pos; // resest y coord
    cur_tile_coord_x = next_tile_coord_x; // set next stripe pass
  }
  
  modelLayer.setAttribEx('tileTable',tileTable);
  modelLayer.setAttribEx('tileTable_3mf',tileTable3mf);
  modelLayer.setAttrib('requiredPassesX',required_passes_x.toString());
  modelLayer.setAttrib('requiredPassesY',required_passes_y.toString());
} // gettileArray


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
      let targetModel = new MODEL.bsModel();
      thisModel.unifyPartWithSolidSupports(targetModel, progress, true) ;
      
      modelDataTarget.addModelCopy(thisModel);  
      modelDataTarget.addModelCopy(targetModel);  
    }
    
    
    
  // run through all layers and find the boundaries
  for( let modelIndex=0; modelIndex < modelCount && !progress.cancelled(); modelIndex++ )
    {
    let thisModel = modelDataTarget.getModel(modelIndex); // look at the joint models
      
      for (let layerIt = 0; layerIt <modelLayerCount;layerIt++)
      {
       var modelLayer =  thisModel.getModelLayer((layerIt+1)*modelLayerHeight);
        
        if (modelLayer.isValid())
        {
          
          let thisLayerBounds = modelLayer.getBounds();
          layerBoundaries[layerIt] = thisLayerBounds;
        
          modelLayer.setAttribEx('boundaries',layerBoundaries[layerIt]);          
        }
       
       // calculate the tileArray
       
            
          getTileArray(modelLayer,bDrawTile,layerIt);  
      }
    }
         
};

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
  //let laser_count = PARAM.getParamInt('exposure', 'laser_count');
  
  var beam_compensation = PARAM.getParamReal("exposure", "beam_compensation");
  var boarder_offset = PARAM.getParamReal("exposure", "boarder_offset"); 
  //var number_of_borders = PARAM.getParamReal("exposure", "number_of_border");
  
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

  var down_skin_surface_angle = PARAM.getParamReal("downskin", "down_skin_surface_angle");
  var down_skin_layer_reference = PARAM.getParamInt("downskin", "down_skin_layer_reference");
  var down_skin_hatch_density = PARAM.getParamReal("downskin", "down_skin_hdens");
  var down_skin_hatch_angle_increment =  PARAM.getParamReal("downskin", "down_skin_hangle_increment");
  var down_skin_cur_hatch_angle = (PARAM.getParamReal("downskin", "down_skin_hangle") + (nLayerNr * down_skin_hatch_angle_increment)) % 360;
  var down_skin_overlap = PARAM.getParamReal("downskin", "down_skin_overlap");
  
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
      var is_part = MODEL.nSubtypePart == island_it.getModelSubtype();
      var is_support = MODEL.nSubtypeSupport == island_it.getModelSubtype();
      
      let bulkIsland = new ISLAND.bsIsland();
      let downSkinbulkIsland = new ISLAND.bsIsland();
      
      var island = island_it.getIsland().clone();
  
      addBlockedPath(island,islandId);
      
      var islandOffset = generateOffset(island,beam_compensation).offsetIsland;
      let islandContourHatch = new HATCH.bsHatch();
      islandOffset.borderToHatch(islandContourHatch);
      var islandBorderClipper = generateOffset(islandOffset,0.0004).offsetIsland;
      //check if the model is part or support and store them.
      if(is_part)
        {          
                    
          //find down skin area
          var down_skin_island = new ISLAND.bsIsland();
          var not_down_skin_island = new ISLAND.bsIsland();
          
          if(PARAM.getParamInt('downskin','downskintoggle')){
          
            islandOffset.splitMultiLayerOverhang(down_skin_surface_angle, down_skin_overlap, down_skin_layer_reference,
            not_down_skin_island, down_skin_island);
            
          } else {
            
             not_down_skin_island.copyFrom(islandOffset);
              
          }
          

          if(!down_skin_island.isEmpty())
            {
              
              downSkinbulkIsland = generateOffset(down_skin_island,beam_compensation).offsetIsland;
              
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
               "blocksortVec" : {x: 0.0, y: 1.0},
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
                       
            bulkIsland = generateOffset(not_down_skin_island,beam_compensation).offsetIsland;
            
            
            let hatchingArgs = {
               "fHatchDensity" : hatch_density,
               "fHatchAngle" : cur_hatch_angle,
               "nCycles" : 1,
               "fCollinearBorderSnapTol" : 0.0,
               "fBlocksortRunAheadLimit": 2.0,
               "hatchOrigin" : {x: 0.0, y: 0.0},
               "blocksortVec" : {x: 0.0, y: 1.0},
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
               "blocksortVec" : {x: 0.0, y: 1.0},
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
      var is_part = MODEL.nSubtypePart == polyline_it.getModelSubtype(); // is it a part
      var is_support = MODEL.nSubtypeSupport == polyline_it.getModelSubtype(); // is it support
      
      var polyline_hatch_paths = new HATCH.bsHatch(); // new container for exposure data
      
      polyline_it.polylineToHatch(polyline_hatch_paths);
      
      if(is_part)
      {      
        // part
        polyline_hatch_paths.setAttributeInt('islandId',islandId);
        polyline_hatch_paths.setAttributeReal("power", openpolyline_power);
        polyline_hatch_paths.setAttributeReal("speed", openpolyline_speed);
        polyline_hatch_paths.setAttributeInt("type", type_openPolyline);
      }
      else
      {
        // support/fixtures
        polyline_hatch_paths.setAttributeInt('islandId',islandId);
        polyline_hatch_paths.setAttributeReal("power", openpolyline_power);
        polyline_hatch_paths.setAttributeReal("speed", openpolyline_speed);
        polyline_hatch_paths.setAttributeInt("type", type_openPolyline);
      }
      
      hatchResult.moveDataFrom(polyline_hatch_paths); // moves polyline_hatch_paths to hatchResult
      
      polyline_it.next(); // looks at next polyline
    }
  }
      
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
  
  hatchResult.moveDataFrom(allContourHatch);
  
  function addBlockedPath(island,ilandId) {
      ///////////////////////////////////////////////////////////////////////
      // narrow bridges
      var narrow_bridge = new HATCH.bsHatch();

      island.createNarrowBridgePolylines(
          narrow_bridge, -beam_compensation);
      
      narrow_bridge.setAttributeReal("power", border_power);
      narrow_bridge.setAttributeReal("speed", border_speed);
      narrow_bridge.setAttributeInt("type", type_openPolyline);
      narrow_bridge.setAttributeInt("islandId", ilandId);
      
      hatchResult.moveDataFrom(narrow_bridge);

      /////////////////////////////////////////////////////////////////////
      
      // narrow appendixes
      var narrow_app = new HATCH.bsHatch();

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
  /// Index the tiles (passnumber, tile_index, scanhead xcoord and ycoord) ///
  /////////////////////////////////////////////////////////////////////////////
 
      let Margs = {
        "bConvertToHatchMode": true,
        "nConvertToHatchMaxPointCount": 2,
        "nMaxBlockSize": 512,
        "bCheckAttributes": true
      };  
     //hatch.mergeHatchBlocks(Margs);
 
  for(let j = 0; j<tileArray.length;j++)
    {
     // get the coordinates of the current tile 
     let tile_x_min = tileArray[j].scanhead_outline[0].m_coord[0]+0.002;
     let tile_x_max = tileArray[j].scanhead_outline[2].m_coord[0]-0.002;
     let tile_x_cen = (tile_x_min+tile_x_max)/2;
     let tile_y_min = tileArray[j].scanhead_outline[0].m_coord[1];//+0.000000001;
     let tile_y_max = tileArray[j].scanhead_outline[2].m_coord[1];//-0.000000001;
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
      tileHatch = ClipHatchByRect(hatch.clone(),vec2_tile_array[j],true);
      hatchOutside = ClipHatchByRect(hatch.clone(),vec2_tile_array[j],false);
//       process.printInfo('tilehatch: ' + tileHatch.getHatchBlockCount());
//       process.printInfo('tilehatch length: ' + tileHatch.getExposureLength() );
//       process.printInfo('hatchOutside: ' + tileHatch.getHatchBlockCount());
//       process.printInfo('hatchOutside length: ' + tileHatch.getExposureLength() );

     // add some attributes to hatchblocks
     tileHatch.setAttributeInt('passNumber', tileArray[j].passNumber);
     tileHatch.setAttributeInt('passNumber_3mf', tileArray[j].passNumber+1);
     tileHatch.setAttributeInt('tile_index',tileArray[j].tile_number);
     tileHatch.setAttributeInt('tileID_3mf',tileArray[j].tile_number+1);
     tileHatch.setAttributeReal('xcoord', tileArray[j].scanhead_x_coord);
     tileHatch.setAttributeReal('ycoord', tileArray[j].scanhead_y_coord);
     
//      process.printInfo('hatch before merge: ' + hatch.getHatchBlockCount());
//      process.printInfo('hatch before merge len: ' + hatch.getExposureLength() );
     hatch.makeEmpty();
     hatch.moveDataFrom(hatchOutside);
     hatch.moveDataFrom(tileHatch);

//      process.printInfo('hatch after merge: ' + hatch.getHatchBlockCount());
//      process.printInfo('hatch after merge len: ' + hatch.getExposureLength());     
    } //for
    
    
      
    hatchResult.moveDataFrom(hatch);    
    
    thisLayer.setAttribEx('tileSegmentArr',tileSegmentArr);   
    
    // generate data for 3mf exporter
    if (PARAM.getParamInt('tileing','ScanningMode') == 0){
      var type = 'moveandshoot'
      } else {
      var type = 'onthefly'
    };
  var required_passes_x = thisLayer.getAttrib('requiredPassesX');
  var required_passes_y = thisLayer.getAttrib('requiredPassesY');
//   var exporter_3mf = {
//       
//     "segment_attributes": [
//           {
//            "segmenttype": "hatch",
//            "datatype": "uint32",
//            "attribute_name": 1,
//            "attribute_value": 1,
//            "namespace": "http://adira.com/tilinginformation/202305"
//            }
//     ],
//         "content": [{
//            "name": "sequence",
//            "namespace": "http://adira.com/tilinginformation/202305",
// 	         "attributes": {
// 		          "uuid": "7b85d4a4-bc8b-44eb-b5f4-59fb25cb9d77",
// 		          "startx": PARAM.getParamReal('movementSettings','head_startpos_x'),
// 		          "starty": PARAM.getParamReal('movementSettings','head_startpos_y'),
// 		          "sequencetransferspeed": PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms'),
// 		          "type": type,
//               "requiredPasses": thisLayer.getAttrib('requiredPassesX'),
//               "tilesInPass": thisLayer.getAttrib('requiredPassesY'),
//               "layerScanningDuration": 0,
//               
// 	          },
// 	          "children": [
//             ]
//         }]
//     };
    
    let thistiletable = thisLayer.getAttribEx('tileTable_3mf');    
    
    
    
   //exporter_3mf.content[0].children = thistiletable;
    
    //exporter_3mf.content.children.push(thistiletable);
//     exporter_3mf.content.attributes.layerScanningDuration = 
//     
//     thisLayer.setAttribEx('exporter_3mf', exporter_3mf);
    
  /////////////////////////////////////
  /// Assign laser options to hatch /// currently not used - only relevant for smart tileing !
  /////////////////////////////////////
     
  /* currently limited to keeping the x pos static during one pass */
     
  //var vec2LaserZoneArray = new Array;
     
  var tempTileHatch = new HATCH.bsHatch();
 
  tempTileHatch.moveDataFrom(hatchResult); // move all tiles to temp hatch object
             
//   for (let i = 0; i< required_passes_x*required_passes_y;i++) // run through the different passes
//     {
//        
//       let scanheadXCoord = tileArray[i].scanhead_x_coord;
//       let scanheadYCoord = tileArray[i].scanhead_y_coord;
// 
//       //var sceneMinY = currentLayerBoundaries.minY;
//       //var sceneMaxY = currentLayerBoundaries.maxY;
//         
//       for (let j=0;j<laser_count;j++)
//         {
//         // get information about the lasing zone in X
//           let curLaserId = scanheadArray[j].laserIndex; // get laser ID
//           let curXref = scanheadArray[j].x_ref;
//           let curRelXmin = scanheadArray[j].rel_x_min;
//           let curRelXmax = scanheadArray[j].rel_x_max;
//           
//           let curLaserXmin = curXref + curRelXmin + scanheadXCoord;
//           let curLaserXmax = curXref + curRelXmax + scanheadXCoord;
//           
//           let curYref = scanheadArray[j].y_ref;
//           let curRelYmin = scanheadArray[j].rel_y_min;
//           let curRelYmax = scanheadArray[j].rel_y_max;
//           
//           let curLaserYmin = curYref + curRelYmin + scanheadYCoord;
//           let curLaserYmax = curYref + curRelYmax + scanheadYCoord;
//            
//          // add the corrdinates to vector pointset
//          let laserZonePoints = new Array(4);
//          laserZonePoints[0] = new VEC2.Vec2(curLaserXmin, curLaserYmin); //min,min
//          laserZonePoints[1] = new VEC2.Vec2(curLaserXmin, curLaserYmax); //min,max
//          laserZonePoints[2] = new VEC2.Vec2(curLaserXmax, curLaserYmax); // max,max
//          laserZonePoints[3] = new VEC2.Vec2(curLaserXmax, curLaserYmin); // max,min
//          
//          let laserZoneHatch = new HATCH.bsHatch();
//          let laserZoneHatchOutside = new HATCH.bsHatch();
         
//          let laserZone_pathset = new PATH_SET.bsPathSet(); // generate pathset object
//          laserZone_pathset.addNewPath(laserZonePoints); // add tiles zones to pathset  
//          laserZone_pathset.setClosed(true); // set the zones to closed polygons
//          let laserZone_clipping_island = new ISLAND.bsIsland(); // generate island object
//          laserZone_clipping_island.addPathSet(laserZone_pathset); // add pathset as new island
//          laserZoneHatch = tempTileHatch.clone(); // clone overall hatching
//          laserZoneHatchOutside = tempTileHatch.clone(); // clone overall hatching
//          tempTileHatch.makeEmpty(); // empty the container to refill it later
//           
//          laserZoneHatch.clip(laserZone_clipping_island,true); // clip the hatching with the tile_islands
//          laserZoneHatchOutside.clip(laserZone_clipping_island,false); // get ouside of currentzone
          
//           let clippingHatch = tempTileHatch.clone();                    
//           laserZoneHatch = ClipHatchByRect(clippingHatch,laserZonePoints);
//           laserZoneHatchOutside = ClipHatchByRect(clippingHatch,laserZonePoints,false);
          //tempTileHatch.clear();
                
          //laserZoneHatchOutside=ClipHatchByRect(clippingHatch,laserZonePoints,false);
         // assign laser index
//         laserZoneHatch.setAttributeInt('laser_index_' + (curLaserId), 1);
         

//           tempTileHatch = laserZoneHatch.clone();
//           tempTileHatch.moveDataFrom(laserZoneHatchOutside);      
//         } // for laser count       
//       }   // all tiles
 
     
      
      let mergeblock = new HATCH.bsHatch();
         mergeblock.moveDataFrom(tempTileHatch);
      

         // merge similar hatch blocks to speed up process
         let mergeArgs = {
           'bConvertToHatchMode': true,
           'nConvertToHatchMaxPointCount': 2,
           //'nMaxBlockSize': 1024,
           'bCheckAttributes': true
         };
         
         //tempTileHatch = mergeblock.mergeHatchBlocks(mergeArgs);  
         var allTileHatch = new HATCH.bsHatch();
         tempTileHatch.moveDataFrom(mergeblock);   
         
         var args = {
          sSegRegionFillingMode             : "PositiveX",
          bInvertFillingSequence            : false,
          fSegRegionFillingGridSize         : 0.0,
          sSetAssignedRegionIndexMemberName : "regionIndex"
         }; 
         
         tempTileHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr,0,args);
      
         allTileHatch.moveDataFrom(tempTileHatch);
  
function defineSharedZones(){
  
  /////////////////////////////////////
  /// Define zones shared by lasers /// 
  /////////////////////////////////////
   
  let hatchblockIt = allTileHatch.getHatchBlockIterator();         
  let allocatedLasers = [];
  let zoneId = 0;
  
  while(hatchblockIt.isValid())
    {
    let hatchBlock = new HATCH.bsHatch();
    hatchBlock = hatchblockIt.get();
    
    hatchBlock.setAttributeInt('zoneIndex',zoneId++);
      
    for(let m = 0; m<laser_count; m++)
      {     
        if(hatchblockIt.isValid())
          {             
            allocatedLasers[m] = hatchBlock.getAttributeInt('laser_index_' + (m+1));
                   
          }         
      }
      
    if (getArraySum(allocatedLasers)>1)
      {            
        hatchBlock.setAttributeInt('sharedZone', 1);        
        
      } else {       
        
        hatchBlock.setAttributeInt('sharedZone', 0);  
        
      }
    hatchblockIt.next();
    }
}  

  defineSharedZones();

// let tempVar = PARAM.getParamInt('tileing', 'TilingMode');

 //allTileHatch.moveDataFrom(allContourHatch); // ADD contour hatches to be divided bewteen lasers!

 if (PARAM.getParamInt('tileing', 'TilingMode') == 0){ // static tiling
   
 allTileHatch = fixedLaserWorkload(allTileHatch,modelData,scanheadArray,tileArray,required_passes_x,nLayerNr);  

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

  simplifiedDataHatch.moveDataFrom(mergedHatch)
}

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// get BSID table:
var bsidTable = thisModel.getAttribEx('customTable');
let tileTable =  thisLayer.getAttribEx('tileTable');  
var tileMap = {};
// fill the passgroup object with all passes -> tiles -> lasers -> hatchblocks
for (let passNumber in passNumberGroups){
    let thisPass = passNumberGroups[passNumber];
    let zoneMap = {
          "uuid": generateUUID(),
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
            'tileID': tileID,
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
    
for (let pass in passNumberGroups){
      
  let thisPass = passNumberGroups[pass];
  let indices = Object.keys(thisPass.tiles);
  
    if(pass % 2 === 0) {

      let startingTile = Math.min(...indices); // from front to back
      thisPass.startx = thisPass.tiles[startingTile].xcoord;
      thisPass.starty = thisPass.tiles[startingTile].ycoord;
      
    } else {
      
      let startingTile = Math.min(...indices); // from front to back // update to get backtofront
      thisPass.startx = thisPass.tiles[startingTile].xcoord;
      thisPass.starty = thisPass.tiles[startingTile].ycoord;
      
    }
}
    
///////////////////////////////////////////
// Prioritize and find the scan duration //
///////////////////////////////////////////
    
// run through the passNumberGroups to prioritize scanning seqence and calculate scanning duration
var processing_order = 0; // global processing order
for (let passNumber in passNumberGroups){
  let pass = passNumberGroups[passNumber].tiles; // access the individual passes
  
  for(let tileNumber in pass){
    
    let tile = pass[tileNumber].laser; // access the individual tiles
    let tileExposureArray = [];
    
    for(let laserId in tile){
      let nlaserId = parseInt(laserId);
      
      if(Number.isInteger(nlaserId)){ // only perfom task if the laserId is an integer
        //process.printInfo("laserid: " + nlaserId);
        let processLaser = tile[nlaserId]; // access whats is designated to each laser

        let thisHatch = processLaser.hatchBlocks; // get the hatchs blocks designated to each laser
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
                    
        // Sort each group array by 'y', then 'priority'
        groupsArray.forEach(function(group) {
          group.sort(function(a, b) {
            var priorityDifference  = a.getAttributeInt('priority') - b.getAttributeInt('priority'); 
            if (priorityDifference  !== 0) {
              return priorityDifference ;
            } else {
              var yDifference = a.getBounds().minY - b.getBounds().minY;
              if(yDifference !== 0){
                return yDifference;
                } else {
                
                let aheight = a.getBounds().maxY-a.getBounds().minY;                      
                let bheight = b.getBounds().maxY-b.getBounds().minY;
                
                let awidth = a.getBounds().maxX-a.getBounds().minX;
                let bwidth = b.getBounds().maxX-b.getBounds().minX;
                
                let aarea =  aheight * awidth;
                let barea =  bheight * bwidth;
                  
                return aarea - barea; // smallest first
                  }
              
              return 
            }
          });
        });
        
        // Flatten groupsArray into a single sorted array one pass - one tile - one laser
        thisHatch = [].concat.apply([], groupsArray);
        
        let thisLaserInTileExposureDuration = new EXPOSURETIME.bsExposureTime(); // duration for this laser scanning in this tile
            
        for (let i=0; i<thisHatch.length;i++){
          let hatchblock = thisHatch[i]; // individual hatchblocks
          hatchblock.setAttributeInt('_processing_order', processing_order++);
          //calculate exposure duration of each hatch block
                          
          let exposureSettings =  {
            'fJumpSpeed' : PARAM.getParamReal('durationSim', 'JumpSpeed'),
            'fMeltSpeed' : hatchblock.getAttributeReal('speed'),
            'fJumpLengthLimit' : PARAM.getParamReal('durationSim', 'JumpLengthLimit'),
            'nJumpDelay' : PARAM.getParamInt('durationSim', 'JumpDelay'),
            'nMinJumpDelay': PARAM.getParamInt('durationSim', 'MinJumpDelay'),
            'nMarkDelay' : PARAM.getParamInt('durationSim', 'MarkDelay'),
            'nPolygonDelay': PARAM.getParamInt('durationSim', 'PolygonDelay'),
            'polygonDelayMode' : PARAM.getParamStr('durationSim', 'PolygonDelayMode'),
          };    
          
          thisLaserInTileExposureDuration.addHatchBlock(hatchblock,exposureSettings);            

        }//for hatch
          
        //store the processing duration for this laser in this tile
        let exposureTimeMicroSeconds = thisLaserInTileExposureDuration.getExposureTimeMicroSeconds();
        passNumberGroups[passNumber].tiles[tileNumber].laser[laserId].laserProcessDuration = exposureTimeMicroSeconds;
        tileExposureArray.push(exposureTimeMicroSeconds);
            
      }//if integer         
  }//for laser
     
  // get exposure duration for laser with the largest workload
  let maxLaserScanningDuration = Math.max(...tileExposureArray);
  let speedy = 0;
   if(PARAM.getParamInt('tileing','ScanningMode') == 0){ // moveandshoot
         speedy = PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms');
    } else { //onthefly
      let tileSize = PARAM.getParamReal('otf','tile_size');

      let speedLimit = PARAM.getParamReal('otf','axis_max_speed');
      
      if (maxLaserScanningDuration > 0) {
  //      process.printInfo('speedy: ' + tileSize / (exposureTime/(1000*1000)));
         speedy = tileSize / (maxLaserScanningDuration/(1000*1000));
      }else{
        speedy = speedLimit;
        }           
    }
  passNumberGroups[passNumber].tiles[tileNumber].speedy = speedy;  
    
}//for tile
  
  var passDuration = 0;
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

let emm =0;
for (let passNr in passNumberGroups){
    let thispass = passNumberGroups[passNr];
 //   process.printInfo('pass: ' + passNr);
    exporter_3mf.content[passNr] = {
           "name": "sequence",
           "namespace": "http://adira.com/tilinginformation/202305",
	         "attributes": {
		          "uuid": thispass.uuid,
		          "startx": thispass.startx,
		          "starty": thispass.starty,
		          "sequencetransferspeed": thispass.sequencetransferspeed,
		          "type": thispass.type,
              "requiredPasses": thispass.requiredPasses,
              "tilesInPass": thispass.tilesInPass,
              "layerScanningDuration":passNumberGroups.layerExposureDuration            
	          },
	          "children": thistiletable[passNr]
        };
  
    for (let tileNr in thispass.tiles){
    //  process.printInfo(tileNr);
       let tile =  thispass.tiles[tileNr];
       exporter_3mf.content[passNr].children[tileNr] = {
         "name": "movement",
                    "attributes": {
                      "tileID":  tile.tileID+1,
                      "targetx": tile.xcoord,
                      "targety": tile.ycoord,
                      "speedx":  tile.speedx,
                      "speedy":  tile.speedy,
                      "tileExposureTime": tile.tileExposureDuration
                    }			
         };   
    } 
} 


thisLayer.setAttribEx('exporter_3mf', exporter_3mf);

hatchResult.moveDataFrom(simplifiedDataHatch); // move hatches to result 

}; // makeExposureLayer

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 /////////////////////////
  /// Custom Functions /// 
  ////////////////////////


// return the sum of the array
function getArraySum(arr) {
	let sum = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i]) {
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
function ClipHatchByRect(hatchObj, arr_2dVec, bKeepInside) {
  if (typeof bKeepInside === 'undefined') bKeepInside = true;
	let clippedHatch = new HATCH.bsHatch();
	let tiles_pathset = new PATH_SET.bsPathSet(); // generate pathset object
	tiles_pathset.addNewPath(arr_2dVec); // add tiles zones to pathset  
	tiles_pathset.setClosed(true); // set the zones to closed polygons
	let tile_clipping_island = new ISLAND.bsIsland(); // generate island object
	tile_clipping_island.addPathSet(tiles_pathset); // add pathset as new island
	
	clippedHatch = hatchObj.clone(); // clone overall hatching
	clippedHatch.clip(tile_clipping_island, bKeepInside); // clip the hatching with the tile_islands
	
	return clippedHatch;
}

// // smart tileing
function smartLaserWorkload(hatchObj, modelData, scanheadArray, tileArray, required_passes_x, required_passes_y, nLayerNr, vec2_tile_array, tileSegmentArr) {

 	let curHatch = new HATCH.bsHatch();
 	curHatch.moveDataFrom(hatchObj);
 
 	let hatchIt = curHatch.getHatchBlockIterator();
 	let activeLasers = new Array();
	let zoneWorkload = new Array();
 	var clipArray = new Array();
 	let clipIt = 0;
	while (hatchIt.isValid()) {
		let thisHatch = new HATCH.bsHatch();
		thisHatch = hatchIt.get();

		let zoneIndex = thisHatch.getAttributeInt('zoneIndex');
		//let thisWorkload = thisHatch.getAttributeReal('zoneExposure');
		let thisSharedZone = thisHatch.getAttributeInt('sharedZone');
		//var laserCount = PARAM.getParamInt('exposure', 'laser_count');

		if (thisSharedZone > 0) {
			for (let curLaserId = 0; curLaserId < laser_count; curLaserId++) {
				activeLasers[curLaserId] = thisHatch.getAttributeInt('laser_index_' + (curLaserId + 1));

			}

			// subdivide each sharedzone into smaller zones to allow smart sorting
			let zoneBounds = new BOUNDS.bsBounds2D();
			zoneBounds = thisHatch.getBounds2D();

			let zoneMinY = zoneBounds.m_min.y;
			let zoneMaxY = zoneBounds.m_max.y;

			let zoneLengthX = zoneBounds.m_max.x - zoneBounds.m_min.x;
			let subdivsizeX = 50;
			let subdivcount = Math.ceil(zoneLengthX / subdivsizeX);
			let subdivHatch = new HATCH.bsHatch();



			for (let subdivIt = 0; subdivIt < subdivcount; subdivIt++) {
				if (subdivIt == subdivcount - 1) {
					let subdivMinX = zoneBounds.m_min.x + subdivIt * subdivsizeX;
					let subdivMaxX = zoneBounds.m_max.x;

				} else {
					let subdivMinX = zoneBounds.m_min.x + subdivIt * subdivsizeX;
					let subdivMaxX = subdivMinX + subdivsizeX;

				}

				//          let subdivMinX = zoneBounds.m_min.x + subdivIt*subdivsizeX;
				//          let subdivMaxX = subdivMinX + subdivsizeX;          

				let subdivPoints = new Array();
				subdivPoints[0] = new VEC2.Vec2(subdivMinX, zoneMinY); //min,min
				subdivPoints[1] = new VEC2.Vec2(subdivMinX, zoneMaxY); //min,max
				subdivPoints[2] = new VEC2.Vec2(subdivMaxX, zoneMaxY); //max,max
				subdivPoints[3] = new VEC2.Vec2(subdivMaxX, zoneMinY); //max,min

				clipArray[clipIt++] = subdivPoints;
			}
		}
		hatchIt.next();
 	}

 	// Clip hatches by clipArray subdivide to subhatch
 	for (let i = 0; i < clipArray.length; i++) {

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

		clipHatch.clip(clippingiIsland, true); // clip the hatching with the tile_islands
		clipHatchOutside.clip(clippingiIsland, false); // get ouside of currentzone

		curHatch.moveDataFrom(clipHatch);
		curHatch.moveDataFrom(clipHatchOutside);
 	}
 
 	// add exposure for all zones
 	let hatchIt2 = curHatch.getHatchBlockIterator();
 	while (hatchIt2.isValid()) {
		let thisHatch = new HATCH.bsHatch();
		thisHatch = hatchIt2.get();

		let thisExposureDuration = new EXPOSURETIME.bsExposureTime();
		thisExposureDuration.configure(modelData.getTrayAttribEx('exposureSettings'));
		thisExposureDuration.addHatchBlock(thisHatch);
		thisHatch.setAttributeInt('zoneExposure', thisExposureDuration.getExposureTimeMicroSeconds());

		hatchIt2.next();
	}

 	// createZoneObjects  
	function setLaserObjects(laserId) {
		this.id = laserId;
		this.workload = 0;
	}
 
	var lasers = new Array();
	for (let i = 0; i < laserCount; i++) {
		lasers[i] = new setLaserObjects(i);
	}

 	function setZoneProperties(hatchBlock, iterator) {
		this.hatch = hatchBlock;
		this.zoneDuration = hatchBlock.getAttributeInt('zoneExposure');
		this.passNumber = hatchBlock.getAttributeInt('passNumber');
		this.zoneID = iterator;
		hatchBlock.setAttributeInt('zoneIndex', iterator);
		let lasersInReach = new Array;

		for (let i = 0; i < laserCount; i++) {

			let laserID = hatchBlock.getAttributeInt('laser_index_' + (i + 1));

			if (laserID > 0) {
				lasersInReach.push(i);
			}
		}

		this.reachableBy = lasersInReach;
		this.bsid = null;
 	}
 
 //	var laser_color = new Array();
 //	laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 
  var laser_color = thisModel.getTrayAttribEx('laser_color'); // retrive laser_color 
 	//run trough each scanzone looking at the entire width
 
 	let smartHatch = new HATCH.bsHatch();
 
 	for (let tileIt = 0; tileIt < required_passes_y; tileIt++) // clip into fullwidth tiles
 	{
 
		let tile_x_min = tileArray[tileIt * required_passes_x].scanhead_outline[0].m_coord[0];
		let tile_y_min = tileArray[tileIt * required_passes_x].scanhead_outline[0].m_coord[1];

		// get max coordinates for full width tile
		let tile_x_max = tileArray[(tileIt + 1) * required_passes_x - 1].scanhead_outline[2].m_coord[0];
		let tile_y_max = tileArray[(tileIt + 1) * required_passes_x - 1].scanhead_outline[2].m_coord[1];

		let fullWidthClip = new Array();
		fullWidthClip[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
		fullWidthClip[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
		fullWidthClip[2] = new VEC2.Vec2(tile_x_max, tile_y_max); //max,max
		fullWidthClip[3] = new VEC2.Vec2(tile_x_max, tile_y_min); //max,min

		let hatchBlockArr = new HATCH.bsHatch();
		let clippedHatch = ClipHatchByRect(curHatch, fullWidthClip);
// 
		// sort hatchblocks
		var args = {
			sSegRegionFillingMode: "PositiveX",
			bInvertFillingSequence: false,
			fSegRegionFillingGridSize: 0.0,
			sSetAssignedRegionIndexMemberName: "regionIndex"
		};

		clippedHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr, 0, args);
		hatchBlockArr = clippedHatch.getHatchBlockArray();

		var smartZones = new Array();
		for (let i = 0; i < hatchBlockArr.length; i++) {
			smartZones[i] = new setZoneProperties(hatchBlockArr[i], i);
		}

 		// Sort zones by zoneDuration in descending order within each fulltile
 		smartZones.sort(function(a, b) {
      return b.zoneDuration - a.zoneDuration;
    });
  }

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

		let passZones = new Array();
		// iterate through and divdie workload within each pass
		for (let passNumber = 0; passNumber < required_passes_x; passNumber++) {
			passZones = passGroups[passNumber];
			if (!passZones) {continue}; // if no zones for this passNumber, skip to the next passNumber
			let temp = 1;
    
       
 			for (let x = 0; x < passZones.length; x++) {
				let curZone = passZones[x];

				// If a laser has already been assigned to this zone, skip to the next zone
				if (curZone.bsid) continue;

				// what lasers are capable of reaching the current zone  
				var capableLasers = curZone.reachableBy.map(function(id) {
          return lasers.find(function(laser) {
            return laser.id === id;
          });
        });


				let minWorkloadLaser;
				let minWorkload = Infinity;
				let lastTaskZone = null;

				for (let j = 0; j < capableLasers.length; j++) { // rund through capabale lasers
					let laser = capableLasers[j];

					// if the workload of the laser is less than current minWorkload
					// or if the laser's last task was the immediate neighbour of the current zone (i.e., curZone),
					// update the minWorkload and minWorkloadLaser
					if (laser.workload < minWorkload || (laser.lastTask && laser.lastTask.id === curZone.id - 1)) {
						minWorkload = laser.workload;
						minWorkloadLaser = laser;
						lastTaskZone = laser.lastTask;
					} //if
				} //for


				minWorkloadLaser.workload += curZone.zoneDuration;
				minWorkloadLaser.lastTask = curZone; // Update the last task of this laser  

				// set 

				curZone.bsid = (minWorkloadLaser.id + 1) * 10; // Assign bsid to the task based on the assigned laser's id        
				curZone.hatch.setAttributeInt('bsid', curZone.bsid);
				curZone.hatch.setAttributeInt('_disp_color', laser_color[minWorkloadLaser.id]);

 			

			// get the tile duration, by finding the longest required for most worked laser 
			// After assigning all tasks, find the laser with max duration
			let laserWithMaxDuration = lasers[0];
			for (let i = 1; i < lasers.length; i++) {
				if (lasers[i].workload > laserWithMaxDuration.workload) {
					laserWithMaxDuration = lasers[i];
				}
			}

			let maxLaserDuration = laserWithMaxDuration.workload;


			for (let i = 0; i < passZones.length; i++) {
				let curZone = passZones[i];
				curZone.hatch.setAttributeInt('tileDuration', maxLaserDuration);
				smartHatch.addHatchBlock(curZone.hatch);
			}
    } //for
  }
       
	hatchObj.moveDataFrom(smartHatch);
	return hatchObj;
 } // smartTileing

// function statically distributing the lasing zone <- not smart !
function fixedLaserWorkload(hatchObj,modelData,scanheadArray,tileArray,required_passes_x,nLayerNr){
  let thisModel = modelData.getModel(0);
  let curHatch = new HATCH.bsHatch(); 
  curHatch.moveDataFrom(hatchObj);
  
  let scanheadZones = new Array();
  scanheadZones = modelData.getTrayAttribEx('scanhead_zones');
  
  //get divison of scanfields in x!
  let xDiv = new Array();
  
  // get shifting parameters 
  function calculateShiftX(layerNr) {
    let layerCount = PARAM.getParamInt('tileing', 'number_x');
    let shiftIncrement =  PARAM.getParamReal('tileing', 'step_x');
    let resetLayer = layerCount - 1;

    let cyclePosition = layerNr % (layerCount * (resetLayer + 1));
    let layerWithinCycle = cyclePosition % layerCount;
    let shiftValue = (layerWithinCycle * shiftIncrement) - ((layerCount / 2) * shiftIncrement);

    return shiftValue;
  }
  
    function calculateShiftY(layerNr) {
    let layerCount = PARAM.getParamInt('tileing', 'number_y');
    let shiftIncrement =  PARAM.getParamReal('tileing', 'step_y');
    let resetLayer = layerCount - 1;

    let cyclePosition = layerNr % (layerCount * (resetLayer + 1));
    let layerWithinCycle = cyclePosition % layerCount;
    let shiftValue = (layerWithinCycle * shiftIncrement) - ((layerCount / 2) * shiftIncrement);

    return shiftValue;
  }
  
  let shiftX = calculateShiftX(nLayerNr);
  let shiftY = calculateShiftY(nLayerNr);

  for (let i = 0; i<scanheadArray.length+1;i++)
    {
      if (i==0) { // if first elements 
        xDiv[i] = scanheadArray[i].abs_x_min;
      }else if (i == scanheadArray.length) { // if arraylength is reached
            xDiv[i] = scanheadArray[i-1].abs_x_max;
      } else {      
      xDiv[i] = (scanheadArray[i-1].x_ref + scanheadArray[i].x_ref)/2 + shiftX;
        } //if else       
    } // for
    
    // get clipping coordinates for entire scene
    let XClipPos = new Array(); 
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
    let laser_color = thisModel.getAttribEx('laser_color'); // retrive laser_color 
    
    //let blockingGeometry = 
    
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
     
     //let tileHatch = new HATCH.bsHatch();
     let tileHatch = ClipHatchByRect(curHatch,clipPoints);
     let outsideHatch = ClipHatchByRect(curHatch,clipPoints,false);
     curHatch.makeEmpty();
     curHatch.moveDataFrom(outsideHatch);
     
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
     if (laserIndex>laser_count-1)
     {
       laserIndex=0;
     }
     
      hatchObj.moveDataFrom(tileHatch);
   }
    
   
   return hatchObj;
  } 
  
  
function mergeBlocks(unmergedHatchBlocks) {
	let mergeblock = new HATCH.bsHatch();
	let mergedblock = new HATCH.bsHatch();
	mergeblock.moveDataFrom(unmergedHatchBlocks);


	// merge similar hatch blocks to speed up process
	let mergeArgs = {
		'bConvertToHatchMode': true,
		//'nConvertToHatchMaxPointCount': 2,
		//'nMaxBlockSize': 1024,
		'bCheckAttributes': true
	};

	mergedblock = mergeblock.mergeHatchBlocks(mergeArgs);

	let blockcount = mergedblock.getHatchBlockCount();
	//process.printInfo(blockcount);
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
  var buildTimeEstimate = 0;
 // process.printInfo("postprocess model count: " + modelData.getModelCount());
  let model = modelData.getModel(0);

  var layerThickness = model.getLayerThickness();
  for(let layer_nr = layer_start_nr; layer_nr <= layer_end_nr; ++layer_nr)
  {
    progress.step(1);
     
    let modelLayer = model.getModelLayerByNr(layer_nr);
    
    let exporter_3mf = modelLayer.getAttribEx('exporter_3mf');
   
   
    let totalMoveDuration=0;
    // calculate distance travelled single
    for (let i = 0; i < exporter_3mf.content.length;i++){
      
    
    let requiredPasses = exporter_3mf.content[i].attributes.requiredPasses;
    let tilesInPass = exporter_3mf.content[i].attributes.tilesInPass;
    let startx = exporter_3mf.content[i].attributes.startx;
    let starty = exporter_3mf.content[i].attributes.starty;
    let transferSpeed = exporter_3mf.content[i].attributes.sequencetransferspeed;
    
      
      
      let movementSpeed = transferSpeed;
      
      for (let j = 0; j< tilesInPass;j++){
        
        let targetx = exporter_3mf.content[i].children[j].attributes.targetx;
        let targety = exporter_3mf.content[i].children[j].attributes.targety;

        let a = startx-targetx;
        let b = starty-targety;
        let c = Math.sqrt(a*a+b*b);
        
        startx = targetx;
        starty = targety;
        
        var moveDuration = c/transferSpeed;
        totalMoveDuration += moveDuration;   
      
        movementSpeed = exporter_3mf.content[i].children[j].attributes.speedy;
    
        }
      }
    
    
    let recoatingDuration = PARAM.getParamInt('movementSettings','recoating_time_ms');
    let thisLayerDuration = exporter_3mf.content[0].attributes.layerScanningDuration; 
    
    buildTimeEstimate += thisLayerDuration+recoatingDuration+totalMoveDuration;
    
    let islandIT = modelLayer.getFirstIsland();
    
    while(islandIT.isValid())
    {
      let thisIland = islandIT.getIsland();
      surfaceAreaTotal += thisIland.getSurfaceArea();
      islandIT.next();
    }
    
    // get model data polylinearray
//     var exposure_array = modelData.getLayerPolylineArray(layer_nr, POLY_IT.nLayerExposure, 'rw');
//     
//     
//      // Sort array by bounding box in Y direction 
//       // and assign processing order
//       exposure_array.sort(function(a,b){   
//         return a.getBounds().minY - b.getBounds().minY
//       });   
//    
//       
//       //sort into different scan
//       
//       for(var i=0; i < exposure_array.length; ++i){         
//         exposure_array[i].setAttributeInt('_processing_order', i);
//       }   
    
    
  } //for (iterate through layers)
  
      
  var totalPartMass = surfaceAreaTotal*layerThickness*model.getAttrib('density')/(1000*1000*1000);
  var totalPackedPowder = layer_end_nr * layerThickness * PARAM.getParamInt('workarea','x_workarea_max_mm') * PARAM.getParamInt('workarea','y_workarea_max_mm')*model.getAttrib('density') / (1000*1000*1000);
  
 // let modeldataSkywriting = modelData.getTrayAttribEx('skywriting');
  
//   modelData.setTrayAttrib('totalPartMass',totalPartMass.toString());
//   modelData.setTrayAttrib('totalPackedPowder',totalPackedPowder.toString());

//      // generate data for 3mf exporter
//     if (PARAM.getParamInt('tileing','ScanningMode') == 0){
//       var type = 'moveandshoot'
//       } else {
//       var type = 'onthefly'
//     };

  var isoDateString = new Date().toISOString();

  let customJSON = {
    
    "namespaces": [
      {
        "schema": "http://schemas.scanlab.com/skywriting/2023/01",
        "prefix": "skywriting"
      },      
      {
        "schema": "http://adira.com/addcreator/202305",
        "prefix": "adira"
      },
      {
        "schema": "http://adira.com/tilinginformation/202305",
        "prefix": "tiling"
      }    
    ],
      
    toolpathdata: [
      {
        "name": "statistics",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "build_time": buildTimeEstimate,
          "total_mass": totalPartMass,
          "total_packed_powder": totalPackedPowder                
        }        
      },
      
      {
        "name": "generation",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "created_at": isoDateString,
          "created_by": "engineer"
        }        
      },

      {
        "name": "material",
        "schema": "http://adira.com/addcreator/202305",
        attributes: {
          "layerthickness": layerThickness,
          "identifier": model.getMaterialID(),
          "density": parseFloat(model.getAttrib('density')),
          "gas": model.getAttrib('gas')          
        }        
      },
      
      {
        "name": "process",
        "schema": "http://adira.com/addcreator/202305",
        "children": [
          {
            "name": "recoating",
            attributes: {
              "speed": PARAM.getParamInt('movementSettings','recoating_speed_mms')
            }        
          
          }
        ]
                
      }

    ]};
    
    //"type": PARAM.getParamStr('tileing','ScanningMode'),
      
   modelData.setTrayAttribEx('custom', customJSON);
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
