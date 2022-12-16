import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { glMatrix, mat4 } from 'gl-matrix';
import * as THREE from 'three';

@Component({
  selector: 'app-webgl',
  templateUrl: './webgl.component.html',
  styleUrls: ['./webgl.component.scss']
})
export class WebglComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  gl: WebGLRenderingContext;

  constructor() { }

  ngOnInit(): void {
  }

  async ngAfterViewInit() {
    this.canvas.width = 1280 * 2;
    this.canvas.height = 739 * 2;

    this.gl = this.canvas.getContext('webgl');

    const fileLoader = new THREE.FileLoader();

    this.gl.clearColor(0.75, 0.85, 0.8, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.frontFace(this.gl.CCW);

    let vertexShaderText = await fileLoader.loadAsync("/assets/shaders/webgltest/vertexShader.vert");
    let fragmentShaderText = await fileLoader.loadAsync("/assets/shaders/webgltest/fragmentShader.frag");
    
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

    let triangleVertices = [
      0.0, 0.5, 0.0, 1.0, 1.0, 0.0,
      -0.5, -0.5, 0.0, 0.7, 0.0, 1.0,
      0.5, -0.5, 0.0, 0.1, 1.0, 0.6
    ];

    var boxVertices = 
    [ // X, Y, Z           U, V
      // Top
      -1.0, 1.0, -1.0,   0, 0,
      -1.0, 1.0, 1.0,    0, 1,
      1.0, 1.0, 1.0,     1, 1,
      1.0, 1.0, -1.0,    1, 0,

      // Left
      -1.0, 1.0, 1.0,    0, 0,
      -1.0, -1.0, 1.0,   1, 0,
      -1.0, -1.0, -1.0,  1, 1,
      -1.0, 1.0, -1.0,   0, 1,

      // Right
      1.0, 1.0, 1.0,    1, 1,
      1.0, -1.0, 1.0,   0, 1,
      1.0, -1.0, -1.0,  0, 0,
      1.0, 1.0, -1.0,   1, 0,

      // Front
      1.0, 1.0, 1.0,    1, 1,
      1.0, -1.0, 1.0,    1, 0,
      -1.0, -1.0, 1.0,    0, 0,
      -1.0, 1.0, 1.0,    0, 1,

      // Back
      1.0, 1.0, -1.0,    0, 0,
      1.0, -1.0, -1.0,    0, 1,
      -1.0, -1.0, -1.0,    1, 1,
      -1.0, 1.0, -1.0,    1, 0,

      // Bottom
      -1.0, -1.0, -1.0,   1, 1,
      -1.0, -1.0, 1.0,    1, 0,
      1.0, -1.0, 1.0,     0, 0,
      1.0, -1.0, -1.0,    0, 1,
    ];

    var boxIndices =
    [
      // Top
      0, 1, 2,
      0, 2, 3,

      // Left
      5, 4, 6,
      6, 4, 7,

      // Right
      8, 9, 10,
      8, 10, 11,

      // Front
      13, 12, 14,
      15, 14, 12,

      // Back
      16, 17, 18,
      16, 18, 19,

      // Bottom
      21, 20, 22,
      22, 20, 23
    ];

    let BoxVertexBufferObject = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, BoxVertexBufferObject);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(boxVertices), this.gl.STATIC_DRAW);

    let boxIndexBufferObject = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, boxIndexBufferObject);
	  this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), this.gl.STATIC_DRAW);

    var positionAttribLocation = this.gl.getAttribLocation(program, 'vertPosition');
	  var texCoordAttribLocation = this.gl.getAttribLocation(program, 'vertTexCoord');
    this.gl.vertexAttribPointer(
      positionAttribLocation, // Attribute location
      3, // Number of elements per attribute
      this.gl.FLOAT, // Type of elements
      false,
      5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      0 // Offset from the beginning of a single vertex to this attribute
    );
    this.gl.vertexAttribPointer(
      texCoordAttribLocation, // Attribute location
      2, // Number of elements per attribute
      this.gl.FLOAT, // Type of elements
      false,
      5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );

    this.gl.enableVertexAttribArray(positionAttribLocation);
    this.gl.enableVertexAttribArray(texCoordAttribLocation);

    let boxTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, boxTexture);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      document.getElementById('crate-image') as any
    );

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.gl.useProgram(program);

    let matWorldUniformLocation = this.gl.getUniformLocation(program, 'mWorld');
    let matviewUniformLocation = this.gl.getUniformLocation(program, 'mView');
    let matProjUniformLocation = this.gl.getUniformLocation(program, 'mProj');

    let worldMatrix = new Float32Array(16);
    let viewMatrix = new Float32Array(16);
    let projMatrix = new Float32Array(16);

    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(projMatrix, glMatrix.toRadian(45), this.canvas.width / this.canvas.height, 0.1, 1000.0);

    this.gl.uniformMatrix4fv(matWorldUniformLocation, false, worldMatrix);
    this.gl.uniformMatrix4fv(matviewUniformLocation, false, viewMatrix);
    this.gl.uniformMatrix4fv(matProjUniformLocation, false, projMatrix);

    let xRotationMatrix = new Float32Array(16);
    let yRotationMatrix = new Float32Array(16);
    let zRotationMatrix = new Float32Array(16);
    let auxMatrix = new Float32Array(16);
      
    let angle = 0;
    let identityMatrix = new Float32Array(16);
    mat4.identity(identityMatrix);
    const loop = () => {
      angle = performance.now() / 1000 / 6 * 2 * Math.PI;
      mat4.rotate(zRotationMatrix, identityMatrix, angle, [0, 0, 1]);
      mat4.rotate(yRotationMatrix, identityMatrix, angle, [0, 1, 0]);
      mat4.rotate(xRotationMatrix, identityMatrix, angle, [1, 0, 0]);
      mat4.mul(auxMatrix, zRotationMatrix, xRotationMatrix);
      mat4.mul(worldMatrix,yRotationMatrix, auxMatrix);
      this.gl.uniformMatrix4fv(matWorldUniformLocation, false, worldMatrix);

      this.gl.clearColor(0.75, 0.85, 0.8, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.gl.bindTexture(this.gl.TEXTURE_2D, boxTexture);
		  this.gl.activeTexture(this.gl.TEXTURE0);

      this.gl.drawElements(this.gl.TRIANGLES, boxIndices.length, this.gl.UNSIGNED_SHORT, 0);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

}
