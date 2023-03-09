import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import starsImg from 'src/assets/images/stars.jpg';

@Component({
  selector: 'app-generate-line',
  templateUrl: './generate-line.component.html',
  styleUrls: ['./generate-line.component.scss']
})
export class GenerateLineComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  //private camera: THREE.PerspectiveCamera;
  private camera: THREE.OrthographicCamera;
  private controls: OrbitControls;
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
    // this.camera = new THREE.PerspectiveCamera(
    //   45,
    //   this.canvasWidth / this.canvasHeight,
    //   1,
    //   1000
    // );
    this.camera = new THREE.OrthographicCamera(
      this.canvasWidth / -200, // left
      this.canvasWidth / 200, // right
      this.canvasHeight / 200, // top
      this.canvasHeight / -200, // bottom
      1, // near
      1000 // far
    );
    this.camera.position.set(0, 0, 10);

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.update();

    const textureLoader = new THREE.TextureLoader();
    this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // // this.directionalLight.castShadow = true;
    // this.directionalLight.position.set(0, 32, 64);
    // this.scene.add(this.directionalLight);

    const addNewBoxMesh = (x, y, z) => {
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshPhongMaterial({
        color: 0xfafafa,
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      boxMesh.position.set(x, y, z);
      this.scene.add(boxMesh);
    };
    //addNewBoxMesh(0, 0, 0);

    const addPoint = (x, y, z, name) => {
      const circleGeometry = new THREE.CircleGeometry(0.1, 32);

    // Create a material with white color
      const ciclreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Create a mesh from the geometry and material
      const circle = new THREE.Mesh(circleGeometry, ciclreMaterial);

      circle.position.set(x, y, z);
      circle.name = name;

      this.scene.add(circle);
    };

    addPoint(-0.5, -0.5, 0, '0');
    addPoint(0.5, -0.5, 0, '1');
    addPoint(0.5, 0.5, 0, '2');
    addPoint(-0.5, 0.5, 0, '3');

    const points = [
      new THREE.Vector2(-0.5, -0.5),
      new THREE.Vector2(-0.5, 0.5),
      new THREE.Vector2(0.5, 0.5),
      new THREE.Vector2(0.5, -0.5),
    ];
    
    // Create a shape from the points
    const shape = new THREE.Shape(points);
    
    // Create a geometry from the shape
    const geometry = new THREE.ShapeGeometry(shape, 1);
    
    // Create a material for the lines
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    
    // Create a line from the geometry and material
    const line = new THREE.Line(geometry, material);
    line.name = 'line'
    
    // Add the line to the scene
    this.scene.add(line);

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

          points[+this.selectedObject.name] = new THREE.Vector2(position.x, position.y);
          
          const shape = new THREE.Shape(points);
          
          const isClockwise = this.doesPolygonHaveIntersectingEdges(points);

          if (!isClockwise) {
            console.log("Shape is valid and has non-intersecting edges");
          } else {
            console.log("Shape is invalid and has intersecting edges");
          }
          line.geometry = new THREE.ShapeGeometry(shape);
        }
      }
      
    };

    const onMouseDown = (event) => {
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      // change color of the closest object intersecting the raycaster
      if (intersects.length > 0) {
        this.selectedObject = intersects[0].object  as THREE.Mesh;
        if (this.selectedObject.name !== 'line') {
          (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
          this.dragging = true;
          this.startPosition = intersects[0].point.sub(this.selectedObject.position);
        }
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
    //this.camera.aspect = this.canvasWidth / this.canvasHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
  }

  doesPolygonHaveIntersectingEdges(points) {
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const q1 = points[(i + 1) % numPoints];
        for (let j = i + 1; j < numPoints; j++) {
            const p2 = points[j];
            const q2 = points[(j + 1) % numPoints];
            if (this.doEdgesIntersect(p1, q1, p2, q2)) {
                return true;
            }
        }
    }
    return false;
  }
  doEdgesIntersect(p1, q1, p2, q2) {
    const dx1 = q1.x - p1.x;
    const dy1 = q1.y - p1.y;
    const dx2 = q2.x - p2.x;
    const dy2 = q2.y - p2.y;
    const cp1 = dx1 * (q2.y - p1.y) - dy1 * (q2.x - p1.x);
    const cp2 = dx1 * (p2.y - p1.y) - dy1 * (p2.x - p1.x);
    const cp3 = dx2 * (q1.y - p2.y) - dy2 * (q1.x - p2.x);
    const cp4 = dx2 * (p1.y - p2.y) - dy2 * (p1.x - p2.x);
    return (cp1 * cp2 < 0) && (cp3 * cp4 < 0);
  }
}
