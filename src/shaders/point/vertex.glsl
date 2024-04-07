#version 300 es

in vec4 a_vertex;

uniform mat4 u_world;
uniform mat4 u_view_projection;

void main() {
    gl_Position = u_view_projection * u_world * a_vertex;
    gl_PointSize = 20.0;
}