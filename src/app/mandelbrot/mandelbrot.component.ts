import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { glMatrix, mat4 } from 'gl-matrix';
import * as THREE from 'three';

@Component({
  selector: 'app-mandelbrot',
  templateUrl: './mandelbrot.component.html',
  styleUrls: ['./mandelbrot.component.scss']
})
export class MandelbrotComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  gl: WebGLRenderingContext;

  constructor() { }

  ngOnInit(): void {
  }

  async ngAfterViewInit() {

    this.gl = this.canvas.getContext('webgl');

    const fileLoader = new THREE.FileLoader();

    // this.gl.enable(this.gl.DEPTH_TEST);
    // this.gl.enable(this.gl.CULL_FACE);
    // this.gl.cullFace(this.gl.BACK);
    // this.gl.frontFace(this.gl.CCW);

    let vertexShaderText = await fileLoader.loadAsync("/assets/shaders/mandelbrot/vertexShader.vert");
    let fragmentShaderText = await fileLoader.loadAsync("/assets/shaders/mandelbrot/fragmentShader.frag");
    
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

    let program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);

    this.gl.linkProgram(program);

    if(!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Error linking program', this.gl.getProgramInfoLog(program));
      return;
    }

    this.gl.useProgram(program);

    var uniforms = {
      viewportDimensions: this.gl.getUniformLocation(program, 'viewportDimensions'),
      minI: this.gl.getUniformLocation(program, 'minI'),
      maxI: this.gl.getUniformLocation(program, 'maxI'),
      minR: this.gl.getUniformLocation(program, 'minR'),
      maxR: this.gl.getUniformLocation(program, 'maxR')
    }

    var vpDimensions = [this.canvas.clientWidth, this.canvas.clientHeight];
    var minI = -2.0;
    var maxI = 2.0;
    var minR = -2.0;
    var maxR = 2.0;
    // var minR = -0.2070035701573997;
    // var maxR = -0.2058979527517162;
    // var minI = 0.6437000938543829;
    // var maxI = 0.6447288185269139;

    var vertexBuffer = this.gl.createBuffer();
    var vertices = [
      -1, 1,
      -1, -1,
      1, -1,
      
      -1, 1,
      1, 1,
      1, -1
    ];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    var vPosAttrib = this.gl.getAttribLocation(program, 'vPos');
    this.gl.vertexAttribPointer(
      vPosAttrib,
      2, this.gl.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.gl.enableVertexAttribArray(vPosAttrib);

    var thisframetime;
    var lastframetime = performance.now();
    var dt;
    var frames = [];
    var lastPrintTime = performance.now();
    
    const loop = () => {
      thisframetime = performance.now();
      dt = thisframetime - lastframetime;
      lastframetime = thisframetime;
      frames.push(dt);
      if (lastPrintTime + 750 < thisframetime) {
        lastPrintTime = thisframetime;
        var average = 0;
        for (var i = 0; i < frames.length; i++) {
          average += frames[i];
        }
        average /= frames.length;
        document.title = 1000 / average + ' fps';
      }
      frames = frames.slice(0, 250);

      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.gl.uniform2fv(uniforms.viewportDimensions, vpDimensions);
      this.gl.uniform1f(uniforms.minI, minI);
      this.gl.uniform1f(uniforms.maxI, maxI);
      this.gl.uniform1f(uniforms.minR, minR);
      this.gl.uniform1f(uniforms.maxR, maxR);

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const OnResizeWindow = () => {
      if (!this.canvas) {
        return;
      }
      
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      vpDimensions = [this.canvas.clientWidth, this.canvas.clientHeight];

      var oldRealRange = maxR - minR;
      var newRealRange = (maxI - minI) * (this.canvas.clientWidth / this.canvas.clientHeight) / 1.4;

      minR -= (newRealRange - oldRealRange) / 2;
      maxR = (maxI - minI) * (this.canvas.clientWidth / this.canvas.clientHeight) / 1.4 + minR;

      console.log(minR, maxR, minI, maxI);
      
      
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    function OnZoom(e) {
      var imaginaryRange = maxI - minI;
      var newRange;
      if (e.deltaY < 0) {
        newRange = imaginaryRange * 0.95;
      } else {
        newRange = imaginaryRange * 1.05;
      }
  
      var delta = newRange - imaginaryRange;
  
      minI -= delta / 2;
      maxI = minI + newRange;
  
      OnResizeWindow();
    }
  
    function OnMouseMove(e) {
      if (e.buttons === 1) {
        var iRange = maxI - minI;
        var rRange = maxR - minR;
  
        var iDelta = (e.movementY / this.canvas.clientHeight) * iRange;
        var rDelta = (e.movementX / this.canvas.clientWidth) * rRange;
  
        minI += iDelta;
        maxI += iDelta;
        minR -= rDelta;
        maxR -= rDelta;
      }
    }

    OnResizeWindow();
    this.AddEvent(window, 'resize', OnResizeWindow);
    this.AddEvent(window, 'wheel', OnZoom);
    this.AddEvent(window, 'mousemove', OnMouseMove);
  }

  AddEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
  };
  
  RemoveEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.removeEventListener) {
        object.removeEventListener(type, callback, false);
    } else if (object.detachEvent) {
        object.detachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
  };

}
