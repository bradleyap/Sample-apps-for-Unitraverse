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
  iter.setRecursionDepthLimit(150);
  SampleCustomizer.targetAncestorsMap = {};
  var html = convertToHTML(iter,0,{});
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

function convertToHTML(iter,indents,parentMap){
  if(iter === null)return "";
  var item = iter.getScopeItem();
  var label = "";
  var itemTitle = "";
  var sep = "";
  var childId = null;
  var tabSpc = "";
  var itemString = "";
  var s = "";
  var len = iter.childCount();
  if(typeof item === 'undefined' || item === null)return s;
  for(var k=0; k<indents; k++){
    tabSpc += "<div class=\"basic-tab\"></div>";
  }
  if(typeof item.id !== 'undefined'){
    if(parentMap[item.id]){
      s = tabSpc + "<span class=\"smlTxt\">Cycle continues ...</span><br/>"; 
      return s;
    }
    parentMap[item.id] = true;
  }
  var child = null;
  var isLink = false;
  for(var i=0; i<len; i++){
    label = iter.label(i);
    itemTitle = "";
    child = iter.child(i);
    isLink = false;
    if(iter.isEngraftingLocation()){
      isLink = true;
    }
    if(child && typeof child.s !== 'undefined')itemTitle = child.s;
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
    s += tabSpc;
    var curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString);
    var imagesDir = SharedGlobal.core.getImageDirectoryPath();
    if(isLink){
      s += "<div class=\"link-child-item\" id=\"" + curIdString + "\">" + itemString + "</div>";
      s += "<img class=\"node-icon\" src=\"" + imagesDir + "/link-node.png\"/>";
    }
    else {
      s += "<div class=\"basic-child-item\" id=\"" + curIdString + "\">" + itemString + "</div>";
    }
    s += "<br/>";
    s += convertToHTML(iter.down(),indents + 1,parentMap);
    iter.next();
  }
  len = iter.resourceItemCount();
  if(len > 0){
    var res = null;
    for(var j=0; j<len; j++){
      res = iter.resource(j);
      if(res.type == 'url'){
        s += tabSpc; 
        s += "<a href=\"" + res.url + "\"><span class=\"medTxt\"> ";
        s += res.ttl + "</span></a><br/>";
      }
    }
  }
  if(typeof item.id !== 'undefined')parentMap[item.id] = false;
  return s;
}

function generateSampleCustomizerTblHTML(core,responseCallback){
  var html = "<table id=\"basic-tbl\">";
  var iter = core.tracker;
  var cellOb = null;
  var cia = core.childIds;
  var rowCia = null;
  var curIdString = "";
  for(var i=0; i<iter.childCount(); i++){
    var rowOb = iter.child();
    curIdString = iter.getIdString();
    html += "<tr class=\"table-row\">";
    SharedGlobal.tic.push(curIdString);
    html += "<td class=\"table-cell-first\" id=\"" + curIdString + "\">";
    var dynamicLabel = iter.label(i);
    if(dynamicLabel === 'r[n]'){
      dynamicLabel = "r" + Number(i + 1).toString();
      rowOb.s = "row" + Number(i + 1).toString();
    }
    html += '<div class="basic-row-title"><div class="default-title-txt-frm">' + dynamicLabel + '</div></div></td>';
    var iter2 = iter.down();
    if(rowOb){
      for(var j=0; j<iter2.childCount(); j++){
        curIdString = iter2.getIdString();
        SharedGlobal.tic.push(curIdString);
        html += "<td class=\"table-cell\" id=\"" + curIdString + "\">";
        var label = iter2.label();
        if(label !== ""){
          html += '<div class="basic-child-item">' + label + '</div>';
        }
        else {
          html += core.generateHTMLFromScopeId(iter2.child(),iter2.getChildScopeIndex(),core);
        }
        html += "</td>";
        iter2.next();
      }
      html += "</tr>";
      iter.next();
    }
  }
  html += "</table>";
  html += SharedGlobal.getResourceItemsHTML(core.scopeItem);

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
    var c = iter.child();
    if(typeof c === 'undefined')continue;
    c.s = iter.label();
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
      var gc = iter2.child();
      if(typeof gc === 'object' && gc){
        //leafLabel = gc.labs[0];
        //removeItem(c,i);
        insertPercept(c,i,leafLabel);
      }
      iter2.next();
    }
    iter.next();
  }
}

function ensureMinimalTableExists(iter){
  if(iter.childItemCount() == 0){
    var nuItem = SharedGlobal.core.createNewVaultItem();
    nuItem.hdTtl = true;
    nuItem.s = "row[n]";
    var pid = SharedGlobal.core.addVaultItem(iter.getScopeIndex(),"r[n]",nuItem,0);
    SharedGlobal.core.addVaultItem(pid,"",'-',0);
  }
}

function initializeForSampleCustomizerTblHTML(core,callback){
  var rootOb = core.scopeItem;
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
  var handled = false;
  if(SharedGlobal.core.getCurrentTabIdsRgn() !== 'child')return false;
  var scopeItem = SharedGlobal.core.scopeItem;
  var scopeItemIndex = SharedGlobal.core.scopeItemIndex;
  var iter = SharedGlobal.core.tracker;
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
  var encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
  var parentIndex = SampleCustomizer.currentPid = encodedIdArr[1];
  var childIndex = SampleCustomizer.currentChildIndex = encodedIdArr[2];
  var currentItem = SampleCustomizer.currentItem = SharedGlobal.core.getItemFromBankIndex(parentIndex);
  var val = "";
  var editMsg = "";
  if(scopeItem.apcd === 'SampleCustomizer1'){
    if(scopeItemIndex === Number(parentIndex)){
      SampleCustomizer.currentOp = "edit-row";
      /*
        For the purpose of interchangeability of vault data along with spatial efficiency, we support three locations for configuring vault item naming:  percepts, vault item strings, and a subject field of vault item objects. Any of these could be in use for data that is converted to a table. The 'auto-configured label' functionality provides shared handling of edits where each location can impact a conceptual, derived label. To support a single location would work also and achieve greater code simplicity, but it is likely to have some limiting effect on porting vault data from one applet to another
      */
      val = SharedGlobal.core.getAutoConfiguredLabel(scopeItem,childIndex);
      editMsg = "Row label:"; 
    }
    else {
      var si = SharedGlobal.core.getSelectionInfo();
      var item = si.scopeItem.c[si.zoneIndex];
      if(typeof item !== 'string'){
        //todo: navigate to object so that edits can be done using the proper scope item app code
        return;
      }
      SampleCustomizer.currentOp = "edit-cell";
      val = item;
      editMsg = "Cell contents:";
    }
    SharedGlobal.core.setSimpleEditMessage(editMsg);
    SharedGlobal.core.setOnAcceptSimpleEditFunc(SampleCustomizer.onAcceptSimpleEditForTable);
    SharedGlobal.core.displayCorePopup('simple-edit-pane');
    var elmt = document.getElementById('se-dialog-single-item');
    elmt.value = val;
    handled = true;
  }
  return handled;
}

SampleCustomizer.onAcceptSimpleEditForTable = function(value){
  var dataModified = false;
  var iter = SharedGlobal.core.tracker;
  var item = SampleCustomizer.currentItem;
  if(SampleCustomizer.currentOp === 'edit-row'){
    SharedGlobal.core.updateAutoConfiguredLabel(SampleCustomizer.currentItem,SampleCustomizer.currentChildIndex,value);    
    dataModified = true;
  }
  if(SampleCustomizer.currentOp === 'edit-cell'){
    var si = SharedGlobal.core.getSelectionInfo();
    var item = si.scopeItem.c[si.zoneIndex];
    if(item){
      SharedGlobal.core.updateAutoConfiguredLabel(si.scopeItem,SampleCustomizer.currentChildIndex,value);    
    }
    dataModified = true;
  }
  SharedGlobal.core.dismissCurrentDialogBox();
  if(dataModified)SharedGlobal.core.requestRedraw(true);
}

SampleCustomizer.addTblRow = function(e){
  var childIndex = -1;
  var encodedIdArr = [];
  var rgn = SharedGlobal.core.getCurrentTabIdsRgn();
  var rowItem = SharedGlobal.core.createNewVaultItem();
  var cia = SharedGlobal.core.childIds;
  var scopeItemIndex = SharedGlobal.core.scopeItemIndex;
  rowItem.hdTtl = true;
  if(rgn === 'child'){
    var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
    encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
    var parentId = encodedIdArr[1];
    childIndex = encodedIdArr[2];
    if(scopeItemIndex !== Number(parentId)){
      var cia = SharedGlobal.core.childIds[scopeItemIndex];
      for(var i=0; i<cia.length; i++){
        var pid = Number(parentId);
        if(cia[i] === pid){
          childIndex = i;
          break;
        }
      }
    }
  }
  SharedGlobal.core.addVaultItem(scopeItemIndex,"r[n]",rowItem,childIndex);
  SharedGlobal.core.requestRedraw(true); //if vault structure
                                    //or tab ids have changed, pass in true 
}

SampleCustomizer.addTblCell = function(e){
  var parentIndex = -1;
  var childIndex = -1;
  var encodedIdArr = [];
  var core = SharedGlobal.core;
  var scopeItemIndex = core.scopeItemIndex;
  var rgn = core.getCurrentTabIdsRgn();
  if(rgn === 'child'){
    var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
    encodedIdArr = wnd.tabIdsArr[wnd.tabIdsPos].split('_');
    parentIndex = Number(encodedIdArr[1]);
    childIndex = Number(encodedIdArr[2]);
    if(parentIndex == scopeItemIndex){ //should be a row item id
      parentIndex = core.childIds[scopeItemIndex][childIndex];
    }
    core.addVaultItem(parentIndex,"","-",childIndex);
  }
  else {
    alert('Please first select a row or cell item within a row in order to add a cell.');
    return;
  }
  core.requestRedraw(true); //if vault structure, vault objects
                                    //or tab ids have changed, pass in true 
}

function generateSampleCustomizerCellHTML(core,responseCallback){
  var scopeItem = core.scopeItem;
  var label = "-";
  var itemId = 'cn-item-0';
  if(scopeItem.labs.length > 0)label = scopeItem.labs[0];
  var html =  "<div class=\"basic-child-item\" id=\"" + itemId + "\">" + label + "</div>";
  SharedGlobal.tic.push(itemId);
  var retData = {};
  responseCallback(retData);
  return html;
}

