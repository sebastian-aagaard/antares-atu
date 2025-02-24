/************************************************************
 * perpare model exposure
 *
 * @author Sebastian        
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //
let PARAM = requireBuiltin('bsParam');

// -------- SCRIPTS INCLUDES -------- //
let CONST = require('main/constants.js');

exports.prepareModelExposure = function(model){
  
  
  // Save Parameter JSON string

  let parameterConfiguration =
    {
     "bIncludePlatformParameters" : true,
     "bIncludePartParameters" : true,
     "bFullDetail" : false

    };

  let parameterConfiguration_json = PARAM.getParametersExportData(parameterConfiguration);

  model.setAttrib("parameterJSON", JSON.stringify(parameterConfiguration_json));
  
  //Create custom table
  //generates a custom table containing different parameters depending on laser number
  
  let skywritingAttributes = {      
    "schema": CONST.skywritingSchema,          
    "mode": PARAM.getParamInt('skywriting','skywritingMode'),
    "timelag": PARAM.getParamInt('skywriting','timelag'),
    "laseronshift": PARAM.getParamInt('skywriting','laserOnShift')*64,
    "limit": PARAM.getParamReal('skywriting','mode3limit'),
    "nprev": PARAM.getParamInt('skywriting','nprev'),
    "npost": PARAM.getParamInt('skywriting','npost')
  };
  
    let scanningAttributes = {      
    "schema": CONST.scanningSchema,
    "laserOnDelay": PARAM.getParamInt('durationSim','laserOnDelay'),
    "laserOffDelay": PARAM.getParamInt('durationSim','laserOffDelay'),      
    "jumpSpeed": PARAM.getParamReal('durationSim','JumpSpeed'),
    "jumpLengthLimit": PARAM.getParamReal('durationSim','JumpLengthLimit'),
    "jumpDelay": PARAM.getParamInt('durationSim','JumpDelay'),
    "minJumpDelay": PARAM.getParamInt('durationSim','MinJumpDelay'),
    "markDelay": PARAM.getParamInt('durationSim','MarkDelay'),
    "polygonDelay": PARAM.getParamInt('durationSim','PolygonDelay'),
    "polygonDelayMode" : PARAM.getParamStr('durationSim','PolygonDelayMode')
  };
  
  let additionalAttributes = [ skywritingAttributes ];
  
  if(CONST.bIncludeScanningAttributes){
    additionalAttributes.push(scanningAttributes);
  }
  
  const typeDesignations = CONST.typeDesignations;

  // Array to store laser objects
  let customTable = [];
  let laserCount = PARAM.getParamInt("scanhead", "laserCount");

for (let l_laser_nr = 1; l_laser_nr <= laserCount;l_laser_nr++) {
    let keys = Object.keys(typeDesignations);
    for (let i = 0; i < keys.length; i++) {
        let type = keys[i];
        let typeObj = typeDesignations[type];
        let bsid_obj = {};

        bsid_obj.bsid = 10 * l_laser_nr + typeObj.value;
        bsid_obj.laserIndex = l_laser_nr;
        bsid_obj.name = 'laser' + l_laser_nr + '_' + typeObj.name;
        bsid_obj.power = PARAM.getParamReal('ScanningParameters', typeObj.name + '_power');
        bsid_obj.focus = PARAM.getParamReal('ScanningParameters', typeObj.name + '_defocus');
        bsid_obj.speed = PARAM.getParamReal('ScanningParameters', typeObj.name + '_markspeed');
        bsid_obj.priority = PARAM.getParamInt('scanning_priority', typeObj.name + '_priority');
        bsid_obj.attributes = additionalAttributes;

        customTable.push(bsid_obj);
    }
}
  model.setAttribEx('customTable', customTable);
 
};