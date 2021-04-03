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

DataSlinger = {};
DataSlinger.appId = "dataslinger_app";     
DataSlinger.currentlyBeingEditedArr = [];
DataSlinger.state = {};

DataSlingerForm = {};


///////////// Shared items ///////////////////////////////

DataSlinger.recordTypes = {"contact info":{"keys":["fn","mi","ln","ssn","dob","hs","st","apt","bldg","cty","zip","co","ctry","ce","hm","wk","fx","em","li","web","fb"],"cloneable":[18],"labels":["first name","mi","last name","ssn","date of birth","house number","street","apt","building","city","state","zip code","county","country","cell phone","home phone","work phone","fax","email","Linked-in","website","Facebook username"],"def_display":"personalInfo"},"bibliography entry":{"keys":["auth","ed","ttl","isbn","loc","pub","pdat"],"cloneable":[0,1],"labels":["author","editor","title","isbn","publisher location","publisher","date"],"def_display":"bib2"}};
 
/*
  auth - author
  bib - bibliographic entry
  bk_num - book number (a.k.a. ISBN)
  cmos - Chicago Manual of Style
  coauth - co-author
  coed - co-editor
  dt - date
  ed - editor
  eds - editors
  fml - first middle last [name]
  fn - first name
  lcfm - last, first middle [name]
  loc - location
  ln - last name
  mi - middle initial
  pdat - publication date
  pi - publisher info
  pub - publisher
  S - start symbol
  ttl - title
*/

DataSlinger.grammars = {"cmos_bib":{"S":[["author_info","ed_info","title_info",". ","bk_num","pub_info","."]],"author_info":[["auth_lcfm",", ","coauth_list",". "],["auth_lcfm"," and ","auth_fml",". "],["auth_lcfm",". "],[" "]],"ed_info":[["ed_lcfm",", ","coed_list",", eds. "],["ed_lcfm"," and ","ed_fml"," eds. "],["ed_lcfm"," ed. "],[" "]],"coauth_list":[["auth_fml",", ","coauth_list"],["auth_fml"," and  ","auth_fml"]],"auth_lcfm":[["auth"]],"auth_fml":[["auth"]],"coed_list":[["ed_lcfm",", ","coed_list"],["ed_lcfm"," and ","ed_fml"]],"ed_lcfm":[["ed"]],"ed_fml":[["ed"]],"title_info":[["'","ttl","'"],["[title?]"]],"bk_num":[["isbn"],["[isbn?]"]],"pub_info":[["loc_info",": ","publisher",", ","pub_dt"],["publisher",", ","pub_dt"]],"loc_info":[["loc"],["[location?]"]],"pub_dt":[["pdat"],["[date?]"]],"publisher":[["pub"],["[publisher?]"]]},"pi":{"S":[["nam_info"],[" "]],"nam_info":[["fn"," ","mi",". ","ln"]]}};
  
/*
  the array of graphics values (mostly css) being used for styles are an encoding of these:
    [font size,font family,foreground color, background color, border color, border width, css border style, text decoration, all caps, italicized, center horizontally, padding above, padding below, left indents] 
*/
DataSlinger.styles = {"s1":{"default":["24","'Lora', serif","#565699","white","","","","","","","","","10","3","0"]},"s2":{"default":["24","'Lora', serif","#565699","white","","","","","","","","","10","3","0"],"S":{"div":"hanging-indent-par"},"ttl":{"inline-props":["","","","","","","","","","on","","","","",""]},"bk_num":{"span":"skip"}}};

DataSlinger.displayOptions = {"personalInfo":{"name":"personal contact","style":"s1"},"bizPersonInfo":{"name":"buisiness contact","grammar":"pi","style":"s1"},"bib1":{"name":"informal bilbiography","grammar":"informal_bib","style":"s1"},"bib2":{"name":"CMOS biblographic entry","grammar":"cmos_bib","style":"s2"}};



///////////// Data Entry Form  ///////////////////////////////
 
function initializeDataEntryFormApplet(core,callback){
  var scopeItem = core.scopeItem;
  if(typeof scopeItem.storageId === 'undefined'){
    var sid = SharedGlobal.core.getTemporaryVaultUniqueId();
    SharedGlobal.core.setAutoManagedNonSerializableField(scopeItem,"storageId",sid);
  }
  if(typeof DataSlinger.state[scopeItem.storageId] === 'undefined'){
    DataSlinger.initializeTempStoreForRecordInstance(scopeItem);
  }
  var tempStore = DataSlinger.state[scopeItem.storageId];
  var token = core.getPersistentDrawingInstanceToken();
  if(typeof tempStore[token] === 'undefined'){
    tempStore[token] = {returnToClient:false,isEditing:false};
  }
  var retData = {}; 
  retData['blockNonNavigationShortcuts'] = true;
  retData['suspendPlatformHzArrowKeyHandling'] = true;
  //when an aggregator is not the scope item, it is not mediating messages, otherwise these messages are routed through aggregators
  retData['onChangeSelectionCycleRegionHandler'] = DataSlinger.focusReturningToApplet;
  retData['sunsetNotificationHandler'] = DataSlinger.sunsetNotifcationHandler;
  retData['saveNotificationHandler'] = DataSlinger.moveDataToScopeItem;
  callback(retData);
}
 
DataSlinger.initializeTempStoreForRecordInstance = function(scopeItem){
  var tempStore = {};
  tempStore.numRepeatedMap = {};
  tempStore.keyToIndexMap = {};
  tempStore.schema = {};
  tempStore.schema.keys = [];
  if(typeof scopeItem.recordScheme !== 'undefined'){
    tempStore.schema = DataSlinger.recordTypes[scopeItem.recordScheme];
  }
  tempStore.cloneableIndexInfoMap = DataSlinger.createCloneInfoMapFromSchema(tempStore.schema);
  var schema = tempStore.schema;
  for(var i=0; i<schema.keys.length; i++){
    tempStore.keyToIndexMap[schema.keys[i]] = i;
  }
  DataSlinger.state[scopeItem.storageId] = tempStore;
  return tempStore;
};

DataSlinger.initializeEntryForClient = function(entry){
  if(typeof entry.recordScheme !== 'undefined'){
    if(typeof entry.storageId === 'undefined'){
      var sid = SharedGlobal.core.getTemporaryVaultUniqueId();
      SharedGlobal.core.setAutoManagedNonSerializableField(entry,"storageId",sid);
    }
    if(typeof DataSlinger.state[entry.storageId] === 'undefined'){
      DataSlinger.initializeTempStoreForRecordInstance(entry);
    }
  }
}

function dataRecordDrawCycleNotificationHandler(msg,window){
  if(msg === 'BEFORE_DESTROY_DOM'){
    var scopeItem = SharedGlobal.core.scopeItem;
    var tempStore = DataSlinger.state[scopeItem.storageId];
    if(typeof DataSlinger.state[scopeItem.storageId] === 'undefined'){
      DataSlinger.initializeTempStoreForRecordInstance(scopeItem);
    }
    var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
    var store = tempStore[token];
    var info = DataSlinger.getNodeObjectInfoFromEditRegistry(token);
    if(info && store.isEditing){
      DataSlinger.moveDataToScopeItem(token);
    }
  }
}

function generateDataEntryFormHTML(core,responseCallback){ 
  var ds = DataSlinger;
  var scopeItem = core.scopeItem;
  var html = "";
  var wnd = core.getDrawingPaneIndex();
  if(typeof scopeItem.recordScheme === 'undefined'){ 
    html = "<div class=\"basic-child-item\">";
    html += "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div>";
    html += "<br/><div class=\"basic-tab\"></div><div class=\"basic-tab\"></div>Please select from the following record templates:"; 
    html += "<form><div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><div class=\"basic-tab\"></div>";
    html += "<br/><div class=\"basic-tab\"></div><div class=\"basic-tab\"></div><select name=\"select_box_1\" id=\"rec-type-choices\" onChange=\"dataEntryOnChangeDropdown(this.form.select_box_1);\">";
    html += "<option value-\"noop\">none chosen yet</option>";
    var keys = Object.keys(ds.recordTypes);
    for(var i=0; i<keys.length; i++){
      html += "<option value =\"" + keys[i] + "\">" + keys[i] + "</option>";
    }
    html += "</select></form>";
    html += "</div>";
    html += "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div></div>";
    return html;
  }
  var token = core.getPersistentDrawingInstanceToken();
  var editInProgress = false;
  if(ds.isCurrentlyBeingEditedElsewhere(scopeItem,token)){
    html += "<div class=\"basic-child-item\">This vault item is being edited elsewhere</div>";
  }
  else {
    if(ds.isNodeObjectRegisteredForEditing(scopeItem) == false){
      ds.currentlyBeingEditedArr[ds.currentlyBeingEditedArr.length] = {scopeItem:scopeItem,diToken:token};
    }
    var tempStore = ds.state[scopeItem.storageId];
    var store = tempStore[token];
    store.isEditing = true; 
    var schema = tempStore.schema;
    var labels = schema.labels;
    var keys = schema.keys;
    var curIdString = "";
    var curKey = "";
    var curLabel = "";
    var cloneableIndexInfoMap = tempStore.cloneableIndexInfoMap;
    var num = 1;
    var drawEmptyItem = false;
    tempStore.numRepeatedMap = {};
    if(typeof scopeItem.d === 'undefined'){
      scopeItem.d = {};
    }
    html = "<form name=\"recordViewAppletForm" + token + "\" class=\"form-bg-panel\" autocomplete=\"off\">";
    for(var i=0; i<keys.length; i++){
      curIdString = keys[i] + "_" + token + "_fld";
      SharedGlobal.tic.push(curIdString);
      html += "<div class=\"dyn-edit-item\"><div class=\"lwrap\">" + labels[i] + ":</div><input type=\"text\" class=\"dyn-edit-field\" id=\"" + curIdString + "\" style=\"outline-width: 0;\" tabindex=\"-1\" onmousedown=\"\"></input></div>";
      num = 0;
      if(typeof cloneableIndexInfoMap[i] !== 'undefined'){
        num = 1;
        tempStore.keyToIndexMap[keys[i]] = i;
      }
      while(num > 0){
        if(num == 1){
          curKey = keys[i];
          tempStore.numRepeatedMap[curKey] = 1;
	}
        else {
          curKey = keys[i] + Number(num).toString();
          curLabel = ds.getNumericAdjective(labels[i],num);
          drawEmptyItem = false;
          if(cloneableIndexInfoMap[i].addedEmptyFieldsMap[curKey])drawEmptyItem = true;
          if(typeof scopeItem.d[curKey] !== 'undefined' || drawEmptyItem){
            tempStore.numRepeatedMap[keys[i]]++;
            curIdString = keys[i] + "_" + Number(num).toString() + "_" + token + "_fld";
            SharedGlobal.tic.push(curIdString);
            html += "<div class=\"dyn-edit-item\"><div class=\"lwrap\">" + curLabel + ":</div><input type=\"text\" class=\"dyn-edit-field\" id=\"" + curIdString + "\" style=\"outline-width: 0;\" tabindex=\"-1\" onmousedown=\"\"></input></div>";
          }
          else {
            num = -1;
          }
        }
        if(num == -1){
          var btnId = keys[i] + "_" + token + "_btn";
          SharedGlobal.tic.push(btnId);
          html += "<div class=\"dyn-btn-wrapper-item\"><div class=\"hidlwrap\">add " + labels[i] + "</div><div class=\"dyn-edit-fld-emulator\"><div class=\"dyn-button\" id=\"" + btnId + "\" onclick=\"DataSlinger.onAddItem(this)\">+</div></div></div>";
        }
        num++;
      }
    }
    var returnBtnId = "return_btn_" + token;
    SharedGlobal.tic.push(returnBtnId);
    html += "<div class=\"dyn-btn-wrapper-item\"><div class=\"hidlwrap\"></div><div class=\"dyn-edit-fld-emulator\"><div class=\"dyn-ret-button\" id=\"" + returnBtnId + "\" onclick=\"DataSlinger.returnToClientScope(this)\">done</div></div></div>";
    html += "</form>";
    var retData = {};
    var appletValues = {};
    appletValues['isMultiLevel'] = true;
    appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
    appletValues['explicitResourceCount'] = 0;
    appletValues['postHTMLInstallAppletInfo'] = {method:ds.postHTMLInstallForDataEntryForm,data:{}};
    retData['appletValuesMap'] = appletValues;
    responseCallback(retData);
  }
  return html;
}

DataSlinger.isCurrentlyBeingEditedElsewhere = function(item,drawingInstanceToken){
  var arr = DataSlinger.currentlyBeingEditedArr;
  for(var i=0; i<arr.length; i++){
    var info = arr[i];
    if(item == info.scopeItem && drawingInstanceToken != info.diToken)return true;
  }
  return false;
};

DataSlinger.isNodeObjectRegisteredForEditing = function(item){
  var arr = DataSlinger.currentlyBeingEditedArr;
  for(var i=0; i<arr.length; i++){
    var info = arr[i];
    if(item == info.scopeItem)return true;
  }
  return false;
}

DataSlinger.getNodeObjectInfoFromEditRegistry = function(token){
  var arr = DataSlinger.currentlyBeingEditedArr;
  for(var i=0; i<arr.length; i++){
    var info = arr[i];
    if(token == info.diToken)return info;
  }
  return null;
}

DataSlinger.removeNodeObjectFromEditRegistryByDrawingInstance = function(drawingInstanceToken){
  var info = null;
  var arr = DataSlinger.currentlyBeingEditedArr;
  for(var i=0; i<arr.length; i++){
    var entry = arr[i];
    if(drawingInstanceToken == entry.diToken){
      info = entry;
      arr.splice(i,1);
      break;
    }
  }
  return info;
}

DataSlinger.postHTMLInstallForDataEntryForm = function(){
  var scopeItem = SharedGlobal.core.scopeItem;
  var schema = DataSlinger.state[scopeItem.storageId].schema;
  DataSlinger.moveDataToPage(scopeItem,schema);
};

DataSlinger.getNumericAdjective = function(label,num){
  var suffix = "th";
  var rem = num % 10;
  if(rem == 1)suffix = "st";
  if(rem == 2)suffix = "nd";
  if(rem == 3)suffix = "rd";
  return Number(num).toString() + suffix + " " + label;
};

DataSlinger.returnToClientScope = function(elmt){
  if(typeof elmt.id === 'undefined'){
    console.log("DataSlinger was not able to extract token from button id.");
    return;
  }
  var arr = elmt.id.split('-');
  //var token = arr[2];
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var storageId = SharedGlobal.core.scopeItem.storageId;
  var store = DataSlinger.state[storageId][token];
  store.isEditing = false;
  store.returnToClient = false;
  var childIndex = 0;
  var si = store.clientSelectionInfo;
  if(typeof si !== 'undefined' && si !== null){
    childIndex = si.zoneIndex;
  }
  SharedGlobal.core.navigateToContainerContext(childIndex,"",false); 
  store.clientSelectionInfo = null;
}

DataSlinger.createCloneInfoMapFromSchema = function(schema){
  var map = {};
  if(typeof schema.cloneable === 'undefined')return map;
  for(var i=0; i<schema.cloneable.length; i++){
    map[schema.cloneable[i]] = {addedEmptyFieldsMap:{}};
  }
  return map;
};

DataSlinger.assembleDataEntryFormHTMLFromGrammarAndStyle = function(grammar,schemaKeysMap,keysMap,keysArr,valuesArr,styleInfo){
  var html = "";
  var g = DataSlinger.grammars[grammar];
  var innerRslt =  DataSlinger.allocateRecordValuesAccordingToGrammar("S",g,schemaKeysMap,keysMap,keysArr,valuesArr,0,styleInfo);
  if(innerRslt.satisfied){
    html = innerRslt.html;
  }
  else {
    html = "[<i>check grammar</i>]";
  }
  return html;
};

DataSlinger.getDataEntryFormHTMLForAggregator = function(entryId,scopeItem,fmt){
  var html = "<div class=\"ag-entry\" id=\"" + entryId + "\">";
  var tempStore = DataSlinger.state[scopeItem.storageId];
  var schema = tempStore.schema;
  var recType = DataSlinger.recordTypes[scopeItem.recordScheme];
  var displayInfo = DataSlinger.displayOptions[recType['def_display']];
  if(typeof displayInfo === 'undefined')displayInfo = DataSlinger.styles['s1'];
  var attemptDraw = true;
  if(typeof schema === 'undefined' || schema == null)attemptDraw = false;
  if(typeof displayInfo === 'undefined')attemptDraw = false;
  if(typeof scopeItem.d === 'undefined')attemptDraw = false;
  if(attemptDraw){
    var grammar = displayInfo['grammar'];
    var styleInfo = DataSlinger.styles[displayInfo.style];
    var curIdString = "";
    var valuesArr = [];
    var keysArr = [];
    var keysMap = {};
    var labelsArr = [];
    var pos = 0;
    for(var i=0; i<schema.keys.length; i++){
      if(typeof scopeItem.d[schema.keys[i]] === 'undefined')continue;
      keysArr[pos] = schema.keys[i];
      keysMap[schema.keys[i]] = true;
      labelsArr[pos] = schema.labels[i];
      valuesArr[pos] = scopeItem.d[schema.keys[i]];
      pos++;
      if(typeof tempStore.cloneableIndexInfoMap[i] !== 'undefined'){
        var num = 2;
        var curKey = "";
        while(num > 1){
          curKey = schema.keys[i] + Number(num).toString();
          if(typeof scopeItem.d[curKey] === 'undefined')break;
          keysMap[curKey] = true;
          labelsArr[pos] = DataSlinger.getNumericAdjective(schema.labels[i],num);
          keysArr[pos] = curKey;
          valuesArr[pos] = scopeItem.d[curKey];
          pos++;
          num++;
        }
      }
    } 
    if(typeof grammar === 'undefined'){
      html += "<table>";
      for(var i=0; i<keysArr.length; i++){
        html += "<tr>";
        html += "<td align=\"right\"><b>" + labelsArr[i] + ": </b></td><td><span class=\"med-spacer-item\"></span>" + scopeItem.d[keysArr[i]] + "</td>";
        html += "</tr>";
      }
      html += "</table>";
    }
    else {
      html += DataSlinger.assembleDataEntryFormHTMLFromGrammarAndStyle(grammar,tempStore.keyToIndexMap,keysMap,keysArr,valuesArr,styleInfo);
    }
  }
  else{
    html += "[<i>cannot display record info</i>]";
  }
  html += "</div>";
  return html;  
};

DataSlinger.allocateRecordValuesAccordingToGrammar = function(inputSymbol,grammar,schemaKeysMap,keysMap,keysArr,valuesArr,startPos,styleInfo){
  var rslt = {};
  rslt.html = "";
  rslt.pos = startPos;
  rslt.satisfied = false;
  var symbol = "";
  var symbolsArr = null;
  var answers = [];
  var cssBlock = "";
  var cssInline = "";
  var inlineStyle = "";
  if(typeof styleInfo[inputSymbol] !== 'undefined'){
    var si = styleInfo[inputSymbol];
    if(typeof si['div'] !== 'undefined'){
      cssBlock = si['div']; 
    }
    if(typeof si['span'] !== 'undefined'){
      cssInline = si['span'];
    }
    if(typeof si['inline-props'] !== 'undefined'){
      inlineStyle = StyleWorkbench.getCssStyleStringFromFormatInfo(si['inline-props']);   
    }
  }
  if(typeof keysMap[inputSymbol] !== 'undefined'){
    if(keysArr.length < (rslt.pos + 1))return rslt;
    if(keysArr[rslt.pos].substring(0,inputSymbol.length) === inputSymbol){
      rslt.html = valuesArr[rslt.pos];
      if(inlineStyle !== ""){
        rslt.html = "<span style=\"" + inlineStyle + "\">" + rslt.html + "</span>";
      }
      rslt.pos++;
      rslt.satisfied = true;
    }
    return rslt;
  }
  if(typeof schemaKeysMap[inputSymbol] !== 'undefined'){
    return rslt;
  }
  if(typeof grammar[inputSymbol] !== 'undefined'){
    var options = grammar[inputSymbol];
    for(var i=0; i<options.length; i++){
      symbolsArr = options[i];
      for(var j=0; j<symbolsArr.length; j++){
        var innerRslt = DataSlinger.allocateRecordValuesAccordingToGrammar(symbolsArr[j],grammar,schemaKeysMap,keysMap,keysArr,valuesArr,rslt.pos,styleInfo);
        if(innerRslt.satisfied){
          rslt.pos = innerRslt.pos;
          answers[answers.length] = innerRslt.html; 
          continue;
        }
        else {
          answers = [];
          rslt.pos = startPos;
          break;
        }
      }
      if(answers.length === symbolsArr.length){
        rslt.html += answers.join('');
        if(inlineStyle !== ""){
          rslt.html = "<span style=\"" + inlineStyle + "\">" + rslt.html + "</span>";
        }
        if(cssBlock !== ""){
          rslt.html = "<div class=\"" + cssBlock + "\">" + rslt.html + "</div>";
        }
        if(cssInline !== ""){
          rslt.html = "<span class=\"" + cssInline + "\">" + rslt.html + "</span>";
        }
        rslt.satisfied = true;
        return rslt;
      }
    }
    return rslt;
  }
  rslt.satisfied = true;
  rslt.html += inputSymbol; //symbol is used as a token
  return rslt;
};

function dataEntryOnChangeDropdown(ctrl){
  var selStr = "";
  var elmt = document.getElementById('rec-type-choices');
  if(elmt){
    selStr = elmt.options[elmt.selectedIndex].value;
    var scopeItem = SharedGlobal.core.scopeItem;
    scopeItem.recordScheme = selStr;    
    var tempStore = DataSlinger.state[scopeItem.storageId];
    tempStore.schema = DataSlinger.recordTypes[scopeItem.recordScheme];
    tempStore.cloneableIndexInfoMap = DataSlinger.createCloneInfoMapFromSchema(tempStore.schema);
    SharedGlobal.core.requestRedraw(false);
    SharedGlobal.core.promptToSave(false);
  }
}

function handleDataEntryFormKeyDown(e){
  DataSlinger.detectTabIdChangeAndUpdate();
  if(e.keyCode == 13 || e.char === "Enter" || e.keyIdentifier === "Enter"){
    var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
    var id = wnd.tabIdsArr[wnd.tabIdsPos];
    if(id && id.indexOf('_btn') > -1){
      var btnElmt = document.getElementById(id);
      if(btnElmt && typeof btnElmt.click === 'function'){
        btnElmt.click(e);
      }
    } 
    return false;
  }
  if(e.keyCode > 64 || e.keyCode === 'backspace' || e.keyCode === 'tab'){
    SharedGlobal.core.promptToSave(false);
  }
  return true;
}

DataSlinger.focusReturningToApplet = function(){
  DataSlinger.detectTabIdChangeAndUpdate();
};

DataSlinger.sunsetNotifcationHandler = function(){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var tempStore = DataSlinger.state[SharedGlobal.core.scopeItem.storageId];
  var store = tempStore[token];
  store.returnToClient = false;
  store.isEditing = false;
  DataSlinger.removeNodeObjectFromEditRegistryByDrawingInstance(token);
  DataSlinger.moveDataToScopeItem(token);
}

DataSlinger.moveDataToScopeItem = function(token){
  var scopeItem = SharedGlobal.core.scopeItem;
  var tempStore = DataSlinger.state[scopeItem.storageId];
  var schema = tempStore.schema;
  var curKey = "";
  var elmt = null;
  var elmts = document['recordViewAppletForm' + token]; 
  var valuesArr = [];
  var keysArr = [];
  var lastKey = "";
  var num = 2;
  var baseKeyFilled = false;
  var baseKeyIndex = -1;
  if(typeof elmts === 'undefined' || elmts == null){
    return;
  }
  delete scopeItem['d'];
  scopeItem.d = {};
  for(var i=0; i<elmts.length; i++){
    elmt = elmts[i];
    curKey = elmt.id.split('_')[0];
    valuesArr[valuesArr.length] = elmt.value;
    keysArr[keysArr.length] = curKey;
  }
  for(var i=0; i<valuesArr.length; i++){
    curKey = keysArr[i];
    if(curKey === lastKey){
      if(typeof valuesArr[i] !== 'undefined' && valuesArr[i] !== ""){
        if(baseKeyFilled){
          keysArr[i] = curKey + num;
          num++;
        }
        else{
          valuesArr[baseKeyIndex] = valuesArr[i]; 
          valuesArr[i] = "";
          keysArr[i] = undefined;
          baseKeyFilled = true;
        }
      }
      else {
        keysArr[i] = undefined;
      }
    }
    else {
      if(valuesArr[i] === ""){
        baseKeyFilled = false;
      }
      else{
        baseKeyFilled = true;
        num = 2;
      }
      baseKeyIndex = i; 
    }
    lastKey = curKey;
  }
  for(var i=0; i<valuesArr.length; i++){
    if(valuesArr[i] !== "" && typeof keysArr[i] !== 'undefined'){
      scopeItem.d[keysArr[i]] = valuesArr[i];
    }
    else {
      curKey = keysArr[i];
    }
  }
};

DataSlinger.moveDataToPage = function(scopeItem,schema){
  var curKey = "";
  var curId = "";
  var numRepeats = -1;
  var tempStore = DataSlinger.state[scopeItem.storageId];
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  for(var i=0; i<schema.keys.length; i++){
    curKey = schema.keys[i];
    curId = schema.keys[i] + "_" + token + "_fld";
    if(typeof scopeItem.d[curKey] === 'undefined')continue;
    document.getElementById(curKey + "_" + token + "_fld").value = scopeItem.d[curKey];
    numRepeats = tempStore.numRepeatedMap[curKey];
    if(typeof numRepeats === 'undefined')numRepeats = -1;
    for(var j=0; j<numRepeats;j++){
      if(j > 0){
        curKey = schema.keys[i] + Number(j+1).toString();
        curId = schema.keys[i] + "_" + Number(j + 1).toString() + "_" + token + "_fld";
      }
      if(typeof scopeItem.d[curKey] !== 'undefined'){
        document.getElementById(curId).value = scopeItem.d[curKey];
      }
    }
  }
};

DataSlinger.detectTabIdChangeAndUpdate = function(){
  var wnd = SharedGlobal.core.getWindowPaneFromIndex(SharedGlobal.core.getActivePaneIndex());
  var tabId = wnd.tabIdsArr[wnd.tabIdsPos];
  var mrTabId = DataSlinger.mostRecentTabId;
  if(typeof tabId === 'undefined')return false;
  if(typeof mrTabId === 'undefined' || mrTabId != tabId){
    DataSlinger.mostRecentTabId = tabId;
    var mrElmt = document.getElementById(mrTabId);
    if(mrElmt){
      mrElmt.blur();
    }
    //DataSlinger.selectedElmt = document.getElementById(tabId);
    //DataSlinger.selectedElmt.focus();
  }
  else{
    var curElmt = document.getElementById(tabId);
    if(curElmt){
      curElmt.focus();
    }
  }   
  return true;
};

function handleDataEntryFormMouseDown(e){

};

DataSlinger.getFindables = function(string,scopeItem){
  console.log("getFindables has been called");
};



///////////// Data Aggregator  ///////////////////////////////

DataSlinger.onAddItem = function(btn){
  var scopeItem = SharedGlobal.core.scopeItem;
  if(typeof scopeItem.recordScheme === 'undefined')return; 
  var tempStore = DataSlinger.state[scopeItem.storageId];
  var schema = tempStore.schema; 
  var html = "";
  var arr = btn.id.split('_');
  var token = arr[1];
  var nextNum = Number(tempStore.numRepeatedMap[arr[0]] + 1).toString();
  var keyDex = tempStore.keyToIndexMap[arr[0]]; 
  var nuLabel = DataSlinger.getNumericAdjective(schema.labels[keyDex],nextNum);
  var nuKey = schema.keys[keyDex] + nextNum;
  var bump = Number(nextNum) - 1; 
  var cloneInfo = tempStore.cloneableIndexInfoMap[keyDex];
  cloneInfo.addedEmptyFieldsMap[nuKey] = true; 
  DataSlinger.moveDataToScopeItem(token);
  SharedGlobal.core.requestRedraw(false);
};

function initializeRecordAggregatorApplet(core,callback){
  var scopeItem = core.scopeItem;
  //change set 271
  //scopeItem.hdTtl = false;
  var wndIdx = core.getHostPaneIndex();
  core.setupResponsiveMenuitem(wndIdx,'author','add_record','anyregion',null,'','',DataSlinger.addNewRecordEntry);
  core.setupResponsiveMenuitem(wndIdx,'author','remove','child',null,'','',function(e){core.removeItem(e)});
  core.setupResponsiveMenuitem(wndIdx,'author','edit','child',null,'','',DataSlinger.doEditItemHandler);

  //cycle through and initialize all child data records
  //change set 271
  //for(var i=0; i<scopeItem.c.length; i++){
  var iter = core.getTracker();
  var len = iter.childCount();
  for(var i=0; i<len; i++){
    //change set 271
    //if(scopeItem.c[i] == null)continue; //test code uses atypical children here
    var cinfo = iter.childInfo(i);
    if(!cinfo.exists || cinfo.isNull)continue; //test code uses atypical children here
    if(cinfo.typeof === 'object'){
      DataSlinger.initializeEntryForClient(scopeItem.c[i]);
    }
  }
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  core.setMaxWindowSize(wnd,600,-1);
}

function generateRecordAggregatorHTML(core,responseCallback){
  var html = "";
  var scopeItem = core.scopeItem;
  //change set 271
  //var iter = core.tracker;
  var iter = core.getTracker();
  var child = null;
  var curIdString = "";
  //change set 271
  //for(var i=0; i<scopeItem.c.length; i++){
  var len = iter.childCount();
  for(var i=0; i<len; i++){
    child = scopeItem.c[i];
    curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString);
    if(child && typeof child.d !== 'undefined'){
      html += DataSlinger.getDataEntryFormHTMLForAggregator(curIdString,child,{});
    }
    else{
      html += "<div class=\"ag-entry\" id=\"" + curIdString + "\">" + DataSlinger.getDSErrorMsg() + "</div>";
    }
    iter.next();
  }
  if(html === ""){
    html = DataSlinger.getSetupHowToMsg();
  }
  return html;
}

DataSlinger.getDSErrorMsg = function(){
  var msg = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Error: </b>";
  msg += "This record cannot be rendered, something is missing";
  msg += "<div class=\"spacer-item\"></div>";
  return msg;
}

DataSlinger.getSetupHowToMsg = function(){
  var msg = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Welcome to the record aggregator applet</b>";
  msg += "<p>";
  msg += "<div class=\"basic-tab\"></div>To add a record entry just hit the 'r' shortcut key";
  msg += "<div class=\"spacer-item\"></div>";
  return msg;
}

DataSlinger.addNewRecordEntry = function(e){
  var rtOptions = ["none selected"]; 
  var rtKeys = Object.keys(DataSlinger.recordTypes);
  for(var i=0; i<rtKeys.length; i++){
    rtOptions[rtOptions.length] = rtKeys[i];
  }
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"Add new record"},
{type:"dropdown_listbox",label:"record type: ",box_class:"listbox",options:rtOptions,key:"rtyp","focusItem":true}
]};
  var cpInfo = SharedGlobal.core.displayCustomPopup(customDlgInfo,DataSlinger.acceptNewRecordEntryValues);
  var focusElmt = document.getElementById(cpInfo.focusId);
  if(focusElmt){
    focusElmt.focus();
  }
}
  
DataSlinger.acceptNewRecordEntryValues = function(resultMap){
  if(typeof resultMap === 'undefined'){
    console.log("Error: Invalid result map from custom dialog.");
    return;
  }
  var core = SharedGlobal.core;
  //change set 271
  //var childIndex = core.scopeItem.c.length;
  var iter = core.getTracker();
  var childIndex = iter.childCount();
  var si = core.getSelectionInfo();
  if(si.rgn === 'child')childIndex = si.zoneIndex;
  var nuItem = core.createNewVaultItem();
  nuItem.recordScheme = resultMap['rtyp'].value;
  nuItem.apcd = "DataSlinger0";
  var sid = SharedGlobal.core.getTemporaryVaultUniqueId();
  SharedGlobal.core.setAutoManagedNonSerializableField(nuItem,"storageId",sid);
  core.addVaultItem(core.scopeItemIndex,"",nuItem,childIndex);
  core.promptToSave(false);
  var cia = core.childIds[core.scopeItemIndex];
  core.openItemFromId(cia[childIndex],"");
}

DataSlinger.doEditItemHandler = function(){
  var core = SharedGlobal.core;
  var storageId = SharedGlobal.core.scopeItem.storageId;
  var si = null;
  var childIndex = -1;
  var token = core.getPersistentDrawingInstanceToken();
  var store = DataSlinger.state[storageId][token];
  store.returnToClient = true;
  store.clientSelectionInfo = si = core.getSelectionInfo();
  var cia = core.childIds[core.scopeItemIndex];
  if(si.rgn === 'child')childIndex = si.zoneIndex;
  core.openItemFromId(cia[childIndex],"");
  return true; 
}

function handleRecordAggregatorKeyDown(e){
  var handled = false;
  var keycode = SharedGlobal.core.getKeycodeFromEvent(e);
  if(keycode === 'KeyR' || keycode === 'r'){
    DataSlinger.addNewRecordEntry(e);
    handled = true;
  }
  return handled;
}

  

