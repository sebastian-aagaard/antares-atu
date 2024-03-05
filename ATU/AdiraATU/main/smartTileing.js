/************************************************************
 * [Description]
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// // smart tileing
//function smartLaserWorkload(hatchObj, modelData, scanheadArray, tileArray, required_passes_x, required_passes_y, nLayerNr, vec2_tile_array, tileSegmentArr) {
// 
//  	let curHatch = new HATCH.bsHatch();
//  	curHatch.moveDataFrom(hatchObj);
//  
//  	let hatchIt = curHatch.getHatchBlockIterator();
//  	let activeLasers = new Array();
// 	let zoneWorkload = new Array();
//  	var clipArray = new Array();
//  	let clipIt = 0;
// 	while (hatchIt.isValid()) {
// 		let thisHatch = new HATCH.bsHatch();
// 		thisHatch = hatchIt.get();
// 
// 		let zoneIndex = thisHatch.getAttributeInt('zoneIndex');
// 		//let thisWorkload = thisHatch.getAttributeReal('zoneExposure');
// 		let thisSharedZone = thisHatch.getAttributeInt('sharedZone');
// 		//var laserCount = PARAM.getParamInt('exposure', 'laser_count');
// 
// 		if (thisSharedZone > 0) {
// 			for (let curLaserId = 0; curLaserId < laser_count; curLaserId++) {
// 				activeLasers[curLaserId] = thisHatch.getAttributeInt('laser_index_' + (curLaserId + 1));
// 
// 			}
// 
// 			// subdivide each sharedzone into smaller zones to allow smart sorting
// 			let zoneBounds = new BOUNDS.bsBounds2D();
// 			zoneBounds = thisHatch.getBounds2D();
// 
// 			let zoneMinY = zoneBounds.m_min.y;
// 			let zoneMaxY = zoneBounds.m_max.y;
// 
// 			let zoneLengthX = zoneBounds.m_max.x - zoneBounds.m_min.x;
// 			let subdivsizeX = 50;
// 			let subdivcount = Math.ceil(zoneLengthX / subdivsizeX);
// 			let subdivHatch = new HATCH.bsHatch();
// 
// 
// 
// 			for (let subdivIt = 0; subdivIt < subdivcount; subdivIt++) {
// 				if (subdivIt == subdivcount - 1) {
// 					let subdivMinX = zoneBounds.m_min.x + subdivIt * subdivsizeX;
// 					let subdivMaxX = zoneBounds.m_max.x;
// 
// 				} else {
// 					let subdivMinX = zoneBounds.m_min.x + subdivIt * subdivsizeX;
// 					let subdivMaxX = subdivMinX + subdivsizeX;
// 
// 				}
// 
// 				//          let subdivMinX = zoneBounds.m_min.x + subdivIt*subdivsizeX;
// 				//          let subdivMaxX = subdivMinX + subdivsizeX;          
// 
// 				let subdivPoints = new Array();
// 				subdivPoints[0] = new VEC2.Vec2(subdivMinX, zoneMinY); //min,min
// 				subdivPoints[1] = new VEC2.Vec2(subdivMinX, zoneMaxY); //min,max
// 				subdivPoints[2] = new VEC2.Vec2(subdivMaxX, zoneMaxY); //max,max
// 				subdivPoints[3] = new VEC2.Vec2(subdivMaxX, zoneMinY); //max,min
// 
// 				clipArray[clipIt++] = subdivPoints;
// 			}
// 		}
// 		hatchIt.next();
//  	}
// 
//  	// Clip hatches by clipArray subdivide to subhatch
//  	for (let i = 0; i < clipArray.length; i++) {
// 
// 		let clipHatch = new HATCH.bsHatch();
// 		let clipHatchOutside = new HATCH.bsHatch();
// 
// 		let clipZonePathset = new PATH_SET.bsPathSet(); // generate pathset object
// 		clipZonePathset.addNewPath(clipArray[i]); // add tiles zones to pathset  
// 		clipZonePathset.setClosed(true); // set the zones to closed polygons
// 		let clippingiIsland = new ISLAND.bsIsland(); // generate island object
// 		clippingiIsland.addPathSet(clipZonePathset); // add pathset as new island
// 		clipHatch = curHatch.clone(); // clone overall hatching
// 		clipHatchOutside = curHatch.clone(); // clone overall hatching
// 		curHatch.makeEmpty(); // empty the container to refill it later
// 
// 		clipHatch.clip(clippingiIsland, true); // clip the hatching with the tile_islands
// 		clipHatchOutside.clip(clippingiIsland, false); // get ouside of currentzone
// 
// 		curHatch.moveDataFrom(clipHatch);
// 		curHatch.moveDataFrom(clipHatchOutside);
//  	}
//  
//  	// add exposure for all zones
//  	let hatchIt2 = curHatch.getHatchBlockIterator();
//  	while (hatchIt2.isValid()) {
// 		let thisHatch = new HATCH.bsHatch();
// 		thisHatch = hatchIt2.get();
// 
// 		let thisExposureDuration = new EXPOSURETIME.bsExposureTime();
// 		thisExposureDuration.configure(modelData.getTrayAttribEx('exposureSettings'));
// 		thisExposureDuration.addHatchBlock(thisHatch);
// 		thisHatch.setAttributeInt('zoneExposure', thisExposureDuration.getExposureTimeMicroSeconds());
// 
// 		hatchIt2.next();
// 	}
// 
//  	// createZoneObjects  
// 	function setLaserObjects(laserId) {
// 		this.id = laserId;
// 		this.workload = 0;
// 	}
//  
// 	var lasers = new Array();
// 	for (let i = 0; i < laserCount; i++) {
// 		lasers[i] = new setLaserObjects(i);
// 	}
// 
//  	function setZoneProperties(hatchBlock, iterator) {
// 		this.hatch = hatchBlock;
// 		this.zoneDuration = hatchBlock.getAttributeInt('zoneExposure');
// 		this.passNumber = hatchBlock.getAttributeInt('passNumber');
// 		this.zoneID = iterator;
// 		hatchBlock.setAttributeInt('zoneIndex', iterator);
// 		let lasersInReach = new Array;
// 
// 		for (let i = 0; i < laserCount; i++) {
// 
// 			let laserID = hatchBlock.getAttributeInt('laser_index_' + (i + 1));
// 
// 			if (laserID > 0) {
// 				lasersInReach.push(i);
// 			}
// 		}
// 
// 		this.reachableBy = lasersInReach;
// 		this.bsid = null;
//  	}
//  
//  //	var laser_color = new Array();
//  //	laser_color = modelData.getTrayAttribEx('laser_color'); // retrive laser_color 
//   var laser_color = thisModel.getTrayAttribEx('laser_color'); // retrive laser_color 
//  	//run trough each scanzone looking at the entire width
//  
//  	let smartHatch = new HATCH.bsHatch();
//  
//  	for (let tileIt = 0; tileIt < required_passes_y; tileIt++) // clip into fullwidth tiles
//  	{
//  
// 		let tile_x_min = tileArray[tileIt * required_passes_x].scanhead_outline[0].m_coord[0];
// 		let tile_y_min = tileArray[tileIt * required_passes_x].scanhead_outline[0].m_coord[1];
// 
// 		// get max coordinates for full width tile
// 		let tile_x_max = tileArray[(tileIt + 1) * required_passes_x - 1].scanhead_outline[2].m_coord[0];
// 		let tile_y_max = tileArray[(tileIt + 1) * required_passes_x - 1].scanhead_outline[2].m_coord[1];
// 
// 		let fullWidthClip = new Array();
// 		fullWidthClip[0] = new VEC2.Vec2(tile_x_min, tile_y_min); //min,min
// 		fullWidthClip[1] = new VEC2.Vec2(tile_x_min, tile_y_max); //min,max
// 		fullWidthClip[2] = new VEC2.Vec2(tile_x_max, tile_y_max); //max,max
// 		fullWidthClip[3] = new VEC2.Vec2(tile_x_max, tile_y_min); //max,min
// 
// 		let hatchBlockArr = new HATCH.bsHatch();
// 		let clippedHatch = ClipHatchByRect(curHatch, fullWidthClip);
// // 
// 		// sort hatchblocks
// 		var args = {
// 			sSegRegionFillingMode: "PositiveX",
// 			bInvertFillingSequence: false,
// 			fSegRegionFillingGridSize: 0.0,
// 			sSetAssignedRegionIndexMemberName: "regionIndex"
// 		};
// 
// 		clippedHatch.sortHatchBlocksForMinDistToSegments(tileSegmentArr, 0, args);
// 		hatchBlockArr = clippedHatch.getHatchBlockArray();
// 
// 		var smartZones = new Array();
// 		for (let i = 0; i < hatchBlockArr.length; i++) {
// 			smartZones[i] = new setZoneProperties(hatchBlockArr[i], i);
// 		}
// 
//  		// Sort zones by zoneDuration in descending order within each fulltile
//  		smartZones.sort(function(a, b) {
//       return b.zoneDuration - a.zoneDuration;
//     });
//   }
// 
// 		// Group smartZones by passNumber
// 		let passGroups = {};
// 		let passMaxDurations = {};
// 		for (let x = 0; x < smartZones.length; x++) {
// 			let curZone = smartZones[x];
// 			if (!passGroups[curZone.passNumber]) {
// 				passGroups[curZone.passNumber] = [];
// 			}
// 			passGroups[curZone.passNumber].push(curZone);
// 			passMaxDurations[curZone.passNumber] = Math.max(passMaxDurations[curZone.passNumber], curZone.zoneDuration);
// 		}
// 
// 		let passZones = new Array();
// 		// iterate through and divdie workload within each pass
// 		for (let passNumber = 0; passNumber < required_passes_x; passNumber++) {
// 			passZones = passGroups[passNumber];
// 			if (!passZones) {continue}; // if no zones for this passNumber, skip to the next passNumber
// 			let temp = 1;
//     
//        
//  			for (let x = 0; x < passZones.length; x++) {
// 				let curZone = passZones[x];
// 
// 				// If a laser has already been assigned to this zone, skip to the next zone
// 				if (curZone.bsid) continue;
// 
// 				// what lasers are capable of reaching the current zone  
// 				var capableLasers = curZone.reachableBy.map(function(id) {
//           return lasers.find(function(laser) {
//             return laser.id === id;
//           });
//         });
// 
// 
// 				let minWorkloadLaser;
// 				let minWorkload = Infinity;
// 				let lastTaskZone = null;
// 
// 				for (let j = 0; j < capableLasers.length; j++) { // rund through capabale lasers
// 					let laser = capableLasers[j];
// 
// 					// if the workload of the laser is less than current minWorkload
// 					// or if the laser's last task was the immediate neighbour of the current zone (i.e., curZone),
// 					// update the minWorkload and minWorkloadLaser
// 					if (laser.workload < minWorkload || (laser.lastTask && laser.lastTask.id === curZone.id - 1)) {
// 						minWorkload = laser.workload;
// 						minWorkloadLaser = laser;
// 						lastTaskZone = laser.lastTask;
// 					} //if
// 				} //for
// 
// 
// 				minWorkloadLaser.workload += curZone.zoneDuration;
// 				minWorkloadLaser.lastTask = curZone; // Update the last task of this laser  
// 
// 				// set 
// 
// 				curZone.bsid = (minWorkloadLaser.id + 1) * 10; // Assign bsid to the task based on the assigned laser's id        
// 				curZone.hatch.setAttributeInt('bsid', curZone.bsid);
// 				curZone.hatch.setAttributeInt('_disp_color', laser_color[minWorkloadLaser.id]);
// 
// 			// get the tile duration, by finding the longest required for most worked laser 
// 			// After assigning all tasks, find the laser with max duration
// 			let laserWithMaxDuration = lasers[0];
// 			for (let i = 1; i < lasers.length; i++) {
// 				if (lasers[i].workload > laserWithMaxDuration.workload) {
// 					laserWithMaxDuration = lasers[i];
// 				}
// 			}
// 
// 			let maxLaserDuration = laserWithMaxDuration.workload;
// 
// 
// 			for (let i = 0; i < passZones.length; i++) {
// 				let curZone = passZones[i];
// 				curZone.hatch.setAttributeInt('tileDuration', maxLaserDuration);
// 				smartHatch.addHatchBlock(curZone.hatch);
// 			}
//     } //for
//   }
//        
// 	hatchObj.moveDataFrom(smartHatch);
// 	return hatchObj;
// } // smartTileing