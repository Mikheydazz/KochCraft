import * as THREE from 'three';
import { AIR, WATER, GRASS, SAND, WORLD_HEIGHT, SEA_LEVEL, CS } from './constants.js';
import { world } from './world.js';
import { scene } from './scene.js';
import { player, collidesBox } from './player.js';

const matCache = new Map();
function getMat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}
function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export const mobs = [];

export class Mob {
  constructor(type, x, y, z) {
    this.type = type;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.yaw = Math.random() * Math.PI * 2;
    this.timer = Math.random() * 3;
    this.moving = true;
    this.hp = type === 'zombie' ? 20 : 10;
    this.blocked = false;

    if (type === 'cow')        { this.r = 0.45; this.h = 1.7; }
    else if (type === 'pig')   { this.r = 0.40; this.h = 1.2; }
    else                       { this.r = 0.32; this.h = 1.95; }

    this.group = new THREE.Group();
    this.group.userData.mob = this;
    this.buildModel();
    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  buildModel() {
    const g = this.group;
    if (this.type === 'cow') {
      const brown = 0x4a3520, white = 0xe6e2d6, dark = 0x2b1d10;
      box(0.9, 0.78, 1.4, brown, 0, 1.05, 0, g);
      box(0.5, 0.35, 0.3, white, 0, 1.05, 0.6, g);
      box(0.7, 0.55, 0.6, brown, 0, 1.28, 0.95, g);
      box(0.42, 0.22, 0.16, white, 0, 1.12, 1.28, g);
      box(0.11, 0.11, 0.11, white, -0.28, 1.6, 0.95, g);
      box(0.11, 0.11, 0.11, white, 0.28, 1.6, 0.95, g);
      box(0.22, 0.7, 0.22, dark, -0.3, 0.35, 0.5, g);
      box(0.22, 0.7, 0.22, dark, 0.3, 0.35, 0.5, g);
      box(0.22, 0.7, 0.22, dark, -0.3, 0.35, -0.5, g);
      box(0.22, 0.7, 0.22, dark, 0.3, 0.35, -0.5, g);
    } else if (this.type === 'pig') {
      const pink = 0xf0a8a0, dark = 0xcf7b74;
      box(0.8, 0.62, 1.15, pink, 0, 0.72, 0, g);
      box(0.55, 0.5, 0.5, pink, 0, 0.88, 0.72, g);
      box(0.24, 0.18, 0.12, dark, 0, 0.8, 1.0, g);
      box(0.11, 0.11, 0.11, dark, -0.14, 1.0, 0.98, g);
      box(0.11, 0.11, 0.11, dark, 0.14, 1.0, 0.98, g);
      box(0.2, 0.45, 0.2, dark, -0.24, 0.22, 0.38, g);
      box(0.2, 0.45, 0.2, dark, 0.24, 0.22, 0.38, g);
      box(0.2, 0.45, 0.2, dark, -0.24, 0.22, -0.38, g);
      box(0.2, 0.45, 0.2, dark, 0.24, 0.22, -0.38, g);
    } else {
      const skin = 0x4f8f3d, shirt = 0x2f6f8f, pants = 0x2b3a6b;
      box(0.56, 0.7, 0.3, shirt, 0, 1.15, 0, g);
      box(0.5, 0.5, 0.5, skin, 0, 1.75, 0, g);
      box(0.13, 0.13, 0.13, 0x1a2a1a, -0.13, 1.82, 0.26, g);
      box(0.13, 0.13, 0.13, 0x1a2a1a, 0.13, 1.82, 0.26, g);
      box(0.18, 0.18, 0.72, shirt, -0.38, 1.45, 0.32, g);
      box(0.18, 0.18, 0.72, shirt, 0.38, 1.45, 0.32, g);
      box(0.2, 0.8, 0.2, pants, -0.15, 0.4, 0, g);
      box(0.2, 0.8, 0.2, pants, 0.15, 0.4, 0, g);
    }
  }

  damage(v) {
    this.hp -= v;
    this.group.position.y += 0.02;
    if (this.hp <= 0) this.dead = true;
  }

  update(dt) {
    const p = player.pos;
    const dxp = p.x - this.pos.x, dzp = p.z - this.pos.z;
    const distToPlayer = Math.hypot(dxp, dzp, p.y - this.pos.y);

    let mx = 0, mz = 0;
    const speed = this.type === 'zombie' ? 2.5 : 1.5;

    if (this.type === 'zombie' && distToPlayer < 22) {
      const l = Math.hypot(dxp, dzp) || 1;
      mx = dxp / l; mz = dzp / l;
      this.yaw = Math.atan2(mx, mz);
      if (distToPlayer < 2.0) {
        player.vel.x -= mx * 3; player.vel.z -= mz * 3;
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 2 + Math.random() * 4.5;
        this.moving = Math.random() > 0.35;
        if (this.moving) this.yaw = Math.random() * Math.PI * 2;
      }
      if (this.moving) {
        mx = Math.sin(this.yaw); mz = Math.cos(this.yaw);
      }
    }

    this.vel.x = mx * speed;
    this.vel.z = mz * speed;
    this.vel.y -= 26 * dt;
    if (this.vel.y < -40) this.vel.y = -40;

    const r = this.r, h = this.h;
    this.blocked = false;

    const nx = this.pos.x + this.vel.x * dt;
    if (!collidesBox(nx, this.pos.y, this.pos.z, r, h)) this.pos.x = nx;
    else this.blocked = true;

    const nz = this.pos.z + this.vel.z * dt;
    if (!collidesBox(this.pos.x, this.pos.y, nz, r, h)) this.pos.z = nz;
    else this.blocked = true;

    const ny = this.pos.y + this.vel.y * dt;
    if (!collidesBox(this.pos.x, ny, this.pos.z, r, h)) {
      this.pos.y = ny;
      if (this.vel.y < 0) this.onGround = false;
    } else {
      if (this.vel.y < 0) this.onGround = true;
      this.vel.y = 0;
    }

    if (this.blocked && this.onGround && (this.vel.x !== 0 || this.vel.z !== 0)) {
      this.vel.y = 7.5;
      this.onGround = false;
    }

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;

    const t = performance.now() * 0.006;
    this.group.position.y = this.pos.y + Math.abs(Math.sin(t)) * 0.05;
  }
}

export function surfaceY(wx, wz) {
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
    const b = world.getBlock(wx, y, wz);
    if (b !== AIR && b !== WATER) return y + 1;
  }
  return SEA_LEVEL + 1;
}

const MAX_MOBS = 14;
let spawnTimer = 0;

export function updateMobs(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = 1.2;
    if (mobs.length < MAX_MOBS) trySpawnMob();
  }
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    m.update(dt);
    if (m.dead || m.pos.distanceTo(player.pos) > 90) {
      scene.remove(m.group);
      mobs.splice(i, 1);
    }
  }
}

function trySpawnMob() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 24;
    const wx = Math.floor(player.pos.x + Math.cos(ang) * dist);
    const wz = Math.floor(player.pos.z + Math.sin(ang) * dist);
    const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS);
    if (!world.getChunk(cx, cz)) continue;

    const sy = surfaceY(wx, wz);
    if (sy <= SEA_LEVEL + 1) continue;
    const ground = world.getBlock(wx, sy - 1, wz);
    if (ground !== GRASS && ground !== SAND) continue;

    const r = Math.random();
    const type = r < 0.35 ? 'zombie' : (r < 0.68 ? 'cow' : 'pig');
    mobs.push(new Mob(type, wx + 0.5, sy + 0.1, wz + 0.5));
    return;
  }
}