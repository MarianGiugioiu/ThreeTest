import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import starsImg from 'src/assets/images/stars.jpg';

interface IPoint {
  point?: THREE.Vector2;
  type?: string;
  object?: THREE.Mesh;
}

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
  private canvasWidth = 600;
  private canvasHeight = 600;
  private dragging = false;
  private selectedObject: THREE.Mesh;
  private startPosition;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;

  private currentHeight;
  private currentBh;
  private mainObject: THREE.Mesh;
  private heightPointMesh: THREE.Mesh;
  private heightPoint: THREE.Vector2;

  private points: IPoint[];

  widthRatio: number;
  heightRatio: number;

  value: number = 0;
  public isKeyPressed = false;
  sign = -1;

  textureLoader: THREE.TextureLoader;

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
    this.camera = new THREE.OrthographicCamera(
      this.canvasWidth / -200, // left
      this.canvasWidth / 200, // right
      this.canvasHeight / 200, // top
      this.canvasHeight / -200, // bottom
      1, // near
      1000 // far
    );
    this.camera.position.set(0, 0, 10);

    this.textureLoader = new THREE.TextureLoader();
    //this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.points = [
      {
        point: new THREE.Vector2(-0.5, -0.5),
        type: 'line'
      },
      {
        point: new THREE.Vector2(-0.5, 0.5),
        type: 'line'
      },
      {
        point: new THREE.Vector2(0.5, 0.5),
        type: 'line'
      },
      {
        point: new THREE.Vector2(0.5, -0.5),
        type: 'line'
      }
    ];

    this.drawMainObject();
    
    this.points.map((item, index) => item.object = this.addPoint(item.point.x, item.point.y, index.toString()));

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
      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.dragging) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersect = this.raycaster.intersectObject(this.selectedObject)[0];
        if (intersect) {
          const position = intersect.point.sub(this.startPosition);
          this.selectedObject.position.copy(position);

          this.points[+this.selectedObject.name].point = new THREE.Vector2(position.x, position.y);
          const A = this.calculateAngle(this.points[2].point, this.points[1].point, this.points[3].point);
          const B = this.calculateAngle(this.points[1].point, this.points[2].point, this.points[3].point);
          this.currentBh = 90 - B;
          const C = 180 - A - B;
          const Ch = 90 - C;
          
          this.currentHeight = this.getHeight(this.points[2].point, this.points[1].point, this.points[3].point);
          this.heightPoint = this.getHeightPoint(this.points[2].point, this.points[1].point, this.points[3].point, this.currentHeight);
          
          const isVAlidShape = this.doesPolygonHaveIntersectingEdges(this.points.map(item => item.point));

          if (!isVAlidShape) {
            if (!this.mainObject.visible) {
              this.mainObject.visible = true;
            }
            this.mainObject.geometry = this.createShape();
          } else {
            if (this.mainObject.visible) {
              this.mainObject.visible = false;
            }
          }
        }
      }
    };

    const onMouseDown = (event) => {
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      // change color of the closest object intersecting the raycaster
      if (intersects.length > 0) {
        this.selectedObject = intersects[0].object  as THREE.Mesh;
        if (this.selectedObject && this.selectedObject.name !== 'line') {
          (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
          this.dragging = true;
          this.startPosition = intersects[0].point.sub(this.selectedObject.position);
        }
      }
    };

    const onMouseUp = (event) => {
      if (this.selectedObject && this.selectedObject.name !== 'line') {
        (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
        this.dragging = false;
        if (this.heightPointMesh) {
          this.heightPointMesh.geometry = undefined;
          this.heightPointMesh.material= undefined;
          this.scene.remove( this.heightPointMesh );
        }
      }
    };

    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('mouseup', onMouseUp);

    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  createShape() {
    const shape = new THREE.Shape();

    // Move the path to the first point
    shape.moveTo(this.points[0].point.x, this.points[0].point.y);

    // Create a line to each of the other points
    for (let i = 1; i < this.points.length; i++) {
      shape.lineTo(this.points[i].point.x, this.points[i].point.y);
    }

    shape.closePath();
    
    // Create a geometry from the shape
    return new THREE.ShapeGeometry(shape);
  }

  drawMainObject() {
    const texture = this.textureLoader.load('https://images.unsplash.com/photo-1520699514109-b478c7b48d3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8cGF2ZW1lbnQlMjB0ZXh0dXJlfGVufDB8fDB8fA%3D%3D&w=1000&q=80');
    
    // Create a material for the lines
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.map.repeat.set(0.25, 0.25);
    material.map.offset.set(0.5, 0.5);
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    // Create a line from the geometry and material
    this.mainObject = new THREE.Mesh(this.createShape(), material);
    this.mainObject.name = 'line'
    
    // Add the line to the scene
    this.scene.add(this.mainObject);
  }

  addPoint(x, y, name) {
    const circleGeometry = new THREE.CircleGeometry(0.1, 32);

  // Create a material with white color
    const ciclreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Create a mesh from the geometry and material
    const circle = new THREE.Mesh(circleGeometry, ciclreMaterial);

    circle.position.set(x, y, 0);
    circle.name = name;

    this.scene.add(circle);
    return circle;
  };

  onKeyDown(event: KeyboardEvent) {
    if (event.key === '1') {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.changeAngle();
    }
    if (event.key === '2') {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.changeAngle();
    }

    if (event.key === '3') {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.doubleChangeAngle();
    }
    if (event.key === '4') {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.doubleChangeAngle();
    }

    if (event.key === '6') {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.changeLength();
    }
    if (event.key === '7') {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.changeLength();
    }
    if(event.key === '5') {
      const newPoint = this.movePointToMediatingLine(this.points[2].point, this.points[1].point, this.points[3].point);
      console.log(newPoint);
      
      this.points[2].point = newPoint;
      this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
      
      this.mainObject.geometry = this.createShape();
    }

    if (event.key === '8') {
      const newPoint = this.equalizeEdges(this.points[2].point, this.points[1].point, this.points[3].point);
      console.log(newPoint);
      
      this.points[1].point = newPoint;
      this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
      
      this.mainObject.geometry = this.createShape();
    }
  }
  
  onKeyUp(event: KeyboardEvent) {
    if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4' || event.key === '6' || event.key === '7') {
      this.isKeyPressed = false;
      
    }
  }
  
  changeAngle() {
    if (this.isKeyPressed) {
      this.value += this.sign * 0.01;
      
      const newPoint = this.rotateAroundPoint(this.points[2].point, this.points[1].point, this.value);
      console.log(newPoint);
      
      this.points[1].point = newPoint;
      this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));

      this.mainObject.geometry = this.createShape();
      
      setTimeout(() => {
        requestAnimationFrame(this.changeAngle.bind(this));
      }, 100);
    }
  }

  doubleChangeAngle() {
    if (this.isKeyPressed) {
      this.value += this.sign * 0.01;
      console.log(-this.value);
      
      
      this.points[1].point = this.rotateAroundPoint(this.points[2].point, this.points[1].point, this.value);

      this.points[3].point = this.rotateAroundPoint(this.points[2].point, this.points[3].point, -this.value);

      this.mainObject.geometry = this.createShape();
      
      setTimeout(() => {
        requestAnimationFrame(this.doubleChangeAngle.bind(this));
      }, 100);
    }
  }

  changeLength() {
    if (this.isKeyPressed) {
      this.value += this.sign * 0.01;
      
      const newPoint = this.addToEdgeLength(this.points[2].point, this.points[1].point, this.value);
      
      this.points[1].point = newPoint;
      this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
      
      this.mainObject.geometry = this.createShape();
      
      setTimeout(() => {
        requestAnimationFrame(this.changeLength.bind(this));
      }, 100);
    }
  }

  onWindowResize() {
    // this.canvasWidth = window.innerWidth / 2;
    // this.canvasHeight = window.innerHeight / 2;
    //this.camera.aspect = this.canvasWidth / this.canvasHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
  }

  doesPolygonHaveIntersectingEdges(points: THREE.Vector2[]) {
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
  doEdgesIntersect(p1: THREE.Vector2, q1: THREE.Vector2, p2: THREE.Vector2, q2: THREE.Vector2) {
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

  equalizeEdges(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const length = point1.distanceTo(point3);
    
    return this.changeEdgeLength(point1, point2, length);
  }

  rotateAroundPoint(point1: THREE.Vector2, point2: THREE.Vector2, angle: number) {
    return point2.clone().sub(point1).rotateAround(new THREE.Vector2(0, 0), angle).add(point1);
  }

  changeEdgeLength(point1: THREE.Vector2, point2: THREE.Vector2, length: number) {
    return point2.clone().sub(point1).normalize().multiplyScalar(length).add(point1);
  }

  addToEdgeLength(point1: THREE.Vector2, point2: THREE.Vector2, bonusLength: number) {
    const length = point1.distanceTo(point2) + bonusLength;
    return this.changeEdgeLength(point1, point2, length);
  }

  addToAngle(height: number, point1: THREE.Vector2, point2: THREE.Vector2, angle:number) {
    const length = height / Math.sin(THREE.MathUtils.degToRad(angle));
    const vector = point2.clone().sub(point1);
    const newVector = vector.clone().normalize().multiplyScalar(length);

    return point1.clone().add(newVector);
  }

  movePointToMediatingLine(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const middle = new THREE.Vector2(
      (point3.x + point2.x) / 2,
      (point3.y + point2.y) / 2
    );
    let length = point1.distanceTo(middle);
    const vectorC = point2.clone().sub(point3).normalize();
    const projectionVector = new THREE.Vector2(-vectorC.y, vectorC.x);
    if(this.isPointAboveEdge(point1, point2, point3) >= 0) {
      length = -length;
    }
    
    projectionVector.multiplyScalar(length);
    const point4 = middle.clone().add(projectionVector);
    return point4;
  }

  isPointAboveEdge(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const edgeNormal = new THREE.Vector2(-(point3.y - point2.y), point3.x - point2.x).normalize();
    const pointVector = new THREE.Vector2(point1.x - point2.x, point1.y - point2.y);
    return pointVector.dot(edgeNormal);
  }

  calculateAngle(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const vectorA = point2.clone().sub(point1);
    const vectorB = point3.clone().sub(point1);
    let angle = Math.atan2(vectorB.y, vectorB.x) - Math.atan2(vectorA.y, vectorA.x);
    angle = angle < 0 ? angle + 2 * Math.PI : angle; // convert to positive angle if negative
    angle = angle > Math.PI ? 2 * Math.PI - angle : angle;

    // Convert the angle to degrees
    const angleInDegrees = THREE.MathUtils.radToDeg(angle);
    
    return angleInDegrees;
  }

  getHeightPoint(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2, height: number) {
    const vectorC = point2.clone().sub(point3).normalize();
    const projectionVector = new THREE.Vector2(-vectorC.y, vectorC.x);
    projectionVector.multiplyScalar(height);
    const point4 = point1.clone().add(projectionVector);

    if (this.heightPointMesh) {
      this.heightPointMesh.geometry = undefined;
      this.heightPointMesh.material= undefined;
      this.scene.remove( this.heightPointMesh );
    }
    //this.heightPointMesh = this.addPoint(point4.x, point4.y, 0, 'extra');

    return point4;
  }

  getHeight(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const base = point2.distanceTo(point3);
    const height = (2 * this.getTriangleArea(point1, point2, point3)) / base;
    
    return height;
  }

  
  getTriangleArea(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) {
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    return Math.abs(ab.cross(ac)) / 2;
  }

  
}
