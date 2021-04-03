/*
   Copyright 2021 Bradley A. Pliam

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

var PicturePlacer = {};


/////////////////  PicturePlacer  ////////////////////////

function initializePicturePlacer(core,callback,hostPaneIdx,args){
  if(typeof core.scopeItem.d === 'undefined'){
    core.scopeItem.d = {location:""};
  }
  core.setupResponsiveMenuitem(hostPaneIdx,'author','add_picture','anyregion',null,'','',PicturePlacer.doAddPicture);
}

function generatePicturePlacerHTML(core,callback){
  var loc = core.scopeItem.d.location;
  if(loc.length > 0){
    console.log('FINAL SRC STRING: ' + loc);
    return '<img src="' + loc + '"/>';
  }
  return '<div class="basic-child-item">[add a picture here]</div>';
}

PicturePlacer.doAddPicture = function(){
  var customDlgInfo = {"fields":[
{type:"bold_text",text:"URL or local filename"},
{type:"edit",label:"",box_class:"long",value:"",key:"loc"},
{type:"button",text:"Take from clipboard",box_class:"medium",handlerFnc:PicturePlacer.setPicturePlacerUseClipboardString,key:'ucb'},
{type:"platform_button",intent:"browse_FS",text:"Browse files...",box_class:"medium",recipient_edit_id:"custom-dlg-item-1"}
]};
  SharedGlobal.core['displayCustomPopup'](customDlgInfo,PicturePlacer.acceptPictureLocation);
}

PicturePlacer.setPicturePlacerUseClipboardString = function(){
  //the '1' correpsonds to the zero-based set of fields provided above
  document.getElementById('custom-dlg-item-1').value = '% use clipboard %';
}

PicturePlacer.acceptPictureLocation = function(info){
  var loc = info['loc'].value;
  if(loc === '% use clipboard %'){
    return;
  }
  if(loc.indexOf('http') == 0){
    console.log('web'); 
  }
  else{
    SharedGlobal.core.mirrorLocalImage(loc,PicturePlacer.acceptReflectedImageLocation);
  }
}

PicturePlacer.acceptReflectedImageLocation = function(loc){
  SharedGlobal.core.scopeItem.d.location = loc;
  SharedGlobal.core.requestRedraw(false);
}

function handlePicturePlacerKeyDown(e){
  return false;
} 

