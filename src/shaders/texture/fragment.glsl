#version 300 es

precision highp float;

in vec2 v_texCoord; // 从顶点着色器传递过来的纹理坐标
uniform sampler2D u_texture; // 纹理采样器

out vec4 outColor; // 输出的片元颜色

void main() {
    // 从纹理采样器中采样纹理颜色，并输出到片元颜色
    outColor = vec4(texture(u_texture, v_texCoord).r, 0., 0., 1.);
    // fragColor = vec4(0., 0., 0. , 1.)
}