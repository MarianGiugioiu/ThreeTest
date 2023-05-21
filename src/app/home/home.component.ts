import { Component, OnInit, ViewChild } from '@angular/core';
import { IPoint, IShape } from '../generate-line/generate-line.component';
import * as THREE from 'three';
import { cloneDeep } from 'lodash';
import { GeneralService } from '../common/services/general.service';
import { EventsService } from '../common/services/events.service';
import { PlaceShapesComponent } from '../place-shapes/place-shapes.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  @ViewChild('editedSurface') editedSurface: PlaceShapesComponent;
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
  public pendingPart;
  public cycleParts = -1;

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
      this.selectedPart = undefined;
      this.isGoingToEditSurface = false;
      this.isEditingSurface = true;
      this.expandedShapeDetails = undefined;
    }
    if (shape.partId) {
      if (this.pendingPart) {
        this.selectedPart = this.pendingPart;
        this.pendingPart = undefined;
      } else if (this.cycleParts != -1) {
        if (this.cycleParts === this.parts.length - 1) {
          this.cycleParts = -1;
          this.selectedPart = undefined;
        } else {
          this.cycleParts++;
          this.selectedPart = this.parts[this.cycleParts];
          this.getImageData[this.parts[this.cycleParts].name] = true;
        }
      } else {
        this.selectedPart = undefined;
      }
    } else {
      if (this.pendingShape) {
        this.expandedShapeDetails = this.pendingShape;
        this.pendingShape = undefined;
      } else {
        this.expandedShapeDetails = this.shapes[0];
      }
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
    if (this.selectedPart) {
      this.getImageData[this.selectedPart.name] = true;
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
    if (this.selectedPart) {
      this.getImageData[this.selectedPart.name] = true;
    }
  }

  toggleSelectPart(part: IShape) {
    if (this.selectedPart?.partId === part.partId) {
      this.getImageData[this.selectedPart.name] = true;
    } else {
      if (this.selectedPart) {
        this.pendingPart = part;
        this.getImageData[this.selectedPart.name] = true;
      } else {
        this.selectedPart = part;
      }
      if (this.expandedShapeDetails) {
        this.getImageData[this.expandedShapeDetails.name] = true;
      } 
    }
  }

  updateShapeMinimization(event, shape: IShape) {
    this.selectedPart = undefined;
    if (event === true) {
      if (shape.id === 0) {
        this.isEditingSurface = false;
        //Check when shape was rotated but not saved before opening surface edit
      } else {
        this.expandedShapeDetails = undefined;
        this.parts = this.parts.map((item) => {
          const partId = item.partId;
          const partName = item.name;
          const rotation = item.rotation;
          if (item.id === shape.id) {
            item = this.mapShapeToPoint(shape);
            item.name = partName;
            item.partId = partId;
            item.rotation = rotation;
          }
          this.rotatePart(item, -rotation);
          return item;
        });
        if (this.parts.length) {
          this.cycleParts = 0;
          this.selectedPart = this.parts[this.cycleParts];
          this.getImageData[this.parts[this.cycleParts].name] = true;
        }
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
      let newPos = new THREE.Vector3(item.point.x, item.point.y, 0);
      newPos.applyMatrix4(rotationMatrix);
      part.points[index].point = new THREE.Vector2(newPos.x, newPos.y);
    });
  }

  openSurfaceEdit() {
    this.editedSurface.ngOnDistroy();
    if (this.expandedShapeDetails) {
      this.isGoingToEditSurface = true;
      this.getImageData[this.expandedShapeDetails.name] = true;
    } 
    if (this.selectedPart) {
      this.isGoingToEditSurface = true;
      this.getImageData[this.selectedPart.name] = true;
    }
    if (!this.expandedShapeDetails && !this.selectedPart) {
      this.isEditingSurface = true;
    }
  }

  mapShapeToPoint(shape: IShape) {
    let points: IPoint[] = shape.points.map(item => {
      return {
        name: item.name,
        type: item.type,
        point: new THREE.Vector2(item.point.x, item.point.y)
      }
    });
    let part: IShape = {
      id: shape.id,
      textureType: shape.textureType,
      points
    }
    return part;
  }

  useShape(shape: IShape) {
    let part = this.mapShapeToPoint(shape);
    part.rotation = 0;
    part.name = this.createNewName('Part');
    part.partId = this.parts.length + 1;
    this.parts.unshift(part);
    this.updateFromShape = false;
    this.generateSurfaceParts();
    if (this.selectedPart) {
      this.pendingPart = part;
      this.getImageData[this.selectedPart.name] = true;
    } else {
      this.selectedPart = part;
    }
  }

  deleteShape(i: number) {
    this.parts = this.parts.filter(item => item.id !== this.shapes[i].id);
    this.shapes.splice(i, 1);
    this.generateSurfaceParts();
  }

  deletePart(i: number) {
    if (this.selectedPart.name === this.parts[i].name) {
      this.selectedPart = undefined;
    }
    this.parts.splice(i, 1);
    this.generateSurfaceParts();
  }

  choosePartFromSurface(event: number) {
    let part = this.parts.find(item => item.partId === event);
    if (this.selectedPart) {
      if (part.name !== this.selectedPart.name) {
        this.pendingPart = part;
        this.getImageData[this.selectedPart.name] = true;
      }
    } else {
      this.selectedPart = part;
    }
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

  updatePartRotation() {
    this.updateFromShape = false;
    this.generateSurfaceParts();
  }

  generateSurfaceParts() {
    let positions = {};
    let rotations = {};
    this.surfaceParts.forEach(item => positions[item.name] = item.position);
    this.parts.forEach(item => rotations[item.name] = item.rotation);
    
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
  
}
