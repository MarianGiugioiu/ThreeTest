import { Component, ElementRef, Input, OnInit, Output, ViewChild, EventEmitter, SimpleChanges } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { GeometryService } from '../common/geometry.service';
import { IPoint, IShape } from '../generate-line/generate-line.component';

@Component({
  selector: 'app-place-shapes',
  templateUrl: './place-shapes.component.html',
  styleUrls: ['./place-shapes.component.scss']
})
export class PlaceShapesComponent implements OnInit {
  @ViewChild('canvas') private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  @Input() surface: IShape;
  @Input() parts: IShape[];
  @Output() updateMinimizationEvent = new EventEmitter();
  public surfaceMesh: THREE.Mesh;
  public partMeshes: THREE.Mesh[] = [];
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
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
      if ((propName === 'parts' || propName === 'surface') && this.scene) {
        this.partMeshes.forEach(child => {
          if (child instanceof THREE.Mesh) {
            this.scene.remove(child);
          }
        });
        
        //this.drawMesh(this.surface);
        this.partMeshes = [];
        this.parts.forEach(item => this.drawMesh(item));
      } 
    }
  }

  ngOnDistroy() {
    this.renderer.dispose()
    this.renderer.forceContextLoss()
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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.update();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.font = await this.fontLoader.loadAsync("assets/fonts/Roboto Medium_Regular.json");

    //this.drawMesh(this.surface);
    this.parts.forEach(item => this.drawMesh(item));
    
    
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.controls.update();
    });
    
    // this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    // this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    // this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    window.addEventListener('resize', () => this.onWindowResize(), false);
    
  }

  // rotateMainObject(sign) {
  //   const rotationMatrix = new THREE.Matrix4().makeRotationZ(sign * this.mainObjectRotation);
  //   this.mainObject.geometry.applyMatrix4(rotationMatrix);
    
  //   this.shape.points.map((item, index) => {
  //     item.object.position.applyMatrix4(rotationMatrix);
  //     this.shape.points[index].point = new THREE.Vector2(item.object.position.x, item.object.position.y);
  //     item.text.position.set(item.object.position.x + this.textOffset.x, item.object.position.y + this.textOffset.y, 0);
  //   });
  // }

  // rotateMainObjectWithValue(value) {
  //   const rotationMatrix = new THREE.Matrix4().makeRotationZ(value);
  //   this.mainObject.geometry.applyMatrix4(rotationMatrix);
    
  //   this.shape.points.map((item, index) => {
  //     item.object.position.applyMatrix4(rotationMatrix);
  //     this.shape.points[index].point = new THREE.Vector2(item.object.position.x, item.object.position.y);
  //     item.text.position.set(item.object.position.x + this.textOffset.x, item.object.position.y + this.textOffset.y, 0);
  //   });
  // }

  // destroyShape() {
  //   this.shape.points.forEach(item => {
  //     this.scene.remove(item.object);
  //     this.scene.remove(item.text);
  //   });
  //   this.scene.remove(this.mainObject);
  // }

  createShape(shape: IShape) {
    const shapeGeometry = new THREE.Shape();
    const lastPos = shape.points.length - 1;

    shapeGeometry.moveTo(shape.points[0].point.x, shape.points[0].point.y);

    for (let i = 1; i < shape.points.length; i++) {
      
      if (shape.points[i].type === 'line') {
        shapeGeometry.lineTo(shape.points[i].point.x, shape.points[i].point.y);
      } else {
        let cp;
        if (i === lastPos) {
          cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(shape.points[i].point.x, shape.points[i].point.y), new THREE.Vector2(shape.points[i-1].point.x, shape.points[i-1].point.y), new THREE.Vector2(shape.points[0].point.x, shape.points[0].point.y));
          shapeGeometry.quadraticCurveTo(cp.x, cp.y, shape.points[0].point.x, shape.points[0].point.y);
        } else {
          let cp;
          if (i > 0) {
            cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(shape.points[i].point.x, shape.points[i].point.y), new THREE.Vector2(shape.points[i-1].point.x, shape.points[i-1].point.y), new THREE.Vector2(shape.points[i+1].point.x, shape.points[i+1].point.y));
          } else {
            cp = this.geometryService.getCurveControlPoint(new THREE.Vector2(shape.points[lastPos].point.x, shape.points[lastPos].point.y), new THREE.Vector2(shape.points[i-1].point.x, shape.points[i-1].point.y), new THREE.Vector2(shape.points[i+1].point.x, shape.points[i+1].point.y));
          }
          shapeGeometry.quadraticCurveTo(cp.x, cp.y, shape.points[i + 1].point.x, shape.points[i + 1].point.y);
          i++;
        }
      }
    }

    shapeGeometry.closePath();
    
    return new THREE.ShapeGeometry(shapeGeometry);
  }


  drawMesh(shape: IShape) {
    const texture = this.textures[shape.textureType];
    // Create a material for the lines
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.map.repeat.set(0.25, 0.25);
    material.map.offset.set(0.5, 0.5);
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    // Create a line from the geometry and material
    let mesh = new THREE.Mesh(this.createShape(shape), material);
    mesh.name = shape.name;
    if (shape.id === 0) {
      this.surfaceMesh = mesh;
    } else {
      this.partMeshes.push(mesh);
    }
    
    this.scene.add(mesh);
  }

  // movePoint(position, obj: IPoint) {
  //   obj.object.position.copy(position);
    
  //   obj.text.position.set(position.x + this.textOffset.x, position.y + this.textOffset.y, 0);
  //   obj.point = new THREE.Vector2(position.x, position.y);
    
  //   const isVAlidShape = this.geometryService.doesPolygonHaveIntersectingEdges(this.shape.points.map(item => item.point));

  //   if (!isVAlidShape) {
  //     if (!this.mainObject.visible) {
  //       this.mainObject.visible = true;
  //     }
  //     this.mainObject.geometry = this.createShape();
  //   } else {
  //     if (this.mainObject.visible) {
  //       this.mainObject.visible = false;
  //     }
  //   }
  // }

  // onMouseMove(event) {
  //   this.mouse.x = ((event.clientX - this.canvas.offsetLeft ) / this.canvasWidth) * 2 - 1;
  //   this.mouse.y = -((event.clientY - this.canvas.offsetTop) / this.canvasHeight) * 2 + 1;
  //   this.raycaster.setFromCamera(this.mouse, this.camera);

  //   if (this.dragging) {
  //     this.raycaster.setFromCamera(this.mouse, this.camera);
      
  //     const intersect = this.raycaster.intersectObject(this.selectedObject)[0];
  //     if (intersect) {
  //       const position = intersect.point.sub(this.startPosition);
  //       this.movePoint(position, this.shape.points[+(this.selectedObject.name.replace('Point_', ''))]);
  //     }
  //   }
  // };

  // onMouseDown(event) {
  //   if (this.vertexVisibility) {
  //     const intersects = this.raycaster.intersectObjects(this.scene.children);
      
  //     // change color of the closest object intersecting the raycaster
  //     if (intersects.length > 0) {
  //       this.selectedObject = intersects[0].object  as THREE.Mesh;
        
  //       if (intersects[0].object.name === 'main_object' && intersects[1] && this.vertexVisibility) {
  //         this.selectedObject = intersects[1].object  as THREE.Mesh;
  //       }
        
  //       if (this.selectedObject && this.selectedObject.name.includes('Point')) {
  //         (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
  //         this.dragging = true;
  //         this.startPosition = intersects[0].point.sub(this.selectedObject.position);
  //       }
  //     }
  //   } 
  // };

  // onMouseUp(event) {
  //   if (this.selectedObject && this.selectedObject.name.includes('Point')) {
  //     (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
  //     this.dragging = false;
  //     this.selectedObject = undefined;
  //     this.selectedAdjacentObject = undefined;
  //   }
  // };

  onKeyUp(event: KeyboardEvent) {
    if (event.key === '+' || event.key === '-' || event.key === '\\') {
      this.isKeyPressed = false;
    }
    const index = this.pressedKeys.indexOf(event.key);
    this.pressedKeys.splice(index, 1);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.pressedKeys.includes(event.key)) {
      this.pressedKeys.push(event.key);
    }

    // if (this.pressedKeys.includes('/') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('+')) {
    //   this.isKeyPressed = true;
    //   this.rotateMainObject(1);
    // }

    // if (this.pressedKeys.includes('/') && !this.pressedKeys.includes('=') && this.pressedKeys.includes('-')) {
    //   this.isKeyPressed = true;
    //   this.rotateMainObject(-1);
    // }
  }

  onWindowResize() {
    // this.canvasWidth = window.innerWidth / 2;
    // this.canvasHeight = window.innerHeight / 2;
    //this.camera.aspect = this.canvasWidth / this.canvasHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
  }
}
