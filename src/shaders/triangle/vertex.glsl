#version 300 es

in vec4 a_vertex;
in vec3 a_normal;

uniform mat4 u_world;
uniform vec3 u_light;
uniform mat4 u_view_projection;

out float v_brightness;
out vec4 v_world_position;
out vec4 v_final_position;

void main() {
    gl_Position = u_view_projection * u_world * a_vertex;

    // Calculate brightness
    vec3 surfaceWorldPosition = (u_world * a_vertex).xyz;
    vec3 surfaceToLight = normalize(u_light - surfaceWorldPosition);
    vec3 worldSurfaceNormal = mat3(u_world) * a_normal;
    
    v_world_position = u_world * a_vertex;
    v_final_position = gl_Position;
    v_brightness = dot(worldSurfaceNormal, surfaceToLight);
}