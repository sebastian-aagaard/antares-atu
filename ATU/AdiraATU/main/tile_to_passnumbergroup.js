/************************************************************
 * tile2passnumbergroup
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';

// --------  INCLUDES -------- //
const HATCH = requireBuiltin('bsHatch');
const VEC2 = requireBuiltin('vec2');
const PATH_SET = requireBuiltin('bsPathSet');
const PARAM = requireBuiltin('bsParam');

exports.generatePassNumberGroup = (hatchObj) => {
  
  let passNumberGroups = {};

  let hatchArray = hatchObj.getHatchBlockArray();

  for (let i = 0; i<hatchArray.length;i++)
  {
      let passNumber = hatchArray[i].getAttributeInt('passNumber');
      
      if (!passNumberGroups[passNumber])
        {
          passNumberGroups[passNumber] = {
              'passExposureDuration': 0,
              'blocks': [hatchArray[i]]
          };
        } else {
          passNumberGroups[passNumber].blocks.push(hatchArray[i]);
        }
  }
 
return passNumberGroups;
  
} //generatePassNumberGroup