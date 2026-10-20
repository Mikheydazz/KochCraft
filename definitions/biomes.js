import { registerBiome } from '../registry.js';

export const BIOME_PLAINS = registerBiome({
  id: 0, key: 'plains', name: 'Равнина',
  aliases: ['plains', 'равнина']
});

export const BIOME_FOREST = registerBiome({
  id: 1, key: 'forest', name: 'Лес',
  aliases: ['forest', 'лес']
});

export const BIOME_OCEAN = registerBiome({
  id: 2, key: 'ocean', name: 'Океан',
  aliases: ['ocean', 'океан']
});

export const BIOME_DESERT = registerBiome({
  id: 3, key: 'desert', name: 'Пустыня',
  aliases: ['desert', 'пустыня']
});

export const BIOME_MOUNTAINS = registerBiome({
  id: 4, key: 'mountains', name: 'Горы',
  aliases: ['mountains', 'mountain', 'горы', 'гора']
});