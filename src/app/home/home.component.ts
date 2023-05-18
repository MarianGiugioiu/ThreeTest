import { Component, OnInit } from '@angular/core';
import { IShape } from '../generate-line/generate-line.component';
import * as THREE from 'three';
import { cloneDeep } from 'lodash';
import { GeneralService } from '../common/services/general.service';
import { EventsService } from '../common/services/events.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public shapes: IShape[] = [];
  public parts: IShape[] = [];
  public surfaceParts: IShape[] = [];
  public testParts: THREE.Mesh[] = [];
  public surface: IShape;
  public expandedShapeDetails: IShape;
  public selectedPart: IShape;
  public isEditingSurface = true;
  public isGoingToEditSurface = false;
  public cameraRatio = 4;
  public updateFromShape = false;
  public getImageData = {};
  public pendingShape;

  constructor(
    public generalService: GeneralService,
    public evensService: EventsService
    ) { }

  ngOnInit(): void {
    this.createSurface();
  }

  updateGetImageData(shape) {
    this.getImageData[shape.name] = false;
    if (this.isGoingToEditSurface) {
      this.isGoingToEditSurface = false;
      this.isEditingSurface = true;
      this.expandedShapeDetails = undefined;
    } else if (this.pendingShape) {
      this.expandedShapeDetails = this.pendingShape;
      this.pendingShape = undefined;
    } else {
      this.expandedShapeDetails = this.shapes[0];
    }
  }

  addNewShape() {
    this.selectedPart = undefined;
    this.shapes.unshift(
      {
        id: this.shapes.length + 1,
        name: this.createNewName('Shape'),
        textureType: 0,
        points:[
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
        ]
      }
    );
    if (this.expandedShapeDetails) {
      this.getImageData[this.expandedShapeDetails.name] = true;
    }
    if (this.shapes.length === 1 || !this.expandedShapeDetails) {
      this.expandedShapeDetails = this.shapes[0];
    }
  }

  createSurface() {
    this.surface = {
      id: 0,
      name: 'Surface',
      textureType: 0,
      points:[
        {
          point: new THREE.Vector2(-0.5 * this.cameraRatio, -0.5 * this.cameraRatio),
          type: 'line'
        },
        {
          point: new THREE.Vector2(-0.5 * this.cameraRatio, 0.5 * this.cameraRatio),
          type: 'line'
        },
        {
          point: new THREE.Vector2(0.5 * this.cameraRatio, 0.5 * this.cameraRatio),
          type: 'line'
        },
        {
          point: new THREE.Vector2(0.5 * this.cameraRatio, -0.5 * this.cameraRatio),
          type: 'line'
        }
      ]
    }
  }

  openShapeDetails(shape: IShape) {
    if (this.expandedShapeDetails) {
      this.pendingShape = shape;
      this.getImageData[this.expandedShapeDetails.name] = true;
    } else {
      this.expandedShapeDetails = shape;
    }
  }

  updateShapeMinimization(event, shape: IShape) {
    this.selectedPart = undefined;
    if (event === true) {
      if (shape.id === 0) {
        this.isEditingSurface = false;
      } else {
        this.expandedShapeDetails = undefined;
        this.parts = this.parts.map((item) => {
          const partId = item.partId;
          const partName = item.name;
          const rotation = item.rotation;
          if (item.id === shape.id) {
            item = cloneDeep(shape);
            item.name = partName;
            item.partId = partId;
            item.rotation = rotation;
          }
          this.rotatePart(item, -rotation);
          return item;
        });
        this.updateFromShape = true;
        this.generateSurfaceParts();
      }
    } else {
      this.expandedShapeDetails = shape;
    }
  }

  rotatePart(part: IShape, value: number) {
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(value);
    
    part.points.map((item, index) => {
      item.object.position.applyMatrix4(rotationMatrix);
      part.points[index].point = new THREE.Vector2(item.object.position.x, item.object.position.y);
    });
  }

  openSurfaceEdit() {
    if (this.expandedShapeDetails) {
      this.isGoingToEditSurface = true;
      this.getImageData[this.expandedShapeDetails.name] = true;
    } else {
      this.isEditingSurface = true;
    }
    
  }

  useShape(shape: IShape) {
    let part = cloneDeep(shape);
    part.rotation = 0;
    part.name = this.createNewName('Part');
    part.partId = this.parts.length + 1;
    this.selectedPart = part;
    this.parts.unshift(part);
    this.updateFromShape = false;
    this.generateSurfaceParts();
    
  }

  deleteShape(i: number) {
    this.parts = this.parts.filter(item => item.id !== this.shapes[i].id);
    this.shapes.splice(i, 1);
    this.generateSurfaceParts();
  }

  deletePart(i: number) {
    this.parts.splice(i, 1);
    this.generateSurfaceParts();
  }

  toggleSelectPart(part: IShape) {
    if (this.selectedPart?.partId === part.partId) {
      this.selectedPart = undefined;
    } else {
      this.selectedPart = part;
    }
  }

  choosePartFromSurface(event: number) {
    let part = this.parts.find(item => item.partId === event);
    this.selectedPart = part;
  }

  createNewName(type) {
    let list = this.shapes;
    if (type === 'Part') {
      list = this.parts;
    }
    let unnamedItems = list.filter(item => item.name.includes(type + '_'));
    let unnamedItemsNumber = unnamedItems.map(item => {
      return +item.name.replace(type + '_', '');
    });
    const nextNumber = this.generalService.findSmallestNumberNotInList(unnamedItemsNumber);
    return type + '_' + nextNumber;
  }

  updateSurfacePart(part) {
    this.surfaceParts = [...this.surfaceParts];
    let surfacePartIndex = this.surfaceParts.findIndex(item => item.partId === part.partId);
  }

  updatePartRotation() {
    this.updateFromShape = false;
    this.generateSurfaceParts();
  }

  generateSurfaceParts() {
    let positions = {};
    let rotations = {};
    this.surfaceParts.forEach(item => positions[item.name] = item.position);
    this.parts.forEach(item => {
      rotations[item.name] = item.rotation;
    });
    
    this.surfaceParts = [];
    this.parts.forEach(part => {
      this.surfaceParts.push({
        partId: part.partId,
        id: part.id,
        name: part.name,
        textureType: part.textureType,
        points: cloneDeep(part.points),
        position: positions[part.name],
        rotation: rotations[part.name]
      });
    })
  };

  getPart() {
    // let items = [];
    // this.shapes.forEach(item => items.push(item.shape));
    // return items;
    // return this.parts.map(item => item.shape);
    // return [this.surface.shape]
    
  }
  
}
