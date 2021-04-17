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

BeliefModeller = {};
BeliefModeller.paneIds = [];
BeliefModeller.tempStore = {};
BeliefModeller.displayModes = {};
BeliefModeller.currentOp = "";

BeliefModeller.getAppState = function(scopeId){
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getHostPaneIndex());
  var sidx = scopeId;
  if(SharedGlobal.core.itemExists(scopeId) == false){
    sidx = SharedGlobal.core.scopeItemIndex;
  }
  var appInstanceId = SharedGlobal.core.getItemAppInstanceId(sidx);
  var awid = appInstanceId + '_' + wnd.paneId;
  if(typeof BeliefModeller.tempStore[awid] === 'undefined'){
    ts = BeliefModeller.tempStore[awid] = {};
    ts.rootObId = sidx;
    ts.travelStack = [{itemId:sidx,title:SharedGlobal.core.getItemSubject(sidx),childIndex:-1}];
    ts.selectVal = -1;
    ts.prx = ""; //path route extension
    ts.displayMode = 'tree_explorer';
    ts.fieldBeingEdited = 'none';
    ts.awid = awid;
  }
  return BeliefModeller.tempStore[awid];
}

BeliefModeller.getAppletWindowId = function(appInstanceId,windowId){
  return appInstanceId + '_' + windowId;
}

function initializeBeliefSystemModeller(core,callback,hostPaneIdx,args){
  var m = BeliefModeller;
  var sidx = core.scopeItemIndex;
  if(typeof core.getItemSubject(sidx) === 'undefined'){
    core.setItemSubject(sidx,"Unnamed Belief System");
  }
  if(core.getItemAppInstanceId(sidx) < 0){
    core.setItemAppInstanceId(SharedGlobal.core.getApplicationInstanceId(sidx));
  }
  core.setupResponsiveMenuitem(hostPaneIdx,'author','add_position','anyregion',null,'','',m.addBeliefPosition);
  core.setupResponsiveMenuitem(hostPaneIdx,'author','add_reference','anyregion',null,'','',m.addBeliefPosition); //handler just temporary
  core.setupResponsiveMenuitem(hostPaneIdx,'author','edit','child',BeliefModeller.canEditItem,'','',m.handleEditOfSelected);
  m.paneIds = [];
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  var icnStr = imagesDir + "/bs-icon.png";
  var wndIdx = core.getDrawingPaneIndex();
  var wnd = core.getWindowPaneFromIndex(wndIdx);
  //var as = BeliefModeller.getAppState(scopeItem);
  var as = BeliefModeller.getAppState(sidx);
  var locInfo = as.travelStack[as.travelStack.length - 1];
  var titleBarText = "Belief Tenet Page";
  if(as.travelStack.length < 2){
    titleBarText = "Belief System Page";
  }
  core.setTitleBarTitle(wnd,titleBarText); 
  if(locInfo.itemId != sidx){
    icnStr = imagesDir + "/tenet-icon.png";
  }
  core.setMaxWindowSize(wnd,600,-1);
  var retData = {};
  retData['titleBarIcon'] = icnStr;
  callback(retData);
}

function generateBeliefSystemHTML(core,responseCallback){
  var m = BeliefModeller;
  var html = "";
  var pageHTML = "";
  var sidx = core.scopeItemIndex;
  var token = core.getDrawingInstanceToken();
  var as = BeliefModeller.getAppState();
  var iter = core.tracker;
  m.paneIds[0] = token + '_p1';
  m.paneIds[1] = token + '_p2';
  if(as.displayMode === 'tree_explorer'){
    if(as.travelStack.length < 2){
      var idString = 'belief_txt' + as.awid;
      SharedGlobal.tic.push(idString);
      pageHTML = generateEnclosingRoundedPaneHTML("system description",m.paneIds[0],"<div class=\"basic-child-item\" id=\"" + idString + "\">" + core.getItemSubject(sidx) + "</div>");
      html = m.generateBeliefTenetSummaryHTML(iter,0,iter.childItemCount());
      pageHTML += generateEnclosingRoundedPaneHTML("key positions",m.paneIds[1],html);
    }
    else{
      var itemInfo = as.travelStack[as.travelStack.length - 1];
      var parentInfo = as.travelStack[as.travelStack.length - 2];
      pageHTML = m.generateBeliefPositionPageHTML(core,itemInfo.title,parentInfo.title,token);
    }
  }
  var paneId = core.getDrawingPaneIndex();
  core.setDrawingInstancePostHTMLInfo(paneId,token,{"method":m.postHTMLInstallForBeliefSystem,"data":m.paneIds});
  var retData = {};
  var appletValues = {};
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
  appletValues['explicitResourceCount'] = 0;
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return pageHTML;
}

BeliefModeller.generateBeliefTenetSummaryHTML = function(iter,startPos,endPos){
  var html = "";
  var curIdString = ""; 
  if(startPos == endPos)return html; 
  html = '<div class="white-mgn">';
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  if(endPos == startPos)html += '<div class="spacer-item"></div><div class="spacer-item"></div><div class="spacer-item"></div>';
  for(var i=startPos; i < endPos; i++){
    curIdString = iter.getIdString();
    var cinfo = iter.childInfo();
    if(cinfo.exists && !cinfo.isNull && cinfo.typeof === 'object'){
      var subject = iter.label(i); //SharedGlobal.core.get(cinfo.id);
      html += '<div class="basic-child-item" id="' + curIdString + '">' + subject + '</div>';
    }
    html += '<br/>'; 
    SharedGlobal.tic.push(curIdString);
    iter.next(); 
  } 
  html += '</div>';
  return html;
}

BeliefModeller.postHTMLInstallForBeliefSystem = function(paneIds){
  for(var i=0; i<paneIds.length; i++){
    postHTMLInstallForEnclosingRoundedPanes(paneIds[i]);
  }
  var as = BeliefModeller.getAppState();
  if(as.selectVal != -1){
    SharedGlobal.core.selectChildAt(as.selectVal);
    as.selectVal = -1;
  }
}

BeliefModeller.canEditItem = function(){
  var canEdit = false;
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
  var selId = wnd.tabIdsArr[wnd.tabIdsPos];
  if(selId.indexOf('belief_txt') == 0){
    canEdit = true;
  }
  if(selId.indexOf('doctrine_txt') == 0){
    canEdit = true;
  }
  return canEdit;
}

BeliefModeller.handleEditOfSelected = function(e){
  var core = SharedGlobal.core;
  var sidx = core.scopeItemIndex;
  var paneIdx = core.getActivePaneIndex();
  var wnd = core.getWindowPaneFromIndex(paneIdx);
  var selId = wnd.tabIdsArr[wnd.tabIdsPos];
  if(selId.indexOf('belief_txt') == 0){
    core.setSimpleEditMessage('Belief system name:');
    core.setOnAcceptSimpleEditFunc(BeliefModeller.onAcceptBeliefModellerSimpleEdit);
    core.displayCorePopup('simple-edit-pane');
    var elmt = document.getElementById('se-dialog-single-item');
    elmt.value = core.getItemSubject(sidx);
  }
  if(selId.indexOf('doctrine_txt') == 0){
    var prx = BeliefModeller.getCurrentPathRoute().join('.');
    var si = core.getSelectionInfo();
    var ci = -1;
    if(si.rgn === 'child'){
      ci = si.zoneIndex;
    }
    var iter = core.getRelativePositionTracker(prx,ci,paneIdx);
    core.openItemFromId(iter.tempScopeItemIndex,""); 
  }
  return true;
}

BeliefModeller.onAcceptBeliefModellerSimpleEdit = function(value){
  var sidx = SharedGlobal.core.scopeItemIndex;
  SharedGlobal.core.setItemSubject(sidx,value);
  SharedGlobal.core.requestRedraw(true);
}

BeliefModeller.addBeliefPosition = function(e){
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"Add position statement"},
{type:"edit",label:"",box_class:"long",value:"",key:"ps"}
  ]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,BeliefModeller.onAcceptBeliefPositionInfo);
}

BeliefModeller.onAcceptBeliefPositionInfo = function(resultMap){
  var core = SharedGlobal.core;
  var pathRoute = BeliefModeller.getCurrentPathRoute();
  var prx = pathRoute.join('.');
  var paneIdx = core.getActivePaneIndex();
  var iter = core.getRelativePositionTracker(prx,0,paneIdx);
  var nuId = SharedGlobal.core.createAndInsertVaultItem(iter.tempScopeItemIndex,-1,"",resultMap['ps'].value);
  core.setItemAppCode(nuId,'BeliefModeller1');
  core.requestRedraw(true); //since vault structure has changed, pass in true
}

BeliefModeller.generateBeliefPositionPageHTML = function(core,position,parentLabel,token){
  var html = "";
  var m = BeliefModeller;
  m.paneIds[1] = token + '_p2';
  m.paneIds[2] = token + '_p3';
  m.paneIds[3] = token + '_p4';
  var idString = "";
  var as = BeliefModeller.getAppState();
  var idString = 'doctrine_txt_' + as.awid;
  SharedGlobal.tic.push(idString);
  html = generateEnclosingRoundedPaneHTML("position",m.paneIds[0],"<div class=\"basic-child-item\" id=\"" + idString + "\">" + position + "</div>");

  var posHTML = "";
  var paneIdx = core.getActivePaneIndex();
  //PRX - path route extension has a dot-delimited format
  var iter = core.getRelativePositionTracker(m.getCurrentPathRoute().join('.'),0,paneIdx);
  var count = iter.childItemCount();
  if(count > 0){
    posHTML += m.generateBeliefTenetSummaryHTML(iter,0,count);
  }
  else{
    idString = 'add_tenet_' + as.awid;
    SharedGlobal.tic.push(idString);
    posHTML += "<div class=\"basic-child-item\" id=\"" + idString + "\">[unsupported]</div>";
  }

  html += generateEnclosingRoundedPaneHTML("supporting positions",m.paneIds[1],posHTML);
  idString = 'parent_lnk_' + as.awid;
  SharedGlobal.tic.push(idString);
  var parentHTML = "<div class=\"basic-child-item\" id=\"" + idString + "\">" + parentLabel + "</div>";
  html += generateEnclosingRoundedPaneHTML("utilization",m.paneIds[2],parentHTML);
  return html;
}
      
BeliefModeller.addBeliefPositionReference = function(){
 alert('to what do you refer?');
}

function handleBeliefModellerKeyDown(e){
  var handled = false;
  var keyCd = SharedGlobal.core.getKeycodeFromEvent(e);
  if(keyCd === 'KeyI' || keyCd === 'i'){
    BeliefModeller.addBeliefPosition(e);
    handled = true;
  }
  if(keyCd === 'KeyE' || keyCd === 'e'){
    handled = handleBeliefSystemEdit(e);
  }
  if(keyCd === 'Enter'){
    BeliefModeller.doEnterActionOnSelectedItem(e);
    return true;
  }
  return handled; 
}

BeliefModeller.doEnterActionOnSelectedItem = function(e){
  var core = SharedGlobal.core;
  var wndId = core.getActivePaneIndex();
  var wnd = core.getWindowPaneFromIndex(wndId);
  var tidPos = core.getTabIdsPos();
  var tabIdStr = wnd.tabIdsArr[tidPos];
  if(typeof tabIdStr === 'undefined'){
    return;
  }
  wnd.tabIdsPos = -1; //avoids errors when navigation is circumvented
  var imagesDir = core.getImageDirectoryPath();
  var arr = tabIdStr.split('_');
  var as = BeliefModeller.getAppState();
  var info = as.travelStack[as.travelStack.length - 1];
  if(tabIdStr.indexOf('parent_lnk') == 0){
    as.travelStack.splice(as.travelStack.length - 1,1);
    if(as.travelStack.length < 2){
      as.selectVal = info.childIndex + 1; //1 description precedes children counted by iterator
    }
  }
  else{
    if(tabIdStr.indexOf('add_tenet') == 0){
      BeliefModeller.addBeliefPosition(e);
    }
    else{
      if(tabIdStr.indexOf('doctrine_txt') == 0){
        //change to editor view        
      }
      else {
        if(tabIdStr.indexOf('belief_txt') == 0){
	  BeliefModeller.currentOp = 'edit_bs_title';
          core.setSimpleEditMessage(core.scopeItem.s);
          core.setOnAcceptSimpleEditFunc(acceptBeliefSystemTitle);
          core.displayCorePopup('simple-edit-pane');
        }
        else{
          var paneIdx = core.getActivePaneIndex();
          var ci = Number(arr[2]);
          var iter = core.getRelativePositionTracker(BeliefModeller.getCurrentPathRoute().join('.'),ci,paneIdx);
          var cinfo = iter.childInfo(ci);
          var title = "";
          if(cinfo.exists && !cinfo.isNull && cinfo.typeof === 'object'){
            title = core.getItemSubject(cinfo.id);
          }
          as.travelStack[as.travelStack.length] = {title:title,childIndex:ci};
        }
      }
    }
  } 
  var locInfo = as.travelStack[as.travelStack.length - 1];

  var titleBarText = "Belief Tenet Page";
  var iconFileText = "tenet-icon.png";
  if(as.travelStack.length < 2){
    titleBarText = "Belief System Page";
    iconFileText = "bs-icon.png";
  }
  core.setTitleBarTitle(wnd,titleBarText);
  core.setTitleBarIcon(wnd,imagesDir + '/' + iconFileText); 
  core.requestRedraw(false);
}

function acceptBeliefSystemTitle(value){
  if(BeliefModeller.currentOp === 'edit_bs_title'){
    SharedGlobal.core.setItemSubject(SharedGlobal.core.scopeItemIndex,value); 
  } 
  SharedGlobal.core.requestRedraw(false); 
}

function handleBeliefModellerDoubleClick(e){
  BeliefModeller.doEnterActionOnSelectedItem(e);
  return true;
}

function handleBeliefSystemEdit(e){
  var handled = false;
  var core = SharedGlobal.core;
  var iter = core.getTracker();
  var sidx = iter.scopeIndex;
  var wnd = core.getWindowPaneFromIndex(core.getActivePaneIndex());
  var onAcceptFunc = function(){};
  var tabId = wnd.tabIdsArr[core.getTabIdsPos()];
  if(tabId.indexOf('belief_txt') == 0){
    BeliefModeller.currentOp = 'edit_bs_title';
    var paneIdx = core.getActivePaneIndex();
    iter = core.getRelativePositionTracker(BeliefModeller.getCurrentPathRoute().join('.'),0,paneIdx);
    SharedGlobal.core.setSimpleEditMessage("Belief system title:");
    SharedGlobal.core.setOnAcceptSimpleEditFunc(BeliefModeller.onAcceptBeliefSystemEdit);
    SharedGlobal.displayCorePopup('simple-edit-pane');
    var elmt = document.getElementById('se-dialog-single-item');
    elmt.value = core.getItemSubject(sidx);
    BeliefModeller.editTargetId = sidx;
    core.blockEventPropagation(e); 
    handled = true;
  }
  if(tabId.indexOf('doctrine_txt') == 0){
    BeliefModeller.currentOp = 'edit_doctrine_label';
    var as = BeliefModeller.getAppState();
    BeliefModeller.editTargetPos = as.childIndex; 
    editMsg = "Belief tenet:";
    onAcceptFunc = BeliefModeller.onAcceptBeliefPositionEdit;
    BeliefModeller.editTargetId = sidx;
    handled = true;
  }
  return handled;
}

BeliefModeller.onAcceptBeliefSystemEdit = function(){
  var dataModified = false;
  var m = BeliefModeller;
  var elmt = document.getElementById('se-dialog-single-item');
  if(m.currentOp === 'edit_doctrine_label'){
    dataModified = true;
  }
  if(m.currentOp === 'edit_bs_title'){
    SharedGlobal.core.setItemSubject(m.editTargetId,elmt.value);
    dataModified = true;
  }
  SharedGlobal.core['dismissCurrentDialogBox']();
  if(dataModified)SharedGlobal.core.requestRedraw(true);
}

BeliefModeller.onAcceptBeliefPositionEdit = function(){
  var dataModified = false;
  if(dataModified)SharedGlobal.core.requestRedraw(true);
}

BeliefModeller.getCurrentPathRoute = function(){
  var core = SharedGlobal.core;
  var as = BeliefModeller.getAppState();
  var r = [];
  for(var i=1; i<as.travelStack.length; i++){
    r[r.length] = as.travelStack[i].childIndex;
  } 
  return r; 
}


//////////////  belief tenet editing view  //////////////////

function initializeBeliefTenetEditor(core,callback,hostPaneIdx,args){
  var wndIdx = core.getDrawingPaneIndex();
  var wnd = core.getWindowPaneFromIndex(wndIdx);
  core.setupResponsiveMenuitem(hostPaneIdx,'author','edit_fragment','anyregion',null,'','',BeliefModeller.editFragment);
  core.setupResponsiveMenuitem(hostPaneIdx,'author','add_manual citation','anyregion',null,'','',BeliefModeller.returnToNormalBeliefTenetView);
  core.setTitleBarTitle(wnd,'Belief tenet editor'); 
  core.setMaxWindowSize(wnd,600,-1);
}

function generateBeliefTenetEditorHTML(core,callback){
  var html = "";
  var paneIdx = core.getActivePaneIndex();
  var iter = core.getRelativePositionTracker(BeliefModeller.getCurrentPathRoute().join('.'),0,paneIdx);
  var tenet = iter.subject();
  if(tenet){
    var curIdString = 'oneandonly';
    SharedGlobal.tic.push(curIdString);
    html += '<div class="basic-child-item" id="' + curIdString + '">' + tenet + '</div>';
  }
  else{
    html = '<div class="basic-child-item">[No position taken]</div>';
  }
  return html; 
}

BeliefModeller.editFragment = function(e){
  var core = SharedGlobal.core;
  var paneIdx = core.getActivePaneIndex();
  var iter = core.getRelativePositionTracker(BeliefModeller.getCurrentPathRoute().join('.'),0,paneIdx);
  var curVal = iter.subject();
  var customDlgInfo = {"fields":[
    {type:"bold_text",text:"Edit fragment"},
    {type:"normal_text",text:"Fragment"},
    {type:"std_edit",label:"",box_class:"long",value:curVal,key:"frag"}
  ]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,BeliefModeller.acceptFragment);
}

BeliefModeller.acceptFragment = function(info){
  console.log('new frag: ' + info['frag'].value);
}

function handleBeliefTenetEditorKeyDown(e){

}

function handleBeliefTenetEditorClick(e){

}

BeliefModeller.returnToNormalBeliefTenetView = function(){

}


