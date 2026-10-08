import * as THREE from 'three';
import { WORLD_HEIGHT, SEA_LEVEL, WATER } from './constants.js';
import { world } from './world.js';
import { isSolid } from './blocks.js';
import { camera } from './scene.js';
import { input } from './input.js';

export const player = {
  pos: new THREE.Vector3(0, 45, 0),
  vel: new THREE.Vector3(),
  onGround: false,
  flying: false,
  inWater: false,
  sprinting: false,
  crouching: false,
  yaw: 0,
  pitch: 0,
  height: 1.8,
  radius: 0.3
};

export function collidesBox(x, y, z, r, h) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
  const y0 = Math.floor(y),     y1 = Math.floor(y + h);
  const z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  for (let yy = y0; yy <= y1; yy++)
    for (let zz = z0; zz <= z1; zz++)
      for (let xx = x0; xx <= x1; xx++)
        if (isSolid(world.getBlock(xx, yy, zz))) return true;
  return false;
}

export function updatePlayer(dt) {
  const p = player;
  const keys = input.keys;

  p.inWater = world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.6), Math.floor(p.pos.z)) === WATER
           || world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.4), Math.floor(p.pos.z)) === WATER;

  // Присед и спринт
  p.crouching = !p.flying && (keys['ShiftLeft'] || keys['ShiftRight']) && !p.inWater;
  const wantSprint = (keys['ControlLeft'] || keys['ControlRight']) && !p.crouching && !p.inWater;
  const fwdPressed = keys['KeyW'];
  p.sprinting = wantSprint && fwdPressed;

  let baseSpeed = p.flying ? 14 : (p.inWater ? 3.2 : 4.8);
  if (p.sprinting) baseSpeed *= 1.55;
  if (p.crouching) baseSpeed *= 0.32;
  const speed = baseSpeed;

  let fx = 0, fz = 0;
  if (keys['KeyW']) fz -= 1;
  if (keys['KeyS']) fz += 1;
  if (keys['KeyA']) fx -= 1;
  if (keys['KeyD']) fx += 1;

  const len = Math.hypot(fx, fz);
  if (len > 0) { fx /= len; fz /= len; }

  const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  const wx = fx * cos + fz * sin;
  const wz = -fx * sin + fz * cos;

  p.vel.x = wx * speed;
  p.vel.z = wz * speed;

  if (p.flying) {
    p.vel.y = 0;
    if (keys['Space']) p.vel.y = speed * 0.8;
    if (keys['ShiftLeft'] || keys['ShiftRight']) p.vel.y = -speed * 0.8;
  } else if (p.inWater) {
    p.vel.y -= 6 * dt;
    if (keys['Space']) p.vel.y = 3.2;
    p.vel.y = Math.max(p.vel.y, -4);
  } else {
    p.vel.y -= 26 * dt;
    if (p.vel.y < -50) p.vel.y = -50;
    if (keys['Space'] && p.onGround) { p.vel.y = 8.6; p.onGround = false; }
  }

  const r = p.radius, hgt = p.height;
  const nx = p.pos.x + p.vel.x * dt;
  if (!collidesBox(nx, p.pos.y, p.pos.z, r, hgt)) p.pos.x = nx; else p.vel.x = 0;
  const nz = p.pos.z + p.vel.z * dt;
  if (!collidesBox(p.pos.x, p.pos.y, nz, r, hgt)) p.pos.z = nz; else p.vel.z = 0;
  const ny = p.pos.y + p.vel.y * dt;
  if (!collidesBox(p.pos.x, ny, p.pos.z, r, hgt)) {
    p.pos.y = ny;
    if (p.vel.y < 0) p.onGround = false;
  } else {
    if (p.vel.y < 0) p.onGround = true;
    p.vel.y = 0;
  }

  if (p.pos.y < -20) {
    p.pos.set(p.pos.x, 60, p.pos.z);
    p.vel.set(0, 0, 0);
  }

  const eyeH = p.crouching ? 1.32 : 1.62;
  camera.position.set(p.pos.x, p.pos.y + eyeH, p.pos.z);
  camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
}