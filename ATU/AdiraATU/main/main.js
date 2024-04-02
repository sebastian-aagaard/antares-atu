/************************************************************
 * Adira AddCreative Buildstyle
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */

'use strict';

// -------- INCLUDES -------- //
let PARAM = requireBuiltin('bsParam');
let EXPORT_FILTER = requireBuiltin('bsExportFilter');
let CLI = require('main/export_cli.js');
let LOCALIZER = require('localization/localizer.js');

// -------- SCRIPTS INCLUDES -------- //
let MACHINE_CONFIG = require('../configuration/machine_declaration.js');
let PARAM_CONFIG = require('../configuration/parameter_declaration.js');
let ATTRIB_CONFIG = require('../configuration/attribute_declaration.js');
let POST_PROCESS = require('main/post_processor.js');
let PREP_MODEL = require('main/prepare_model_exposure.js');

let UTIL = require('main/utility_functions.js');
let CONST = require('main/constants.js');
let PREPROCESSOR = require('main/preprocessor.js');
let TOOLPATH = require('main/Toolpath.js');

// -------- GENERAL INFORMATION -------- //
/** @param  aboutInfo  bsAboutInfo */

exports.about = (aboutInfo) => {
  
   aboutInfo.addCommentLine('AddCreator');
   aboutInfo.addCommentLine('Adira');
   aboutInfo.addCommentLine('Copyright 2023');
  
};

// -------- MACHINE CONFIGURATION -------- //
/** @param  machineConfig   bsMachineConfig */

exports.declareMachine = (machineConfig) => {
  
  MACHINE_CONFIG.declareMachine(machineConfig);
  
};

// -------- PARAMETER CONFIGURATION -------- //
/** @param  parameter   bsBuildParam */

exports.declareParameters = (parameter) => {
    
    PARAM_CONFIG.declareParameters(parameter)
  
};

// -------- ATTRIBUTE CONFIGURATION -------- //
/** @param  buildAttrib   bsBuildAttribute */

exports.declareBuildAttributes = (buildAttrib) => {
    
  ATTRIB_CONFIG.declareBuildAttributes(buildAttrib);
    
};
  
// -------- CONFIGURE POST PROCESSING -------- //
/** @param  a_config    bsPostProcessingConfig */

exports.configurePostProcessingSteps = (a_config) => {
  // Postprocessing the toolpaths using the given function:
  a_config.addPostProcessingStep(POST_PROCESS.postprocessLayerStack_MT,{bMultithread: true, nProgressWeight: 1});
  
  // create toolpath
  // actual postprocessing
  // generate 3mf Data
};


/**
* the buildstyle declares its export filters to the main application
* 'filter-id', 'display string', 'file extension'
*
* @param  exportFilter  bsExportFilter
*/
exports.declareExportFilter = (exportFilter) => {    
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

exports.prepareModelExposure = (model) => {
  
  PREP_MODEL.prepareModelExposure(model);
    
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
exports.preprocessLayerStack = (modelDataSrc, modelDataTarget, progress) => {  

PREPROCESSOR.preprocessLayerStack(modelDataSrc, modelDataTarget, progress);
  
}; //preprocessLayerStack

/**
* Calculate the exposure data / hatch vectors for one layer of a part
* @param  modelData    bsModelData
* @param  hatchResult  bsHatch
* @param  nLayerNr      int
*/
exports.makeExposureLayer = (modelData, hatchResult, nLayerNr) => {  

  TOOLPATH.makeExposureLayer(modelData, hatchResult, nLayerNr);
  
  }; // makeExposureLayer
  
/**
* Export exposure data to file
* @param  exportFile     bsFile
* @param  sFilter        string
* @param  modelData      bsModelData
* @param  progress       bsProgress
*/
exports.exportToFile = (exportFile, sFilter, modelData, progress) => {
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
