import * as THREE from 'three';
import { makeAtlas } from './blocks.js';

export const SKY = 0x9ad0f0;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 34, 66);

export const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 400);

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const atlas = makeAtlas();
export const blockMaterial = new THREE.MeshLambertMaterial({
  map: atlas,
  alphaTest: 0.5        // отсекает полностью прозрачные пиксели
});
export const waterMaterial = new THREE.MeshLambertMaterial({
  map: atlas, transparent: true, opacity: 0.72, depthWrite: false
});
export const glassMaterial = new THREE.MeshLambertMaterial({
  map: atlas, transparent: true, opacity: 0.85,
  depthWrite: false, side: THREE.DoubleSide
});

scene.add(new THREE.AmbientLight(0xffffff, 0.82));
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x5a5030, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 0.62);
sun.position.set(60, 120, 40);
scene.add(sun);

export const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
);
highlight.visible = false;
scene.add(highlight);
export const atlasCanvas = atlas.image;