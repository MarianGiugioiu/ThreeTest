precision mediump float;

attribute vec2 vPos;

void main() {
    gl_Position = vec4(vPos, 0, 1.0);
}