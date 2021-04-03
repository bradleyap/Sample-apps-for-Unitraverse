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

var TLAPPV0PT001 = function(){

//shared state
var tempStore = {};
var numUnits = [];
var daysReached = []; //takes a month (zero-based) and gives the number of days accumulated since the beginning of the year
var barColors = []; //diagnostic
var dayFractions = [0.00000001157407,0.00001157407407,0.00069444444444,0.04166666666666,1.0,30,365,3650,36500,365000,3650000];
var isMouseBtnDown = 0;
var mousePos = [];
var selIndex = 0;
var moduleInitialized = false; 

//A note about the timeline data format:
//For now, the JSON timeline events do not use a compacted date format, and this provides an
//adequate MVP... even though the demand on the network because of message size is 
//constant regardless of zoom level. Events get sent to the browser with exact to the millisecond 

function initializeSharedState(){
  //initialize number of units
  for(var i = 0; i < 11; i++){
    numUnits[i] = 10;
  }

  //non-metric units will differ from metric
  numUnits[0] = 1000; //ms
  numUnits[1] = 60; //seconds
  numUnits[2] = 60; //mintues
  numUnits[3] = 24; //hours
  numUnits[4] = 30; //will need to dynamically change to 31 or 28 days
  numUnits[5] = 12; //months
  numUnits[6] = 10; //years

  //if(t.months == 3 || t.months == 5 || t.months == 8 || t.months == 10)t.maxDays = 29;
  //days from month input array
  daysReached[0] = 0;
  daysReached[1] = 31; //adds Jan
  daysReached[2] = 59; //clients will need to apply leap year adjustment not applied here
  daysReached[3] = 90; //adds Mar
  daysReached[4] = 120; //adds Apr
  daysReached[5] = 151; //adds May
  daysReached[6] = 181; //adds Jun
  daysReached[7] = 212; //adds Jul
  daysReached[8] = 243; //adds Aug
  daysReached[9] = 273; //adds Sep
  daysReached[10] = 304; //adds Oct
  daysReached[11] = 334; //adds Nov

  //diagnostic only
  barColors[0] = "#ff00aa";
  barColors[1] = "#6666ff";
  barColors[2] = "#ffff66";
  barColors[3] = "#ff66ff";
  barColors[4] = "#66ffff";
  barColors[5] = "#aa8888";
  barColors[6] = "#66bb66";//"#ff9900";
  barColors[7] = "#ffffff"; //"#ff00ff";//"#aaaa88";
  barColors[8] = "#0000ff";
  barColors[9] = "#00FF00";
  barColors[10] = "#333333";	

  moduleInitialized = true; 
}

function initializeBars(di){
	//initialize indices for iterative bounds
	di.lowerBarDex = 0;
	di.upperBarDex = -1;
}

//function initializeTimeframeVars(){
function initializeTimeframeVars(di){
        
	//compute the number of visible bars
	di.maxVisibleBars = di.tlAreaWidth / (di.pLineVisibilityThreshold - 1); //Without '-1' then not enough visible bars, which can prevent demotePrimaryLines from being called

	//display default years if no data loaded
	if(di.eventList.length < 1){
		di.startBufTime = new datetime("",1989,0,0,0,0,0,0,"");
		di.endBufTime = new datetime("",2005,0,0,0,0,0,0,"");
	}

	//add extra primary lines to each side of the timeframe
	di.spanInDays = calculatePreciseOffsetInDays(di.startBufTime,di.endBufTime);
	//widen span if start and end times are the same
	if(di.spanInDays == 0){
		var level = getSignificantComponentLevel(di.startBufTime);
		for(var i=0; i<10; i++){
			di.endBufTime.advance(level);
		}
		di.spanInDays = calculatePreciseOffsetInDays(di.startBufTime,di.endBufTime);
	}
	
	//determine primary line level
	determinePrimaryLineLevelAndDensityApprox(di); //initializes zoomDex, based on tlAreaWidth 

	computeAndSaveInitialTimelinePixelOffset(di);
	
	forgetSubZoomTime(di);//the bars must be exactly n increments from eachother
}

function computeTLFrameWidth(di){
	di.labelFrame.style.width = di.tlAreaWidth - 6 + "px";
	var wframe = document.getElementById('wfrm' + di.token);
	wframe.style.width = (di.tlAreaWidth + 500)+ "px";
	di.frameRSide = di.tlAreaWidth;
}

function determinePrimaryLineLevelAndDensityApprox(di){ 
	var displayPixels = di.tlContentReductionFactor * di.tlAreaWidth;
	if(displayPixels == 0)return;
	var idealDays = (di.pLineVisibilityThreshold * di.spanInDays) / displayPixels;
	var lastVisibleLevel = 10;	
	for(var level = 10;level > -1;level--){
		if(dayFractions[level] < idealDays)break;
		lastVisibleLevel = level; 
	}
	di.pLineDensity = (dayFractions[lastVisibleLevel] * displayPixels) / di.spanInDays;
	di.zoomDex = lastVisibleLevel;	
	setZoomLevelConfiguration(di);
}

function computeAndSaveInitialTimelinePixelOffset(di){
	//computeForgottenDaysLHS
	var tmp = new datetime("",1,0,0,0,0,0,0,"");
	tmp.setTime(di.startBufTime);
	forgetThisSubZoomTime(di,tmp);
	di.forgottenDaysLH = calculatePreciseOffsetInDays(tmp,di.startBufTime);

	//we assert that the events initially span of some fraction of the width of the timeline pane
	var neededPxls = di.tlContentReductionFactor * di.tlAreaWidth; //frameRSide;
	var overage = di.frameRSide - neededPxls;
	var droppedPxls = 0;
	var firstEvtDif = overage / 2;
	if(di.spanInDays != 0)droppedPxls = (di.forgottenDaysLH * neededPxls) / di.spanInDays;
	else droppedPxls = 0;
	di.initialEventPxlOffset = firstEvtDif - droppedPxls;
}

function ingestSimpleTimelineItems(ob,di){
  di.eventList = [];
  var t1 = null;
  var t2 = null;
  var details = "";
  //change set 271
  //if(typeof ob.c === 'undefined'){
  //  return;
  //}
  //for(var i=0; i<ob.c.length; i++){
  var iter = SharedGlobal.core.getTracker();
  var len = iter.childCount();
  for(var i=0; i<len; i++){
    //change set 271
    //var item = ob.c[i];
    //if(typeof item == 'undefined'){
    //  continue;
    //}
    var cinf = iter.childInfo();
    if(!cinf.isNull){
      //if(typeof item.labs === 'undefined' || (item.labs.length < 2)){
      //  continue;
      //}
      //if(typeof item.c === 'undefined' || (item.c.length < 2)){
      var iter2 = iter.down();
      var numFields = iter2.childCount(); 
      if(numFields < 2){
        continue;
      }
      t1 = null;
      t2 = null;
      //change set 271
      //var dtStringArr = item.labs[1].split(' to ');
      //var dtStringArr = item.c[1].split(' to ');
      var dtStringArr = iter2.label(1).split(' to '); 
      t1 = extractDatetimeValuesFromString(dtStringArr[0]);
      if(dtStringArr.length > 1){
        t2 = extractDatetimeValuesFromString(dtStringArr[1]);
      } 
      //change set 271
      //if(item.labs.length > 2){
      //  details = item.labs[2]; 
      //if(item.c.length > 2){
        //details = item.c[2]; 
      if(numFields > 2){
        details = iter2.label(2); 
      }
      var clr = "#cc33dd";
      //change set 271
      //if(typeof item.clr !== 'undefined'){
      //if(typeof item.clr !== 'undefined'){
        //clr = item.clr;
      var idata = iter.data();
      if(typeof idata.clr !== 'undefined'){
        clr = idata.clr;
      }
      //change set 271
      //var evt = new EventObject(item.labs[0],details,t1,t2,clr);
      var evt = new EventObject(item.c[0],details,t1,t2,clr);
      di.eventList[i] = evt;
    }
    //change set 271
    iter.next();
  }
}

function updatePreciseTimelinePositions(di){
  for(var i=0; i<di.eventList.length; i++){
    di.eventList[i].mapDatetimeToDays(di.startBufTime,calculatePreciseOffsetInDays);
  }	
}

function assignXPositionsToEvents(di,init=false){
  var adj = di.barPositions[0]; 
  di.arraySpanPxls = di.barPositions[di.upperBarDex] - di.barPositions[0];
  //kludge to compensate for the fact that the endBufTime has been incremented beyond bar 179
  var ebt2 = new datetime("",1,0,0,0,0,0,0,""); //use copy of endbuftime
  ebt2.setTime(di.endBufTime);
  ebt2.turnback(di.zoomDex);
  di.arraySpanDays = calculatePreciseOffsetInDays(di.startBufTime,ebt2);
  for(var i=0; i<di.eventList.length; i++){
    var evt = di.eventList[i];
    evt.setXPositions(di.arraySpanPxls,di.arraySpanDays,adj,di); 
  }
}

function assignYPositionsToEvents(di){
  di.arraySpanPxls = di.barPositions[di.upperBarDex] - di.barPositions[0];
  di.spanInDays = calculatePreciseOffsetInDays(di.startBufTime,di.endBufTime);
  //stacking will prevent overlapping items but use space higher in the order if available
  var coordinateInfoArr = [];
  var vPosCoordInfoArr = [];
  var computedBottom = 0;
  for(var i=0; i<di.eventList.length; i++){
    var evt = di.eventList[i];
    var daysArr = evt.computeTerminalLocations(di);
    coordinateInfoArr[i] = {lhs:daysArr[0],rhs:daysArr[1],vpos:-1};  
  }
  for(var i=0; i<di.eventList.length; i++){
    var evt = di.eventList[i];
    var cinfo = coordinateInfoArr[i];
    var vPos = -1;
    for(var j=0; j<vPosCoordInfoArr.length; j++){
      var vPosArr = vPosCoordInfoArr[j];
      if(typeof vPosArr !== 'undefined'){
        var canPlace = true;
        for(var k=0; k<vPosArr.length; k++){
          if(areOverlapping(vPosArr[k],cinfo)){
            canPlace = false;
            break;
          }
        }
        if(canPlace == true){
          vPos = j;
          vPosArr[vPosArr.length] = cinfo;
          break;
        }
      }
      else{
        vPosCoordInfoArr[j] = [coordinateInfoArr[i]];
	vPos = j;
      }
    }
    if(vPos < 0){
      vPos = vPosCoordInfoArr.length;
      vPosCoordInfoArr[vPosCoordInfoArr.length] = [cinfo];
    }
    var tbarHt = 34; //basic-title height property  
    var lbfHt = 30; //lbframe height property
    var ht = 25;
    if(di.displayCode === 'details'){
      ht = 45;
    }
    var curYpos = tbarHt + lbfHt + (vPos * ht);
    evt.setYPositions(tbarHt + lbfHt + (vPos * ht)); 
    computedBottom = curYpos + ht; 
  }
  return computedBottom;
}

function areOverlapping(item1,item2){
  if(item1.lhs > item2.rhs)return false;
  if(item1.rhs < item2.lhs)return false;
  return true;
}

function assignYPositionsToBarsAndTags(di,minHt){
	document.getElementById('wfrm' + di.token).style.height = di.tlAreaHeight + "px";
	var barHt = di.tlAreaHeight;
        if(barHt < minHt){
          barHt = minHt;
        }
	for(var i=0; i < di.upperBarDex; i++){
		di.bars[i].style.height = barHt +  "px";
		if(di.bars[i].syncParent !== null)setParentBarHeights(di.bars[i].syncParent,barHt);
	} 
}

function setParentBarHeights(parentBar,ht){
	parentBar.style.height = ht + "px";
	if(parentBar.syncParent !== null)setParentBarHeights(parentBar.syncParent,ht);
}

function calculatePreciseOffsetInDays(t0,time){

	if(time === undefined)return 0.0;
	if(t0 === undefined)return 0.0;

	//calculate in days
	var days = 0.00;
	var dif = 0;
	for(var i = 7; i > -1; i--){
		if(i == 6){ 
			dif = time.years - t0.years;
			if(dif > 0 && dif < 4){
				var t = new datetime("",1,0,0,0,0,0,0,"");
				t.setTime(t0);
				for(var j = dif; j > 0; j--){
					if(isLeapYear(t.year))days += 366.00;
					else days += 365.00;
					t.advance(6); 
				}
			}
			else days = dif * 365.25;
		}
		else if(i == 5){
			days -= accumulativeDaysFromMonthComponent(t0);
			days += accumulativeDaysFromMonthComponent(time);
		}
		else if(i == 4){ 
			days -= (1.0 * t0.days);
			days += (1.0 * time.days);
		}
		else if(i == 3){ 
			days += ((time.hours - t0.hours) / 24.00);
		}
		else if(i == 2){ 
			days += ((time.minutes - t0.minutes) / 1440.00);
		}
		else if(i == 1){ 
			days += ((time.seconds - t0.seconds) / 86400.00);
		}
		else if(i == 0){
			days += ((time.mss - t0.mss) / 86400000.00);
		}
	}
	return days;
}

function AppObject(token){
  return {
    token:token,

    //for timeline tics or lines
    bars:[],
    barTags:[],
    zoomDex:3, //designates which are the primary lines
    barPositions:[],
    mouseBarOffset:0.0,
    upperBarDex:-1,
    lowerBarDex:-1,
    barBank:[],
    tagBank:[],
    barBankDex:-1,
    tagBankDex:-1,
    pLineDensity:15,//primary line density, lines appearing at shortest intervals
    pLineVisibilityThreshold:10,
    pLineGraduationThreshold:120,
    maxVisibleBars:130,  //will calculate based on tlAreaWidth
    numOffScrnBars:25, //estimate number of bars to precede bgn time
    tagLowerThreshold:18, //tag label is now too small to be visible
    tagUpperThreshold:18, //label is larger enough to be displayed without abbreviation
    tagSizeCode:0,
    barFrame:{},
    labelFrame:{},
    eventFrame:{},
    hrzScrollAlert:false,

    //for timeline items
    eventList:[],
    echelon:[], //group of timeline items in the same band, having same vertical position on a timeline chart
    upperEchelon:-1, //index of highest echelon
    echelonTop:[],
    echelonBottom:[],
    arraySpanDays:0.0, //the precise value of the endBufTime x position minus the smaller time components
    arraySpanPxls:0.0,
    spanInDays:1.0,
    startBufTime:null,
    endBufTime:null,
    forgottenDaysLH:0.0,
    initialEventPxlOffset:0,

    //formatting
    frameLPad:3,
    frameRSide:104,
    barBkgd:"#a0a0b9", //"#aabb66",
    tlAreaHeight:10, 
    tlAreaWidth:106,
    tlContentReductionFactor:0.7,

    //diagnostic
    statusMsg:"",
    lastBarPos:0,

    //higher level
    displayCode:'labels'
  };
}

function EventObject(label,details,bgn,end,color){
  this.bgn = bgn;
  this.end = end;
  this.label = label;
  this.details = details;
  this.relativeLocation = relativeLocation;
  this.color = color;
  this.mapDatetimeToDays = function(t0,mapperFunc){
    this.bgnDays = mapperFunc(t0,this.bgn);
    if(this.end){
      this.endDays = mapperFunc(t0,this.end);
    }
    else{
      this.endDays = this.bgnDays;
    }
  }
  this.computeTerminalLocations = function(di){
    var plotDays = (12 * di.arraySpanDays) / di.arraySpanPxls; //the width of a plot
    var stemDays = (12 * di.arraySpanDays) / di.arraySpanPxls; //the width of a plot
    var lhsWd = this.bgnDays;
    var rhsWd = this.endDays;
    var box = this.itemInfo.getBoundingClientRect();
    var labelWdDays = ((box.width + 2) * di.arraySpanDays) / di.arraySpanPxls; 
    if(di.displayCode !== 'hide_all'){
      rhsWd += labelWdDays + stemDays;
    }
    if(this.bgnDays != this.endDays){
      var dif = Math.abs(plotDays - (this.endDays - this.bgnDays));
      lhsWd -= dif / 2;
      rhsWd += dif / 2;
    }
    else{
      lhsWd -= 7;
    }
    return [lhsWd,rhsWd];
  }
  this.setXPositions = function(spanPxls,spanUnits,adj,di){
    var xpos = (Math.floor((this.bgnDays * spanPxls) / spanUnits) + adj);
    this.item.style.left = xpos + 'px';
    this.itemRhs.style.left = (xpos + 5) + 'px';
    this.borderItem.style.left = (xpos - 3) + 'px';
    if(this.endDays == this.bgnDays){
      this.itemInfo.style.left = (22 + xpos) + 'px';
      this.stem.style.left = (xpos + 8) + 'px';
    }
    else{
      //xpos -= 1;
      var xpos2 = (Math.floor((this.endDays * spanPxls) / spanUnits) + adj);
      this.borderItem.style.width = (xpos2 - xpos + 4) + 'px';
      this.item.style.width = (xpos2 - xpos) + 'px';
      this.itemRhs.style.left = (xpos2 - 3) + 'px'; 
      this.stem.style.left = (xpos2 + 2) + 'px';
      this.itemInfo.style.left = (16 + xpos2) + 'px';
    }
  }
  this.setYPositions = function(pos){
    this.item.style.top = pos + 'px';
    this.itemRhs.style.top = pos + 'px';
    this.borderItem.style.top = (pos - 3) + 'px';
    this.stem.style.top = (pos + 4) + 'px';
    this.itemInfo.style.top = (pos - 5) + 'px';
  }
  this.updateDisplayMode = function(di){
    if(di.displayCode === 'labels'){
      this.stem.style.display = 'block';
      this.itemLabel.style.display = 'block';
      this.itemInfo.style.height = '20px';
      this.itemDetails.style.display = 'none';
    }
    if(di.displayCode === 'details'){
      this.stem.style.display = 'block';
      this.itemLabel.style.display = 'block';
      this.itemInfo.style.height = '35px';
      this.itemDetails.style.display = 'block';
    }
    if(di.displayCode === 'hide_all'){
      this.stem.style.display = 'none';
      this.itemInfo.style.display = 'none';
      this.itemLabel.style.display = 'none';
      this.itemDetails.style.display = 'none';
    } 
  }
  this.item = document.createElement('div');
  this.item.style.position = 'relative';
  this.item.style.height = '10px';
  this.item.style.width = '5px';
  //this.item.style.background = color;
  var imagePath = SharedGlobal.core.getImageDirectoryPath();
  this.item.style.backgroundImage = "url('" + imagePath + "/round-terminal-lhs.png')"; 
  this.item.style.backgroundRepeat = 'no-repeat';
  this.item.style.position = 'absolute';
  this.item.style.zIndex = '55';
  this.item.style.display = 'block';
  this.itemRhs = document.createElement("div");
  this.itemRhs.style.position = 'relative';
  this.itemRhs.style.height = '10px';
  this.itemRhs.style.width = '5px';
  //this.itemRhs.style.background = color;
  var imagePath = SharedGlobal.core.getImageDirectoryPath();
  this.itemRhs.style.backgroundImage = "url('" + imagePath + "/round-terminal-rhs.png')"; 
  this.itemRhs.style.position = 'absolute';
  this.itemRhs.style.zIndex = '55';
  this.itemRhs.style.display = 'block';
  this.borderItem = document.createElement('div');
  this.borderItem.style.position = 'relative';
  this.borderItem.style.height = '12px';
  this.borderItem.style.width = '12px';
  this.borderItem.style.position = 'absolute';
  this.borderItem.style.zIndex = '56';
  this.borderItem.style.display = 'block';
  this.stem = document.createElement('div');
  this.stem.style.position = 'absolute';
  this.stem.style.display = 'block';
  this.stem.style.width = '16px';
  this.stem.style.height = '1px';
  //this.stem.style.backgroundColor = color;
  this.itemInfo = document.createElement('div');
  this.itemInfo.style.position = 'absolute';
  //this.itemInfo.style.color = color; //'#776699';
  this.itemInfo.style.paddingLeft = '4px';
  this.itemInfo.style.paddingRight = '4px';
  this.itemInfo.style.fontFamily = 'Verdana';
  this.itemInfo.style.fontSize = '14px';
  this.itemInfo.style.height = '20px';
  this.itemInfo.style.backgroundColor = 'white';
  //this.itemInfo.style.border = 'thin solid ' + color;
  this.itemInfo.style.zIndex = '998';
  this.itemLabel = document.createElement('div');
  this.itemDetails = document.createElement('div');
  this.itemDetails.style.fontSize = '10px';
  this.labelText = document.createTextNode(label);
  this.detailsText = document.createTextNode(details);
  //this.itemDetails.style.display = 'block';
  this.loadMe = function(di,parent){
    parent.appendChild(this.item);
    parent.appendChild(this.itemRhs);
    parent.appendChild(this.borderItem);
    parent.appendChild(this.stem);
    this.itemLabel.appendChild(this.labelText);
    this.itemDetails.appendChild(this.detailsText);
    this.itemInfo.appendChild(this.itemLabel);
    this.itemInfo.appendChild(this.itemDetails);
    parent.appendChild(this.itemInfo);
    var color = this.color;
    if(color === 'auto'){
      color = StyleWorkbench.nextRandomColorForWhiteBackgroundFromToken(di.token);
    }
    this.item.style.background = color;
    this.item.style.backgroundImage = "url('" + imagePath + "/round-terminal-lhs.png')"; 
    this.itemRhs.style.background = color;
    this.itemRhs.style.backgroundImage = "url('" + imagePath + "/round-terminal-rhs.png')"; 
    this.stem.style.backgroundColor = color;
    this.itemInfo.style.color = color; 
    this.itemInfo.style.border = 'thin solid ' + color;
  }
}

//JSON data may not have all the fields of a datetime object
function getDatetimeFromSparseTime(eT){
	var t = new datetime("",1,0,0,0,0,0,0,"");
	if(eT.yr !== undefined)t.years = eT.yr;
	if(eT.mo !== undefined)t.months = eT.mo - 1;
	if(eT.dy !== undefined)t.days = eT.dy - 1;
	if(eT.hr !== undefined){
		//if meridian is not specified then time taken as military time
		t.hours = eT.hr;
		if(eT.meridian !== undefined && eT.meridian === "pm")t.hours = 12 + eT.hr;
	}
	if(eT.mn !== undefined)t.minutes = eT.mn;
	if(eT.sc !== undefined)t.seconds = eT.sc;
	if(eT.ms !== undefined)t.mss = eT.ms;
	return t;
}

function zoom(w,mouseXPos){
        var di = tempStor[SharedGlobal.core.getPersistentDrawingInstanceToken()];
	var startDex = getBarFromPt(mouseXPos); 
	var n = 0;
	var visible = true;
	var dstr = "block";
	var ldstr = "block";
	var adjustTag = null;
	var d = Math.floor(di.pLineDensity / di.pLineVisibilityThreshold);

	if(w < 0){ //zooming out...squeezing bars together
		d = 0 - d;
		if((di.pLineDensity + d) < di.pLineVisibilityThreshold && di.zoomDex > 5)return;
		if(di.barPositions[di.lowerBarDex] > 0){	
			shiftAndReplaceAttributes(true,di);
			updatePreciseTimelinePositions(di);
			assignXPositionsToEvents(di);
			return;
		}
		else if(di.barPositions[di.upperBarDex] < di.frameRSide){
			shiftAndReplaceAttributes(false,di);
			updatePreciseTimelinePositions(di);
			assignXPositionsToEvents(di);
			return;
		}
	}
	if(di.tagSizeCode == 0){
		if(di.pLineDensity > di.tagLowerThreshold){
			di.tagSizeCode = 1;
			adjustTag = shortLabel;
		}
	}
	else if(di.tagSizeCode == 1){
		if(di.pLineDensity > di.tagUpperThreshold){
			di.tagSizeCode = 2;
			adjustTag = longLabel;
		}
		if(di.pLineDensity < di.tagLowerThreshold){
			di.tagSizeCode = 0;
			adjustTag = noLabel;	
		}
	}
	else if(di.tagSizeCode == 2){
		if(di.pLineDensity < di.tagUpperThreshold){
			di.tagSizeCode = 1;
			adjustTag = shortLabel;
		}
	}

	di.pLineDensity = di.pLineDensity + d;

	if(di.pLineDensity < di.pLineVisibilityThreshold){ //zoom out reached threshold
		if(di.zoomDex < 6){
			demotePrimaryLines(startDex);
			forgetSubZoomTime(di);	
			updatePreciseTimelinePositions(di);
			assignXPositionsToEvents(di);
			return;
		}
	}
	else if(di.pLineDensity > di.pLineGraduationThreshold){ //zoom in reached threshold
		if(di.zoomDex > 0){
			promotePrimaryLines(startDex);
			forgetSubZoomTime(di);	
			updatePreciseTimelinePositions(di);
			assignXPositionsToEvents(di);
			return;
		}
	}

	for(var i = startDex; i <= di.upperBarDex; i++){
		di.barPositions[i] += n;
		if(di.barPositions[i] > di.frameRSide || di.barPositions[i] < di.frameLPad){
			dstr = "none";
			ldstr = "none";
		}
		else {
			dstr = "block";
			ldstr = "block";
		}
		di.bars[i].style.left = di.barPositions[i] + "px";
		di.barTags[i].style.left = di.barPositions[i] - 3 + "px";
		if(di.bars[i].contextTag !== null){
			di.bars[i].contextTag.style.left = di.barPositions[i] + "px";
			di.bars[i].contextTag.style.display = ldstr;
		}
		if(adjustTag !== null)adjustTag(i);
		di.bars[i].style.display = dstr;
		di.barTags[i].style.display = ldstr;
		if(di.bars[i].syncParent !== null)repositionAncestors(di.bars[i].syncParent,di.barPositions[i],dstr);
		n += d;
	}
	n = di.mouseBarOffset;
	for(var i = startDex; i >= di.lowerBarDex; i--){
		di.barPositions[i] += n;
		if(di.barPositions[i] < di.frameLPad || di.barPositions[i] > di.frameRSide){
			dstr = "none";
			ldstr = "none";
		}
		else {
			dstr = "block";
			ldstr = "block";
		}
		di.bars[i].style.left = di.barPositions[i] + "px";
		di.barTags[i].style.left = di.barPositions[i] - 3 + "px";
		if(di.bars[i].contextTag !== null){
			di.bars[i].contextTag.style.left = di.barPositions[i] + "px";
			di.bars[i].contextTag.style.display = ldstr;
		}
		if(adjustTag !== null)adjustTag(i);
		di.bars[i].style.display = dstr;
		di.barTags[i].style.display = ldstr;
		if(di.bars[i].syncParent !== null)repositionAncestors(di.bars[i].syncParent,di.barPositions[i],dstr);
		n -= d;
	}

	if(di.hrzScrollAlert){
		updatePreciseTimelinePositions(di);
		di.hrzScrollAlert = false;
	}
	assignXPositionsToEvents(di);
}

function promotePrimaryLines(pivot,di){ //show smaller time increments
	var origPivotX = pivot;
	for(var i = 0; i < di.upperBarDex; i++){
		if(i == pivot){
			origPivotX = di.barPositions[i];
			break;
		}
		di.startBufTime.advance(di.zoomDex);
	}

	di.zoomDex--;	
	di.pLineDensity = di.pLineVisibilityThreshold;
	setZoomLevelConfiguration(di);

	var i = 0;
	var ob = {};
	var startDex = Math.floor(di.numOffScrnBars + (di.barPositions[pivot] / di.pLineDensity));
	var xpos = di.barPositions[pivot]; //initially xpos is the pivot bar screen location
	var time = new datetime("",1,0,0,0,0,0,0,"");
	di.startBufTime.index = startDex;
	time.setTime(di.startBufTime);
	//move di.startBufTime to new head position and attributes for any syncParents of primary lines
	di.startBufTime.turnback(di.zoomDex);
	xpos -= di.pLineDensity;
	for(i = startDex - 1; xpos > -1; i--){
		//set new time attributes
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "block";
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,di.startBufTime,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = di.startBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.startBufTime,di.zoomDex + 1,xpos,3,"block",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,di.startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= di.pLineDensity;
		di.startBufTime.turnback(di.zoomDex);
	}

	for( ;i >= di.lowerBarDex; i--){
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "none";
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,di.startBufTime,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = di.startBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.startBufTime,di.zoomDex + 1,xpos,3,"none",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,di.startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= di.pLineDensity;
		di.startBufTime.turnback(di.zoomDex);
	}
	di.startBufTime.advance(di.zoomDex);

	//advance from pivot visible with copy of di.startBufTime
	xpos = origPivotX;
	var dstr = "block"; //indicates the CSS "display" attribute value
	for(i = startDex ;i <= di.upperBarDex; i++){
		ob = di.bars[i];
		//set new time attributes
		ob.style.left = xpos + "px";
		if(xpos > di.frameRSide)dstr = "none";//faster to break here and put another loop?
		ob.style.display = dstr;
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,time,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = time.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,time,di.zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,time,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),time,level);
			ob.contextTag.style.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos += di.pLineDensity;
		time.advance(di.zoomDex);	
	}
	di.endBufTime.setTime(time);

//	var stob = document.getElementById("status");
//	stob.innerHTML = di.statusMsg;

}

function demotePrimaryLines(pivot){ //hide smaller time increments
	
	//if no syncParent on pivot, we must designate a new pivot
	while(di.bars[pivot].syncParent === null){
		pivot++;
		if(pivot > di.upperBarDex){
			//this could happen if di.bars to the right of the mouse do not reach a 
			//parent representing a seconds tic... the result would be a sudden
			//visible jerk
			pivot = di.upperBarDex;
			break;
		}
	}

	var origPivotX = 0;
	for(var i = 0; i < di.upperBarDex; i++){
		if(i == pivot){
			//pivot is primary line  bar just to the right of the mouse before any demotion
			origPivotX = di.barPositions[i];
			break;
		}
		di.startBufTime.advance(di.zoomDex);
	}

	di.zoomDex++;	
	di.pLineDensity = Math.floor(maxTimeComponent(di.zoomDex - 1) * di.pLineVisibilityThreshold);
	setZoomLevelConfiguration(di);

	var i = 0;
	var ob = {};
	var startDex = Math.floor(di.numOffScrnBars + (di.barPositions[pivot] / di.pLineGraduationThreshold));
	var xpos = di.barPositions[pivot]; //initially xpos is the pivot bar screen location
	var time = new datetime("",1,0,0,0,0,0,0,"");
	di.startBufTime.index = startDex;
	time.setTime(di.startBufTime);
	//move di.startBufTime to new head position
	di.startBufTime.turnback(di.zoomDex);
	xpos -= di.pLineDensity;
	for(i = startDex - 1; xpos > -1; i--){
		//set new time attributes
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "block";
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,di.startBufTime,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = di.startBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.startBufTime,di.zoomDex + 1,xpos,3,"block",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,di.startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= di.pLineDensity;
		di.startBufTime.turnback(di.zoomDex);
	}

	for( ;i >= di.lowerBarDex; i--){
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "none";
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,di.startBufTime,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = di.startBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.startBufTime,di.zoomDex + 1,xpos,3,"none",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,di.startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= di.pLineDensity;
		di.startBufTime.turnback(di.zoomDex);
	}
	di.startBufTime.advance(di.zoomDex);

	//advance from visible pivot with copy of di.startBufTime
	var dstr = "block"; //indicates the CSS "display" attribute value
	xpos = origPivotX;
	for(i = startDex ;i <= di.upperBarDex; i++){
		ob = di.bars[i];
		//set new time attributes
		ob.style.left = xpos + "px";
		if(xpos > di.frameRSide)dstr = "none";
		ob.style.display = dstr;
		di.barPositions[i] = xpos;
		initBarTag(di.barTags[i],xpos,time,di.zoomDex,di.tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			di.barBankDex++;
			di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = time.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,time,di.zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			var level = di.zoomDex + 1;
			initBarTag(ob.contextTag,xpos,time,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),time,level);
			ob.contextTag.style.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			di.tagBankDex++;
			di.tagBank[di.tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos += di.pLineDensity;
		time.advance(di.zoomDex);	
	}
	di.endBufTime.setTime(time);

//	var stob = document.getElementById("status");
//	stob.innerHTML = di.statusMsg;

}

function shortLabel(i){
	di.barTags[i].innerHTML = di.barTags[i].shortHTML;
}

function longLabel(i){
	di.barTags[i].innerHTML = di.barTags[i].longHTML;
}

function noLabel(i){
	di.barTags[i].innerHTML = "";
}

function getBarFromPt(xpos){
	for(var i = 0; i <= di.upperBarDex; i++){
		if(xpos <= di.barPositions[i]){
			return i;
		}	
	}
}

function shiftAndReplaceAttributes(userRDrag,di){
	shiftBarProperties(di.numOffScrnBars,userRDrag);
	if(userRDrag){
		for(var p = 0; p < di.numOffScrnBars; p++){
			di.endBufTime.turnback(di.zoomDex);
		}
		fixLeftSide();
	}
	else {
		for(var p = 0; p < di.numOffScrnBars; p++){
			di.startBufTime.advance(di.zoomDex);
		}
		fixRightSide();
	}
}

function shiftBarProperties(n,shiftRight){
	if(shiftRight == true){//properties shift to the right, bar array shifts to the left relative to props, user sees no visible movement
		var tgt = di.upperBarDex;
		for(var src = (tgt - n); src > -1; src -= 1){
			di.bars[tgt].style.left = di.bars[src].style.left;
			di.bars[tgt].style.display = di.bars[src].style.display;
			di.bars[tgt].style.background = di.barBkgd;
			di.barPositions[tgt] = di.barPositions[src];
			di.barTags[tgt].style.left = di.barTags[src].style.left;
			di.barTags[tgt].style.display = di.barTags[src].style.display;
			di.barTags[tgt].innerHTML = di.barTags[src].innerHTML;
			di.barTags[tgt].shortHTML = di.barTags[src].shortHTML;
			di.barTags[tgt].longHTML = di.barTags[src].longHTML;
			if(di.bars[tgt].syncParent !== null){
				if(tgt > (di.upperBarDex - n)){ //bank before target gets overwritten	
					showSyncParents(di.bars[tgt].syncParent,false);
					colorSyncParents(di.bars[tgt].syncParent,di.barBkgd);
					di.barBankDex++;
					di.barBank[di.barBankDex] = di.bars[tgt].syncParent;
				}
			}
			if(di.bars[tgt].contextTag !== null){
				di.bars[tgt].contextTag.style.display = "none";
				di.tagBankDex++;
				di.tagBank[di.tagBankDex] = di.bars[tgt].contextTag;
				di.bars[tgt].contextTag = null;
			}
			if(di.bars[src].contextTag !== null){
				if(di.bars[tgt].contextTag === null){
					di.bars[tgt].contextTag = appropriateContextTag(di);
				}
				di.bars[tgt].contextTag.innerHTML = di.bars[src].contextTag.innerHTML;
				di.bars[tgt].contextTag.display = di.bars[src].contextTag.display;
				di.bars[tgt].contextTag.style.left = di.bars[src].contextTag.style.left;
				di.bars[src].contextTag.style.display = "none";
				di.tagBankDex++;
				di.tagBank[di.tagBankDex] = di.bars[src].contextTag;
				di.bars[src].contextTag = null;
			}
			di.bars[tgt].syncParent = di.bars[src].syncParent;
			di.bars[src].syncParent = null;
			tgt -= 1;
		} 
	}
	else {
		var tgt = 0;
		for(var src = n;src <= di.upperBarDex;src += 1){
			di.bars[tgt].style.left = di.bars[src].style.left;
			di.bars[tgt].style.display = di.bars[src].style.display;
			di.bars[tgt].style.background = di.barBkgd;
			di.barPositions[tgt] = di.barPositions[src];
			di.barTags[tgt].style.left = di.barTags[src].style.left;
			di.barTags[tgt].style.display = di.barTags[src].style.display;
			di.barTags[tgt].innerHTML = di.barTags[src].innerHTML;
			di.barTags[tgt].longHTML = di.barTags[src].longHTML;
			di.barTags[tgt].shortHTML = di.barTags[src].shortHTML;
			if(di.bars[tgt].syncParent !== null){
				if(tgt <  n){ //bank before target gets overwritten	
					showSyncParents(di.bars[tgt].syncParent,false);
					colorSyncParents(di.bars[tgt].syncParent,di.barBkgd);
					di.barBankDex++;
					di.barBank[di.barBankDex] = di.bars[tgt].syncParent;
				}
			}
			if(di.bars[tgt].contextTag !== null){
				di.bars[tgt].contextTag.style.display = "none";
				di.tagBankDex++;
				di.tagBank[di.tagBankDex] = di.bars[tgt].contextTag;
				di.bars[tgt].contextTag = null;
			}
			if(di.bars[src].contextTag !== null){
				if(di.bars[tgt].contextTag === null){
					di.bars[tgt].contextTag = appropriateContextTag(di);
				}
				di.bars[tgt].contextTag.innerHTML = di.bars[src].contextTag.innerHTML;
				di.bars[tgt].contextTag.display = di.bars[src].contextTag.display;
				di.bars[tgt].contextTag.style.left = di.bars[src].contextTag.style.left;
				di.bars[src].contextTag.style.display = "none";
				di.tagBankDex++;
				di.tagBank[di.tagBankDex] = di.bars[src].contextTag;
				di.bars[src].contextTag = null;
			}
			di.bars[tgt].syncParent = di.bars[src].syncParent;
			di.bars[src].syncParent = null;
			tgt += 1;
		}
	}
}

function colorSyncParents(parent,color){
	if(parent === null)return;
	parent.style.background = color;
	if(parent.syncParent !== null)colorSyncParents(parent.syncParent,color);
}

function showSyncParents(parent,show){
	if(parent === null)return;
	if(show){
		parent.style.display = "block";
		if(parent.contextTag !== null){
			parent.contextTag.style.display = "block";
		}
	}
	else {
		parent.style.display = "none";
		if(parent.contextTag !== null){
			parent.contextTag.style.display = "none";
		}
	}
	if(parent.syncParent !== null)showSyncParents(parent.syncParent,show);
}

function repositionAncestors(bar,xpos,barDisplayStr){
	if(bar === undefined)return;
	bar.style.left = xpos + "px";
	bar.style.display = barDisplayStr;
	if(bar.syncParent !== null)repositionAncestors(bar.syncParent,xpos,barDisplayStr);
}

function fixLeftSide(di){ //fix bars on left side		
	var ob = {};
	var tag = {};
	var head = di.lowerBarDex;
	var curDex = head + (di.numOffScrnBars - 1);
	var xpos = di.barPositions[head]; 
	var dstr = "block"; //indicates the CSS "display" attribute value
	di.startBufTime.turnback(di.zoomDex);
	for(var i = curDex; i >= head; i--){
		if(di.zoomDex == 100)xpos -=  monthPixelsFromPLineDensity(di,di.startBufTime.getComponent(5));
		else xpos -= di.pLineDensity; 
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.background = di.barBkgd; 
		tag = di.barTags[i];
		tag.style.left = (xpos - 3) + "px";
		initBarTag(tag,xpos,di.startBufTime,di.zoomDex,di.tagSizeCode);
		if(xpos < di.frameLPad)dstr = "none";
		ob.style.display = dstr; 
		tag.style.display = dstr; 
		di.barPositions[i] = xpos;
		var c = di.startBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.startBufTime,di.zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.startBufTime,di.zoomDex + 1);
			ob.contextTag.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		di.startBufTime.turnback(di.zoomDex);
	}
	di.startBufTime.advance(di.zoomDex); 
}

function fixRightSide(){ //fix bars on right side
	var ob = {};
	var tag = {};
	var tail = di.upperBarDex;
	var curDex = tail - (di.numOffScrnBars - 1);
	var xpos = di.barPositions[tail];
	var dstr = "block"; 
	for(var i = curDex; i <= tail; i++){
		if(di.zoomDex == 100)xpos +=  monthPixelsFromPLineDensity(di.endBufTime.getComponent(5));
		else xpos += di.pLineDensity; 
		ob = di.bars[i];
		ob.style.left = xpos + "px";
		ob.style.background = di.barBkgd; 
		tag = di.barTags[i];
		tag.style.left = (xpos - 3) + "px";
		initBarTag(tag,xpos,di.endBufTime,di.zoomDex,di.tagSizeCode);
		if(xpos < di.frameLPad)dstr = "none";	
		else dstr = "block";
		ob.style.display = dstr;
		if(xpos > (di.frameRSide - 20))tag.style.display = "none";
		else tag.style.display = "block";
		di.barPositions[i] = xpos;
		var c = di.endBufTime.getComponent(di.zoomDex);
		if(c == 0 || (di.zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(di,di.endBufTime,di.zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag(di);
			}
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),di.endBufTime,di.zoomDex + 1);
			ob.contextTag.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		di.endBufTime.advance(di.zoomDex);
	} 
}

function createAndInitializeBarsAndTags(di){ 
	//bgn,end are visible on screen times
	var counter = new datetime("",1,0,0,0,0,0,0,"");
	counter.setTime(di.startBufTime);

	var offset = di.initialEventPxlOffset;//to center the displayed content

	//initialize indices
	di.upperBarDex = di.numOffScrnBars - 1;
	di.lowerBarDex = di.numOffScrnBars;

	//decrement di.startBufTime to get to initial time of memory array
	di.startBufTime.index = di.numOffScrnBars;	
	for(var i = (di.numOffScrnBars - 1); i > -1; i--){
		di.startBufTime.turnback(di.zoomDex);
		if(di.zoomDex == 5)offset -= monthPixelsFromPLineDensity(di,di.startBufTime.getComponent(5));
		else offset -= di.pLineDensity; 
		createAndInitializeBarsAndTagsHelper(di,di.startBufTime,di.zoomDex,offset,1,false);
	} 

	//allocate bar objects from start of displayed time to end of array, but leave x elements for later
	offset = di.initialEventPxlOffset; 
	var lastBarIndex = di.maxVisibleBars + (2 * di.numOffScrnBars) - 1;
        counter.index = di.numOffScrnBars;
	for(var i = di.numOffScrnBars; i < lastBarIndex; i++){ 
		createAndInitializeBarsAndTagsHelper(di,counter,di.zoomDex,offset,1,true);
		if(di.zoomDex == 5)offset += monthPixelsFromPLineDensity(di,counter.getComponent(5));
		else offset += di.pLineDensity;
		counter.advance(di.zoomDex);
	}
	di.endBufTime.setTime(counter);

	if(checkTimeSync(di) == false){
		//alert("There was a problem with timeline computation accuracy in createAndSetHorizontalPosforTimeline function.");
		console.log("There was a problem with timeline computation accuracy in createAndSetHorizontalPosforTimeline function.");
	}
}

function createAndInitializeBarsAndTagsHelper(di,t,level,xpos,w,allocateRight){
	var dex = 0; 
	if(allocateRight == true){
		di.upperBarDex = di.upperBarDex + 1;
		dex = di.upperBarDex;
	}
	else {
		di.lowerBarDex = di.lowerBarDex - 1;
		dex = di.lowerBarDex;
		if(dex < 0){
			alert("invalid lower index, L001");
			return;
		}
	}
	var dstr = "block";
	if(xpos < di.frameLPad || xpos > di.frameRSide){
		dstr = "none";
	}
	var ob = createBar(di,xpos,w,dstr,null);
	var tag = createBarTag(w,dstr,0);
	initBarTag(tag,xpos,t,level,di.tagSizeCode);
	di.bars[dex] = ob;
	di.barPositions[dex] = xpos;
	di.barTags[dex] = tag;
	var c = t.getComponent(level);
	if(c == 0 || (level == 6 && ((c % 10) == 0))){
		level += 1;
		appropriateAndPositionSynchronizedLines(di,t,level,xpos,w + 2,dstr,ob);
		ob.contextTag = appropriateContextTag(di,'delay_load');
		ob.contextTag.style.display = dstr;
		initBarTag(ob.contextTag,xpos,t,level,2);
		//ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),t,level);
	}
}

function appropriateAndPositionSynchronizedLines(di,time,level,xpos,w,cssDisplayStr,child){
	var ob = child.syncParent;
	if(ob === null){
		if(di.barBankDex > -1){
			ob = di.barBank[di.barBankDex];
			if(ob.syncParent == null)di.barBankDex--; 
			else di.barBank[di.barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		else {
			xpos = Math.floor(xpos);
			ob = createBar(di,xpos,w,cssDisplayStr,null);
			ob.style.background = di.barBkgd; 
			//ob.style.background = barColors[Math.floor(Math.random() * 10)]; //di.barBkgd; 
			//di.barFrame.appendChild(ob);
		}
	}
	ob.style.display = cssDisplayStr;
	ob.style.width = w + "px";
	ob.style.left = xpos + "px";
	child.syncParent = ob;
	if(level > 8){
		return;
	}
	var c = time.getComponent(level);
	if(c == 0 || (level == 6 && ((c % 10) == 0))){
		level += 1;
		appropriateAndPositionSynchronizedLines(di,time,level,xpos,w + 1,cssDisplayStr,ob);
	}
}

function initBarTag(tag,xpos,time,level,tagSize){
	if(tag === null)return;
	tag.style.left = (xpos - 3) + "px";
	tag.style.width = "30px";
	tag.longHTML = time.getComponentLabel(level);
	tag.shortHTML = time.getComponentShortLabel(level); 
	if(tagSize == 2)tag.innerHTML = tag.longHTML;
	else if(tagSize == 1)tag.innerHTML = tag.shortHTML;
	else tag.innerHTML = "";
}
	
function collectContext(num,time,level){
	var c = "";
	if(level < 4){	
		if(level == 1)c = time.seconds;
		if(level == 2)c = time.minutes;
		if(level == 3)c = time.hours;
		if(c < 10)c = "0" + c;
		c = collectContext(num - 1,time,level + 1) + c + ":";
	}
	if(level == 4){
		//if not on month boundary, include month anyway
		c = time.getComponentShortLabel(5) + " " + (time.days + 1);
		if(num > 1)c = c + ", " + time.years;
		c += " ";
	}
	if(level == 5){
		c = time.getComponentLabel(5) + " ";
		if(num > 0)c = c + time.years + " ";
	}
	if(level == 6){
		c = time.years + " ";
	}
	return c;
}

function appropriateContextTag(di,loadCd){
	var tag = null;
	if(di.tagBankDex > -1){
		tag = di.tagBank[di.tagBankDex];
		di.tagBank[di.tagBankDex] = null;
		di.tagBankDex--;
	}
	else {
		tag = createBarTag(2,"block",10);
		tag.className = "ctag";
		if(typeof loadCd === 'undefined' || loadCd !== 'delay_load'){
			di.labelFrame.appendChild(tag);
		}
	}
	return tag;
}

function createBar(di,xpos,w,displayStr,parent){
	var ob = document.createElement("div");
	ob.style.top = "5px";
	ob.style.height = di.tlAreaHeight + "px";
	ob.style.width = w + "px";
	var ctrBump = Math.floor(w / 2);
	ob.style.left = (xpos - ctrBump) + "px";
	ob.style.padding = "0px";
	ob.style.margin = "0px";
	ob.style.display = displayStr;
	ob.style.background = di.barBkgd;
	ob.style.position = "absolute";
	ob.style.zIndex = "49";
	ob.contextTag = null;
	ob.syncParent = parent;
	ob.syncChild = null;
	return ob;
}

function createBarTag(w,displayStr,pxlBump){
	var tag = document.createElement("div");
	tag.style.top = (12 - pxlBump) + "px";
	tag.style.height = "15px";
	tag.style.width = "15px";
	tag.style.padding = "0px";
	tag.style.margin = "0px";
	tag.style.display = displayStr;
	tag.style.color = "white";
	tag.style.fontSize = "10px";
	tag.style.position = "absolute";
	tag.style.zIndex = "52";
	return tag;
}

function determineDivergentLevel(bgn,end){
	var level = 6;
	while(level > 0){
		if(bgn.getComponent(level) != end.getComponent(level))break;
		level -= 1;
	}	
	return level;
}

function setZoomLevelConfiguration(di){
	di.tagLowerThreshold = 12;
	di.tagUpperThreshold = 18;
	if(di.zoomDex == 6){
		di.tagLowerThreshold = 15;
		di.tagUpperThreshold = 25; 
		di.tagSizeCode = 0;
	}
	if(di.zoomDex == 5){
		di.tagLowerThreshold = 15;
		di.tagUpperThreshold = 50;
	}
	if(di.zoomDex == 3){ //hours need space
		di.tagLowerThreshold = 11;
		di.tagUpperThreshold = 25;
	}
	if(di.zoomDex == 0){
		di.tagLowerThreshold = 15;
		di.tagUpperThreshold = 25;
	}
	di.tagSizeCode = 1;
	if(di.pLineDensity < di.tagLowerThreshold)di.tagSizeCode = 0;
	if(di.pLineDensity >= di.tagUpperThreshold)di.tagSizeCode = 2;
	di.pLineGraduationThreshold = Math.floor(maxTimeComponent(di.zoomDex - 1) * di.pLineVisibilityThreshold);
}

function forgetSubZoomTime(di){
	if(di.zoomDex < 1)return;
	di.startBufTime.mss = 0;
	di.endBufTime.mss = 0;
	if(di.zoomDex < 2)return;
	di.startBufTime.seconds = 0;
	di.endBufTime.seconds = 0;
	if(di.zoomDex < 3)return;
	di.startBufTime.minutes = 0;
	di.endBufTime.minutes = 0;
	if(di.zoomDex < 4)return;
	di.startBufTime.hours = 0;
	di.endBufTime.hours = 0;
	if(di.zoomDex < 5)return;
	di.startBufTime.days = 0;
	di.endBufTime.days = 0;
	if(di.zoomDex < 6)return;
	di.startBufTime.months = 0;
	di.endBufTime.months = 0;
	if(di.zoomDex < 7)return;
	di.startBufTime.years = di.startBufTime.years - (di.startBufTime.years % 10);
	di.endBufTime.years = di.endBufTime.years - (di.endBufTime.years % 10);
        if(di.zoomDex < 8)return;
	di.startBufTime.years = di.startBufTime.years - (di.startBufTime.years % 100);
	di.endBufTime.years = di.endBufTime.years - (di.endBufTime.years % 100);
	if(di.zoomDex < 9)return;
	di.startBufTime.years = di.startBufTime.years - (di.startBufTime.years % 1000);
	di.endBufTime.years = di.endBufTime.years - (di.endBufTime.years % 1000);
	if(di.zoomDex < 10)return;
	di.startBufTime.years = di.startBufTime.years - (di.startBufTime.years % 10000);
	di.endBufTime.years = di.endBufTime.years - (di.endBufTime.years % 10000);
}

function forgetThisSubZoomTime(di,t){
	if(di.zoomDex < 1)return;
	t.mss = 0;
	if(di.zoomDex < 2)return;
	t.seconds = 0;
	if(di.zoomDex < 3)return;
	t.minutes = 0;
	if(di.zoomDex < 4)return;
	t.hours = 0;
	if(di.zoomDex < 5)return;
	t.days = 0;
	if(di.zoomDex < 6)return;
	t.months = 0;
	if(di.zoomDex < 7)return;
	t.years = t.years - (t.years % 10);
        if(di.zoomDex < 8)return;
	t.years = t.years - (t.years % 100);
	if(di.zoomDex < 9)return;
	t.years = t.years - (t.years % 1000);
	if(di.zoomDex < 10)return;
	t.years = t.years - (t.years % 10000);
}


function depth(node){
	var d = 1;
	if(node.syncParent !== null)d += depth(node.syncParent);
	return d;
}

function monthPixelsFromPLineDensity(di,month){
	var bumps = Math.floor(di.pLineDensity / 15);
	var pixels = di.pLineDensity + Math.floor(bumps / 2);
	if(month == 1)pixels = di.pLineDensity - bumps;
	if(month == 3 || month == 5 || month == 8 || month == 10)pixels = di.pLineDensity;
	return pixels;
}

function generateBarTagFromPivot(pivot){
	var t = new datetime("",1,0,0,0,0,0,0,"");
	t.setTime(di.startBufTime);
	while(t.index != pivot){
		t.advance(di.zoomDex);
	}
}

function getDateFromXPos(pos){
	var t = new datetime("",1,0,0,0,0,0,0,"");	
	t.setTime(di.startBufTime);
	var index = 0;
	for(var i = 0; i < di.upperBarDex; i++){
		if(pos < di.barPositions[i]){
			return t.getTimeString();
		}
		t.advance(di.zoomDex);
		index++;
	}
	return t.getTimeString();
}

function checkTimeSync(di){
	var inSync = true;
	//perform two way check, increment across entire bar array in both directions

	var time = new datetime("",1,0,0,0,0,0,0,"");
	time.setTime(di.startBufTime);
	while(time.index != di.endBufTime.index){
		time.advance(di.zoomDex);
	}
	if(equals(time,di.endBufTime) == false)return false;

	while(time.index != di.startBufTime.index){
		time.turnback(di.zoomDex);
	}
	if(equals(time,di.startBufTime) == false)return false;

	return inSync;
}

function createDatetime(){
  return new datetime("",1,0,0,0,0,0,0,"");
}

function datetime(e,y,mo,d,h,mi,s,ms,zn){
	this.era = e;
	this.years = y;
	this.months = mo;
	this.days = d;
	this.hours = h;
	this.minutes = mi;
	this.seconds = s;
	this.mss = ms;
	this.zone = zn;
	this.getComponent = getTimeComponent;
	this.setTime = setTime;
	this.advance = advance;
	this.turnback = turnback;
	this.adv = adv;
	this.tbk = tbk;
	this.getComponentLabel = getComponentLabel;
	this.getComponentShortLabel = getComponentShortLabel;
	this.getTimeString = getTimeString;
	this.maxDays = computeMaxDays(this);
        this.toString = convertDatetimeToString;
	this.index = -1;
        this.mask = 'datetime';
}

function convertDatetimeToString(){
  var s = "";
  var mask = 'datetime';
  var e = "";
  var z = "";
  if(this.days > -1 || this.months > -1 || this.years > 0){
    var yrs = this.years;
    if(yrs < 0){
      yrs = yrs * -1;
      e = " b.c";
    }
    s += Number(this.months).toString() + "-" + Number(this.days + 1).toString() + "-" + Number(this.years).toString();
    if(this.zone !== ""){
      z = " " + this.zone;
    }
  }
  if(this.hours != 0 || this.minutes != 0 || this.seconds != 0 || this.mss != 0){
    if(s !== ""){
      s += " ";
    }
    s += this.hours + ":" + this.minutes + ":" + this.seconds + ":" + this.mss;
  }
  return s + z + e;
}

function getTimeString(){
	return this.years + '/' + (this.months + 1) + '/' + (this.days + 1) + ' ' + this.hours + ':' + this.minutes + ':' + this.seconds + '.' + this.mss + ' ' + this.zone;
}

function getTimeComponent(l){
	if(l > 3){
		if(l > 5){
			if(l > 7){
				if(l > 9){
					if(l > 10)return this.years / 100000;
					else return this.years / 10000;
				}
				else{
					if(l > 8)return this.years / 1000;
					else return this.years / 100
				}
			}
			else{
				if(l > 6)return this.years / 10;
				else return this.years;
			}
		}
		else{
			if(l > 4)return this.months;
			else return this.days;
		}
	}
	else{
		if(l > 1){
			if(l > 2)return this.hours;
			else return this.minutes;
		}
		else{
			if(l > 0)return this.seconds;
			else return this.mss;
		}
	}
}

function setTime(t){
	this.era = t.era;
	this.years = t.years;
	this.months = t.months;
	this.days = t.days;
	this.hours = t.hours;
	this.minutes = t.minutes;
	this.seconds = t.seconds;
	this.mss = t.mss;
	this.zone = t.zone;
	this.maxDays = t.maxDays;
	this.index = t.index;
}

function setTimeFromSparseDatetime(t){
        var tout = {};
	if(t.era !== undefined)tout.era = t.era;
	else tout.era = "";
	if(t.yr !== undefined)tout.years = t.yr;
	else tout.years = 0;
	if(t.mo !== undefined)tout.months = t.mo - 1;
	else tout.months = 0;
	if(t.dy !== undefined)tout.days = t.dy - 1;
	else tout.days = 0;
	if(t.hr !== undefined)tout.hours = t.hr;
	else tout.hours = 0;
	if(t.mn !== undefined)tout.minutes = t.mn;
	else tout.minutes = 0;
	if(t.sc !== undefined)tout.seconds = t.sc;
	else tout.seconds = 0;
	if(t.ms !== undefined)tout.mss = t.ms;
	else tout.mss = 0;
	if(t.zn !== undefined)tout.zone = t.zn;
	else tout.zone = "";
	tout.maxDays = computeMaxDays(this);
	tout.index = 0;
        return tout;
}

function extractDatetimeValuesFromString(dtString){ //expected format is M-dd-yyyy hh:mm:ss:S z era
	var t = createDatetime();
        var partArr = dtString.split(' ');
	var dtArr = partArr[0].split('-');
	t.months = Number(dtArr[0]) - 1;
	t.days = Number(dtArr[1]) - 1;
	t.years = Number(dtArr[2]);
	t.maxDays = computeMaxDays(this);
	if(partArr.length < 2){
		return t;
	}
        var tArr = partArr[1].split(':');
	t.hours = Number(tArr[0]);
	t.minutes = Number(tArr[1]);
	t.seconds = Number(tArr[2]);
	t.mss = Number(tArr[3]);
	if(partArr.length < 3){
		return t;
	}
	t.zn = partArr[2];
	if(partArr.length < 4){
		return t;
	}
	t.era = partArr[3];
        return t;
}

function isSparseDatetime(t){
	if(t === undefined)return false;
	if(t === null)return false;
	//if(t.era === undefined)return false;
	//if(t.era === null)return false;
	//if(t.era !== "ad" && t.era !== "bc")return false;
	return true;
}

function advance(l){
	this.index++;
	this.adv(l);
}

function adv(l){
        if(l > 3){
                if(l > 5){
			if(l > 7){
				if(l > 9){
					if(l > 11){
						this.years += 1000000;
						if(this.years > -1 && this.years < 1000000)this.years += 1;
					}
					else{
						if(l > 10){
							this.years += 100000;
							if(this.years > -1 && this.years < 100000)this.years += 1;
						}
						else{
							this.years += 10000;
							if(this.years > -1 && this.years < 10000)this.years += 1;
						}
					}
				}
				else{
					if(l > 8){
						this.years += 1000;
						if(this.years > -1 && this.years < 1000)this.years += 1;
					}
					else{
						this.years += 100;
						if(this.years > -1 && this.years < 100)this.years += 1;	
					}
				}
			}
			else{
				if(l > 6){
					this.years += 10;
					if(this.years < 10)this.years += 1;
				}
				else{
					this.years += 1;
					if(this.years == 0)this.years += 1; //Julian calendar had no year 'zero', Romans had no number for zero 
				}
				if(this.days > 26)this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
			}
		}
                else {
			if(l > 4){
				this.months += 1;
				if(this.months > 11){
					this.months = 0;
					this.adv(l + 1);
					this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
				}
			}
			else {
				this.days += 1;
				if(this.days > this.maxDays){
					this.adv(l + 1);
					this.maxDays = computeMaxDays(this);
					this.days = 0;
				}
			}
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				this.hours += 1;
				if(this.hours > 23){
					this.hours = 0;
					this.adv(l + 1);
				}
			}
                        else {
				this.minutes += 1;
				if(this.minutes > 59){
					this.minutes = 0;
					this.adv(l + 1);
				}
			}
                }
                else {
                        if(l > 0){
				this.seconds += 1;
				if(this.seconds > 59){
					this.seconds = 0;
					this.adv(l + 1);
				}
			}
                        else {
				this.mss += 1;
				if(this.mss > 999){
					this.mss = 0;
					this.adv(l + 1);
				}
			}
                }
        }
}

function turnback(l){
	this.index--;
	this.tbk(l);
}

function tbk(l){
        if(l > 3){
                if(l > 5){
			if(l > 7){
				if(l > 9){
					if(l > 11){
						this.years -= 1000000;
						if(this.years < 1 && this.years > -1000000)this.years -= 1;
					}
					else{
						if(l > 10){
							this.years -= 100000;
							if(this.years < 1 && this.years > -100000)this.years -= 1;
						}
						else{
							this.years -= 10000;
							if(this.years < 1 && this.years > -10000)this.years -= 1;
						}
					}
				}
				else{
					if(l > 8){
						this.years -= 1000;
						if(this.years < 1 && this.years > -1000)this.years -= 1;
					}
					else{
						this.years -= 100;
						if(this.years < 1 && this.years > -100)this.years -= 1;
					}
				}
			}
			else{
				if(l > 6){
					this.years -= 10;
					if(this.years < 1 && this.years > -10)this.years -= 1;
				}
				else{
					this.years -= 1;
					if(this.years == 0)this.years -= 1; //Julian calendar had no year 'zero', Romans had no number for zero 
					if(this.days > 26)this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
				}
			}
		}
                else {
			if(l > 4){
				this.months -= 1;
				if(this.months < 0){
					this.months = 11;
					this.tbk(l + 1);
					this.maxDays = computeMaxDays(this); //adjusts this.days if exceeds max
				}
			}
			else {
				this.days -= 1;
				if(this.days < 0){
					this.tbk(l + 1);
					this.maxDays = computeMaxDays(this);
					this.days = this.maxDays;
				}
			}
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				this.hours -= 1;
				if(this.hours < 0){
					this.hours = 23;
					this.tbk(l + 1);
				}
			}
                        else {
				this.minutes -= 1;
				if(this.minutes < 0){
					this.minutes = 59;
					this.tbk(l + 1);
				}
			}
                }
                else {
                        if(l > 0){
				this.seconds -= 1;
				if(this.seconds < 0){
					this.seconds = 59;
					this.tbk(l + 1);
				}
			}
                        else {
				this.mss -= 1;
				if(this.mss < 0){
					this.mss = 999;
					this.tbk(l + 1);
				}
			}
                }
        }
}

function advanceFractionalDay(time,offset,accuracy){
	var days = Math.floor(offset);
	var level = 4;
	for(var i = accuracy; i > 0; i--){		
		for(var j = 0; j < days; j++){
			time.advance(level);
		}	
		offset = offset - (days * dayFractions[level]);
		level--;
		if(level < 0)break;
		days = Math.floor(offset / dayFractions[level]);
	}
}

function turnbackFractionalDay(time,offset,accuracy){
	var days = Math.floor(offset);
	var level = 4;
	for(var i = accuracy; i > 0; i--){		
		for(var j = 0; j < days; j++){
			time.turnback(level);
		}
		offset = offset - (days * dayFractions[level]);
		level--;
		if(level < 0)break;
		days = Math.floor(offset / dayFractions[level]);
	}
}

function getComponentLabel(l){
	if(l > 3){
		if(l > 5){
			if(l > 7){
				if(l > 9){
					if(l > 10){
						return this.years;
					}
					else{
						return this.years;	
					}
				}
				else{
					if(l > 8){
						return this.years;
					}
					else{
						var ys = this.years;
						if(ys < 0){
							ys = ys * -1;
						}
						var arr = Number(ys + 100).toString().split('');
						arr.splice(arr.length - 1,1);
						arr.splice(arr.length - 1,1);
						var d1 = 0;
						if(arr.length > 1)d1 = arr[arr.length - 2];
						return arr.join('') + getNumberSuffixFromFinalDigits(d1,arr[arr.length - 1]) + ' c.';
					}
				}
			}
			else{
				if(l > 6){
					return this.years + "'s";
				}
				else{
					return this.years;
				}
			}
		}
		else {
			if(l > 4){
				if(this.months == 0)return "January";
				if(this.months == 1)return "February";
				if(this.months == 2)return "March";
				if(this.months == 3)return "April";
				if(this.months == 4)return "May";
				if(this.months == 5)return "June";
				if(this.months == 6)return "July";
				if(this.months == 7)return "August";
				if(this.months == 8)return "September";
				if(this.months == 9)return "October";
				if(this.months == 10)return "November";
				if(this.months == 11)return "December";
			}
			else return this.days + 1;
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				if(this.hours > 11){
					if(this.hours == 12)return "12 pm";
					return (this.hours - 12) + " pm";
				}
				else {
					if(this.hours == 0)return "12 am";
					return this.hours + " am";
				}
			}
                        else {
				if(this.minutes < 10)return ":0" + this.minutes;
				return ":" + this.minutes;
			}
                }
                else {
                        if(l > 0){
				if(this.seconds < 10)return ":0" + this.seconds + ":";
				return ":" + this.seconds + ":";
			}
                        else {
				if(this.mss < 10)return ":00" + this.mss;
				if(this.mss < 100)return ":0" + this.mss;
				return ":" + this.mss;
			}
                }
        }
	return "";
}

function getComponentShortLabel(l){
	if(l > 3){
		if(l > 5){
			if(l < 7){
				var num = this.years % 100;
				if(num < 10)num = "'0" + num;
				else num = "'" + num;
				return num;
			}
		}
		else {
			if(l > 4){
				if(this.months == 0)return "Jan";
				if(this.months == 1)return "Feb";
				if(this.months == 2)return "Mar";
				if(this.months == 3)return "Apr";
				if(this.months == 4)return "May";
				if(this.months == 5)return "Jun";
				if(this.months == 6)return "Jul";
				if(this.months == 7)return "Aug";
				if(this.months == 8)return "Sep";
				if(this.months == 9)return "Oct";
				if(this.months == 10)return "Nov";
				if(this.months == 11)return "Dec";
			}
			else return this.days + 1;
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				if(this.hours > 11){
					if(this.hours == 12)return 12;
					return (this.hours - 12);
				}
				else {
					if(this.hours == 0)return 12;
					return this.hours;
				}
			}
                        else {
				if(this.minutes < 10)return ":0" + this.minutes;
				return ":" + this.minutes ;
			}
                }
                else {
                        if(l > 0){
				if(this.seconds < 10)return ":0" + this.seconds + ":";
				return ":" + this.seconds + ":";
			}
                        else {
				if(this.mss < 10)return "00" + this.mss;
				if(this.mss < 100)return "0" + this.mss;
				return this.mss;
			}
                }
        }
	return "";
}

function getNumberSuffixFromFinalDigits(d,d2){
  if(d == 1)return 'th';
  if(d2 > 3)return 'th';
  if(d2 == 1)return 'st';
  if(d2 == 2)return 'nd';
  if(d2 == 3)return 'rd';
  return 'th';
}

function maxTimeComponent(l){
	if(l > 5){
		if(l > 9){
			return 100000000;
		}
		else{
			return 10;
		}
        }
        else {
                if(l > 2){
                        if(l > 4){
				return 12;
			}
                        else {
				if(l > 3){
					return 30;
				}
				else{
					return 24;
				}
			}
                }
                else {
                        if(l > 1){
				return 60;
			}
                        else {
				if(l > 0){
					return 60;
				}
				else{
					return 1000;
				}
			}
                }
        }
}

function getSignificantComponentLevel(t){
  for(var i=6; i>0; i--){
    if(t.getComponent(i) != 0){
      return i;
    }
  }
  return 1;
}

function computeMaxDays(t){
	//February requires leap year calculation
	//for now:
	t.maxDays = 30;
	if(t.months == 3 || t.months == 5 || t.months == 8 || t.months == 10)t.maxDays = 29;
	if(t.months == 1){
		if(isLeapYear(t))t.maxDays = 28;
		else t.maxDays = 27;
	}
	if(t.days > t.maxDays)t.days = t.maxDays;	
	return t.maxDays;	
}

function accumulativeDaysFromMonthComponent(time){
	var m = 0;
	if(time.months !== undefined)m = time.months;
	else m = time.mo;
	if(m === NaN || m > 11 || m < 0){
		alert("accumulativeDaysFromMonthComponent() has invalid input value. Month component values are zero-based");
		return 0;
	} 
	if(m > 1 && isLeapYear())return daysReached[m] + 1;
	else return daysReached[m];
}

function isLeapYear(y){
	return false;
}

/*
function isLeapYear(y){
	if((y % 4) == 0){
		if((y % 100) == 0){
			if((y % 1000) == 0)return true;
			return false;
		}
		else return true;
	}
	else return false;
}
*/

function abbreviateYear(num){
	num = num % 100;
	if(num < 10)num = "'0" + num;
	else num = "'" + num;
	return num;
}

function equals(t1,t2){
	if(t1 === undefined || t1 === null)return false;
	if(t2 === undefined || t2 === null)return false;
	if(t1.years != t2.years)return false;
	if(t1.months != t2.months)return false;
	if(t1.days != t2.days)return false;
	if(t1.hours != t2.hours)return false;
	if(t1.seconds != t2.seconds)return false;
	if(t1.mss != t2.mss)return false;
	return true;
}

function timelineInit(di){
	//timelineData = [{"groupName":"/IBM/WebSphere/AppServer/profiles/appsrv01/SystemOut.log","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]},{"groupName":"/IBM/WebSphere/AppServer/profiles/appsrv01/SystemErr.log","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]},{"groupName":"/IBM/WebSphere/AppServer/profiles/appsrv02/SystemOut.log","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]}];
	//timelineData = [{"groupName":"default","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]},{"groupName":"/IBM/WebSphere/AppServer/profiles/appsrv01/SystemErr.log","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]},{"groupName":"/IBM/WebSphere/AppServer/profiles/appsrv02/SystemOut.log","subGrps":[{"id":1,"items":[{"bgn":{"yr":1962,"mo":6},"pos":12345},{"bgn":{"yr":1963,"mo":5},"end":{"yr":1963,"mo":6},"pos":54321}]},{"id":2,"items":[{"bgn":{"yr":1965,"mo":9},"pos":33333}]}]}];
	//timelineData = {"labs":["default"],"c":[{"c":[{"labs":["Labor was 24 hours, birth was by c-section"],"c":[null],"d":{"bgn":{"yr":1992,"mo":11,"dy":10}}}],"labs":["Megan Christine born"]}]};
	//timelineData = {"d":{"timeline_structure":"group_list"}};
	//timelineData = {"d":{"timeline_structure":"layered_groups"}};
	//timelineData = {"labs":["Megan's birthday"],"c":[{"bgn":{"yr":1992,"mo":11,"dy":10}}]}; 
	//timelineData = {"labs":["Megan's birthday","Nicole's birthday","Anna's birthday","Benjamin's birthday","Julia's birthday","Levi's birthday"],"c":[{"bgn":{"yr":1992,"mo":11,"dy":10}},{"bgn":{"yr":1994,"mo":10,"dy":23}},{"bgn":{"yr":1996,"mo":3,"dy":20}},{"bgn":{"yr":1998,"mo":3,"dy":27}},{"bgn":{"yr":2000,"mo":7,"dy":7}},{"bgn":{"yr":2002,"mo":7,"dy":25}}]};
	//sample data: allows other views to display label and details, ignoring what is needed only by the timeline. It's called 'eating your own dogfood' 
	//timelineData = {"labs":["Megan's birthday","Nicole's birthday","Anna's birthday","Benjamin's birthday","Julia's birthday","Levi's birthday"],"c":[{"labs":["11-10-1992"]},{"labs":["10-23-1994"]},{"labs":["3-20-1996"]},{"labs":["3-27-1998"]},{"labs":["7-7-2000"]},{"labs":["7-25-2002"]}]};


/*
	if(window.addEventListener){
		//window.addEventListener( 'mousemove', mouseMove, false );
		window.addEventListener( 'mousewheel', mouseWheel, false );
		window.addEventListener( 'mousedown', mouseDown, false );
		window.addEventListener( 'mouseup', mouseUp, false );
		window.addEventListener( 'keydown', keyPress, false);
		
		
		var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel" //FF doesn't recognize mousewheel as of FF3.x
		if (document.attachEvent) //if IE (and Opera depending on user setting)
			document.attachEvent("on"+mousewheelevt, mouseWheel);
		else if (document.addEventListener) //WC3 browsers
			document.addEventListener(mousewheelevt, mouseWheel, false)
	}
	else{ //for IE
		var e = document.getElementById('wfrm' + di.token);
		alert('hitting IE specific');
		e.attachEvent('onmousewheel',mouseWheel);
	}
*/

	initializeBars(di);

	//var tlFrm = document.getElementById('wfrm' + di.token);
	//tlFrm.addEventListener('mousemove', mouseMove, false);
	//tlFrm.addEventListener('click',onTLClick,false);

	mousePos[0] = -1;
	mousePos[1] = -1;
}

function prepareBasicTimelineElements(di){
	initializeTimeframeVars(di);
	createAndInitializeBarsAndTags(di); //di.startBufTime and di.endBufTime now at extremes of array , not just visible positions
	di.spanInDays = calculatePreciseOffsetInDays(di.startBufTime,di.endBufTime);
}

function prepareBasicEventData(di){
  var firstEvent = {};
  var lastEvent = {};
  var beginTime = new datetime("",2020,0,0,0,0,0,0,"");
  beginTime.setTime(di.startBufTime);
  for(var i=0; i<di.eventList.length; i++){
    var evt = di.eventList[i];
    evt.mapDatetimeToDays(beginTime,calculatePreciseOffsetInDays);
  }
  return [firstEvent,lastEvent];
}

function initializeBasicTimeline(core,responseCallback){
  if(moduleInitialized == false){
    initializeSharedState();
  }
  var token = core.getPersistentDrawingInstanceToken();
  if(typeof tempStore[token] === 'undefined'){
    tempStore[token] = new AppObject(token);
  }
  var di = tempStore[token];
  var apIdx = core.getHostPaneIndex();
  var scopeItem = core.scopeItem;
  //change set 271 - no flag is same as one set to false
  //scopeItem.hdTtl = false;
  core.setItemTitleBarVisibility(core.scopeIndex,false);

  core.setupResponsiveMenuitem(apIdx,'author','add_event','outofbounds,navpath,container,child,resource',null,'','',addTimelineEvent);
  core.setupResponsiveMenuitem(apIdx,'author','add_timespan','outofbounds,navpath,container,child,resource',null,'','',addTimelineSpan);
  core.setupResponsiveMenuitem(apIdx,'author','edit','child',null,'','',editTimelineEvent);
  core.setupResponsiveMenuitem(apIdx,'author','remove','child',null,'','',removeTimelineEvent);
  core.setupResponsiveMenuitem(apIdx,'gleaner','display_labels','anyregion',function(){return !doesDisplayCodeValueEqual('labels');},'','',displayLabels);
  core.setupResponsiveMenuitem(apIdx,'gleaner','display_all info','anyregion',function(){return !doesDisplayCodeValueEqual('details');},'','',displayDetails);
  core.setupResponsiveMenuitem(apIdx,'gleaner','display_plots & bars','anyregion',function(){return !doesDisplayCodeValueEqual('hide_all');},'','',displayOnlyPlotsAndBars);
}

function doesDisplayCodeValueEqual(value){
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  return di.displayCode === value;
}

function displayLabels(){
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  di.displayCode = 'labels';
  implementDisplayMode(di);
  SharedGlobal.core.requestRedraw(false);
}

function displayDetails(){
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  di.displayCode = 'details';
  implementDisplayMode(di);
  SharedGlobal.core.requestRedraw(false);
}

function displayOnlyPlotsAndBars(){
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  di.displayCode = 'hide_all';
  implementDisplayMode(di);
  SharedGlobal.core.requestRedraw(false);
}

function implementDisplayMode(di){
  for(var i=0; i<di.eventList.length; i++){
    var evt = di.eventList[i];
    evt.updateDisplayMode(di);
  }
}

function generateBasicTimelineHTML(core,responseCallback){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  var contentAreaSz = wnd.getContentAreaSize();
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  di.tlAreaHeight = contentAreaSz.height - 10; //10 = padding + sort of a magic number
  di.tlAreaWidth = di.frameRSide = contentAreaSz.width;
  responseCallback({"appletValuesMap":{"postHTMLInstallAppletInfo":{"method":postHTMLInstallForTimelineView,"data":{}},"overflow-x":"hidden"}});
  if(true){
    if(typeof core.scopeItem.d !== 'undefined'){
      if(typeof core.scopeItem.d.timeline_structure !== 'undefined'){
        var tls = core.scopeItem.d.timeline_structure;
        if(tls === 'group_list'){
          //ingestTimelineComplexGroup(core.scopeItem,di);
        }
        if(tls === 'layered_groups'){
          //ingestTimelineLayerGroups(core.scopeItem,di);
        }
        if(tls === 'event_list'){
          //ingestTimelineEventList(core.scopeItem,di);
        }
      }
    }
    else{
      //change set 271
      //if(core.scopeItem.c !== 'undefined' && core.scopeItem.labs !== 'undefined'){
      if(core.scopeItem.c !== 'undefined'){
        ingestSimpleTimelineItems(core.scopeItem,di);
      }
    }
    computeEarliestAndLatestEvents(di);
    timelineInit(di);
    prepareBasicTimelineElements(di);
  }
  var evtFrameId = 'evtfrm' + token;
  var barFrameId = 'bfrm' + token;
  var labelFrameId = 'lfrm' + token;
  var wrapperFrameId = 'wfrm' + token;
  return "<div class=\"kioskTLPane\" id=\"" + wrapperFrameId + "\"><div class=\"lbframe\" id=\"" + labelFrameId + "\"></div><div id=\"" + barFrameId + "\"></div><div id=\"" + evtFrameId + "\"></div></div>";
}

function computeEarliestAndLatestEvents(di){
  var di = tempStore[di.token];
  di.startBufTime = new datetime("",1,0,0,0,0,0,0,"");
  di.endBufTime = new datetime("",1,0,0,0,0,0,0,"");
  var eventList = di.eventList;
  for(var i=0; i<eventList.length; i++){
    var evt = eventList[i];
    if(i == 0){
      di.startBufTime.setTime(evt.bgn);
      if(evt.end){
        di.endBufTime.setTime(evt.end);
      }
      else{
        di.endBufTime.setTime(evt.bgn);
      } 
      continue;
    }
    var loc = evt.relativeLocation(di.startBufTime);
    if(loc === 'extends_later'){
      di.startBufTime.setTime(evt.bgn);
    }
    loc = evt.relativeLocation(di.endBufTime);
    if(loc === 'starts_earlier'){
      if(evt.end){
        di.endBufTime.setTime(evt.end); 
      }
      else{
        di.endBufTime.setTime(evt.bgn);
      }
    }
  }
}

function relativeLocation(t){
  var estr = 'starts_earlier';
  var lstr = 'extends_later';
  if(t.years < this.bgn.years)return estr;
  if(t.years == this.bgn.years){
    if(t.months < this.bgn.months)return estr;
    if(t.monts == this.bgn.months){
      if(t.days < this.bgn.days)return estr;
      if(t.days == this.bgn.days){
        if(t.hours < this.bgn.hours)return estr;
        if(t.hours == this.bgn.hours){
          if(t.minutes < this.bgn.minutes)return estr;
          if(t.minutes == this.bgn.minutes){
            if(t.seconds < this.bgn.seconds)return estr;
            if(t.seconds == this.bgn.seconds){
              if(t.mss < this.bgn.seconds)return estr;
              if(t.mss == this.bgn.mss)return 'coincides';
            }
          }
        }
      }
    }
  }
  if(this.end){
    if(t.years > this.end.years)return lstr;
    if(t.years == this.end.years){
      if(t.months > this.end.months)return lstr;
      if(t.months == this.end.months){
        if(t.days > this.end.days)return lstr;
        if(t.days == this.end.days){
          if(t.hours > this.end.hours)return lstr;
          if(t.hours == this.end.hours){
            if(t.minutes > this.end.minutes)return lstr;
            if(t.minutes == this.end.minutes){
              if(t.seconds > this.end.seconds)return lstr;
              if(t.seconds === this.end.seconds){
                if(t.mss > this.end.mss)return lstr;
                if(t.mss == this.end.mss)return 'coincides';
              }
            }
          }
        }
      }
    }
  }
  else{
    return lstr;
  }
  return 'coincides';
}

function addTimelineEvent(){
  var customDlgInfo = {"fields":[
    {type:"bold_text",text:"Time"},
    {type:"std_edit",label:"Era",box_class:"micro",value:"",key:"era"},
    {type:"multi_edit_line",label:"Date",box_class:"short",box_class_array:['micro','micro','short'],value:"1|2|2020",fmt_delim:"|",format:"month:|day:|year:|",key:"sdt"},
    {type:"multi_edit_line",label:"Time",box_class:"short",box_class_array:['micro','micro','micro','micro'],value:"00|00|00|000",fmt_delim:"|",format:"hour:|minute:|second:|ms:|",key:"st"},
    {type:"bold_text",text:"Data"},
    {type:"std_edit",label:"Label",box_class:"long",value:"0",key:"lab"},
    {type:"std_edit",label:"Details",box_class:"long",value:"0",key:"det"},
    {type:"bold_text",text:"Other properties"},
    {type:"std_edit",label:"Band level",box_class:"micro",value:"0",key:"lvl"},
    {type:"std_edit",label:"Color",box_class:"medium",value:"auto",key:"clr"}
  ]};
  SharedGlobal.core.displayCustomPopup(customDlgInfo,acceptNewTimelineEvent);
}

function addTimelineSpan(){
  console.log('not yet available');
  var customDlgInfo = {"fields":[
    {type:"bold_text",text:"Start time"},
    {type:"std_edit",label:"Era",box_class:"micro",value:"",key:"era"},
    {type:"multi_edit_line",label:"Date",box_class:"short",box_class_array:['micro','micro','short'],value:"1|2|2020",fmt_delim:"|",format:"month:|day:|year:|",key:"sdt"},
    {type:"multi_edit_line",label:"Time",box_class:"short",box_class_array:['micro','micro','micro','micro'],value:"00|00|00|000",fmt_delim:"|",format:"hour:|minute:|second:|ms:|",key:"st"},
    {type:"bold_text",text:"End time"},
    {type:"std_edit",label:"Era",box_class:"micro",value:"",key:"era2"},
    {type:"multi_edit_line",label:"Date",box_class:"short",box_class_array:['micro','micro','short'],value:"1|3|2020",fmt_delim:"|",format:"month:|day:|year:|",key:"edt"},
    {type:"multi_edit_line",label:"Time",box_class:"short",box_class_array:['micro','micro','micro','micro'],value:"00|00|00|000",fmt_delim:"|",format:"hour:|minute:|second:|ms:|",key:"et"},
    {type:"bold_text",text:"Data"},
    {type:"std_edit",label:"Label",box_class:"long",value:"0",key:"lab"},
    {type:"std_edit",label:"Details",box_class:"medium",value:"0",key:"det"},
    {type:"bold_text",text:"Other properties"},
    {type:"std_dropdown_listbox",label:"Style",box_class:"listbox",value:"0",options:["solid bar","framed text"],key:"stl"},
    {type:"std_edit",label:"Band level",box_class:"micro",value:"0",key:"lvl"},
    {type:"std_edit",label:"Color",box_class:"medium",value:"auto",key:"clr"}
  ]};
  SharedGlobal.core['displayCustomPopup'](customDlgInfo,acceptNewTimelineSpan);
}

function editTimelineEvent(){
  console.log("need to edit");
}

function removeTimelineEvent(e){
  var si = SharedGlobal.core.getSelectionInfo();
  if(si.rgn === 'child'){
    SharedGlobal.core.removeItem(e);
  }
  var di = tempStore[SharedGlobal.core.getPersistentDrawingInstanceToken()];
  di.eventList = [];
  SharedGlobal.core.requestRedraw(false);
}

function acceptNewTimelineEvent(map){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var di = tempStore[token];
  var valArr = map['sdt'].value.split('|');
  var valArr2 = map['st'].value.split('|');
  var item = new datetime(map['era'].value,Number(valArr[2]),Number(valArr[0]),Number(valArr[1]),Number(valArr2[0]),Number(valArr2[1]),Number(valArr2[2]),Number(valArr2[3]),"");
  insertTimelineItem(item,null,map['lab'].value,map['det'].value,map['clr'].value); 
  di.startBufTime = new datetime("",0,0,0,0,0,0,0,"");
  di.endBufTime = new datetime("",0,0,0,0,0,0,0,"");
  SharedGlobal.core.requestRedraw(true);
}

function acceptNewTimelineSpan(map){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var di = tempStore[token];
  var valArr = map['sdt'].value.split('|');
  var valArr2 = map['st'].value.split('|');
  var valArr3 = map['edt'].value.split('|');
  var valArr4 = map['et'].value.split('|');
  var item = new datetime(map['era'].value,Number(valArr[2]),Number(valArr[0]),Number(valArr[1]),Number(valArr2[0]),Number(valArr2[1]),Number(valArr2[2]),Number(valArr2[3]),"");
  var item2 = new datetime(map['era'].value,Number(valArr3[2]),Number(valArr3[0]),Number(valArr3[1]),Number(valArr4[0]),Number(valArr4[1]),Number(valArr4[2]),Number(valArr4[3]),"");
  insertTimelineItem(item,item2,map['lab'].value,map['det'].value,map['clr'].value); 
  di.startBufTime = new datetime("",0,0,0,0,0,0,0,"");
  di.endBufTime = new datetime("",0,0,0,0,0,0,0,"");
  SharedGlobal.core.requestRedraw(true);
}

function insertTimelineItem(datetimeOb,datetimeOb2,label,details,color){
  var core = SharedGlobal.core;
  //change set 271
  //var scopeItem = core.scopeItem;
  //var item = core.createNewVaultItem();
  //item.clr = color;
  //change set 271
  //var tmpIdx = core.addVaultItem(core.scopeItemIndex,label,item,-1);
  var tmpIdx = core.createVaultItem(core.scopeItemIndex,label,item,-1);
  var data = core.getItemData(tmpIdx);
  data.clr = color;
  var dtString = datetimeOb.toString();
  if(datetimeOb2){
    dtString += " to " + datetimeOb2.toString();
  }
  core.insertPercept(item,0,label);
  core.insertPercept(item,1,dtString);
  if(details !== ""){
    core.insertPercept(item,2,details);
  }
}

function precedesItem(item){
  if(this.bgn.yr < item.bgn.yr)return true;
  if(this.bgn.yr == item.bgn.yr){
    if(this.bgn.mo < item.bgn.mo){
      return true;
    }
    if(this.bgn.mo == item.bgn.mo){
      if(this.bgn.dy < item.bgn.dy){
        return true;
      }
    }
  }
  return false;
}

function postHTMLInstallForTimelineView(data){
  var token = SharedGlobal.core.getPersistentDrawingInstanceToken();
  var di = tempStore[token];
  di.labelFrame = document.getElementById('lfrm' + token);
  di.barFrame = document.getElementById('bfrm' + token);
  di.eventFrame = document.getElementById('evtfrm' + token);
  di.eventFrame.innerHTML = "";
  loadBarsAndTagsIntoDOM(di);
  computeTLFrameWidth(di);
  loadTimelineEventsIntoDOM(di);
  prepareBasicEventData(di);
  implementDisplayMode(di);
  assignXPositionsToEvents(di,true);
  var bottom = assignYPositionsToEvents(di);
  assignYPositionsToBarsAndTags(di,bottom);
}

function loadBarsAndTagsIntoDOM(di){
  for(var i=0; i<di.bars.length; i++){
    di.labelFrame.appendChild(di.barTags[i]);
    var bar = di.bars[i];
    if(bar.contextTag){
      di.labelFrame.appendChild(bar.contextTag); 
    }
    di.barFrame.appendChild(bar);
  }
}

function loadTimelineEventsIntoDOM(di){
  var iter = SharedGlobal.core.tracker;
  var eventList = di.eventList;
  StyleWorkbench.resetIndexForWhiteBackgroundColors(di.token);
  for(var i=0; i<eventList.length; i++){
    eventList[i].loadMe(di,di.eventFrame); 
    var curIdString = iter.getIdString();
    eventList[i].borderItem.id = curIdString;
    SharedGlobal.tic.push(curIdString);
    iter.next();
  }
}


/////////////////  Simple Timeline Event  /////////////////

function SimpleEvent(){

}

function handleTimelineKeyDown(){
  //alert('box');
  return false;
}

/////////////////  Event Group  /////////////////

function EventGroup(){

}


/////////////////  export Timeline Module  /////////////////

return {
	"getInitializer":function(){return initializeBasicTimeline;},
	"getDrawMethod":function(){return generateBasicTimelineHTML;},
	"getKeydownHandler":function(){return handleTimelineKeyDown;}
}

//})();
}();


