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
  machineConfig.setBuildstyleName('Adira');
  machineConfig.setMachineName('AddCreator');
  machineConfig.addMaterialName('unspecified');


  machineConfig.addLayerThickness(10);
  machineConfig.addLayerThickness(20);
  machineConfig.addLayerThickness(30);
  machineConfig.addLayerThickness(40);
  machineConfig.addLayerThickness(50);
  machineConfig.addLayerThickness(60);
  machineConfig.addLayerThickness(70);
  machineConfig.addLayerThickness(80);
  machineConfig.addLayerThickness(90);
  machineConfig.addLayerThickness(100);
// 
//   machineConfig.addLayerThicknessToMaterial('unspecified', 50);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 100);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 1000);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 10000);


  //machineConfig.addLayerThicknessToMaterial('IN718', 60);
  // machineConfig.addMaterialName('unspecified');
//   machineConfig.addLayerThicknessToMaterial('unspecified', 10);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 20);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 30);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 40);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 50);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 60);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 70);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 80);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 90);
//   machineConfig.addLayerThicknessToMaterial('unspecified', 100);
};