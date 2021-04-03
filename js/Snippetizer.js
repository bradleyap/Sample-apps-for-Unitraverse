/*
   Copyright 2018,2021 Bradley A. Pliam

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

Snippetizer = {};
Snippetizer.appId = "snippetizer_app";
Snippetizer.tempStore = {};
Snippetizer.tempDIStore = {};
Snippetizer.html = "";

Snippetizer.nextGranularity = function(g){
  if(g === 'sec')return 'par';
  if(g === 'par')return 'word';
  if(g === 'word')return 'char';
  if(g === 'char')return 'jot';
};

Snippetizer.granularityRankMap = {"sec":0,"par":1,"word":2,"char":3,"jot":4};

/*
  the ordered fields for concise storage of graphics values (mostly css) are an encoding of the following descriptive sequence:
  [font size,font family,foreground color, background color, border color, border width, css border style, text decoration, all caps, italicized, center horizontally, padding above, padding below, left indents] 
*/
Snippetizer.lastLineFormatUsed = ["24","'Lora', serif","#565699","none","","","","","","","","10","3","0",""];
Snippetizer.defaultLineFormat = ["24","'Lora', serif","#565699","none","","","","","","","","10","3","0",""];

Snippetizer.baseClr = "#565699";
Snippetizer.baseBgClr = "#ffffff";
Snippetizer.baseSelClr = "#f6e6ff";
Snippetizer.baseSelBgClr = "#666699";
Snippetizer.mgnIconSz = 28;


Snippetizer.iconFileMap = {
  "comment":"annotationSml.png",
  "emoji":"emojiSml.png",
  "navlink":"navlinkSml.png",
  "simple":"snippetArrowSml.png"
};

Snippetizer.getAppletWindowId = function(appInstanceId,windowId){
  return appInstanceId + '_' + windowId;
}

Snippetizer.getStorageInfo = function(diToken){
  var s = Snippetizer;
  var info = {tempStore:null,tempDIStore:null,token:diToken};
  var scopeItem = SharedGlobal.core.scopeItem;
  if(typeof s.tempStore[scopeItem.appInstanceId] === 'undefined'){
    s.tempStore[scopeItem.appInstanceId] = {};
  }
  info.tempStore = s.tempStore[scopeItem.appInstanceId];
  if(typeof s.tempDIStore[diToken] === 'undefined'){ //di - drawing instance
    var di = s.tempDIStore[diToken] = {};
    di.selectionGranularity = 'par';
    di.foremost = {};
    di.aftmost = {};
    di.bufferedClickInfo = {};
    di.bufferedScrollPos = 0;
    di.frameBuffer = {};
    di.frameBuffer.leadingEdge = 0;
    di.frameBuffer.trailingEdge = 100;
    di.frameBuffer.margin = 1100;
    di.snippetArrayPos = -1;
    di.queriedSnippetKey = "";
    di.rangeDescriptionArr = [];
    di.snippetNoiseLevel = 'soft'; // zero|soft|medium|loud
    di.featuredLocationArr = [];
    di.aggregateSDMap = {};
    di.orderedSDKeysArr = [];
    di.featuredSnippetIndex = -1;
    di.showBubble = false;
    di.resumeFloating = false;
    di.metadataArrayPos = 0;
    di.curAnnotationNum = 1;
    di.verticalBump = 0;
    di.token = diToken;
  }
  info.tempDIStore = s.tempDIStore[diToken];
  return info;
}

function initializeForSnippetizerDeepDocApplet(core,callback,hostPaneIdx,args){
  //change set 271
/*  var scopeItem = core.scopeItem;
  var s = Snippetizer;
  var iter = core.tracker;
  if(typeof scopeItem.config === 'undefined')scopeItem.config = 'app-defined';
  if(typeof scopeItem.boundLocation === 'undefined')scopeItem.boundLocation = "";
  //change set 271
  //var len = scopeItem.c.length;
  //var c = null;
  //the next line needs to be looking at a snippetizer applet map index by appInstanceIds
  //var doc = scopeItem.c[0];
  //change set 271
  //var testdoc = iter.child(0);
  //if(typeof doc === 'undefined')doc = null;
  //if(doc === null){
  var cinfo = iter.childInfo(0);
  if(!cinfo.exists || cinfo.isNull){
    doc = SharedGlobal.core['createNewVaultItem']();
    //this call to installGuest does not respin ids, but the regeneration of scaffolding ids does happen later, fyi 
    SharedGlobal.core['installGuest'](scopeItem,0,null,doc);
  }
  if(typeof scopeItem.appInstanceId !== 'undefined'){
    s.appInstanceId = scopeItem.appInstanceId;
  }
  else scopeItem.appInstanceId = s.appInstanceId = SharedGlobal.core['getApplicationInstanceId'](scopeItem);
*/

  var s = Snippetizer;
  //change set 271
  //var iter = core.tracker;
  var iter = core.getTracker();
  //change set 271
  var sidx = core.scopeItemIndex;
  if(core.getItemConfig(sidx) === ""){
    core.setItemConfig(sidx,'app-defined');
  }
  if(typeof s.appInstanceId === 'undefined' || s.appInstanceId === -1){
     s.appInstanceId = core.getItemAppInstanceId(sidx);
    if(s.appInstanceId === -1){
      core.setItemAppInstanceId(sidx,s.appInstanceId = core.getApplicationInstanceId(sidx));
    }
  }
  var storageInfo = s.getStorageInfo(core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  //change set 271
  /*
    The need for performant access to the loaded document text is particularly poingant for Snippetizer. It is not recommended that any applet will have direct access to a vault item object, so this is intended to be a rarely used capability. 
  */
  var cinfo = iter.childInfo(0);
  if(!cinfo.exists || cinfo.isNull){
    //the id returned here is not reliable, but is likely to become persistent in the future. Persistent will eventually mean: valid until the reloading of the web application inside the browser. 
    ts.deepDoc = core.createNewVaultItem();
    //this call to installGuest does not respin ids, but the regeneration of scaffolding ids does happen later, fyi 
    //change set 271
    //SharedGlobal.core.installGuest(scopeItem,0,null,ts.deepDoc);
    core.installGuest(core.scopeItemIndex,0,null,ts.deepDoc);
    ts.deepDoc.c = [];
  }
  else{
    ts.deepDoc = iter.child(0); 
  }
  var di = storageInfo.tempDIStore;
  if(typeof di.foremost === 'undefined'){
    di.foremost = new DISelectionInfo();
  }
  if(typeof di.aftmost === 'undefined'){
    di.aftmost = new DISelectionInfo();
  }
  if(typeof di.calloutGroup === 'undefined'){
    di.calloutGroup = 'default_tweaks';
  }
  //change set 271
  //ts.deepDoc = doc; 
  if(typeof di.olf === 'undefined'){
    di.olf = {};
  }
  if(typeof ts.deepDocMetadata === 'undefined'){
    ts.deepDocMetadata = [];
  }
  if(typeof di.olf.linesMap === 'undefined'){
    di.olf.linesMap = {};
  }
  //change set 271
  //var ss = s.getVaultSharedStorageForAppInstance(scopeItem.appInstanceId); //permanent storage in vault for searchability
  var ss = s.getVaultSharedStorageForAppInstance(s.appInstanceId); //permanent storage in vault for searchability
  if(typeof ss.callouts === 'undefined'){
    ss.callouts = {"default_tweaks":{"snippetData":{},"cfmt":{"snippetArr":[]}}};
  }
  s.aggregateSnippetData(ss,di);
  di.orderedSDKeysArr = [];
  if(di.aggregateSDMap){
    di.orderedSDKeysArr = s.radixSortOnLocationData(di.aggregateSDMap);
  }
  di.verticalBump = 0;
  //change set 271
  var loc = core.getItemBoundLocation(sidx);
  //if(scopeItem.boundLocation !== ""){
  if(loc !== ""){
    //change set 271
    //core.requestFileContents(scopeItem.boundLocation,s.dataReceiverMethod,{ts:ts,di:di}); 
    core.requestFileContents(loc,s.dataReceiverMethod,{ts:ts,di:di}); 
    core.setupResponsiveMenuitem(hostPaneIdx,'author','select text','anyregion',null,'select-text','',s.toggleSelectTextMode);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','add_snippet comment','anyregion',null,'','',s.addCommentToCurrentLocation);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','add_snippet link','anyregion',null,'','',s.addLinkToCurrentLocation);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','format selection','anyregion',null,'','',s.editFormatForSelectedLine);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','apply outline','anyregion',null,'apply-outline','',s.toggleApplyOutlineMode);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','load annotations','anyregion',null,'','',s.loadAnnotations);
    core.setupResponsiveMenuitem(hostPaneIdx,'author','inbound link info','anyregion',null,'','',s.getInboundLinkInfo);
    var lst = [];
    lst[0] = {"group":"author","commandSequence":"inbound link info","visible":false};
    lst[1] = {"group":"author","commandSequence":"select text chk","visible":true};
    lst[2] = {"group":"author","commandSequence":"format selection","visible":false};
    SharedGlobal.core.setMenuitemVisibilityFromList(hostPaneIdx,lst);
  }
  if(typeof di.userMode === 'undefined'){
    di.userMode = "exhibition";
  }
  if(di.userMode === 'apply_outline'){
    di.userMode = "";
    s.toggleApplyOutlineMode();
  }
  if(di.userMode === 'select_text'){
    di.userMode = "";
    s.toggleSelectTextMode();
  }
  di.foremost.location = "-1_-1_-1";
  di.aftmost.location = "-1_-1_-1";
  if(args){
    di.foremost.location = args.bgn;
    di.aftmost.location = args.end;
    var argArr = di.featuredLocationArr = [di.foremost.location,di.aftmost.location]
    di.featuredSnippetIndex = s.findSnippetIndexFromLocationArray(argArr,di);
    if(di.featuredSnippetIndex < 0){
      var sa = new SnippetArtifact();
      sa.type = "link_target";
      s.insertIntoAggregateSDArray(di);
      di.featuredSnippetIndex = s.insertIntoSDKeyArrayList(argArr.join('_'),di);
    }
    di.queriedSnippetKey = argArr.join('_');
    di.userMode = "exhibition";
  }
  s.args = args;
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  core.setMaxWindowSize(wnd,975,-1);
  var retData = {}; 
  retData['allowDefaultHrzArrowKeyHandling'] = false;
  callback(retData);
}


///////////////// HTML generation functions ///////////////////

function generateSnippetizerDeepDocHTML(core,responseCallback){
  var s = Snippetizer;
  var scopeItem = core.scopeItem;
  var scopeIndex = core.scopeItemIndex;
  //change set 271
  //if(scopeItem.boundLocation === ""){
  if(core.getItemBoundLocation(scopeIndex) === ""){
    return s.getSetupHowToMsg();
  }
  var storageInfo = s.getStorageInfo(core.getPersistentDrawingInstanceToken());
  var di = storageInfo.tempDIStore;
  var ts = storageInfo.tempStore;
  var html = "<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tr><td bgcolor=\"#e6eaf9\" valign=\"top\"><div class=\"deep-doc-margin\" id=\"deep-doc-margin" + di.token + "\"><div id=\"bumper-div-mgn" + di.token + "\"></div><div class=\"sideIcon\" id=\"sideIconGrp" + di.token + "\"></div></div></td><td><div class=\"deep-doc\" id=\"deep-doc-page" + di.token + "\">";
  if(ts.deepDoc.c.length < 1){
    return  "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div>[Empty document]<div class=\"spacer-item\"></div>";
  }
  html += "<div id=\"bumper-div" + di.token + "\"></div>";
  var docLen = ts.deepDoc.c.length;
  var docLines = ts.deepDoc.c;
  var rda = di.rangeDescriptionArr = [{"type":"par","bgn":0,"end":docLen - 1,"data":docLines}];
  var rdEntry = null;
  di.metadataArrayPos = 0;
  di.curAnnotationNum = 1;
  for(var i=0; i<rda.length; i++){
    rdEntry = rda[i];
    if(rdEntry.type === 'par'){
      html += s.getParagraphHTMLFromRangeDescription(rdEntry,storageInfo,di);
    }
  }
  html += "</div></td></tr></table>";
  html += SharedGlobal.getResourceItemsHTML(scopeItem);
  var retData = {};
  var appletValues = {};
  appletValues['isMultiLevel'] = true;
  appletValues['explicitResourceCount'] = SharedGlobal.tic.getResIdCount();
  appletValues['postHTMLInstallAppletInfo'] = {method:s.postHTMLInstallMethod,data:{tempStore:ts,tempDIStore:di}};
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

Snippetizer.getSetupHowToMsg = function(){
  var msg = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Instructions</b>";
  msg += "<ol>";
  msg += "<li>container select the page</li>";
  msg += "<li>click on 'configure' in the main menu</li>";
  msg += "<li>select 'Applet defined' in the configuration drop-down menu</li>";
  msg += "<li>in the 'Path' field point to a directory by typing the full OS directory location... providing the full path, or by clicking the 'Browse files...' button and selecting the path from the file system</li>";
  msg += "<li>click 'OK'</li>";
  msg += "<li>click 'save'</li>";
  msg += "<li>start to use your text inside the vault by creating links to the text and embedding links from inside the text!</li>";
  msg += "</ol>";
  return msg;
}

Snippetizer.getParagraphHTMLFromRangeDescription = function(info,storageInfo,di){
  var parHTML = "";
  var cname = "deep-doc-par";
  var end = Number(info.end) + 1; 
  var bgn = Number(info.bgn);
  var text = "";
  var parNextEntity = -1;
  var mdPos = di.metadataArrayPos;
  var ts = storageInfo.tempStore;
  var earr = ts.deepDocMetadata[mdPos];
  var numOffset = 0;
  if(typeof earr !== 'undefined'){
    parNextEntity = earr[0];
  }
  for(var i=bgn; i<end; i++){
    text = info.data[i];
    if(i == parNextEntity){
      var startPos = mdPos;
      for(var j=mdPos; j<Snippetizer.deepDocMetadata.length; j++){
        if(i == Snippetizer.deepDocMetadata[j][0])mdPos = j;     
      }
      numOffset = mdPos - startPos;
      for(var j=mdPos; j >= startPos; j--){
        var insertPos = Snippetizer.deepDocMetadata[j][3];
        text = text.slice(0,insertPos) + "<div class=\"anot\">" + (di.curAnnotationNum + numOffset) + "</div>" + text.slice(insertPos);
        numOffset--;
      }
      di.curAnnotationNum += (mdPos - startPos) + 1;
      mdPos++;
      di.metadataArrayPos = mdPos;
      earr = Snippetizer.deepDocMetadata[mdPos];
      if(typeof earr !== 'undefined'){
        parNextEntity = earr[0];
      }
    }
    text = text.replace(/\[lnglbrkt\]/g,"<").replace(/\[rnglbrkt\]/g,">");
    parHTML += "<div class=\"" + cname + "\" id=\"dd_" + i + '_' + di.token + "\" style=\"cursor:default\">" + text  + "</div>";
  }
  return parHTML;
}

Snippetizer.getWordHTMLFromRangeDescription = function(info,di){
  var html = "";
  var end = Number(info.end);
  var bgn = Number(info.bgn);
  var loc = "";
  if(typeof info.locator !== 'undefined')loc = info.locator;
  for(var i=bgn; i<=end; i++){
    html += "<span id=\"dd_" + loc + "_" + Number(i).toString() + "_" + di.token +  "\">" + info.data[i] + " </span>";
  }
  return html;
}

Snippetizer.getCharacterHTMLFromRangeDescription = function(info,di){
  var html = "";
  if(info.bgn == 0){
    html += "<span class=\"deep-doc-word\">";
  }
  html += "<span class=\"deep-doc-char\">";
  var end = Number(info.end);
  var bgn = Number(info.bgn);
  var loc = "";
  if(typeof info.locator !== 'undefined')loc = info.locator;
  for(var i=bgn; i<=end; i++){
    html += "<span id=\"dd_" + loc + "_" + Number(i).toString() + "_" + di.token + "\">" + info.data[i] + "</span>";
  }
  html += "</span>";
  if(info.end == (info.data.length - 1)){
    html += " </span>";
  }
  return html;
}

Snippetizer.generateHTMLForCalloutGroup = function(list,addCheckboxes){
  var html = "";
  var odd = true;
  var co = null;
  for(var i=0; i<list.length; i++){
    co = list[i];
    cls = "dlg-list-item-drk";
    if(odd)cls = "dlg-list-item-lgt";
    html += "<div class=\"" + cls + "\">";
    if(addCheckboxes)html += "<input type=\"checkbox\">";
    html += + list[i].label + "</div>";
    odd = !odd;
  }
  return html;
}

Snippetizer.postHTMLInstallMethod = function(info){
  var s = Snippetizer;
  var scopeItem = SharedGlobal.core.scopeItem;
  var info = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = info.tempStore;
  var di = info.tempDIStore;
  var ss = s.getVaultSharedStorageForAppInstance(scopeItem.appInstanceId); //permanent storage in vault for searchability
  if(di.olf.linesMap !== 'undefined'){
    OutlineFormatter.lineCount = ts.deepDoc.c.length; 
    OutlineFormatter.lineIdPrefix = "dd_";
    OutlineFormatter.initializeOutlineFormatterForClientApplet(di.olf.linesMap);
    s.applyOutlineFormat(ts);
  }
  var sarr = ss.callouts[di.calloutGroup].cfmt.snippetArr;
  if(sarr.length > 0){
    //var sarr = di.cfmt.snippetArr;
    var snippet = null;
    var rangeInfo = null;
    var elmtArr = null;
    var loc1 = "";
    var loc2 = "";
    var dex = -1;
    if(di.rangeDescriptionArr.length < 1)return;
    for(var i=0; i<sarr.length; i++){
      snippet = sarr[i];
      s.ensureRDAGranularityAtLocation(ts,di,snippet.selection[0],true);
      s.ensureRDAGranularityAtLocation(ts,di,snippet.selection[1],false);
    }
    for(var i=0; i<sarr.length; i++){
      snippet = sarr[i];
      loc1 = snippet.selection[0];
      dex = loc1.indexOf("-1");
      if(dex > -1){
        if(dex > 0)loc1 = loc1.substring(0,dex - 1);
        else continue;
      }
      loc2 = snippet.selection[1];
      dex = loc2.indexOf("-1");
      if(dex > -1){
        if(dex > 0)loc2 = loc2.substring(0,dex - 1);
        else continue;
      }
      rangeInfo = s.getRDABoundariesFromTrustedLocation(loc1,loc2,di.rangeDescriptionArr); 
      if(rangeInfo === null)continue;
      s.setRestorePropertiesForRDARange(snippet.format,rangeInfo.firstId,rangeInfo.lastId);
      elmtArr = s.getElementArrayFromRDARange(rangeInfo.firstId,rangeInfo.lastId);
      s.formatDocElements(snippet.format,elmtArr);
    }
  }

  if(di.orderedSDKeysArr.length > 0){
     var loc1 = [];
     var loc2 = [];
     for(var i=0; i<di.orderedSDKeysArr.length; i++){
       try{
         loc1 = di.orderedSDKeysArr[i].slice(0,3);
         loc2 = di.orderedSDKeysArr[i].slice(3);
       }
       catch(err){
         console.log('undefined contents of orderedSDKeysArr ' + err);
       }
       s.ensureRDAGranularityAtLocation(ts,di,loc1,true);
       s.ensureRDAGranularityAtLocation(ts,di,loc2,false);
    }
    if(di.featuredSnippetIndex > -1){
      if(di.featuredSnippetIndex > di.orderedSDKeysArr.length){
        console.log('bad featuredSnippetIndex before getting keyArr');
      }
      var keyArr = di.orderedSDKeysArr[di.featuredSnippetIndex];
      if(typeof keyArr !== 'undefined'){
        di.featuredLocationArr = [keyArr.slice(0,3).join('_'),keyArr.slice(3).join('_')];
      }
      s.displaySnippetArtifacts(di);
      s.autoScroll();
    }
  }
  if(di.userMode === 'apply_outline'){
    OutlineFormatter.lineCount = ts.deepDoc.c.length; 
    postHTMLInstallForOutlineFormatter();
  }
}

Snippetizer.dataReceiverMethod = function(data,requestContext){
  var s = Snippetizer;
  data = data.replace(/\[sglqt\]/g,"'").replace(/\[dbqt\]/g,"\"").replace(/\[klammeraffe]/g,"@").replace(/\[tab]/g,"<span class=\"lg-spacer-item\"></span>"); 
//.replace(/\[lnglbrkt\]/g,"<").replace(/\[rnglbrkt\]/g,">");
  var haveAnnotations = false;
  var arr = data.split('[newline]');
  var str = "";
  var docLines = [];
  var mdString = "";
  var atMetadata = false;
  for(var i=0; i< arr.length; i++){
    if(arr[i].indexOf("`metadata`") == 0){
      atMetadata = true;
      continue;
    }
    if(atMetadata)mdString += arr[i];
    else docLines[i] = arr[i];
  }
  var tmpEnd = 100;
  if(docLines.length < 100)tmpEnd = docLines.length;
  else {
    if(0.25 * docLines.length > tmpEnd){
      tmpEnd = Math.floor(0.15 * docLines.length);
    }
  }
  if(mdString !== ""){
    var storageInfo = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
    storageInfo.tempStore.deepDocMetadata = JSON.parse(mdString);
    haveAnnotations = true;
  }
  //s.rangeDescriptionArr = [{"type":"par","bgn":0,"end":arr.length - 1,"data":docLines}];
  var ts = requestContext.ts;
  ts.deepDoc.c = docLines;
  SharedGlobal.core.requestRedraw(false);
  var scopeItem = requestContext.scopeItem;
//  if(scopeItem.userMode === 'apply_outline'){
//    var scopeItem = SharedGlobal.core.scopeItem;
//    OutlineFormatter.initializeOutlineFormatterForClientApplet(di.olf.linesMap);
//  }
  var di = requestContext.di;
  if(di.userMode === 'exhibition'){
    if(haveAnnotations){
      if(typeof scopeItem.anot === 'undefined'){
        document.getElementById('load-annotations').style.display = "block";
      }
      else {
        SharedGlobal.core.requestFileContents(scopeItem.anot.path,s.annotationsReceiverMethod,""); 
      }
    }
  }
}



//////////////// common shared functions ////////////////////

Snippetizer.insertIntoAggregateSDArray = function(di){

}

Snippetizer.aggregateSnippetData = function(ss,di){
  var calloutGrpLst = ["default_tweaks"];
  di.aggregateSDMap = {};
  for(var i=0; i<calloutGrpLst.length; i++){
    var coBag = ss.callouts[calloutGrpLst[i]];
    if(typeof coBag === 'undefined' || coBag == null){
      continue;
    }
    var sd = coBag.snippetData;
    if(typeof sd === 'undefined' || sd == null){
      continue;
    }
    var keys = Object.keys(sd);
    for(var j=0; j<keys.length; j++){
      var key = keys[j];
      var asdBag = di.aggregateSDMap[key];
      if(typeof asdBag === 'undefined'){
        asdBag = di.aggregateSDMap[key] = {"artifacts":[]};
      }
      var artifactLst = sd[key].artifacts;
      var tgtArtifactLst = asdBag.artifacts;
      for(var k=0; k<artifactLst.length; k++){
        tgtArtifactLst[tgtArtifactLst.length] = artifactLst[k];
      }
    }
  }
}

function handleSnippetizerKeyDown(e){
  var handled = false;
  var s = Snippetizer;
  var storageInfo = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  var di = storageInfo.tempDIStore;
  var keycode = SharedGlobal.core.getKeycodeFromEvent(e);
  if(di.userMode === 'apply_outline'){
    passKeyDownToOutlineFormatter(e);
    return true;
  }
  if(di.userMode === 'select_text'){
    if(keycode === 'Escape' || keycode === 'Esc'){
      di.verticalBump = 0;
      s.clearTextSelection(di);
      s.hideFeaturedSnippet();
    }
    if(keycode === 'KeyC' || keycode === 'c'){
      handled = copySnippetizerAppInfo(null,ts,di);
    } 
  }
  if(di.userMode === 'exhibition'){
    if(keycode === 'Escape' || keycode === 'Esc'){
      if(di.showBubble){
        di.showBubble = false;
        s.displayDOMElementGroup('floating_terrace','none',di);
        handled = true;
      }
      else {
        if(di.featuredSnippetIndex > -1){
          s.hideFeaturedSnippet();
          di.featuredSnippetIndex = -1;
          handled = true;
        }
      }
      di.verticalBump = 0;
    }
    if(keycode === 'Space' || keycode == 32){
      if(di.featuredSnippetIndex > -1 && di.showBubble){
        s.displayDOMElementGroup('floating_terrace','none',di);
      }
      s.featureNextInCycleSnippet(!e.shiftKey);
      if(di.featuredSnippetIndex != -1){
        di.verticalBump = 0;
        s.displaySnippetArtifacts(di);
        if(di.showBubble){
          s.displayFloatingTerrace(di);
        }
        s.autoScroll();
      }
      handled = true;
    }
    if(keycode === 'Enter'){
      if(di.showBubble == false && di.featuredSnippetIndex > -1){
        di.showBubble = true;
        s.displaySnippetArtifacts(di);
        s.displayFloatingTerrace(di);
      }
    }
  }
  return handled; 
}

function handleSnippetizerMouseDown(e){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  if(di.userMode === 'select_text'){
    return Snippetizer.handleSelectionMouseDown(e);
  }
  if(di.userMode === 'apply_outline'){
    return passMouseClickToOutlineFormatter(e,di.token);
  }
  return Snippetizer.handleEntityClick(e);
}

Snippetizer.autoScroll = function(){
  var paneIdx = SharedGlobal.core.getHostPaneIndex();
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getHostPaneIndex());
  var sdfElmt = document.getElementById('scrolling-doc-frame-' + wnd.paneId);
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var id = Snippetizer.getIdFromLocation(di.featuredLocationArr[0],di.token);
  var elmt = document.getElementById(id);
  if(elmt){
    var selRct = elmt.getBoundingClientRect();
    var frmRct = sdfElmt.getBoundingClientRect();
    var upperBound = parseInt(frmRct.top + (0.6 * frmRct.height));
    var lowerBound = parseInt(frmRct.top + (0.65 * frmRct.height));
    if(selRct.top < upperBound)sdfElmt.scrollTop = sdfElmt.scrollTop - (upperBound - selRct.top);
    if(selRct.top > lowerBound)sdfElmt.scrollTop = sdfElmt.scrollTop + (selRct.top - lowerBound);
  }
}

function copySnippetizerAppInfo(e,ts,di){
  if(typeof di === 'undefined'){
    var storageInfo = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
    ts = storageInfo.tempStore;
    di = storageInfo.tempDIStore;
  }
  if(di.foremost.location === "-1_-1_-1")return false;
  var memOb = {};
  var selTxt = Snippetizer.getSelectedSnippetizerText();
  if(e.altKey){
    memOb.type = 'lnkdata';
    if(selTxt.length < 80)memOb.label = selTxt;
    else memOb.label = selTxt.substring(0,76) + "...";
    memOb.vaultId = SharedGlobal.core.vaultId;
    memOb.bgn = di.foremost.location;
    memOb.end = di.aftmost.location;
    //memOb.float = "";
    memOb.inst = Snippetizer.appInstanceId;
    //protocol,domain,port,relative path, once support for inter-vault linking is ready
    if(di.showBubble !== null && di.featureSnippetIndex != -1){
      memOb.float = "on";
    }
    memOb.fsi = di.featuredSnippetIndex;
  }
  else {
    memOb.type = 'cn';
    memOb.label = selTxt;
    memOb.child = null;
  }
  SharedGlobal.core.writeToInternalClipboard(JSON.stringify(memOb));
  return true;
}

Snippetizer.findSnippetIndexFromLocationArray = function(tgtArr,di){
  var list = di.orderedSDKeysArr;
  var arr = (tgtArr.join('_')).split('_');
  var curArr = null;
  for(var i=0; i<list.length; i++){
    curArr = list[i];
    if(curArr[0] != arr[0])continue;
    if(curArr[1] != arr[1])continue;
    if(curArr[2] != arr[2])continue;
    if(curArr[3] != arr[3])continue;
    if(curArr[4] != arr[4])continue;
    if(curArr[5] != arr[5])continue;
    return i;
  }
  return -1;
}

Snippetizer.getNormalizedArrayKeyFromString = function(s){
  var arr = s.split('_');
  if(arr.length < 1)arr[0] = "-1";
  if(arr.length < 2)arr[1] = "-1";
  if(arr.length < 3)arr[2] = "-1";
  return arr;
}

Snippetizer.insertIntoSDKeyArrayList = function(newKey,di){
  var list = di.orderedSDKeysArr;
  var curKeyArr = null;
  var keyArr = newKey.split('_');
  var index = -1;
  for(var i=0; i<list.length; i++){
    curKeyArr = list[i];
    if(Snippetizer.isKeyGreater(curKeyArr,keyArr))continue;
    index = i;
    break;    
  } 
  if(index == -1){
    index = list.length;
  }
  var keyArr = newKey.split('_');
  for(var i=0; i<keyArr.length; i++){
    keyArr[i] = Number(keyArr[i]);
  }
  di.orderedSDKeysArr.splice(index,0,keyArr);
  return index;
}

Snippetizer.isKeyGreater = function(keyArr1,keyArr2){
  for(var i=0; i<keyArr1.length; i++){
    if(Number(keyArr1[i]) > keyArr2[i])return true;
  }
  return false; 
}

Snippetizer.radixSortOnLocationData = function(aggregateSDMap){
  if(typeof aggregateSDMap === 'undefined'){
    return {};
  }
  var bucketArr = [];
  var keyArr = Object.keys(aggregateSDMap);
  var arr = [];
  var locArr = null;
  for(var i=0; i<keyArr.length; i++){
    locArr = keyArr[i].split('_');
    for(var k=0; k<6; k++){
      locArr[k] = Number(locArr[k]);
    }
    arr[i] = locArr;
  }
  for(var i=5; i > -2; i--) {
    for(var j=0; j < arr.length; j++){
      var bucket = parseInt(arr[j][i]);
      if(bucketArr[bucket] == null ){
        bucketArr[bucket] = [];
      }
      bucketArr[bucket].push(arr[j]);
    }
    var pos = 0;
    for (var j = -1; j < bucketArr.length; j++) {
      var value = null ;
      if (typeof bucketArr[j] !== 'undefined' && bucketArr[j] != null ) {
        while ((value = bucketArr[j].shift()) != null ) {
          arr[pos++] = value;
        }
      }
    }
  }
  return arr;
}

Snippetizer.resetSelectionState = function(){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  di.foremost = new DISelectionInfo();
  di.aftmost = new DISelectionInfo();
}

function DISelectionInfo(){
  this.location = "-1_-1_-1";
  this.element = null;
  this.selected = -1;
}

Snippetizer.getVaultSharedStorageForAppInstance = function(appInstanceId){
  var apss = SharedGlobal.core.getVaultSharedStorage(Snippetizer.appId);
  var store = apss[appInstanceId];
  if(typeof store === 'undefined'){
    store = apss[appInstanceId] = {};
  }
  return store;
}

Snippetizer.getIdFromRangeDescriptionAndPos = function(rdEntry,pos,token){
  var id = "";
  if(typeof rdEntry === 'undefined')return "";
  if(rdEntry.type === 'par')id = "dd_" + Number(pos).toString() + "_" + token;
  else id = "dd_" + rdEntry.locator + "_" + Number(pos).toString() + "_" + token; 
  return id;
}

Snippetizer.getIdFromGranularityAndLocation = function(g,locationArr,token){
  var idStr = "dd";
  var garr = ['par','word','char'];
  for(var i=0; i<3; i++){
    if(locationArr[i] == -1)break;
    idStr += "_" + Number(locationArr[i]).toString();
    if(g === garr[i])break;
  }
  if(idStr === "dd")idStr = "";
  return idStr + '_' + token;
}

Snippetizer.getIdFromLocation = function(locationArr,token){
  var id = "dd";
  if(typeof locationArr === 'undefined')return "";
  locarr = locationArr.split('_');
  for(var i=0; i<3; i++){
    if(locarr[i] === '-1')break;
    id += "_" + locarr[i];
  }
  return id + '_' + token;
}

Snippetizer.isolateTargetedEntryPosition = function(di,epInfo){
  var updateInfo = {};
  updateInfo.bumps = 0;
  if(epInfo.rdEntry.bgn !== epInfo.rdEntry.end){
    var rda = di.rangeDescriptionArr;
    var s = Snippetizer;
    if(epInfo.pos !== epInfo.rdEntry.bgn){
      s.spawnNewRangeDescriptionBeforePos(epInfo.entryId,epInfo.pos,rda);
      epInfo.entryId++;
      epInfo.rdEntry = rda[epInfo.entryId];
      updateInfo.bumps++;
    }
    if(epInfo.pos !== epInfo.rdEntry.end){
      s.spawnNewRangeDescriptionAfterPos(epInfo.entryId,epInfo.pos,rda);
      updateInfo.bumps++;
    }
  }
  return updateInfo;
}

Snippetizer.spawnNewRangeDescriptionBeforePos = function(tgtEntryId,pos,rda){
  var rdEntry = rda[tgtEntryId];
  if(rdEntry.pos === rdEntry.bgn)return null;
  var nuEntry = {};
  nuEntry.type = rdEntry.type;
  nuEntry.data = rdEntry.data;
  nuEntry.locator = rdEntry.locator;
  nuEntry.locatorArr = rdEntry.locatorArr;
  nuEntry.restoreProps = rdEntry.restoreProps;
  nuEntry.bgn = rdEntry.bgn;
  nuEntry.end = pos - 1;
  rdEntry.bgn = pos;
  rda.splice(tgtEntryId,0,nuEntry);
  return nuEntry;
}

Snippetizer.spawnNewRangeDescriptionAfterPos = function(tgtEntryId,pos,rda){
  var rdEntry = rda[tgtEntryId];
  if(rdEntry.pos === rdEntry.end)return null;
  var nuEntry = {};
  nuEntry.type = rdEntry.type;
  nuEntry.data = rdEntry.data;
  nuEntry.locator = rdEntry.locator;
  nuEntry.locatorArr = rdEntry.locatorArr;
  nuEntry.restoreProps = rdEntry.restoreProps;
  nuEntry.bgn = pos + 1;
  nuEntry.end = rdEntry.end;
  rdEntry.end = pos;
  rda.splice(tgtEntryId + 1,0,nuEntry);
  return nuEntry;
}

Snippetizer.moveLineBufferFwd = function(){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var lowerBound = di.bufferedScrollPos - SnippetizerFrameBuffer.margin;
  var upperBound = di.bufferedScrollPos + SnippetizerFrameBuffer.margin + Snippetizer.windowSize;
  var elmt = null;
  var box = null;
  var canMove = true;
  var index = di.frameBuffer.leadingEdge;
  while(canMove){
    elmt = document.getElementById('line-' + Number(index).toString());
    if(elmt){
      box = elmt.getBoundingClientRect();
      if(box.top < lowerBound){
        
      }
    }
  }
}

Snippetizer.moveSnippetizerLineBufferBkwd = function(){

}



/////////////// snippet selection functions ////////////////////

Snippetizer.updateElementSelection = function(select,di,spanInfo){
  var rda = di.rangeDescriptionArr;
  var startPos = di.foremost.selected;
  var endPos = di.aftmost.selected + 1;
  if(typeof spanInfo !== 'undefined'){
    startPos = spanInfo.firstId;
    endPos = spanInfo.lastId + 1;
  }
  var typeCnMap = null;
  var bgClr = Snippetizer.baseBgClr;
  var clr = Snippetizer.baseClr;
  if(select){
    bgClr = Snippetizer.baseSelBgClr;
    clr = Snippetizer.baseSelClr;
  }
  var id = -1;
  var elmt = null;
  var rdEntry = null;
  for(var i=startPos; i<endPos; i++){
    rdEntry = rda[i];
    if(typeof rdEntry === 'undefined')break;
    for(var j=rdEntry.bgn; j<=rdEntry.end; j++){
      id = Snippetizer.getIdFromRangeDescriptionAndPos(rdEntry,j,di.token); 
      elmt = document.getElementById(id);
      if(elmt){
        if(select == false && typeof rdEntry.restoreProps !== 'undefined'){
          elmt.style.backgroundColor = rdEntry.restoreProps.bgColor;
          elmt.style.color = rdEntry.restoreProps.fgColor;
        }
        else {
          elmt.style.backgroundColor = bgClr; 
          elmt.style.color = clr;
        }
        elmt.style.textDecoration = "none";
      }
      else console.log("Error: element id is invalid within updateElementSelection");
    }
  }
};


Snippetizer.handleSelectionMouseDown = function(e){
  var s = Snippetizer;
  var storageInfo = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  var di = storageInfo.tempDIStore;
  var appletItem = SharedGlobal.core.scopeItem;
  if(appletItem.boundLocation === "")return false;
  var selectionInfo = {};
  selectionInfo.arr1 = s.selectionArrayFromSelectionString(di.foremost.location);
  selectionInfo.arr2 = s.selectionArrayFromSelectionString(di.aftmost.location);
  var rda = di.rangeDescriptionArr;
  var box1 = null;
  var box2 = null;
  var firstSelElmt = null;
  var lastSelElmt = null;
  var x = e.clientX;
  var y = e.clientY;
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
  var hitInfo = s.retrieveLocationInfoFromClick(e,di);
  di.bufferedClickInfo.clientX = e.clientX;
  di.bufferedClickInfo.clientY = e.clientY;
  di.bufferedScrollPos = 0;
  elmt = document.getElementById('scrolling-doc-frame-' + wnd.paneId);
  if(elmt){
    di.bufferedScrollPos = elmt.scrollTop;
  }
  firstSelElmt = s.getElementFromSelectionArray(selectionInfo.arr1,di.token);
  if(firstSelElmt){
    box1 = firstSelElmt.getBoundingClientRect();
  }
  lastSelElmt = s.getElementFromSelectionArray(selectionInfo.arr2,di.token);
  if(lastSelElmt){
    box2 = lastSelElmt.getBoundingClientRect();
  }
  if(firstSelElmt && !lastSelElmt){
    console.log("Error: selection exists, but does not have proper extent");
    return;
  }
  if(firstSelElmt !== null){
    if(s.pointPrecedesElmt(x,y,box1)){
      s.expandSelectionIncludeClick(hitInfo,selectionInfo,true);
    }
    else {
      if(s.pointLiesBeyondElmt(x,y,box2)){
        s.expandSelectionIncludeClick(hitInfo,selectionInfo,false);
      }
      else { 
        var g = s.promoteSnippetizerGranularity();
        if(g === 'jot'){
          s.clearTextSelection(di);
          return true;
        }
        else {
          s.updateElementSelection(false,di);
          s.selectAtClick(hitInfo,selectionInfo);
        }
      }
    }
  }
  else {
    s.selectAtClick(hitInfo,selectionInfo);
  }
  di.foremost.location = selectionInfo.arr1.join('_');
  di.aftmost.location = selectionInfo.arr2.join('_');
  return true;
}

Snippetizer.handleEntityClick = function(e){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var mdPos = di.metadataArrayPos;
  var list = document.getElementsByClassName('anot');
  var box = null;
  for(var i=0; i<list.length; i++){
    box = list[i].getBoundingClientRect();
    if(SharedGlobal.core.pointIsInRect(e.clientX,e.clientY,box)){
      var customDlgInfo = {"fields":[
        {type:"edit",label:"",box_class:"large",value:"",key:""},
      ]};
      customDlgInfo.fields[0].value = Snippetizer.externalAnnotations[i];
      SharedGlobal.core.displayCustomPopup(customDlgInfo,function(){});
      return;
    }
  }
}

Snippetizer.clearTextSelection = function(di){
  var s = Snippetizer;
  s.updateElementSelection(false,di);
  di.selectionGranularity  = 'par';
  di.foremost.location = "-1_-1_-1";
  di.aftmost.location = "-1_-1_-1";
}

Snippetizer.hideFeaturedSnippet = function(){
  var s = Snippetizer;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var locArr = di.featuredLocationArr;
  if(locArr.length < 2)return;
  var rslt = s.getRDABoundariesFromTrustedLocation(locArr[0],locArr[1],rda);
  if(rslt){
    s.updateElementSelection(false,di,rslt);
  }
  di.featuredLocationArr = [];
  var igElmt = document.getElementById('sideIconGrp' + di.token);
  if(igElmt){
    igElmt.innerHTML = "";
  }
}

Snippetizer.pointPrecedesElmt = function(x,y,box){
  if(y < box.top)return true;
  if(y < box.bottom && x < box.left)return true;
  return false; 
}

Snippetizer.pointLiesBeyondElmt = function(x,y,box){
  if(y > box.bottom)return true;
  if(y > box.top && x > box.right)return true;
  return false;
}

Snippetizer.expandSelectionIncludeClick = function(hitInfo,selInfo,clickIsShy){
  var s = Snippetizer;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var granularity = di.selectionGranularity;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var rangeInfo = null;
  var updateInfo = null;
  for(var i=0; i<4; i++){
    if(s.granularityRankMap[hitInfo.rdEntry.type] > s.granularityRankMap[granularity]){
      rangeInfo = s.expandSelectionIncludeMatchingAdjacentRDEntries(hitInfo.entryId,granularity);
      if(rangeInfo.firstId !== hitInfo.entryId || rangeInfo.lastId !== hitInfo.entryId){
        break;
      }
    } 
    updateInfo = s.isolateTargetedEntryPosition(di,hitInfo);
    if(clickIsShy)di.aftmost.selected += updateInfo.bumps; 
    if(granularity === hitInfo.rdEntry.type){
      break;
    }
    s.promoteSingleElementEntryGranularity(granularity,hitInfo.rdEntry);
    if(hitInfo.rdEntry.type === 'word'){
      hitInfo.element.innerHTML = s.getWordHTMLFromRangeDescription(hitInfo.rdEntry,di);
    }
    if(hitInfo.rdEntry.type === 'char'){
      hitInfo.element.innerHTML = s.getCharacterHTMLFromRangeDescription(hitInfo.rdEntry,di);
    }
    hitInfo = s.retrieveLocationInfoFromClick(hitInfo.e,di); 
  }
  var updateStr = 'last';
  if(clickIsShy){
    updateStr = 'first';
    if(rangeInfo !== null)di.foremost.selected = rangeInfo.firstId;
    else di.foremost.selected = hitInfo.entryId;
  }
  else {
    if(rangeInfo !== null)di.aftmost.selected = rangeInfo.lastId;
    else di.aftmost.selected = hitInfo.entryId;
  }
  s.updateElementSelection(true,di);
  s.updateSelectionInfoFromHitInfo(hitInfo,selInfo,updateStr);
}

Snippetizer.updateSelectionInfoFromHitInfo = function(hitInfo,selInfo,updateCd){
  var selStr = hitInfo.pos;
  if(typeof hitInfo.rdEntry.locator !== 'undefined'){
    selStr = hitInfo.rdEntry.locator + "_" + selStr;
  }
  if(hitInfo.rdEntry.type === 'par')selStr += "_-1_-1";
  if(hitInfo.rdEntry.type === 'word')selStr += "_-1";
  if(updateCd === 'first' || updateCd === 'both')selInfo.arr1 = Snippetizer.selectionArrayFromSelectionString(selStr);
  if(updateCd === 'last' || updateCd === 'both')selInfo.arr2 = Snippetizer.selectionArrayFromSelectionString(selStr);
}


Snippetizer.promoteSingleElementEntryGranularity = function(granularity,rdEntry){
  if(rdEntry.bgn !== rdEntry.end){
    console.log("Error: SingleElement method tried to operate on multi-element object");
    return;
  }
  if(Snippetizer.granularityRankMap[granularity] > Snippetizer.granularityRankMap[rdEntry.type]){
    var delimiter = " ";
    if(rdEntry.type === 'word')delimiter = "";
    rdEntry.data = rdEntry.data[rdEntry.bgn].split(delimiter);
    if(typeof rdEntry.locator !== 'undefined')rdEntry.locator += "_" + rdEntry.bgn;
    else rdEntry.locator = Number(rdEntry.bgn).toString();
    rdEntry.locatorArr = rdEntry.locator.split('_');
    rdEntry.bgn = 0;
    rdEntry.end = rdEntry.data.length - 1;
    rdEntry.type = Snippetizer.nextGranularity(rdEntry.type);
  } 
}

Snippetizer.selectAtClick = function(hitInfo,selInfo){
  var s = Snippetizer;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var granularity = di.selectionGranularity;
  var rda = di.rangeDescriptionArr;
  var rangeInfo = null;
  for(var i=0; i<4; i++){
    if(hitInfo.rdEntry == null)continue;
    if(s.granularityRankMap[hitInfo.rdEntry.type] > s.granularityRankMap[granularity]){
      rangeInfo = s.expandSelectionIncludeMatchingAdjacentRDEntries(hitInfo.entryId,granularity);
      if(rangeInfo.firstId !== hitInfo.entryId || rangeInfo.lastId !== hitInfo.entryId){
        break;
      }
    } 
    s.isolateTargetedEntryPosition(di,hitInfo);
    if(granularity === hitInfo.rdEntry.type){
      break;
    }
    s.promoteSingleElementEntryGranularity(granularity,hitInfo.rdEntry);
    if(hitInfo.rdEntry.type === 'word'){
      hitInfo.element.innerHTML = s.getWordHTMLFromRangeDescription(hitInfo.rdEntry,di);
    }
    if(hitInfo.rdEntry.type === 'char'){
      hitInfo.element.innerHTML = s.getCharacterHTMLFromRangeDescription(hitInfo.rdEntry,di);
    }
    hitInfo = s.retrieveLocationInfoFromClick(hitInfo.e,di); 
  }
  if(rangeInfo !== null){
    di.foremost.selected = rangeInfo.firstId;
    di.aftmost.selected = rangeInfo.lastId;
  }
  else {
    di.foremost.selected = hitInfo.entryId;
    di.aftmost.selected = hitInfo.entryId;
  }
  s.updateElementSelection(true,di);
  s.updateSelectionInfoFromHitInfo(hitInfo,selInfo,'both');
}

Snippetizer.expandSelectionIncludeMatchingAdjacentRDEntries = function(entryId,granularity){
  var rangeInfo = {};
  rangeInfo.firstId = entryId;
  rangeInfo.lastId = entryId;
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var matchStr = "";
  var matchStr2 = "";
  var rdEntry = rda[entryId];
  var grank = Snippetizer.granularityRankMap[granularity]; //rdEntry.type];
  if(granularity === 'char')return rangeInfo;
  if(rdEntry.type === 'par')return rangeInfo;
  if(rdEntry.type === granularity)return;
  if(rdEntry.type === 'word'){
    matchStr = rdEntry.locatorArr[0];
  }
  if(rdEntry.type === 'char'){
    matchStr = rdEntry.locatorArr[0];
    if(granularity === 'word')matchStr += "_" + rdEntry.locatorArr[1];
  }
  for(var i=entryId - 1; i > -1; i--){
    rdEntry = rda[i];
    if(rdEntry.type === granularity)break;
    if(rdEntry.type === 'par')break;
    else {
      if(rdEntry.type === 'word'){
        matchStr2 = rdEntry.locatorArr[0];
      }
      else {
        if(rdEntry.type === 'char'){
          matchStr2 = rdEntry.locatorArr[0];
          if(granularity === 'word')matchStr2 += '_' + rdEntry.locatorArr[1];
        }
      }
    }
    if(matchStr === matchStr2){
      rangeInfo.firstId = i;
    }
    else break;
  }
  for(var i=entryId + 1; i < rda.length; i++){
    rdEntry = rda[i];
    if(rdEntry.type === granularity)break;
    if(rdEntry.type === 'par')break;
    else {
      if(rdEntry.type === 'word'){
        matchStr2 = rdEntry.locatorArr[0];
      }
      else {
        if(rdEntry.type === 'char'){
          matchStr2 = rdEntry.locatorArr[0];
          if(granularity === 'word')matchStr2 += '_' + rdEntry.locatorArr[1];
        }
      }
    }
    if(matchStr === matchStr2){
      rangeInfo.lastId = i;
    }
    else break;
  }
  return rangeInfo;
}

Snippetizer.retrieveLocationInfoFromClick = function(e){
  var tgtInfo = {};
  tgtInfo.rdEntry = null;
  tgtInfo.element = null;
  tgtInfo.box = null;
  tgtInfo.e = {};
  tgtInfo.e.clientX = e.clientX;
  tgtInfo.e.clientY = e.clientY;
  tgtInfo.parIndex = 0;
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var rdEntry = null;
  var elmt = null;
  var box = null;
  var id = null;
  for(var i=0; i<rda.length; i++){
    rdEntry = rda[i];
    for(var j=rdEntry.bgn; j<=rdEntry.end; j++){
      id = Snippetizer.getIdFromRangeDescriptionAndPos(rdEntry,j,di.token);
      elmt = document.getElementById(id);
      if(elmt){
        box = elmt.getBoundingClientRect();
        if(SharedGlobal.core.pointIsInRect(e.clientX,e.clientY,box)){
          tgtInfo.entryId = i;
          tgtInfo.rdEntry = rdEntry;
          tgtInfo.pos = j;
          tgtInfo.element = elmt;
          tgtInfo.box = box;
          if(rdEntry.type === 'par')tgtInfo.parIndex = j;
          else tgtInfo.parIndex = rdEntry.locatorArr[0];
          break;
        }
      }
    }
  } 
  return tgtInfo;
}

Snippetizer.getElementFromSelectionArray = function(sarr,token){
  var id = "";
  for(var i=0; i<sarr.length; i++){
    if(sarr[i] !== -1){
      if(i != 0)id += "_";
      id += sarr[i];
    }
  }
  return document.getElementById("dd_" + id + "_" + token);
}

Snippetizer.selectionArrayFromSelectionString = function(selStr){
  var arr = selStr.split('_');
  for(var i=0; i<arr.length; i++){
    arr[i] = Number(arr[i]);
  }
  return arr;
}

Snippetizer.promoteSnippetizerGranularity = function(){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var gran = di.selectionGranularity;
  gran = di.selectionGranularity = Snippetizer.nextGranularity(gran); 
  return gran;
}

Snippetizer.getSelectedSnippetizerText = function(){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var txt = "";
  var rdEntry = null;
  var bgn = di.foremost.selected;
  var endPlus1 = di.aftmost.selected + 1;
  var ep1 = -1;
  for(var i=bgn; i<endPlus1; i++){
    rdEntry = rda[i];
    ep1 = rdEntry.end + 1;
    for(var j=rdEntry.bgn; j<ep1; j++){
      txt += rdEntry.data[j];
      if(rdEntry.type === 'word')txt += " ";
      if(rdEntry.type === 'char' && j == (rdEntry.data.length - 1))txt += " ";
    }
  }
  return txt;
}


////////////// Selection formatting and artifact creation functions //////////////////

Snippetizer.toggleSelectTextMode = function(){
  var s = Snippetizer;
  var scopeItem = SharedGlobal.core.scopeItem;
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var lst = [];
  var pos = 0;
  if(di.userMode === 'select_text'){
    s.exitSelectTextMode();
  }
  else {
    s.enterSelectTextMode(di);
    if(di.userMode === 'apply_outline'){
      s.exitApplyOutlineMode();  
    }
  }
}

Snippetizer.enterSelectTextMode = function(di){
  var s = Snippetizer;
  s.clearTextSelection(di);
  s.hideFeaturedSnippet();
  if(di.showBubble && di.featureSnippetIndex != -1){
    s.displayDOMElementGroup('floating_terrace','none',di);
  }
  di.featuredSnippetIndex = -1;
  di.userMode = 'select_text';
  var lst = [];
  var pos = 0;
  lst[pos++] = {"group":"author","commandSequence":"inbound link info","visible":true};
  lst[pos++] = {"group":"author","commandSequence":"format selection","visible":true};
  lst[pos++] = {"group":"author","commandSequence":"add_snippet comment","visible":true};
  lst[pos++] = {"group":"author","commandSequence":"add_snippet link","visible":true};
  var wndIdx = SharedGlobal.core.getHostPaneIndex(); 
  SharedGlobal.core.setMenuitemVisibilityFromList(wndIdx,lst);
  //add check mark symbol
  document.getElementById('select-text').innerHTML = "select text &#10003"; 
}

Snippetizer.exitSelectTextMode = function(){
  var s = Snippetizer;
  var miStr = 'select text';
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  di.userMode = 'exhibition';
  s.clearTextSelection(di);
  var lst = [];
  var pos = 0;
  lst[pos++] = {"group":"author","commandSequence":"inbound link info","visible":false};
  lst[pos++] = {"group":"author","commandSequence":"format selection","visible":false};
  lst[pos++] = {"group":"author","commandSequence":"add_snippet comment","visible":false};
  lst[pos++] = {"group":"author","commandSequence":"add_snippet link","visible":false};
  s.displaySnippetArtifacts(di);
  var wndIdx = SharedGlobal.core.getHostPaneIndex();
  SharedGlobal.core.setMenuitemVisibilityFromList(wndIdx,lst);
  document.getElementById('select-text').innerHTML = miStr;
}

Snippetizer.editFormatForSelectedLine = function(e){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  if(di.foremost.location === "-1_-1_-1")return false;
  var loc = [di.foremost.location,di.aftmost.location];
  var fmtVals = Snippetizer.defaultLineFormat;
  var snippet = null;
  var scopeItem = SharedGlobal.core.getSelectionInfo().scopeItem;
  var ss = Snippetizer.getVaultSharedStorageForAppInstance(scopeItem.appInstanceId);
  var sarr = ss.callouts[di.calloutGroup].cfmt.snippetArr;
  var rslt = Snippetizer.checkSnippetFormatArrayForLocation(loc,sarr);
  if(rslt.snippet === null){
    snippet = {};
    snippet.format = fmtVals;
    snippet.selection = loc;
    di.snippetArrayPos = sarr.length;
    Snippetizer.currentSnippet = snippet;
  }
  else {
    di.snippetArrayPos = rslt.index;
    Snippetizer.currentSnippet = snippet = rslt.snippet;
    fmtVals = snippet.format;
  }
  if(e.altKey)fmtVals = Snippetizer.lastLineFormatUsed;
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"Format selected text"},
{type:"edit",label:"font size: ",box_class:"short",value:"",key:"fs"},
{type:"edit",label:"font family:",box_class:"long",value:"",key:"ff"},
{type:"edit",label:"color:",box_class:"medium",value:"",key:"clr"},
{type:"edit",label:"background color:",box_class:"medium",value:"",key:"bgc"},
{type:"edit",label:"border color:",box_class:"medium",value:"",key:"bc"},
{type:"edit",label:"border width:",box_class:"medium",value:"",key:"bw"},
{type:"edit",label:"border style:",box_class:"medium",value:"",key:"bs"},
{type:"edit",label:"text decoration: ",box_class:"short",value:"0",key:"td"},
{type:"checkbox",label:"all caps",value:false,key:"ac"},
{type:"checkbox",label:"italicized",value:false,key:"ital"},
{type:"checkbox",label:"center horizontally",value:false,key:"ctr"},
{type:"edit",label:"padding above: ",box_class:"short",value:"0",key:"pa"},
{type:"edit",label:"padding below: ",box_class:"short",value:"0",key:"pb"},
{type:"edit",label:"left indents: ",box_class:"short",value:"0",key:"li"}
]};
  for(var i=1; i<15; i++){
    customDlgInfo.fields[i].value = fmtVals[i - 1];  
  }
  SharedGlobal.core.displayCustomPopup(customDlgInfo,Snippetizer.acceptCustomDlgFormatValues);
  Snippetizer.tempDIStoreBuf = di;
}

Snippetizer.acceptCustomDlgFormatValues = function(resultMap){
  var fmtArr = [];
  fmtArr[0] = resultMap['fs'].value;
  fmtArr[1] = resultMap['ff'].value;
  fmtArr[2] = resultMap['clr'].value;
  fmtArr[3] = resultMap['bgc'].value;
  fmtArr[4] = resultMap['bc'].value;
  fmtArr[5] = resultMap['bw'].value;
  fmtArr[6] = resultMap['bs'].value;
  fmtArr[7] = resultMap['td'].value;
  fmtArr[8] = resultMap['ac'].value;
  fmtArr[9] = resultMap['ital'].value;
  fmtArr[10] = resultMap['ctr'].value;
  fmtArr[11] = resultMap['pa'].value;
  fmtArr[12] = resultMap['pb'].value;
  fmtArr[13] = resultMap['li'].value;
  lastLineFormatUsed = fmtArr; 
  var s = Snippetizer;
  var si = SharedGlobal.core.getSelectionInfo();//specify pane index if not concerned with active pane
  var ss = s.getVaultSharedStorageForAppInstance(si.scopeItem.appInstanceId); //permanent storage in vault for searchability
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var snippet = s.currentSnippet;
  var cfmt = ss.callouts[di.calloutGroup].cfmt;
  cfmt.snippetArr[di.snippetArrayPos] = snippet;
  snippet.format = fmtArr;
  var sarr = cfmt.snippetArr;
  if(di.snippetArrayPos == sarr.length)sarr[sarr.length] = snippet;
  var elmtArr = s.getElementArrayFromRDARange(di.foremost.selected,di.aftmost.selected);
  s.formatDocElements(snippet.format,elmtArr);
  s.setRestorePropertiesForRDARange(fmtArr,di.foremost.selected,di.aftmost.selected);
  s.resetSelectionState();  
  SharedGlobal.core.promptToSave();
}

Snippetizer.checkSnippetFormatArrayForLocation = function(location,arr){
  var rslt = {};
  rslt.snippet = null;
  rslt.index = -1;
  var snip = null;
  for(var i=0; i<arr.length; i++){
    snip = arr[i];
    if(snip.selection[0] === location[0] && snip.selection[1] === location[1]){
      rslt.index = i;
      rslt.snippet = snip;
    }
  } 
  return rslt;
};

Snippetizer.addCommentToCurrentLocation = function(){
  var storageInfo = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  var di = storageInfo.tempDIStore;
  SharedGlobal.core.dismissCurrentDialogBox();
  if(di.foremost.location === "-1_-1_-1" && di.featuredLocationArr.length == 0)return;
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"Add comment"},
{type:"edit",label:"",box_class:"large",value:"",key:"msg"},
]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,Snippetizer.acceptComment);
}

Snippetizer.acceptComment = function(resultMap){
  SharedGlobal.core.dismissCurrentDialogBox();
  var s = Snippetizer;
  var sa = new SnippetArtifact();
  sa.type = "comment";
  sa.msg = resultMap['msg'].value;
  Snippetizer.acceptSnippetDataAtLocation(sa,true);
}

Snippetizer.addLinkToCurrentLocation = function(){
  var storageInfo = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  var di = storageInfo.tempDIStore;
  SharedGlobal.core.dismissCurrentDialogBox();
  if(di.foremost.location === "-1_-1_-1" && di.featuredLocationArr.length == 0)return;
  var lnkVal = JSON.parse(SharedGlobal.core.getInternalClipboardData());
  if(lnkVal === null){
    alert("Before attempting to add link information to a snippet, please use ALT + C in order to obtain link information for a desired target, so that it gets written to the JavaScript clipboard");
    return;
  }
  if(typeof lnkVal.type === 'undefined' || lnkVal.type !== 'lnkdata'){
    alert("Error: This is not a flexlink object. Please use ALT+C in order to obtain link information for a desired target, so that it gets written to the JavaScript clipboard");
    return;
  }
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"Add link"},
{type:"normal_text",text:"Link label"},
{type:"edit",label:"",box_class:"large",value:lnkVal.label,key:"label"},
{type:"hidden",value:lnkVal,key:"lnkdata"}
]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,Snippetizer.acceptLink);
}

Snippetizer.acceptLink = function(resultMap){
  SharedGlobal.core.dismissCurrentDialogBox();
  var sa = new SnippetArtifact();
  sa.type = "navlink";
  sa.lnk = resultMap['lnkdata'].value;
  sa.lnk.label = resultMap['label'].value;
  Snippetizer.acceptSnippetDataAtLocation(sa,true);
}

Snippetizer.acceptSnippetDataAtLocation = function(artifactOb,save){
  var s = Snippetizer;
  var ss = s.getVaultSharedStorageForAppInstance(SharedGlobal.core.scopeItem.appInstanceId); 
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var locArr =  di.featuredLocationArr;
  if(di.foremost.location !== "-1_-1_-1"){
    locArr = di.featuredLocationArr = [di.foremost.location,di.aftmost.location]
  }
  var key = locArr.join('_');
  var sd = ss.callouts[di.calloutGroup].snippetData;
  if(typeof sd[key] === 'undefined'){
    sd[key] = {"artifacts":[]};
  }
  var sdBag = sd[key];
  sdBag.artifacts[sdBag.artifacts.length] = artifactOb;
  s.aggregateSnippetData(ss,di);
  di.orderedSDKeysArr = s.radixSortOnLocationData(di.aggregateSDMap);
  di.featuredSnippetIndex = s.findSnippetIndexFromLocationArray(locArr,di);
  if(save){
    SharedGlobal.core.promptToSave();
  }
}

Snippetizer.createAnnotation = function(){
  //not in use
  // rework this to create traditional annotation (not same as comment)
  SharedGlobal.core.dismissCurrentDialogBox();
  var customDlgInfo = {"fields":[
{type:"normal_text",text:"Annotation text:"},
{type:"edit",label:"",box_class:"large",value:"",key:"msg"},
{type:"edit",label:"HTML color",box_class:"short",value:"#ffaa00",key:"color"}
]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,Snippetizer.acceptCustomDlgAnnotationValue);
}

Snippetizer.acceptCustomDlgAnnotationValue = function(resultMap){
  //not in use
  // placeholder to create traditional annotations
  SharedGlobal.core.dismissCurrentDialogBox();
  var s = Snippetizer;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var sa = new SnippetArtifact();
  sa.type = "annotation";
  sa.msg = resultMap['msg'].value;
  sa.format[2] = resultMap['color'].value;
  sa.loc = [di.foremost.location,di.aftmost.location]
  var key = sa.loc.join('-');
  //this asdBag should be relocated to the aggregateSDMap !!!
  var asdBag = di.snippetData[key];
  if(typeof asdBag === 'undefined'){
    asdBag = di.snippetData[key] = {"artifacts":[]}
  }
  asdBag.artifacts[asdBag.artifacts.length] = sa;
  SharedGlobal.core.promptToSave();
  s.clearTextSelection(di);
}

Snippetizer.createEmojiCallout = function(){
  SharedGlobal.core.dismissCurrentDialogBox();
}

Snippetizer.createLinkCallout = function(){
  SharedGlobal.core.dismissCurrentDialogBox();
}

Snippetizer.getInboundLinkInfo = function(){

}

Snippetizer.handleTerracePaneClick = function(e){
  var items = this.getElementsByClassName('basic-child-item');
  var box = null;
  var index = -1;
  for(var i=0; i<items.length; i++){
    box = items[i].getBoundingClientRect();
    if(SharedGlobal.core.pointIsInRect(e.clientX,e.clientY,box)){
      index = i;
      break;
    }
  }  
  if(index > -1){
    var ss = Snippetizer.getVaultSharedStorageForAppInstance(SharedGlobal.core.scopeItem.appInstanceId);
    var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
    var sdKey = di.orderedSDKeysArr[di.featuredSnippetIndex].join('_');
    var artifactList = ss.callouts[di.calloutGroup].snippetData[sdKey].artifacts;
    if(artifactList[index].type === 'navlink'){
      SharedGlobal.core.followLink(artifactList[index].lnk);
    }
  }
}

function SnippetArtifact(){
  this.type = "";
  this.format = Snippetizer.defaultLineFormat;
  //this.format[7] = "underline";
}

Snippetizer.ensureRDAGranularityAtLocation = function(ts,di,location,breakBefore){
  var s = Snippetizer;
  var locArr = location;
  if(typeof location.split === 'function'){
    locArr = location.split('_');
    for(var i=0; i<locArr.length; i++){
      locArr[i] = Number(locArr[i]);
    }
  }
  if(locArr.length < 3)locArr[2] = -1;
  if(locArr.length < 2)locArr[1] = -1;
  locArr[3] = -1;
  var rda = di.rangeDescriptionArr;
  var garr = ['par','word','char'];
  var rdEntry = null;
  var rangeInfo = {};
  rangeInfo.firstId = 0;
  rangeInfo.lastId = rda.length - 1;
  var id = "";
  var elmt = null;
  var pos = -1;
  var isoRslt = null;
  var needToPromote = false;
  for(var i=0; i<3; i++){
    pos = locArr[i];
    if(pos == -1)break;
    if(locArr[i + 1] == -1)needToPromote = false;
    else needToPromote = true;
    rangeInfo = s.getRDABoundariesFromIndex(garr[i],pos,rangeInfo.firstId,rangeInfo.lastId,rda);
    if(rangeInfo.firstId !== rangeInfo.lastId)continue;
    rdEntry = rda[rangeInfo.firstId];
    if(s.granularityRankMap[rdEntry.type] > s.granularityRankMap[garr[i]])continue; 
    if(needToPromote){
      if(rdEntry.bgn !== rdEntry.end){
        isoRslt = s.isolateTargetedEntryPosition(di,{entryId:rangeInfo.firstId,rdEntry:rdEntry,pos:locArr[i]});
        rangeInfo.lastId += isoRslt.bumps;
      }
      s.promoteSingleElementEntryGranularity(garr[i + 1],rdEntry);
    }
    else {
      if(breakBefore && rdEntry.bgn !== pos){
        s.spawnNewRangeDescriptionBeforePos(rangeInfo.firstId,pos,rda);
      }
      else {
        if(rdEntry.end !== pos){
          s.spawnNewRangeDescriptionAfterPos(rangeInfo.lastId,pos,rda);
        }
      }
    }
    id = s.getIdFromGranularityAndLocation(garr[i],locArr,di.token);
    elmt = document.getElementById(id);
    if(elmt === null){
      console.log("Error: DOM element not found for id: " + id);
      continue;
    }
    if(needToPromote){
      if(garr[i] === 'par'){
        elmt.innerHTML = s.getWordHTMLFromRangeDescription(rdEntry,di);
      }
      if(garr[i] === 'word'){
        elmt.innerHTML = s.getCharacterHTMLFromRangeDescription(rdEntry,di);
      }
    }
  }
}

Snippetizer.getRDABoundariesFromIndex = function(granularity,index,rangeStart,rangeEnd,rda){
  var rslt = {};
  rslt.notPure = false;
  rslt.firstId = -1;
  rslt.lastId = -2;
  var gmap = {"par":0,"word":1,"char":2};
  var rdEntry = null;
  var dex = Number(index);
  var grm = Snippetizer.granularityRankMap;
  for(var i=rangeStart; i <= rangeEnd; i++){
    rdEntry = rda[i];
    if(grm[granularity] > grm[rdEntry.type])continue; 
    if(rdEntry.type === granularity){
      if(dex > rdEntry.end)continue;
      if(dex < rdEntry.bgn)break;
    }
    else {
      if(dex > rdEntry.locatorArr[gmap[granularity]])continue;
      if(dex < rdEntry.locatorArr[gmap[granularity]])break;
    }
    if(rslt.firstId < 0)rslt.firstId = i;
    rslt.lastId = i;
  } 
  return rslt;
}

Snippetizer.getRDABoundariesFromTrustedLocation = function(loc1,loc2,rda){
  var rslt = {};
  rslt.firstId = -1;
  rslt.lastId = -2;
  for(var i=0; i<rda.length; i++){
    if(Snippetizer.locationIsMatch(loc1,rda[i])){
      rslt.firstId = i;
      break;
    }
  }
  if(rslt.firstId < 0)return null;
  for(var i=rslt.firstId; i<rda.length; i++){
    if(Snippetizer.locationIsMatch(loc2,rda[i])){
      rslt.lastId = i;
      break;
    }
  }
  if(rslt.lastId < 0)return null;
  return rslt;
}

Snippetizer.locationIsMatch = function(lstr,rdEntry){
  var larr = lstr.split('_');
  if(rdEntry === null)return false;
  if(rdEntry.type === 'par'){
    if(rdEntry.bgn > Number(larr[0]) || rdEntry.end < Number(larr[0]))return false;
    return true;
  }
  if(rdEntry.type === 'word'){
    if(rdEntry.bgn > Number(larr[1]) || rdEntry.end < Number(larr[1]))return false;
    if(rdEntry.locatorArr[0] === larr[0])return true;
  }
  if(rdEntry.type === 'char'){
    if(rdEntry.bgn >  Number(larr[2]) || rdEntry.end < Number(larr[2]))return false;
    if(rdEntry.locatorArr[1] === larr[1] && rdEntry.locatorArr[0] === larr[0])return true;
  }
  return false;
}

Snippetizer.getElementArrayFromRDARange = function(firstId,lastId){
  var earr = [];
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var lp1 = lastId + 1;
  var ep1 = -1;
  var rdEntry = null;
  var pos = 0;
  for(var i=firstId; i<lp1; i++){
    rdEntry = rda[i];
    ep1 = rdEntry.end + 1;
    for(var j=rdEntry.bgn; j<ep1; j++){
      id = Snippetizer.getIdFromRangeDescriptionAndPos(rdEntry,j,di.token); 
      earr[pos] = document.getElementById(id);
      pos++;
    }
  }
  return earr;
}

Snippetizer.formatDocElements = function(fmtInfo,elements){
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
    if(fmtInfo[3] !== "" && fmtInfo[3] !== "none"){
      elmt.style.backgroundColor = fmtInfo[3];
    }
    else {
      elmt.style.backgroundColor = "transparent";
    }
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
    if(fmtInfo[14] !== "")elmt.style.paddingRight = fmtInfo[14] + "px";
  }
};

Snippetizer.setRestorePropertiesForRDARange = function(fmtArr,startId,endId){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var rda = di.rangeDescriptionArr;
  var ep1 = endId + 1;
  var props = {};
  props.fgColor = fmtArr[2];
  props.bgColor = fmtArr[3];
  for(var i=startId; i<ep1; i++){
    rda[i].restoreProps = props;
  }
}


////////////// Snippet and artifact display manipulation and filtering //////////////////

Snippetizer.displaySnippetArtifacts = function(di){
  var locArr = di.featuredLocationArr;
  if(di.featuredSnippetIndex < 0){
    return;
  }
  if(locArr.length > 0){
    var key = locArr.join('_');
    var ss = Snippetizer.getVaultSharedStorageForAppInstance(SharedGlobal.core.scopeItem.appInstanceId);
    Snippetizer.displaySnippet(di,locArr,key);
  }
}

Snippetizer.displaySnippet = function(di,locationArray,key){
  var loc1 = locationArray[0];
  var loc2 = locationArray[1];
  var s = Snippetizer;
  var rda = di.rangeDescriptionArr;
  if(di.snippetNoiseLevel === 'zero')return;
  var rangeInfo = s.getRDABoundariesFromTrustedLocation(loc1,loc2,rda);
  if(rangeInfo === null){
    console.log("location info not valid");
    return;
  }
  var fmt = ["","","#eeaa55","","","","","underline","","","","",""];
  var elmtArr = s.getElementArrayFromRDARange(rangeInfo.firstId,rangeInfo.lastId);
  s.formatDocElements(fmt,elmtArr);
  s.displaySnippetDataIcons(di.aggregateSDMap,key,locationArray,key === di.queriedSnippetKey,di);
}

Snippetizer.displaySnippetDataIcons = function(snippetData,key,locationArray,displaySimpleIcon,di){
  var iconStr = "";
  var art = null;
  var icons = [];
  var includedIcons = {};
  if(typeof snippetData === 'undefined' || snippetData === null){
    if(displaySimpleIcon === false)return;
    snippetData = {};
    snippetData[key].artifacts = [];
  }
  var imageDir = SharedGlobal.core.getImageDirectoryPath();
  if(displaySimpleIcon)icons[0] = imageDir + "/" + Snippetizer.iconFileMap['simple'];
  var artifactLst = [];
  if(typeof snippetData[key] !== 'undefined'){
    if(typeof snippetData[key].artifacts !== 'undefined'){
      artifactLst = snippetData[key].artifacts;
    }
  }
  for(var i=0; i<artifactLst.length; i++){
    art = artifactLst[i];
    if(includedIcons[art.type] !== "x"){
      icons[icons.length] = imageDir + "/" + Snippetizer.iconFileMap[art.type];
      includedIcons[art.type] = "x";
    }
  }
  var id = Snippetizer.getIdFromLocation(locationArray[0],di.token);
  var snptElmt = document.getElementById(id);
  if(snptElmt){
    var snptScrnBox = snptElmt.getBoundingClientRect();
    var mgnElmt = document.getElementById('deep-doc-margin' + di.token);
    var igElmt = document.getElementById('sideIconGrp' + di.token);
    var html =  "";
    for(var i=0; i<icons.length; i++){
      html += "<div><img src=\"" + icons[i] + "\"/></div>";
    }
    igElmt.innerHTML = html;
    var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getHostPaneIndex());
    var sdfElmt = document.getElementById('scrolling-doc-frame-' + wnd.paneId);
    var sdfScrnBox = sdfElmt.getBoundingClientRect();
    igElmt.style.top = (snptScrnBox.top + sdfElmt.scrollTop + 2 - (sdfScrnBox.top + di.verticalBump)) + "px"; 
  }
}

Snippetizer.featureNextInCycleSnippet = function(fwd){
  var s = Snippetizer;
  var di = s.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  if(di.featuredSnippetIndex > -1){
    s.hideFeaturedSnippet();
  }
  if(fwd){
    di.featuredSnippetIndex++;
    if(di.featuredSnippetIndex >= di.orderedSDKeysArr.length)di.featuredSnippetIndex = -1;
  }
  else {
    di.featuredSnippetIndex--;
    if(di.featuredSnippetIndex < -1)di.featuredSnippetIndex = di.orderedSDKeysArr.length - 1;
  }
  if(di.featuredSnippetIndex > -1){
    var keyArr = di.orderedSDKeysArr[di.featuredSnippetIndex];
    di.featuredLocationArr = [keyArr.slice(0,3).join('_'),keyArr.slice(3).join('_')];
    s.displaySnippetArtifacts(di);
  } 
  else di.featuredLocationArr = [];
}

Snippetizer.displayFloatingTerrace = function(di){
  var s = Snippetizer;
  var id = s.getIdFromLocation(di.featuredLocationArr[0],di.token);
  var endId = s.getIdFromLocation(di.featuredLocationArr[1],di.token);
  var floatingPnlId = 'bubble' + di.token;
  var deepDocElmt = document.getElementById('deep-doc-page' + di.token);
  var snptElmt = document.getElementById(id);
  if(snptElmt == null)return;
  var endSnptElmt = document.getElementById(endId);
  if(endSnptElmt == null){
    endSnptElmt = snptElmt;
  }
  var fpElmt = document.getElementById(floatingPnlId);
  if(fpElmt){
    fpElmt.style.display = "block";
  }
  else {
    deepDocElmt.insertAdjacentHTML('beforeend',"<div class=\"sd-floating-terrace\" id=\"" + floatingPnlId + "\"></div>");
    fpElmt = document.getElementById(floatingPnlId);
    fpElmt.addEventListener('click',s.handleTerracePaneClick);
    
  }
  var zzid = 'zig-zag' + di.token;
  var zzidBkg = 'zig-zag-bkg' + di.token
  var zigzagElmt = document.getElementById(zzid);
  var zigzagBkgElmt = document.getElementById(zzidBkg);
  if(zigzagElmt === null){
    deepDocElmt.insertAdjacentHTML('beforeend',"<div id=\"" + zzid + "\" class=\"tether\"></div>");
    deepDocElmt.insertAdjacentHTML('beforeend',"<div id=\"" + zzidBkg + "\" class=\"tether-bkgd\"></div>");
    zigzagElmt = document.getElementById(zzid);
    zigzagBkgElmt = document.getElementById(zzidBkg);
  }
  zigzagBkgElmt.style.display = "block";
  zigzagElmt.style.display = "block";
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getHostPaneIndex());
  var contentAreaSz = wnd.getContentAreaSize();
  var sdfElmt = document.getElementById('scrolling-doc-frame-' + wnd.paneId);
  var sdfScrnBox = sdfElmt.getBoundingClientRect();
  var snptScrnBox = snptElmt.getBoundingClientRect();
  var endSnptScrnBox = endSnptElmt.getBoundingClientRect();
  var ddPageBox = deepDocElmt.getBoundingClientRect();
  var sdKey = di.orderedSDKeysArr[di.featuredSnippetIndex].join('_');
  var scopeItem = SharedGlobal.core.scopeItem;
  var ss = Snippetizer.getVaultSharedStorageForAppInstance(scopeItem.appInstanceId);
  var sd  = ss.callouts[di.calloutGroup].snippetData;
  if(typeof sd[sdKey] === 'undefined')return;
  var artifactList = sd[sdKey].artifacts;
  var art = null;
  var paneHt = 200;
  var terraceMgn = 30;
  var totalTMgn = 2 * terraceMgn; 
  var terraceBdrPad = 36;
  var vSpcAvailable = snptScrnBox.top - (sdfScrnBox.top + totalTMgn);
  if(sdfElmt.scrollTop != 0){
    vSpcAvailable += sdfElmt.scrollTop;
  }
  var keyArr = Object.keys(artifactList);
  var imageDir = SharedGlobal.core.getImageDirectoryPath();
  var html = "";
  for(var i=0; i<keyArr.length; i++){
    art = artifactList[keyArr[i]];
    if(art.type === 'simple')continue;
    html += "<div class=\"basic-child-item\">";
    html += "<div class=\"drop-icon-box\"><img src=\"" + imageDir + "/" + s.iconFileMap[art.type] + "\"/></div>";
    if(art.type === 'comment'){
      html += "<span class=\"spacer-item\">" + art.msg + "</span>";
    }
    if(art.type === 'navlink'){
      html += "<span class=\"spacer-item\">" + art.lnk.label + "</span>";
    }
    html += "</div><br/>";
  }
  fpElmt.innerHTML = "<div style=\"overflow-y:scroll; max-height:200px;\"\><h3>" + html + "</h3></div>";
  var fpeTop = snptScrnBox.top - (paneHt + sdfScrnBox.top + terraceMgn) + sdfElmt.scrollTop;
  fpElmt.style.top = fpeTop + 'px'; 
  fpElmt.style.height = (paneHt - terraceBdrPad) + "px";
  var fpBox = fpElmt.getBoundingClientRect();
  var frmRct = sdfElmt.getBoundingClientRect(); 
  var lowWidthThreshold = 80;
  var upperWidthThreshold = 600;
  var fpHzPadding = ddPageBox.width * 0.3;
  if(ddPageBox.width < 80){
    fpHzPadding = 6;
  }
  if(ddPageBox.width > upperWidthThreshold){
    var dif = ddPageBox.width - upperWidthThreshold;
    fpHzPadding = ddPageBox.width - upperWidthThreshold;
  }
  var fpTargetWd = ddPageBox.width - fpHzPadding;
  fpElmt.style.width = (fpTargetWd - 65) + 'px'; //'Snippetizer.css' padding for sd-floating-pane
  var lftSelBound = snptScrnBox.left;
  var rgtSelBound = endSnptScrnBox.right;
  if(snptScrnBox.bottom  != endSnptScrnBox.bottom){
    if((endSnptScrnBox.bottom - snptScrnBox.bottom) > 5){
      rgtSelBound = ddPageBox.right - 8;
    }
  } 
  zigzagBkgElmt.style.top = (fpBox.bottom + sdfElmt.scrollTop  - frmRct.top) + "px";
  zigzagElmt.style.top = (fpBox.bottom + sdfElmt.scrollTop  - frmRct.top) + "px";
  var hrzZigZagPos = fpBox.left;
  var zzWd = 18;
  var lftBound = fpBox.left;
  var rgtBound = fpBox.right - zzWd;
  var firstLineSelSpan = rgtSelBound - lftSelBound;
  hrzZigZagPos = Math.floor((lftSelBound - ddPageBox.left) + (0.2 * firstLineSelSpan));

  //hrzZigZagPos = ((rgtBound - lftBound) / 2) + lftBound;
  zigzagBkgElmt.style.left = hrzZigZagPos + 'px';  // - (frmRct.left + 23) + "px"; 
  zigzagElmt.style.left = hrzZigZagPos + 'px'; // - (frmRct.left + 23) + "px"; 
						   //23px error when using frmRct
						   //instead of deep-doc-par parent
  //default is to put the balloon so that the tether is in the middle
  var fpLeftSide =  hrzZigZagPos - (fpTargetWd / 2);
  var fpRightSide = fpLeftSide + fpTargetWd; 
  //make sure right side is not off page
  var ddpBoxXlated = {left:0,right:ddPageBox.right - ddPageBox.left};
  //if(fpRightSide > (ddPageBox.right - ddPageBox.left){
  if(fpRightSide > ddpBoxXlated.right){
    //fpLeftSide = ddPageBox.right - (fpTargetWd + 3);    
    fpLeftSide = ddpBoxXlated.right - (fpTargetWd + 3);    
  }
  if(fpLeftSide < 3){
    fpLeftSide = 3;
  }

  fpElmt.style.left = fpLeftSide + 'px';

  if(vSpcAvailable < paneHt){
    var dif = paneHt - vSpcAvailable;
    if(dif < 0){
      dif = 0;       
    }
    var uiElmt = document.getElementById('bumper-div' + di.token);
    uiElmt.style.height = dif + "px";
    uiElmt.style.display = "block";
    uiElmt = document.getElementById('bumper-div-mgn' + di.token);
    uiElmt.style.height = dif + "px";
    uiElmt.style.display = "block";
    di.verticalBump = dif;
    var scrnTop = ((snptScrnBox.top + dif) - (sdfScrnBox.top + terraceMgn)) + sdfElmt.scrollTop + "px"; 
    zigzagBkgElmt.style.top = scrnTop;
    zigzagElmt.style.top = scrnTop;
    fpElmt.style.top = terraceMgn + "px";
  }
}

Snippetizer.displayDOMElementGroup = function(grp,displayStr,di){
  var idArr = [];
  if(grp === 'floating_terrace'){
    //idArr = ['bubble','zig-zag','bumper-div','bumper-div-mgn'];
    idArr = ['bubble','zig-zag-bkg','zig-zag','bumper-div','bumper-div-mgn'];
    for(var i=0; i<idArr.length; i++){
      var elmt = document.getElementById(idArr[i] + di.token);
      if(elmt){
        elmt.style.display = displayStr;
      }
    }
  }
}

////////////// Apply outline mode functions //////////////////

Snippetizer.toggleApplyOutlineMode = function(){
  var s = Snippetizer;
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  if(di.userMode === 'apply_outline'){
    s.exitApplyOutlineMode();
    di.userMode = 'exhibition';
  }
  else {
    s.enterApplyOutlineMode();
    if(di.userMode === 'select_text'){
      s.exitSelectTextMode(); 
    }
  }
}

Snippetizer.enterApplyOutlineMode = function(){
  var storageInfo = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken());
  var ts = storageInfo.tempStore;
  var di = storageInfo.tempDIStore;
  di.userMode = 'apply_outline';
  OutlineFormatter.setupMenuitems();
  var scopeItem = SharedGlobal.core.scopeItem;
  OutlineFormatter.initializeOutlineFormatterForClientApplet(di.olf.linesMap);
  OutlineFormatter.lineCount = ts.deepDoc.c.length; 
  OutlineFormatter.lineIdPrefix = "dd_";
  SharedGlobal.core.requestRedraw(false);
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken(); 
  var wndIdx = SharedGlobal.core.getHostPaneIndex(); 
  //document.getElementById('apply-outline-' + token).innerHTML = "apply outline &#10003"; //check mark symbol
  document.getElementById('apply-outline').innerHTML = "apply outline &#10003"; //check mark symbol
  //SharedGlobal.core.setMenuitemVisibilityFromList(wndIdx,lst);
}

Snippetizer.exitApplyOutlineMode = function(){
  var scopeItem = SharedGlobal.core.scopeItem;
  var ts = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempStore;
  Snippetizer.applyOutlineFormat(ts);
  OutlineFormatter.removeMenuitems();
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken(); 
  document.getElementById('apply-outline').innerHTML = "apply outline";
  SharedGlobal.core.requestRedraw(false);
}

Snippetizer.applyOutlineFormat = function(ts){
  var di = Snippetizer.getStorageInfo(SharedGlobal.core.getPersistentDrawingInstanceToken()).tempDIStore;
  var scopeItem = SharedGlobal.core.scopeItem;
  var linesMap = di.olf.linesMap;
  var keyArr = Object.keys(linesMap);
  var lineId = -1;
  var elmt = null;
  var queuedInfo = null;
  var nuInfo = null;
  var curLevel = 0;
  var data = ts.deepDoc.c;
  var fmtRules = di.olf.formatRules;
  if(typeof fmtRules === 'undefined'){
    fmtRules = di.olf.formatRules = OutlineFormatter.getDefaultOLFormattingRulesObjectsArray();
  }
  var globalCounts = [];
  var onlyMeld = false;
  var sibRank = getSiblingRankArrayFromLinesMap(linesMap);
  for(var i=0; i<keyArr.length; i++){
    key = keyArr[i];
    nuInfo = linesMap[key];
    onlyMeld = nuInfo.meld;
    if(typeof onlyMeld === 'undefined')onlyMeld = false;
    elmt = document.getElementById("dd_" + Number(key).toString() + '_' + di.token);
    if(elmt){
      applyFormattedOutlineItemJavaScriptStyling(elmt,fmtRules[nuInfo.level]);
      elmt.className = "deep-doc-par";
      elmt.style.borderColor = "white";
      elmt.style.backgroundColor = "white";
      elmt.style.color = "orange"; //"#565699"; 
      elmt.innerHTML = getFormattedOutlineItemHTML(data[key],nuInfo.level,sibRank[i],fmtRules[nuInfo.level],globalCounts,"",onlyMeld,Snippetizer);
    }
    else{
      console.log('not getting the elment with: ' + 'dd_' + Number(key).toString() );
    }
  }
  //SharedGlobal.core.requestRedraw(true);
}


////////////// annotation functions //////////////////

Snippetizer.loadAnnotations = function(){
  var customDlgInfo = {"fields":[
{type:"normal_text",text:"Path to annotations file"},
{type:"edit",label:"",box_class:"long",value:"",key:"pth"}
  ]}; 
  SharedGlobal.core.displayCustomPopup(customDlgInfo,Snippetizer.acceptAnnotationsPath);
}

Snippetizer.acceptAnnotationsPath = function(resultMap){
  var scopeItem = SharedGlobal.core.scopeItem;
  scopeItem.anot = {};
  var path = scopeItem.anot.path = resultMap['pth'].value;
  SharedGlobal.core.requestFileContents(path,Snippetizer.annotationsReceiverMethod,""); 
}

Snippetizer.annotationsReceiverMethod = function(data,requestId){
  data = data.replace(/\[sglqt\]/g,"'").replace(/\[dbqt\]/g,"\"").replace(/\[lnglbrkt\]/g,"<").replace(/\[rnglbrkt\]/g,">");
  Snippetizer.externalAnnotations = data.split('[newline]');
  document.getElementById('load-annotations').style.display = "none";
}

Snippetizer.formatExternalAnnotations = function(){
  //not in use
  console.log("This code should not be hit!!!");
  return;
  var docLines = Snippetizer.deepDoc.c;
  var line = "";
  var pos = 0;
  for(var i=0; i<docLines.length; i++){
    line = docLines[i];
    pos = line.indexOf('[anot=');
    while(pos != -1){
      docLines[i] = lines.replace('[anot=',"");
      pos = line.indexOf('[anot=');
    }
  }
}


//////////////// micro-self-contained snippet functions ////////////////////

Snippetizer.setupStateInfoForSelfContainedSnippetizerItem = function(item){
  if(typeof item === 'undefined' || item == null){
    return;
  }
  if(typeof item.d === 'undefined' || item.d == null){
    item.d = {};
  }
  if(typeof item.d.callouts === 'undefined'){
    item.d.callouts = {};
  }
}

Snippetizer.generateSelfContainedSnippetizerItemHTML = function(item){
  var html = "Self-contained snippetizer item coming soon";
  //html += item.labs[0];
  return html;
}

