import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import starsImg from 'src/assets/images/stars.jpg';

@Component({
  selector: 'app-cube',
  templateUrl: './cube.component.html',
  styleUrls: ['./cube.component.scss']
})
export class CubeComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbit: OrbitControls;

  private gui: dat.GUI;

  private sphereAngle: number = 0;

  private options: any;

  widthRatio: number;
  heightRatio: number;

  rayCaster: THREE.Raycaster;
  mousePosition: THREE.Vector2;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.canvas.width = 1280 * 2;
    this.canvas.height = 739 * 2;
    this.widthRatio = this.canvas.width / window.innerWidth;
    this.heightRatio = this.canvas.height / window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);

    const axesHelper = new THREE.AxesHelper(5);

    //this.scene.add(axesHelper);

    const textureLoader = new THREE.TextureLoader();

    this.camera.position.set(-10,30,30);
    this.orbit.update;

    const boxGeometry = new THREE.BoxGeometry();
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    //this.scene.add(box);
    box.translateY(4)

    const planeGeometry = new THREE.PlaneGeometry(30,30);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    //this.scene.add(plane);
    plane.rotation.x = -0.5 * Math.PI;
    plane.receiveShadow = true;

    const gridHelper = new THREE.GridHelper(30);
    //this.scene.add(gridHelper);

    const sunGeometry = new THREE.SphereGeometry(4, 50, 50);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xD7C606,
      wireframe: true,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(sun);
    sun.position.set(0, 4, 0);

    const sphereGeometry = new THREE.SphereGeometry(4, 30, 30);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      //color: 0x0000FF,
      wireframe: false,
      map: textureLoader.load('https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/300px-Blue_Marble_2002.png')
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(sphere);
    sphere.position.set(-30, 4, 0);
    sphere.castShadow = true;

    const ambientLight = new THREE.AmbientLight(0x333333);
    this.scene.add(ambientLight);
    ambientLight.intensity = 4;

    // const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    // this.scene.add(directionalLight);
    // directionalLight.position.set(-39, 50, 0);
    // directionalLight.castShadow = true;
    // directionalLight.shadow.camera.bottom = -12;

    // const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // this.scene.add(directionalLightHelper);

    // const directionalLightShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // this.scene.add(directionalLightShadowHelper);

    // const spotLight = new THREE.SpotLight(0xFFFFFF);
    // this.scene.add(spotLight);
    // spotLight.position.set(-100, 100, 0);
    // spotLight.castShadow = true;
    // spotLight.angle = 0.2;

    // const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    // this.scene.add(spotLightHelper);

    //this.scene.fog = new THREE.Fog(0xFFFFFF, 0, 150);
    //this.scene.fog = new THREE.FogExp2(0xFFFFFF, 0.01);

    //this.renderer.setClearColor(0xFFEA00);
    
    this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    const pointLight = new THREE.PointLight(0xFFFFFF, 20, 200);
    this.scene.add(pointLight);
    pointLight.position.y= 4

    this.gui = new dat.GUI();

    this.options = {
      sphereColor: '#ffea00',
      wireframe: false,
      speed: 0.005,
      angle: 0.2,
      penumbra: 0,
      intensity: 1
    }
    this.gui.addColor(this.options, 'sphereColor').onChange(e => {
      sphere.material.color.set(e);
    });
    this.gui.add(this.options, 'wireframe').onChange(e => {
      sphere.material.wireframe = e;
    })
    this.gui.add(this.options, 'speed', 0, 0.1);

    this.gui.add(this.options, 'angle', 0, 1);
    this.gui.add(this.options, 'penumbra', 0, 1);
    this.gui.add(this.options, 'intensity', 0, 1);

    this.mousePosition = new THREE.Vector2();

    console.log(this.scene.children);
    

    window.addEventListener('mousemove', e => {
      this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = (e.clientY / window.innerHeight) * 2 - 1;
      //this.mousePosition.x = 0;
      //this.mousePosition.y = 0;
      //console.log(this.mousePosition);
      
    })

    this.rayCaster = new THREE.Raycaster();

    this.renderer.setAnimationLoop((time) => {
      this.animateRayCaster();
      this.animateBox(time, box);
      this.animateSphere(time, sphere);
      this.animateSun(time, sun);
      this.animateSpotLight(pointLight)
    });
  }

  animateSpotLight(spotLight) {
    spotLight.intensity = this.options.intensity * 10;

    //spotLightHelper.update();
  }

  animateRayCaster() {
    this.rayCaster.setFromCamera(this.mousePosition, this.camera);
    const intersects = this.rayCaster.intersectObjects(this.scene.children);
    
    if (intersects.length) {
      console.log(intersects);
      
    }
    
  }

  animateSphere(time, sphere) {
    //this.step += this.options.speed;
    //sphere.position.y = 10 * Math.abs(Math.sin(this.step)) + 4;
    this.sphereAngle += this.options.speed
    sphere.position.x = 20 * Math.sin(this.sphereAngle);
    sphere.position.z = 20 * Math.cos(this.sphereAngle);
    sphere.rotateY(0.01);
    
    this.renderer.render(this.scene, this.camera);
  }

  animateSun(time, sun) {
    sun.rotateY(0.005);
    
    this.renderer.render(this.scene, this.camera);
  }

  animateBox(time, box) {
    box.rotation.x = time/1000;
    box.rotation.y = time/1000;
    box.rotation.z = time/1000;
    this.renderer.render(this.scene, this.camera);
  }

}
