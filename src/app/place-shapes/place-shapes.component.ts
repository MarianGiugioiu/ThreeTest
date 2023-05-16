import { Component, ElementRef, Input, OnInit, Output, ViewChild, EventEmitter, SimpleChanges } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { GeometryService } from '../common/services/geometry.service';
import { IPoint, IShape } from '../generate-line/generate-line.component';
import { cloneDeep } from 'lodash';
import { EventsService } from '../common/services/events.service';

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
  @Input() selectedPart: IShape;
  @Input() updateFromShape: boolean;
  @Output() updateMinimizationEvent = new EventEmitter();
  @Output() choosePartEvent = new EventEmitter();
  public bevelMeshes = {};
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
  private startPosition;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  public pressedKeys = [];
  public vertexVisibility = false;
  public mainObjectRotation = Math.PI / 45;
  public regularPolygonEdgesNumber: number = 4;
  public textures = [];
  public cameraRatio = 4;

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
    public geometryService: GeometryService,
    public eventsService: EventsService
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
        this.scene.remove(this.surfaceMesh);
        Object.keys(this.bevelMeshes).forEach(name => {
          this.scene.remove(this.bevelMeshes[name]);
          this.bevelMeshes[name] = undefined;
        });
        
        this.drawMesh(this.surface);
        this.partMeshes = [];
        this.parts.reverse().forEach(item => this.drawMesh(item));
        if (this.partMeshes.length && this.selectedPart) {
          let mesh = this.partMeshes.find(item => item.name === this.selectedPart.name);
          this.checkMeshIntersects(mesh);
        }
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
      this.canvasWidth / -200 * this.cameraRatio, // left
      this.canvasWidth / 200 * this.cameraRatio, // right
      this.canvasHeight / 200 * this.cameraRatio, // top
      this.canvasHeight / -200 * this.cameraRatio, // bottom
      1, // near
      1000 // far
    );
    this.camera.position.set(0, 0, 10);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.update();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.drawMesh(this.surface);
    this.parts.reverse().forEach(item => this.drawMesh(item));
    if (this.partMeshes.length && this.selectedPart) {
      let mesh = this.partMeshes.find(item => item.name === this.selectedPart.name);
      this.checkMeshIntersects(mesh);
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

  getVertices(mesh: THREE.Mesh) {
    let positionArray = mesh.geometry.attributes.position.array;
    
    let vertices: THREE.Vector3[] = [];
    const matrix = mesh.matrixWorld;
    
    for (var i = 0; i < positionArray.length; i += 3) {
      var vertex = new THREE.Vector3(
        positionArray[i],
        positionArray[i + 1],
        positionArray[i + 2]
      );
      vertex.applyMatrix4(matrix);
      vertices.push(vertex);
    }
    return vertices
  }

  getMarginVertices() {

  }

  checkMeshIntersects(mesh: THREE.Mesh) {
    let bevelMesh = this.bevelMeshes[mesh.name];
    let vertices = this.getVertices(mesh);
    
    const raycaster1 = new THREE.Raycaster();
    let existsSurface = false;
    for (let vertex of vertices) {
      const direction = new THREE.Vector3(0, 0, -1);
      raycaster1.set(new THREE.Vector3(vertex.x, vertex.y, 5), direction);
      const intersect = raycaster1.intersectObject(this.surfaceMesh)[0];
      if (!intersect) {
        existsSurface = true;
      }
    }
    if (existsSurface) {
      (bevelMesh.material as THREE.MeshPhongMaterial).color.set(0xff0000);  
    } else {
      (bevelMesh.material as THREE.MeshPhongMaterial).color.set(0xffffff); 
    }

    //Lista de interstii pt fiecare (map) in true push in ambele, in false splice
    let verticesList = this.partMeshes.map(item => this.getVertices(item));
    const len = this.partMeshes.length;
    for(let i = 0; i < len - 1; i++) {
      for(let j = i + 1; j < len; j++) {
        let result = this.geometryService.doPolygonsIntersect(verticesList[i], verticesList[j]);
        let bevelMesh1 = this.bevelMeshes[this.partMeshes[i].name];
        let bevelMesh2 = this.bevelMeshes[this.partMeshes[j].name];
        if (result) {
          (bevelMesh1.material as THREE.MeshPhongMaterial).color.set(0xff0000); 
          (bevelMesh2.material as THREE.MeshPhongMaterial).color.set(0xff0000);
        } else {
          if (bevelMesh1.name !== bevelMesh.name || !existsSurface) {
            (bevelMesh1.material as THREE.MeshPhongMaterial).color.set(0xffffff); 
          }
          if (bevelMesh2.name !== bevelMesh.name || !existsSurface) {
            (bevelMesh2.material as THREE.MeshPhongMaterial).color.set(0xffffff); 
          }
        }
      }
    }

    
  }

  // checkMeshIntersects(mesh: THREE.Mesh, firstTime = false) {
  //   let otherMeshes = this.partMeshes.filter(item => {
  //     return item.name !== mesh.name;
  //   });
  //   let bevelMesh = this.bevelMeshes[mesh.name];

  //   let positionArray = mesh.geometry.attributes.position.array;
    
  //   let vertices: THREE.Vector3[] = [];
  //   const matrix = mesh.matrixWorld;
    
  //   for (var i = 0; i < positionArray.length; i += 3) {
  //     var vertex = new THREE.Vector3(
  //       positionArray[i],
  //       positionArray[i + 1],
  //       positionArray[i + 2]
  //     );
  //     if (!firstTime) {
  //       vertex.applyMatrix4(matrix);
  //     }
  //     vertices.push(vertex);
  //   }

  //   console.log(vertices);
    
    
  //   const raycaster1 = new THREE.Raycaster();
  //   if (otherMeshes.length) {
  //     let found = false;
  //     for (let vertex of vertices) {
  //       const direction = new THREE.Vector3(0, 0, -1);
  //       raycaster1.set(new THREE.Vector3(vertex.x, vertex.y, 5), direction);
  //       const intersects = raycaster1.intersectObjects(this.scene.children);
  //       intersects.forEach(item => {
  //         if (!item.object.name.includes("Surface") && !item.object.name.includes(mesh.name)) {
  //           found = true;
  //         }
  //       });
        
  //     }
  //     if (found) {
  //       (bevelMesh.material as THREE.MeshPhongMaterial).color.set(0xff0000);  
  //     } else {
  //       (bevelMesh.material as THREE.MeshPhongMaterial).color.set(0xffffff); 
  //     }
  //   }
  // }

  rotateObjectWithValue(part: IShape) {
    let value = -part.rotation;
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(value);
    let mesh = this.partMeshes.find(item => item.name === part.name);
    let bevelMesh = this.bevelMeshes[part.name];
    mesh.geometry.applyMatrix4(rotationMatrix);
    bevelMesh.geometry.applyMatrix4(rotationMatrix);
    
    part.points.map((item, index) => {
      let newPosition = new THREE.Vector3(item.point.x, item.point.y, mesh.position.z);
      newPosition.applyMatrix4(rotationMatrix);
      item.point = new THREE.Vector2(newPosition.x, newPosition.y);
    });
  }

  

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
    
    return shapeGeometry;
  }


  drawMesh(shape: IShape) {
    let isSurface = shape.name.includes('Surface');
    
    let localRatio = 4;
    const texture = this.textures[shape.textureType];
    // Create a material for the lines
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.map.repeat.set(0.25 / localRatio, 0.25 / localRatio);
    material.map.offset.set(0.5, 0.5);
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    
    // Create a line from the geometry and material
    let shapeGeometry = this.createShape(shape);
    var extrudeSettings = {
      depth: 0,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 1
    };
    let geometry = new THREE.ShapeGeometry(shapeGeometry);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 4;
    mesh.name = shape.name;
    if (shape.id === 0) {
      this.surfaceMesh = mesh;
    } else {
      this.partMeshes.push(mesh);
    }
    let bevelGeometry = new THREE.ExtrudeGeometry(shapeGeometry, extrudeSettings);
    let bevelMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    let bevelMesh = new THREE.Mesh(bevelGeometry, bevelMaterial);
    bevelMesh.position.z = 2;
    bevelMesh.name = shape.name + '_bevel';
    this.bevelMeshes[shape.name] = bevelMesh;
    this.scene.add(bevelMesh);
    
    if(shape.position) {
      mesh.position.copy(shape.position);
      bevelMesh.position.copy(new THREE.Vector3(mesh.position.x, mesh.position.y, 2))
    }

    if (isSurface) {
      mesh.position.z = 2;
      bevelMesh.position.z = 0;
    } else {
      if (this.updateFromShape) {
        // this.rotateObjectWithValue(shape);
      }
    }
    this.scene.add(mesh);
  }

  moveMesh(position: THREE.Vector3, mesh: THREE.Mesh) {
    mesh.position.copy(position);
    (this.bevelMeshes[mesh.name] as THREE.Mesh).position.copy(new THREE.Vector3(position.x, position.y, 2));
    this.selectedPart.position = position;
    this.checkMeshIntersects(mesh);
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
        this.moveMesh(position, this.selectedObject);
      }
    }
  };

  onMouseDown(event) {
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    // change color of the closest object intersecting the raycaster
    if (intersects.length > 0) {
      this.selectedObject = intersects[0].object  as THREE.Mesh;
      
      if (this.selectedObject && this.selectedObject.name.includes('Part') && !this.selectedObject.name.includes('bevel')) {
        // if (this.selectedObject.name.includes('bevel')) {
        //   this.selectedObject = this.partMeshes.find(item => item.name === this.selectedObject.name.replace('_bevel', ''));
        // }
        this.selectedPart = this.parts.find(item => item.name === this.selectedObject.name);
        // (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xff0000);
        this.dragging = true;
        this.startPosition = intersects[0].point.sub(this.selectedObject.position);
      }
    }
  };

  onMouseUp(event) {
    // (this.selectedObject.material as THREE.MeshPhongMaterial).color.set(0xffffff);
    this.dragging = false;
    this.choosePartEvent.emit(this.selectedPart.partId);
    this.selectedObject = undefined;
    this.selectedPart = undefined;
    
  };

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
  }

  onWindowResize() {
    // this.canvasWidth = window.innerWidth / 2;
    // this.canvasHeight = window.innerHeight / 2;
    //this.camera.aspect = this.canvasWidth / this.canvasHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
  }
}
