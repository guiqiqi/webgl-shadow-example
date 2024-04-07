#version 300 es

in vec2 a_position; // 顶点位置属性
out vec2 v_texCoord; // 传递给片元着色器的纹理坐标

void main() {
    // 将顶点位置传递给片元着色器
    v_texCoord = a_position * 0.5 + 0.5;
    // 设置顶点的裁剪空间坐标
    gl_Position = vec4(a_position, 0.0, 1.0);
}