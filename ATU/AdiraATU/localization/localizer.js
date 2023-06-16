/************************************************************
 * [Description]
 *
 * @author []
 * Copyright (c). All rights reserved.
 *********************************************************** */
'use strict';


var FILE = requireBuiltin('bsFile');

var language_modules = {};
var language_modules_loaded = false;

// Get localized message for given id
exports.GetMessage = function(a_sId)
{
  if(!language_modules_loaded)
  {
    LoadLanguageModule('en', 'localization/lang_en.json');
    LoadLanguageModule('de', 'localization/lang_de.json');
    LoadLanguageModule('ja', 'localization/lang_ja.json');
    LoadLanguageModule('ko', 'localization/lang_ko.json');
    LoadLanguageModule('zh-Hans', 'localization/lang_zh-Hans.json');
    LoadLanguageModule('zh-Hant', 'localization/lang_zh-Hant.json');
    LoadLanguageModule('es', 'localization/lang_es.json');
    LoadLanguageModule('fr', 'localization/lang_fr.json');
    LoadLanguageModule('pt-BR', 'localization/lang_pt-BR.json');
    
    language_modules_loaded = true;
  }
  
  var language = language_modules[process.language];
  
  if(language === undefined)
  {
    // for an unsupported language: Defaulting to English
    language = language_modules['en'];
  }
  
  if(language !== undefined)
  {
    if(language[a_sId] !== undefined)
    {
      return language[a_sId];
    }
    else
    {
      // no message found for given id
    }
  }
  
  throw new Error(
    "Missing localized string [" + a_sId + "] for language [" + process.language + "]");
}

// Load a language module from a json file
var LoadLanguageModule = function(a_sLanguageId, a_sJsonFileName)
{
  var lang_file = new FILE.bsFile();
  
  if(FILE.OpenFileFromBuildstyleLib(a_sJsonFileName, lang_file, FILE.nEncodingUTF8))
  {
    let json_str = lang_file.readSubStr(-1);
    language_modules[a_sLanguageId] = JSON.parse(json_str);
  }
  else
  {
    throw new Error("Failed to load file '" + a_sJsonFileName + "'");
  }
}

