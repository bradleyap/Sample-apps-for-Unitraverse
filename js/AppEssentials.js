/*
   Copyright 2018 Bradley A. Pliam

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

//AppEssentials.js - shared data and methods for the Unitraverse platform

//DO NOT RENAME OR DELETE 'SharedGlobal' WITHOUT CONSIDERING IMPACT ON ALL EXTERNAL USERS
var SharedGlobal = {};
SharedGlobal.tic = new TabIdCollector(); 
SharedGlobal.core = null;
SharedGlobal.getResourceItemsHTML = getResourceItemsHTML;
SharedGlobal.objects = {};
SharedGlobal.utils = {};
SharedGlobal.utils.nlp = {};
SharedGlobal.utils.gfx = {};
SharedGlobal.popups = {};

var DefaultFormat = {};
DefaultFormat.borderTweaks = [];
DefaultFormat.currentFSObject = null;
DefaultFormat.AllPurposeTOCInputFile = "";
DefaultFormat.AllPurposeTOCLineSelectionHTML = "";
DefaultFormat.AllPurposeTOCFullyInstalled = false;

var OutlineFormatter = {};
OutlineFormatter.lineCount = 0;
OutlineFormatter.currentLevel = 0;
OutlineFormatter.currentLine = -1;
OutlineFormatter.linesMap = {};
OutlineFormatter.sessionLinesMap = {};
OutlineFormatter.lineIdPrefix = "line-";

var StyleWorkbench = {};
StyleWorkbench.favoriteVaultPageColors = ["#aa8aff","#00ddff","#ffff33","#99ff00","#ff00aa","ffdd00","#6600aa"];
StyleWorkbench.onWhiteColorList = ['purple','orange','#88dd88','#ff0088','#00ccff','#448800','#bbbb00','#0000aa','#ff7755','#cc0000','#990000','#aa5599','#aa8800'];
StyleWorkbench.tokenOnWhiteIdxMap = {};

EntityManager = {};


////////// SharedGlobal APIs /////////////

function TabIdCollector(){
  this.platformIdCount = 0;
  this.resIdCount = 0;
  this.tabIdsBuffer = [];
  this.push = function(id,designation){
    this.tabIdsBuffer[this.tabIdsBuffer.length] = id;
    if(typeof designation === 'undefined'){
      return;
    }
    if(designation === 'platform'){
      this.platformIdCount++;
    }
    if(designation === 'resource'){
      this.resIdCount++;
    }
  }
  this.getNonResIdCount = function(){
    return this.tabIdsBuffer.length - (this.platformIdCount + this.resIdCount); 
  }
  this.getResIdCount = function(){
    return this.resIdCount;
  }
  this.reset = function(arr){
    this.resIdCount = 0;
    this.platformIdCount = 0;
    this.tabIdsBuffer = arr;
  }
}

SharedGlobal.objects.SnippetArtifact = function(){
  this.type = "";
  this.style = "def-snippet";
} 

SharedGlobal.utils.getCopyOfMap = function(srcMap){
  return JSON.parse(JSON.stringify(srcMap));
}

SharedGlobal.utils.pointIsInRect = function(x,y,r){
  if(r.left <= x && r.right >= x && r.top <= y && r.bottom >= y)return true;
  return false;
}

var spinner = {};

SharedGlobal.utils.nlp.isHighOccurrenceLowDomainSignificance = function(word){
  var w = word.toLowerCase();
  //if(w.length < 3)return true;
  if(w === 'a')return true;
  if(w === 'the' || w === 'an' || w === 'some')return true;
  if(w === 'of' || w === 'for' || w === 'in' || w === 'with' || w === 'without' || w === 'on' || w === 'around' || w === 'from' || w === 'through' || w === 'at' || w === 'to')return true;
  if(w === 'do' || w === 'does' || w === 'did' || w === 'doesn\'t' || w === 'don\'t')return true;
  if(w === 'make' || w === 'made')return true;
  if(w === 'is' || w === 'are'|| w === 'isn\'t' || w === 'should' || w === 'would' || w === 'could' || w === 'be' || w === 'been' || w === 'not')return true;
  if(w === 'has' || w === 'have' || w === 'posesses' || w === 'gives' || w === 'given')return true;
  if(w === 'yet')return true;
  if(w === 'you' || w === 'they' || w === 'them' || w === 'themselves' || w === 'our' || w === 'him' || w === 'her' || w === 'himself' || w === 'herself')return true;
  return false;
}


////////// shared Outline Formatter code /////////////

OutlineFormatter.initializeOutlineFormatterForClientApplet = function(linesMap){
  OutlineFormatter.linesMap = linesMap;
  var sLinesMap = OutlineFormatter.sessionLinesMap = {};
  var prefix = OutlineFormatter.indexIdPrefix;
  var elmt = null;
  var keyArr = Object.keys(linesMap);
  for(var i=0; i<keyArr.length; i++){
    elmt = document.getElementById(prefix + Number(keyArr[i]).toString());
    if(elmt){
      slmEntry = {};
      slmEntry.element = elmt;
      slmEntry.origTxt = element.innerHTML;
      sLinesMap[keyArr[i]] = slmEntry;
    }
  } 
}

OutlineFormatter.getDefaultOLFormattingRulesObjectsArray = function(){
return [
	{header:false,itemization:"none",itemization_decorators:"period",global_itemization:false,italic:true,caps:"as is",font_size:"auto",indent:"none"},
	{header:true,itemization:"none",itemization_decorators:"period",global_itemization:false,italic:false,caps:"all",font_size:"auto",indent:"none"},
	{header:false,itemization:"none",itemization_decorators:"period",global_itemization:true,italic:false,caps:"as is",font_size:"auto",indent:"auto"},
	{header:false,itemization:"none",itemization_decorators:"period",global_itemization:false,italic: true,caps:"as is",font_size:"auto",indent:"auto"}
    ];
}

OutlineFormatter.removeMenuitems = function(){
  var lst = [];
  lst[0] = {"group":"applet","commandSequence":"outline_increase indents","visible":false};
  lst[1] = {"group":"applet","commandSequence":"outline_decrease indents","visible":false};
  lst[2] = {"group":"applet","commandSequence":"outline_meld line","visible":false};
  lst[3] = {"group":"applet","commandSequence":"outline_deselect line","visible":false};
  lst[4] = {"group":"applet","commandSequence":"outline","visible":false};
  var wndIdx = SharedGlobal.core.getActivePaneIndex(); 
  SharedGlobal.core.setMenuitemVisibilityFromList(wndIdx,lst);
}

OutlineFormatter.setupMenuitems = function(){
  var core = SharedGlobal.core;
  var windowIdx = core.getActivePaneIndex();
  core.setupResponsiveMenuitem(windowIdx,'applet','outline_increase indents','anyregion',null,'','',this.handleAddIndents);
  core.setupResponsiveMenuitem(windowIdx,'applet','outline_decrease indents','anyregion',null,'','',this.handleRemoveIndents);
  core.setupResponsiveMenuitem(windowIdx,'applet','outline_meld line','anyregion',null,'','',this.handleMeldLine);
  core.setupResponsiveMenuitem(windowIdx,'applet','outline_deselect line','anyregion',null,'','',this.handleDeselectLine);
  var lst = [];
  lst[0] = {"group":"applet","commandSequence":"outline_increase indents","visible":true};
  lst[1] = {"group":"applet","commandSequence":"outline_decrease indents","visible":true};
  lst[2] = {"group":"applet","commandSequence":"outline_meld line","visible":true};
  lst[3] = {"group":"applet","commandSequence":"outline_deselect line","visible":true};
  lst[4] = {"group":"applet","commandSequence":"outline","visible":true};
  var wndIdx = core.getActivePaneIndex(); 
  SharedGlobal.core.setMenuitemVisibilityFromList(wndIdx,lst);
}

OutlineFormatter.handleAddIndents = function(){
  var lineId = OutlineFormatter.currentLine;
  if(lineId > -1){
    var slmEntry = OutlineFormatter.sessionLinesMap[lineId];
    slmEntry.level++;      
    OutlineFormatter.currentLevel = slmEntry.level;
    updateSelectedLineFormatHTML(slmEntry,true);
    updateClientLinesMapEntryFromSessionEntry(slmEntry,lineId);
    SharedGlobal.core['promptToSave']();
  }
}

OutlineFormatter.handleRemoveIndents = function(){
  var lineId = OutlineFormatter.currentLine;
  if(lineId > -1){
    var slmEntry = OutlineFormatter.sessionLinesMap[lineId];
    if(slmEntry.level > 0)slmEntry.level--;      
    OutlineFormatter.currentLevel = slmEntry.level;
    updateSelectedLineFormatHTML(slmEntry,true);
    updateClientLinesMapEntryFromSessionEntry(slmEntry,lineId);
    SharedGlobal.core['promptToSave']();
  }
}

OutlineFormatter.handleMeldLine = function(){
  var lineId = OutlineFormatter.currentLine;
  if(lineId < 2)return;
  var slmEntry = OutlineFormatter.sessionLinesMap[lineId];
  var prevLmEntry = OutlineFormatter.sessionLinesMap[lineId - 1];
  if(typeof slmEntry === 'undefined')return;
  if(typeof prevLmEntry === 'undefined')return;
  slmEntry.meld = true;
  slmEntry.level = prevLmEntry.level;
  updateSelectedLineFormatHTML(slmEntry,true);
  updateClientLinesMapEntryFromSessionEntry(slmEntry,lineId);
  SharedGlobal.core['promptToSave']();
}

OutlineFormatter.handleDeselectLine = function(){
  var lineId = OutlineFormatter.currentLine;
  var defClassName = "selectable-line";
  if(lineId > -1){
    var slm = OutlineFormatter.sessionLinesMap;
    if(!slm.hasOwnProperty(lineId))return;
    var slmEntry = slm[lineId]; 
    if(typeof slmEntry === 'undefined')return;
    if(slmEntry.element){
      slmEntry.element.className = defClassName;
      slmEntry.element.innerHTML = slmEntry.origTxt;
      slmEntry.element.style.borderColor = "white";
      slmEntry.element.style.backgroundColor = "white";
      slmEntry.element.style.color = "#565699"; 
    }
    delete slm[lineId];
    updateClientLinesMapEntryFromSessionEntry(null,lineId);
    SharedGlobal.core['promptToSave']();
  }
}

function passKeyDownToOutlineFormatter(e){
  var handled = false;
  var keycode = SharedGlobal.core['getKeycodeFromEvent'](e);
  if(keycode === 'ArrowRight' || keycode === 'Right'){
    OutlineFormatter.handleAddIndents();
    handled = true;
  }
  if(keycode === 'ArrowLeft' || keycode === 'Left'){
    OutlineFormatter.handleRemoveIndents();
    handled = true;
  }
  return handled;
}

function passMouseClickToOutlineFormatter(e,token){
  var scopeItem = SharedGlobal.core['scopeItem'];
  var lineCount = OutlineFormatter.lineCount;
  var elmt = null;
  var idPrefix = OutlineFormatter.lineIdPrefix;
  var box = null;
  var sLinesMap = OutlineFormatter.sessionLinesMap;
  var slmEntry = sLinesMap[OutlineFormatter.currentLine];
  if(typeof slmEntry !== 'undefined'){
    updateSelectedLineFormatHTML(slmEntry,false);
  }
  for(var i=0; i<lineCount; i++){
    elmt = document.getElementById(idPrefix + Number(i).toString() + '_' + token);
    if(elmt){
      box = elmt.getBoundingClientRect();
      if(SharedGlobal.core['pointIsInRect'](e.clientX,e.clientY,box)){
        slmEntry = sLinesMap[i];
        if(typeof slmEntry === 'undefined'){
          slmEntry = {};
          slmEntry.level = OutlineFormatter.currentLevel;
          slmEntry.origTxt = elmt.innerHTML;
          sLinesMap[i] = slmEntry;
          updateClientLinesMapEntryFromSessionEntry(slmEntry,i);
          SharedGlobal.core['promptToSave']();
        }
        slmEntry.element = elmt;
        updateSelectedLineFormatHTML(slmEntry,true);  
        OutlineFormatter.currentLine = i;
      }
    }
  } 
}

function updateClientLinesMapEntryFromSessionEntry(slmEntry,id){
  if(slmEntry === null){
    delete OutlineFormatter.linesMap[id];
    return;
  }
  var lmEntry = OutlineFormatter.linesMap[id];
  if(typeof lmEntry === 'undefined'){
    lmEntry = {};
    OutlineFormatter.linesMap[id] = lmEntry;
  }
  lmEntry.level = slmEntry.level;
  lmEntry.meld = slmEntry.meld;
}

function postHTMLInstallForOutlineFormatter(){
  var linesMap = OutlineFormatter.linesMap;
  var sLinesMap = OutlineFormatter.sessionLinesMap;
  var prefix = OutlineFormatter.lineIdPrefix;
  var lmEntry = null;
  var slmEntry = null;
  var len = OutlineFormatter.lineCount;
  var keyArr = Object.keys(linesMap);
  for(var i=0; i<keyArr.length; i++){
    lmEntry = linesMap[keyArr[i]];
    if(typeof lmEntry !== 'undefined'){
      slmEntry = sLinesMap[keyArr[i]];
      if(typeof slmEntry === 'undefined'){
        slmEntry = {};
      }
      slmEntry.level = lmEntry.level;
      slmEntry.meld = lmEntry.meld;
      slmEntry.element = document.getElementById(prefix + Number(keyArr[i]).toString());
      if(slmEntry.element){
        slmEntry.origTxt = slmEntry.element.innerHTML;
        updateSelectedLineFormatHTML(slmEntry,false);
      }
    }
  }
}


///////////// All-Purpose TOC /////////////////

function initializeForAllPurposeTOC(core,callback){
  DefaultFormat = {}; 
  var scopeItem = core['scopeItem'];
  if(typeof scopeItem.apTOC === 'undefined'){
    scopeItem.apTOC = {};
    scopeItem.apTOC.setupIsComplete = false;
  }
  if(typeof scopeItem.apTOC.formatRules === 'undefined'){
    var fmtOb = OutlineFormatter.getDefaultOLFormattingRulesObjectsArray();
    //SharedGlobal.core['attemptDisplayDialogBox']('large-txt-display-pane');
    //SharedGlobal.core['setOnAcceptSimpleEditFunc'](onAcceptAllPurposeTOCSimpleEdit);
    //var elmt = document.getElementById('se-dialog-single-item');
    //elmt.value = fmtJSON;
    scopeItem.apTOC.formatRules = fmtOb;
  }
  if(typeof scopeItem.apTOC.textInstalled === 'undefined'){
    scopeItem.apTOC.textInstalled = false;
  }
  else {
    if(scopeItem.apTOC.textInstalled){
      DefaultFormat.AllPurposeTOCInputFile = scopeItem.boundLocation;
    }
  }
  if(typeof scopeItem.apTOC.linesMap === 'undefined'){
    OutlineFormatter.linesMap = scopeItem.apTOC.linesMap = {};
  }
  else {
    OutlineFormatter.linesMap = scopeItem.apTOC.linesMap;
  }
  if(typeof scopeItem.apTOC.lineCount === 'undefined'){
    scopeItem.apTOC.lineCount = 0;
  }
  OutlineFormatter.lineCount = scopeItem.apTOC.lineCount;
  var menuElmt = document.getElementById('menu');
  if(typeof scopeItem.boundLocation === 'undefined')scopeItem.boundLocation = "";
  if(scopeItem.boundLocation === ""){
    var elmt = document.getElementById('digest-text');
    if(elmt){
      elmt.style.display = "block";
    }
    else {
      var str = "<div class=\"menuitem\" id=\"digest-text\"><div class=\"menuitemtextapp\">digest text file</div></div>";
      //menuElmt.innerHTML += str; This destroys event listeners!! So, instead:
      menuElmt.insertAdjacentHTML('beforeend',str);
      document.getElementById('digest-text').addEventListener('click',digestTextFileIntoTOCStructure);
    }
  }
  else {
    if(scopeItem.apTOC.setupIsComplete == false){
      setupAllPurposePreFinalizedMenus();
    }
  }
  document.getElementById('empty-menuitem').style.display = "none";
  var retInfo = {};
  retInfo['appMenuitems'] = ['digest-text','decrease-indents','increase-indents','meld-line','deselect-line','finalize-toc'];
  callback(retInfo);
}

function setupAllPurposePreFinalizedMenus(){
  var menuElmt = document.getElementById('menu');
  var str = "";
  OutlineFormatter.setupOutlineFormattingMenus(menuElmt);

  var elmt = document.getElementById('finalize-toc');
  if(elmt === null){
    str = "<div class=\"menuitem\" id=\"finalize-toc\"><div class=\"menuitemtextapp\">finalize</div></div>";
    menuElmt.insertAdjacentHTML('beforeend',str);
    document.getElementById('finalize-toc').addEventListener('click',finalizeAllPurposeTOC);
  }
  else { 
    elmt.style.display = "block";
    document.getElementById('finalize-toc').style.display = "block";
  }
  elmt = document.getElementById('digest-text');
  if(elmt)elmt.style.display = "none";
}

function digestTextFileIntoTOCStructure(){
  var msg = "Please specify a text file to be applied to this organizational scheme:";
  SharedGlobal.core['setSimpleEditMessage'](msg);
  SharedGlobal.core['setOnAcceptSimpleEditFunc'](onAcceptInputTextFileFromSimpleEdit);
  SharedGlobal.core.displayCorePopup('simple-edit-pane');
  var elmt = document.getElementById('se-dialog-single-item');
  elmt.value = DefaultFormat.AllPurposeTOCInputFile;
}

function onAcceptInputTextFileFromSimpleEdit(){
  var scopeItem = SharedGlobal.core['scopeItem'];
  var elmt = document.getElementById('se-dialog-single-item');
  var inputFile = elmt.value;
  SharedGlobal.core['requestFileContents'](inputFile,DefaultFormatTOCDataReceiverMethod,""); 
  SharedGlobal.core['dismissCurrentDialogBox']();
  scopeItem.boundLocation = inputFile;
  SharedGlobal.core['promptToSave']();
  setupAllPurposePreFinalizedMenus();
}

function DefaultFormatTOCDataReceiverMethod(data,requestId){
  var scopeItem = SharedGlobal.core['scopeItem'];
  var html = "<div class=\"unselected-panel\">";
  var line = "";
  var pos1 = -1;
  var pos2 = -1;
  var count = 0;
  var lmEntry = null;
  while(true){   
    pos2 = data.indexOf('[newline]',pos1 + 1);
    if(pos2 == -1)break;
    line = data.substring(pos1 + 9, pos2);
    html += "<div class=\"selectable-line\" id=\"line-" + Number(count).toString() + "\">" + line  + "</div><br/>";    
    pos1 = pos2;
    count++; 
  }
  html += "</div>";
  DefaultFormat.AllPurposeTOCLineSelectionHTML = html;
  scopeItem.apTOC.lineCount = OutlineFormatter.lineCount = count;
  SharedGlobal.core['requestRedraw'](false);
}

function updateSelectedLineFormatHTML(lineInfo,active){
  var lineElmt = lineInfo.element;
  if(lineElmt === null)return;
  var borderClr = "#ffdd99";
  var bgClr = "#ffdd99";
  var clr = "#d933aa";
  var indentCls = "indent-symbol";
  if(active == false){
    borderClr = "#a0a0d0";
    bgClr = "#b9b9ff";
    clr = "#565699";
    indentCls = "indent-symbol-inactive";
  }
  if(typeof lineInfo.meld !== 'undefined' && lineInfo.meld == true){
    indentCls = "indent-symbol-melded";
  }
  //lineElmt.className = "basic-child-item";
  lineElmt.style.borderColor = borderClr;
  lineElmt.style.backgroundColor = bgClr;
  lineElmt.style.color = clr;
  var indentHTML = "";
  for(var i=0; i<lineInfo.level; i++){
    indentHTML += "<span class=\"" + indentCls + "\"> + </span>";
  }
  lineElmt.innerHTML = indentHTML + "<span class=\"spacer-item\"><span>" + lineInfo.origTxt;
}

function handleAllPurposeTOCMouseClick(e){
  passMouseClickToOutlineFormatter(e);
}

function handleAllPurposeTOCKeyDown(e){
  return passMouseClickToOutlineFormatter(e);
}

function finalizeAllPurposeTOC(){
  if(SharedGlobal.core['isThereUnsavedData']()){
    alert('Please save the existing changes, or roll them back before finalizing.');
    return;
  }
  var scopeItem = SharedGlobal.core['scopeItem'];
  scopeItem.apTOC.setupIsComplete = true;
  document.getElementById('increase-indents').style.display = "none";
  document.getElementById('decrease-indents').style.display = "none";
  document.getElementById('meld-line').style.display = "none";
  document.getElementById('deselect-line').style.display = "none";
  document.getElementById('finalize-toc').style.display = "none";

  var filename = "";
  var path = "";
  var sep = "";
  var locArr = scopeItem.boundLocation.split(PATH_SEP);
  for(var i=0; i<locArr.length; i++){
    if(i < (locArr.length - 1)){
      path += sep;
      path += locArr[i];
      sep = PATH_SEP;
    }
    else filename = locArr[i];
  }

  var shortFn = filename;
  var extDex = shortFn.indexOf('.txt');
  if(extDex > -1){
    shortFn = filename.substring(0,extDex);
  }

  //setup TOC hierarchy
  var pidMap = {};
  var ancestors = [scopeItem];
  var ancestorIds = [SharedGlobal.core['scopeItemIndex']];
  var queuedInfo = null;
  var nuInfo = null;
  var linesMap = OutlineFormatter.sessionLinesMap; 
  var curLevel = 0;
  var parent = scopeItem;
  var nuOb = null;
  var id = -1;
  var headerTxt = "";
  var noGap = false;
  for(var i=0; i<scopeItem.apTOC.lineCount; i++){
    nuInfo = linesMap[i];
    if(typeof nuInfo === 'undefined'){
      noGap = false;
      continue;
    }
    if(queuedInfo === null){
      queuedInfo = nuInfo;
      noGap = true;
      continue;
    }
    if(queuedInfo.level < nuInfo.level){
      nuOb = SharedGlobal.core['createNewVaultItem']();
      id = SharedGlobal.core.insertVaultItem(ancestorIds[curLevel],-1,nuOb,"",headerTxt + queuedInfo.origTxt);
      headerTxt = "";
      if(noGap == false)queuedInfo.target = nuOb;
      parent = nuOb;
      curLevel++;     
      ancestors[curLevel] = nuOb;
      ancestorIds[curLevel] = id;
    }
    else {
      if(noGap == false){
        nuOb = SharedGlobal.core['createNewVaultItem']();
        id = SharedGlobal.core.insertVaultItem(ancestorIds[curLevel],-1,nuOb,"",headerTxt + queuedInfo.origTxt);
        queuedInfo.target = nuOb;
        noGap = true;
      }
      if(queuedInfo.level > nuInfo.level){
        ancestors[curLevel] = null;
        curLevel = nuInfo.level;
        headerTxt = "";
        parent = ancestors[curLevel];
      }
      else {
        if(nuInfo.meld)headerTxt += queuedInfo.origTxt;
        else {
          //SharedGlobal.core['insertPercept'](parent,-1,headerTxt + queuedInfo.origTxt);
          headerTxt = "";
        }
      }
    }
    queuedInfo = nuInfo;
  }

  SharedGlobal.core['requestRedraw'](true);
  //SharedGlobal.core['splitFileIntoSeparateNativeFiles'](path,filename,getStringifiedArrayOfLineDivisions(scopeItem),setupAllPurposeTOCLeafLocations);
}

function getStringifiedArrayOfLineDivisions(scopeItem){
  var arr = [];
  var arrStr = "[";
  var sep = "";
  var pos = 0;
  var startEntry = null;
  var endEntry = null;
  var startDex = -1;
  var endDex = -1;
  var linesMap = scopeItem.apTOC.linesMap;
  for(var i=0; i<scopeItem.apTOC.lineCount; i++){
    endEntry = linesMap[i];
    endDex = i;
    if(typeof endEntry === 'undefined')continue;
    if(startEntry !== null){
      if(typeof endEntry.meld === 'undefined' || endEntry.meld == false){
        if((startDex + 1) < endDex){
          arr[pos] = {l1:startDex + 1,l2:endDex,target:startEntry.target};
          arrStr += sep + "{\"l1\":" + Number(startDex + 1).toString() + ",\"l2\":" + Number(endDex).toString() + "}";
          pos++;
          sep = ",";
        }
      }
    }
    startEntry = endEntry;
    startDex = endDex;
  }
  scopeItem.apTOC.lineDivisionsArray = arr;
  return arrStr + "]";
}

function setupAllPurposeTOCLeafLocations(responseData){
  var basePath = responseData;
  var arr = SharedGlobal.core['scopeItem'].apTOC.lineDivisionsArray;
  if(typeof arr === 'undefined'){
    console.log("Error: invalid line divisions array found while setting up leaf objects");
    return;
  }
  var ldEntry = null;
  var num = 1;
  for(var i=0; i<arr.length; i++){
    ldEntry = arr[i];
    if(typeof ldEntry.target !== 'undefined'){
      ldEntry.target.defaultView = "deep doc";
      ldEntry.apcd = "Snippetizer0";
      ldEntry.target.typeIndex = propertyIndex;
      ldEntry.target.boundLocation = basePath + "_part" + Number(num).toString() + ".txt";
      num++;
    }
  } 
  SharedGlobal.core['requestRedraw'](true);
}

function generateAllPurposeTOCHTML(core,callback){
  var html = "";
  var scopeItem = core['scopeItem'];
  var iter = core['tracker'];
  var validLineSelection = false;
  var globalCounts = [];
  var fmtRules = scopeItem.apTOC.formatRules;
  for(var i=0; i<fmtRules.length; i++){
    globalCounts[i] = 0;
  }
  DefaultFormat.borderTweaks = [];
  if(typeof scopeItem.boundLocation === 'undefined' || scopeItem.boundLocation === ""){
    html = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Instructions</b>";
    html += "<ol>";
    html += "<li>make a screen shot of these instructions for later reference</li>";
    html += "<li>click the 'digest text file' menu item</li>";
    html += "<li>specify a source file to be applied to this TOC structure</li>";
    html += "<li>click on screen to select the lines of text that should become part of the TOC. DO NOT SELECT any items from a pre-existing Table of Contents that might already exist within this text. This needs to be done so that larger files can be automatically divided to smaller sizes</li>";
    html += "<li>push the ALT+LEFT_ARROW or ALT+RIGHT_ARROW keys to specify the indentation level of selected items, and thereby specify positions in the organizational hierarchy. If the specified level is 3, it should have two '+' signs just to the left</li>";
    html += "<li>'OK' this to divide the text file, and generate a TOC, and individual files that are partitioned according to the subdivisions you have just specified</li>";
    html += "</ol>";
  }
  else {
    if(scopeItem.apTOC.setupIsComplete == false){
      html = DefaultFormat.AllPurposeTOCLineSelectionHTML;
      if(html === ""){
        SharedGlobal.core['requestFileContents'](scopeItem.boundLocation,DefaultFormatTOCDataReceiverMethod,""); 
        html = "<h3>waiting for text ...</h3>";
      }
      else validLineSelection = true;
    }
    else html += getTableOfContentsHTMLFromLevel(iter,0,fmtRules,globalCounts); 
  }

  var retData = {};
  var appletValues = {};
  appletValues['isMultiLevel'] = true;
  appletValues.explicitChildCount = SharedGlobal.tic.getNonResIdCount();
  appletValues.explicitResourceCount = 0;
  appletValues['postHTMLInstallAppletMethod'] = postHTMLInstallForCompleteAllPurposeTOC;
  if(validLineSelection){
    appletValues['postHTMLInstallAppletMethod'] = postHTMLInstallForOutlineFormatter;
  }
  retData['appletValuesMap'] = appletValues;
  callback(retData);
  return html; 
}

function getSiblingRankArrayFromLinesMap(linesMap){
  var sra = [];
  var lastLevel = 0;
  var sibCounts = [];
  var keyArr = Object.keys(linesMap);
  var lineInfo = null;
  var level = 0;
  for(var i=0; i<keyArr.length; i++){
    lineInfo = linesMap[keyArr[i]];
    level = lineInfo.level;
    if(lineInfo.meld){
      sra[i] = 0;
      continue;
    }
    if(typeof sibCounts[level] === 'undefined'){
      sibCounts[level] = 1;
      lastLevel = 1;
    }
    else {
      if(lastLevel < level){
        sibCounts[level] = 1;
      }
      else {
        sibCounts[level] += 1;
        lastLevel = sibCounts[level];
      }
    }
    lastLevel = level;
    sra[i] = sibCounts[level];
  }
  return sra;
}

function applyFormattedOutlineItemJavaScriptStyling(elmt,fmtRule){
  if(fmtRule.fontSize !== "auto"){
    elmt.style.fontSize = fmtRule.fontSize + "px";
  } 
}

function getFormattedOutlineItemHTML(text,level,sibRank,fmtRule,gCounts,idString,meld,caller){
  var prelimTabs = "";
  var indents = level;
  var tabSpc = "";
  if(fmtRule.indent === 'default' || fmtRule.indent === 'auto'){ 
    for(var k=1; k<indents; k++){
      prelimTabs += "<div class=\"basic-tab\"></div>";
    } 
  }
  if(text.length > 0){
    if(fmtRule.caps === 'all'){
      text = text.toUpperCase();  
    }
    if(fmtRule.italic){
      text = "<i>" + text + "</i>";
    }
    if(fmtRule.itemization !== 'none' && meld == false){
      var num = sibRank;
      if(fmtRule.global_itemization){
        if(typeof gCounts[level] === 'undefined'){
          gCounts[level] = 1;
        }
        else gCounts[level]++;
        num = gCounts[level];
      }
      var sym = getDefaultFormatItemizationSymbol(num,fmtRule.itemization,fmtRule.itemization_decorators);
      text = sym + " " + text;
    }
    if(indents > 0){
      btEntry = {};
      btEntry.ltid = "fin-tab-" + idString;
      btEntry.wrpr = idString;
      if(typeof caller.borderTweaks === 'undefined')caller.borderTweaks = [];
      caller.borderTweaks[caller.borderTweaks.length] = btEntry;
      if(fmtRule.indent !== 'none')tabSpc = prelimTabs + "<div class=\"basic-tab\" id=\"" + btEntry.ltid + "\"></div>";
      text = tabSpc + text;
    }
  }
  return text;
}

function getTableOfContentsHTMLFromLevel(iter,level,fmtRules,gCounts){
  var item = iter.getScopeItem();
  var label = "";
  var itemTitle = "";
  var childId = null;
  var tabSpc = "";
  var indents = level;
  var prelimTabs = "";
  var btEntry = null;
  var itemString = "";
  var s = "";
  var len = iter.childItemCount();

  if(typeof item === 'undefined' || item === null)return s;
  
  for(var k=1; k<indents; k++){
    prelimTabs += "<div class=\"basic-tab\"></div>";
  } 

  var bump = 1;
  for(var i=0; i<len; i++){
    var fmt = fmtRules[level];
    label = iter.label(i);
    itemString = ""; 

    label = getFormattedOutlineItemHTML(label,level,i,indents,fmt,gCounts,false,idString);
    var curIdString = iter.getIdString();
      if(indents > 0){
        btEntry = {};
        btEntry.ltid = "fin-tab-" + curIdString;
        btEntry.wrpr = curIdString;
        DefaultFormat.borderTweaks[DefaultFormat.borderTweaks.length] = btEntry;
        tabSpc = prelimTabs + "<div class=\"basic-tab\" id=\"" + btEntry.ltid + "\"></div>";
        s += tabSpc;
      }
      SharedGlobal.tabIdsBuffer[SharedGlobal.tabIdsBuffer.length] = curIdString;
      s += "<div class=\"basic-child-item\" id=\"" + curIdString + "\">" + itemString + "</div>";
      s += "<br/>";
    //}
    s += getTableOfContentsHTMLFromLevel(iter.down(),level + 1,fmtRules,gCounts);
    iter.next();
  }
  len = iter.resourceItemCount();
  if(len > 0){
    var res = null;
    for(var j=0; j<len; j++){
      res = iter.resource(j);
      if(res.type == 'url'){
        s += tabSpc; 
        s += "<a href=\"" + res.url + "\">";
        s += res.title + "</a><br/>";
      }
    }
  }

  return s;
}

function getDefaultFormatItemizationSymbol(num,type,decoration){
  var s = "";
  if(type.indexOf('roman') > -1){
    var digit1 = num % 10;
    var digit2 = (num - digit1) / 10;
    var arr1 = ['','i','ii','iii','iv','v','vi','vii','viii','ix','x'];
    var arr2 = ['','x','xx','xxx','xl','l','lx','lxx','lxxx','xc','c'];
    s = arr2[digit2] + arr1[digit1];
  }
  if(type.indexOf('arabic') > -1){
    s = Number(num).toString();
  }
  if(type.indexOf('alphabet') > -1){
    var arr = ['','a','b','c','d','e','f','g','h','i','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
    s = arr[num];
  }  
  if(type.indexOf('upper') > -1)s = s.toUpperCase();
  if(decoration === 'period')s += ".";
  return s;
}

function postHTMLInstallForCompleteAllPurposeTOC(){
  var btInfo = null;
  var wrprElmt = null;
  var tabElmt = null;
  var endElmt = null;
  var box1 = null;
  var box2 = null;
  var w = 0;
  var mainRect = SharedGlobal.core['mainRect'];  
  for(var i=0; i<DefaultFormat.borderTweaks.length; i++){
    btInfo = DefaultFormat.borderTweaks[i];
    tabElmt = document.getElementById(btInfo.ltid);
    wrprElmt = document.getElementById(btInfo.wrpr);
    box1 = tabElmt.getBoundingClientRect();
    box2 = wrprElmt.getBoundingClientRect();
    w = mainRect.width - (70 + box1.right);
    wrprElmt.style.width = w + "px"; 
    wrprElmt.style.left = (mainRect.right - w) + "px"; 
  }
}


///////////// Style Workbench /////////////////

StyleWorkbench.nextRandomColorForWhiteBackgroundFromToken = function(tok){
  var idx = StyleWorkbench.tokenOnWhiteIdxMap[tok];
  if(typeof idx === 'undefined' || idx < 0 || (idx > StyleWorkbench.onWhiteColorList.length - 1)){
    idx = StyleWorkbench.tokenOnWhiteIdxMap[tok] = 0;
  }
  var clr = StyleWorkbench.onWhiteColorList[idx]; 
  StyleWorkbench.tokenOnWhiteIdxMap[tok] = idx + 1;
  return clr;
}

StyleWorkbench.resetIndexForWhiteBackgroundColors = function(tok){
  StyleWorkbench.tokenOnWhiteIdxMap[tok] = -1; 
}

/*
 *  the following 'createStyle' method with few edits, comes to us courtesy of 
 *  http://jss-lang.org/home/how-to-use-jss/browser~8a818100319067fa01319106c3a2005e.en.html
 */
StyleWorkbench.createStyle = function(css){
  var head = document.getElementsByTagName("head")[0];
  var style_el = document.createElement("style");
  head.appendChild(style_el);
  
  if(style_el.styleSheet){// IE
    style_el.styleSheet.cssText = css;
  }
  else {// w3c 
    var style_content = document.createTextNode(css)
    style_el.appendChild(style_content);
  }
}

StyleWorkbench.formatDocElements = function(fmtInfo,elements){
  var elmt = null;
  for(var i=0; i<elements.length; i++){
    elmt = elements[i];
    if(elmt === null){
      console.log('Error: null element provided to formatDocElements');
      continue;
    }
    if(fmtInfo[0] !== "")elmt.style.fontSize = fmtInfo[0] + "px";
    if(fmtInfo[1] !== "")elmt.style.fontFamily = fmtInfo[1];
    if(fmtInfo[2] !== "")elmt.style.color = fmtInfo[2];
    if(fmtInfo[3] !== "")elmt.style.backgroundColor = fmtInfo[3];
    if(fmtInfo[4] !== "")elmt.style.borderColor = fmtInfo[4];
    if(fmtInfo[5] !== "")elmt.style.borderWidth = fmtInfo[5] + "px";
    if(fmtInfo[6] !== "")elmt.style.borderStyle = fmtInfo[6];
    if(fmtInfo[7] !== "")elmt.style.textDecoration = fmtInfo[7];
    if(fmtInfo[8] === "on"){
      elmt.style.textTransform = "uppercase"; 
    }
    if(fmtInfo[9] === "on"){
      elmt.style.fontStyle = "italic"; 
    }
    if(fmtInfo[10] === "on"){
      elmt.style.textAlign = "center";
    }
    if(fmtInfo[11] !== "")elmt.style.paddingTop = fmtInfo[11] + "px";
    if(fmtInfo[12] !== "")elmt.style.paddingBottom = fmtInfo[12] + "px";
    if(fmtInfo[13] !== ""){
      elmt.style.paddingLeft = (Number(fmtInfo[13]) * 20) + "px";
    }
    if(fmtInfo[14] !== "")elmt.style.paddingLeft = fmtInfo[14] + "px";
  }
}

StyleWorkbench.getCssStyleStringFromFormatInfo = function(fmtInfo){
  var str = "";
  var arr = [];
  if(fmtInfo[0] !== "")arr[arr.length] = "font-size:" + fmtInfo[0] + "px";
  if(fmtInfo[1] !== "")arr[arr.length] = "font-family:" + fmtInfo[1];
  if(fmtInfo[2] !== "")arr[arr.length] = "color:" + fmtInfo[2];
  if(fmtInfo[3] !== "")arr[arr.length] = "background-color:" + fmtInfo[3];
  if(fmtInfo[4] !== "")arr[arr.length] = "border-color:" + fmtInfo[4];
  if(fmtInfo[5] !== "")arr[arr.length] = "border-width:" + fmtInfo[5] + "px";
  if(fmtInfo[6] !== "")arr[arr.length] = "border-style:" + fmtInfo[6];
  if(fmtInfo[7] !== "")arr[arr.length] = "text-decoration:" + fmtInfo[7];
  if(fmtInfo[8] === "on"){
    arr[arr.length] = "text-transform:" + "uppercase"; 
  }
  if(fmtInfo[9] === "on"){
     arr[arr.length] = "font-style:" + "italic"; 
  }
  if(fmtInfo[10] === "on"){
    arr[arr.length] = "text-align:" + "center";
  }
  if(fmtInfo[11] !== "")arr[arr.length] = "padding-top:" + Number(fmtInfo[11]).toString() + "px";
  if(fmtInfo[12] !== "")arr[arr.length] = "padding-bottom:" + Number(fmtInfo[12]).toString() + "px";
  if(fmtInfo[13] !== ""){
    arr[arr.length] = "padding-left:" + (Number(fmtInfo[13]) * 20).toString() + "px";
  }
  if(fmtInfo[14] !== "")arr[arr.length] = "padding-right:" + Number(fmtInfo[14]).toString() + "px";
  return str + arr.join(';') + ";";
}

StyleWorkbench.createLetterFormIconFromString = function(str,clr,bgClr,opacity){
  var hex1 = Number(parseInt("0x" + bgClr.substring(1,3))).toString();
  var hex2 = Number(parseInt("0x" + bgClr.substring(3,5))).toString();
  var hex3 = Number(parseInt("0x" + bgClr.substring(5))).toString();
  var rgbaVal = "rgba(" + hex1 + "," + hex2 + "," + hex3 + "," + opacity + ")"; //0.4)";
  var html = "<div class=\"lfIcon\" style=\"color: " + clr + "; background-color: " + rgbaVal + "\">";
  if(str.length < 2){
    html += "<div class=\"bigSquare\">" + str + "</div>";
  }
  else{
    html += "<div class=\"bigSquare\">" + str.substring(0,2) + "</div>";
    if(str.length < 5){
      html += "<div class=\"btmSide\">" + str.substring(2) + "</div>";
    }
    else{
      html += "<div class=\"btmSide\">" + str.substring(2,7) + "</div>";
    }
  }
  html += "</div>"; 
  return html;
}

StyleWorkbench.getLetterFormMap = function(){
  var map = {};
  map['lg-A'] = "lg-a.png"; 
  return map;
}


////////// Graphics support /////////////

SharedGlobal.utils.gfx.spinUpSvgNode = function(){
  //var elmt = document.createElement('svg');
  //for(var 
  //var pathElmt = document.createElement('path');
  //pathElmt.setAttribute('d',jarr.);
  //n.innerText = "d="m 7.517856,7.535713 c 0,0 -0.755951,158.749997 -0.755951,166.309527 0,7.55952 10.583335,16.63095 14.363095,17.3869 3.77976,0.75595 3.77976,1.5119 3.77976,1.5119";
  //return n;
}


////////// Common popup boxes /////////////

SharedGlobal.popups.confirm = function(msg,callback){
 var customDlgInfo = {"fields":[
    {type:"oversized_text",text:msg}
]};
  SharedGlobal.popups.callback = callback;
  SharedGlobal.core['displayCustomPopup'](customDlgInfo,SharedGlobal.popups.acceptConfirmResult,'PRE_CB_DISMISS','rslt');
}

SharedGlobal.popups.acceptConfirmResult = function(info){
  SharedGlobal.popups.callback(info.rslt);
}



////////// EntityManager APIs /////////////

EntityManager.createEntityWizard = function(type,callback){
  //check to see if the type exists
  var hvs = SharedGlobal.core.getHiddenVaultStorage();  
  if(typeof hvs.schemaTypes === 'undefined'){
    hvs.schemaTypes = {};
  }
  var schema = hvs.schemaTypes[type]; 
  if(typeof schema === 'undefined'){
    var msg = "The type: " + type + " does not yet exist. Do you want to create it now?";
    SharedGlobal.popups.confirm(msg,function(f){
        if(f){
          EntityManager.createNewType(type);
        }
      }); 
  }
  EnitityManager.wizardInfo = {primaryCallback:callback};
}

EntityManager.createNewType = function(type){
 var customDlgInfo = {"fields":[
    {type:"bold_text",text:"Create '" + type + "' Entity"},
    {type:"button",box_class:"dlgItem",text:"Add property",handler:"EntityManager.addNewProperty"}
]};
  var rslt = SharedGlobal.core['displayCustomPopup'](customDlgInfo,EntityManager.acceptNewEntityInfo);
  EntityManager.currentTypePopupIdx = rslt.popupInfoIdx;
}

EntityManager.acceptNewEntityInfo = function(result){
  EnitityManager.wizardInfo.primaryCallback();
}

EntityManager.addNewProperty = function(e){
  var customDlgInfo = {"fields":[
    {type:"bold_text",text:"Add Property"},
    {type:"normal_text",text:"Name"},
    {type:"std_edit",label:"",box_class:"medium",value:"",key:"nam"},
    {type:"normal_text",text:"Type (optional)"},
    {type:"std_edit",label:"",box_class:"medium",value:"",key:"typ"},
    {type:"normal_text",text:"Default value"},
    {type:"std_edit",label:"",box_class:"medium",value:"",key:"dvl"}
]};
  SharedGlobal.core['displayCustomPopup'](customDlgInfo,EntityManager.acceptNewPropertyValues);
}

EntityManager.acceptNewPropertyValues = function(propInfo){
  var prop = {};
  prop.n = propInfo['nam'].value;
  prop.t = propInfo['typ'].value;
  prop.d = propInfo['dvl'].value; 
  var puInfo = SharedGlobal.core.getPopupInfoAtIndex(EntityManager.currentTypePopupIdx);
  var flds = puInfo.itemInfo.fields;
  var plFound = false;
  for(var i=0; i<flds.length; i++){
    var e = flds[i];
    if(e.text === 'Property list'){
      plFound = true;
    }
    if(e.type === 'button'){
      flds.splice(i,0,{type:"normal_text",text:prop.n + ' (' + prop.t + '|' + prop.d + ')',inset:6});
      //flds.splice(i,0,{type:"multi_edit_line",label:prop.n,box_class:"short",box_class_array:['short','short'],value:prop.t + '|' + prop.d,fmt_delim:"|",format:"name|dtype|default|",key:"prop"});
      //flds.splice(i,0,{type:"multi_edit_line",label:"",box_class:"short",box_class_array:['short','short','short'],value:prop.n + '|' + prop.t + '|' + prop.d,fmt_delim:"|",format:"name|type|default|",key:"prop"});
      if(plFound == false){
        flds.splice(1,0,{type:"normal_text",text:"Property list"});
      }
      break;
    }
  }
}


////////// EntityManager basic types /////////////

/*
  T - Type
*/

EntityManager.basicTypes = [
  {"human":{"properties":["height","weight","gender","eye color","hair color","ethnicity"]}},
  {"person":{"properties":["first name","middle name","last name","maiden name","gender","ssn","date of birth","date of decease","T(address_history)"]}},
  {"person_contact_info":{"properties":["T(email)","T(phone number)","T(address_history)"]}},
  {"address_history":{"properties":["current_T(address)","previous_T(address)"]}},
  {"address":{"properties":["house number","street","apt","lot","county","city","state","country"]}},
  {"person_health_info":{"properties":["T(human)","T(pathology)"]}},
  {"pathology":{"properties":["T(anatomy)_issues","T(anatomy)_cancer"]}},
  {"anatomy":{"properties":["heart","lung","stomach","brain","liver","kidney","bone","muscle","skin","pancreas"]}},
  {"book_citation":{"properties":["author","editor","title","isbn","publisher location","publisher","date","T(book_citation_inner)"]}},
  {"journal_citation":{"properties":["name","month","issue","author","editor","title","isbn","publisher location","publisher","date"]}},
  {"internet_citation":{"properties":["author","editor","title","URL","date"]}}
];

EntityManager.amalgamatedTypes = [
  {"person_contact_info":{"properties":["first name","mi","last name","ssn","date of birth","house number","street","apt","building","city","state","zip code","county","country","cell phone","home phone","work phone","fax","email","Linked-in","website","Facebook username"],"def_display":"personalInfo"}},
  {"person_background_info":{"properties":['address','employment','education','special honors','awards','felonies','misdemeanors','person_health_info']}}
];


