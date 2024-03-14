/************************************************************
 * tile2passnumbergroup
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
var HATCH = requireBuiltin('bsHatch');
var VEC2 = requireBuiltin('vec2');
var PATH_SET = requireBuiltin('bsPathSet');
var PARAM = requireBuiltin('bsParam');

exports.generatePassNumberGroup = (hatchObj) =>{
  
let passNumberGroups = {};

let hatchArray = hatchObj.getHatchBlockArray();

for (let i = 0; i<hatchArray.length;i++)
{
    let thisBlock = hatchArray[i];
    let passNumber = thisBlock.getAttributeInt('passNumber');
    
    if (!passNumberGroups[passNumber]) 
	{
        passNumberGroups[passNumber] = {
            'passExposureDuration': 0,
            'blocks': [thisBlock]
        };
    } else {
        passNumberGroups[passNumber].blocks.push(thisBlock);
    }
}
 
return passNumberGroups;
  
} //generatePassNumberGroup