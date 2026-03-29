// Mock for BABYLON global — allows importing Babylon-dependent modules in Node.js tests.
// Provides minimal stubs for all Babylon classes used in the game.

function makeCtx() {
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        textAlign: 'left',
        textBaseline: 'alphabetic',
        font: '',
        fillRect: () => {},
        clearRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        ellipse: () => {},
        closePath: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 0 }),
        roundRect: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        putImageData: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
    };
}

class MockDynamicTexture {
    constructor(name) {
        this.name     = name;
        this.hasAlpha = false;
        this.uScale   = 1;
        this.vScale   = 1;
        this._ctx     = makeCtx();
    }
    getContext() { return this._ctx; }
    update()     {}
    dispose()    {}
}

class MockMesh {
    constructor() {
        this.position     = { x: 0, y: 0, z: 0, setAll: () => {} };
        this.rotation     = { x: 0, y: 0, z: 0 };
        this.scaling      = { x: 1, y: 1, z: 1, setAll: () => {} };
        this.material     = null;
        this.isPickable   = true;
        this.billboardMode = 0;
        this.checkCollisions = false;
    }
    dispose() {}
}

class MockMaterial {
    constructor() {
        this.diffuseTexture             = null;
        this.emissiveColor              = null;
        this.specularColor              = null;
        this.backFaceCulling            = true;
        this.useAlphaFromDiffuseTexture = false;
    }
    dispose() {}
}

class MockColor3 {
    constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; }
    scale(s) { return new MockColor3(this.r * s, this.g * s, this.b * s); }
    clone()  { return new MockColor3(this.r, this.g, this.b); }
}

class MockVector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}

const mockMeshBuilder = {
    CreatePlane:  () => new MockMesh(),
    CreateBox:    () => new MockMesh(),
    CreateSphere: () => new MockMesh(),
    CreateGround: () => new MockMesh(),
};

class MockGlowLayer {
    constructor() { this.intensity = 1; }
    addIncludedOnlyMesh() {}
}

class MockHemisphericLight {
    constructor() { this.intensity = 1; this.diffuse = null; this.groundColor = null; }
}

class MockScene {
    constructor() { this.meshes = []; this.activeCamera = null; }
    registerAfterRender() {}
    unregisterAfterRender() {}
    getEngine() { return { getDeltaTime: () => 16 }; }
}

class MockEngine {
    constructor() {}
    runRenderLoop() {}
    getDeltaTime() { return 16; }
}

// Install as global so ES module imports that reference `BABYLON` work
global.BABYLON = {
    DynamicTexture:    MockDynamicTexture,
    StandardMaterial:  MockMaterial,
    MeshBuilder:       mockMeshBuilder,
    Mesh:              { BILLBOARDMODE_Y: 2, BILLBOARDMODE_ALL: 7 },
    Color3:            MockColor3,
    Vector3:           MockVector3,
    GlowLayer:         MockGlowLayer,
    HemisphericLight:  MockHemisphericLight,
    Scene:             MockScene,
    Engine:            MockEngine,
};

// Stub browser APIs used at module load time
if (typeof global.fetch === 'undefined') {
    global.fetch = () => Promise.resolve({ text: () => Promise.resolve('name\ntest_table') });
}
if (typeof global.performance === 'undefined') {
    global.performance = { now: () => Date.now() };
}
