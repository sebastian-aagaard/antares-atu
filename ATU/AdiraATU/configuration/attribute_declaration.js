/************************************************************
 * Declare build attributes
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- CODE -------- //

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
  buildAttrib.declareAttributeReal('Hatch_Duration_ms');
  buildAttrib.declareAttributeInt('laser_index');
  buildAttrib.declareAttributeInt('sharedZone');
  buildAttrib.declareAttributeInt('islandId');
  buildAttrib.declareAttributeInt('stripeID');
  buildAttrib.declareAttributeInt('bMoveFromFront');
  buildAttrib.declareAttributeInt('numberofOverlappingTiles')
  buildAttrib.declareAttributeInt('overlappingTile_1');
  buildAttrib.declareAttributeInt('overlappingTile_2');
  buildAttrib.declareAttributeInt('overlappingTile_3');
  buildAttrib.declareAttributeInt('overlappingTile_4');
  buildAttrib.declareAttributeInt('overlappingTile_5');
  buildAttrib.declareAttributeInt('overlappingTile_6');
  buildAttrib.declareAttributeInt('overlappingTile_7');
  buildAttrib.declareAttributeInt('overlappingTile_8');
  buildAttrib.declareAttributeInt('overlappingTile_9');
  buildAttrib.declareAttributeInt('test');

};