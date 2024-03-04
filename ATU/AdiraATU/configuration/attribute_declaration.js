/************************************************************
 * [Description]
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

exports.declareBuildAttributes = function(buildAttrib,laser_count){
  
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
  buildAttrib.declareAttributeReal('Hatch_Duration_ms');
  buildAttrib.declareAttributeInt('laser_index');
  buildAttrib.declareAttributeInt('sharedZone');
  buildAttrib.declareAttributeInt('zoneExposure');
  buildAttrib.declareAttributeInt('zoneIndex');
  buildAttrib.declareAttributeInt('islandId');
  buildAttrib.declareAttributeInt('stripeID');
  buildAttrib.declareAttributeInt('assigned');

  buildAttrib.declareAttributeReal('ScanheadMoveSpeed');
  for(let i = 0 ; i<laser_count ; i++){
    buildAttrib.declareAttributeInt('laser_index_'+(i+1));
  }
  
};