import { mat4, vec3 } from "gl-matrix";
import { ShapeBase } from "./shape";

export enum ProjectionType {
    Orthographic,
    Perspective
};

export class Camera {
    public position: vec3 = vec3.fromValues(0, 0, 0);
    public target: vec3 = vec3.fromValues(0, 0, -1);
    public normal: vec3 = vec3.fromValues(0, 1, 0);

    /**
     * Reset camera to initial state.
     */
    public reset(): void {
        this.position = vec3.fromValues(0, 0, 0);
        this.target = vec3.fromValues(0, 0, -1);
        this.normal = vec3.fromValues(0, 1, 0);
    }

    /**
     * Calculate view transformation matrix
     * Default camera view parameter is:
     *   - put at zero point with position (0, 0, 0)
     *   - looking to negative z axis with direction (0, 0, -1)
     *   - normal vector to axis y with (0, 1, 0)
     * 
     * Assuming M as matrix of translation from default position to current position,
     * and R as matrix of rotation from default orientation to current.
     * 
     * Then the view matrix could be calcualted as:
     * V = R^(-1)*M^(-1)
     * 
     * And hence rotation matrix R is an orthogonal matrix, so
     * V = R^T*M^(-1)
     */
    public view = (): mat4 => {
        const zAxis = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.position, this.target));
        const xAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.normal, zAxis));
        const yAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), zAxis, xAxis));
        const cameraMatrix = mat4.fromValues(
            xAxis[0], xAxis[1], xAxis[2], 0,
            yAxis[0], yAxis[1], yAxis[2], 0,
            zAxis[0], zAxis[1], zAxis[2], 0,
            this.position[0], this.position[1], this.position[2], 1
        );
        const viewMatrix = mat4.invert(mat4.create(), cameraMatrix);
        return viewMatrix;
    }

    /**
     * Adjust camera position and direction.
     */
    public moveTo = (position: vec3) => this.position = position;
    public lookAt = (target: vec3) => this.target = target;
}

export class Scene {
    public size: vec3;
    public webgl: WebGL2RenderingContext;

    // All shapes registered in scene
    public camera: Camera;
    public shapes: ShapeBase[] = [];

    // Light and projection settings
    public light: vec3 = vec3.fromValues(0, 0, 0);
    public fieldOfView: number = ShapeBase.degreeToRadian(60);
    public projectionType: ProjectionType = ProjectionType.Perspective;

    constructor(canvas: HTMLCanvasElement, depth: number, camera = new Camera()) {
        this.size = vec3.fromValues(canvas.width, canvas.height, depth);
        this.webgl = canvas.getContext('webgl2') as WebGL2RenderingContext;
        this.camera = camera;

        // Set WebGL enviroment
        this.webgl.viewport(0, 0, this.webgl.canvas.width, this.webgl.canvas.height);
        this.webgl.clearColor(0, 0, 0, 1);
        this.webgl.clear(this.webgl.COLOR_BUFFER_BIT | this.webgl.DEPTH_BUFFER_BIT);
        this.webgl.enable(this.webgl.CULL_FACE);
        this.webgl.enable(this.webgl.DEPTH_TEST);
    }

    /**
     * Create program and bind vertex and fragment shader to it
     * @param vertexShaderSource vertex shader source code
     * @param fragmentShaderSource fragment shader source code
     */
    public createProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
        const program = this.webgl.createProgram();
        if (!program)
            throw Error('create webgl2 program failed');
        const vertexShader = this.webgl.createShader(this.webgl.VERTEX_SHADER) as WebGLShader;
        const fragmentShader = this.webgl.createShader(this.webgl.FRAGMENT_SHADER) as WebGLShader;
        this.webgl.shaderSource(vertexShader, vertexShaderSource);
        this.webgl.compileShader(vertexShader);
        this.webgl.shaderSource(fragmentShader, fragmentShaderSource);
        this.webgl.compileShader(fragmentShader);
        if (!this.webgl.getShaderParameter(vertexShader, this.webgl.COMPILE_STATUS))
            throw Error(`create vertex shader failed ${this.webgl.getShaderInfoLog(vertexShader)}`);
        if (!this.webgl.getShaderParameter(fragmentShader, this.webgl.COMPILE_STATUS))
            throw Error(`create fragment shader failed ${this.webgl.getShaderInfoLog(fragmentShader)}`);
        this.webgl.attachShader(program, vertexShader);
        this.webgl.attachShader(program, fragmentShader);
        this.webgl.linkProgram(program);
        return program;
    }

    /**
     * Calculate projection matrix by viewer and projection type and fudge.
     * 
     * For perspective projection: using 60 degree as filed of view, using 1 as near z plane, and depth as far z plane.
     */
    public projection(): mat4 {
        if (this.projectionType == ProjectionType.Orthographic)
            return mat4.orthoNO(mat4.create(), 0, this.size[0], this.size[1], 0, this.size[2] / 2, -this.size[2] / 2);
        const aspect = this.size[0] / this.size[1];
        return mat4.perspectiveNO(mat4.create(), this.fieldOfView, aspect, 1, this.size[2]);
    }

    /**
     * Draw each shape bounded into scene.
     */
    public draw = (framebuffer: WebGLFramebuffer | null = null) => {
        this.webgl.bindFramebuffer(this.webgl.FRAMEBUFFER, framebuffer);
        this.webgl.clearColor(0, 0, 0, 1);
        this.webgl.clear(this.webgl.COLOR_BUFFER_BIT | this.webgl.DEPTH_BUFFER_BIT);
        this.shapes.forEach(shape => shape.draw(this.vpmat()));
    }

    /**
     * Calculate multiply of view and projection matrix.
     */
    public vpmat = (): mat4 => mat4.mul(mat4.create(), this.projection(), this.camera.view());

    /**
     * Create canvas element into body and resize it as html width and height.
     */
    static createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        return canvas;
    }

    public createDepthFrameBuffer(): {
        texture: WebGLTexture,
        framebuffer: WebGLFramebuffer
    } {
        const internalFormat = this.webgl.RGBA;
        const format = this.webgl.RGBA;
        const type = this.webgl.UNSIGNED_BYTE;
        const attachmentPoint = this.webgl.COLOR_ATTACHMENT0;

        // const internalFormat = this.webgl.DEPTH_COMPONENT32F;
        // const format = this.webgl.DEPTH_COMPONENT;
        // const type = this.webgl.FLOAT;
        // const attachmentPoint = this.webgl.DEPTH_ATTACHMENT;

        const colorTexture = this.webgl.createTexture() as WebGLTexture;
        this.webgl.bindTexture(this.webgl.TEXTURE_2D, colorTexture);
        this.webgl.texImage2D(this.webgl.TEXTURE_2D, 0, internalFormat, this.size[0], this.size[1], 0, format, type, null);
        this.webgl.texParameteri(this.webgl.TEXTURE_2D, this.webgl.TEXTURE_MAG_FILTER, this.webgl.NEAREST);
        this.webgl.texParameteri(this.webgl.TEXTURE_2D, this.webgl.TEXTURE_MIN_FILTER, this.webgl.NEAREST);
        this.webgl.texParameteri(this.webgl.TEXTURE_2D, this.webgl.TEXTURE_WRAP_S, this.webgl.CLAMP_TO_EDGE);
        this.webgl.texParameteri(this.webgl.TEXTURE_2D, this.webgl.TEXTURE_WRAP_T, this.webgl.CLAMP_TO_EDGE);

        // Bind framebuffer
        const depthFramebuffer = this.webgl.createFramebuffer() as WebGLFramebuffer;
        this.webgl.bindFramebuffer(this.webgl.FRAMEBUFFER, depthFramebuffer);
        this.webgl.framebufferTexture2D(this.webgl.FRAMEBUFFER, attachmentPoint, this.webgl.TEXTURE_2D, colorTexture, 0);

        // Add and bind a depth buffer for framebuffer
        const depthTexture = this.webgl.createTexture() as WebGLTexture;
        this.webgl.bindTexture(this.webgl.TEXTURE_2D, depthTexture);
        this.webgl.texImage2D(this.webgl.TEXTURE_2D, 0, this.webgl.DEPTH_COMPONENT32F, this.size[0], this.size[1], 0, this.webgl.DEPTH_COMPONENT, this.webgl.FLOAT, null);
        this.webgl.framebufferTexture2D(this.webgl.FRAMEBUFFER, this.webgl.DEPTH_ATTACHMENT, this.webgl.TEXTURE_2D, depthTexture, 0);

        return {
            texture: colorTexture,
            framebuffer: depthFramebuffer
        };
    }
}