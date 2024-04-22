import * as THREE from './THREE/three.module.js';
import { OrbitControls } from './THREE/OrbitControls.js';
import { RGBELoader } from './THREE/RGBELoader.js';
import { GLTFLoader } from './THREE/GLTFLoader.js';
import { DRACOLoader } from './THREE/DRACOLoader.js';


function _(elm) { return document.getElementById(elm) }
let interval = 1 / 25, delta = 0, clock = new THREE.Clock();
var loader = new GLTFLoader();
var loaderDRACO = new DRACOLoader();
loaderDRACO.setDecoderPath('./js/decoder/');
loader.setDRACOLoader(loaderDRACO);
console.log(THREE.REVISION);
let ssrPass;
let selects = [];
export class MKviewer {
    constructor(container, camera, scene, orbit, renderer, composer, fxaaPass, pixelRatio) {
        this.container = container;
        this.camera = camera;
        this.scene = scene;
        this.orbit = orbit;
        this.renderer = renderer;
    }
    async initScene() {
        this.scene = new THREE.Scene();
        this.scene.name = "MK-scene"
        // let fogColor = new THREE.Color(0xff0000);
        // this.scene.fog = new THREE.Fog(fogColor, 50, 70);
        const size = 100;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(size, divisions);
        gridHelper.position.set(0, 0, 0)
        //this.scene.add( gridHelper );
        const fov = 50;
        const near = 0.1;
        const far = 10000;
        this.camera = new THREE.PerspectiveCamera(fov, this.container.innerWidth / this.container.innerHeight, near, far);
        this.camera.name = "MK-camera"
        this.camera.position.set(0, 100, -200)
        this.camera.zoom = 1;
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.layers.enable(1)
        this.scene.add(this.camera);
        this.pixelRatio = window.devicePixelRatio
        let AA = true
        if (this.pixelRatio > 1) { AA = false }
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        this.renderer.autoClear = false;
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        //this.renderer.setClearColor( 0x101000 );
        this.container.appendChild(this.renderer.domElement);
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.physicallyCorrectLights = true;
        THREE.ColorManagement.enabled = true;
        //this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMapping = THREE.AgXToneMapping;

        await mainLoader(this.scene, this.renderer)
        _("loaderImg").style.display="none"
        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        // this.orbit.minDistance = 3.5;
        // this.orbit.maxDistance = 8;
        // this.orbit.minPolarAngle = -Math.PI
        // this.orbit.maxPolarAngle = Math.PI / 1.2
        this.orbit.target.set(0,-1, 0)
        this.orbit.update()
        this.orbit.autoRotate = false;
        this.orbit.autoRotateSpeed = 0.7;
        this.orbit.enablePan = true;
        this.orbit.screenSpacePanning = true;
        this.orbit.addEventListener('change', this.render.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

    }
    animate  () {
        delta += clock.getDelta();
        requestAnimationFrame(this.animate.bind(this));
        if (delta > interval) {
            delta = delta % interval;
            this.scene.getObjectByName( "Ring" ).rotation.y -= 0.5 * (Math.PI/180);
            this.render();
        }
    }
    onWindowResize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.render();
    }
    render() {
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    }
}
function initRGBE(scene, hdr) {
    return new Promise((resolve, reject) => {
        console.log("Start Loading .... " + hdr);
        new RGBELoader().setPath('./img/env/').load(hdr,
            async function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                //scene.background = texture;
                texture.flipY = false;
                scene.environment = texture
                resolve(texture);
            },
            xhr => {
                _("loadertxt").innerHTML = Math.floor((xhr.loaded / xhr.total) * 100) + "%";
            },
            err => {
                reject(new Error(err));
            }
        );
    });
}


async function modelLoader() {
    return new Promise((resolve, reject) => {
        loader.load('asset/MOON2.glb', data => resolve(data),
            xhr => {
                _("loadertxt").innerHTML = Math.floor((xhr.loaded / xhr.total) * 100) + "%";
            }, reject);
    });
}

async function mainLoader(_thisScene) {
    console.log("Start loading Model .........")
    const glbData = await (modelLoader)();
    const SceneGLB = glbData.scene;
    SceneGLB.position.set(0, 0, 0);
    let RGBE_scene;
    const initRGBEPromises = [
        (RGBE_scene = initRGBE(_thisScene, 'env.hdr')),
        // Add more calls as needed
    ];
    await Promise.all(initRGBEPromises);
    traverseScene(SceneGLB);
    _thisScene.environment = await RGBE_scene;
    _thisScene.add(SceneGLB)
    console.log(" .........End loading Model")
}

async function processNode(node) {
    if (node.isMesh) {
        switch (true) {
            case node.name.startsWith("Plane"):
                node.visible = false
            break;
        }
    }
}

async function traverseScene(SceneGLB) {
    const traversePromise = new Promise((resolve) => {
        SceneGLB.traverse(async function (node) {
            await processNode(node);
        }, resolve);
    });
    await traversePromise;
    // Continue with other operations once the traversal is complete
}
export async function LoadTextures(texture, repeat) {
    var tex = new THREE.TextureLoader().load('img/' + texture, function (img) {
        //console.log( 'Texture dimensions: %sx%s', img.image.width, img.image.height );
        //console.log( 'image source: ', img.image.src);
        //let imgSrc = img.image.src
        //console.log( 'image source: '+ imgSrc);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.x = tex.repeat.y = repeat
    tex.center.set(.5, .5);
    return tex
}
var intersects = []
export let selectedObject = null;
const pointer= new THREE.Vector2();
export function intersecting(scene, event, preview, camera) {
    const raycaster = new THREE.Raycaster();
    const rect = preview.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const element of intersects) {
        if (element.object.name.startsWith("Plane")||
            element.object.name.startsWith("flag")||
            element.object.name.startsWith("caution")||
            element.object.name.startsWith("helipad")||
            element.object.name.startsWith("rocket")) {
            selectedObject = element.object;
            return selectedObject;
        }
    }
    // If no valid object is found, return null
    return null;
}