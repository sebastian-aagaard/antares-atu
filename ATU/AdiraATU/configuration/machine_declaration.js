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
  machineConfig.setBuildstyleName('Nikon SLM Solutions - Antares');
  machineConfig.setMachineName('Antares');
  machineConfig.addMaterialName('Material 1');
 
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
  machineConfig.addLayerThickness(1000);


};