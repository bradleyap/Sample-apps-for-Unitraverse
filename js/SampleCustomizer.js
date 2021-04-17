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

SampleCustomizer = {};
SampleCustomizer.currentOp = 'no-op';
SampleCustomizer.currentPid = '';
SampleCustomizer.fieldEditLocation = '';
SampleCustomizer.currentChildIndex = '';
SampleCustomizer.targetAncestorsMap = {};

function initializeForSampleCustomizerEBHTML(core,responseCallback){
  var hpIdx = core.getHostPaneIndex();
  core.setupResponsiveMenuitem(hpIdx,'author','add_node','outofbounds,navpath,container,child,resource','','','',VaultBuilders.doAddNode);
  core.setupResponsiveMenuitem(hpIdx,'author','add_child node','outofbounds,navpath,container,child,resource','','','',VaultBuilders.doAddChildNode);
  core.setupResponsiveMenuitem(hpIdx,'author','edit','child','','','',core.getEditItemHandler());
  core.setupResponsiveMenuitem(hpIdx,'author','remove','child','','','',function(e){core.removeItem(e);});
}

function generateSampleCustomizerEBHTML(core,responseCallback){
  var iter = core.tracker;
  iter.setRecursionDepthLimit(1200);
  SampleCustomizer.targetAncestorsMap = {};
  var html = convertToExpandedBranchHTML(iter,0,{});
  var retData = {};
  var appletValues = {};
  appletValues['isMultiLevel'] = true;
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
  appletValues['explicitResourceCount'] = 0;
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

SampleCustomizer.addEBChild = function(){
  SampleCustomizer.dlgAcceptInfo.currentOp = 'add_child_node';
  SharedGlobal.core.setSimpleEditMessage('child node');
  SharedGlobal.core.setOnAcceptSimpleEditFunc(VaultBuilders.onAcceptSimpleEditForMultiLevelView);
  SharedGlobal.core.displayCorePopup('simple-edit-pane');
  handled = true;
}

function convertToExpandedBranchHTML(iter,indents,parentMap){
  if(iter === null)return "";
  var sidx = iter.getScopeIndex();
  var label = "";
  var itemTitle = "";
  var sep = "";
  var childId = null;
  var tabSpc = "";
  var itemString = "";
  var html = "";
  var len = iter.childCount();
  if(len < 1)return html;
  for(var k=0; k<indents; k++){
    tabSpc += "<div class=\"basic-tab\"></div>";
  }
  var itemId = SharedGlobal.core.getItemId(sidx);
  if(itemId > -1){
    if(parentMap[itemId]){
      html = tabSpc + "<span class=\"smlTxt\">Cycle continues ...</span><br/>"; 
      return html;
    }
    parentMap[itemId] = true;
  }
  var isLink = false;
  for(var i=0; i<len; i++){
    label = iter.label(i);
    itemTitle = "";
    isLink = false;
    if(iter.isEngraftingLocation()){
      isLink = true;
    }
    var cinfo = iter.childInfo(i);
    if(!cinfo.isNull && cinfo.typeof === 'object'){ 
      itemTitle = SharedGlobal.core.getItemSubject(cinfo.id);
    }
    sep = '::';
    if(itemTitle === '[anonymous]'){
      itemTitle = '';
    }
    if(label === '' || itemTitle === ''){
      sep = '';
    }
    else{
      if(label === itemTitle){
        sep = '';
        label = '';
      }
    }
    itemString = label + sep +  itemTitle;
    if(itemString === ''){
      itemString = '[unavailable]';
    }
    html += tabSpc;
    var curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString);
    var imagesDir = SharedGlobal.core.getImageDirectoryPath();
    if(isLink){
      html += "<div class=\"link-child-item\" id=\"" + curIdString + "\">" + itemString + "</div>";
      html += "<img class=\"node-icon\" src=\"" + imagesDir + "/link-node.png\"/>";
    }
    else {
      html += "<div class=\"basic-child-item\" id=\"" + curIdString + "\">" + itemString + "</div>";
    }
    html += "<br/>";
    html += convertToExpandedBranchHTML(iter.down(),indents + 1,parentMap);
    iter.next();
  }
  len = iter.resourceItemCount();
  if(len > 0){
    var res = null;
    for(var j=0; j<len; j++){
      res = iter.resource(j);
      if(res.type == 'url'){
        html += tabSpc; 
        html += "<a href=\"" + res.url + "\"><span class=\"medTxt\"> ";
        html += res.ttl + "</span></a><br/>";
      }
    }
  }
  if(typeof itemId > -1)parentMap[itemId] = false;
  return html;
}

function initializeForSampleCustomizerTblHTML(core,callback){
  var iter = core.tracker;
  ensureMinimalTableExists(iter);
  var hpIdx = core.getHostPaneIndex();
  core.setupResponsiveMenuitem(hpIdx,'author','add_row','outofbounds,navpath,container,child,resource','','','',SampleCustomizer.addTblRow);
  core.setupResponsiveMenuitem(hpIdx,'author','add_cell','outofbounds,navpath,container,child,resource','','','',SampleCustomizer.addTblCell);
  core.setupResponsiveMenuitem(hpIdx,'author','edit','child','','','',SampleCustomizer.handleSimpleEditOnTable);
  core.setupResponsiveMenuitem(hpIdx,'author','remove','child','','','',function(e){core.removeItem(e);});
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  core.setMaxWindowSize(wnd,975,-1);
}

function generateSampleCustomizerTblHTML(core,responseCallback){
  var html = "<table id=\"basic-tbl\">";
  var iter = core.tracker;
  var curIdString = "";
  var len = iter.childCount();
  for(var i=0; i<len; i++){
    var cinfo = iter.childInfo(i);
    curIdString = iter.getIdString();
    html += "<tr class=\"table-row\">";
    SharedGlobal.tic.push(curIdString);
    html += "<td class=\"table-cell-first\" id=\"" + curIdString + "\">";
    var dynamicLabel = iter.label(i);
    if(dynamicLabel === 'r[n]'){
      dynamicLabel = "r" + Number(i + 1).toString();
      SharedGlobal.core.setItemSubject(cinfo.id,"row" + Number(i + 1).toString());
    }
    html += '<div class="basic-row-title"><div class="default-title-txt-frm">' + dynamicLabel + '</div></div></td>';
    if(cinfo.exists && !cinfo.isNull){ //todo: check for leaf string or repair at initialization
      var iter2 = iter.down();
      var len2 = iter2.childCount();
      for(var j=0; j<len2; j++){
        curIdString = iter2.getIdString();
        SharedGlobal.tic.push(curIdString);
        html += "<td class=\"table-cell\" id=\"" + curIdString + "\">";
        var label = iter2.label();
        if(label !== ""){
          html += '<div class="basic-child-item">' + label + '</div>';
        }
        else {
          html += core.generateHTMLFromScopeId(cinfo.id,core);
        }
        html += "</td>";
        iter2.next();
      }
      html += "</tr>";
      iter.next();
    }
  }
  html += "</table>";
  html += SharedGlobal.getResourceItemsHTML(core.scopeItemIndex);

  var tic = SharedGlobal.tic;
  responseCallback({appletValuesMap:{isMultiLevel:true,explicitChildCount:tic.getNonResIdCount(),explicitResourceCount:tic.getResIdCount()}});

  return html;
}

SampleCustomizer.checkRepairTblObject = function(iter){
  var len = iter.childCount();
  /*
    table now uses only 3 levels (scope item level, row level, and cell level) for any content
    that does not use hosted drawing. The only time hosted drawing happens is if cell content 
    has an 'apcd' or a 'c' array

    To safely rearrange a table-governed branch, a human editor must request a repair. The strategies
    using an automatic repair routine for every initialization seems dangerous, especially if it 
    wants to remove parts of the vault.
  */
  var subjArr = [];
  var toRemoveArr = [];
  for(var i=0; i<len; i++){
    var cinfo = iter.childInfo();
    if(cinfo.exists){
      if(cinfo.typeof === 'object' && !cinfo.isNull){
        core.setItemSubject(cinfo.id,iter.label()); 
      }
      else{
        if(cinfo.typeof === 'string'){

        }
        continue;
      }
    }
    var iter2 = iter.down();
    var len2 = iter2.childCount();
    for(var j=0; j<len2; j++){
      var iter3 = iter2.down();
      var len3 = iter3.childCount();
      for(var k=0; k<len3; k++){
        subjArr.push({parentId:iter3.tempScopeItemIndex,subject:iter3.subject()});
        toRemoveArr.push({parentId:iter3.tempScopeItemIndex,childIdx:k});
        iter3.next();
      }
      var cinfo2 = iter2.childInfo();
      if(cinfo2.exists && !cinfo2.isNull && cinfo2.typeof === 'object'){
        var leafLabel = "";
        //not finished here, more work to do!
        insertLeafString(cinfo2.id,i,leafLabel);
      }
      iter2.next();
    }
    iter.next();
  }
}

function ensureMinimalTableExists(iter){
  var sidx = iter.tempScopeItemIndex;
  if(iter.childItemCount() == 0){
    var nuId = SharedGlobal.core.createAndInsertVaultItem(sidx,0);
    SharedGlobal.core.setItemSubject(nuId,'row[n]');
  }
  var len = iter.childCount();
  for(var i=0; i<len; i++){
    var cinfo = iter.childInfo(i);
    if(cinfo.isNull || cinfo.typeof === 'string'){
      SharedGlobal.core.promoteVaultItemToObject(sidx,i,false);
    }
  }
}

function handleSampleCustomizerKeyDown(e,core,responseCallback){
  var handled = false;
  var keycode = SharedGlobal.core.getKeycodeFromEvent(e);
  if(keycode === 'KeyR' || keycode === 'r'){
    SampleCustomizer.addTblRow(e);
    handled = true;
  }
  if(keycode === 'KeyD' || keycode === 'd'){
   SampleCustomizer.addTblCell(e);
   handled = true;
  }
  if(keycode === 'KeyE' || keycode === 'e'){
    handled = SampleCustomizer.handleSimpleEditOnTbl(e,core,responseCallback);
  }
  return handled;
}

SampleCustomizer.handleSimpleEditOnTable = function(){
  SampleCustomizer.handleSimpleEditOnTbl(null,SharedGlobal.core,null);
}

SampleCustomizer.handleSimpleEditOnTbl = function(event,core,responseCallback){
  var core = SharedGlobal.core;
  var sc = SampleCustomizer;
  var handled = false;
  if(core.getCurrentTabIdsRgn() !== 'child')return false;
  var sidx = core.scopeItemIndex;
  var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
  var encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
  var pid = sc.currentPid = encodedIdArr[1]; //pid - parent id
  var cidx = sc.currentChildIndex = encodedIdArr[2]; //cidx - child index
  var val = "";
  var editMsg = "";
  var apCode = core.getItemAppCode(sidx);
  if(apCode === 'SampleCustomizer1'){
    if(sidx === Number(pid)){
      sc.currentOp = "edit-row";
      /*
        For the purpose of interchangeability of vault data along with spatial efficiency, we support three locations for configuring vault item naming:  percepts, vault item strings, and a subject field of vault item objects. Any of these could be in use for data that is converted to a table. The 'auto-configured label' functionality provides shared handling of edits where each location can impact a conceptual, derived label. To support a single location would work also and achieve greater code simplicity, but it is likely to have some limiting effect on porting vault data from one applet to another
      */
      val = core.getAutoConfiguredLabel(pid,cidx);
      editMsg = "Row label:"; 
    }
    else {
      var si = core.getSelectionInfo();
      var cinfo = core.getItemChildInfo(si.scopeIndex,si.zoneIndex);
      if(cinfo.exists && !cinfo.isNull && cinfo.typeof === 'object'){
        //todo: navigate to object so that edits can be done using the proper scope item app code
        return;
      }
      sc.currentOp = "edit-cell";
      val = core.getAutoConfiguredLabel(si.scopeIndex,si.zoneIndex); //safe for previously non-table structures
      editMsg = "Cell contents:";
    }
    core.setSimpleEditMessage(editMsg);
    core.setOnAcceptSimpleEditFunc(sc.onAcceptSimpleEditForTable);
    core.displayCorePopup('simple-edit-pane');
    var elmt = document.getElementById('se-dialog-single-item');
    elmt.value = val;
    handled = true;
  }
  return handled;
}

SampleCustomizer.onAcceptSimpleEditForTable = function(value){
  var sc = SampleCustomizer;
  var core = SharedGlobal.core;
  var dataModified = false;
  var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
  var encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
  var pid = encodedIdArr[1];
  var cidx = encodedIdArr[2];
  if(sc.currentOp === 'edit-row'){
    core.updateAutoConfiguredLabel(pid,cidx,value);    
    dataModified = true;
  }
  //dataModified = true;
  core.dismissCurrentDialogBox();
  if(dataModified)core.requestRedraw(true);
}

SampleCustomizer.addTblRow = function(e){
  var core = SharedGlobal.core;
  var sidx = core.scopeItemIndex; 
  var cidx = -1; //cidx - child index
  var encodedIdArr = [];
  var rgn = core.getCurrentTabIdsRgn();
  if(rgn === 'child'){
    var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
    encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
    var parentId = encodedIdArr[1];
    cidx = encodedIdArr[2];
    if(sidx !== Number(parentId)){
      var len = core.getItemChildCount(sidx); 
      for(var i=0; i<len; i++){
        var cinfo = core.getItemChildInfo(i);
        if(cinfo.id == pid){
          cidx = i;
          break;
        }
      }      
    }
  } 
  var nuId = core.createAndInsertVaultItem(sidx,cidx);
  core.setItemSubject(nuId,'r[n]');
  core.requestRedraw(true); //if vault structure
                                    //or tab ids have changed, pass in true 
}

SampleCustomizer.addTblCell = function(e){
  var core = SharedGlobal.core;
  var pid = -1;
  var cidx = -1;
  var encodedIdArr = [];
  var sidx = core.scopeItemIndex;
  var rgn = core.getCurrentTabIdsRgn();
  if(rgn === 'child'){
    var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
    encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
    pid = Number(encodedIdArr[1]);
    cidx = Number(encodedIdArr[2]);
    if(pid == sidx){ //should be a row item id
      var cinfo = core.getItemChildInfo(sidx,cidx);
      if(cinfo.typeof === 'string' || cinfo.isNull){
        core.promoteVaultItemToObject(sidx,cidx,false);
      }
      pid = core.getItemChildId(sidx,cidx);
    }
    core.insertLeafString(pid,cidx,"-");
  }
  else {
    alert('Please first select a row or cell item within a row in order to add a cell.');
    return;
  }
  core.requestRedraw(true); //if vault structure, vault objects
                                    //or tab ids have changed, pass in true 
}

function generateSampleCustomizerCellHTML(core,responseCallback){
  var itemId = 'cn-item-0';
  var label = core.getAutoConfiguredLabel(sidx,0); 
  if(label === ""){
    label = "-";
  }
  var html =  "<div class=\"basic-child-item\" id=\"" + itemId + "\">" + label + "</div>";
  SharedGlobal.tic.push(itemId);
  var retData = {};
  responseCallback(retData);
  return html;
}

