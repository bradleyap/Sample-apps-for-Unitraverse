/*
   Copyright 2020 Bradley A. Pliam

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

BarChart = {};
BarChart.currentOp = 'no-op';

function initializeStackedBarChart(core,responseCallback){
  var apIdx = core.getHostPaneIndex();
  var scopeItem = core.scopeItem;
  var loc = scopeItem.boundLocation;
  if(typeof loc === 'undefined'){
    loc = scopeItem.boundLocation = "";
  }
  if(loc !== ""){
    core['requestFileContents'](scopeItem.boundLocation,BarChart.dataReceiverMethod,{}); 
  }
  if(typeof BarChart.store === 'undefined'){
    BarChart.store = {};
    var style = ".bar-wrapper{position: relative; width: 100000px; height: 18px; padding: 2px; padding-top: 0px; border-color: #ffffee; border-width: 1px; border-style: solid;} .bar-section{position: absolute; top: 0px; left: 0px; height: 15px;}";
    StyleWorkbench.createStyle(style);
  }
}

function generateStackedBarHTML(core,responseCallback){
  if(core.scopeItem.boundLocation === ""){
    return BarChart.getHowToSetupMsgHTML();
  }
  var html = "";
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var data = BarChart.store[token];
  if(typeof data === 'undefined'){
    html = "Waiting on data";
  }
  else{
    var left = 0;
    var top = 0;
    var dataArr = data.inputDataArr;
    var percentPos = 0;
    var posNum = 0;
    var negNum = 0;
    var pop = 0;
    html = "<div id=\"diy-bar-chart\">";
    for(var i=0; i<dataArr.length; i++){
      var rowArr = dataArr[i].split(',');
      percentPos = data.calculated.percentPositive[i];
      posNum = data.calculated.pos[i];
      negNum = data.calculated.neg[i];
      pop = data.calculated.pop[i];
      html += "<font face=\"Arial\" size=\"2\" color=\"#555522\">" + rowArr[0] + " " + percentPos + "% testing positive (" + BarChart.formatLargeNumber(posNum) + " of " + BarChart.formatLargeNumber(negNum + posNum) + " tests. Total population: " + BarChart.formatLargeNumber(pop) + ")</font>";
      html += "<div class=\"bar-wrapper\">";
      for(var j=1; j<rowArr.length; j++){
        html += "<div class=\"bar-section\" id=\"stacked-bar-" + i + "_" + j + "\"></div>";
      }
      html += "</div>";
    }
    html += "</div>";
  }

  if(typeof data !== 'undefined' && data != null){
    responseCallback({"appletValuesMap":{"postHTMLInstallAppletInfo":{"method":BarChart.postHTMLInstall,"data":data}}});
  }
  return html;
}

BarChart.getHowToSetupMsgHTML = function(){
  var msg = "<div class=\"spacer-item\"></div><div class=\"basic-tab\"></div><b>Instructions</b>";
  msg += "<ol>";
  msg += "<li>container select the page</li>";
  msg += "<li>click on 'configure' in the main menu</li>";
  msg += "<li>select 'Applet defined' in the configuration drop-down menu</li>";
  msg += "<li>in the 'Path' field point to a directory by typing the full OS directory location... providing the full path, or by clicking the 'Browse files...' button and selecting the path to a CSV file from the file system</li>";
  msg += "<li>click 'OK'</li>";
  msg += "<li>click 'save'</li>";
  msg += "</ol>";
  return msg;
}

BarChart.dataReceiverMethod = function(data,requestContext){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  BarChart.store[token] = {inputDataArr:data.split('[newline]')};
  BarChart.analyzeData(BarChart.store[token]);
  SharedGlobal.core.requestRedraw(false);
}

BarChart.analyzeData = function(inputData){
  var bigVal = 0;
  var smallVal = 0;
  var dataArr = inputData.inputDataArr;
  for(var i=0; i<dataArr.length; i++){
    var rowArr = dataArr[i].split(',');
    var pos = Number(rowArr[1]);
    var neg = Number(rowArr[2]);
    var pop = Number(rowArr[3]);
    var val = Number(rowArr[1]) + Number(rowArr[2]);
    if(val > bigVal){
      bigVal = val;
    }
    if(val < smallVal){
      smallVal = val;
    }
    //store rate of positive cases
    var added = {"percentPositive":[],"pos":[],"neg":[],"pop":[]};
    if(typeof inputData.calculated !== 'undefined'){
      added = inputData.calculated;
    }
    else{
      inputData.calculated = added;
    } 
    added.percentPositive[i] = Number(pos * 100 / (pos + neg)).toFixed(2);
    added.pos[i] = pos; 
    added.neg[i] = neg;
    added.pop[i] = pop;
    console.log('(' + rowArr[0] + ',' + rowArr[1] + ',' + rowArr[2] + ',' + rowArr[3] + ')');
  }
  dataArr.upper = bigVal;
  dataArr.lower = smallVal;
}

BarChart.postHTMLInstall = function(data){
  var upperLim = data.inputDataArr.upper;
  var lowerLim = data.inputDataArr.lower;
  var f = 1;
  var max = 900;
  var min = 500;
  var dif = upperLim - lowerLim;
  if(dif > max){
    f = max / dif; 
  }
  else{
    if(dif < min){
      f = dif / min;
    } 
  }
  var elmt = document.getElementById('diy-bar-chart');
  elmt.style.backgroundColor = '#ffffee'; //'#faf9fd';
  var clrMap = {"1":"#555522","2":"#f0cc77","3":"#f3eecc"};
  for(var i=0; i<data.inputDataArr.length; i++){
    var rowArr = data.inputDataArr[i].split(',');
    var left = 0;
    for(var j=1; j<3; j++){
      var w = rowArr[j];
      elmt = document.getElementById('stacked-bar-' + i + '_' + j);
      elmt.style.backgroundColor = clrMap[j];
      elmt.style.width = (f * w) + 'px';
      elmt.style.height = '15px';
      elmt.style.left = left + 'px';
      left = f * w;
    }
  }    
}

BarChart.formatLargeNumber = function(n){
  var numStr = Number(n).toString();
  if(typeof n === 'number'){
    if(n < 1000){
      return numStr;
    }
  }
  var outStr = "";
  var pos = 0;
  var arr = numStr.split('');
  for(var i=arr.length - 1; i>-1; i--){
    if((pos % 3 == 0) && i > -1 && pos > 0){
      outStr = ',' + outStr;
    } 
    outStr = arr[i] + outStr;
    pos++;
  }
  return outStr;
}
