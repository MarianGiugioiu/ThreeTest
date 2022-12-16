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
    let susanModelJSON = await fileLoader.loadAsync("/assets/json/Susan.json");
    let susanModel = JSON.parse(susanModelJSON as string);
    
    
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

    let susanVertices = susanModel.meshes[0].vertices;
    let susanIndices = [].concat.apply([], susanModel.meshes[0].faces);
    let susanTexCoords = susanModel.meshes[0].texturecoords[0];

    let SusanPosVertexBufferObject = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, SusanPosVertexBufferObject);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(susanVertices), this.gl.STATIC_DRAW);

    let SusanTexCoordVertexBufferObject = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, SusanTexCoordVertexBufferObject);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(susanTexCoords), this.gl.STATIC_DRAW);

    let susanIndexBufferObject = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, susanIndexBufferObject);
	  this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(susanIndices), this.gl.STATIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, SusanPosVertexBufferObject);
    var positionAttribLocation = this.gl.getAttribLocation(program, 'vertPosition');
    this.gl.vertexAttribPointer(
      positionAttribLocation, // Attribute location
      3, // Number of elements per attribute
      this.gl.FLOAT, // Type of elements
      false,
      3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      0 // Offset from the beginning of a single vertex to this attribute
    );
    this.gl.enableVertexAttribArray(positionAttribLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, SusanTexCoordVertexBufferObject);
    var texCoordAttribLocation = this.gl.getAttribLocation(program, 'vertTexCoord');
    this.gl.vertexAttribPointer(
      texCoordAttribLocation, // Attribute location
      2, // Number of elements per attribute
      this.gl.FLOAT, // Type of elements
      false,
      2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      0// Offset from the beginning of a single vertex to this attribute
    );
    this.gl.enableVertexAttribArray(texCoordAttribLocation);

    let susanTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, susanTexture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
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

      this.gl.bindTexture(this.gl.TEXTURE_2D, susanTexture);
		  this.gl.activeTexture(this.gl.TEXTURE0);

      this.gl.drawElements(this.gl.TRIANGLES, susanIndices.length, this.gl.UNSIGNED_SHORT, 0);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

}
