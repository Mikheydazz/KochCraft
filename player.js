import * as THREE from 'three';
import { WORLD_HEIGHT, SEA_LEVEL, WATER } from './constants.js';
import { world } from './world.js';
import { isSolid, isWaterBlock, isStairsBlock, stairsOrientation } from './blocks.js';
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
  radius: 0.3,

  hp: 20,
  maxHp: 20,
  hurtCooldown: 0,
  inAirMaxY: null,

  dead: false,
  spawnPos: new THREE.Vector3(0, 45, 0)
};

/* Возвращает список AABB для блока. У ступеньки их два: нижняя
   коробка (0..0.5 по Y) и верхняя половинная, повёрнутая по ориентации. */
function getBlockAABBs(x, y, z, b) {
  if (isStairsBlock(b)) {
    const orient = stairsOrientation(b) || 'n';
    const aabbs = [
      { x0: x, y0: y, z0: z, x1: x + 1, y1: y + 0.5, z1: z + 1 }
    ];
    let ox = x, oz = z, sx = 1, sz = 1;
    if (orient === 'n')      { oz = z;       sz = 0.5; }
    else if (orient === 's') { oz = z + 0.5; sz = 0.5; }
    else if (orient === 'e') { ox = x + 0.5; sx = 0.5; }
    else if (orient === 'w') { ox = x;       sx = 0.5; }
    aabbs.push({ x0: ox, y0: y + 0.5, z0: oz, x1: ox + sx, y1: y + 1, z1: oz + sz });
    return aabbs;
  }
  return [{ x0: x, y0: y, z0: z, x1: x + 1, y1: y + 1, z1: z + 1 }];
}

function aabbOverlaps(ax0, ay0, az0, ax1, ay1, az1, b) {
  return ax0 < b.x1 && ax1 > b.x0 &&
         ay0 < b.y1 && ay1 > b.y0 &&
         az0 < b.z1 && az1 > b.z0;
}

export function collidesBox(x, y, z, r, h) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
  const y0 = Math.floor(y),     y1 = Math.floor(y + h);
  const z0 = Math.floor(z - r), z1 = Math.floor(z + r);

  const px0 = x - r, px1 = x + r;
  const py0 = y,     py1 = y + h;
  const pz0 = z - r, pz1 = z + r;

  for (let yy = y0; yy <= y1; yy++)
    for (let zz = z0; zz <= z1; zz++)
      for (let xx = x0; xx <= x1; xx++) {
        const b = world.getBlock(xx, yy, zz);
        if (!isSolid(b)) continue;
        const list = getBlockAABBs(xx, yy, zz, b);
        for (const a of list) {
          if (aabbOverlaps(px0, py0, pz0, px1, py1, pz1, a)) return true;
        }
      }
  return false;
}

export function updatePlayer(dt) {
  const p = player;
  const keys = input.keys;

  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;

  /* Мёртв — просто держим камеру на месте */
  if (p.dead) {
    camera.position.set(p.pos.x, p.pos.y + 1.62, p.pos.z);
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    return;
  }

  p.inWater = isWaterBlock(world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.6), Math.floor(p.pos.z)))
           || isWaterBlock(world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.4), Math.floor(p.pos.z)));

  /* ----- урон от падения ----- */
  if (p.onGround || p.flying || p.inWater) {
    if (p.inAirMaxY !== null) {
      if (p.onGround && !p.flying && !p.inWater) {
        const drop = p.inAirMaxY - p.pos.y;
        if (drop >= 5) {
          const dmg = Math.floor(drop) - 4;
          if (dmg > 0) p.hp = Math.max(0, p.hp - dmg);
        }
      }
      p.inAirMaxY = null;
    }
  } else {
    if (p.inAirMaxY === null) p.inAirMaxY = p.pos.y;
    else if (p.pos.y > p.inAirMaxY) p.inAirMaxY = p.pos.y;
  }

  /* ----- смерть (обрабатывается в main.js) ----- */
  if (p.hp <= 0 && !p.dead) {
    p.dead = true;
    p.vel.set(0, 0, 0);
  }

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
  const STEP = 0.6;   // подъём при auto-step — чуть выше половинки ступеньки

  function tryMoveX(dx) {
    const nx = p.pos.x + dx;
    if (!collidesBox(nx, p.pos.y, p.pos.z, r, hgt)) { p.pos.x = nx; return true; }
    // Auto-step: поднимаем на STEP, если там свободно.
    // Работает, только стоя на земле и без полёта.
    if (p.onGround && !p.flying) {
      const testY = p.pos.y + STEP;
      if (!collidesBox(nx, testY, p.pos.z, r, hgt)) {
        p.pos.x = nx;
        p.pos.y = testY;
        p.onGround = false;
        return true;
      }
    }
    return false;
  }
  function tryMoveZ(dz) {
    const nz = p.pos.z + dz;
    if (!collidesBox(p.pos.x, p.pos.y, nz, r, hgt)) { p.pos.z = nz; return true; }
    if (p.onGround && !p.flying) {
      const testY = p.pos.y + STEP;
      if (!collidesBox(p.pos.x, testY, nz, r, hgt)) {
        p.pos.z = nz;
        p.pos.y = testY;
        p.onGround = false;
        return true;
      }
    }
    return false;
  }

  if (!tryMoveX(p.vel.x * dt)) p.vel.x = 0;
  if (!tryMoveZ(p.vel.z * dt)) p.vel.z = 0;

  const ny = p.pos.y + p.vel.y * dt;
  if (!collidesBox(p.pos.x, ny, p.pos.z, r, hgt)) {
    p.pos.y = ny;
    if (p.vel.y < 0) p.onGround = false;
  } else {
    if (p.vel.y < 0) p.onGround = true;
    p.vel.y = 0;
  }

  if (p.pos.y < -20) p.pos.y = 60;

  const eyeH = p.crouching ? 1.32 : 1.62;
  camera.position.set(p.pos.x, p.pos.y + eyeH, p.pos.z);
  camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
}