import * as THREE from 'three';
import { scene } from './scene.js';
import { world } from './world.js';
import { player } from './player.js';
import { invAdd, slots, INVENTORY_SIZE } from './gamemode.js';
import { ITEM_COLORS, isTool, getTool } from './items.js';
import { isSolid } from './blocks.js';

const drops = [];
const dropGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const HALF = 0.14;   // половина высоты кубика дропа

export function spawnDrop(id, count, x, y, z, durability) {
  const color = isTool(id) ? getTool(id).color : (ITEM_COLORS[id] || '#888');
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(dropGeo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  drops.push({
    id, count, durability,
    pos: new THREE.Vector3(x, y, z),
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,
      2.0 + Math.random() * 1.2,
      (Math.random() - 0.5) * 2.0
    ),
    mesh,
    age: 0,
    pickupDelay: 0.6
  });
}

export function dropAllInventory(x, y, z) {
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const s = slots[i];
    if (!s) continue;
    spawnDrop(s.id, s.count,
      x + (Math.random() - 0.5) * 0.8,
      y + 1.2,
      z + (Math.random() - 0.5) * 0.8,
      s.durability);
    slots[i] = null;
  }
}

/* Возвращает true, если что-то подобрано (нужно для перерисовки UI). */
export function updateDrops(dt) {
  let changed = false;

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    d.pickupDelay -= dt;

    /* --- гравитация --- */
    d.vel.y -= 22 * dt;
    if (d.vel.y < -20) d.vel.y = -20;

    /* --- горизонтально: проверяем блок на уровне центра --- */
    const nx = d.pos.x + d.vel.x * dt;
    if (!isSolid(world.getBlock(Math.floor(nx), Math.floor(d.pos.y), Math.floor(d.pos.z)))) {
      d.pos.x = nx;
    } else {
      d.vel.x = 0;
    }

    const nz = d.pos.z + d.vel.z * dt;
    if (!isSolid(world.getBlock(Math.floor(d.pos.x), Math.floor(d.pos.y), Math.floor(nz)))) {
      d.pos.z = nz;
    } else {
      d.vel.z = 0;
    }

    /* --- вертикально: смотрим блок под нижней гранью --- */
    const ny = d.pos.y + d.vel.y * dt;
    const bx = Math.floor(d.pos.x);
    const bz = Math.floor(d.pos.z);
    let grounded = false;

    if (d.vel.y <= 0) {
      // падаем: блок, в который упирается низ кубика
      const blockY = Math.floor(ny - HALF - 0.001);
      if (isSolid(world.getBlock(bx, blockY, bz))) {
        d.pos.y = blockY + 1 + HALF;
        d.vel.y = 0;
        grounded = true;
      } else {
        d.pos.y = ny;
      }
    } else {
      // летим вверх: блок над верхней гранью
      const blockY = Math.floor(ny + HALF);
      if (isSolid(world.getBlock(bx, blockY, bz))) {
        d.pos.y = blockY - HALF - 0.001;
        d.vel.y = 0;
      } else {
        d.pos.y = ny;
      }
    }

    /* --- сильное трение, когда лежим --- */
    if (grounded) {
      const f = Math.max(0, 1 - dt * 14);
      d.vel.x *= f;
      d.vel.z *= f;
      if (Math.abs(d.vel.x) < 0.01) d.vel.x = 0;
      if (Math.abs(d.vel.z) < 0.01) d.vel.z = 0;
    }

    /* --- визуал --- */
    d.mesh.position.copy(d.pos);
    d.mesh.rotation.y += dt * 1.8;

    /* --- подбор --- */
    if (d.pickupDelay <= 0 && !player.dead) {
      const dx = player.pos.x - d.pos.x;
      const dy = (player.pos.y + 0.9) - d.pos.y;
      const dz = player.pos.z - d.pos.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist < 1.1) {
        invAdd(d.id, d.count, {
          noStack: d.durability !== undefined,
          durability: d.durability
        });
        scene.remove(d.mesh);
        d.mesh.material.dispose();
        drops.splice(i, 1);
        changed = true;
        continue;
      } else if (dist < 2.2) {
        const f = 10 * dt / (dist || 1);
        d.vel.x += dx * f;
        d.vel.y += dy * f;
        d.vel.z += dz * f;
      }
    }
  }

  return changed;
}

export function clearDrops() {
  for (const d of drops) {
    scene.remove(d.mesh);
    d.mesh.material.dispose();
  }
  drops.length = 0;
}