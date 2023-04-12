import { Component, ElementRef, Input, OnInit, Output, ViewChild, EventEmitter, SimpleChanges } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { GeometryService } from '../common/geometry.service';

export interface IPoint {
  name?: string;
  point?: THREE.Vector2;
  type?: string;
  object?: THREE.Mesh;
  text?: THREE.Mesh;
}

export interface IShape {
  partId?: number;
  id?: number;
  name?: string;
  textureType?: number;
  points?: IPoint[];
  wasInitialized?: boolean;
  position?: THREE.Vector3;
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

  @Input() shape: IShape;
  @Input() isCanvasMinimized;
  @Input() canDoActions;
  @Input() isPart;
  @Input() isSurface;
  @Output() updateMinimizationEvent = new EventEmitter();
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  //private camera: THREE.PerspectiveCamera;
  private camera: THREE.OrthographicCamera;
  private controls: OrbitControls;
  private ambientLight: THREE.AmbientLight;
  private canvasWidth = 300;
  private canvasHeight = 300;
  private dragging = false;
  public selectedObject: THREE.Mesh;
  public selectedAdjacentObject: THREE.Mesh;
  private startPosition;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private font;
  private textOffset = new THREE.Vector2(-0.06, -0.07);
  public pressedKeys = [];
  public vertexVisibility = false;
  public mainObjectRotation = Math.PI / 45;
  public regularPolygonEdgesNumber: number = 4;
  public textures = [];

  currentHeight;
  currentBh;
  mainObject: THREE.Mesh;
  heightPoint: THREE.Vector2;

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
    this.textureLoader = new THREE.TextureLoader();
    this.fontLoader = new FontLoader();
    this.textures.push(this.textureLoader.load('https://images.unsplash.com/photo-1520699514109-b478c7b48d3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8cGF2ZW1lbnQlMjB0ZXh0dXJlfGVufDB8fDB8fA%3D%3D&w=1000&q=80'));
    //this.scene.background = textureLoader.load('https://i0.wp.com/eos.org/wp-content/uploads/2022/09/scorpius-centaurus-ob-stellar-association.jpg?fit=1200%2C675&ssl=1');
  }

  ngOnChanges(changes: SimpleChanges) {
    for (let propName in changes) {
      if (propName === 'isCanvasMinimized') {
        if (this.shape.wasInitialized) {
          this.resizeCanvas();
        }
      }
      
    }
  }

  ngOnDistroy() {
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }

  async ngAfterViewInit() {
    let ratio = 1;
    if (this.isPart) {
      this.canvasWidth = 150;
      this.canvasHeight = 150;
      ratio = 2;
    }
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;


    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.OrthographicCamera(
      this.canvasWidth / -200 * ratio, // left
      this.canvasWidth / 200 * ratio, // right
      this.canvasHeight / 200 * ratio, // top
      this.canvasHeight / -200 * ratio, // bottom
      1, // near
      1000 // far
    );
    this.camera.position.set(0, 0, 10);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.update();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.font = await this.fontLoader.loadAsync("assets/fonts/Roboto Medium_Regular.json");
    
    this.createPrimaryShape();
    this.shape.wasInitialized = true;

    if (!this.isPart) {

      this.resizeCanvas();
    }
    
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.controls.update();
    });
    
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    window.addEventListener('resize', () => this.onWindowResize(), false);
    
  }

  toggleMinimize() {
    this.isCanvasMinimized = !this.isCanvasMinimized;
    this.resizeCanvas();
    this.updateMinimizationEvent.emit(this.isCanvasMinimized);
  }

  resizeCanvas() {
    if (this.isCanvasMinimized) {
      this.canvasWidth = 150;
      this.canvasHeight = 150;
    } else {
      this.canvasWidth = 300;
      this.canvasHeight = 300;
    }
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
    this.selectedObject = undefined;
    this.selectedAdjacentObject = undefined;
    this.toggleVerticesVisibility(!this.isCanvasMinimized);
  }

  toggleVerticesVisibility(value?) {
    this.vertexVisibility = value !== undefined ? value: !this.vertexVisibility;
    this.shape.points.forEach(item => {
      item.object.visible = this.vertexVisibility;
      item.text.visible = this.vertexVisibility;
    })
  }

  rotateMainObject(sign) {
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(sign * this.mainObjectRotation);
    this.mainObject.geometry.applyMatrix4(rotationMatrix);
    
    this.shape.points.map((item, index) => {
      item.object.position.applyMatrix4(rotationMatrix);
      this.shape.points[index].point = new THREE.Vector2(item.object.position.x, item.object.position.y);
      item.text.position.set(item.object.position.x + this.textOffset.x, item.object.position.y + this.textOffset.y, 0);
    });
  }

  rotateMainObjectWithValue(value) {
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(value);
    this.mainObject.geometry.applyMatrix4(rotationMatrix);
    
    this.shape.points.map((item, index) => {
      item.object.position.applyMatrix4(rotationMatrix);
      this.shape.points[index].point = new THREE.Vector2(item.object.position.x, item.object.position.y);
      item.text.position.set(item.object.position.x + this.textOffset.x, item.object.position.y + this.textOffset.y, 0);
    });
  }

  destroyShape() {
    this.shape.points.forEach(item => {
      this.scene.remove(item.object);
      this.scene.remove(item.text);
    });
    this.scene.remove(this.mainObject);
  }

  createPrimaryShape() {
    this.drawMainObject();
    
    this.shape.points.map((item, index) => {
      item.object = this.addPoint(item.point, `Point_${index.toString()}`);
      item.object.visible = this.vertexVisibility;
      item.text = this.addText(item.point ,index.toString());
      item.text.visible = this.vertexVisibility;
    });
  }

  refreshShape() {
    this.regularPolygonEdgesNumber = 4;
    this.createRegularPolygon();
  }

  createRegularPolygon() {
    if (this.regularPolygonEdgesNumber && !isNaN(this.regularPolygonEdgesNumber) && this.regularPolygonEdgesNumber >= 3) {
      const radius = Math.sqrt(2) / 2;
      const n = this.regularPolygonEdgesNumber;
      const angle = (2 * Math.PI) / n;
      const vertices = [];

      for (let i = 0; i < n; i++) {
        const x = -radius * Math.cos(i * angle);
        const y = radius * Math.sin(i * angle);
        const vertex = new THREE.Vector2(x, y);
        vertices.push(vertex);
      }
      this.destroyShape();
      this.shape.points = [];
      vertices.forEach(item => {
        this.shape.points.push({
          point: item,
          type: 'line'
        })
      });
      this.createPrimaryShape();
      this.rotateMainObjectWithValue(Math.PI / 4);
    }
  }

  selectVertex(i) {
    this.selectedObject = this.shape.points[i].object;
    this.selectedAdjacentObject = undefined;
  }


  selectEdge(i) {
    if (this.selectedObject) {
      const lastPos = this.shape.points.length - 1;
      const j = +(this.selectedObject.name.replace('Point_', ''));
      if (j === i) {
        if (i === lastPos) {
          this.selectedAdjacentObject = this.shape.points[0].object;
        } else {
          this.selectedAdjacentObject = this.shape.points[j + 1].object;
        }
      } else if (j === i + 1){
        if (i === -1) {
          this.selectedAdjacentObject = this.shape.points[lastPos].object;
        } else {
          this.selectedAdjacentObject = this.shape.points[j - 1].object;
        }
      }
    }
  }

  isEdgeSelected(i) {
    const lastPos = this.shape.points.length - 1;
    
    if (this.selectedObject && this.selectedAdjacentObject) {
      if (i === -1) {
        if (this.shape.points[0].object?.name === this.selectedObject?.name && this.shape.points[lastPos].object?.name === this.selectedAdjacentObject?.name) {
          return true;
        }
        return false;
      } else {
        if ((i < lastPos && this.shape.points[i+1]?.object?.name === this.selectedObject?.name)) {
          if (this.shape.points[i].object.name === this.selectedAdjacentObject.name) {
            return true;
          }
          return false;
        } else if (this.shape.points[i]?.object?.name === this.selectedObject?.name) {
          if ((i < lastPos && this.shape.points[i+1].object.name === this.selectedAdjacentObject.name) || (i === lastPos && this.shape.points[0].object.name === this.selectedAdjacentObject.name)) {
            
            return true;
          }
          return false;
        }
      }
    }
  }

  getAngle(i) {
    const lastPos = this.shape.points.length - 1;
    let point1 = this.shape.points[i].point;
    let point2;
    let point3;
    if (i === 0) {
      point2 = this.shape.points[lastPos].point;
      point3 = this.shape.points[i + 1].point;
    } else if (i === lastPos) {
      point2 = this.shape.points[i - 1].point;
      point3 = this.shape.points[0].point;
    } else {
      point2 = this.shape.points[i - 1].point;
      point3 = this.shape.points[i + 1].point;
    }
    return this.geometryService.calculateAngle(point1, point2, point3).toFixed(2);
  }

  getEdgeLength(i) {
    const lastPos = this.shape.points.length - 1;
    let point1;
    let point2;
    if (i >= 0) {
      point1 = this.shape.points[i].point;
      if (i === lastPos) {
        point2 = this.shape.points[0].point;
      } else {
        point2 = this.shape.points[i + 1].point;
      }
    } else {
      point1 = this.shape.points[0].point;
      point2 = this.shape.points[lastPos].point;
    }
    return point1.distanceTo(point2);
  }

  addVertex(type = 'line') {
    if (this.selectedObject && this.selectedAdjacentObject) {
      let i = +(this.selectedObject.name.replace('Point_', ''));
      let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));
      const lastPos = this.shape.points.length - 1;
      const middle = new THREE.Vector2(
        (this.shape.points[i].point.x + this.shape.points[j].point.x) / 2,
        (this.shape.points[i].point.y + this.shape.points[j].point.y) / 2
      );
      const listLength = this.shape.points.length;
      
      let newPoint = {
        point: middle,
        type,
        object: this.addPoint(middle, `Point_${listLength.toString()}`, type),
        text: this.addText(middle ,listLength.toString()),
      }
  
      if ((j === 0 && i === lastPos) || (i === 0 && j === lastPos)) {
        this.shape.points.push(newPoint)
      } else {
        this.shape.points.splice(Math.max(i,j), 0, newPoint);
      }
      this.selectedObject = undefined;
      this.selectedAdjacentObject = undefined;
      
      this.refreshPoints();
    }
  }

  removeVertex() {
    if (this.selectedObject && this.shape.points.length > 3) {
      let point = this.shape.points[+(this.selectedObject.name.replace('Point_', ''))];
      this.scene.remove(point.object);
      this.scene.remove(point.text);
      this.shape.points.splice(+(this.selectedObject.name.replace('Point_', '')), 1);
      this.selectedObject = undefined;
      this.selectedAdjacentObject = undefined;
      this.mainObject.geometry = this.createShape();
      this.refreshPoints();
    }
  }

  refreshPoints() {
    this.shape.points.map((item, index) => {
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
    const shapeGeometry = new THREE.Shape();
    const lastPos = this.shape.points.length - 1;

    shapeGeometry.moveTo(this.shape.points[0].point.x, this.shape.points[0].point.y);

    for (let i = 1; i < this.shape.points.length; i++) {
      
      if (this.shape.points[i].type === 'line') {
        shapeGeometry.lineTo(this.shape.points[i].point.x, this.shape.points[i].point.y);
      } else {
        let cp;
        if (i === lastPos) {
          cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(this.shape.points[i].point.x, this.shape.points[i].point.y), new THREE.Vector2(this.shape.points[i-1].point.x, this.shape.points[i-1].point.y), new THREE.Vector2(this.shape.points[0].point.x, this.shape.points[0].point.y));
          shapeGeometry.quadraticCurveTo(cp.x, cp.y, this.shape.points[0].point.x, this.shape.points[0].point.y);
        } else {
          let cp;
          if (i > 0) {
            cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(this.shape.points[i].point.x, this.shape.points[i].point.y), new THREE.Vector2(this.shape.points[i-1].point.x, this.shape.points[i-1].point.y), new THREE.Vector2(this.shape.points[i+1].point.x, this.shape.points[i+1].point.y));
          } else {
            cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(this.shape.points[lastPos].point.x, this.shape.points[lastPos].point.y), new THREE.Vector2(this.shape.points[i-1].point.x, this.shape.points[i-1].point.y), new THREE.Vector2(this.shape.points[i+1].point.x, this.shape.points[i+1].point.y));
          }
          shapeGeometry.quadraticCurveTo(cp.x, cp.y, this.shape.points[i + 1].point.x, this.shape.points[i + 1].point.y);
          i++;
        }
      }
    }

    shapeGeometry.closePath();
    
    // Create a geometry from the shape
    return new THREE.ShapeGeometry(shapeGeometry);
  }

  changeShapeDimension() {
    this.shape.points.forEach(elem => {
      let value = 1.01
      if (this.sign < 0) {
        value = 1 / value;
      }
      elem.point.x *= value;
      elem.point.y *= value;
      elem.object.position.copy(new THREE.Vector3(elem.point.x, elem.point.y, 0));
      elem.text.position.set(elem.point.x + this.textOffset.x, elem.point.y + this.textOffset.y, 0);
      this.mainObject.geometry = this.createShape();
    });
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
    const texture = this.textures[this.shape.textureType];
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.map.repeat.set(0.25, 0.25);
    material.map.offset.set(0.5, 0.5);
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    this.mainObject = new THREE.Mesh(this.createShape(), material);
    this.mainObject.name = this.shape.name;
    
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

  isButtonSelected(item: IPoint) {
    return item.object?.name === this.selectedObject?.name;
  }

  updatePoint(event, axis, item: IPoint) {
    const value = event.target.value;
    
    if (!isNaN(value)) {
      let position = item.object.position;
      if (axis === 'x') {
        position.x = parseFloat(value);
        this.movePoint(position, item)
      } else {
        position.y = parseFloat(value);;
        this.movePoint(position, item)
      }
    }
  }

  updateLength(event) {
    const value = event.target.value;
    if (value && !isNaN(value) && value > 0) {
      
      let i = +(this.selectedObject.name.replace('Point_', ''));
      let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));
      const newPoint = this.geometryService.changeEdgeLength(this.shape.points[i].point, this.shape.points[j].point, value);
      
        
      this.shape.points[j].point = newPoint;
      this.selectedAdjacentObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
      this.shape.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
      
      this.mainObject.geometry = this.createShape();
    }
  }

  movePoint(position, obj: IPoint) {
    obj.object.position.copy(position);
    
    obj.text.position.set(position.x + this.textOffset.x, position.y + this.textOffset.y, 0);
    obj.point = new THREE.Vector2(position.x, position.y);
    
    const isVAlidShape = this.geometryService.doesPolygonHaveIntersectingEdges(this.shape.points.map(item => item.point));

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

  onMouseMove(event) {
    this.mouse.x = ((event.clientX - this.canvas.offsetLeft ) / this.canvasWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - this.canvas.offsetTop) / this.canvasHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.dragging) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const intersect = this.raycaster.intersectObject(this.selectedObject)[0];
      if (intersect) {
        const position = intersect.point.sub(this.startPosition);
        this.movePoint(position, this.shape.points[+(this.selectedObject.name.replace('Point_', ''))]);
      }
    }
  };

  onMouseDown(event) {
    if (!this.isPart && this.isCanvasMinimized) {
      this.toggleMinimize();
    } else {
      if (this.vertexVisibility) {
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        // change color of the closest object intersecting the raycaster
        if (intersects.length > 0) {
          this.selectedObject = intersects[0].object  as THREE.Mesh;
          
          if (intersects[0].object.name === this.shape.name && intersects[1] && this.vertexVisibility) {
            this.selectedObject = intersects[1].object  as THREE.Mesh;
          }
          
          if (this.selectedObject && this.selectedObject.name.includes('Point')) {
            (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
            this.dragging = true;
            this.startPosition = intersects[0].point.sub(this.selectedObject.position);
          }
        }
      }
    }
  };

  onMouseUp(event) {
    if (this.selectedObject && this.selectedObject.name.includes('Point')) {
      (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
      this.dragging = false;
      this.selectedObject = undefined;
      this.selectedAdjacentObject = undefined;
    }
  };

  onKeyUp(event: KeyboardEvent) {
    if (event.key === '+' || event.key === '-' || event.key === '\\') {
      this.isKeyPressed = false;
    }
    const index = this.pressedKeys.indexOf(event.key);
    this.pressedKeys.splice(index, 1);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.pressedKeys.includes(event.key) && !this.isCanvasMinimized && this.canDoActions) {
      this.pressedKeys.push(event.key);
    }

    if (this.pressedKeys.includes('/') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.rotateMainObject(1);
    }

    if (this.pressedKeys.includes('/') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.rotateMainObject(-1);
    }

    if (this.pressedKeys.includes('/') && this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.sign = 1;
      this.changeShapeDimension()
    }

    if (this.pressedKeys.includes('/') && this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.sign = -1;
      this.changeShapeDimension()
    }
    
    if (this.pressedKeys.includes('[') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.changeAngle();
    }
    if (this.pressedKeys.includes('[') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.changeAngle();
    }

    if (this.pressedKeys.includes('[') && this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.doubleChangeAngle();
    }
    if (this.pressedKeys.includes('[') && this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.doubleChangeAngle();
    }

    if (this.pressedKeys.includes(']') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.changeLength();
    }
    if (this.pressedKeys.includes(']') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.changeLength();
    }

    if (this.pressedKeys.includes(']') && this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
      this.isKeyPressed = true;
      this.sign = 1;
      this.value = 0;
      this.doubleChangeLength();
    }
    if (this.pressedKeys.includes(']') && this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
      this.isKeyPressed = true;
      this.sign = -1;
      this.value = 0;
      this.doubleChangeLength();
    }

    if(this.pressedKeys.includes('[') && this.pressedKeys.includes('\\')) {
      if (this.selectedObject) {
        let [i,j,k] = this.getAdjacentPoints();
  
        if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line' && this.shape.points[k].type === 'line') {
          const newPoint = this.geometryService.movePointToMediatingLine(this.shape.points[i].point, this.shape.points[j].point, this.shape.points[k].point);
          
          this.shape.points[i].point = newPoint;
          this.selectedObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
          this.shape.points[i].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
          
          this.mainObject.geometry = this.createShape();
        }
      }
    }

    if (this.pressedKeys.includes(']') && this.pressedKeys.includes('\\')) {
      if (this.selectedObject && this.selectedAdjacentObject) {
        let [i,j,k] = this.getAdjacentPoint();
        
        if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line' && this.shape.points[k].type === 'line') {
          const newPoint = this.geometryService.equalizeEdges(this.shape.points[i].point, this.shape.points[j].point, this.shape.points[k].point);
          
          this.shape.points[j].point = newPoint;
          this.selectedAdjacentObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
          this.shape.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
          
          this.mainObject.geometry = this.createShape();
        }
      }
    }
  }

  displayLine(i: number) {
    let lastPos = this.shape.points.length - 1;
    let j = i + 1;
    if (i === -1 || i === lastPos) {
      i = lastPos;
      j = 0;
    }
    
    if (this.shape.points[i]?.type === 'curve' || this.shape.points[j]?.type === 'curve') {
      return false;
    }

    return true;
  }

  getAdjacentPoints() {
    let i = +(this.selectedObject.name.replace('Point_', ''));
    let j, k;
    const lastPos = this.shape.points.length - 1;
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
    if (j < i || i === this.shape.points.length - 1) {
      k = i + 1;
      if (k === this.shape.points.length) {
        k = 0;
      }
    } else {
      k = i - 1;
      if (k === -1) {
        k = this.shape.points.length - 1;
      }
    }
    return [i, j, k];
  }
  
  changeAngle() {
    if (this.isKeyPressed && this.selectedObject && this.selectedAdjacentObject) {
      let [i, j, k] = this.getAdjacentPoint();
      
      if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line') {
        this.value += this.sign * 0.01;
        const crossProductSign = this.geometryService.getDirectionOfRotation(this.shape.points[i].point, this.shape.points[j].point, this.shape.points[k].point);
        this.value *= crossProductSign;

        const newPoint = this.geometryService.rotateAroundPoint(this.shape.points[i].point, this.shape.points[j].point, this.value);
        const newCrossProductSign = this.geometryService.getDirectionOfRotation(this.shape.points[i].point, newPoint, this.shape.points[k].point);

        if (crossProductSign !== 0 && newCrossProductSign === crossProductSign) {
          this.shape.points[j].point = newPoint;
          this.shape.points[j].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
          this.shape.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
  
          const isVAlidShape = this.geometryService.doesPolygonHaveIntersectingEdges(this.shape.points.map(item => item.point));

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
      setTimeout(() => {
        requestAnimationFrame(this.changeAngle.bind(this));
      }, 100);
    }
  }

  doubleChangeAngle() {
    if (this.isKeyPressed && this.selectedObject) {
      let [i,j,k] = this.getAdjacentPoints();
      
      if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line' && this.shape.points[k].type === 'line') {
        this.value += this.sign * 0.01;
        const crossProductSign = this.geometryService.getDirectionOfRotation(this.shape.points[i].point, this.shape.points[j].point, this.shape.points[k].point);
        
        if (crossProductSign !== 0) {
          this.value *= crossProductSign;
        }

        const newPointJ = this.geometryService.rotateAroundPoint(this.shape.points[i].point, this.shape.points[j].point, this.value);
        const newPointK = this.geometryService.rotateAroundPoint(this.shape.points[i].point, this.shape.points[k].point, -this.value);
        const newCrossProductSign = this.geometryService.getDirectionOfRotation(this.shape.points[i].point, newPointJ, newPointK);

        if (crossProductSign !== 0 &&  newCrossProductSign === crossProductSign) {
          this.shape.points[j].point = newPointJ;
          this.shape.points[j].object.position.copy(new THREE.Vector3(newPointJ.x, newPointJ.y, 0));
          this.shape.points[j].text.position.set(newPointJ.x + this.textOffset.x, newPointJ.y + this.textOffset.y, 0);
  
          this.shape.points[k].point = newPointK
          this.shape.points[k].object.position.copy(new THREE.Vector3(newPointK.x, newPointK.y, 0));
          this.shape.points[k].text.position.set(newPointK.x + this.textOffset.x, newPointK.y + this.textOffset.y, 0);
    
          const isVAlidShape = this.geometryService.doesPolygonHaveIntersectingEdges(this.shape.points.map(item => item.point));

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
      
      setTimeout(() => {
        requestAnimationFrame(this.doubleChangeAngle.bind(this));
      }, 100);
    }
  }

  doubleChangeLength() {
    if (this.isKeyPressed && this.selectedObject) {
      let [i,j,k] = this.getAdjacentPoints();
      
      if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line' && this.shape.points[k].type === 'line') {
        this.value += this.sign * 0.01;
        let newPoint = this.geometryService.addToEdgeLength(this.shape.points[i].point, this.shape.points[j].point, this.value);
        this.shape.points[j].point = newPoint;
        this.shape.points[j].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.shape.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);

        newPoint = this.geometryService.addToEdgeLength(this.shape.points[i].point, this.shape.points[k].point, this.value);
        this.shape.points[k].point = newPoint;
        this.shape.points[k].object.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.shape.points[k].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
        this.mainObject.geometry = this.createShape();
      }
      
      setTimeout(() => {
        requestAnimationFrame(this.doubleChangeLength.bind(this));
      }, 100);
    }
  }

  changeLength() {
    if (this.isKeyPressed && this.selectedObject && this.selectedAdjacentObject) {
      this.value += this.sign * 0.01;
      
      let i = +(this.selectedObject.name.replace('Point_', ''));
      let j = +(this.selectedAdjacentObject.name.replace('Point_', ''));

      if (this.shape.points[i].type === 'line' && this.shape.points[j].type === 'line') {
        const newPoint = this.geometryService.addToEdgeLength(this.shape.points[i].point, this.shape.points[j].point, this.value);
        
        this.shape.points[j].point = newPoint;
        this.selectedAdjacentObject.position.copy(new THREE.Vector3(newPoint.x, newPoint.y, 0));
        this.shape.points[j].text.position.set(newPoint.x + this.textOffset.x, newPoint.y + this.textOffset.y, 0);
        
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
