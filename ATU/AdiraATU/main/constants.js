/************************************************************
 * Global Constants
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- GLOBAL CONSTANTS -------- //

exports.ENABLE_LOGGING = true;
exports.nLaserCount = 5;
exports.bIncludeScanningAttributes = false;
exports.nBufferduration = 0;//1500000;//500000;//1000000; //us

//if openpolyline support is required set to false
//when not in development mode set to false
exports.bDrawTile = true; // this inversly toggles the ability to handle CAD generated openpolilines (eg in support)

// -------- TYPE DESIGNATION -------- //
exports.nType_openPolyline = 0;
exports.nType_part_hatch = 1;
exports.nType_part_contour = 2;
exports.nType_downskin_hatch = 3;
exports.nType_downskin_contour = 4;
exports.nType_support_hatch = 5;
exports.nType_support_contour = 6;