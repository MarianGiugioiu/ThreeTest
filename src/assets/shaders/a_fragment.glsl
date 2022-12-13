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

void main() {
    //gl_FragColor = vec4(abs(sin(pos.x + u_time)), abs(sin(pos.y + u_time)), abs(sin(pos.z + u_time)), 1.0);
    // if (pos.x >= 0.0) {
    //   // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    //   gl_FragColor = vec4(abs(sin(u_time)), 0.0, 0.0, 1.0);
    // } else {
    //   // gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    //   gl_FragColor = vec4(0.0, abs(cos(u_time)), 0.0, 1.0);
    // }
    float newX = pos.x / 5.0;
    float newY = pos.y / 5.0;

    bool point = iterateMandelbrot(vec2(newX, newY));
    //gl_FragColor = vec4(point, point, point, 1.0);
    if (point) {
        discard;
        //gl_FragColor = vec4(0.0, 0.0, 0.0, 1);
    } else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1);
    }
}