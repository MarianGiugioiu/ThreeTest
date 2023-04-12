import { Component, OnInit } from '@angular/core';
import { IShape } from '../generate-line/generate-line.component';
import * as THREE from 'three';
import { cloneDeep } from 'lodash';
import { GeneralService } from '../common/general.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public shapes: IShape[] = [];
  public parts: IShape[] = []
  public surface: IShape;
  public expandedShapeDetails: IShape;
  public selectedPart: IShape;
  public isEditingSurface = true;

  constructor(public generalService: GeneralService) { }

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
  }

  useShape(shape: IShape) {
    let part = cloneDeep(shape);
    part.name = this.createNewName('Part');
    part.partId = this.parts.length + 1;
    part.wasInitialized = false;
    this.selectedPart = part;
    this.parts.unshift(part);
  }

  deleteShape(i: number) {
    this.shapes.splice(i, 1);
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
}