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

FileCabinet = {};
FileCabinet.currentItem = null;
FileCabinet.currentConfig = "";
FileCabinet.appletRootItemsMap = {};
FileCabinet.appletHostItemsMap = {};


function initializeForFileCabinetApplet(core,callback,args){
  var fc = FileCabinet;
  var scopeItem = core['scopeItem'];
  if(typeof scopeItem.appInstanceId === 'undefined'){
    scopeItem.appInstanceId = SharedGlobal.core['getApplicationInstanceId'](scopeItem);
  }
  fc.appInstanceId = scopeItem.appInstanceId;
  if(typeof scopeItem.boundLocation === 'undefined'){
    scopeItem.boundLocation = "";
  }
  fc.currentItem = scopeItem;
  fc.currentConfig = "";
  if(typeof scopeItem.stem === 'undefined'){
    if(scopeItem.boundLocation !== ""){
      fc.currentItem.boundLocation = scopeItem.boundLocation; 
      var rootOb = fc.appletRootItemsMap[scopeItem.appInstanceId];
      if(typeof rootOb === 'undefined' || rootOb === null){
        rootOb = fc.appletRootItemsMap[scopeItem.appInstanceId] = SharedGlobal.core['createNewVaultItem']();
        rootOb.appInstanceId = scopeItem.appInstanceId;
        if(typeof scopeItem.apcd !== 'undefined'){
          rootOb.apcd = scopeItem.apcd;
        }
        rootOb.defaultView = scopeItem.defaultView;
        rootOb.subj = scopeItem.subj;
        rootOb.hdTtl = scopeItem.hdTtl;
        rootOb.stem = "";
        rootOb.boundLocation = scopeItem.boundLocation;
        rootOb.config = scopeItem.config;
        rootOb.contentLoaded = false;
        fc.appletHostItemsMap[scopeItem.appInstanceId] = scopeItem;
      }
      fc.currentItem = rootOb;
      fc.currentConfig = rootOb.config;
      var pcInfo = SharedGlobal.core['getParentAndChildIndex'](core['scopeItemIndex']);
      SharedGlobal.core['installGuest'](pcInfo.parent,pcInfo.childIndex,scopeItem,rootOb);
    }
    //if(typeof rootOb.boundLocation !== 'undefined')fc.currentItem.boundLocation = scopeItem.boundLocation = rootOb.boundLocation;
  }
  else {
    var host = fc.appletHostItemsMap[fc.appInstanceId];
    var rootOb = fc.appletRootItemsMap[fc.appInstanceId];
    if(host.config !== rootOb.config)host.config = rootOb.config; 
    if(host.boundLocation !== rootOb.boundLocation){
      host.boundLocation = rootOb.boundLocation;
    }
    fc.currentConfig = rootOb.config;
  }
  if(fc.currentItem.boundLocation !== "" && fc.currentConfig === 'app-defined' &&  fc.currentItem.contentLoaded == false){
    var path = fc.currentItem.boundLocation;
    var lastChar = path.substring(path.length - 1);
    if(lastChar === "/" || lastChar === "\\")path = path.substring(path.length - 1);
    if(fc.currentItem.stem.length > 0 || (core['device'] === 'win' && (path === 'c:' || path === 'C:')))path += "/" + fc.currentItem.stem; 
    core['requestDirectoryContents'](path,FileCabinet.dataReceiverMethod,""); 
  }
}

   
///////////////// HTML generation functions ///////////////////

function generateFileCabinetHTML(core,responseCallback){
  var scopeItem = core['scopeItem'];
  var scopeIndex = core['scopeItemIndex'];
  var curItem = FileCabinet.currentItem;
  if(curItem.boundLocation === "" || FileCabinet.currentConfig !== "app-defined"){
    return FileCabinet.getSetupHowToMsg();
  }
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  var item = curItem; //core['scopeItem'];
  var pathIds = core['pathIds'];
  var mainRect = core['mainRect'];
  var openItems = core['openItems'];
  var groupMode = core['groupMode'];
  var groupMap = core['groupMap'];
  var html = "";
  var titleBarAdj = 0;
  var resItem = null;
  var iter = core['tracker'];  //use opaque iterator to detect cyclical iteration patterns
  var len = iter.childItemCount();
  var curIdString = "";  

  if(len == 0)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=0; i < len; i++){
    curIdString = iter.getIdString();
    html += "<div class=\"basic-child-item\" id=\"" + curIdString + "\"><img class=\"cab-folder-icon\" src=\"" + imagesDir + "/folder.png\" width=\"16\" height=\"16\" /> " + iter.label(i);
    if(iter.child(i) !== null){
      html += " <img src=\"" + imagesDir + "/more.png\"/>"; 
    }
    html += "</div><br/>"; 
    //SharedGlobal.tabIdsBuffer[SharedGlobal.tabIdsPos] = curIdString; 
    SharedGlobal.tic.push(curIdString);
    iter.next(); 
  }
 
  html += FileCabinet.getResourceItemsHTML(item);

  var retData = {};
  var appletValues = {};
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
  appletValues['explicitResourceCount'] = SharedGlobal.tic.getResIdCount();
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

FileCabinet.getSetupHowToMsg = function(){
  var msg = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Instructions</b>";
  msg += "<ol>";
  msg += "<li>click on 'configure' in the main menu</li>";
  msg += "<li>select 'Applet defined' in the configuration drop-down menu</li>";
  msg += "<li>in the 'Path' field point to a directory by typing the full OS directory location... providing the full path, or by clicking the 'Browse files...' button and selecting the path from the file system</li>";
  msg += "<li>click 'OK'</li>";
  msg += "<li>click 'save'</li>";
  msg += "<li>start to use your imported directory from inside the vault by opening and closing resources and creating directories in the same way you work with vault items in the UD Application</li>";
  msg += "</ol>";
  return msg;
}

FileCabinet.getResourceItemsHTML = function(item){
  var core = SharedGlobal['core'];
  var openItems = core['openItems'];
  var groupMode = core['groupMode'];
  var groupMap = core['groupMap'];
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  var html = "";
  len = 0;
  if(item['rcs'] !== undefined && item['rcs'] !== null)len = item['rcs'].length;
  for(var i=0; i < len; i++){
    html += "<div class=\"cab-resource-item\" id=\"r_item_" + i + "\"><img class=\"resource-icon\" src=\"" + item['rcs'][i]['icon'] + "\" width=\"16\" height=\"16\" />" + item['rcs'][i]['ttl'];
    if(openItems[item.rcs[i]['id']])html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/grn-circle.png\"/>";
    if(item.rcs[i].type === 'url'){
      if(item.rcs[i].pinned === true)html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-stuck.png\" width=\"20\" height=\"16\"/>"; 
      else html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-unstuck.png\" width=\"20\" height=\"16\"/>"; 
    }
    if(groupMode){
      var grps = "";
      if(groupMap[item.rcs[i].id])grps = groupMap[item.rcs[i].id];
      html += "<img class=\"resource-icon-tight\" src=\"" + imagesDir + "/ismember.png\" /><span class=\"quiet\">{ " + grps + " }</span>";
    }
    html += "</div>";
    SharedGlobal.tic.push('r_item_' + i,'resources');
  }
  return html;
}

FileCabinet.dataReceiverMethod = function(data,requestId){
  if(FileCabinet.currentItem !== null){
    var scopeItem = FileCabinet.currentItem;
    var dirList = data.directories;
    var dirOb = null;
    var nixed = 0;
    for(var i=0; i<dirList.length; i++){
      if(SharedGlobal.core['device'] === 'win'){
      //hiding Microsoft's "My *" folders, Python's os.listdir() gives these in error
        if(dirList[i] === "My Music"){nixed++; continue;}
        if(dirList[i] === "My Documents"){nixed++; continue;}
        if(dirList[i] === "My Videos"){nixed++; continue;}
        if(dirList[i] === "My Pictures"){nixed++; continue;}
      }	  
      dirOb = SharedGlobal.core['createNewVaultItem']();
      dirOb.appInstanceId = scopeItem.appInstanceId;
      if(typeof scopeItem.apcd !== 'undefined'){
        dirOb.apcd = scopeItem.apcd;
      }
      dirOb.hdTtl = false;
      dirOb.subj = dirList[i];
      dirOb.stem = dirOb.subj;
      if(scopeItem.stem !== ""){
        dirOb.stem = scopeItem.stem + "/" + dirOb.stem;
      }
      dirOb.boundLocation = scopeItem.boundLocation;
      dirOb.contentLoaded = false;
      scopeItem.cdrn[i - nixed] = dirOb;
      scopeItem.labs[i - nixed] = dirList[i];
    }
    var fileList = data.files;
    var fileOb = null;
    var type = "file";
    var fnArr = [];
    var fn = "";
    var ext = "";
    if(fileList.length > 0)scopeItem.rcs = [];
    for(var i=0; i<fileList.length; i++){
      type = "file";
      fnArr = fileList[i].split('.');
      fn = fnArr[0];
      ext = fnArr[fnArr.length - 1];
      if(ext === 'txt')type = "doc";
      fileOb = SharedGlobal.core['createTemporaryResourceVaultItem'](type,fileList[i],fn,ext);
      fileOb.path = scopeItem.boundLocation;
      if(scopeItem.stem.length > 0)fileOb.path += "/" + scopeItem.stem;
      scopeItem.rcs[i] = fileOb; 
    }
    FileCabinet.currentItem.contentLoaded = true;
  } 
  SharedGlobal.core['requestRedraw'](false);
}

