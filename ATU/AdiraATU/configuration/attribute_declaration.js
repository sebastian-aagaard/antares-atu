/************************************************************
 * Declare build attributes
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- CODE -------- //

exports.declareBuildAttributes = function(buildAttrib,laser_count){
  
  buildAttrib.declareAttributeInt('test'); // buildstyle ID
  buildAttrib.declareAttributeInt('bsid'); // buildstyle ID
  buildAttrib.declareAttributeReal('power'); // beam laser power
  buildAttrib.declareAttributeReal('speed'); // scanning speed
  buildAttrib.declareAttributeInt('type'); // scanning type
  buildAttrib.declareAttributeInt('3mf_attribute');
  buildAttrib.declareAttributeInt('atu_attribute');
  buildAttrib.declareAttributeInt('priority');
  buildAttrib.declareAttributeInt('borderIndex');
  buildAttrib.declareAttributeInt('passNumber');
  buildAttrib.declareAttributeInt('passNumber_3mf');//
  buildAttrib.declareAttributeReal('xcoord');
  buildAttrib.declareAttributeReal('ycoord');
  buildAttrib.declareAttributeInt('tile_index');
  buildAttrib.declareAttributeInt('modelIndex');
  buildAttrib.declareAttributeInt('tileID_3mf');
  buildAttrib.declareAttributeReal('Hatch_Duration_ms');
  buildAttrib.declareAttributeInt('laser_index');
  buildAttrib.declareAttributeInt('sharedZone');
  buildAttrib.declareAttributeInt('islandId');
  buildAttrib.declareAttributeInt('stripeId');
  buildAttrib.declareAttributeInt('hatchBlockId');
  buildAttrib.declareAttributeReal('stripeAngle');
  buildAttrib.declareAttributeInt('bMoveFromFront');
  buildAttrib.declareAttributeInt('overlappingTile_1');
  buildAttrib.declareAttributeInt('overlappingTile_2');
  buildAttrib.declareAttributeInt('overlappingTile_3');
  buildAttrib.declareAttributeInt('overlappingTile_4');
  buildAttrib.declareAttributeInt('overlapCount');
  buildAttrib.declareAttributeInt('overlapLaserCount');
  buildAttrib.declareAttributeInt('overlapTileCount');
  buildAttrib.declareAttributeInt('overlappingLaser_1');
  buildAttrib.declareAttributeInt('overlappingLaser_2');
  buildAttrib.declareAttributeInt('overlappingLaser_3');
  buildAttrib.declareAttributeInt('overlappingLaser_4');
  buildAttrib.declareAttributeInt('overlappingLaser_5');
  buildAttrib.declareAttributeInt('processedByLaser');
  buildAttrib.declareAttributeInt('hatchExposureTime');
  buildAttrib.declareAttributeInt('isSingleSource');
  buildAttrib.declareAttributeInt('patternX');
  buildAttrib.declareAttributeInt('patternY');


};