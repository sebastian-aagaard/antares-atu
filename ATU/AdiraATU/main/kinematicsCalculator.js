/************************************************************
 * Kinematics Calculator
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

const PARAM = requireBuiltin('bsParam');

/**
 * Calculates the final constant velocity V for a tile motion.
 *
 * The motion for each tile is assumed to have two phases:
 * 1. A (brief) constant acceleration phase starting from V0,
 * 2. Followed by a constant velocity phase.
 *
 * The distance length is covered in time, t_current. Depending on whether the current tile
 * duration t_current is shorter than the previous tile’s duration t_previous,
 * the system accelerates (if t_current < t_previous) or decelerates (if t_current > t_previous).
 *
 * The equation solved is:
 *    (V^2 - V0^2)/(2*a) + V*(T_current - (V-V0)/a) = L,
 * where a is chosen as:
 *    a = a_max  if t_current < t_previous  (accelerating)
 *    a = -a_max if t_current >= t_previous (decelerating)
 *
 * This leads to the quadratic solution:
 *    V = (a*t_current + V0) ± sqrt((a*t_current + V0)^2 - (v0^2 + 2*a*length))
 *
 * For acceleration (a > 0) we select the minus branch,
 * for deceleration (a < 0) we select the plus branch.
 *
 * @param {number} v0 - Initial velocity in mm/s.
 * @param {number} length - Tile distance in mm.
 * @param {number} t_current - Duration allocated for the current tile (s).
 * @param {number} t_previous - Duration of the previous tile (s).
 * @param {number} acceleration - Maximum acceleration magnitude in mm/s^2.
 * @returns {number} Final constant velocity V (mm/s).
 */
exports.calculateTileFinalVelocity = function(v0, length, t_current, t_previous, acceleration) {
  
  if(t_current === t_previous) {
    //check if acceleration is needed
    return v0
  }
  
  const t_current_s = t_current * 1e-6;
  const t_previous_s = t_previous * 1e-6;
      
  let accel_signed = t_current_s < t_previous_s ? acceleration : -acceleration;

  if(v0 === 0) accel_signed = acceleration; 

  // Compute the common term:
  const term = accel_signed * t_current_s + v0;
  // Compute the discriminant for the quadratic equation:
  const discriminant = term * term - (v0 * v0 + 2 * accel_signed * length);
  if (discriminant < 0) {
    process.printError("No real solution exists for these parameters.");
  }
  const sqrtDisc = Math.sqrt(discriminant);

  // Select the appropriate branch:
  // - For acceleration (acceleration > 0), use the minus sign.
  // - For deceleration (acceleration < 0), use the plus sign.
  let v;
  if (accel_signed > 0) {
    v = term - sqrtDisc;
  } else {
    v = term + sqrtDisc;
  }
  return v;
}

// ----- Example Usage -----