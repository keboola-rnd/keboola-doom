// Babylon.js scene setup — engine, scene, lighting, fog, glow

export function createScene(canvas) {
    const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
    });

    const scene = new BABYLON.Scene(engine);
    // Near-black background — classic Doom darkness
    scene.clearColor = new BABYLON.Color4(0.01, 0.005, 0.002, 1);

    // Dark brownish fog — close and oppressive like original Doom
    scene.fogMode    = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogColor   = new BABYLON.Color3(0.06, 0.04, 0.02);
    scene.fogStart   = 5;
    scene.fogEnd     = 15;

    // Dim warm ambient — Doom corridors are dark, lit only by local sources
    const ambient = new BABYLON.HemisphericLight('ambient', BABYLON.Vector3.Up(), scene);
    ambient.intensity   = 0.32;
    ambient.diffuse     = new BABYLON.Color3(0.9, 0.75, 0.55);
    ambient.groundColor = new BABYLON.Color3(0.06, 0.04, 0.02);

    // Subtle glow — just enough for projectiles/items, not walls
    const glow = new BABYLON.GlowLayer('glow', scene);
    glow.intensity = 0.35;

    // Store on scene so other systems can exclude meshes without extra plumbing
    scene.metadata = { glow };

    // Ensure canvas matches CSS size on init and on window resize
    engine.resize();
    window.addEventListener('resize', () => engine.resize());

    return { engine, scene, glow };
}
