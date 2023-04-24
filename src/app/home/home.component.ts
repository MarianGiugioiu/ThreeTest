import { Component, OnInit } from '@angular/core';
import { IShape } from '../generate-line/generate-line.component';
import * as THREE from 'three';
import { cloneDeep } from 'lodash';
import { GeneralService } from '../common/services/general.service';
import { EventsService } from '../common/services/events.service';
import { EventsEnum } from '../common/enums/events.enum';

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
  public cameraRatio = 4;

  constructor(
    public generalService: GeneralService,
    public evensService: EventsService
    ) { }

  ngOnInit(): void {
    this.createSurface();
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
    this.expandedShapeDetails = this.shapes[0];
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

  updateShapeMinimization(event, shape: IShape) {
    this.selectedPart = undefined;
    if (event === true) {
      if (shape.id === 0) {
        this.isEditingSurface = false;
        this.surface.wasInitialized = false;
      } else {
        this.expandedShapeDetails = undefined;
        this.parts = this.parts.map((item) => {
          const partId = item.partId;
          const partName = item.name;
          if (item.id === shape.id) {
            item = cloneDeep(shape);
            item.name = partName;
            item.wasInitialized = false;
            item.partId = partId;
          }
          return item;
        });
        this.generateSurfaceParts();
      }
    } else {
      this.expandedShapeDetails = shape;
    }
  }

  openSurfaceEdit() {
    this.expandedShapeDetails = undefined;
    this.selectedPart = undefined;
    this.isEditingSurface = true;
    this.shapes.forEach(item => item.wasInitialized = false);
    this.parts.forEach(item => item.wasInitialized = false);
    this.evensService.publish(EventsEnum.toggleEditSurface);
  }

  useShape(shape: IShape) {
    let part = cloneDeep(shape);
    part.name = this.createNewName('Part');
    part.partId = this.parts.length + 1;
    part.wasInitialized = false;
    this.selectedPart = part;
    this.parts.unshift(part);
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

  generateSurfaceParts() {
    let positions = {};
    this.surfaceParts.forEach(item => positions[item.name] = item.position);
    this.surfaceParts = [];
    this.parts.forEach(part => {
      this.surfaceParts.push({
        partId: part.partId,
        id: part.id,
        name: part.name,
        textureType: part.textureType,
        points: cloneDeep(part.points),
        position: positions[part.name]
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
