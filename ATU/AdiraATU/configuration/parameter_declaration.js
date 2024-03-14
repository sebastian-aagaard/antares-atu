/************************************************************
 * Parameter Declaration
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //

var PARAM = requireBuiltin('bsParam');
var BUILD = requireBuiltin('bsBuildParam');
var LOCALIZER = require('localization/localizer.js');

// -------- CODE -------- //


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

  parameter.declareParameterGroup('strategy',LOCALIZER.GetMessage('grp_strategy'));
    parameter.declareParameterReal('strategy','fStripeWidth',LOCALIZER.GetMessage('param_fStripeWidth'),0.0,100.0,10.0);
    parameter.declareParameterReal('strategy','fMinWidth',LOCALIZER.GetMessage('param_fMinWidth'),0.0,100.0,2.0);
    parameter.declareParameterReal('strategy','fStripeOverlap',LOCALIZER.GetMessage('param_fStripeOverlap'),-10.0,10.0,-0.03);
    parameter.declareParameterReal('strategy','fStripeLength',LOCALIZER.GetMessage('param_fStripeLength'),0,100.0,0);
    parameter.declareParameterReal('strategy','fPatternShift',LOCALIZER.GetMessage('param_fPatternShift'),0,10.0,1.67);
  
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
    
  // -------- SCANNING PARAMETERS -------- //
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
    
  // -------- PROCESS DURATION SIMULATION SETTINGS -------- //  
  parameter.declareParameterGroup('durationSim', LOCALIZER.GetMessage('grp_durationSim'));
    parameter.declareParameterReal('durationSim', 'JumpSpeed', LOCALIZER.GetMessage('param_JumpSpeed'), 0.001, 2000, 1000);
    parameter.declareParameterInt('durationSim', 'laserOnDelay', LOCALIZER.GetMessage('param_laserOnDelay'), 0, 2000, 2);
    parameter.declareParameterInt('durationSim', 'laserOffDelay', LOCALIZER.GetMessage('param_laserOffDelay'), 0, 2000, 10);
    //parameter.declareParameterReal('durationSim', 'MeltSpeed', LOCALIZER.GetMessage('param_MeltSpeed'), 0.001, 2000, 200);
    parameter.declareParameterReal('durationSim', 'JumpLengthLimit', LOCALIZER.GetMessage('param_JumpLengthLimit'), 0.000, 1000, 0);//0.1
    parameter.declareParameterInt('durationSim', 'JumpDelay', LOCALIZER.GetMessage('param_JumpDelay'), 0, 100, 50);
    parameter.declareParameterInt('durationSim', 'MinJumpDelay', LOCALIZER.GetMessage('param_MinJumpDelay'), 0, 50, 50); //30
    parameter.declareParameterInt('durationSim', 'MarkDelay', LOCALIZER.GetMessage('param_MarkDelay'), 0, 100, 60);
    parameter.declareParameterInt('durationSim', 'PolygonDelay', LOCALIZER.GetMessage('param_PolygonDelay'), 0, 100, 65);
    parameter.declareParameterChoice('durationSim', 'PolygonDelayMode', 
       LOCALIZER.GetMessage('param_PolygonDelayMode'),
        [LOCALIZER.GetMessage('param_PolygonDelayMode_Variable'),
        LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')],
        LOCALIZER.GetMessage('param_PolygonDelayMode_Fixed')
        );
   
  // -------- WORK AREA -------- //
  parameter.declareParameterGroup('workarea',LOCALIZER.GetMessage('grp_workarea'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('workarea', 'x_workarea_min_mm',LOCALIZER.GetMessage('param_x_workarea_min_mm'),0,1010,0);
    parameter.declareParameterInt('workarea', 'x_workarea_max_mm',LOCALIZER.GetMessage('param_x_workarea_max_mm'),0,1010,1000);
    parameter.declareParameterInt('workarea', 'y_workarea_min_mm',LOCALIZER.GetMessage('param_y_workarea_min_mm'),0,1010,0);
    parameter.declareParameterInt('workarea', 'y_workarea_max_mm',LOCALIZER.GetMessage('param_y_workarea_max_mm'),0,1010,995);
    
  // -------- MOVEMENT SETTINGS -------- //  
  parameter.declareParameterGroup('movementSettings',LOCALIZER.GetMessage('grp_movementSettings'),'Movement Settings',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('movementSettings', 'recoating_time_ms',LOCALIZER.GetMessage('param_recoating_time'),0,100000,26000);
    parameter.declareParameterInt('movementSettings', 'sequencetransfer_speed_mms',LOCALIZER.GetMessage('param_sequencetransfer_speed_mms'),0,1000,120);
    parameter.declareParameterInt('movementSettings', 'recoating_speed_mms',LOCALIZER.GetMessage('param_recoating_speed_mms'),0,1000,120);
    parameter.declareParameterReal('movementSettings', 'head_startpos_x',LOCALIZER.GetMessage('param_head_startpos_x'),0.0,1000.0,0.0);
    parameter.declareParameterReal('movementSettings', 'head_startpos_y',LOCALIZER.GetMessage('param_head_startpos_y'),-500.0,1000.0,0.0);

  

  // -------- SCANNER HEAD -------- //
  parameter.declareParameterGroup('scanhead',LOCALIZER.GetMessage('grp_scanhead'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
       
    parameter.declareParameterReal('scanhead', 'tile_overlap_x',LOCALIZER.GetMessage('param_tile_overlap_x'),-100,100,-0.1); //-5
    parameter.declareParameterReal('scanhead', 'tile_overlap_y',LOCALIZER.GetMessage('param_tile_overlap_y'),-100,100,-0.1); //-5
    
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
    parameter.declareParameterReal('scanhead', 'x_scanner4_ref_mm',LOCALIZER.GetMessage('param_x_scanner4_ref_mm'),0,390,295);

    parameter.declareParameterReal('scanhead', 'x_scanner5_max_mm',LOCALIZER.GetMessage('param_x_scanner5_max_mm'),0,100,50);
    parameter.declareParameterReal('scanhead', 'x_scanner5_min_mm',LOCALIZER.GetMessage('param_x_scanner5_min_mm'),-100,0,-80);
    parameter.declareParameterReal('scanhead', 'x_scanner5_ref_mm',LOCALIZER.GetMessage('param_x_scanner5_ref_mm'),0,390,380);    
    
    parameter.declareParameterReal('scanhead', 'x_scanner_actual_allowed_reach',LOCALIZER.GetMessage('param_x_scanner_actual_allowed_reach'),0,200,200);
    parameter.declareParameterReal('scanhead', 'y_scanner_actual_allowed_reach',LOCALIZER.GetMessage('param_y_scanner_actual_allowed_reach'),0,200,200);
    
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
      LOCALIZER.GetMessage('param_ScanningMode_OnTheFly')
      );
 
    parameter.declareParameterReal('tileing','step_x', LOCALIZER.GetMessage('param_step_x'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_x', LOCALIZER.GetMessage('param_number_x'),0,10,7);
    parameter.declareParameterReal('tileing','step_y', LOCALIZER.GetMessage('param_step_y'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_y', LOCALIZER.GetMessage('param_number_y'),0,10,7); 
  

  parameter.declareParameterGroup('scanning_priority', LOCALIZER.GetMessage('grp_scanning_priority'));
    parameter.declareParameterInt('scanning_priority','part_hatch_priority', LOCALIZER.GetMessage('param_part_hatch_priority'),0,2000,100);
    parameter.declareParameterInt('scanning_priority','downskin_hatch_priority', LOCALIZER.GetMessage('param_downskin_hatch_priority'),0,2000,200);
    parameter.declareParameterInt('scanning_priority','support_hatch_priority', LOCALIZER.GetMessage('param_support_hatch_priority'),0,2000,300);
    parameter.declareParameterInt('scanning_priority','part_contour_priority', LOCALIZER.GetMessage('param_part_contour_priority'),0,2000,400);
    parameter.declareParameterInt('scanning_priority','downskin_contour_priority', LOCALIZER.GetMessage('param_downskin_contour_priority'),0,2000,500);
    parameter.declareParameterInt('scanning_priority','support_contour_priority', LOCALIZER.GetMessage('param_support_contour_priority'),0,2000,600);
    parameter.declareParameterInt('scanning_priority','openPolyline_priority', LOCALIZER.GetMessage('param_openPolyline_priority'),0,2000,700);

  
}