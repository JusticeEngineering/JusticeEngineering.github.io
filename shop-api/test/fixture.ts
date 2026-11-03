import type { Item } from '../lib/catalog.js';

export const items: Item[] = [
  { key: 'model-a', product: 'Model A', name: '', url: '/shop/model-a/', unitAmount: 2900, shipped: false,
    files: [{ file: 'A.zip', bytes: 1048576, sha256: 'a'.repeat(64) }] },
  { key: 'model-b-blender', product: 'Model B', name: 'Blender model', url: '/shop/model-b/', unitAmount: 1900, shipped: false,
    files: [{ file: 'B_Detailed.zip', bytes: 2097152, sha256: 'b'.repeat(64) }] },
  { key: 'model-b-glb', product: 'Model B', name: 'GLB', url: '/shop/model-b/', unitAmount: 1500, shipped: false,
    files: [{ file: 'B_Realtime.zip', bytes: 3145728, sha256: 'c'.repeat(64) }] },
  { key: 'pencil', product: 'Carpenter pencil', name: '', url: '/shop/carpenter-pencil/', unitAmount: 400, shipped: true, files: [] },
];
