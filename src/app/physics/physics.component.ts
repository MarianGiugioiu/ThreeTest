import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CannonDebugger from 'cannon-es-debugger';

@Component({
  selector: 'app-physics',
  templateUrl: './physics.component.html',
  styleUrls: ['./physics.component.scss']
})
export class PhysicsComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbit: OrbitControls;

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    ambientLight.intensity = 4;

    const axesHelper = new THREE.AxesHelper(8);

    this.scene.add(axesHelper);

    const textureLoader = new THREE.TextureLoader();

    this.camera.position.set(-10,30,30);
    this.orbit.update();

    this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.animate();

    const physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    const cannonDebugger = CannonDebugger(this.scene, physicsWorld, {
      //color: 0xff0000
    })

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(groundBody);

    // const radius = 1;
    // const sphereBody = new CANNON.Body({
    //   mass: 5,
    //   shape: new CANNON.Sphere(radius),
    // });
    // sphereBody.position.set(0, 7, 0);
    // physicsWorld.addBody(sphereBody);

    // const geometry = new THREE.SphereGeometry(radius);
    // const material = new THREE.MeshNormalMaterial();
    // const sphereMesh = new THREE.Mesh(geometry, material);
    // this.scene.add(sphereMesh);

    // const boxBody = new CANNON.Body({
    //   mass: 5,
    //   shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
    // });
    // boxBody.position.set(1, 10, 0);
    // physicsWorld.addBody(boxBody);

    // const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    // const boxMaterial = new THREE.MeshNormalMaterial();
    // const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    // this.scene.add(boxMesh);

    const carBody = new CANNON.Body({
      mass: 5,
      position: new CANNON.Vec3(0, 6, 0),
      shape: new CANNON.Box(new CANNON.Vec3(4, 0.5, 2)),
    });

    const vehicle = new CANNON.RigidVehicle({
      chassisBody: carBody
    });

    const mass = 1;
    const axisWidth = 5;
    const wheelShape = new CANNON.Sphere(1);
    const wheelMaterial = new CANNON.Material('wheel');
    const down = new CANNON.Vec3(0, -1, 0);

    const wheelBody1 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody1.addShape(wheelShape);
    wheelBody1.angularDamping = 0.4;
    vehicle.addWheel({
      body: wheelBody1,
      position: new CANNON.Vec3(-2, 0, axisWidth / 2),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });

    const wheelBody2 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody2.addShape(wheelShape);
    wheelBody2.angularDamping = 0.4;
    vehicle.addWheel({
      body: wheelBody2,
      position: new CANNON.Vec3(-2, 0, -axisWidth / 2),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });

    const wheelBody3 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody3.addShape(wheelShape);
    wheelBody3.angularDamping = 0.4;
    vehicle.addWheel({
      body: wheelBody3,
      position: new CANNON.Vec3(2, 0, axisWidth / 2),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });

    const wheelBody4 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody4.addShape(wheelShape);
    wheelBody4.angularDamping = 0.4;
    vehicle.addWheel({
      body: wheelBody4,
      position: new CANNON.Vec3(2, 0, -axisWidth / 2),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });

    vehicle.addToWorld(physicsWorld);

    document.addEventListener('keydown', (event) => {
      const maxSteerVal = Math.PI / 8;
      const maxForce = 10;

      switch (event.key) {
        case 'w':
        case 'ArrowUp':
          vehicle.setWheelForce(maxForce, 0);
          vehicle.setWheelForce(maxForce, 1);
          break;

        case 's':
        case 'ArrowDown':
          vehicle.setWheelForce(-maxForce / 2, 0);
          vehicle.setWheelForce(-maxForce / 2, 1);
          break;

        case 'a':
        case 'ArrowLeft':
          vehicle.setSteeringValue(maxSteerVal, 0);
          vehicle.setSteeringValue(maxSteerVal, 1);
          break;

        case 'd':
        case 'ArrowRight':
          vehicle.setSteeringValue(-maxSteerVal, 0);
          vehicle.setSteeringValue(-maxSteerVal, 1);
          break;
      }
    });

    // reset car force to zero when key is released
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'w':
        case 'ArrowUp':
          vehicle.setWheelForce(0, 0);
          vehicle.setWheelForce(0, 1);
          break;

        case 's':
        case 'ArrowDown':
          vehicle.setWheelForce(0, 0);
          vehicle.setWheelForce(0, 1);
          break;

        case 'a':
        case 'ArrowLeft':
          vehicle.setSteeringValue(0, 0);
          vehicle.setSteeringValue(0, 1);
          break;

        case 'd':
        case 'ArrowRight':
          vehicle.setSteeringValue(0, 0);
          vehicle.setSteeringValue(0, 1);
          break;
      }
    });

    const boxGeometry = new THREE.BoxGeometry(8, 1, 4);
    const boxMaterial = new THREE.MeshNormalMaterial();
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    this.scene.add(boxMesh);

    const sphereGeometry1 = new THREE.SphereGeometry(1);
    const sphereMaterial1 = new THREE.MeshNormalMaterial();
    const sphereMesh1 = new THREE.Mesh(sphereGeometry1, sphereMaterial1);
    this.scene.add(sphereMesh1);

    const sphereGeometry2 = new THREE.SphereGeometry(1);
    const sphereMaterial2 = new THREE.MeshNormalMaterial();
    const sphereMesh2 = new THREE.Mesh(sphereGeometry2, sphereMaterial2);
    this.scene.add(sphereMesh2);

    const sphereGeometry3 = new THREE.SphereGeometry(1);
    const sphereMaterial3 = new THREE.MeshNormalMaterial();
    const sphereMesh3 = new THREE.Mesh(sphereGeometry3, sphereMaterial3);
    this.scene.add(sphereMesh3);

    const sphereGeometry4 = new THREE.SphereGeometry(1);
    const sphereMaterial4 = new THREE.MeshNormalMaterial();
    const sphereMesh4 = new THREE.Mesh(sphereGeometry4, sphereMaterial4);
    this.scene.add(sphereMesh4);

    const animate1 = () => {
      physicsWorld.fixedStep();
      cannonDebugger.update();
      // boxMesh.position.copy(boxBody.position as any);
      // boxMesh.quaternion.copy(boxBody.quaternion as any);
      // sphereMesh.position.copy(sphereBody.position as any);
      // sphereMesh.quaternion.copy(sphereBody.quaternion as any);
      boxMesh.position.copy(carBody.position as any);
      boxMesh.quaternion.copy(carBody.quaternion as any);
      sphereMesh1.position.copy(wheelBody1.position as any);
      sphereMesh1.quaternion.copy(wheelBody1.quaternion as any);
      sphereMesh2.position.copy(wheelBody2.position as any);
      sphereMesh2.quaternion.copy(wheelBody2.quaternion as any);
      sphereMesh3.position.copy(wheelBody3.position as any);
      sphereMesh3.quaternion.copy(wheelBody3.quaternion as any);
      sphereMesh4.position.copy(wheelBody4.position as any);
      sphereMesh4.quaternion.copy(wheelBody4.quaternion as any);
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
