/************************************************************
 * Global Constants
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const RGBA = requireBuiltin('bsColRGBAi');
const PARAM = requireBuiltin('bsParam');
// -------- GLOBAL CONSTANTS -------- //

exports.bLOGGING = false;
exports.bVERBOSE = false;
exports.bIncludeScanningAttributes = true;

exports.scanningSchema = 'http://schemas.scanlab.com/scanning/2023/01';
exports.skywritingSchema = 'http://schemas.scanlab.com/skywriting/2023/01';

exports.parkingPosition = { x: 465 , y: - 560 };
exports.tilePositionHardLimit = {xmin:-40 , ymin: -60, xmax: 645, ymax: 995};
exports.maxTargetY = 995;

// -------- TYPE DESIGNATION -------- //
exports.typeDesignations = {
  part_hatch: {
    value: 1,
    name: "part_hatch",
    color1: new RGBA.bsColRGBAi(0, 255, 0, 255), // green
    color2: new RGBA.bsColRGBAi(0, 200, 0, 255)  // dark green
  },
  part_contour: {
    value: 2,
    name: "part_contour",
    color1: new RGBA.bsColRGBAi(0, 0, 255, 255), // blue
    color2: new RGBA.bsColRGBAi(0, 0, 200, 255)  // dark blue
  },
  downskin_hatch: {
    value: 3,
    name: "downskin_hatch",
    color1: new RGBA.bsColRGBAi(255, 0, 255, 255), // magenta
    color2: new RGBA.bsColRGBAi(200, 0, 200, 255)  // dark magenta
  },
  downskin_contour: {
    value: 4,
    name: "downskin_contour",
    color1: new RGBA.bsColRGBAi(255, 165, 0, 255), // orange
    color2: new RGBA.bsColRGBAi(200, 130, 0, 255) // dark orange
  },
  support_hatch: {
    value: 5,
    name: "support_hatch",
    color1: new RGBA.bsColRGBAi(0, 255, 255, 255), // cyan
    color2: new RGBA.bsColRGBAi(0, 200, 200, 255)  // dark cyan
  },
  support_contour: {
    value: 6,
    name: "support_contour",
    color1: new RGBA.bsColRGBAi(128, 0, 128, 255), // purple
    color2: new RGBA.bsColRGBAi(100, 0, 100, 255)  // dark purple
  },
  support_open_polyline: {
    value: 7,
    name: "support_open_polyline",
    color1: new RGBA.bsColRGBAi(0, 0, 139, 255), // dark blue
    color2: new RGBA.bsColRGBAi(0, 0, 100, 255)  // darker blue
  },
  open_polyline: {
    value: 8,
    name: "open_polyline",
    color1: new RGBA.bsColRGBAi(255, 0, 0, 255), // red
    color2: new RGBA.bsColRGBAi(200, 0, 0, 255)  // dark red
  }
};



