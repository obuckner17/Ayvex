
//smcclure,ayvexLightIndustries










var debug=false; 

var floor=62;  //minecraftWaterLevel todo setting or ???

var darkBrown='rgba(101,67,33,1.0)';

//todo jquerify and consolidate...there are more of these...
var toolbar = document.getElementById("toolbar");
var $anim = $("#animate"); 


//This section is connection/init to conference.js  (bugbug make a better class/object) (needed to be here because wasn't working from inside conference.js!)
var localStream, localPeerConnection, remotePeerConnection;
var $localVideo = $('#localVideo');
var $remoteVideo = $('#remoteVideo');
var $canvas = $('#c');
var screenWidth;
var screenHeight;


//todo we need an OBJECT here that implements a local k-d tree  there is an opensource k-d tree we should use....	
var theDrawings=[];

function debugAdd(s) {
	toolbar.innerHTML+=s+'<br/>';
}

function debugSet(s) {
	if (toolbar)
		toolbar.innerHTML=s;
}


function definedAndTrue(val) {
    try {
        val = eval(val);
        if (typeof val == 'undefined') return false;
    } catch (ex) {
        return false;
    }

    return val;
}

function pushAll(ofThese,intoThese)  {
	if (ofThese instanceof Array) {
		for(var ii=0,il=ofThese.length; ii<il; ii++) {
			intoThese.push(ofThese[ii]);
		}
	} else {
		intoThese.push(ofThese);
	}
}



//this works, but the script won't be live until you yield the thread for a while.  call it carefully!
function addScript(filename) {
	//a neat trick from  http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml  
	var newScriptTag=document.createElement('script')
	newScriptTag.setAttribute("type","text/javascript")
	newScriptTag.setAttribute("src", filename)
	document.getElementsByTagName("head")[0].appendChild(newScriptTag);
}	

function makeBigMap(data) {
	var path;
	var jj=0;  //for the inner loop inside one path
	var kk=0;  //index into the outputs
	for(var ii=0, limit=data.length; ii<limit; ++ii) {
		pt=data[ii];
		if (ii==0 || pt[3]!='') { //there is text so start a new path
			if (path) { //store the old path if there is one
				theDrawings[kk++]=path;
			}
			path = new Pre3d.Path();
			path.starting_point = 0;  //we make this standard
			path.points = [ ];  
			path.curves = [ ];
			jj=0;
		}
		
		//debugAdd(ii);
		var pt = data[ii];
		path.points[jj]={x:pt[0],y:pt[1],z:pt[2],t:pt[3]};   
		path.curves[jj]=new Pre3d.Curve(jj,jj,jj);
		path.color=darkBrown;
		path.width=2;
		jj++;
	}
	
	theDrawings.push(path);  //close it out
}

function addTreesAndWater(paths) {
	landmarkSpacing=200;  //todo consts throughout
	abs=Math.abs;
	for(var xx=-20000; xx<20000; xx+=landmarkSpacing) {
		for(var zz=-20000; zz<20000; zz+=landmarkSpacing) {
			var d=abs(xx)+abs(zz) + 5;
			var h8=Hasher.consistentHash(['tree',xx,zz])%256;
			if (hRndN(d,h8)<80)   paths.push(new Tree(xx,floor,zz,'calculate'));
			if (hRndN(d,h8)<200)   paths.push(waterMarker(xx+hRndN(500,h8),zz+hRndN(500,h8)));  //todo consts
		}
	}
	return paths;
}


function addMarkersAndWater(paths) {
	landmarkSpacing=200;  //todo consts throughout
	abs=Math.abs;
	for( var xx=-20000; xx<20000; xx+=landmarkSpacing ) {
		for( var zz=-20000; zz<20000; zz+=landmarkSpacing ) {
			var d=abs(xx)+abs(zz);
			if ( d>1000 && d<4000 && badRnd(d)<800 )   paths.push(marker(xx,zz));
			if ( d>2000 && badRnd(d)<2000 )            paths.push(waterMarker(xx+badRnd(500),zz+badRnd(500)));
		}
	}
	return paths;
}

function addCoordinateVectors(paths) {
	//coordinate vectors		
	paths.push(infoLine( 	{x:1000,y:0,z:0,t:'X'},
							{x:0   ,y:0,z:0}        ));
							
	paths.push(infoLine( 	{x:0,y:1000,z:0,t:'Y'},
							{x:0,y:0   ,z:0}          ));
							
	paths.push(infoLine(	{x:0,y:0,z:1000,t:'Z'},  //and Z should be south
							{x:0,y:0,z:0   } ));
	
}

 
//todo make the waves into "land" and only a few are actual waves (but the "sea level" is a good "default land level" for now)
function waterMarker(xx,zz, waveHeight, waveLength) {
	if (waveHeight===undefined) waveHeight=badRnd(8)-4;
	if (waveLength===undefined) waveLength=badRnd(7)+13;
	return twoSegmentPath(	darkBrown,  
							1,
							xx,62,zz,
							xx,64+waveHeight,zz+waveLength/3,
							xx,62,zz+waveLength
						); 
}
 
//function markerOrTree(xx,zz, treePoleFrac)
function marker(xx,zz)
{
	var height=40;
	return twoSegmentPath( contrastBackground(),
							  1,
							  xx, floor, zz,   
							  xx, height+floor, zz,
							  xx, height+floor, zz-10);  //minus Z is north
}
 
function contrastBackground() {
	if (mainBgColor=='white') return 'black';
	if (mainBgColor=='black') return 'white';
	return 'red'; //todo const
}


function contrast(color) {
	return 'green';
	if (mainBgColor=='black' && color=='black') return 'white';
	return color;
}
 
function infoLine(ptA,ptB) {
	return linePath(	
						'rgba(77,77,255,0.7)',  //'6666FF',
						0.3,
						ptA,
						ptB
					);
 }
 
 
function linePath(color,width,ptA,ptB)  { //ptA includes a text .t  
	var path=new Pre3d.Path();
	path.starting_point=0;
	path.points[0]=ptA;
	path.points[1]=ptB;
	path.curves[0]=new Pre3d.Curve(1,1,1);  //to make it a line, everything looks at 0th point.
	path.color=color;
	path.width=width;
	return path;
}


//todo move some of this to its own file
function twoSegmentPath(color,width,x1,y1,z1,x2,y2,z2,x3,y3,z3) {
	var path=new Pre3d.Path();
	path.starting_point=0;
	path.points[0]={x:x1,y:y1,z:z1,t:""};  //""+x1+","+y1
	path.points[1]={x:x2,y:y2,z:z2,t:""	};
	path.points[2]={x:x3,y:y3,z:z3,t:""  };
	path.curves[0]=new Pre3d.Curve(1,1,1);  //to make it a line, everything looks at 0th point.
	path.curves[1]=new Pre3d.Curve(2,2,2);  //to make it a line, everything looks at 0th point.
	path.color=color;
	path.width=width;
	return path;
}
 
function makeFakeMap() {
	var p0={x:0,y:15,z:20};    var t0='baseCamp';
	var p1={x:50,y:-15,z:30};  var t1='end of the line';
	var path = new Pre3d.Path();
    path.points = 
	  [
		  {x: p0.x, y: p0.y, z: p0.z, t:'this one path'},
		  {x: p1.x, y: p1.y, z: p1.z, t:''},
		  {x: 45, y:45, z:45, t:''}
	  ];
    path.curves = [new Pre3d.Curve(0, 0, 0), new Pre3d.Curve(1,1,1), new Pre3d.Curve(2,2,2)];
    path.starting_point = 0;
	path.color=contrastBackground();
    return [path];
}



function setMap(dataSetName) {  //no longer a callback from the cameraAndStuff.js  
	//defaulting a bunch
	if (typeof dataSetName === 'undefined') {
		dataSetName=$("#dataset").value;
		if (typeof dataSetName === 'undefined')	{
			dataSetName='mc2map';
		}
	}
	
	switch(dataSetName)	{
		case 'mc2map': setMc2Map(); break;
		case 'frcWld': setFractalWorld();  break;   		//todo semantics "map" for these entities is wrong....it's a full presentation around a dataset, the framing around the map, etc.
		case 'hiiDimAnlErq': setEarthquakeMap(); break;
		case 'hiiDimAnlFlw': setFlowersMap(); break;
		default: setErrorMap(dataSetName); break;
	}
	
}

function changeHiDim(newMode) {
	DemoUtils.Notify("changeHiDim",matrixForMode(newMode));
}

function changeXanimate(ev) {
	var newMode=ev.target.value;
	changeHiDim(newMode);
}

function changeDataSet(ev) {
	//todo find a better way to do this without refreshing...just an event to the camera or something....new call to start3d?
	var newDataSetName=ev.target.value;
	ev.stopPropagation();  //todo needed??
	window.location.href="?dataset="+newDataSetName;
}

function setErrorMap(dataSetName) {
	debugSet("bugbug setErrorMap is nyi:"+dataSetName);
}

function setMc2Map() {
	var rawData=getMc2Data();
	makeBigMap(rawData);
	addMarkersAndWater(theDrawings);
	addCoordinateVectors(theDrawings);
	
	function setMode() {
		$('#xanimate').val('none').trigger('change');
		$anim.prop('checked', true).change();
		updateAnimation();
	}

	var tid = setTimeout(setMode,1000);  //todo should be on some event??
}

function setFractalWorld() {
	var treePoleFrac=0.5;
	addCoordinateVectors(theDrawings);
	//todo add perlin noise, etc etc etc
	//bugbug this experiment didn't work...maybe work that stuff back out soon.   addPolarRays(theDrawings);
	
	
	var theHorizonTexts = getHorizon();
	pushAll(theHorizonTexts,theDrawings);
	
	addTreesAndWater(theDrawings,treePoleFrac);
	pushAll(getWelcomeSign(),theDrawings);
	
	
	// bug57 & bug60
	if (oGetVars["name"]) {
		//bugbugSOON   LOAD the user here!
		theUser.userId = oGetVars["name"];
	} else {
		theUser.userId = prompt("Please enter your username", "HarryPotter029");
	}

	if (!theUser.userId)
		close();

	$("#userName").text(theUser.userId);

	
	if (oGetVars["s"]==1) {
	    simpleStart(oGetVars); 
	}


	// "monsters" or "NPCs"
	var ghost=[];
	var numGhosts=7;
	for(var ii=0; ii<numGhosts; ii++) {
		ghost[ii]=addGamer(theDrawings,"ghost",1162,62,62);
		ghost[ii].color="rgba(99,99,99,0.3)";///transparentblue="rgba(33,33,255,0.3)"; //'#00000000';
	}
	
	setInterval(function() {
					for(var ii=0; ii<numGhosts; ii++) {
						ghost[ii].moveForward();
						ghost[ii].mutateOrientation1();
					}
				}
			,50);
	// function abortTimer() // to be called when you want to stop the timer ...TODO when would we want to?
	// {
		// clearInterval(tid);
	// }
	
	theDrawings.dynamic=dynamicObjects;  //so demoUtils etc can see them.

 	//function setMode()
	//{
	//	$('#xanimate').val('magic').trigger('change');
	//	$anim.prop('checked', false).change();
	//}
	//var tid = setTimeout(setMode,600);  //should be on some event??
 	
	setTimeout(function() {
						DemoUtils.Notify('moveCamera',{
								rotate_x: rad(8),
								rotate_y: rad(46),
								rotate_z: rad(0),
								x: 289,
								y: -292,
								z: -637});  //todo fix magic numbers.
							
							$("#xanimate").val('sequence4').trigger('change');
							$("#animate").prop('checked', true).trigger('change');  //todoneeded??
							
						},600);
						
	
} 

function getWelcomeSign(pointh,text) {
	var text="Welcome to Frakture";
	var pointh = { x: 100, y:sealevel, z:10 };
	var sign=new BigSign(pointh,text);
	return sign;
}


function addPolarRays(drawings) {
	//bugbug consts
	var M = 100000;
	var polarColor = "rgba(0,128,0,0.6)"; 
	
	var polarLine = MakeBigLine( {x: 0,y:sealevel,z:0}
								,{x: M,y:sealevel,z:0, rotX:rad(0), rotY:rad(90)});  
	polarLine.color="red"; //polarColor; bugbugSOON
	polarLine.isDebug=true;
	drawings.push(polarLine);
	
	
	polarLine=MakeBigLine( 	 {x:  0,y:sealevel,z:0}
							,{x:  0,y:0       ,z:0, rotX:rad(0), rotY:rad(-90)});  
	polarLine.color="white";  //polarColor; bugbugSOON  
	polarLine.isDebug=false;  //not necc.
	
	//drawings.push(polarLine);  bugbugNOW
}

function getHorizon() {
	var LEN = 10000000;  //todo const
	var sealevel = 62; //todo const
	var retvals=[];
	for(var ang=0; ang<360; ang+=15) {
		var angrad=Math.PI*ang/180;
		var pt = new DataPoint();
		pt.pointh.x = LEN * cos(angrad);
		pt.pointh.y = sealevel;
		pt.pointh.z = LEN * sin(angrad);
		pt.pointh.t = ""+Number(ang).toFixed(0);
		retvals.push(pt);
	}
	return retvals;
}



//for ghosts
function addGamer(theDrawings,name,x,y,z) {
	var gamer= new Gamer();
	gamer.reposition(x,y,z,0,0,0,getOfficialTime());
	gamer.name(name);
	gamer.type="ghost"; //avoid selfDraw for ghosts
	theDrawings.push(gamer);
	return gamer;
}


function setEarthquakeMap() {	
	//var filename="/web/data/erq_all_month.js";
	var filename="/web/data/erq100lines.js";  //for debugging


	//todo should go into extended CSV script file thingy, not here
	//time,latitude,longitude,depth,mag,magType,nst,gap,dmin,rms,net,id,updated,place,type
	var columnInfo=
	[  
		{name:'time',readas:'utc',scale:0.000001,offset:1.387e+12},  //todo what are the other columns about a column??  (isUTC, parseThisWay, limits, precision, short and long name
		{name:'lat',readas:'float',scale:10,offset:0}, 
		{name:'long',readas:'float',scale:10,offset:0},
		{name:'depth',readas:'float',scale:1,offset:0},
		///////there are more columns....pull them in to make the demo better (need more dimensions)
	];

	//todo maybe this too into some kinda extended datafile format
	var dataFileOptions={
				'skipFirstLine':1,
				'skipLinesWithFirstCharIn':'#'
			};
	
	//addScript(filename);
	
		
	var stuffToDo=StepperModule.Stepper.Create([  //todo convert to some "thenable" architecture....then()???;
			function() {addScript(filename);}.bind(this) //so that data set is fetchable, must be in other thread for the script to activate
			,['waiton',function(){ return (definedAndTrue('earthquakeDataLoaded')); }]
			,function() {parseDataSet(dataFileOptions,columnInfo);}.bind(this)
			,function() {theDrawings.push(DataPoint.FromArr([-2000,100,100],"stand here to start")); }.bind(this)
			,function() {
							DemoUtils.Notify('moveCamera',{
								rotate_x: rad(3),
								rotate_y: rad(90),
								rotate_z: rad(0),
								x: 800,
								y: -650,
								z: 1100});  //todo fix magic numbers.
							
							$("#xanimate").val('sequence4').trigger('change');
							$("#animate").prop('checked', true).trigger('change');  //todoneeded??
							
						}.bind(this)	
		]);
	stuffToDo.run()
}


function setFlowersMap() {
	//var shortBaseUrl = databaseUrl;  //todo: where to get this from??
	var flowerUrl = "/web/data/iris.json";  

	var dataToSendWithRequest = ''
	var reqHandler = $.getJSON( flowerUrl, 
								dataToSendWithRequest, 
								setFlowersMapStep2)  // on success, run this next function
		//.done(function() {
			//	alert( "second success" );
			//$("#xanimate").val('sequence4').trigger('change');
			//$("#animate").prop('checked', true).trigger('change');  //todoneeded??
		//})
		.fail(function() {
			alert( "error" +reqHandler.error);
		})
 		//.always(function() {
		//	alert( "finished258y" );
		//})
		;
}
		 
function setFlowersMapStep2(jsonData) {
	var columnInfo=
	[ 
		{name:'x',readas:'float',scale:100,offset:200},  //todo what are the other columns about a column??  (isUTC, parseThisWay, limits, precision, short and long name
		{name:'y',readas:'float',scale:100,offset:200}, 
		{name:'z',readas:'float',scale:100,offset:200},
		{name:'q',readas:'float',scale:10,offset:0}
	];

	theDrawings=[];
	addCoordinateVectors(theDrawings);
	
	var theNewPoints = jsonData.docs.map(function(onePointJson) {
											scaleJson(onePointJson,columnInfo);
											return DataPoint.FromJson(onePointJson);
										}); 

	pushAll(theNewPoints,theDrawings);
	
	DemoUtils.Notify( 'moveCamera',{  //TODO wish i could say 'pointAt' instead
		rotate_x: rad(0),
		rotate_y: rad(283),
		rotate_z: rad(0),
		x: 17000,
		y: 20000,
		z: 19000});  //todo: magic numbers.  

	function setMode() {
		$("#xanimate").val('sequence4').trigger('change');  
		$("#animate").prop('checked', true).trigger('change');  //bugbug this is not happening here and several places
	}
	setTimeout(setMode,500);
}

	
	

function scaleJson(onePointJson,columnInfo) {
	onePointJson.x = convertAndScale(columnInfo[0],onePointJson.x);
	onePointJson.y = convertAndScale(columnInfo[1],onePointJson.y);
	onePointJson.z = convertAndScale(columnInfo[2],onePointJson.z);
	
	for(var ii=0,il=columnInfo.length; ii<il; ii++) {
		onePointJson.xd[ii] = convertAndScale(columnInfo[ii],onePointJson.xd[ii]);
	}
}





			




function matrixForMode(hiDimMode) {
	switch(hiDimMode) {
		case 'sequence4':
			return [
						[0,0,0,0],  //todo need helper to create this only giving 0,4,1
						[0,0,0,4],
						[0,0,0,1]  
					];
		case 'sequence5':
			return [
						[0,0,0, 0]  //,0.1],
						[0,0,0,-3]  //,0.0],  //todo:  why 5th dim not working????
						[0,0,0, 2]  //,0.5]
					];
		case 'magic':
			return [
						[0,0,0,0],  //magic dimension only tweaks into y direction
						[0,0,0,0.1],
						[0,0,0,0]  
					];
		case null: 
		case 'null':
		case 'none':
		case '':
			return null;
		default:
			alert("errCode434 how did we get here:"+hiDimMode);  //todo: perhaps the matrices should be attached to the <option elements???
	}

}






var mainBgColor='white';
function updateBackground(ev) {
	mainBgColor = ($("#black").is(':checked')) ? 'black' : 'white';
}

var big=1;
function toggleBigness(ev) {
	big=($("#big").is(':checked')) ? 2 : 1 ;
}



function parseDataSet(dataFileOptions,columnInfo) {
	addCoordinateVectors(theDrawings);
	
	if (typeof getData != 'function') {
		alert("dynamic read fail: cannot read the data type 1");  //todo handle better
		return theDrawings;	  // but you won't like it  
	}
	
	var textData=getData();	
	
	if (!textData) {
		alert("cannot read the data type 2");  //todo handle better
		return theDrawings;
	}
	
	addTextData(theDrawings,textData,columnInfo,dataFileOptions,null);  //transformation function --- null=use the default
}





//used to track what keys are down
isDown = DemoUtils.KeyTracker.isDown;

$(document).ready(function() {
	if (oGetVars["dataset"]) 
		$("#dataset").val(oGetVars["dataset"]); 
		
	
	$("#legend").dialog({
		modal: true,
		draggable: true,
		resizable: true,
		position: ['right', 'top'],
		width: 400,
		dialogClass: 'bugbugTodo', 
		autoOpen:false,
		//buttons: {
		//	"OK": function() {
		//		$(this).dialog("close");
		//	}
		//}
	});
	
	
	setMap(oGetVars["dataset"]);  
	updateBackground();

	screenWidth =$canvas.prop("width" );
	screenHeight=$canvas.prop("height");

	var opts = {
		updateServerCallback:getUpdateServerCallback()
	};  
	
	StepperModule.Stepper.Create([
			function(){	start3d(theDrawings,opts); },  //in cameraAndStuff.js
			function(){ finishGettingReady(); }
		]).run();

});

function updateAnimation() {
	DemoUtils.Notify("animate",animate.checked); 
}

function finishGettingReady() {
	$anim.click( updateAnimation );
	
	setTimeout(function() { //to avoid wasting CO2, we try to time out the animation...
			$anim.prop('checked',false); //todo but this should be set by the world/dataset/user, not ME
			//tell demoUtils right now too
			updateAnimation();
		}
		,30*1000);//milliseconds  //todo settings		

	
	$("#xanimate").change( function(event) {
			changeXanimate(event);
		});
	

	//$("#flyTo").click( function(event)
	//	{
	//		DemoUtils.Notify("zipToSelected","thisArgNotNeeded");		
	//	});
		
	$("#instructions").click( function(event) {
			$("#legend").dialog("open");
		});
	
	$("#dataset").change( function(event) {
			changeDataSet(event);
		});
	$("#black").change( function(event)	{
			updateBackground();
		});
	$("#big").change( function(event) {
			toggleBigness();
		});
};


function getUpdateServerCallback() {
	if (oGetVars["dataset"]=="frcWld")  //todo hack should be a property of the dataset or something
		return updateServerCallback;
	else
		return null;
}

//todo move this to its own module?

//should this be persistent todo??
var theUser = {
	type: "Gamer",
	userId:"",  //later set right value in a sub sub sub of doc.ready()
	_rev:-1,
	cam:null, //todo better sentinel value?
	_id:""
};

//two locks...one to not run more than once per 2s, one to keep 2 copies from running at same time
var lastCalled=Date.now();
var serverCallbackLocked=false;  //open it  -- like a semaphore??  todo revisit
function updateServerCallback(camera_state) {
	theUser.cam=camera_state;  //always gotta update this one!
	if (theUser.userId==null || theUser.userId=='') 
		return;

	//lock 1
	var thisCall=Date.now();
	if (thisCall-lastCalled<2000)  //at most every 2 sec (todo const)
		return;
	else
		lastCalled=thisCall;

	//lock 2
	if (serverCallbackLocked)  //this is the actual door
		return;
	else
		serverCallbackLocked=true;  //closes behind you, one at a time

	
	//if (theUser._rev<1) 
	//{
	//	initServerCallback(theUser);
	//	return;
	//}
	//
	//if (theUser._rev==1) 
	//{
	//	delete theUser._rev;  //we'll get a new one, this is just sentinel value  
	//	theUser._id="user/"+theUser.userId;   //todo const
	//}	


	theUser.mostRecentQuote=userQuote;
	theUser.telecInfo=telecInfo;  //global local user's telecInfo goes into the local user being persisted
	theUser.saveTime=getOfficialTime();  //ideally the protocol would save a serverSaveTime as well and other clients will see cheating.
	if (theUser.saveTime<1400000000) { //1B, roughly 2001
		console.log('cannot get official time');  //can't do much yet  ...wait for next callback...continue anyway with bad time...
	}
		
	
	var data = JSON.stringify(theUser);
	var putUrl=getUserDocUrl(theUser);  //+revString(theUser._rev);
	
	$.ajax({
		type:"PUT",
		headers: { 
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		url: putUrl,
		data: data,
		//contentType: "application/json",
		//dataType: "json",
		success: function( data, textStatus, jqXHR ) {
			//no _rev for now....   theUser._rev = unquote(jqXHR.getResponseHeader("ETAG"));  //so we can save next time
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			alert('err1047u: put bad'+errorThrown)+putUrl+""+data;
		},
		complete: function(jqResp) {
			serverCallbackLocked=false;  //open again one way or another
		}
	});
	
	// call  http://WHATEVER/api/getCurrentUsers
	//and put those users into "theDrawings" 
	//need to get time of each user's writing from server, to show fading-of-color or ??
		
	$.ajax({
		type: "GET",
		url: getCurrentUsersUrl,
		contentType: "application/json",
		success: function(data) {
			updateDynamicObjects(data); //it better be a list of userDocs
		},
		error: function(resp) {
			if (resp.status==404)
				theUser._rev=1;  //which = a NEW 
			else
				alert("err523x: do not know how to deal with this error"+resp.status+"  "+JSON.stringify(resp));
		},
		complete: function(jqResp) {
		}
		
	});	
}


function deString(data) {  //might be object, might be dehydrated JSON object
	var ttt=typeof data;
	if (ttt=='string') return $.parseJSON(data);
	if (ttt=='object') return data;
	return {"badData":"err1115t"};
}	


var dynamicObjects={};  //eventually needs to be some space partitioning class  kd-dataStructure?  todo
function updateDynamicObjects(data) {
	var obj = deString(data);  
	var count=Object.keys(obj).count;
	$.each(obj,function(prop,val) {
		updateDynamicObjectFromServerData(val);
	});
}

function isSelf(item) {
    return (item.userId==theUser.userId);
}


function updateDynamicObjectFromServerData(item) {   //item is the data from server

	item = deString(item);

	if (isSelf(item)) //todo revisit... for now disallow drawing self (strict first person for demo, can change later)
		return; 

	var dynObj=dynamicObjects[item.id];
		
	//todo: apply factory pattern here instead.
	switch(item.type)	{
		case "Gamer":	
			if (!dynObj) {
				dynObj=new Gamer();  
				dynObj.name(item.userId);
				dynamicObjects[item.userId]=dynObj;
			}
			dynObj.updateFromData(item);
			maybeDoTeleconf(dynObj,item);  //item is from server  //users can do teleconf but probably no other types
			break;
		
		case "DrawnObject":
			if (!dynObj) {
				dynObj=new DrawnObject();
				dynamicObjects[item.id]=dynObj; 
			}
			dynObj.updateFromData(item);  //todo consider not updating unless "changed" e.g. a timestamp?
			break;
			
		default:	//todo what other kinds of dynObjs do we have for now tho??
			trace("unknown type from db:"+dumps(item));
			break;
	}
	
	

}


function theyAreWhoWeCalled() {
	return true; //bugbugNOW what should this be?  check callee or something
}

	

	
function isMe(someKey) {
	return (someKey==theUser._id);
}


	
function unquote(x) {
	for(ii=0, il=x.length; ii<il && x.substring(ii,1)=="\""; ii++);
	for(      jj=x.length; jj>=0 && x.substring(jj,1)=="\""; --jj); 
	return x.substring(ii,jj-ii);
}

//function initServerCallback(theUser)
//{
//	console.log("called init server callback");
//	var userInfo = getUserDocUrl(theUser);
//	
//	//todo consolidate this call with similar call above somehow?  worth it?
//	$.ajax({
//		type: "GET",
//		url: userInfo,
//		contentType: "application/json",
//		success: function(data) {
//			initUserFromData(theUser,data); //it better be a userDoc
//		},
//		error: function(resp) {
//			if (resp.status==404)
//				theUser._rev=1;  //which = NEW todo const
//			else
//				alert("err523p:do not know how to deal with this error"+JSON.stringify(resp)+"   "+userInfo);
//		},
//		complete: function(jqResp) {
//			setServerTimeOffset(jqResp.getResponseHeader('Date'));
//			serverCallbackLocked=false;  //open again one way or another
//		}
//		
//	});
//}

//todo figure both of these programmatically...find all "localhost" and fix them
var server=window.location.hostname;  //todo must figure dynamically
var port = "8081";
//var database = "api";
//var viewLocation = "_design/views/_view";
//todo all the above from config???

var databaseUrl = "http://"+server+":"+port+"/api";
var getCurrentUsersUrl = databaseUrl+"/user/";  //like doing a directory query

function getUserDocUrl(user) {
	return databaseUrl+"/user/"+user.userId;
}

//this user is probably "theUser"...but maybe we change our mind later?
//function initUserFromData(user,data) {
//
//
//	//bugbug yeah ???    var obj = $.parseJSON(data);
//	var obj = data; //why parse not needed now???
//
//
//	user.cam=obj.cam;
//	//user._rev=obj._rev;
//	user._id=obj._id;
//	//etc todo
//	
//	debugger;
//	if (user._rev<1) {
//		user._rev=1;
//	}
//	
//}

function revString(rev) {
	if (typeof rev === 'undefined') 
		return "";
	if (rev<=1) //brand new
		return "";
	return "?rev="+rev;
}

//todo make a serverTimeSync module
var timeOffset=0;      // later null when we again have "server time" concept;
function getOfficialTime() {  //we want it as an int for compactness and speed of math....but ideally we'd be putting this info in on the server side!
	if (timeOffset==null) {
		return -1;  //not ready this call...try again next time
	}
	return getCurrentTime()+timeOffset;
}

//function setServerTimeOffset(serverTime)
//{
//	serverTime=(new Date(serverTime)).getTime();
//	if (serverTime<1400000000) 
//		return;
//	timeOffset=serverTime-getCurrentTime();
//	console.log("timeOffset="+timeOffset);
//}

function getCurrentTime() {
	return 0+(new Date()).getTime();
}

//# sourceURL=index.html




function simpleStart(oGetVars) {

    //default to black
    $("#black").prop('checked',true);
    updateBackground(null);

    document.body.bgColor='black';

    //c.position.left="0px";
    //c.style.position.top="0px";
    //c.width=screen.width-100;
    //c.height = screen.height-100;



    //hide display numbers or make tiny!

    //support tablet drags etc


}
