/************************************************************
 * Machine Configuration
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- CODE -------- //

/**
*  Declare machine configuration
*
* @param  machineConfig   bsMachineConfig
*/

exports.declareMachine = function(machineConfig)
{
  machineConfig.setBuildstyleName('Nikon SLM Solutions');
  machineConfig.setMachineName('Antares');
  machineConfig.addMaterialName('Material 1');
  machineConfig.addLayerThicknessToMaterial('Material 1', 10);
  machineConfig.addLayerThicknessToMaterial('Material 1', 20);
  machineConfig.addLayerThicknessToMaterial('Material 1', 30);
  machineConfig.addLayerThicknessToMaterial('Material 1', 40);
  machineConfig.addLayerThicknessToMaterial('Material 1', 50);
  machineConfig.addLayerThicknessToMaterial('Material 1', 60);
  machineConfig.addLayerThicknessToMaterial('Material 1', 61);
  machineConfig.addLayerThicknessToMaterial('Material 1', 70);
  machineConfig.addLayerThicknessToMaterial('Material 1', 80);
  machineConfig.addLayerThicknessToMaterial('Material 1', 90);
  machineConfig.addLayerThicknessToMaterial('Material 1', 100);
  
 
//   machineConfig.addLayerThickness(10);
//   machineConfig.addLayerThickness(20);
//   machineConfig.addLayerThickness(30);
//   machineConfig.addLayerThickness(40);
//   machineConfig.addLayerThickness(50);
//   machineConfig.addLayerThickness(60);
//   machineConfig.addLayerThickness(70);
//   machineConfig.addLayerThickness(80);
//   machineConfig.addLayerThickness(90);
//   machineConfig.addLayerThickness(100);
// 
//   machineConfig.addLayerThicknessToMaterial('unspecified', 50);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 100);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 1000);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 10000);


  //machineConfig.addLayerThicknessToMaterial('IN718', 60);


};