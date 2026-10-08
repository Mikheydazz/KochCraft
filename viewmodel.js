import * as THREE from 'three';
import { FACES, AIR, ATLAS_COLS, ATLAS_ROWS } from './constants.js';
import { BLOCK_DEFS, isBlock } from './blocks.js';
import { blockMaterial } from './scene.js';
import { input } from './input.js';
import { player } from './player.js';

export const viewScene = new THREE.Scene();
export const viewCamera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 10);
viewScene.add(new THREE.AmbientLight(0xffffff, 0.95));
const viewLight = new THREE.DirectionalLight(0xffffff, 0.55);
viewLight.position.set(0.6, 1.0, 0.9);
viewScene.add(viewLight);

const handGroup = new THREE.Group();
handGroup.position.set(0.42, -0.42, -0.72);
handGroup.rotation.set(-0.15, 0.38, 0.12);
viewScene.add(handGroup);

const armMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.16, 0.55),
  new THREE.MeshLambertMaterial({ color: 0xd9a07a })
);
armMesh.position.set(0.01, -0.06, 0.16);
handGroup.add(armMesh);

const blockHolder = new THREE.Group();
blockHolder.position.set(0, 0.04, -0.28);
handGroup.add(blockHolder);

function makeBlockMesh(blockId) {
  const def = BLOCK_DEFS[blockId];
  if (!def) return null;
  const geo = new THREE.BufferGeometry();
  const pos = [], nor = [], uvs = [], ind = [];
  let vi = 0;
  const du = 1 / ATLAS_COLS, dv = 1 / ATLAS_ROWS;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    let tile;
    if (f === 2) tile = def.top;
    else if (f === 3) tile = def.bottom;
    else if (def.front !== undefined && (f === 4 || f === 5)) tile = def.front;
    else tile = def.side;
    const tu0 = (tile % ATLAS_COLS) / ATLAS_COLS;
    const tv0 = Math.floor(tile / ATLAS_COLS) / ATLAS_ROWS;
    for (let i = 0; i < 4; i++) {
      const c = F.corners[i];
      pos.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5);
      nor.push(F.dir[0], F.dir[1], F.dir[2]);
      const t = F.uvs[i];
      uvs.push(tu0 + t[0] * du, tv0 + t[1] * dv);
    }
    ind.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    vi += 4;
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(ind);
  return new THREE.Mesh(geo, blockMaterial);
}

let currentHandBlock = null;
export function updateHandItem(blockId) {
  if (currentHandBlock) {
    blockHolder.remove(currentHandBlock);
    currentHandBlock.geometry.dispose();
    currentHandBlock = null;
  }
  if (!blockId || blockId === AIR || !isBlock(blockId)) return;
  currentHandBlock = makeBlockMesh(blockId);
  if (currentHandBlock) {
    currentHandBlock.scale.set(0.32, 0.32, 0.32);
    blockHolder.add(currentHandBlock);
  }
}

let swing = 0;
export function triggerSwing() { swing = 1; }
let walkPhase = 0;

export function updateViewModel(dt) {
  swing = Math.max(0, swing - dt * 4.5);
  const sw = Math.sin(swing * Math.PI);
  const keys = input.keys;
  const moving = input.pointerLocked && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']);
  if (moving && player.onGround && !player.flying) walkPhase += dt * (player.sprinting ? 15 : 11);
  const bobX = Math.sin(walkPhase) * 0.012;
  const bobY = Math.abs(Math.sin(walkPhase * 2)) * 0.014;
  handGroup.position.set(
    0.42 + bobX - sw * 0.02,
    -0.42 + bobY - sw * 0.13,
    -0.72 + sw * 0.05
  );
  handGroup.rotation.set(-0.15 - sw * 0.55, 0.38 - sw * 0.25, 0.12 + sw * 0.35);
}