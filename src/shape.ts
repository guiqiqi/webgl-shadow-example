import { mat4, vec3 } from "gl-matrix";

export abstract class ShapeBase {
    public webgl: WebGL2RenderingContext;
    public program: WebGLProgram;
    public vao: WebGLVertexArrayObject;
    public vertices: Float32Array;

    private userDefinedUpdate: CallableFunction;

    public translation: vec3 = vec3.fromValues(0, 0, 0);
    public rotation: vec3 = vec3.fromValues(0, 0, 0);

    public Attributes = {
        Vertex: 'a_vertex',
        Normal: 'a_normal'
    };

    public Uniforms = {
        World: 'u_world',
        ViewProjection: 'u_view_projection'
    };

    constructor(
        webgl: WebGL2RenderingContext,
        program: WebGLProgram,
        vertices: Float32Array,
        init: (_: WebGL2RenderingContext, __: WebGLProgram) => void,
        update: (_: WebGL2RenderingContext, __: WebGLProgram) => void
    ) {
        this.webgl = webgl;
        this.program = program;
        this.vertices = vertices;
        this.vao = webgl.createVertexArray() as WebGLVertexArrayObject;
        this.userDefinedUpdate = update;
        this.webgl.useProgram(this.program);
        init(webgl, program);
        this.webgl.useProgram(null);
    }

    /**
     * Buffer 3D, float 32 data, from begining, to VBO bound to attribute of vertex shader.
     * Mapping of VBO and attribute will also be recorded by VAO.
     * 
     * @param name is name of variable in shaders
     * @param data going to be buffered
     * @param target buffer target ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
     * @param usage could be STATIC_DRAW or things like it
     */
    protected buffer(
        name: string,
        data: Float32Array,
        target: number = WebGL2RenderingContext.ARRAY_BUFFER,
        usage: number = WebGL2RenderingContext.STATIC_DRAW,
        normalize: boolean = false,
        stride: number = 0,
        offset: number = 0
    ) {
        this.webgl.useProgram(this.program);
        this.webgl.bindVertexArray(this.vao);

        // Buffer data
        const buffer = this.webgl.createBuffer();
        const variable = this.webgl.getAttribLocation(this.program, name);
        if (variable < 0)
            throw Error(`cannot find attribute ${name} in vertex shader of current program`);
        this.webgl.bindBuffer(target, buffer);
        this.webgl.bufferData(target, data, usage);
        this.webgl.vertexAttribPointer(variable, 3, this.webgl.FLOAT, normalize, stride, offset);
        this.webgl.enableVertexAttribArray(variable);

        // Unbind program and VAO
        this.webgl.bindVertexArray(null);
        this.webgl.useProgram(null);
    }

    /**
     * Update uniform data in each drawing process.
     * Updated by default world and projectionView matrix uniforms.
     * 
     * User's self-defined update process will also be called after it.
     */
    protected update(vpmat: mat4): void {
        // Update world matrix
        const worldUniform = this.webgl.getUniformLocation(this.program, this.Uniforms.World);
        if (!worldUniform)
            throw Error(`unable to find uniform "${this.Uniforms.World}" in shaders`);
        this.webgl.uniformMatrix4fv(worldUniform, false, new Float32Array(this.world()));

        // Update view and projection matrix
        const viewProjectionUniform = this.webgl.getUniformLocation(this.program, this.Uniforms.ViewProjection);
        if (!viewProjectionUniform)
            throw Error(`unable to find uniform "${this.Uniforms.ViewProjection}" in shaders`);
        this.webgl.uniformMatrix4fv(viewProjectionUniform, false, new Float32Array(vpmat));

        // Call user's update process
        this.userDefinedUpdate(this.webgl, this.program);
    }

    /**
     * Draw current shape
     */
    public abstract draw(vpmat: mat4): void;

    /**
     * Calculate converted world matrix
     */
    public abstract world(): mat4;

    /**
     * Move shape to given position
     * @param x current position by axis X
     * @param y current position by axis Y
     * @param z current position by axis Z
     */
    moveX = (x: number) => this.translation[0] = x;
    moveY = (y: number) => this.translation[1] = y;
    moveZ = (z: number) => this.translation[2] = z;

    /**
     * Rotate to given status
     * @param x rotated in degree by axis X
     * @param y rotated in degree by axis Y
     * @param z rotated in degree by axis Z
     */
    rotateX = (x: number) => this.rotation[0] = ShapeBase.degreeToRadian(x);
    rotateY = (y: number) => this.rotation[1] = ShapeBase.degreeToRadian(y);
    rotateZ = (z: number) => this.rotation[2] = ShapeBase.degreeToRadian(z);

    /**
     * Convert angle from degree to radian or reversed
     * @param angle for converting into radian or degree
     * @returns converted angle
     */
    static degreeToRadian = (angle: number) => angle * Math.PI / 180;
    static radianToDegree = (angle: number) => angle * 180 / Math.PI;

    /**
     * Calculate normal vector of each plane of shape:
     *   - Get each 3 points of vertices (equals to 9 elements) as point A, B and C
     *   - Make vector AC and AB
     *   - Push ACxAB 3 times as result into final array
     * 
     * Note: result vectors will be normalized.
     * 
     * @param vertecies all verticies of shape
     */
    static calculateNormals(vertecies: Float32Array): Float32Array {
        const normals: number[] = [];
        for (let index = 0; index < vertecies.length; index += 9) {
            const pointA = vertecies.subarray(index, index + 3);
            const pointB = vertecies.subarray(index + 3, index + 6);
            const pointC = vertecies.subarray(index + 6, index + 9);
            const vecAC = vec3.fromValues(pointC[0] - pointA[0], pointC[1] - pointA[1], pointC[2] - pointA[2]);
            const vecAB = vec3.fromValues(pointB[0] - pointA[0], pointB[1] - pointA[1], pointB[2] - pointA[2]);
            const crossProduct = vec3.normalize(vec3.create(), vec3.cross(
                vec3.create(), vecAB, vecAC
            ));
            for (let _ = 0; _ < 3; _++)
                normals.push(...[crossProduct[0], crossProduct[1], crossProduct[2]]);
        }
        return new Float32Array(normals);
    }

    /**
     * Use first 3D point as anchor point of shape.
     * Calculate world converted position of point.
     */
    public anchor(): vec3 {
        const anchorPoint = vec3.fromValues(this.vertices[0], this.vertices[1], this.vertices[2]);
        return vec3.transformMat4(anchorPoint, anchorPoint, this.world());
    }
}

export class ShapeTriangle extends ShapeBase {

    private normals: Float32Array;

    constructor(
        webgl: WebGL2RenderingContext,
        program: WebGLProgram,
        vertices: Float32Array,
        init: (_: WebGL2RenderingContext, __: WebGLProgram) => void,
        update: (_: WebGL2RenderingContext, __: WebGLProgram) => void
    ) {
        super(webgl, program, vertices, init, update);
        this.normals = ShapeBase.calculateNormals(this.vertices);
        this.buffer(this.Attributes.Vertex, this.vertices);
        this.buffer(this.Attributes.Normal, this.normals);
    }

    /**
     * Calculate translation and rotation world matrix.
     * @returns translation world matrix
     */
    public world(): mat4 {
        const world = mat4.fromTranslation(mat4.create(), this.translation);
        mat4.rotateX(world, world, this.rotation[0]);
        mat4.rotateY(world, world, this.rotation[1]);
        return mat4.rotateZ(world, world, this.rotation[2]);
    }

    /**
     * Draw triangles.
     * @param vpmat view and projection matrix form scene
     */
    public draw(vpmat: mat4): void {
        this.webgl.useProgram(this.program);
        this.webgl.bindVertexArray(this.vao);
        this.update(vpmat);
        this.webgl.drawArrays(this.webgl.TRIANGLES, 0, this.vertices.length / 3);
        this.webgl.bindVertexArray(null);
        this.webgl.useProgram(null);
    }
}

export class ShapePoint extends ShapeBase {

    constructor(
        webgl: WebGL2RenderingContext,
        program: WebGLProgram,
        vertices: Float32Array,
        init: (_: WebGL2RenderingContext, __: WebGLProgram) => void,
        update: (_: WebGL2RenderingContext, __: WebGLProgram) => void
    ) {
        super(webgl, program, vertices, init, update);
        this.buffer(this.Attributes.Vertex, this.vertices);
    }

    /**
     * Calculate translation world matrix.
     * @returns translation world matrix
     */
    public world(): mat4 {
        return mat4.fromTranslation(mat4.create(), this.translation);
    }

    /**
     * Draw points.
     * @param vpmat view and projection matrix form scene
     */
    public draw(vpmat: mat4): void {
        this.webgl.useProgram(this.program);
        this.webgl.bindVertexArray(this.vao);
        this.update(vpmat);
        this.webgl.drawArrays(this.webgl.POINTS, 0, this.vertices.length / 3);
        this.webgl.bindVertexArray(null);
        this.webgl.useProgram(null);
    }
}
