/************************************************************
 * Parameter Declaration
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //

//const PARAM = requireBuiltin('bsParam');
const BUILD = requireBuiltin('bsBuildParam');
const LOCALIZER = require('localization/localizer.js');

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
  
  // declare hatch parameter groups (volume/downskin)
  // later on parameters are declared within these groups
  // Parameter groups are always declared like this:
  // 'group-id', 'display string'

  parameter.declareParameterGroup('strategy',LOCALIZER.GetMessage('grp_strategy'),'Hatch Strategy',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('strategy','fStripeWidth',LOCALIZER.GetMessage('param_fStripeWidth'),0.0,100.0,10.0);
    parameter.declareParameterReal('strategy','fMinWidth',LOCALIZER.GetMessage('param_fMinWidth'),0.0,100.0,2.0);
    parameter.declareParameterReal('strategy','fStripeOverlap',LOCALIZER.GetMessage('param_fStripeOverlap'),-10.0,10.0,-0.03);
    parameter.declareParameterReal('strategy','fStripeLength',LOCALIZER.GetMessage('param_fStripeLength'),0,100.0,0);
    parameter.declareParameterReal('strategy','fPatternShift',LOCALIZER.GetMessage('param_fPatternShift'),0,10.0,1.67);
    parameter.declareParameterReal('strategy','fAngleLimit_1a',LOCALIZER.GetMessage('param_fAngleLimit_1a'),0,360.0,210.0);
    parameter.declareParameterReal('strategy','fAngleLimit_1b',LOCALIZER.GetMessage('param_fAngleLimit_1b'),0,360.0,250.0);
    parameter.declareParameterReal('strategy','fAngleLimit_2a',LOCALIZER.GetMessage('param_fAngleLimit_2a'),0,360.0,300.0);
    parameter.declareParameterReal('strategy','fAngleLimit_2b',LOCALIZER.GetMessage('param_fAngleLimit_2b'),0,360.0,340.0);
    parameter.declareParameterReal('strategy','fSeachIncrements',LOCALIZER.GetMessage('param_fSeachIncrements'),0,360.0,40.0);

    parameter.declareParameterChoice('strategy','bShiftLimitRange',LOCALIZER.GetMessage('param_bShiftLimitRange'), 
      [LOCALIZER.GetMessage('param_bShiftLimitRange_disable'),
       LOCALIZER.GetMessage('param_bShiftLimitRange_enable')],
       LOCALIZER.GetMessage('param_bShiftLimitRange_enable'));

  
 parameter.declareParameterGroup('border', LOCALIZER.GetMessage('grp_border')); 
    parameter.declareParameterReal('border', 'fBeamCompensation', LOCALIZER.GetMessage('param_beam_compensation'), 0.0, 10.0, 0.05);
    parameter.declareParameterInt('border', 'nNumberOfBorders', LOCALIZER.GetMessage('param_number_of_borders'), 0, 10, 1);
    parameter.declareParameterReal('border', 'fDistanceBetweenBorders', LOCALIZER.GetMessage('param_boarder_offset'), 0.0, 10.0, 0.05);
    parameter.declareParameterReal('border', 'fDistanceBorderToHatch', LOCALIZER.GetMessage('param_distance_border_to_hatch'), -50.0, 50.0, 0.05);

    parameter.declareParameterChoice('border', 'bBorderOrderOutsideIn', LOCALIZER.GetMessage('param_border_order_outside_in'),
       [LOCALIZER.GetMessage('param_border_order_outside_in_disable'),
       LOCALIZER.GetMessage('param_border_order_outside_in_enable')],
       LOCALIZER.GetMessage('param_border_order_outside_in_enable'));
   
 parameter.declareParameterGroup('display', LOCALIZER.GetMessage('grp_display'),"Decide what color scheme is used to preview the vectors",BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
      parameter.declareParameterChoice('display', 'displayColors', LOCALIZER.GetMessage('param_displayColors'),
       [LOCALIZER.GetMessage('param_displayColors_lasers'),
       LOCALIZER.GetMessage('param_displayColors_types'),
       LOCALIZER.GetMessage('param_displayColors_both')],
       LOCALIZER.GetMessage('param_displayColors_lasers'));
    parameter.declareParameterChoice('display', 'displayTileGridATU', LOCALIZER.GetMessage('param_displayTileGridATU'),
       [LOCALIZER.GetMessage('param_disableTileGrid'),
       LOCALIZER.GetMessage('param_enableTileGrid')],
       LOCALIZER.GetMessage('param_enableTileGrid'));  
   
 parameter.declareParameterGroup('interface', LOCALIZER.GetMessage('grp_interface'));
 
    parameter.declareParameterReal('interface', 'interfaceOverlap', LOCALIZER.GetMessage('param_interfaceOverlap'), -10.0, 10.0, 0.1);

    parameter.declareParameterChoice('interface', 'tileInterfaceHatch', LOCALIZER.GetMessage('param_tileInterfaceHatch'),
     [LOCALIZER.GetMessage('param_tileIntefrace_overlap'),
     LOCALIZER.GetMessage('param_tileIntefrace_zipper'),
     LOCALIZER.GetMessage('param_tileIntefrace_seamless')],
     LOCALIZER.GetMessage('param_tileIntefrace_zipper'));
         
    parameter.declareParameterChoice('interface', 'laserInterfaceHatch', LOCALIZER.GetMessage('param_laserInterfaceHatch'),
      [LOCALIZER.GetMessage('param_laserIntefrace_overlap'),
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'),
      LOCALIZER.GetMessage('param_laserIntefrace_seamless')],
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'));
      
    parameter.declareParameterReal('interface', 'distanceBewteenInterfaceHatchVectors', LOCALIZER.GetMessage('param_distanceBewteenInterfaceHatchVectors'), 0, 10.0, 0);
    
    parameter.declareParameterChoice('interface', 'tileInterfaceContour', LOCALIZER.GetMessage('param_tileInterfaceContour'),
      [LOCALIZER.GetMessage('param_tileIntefrace_overlap'),
      LOCALIZER.GetMessage('param_tileIntefrace_zipper'),
      LOCALIZER.GetMessage('param_tileIntefrace_seamless')],
      LOCALIZER.GetMessage('param_tileIntefrace_zipper'));
       
    parameter.declareParameterChoice('interface', 'laserInterfaceContour', LOCALIZER.GetMessage('param_laserInterfaceContour'),
      [LOCALIZER.GetMessage('param_laserIntefrace_overlap'),
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'),
      LOCALIZER.GetMessage('param_laserIntefrace_seamless')],
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'));

    parameter.declareParameterReal('interface', 'distanceBewteenInterfaceContourVectors', LOCALIZER.GetMessage('param_distanceBewteenInterfaceContourVectors'), 0.0, 10.0, 0);
    
    parameter.declareParameterChoice('interface', 'tileInterfaceOpenPolyLine', LOCALIZER.GetMessage('param_tileInterfaceOpenPolyLine'),
     [LOCALIZER.GetMessage('param_tileIntefrace_overlap'),
     LOCALIZER.GetMessage('param_tileIntefrace_zipper'),
     LOCALIZER.GetMessage('param_tileIntefrace_seamless')],
     LOCALIZER.GetMessage('param_tileIntefrace_zipper'));
     
    parameter.declareParameterChoice('interface', 'laserInterfaceOpenPolyLine', LOCALIZER.GetMessage('param_laserInterfaceOpenPolyLine'),
      [LOCALIZER.GetMessage('param_laserIntefrace_overlap'),
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'),
      LOCALIZER.GetMessage('param_laserIntefrace_seamless')],
      LOCALIZER.GetMessage('param_laserIntefrace_zipper'));

    parameter.declareParameterReal('interface', 'distanceBewteenOpenPolyLineInterfaceVectors', LOCALIZER.GetMessage('param_distanceBewteenOpenPolyLineInterfaceVectors'), 0, 10.0, 0);  
  
  parameter.declareParameterGroup('stripeOverlapAllocation', LOCALIZER.GetMessage('grp_stripeOverlapAllocation'),'shift the allocation line for stripes',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('stripeOverlapAllocation', 'firstOverlapShift', LOCALIZER.GetMessage('param_firstOverlapShift'), -430.0, 430.0, 0.0);
    parameter.declareParameterReal('stripeOverlapAllocation', 'secondOverlapShift', LOCALIZER.GetMessage('param_secondOverlapShift'), -430.0, 430.0, 0.0);

  parameter.declareParameterGroup('laserAllocation', LOCALIZER.GetMessage('grp_laserAllocation'));
    parameter.declareParameterInt('laserAllocation', 'laserAssignedToModel', LOCALIZER.GetMessage('param_laserAssignedToModel'), 0, 5, 0);
  
 parameter.declareParameterGroup('shortVectorHandling', LOCALIZER.GetMessage('grp_shortVectorHandling'),'Options for short vectors',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('shortVectorHandling', 'min_vector_lenght', LOCALIZER.GetMessage('param_min_vector_length'), 0.0, 10.0, 0.1);
    parameter.declareParameterReal('shortVectorHandling', 'vector_lenght_merge_attempt', LOCALIZER.GetMessage('param_vector_lenght_merge_attempt'), 0.0, 10.0, 0.1);
    parameter.declareParameterReal('shortVectorHandling', 'small_vector_merge_distance', LOCALIZER.GetMessage('param_small_vector_merge_distance'), 0.0, 10.0, 0.1);     
   
  parameter.declareParameterGroup('exposure', LOCALIZER.GetMessage('grp_exposure'));
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
    parameter.declareParameterReal('downskin', 'down_skin_surface_angle', LOCALIZER.GetMessage('param_down_skin_surface_angle'), 0.0, 89.0, 60.0);
    parameter.declareParameterInt('downskin', 'down_skin_layer_reference', LOCALIZER.GetMessage('param_down_skin_layer_reference'), 1, 9, 5);
    parameter.declareParameterReal('downskin', 'down_skin_hdens', LOCALIZER.GetMessage('param_hatch_down_skin_density'), 0.001, 50.0, 0.1);
    parameter.declareParameterReal('downskin', 'down_skin_hangle', LOCALIZER.GetMessage('param_hatch_down_skin_angle'), 0, 360, 45);
    parameter.declareParameterReal('downskin', 'down_skin_hangle_increment', LOCALIZER.GetMessage('param_hatch_down_skin_angle_increment'), -360.0, 360.0, 90.0);
    parameter.declareParameterReal('downskin', 'down_skin_overlap', LOCALIZER.GetMessage('param_down_skin_overlap'), 0.0, 100.0, 0.7);
    
  // -------- SCANNING PARAMETERS -------- //
  parameter.declareParameterGroup('ScanningParameters',LOCALIZER.GetMessage('grp_ScanningParameters'));
    parameter.declareParameterReal('ScanningParameters', 'part_hatch_power', LOCALIZER.GetMessage('param_part_hatch_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'part_hatch_markspeed', LOCALIZER.GetMessage('param_part_hatch_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'part_hatch_defocus', LOCALIZER.GetMessage('param_part_hatch_defocus'), 0.0, 100.0, 0.0);
 
    parameter.declareParameterReal('ScanningParameters', 'part_contour_power', LOCALIZER.GetMessage('param_part_contour_power'), 0.0, 500.0, 222.0);
    parameter.declareParameterReal('ScanningParameters', 'part_contour_markspeed', LOCALIZER.GetMessage('param_part_contour_markspeed'), 0.0, 9000.0, 600.0);
    parameter.declareParameterReal('ScanningParameters', 'part_contour_defocus', LOCALIZER.GetMessage('param_part_contour_defocus'), 0.0, 100.0, 0.0);
    
    parameter.declareParameterReal('ScanningParameters', 'downskin_hatch_power', LOCALIZER.GetMessage('param_downskin_hatch_power'), 0.0, 500.0, 106.0);
    parameter.declareParameterReal('ScanningParameters', 'downskin_hatch_markspeed', LOCALIZER.GetMessage('param_downskin_hatch_markspeed'), 0.0, 9000.0, 667.0);
    parameter.declareParameterReal('ScanningParameters', 'downskin_hatch_defocus', LOCALIZER.GetMessage('param_downskin_hatch_defocus'), 0.0, 100.0, 0.0);
    
    parameter.declareParameterReal('ScanningParameters', 'downskin_contour_power', LOCALIZER.GetMessage('param_downskin_contour_power'), 0.0, 500.0, 201.0);
    parameter.declareParameterReal('ScanningParameters', 'downskin_contour_markspeed', LOCALIZER.GetMessage('param_downskin_contour_markspeed'), 0.0, 9000.0, 1600.0);
    parameter.declareParameterReal('ScanningParameters', 'downskin_contour_defocus', LOCALIZER.GetMessage('param_downskin_contour_defocus'), 0.0, 100.0, 0.0); 
 
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_power', LOCALIZER.GetMessage('param_support_hatch_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_markspeed', LOCALIZER.GetMessage('param_support_hatch_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'support_hatch_defocus', LOCALIZER.GetMessage('param_support_hatch_defocus'), 0.0, 100.0, 0.0);
  
    parameter.declareParameterReal('ScanningParameters', 'support_contour_power', LOCALIZER.GetMessage('param_support_contour_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'support_contour_markspeed', LOCALIZER.GetMessage('param_support_contour_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'support_contour_defocus', LOCALIZER.GetMessage('param_support_contour_defocus'), 0.0, 100.0, 0.0);

    parameter.declareParameterReal('ScanningParameters', 'support_open_polyline_power', LOCALIZER.GetMessage('param_support_open_polyline_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'support_open_polyline_markspeed', LOCALIZER.GetMessage('param_support_open_polyline_markspeed'), 0.0, 9000.0, 1000.0);
    parameter.declareParameterReal('ScanningParameters', 'support_open_polyline_defocus', LOCALIZER.GetMessage('param_support_open_polyline_defocus'), 0.0, 100.0, 0.0);          

    parameter.declareParameterReal('ScanningParameters', 'open_polyline_power', LOCALIZER.GetMessage('param_open_polyline_power'), 0.0, 500.0, 260.0);
    parameter.declareParameterReal('ScanningParameters', 'open_polyline_markspeed', LOCALIZER.GetMessage('param_open_polyline_markspeed'), 0.0, 9000.0, 800.0);
    parameter.declareParameterReal('ScanningParameters', 'open_polyline_defocus', LOCALIZER.GetMessage('param_open_polyline_defocus'), 0.0, 100.0, 0.0);      
    
  // -------- PROCESS DURATION SIMULATION SETTINGS -------- //  
  parameter.declareParameterGroup('durationSim', LOCALIZER.GetMessage('grp_durationSim'));
    parameter.declareParameterReal('durationSim', 'JumpSpeed', LOCALIZER.GetMessage('param_JumpSpeed'), 0.001, 2000, 1000);
    parameter.declareParameterInt('durationSim', 'laserOnDelay', LOCALIZER.GetMessage('param_laserOnDelay'), 0, 2000, 2);
    parameter.declareParameterInt('durationSim', 'laserOffDelay', LOCALIZER.GetMessage('param_laserOffDelay'), 0, 2000, 10);
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
   
 
  parameter.declareParameterGroup('tileShift', LOCALIZER.GetMessage('grp_tileShift'),"Tile Shift",BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('tileShift', 'shiftTileInX', LOCALIZER.GetMessage('param_shiftTileInX'), 0, 430, 0);
    parameter.declareParameterReal('tileShift', 'shiftTileInY', LOCALIZER.GetMessage('param_shiftTileInY'), 0, 430, 0);
   
  parameter.declareParameterGroup('activeWorkArea',LOCALIZER.GetMessage('grp_activeWorkArea'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterChoice('activeWorkArea', 'setAtiveBuildArea', 
       LOCALIZER.GetMessage('param_activeBuildArea'),
        [LOCALIZER.GetMessage('param_workArea'),
        LOCALIZER.GetMessage('param_calirationArea')],
        LOCALIZER.GetMessage('param_workArea')
        );
   
  // -------- WORK AREA -------- //
  parameter.declareParameterGroup('workarea',LOCALIZER.GetMessage('grp_workarea'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('workarea', 'x_workarea_min_mm',LOCALIZER.GetMessage('param_x_workarea_min_mm'),0,1015,0);
    parameter.declareParameterInt('workarea', 'x_workarea_max_mm',LOCALIZER.GetMessage('param_x_workarea_max_mm'),0,1015,1000);
    parameter.declareParameterInt('workarea', 'y_workarea_min_mm',LOCALIZER.GetMessage('param_y_workarea_min_mm'),-508,1015,0);
    parameter.declareParameterInt('workarea', 'y_workarea_max_mm',LOCALIZER.GetMessage('param_y_workarea_max_mm'),-258,1015,1000);
    
   // -------- WORK AREA -------- //
  parameter.declareParameterGroup('calibrationArea',LOCALIZER.GetMessage('grp_calibrationArea'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('calibrationArea', 'x_calibrationArea_min_mm',LOCALIZER.GetMessage('param_x_calibrationArea_min_mm'),-50,0,0);
    parameter.declareParameterInt('calibrationArea', 'x_calibrationArea_max_mm',LOCALIZER.GetMessage('param_x_calibrationArea_max_mm'),0,1015,1010);
    parameter.declareParameterInt('calibrationArea', 'y_calibrationArea_min_mm',LOCALIZER.GetMessage('param_y_calibrationArea_min_mm'),-508,0,-508);
    parameter.declareParameterInt('calibrationArea', 'y_calibrationArea_max_mm',LOCALIZER.GetMessage('param_y_calibrationArea_max_mm'),-258,0,-258);   
    
  // -------- MOVEMENT SETTINGS -------- //  
  parameter.declareParameterGroup('movementSettings',LOCALIZER.GetMessage('grp_movementSettings'),'Movement Settings',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterReal('movementSettings','axis_max_speed', LOCALIZER.GetMessage('param_axis_max_speed'),0.0,100.0,80.0);
    parameter.declareParameterReal('movementSettings','axis_transport_speed', LOCALIZER.GetMessage('param_axis_transport_speed'),0.0,100.0,80.0);
    parameter.declareParameterInt('movementSettings', 'recoating_speed_mms',LOCALIZER.GetMessage('param_recoating_speed_mms'),0,1000,120);
    parameter.declareParameterReal('movementSettings', 'head_startpos_x',LOCALIZER.GetMessage('param_head_startpos_x'),0.0,1000.0,0.0);
    parameter.declareParameterReal('movementSettings', 'head_startpos_y',LOCALIZER.GetMessage('param_head_startpos_y'),-500.0,1000.0,0.0);
    parameter.declareParameterChoice('movementSettings', 'isFirstPassFrontToBack', 
       LOCALIZER.GetMessage('param_isFirstPassFrontToBack'),
        [LOCALIZER.GetMessage('param_firstpass_from_back'),
        LOCALIZER.GetMessage('param_firstpass_from_front')],
        LOCALIZER.GetMessage('param_firstpass_from_front')
        );
    parameter.declareParameterChoice('movementSettings', 'isPassDirectionAlternating', 
    LOCALIZER.GetMessage('param_isPassDirectionAlternating'),
    [LOCALIZER.GetMessage('param_pass_same'),
    LOCALIZER.GetMessage('param_pass_alternating')],
    LOCALIZER.GetMessage('param_pass_alternating')
    );
  

  // -------- SCANNER HEAD -------- //
  parameter.declareParameterGroup('scanhead',LOCALIZER.GetMessage('grp_scanhead'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    
    parameter.declareParameterInt('scanhead', 'laserCount',LOCALIZER.GetMessage('param_laserCount'),0,5,5);
        
    parameter.declareParameterReal('scanhead', 'x_scanfield_size_mm',LOCALIZER.GetMessage('param_x_scanfield_size_mm'),0,430,430); //430
    parameter.declareParameterReal('scanhead', 'y_scanfield_size_mm',LOCALIZER.GetMessage('param_y_scanfield_size_mm'),0,200,110);//110;
    
    parameter.declareParameterReal('scanhead', 'y_scanfield_ref_mm',LOCALIZER.GetMessage('param_y_scanfield_ref_mm'),0,110,60);//110;
    
    parameter.declareParameterReal('scanhead', 'x_scanner1_max_mm',LOCALIZER.GetMessage('param_x_scanner1_max_mm'),0,100,80);
    parameter.declareParameterReal('scanhead', 'x_scanner1_min_mm',LOCALIZER.GetMessage('param_x_scanner1_min_mm'),-100,0,-40);
    parameter.declareParameterReal('scanhead', 'x_scanner1_ref_mm',LOCALIZER.GetMessage('param_x_scanner1_ref_mm'),0,390,40);

    parameter.declareParameterReal('scanhead', 'x_scanner2_max_mm',LOCALIZER.GetMessage('param_x_scanner2_max_mm'),0,125,80); //80
    parameter.declareParameterReal('scanhead', 'x_scanner2_min_mm',LOCALIZER.GetMessage('param_x_scanner2_min_mm'),-125,0,-80); //80
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
      parameter.declareParameterInt('skywriting','nprev', LOCALIZER.GetMessage('param_nprev'),0,1000,11);
      parameter.declareParameterInt('skywriting','npost', LOCALIZER.GetMessage('param_npost'),0,1000,9);
      parameter.declareParameterReal('skywriting','mode3limit', LOCALIZER.GetMessage('param_mode3limit'),-1.0,1.0,0.9);
    
  // group material
  parameter.declareParameterGroup('material',LOCALIZER.GetMessage('grp_material'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
        parameter.declareParameterReal('material','density_g_cc', LOCALIZER.GetMessage('param_material_densitet'),0.0,1000.0,8.19);
  
  parameter.declareParameterGroup('buildTimeEstimation',LOCALIZER.GetMessage('grp_buildTimeEstimation'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterInt('buildTimeEstimation', 'recoatingDuration_ms',LOCALIZER.GetMessage('param_recoatingDuration_ms'),0,100000,26000);
    parameter.declareParameterInt('buildTimeEstimation', 'powderfillingDuration_ms',LOCALIZER.GetMessage('param_powderfillingDuration_ms'),0,100000,21000);
    parameter.declareParameterInt('buildTimeEstimation', 'minimumLayerDuration_ms',LOCALIZER.GetMessage('param_minimumLayerDuration_ms'),0,10000000,47000);
           
  parameter.declareParameterGroup('laserAssignment',LOCALIZER.GetMessage('grp_laserAssignment'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);
    parameter.declareParameterChoice('laserAssignment', 'assignmentMode', 
     LOCALIZER.GetMessage('param_assignmentMode'),
      [LOCALIZER.GetMessage('static'),
      LOCALIZER.GetMessage('full')],
     LOCALIZER.GetMessage('static'),'static: Static allocation distributes the vectors based on the center reach point between adjancent lasers' +
                                    '\nfull: Full allocation allocates all vectors to all lasers in reach'
      );           
           
   // group tileing
  parameter.declareParameterGroup('tileing',LOCALIZER.GetMessage('grp_tileing'),'',BUILD.nGroupDefaultFlags | BUILD.nGroupPlatform);

  parameter.declareParameterChoice('tileing', 'ScanningMode', 
     LOCALIZER.GetMessage('param_ScanningMode'),
      [LOCALIZER.GetMessage('param_ScanningMode_MoveAndShoot'),
      LOCALIZER.GetMessage('param_ScanningMode_OnTheFly')],
      LOCALIZER.GetMessage('param_ScanningMode_OnTheFly')
      );      
  
  parameter.declareParameterChoice('tileing', 'processHeadAlignment', 
     LOCALIZER.GetMessage('param_processHeadAlignment'),
      [LOCALIZER.GetMessage('param_processHeadAlignment_default'),
      LOCALIZER.GetMessage('param_processHeadAlignment_custom')],
      LOCALIZER.GetMessage('param_processHeadAlignment_default'),
      "Alignment of the process head center (origo of laser 3) relative to the tile (bottom left corner)." 
      +"\nDefault - On The Fly: tile is located opposite the process head center in the process head moving direction (front to back / back to front)." 
     +"\nDefault - Move And Shoot: the tile center is placed at the process head center." +
     "\nCustom: define the process head offsets specifically."); 
  
    parameter.declareParameterReal('tileing', 'processHeadCustomOffset_x',LOCALIZER.GetMessage('param_processHeadCustomOffset_x'),-210,210,0);   
    parameter.declareParameterReal('tileing', 'processHeadCustomOffset_y',LOCALIZER.GetMessage('param_processHeadCustomOffset_y'),-100,220,0);
    parameter.declareParameterReal('tileing', 'processheadRampOffset',LOCALIZER.GetMessage('param_processheadRampOffset'),0,50,0.5);
    parameter.declareParameterReal('tileing', 'tileTravelForBreachingYLimit',LOCALIZER.GetMessage('param_tileTravelForBreachingYLimit'),0.001,5,0.5);
 
    parameter.declareParameterReal('tileing', 'tile_overlap_x',LOCALIZER.GetMessage('param_tile_overlap_x'),-100,100,-0.1); //-5
    parameter.declareParameterReal('tileing', 'tile_overlap_y',LOCALIZER.GetMessage('param_tile_overlap_y'),-100,100,-0.1); //-5
 
    parameter.declareParameterReal('tileing','step_x', LOCALIZER.GetMessage('param_step_x'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_x', LOCALIZER.GetMessage('param_number_x'),0,10,7);
    parameter.declareParameterReal('tileing','step_y', LOCALIZER.GetMessage('param_step_y'),0.0,10.0,0.4);
    parameter.declareParameterInt('tileing','number_y', LOCALIZER.GetMessage('param_number_y'),0,10,7); 
    parameter.declareParameterReal('tileing','tile_size', LOCALIZER.GetMessage('param_tile_size'),0.0,150.0,33.0);
    parameter.declareParameterInt('tileing','tileBufferDuration_us', LOCALIZER.GetMessage('param_tileBufferDuration_us'),0.0,5000000,0);
    parameter.declareParameterInt('tileing','firstTileInStripeAddedDuration_us', LOCALIZER.GetMessage('param_firstTileInStripeAddedDuration_us'),0.0,5000000,0);
    parameter.declareParameterInt('tileing','minimumTileTime_us', LOCALIZER.GetMessage('param_minimumTileTime_us'),0.0,5000000,0);


    
    
  parameter.declareParameterGroup('scanning_priority', LOCALIZER.GetMessage('grp_scanning_priority'));
    parameter.declareParameterInt('scanning_priority','part_hatch_priority', LOCALIZER.GetMessage('param_part_hatch_priority'),0,2000,100);
    parameter.declareParameterInt('scanning_priority','downskin_hatch_priority', LOCALIZER.GetMessage('param_downskin_hatch_priority'),0,2000,200);
    parameter.declareParameterInt('scanning_priority','support_hatch_priority', LOCALIZER.GetMessage('param_support_hatch_priority'),0,2000,300);
    parameter.declareParameterInt('scanning_priority','part_contour_priority', LOCALIZER.GetMessage('param_part_contour_priority'),0,2000,400);
    parameter.declareParameterInt('scanning_priority','downskin_contour_priority', LOCALIZER.GetMessage('param_downskin_contour_priority'),0,2000,500);
    parameter.declareParameterInt('scanning_priority','support_contour_priority', LOCALIZER.GetMessage('param_support_contour_priority'),0,2000,600);
    parameter.declareParameterInt('scanning_priority','support_open_polyline_priority', LOCALIZER.GetMessage('param_support_open_polyline_priority'),0,2000,700);
    parameter.declareParameterInt('scanning_priority','open_polyline_priority', LOCALIZER.GetMessage('param_openPolyline_priority'),0,2000,800);
}