import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let DIM = 128;

class Spherical {
  r: number;
  theta: number
  phi: number;
  constructor(r, theta, phi) {
    this.r = r;
    this.theta = theta;
    this.phi = phi;
  }
}

@Component({
  selector: 'app-mandelbulb',
  templateUrl: './mandelbulb.component.html',
  styleUrls: ['./mandelbulb.component.scss']
})
export class MandelbulbComponent implements OnInit {
  @ViewChild('canvasmmandelbulb') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  widthRatio: number;
  heightRatio: number;

  rayCaster: THREE.Raycaster;
  mousePosition: THREE.Vector2;

  constructor() { }

  ngOnInit(): void {
  }

  async ngAfterViewInit() {
    this.canvas.width = 1280 * 2;
    this.canvas.height = 739 * 2;
    this.widthRatio = this.canvas.width / window.innerWidth;
    this.heightRatio = this.canvas.height / window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-10,30,30);

    const light = new THREE.PointLight( new THREE.Color("#FFCBBE").convertSRGBToLinear().convertSRGBToLinear(), 80, 200 );
    light.position.set(10, 20, 10);

    light.castShadow = true; 
    light.shadow.mapSize.width = 512; 
    light.shadow.mapSize.height = 512; 
    light.shadow.camera.near = 0.5; 
    light.shadow.camera.far = 500; 
    this.scene.add( light );
  
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0,0,0);
    this.controls.dampingFactor = 0.05;
    this.controls.enableDamping = true;

    for (let i = 0; i < DIM; i++) {
      for (let j = 0; j < DIM; j++) {
  
        let edge = false;
        for (let k = 0; k < DIM; k++) {
          let x = i / DIM;
          let y = j / DIM;
          let z = k / DIM;

          let zeta = new THREE.Vector3(0, 0, 0);
          let n = 8;
          let maxiterations = 20;
          let iteration = 0;
          // let dotGeometry = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3( i, j, k)] );
          // var dotMaterial = new THREE.PointsMaterial( { size: 1 } );
          // var dot = new THREE.Points( dotGeometry, dotMaterial );
          // this.scene.add( dot )
          
          while (true) {
            let c = this.spherical(zeta.x, zeta.y, zeta.z);
            let newx = Math.pow(c.r, n) * Math.sin(c.theta*n) * Math.cos(c.phi*n);
            let newy = Math.pow(c.r, n) * Math.sin(c.theta*n) * Math.sin(c.phi*n);
            let newz = Math.pow(c.r, n) * Math.cos(c.theta*n);
            zeta.x = newx + x;
            zeta.y = newy + y;
            zeta.z = newz + z;
            iteration++;

            if (c.r > 2 ) {
              if (edge) {
                edge = false;
              }
              break;
            }
            
            if (iteration > maxiterations) {
              //console.log(x,y,z);
              if (!edge) {
                edge = true;
                // let dotGeometry = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3( i, j, k)] );
                // var dotMaterial = new THREE.PointsMaterial( { size: 3, sizeAttenuation: false } );
                // var dot = new THREE.Points( dotGeometry, dotMaterial );
                // this.scene.add( dot )
              }
              break;
            }
          }
        }
      }
    }
    console.log('asd');
    

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    })
  }

  spherical(x, y, z) {
    let r = Math.sqrt(x*x + y*y + z*z);
    let theta = Math.atan2( Math.sqrt(x*x+y*y), z);
    let phi = Math.atan2(y, x);
    return new Spherical(r, theta, phi);
  }
}
