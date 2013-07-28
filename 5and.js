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
	slippery: 1,
	jitter: 0
};
props[WATER] = {
	ignore: false,
	color: [70,120,255],
	gravity: 2,
	slippery: 2,
	jitter: 1
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
	particles[i] = new Uint8Array(3);
	particles[i][0] = AIR; //material
	particles[i][1] = 0; //has been processed
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
				
				var moveddown = false;
				for (var gr=pp.gravity; gr>0; gr--) {
					try {
						if (yy+gr<gh && free(x,y+gr)) { //apply gravity
							var yyy = yy+gr;
							mpt(xx,yy,xx,yyy);
							yy = yyy;
							moveddown = true;
							break;
						}
					}
					catch (e) {console.log(y+gr+" "+gh)};
				}
				
				if (!moveddown) {
					if (free(xx-1,yy+1) && free(xx+1,yy+1)) {
						var r = fastRand()>0.5?1:-1;
						mpt(xx,yy,xx+r,yy+1);
						xx+=r;
						yy+=1;
					}
					else if (free(xx-1,yy+1)) {
						mpt(xx,yy,xx-1,yy+1);
						xx--;
						yy++;
					}
					else if (free(xx+1,yy+1)) {
						mpt(xx,yy,xx+1,yy+1);
						xx++;
						yy++;
					}
				}
				
				if (pp.jitter>0) {
					var xm = Math.ceil(fastRand()*pp.jitter)*fastRand()>0.5?1:-1;
					if (free(xx+xm,yy)) {
						mpt(xx,yy,xx+xm,yy);
						xx = xx+xm;
					}
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

var rands = new Float32Array(10000), randcnt=0;
for (var i=0; i<rands.length; i++) {
	rands[i] = Math.random();
}
function fastRand() {
	if (randcnt>=rands.length) {randcnt=0;}
	return rands[randcnt++];
}

function ge(s) {return document.getElementById(s);}

