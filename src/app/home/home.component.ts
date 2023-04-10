import { Component, OnInit } from '@angular/core';
import { IPoint } from '../generate-line/generate-line.component';
import * as THREE from 'three';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public shapes: IPoint[][];

  constructor() { }

  ngOnInit(): void {
    this.shapes = [];
    this.addNewShape();
    this.addNewShape();
    this.addNewShape();
  }

  addNewShape() {
    this.shapes.push([
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
    ]);
  }
}
