#version 300 es

precision highp float;

in float v_brightness;
in vec4 v_world_position;
in vec4 v_final_position;

uniform vec4 u_color;
uniform bool u_showShadow;
uniform mat4 u_positionToLightCamera;
uniform sampler2D u_shadowTexture;

out vec4 outColor;

void main() {
    vec4 positionLightCamera = u_positionToLightCamera * v_world_position;
    positionLightCamera.xyz /= positionLightCamera.w;
    positionLightCamera = positionLightCamera * 0.5 + 0.5;
    float depthInTexture = texture(u_shadowTexture, positionLightCamera.xy).r;
    float depthInSurface = (v_final_position.z / v_final_position.w) * 0.5 + 0.5;
    
    if ((depthInTexture < depthInSurface - 0.005) && u_showShadow) {
        float shadowColor = (1. - depthInTexture) * 0.9;
        outColor = vec4(shadowColor, shadowColor, shadowColor, u_color.a);;
    } else {
        outColor = u_color;
        outColor.rgb *= v_brightness;
    }
}