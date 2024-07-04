/************************************************************
 * Global Constants
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- GLOBAL CONSTANTS -------- //

exports.bLOGGING = false;
exports.bVERBOSE = false;
exports.nLaserCount = 5;
exports.bIncludeScanningAttributes = true;
exports.nBufferduration = 0;//1500000;//500000;//1000000; //us

//if openpolyline support is required set to false
//when not in development mode set to false
exports.bDrawTile = false; // this inversly toggles the ability to handle CAD 
                          //generated openpolilines (eg in support)

exports.scanningSchema = 'http://schemas.scanlab.com/scanning/2023/01';
exports.skywritingSchema = 'http://schemas.scanlab.com/skywriting/2023/01';

exports.parkingPosition = { x: 465 , y: - 560 };
exports.tilePositionHardLimit = {xmin:-40 , ymin: -60, xmax: 620, ymax: 935};


// -------- TYPE DESIGNATION -------- //
exports.typeDesignations = {
  open_polyline: {
    value: 0,
    name: "open_polyline"
  },
  part_hatch: {
    value: 1,
    name: "part_hatch"
  },
  part_contour: {
    value: 2,
    name: "part_contour"
  },
  downskin_hatch: {
    value: 3,
    name: "downskin_hatch"
  },
  downskin_contour: {
    value: 4,
    name: "downskin_contour"
  },
  support_hatch: {
    value: 5,
    name: "support_hatch"
  },
  support_contour: {
    value: 6,
    name: "support_contour"
  }
};