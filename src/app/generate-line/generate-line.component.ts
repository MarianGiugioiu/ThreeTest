import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { GeometryService } from '../common/geometry.service';

interface IPoint {
  point?: THREE.Vector2;
  type?: string;
  object?: THREE.Mesh;
  text?: THREE.Mesh;
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
  private selectedAdjacentObject: THREE.Mesh;
  private startPosition;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private font;
  private textOffset = new THREE.Vector2(-0.06, -0.07);

  currentHeight;
  currentBh;
  mainObject: THREE.Mesh;
  heightPointMesh: THREE.Mesh;
  heightPoint: THREE.Vector2;

  points: IPoint[];

  widthRatio: number;
  heightRatio: number;

  value: number = 0;
  public isKeyPressed = false;
  sign = -1;

  textureLoader: THREE.TextureLoader;
  fontLoader: FontLoader

  constructor(
    public geometryService: GeometryService
  ) { }

  ngOnInit(): void {
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
  }

  async ngAfterViewInit() {
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
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.update();


    this.textureLoader = new THREE.TextureLoader();
    this.fontLoader = new FontLoader();
    //this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.font = await this.fontLoader.loadAsync("assets/fonts/Roboto Medium_Regular.json");

    this.drawMainObject();
    
    this.points.map((item, index) => {
      item.object = this.addPoint(item.point, `Point_${index.toString()}`);
      item.text = this.addText(item.point ,index.toString());
    });
    
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      //this.controls.update();
    });
    
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  selectVertex(i) {
    this.selectedObject = this.points[i].object;
    this.selectedAdjacentObject = undefined;
  }

  toggleVerticesVisibility() {
    this.points.forEach(item => {
      item.object.visible = !item.object.visible;
      item.text.visible = !item.text.visible;
    })
  }

  selectEdge(i) {
    if (this.selectedObject) {
      const lastPos = this.points.length - 1;
      const j = +(this.selectedObject.name.replace('Point_', ''));
      if (j === i) {
        if (i === lastPos) {
          this.selectedAdjacentObject = this.points[0].object;
        } else {
          this.selectedAdjacentObject = this.points[j + 1].object;
        }
      } else if (j === i + 1){
        if (i === -1) {
          this.selectedAdjacentObject = this.points[lastPos].object;
        } else {
          this.selectedAdjacentObject = this.points[j - 1].object;
        }
      } else {

      }
    }
  }

  getAngle(i) {
    const lastPos = this.points.length - 1;
    let point1 = this.points[i].point;
    let point2;
    let point3;
    if (i === 0) {
      point2 = this.points[lastPos].point;
      point3 = this.points[i + 1].point;
    } else if (i === lastPos) {
      point2 = this.points[i - 1].point;
      point3 = this.points[0].point;
    } else {
      point2 = this.points[i - 1].point;
      point3 = this.points[i + 1].point;
    }
    return this.geometryService.calculateAngle(point1, point2, point3).toFixed(2);
  }

  getEdgeLength(i) {
    const lastPos = this.points.length - 1;
    let point1;
    let point2;
    if (i >= 0) {
      point1 = this.points[i].point;
      if (i === lastPos) {
        point2 = this.points[0].point;
      } else {
        point2 = this.points[i + 1].point;
      }
    } else {
      point1 = this.points[0].point;
      point2 = this.points[lastPos].point;
    }
    return point1.distanceTo(point2);
  }

  addVertex(type = 'line') {
    let i = +(this.selectedObject.name.replace('Point_', ''));
    let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));
    const middle = new THREE.Vector2(
      (this.points[i].point.x + this.points[j].point.x) / 2,
      (this.points[i].point.y + this.points[j].point.y) / 2
    );
    const listLength = this.points.length;

    let newPoint = {
      point: middle,
      type,
      object: this.addPoint(middle, `Point_${listLength.toString()}`, type),
      text: this.addText(middle ,listLength.toString()),
    }

    if (j === 0) {
      this.points.push(newPoint)
    } else {
      this.points.splice(Math.max(i,j), 0, newPoint);
    }
    this.selectedObject = undefined;
    this.selectedAdjacentObject = undefined;

    this.refreshPoints();
  }

  removeVertex() {
    if (this.points.length > 3) {
      let point = this.points[+(this.selectedObject.name.replace('Point_', ''))];
      this.scene.remove(point.object);
      this.scene.remove(point.text);
      this.points.splice(+(this.selectedObject.name.replace('Point_', '')), 1);
      this.mainObject.geometry = this.createShape();
      this.refreshPoints();
    }
  }

  refreshPoints() {
    this.points.map((item, index) => {
      item.object.name = `Point_${index.toString()}`;
      item.text.geometry = new TextGeometry(index.toString(), {
        font: this.font,
        size: 0.15,
        height: 2,
        curveSegments: 10,
        bevelEnabled: false
      });
    });
  }

  createShape() {
    const shape = new THREE.Shape();

    // Move the path to the first point
    shape.moveTo(this.points[0].point.x, this.points[0].point.y);

    // Create a line to each of the other points
    for (let i = 1; i < this.points.length; i++) {
      
      if (this.points[i].type === 'line') {
        shape.lineTo(this.points[i].point.x, this.points[i].point.y);
      } else {
        if (i === this.points.length - 1) {
          shape.quadraticCurveTo(this.points[i].point.x, this.points[i].point.y, this.points[0].point.x, this.points[0].point.y);
        } else {
          shape.quadraticCurveTo(this.points[i].point.x, this.points[i].point.y, this.points[i + 1].point.x, this.points[i + 1].point.y);
          i++;
        }
      }
    }

    shape.closePath();
    
    // Create a geometry from the shape
    return new THREE.ShapeGeometry(shape);
  }

  addText(position: THREE.Vector2, text: string) {
    
    const textGeometry = new TextGeometry(text, {
      font: this.font,
      size: 0.15,
      height: 2,
      curveSegments: 10,
      bevelEnabled: false
    });

    const textMaterial = new THREE.MeshPhongMaterial({emissive:0x0000ff, emissiveIntensity: 1});
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(position.x + this.textOffset.x, position.y + this.textOffset.y, 0);
    this.scene.add(textMesh);
    
    return textMesh;
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
    this.mainObject.name = 'main_object'
    
    // Add the line to the scene
    this.scene.add(this.mainObject);
  }

  addPoint(position: THREE.Vector2, name, type = 'line') {
    let mesh;
    if(type === 'line') {
      const squareGeometry = new THREE.BoxGeometry(0.2, 0.2, 1);
  
    // Create a material with white color
      const squareMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
      // Create a mesh from the geometry and material
      mesh = new THREE.Mesh(squareGeometry, squareMaterial);
    } else {
      const circleGeometry = new THREE.CircleGeometry(0.1, 32);
  
    // Create a material with white color
      const ciclreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
      // Create a mesh from the geometry and material
      mesh = new THREE.Mesh(circleGeometry, ciclreMaterial);
    }

    mesh.position.set(position.x, position.y, 0);
    mesh.name = name;

    this.scene.add(mesh);
    return mesh;
  };

  onMouseMove(event) {
    this.mouse.x = ((event.clientX - this.canvas.offsetLeft ) / this.canvasWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - this.canvas.offsetTop) / this.canvasHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.dragging) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersect = this.raycaster.intersectObject(this.selectedObject)[0];
      if (intersect) {
        const position = intersect.point.sub(this.startPosition);
        this.selectedObject.position.copy(position);
        
        this.points[+(this.selectedObject.name.replace('Point_', ''))].text.position.set(position.x + this.textOffset.x, position.y + this.textOffset.y, 0);
        this.points[+(this.selectedObject.name.replace('Point_', ''))].point = new THREE.Vector2(position.x, position.y);
        // const A = this.geometryService.calculateAngle(this.points[2].point, this.points[1].point, this.points[3].point);
        // const B = this.geometryService.calculateAngle(this.points[1].point, this.points[2].point, this.points[3].point);
        // this.currentBh = 90 - B;
        // const C = 180 - A - B;
        // const Ch = 90 - C;
        
        const isVAlidShape = this.geometryService.doesPolygonHaveIntersectingEdges(this.points.map(item => item.point));

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

  onMouseDown(event) {
    const intersects = this.raycaster.intersectObjects(this.scene.children);

    // change color of the closest object intersecting the raycaster
    if (intersects.length > 0) {
      this.selectedObject = intersects[0].object  as THREE.Mesh;
      
      if (intersects[0].object.name === 'main_object') {
        this.selectedObject = intersects[1].object  as THREE.Mesh;
      }
      
      if (this.selectedObject && this.selectedObject.name.includes('Point')) {
        (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
        this.dragging = true;
        this.startPosition = intersects[0].point.sub(this.selectedObject.position);
      }
    }
  };

  onMouseUp(event) {
    if (this.selectedObject && this.selectedObject.name.includes('Point')) {
      (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
      this.dragging = false;
      if (this.heightPointMesh) {
        this.heightPointMesh.geometry = undefined;
        this.heightPointMesh.material= undefined;
        this.scene.remove( this.heightPointMesh );
      }
    }
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

    if (event.key === '8') {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.doubleChangeLength();
    }
    if (event.key === '9') {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.doubleChangeLength();
    }

    if(event.key === '5') {
      let [i,j,k] = this.getAdjacentPoints();

      if (this.points[i].type === 'line' && this.points[j].type === 'line' && this.points[k].type === 'line') {
        const newPoint = this.geometryService.movePointToMediatingLine(this.points[i].point, this.points[j].point, this.points[k].point);
        
        this.points[i].point = newPoint;
        this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.points[i].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
        this.mainObject.geometry = this.createShape();
      }
    }

    if (event.key === '0') {
      let [i,j,k] = this.getAdjacentPoint();
      
      if (this.points[i].type === 'line' && this.points[j].type === 'line' && this.points[k].type === 'line') {
        const newPoint = this.geometryService.equalizeEdges(this.points[i].point, this.points[j].point, this.points[k].point);
        
        this.points[j].point = newPoint;
        this.selectedAdjacentObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
        this.mainObject.geometry = this.createShape();
      }
    }
  }
  
  onKeyUp(event: KeyboardEvent) {
    if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4' || event.key === '6' || event.key === '7' || event.key === '8' || event.key === '9') {
      this.isKeyPressed = false;
      
    }
  }

  getAdjacentPoints() {
    let i = +(this.selectedObject.name.replace('Point_', ''));
    let j, k;
    const lastPos = this.points.length - 1;
    if (i === 0) {
      k = i + 1;
      j = lastPos;
    } else if (i === lastPos) {
      k = 0;
      j = i - 1;
    } else {
      k = i + 1;
      j = i - 1;
    }
    return [i, j, k];
  }

  getAdjacentPoint() {
    let i = +(this.selectedObject.name.replace('Point_', ''));
    let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));
    let k;
    if (j < i || i === this.points.length - 1) {
      k = i + 1;
      if (k === this.points.length) {
        k = 0;
      }
    } else {
      k = i - 1;
      if (k === -1) {
        k = this.points.length - 1;
      }
    }
    return [i, j, k];
  }
  
  changeAngle() {
    if (this.isKeyPressed) {
      let [i, j, k] = this.getAdjacentPoint();
      
      if (this.points[i].type === 'line' && this.points[j].type === 'line') {
        this.value += this.sign * 0.01;
        const crossProductSign = this.geometryService.getDirectionOfRotation(this.points[i].point, this.points[j].point, this.points[k].point);
        this.value *= crossProductSign;

        const newPoint = this.geometryService.rotateAroundPoint(this.points[i].point, this.points[j].point, this.value);
        const newCrossProductSign = this.geometryService.getDirectionOfRotation(this.points[i].point, newPoint, this.points[k].point);

        if (newCrossProductSign === crossProductSign) {
          this.points[j].point = newPoint;
          this.points[j].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
          this.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
  
          this.mainObject.geometry = this.createShape();
        }
      }
      setTimeout(() => {
        requestAnimationFrame(this.changeAngle.bind(this));
      }, 100);
    }
  }

  doubleChangeAngle() {
    if (this.isKeyPressed) {
      let [i,j,k] = this.getAdjacentPoints();
      
      if (this.points[i].type === 'line' && this.points[j].type === 'line' && this.points[k].type === 'line') {
        this.value += this.sign * 0.01;
        const crossProductSign = this.geometryService.getDirectionOfRotation(this.points[i].point, this.points[j].point, this.points[k].point);
        
        console.log(crossProductSign);
        if (crossProductSign !== 0) {
          this.value *= crossProductSign;
        }

        const newPointJ = this.geometryService.rotateAroundPoint(this.points[i].point, this.points[j].point, this.value);
        const newPointK = this.geometryService.rotateAroundPoint(this.points[i].point, this.points[k].point, -this.value);
        const newCrossProductSign = this.geometryService.getDirectionOfRotation(this.points[i].point, newPointJ, newPointK);

        console.log(newCrossProductSign);
        

        if (crossProductSign === 0 || newCrossProductSign === crossProductSign) {
          this.points[j].point = newPointJ;
          this.points[j].object.position.copy(new THREE.Vector3(newPointJ.x, newPointJ.y, 0));
          this.points[j].text.position.set(newPointJ.x + this.textOffset.x, newPointJ.y + this.textOffset.y, 0);
  
          this.points[k].point = newPointK
          this.points[k].object.position.copy(new THREE.Vector3(newPointK.x, newPointK.y, 0));
          this.points[k].text.position.set(newPointK.x + this.textOffset.x, newPointK.y + this.textOffset.y, 0);
    
          this.mainObject.geometry = this.createShape();
        }
      }
      
      setTimeout(() => {
        requestAnimationFrame(this.doubleChangeAngle.bind(this));
      }, 100);
    }
  }

  doubleChangeLength() {
    if (this.isKeyPressed) {
      let [i,j,k] = this.getAdjacentPoints();
      
      if (this.points[i].type === 'line' && this.points[j].type === 'line' && this.points[k].type === 'line') {
        this.value += this.sign * 0.01;
        let newPoint = this.geometryService.addToEdgeLength(this.points[i].point, this.points[j].point, this.value);
        this.points[j].point = newPoint;
        this.points[j].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);

        newPoint = this.geometryService.addToEdgeLength(this.points[i].point, this.points[k].point, this.value);
        this.points[k].point = newPoint;
        this.points[k].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.points[k].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
        this.mainObject.geometry = this.createShape();
      }
      
      setTimeout(() => {
        requestAnimationFrame(this.doubleChangeLength.bind(this));
      }, 100);
    }
  }

  changeLength() {
    if (this.isKeyPressed) {
      this.value += this.sign * 0.01;
      
      let i = +(this.selectedObject.name.replace('Point_', ''));
      let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));

      if (this.points[i].type === 'line' && this.points[j].type === 'line') {
        const newPoint = this.geometryService.addToEdgeLength(this.points[i].point, this.points[j].point, this.value);
        
        this.points[j].point = newPoint;
        this.selectedAdjacentObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
        this.mainObject.geometry = this.createShape();
      }
      
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
}
