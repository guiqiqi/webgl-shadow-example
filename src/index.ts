import { ShapePoint, ShapeTriangle } from "./shape";
import Scaler from "./scaler";
import { Scene } from "./scene";
import { F, Plane } from "./consts";

import TriangleVertexShader from './shaders/triangle/vertex.glsl';
import TriangleFragmentShader from './shaders/triangle/fragment.glsl';
import TriangleShadowShader from './shaders/triangle/shadow.glsl';
import PointVertexShader from './shaders/point/vertex.glsl';
import PointFragmentShader from './shaders/point/fragment.glsl';

import { mat4 } from "gl-matrix";

// import TextureVertexShader from './shaders/texture/vertex.glsl';
// import TextureFragmentShader from './shaders/texture/fragment.glsl';

// Test
// scene.webgl.bindFramebuffer(scene.webgl.FRAMEBUFFER, null);
// const textureProgram = scene.createProgram(TextureVertexShader, TextureFragmentShader);
// scene.webgl.useProgram(textureProgram);
// var vertices = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0];
// const vertexBuffer = scene.webgl.createBuffer();
// scene.webgl.bindBuffer(scene.webgl.ARRAY_BUFFER, vertexBuffer);
// scene.webgl.bufferData(scene.webgl.ARRAY_BUFFER, new Float32Array(vertices), scene.webgl.STATIC_DRAW);
// const a_position = scene.webgl.getAttribLocation(textureProgram, "a_position");
// scene.webgl.vertexAttribPointer(a_position, 2, scene.webgl.FLOAT, false, 0, 0);
// scene.webgl.enableVertexAttribArray(a_position);
// const textureUniformLocation = scene.webgl.getUniformLocation(textureProgram, "u_texture");
// scene.webgl.activeTexture(scene.webgl.TEXTURE0);
// scene.webgl.bindTexture(scene.webgl.TEXTURE_2D, depthTexture);
// scene.webgl.uniform1i(textureUniformLocation, 0);
// scene.webgl.drawArrays(scene.webgl.TRIANGLES, 0, 6);

// Try to read data from depth texture
// const pixels = new Uint8Array(scene.webgl.canvas.width * scene.webgl.canvas.height * 4);
// scene.webgl.readPixels(0, 0, scene.size[0], scene.size[1], scene.webgl.RGBA, scene.webgl.UNSIGNED_BYTE, pixels);
// console.log(pixels);

const scene = new Scene(Scene.createCanvas(), 1000);
const shapeFProgram = scene.createProgram(TriangleVertexShader, TriangleFragmentShader);
const shadowFProgram = scene.createProgram(TriangleVertexShader, TriangleShadowShader);
const shapePlaneProgram = scene.createProgram(TriangleVertexShader, TriangleFragmentShader);
const shadowPlaneProgram = scene.createProgram(TriangleVertexShader, TriangleShadowShader);

const shapeF = new ShapeTriangle(
    scene.webgl, shapeFProgram, F,
    (webgl: WebGL2RenderingContext, program: WebGLProgram) => {
        // Set color
        const uniformColor = webgl.getUniformLocation(program, 'u_color');
        webgl.uniform4fv(uniformColor, new Float32Array([1, 0.5, 0.5, 1.0]));
    },
    (webgl: WebGL2RenderingContext, program: WebGLProgram) => {
        // Add point light
        const uniformLight = webgl.getUniformLocation(program, 'u_light');
        webgl.uniform3fv(uniformLight, new Float32Array(scene.light));

        // Let shader ignore this object in shadow drawing
        const uniformShowShadow = webgl.getUniformLocation(program, 'u_showShadow');
        webgl.uniform1i(uniformShowShadow, 0);
    }
);
scene.shapes.push(shapeF);
shapeF.rotateX(30);
shapeF.rotateY(30);
shapeF.rotateZ(30);
shapeF.moveZ(-600);

const shapePlane = new ShapeTriangle(
    scene.webgl, shapePlaneProgram, Plane,
    (webgl: WebGL2RenderingContext, program: WebGLProgram) => {
        // Set color
        const uniformColor = webgl.getUniformLocation(program, 'u_color');
        webgl.uniform4fv(uniformColor, new Float32Array([1, 1, 1, 1]));
    },
    (webgl: WebGL2RenderingContext, program: WebGLProgram) => {
        if (!drawingDepthMapping) {
            // Add light position camera 
            const uniformPositionToLightCamera = webgl.getUniformLocation(program, 'u_positionToLightCamera');
            webgl.uniformMatrix4fv(uniformPositionToLightCamera, false, new Float32Array(positionToLightCameraMatrix));

            // Add depth texture
            const uniformShadowTexture = webgl.getUniformLocation(program, 'u_shadowTexture');
            webgl.activeTexture(webgl.TEXTURE0);
            webgl.uniform1i(uniformShadowTexture, 0);
            webgl.bindTexture(scene.webgl.TEXTURE_2D, depthTexture);

            // Let shader show shadow of this object in drawing
            const uniformShowShadow = webgl.getUniformLocation(program, 'u_showShadow');
            webgl.uniform1i(uniformShowShadow, 1);
        }
    }
);
scene.shapes.push(shapePlane);
shapePlane.moveZ(-900);

const shapeLight = new ShapePoint(
    scene.webgl, scene.createProgram(PointVertexShader, PointFragmentShader), new Float32Array([0, 0, 0]),
    (webgl: WebGL2RenderingContext, program: WebGLProgram) => {
        const uniformColor = webgl.getUniformLocation(program, 'u_color');
        webgl.uniform4fv(uniformColor, new Float32Array([0.8, 0., 1, 0.5]));
    },
    (..._) => { }
)
scene.light = shapeLight.translation;
scene.shapes.push(shapeLight);
shapeLight.moveX(-50);
shapeLight.moveY(-50);
shapeLight.moveZ(-200);

let drawingDepthMapping = false;
let positionToLightCameraMatrix = mat4.identity(mat4.create());
const {framebuffer: depthFramebuffer, texture: depthTexture} = scene.createDepthFrameBuffer();

const scaler = new Scaler('scaler', () => {
    // Draw depth mapping
    drawingDepthMapping = true;
    shapeF.program = shadowFProgram;
    shapePlane.program = shadowPlaneProgram;
    scene.camera.moveTo(scene.light);
    scene.camera.lookAt(shapeF.anchor());
    scene.draw(depthFramebuffer);
    shapeF.program = shapeFProgram;
    shapePlane.program = shapePlaneProgram;
    drawingDepthMapping = false;

    // Reset camera to zero point
    positionToLightCameraMatrix = scene.vpmat();
    scene.camera.reset();
    scene.draw();
});
scaler.add('X: ', shapeF.translation[0], -scene.size[0] / 2, scene.size[0] / 2, (x: number) => shapeF.moveX(x));
scaler.add('Y: ', shapeF.translation[1], -scene.size[1] / 3, scene.size[1] / 3, (y: number) => shapeF.moveY(y));
scaler.add('Z: ', shapeF.translation[2], -800, -500, (z: number) => shapeF.moveZ(z));
scaler.add('Rotate X: ', ShapeTriangle.radianToDegree(shapeF.rotation[0]), 0, 360, (rx: number) => shapeF.rotateX(rx));
scaler.add('Rotate Y: ', ShapeTriangle.radianToDegree(shapeF.rotation[1]), 0, 360, (ry: number) => shapeF.rotateY(ry));
scaler.add('Rotate Z: ', ShapeTriangle.radianToDegree(shapeF.rotation[2]), 0, 360, (rz: number) => shapeF.rotateZ(rz));
scaler.add('Light X:', shapeLight.translation[0], -scene.size[0] / 2, scene.size[0] / 2, (x: number) => shapeLight.moveX(x));
scaler.add('Light Y:', shapeLight.translation[1], -scene.size[1] / 2, scene.size[1] / 2, (y: number) => shapeLight.moveY(y));

scaler.update();