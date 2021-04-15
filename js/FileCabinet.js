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
FileCabinet.rootInfoMap = {};

function initializeForFileCabinetApplet(core,callback,args){
  var core = SharedGlobal.core;
  var sidx = core.scopeItemIndex;
  var boundLocation = core.getItemConfiguration(sidx,'bound_location');
  var config = core.getItemConfiguration(sidx,'app_config');

  /*
    if there is not a file system location or the correct config setting, then return
  */
  if(boundLocation === "" || config !== 'app-defined'){
    return;
  }
  var itemData = core.getItemData(sidx,true); //true causes a data object to be created

  /*
    All non-root items will have the 'spawned' flag, we refer to it to see if the root item is the scope item
  */
  if(typeof itemData.spawned === 'undefined'){

    /*
      There are 3 situations to handle root item:
        1) we are all set up and simply revisiting the root node
        2) we're starting cold with a stub still in place
        3) we're starting cold with no stub in place
    */
    var cid = -1;
    var cinfo = core.getItemChildInfo(sidx,0);
    if(!cinfo.exists){
      /*
        No stub found, so create one. The current method for creating a temporary vault item, whose content is not written to permanent storage along with the rest of the vault at 'save' command, requires that a stub node exists at some target location. When the save command is issued, only the stub will persist as a permanent part of the vault graph. We check for the existence of that stub, and create one if it is not present. 
      */
      cid = core.createAndInsertVaultItem(sidx,0);
      core.setItemDataAttribute(cid,'tag','fc_stub');
    }
    else{
      /*
        is this a stub or a deployed temporary node? If deployed we do nothing more
      */
      var cItemData = core.getItemData(cinfo.id,true);
      if(typeof cItemData.tag === 'undefined' || cItemData.tag !== 'fc_stub'){ 
        //we are already setup
        return;
      }
    } 
    /*
      keep the root item from being saved, and any children
    */
    core.convertToTemporaryVaultItem(sidx,0,"");
  
    /*
      store these in the item data for a spawning process that happens as users navigate deeper into the FS directory     
    */
    itemData.stem = "";
    itemData.unansweredLoadAttempts = 0;
    itemData.riKey = 22;
    FileCabinet.rootInfoMap[itemData.riKey] = {rootLocation:boundLocation,config:'app-defined'};
  }

  if(itemData.unansweredLoadAttempts < 5){
    var path = boundLocation;
    var lastChar = path.substring(path.length - 1);
    if(lastChar === "/" || lastChar === "\\")path = path.substring(path.length - 1);
    if(itemData.stem.length > 0 || (core.device === 'win' && (path === 'c:' || path === 'C:')))path += "/" + itemData.stem; 
    itemData.unansweredLoadAttempts++;
    core.requestDirectoryContents(path,FileCabinet.dataReceiverMethod,""); 
  }
}

   
///////////////// HTML generation functions ///////////////////

function generateFileCabinetHTML(core,responseCallback){
  var iter = core.tracker;  //use opaque iterator to detect cyclical iteration patterns
  var sidx = iter.tempScopeItemIndex;
  var boundLocation = core.getItemBoundLocation(sidx);
  var config = core.getItemConfiguration(sidx);
  if(boundLocation === "" || config !== 'app-defined'){
    return FileCabinet.getSetupHowToMsg();
  }
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  var html = "";
  var titleBarAdj = 0;
  var resItem = null;
  var curIdString = "";  
  var itemData = SharedGlobal.core.getItemData(sidx);
  if(typeof itemData.spawned === 'undefined'){
    iter = iter.down(0); 
  }
  var len = iter.childItemCount();
  if(len == 0)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=0; i < len; i++){
    curIdString = iter.getIdString();
    html += "<div class=\"basic-child-item\" id=\"" + curIdString + "\"><img class=\"cab-folder-icon\" src=\"" + imagesDir + "/folder.png\" width=\"16\" height=\"16\" /> " + iter.label(i);
    if(iter.child(i) !== null){
      html += " <img src=\"" + imagesDir + "/more.png\"/>"; 
    }
    html += "</div><br/>"; 
    SharedGlobal.tic.push(curIdString);
    iter.next(); 
  }
 
  html += FileCabinet.getResourceItemsHTML(iter.tempScopeItemIndex);

  responseCallback({appletValuesMap:{explicitChildCount:SharedGlobal.tic.getNonResIdCount(),explicitResourceCount:SharedGlobal.tic.getResIdCount()}});
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

FileCabinet.getResourceItemsHTML = function(sidx){
  var core = SharedGlobal.core;
  var openItems = core.openItems;
  var groupMode = core.groupMode;
  var groupMap = core.groupMap;
  var imagesDir = core.getImageDirectoryPath();
  var html = "";
  var resList = core.getItemResourceList(sidx); 
  for(var i=0; i < resList.length; i++){
    var res = resList[i];
    html += "<div class=\"cab-resource-item\" id=\"r_item_" + i + "\"><img class=\"resource-icon\" src=\"" + res.icon + "\" width=\"16\" height=\"16\" />" + res.ttl;
    if(openItems[res.id])html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/grn-circle.png\"/>";
    if(res.type === 'url'){
      if(res.pinned === true)html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-stuck.png\" width=\"20\" height=\"16\"/>"; 
      else html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-unstuck.png\" width=\"20\" height=\"16\"/>"; 
    }
    if(groupMode){
      var grps = "";
      if(groupMap[res.id])grps = groupMap[res.id];
      html += "<img class=\"resource-icon-tight\" src=\"" + imagesDir + "/ismember.png\" /><span class=\"quiet\">{ " + grps + " }</span>";
    }
    html += "</div>";
    SharedGlobal.tic.push('r_item_' + i,'resource');
  }
  return html;
}

FileCabinet.dataReceiverMethod = function(data,requestTag){
  var core = SharedGlobal.core;
  var sidx = core.scopeItemIndex;
  var dirList = data.directories;
  var dirOb = null;
  var nixed = 0;
  var itemData = core.getItemData(sidx);
  var ri = FileCabinet.rootInfoMap[itemData.riKey];
  if(typeof itemData.spawned === 'undefined'){
    var cinfo = core.getItemChildInfo(sidx,0);
    sidx = cinfo.id;
  }
  for(var i=0; i<dirList.length; i++){
    if(core.device === 'win'){
    //hiding Microsoft's "My *" folders, Python's os.listdir() gives these in error
      if(dirList[i] === "My Music"){nixed++; continue;}
      if(dirList[i] === "My Documents"){nixed++; continue;}
      if(dirList[i] === "My Videos"){nixed++; continue;}
      if(dirList[i] === "My Pictures"){nixed++; continue;}
    }
    var nuId = core.createAndInsertVaultItem(sidx,-1,""); 
    var appCode = core.getItemAppCode(core.scopeItemIndex);
    if(appCode !== ""){
      core.setItemAppCode(nuId,appCode);
    }
    core.setItemBoundLocation(nuId,ri.rootLocation);
    core.setItemConfiguration(nuId,ri.config);
    var d = core.getItemData(nuId,true);
    d.unansweredLoadAttempts = 0; //this answers the load attempt
    d.spawned = true;
    core.setItemSubject(nuId,d.stem = dirList[i]);
    if(itemData.stem !== ""){
      d.stem = itemData.stem + "/" + d.stem;
    }
    d.riKey = itemData.riKey;
  }
  var fileList = data.files;
  var fileOb = null;
  var type = "file";
  var fnArr = [];
  var fn = "";
  var ext = "";
  for(var i=0; i<fileList.length; i++){
    type = "file";
    fnArr = fileList[i].split('.');
    fn = fnArr[0];
    ext = fnArr[fnArr.length - 1];
    if(ext === 'txt')type = "doc";
    fileOb = core.createTemporaryResourceVaultItem(type,fileList[i],fn,ext);
    fileOb.path = core.getItemBoundLocation(sidx);
    core.insertResourceItem(sidx,i,fileOb);
    if(itemData.stem.length > 0)fileOb.path += "/" + itemData.stem;
  }
  core.requestRedraw(false);
}
