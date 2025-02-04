/************************************************************
 * [Description]
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const ISLAND = requireBuiltin('bsIsland');
const POLY_IT = requireBuiltin('bsPolylineIterator');
const VEC2 = requireBuiltin('vec2');
const HATCH = requireBuiltin('bsHatch');
const PATH_SET = requireBuiltin('bsPathSet');

const UTIL = require('main/utility_functions.js');
const LASER = require('main/laser_designation.js');

// Main unit testing function
exports.unitTesting = function(testInfo) {
  // Feed in test suites for each function
  testGenerateUUID(testInfo);
  testInvertAngle(testInfo);
  
  //testContourAllocation
  detectContourAllocation(testInfo);
  
};

// Test Suite for generateUUID
function testGenerateUUID(testInfo) {
  testInfo.addTest('UUID_format_test', 'should generate UUID in correct format', testUUIDFormat());
  testInfo.addTest('UUID_uniqueness_test', 'should generate unique UUIDs', testUUIDUniqueness());
  testInfo.addTest('UUID_length_test', 'should generate UUID of correct length', testUUIDLength());
}

// Test Suite for invertAngleIfQ1orQ2
function testInvertAngle(testInfo) {
  testInfo.addTest('util_invertAngleIfQ1orQ2_test_1', 'should not invert angle when in 3rd or 4th quadrant', ifStripeAngleIsNotQ1orQ2_DoesNotInvert());
  testInfo.addTest('util_invertAngleIfQ1orQ2_test_2', 'should invert angle when in 1st or 2nd quadrant', ifStripeAngleIsQ1orQ2_InvertsCorrectly());
  testInfo.addTest('util_invertAngleIfQ1orQ2_test_3', 'should invert correctly if angle is above 360 and within 1st and 2nd quadrant', ifStripeAngleIsQ1orQ2_andabove360_InvertsCorrectly());
  testInfo.addTest('util_invertAngleIfQ1orQ2_test_4', 'should not invert angle if above 360 and within 3rd or 4th quadrant', ifStripeAngleIsQ3orQ4_andabove360_NormalizeButDoNotInvert());
}

// UUID Tests
function testUUIDFormat() {
  const uuid = UTIL.generateUUID(); 
  const uuidFormatRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidFormatRegex.test(uuid);
}

function testUUIDUniqueness() {
  const uuid1 = UTIL.generateUUID();
  const uuid2 = UTIL.generateUUID();
  return uuid1 !== uuid2;
}

function testUUIDLength() {
  const uuid = UTIL.generateUUID(); 
  return uuid.length === 36;
}

// Invert Angle Tests
function ifStripeAngleIsNotQ1orQ2_DoesNotInvert() {
  let nonInvertingAngle = 270;
  let output = UTIL.invertAngleIfQ1orQ2(nonInvertingAngle); 
  return nonInvertingAngle === output;
}

function ifStripeAngleIsQ1orQ2_InvertsCorrectly() {
  let invertingAngle = 45;
  let expectedOutput = 225;
  let output = UTIL.invertAngleIfQ1orQ2(invertingAngle); 
  return output === expectedOutput;
}

function ifStripeAngleIsQ1orQ2_andabove360_InvertsCorrectly() {
  let invertingAngle = 400;
  let expectedOutput = 220;
  let output = UTIL.invertAngleIfQ1orQ2(invertingAngle); 
  return output === expectedOutput;
}

function ifStripeAngleIsQ3orQ4_andabove360_NormalizeButDoNotInvert() {
  let nonInvertingAngle = 600;
  let expectedOutput = 240;

  let output = UTIL.invertAngleIfQ1orQ2(nonInvertingAngle); 
  return output === expectedOutput;
}

/// unit test contour allocation ///

function detectContourAllocation(testInfo){
  
// Test Information  
  
  let islandPoints_one = [  
    new VEC2.Vec2(10, 10),
    new VEC2.Vec2(90, 10),
    new VEC2.Vec2(90, 90),
    new VEC2.Vec2(10, 90),
    new VEC2.Vec2(10, 10) 
  ];
  
  let island_one = UTIL.generateIslandFromCoordinates(islandPoints_one,true);
  
  let contourHatch_one = new HATCH.bsHatch();
  
  island_one.borderToHatch(contourHatch_one);

  contourHatch_one.setAttributeInt('type',2);
  
  let hatchBlock = contourHatch_one.getHatchBlockArray()[0];
  
   let islandPoints_two = [  
    new VEC2.Vec2(-10, -10),
    new VEC2.Vec2(90, 10),
    new VEC2.Vec2(90, 90),
    new VEC2.Vec2(10, 90),
    new VEC2.Vec2(10, 10) 
  ];
  
  let island_two = UTIL.generateIslandFromCoordinates(islandPoints_two,true);
  
  let contourHatch_two = new HATCH.bsHatch();
  
  island_two.borderToHatch(contourHatch_two);
  
  let hatchblock_two = contourHatch_two.getHatchBlockArray()[0];
  
  
  let scannerReach = {};
  scannerReach['1'] = {
    xmin: 0,
    xmax: 100,
    extended_xmin: 0,
    extended_xmax: 140,
    ymin: 0,
    ymax: 100
  };
      
  let tileTable = {
    tileID : 1001,
    scannerReach: scannerReach,
    tile_height: 100
    };
   
  testInfo.addTest('testCreateOneIslands', 'should generate one test island ', generateOneTestIsland());
  testInfo.addTest('contour_1_allocateLaser1ToContour', 'test if correctly detects hathcblock in reach', contour_returnTrueWhenContourIsWithinReach(hatchBlock,tileTable));
  testInfo.addTest('contour_2_contourNotInReach', 'contour is not in reach', contour_contourNotInReach(hatchblock_two,tileTable));
  testInfo.addTest('contour_3_inReachOfLaserTwo', 'contour is not in reach', contour_inReachOfLaserTwo(hatchblock_two));
  testInfo.addTest('contour_4_inReachOfLaser1and2', 'contour is not in reach', contour_inReachOfLaser1and2(hatchblock_two));



  //testInfo.addTest('contour_assignHatchToOneLaserIfInReach', 'allocate hatch to one laser if fully in reach of laser', contour_assignHatchToOneLaserIfInReach(contourHatch_one,tileTable));
 // testInfo.addTest('ContourAllocation_checkIfContourIsWithinScanner',isIslandWithinScannerReach());
};

function generateOneTestIsland() {
  
  let expectedOutput = 1
  
  let islandPoints = [  
    new VEC2.Vec2(10, 10),
    new VEC2.Vec2(90, 10),
    new VEC2.Vec2(90, 90),
    new VEC2.Vec2(10, 90),
    new VEC2.Vec2(10, 10) 
  ];
  
  let Sc1MinX = 0;
  let Sc1MaxX = 100;
  let Sc1MinY = 0;
  let Sc1MaxY = 100;
  
  let islandPathset = new PATH_SET.bsPathSet().addNewPath(islandPoints);
  islandPathset.setClosed(true);
  
  let islands = new ISLAND.bsIsland();
  islands.addPathSet(islandPathset);
  
  return islands.getIslandCount() === expectedOutput;  
  
}

function contour_returnTrueWhenContourIsWithinReach(hatchBlock,tileTable){

  let expectedOutput = 1;
  
  let actualOutput = LASER.getLasersAbleToFullyReachContourWithinTile(hatchBlock,tileTable);

  return expectedOutput == actualOutput[0];
};

function contour_contourNotInReach(hatchBlock,tileTable){

  let expectedOutput = undefined;

  return expectedOutput === LASER.getLasersAbleToFullyReachContourWithinTile(hatchBlock,tileTable);
};

function contour_inReachOfLaserTwo(hatchBlock){

  let expectedOutput = 2;

    let scannerReach = {};
    scannerReach['1'] = {
      xmin: 0,
      xmax: 100,
      extended_xmin: 0,
      extended_xmax: 140,
      ymin: 0,
      ymax: 100
    };
      scannerReach['2'] = {
      xmin: -20,
      xmax: 100,
      extended_xmin: 0,
      extended_xmax: 140,
      ymin: -20,
      ymax: 100
    };
  
    let tileTable = {
    tileID : 1001,
    scannerReach: scannerReach,
    tile_height: 100
    };

  let actualOutput = LASER.getLasersAbleToFullyReachContourWithinTile(hatchBlock,tileTable);

  return expectedOutput == actualOutput[0];
};

function contour_inReachOfLaser1and2(){

  let expectedOutput1 = 1;
  let expectedOutput2 = 2;
  let expectedOutputLenght = 2;

  let islandOutline = [  
    new VEC2.Vec2(50, 50),
    new VEC2.Vec2(100, 50),
    new VEC2.Vec2(100, 100),
    new VEC2.Vec2(50, 100)
  ];
  
  let island = UTIL.generateIslandFromCoordinates(islandOutline,true);
  
  let contourHatch = new HATCH.bsHatch();
  
  island.borderToHatch(contourHatch);

  contourHatch.setAttributeInt('type',2);
  
  let hatchBlock = contourHatch.getHatchBlockArray()[0];

  let scannerReach = {};
  scannerReach['1'] = {
    xmin: 0,
    xmax: 100,
    extended_xmin: 0,
    extended_xmax: 140,
    ymin: 0,
    ymax: 100
  };
    scannerReach['2'] = {
    xmin: 50,
    xmax: 150,
    extended_xmin: 0,
    extended_xmax: 140,
    ymin: 50,
    ymax: 150
  };

  let tileTable = {
  tileID : 1001,
  scannerReach: scannerReach,
  tile_height: 100
  };

let actualOutput = LASER.getLasersAbleToFullyReachContourWithinTile(hatchBlock,tileTable);
let outputLength = actualOutput.length;

return expectedOutput1 === actualOutput[0] && expectedOutput2 === actualOutput[1] && outputLength == expectedOutputLenght;
};

function contour_assignHatchToOneLaserIfInReach(contourHatch,tileTable){
  
  let expectedOutput = 12;
  
  let hatchBlock = contourHatch.getHatchBlockArray()[0];
  
  LASER.assignSingleLaserResponsibility(hatchBlock,tileTable);
  
  let bsid = hatchBlock.getAttributeInt('bsid');
  
  return expectedOutput === bsid;
};


    

