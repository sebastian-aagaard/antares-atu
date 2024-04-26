/************************************************************
 * Tieling
 *
 * @author Sebastian Aagaard
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// -------- INCLUDES -------- //

const PARAM = requireBuiltin('bsParam');
const PATH_SET = requireBuiltin('bsPathSet');
const VEC2 = requireBuiltin('vec2');
const MODEL = requireBuiltin('bsModel');

// -------- FUNCTIONS -------- //

// local
// getShiftX(layerNr)
// getShiftY(layerNr)
// getTilePos(x_pos,y_pos,overlap_x,overlap_y)

// public
// getTileArray(modelLayer,bDrawTile,layerNr)

////////////////////////////////
//   get tile shift in X      //
////////////////////////////////  

function getShiftX(layerNr) {
  
  let layerCount = PARAM.getParamInt('tileing', 'number_x');
  let shiftIncrement = PARAM.getParamReal('tileing', 'step_x');
  let middleLayer = Math.floor(layerCount / 2); // Determine the middle layer

  // Calculate the cycle position of the layer number
  let cyclePosition = layerNr % layerCount;
      
  // Calculate the distance from the middle layer
  let distanceFromMiddle = cyclePosition - middleLayer;
      
  // Compute the shift value based on the distance from the middle layer
  let shiftValue = distanceFromMiddle * shiftIncrement;
      
  return shiftValue;
}

////////////////////////////////
//   get tile shift in Y      //
////////////////////////////////  

function getShiftY(layerNr) {
  let layerCount = PARAM.getParamInt('tileing', 'number_y');
  let shiftIncrement = PARAM.getParamReal('tileing', 'step_y');
  let middleLayer = Math.floor(layerCount / 2); // Determine the middle layer

  // Calculate the cycle position of the layer number
  let cyclePosition = layerNr % layerCount;
     
  // Calculate the distance from the middle layer
  let distanceFromMiddle = cyclePosition - middleLayer;
     
  // Compute the shift value based on the distance from the middle layer
  let shiftValue = distanceFromMiddle * shiftIncrement;

  return shiftValue;
}

////////////////////////////////
//     get Tile Position      //
////////////////////////////////

// get all relevant information for the tiling providing the origin of the scanhead
function getTilePosition(x_pos,y_pos,overlap_x,overlap_y){
  
  if(typeof overlap_x === "undefined") overlap_x = PARAM.getParamReal('scanhead','tile_overlap_x');
  if(typeof overlap_y === "undefined") overlap_y = PARAM.getParamReal('scanhead','tile_overlap_y');
  
  this.xpos = x_pos;//-overlap_x/2;
  this.ypos = y_pos;//-overlap_y/2;
  this.x_min = this.xpos;// + PARAM.getParamReal('scanhead','x_scanner1_ref_mm') + PARAM.getParamReal('scanhead','x_scanner1_min_mm2');
  this.x_max = this.xpos + PARAM.getParamReal('scanhead','x_scanfield_size_mm');//(PARAM.getParamReal('scanhead','x_scanner5_ref_mm') + PARAM.getParamReal('scanhead','x_scanner5_max_mm2');
  this.y_min = this.ypos;// + PARAM.getParamReal('scanhead','stripe_ref_mm') + PARAM.getParamReal('scanhead','stripe_min_y_mm');
  
  if(PARAM.getParamInt('tileing','ScanningMode') == 0){ // moveandshoot     
    this.y_max = this.ypos + PARAM.getParamReal('scanhead','y_scanfield_size_mm'); 
    
    } else { //onthefly   
    
      this.y_max = this.ypos + PARAM.getParamReal('otf','tile_size');
  }  
    
  this.tile_height = this.y_max - this.y_min;
  this.tile_width =  this.x_max - this.x_min; 
    
  this.next_x_coord = this.xpos + this.tile_width + overlap_x;
  this.next_y_coord = this.ypos + this.tile_height + overlap_y;
    
}

exports.getTileArray = function(modelLayer,layerNr,modelData){
     
   //Calculate this layer shift in x and y 
   let shiftX = getShiftX(layerNr);
   let shiftY = getShiftY(layerNr);
      
   //Max distance shifted
   let maxShiftY = (PARAM.getParamInt('tileing', 'number_y')-1)*PARAM.getParamReal('tileing', 'step_y');
   let maxShiftX = (PARAM.getParamInt('tileing', 'number_x')-1)*PARAM.getParamReal('tileing', 'step_x');  
  // get coordinates of bounding box
  
   let minX,maxX,minY,maxY;
  
    try {
   
     let boundaries = modelData.getTrayAttribEx('allLayerBoundaries')
      minX = boundaries[layerNr][0];
      maxX = boundaries[layerNr][1];
      minY = boundaries[layerNr][2];
      maxY = boundaries[layerNr][3];
   
    } catch (err) {
     
       throw new Error('failed to access boundaries at layer nr: ' + layerNr); 
   
      }
  
   
  ////////////////////////////////
  // Define and store tiles     //
  ////////////////////////////////

  // calculate total scene size with shifts  
  let scene_size_x = (maxX - minX)+Math.abs(maxShiftX);
  let scene_size_y = (maxY - minY)+Math.abs(maxShiftY);
  
  //set scanhead starting position
  let scanhead_x_starting_pos = 0;
  let scanhead_y_starting_pos = 0;
   
  // find the tileOutlineOrigin if scannerarray positioned at origo (0,0)
  let tileOutlineOrigin = new getTilePosition(scanhead_x_starting_pos,scanhead_y_starting_pos); // get the tile layout information.
   
  // calculate the required tiles both in x and y (rounded up to make fit into whole passes)
  let required_passes_x = Math.ceil(scene_size_x/tileOutlineOrigin.tile_width);
  let required_passes_y = Math.ceil(scene_size_y/tileOutlineOrigin.tile_height);
   
  //get overlap
  let overlap_y = PARAM.getParamReal('scanhead','tile_overlap_y');
  let overlap_x = PARAM.getParamReal('scanhead','tile_overlap_x');
   
  // readjust required passes based on overlapping tiles
  if (required_passes_x > 1 && overlap_x!=0) {
   required_passes_x = Math.ceil(scene_size_x/(tileOutlineOrigin.tile_width+overlap_x));
  }
     
  if (required_passes_y > 1 && overlap_y!=0) {
    required_passes_y = Math.ceil(scene_size_y/(tileOutlineOrigin.tile_height+overlap_y));
  }  
     
  // find the actual starting position of the scanner_head (defined by the scenesize)
  let workarea_min_x = PARAM.getParamInt('workarea','x_workarea_min_mm');
  let workarea_min_y = PARAM.getParamInt('workarea','y_workarea_min_mm');
  let workarea_max_x = PARAM.getParamInt('workarea','x_workarea_max_mm');
  let workarea_max_y = PARAM.getParamInt('workarea','y_workarea_max_mm');  

   // check boundaries in y   
   let tile_reach_y = tileOutlineOrigin.tile_height*required_passes_y+overlap_y*(required_passes_y-1);  
           
   if((scene_size_y-PARAM.getParamReal('scanhead','y_scanfield_size_mm'))/2+minY < workarea_min_y ){ 
     // if the bounds are outside the powderbed force the tiling to start within // shouldn't happen
       scanhead_y_starting_pos = workarea_min_y;
     } else {
     scanhead_y_starting_pos = minY; //(scene_size_y-tile_reach_y)/2+minY; //minY;//
     }
    
     let maxPositionY = scanhead_y_starting_pos+tile_reach_y;
        
     if (maxPositionY > workarea_max_y)
       { // pull back the position with overshoot
         let yOverShoot = maxPositionY - workarea_max_y;
         scanhead_y_starting_pos -= yOverShoot;
       }
     
   // check boundaries in x   
   let tile_reach_x = tileOutlineOrigin.tile_width*required_passes_x+overlap_x*(required_passes_x-1); 
       
   if((scene_size_x-PARAM.getParamReal('scanhead','x_scanfield_size_mm'))/2+minX < workarea_min_x  ){
       scanhead_x_starting_pos = workarea_min_x ; // cannot scan outside 
   } else {
      scanhead_x_starting_pos = minX;//<- this code sets the xmin as starting pos (scene_size_x-tile_reach_x)/2+minX; <- this codes centers scanfield 
     }
   
   let maxPositionX = scanhead_x_starting_pos+tile_reach_x;
     
   if (maxPositionX > workarea_max_x)
     { // pull back the position with overshoot
       let xOverShoot = maxPositionX - workarea_max_x;
       scanhead_x_starting_pos -= xOverShoot;
     }
  
   // if the required passes STILL does not fit within the working area update the overlap bewteen tiles

  //x
  if(scanhead_x_starting_pos<workarea_min_x){
    let outsideby = scanhead_x_starting_pos-workarea_min_x; // calculate how much outside
    overlap_x = outsideby/(required_passes_x-1); //calculate overlap needed per pass
    scanhead_x_starting_pos = workarea_min_x; // set start to min x
  }
  
    //y
  if(scanhead_y_starting_pos<workarea_min_y){
    let outsideby = scanhead_y_starting_pos-workarea_min_y; // calculate how much outside
    overlap_y = outsideby/(required_passes_y-1); //calculate overlap needed per pass
    scanhead_y_starting_pos = workarea_min_y; // set start to min x
  }
     
   // offset starting position to allow shift in x and y // these are allowed to be outside the working area 
    scanhead_x_starting_pos -= maxShiftX/2;
    scanhead_y_starting_pos -= maxShiftY/2;
    
   //shift pos of tiles for each layer
   scanhead_x_starting_pos += shiftX;
   scanhead_y_starting_pos += shiftY; 
  
   // calulate the free distance (play) from the tile start to the part top and bottom
   let tileTable = [];  // to store the tilelayout
   let tileTable3mf = [];  // to store tiletable for 3mf exporter
     
   let cur_tile_coord_x =  scanhead_x_starting_pos;
   let cur_tile_coord_y =  scanhead_y_starting_pos;
  
  // run trough all the passes required  
  for (let i=0; i <required_passes_x; i++)
  {         
    let cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y,overlap_x,overlap_y);
    let next_tile_coord_x = cur_tile.next_x_coord;
     
    for(let j = 0; j<required_passes_y;j++)
    {       

      cur_tile = new getTilePosition(cur_tile_coord_x,cur_tile_coord_y,overlap_x,overlap_y);

      let thisTile = new PATH_SET.bsPathSet();
      
       let scanhead_outlines = new Array(4);
       scanhead_outlines[0] = new VEC2.Vec2(cur_tile.x_min, cur_tile.y_min); //min,min
       scanhead_outlines[1] = new VEC2.Vec2(cur_tile.x_min, cur_tile.y_max); //min,max
       scanhead_outlines[2] = new VEC2.Vec2(cur_tile.x_max, cur_tile.y_max); //max,max
       scanhead_outlines[3] = new VEC2.Vec2(cur_tile.x_max, cur_tile.y_min); //max,min
       scanhead_outlines[4] = new VEC2.Vec2(cur_tile.x_min, cur_tile.y_min); //min,min   
      
           
      // dataToPass
      var tile_obj = new Object();
      tile_obj.passNumber = i+1; 
      tile_obj.tile_number = j+1; 
      tile_obj.scanhead_outline = scanhead_outlines;
      tile_obj.scanhead_x_coord = cur_tile_coord_x;
      tile_obj.scanhead_y_coord = cur_tile_coord_y;
      tile_obj.tile_height = cur_tile.tile_height;
      tile_obj.overlapX = overlap_x;
      tile_obj.overlapY = overlap_y;
      tile_obj.shiftX = shiftX;
      tile_obj.shiftY = shiftY;
      tile_obj.layer = layerNr;
      tileTable.push(tile_obj);
       
       let defaultSpeedY;
       if(PARAM.getParamInt('tileing','ScanningMode') == 0) { // moveandshoot
          defaultSpeedY = PARAM.getParamInt('movementSettings','sequencetransfer_speed_mms');
       } else { //onthefly
          defaultSpeedY = PARAM.getParamReal('otf','axis_max_speed');
       }
       
       //3mf data:
       var tile3mf = new Object;
       let TileEntry3mf = {
         "name": "movement",
         "attributes": {
            "tileID": j+1+(i+1)*1000,
            "xcoord": cur_tile_coord_x ,
            "ycoord": cur_tile_coord_y,
            "targetx": 0,
            "targety": 0,
            "positiony": cur_tile_coord_y,
            "speedx" : 0,
            "speedy": defaultSpeedY,
            "tileExposureTime" : 0
         }
       };
       if (!tileTable3mf[i]) tileTable3mf[i] = [];
       
       tileTable3mf[i].push(TileEntry3mf);
      
      cur_tile_coord_y = cur_tile.next_y_coord;
    }
    
    cur_tile_coord_y = scanhead_y_starting_pos; // resest y coord
    cur_tile_coord_x = next_tile_coord_x; // set next stripe pass
  }
  
  modelLayer.setAttribEx('tileTable',tileTable);
  modelLayer.setAttribEx('tileTable_3mf',tileTable3mf);
  //modelLayer.setAttrib('requiredPassesX',required_passes_x.toString());
  //modelLayer.setAttrib('requiredPassesY',required_passes_y.toString());
} // getTileArray