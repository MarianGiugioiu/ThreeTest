import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class GeometryService {

  constructor() { }

  getTriangleArea(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) {
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    return Math.abs(ab.cross(ac)) / 2;
  }

  getHeight(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const base = point2.distanceTo(point3);
    const height = (2 * this.getTriangleArea(point1, point2, point3)) / base;
    
    return height;
  }

  getHeightPoint(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2, height: number) {
    const vectorC = point2.clone().sub(point3).normalize();
    const projectionVector = new THREE.Vector2(-vectorC.y, vectorC.x);
    projectionVector.multiplyScalar(height);
    const point4 = point1.clone().add(projectionVector);

    return point4;
  }

  doesPolygonHaveIntersectingEdges(points: THREE.Vector2[]) {
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const q1 = points[(i + 1) % numPoints];
        for (let j = i + 1; j < numPoints; j++) {
            const p2 = points[j];
            const q2 = points[(j + 1) % numPoints];
            if (this.doEdgesIntersect(p1, q1, p2, q2)) {
                return true;
            }
        }
    }
    return false;
  }
  doEdgesIntersect(p1: THREE.Vector2, q1: THREE.Vector2, p2: THREE.Vector2, q2: THREE.Vector2) {
    const dx1 = q1.x - p1.x;
    const dy1 = q1.y - p1.y;
    const dx2 = q2.x - p2.x;
    const dy2 = q2.y - p2.y;
    const cp1 = dx1 * (q2.y - p1.y) - dy1 * (q2.x - p1.x);
    const cp2 = dx1 * (p2.y - p1.y) - dy1 * (p2.x - p1.x);
    const cp3 = dx2 * (q1.y - p2.y) - dy2 * (q1.x - p2.x);
    const cp4 = dx2 * (p1.y - p2.y) - dy2 * (p1.x - p2.x);
    return (cp1 * cp2 < 0) && (cp3 * cp4 < 0);
  }

  equalizeEdges(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const length = point1.distanceTo(point3);
    
    return this.changeEdgeLength(point1, point2, length);
  }

  rotateAroundPoint(point1: THREE.Vector2, point2: THREE.Vector2, angle: number) {
    return point2.clone().sub(point1).rotateAround(new THREE.Vector2(0, 0), angle).add(point1);
  }

  changeEdgeLength(point1: THREE.Vector2, point2: THREE.Vector2, length: number) {
    return point2.clone().sub(point1).normalize().multiplyScalar(length).add(point1);
  }

  addToEdgeLength(point1: THREE.Vector2, point2: THREE.Vector2, bonusLength: number) {
    const length = point1.distanceTo(point2) + bonusLength;
    return this.changeEdgeLength(point1, point2, length);
  }

  addToAngle(height: number, point1: THREE.Vector2, point2: THREE.Vector2, angle:number) {
    const length = height / Math.sin(THREE.MathUtils.degToRad(angle));
    const vector = point2.clone().sub(point1);
    const newVector = vector.clone().normalize().multiplyScalar(length);

    return point1.clone().add(newVector);
  }

  movePointToMediatingLine(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const middle = new THREE.Vector2(
      (point3.x + point2.x) / 2,
      (point3.y + point2.y) / 2
    );
    let length = point1.distanceTo(middle);
    const vectorC = point2.clone().sub(point3).normalize();
    const projectionVector = new THREE.Vector2(-vectorC.y, vectorC.x);
    if(this.isPointAboveEdge(point1, point2, point3) >= 0) {
      length = -length;
    }
    
    projectionVector.multiplyScalar(length);
    const point4 = middle.clone().add(projectionVector);
    return point4;
  }

  isPointAboveEdge(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const edgeNormal = new THREE.Vector2(-(point3.y - point2.y), point3.x - point2.x).normalize();
    const pointVector = new THREE.Vector2(point1.x - point2.x, point1.y - point2.y);
    return pointVector.dot(edgeNormal);
  }

  calculateAngle(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const vectorA = point2.clone().sub(point1);
    const vectorB = point3.clone().sub(point1);
    let angle = Math.atan2(vectorB.y, vectorB.x) - Math.atan2(vectorA.y, vectorA.x);
    angle = angle < 0 ? angle + 2 * Math.PI : angle; // convert to positive angle if negative
    angle = angle > Math.PI ? 2 * Math.PI - angle : angle;

    // Convert the angle to degrees
    const angleInDegrees = THREE.MathUtils.radToDeg(angle);
    
    return angleInDegrees;
  }

  getDirectionOfRotation(point1: THREE.Vector2, point2: THREE.Vector2, point3: THREE.Vector2) {
    const vectorA = point2.clone().sub(point1).normalize();
    const vectorB = point3.clone().sub(point1).normalize();
    return new THREE.Vector3().crossVectors(new THREE.Vector3(vectorA.x, vectorA.y, 0), new THREE.Vector3(vectorB.x, vectorB.y, 0));
  }
}
