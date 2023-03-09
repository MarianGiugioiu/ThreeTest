import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import starsImg from 'src/assets/images/stars.jpg';

@Component({
  selector: 'app-raycasting',
  templateUrl: './raycasting.component.html',
  styleUrls: ['./raycasting.component.scss']
})
export class RaycastingComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private canvasWidth = 600;
  private canvasHeight = 600;
  private dragging = false;
  private selectedObject: THREE.Mesh;
  private startPosition;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;

  widthRatio: number;
  heightRatio: number;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvasWidth / this.canvasHeight,
      1,
      1000
    );
    this.camera.position.z = 12;

    this.clock = new THREE.Clock();
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.update();

    const textureLoader = new THREE.TextureLoader();
    this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // this.directionalLight.castShadow = true;
    this.directionalLight.position.set(0, 32, 64);
    this.scene.add(this.directionalLight);

    const addNewBoxMesh = (x, y, z) => {
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshPhongMaterial({
        color: 0xfafafa,
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      boxMesh.position.set(x, y, z);
      this.scene.add(boxMesh);
    };

    addNewBoxMesh(0, 2, 0);
    addNewBoxMesh(2, 2, 0);
    addNewBoxMesh(-2, 2, 0);
    addNewBoxMesh(0, 2, -2);
    addNewBoxMesh(2, 2, -2);
    addNewBoxMesh(-2, 2, -2);
    addNewBoxMesh(0, 2, 2);
    addNewBoxMesh(2, 2, 2);
    addNewBoxMesh(-2, 2, 2);

    // middle rows
    addNewBoxMesh(0, 0, 0);
    addNewBoxMesh(2, 0, 0);
    addNewBoxMesh(-2, 0, 0);
    addNewBoxMesh(0, 0, -2);
    addNewBoxMesh(2, 0, -2);
    addNewBoxMesh(-2, 0, -2);
    addNewBoxMesh(0, 0, 2);
    addNewBoxMesh(2, 0, 2);
    addNewBoxMesh(-2, 0, 2);

    // bottom rows
    addNewBoxMesh(0, -2, 0);
    addNewBoxMesh(2, -2, 0);
    addNewBoxMesh(-2, -2, 0);
    addNewBoxMesh(0, -2, -2);
    addNewBoxMesh(2, -2, -2);
    addNewBoxMesh(-2, -2, -2);
    addNewBoxMesh(0, -2, 2);
    addNewBoxMesh(2, -2, 2);
    addNewBoxMesh(-2, -2, 2);

    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);  
      //this.controls.update();
    });

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    const onMouseMove = (event) => {
      this.mouse.x = ((event.clientX - this.canvas.offsetLeft ) / this.canvasWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - this.canvas.offsetTop) / this.canvasHeight) * 2 + 1;
      //console.log(pointer.x, pointer.y);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.dragging) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersect = this.raycaster.intersectObject(this.selectedObject)[0];
        if (intersect) {
          const position = intersect.point.sub(this.startPosition);
          this.selectedObject.position.copy(position);
        }
      }
      
    };

    const onMouseDown = (event) => {
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      // change color of the closest object intersecting the raycaster
      if (intersects.length > 0) {
        this.selectedObject = intersects[0].object  as THREE.Mesh;
        (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
        this.dragging = true;
        this.startPosition = intersects[0].point.sub(this.selectedObject.position);
      }
    };

    const onMouseUp = (event) => {
      (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
      this.dragging = false;
    };

    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('mouseup', onMouseUp);
  }

  onWindowResize() {
    // this.canvasWidth = window.innerWidth / 2;
    // this.canvasHeight = window.innerHeight / 2;
    this.camera.aspect = this.canvasWidth / this.canvasHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
  }
}
