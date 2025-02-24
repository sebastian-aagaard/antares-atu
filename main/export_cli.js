/************************************************************
 * CLI format exporter.
 *
 * Copyright (c) 2021 Autodesk. All rights reserved. 
 *********************************************************** */
'use strict';
/** INTERNAL DATATYPE INCLUDES */
var BS_BOUNDS_2D = requireBuiltin('bsBounds2D');
var VEC2D = requireBuiltin("vec2");
var POLY_IT = requireBuiltin('bsPolylineIterator');
var ISLAND_IT = requireBuiltin('bsIslandIterator');
var ISLAND = requireBuiltin('bsIsland');
var MODEL = requireBuiltin('bsModel');
var FILE = requireBuiltin('bsFile');
/** SCRIPT INCLUDES */

/** Format version */
exports.version = {
  major : 2,
  minor : 0
}
Object.freeze(exports.version);

/** Export options */
exports.options = {
  geometry : 1, // export geometry data
  exposure : 2, // export exposure data
  buildPart : 4, // export build part data
  support : 8, // export support data
  binaryShort : 16, // binary short
  binaryLong : 32, // binary long
  ascii : 64, // ascii
  nonSolid : 128, // no solid geometry. Closed polygons will be written as open polylines.
  allAsHatch : 256 // all polyline edges are stored as hatch
}
Object.freeze(exports.options);

/** CLI export class constructor */
exports.cliExport = function(unit, options) 
{
  if (this instanceof module.exports.cliExport === false) {
    throw new Error("Constructor has to be called using 'new'");
    return;
  }
  
  this.mUnit = unit;
  this.mExportFlags = options;
}

/** Export item class */
exports.cliAttributeExportItem = function() 
{
  if (this instanceof module.exports.cliAttributeExportItem === false) {
    throw new Error("Constructor has to be called using 'new'");
    return;
  }

  this.sId = "";
  this.sName = "";
  this.bIsInt = false;  
}

/** Model label class */
function cliModelLabel() 
{
  if (this instanceof module.cliModelLabel === false) {
    throw new Error("Constructor has to be called using 'new'");
    return;
  }

  this.mId = 0;
  this.mName = "";
}

/** cliExport class members */
exports.cliExport.prototype.mLineFeed = "\n";
exports.cliExport.prototype.mUnit = 1;
exports.cliExport.prototype.mOutputPrecision = 5;
exports.cliExport.prototype.mZposOutputPrecision = 3;
exports.cliExport.prototype.mExportFlags = 0;
exports.cliExport.prototype.mExportModelIndex = -1;
exports.cliExport.prototype.mExportBounds = new BS_BOUNDS_2D.bsBounds2D();
exports.cliExport.prototype.mBoundsValid = false;
exports.cliExport.prototype.mExportAllAttributes = false;
exports.cliExport.prototype.m_aExportAttributes = new Array();
//exports.cliExport.prototype.mModelLabels = new Array();
exports.cliExport.prototype.mHeaderLines = new Array();
exports.cliExport.prototype.mDimensionInHeaderFilePos = 0;

// create fixed length header line for export bounds
exports.cliExport.prototype.create_fixed_length_dimension_headerline = function(a_zmin, a_zmax)
{
  var result_str = "$$DIMENSION/" + 
    this.mExportBounds.m_min.x.toFixed(this.mOutputPrecision) + "," +
    this.mExportBounds.m_min.y.toFixed(this.mOutputPrecision) + "," +
    a_zmin.toFixed(this.mZposOutputPrecision) + "," +
    this.mExportBounds.m_max.x.toFixed(this.mOutputPrecision) + "," +
    this.mExportBounds.m_max.y.toFixed(this.mOutputPrecision) + "," +
    a_zmax.toFixed(this.mZposOutputPrecision);
  
  var length = result_str.length;
  
  if(result_str.length > 128){
    throw new Error("Internal error: %%DIMENSION Headerline too long");
  }
  
  while(result_str.length < 128) {
    result_str += " ";
  }
  
  return result_str;
}

/**
* add a real build attribute for exporting (ascii mode only)
*/
exports.cliExport.prototype.addExportAttributeReal = function(sID, sName) 
{
    var item = new exports.cliAttributeExportItem();
    item.sId = sID;
    item.sName = sName;
    item.bIsInt = false;
    this.m_aExportAttributes.push(item);
}

/**
* add a integer build attribute for exporting (ascii mode only)
*/
exports.cliExport.prototype.addExportAttributeInt = function(sID, sName) 
{
    var item = new exports.cliAttributeExportItem();
    item.sId = sID;
    item.sName = sName;
    item.bIsInt = true;
    this.m_aExportAttributes.push(item);
}

/**
* add a custom line for the header
*/
exports.cliExport.prototype.addHeaderLine = function(sLine) 
{
    this.mHeaderLines.push(sLine);
}

/* cli export function. Writing all models from modelData.
* @param  cliFile         bsFile, export file
* @param  modelData       bsModelData, export data
* @param  progress        bsProgress, export progress (1 step per layer is applied)
*/ 
exports.cliExport.prototype.exportCli = function(cliFile, modelData, progress)
{
  var formatBinShort = (0 < (this.mExportFlags & exports.options.binaryShort));
  var formatBinLong = (0 < (this.mExportFlags & exports.options.binaryLong));
  var formatAscii = (0 < (this.mExportFlags & exports.options.ascii));

  if (!formatBinShort && !formatBinLong && !formatAscii) {
    throw new Error("binary format not specified.");
    return;
  }
  
  if ((formatBinShort && formatBinLong) ||
      (formatBinShort && formatAscii) || 
      (formatBinLong && formatAscii)) {
    throw new Error("binary format conflict.");
    return;
  }
  
  if(formatBinShort || formatBinLong)
  {
    cliFile.setEncoding(FILE.nEncodingBinaryLE);
  }
  else if(formatAscii)
  {
    cliFile.setEncoding(FILE.nEncodingAnsi);
  }
  
  this.mBoundsValid = false; // reset export bounds
  this.mExportBounds.m_min.x = 0.0;
  this.mExportBounds.m_max.x = 0.0;
  this.mExportBounds.m_min.y = 0.0;
  this.mExportBounds.m_max.y = 0.0;

  // Write CLI Header
  // ...
  cliFile.writeString("$$HEADERSTART" + this.mLineFeed); // Header Start Tag
  if(formatAscii){
    cliFile.writeString("$$ASCII" + this.mLineFeed); // ASCII CLI
  } else {
    cliFile.writeString("$$BINARY" + this.mLineFeed); // BINARY CLI
  }
  
  cliFile.writeString("$$UNITS/" + this.mUnit + this.mLineFeed); // Coordinate Unit is 1mm
  cliFile.writeString("$$VERSION/200" + this.mLineFeed); // CLI Format Version is 2.0

  // Write part label(s)
  if(-1 == this.mExportModelIndex)
  {
    let l_model_count = modelData.getModelCount();
    for(let l_model_idx = 0; l_model_idx < l_model_count; ++l_model_idx)
    {
      cliFile.writeString("$$LABEL/" + l_model_idx + ",part" + l_model_idx + this.mLineFeed);
    } // for
  }
  else
  {
    cliFile.writeString("$$LABEL/0,part0" + this.mLineFeed);
  }
  
  // Layer count:
  // A layer tag is written for each layer in modelData. Even if the layer in CLI will be empty.
  // So we report the total layer count
  cliFile.writeString("$$LAYERS/" + modelData.getLayerCount() + this.mLineFeed);
  
  // remember current file pos and write placeholder for dimension string
  this.mDimensionInHeaderFilePos = cliFile.tell();
  var dimension_str = this.create_fixed_length_dimension_headerline(0.0,0.0);
  cliFile.writeString(dimension_str + this.mLineFeed);
  
  for (var iHeader = 0; iHeader < this.mHeaderLines.length; iHeader++)
  {
    cliFile.writeString("$$" + this.mHeaderLines[iHeader] + this.mLineFeed);
  }
  
  // Header End Tag
  if(0 < (this.mExportFlags & exports.options.ascii)) {
    cliFile.writeString("$$HEADEREND" + this.mLineFeed);
    cliFile.writeString("$$GEOMETRYSTART" + this.mLineFeed);
  } else {
    cliFile.writeString("$$HEADEREND");
  }

  var status = true;
  
  var zpos_min;
  var zpos_max;
  
  // iterate through layers and write the data      
  for(var layerNr = 1; 
    status && (layerNr <= modelData.getLayerCount()) && !progress.cancelled(); 
    layerNr++)    
  {    
        var zPos = modelData.getLayerZ(layerNr); // get curent layer height
        
        this.writeLayerTag(cliFile, zPos); //
        
        var islandIt = modelData.getFirstIsland(layerNr);
                
        while(islandIt.isValid())
        { 
          if((-1 == this.mExportModelIndex) || (this.mExportModelIndex == islandIt.getModelIndex()) )
          {
            var islandType = islandIt.getModelSubtype();   // get part or support

            if(((MODEL.nSubtypePart == islandType)    && (0 != (this.mExportFlags & exports.options.buildPart)))
            || ((MODEL.nSubtypeSupport == islandType) && (0 != (this.mExportFlags & exports.options.support))))
            {            
              if(0 != (this.mExportFlags & exports.options.geometry))
              {
                // export island border polygons
                var polyIt = islandIt.getFirstPolyline(POLY_IT.nIslandBorderPolygons);
              
                while(polyIt.isValid())
                {         
                  if(POLY_IT.nPolyHatch == polyIt.getPolylineMode()) {
                    process.printInfo("invalid polyline style (hatch)");
                  }
                  else {
                    this.writePolyline(cliFile, polyIt, 
                      this.getExportModelId(islandIt.getModelIndex()));  //Returns the index of the part to which the intersection area belongs.
                    
                    // output zrange update
                    if(zpos_min === undefined) zpos_min = zPos;    
                     zpos_max = zPos;     
                  }
              
                  polyIt.next();
                }                            
              }
            }
          }  
          islandIt.next();
        } // for islands..
        
        if(0 != (this.mExportFlags & exports.options.exposure))
        {
          // process exposure polylines on layer
          var layerPolyIt = modelData.getFirstLayerPolyline(
            layerNr, POLY_IT.nLayerExposureInProcessingOrder); //Iterate over a layer’s exposure polylines. The iterator will follow the intended 
          //processing order of the exposure toolpaths. This order can be controlled by setting the attribute ‘_processing_order’ in a bsPolyline or 
          //bsHatch to an ascending integer sort key. 
          
          while(layerPolyIt.isValid())
          {
            if((-1 == this.mExportModelIndex) || (this.mExportModelIndex == layerPolyIt.getModelIndex()) )
            {
              var polyType = layerPolyIt.getModelSubtype();
            
              if( ((MODEL.nSubtypePart == polyType) && (0 != (this.mExportFlags & exports.options.buildPart)))
              || ((MODEL.nSubtypeSupport == polyType) && (0 != (this.mExportFlags & exports.options.support))))
              { 
                if(POLY_IT.nPolyHatch == layerPolyIt.getPolylineMode()) 
                {
                    this.writeHatch(cliFile, layerPolyIt, 
                      this.getExportModelId(layerPolyIt.getModelIndex()));
                }
                else 
                {
                    this.writePolyline(cliFile, layerPolyIt, 
                      this.getExportModelId(layerPolyIt.getModelIndex()));              
                }
         
                // output zrange update
                if(zpos_min === undefined) zpos_min = zPos;    
                 zpos_max = zPos;     
              }            
            }
            layerPolyIt.next();
          }//while
        }
        
        if(0 != (this.mExportFlags & exports.options.geometry))
        {
          // process build part polylines on layer outside islands
          var layerPolyIt 
            = modelData.getFirstLayerPolyline(layerNr, POLY_IT.nLayerOpenPolylines);
          
          while(layerPolyIt.isValid())
          {
            if((-1 == this.mExportModelIndex) || (this.mExportModelIndex == layerPolyIt.getModelIndex()) )
            {
              var polyType = layerPolyIt.getModelSubtype();

              if(((MODEL.nSubtypePart == polyType)    && (0 != (this.mExportFlags & exports.options.buildPart)))
              || ((MODEL.nSubtypeSupport == polyType) && (0 != (this.mExportFlags & exports.options.support))))
              { 
                if(POLY_IT.nPolyHatch == layerPolyIt.getPolylineMode())
                  this.writeHatch(cliFile, layerPolyIt, 
                    this.getExportModelId(layerPolyIt.getModelIndex()));
                else
                  this.writePolyline(cliFile, layerPolyIt, 
                    this.getExportModelId(layerPolyIt.getModelIndex()));               
                
                // output zrange update
                if(zpos_min === undefined) zpos_min = zPos;    
                 zpos_max = zPos;  
              }           
            }
            layerPolyIt.next();
          }//while
        }   

        progress.step(1);     
    } // for layers..
    
    // Geometry End Tag
    if(0 < (this.mExportFlags & exports.options.ascii)) {
      cliFile.writeString("$$GEOMETRYEND" + this.mLineFeed);
    }
    
    if(zpos_min === undefined) zpos_min = 0;   
    if(zpos_max === undefined) zpos_max = 0;   
    
    // write dimension in header
    cliFile.seek(this.mDimensionInHeaderFilePos, FILE.nSeekStart);
    dimension_str = this.create_fixed_length_dimension_headerline(zpos_min, zpos_max);
    cliFile.writeString(dimension_str + this.mLineFeed);
    cliFile.seek(0, FILE.nSeekEnd);

    if(0 != (this.mExportFlags & exports.options.binaryShort))
    {
      // check coordinates for binary short limitations
      if(this.mBoundsValid)
      {
        if((this.mExportBounds.m_min.x < 0.0) || (this.mExportBounds.m_min.y < 0.0)){
          throw new Error("Negative coordinates detected.");
        } 

        var intCoordX = Math.round(this.mExportBounds.m_max.x / this.mUnit);
        var intCoordY = Math.round(this.mExportBounds.m_max.y / this.mUnit);

        if((intCoordX > 0xffff) || (intCoordY > 0xffff)) {
          throw new Error("Coordinates exceed 16 bit range: (" 
            + intCoordX + "," + intCoordY + ") at unit " + this.mUnit);
        }
      }
    }    
}

////////////////////////////////////////////////////////////////////////////////
// Internal functions
////////////////////////////////////////////////////////////////////////////////

/** Get id for a part in file */
exports.cliExport.prototype.getExportModelId = function(model_id) {

  if(-1 == this.mExportModelIndex)
    return model_id; // exporting one of several models    
  return 0; // only one model in file. Id always 0
}

/** Write CLI layer tag */
exports.cliExport.prototype.writeLayerTag = function(cliFile, zPos) {

  if(0 < (this.mExportFlags & exports.options.binaryLong)) {

    var ci = 127;
    var z = zPos / this.mUnit;
    cliFile.writeUint16(ci);
    cliFile.writeFloat32(z);

  } else if(0 < (this.mExportFlags & exports.options.binaryShort)) {

    var ci = 128;
    var z = Math.round(zPos / this.mUnit);
    cliFile.writeUint16(ci);
    cliFile.writeUint16(z);

  } else {

    var z = zPos / this.mUnit;
    cliFile.writeString("$$LAYER/" + z.toFixed(this.mZposOutputPrecision) + this.mLineFeed);

  }    
}

/** Write a polyline */
exports.cliExport.prototype.writePolyline = function(
  cliFile, polyIt, partNumber) {    

  if(0 < (this.mExportFlags & exports.options.allAsHatch)) {
    // always write hatches
    if(0 < (this.mExportFlags & exports.options.binaryLong)) {

      this.writePolylineAsHatchLong(cliFile, polyIt, partNumber);

    } else if(0 < (this.mExportFlags & exports.options.binaryShort)) {

      this.writePolylineAsHatchShort(cliFile, polyIt, partNumber);

    } else {
      this.writePolylineAsHatchAscii(cliFile, polyIt, partNumber);
    }   
    return;
  }

  if(0 < (this.mExportFlags & exports.options.binaryLong)) {
    this.writePolylineLong(cliFile, polyIt, partNumber);

  } else if(0 < (this.mExportFlags & exports.options.binaryShort)) {
    this.writePolylineShort(cliFile, polyIt, partNumber);

  } else {
    this.writePolylineAscii(cliFile, polyIt, partNumber);
  }   
}

/** Write a polyline as hatch (16bit) */
exports.cliExport.prototype.writePolylineAsHatchShort = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();    
  if(numPoints < 2) {
    return;
  }
      
  var numHatches = numPoints;

  if(POLY_IT.nPolyOpen == polyIt.getPolylineMode()) {
    --numHatches;
  }

  var ci = 131;
  var id = partNumber;

  cliFile.writeUint16(ci);
  cliFile.writeUint16(id);
  cliFile.writeUint16(numHatches);

  var fileCoord;
  var index;
  for(var i=0; i < numHatches; ++i) {

    index = i;
    var vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));

    index = (i+1) % numPoints;
    vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));
  }
}

/** Write a polyline as hatch (32bit) */
exports.cliExport.prototype.writePolylineAsHatchLong = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();    
  if(numPoints < 2) {
    return;
  }
      
  var numHatches = numPoints;

  if(POLY_IT.nPolyOpen == polyIt.getPolylineMode()) {
    --numHatches;
  }

  var ci = 132;
  var id = partNumber;

  cliFile.writeUint16(ci);
  cliFile.writeInt32(id);
  cliFile.writeInt32(numHatches);

  var fileCoord;
  var index;
  for(var i=0; i < numHatches; ++i) {

    index = i;
    var vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);

    index = (i+1) % numPoints;
    vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);
  }
}

/** Write a polyline as hatch (ascii) */
exports.cliExport.prototype.writePolylineAsHatchAscii = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();     
  if(numPoints < 2) {
    return;
  }
      
  var numHatches = numPoints;

  if(POLY_IT.nPolyOpen == polyIt.getPolylineMode()) {
    --numHatches;
  }

  this.writeAttributesAscii(cliFile, polyIt);

  cliFile.writeString("$$HATCHES/" + partNumber + "," + numHatches); 

  var fileCoord1;
  var fileCoord2;
  for(var i=0; i < numHatches; ++i) { // this is where all hatch data is written

    var index = i;
    var vec = polyIt.getXYCoord(index);
    fileCoord1 = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);

    index = (i+1) % numPoints;
    vec = polyIt.getXYCoord(index);
    fileCoord2 = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);

    cliFile.writeString("," + 
      fileCoord1.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord1.y.toFixed(this.mOutputPrecision) + "," + 
      fileCoord2.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord2.y.toFixed(this.mOutputPrecision));
  }

  cliFile.writeString(this.mLineFeed);
}

/** Write a polyline (16bit) */
exports.cliExport.prototype.writePolylineShort = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
    
  if (0 == numPoints)
    return; // empty polyline

  var mode = polyIt.getPolylineMode();
  
  var dir = 2; // default: open line
  
  if((mode == POLY_IT.nPolyClosed) && (0 == (this.mExportFlags & exports.options.nonSolid)))
  {
    if(polyIt.isOutloop())
      dir = 1;
    else if(polyIt.isInloop())
      dir = 0;
  }
  
  var ci = 129;
  var id = partNumber;
  var outputPointCount = numPoints;
  
  if(mode == POLY_IT.nPolyClosed)
    outputPointCount++;

  cliFile.writeUint16(ci);
  cliFile.writeUint16(id);
  cliFile.writeUint16(dir);
  cliFile.writeUint16(outputPointCount);
  
  var fileCoord;
  for(var i=0; i < numPoints; ++i) {
    var vec = polyIt.getXYCoord(i);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));
  }
  
  if(mode == POLY_IT.nPolyClosed) {
    var vec = polyIt.getXYCoord(0);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));
  }
}

/** Write a polyline (32bit) */
exports.cliExport.prototype.writePolylineLong = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
    
  if (0 == numPoints)
    return; // empty polyline

  var mode = polyIt.getPolylineMode();
  
  var dir = 2; // default: open line
  
  if((mode == POLY_IT.nPolyClosed) && (0 == (this.mExportFlags & exports.options.nonSolid)))
  {
    if(polyIt.isOutloop())
      dir = 1;
    else if(polyIt.isInloop())
      dir = 0;
  }
  
  var ci = 130;
  var id = partNumber;
  var outputPointCount = numPoints;
  
  if(mode == POLY_IT.nPolyClosed)
    outputPointCount++;

  cliFile.writeUint16(ci);
  cliFile.writeInt32(id);
  cliFile.writeInt32(dir);
  cliFile.writeInt32(outputPointCount);
  
  var fileCoord;
  for(var i=0; i < numPoints; ++i) {
    var vec = polyIt.getXYCoord(i);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);
  }
  
  if(mode == POLY_IT.nPolyClosed) {
    var vec = polyIt.getXYCoord(0);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);
  }
}

/** Write a polyline (ascii) */
exports.cliExport.prototype.writePolylineAscii = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
    
  if (0 == numPoints)
    return; // empty polyline
        
  var mode = polyIt.getPolylineMode();
  
  var dir = 2; // default: open line
  
  if((mode == POLY_IT.nPolyClosed) && (0 == (this.mExportFlags & exports.options.nonSolid)))
  {
    if(polyIt.isOutloop())
      dir = 1;
    else if(polyIt.isInloop())
      dir = 0;
  }

  this.writeAttributesAscii(cliFile, polyIt);
  
  var outputPointCount = numPoints;
  
  if(mode == POLY_IT.nPolyClosed)
    outputPointCount++;
  
  cliFile.writeString("$$POLYLINE/" + partNumber + "," + dir + "," + outputPointCount);
  var fileCoord;
  for(var i=0; i < numPoints; ++i) {
    var vec = polyIt.getXYCoord(i);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeString("," + 
      fileCoord.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord.y.toFixed(this.mOutputPrecision));
  }
  
  if(mode == POLY_IT.nPolyClosed) {
    var vec = polyIt.getXYCoord(0);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeString("," + 
      fileCoord.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord.y.toFixed(this.mOutputPrecision) + this.mLineFeed);
  }
  else {
    cliFile.writeString(this.mLineFeed);
  }
}

/** Write a hatch */
exports.cliExport.prototype.writeHatch = function(
  cliFile, polyIt, partNumber)
{    
  if(0 < (this.mExportFlags & exports.options.binaryLong)) {
    this.writeHatchLong(cliFile, polyIt, partNumber);

  } else if(0 < (this.mExportFlags & exports.options.binaryShort)) {
    this.writeHatchShort(cliFile, polyIt, partNumber);

  } else {
    this.writeHatchAscii(cliFile, polyIt, partNumber);
  }   
}

/** Write a hatch (16bit) */
exports.cliExport.prototype.writeHatchShort = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
  
  if (2 > numPoints)
    return; // invalid hatch
      
  if (0 != numPoints % 2)
    numPoints--; // invalid point count (ignore last)
      
  var numHatches = numPoints/2;
  var ci = 131;
  var id = partNumber;

  cliFile.writeUint16(ci);
  cliFile.writeUint16(id);
  cliFile.writeUint16(numHatches);

  var fileCoord;
  var index;
  for(var i=0; i < numHatches; ++i) {

    index = i+i;
    var vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));

    ++index;
    vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeUint16(Math.round(fileCoord.x));
    cliFile.writeUint16(Math.round(fileCoord.y));
  }
}

/** Write a hatch (32bit) */
exports.cliExport.prototype.writeHatchLong = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
  
  if (2 > numPoints)
    return; // invalid hatch
      
  if (0 != numPoints % 2)
    numPoints--; // invalid point count (ignore last)
      
  var numHatches = numPoints/2;
  var ci = 132;
  var id = partNumber;

  cliFile.writeUint16(ci);
  cliFile.writeInt32(id);
  cliFile.writeInt32(numHatches);

  var fileCoord;
  var index;
  for(var i=0; i < numHatches; ++i) {

    index = i+i;
    var vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);

    ++index;
    vec = polyIt.getXYCoord(index);
    fileCoord = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);
    cliFile.writeFloat32(fileCoord.x);
    cliFile.writeFloat32(fileCoord.y);
  }
}

/** Write a hatch (ascii) */
exports.cliExport.prototype.writeHatchAscii = function(
  cliFile, polyIt, partNumber)
{    
  var numPoints = polyIt.getPointCount();
  
  if (2 > numPoints)
    return; // invalid hatch

  this.writeAttributesAscii(cliFile, polyIt);
      
  if (0 != numPoints % 2)
    numPoints--; // invalid point count (ignore last)
      
  var numHatches = numPoints/2;
  
  cliFile.writeString("$$HATCHES/" + partNumber + "," + numHatches);
  
  for(var i=0; i < numHatches; i++) {

    var vec = polyIt.getXYCoord(i+i);
    var fileCoord1 = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);

    vec = polyIt.getXYCoord(i+i+1);
    var fileCoord2 = this.convertToFileUnit(vec.x, vec.y);
    this.updateExportBounds(vec.x, vec.y);

    cliFile.writeString("," + 
      fileCoord1.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord1.y.toFixed(this.mOutputPrecision) + "," + 
      fileCoord2.x.toFixed(this.mOutputPrecision) + "," + 
      fileCoord2.y.toFixed(this.mOutputPrecision));
  }
  
  cliFile.writeString(this.mLineFeed);
}

/** Update export file extends */
exports.cliExport.prototype.updateExportBounds = function(aX, aY) { 

  if(!this.mBoundsValid){
    this.mExportBounds.m_min.x = aX;
    this.mExportBounds.m_max.x = aX;
    this.mExportBounds.m_min.y = aY;
    this.mExportBounds.m_max.y = aY;
    this.mBoundsValid = true;      
  } else {
    if(this.mExportBounds.m_max.x < aX) this.mExportBounds.m_max.x = aX;
    if(this.mExportBounds.m_min.x > aX) this.mExportBounds.m_min.x = aX;
    if(this.mExportBounds.m_max.y < aY) this.mExportBounds.m_max.y = aY;
    if(this.mExportBounds.m_min.y > aY) this.mExportBounds.m_min.y = aY;
  }
}

/** Convert coordinates to file unit */
exports.cliExport.prototype.convertToFileUnit = function(aX, aY) { 

  var result = {};
  result.x = aX / this.mUnit;
  result.y = aY / this.mUnit;
  
  if(0 < (this.mExportFlags & exports.options.binaryShort))
  {
    result.x = Math.round(result.x);
    result.y = Math.round(result.y);
    
    if((result.x < 0) || (result.y < 0))
    {
      throw new Error("Negative coordinates cannot be stored in binary short (16bit) CLI file");
    }
  }
  
  return result;
}

/** Write polyline attributes (ascii only) */
exports.cliExport.prototype.writeAttributesAscii = function(cliFile, iter) 
{
  if(this.mExportAllAttributes)
  {
    // write all attributes found in toolpath item
    var attrib_array = iter.getAllAttributes();
        
    for(var i = 0; i < attrib_array.length; ++i) 
    {
      if(attrib_array[i].uid === undefined) 
        throw new Error("Invalid attribute format: 'uid' not defined");
      
      var uid = attrib_array[i].uid;
      
      if(uid.substr(0,1) != "_") // skip predefined attributes
      {               
        // all attributes without leading "_"
        // So only those attributes are written out which were defined by the toolpath generating script
        
        if(attrib_array[i].fltValue !== undefined)
        {
          cliFile.writeString("$$" + uid + "/" + 
            attrib_array[i].fltValue.toFixed(this.mOutputPrecision) + this.mLineFeed);
        }
        else if(attrib_array[i].intValue !== undefined)
        {
          cliFile.writeString("$$" + uid + "/" + attrib_array[i].intValue + this.mLineFeed);
        }
        else
        {
          throw new Error("Unable to find type and value of attribute: " + attrib_array[i].toString());
        }
      }
    }
  }
  else
  {
    var path_attrib_array = iter.getAllAttributes();
        
    // only write the specified attributes
    var size = this.m_aExportAttributes.length;
    
    for(var i = 0; i < size; ++i) 
    {
      var attrib_id = this.m_aExportAttributes[i].sId;
      
      if(0 <= path_attrib_array.findIndex(
        function(element) {return element.uid === attrib_id;}
      ))
      {
        if(this.m_aExportAttributes[i].bIsInt) // write bsid and power
        {
          var value = iter.getAttributeInt(attrib_id);
          cliFile.writeString("$$" + this.m_aExportAttributes[i].sName + "/" + value + this.mLineFeed);
        } 
        else // write speed
        {        
          var value = iter.getAttributeReal(attrib_id); 
          cliFile.writeString("$$" + this.m_aExportAttributes[i].sName + "/" + 
            value.toFixed(this.mOutputPrecision) + this.mLineFeed);
        }
      }
    }  
  }
}
