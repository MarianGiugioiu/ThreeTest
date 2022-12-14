import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-shaders',
  templateUrl: './shaders.component.html',
  styleUrls: ['./shaders.component.scss']
})
export class ShadersComponent implements OnInit {
  @ViewChild('canvasshaders') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbit: OrbitControls;
  private clock;

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
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.clock = new THREE.Clock();
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    ambientLight.intensity = 4;

    const axesHelper = new THREE.AxesHelper(8);

    this.scene.add(axesHelper);

    const textureLoader = new THREE.TextureLoader();

    const fileLoader = new THREE.FileLoader();

    this.camera.position.set(-10,30,30);
    this.orbit.update();

    this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.animate();

    const uniformData = {
      u_time: {
        type: 'f',
        value: this.clock.getElapsedTime(),
      },
    };
    const render = () => {
      uniformData.u_time.value = this.clock.getElapsedTime();
      window.requestAnimationFrame(render);
    };
    render();

    let vertexShaderCode = await fileLoader.loadAsync("/assets/shaders/a_vertex.glsl");
    let vertexFragmentCode = await fileLoader.loadAsync("/assets/shaders/a_fragment.glsl");

    const boxGeometry = new THREE.BoxGeometry(20,20,20,40,40,40);
    const boxMaterial = new THREE.ShaderMaterial({
      //wireframe: true,
      uniforms: uniformData,
      vertexShader: vertexShaderCode as string,
      fragmentShader: vertexFragmentCode as string,
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    this.scene.add(boxMesh);
    
    const animate1 = () => {
      window.requestAnimationFrame(animate1);
    };
    animate1();
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.orbit.update();
  }

}
