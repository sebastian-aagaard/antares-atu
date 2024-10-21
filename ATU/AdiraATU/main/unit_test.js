/************************************************************
 * [Description]
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const UTIL = require('main/utility_functions.js');

// Main unit testing function
exports.unitTesting = function(testInfo) {
  // Feed in test suites for each function
  testGenerateUUID(testInfo);
  testInvertAngle(testInfo);
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

