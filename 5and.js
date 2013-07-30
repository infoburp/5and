/* ,-----.                   ,--. 
 * |  .--' ,--,--.,--,--,  ,-|  | 
 * '--. `\' ,-.  ||      \' .-. | 
 * .--'  /\ '-'  ||  ||  |\ `-' | 
 * `----'  `--`--'`--''--' `---'  
Nondefault.net */


/*** Particle processing/types ***/
var AIR=0, SAND=1, WATER=2, WALL=3, STEAM=4;
var eStrings = ["Air","Sand","Water","Wall","Steam"];
var props = {};
props[AIR] = {
	ignore: true,
	color: [0,0,0]
};
props[SAND] = {
	ignore: false,
	color: [255,235,20],
	gravity: 1,
	termvel: 4,
	slippery: 1,
	jitter: 0
};
props[WATER] = {
	ignore: false,
	color: [70,120,255],
	gravity: 1,
	termvel: 5,
	slippery: 2,
	jitter: 1
};
props[WALL] = {
	ignore: true,
	color: [100,100,100]
};
props[STEAM] = {
	ignore: false,
	color: [200,200,200],
	gravity: -1,
	termvel: 10,
	slippery: 2,
	jitter: 1,
	decaychance: 0.05
};

/*** Particle management ***/
var gw = 200;
var gh = 150;
var particles = new Array(gw*gh);
for (var i=0; i<particles.length; i++) {
	npi(i);
}
function gpi(x,y) {return (y*gw)+x;} //get particle index
function spp(x,y,prop,val) {particles[(y*gw)+x][prop] = val;} //set particle property
function gpp(x,y,prop) {return particles[(y*gw)+x][prop];} //get particle property

function inbounds(x,y) {return x>=0 && y>=0 && x<gw && y<gh;}
function free(x,y) {return inbounds(x,y) && gpp(x,y,0)==AIR;}

function np(x,y) {
	npi(gpi(x,y));
}
function npi(i) { //make a new particle at index
	particles[i] = []//new Uint8Array(3);
	particles[i][0] = AIR; //material
	particles[i][1] = 0; //has been processed
	particles[i][2] = 0; //vertical velocity
}

function mpt(x,y,x2,y2) { //move particle to new position
	particles[gpi(x2,y2)]=particles[gpi(x,y)];
	np(x,y);
} 
function mpm(x,y,x2,y2) { //move particle as far as possible to x2 and y2 (in straight line motion)
						  //returns final position as [x,y]
	var sx = x2-x>=0?1:-1;
	var sy = y2-y>=0?1:-1;
	
	var fx=x,fy=y;
	for (var xm=x2-x; xm!=0; xm-=sx) {
		if (x+xm>=0 && x+xm<gw && gpp(x+xm,y,0)==AIR) {
			fx = x+xm;
			break;
		}
	}
	for (var ym=y2-y; ym!=0; ym-=sy) {
		if (y+ym>=0 && y+ym<gh && gpp(fx,y+ym,0)==AIR) {
			fy = y+ym;
			break;
		}
	}
	
	mpt(x,y,fx,fy);
	
	return [fx,fy];
}

function simuStep() {
	/*for (var i=0; i<5; i++) {
		var x = Math.floor(Math.random()*gw);
		var y = Math.floor(Math.random()*gh/5)+2;
		np(x,y);
		spp(x,y,0,Math.random()>0.5?WATER:SAND);
	}*/
	
	for (var x=0; x<gw; x++) {
		for (var y=0; y<gh; y++) {
			spp(x,y,1,0);
		}
	}
	
	for (var x=0; x<gw; x++) {
		for (var y=0; y<gh; y++) {
			if (gpp(x,y,1)==0 && !props[gpp(x,y,0)].ignore) { //if this particle has not been processed
				
				spp(x,y,1,1); //this particle has been processed
				var pp = props[gpp(x,y,0)]; //get properties for this particle's type
				
				var xx = x;
				var yy = y;
				
				var grav = gpp(xx,yy,2);
				if (Math.abs(grav+pp.gravity)<=Math.abs(pp.termvel)) { //enforce terminal velocity
					spp(xx,yy,2,grav+pp.gravity); //increase vspeed based on gravity
				}
				
				var moveddown = false;
				var ig = gpp(xx,yy,2)<0?1:-1;
				for (var gr=gpp(xx,yy,2); gr!=0; gr+=ig) {
					//try {
						if (yy+gr<gh && free(x,y+gr)) { //apply gravity
							var yyy = yy+gr;
							mpt(xx,yy,xx,yyy);
							yy = yyy;
							moveddown = true;
							break;
						}
					//}
					//catch (e) {console.log(y+gr+" "+gh)};
				}
				
				if (!moveddown) {
					spp(xx,yy,2,0); //reset vertical speed upon collision
					var d = fastRand()>0.5?1:-1;
					if (free(xx+d,yy+1)) {
						mpt(xx,yy,xx+d,yy+1);
						xx = xx+d;
					}
					else if (free(xx-d,yy+1)) {
						mpt(xx,yy,xx-d,yy+1);
						xx = xx-d;
					}
				}  
				
				if (pp.jitter>0) {
					var xm = Math.ceil(fastRand()*pp.jitter)*fastRand()>0.5?1:-1;
					if (free(xx+xm,yy)) {
						mpt(xx,yy,xx+xm,yy);
						xx = xx+xm;
					}
				}
				
				if (pp.decaychance && fastRand()<pp.decaychance) {np(xx,yy);}
			}
		}
	}
	
	redraw();
}



/*** Document functions ***/
var intv;
var canvas,bcanvas,ctx,bctx,cw,ch;
var mouseX=0, mouseY=0, mouseD=false;
var brushElement=SAND, brushSize=2;

var tooltip = "Welcome to 5and!", tttimeout=1500, ttt = Date.now(), ttcol=[25,255,25];
function showTooltip() {ttt = Date.now();}

function load() {
	//set up output canvas
	canvas = ge("output");
	ctx = canvas.getContext("2d");
	ctx.webkitImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;	
	cw = canvas.width;
	ch = canvas.height;
	
	//create buffer canvas
	bcanvas = document.createElement("canvas");
	bcanvas.width = gw;
	bcanvas.height = gh;
	bctx = bcanvas.getContext("2d");
	
	//start game loop
	intv = setInterval(simuStep,16);
	
	ge("output").addEventListener("mousemove",eMm,false);
	ge("output").addEventListener("mousedown",eMd,false);
	ge("output").addEventListener("mouseup",eMu,false);
	ge("output").addEventListener((/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel",eMw,false);
}

function eMm(event) {
	event.preventDefault();
	var tx=mouseX,ty=mouseY;
	setmp(event);
	drawParticles(tx,ty,mouseX,mouseY);
}

function eMd(event) {
	event.preventDefault();
	mouseD = true;
	var tx=mouseX,ty=mouseY;
	setmp(event);
	drawParticles(tx,ty,mouseX,mouseY);
}

function eMu(event) {
	event.preventDefault();
	mouseD = false;
	var tx=mouseX,ty=mouseY;
	setmp(event);
	drawParticles(tx,ty,mouseX,mouseY);
}

function eMw(event) {
	event.preventDefault();
	var delta=event.detail? event.detail*(-120) : event.wheelDelta;
	
	var d=0;
	if (delta>0) {d=1} else {d=-1;}
	
	brushElement = brushElement+d>=eStrings.length?0:brushElement+d<0?eStrings.length-1:brushElement+d;
	tooltip = eStrings[brushElement];
	ttcol = props[brushElement].color;
	showTooltip();
}

function setmp(event) {
	mouseX = Math.floor((event.pageX-ge("output").offsetLeft)*(gw/cw));
	mouseY = Math.floor((event.pageY-ge("output").offsetTop)*(gh/ch));
}

function drawParticles(x1,y1,x2,y2) {
	if (mouseD) {
		doLine(x1,y1,x2,y2, function(x,y){
			for (var xx=x-brushSize; xx<x+brushSize; xx++) {
				for (var yy=y-brushSize; yy<y+brushSize; yy++) {
					if (inbounds(xx,yy)) {
						np(xx,yy);
						spp(xx,yy,0,brushElement);
					}
				}
			}
		});
	}
}

function redraw() {
	var imgdata = bctx.getImageData(0,0,gw,gh);
	var data = imgdata.data;
	for (var x=0; x<gw; x++) {
		for (var y=0; y<gh; y++) {
			var ind = ((y*gw)+x)*4;
			var col = props[gpp(x,y,0)].color;
			
			data[ind+0] = col[0];
			data[ind+1] = col[1];
			data[ind+2] = col[2];
			data[ind+3] = 255;
		}
	}
	bctx.putImageData(imgdata,0,0);
	
	bctx.fillStyle = "rgba(255,255,255,"+(1-((Date.now()-ttt)/tttimeout))+")";
	bctx.fillText(tooltip,mouseX+11,mouseY+11);
	bctx.fillStyle = "rgba("+ttcol[0]+","+ttcol[1]+","+ttcol[2]+","+(1-((Date.now()-ttt)/tttimeout))+")";
	bctx.fillText(tooltip,mouseX+10,mouseY+10);
	
	ctx.drawImage(bcanvas,0,0,cw,ch);
}

var rands = new Float32Array(10000), randcnt=0;
for (var i=0; i<rands.length; i++) {
	rands[i] = Math.random();
}
function fastRand() {
	if (randcnt>=rands.length) {randcnt=0;}
	return rands[randcnt++];
}

function doLine(x0, y0, x1, y1, callback){
   var dx = Math.abs(x1-x0);
   var dy = Math.abs(y1-y0);
   var sx = (x0 < x1) ? 1 : -1;
   var sy = (y0 < y1) ? 1 : -1;
   var err = dx-dy;

   while(true){
     callback(x0,y0);  // Do what you need to for this

     if ((x0==x1) && (y0==y1)) break;
     var e2 = 2*err;
     if (e2 >-dy){ err -= dy; x0  += sx; }
     if (e2 < dx){ err += dx; y0  += sy; }
   }
}

function ge(s) {return document.getElementById(s);}

