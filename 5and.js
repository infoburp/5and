/* ,-----.                   ,--. 
 * |  .--' ,--,--.,--,--,  ,-|  | 
 * '--. `\' ,-.  ||      \' .-. | 
 * .--'  /\ '-'  ||  ||  |\ `-' | 
 * `----'  `--`--'`--''--' `---'  
Nondefault.net */


/*** Particle processing/types ***/
var AIR=0, SAND=1, WATER=2;
var props = {};
props[AIR] = {
	ignore: true,
	color: [0,0,0]
};
props[SAND] = {
	ignore: false,
	color: [255,235,20],
	gravity: 1,
	slippery: 1
};
props[WATER] = {
	ignore: false,
	color: [70,120,255],
	gravity: 2,
	slippery: 2
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

function np(x,y) {
	npi(gpi(x,y));
}
function npi(i) { //make a new particle at index
	particles[i] = new Uint8Array(3);
	particles[i][0] = AIR; //material
	particles[i][1] = 0; //has been processed
}

function mpt(x,y,x2,y2) { //move particle to new position
	particles[gpi(x2,y2)]=particles[gpi(x,y)];
	np(x,y);
} 

function simuStep() {
	for (var i=0; i<5; i++) {
		var x = Math.floor(Math.random()*gw);
		var y = Math.floor(Math.random()*gh/5)+2;
		np(x,y);
		spp(x,y,0,Math.random()>0.5?WATER:SAND);
	}
	
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
				
				for (var gr=pp.gravity; gr>0; gr--) {
					try {
						if (yy+gr<gh && gpp(x,y+gr,0)==AIR) { //apply gravity
							var yyy = yy+gr;
							mpt(xx,yy,xx,yyy);
							yy = yyy;
							break;
						}
					}
					catch (e) {console.log(y+gr+" "+gh)};
				}
				
			}
		}
	}
	
	redraw();
}



/*** Document functions ***/
var intv;
var canvas,bcanvas,ctx,bctx,cw,ch;
function load() {
	//set up output canvas
	canvas = ge("output");
	ctx = canvas.getContext("2d");
	cw = canvas.width;
	ch = canvas.height;
	
	//create buffer canvas
	bcanvas = document.createElement("canvas");
	bcanvas.width = gw;
	bcanvas.height = gh;
	bctx = bcanvas.getContext("2d");
	
	//start game loop
	intv = setInterval(simuStep,16);
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
	ctx.drawImage(bcanvas,0,0,cw,ch);
}

function ge(s) {return document.getElementById(s);}

