#version 300 es

precision highp float;

in float v_brightness;
in vec4 v_world_position;
in vec4 v_final_position;

uniform vec4 u_color;
uniform mat4 u_positionToLightCamera;
uniform sampler2D u_shadowTexture;

out vec4 outColor;

void main() {
    float depth = 1. - abs(v_final_position.z) / 1000.0;
    outColor = vec4(depth, depth, depth, 1.);
}