/*/************************************************************
 * Machine Configuration
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
 
'use strict';
var BUILD_PARAM  = requireBuiltin("bsBuildParam");

// =============================================================================

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