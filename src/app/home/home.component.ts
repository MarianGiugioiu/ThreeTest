import { Component, OnInit } from '@angular/core';
import { IShape } from '../generate-line/generate-line.component';
import * as THREE from 'three';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public shapes: IShape[] = [];
  public surface: IShape;
  public expandedShapeDetails: IShape;

  constructor() { }

  ngOnInit(): void {
    this.createSurface();
  }

  addNewShape() {
    this.shapes.unshift(
      {
        id: this.shapes.length + 1,
        name: 'asd',
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
    if (event === true) {
      this.expandedShapeDetails = undefined;
    } else {
      this.expandedShapeDetails = shape;
    }
  }
}
