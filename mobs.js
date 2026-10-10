import * as THREE from 'three';
import { AIR, WATER, GRASS, SAND, WORLD_HEIGHT, SEA_LEVEL, CS, BEEF, PORK } from './constants.js';
import { world } from './world.js';
import { scene } from './scene.js';
import { player, collidesBox } from './player.js';
import { invAdd, getMode, GameMode } from './gamemode.js';

/* Материал НЕ кэшируем — у каждого моба свой, чтобы можно было мерцать красным
   независимо от остальных */
function getMat(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function sphere(r, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), getMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function capsule(r, len, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), getMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cone(r, h, seg, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), getMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* ============================================================
   ШКОЛЬНИК (стандартный скин)
   ============================================================ */
function buildSchoolboyModel(parent) {
  const skin = 0xf5d6a8;
  const shirt = 0x4a6ea8;
  const pants = 0x3a3a5a;
  const shoe = 0x2a2a1a;
  const hair = 0x3a2a1a;
  const backpack = 0xb57c4a;
  const tie = 0xa02020;

  // Торс
  const torso = sphere(1.1, shirt, 0, 1.5, 0, parent);
  torso.scale.set(1.1, 1.15, 0.85);

  // Живот
  const belly = sphere(0.85, shirt, 0, 1.05, 0.35, parent);
  belly.scale.set(1.0, 0.9, 0.9);

  // Галстук (короткий)
  const tieMesh = cone(0.12, 0.7, 4, tie, 0, 1.55, 0.95, parent);
  tieMesh.rotation.x = Math.PI;

  // Голова
  sphere(0.62, skin, 0, 2.85, 0, parent);

  // Щёки
  sphere(0.22, skin, -0.35, 2.75, 0.5, parent);
  sphere(0.22, skin,  0.35, 2.75, 0.5, parent);

  // Глаза (MeshBasicMaterial — не мигает красным)
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x1a0a0a });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), whiteMat);
  eyeL.position.set(-0.2, 2.95, 0.52); parent.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.2; parent.add(eyeR);
  const pupL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), blackMat);
  pupL.position.set(-0.2, 2.95, 0.62); parent.add(pupL);
  const pupR = pupL.clone(); pupR.position.x = 0.2; parent.add(pupR);

  // Рот
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.035, 6, 12, Math.PI), blackMat
  );
  mouth.position.set(0, 2.65, 0.55);
  mouth.rotation.z = Math.PI;
  parent.add(mouth);

  // Волосы (полусфера)
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.64, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    getMat(hair)
  );
  hairMesh.position.y = 2.9;
  parent.add(hairMesh);

  // Рюкзак
  box(0.9, 1.2, 0.5, backpack, 0, 1.6, -1.05, parent);
  box(0.7, 0.25, 0.35, backpack, 0, 2.15, -1.0, parent);

  // Руки
  function makeArm(side) {
    const arm = new THREE.Group();
    const upper = capsule(0.22, 0.7, shirt, 0, -0.35, 0, arm);
    sphere(0.24, skin, 0, -0.9, 0, arm);
    arm.position.set(side * 1.15, 2.0, 0);
    arm.rotation.z = side * 0.15;
    parent.add(arm);
    return arm;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Ноги
  function makeLeg(side) {
    const leg = new THREE.Group();
    capsule(0.28, 0.6, pants, 0, -0.4, 0, leg);
    box(0.45, 0.25, 0.65, shoe, 0, -0.85, 0.12, leg);
    leg.position.set(side * 0.42, 0.85, 0);
    parent.add(leg);
    return leg;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  return { armL, armR, legL, legR };
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
    this.hp = (type === 'pig') ? 6 : 10;
    this.maxHp = this.hp;
    this.blocked = false;
    this.dropItem = type === 'cow' ? BEEF : (type === 'pig' ? PORK : null);
    this.dropCount = 1 + (Math.random() < 0.5 ? 1 : 0);

    /* эффекты удара */
    this.hurtTimer = 0;        // сколько ещё мерцать красным
    this.knockbackTimer = 0;   // сколько ещё лететь от удара
    this.flashOn = false;

    if (type === 'cow')             { this.r = 0.45; this.h = 1.7; }
    else if (type === 'pig')        { this.r = 0.40; this.h = 1.2; }
    else if (type === 'schoolboy')  { this.r = 0.35; this.h = 1.9; }
    else                            { this.r = 0.32; this.h = 1.95; }

    this.group = new THREE.Group();
    this.group.userData.mob = this;
    this.buildModel();
    this.group.position.copy(this.pos);
    scene.add(this.group);

    /* собираем все материалы этого моба, чтобы менять свечение */
    this.materials = [];
    this.group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive) this.materials.push(o.material);
    });
  }

  buildModel() {
    const g = this.group;
    if (this.type === 'schoolboy') {
      // модель в три раза выше стандартной — уменьшаем до роста зомби
      const inner = new THREE.Group();
      inner.scale.set(0.55, 0.55, 0.55);
      g.add(inner);
      this.model = buildSchoolboyModel(inner);
    } else if (this.type === 'cow') {
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
    this.hurtTimer = 0.3;

    /* откидываем от игрока */
    const dx = this.pos.x - player.pos.x;
    const dz = this.pos.z - player.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    this.vel.x = (dx / l) * 8;
    this.vel.z = (dz / l) * 8;
    this.vel.y = 4.5;
    this.onGround = false;
    this.knockbackTimer = 0.35;

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
      if (distToPlayer < 2.0 && player.hurtCooldown <= 0 &&
          getMode() === GameMode.SURVIVAL) {
        player.hp = Math.max(0, player.hp - 2);
        player.hurtCooldown = 0.8;
        player.vel.x -= mx * 4; player.vel.z -= mz * 4;
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

    /* --- горизонтальная скорость --- */
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      // пока летит — затухает, ИИ не управляет
      const fr = Math.max(0, 1 - dt * 5.5);
      this.vel.x *= fr;
      this.vel.z *= fr;
    } else {
      this.vel.x = mx * speed;
      this.vel.z = mz * speed;
    }

    this.vel.y -= 26 * dt;
    if (this.vel.y < -40) this.vel.y = -40;

    const r = this.r, h = this.h;
    this.blocked = false;

    const nx = this.pos.x + this.vel.x * dt;
    if (!collidesBox(nx, this.pos.y, this.pos.z, r, h)) this.pos.x = nx;
    else { this.blocked = true; this.vel.x = 0; }

    const nz = this.pos.z + this.vel.z * dt;
    if (!collidesBox(this.pos.x, this.pos.y, nz, r, h)) this.pos.z = nz;
    else { this.blocked = true; this.vel.z = 0; }

    const ny = this.pos.y + this.vel.y * dt;
    if (!collidesBox(this.pos.x, ny, this.pos.z, r, h)) {
      this.pos.y = ny;
      if (this.vel.y < 0) this.onGround = false;
    } else {
      if (this.vel.y < 0) this.onGround = true;
      this.vel.y = 0;
    }

    /* прыжок через препятствие — только не в откидывании */
    if (this.blocked && this.onGround && this.knockbackTimer <= 0 &&
        (this.vel.x !== 0 || this.vel.z !== 0)) {
      this.vel.y = 7.5;
      this.onGround = false;
    }

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;

    /* покачивание — только стоя на земле */
    if (this.onGround) {
      const t = performance.now() * 0.006;
      this.group.position.y = this.pos.y + Math.abs(Math.sin(t)) * 0.05;
    } else {
      this.group.position.y = this.pos.y;
    }

    /* анимация ходьбы школьника */
    if (this.type === 'schoolboy' && this.model) {
      const moving = Math.abs(this.vel.x) + Math.abs(this.vel.z) > 0.3;
      const phase = performance.now() * 0.008;
      const target = moving ? 1 : 0;
      const swing = Math.sin(phase) * 0.4 * target;
      this.model.legL.rotation.x = swing;
      this.model.legR.rotation.x = -swing;
      this.model.armL.rotation.x = -swing * 0.7;
      this.model.armR.rotation.x = swing * 0.7;
    }

    /* ---- мерцание красным ---- */
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (!this.flashOn) {
        this.flashOn = true;
        for (const m of this.materials) m.emissive.setHex(0xff3030);
      }
    } else if (this.flashOn) {
      this.flashOn = false;
      for (const m of this.materials) m.emissive.setHex(0x000000);
    }
  }
}

/* ---- спавн и удаление мобов ---- */
const MAX_MOBS = 14;
let spawnTimer = 0;

export function surfaceY(wx, wz) {
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
    const b = world.getBlock(wx, y, wz);
    if (b !== AIR && b !== WATER) return y + 1;
  }
  return SEA_LEVEL + 1;
}

export function updateMobs(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = 1.2;
    if (mobs.length < MAX_MOBS) trySpawnMob();
  }
  let changed = false;
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    m.update(dt);
    if (m.dead) {
      if (m.dropItem) {
        invAdd(m.dropItem, m.dropCount || 1);
        changed = true;
      }
      scene.remove(m.group);
      mobs.splice(i, 1);
    } else if (m.pos.distanceTo(player.pos) > 90) {
      scene.remove(m.group);
      mobs.splice(i, 1);
    }
  }
  return changed;
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

    // зомби временно отключены
    const r = Math.random();
    const type = r < 0.4 ? 'cow' : (r < 0.7 ? 'pig' : 'schoolboy');
    mobs.push(new Mob(type, wx + 0.5, sy + 0.1, wz + 0.5));
    return;
  }
}