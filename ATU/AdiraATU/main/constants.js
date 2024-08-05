/************************************************************
 * Global Constants
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const RGBA = requireBuiltin('bsColRGBAi');


// -------- GLOBAL CONSTANTS -------- //

exports.bLOGGING = false;
exports.bVERBOSE = false;
exports.nLaserCount = 5;
exports.bIncludeScanningAttributes = true;
exports.nBufferduration = 0;//1500000;//500000;//1000000; //us

//if openpolyline support is required set to false
//when not in development mode set to false
exports.bDrawTile = true; // this inversly toggles the ability to handle CAD 
                          //generated openpolilines (eg in support)

exports.scanningSchema = 'http://schemas.scanlab.com/scanning/2023/01';
exports.skywritingSchema = 'http://schemas.scanlab.com/skywriting/2023/01';

exports.parkingPosition = { x: 465 , y: - 560 };
exports.tilePositionHardLimit = {xmin:-40 , ymin: -60, xmax: 620, ymax: 935};


// -------- TYPE DESIGNATION -------- //
exports.typeDesignations = {
  open_polyline: {
    value: 0,
    name: "open_polyline",
    color: new RGBA.bsColRGBAi(255, 0, 0, 255), // red
    alpha: 255 // 100%
  },
  part_hatch: {
    value: 1,
    name: "part_hatch",
    color: new RGBA.bsColRGBAi(0, 255, 0, 255), // green
    alpha: 229.5 // 90%
  },
  part_contour: {
    value: 2,
    name: "part_contour",
    color: new RGBA.bsColRGBAi(0, 0, 255, 255), // blue
    alpha: 204 // 80%
  },
  downskin_hatch: {
    value: 3,
    name: "downskin_hatch",
    color: new RGBA.bsColRGBAi(255, 0, 255, 255), // magenta
    alpha: 178.5 // 70%
  },
  downskin_contour: {
    value: 4,
    name: "downskin_contour",
    color: new RGBA.bsColRGBAi(255, 165, 0, 255), // orange
    alpha: 153 // 60%
  },
  support_hatch: {
    value: 5,
    name: "support_hatch",
    color: new RGBA.bsColRGBAi(0, 255, 255, 255), // cyan
    alpha: 127.5 // 50%
  },
  support_contour: {
    value: 6,
    name: "support_contour",
    color: new RGBA.bsColRGBAi(128, 0, 128, 255), // purple
    alpha: 102 // 40%
  },
  support_open_polyline: {
    value: 7,
    name: "support_open_polyline",
    color: new RGBA.bsColRGBAi(0, 0, 139, 255), // dark blue
    alpha: 76.5 // 30%
  }
};



