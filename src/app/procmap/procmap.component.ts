import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { createNoise2D } from 'simplex-noise';
import { RGBELoader } from 'three-stdlib/loaders/RGBELoader';

let MAX_HEIGHT = 10;
let STONE_HEIGHT = MAX_HEIGHT * 0.8;
let DIRT_HEIGHT = MAX_HEIGHT * 0.7;
let GRASS_HEIGHT = MAX_HEIGHT * 0.5;
let SAND_HEIGHT = MAX_HEIGHT * 0.3;
let DIRT2_HEIGHT = MAX_HEIGHT * 0;

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

  envmap;

  size = 0.5;

  private gui: dat.GUI;

  widthRatio: number;
  heightRatio: number;

  rayCaster: THREE.Raycaster;
  mousePosition: THREE.Vector2;

  constructor() { }

  ngOnInit(): void {
    MAX_HEIGHT = 10 * this.size;
    STONE_HEIGHT = MAX_HEIGHT * 0.8;
    DIRT_HEIGHT = MAX_HEIGHT * 0.7;
    GRASS_HEIGHT = MAX_HEIGHT * 0.5;
    SAND_HEIGHT = MAX_HEIGHT * 0.3;
    DIRT2_HEIGHT = MAX_HEIGHT * 0;
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
    this.scene.background = new THREE.Color(0xFFEECC);
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-10,30,30);

    // const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    // this.scene.add(ambientLight);
    // ambientLight.intensity = 4;

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

    let pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    let envmapTexture = await new RGBELoader().loadAsync("assets/envmap.hdr");
    let rt = pmrem.fromEquirectangular(envmapTexture);
    this.envmap = rt.texture;

    let textures = {
      dirt: await new THREE.TextureLoader().loadAsync("/assets/images/dirt.png"),
      dirt2: await new THREE.TextureLoader().loadAsync("assets/images/dirt2.jpg"),
      grass: await new THREE.TextureLoader().loadAsync("assets/images/grass.jpg"),
      sand: await new THREE.TextureLoader().loadAsync("assets/images/sand.jpg"),
      water: await new THREE.TextureLoader().loadAsync("assets/images/water.jpg"),
      stone: await new THREE.TextureLoader().loadAsync("assets/images/stone.png")
    }

    this.hexagonGeometries = new THREE.BoxGeometry(0,0,0);
    this.stoneGeo = new THREE.BoxGeometry(0,0,0);
    this.dirtGeo = new THREE.BoxGeometry(0,0,0);
    this.dirt2Geo = new THREE.BoxGeometry(0,0,0);
    this.sandGeo = new THREE.BoxGeometry(0,0,0);
    this.grassGeo = new THREE.BoxGeometry(0,0,0);
    const noise2D = createNoise2D();

    for (let i = -10 / this.size; i <= 10 / this.size; i++) {
      for (let j = -10 / this.size; j <= 10 / this.size; j++) {
        let position = this.tilePosition(i, j);
        if (position.length() > 15) {
          continue;
        }

        let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
        
        noise = Math.pow(noise, 1.5) * MAX_HEIGHT; 
        this.makeHex(noise, position);
      }
    }
    // let hexagonMesh = new THREE.Mesh(
    //   this.hexagonGeometries,
    //   new THREE.MeshStandardMaterial({
    //     color: 0xc3cfa5,
    //     flatShading: true
    //   })
    // );

    // var geometry = new THREE.EdgesGeometry( hexagonMesh.geometry ); // or WireframeGeometry
    // var material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 2 } );
    // var edges = new THREE.LineSegments( geometry, material );
    // hexagonMesh.add(edges)

    // this.scene.add(hexagonMesh);

    let stoneMesh = this.hexMesh(this.stoneGeo, textures.stone);
    let grassMesh = this.hexMesh(this.grassGeo, textures.grass);
    let dirt2Mesh = this.hexMesh(this.dirt2Geo, textures.dirt2);
    let dirtMesh  = this.hexMesh(this.dirtGeo, textures.dirt);
    let sandMesh  = this.hexMesh(this.sandGeo, textures.sand);
    this.scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);

    let seaTexture = textures.water;
    seaTexture.repeat = new THREE.Vector2(1, 1);
    seaTexture.wrapS = THREE.RepeatWrapping;
    seaTexture.wrapT = THREE.RepeatWrapping;

    let seaMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
      new THREE.MeshPhysicalMaterial({
        envMap: this.envmap,
        color: new THREE.Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
        ior: 1.4,
        transmission: 1,
        transparent: true,
        envMapIntensity: 0.2, 
        roughness: 1,
        metalness: 0.025,
        roughnessMap: seaTexture,
        metalnessMap: seaTexture,
      })
    );
    seaMesh.receiveShadow = true;
    seaMesh.rotation.y = -Math.PI * 0.333 * 0.5;
    seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
    this.scene.add(seaMesh);

    let mapContainer = new THREE.Mesh(
      new THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
      new THREE.MeshPhysicalMaterial({
        envMap: this.envmap,
        map: textures.dirt,
        envMapIntensity: 0.2, 
        side: THREE.DoubleSide,
      })
    );
    mapContainer.receiveShadow = true;
    mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
    mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
    this.scene.add(mapContainer);

    let mapFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
      new THREE.MeshPhysicalMaterial({
        envMap: this.envmap,
        map: textures.dirt2,
        envMapIntensity: 0.1, 
        side: THREE.DoubleSide,
      })
    );
    mapFloor.receiveShadow = true;
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    this.scene.add(mapFloor);

    this.clouds();

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    })
  }

  tilePosition(tileX, tileY) {
    return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77 * this.size, tileY * 1.535 * this.size);
  }

  hexGeometry(height, position) {
    let geo = new THREE.CylinderGeometry(1 * this.size, 1 * this.size, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);
    return geo;
  }

  makeHex(height, position) {
    let geo = this.hexGeometry(height, position);
    this.hexagonGeometries = BufferGeometryUtils.mergeBufferGeometries([this.hexagonGeometries, geo]);
    if (height > STONE_HEIGHT) {
      this.stoneGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.stoneGeo]);
      if(Math.random() > 0.8) {
        this.stoneGeo = BufferGeometryUtils.mergeBufferGeometries([this.stoneGeo, this.stone(height, position)]);
      }
    } else if (height > DIRT_HEIGHT) {
      this.dirtGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.dirtGeo]);
      if(Math.random() > 0.8) {
        this.grassGeo = BufferGeometryUtils.mergeBufferGeometries([this.grassGeo, this.tree(height, position)]);
      }
    } else if (height > GRASS_HEIGHT) {
      this.grassGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.grassGeo]);
    } else if (height > SAND_HEIGHT) {
      this.sandGeo = BufferGeometryUtils.mergeBufferGeometries([geo, this.sandGeo]);
      if(Math.random() > 0.8) {
        this.stoneGeo = BufferGeometryUtils.mergeBufferGeometries([this.stoneGeo, this.stone(height, position)]);
      }
    } else if (height > DIRT2_HEIGHT) {
      this.dirt2Geo = BufferGeometryUtils.mergeBufferGeometries([geo, this.dirt2Geo]);
    }
  }

  hexMesh(geo, map) {
    let mat = new THREE.MeshPhysicalMaterial({
      envMap: this.envmap,
      envMapIntensity: 0.135,
      flatShading: true,
      map
    });

    let mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  stone(height, position) {
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;
  
    const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz);
  
    return geo;
  }

  tree(height, position) {
    const treeHeight = Math.random() * this.size + 1.25;
  
    const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
    
    const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    
    const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);
  
    return BufferGeometryUtils.mergeBufferGeometries([geo, geo2, geo3]);
  }

  clouds() {
    let geo : any = new THREE.SphereGeometry(0, 0, 0); 
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);
  
    for(let i = 0; i < count; i++) {
      const puff1 = new THREE.SphereGeometry(1.2, 7, 7);
      const puff2 = new THREE.SphereGeometry(1.5, 7, 7);
      const puff3 = new THREE.SphereGeometry(0.9, 7, 7);
     
      puff1.translate(-1.85, Math.random() * 0.3, 0);
      puff2.translate(0,     Math.random() * 0.3, 0);
      puff3.translate(1.85,  Math.random() * 0.3, 0);
  
      const cloudGeo = BufferGeometryUtils.mergeBufferGeometries([puff1, puff2, puff3]);
      cloudGeo.translate( 
        Math.random() * 20 - 10, 
        Math.random() * 7 + 7, 
        Math.random() * 20 - 10
      );
      cloudGeo.rotateY(Math.random() * Math.PI * 2);
  
      geo = BufferGeometryUtils.mergeBufferGeometries([geo, cloudGeo]);
    }
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        envMap: this.envmap, 
        envMapIntensity: 0.75, 
        flatShading: true,
        // transparent: true,
        // opacity: 0.85,
      })
    );
  
    this.scene.add(mesh);
  }
}
