/* Импортирует все определения — регистрация происходит как побочный эффект.
   Затем реэкспортирует id для использования в игровом коде. */

import './blocks.js';
import './items.js';
import './tools.js';
import './recipes.js';

export * from './blocks.js';
export * from './items.js';
export * from './tools.js';
export { RECIPES, SMELTING, FUEL_VALUE } from './recipes.js';
export { T } from './tiles.js';