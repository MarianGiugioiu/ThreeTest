import { Component } from '@angular/core';
import {  mat3, mat4 } from 'gl-matrix';
import * as THREE from 'three';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  gl: WebGLRenderingContext;
  canvas;
  shaderProgram: any;
  perm = new Uint8Array([151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
   ]);
  grad3 = new Int8Array([0,1,1,0,1,-1,0,-1,1,0,-1,-1,
  1,0,1,1,0,-1,-1,0,1,-1,0,-1,
  1,1,0,1,-1,0,-1,1,0,-1,-1,0,
  1,0,-1,-1,0,-1,0,-1,1,0,1,1]);

  identityMatrix = new Float32Array(16);

  permTexture;
  squareVertexPositionBuffer;
  currentlyPressedKeys = {};
  cameraRotation = mat4.create();
  cameraPosition = [0.01, 0.0, 3.0];
  distToSurface = 0.0;

  time = 0.0;
	aaValue = 1;
  power;

  lastFPS = 1;
  fps = 1;

  presetRotation = mat4.create();

  constructor() {
  }

  ngOnInit() {
    mat4.identity(this.cameraRotation);
    mat4.identity(this.identityMatrix);
  }

  initGL() {
    try {
        this.gl = this.canvas.getContext("experimental-webgl");
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    } catch (e) {
    }
    if (!this.gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
  }

  async initShaders() {

    const fileLoader = new THREE.FileLoader();

    let vertexShaderText = await fileLoader.loadAsync("/assets/shaders/vertexShader.vert");
    let fragmentShaderText = await fileLoader.loadAsync("/assets/shaders/fragmentShader.frag");
    
    let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

    this.gl.shaderSource(vertexShader, vertexShaderText as string);
    this.gl.shaderSource(fragmentShader, fragmentShaderText as string);

    this.gl.compileShader(vertexShader);
    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      console.error('Error compiling vertex shader', this.gl.getShaderInfoLog(vertexShader));
      return;
    }

    this.gl.compileShader(fragmentShader);
    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      console.error('Error compiling fragment shader', this.gl.getShaderInfoLog(fragmentShader));
      return;
    }

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);

    this.gl.linkProgram(this.shaderProgram);

    if(!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('Error linking program', this.gl.getProgramInfoLog(this.shaderProgram));
      return;
    }

    this.gl.useProgram(this.shaderProgram);

    this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
    this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

    this.shaderProgram.vertexColorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexColor");
    this.gl.enableVertexAttribArray(this.shaderProgram.vertexColorAttribute);

    this.shaderProgram.time = this.gl.getUniformLocation(this.shaderProgram, "time");

    this.shaderProgram.camera = this.gl.getUniformLocation(this.shaderProgram, "camera");
    this.shaderProgram.viewRotation = this.gl.getUniformLocation(this.shaderProgram, "viewRotation");

    this.shaderProgram.colorChange = this.gl.getUniformLocation(this.shaderProgram, "colorChange");
    this.shaderProgram.ambientRed = this.gl.getUniformLocation(this.shaderProgram, "ambientRed");
    this.shaderProgram.ambientGreen = this.gl.getUniformLocation(this.shaderProgram, "ambientGreen");
    this.shaderProgram.ambientBlue = this.gl.getUniformLocation(this.shaderProgram, "ambientBlue");

    this.shaderProgram.normalLighting = this.gl.getUniformLocation(this.shaderProgram, "normalLighting");
    this.shaderProgram.power = this.gl.getUniformLocation(this.shaderProgram, "power");
    this.shaderProgram.maxIterations = this.gl.getUniformLocation(this.shaderProgram, "maxIterations");
    this.shaderProgram.antialiasing = this.gl.getUniformLocation(this.shaderProgram, "antialiasing");
    this.shaderProgram.julia = this.gl.getUniformLocation(this.shaderProgram, "julia");
    this.shaderProgram.permSampler = this.gl.getUniformLocation(this.shaderProgram, "this.permTexture");
    this.shaderProgram.phong = this.gl.getUniformLocation(this.shaderProgram, "phong");
    this.shaderProgram.noise = this.gl.getUniformLocation(this.shaderProgram, "uNoise");
    this.shaderProgram.marble = this.gl.getUniformLocation(this.shaderProgram, "uMarble");
    this.shaderProgram.lacunarity = this.gl.getUniformLocation(this.shaderProgram, "uLacunarity");
    this.shaderProgram.gain = this.gl.getUniformLocation(this.shaderProgram, "uGain");
    this.shaderProgram.octaves = this.gl.getUniformLocation(this.shaderProgram, "uOctaves");
    this.shaderProgram.justDE = this.gl.getUniformLocation(this.shaderProgram,"uJustDE");
  }

  degToRad(degrees) {
      return degrees * Math.PI / 180;
  }

  initPermTexture() {
    var width = 256;
    var components = 4;
    var pixels = new Uint8Array(width * width * components);
    for(var i = 0; i < width; i++) {
      for(var j = 0; j < width; j++) {
        var offset = (i * width + j) * components;
        var value = this.perm[(j + this.perm[i]) & 0xff];
        pixels[offset] = this.grad3[(value & 0x0f) * 3 + 0] * 64 + 64;
        pixels[offset + 1] = this.grad3[(value & 0x0f) * 3 + 1] * 64 + 64;
        pixels[offset + 2] = this.grad3[(value & 0x0f) * 3 + 2] * 64 + 64;
        pixels[offset + 3] = value;
      }
    }
    this.gl.pixelStorei ( this.gl.UNPACK_ALIGNMENT, 1 );
    this.permTexture = this.gl.createTexture();
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.permTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      width, width, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    this.gl.texParameteri( this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST );
    this.gl.texParameteri( this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST );
  }

  initBuffers() {
      this.squareVertexPositionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
      let vertices = [
            1.0,  1.0,  0.0,
          -1.0,  1.0,  0.0,
            1.0, -1.0,  0.0,
          -1.0, -1.0,  0.0
          ];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
      this.squareVertexPositionBuffer.itemSize = 3;
      this.squareVertexPositionBuffer.numItems = 4;
  }
  length(vect){
      var total = 0.0;
      for(var i =0; i<vect.length; i++)
          total += vect[i] * vect[i];
      return Math.sqrt(total);
  }

  inverse = function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=a[4],h=a[5],i=a[6],j=a[7],k=a[8],l=a[9],o=a[10],m=a[11],n=a[12],p=a[13],r=a[14],s=a[15],A=c*h-d*f,B=c*i-e*f,t=c*j-g*f,u=d*i-e*h,v=d*j-g*h,w=e*j-g*i,x=k*p-l*n,y=k*r-o*n,z=k*s-m*n,C=l*r-o*p,D=l*s-m*p,E=o*s-m*r,q=1/(A*E-B*D+t*C+u*z-v*y+w*x);b[0]=(h*E-i*D+j*C)*q;b[1]=(-d*E+e*D-g*C)*q;b[2]=(p*w-r*v+s*u)*q;b[3]=(-l*w+o*v-m*u)*q;b[4]=(-f*E+i*z-j*y)*q;b[5]=(c*E-e*z+g*y)*q;b[6]=(-n*w+r*t-s*B)*q;b[7]=(k*w-o*t+m*B)*q;b[8]=(f*D-h*z+j*x)*q;b[9]=(-c*D+d*z-g*x)*q;b[10]=(n*v-p*t+s*A)*q;b[11]=(-k*v+l*t-m*A)*q;b[12]=(-f*C+h*y-i*x)*q;b[13]=(c*C-d*y+e*x)*q;b[14]=(-n*u+p*B-r*A)*q;b[15]=(k*u-l*B+o*A)*q;return b};

  multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1];b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b+a[12];c[1]=a[1]*d+a[5]*e+a[9]*b+a[13];c[2]=a[2]*d+a[6]*e+a[10]*b+a[14];return c};
  
  toMat3=function(a,b){b||(b=mat3.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[4];b[4]=a[5];b[5]=a[6];b[6]=a[8];b[7]=a[9];b[8]=a[10];return b};

  rotate=function(a,b,c,d){var e=c[0],g=c[1];c=c[2];var f=Math.sqrt(e*e+g*g+c*c);if(!f)return null;if(f!=1){f=1/f;e*=f;g*=f;c*=f}var h=Math.sin(b),i=Math.cos(b),j=1-i;b=a[0];f=a[1];var k=a[2],l=a[3],o=a[4],m=a[5],n=a[6],p=a[7],r=a[8],s=a[9],A=a[10],B=a[11],t=e*e*j+i,u=g*e*j+c*h,v=c*e*j-g*h,w=e*g*j-c*h,x=g*g*j+i,y=c*g*j+e*h,z=e*c*j+g*h;e=g*c*j-e*h;g=c*c*j+i;if(d){if(a!=d){d[12]=a[12];d[13]=a[13];d[14]=a[14];d[15]=a[15]}}else d=a;d[0]=b*t+o*u+r*v;d[1]=f*t+m*u+s*v;d[2]=k*t+n*u+A*v;d[3]=l*t+p*u+B*v;d[4]=b*w+o*x+r*y;d[5]=f*w+m*x+s*y;d[6]=k*w+n*x+A*y;d[7]=l*w+p*x+B*y;d[8]=b*z+o*e+r*g;d[9]=f*z+m*e+s*g;d[10]=k*z+n*e+A*g;d[11]=l*z+p*e+B*g;return d};

  handleKeys() {
    let newRotation = mat4.create();
    let newPosition = mat4.create();
    mat4.identity(newRotation);
    mat4.identity(newPosition);

    //pitch
    if (this.currentlyPressedKeys[73]) {
      //  i
      newRotation = this.rotate(newRotation, 0.1, [1.0, 0.0, 0.0], undefined);
    }
    if (this.currentlyPressedKeys[75]) {
      //  k
      newRotation = this.rotate(newRotation, -0.1, [1.0, 0.0, 0.0], undefined);
    }
    //yaw
    if (this.currentlyPressedKeys[74]) {
        //  j
      this.rotate(newRotation, 0.1, [0.0, 1.0, 0.0], undefined);
      mat4.translate(this.cameraPosition, this.cameraPosition, [Math.cos(10), Math.sin(10), 0]);
    }
    if (this.currentlyPressedKeys[76]) {
      // l
      this.rotate(newRotation, -0.1, [0.0, 1.0, 0.0], undefined);
    }
    //roll
    if (this.currentlyPressedKeys[85]) {
      //  u
      this.rotate(newRotation, 0.1, [0.0, 0.0, 1.0], undefined);
      
    }
    if (this.currentlyPressedKeys[79]) {
      // o
      this.rotate(newRotation, -0.1, [0.0, 0.0, 1.0], undefined);
    }

    //set this.cameraRotation based on new input
    mat4.multiply(this.cameraRotation, newRotation, this.cameraRotation);

    //use the inverse to compute movement
    let inverseMatrix = mat4.create();
    this.inverse(this.cameraRotation, inverseMatrix);

    //create a vector coming out from the camera to determine which way to move
    //for in and out movement
    var zDir = [0.0, 0.0, 1.0];
    this.multiplyVec3(inverseMatrix, zDir, undefined);
    
    //var dist = DE(this.cameraPosition); //unused since distance is computed in shader now

    dist = this.distToSurface/5

    var dist = this.distToSurface; 
    var trimDist = this.trimNum(dist.toString());      
    (document.getElementById("cameraDistance") as HTMLInputElement).value = trimDist;
    
    dist = dist/5 //camera moves 1/5 distance to surface (about);

    var zDir = [0.0, 0.0, 1.0];
    this.multiplyVec3(inverseMatrix, zDir, undefined);
    
    
    var tempPosition = [this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]];
    
    if (this.currentlyPressedKeys[87]) {
      // w
      tempPosition[0] -= dist * zDir[0];
      tempPosition[1] -= dist * zDir[1] ;
      tempPosition[2] -= dist * zDir[2];
    }
    if (this.currentlyPressedKeys[83]) {
      // s
      tempPosition[0] += dist * zDir[0];
      tempPosition[1] += dist * zDir[1];
      tempPosition[2] += dist * zDir[2];
    }
    
    //now create a vector pointing to the right as the camera would see it
    //for left-right movement
    var xDir = [1.0, 0.0, 0.0];
    this.multiplyVec3(inverseMatrix, xDir, undefined);
    
    if (this.currentlyPressedKeys[65]) {
      // a
      tempPosition[0] -= dist * xDir[0];
      tempPosition[1] -= dist * xDir[1];
      tempPosition[2] -= dist * xDir[2];
    }
    
    if (this.currentlyPressedKeys[68]) {
      // d
      tempPosition[0] += dist * xDir[0];
      tempPosition[1] += dist * xDir[1];
      tempPosition[2] += dist * xDir[2];
    }

    //calculate up vector for elevator movement
    var yDir = [0.0, 1.0, 0.0];
    this.multiplyVec3(inverseMatrix, yDir, undefined);
    
    if (this.currentlyPressedKeys[69]) {
      // e
      tempPosition[0] -= dist * yDir[0];
      tempPosition[1] -= dist * yDir[1];
      tempPosition[2] -= dist * yDir[2];
    }
    
    if (this.currentlyPressedKeys[67]) {
      // c
      tempPosition[0] += dist * yDir[0];
      tempPosition[1] += dist * yDir[1];
      tempPosition[2] += dist * yDir[2];
    }
    
    if(this.length(tempPosition) <4)
      this.cameraPosition = tempPosition;
    (document.getElementById("cameraDirectionX") as HTMLInputElement).value = (Math.round(zDir[0] * 100)/100).toString();
    (document.getElementById("cameraDirectionY") as HTMLInputElement).value = (Math.round(zDir[1] * 100)/100).toString();
    (document.getElementById("cameraDirectionZ") as HTMLInputElement).value = (Math.round(zDir[2] * 100)/100).toString();
    
    (document.getElementById("cameraPosX") as HTMLInputElement).value = (-Math.round(this.cameraPosition[0] * 100)/100).toString();
    (document.getElementById("cameraPosY") as HTMLInputElement).value = (-Math.round(this.cameraPosition[1] * 100)/100).toString();
    (document.getElementById("cameraPosZ") as HTMLInputElement).value = (-Math.round(this.cameraPosition[2] * 100)/100).toString();

    
  }

  setUniforms() {
    this.gl.uniform1i(this.shaderProgram.time, this.time);
    
    //camera
    this.gl.uniform3fv(this.shaderProgram.camera, this.cameraPosition);
    this.gl.uniformMatrix3fv(this.shaderProgram.viewRotation, false, this.toMat3(this.cameraRotation, undefined));
    
    
    //phong shading
    this.gl.uniform1f(this.shaderProgram.phong, +((document.getElementById("phong") as HTMLInputElement).checked
                || (document.getElementById("phongNoise") as HTMLInputElement).checked));      
    //noise uniforms
    this.gl.uniform1f(this.shaderProgram.phong, +((document.getElementById("noise") as HTMLInputElement).checked
                || (document.getElementById("phongNoise") as HTMLInputElement).checked)); 
    

    this.gl.uniform1f(this.shaderProgram.marble, +(document.getElementById("marble") as HTMLInputElement).checked);
    this.gl.uniform1f(this.shaderProgram.lacunarity, +(document.getElementById("lacunarity") as HTMLInputElement).value);
    this.gl.uniform1f(this.shaderProgram.gain, +(document.getElementById("gain") as HTMLInputElement).value);
    this.gl.uniform1f(this.shaderProgram.octaves, +(document.getElementById("octaves") as HTMLInputElement).value);
    this.gl.activeTexture(this.gl.TEXTURE0);
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.permTexture);
    this.gl.uniform1i(this.shaderProgram.permSampler, 0);
    
		//normal lighting
		this.gl.uniform1f(this.shaderProgram.normalLighting, +(document.getElementById("normal") as HTMLInputElement).checked);
    
    this.gl.uniform1i(this.shaderProgram.maxIterations, +(document.getElementById("maxIterations") as HTMLInputElement).value);
    
    //changing of powers
    if((document.getElementById("iteratePowers") as HTMLInputElement).checked==true){
      this.power = 8.0 + Math.cos(this.time / 10000.0) * 4.0;
      var trimPower = this.trimNum(this.power.toString());
      (document.getElementById("power") as HTMLInputElement).value = trimPower;
      document.getElementById("power").className = "checked";
    }else{
      this.power = (document.getElementById("power") as HTMLInputElement).value;
      document.getElementById("power").className = "unchecked";
    }
    
    this.gl.uniform1f(this.shaderProgram.power, this.power);
    
    this.gl.uniform1i(this.shaderProgram.antialiasing, this.aaValue);
    
    this.gl.uniform1f(this.shaderProgram.julia, +(document.getElementById("julia") as HTMLInputElement).checked);
    
    
    let colorChange = +(document.getElementById("colorChange") as HTMLInputElement).value;
    this.gl.uniform1f(this.shaderProgram.colorChange, colorChange);
    
    let ambientRed = +(document.getElementById("ambientRed") as HTMLInputElement).value;
    let ambientGreen = +(document.getElementById("ambientGreen") as HTMLInputElement).value;
    let ambientBlue = +(document.getElementById("ambientBlue") as HTMLInputElement).value;
    
    this.gl.uniform1f(this.shaderProgram.ambientRed, ambientRed);
    this.gl.uniform1f(this.shaderProgram.ambientGreen, ambientGreen);
    this.gl.uniform1f(this.shaderProgram.ambientBlue, ambientBlue);
  }
    
  drawScene() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    //load our square to draw on
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
  
    //set uniforms in shader
    this.setUniforms();

    //draw the mandelbulb
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
  
    //set the bottom left pixel to encode distance
    this.gl.uniform1f(this.shaderProgram.justDE, 1);  
    //this.gl.drawArrays(this.gl.POINTS , 0, 1);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
    var deArr = new Uint8Array(4);
    this.gl.readPixels(0 , 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, deArr);
    
    this.distToSurface = deArr[0] / 255.0 + deArr[1] / (255.0 * 255.0) + deArr[2] / (255.0 * 255 *255);
    (document.getElementById("cameraDistance") as HTMLInputElement).value = this.distToSurface.toString();
    this.gl.uniform1f(this.shaderProgram.justDE, 0);  

  }

  animate() {
      this.time = new Date().getTime();
  }

  async ngAfterViewInit() {
    this.canvas = document.getElementById("mandelBulb");
    
    this.initGL();
    await this.initShaders()
    this.initBuffers();

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.enable(this.gl.DEPTH_TEST);

    document.onkeydown = (event) => {
      this.currentlyPressedKeys[event.keyCode] = true;
      
    };
    document.onkeyup = (event) => {
      this.currentlyPressedKeys[event.keyCode] = false;
    };
  
    this.initPermTexture();
    
    const tick = () => {
      if((document.getElementById("stop") as HTMLInputElement).checked == true){
        requestAnimationFrame(tick);
        return;
      }
      this.animate();
      this.handleKeys();
      
      this.fps = 1000/(this.time - this.lastFPS );
      
      (document.getElementById("fps") as HTMLInputElement).value = (Math.round(100 * this.fps)/100).toString() ;
      this.lastFPS  = this.time;
      
      this.drawScene();
      requestAnimationFrame(tick);
    }

    tick();
  }

  showValue(name, newValue)    {
    document.getElementById(name).innerHTML=newValue;
  }

	aaChange(aaNum){
		this.aaValue = aaNum;
	}

	trimNum(num){
		return num.substr(0,7);
	}

	preset(num){
		mat4.identity(this.presetRotation);
	
		if(num == 1){

			this.resetCamera();
	
			this.cameraPosition[0] = 0.01;			
			this.cameraPosition[1] = 0.0;			
			this.cameraPosition[2] = 3.0;
			
			(document.getElementById("phong") as HTMLInputElement).checked = true;
			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("phong") as HTMLInputElement).checked = true;
			(document.getElementById("power") as HTMLInputElement).value = '8';
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = true;
			(document.getElementById("iterationValue") as HTMLInputElement).value = '10';
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue = 1;
			(document.getElementById("colorChange") as HTMLInputElement).value = '1';
			(document.getElementById("ambientRed") as HTMLInputElement).value = '0.5';
			(document.getElementById("ambientGreen") as HTMLInputElement).value = '0.5';
			(document.getElementById("ambientBlue") as HTMLInputElement).value = '0.5';
			(document.getElementById("marble") as HTMLInputElement).checked = true;
			(document.getElementById("lacunarity") as HTMLInputElement).value = '2.0';
			(document.getElementById("gain") as HTMLInputElement).value = '0.5';
			(document.getElementById("octaves") as HTMLInputElement).value = '50';
			(document.getElementById("stop") as HTMLInputElement).checked = false;

		}else if(num == 2){

			this.resetCamera();	

			mat4.rotate(this.presetRotation, this.identityMatrix, 1.0, [0.0, 1.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -1.45;
			this.cameraPosition[1] = 0.29;			
			this.cameraPosition[2] = 0.54;
			
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '11.5';
			(document.getElementById("antialiasing3") as HTMLInputElement).checked = true;
			this.aaValue = 3;
			setTimeout("document.getElementById('stop').checked = true",100);

		}else if(num == 3){

			this.resetCamera();	

			mat4.rotate(this.presetRotation, this.presetRotation, -0.25, [0.0, 1.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, -1.5, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 2.5, [0.0, 1.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -0.49;
			this.cameraPosition[1] = -1.24;			
			this.cameraPosition[2] = 0.41;
						
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("julia") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '5.015';
			(document.getElementById("antialiasing3") as HTMLInputElement).checked = true;
			this.aaValue = 3;
			setTimeout("document.getElementById('stop').checked = true",100);

		}else if(num == 4){
			
			this.resetCamera();	

			mat4.rotate(this.presetRotation, this.presetRotation, 1.0, [0.0, 1.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -1.23;
			this.cameraPosition[1] = 0.0;			
			this.cameraPosition[2] = 0.77;

			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = true;
			(document.getElementById("lacunarity") as HTMLInputElement).value = '10';
			(document.getElementById("gain") as HTMLInputElement).value = '1';
			(document.getElementById("octaves") as HTMLInputElement).value = '1';
			(document.getElementById("noise") as HTMLInputElement).checked = true;
			(document.getElementById("original") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue = 1;
			(document.getElementById("stop") as HTMLInputElement).checked = false;

		}else if(num == 5){

			this.resetCamera();

			mat4.rotate(this.presetRotation, this.presetRotation, 0.78, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 0.92, [0.0, 0.0, 1.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = 1.66;
			this.cameraPosition[1] = 1.19;			
			this.cameraPosition[2] = 2.01;

			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '7';
			(document.getElementById("phongNoise") as HTMLInputElement).checked = true;
			(document.getElementById("marble") as HTMLInputElement).checked = true;
			(document.getElementById("colorChange") as HTMLInputElement).value = '0.5';
			(document.getElementById("ambientRed") as HTMLInputElement).value = '0.7';
			(document.getElementById("ambientGreen") as HTMLInputElement).value = '0.3';
			(document.getElementById("ambientBlue") as HTMLInputElement).value = '0.9';
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue = 1;

		}else if(num == 6){

			this.resetCamera();
			
			mat4.rotate(this.presetRotation, this.presetRotation, -2.4, [0.0, 1.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = 1.24;
			this.cameraPosition[1] = 0.0;			
			this.cameraPosition[2] = -1.42;

			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = true;
			(document.getElementById("ambientRed") as HTMLInputElement).value = '0';
			(document.getElementById("ambientGreen") as HTMLInputElement).value = '0.69';
			(document.getElementById("ambientBlue") as HTMLInputElement).value = '0';
			(document.getElementById("colorChange") as HTMLInputElement).value = '0.5';
			(document.getElementById("phong") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue = 1;
			(document.getElementById("stop") as HTMLInputElement).checked = false;


		}else if(num == 7){

			this.resetCamera();

			mat4.rotate(this.presetRotation, this.presetRotation, 0.78, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 0.92, [0.0, 0.0, 1.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = 1.66;
			this.cameraPosition[1] = 1.19;			
			this.cameraPosition[2] = 2.01;
			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '4.48';
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing2") as HTMLInputElement).checked = true;
			this.aaValue = 2;

		}else if(num == 8){

			this.resetCamera();

			mat4.rotate(this.presetRotation, this.presetRotation, -0.78, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, -0.92, [0.0, 0.0, 1.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 0.75, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 9, [0.0, 1.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 5, [0.0, 0.0, 1.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -1.33;
			this.cameraPosition[1] = -2.56;			
			this.cameraPosition[2] = -1.82;
			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '3.5';
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing2") as HTMLInputElement).checked = true;
			this.aaValue = 2;

		}else if(num == 9){
			
			this.resetCamera();

			mat4.rotate(this.presetRotation, this.presetRotation, -0.78, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, -0.92, [0.0, 0.0, 1.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 0.75, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 9, [0.0, 1.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 5, [0.0, 0.0, 1.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -1.33;
			this.cameraPosition[1] = -2.56;			
			this.cameraPosition[2] = -1.82;
			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("julia") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '2';
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing2") as HTMLInputElement).checked = true;
			this.aaValue = 1;

		}else if(num == 10){

			this.resetCamera();
			
			mat4.rotate(this.presetRotation, this.presetRotation, 3.14, [1.0, 0.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = 0.05;
			this.cameraPosition[1] = 0.0;			
			this.cameraPosition[2] = -3.21;
			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("julia") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = false;
			(document.getElementById("power") as HTMLInputElement).value = '4';
			(document.getElementById("normal") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue=1;
		
		}else if(num == 11){

			this.resetCamera();
			
			mat4.rotate(this.presetRotation, this.presetRotation, 2.6, [1.0, 0.0, 0.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, -1.5, [0.0, 0.0, 1.0]);
			mat4.rotate(this.presetRotation, this.presetRotation, 3.14, [1.0, 0.0, 0.0]);
			mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);

			this.cameraPosition[0] = -1.35;
			this.cameraPosition[1] = 0.0;			
			this.cameraPosition[2] = 2.14;
			(document.getElementById("stop") as HTMLInputElement).checked = false;
			(document.getElementById("mandelbrot") as HTMLInputElement).checked = true;
			(document.getElementById("iteratePowers") as HTMLInputElement).checked = true;
			(document.getElementById("noise") as HTMLInputElement).checked = true;
			(document.getElementById("marble") as HTMLInputElement).checked = true;
			(document.getElementById("antialiasing1") as HTMLInputElement).checked = true;
			this.aaValue=1;
	}
}

	resetCamera(){
		mat4.identity(this.presetRotation);
		mat4.identity(this.cameraRotation);
		mat4.multiply(this.cameraRotation, this.presetRotation, this.cameraRotation);
	}
}
