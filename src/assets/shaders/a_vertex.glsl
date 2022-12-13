varying vec3 pos;
uniform float u_time;
varying vec2 vUv;
void main()	{
    pos = position;
    vUv = uv;
    vec4 result = vec4(
        position.x,
        2.0*sin(position.z/2.0 + u_time)+ position.y,
        position.z,
        1.0
    );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    // float newX = sin(pos.x * u_time) * sin(pos.y * u_time);
    // vec3 result = vec3(newX, pos.y, pos.z);
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(result, 1.0);
}