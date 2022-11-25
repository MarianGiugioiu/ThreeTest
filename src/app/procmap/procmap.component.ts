import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { createNoise2D } from 'simplex-noise';

const MAX_HEIGHT = 10;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

@Component({
  selector: 'app-procmap',
  templateUrl: './procmap.component.html',
  styleUrls: ['./procmap.component.scss']
})
export class ProcmapComponent implements OnInit {
  @ViewChild('canvasproc') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private hexagonGeometries;
  stoneGeo;
  dirtGeo;
  dirt2Geo;
  sandGeo;
  grassGeo;

  hexTexture;

  private gui: dat.GUI;

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
    //this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFEECC);
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-10,30,30);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    this.scene.add(ambientLight);
    ambientLight.intensity = 4;

    const manager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(manager);
    
    this.hexTexture = textureLoader.load('/assets/envmap.hdr');

    console.log(this.hexTexture);
    

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0,0,0);
    this.controls.dampingFactor = 0.05;
    this.controls.enableDamping = true;

    let textures = {
      dirt: await new THREE.TextureLoader().loadAsync("/assets/images/dirt.png"),
      dirt2: await new THREE.TextureLoader().loadAsync("assets/images/dirt2.jpg"),
      grass: await new THREE.TextureLoader().loadAsync("assets/images/grass.jpg"),
      sand: await new THREE.TextureLoader().loadAsync("assets/images/sand.jpg"),
      water: await new THREE.TextureLoader().loadAsync("assets/images/water.jpg"),
      stone: await new THREE.TextureLoader().loadAsync("assets/images/stone.png")
    }

    console.log(textures);
    


    this.hexagonGeometries = new THREE.BoxGeometry(0,0,0);
    this.stoneGeo = new THREE.BoxGeometry(0,0,0);
    this.dirtGeo = new THREE.BoxGeometry(0,0,0);
    this.dirt2Geo = new THREE.BoxGeometry(0,0,0);
    this.sandGeo = new THREE.BoxGeometry(0,0,0);
    this.grassGeo = new THREE.BoxGeometry(0,0,0);
    const noise2D = createNoise2D();

    for (let i = -10; i <= 10; i++) {
      for (let j = -10; j <= 10; j++) {
        let position = this.tilePosition(i, j);
        if (position.length() > 16) {
          continue;
        }

        let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
        
        noise = Math.pow(noise, 1.5) * MAX_HEIGHT; 
        this.makeHex(noise, position);
      }
    }
    let hexagonMesh = new THREE.Mesh(
      this.hexagonGeometries,
      new THREE.MeshStandardMaterial({
        color: 0xc3cfa5,
        flatShading: true
      })
    );

    var geometry = new THREE.EdgesGeometry( hexagonMesh.geometry ); // or WireframeGeometry
    var material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 2 } );
    var edges = new THREE.LineSegments( geometry, material );
    hexagonMesh.add(edges)

    this.scene.add(hexagonMesh);

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    })
  }

  tilePosition(tileX, tileY) {
    return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
  }

  hexGeometry(height, position) {
    let geo = new THREE.CylinderGeometry(1,1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);
    return geo;
  }

  makeHex(height, position) {
    let geo = this.hexGeometry(height, position);
    this.hexagonGeometries = BufferGeometryUtils.mergeBufferGeometries([this.hexagonGeometries, geo]);
    if (height > STONE_HEIGHT) {
      this.stoneGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.stoneGeo]);
    } else if (height > DIRT_HEIGHT) {
      this.dirtGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.dirtGeo]);
    }
  }
}
