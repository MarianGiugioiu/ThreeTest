varying vec3 pos;
uniform float u_time;
varying vec2 vUv;
vec2 squareImaginary(vec2 number){
	return vec2(
		pow(number.x,2.0)-pow(number.y,2.0),
		2.0*number.x*number.y
	);
}

bool iterateMandelbrot(vec2 coord){
    int maxIterations = 20;
	vec2 z = vec2(0);
	for(int i=0;i<maxIterations;i++){
		z = squareImaginary(z) + coord;
		if(length(z)>2.0) return true;
	}
	return false;
}

vec3 spherical(vec3 coord) {
    float r = sqrt(pow(coord.x, 2.0) + pow(coord.y, 2.0) + pow(coord.z, 2.0));
    float theta = atan( sqrt(pow(coord.x, 2.0) + pow(coord.y, 2.0)), coord.z);
    float phi = atan(coord.y, coord.x);
    return vec3(r, theta, phi);
}

vec3 nthPowerCube(float n, vec3 coord, vec3 c) {
    float newx = pow(c.x, n) * sin(c.y*n) * cos(c.z*n);
    float newy = pow(c.x, n) * sin(c.y*n) * sin(c.z*n);
    float newz = pow(c.x, n) * cos(c.y*n);
    return vec3(newx + coord.x, newy + coord.y, newz + coord.z);
}

bool iterateMandelbulb(vec3 coord) {
    vec3 zeta = vec3(0);
    float n = 8.0;
    int maxIterations = 20;
    for(int i=0;i<maxIterations;i++){
        vec3 c = spherical(vec3(zeta.x, zeta.y, zeta.z));

        if (c.x > 2.0) {
            return true;
        }

		zeta = nthPowerCube(n, coord, c);
	}
    return false;
}

void main() {
    float newX = pos.x / 5.0;
    float newY = pos.y / 5.0;
    float newZ = pos.z / 5.0;

    //bool point = iterateMandelbrot(vec2(newX, newY));
    bool point = iterateMandelbulb(vec3(newX, newY, newZ));
    if (point) {
        discard;
        //gl_FragColor = vec4(0.0, 0.0, 0.0, 1);
    } else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1);
    }
}