// Uploads every download listed in _products/*.md to the private Blob store, after checking
// its SHA-256 against the product page. Skips files already uploaded at the same size.
//   node --env-file=.env.local scripts/upload.mjs <folder> [<folder> …]
// The folders are searched recursively for the ZIPs. .env.local comes from `vercel env pull`
// and supplies BLOB_READ_WRITE_TOKEN.
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BlobNotFoundError, head, put } from '@vercel/blob';
import { parse } from 'yaml';

const productsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '_products');
const folders = process.argv.slice(2);
if (!folders.length) {
  console.error('usage: node --env-file=.env.local scripts/upload.mjs <folder> [<folder> …]');
  process.exit(2);
}

/** @type {Map<string, { bytes: number, sha256: string }>} */
const wanted = new Map();
for (const name of readdirSync(productsDir).filter((f) => f.endsWith('.md'))) {
  const fm = readFileSync(join(productsDir, name), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  for (const d of (fm && parse(fm[1]).downloads) ?? []) wanted.set(d.file, { bytes: d.bytes, sha256: d.sha256 });
}

/** @type {Map<string, string>} file name → path on disk */
const found = new Map();
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (wanted.has(e.name) && !found.has(e.name)) found.set(e.name, p);
  }
};
folders.forEach(walk);

const sha256 = (path) =>
  new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });

let failed = 0;
for (const [file, want] of wanted) {
  const path = found.get(file);
  if (!path) { console.log(`missing   ${file}`); failed++; continue; }
  const size = statSync(path).size;
  const hash = await sha256(path);
  if (size !== want.bytes || hash !== want.sha256) {
    console.log(`MISMATCH  ${file}: ${size} bytes ${hash}, product page says ${want.bytes} ${want.sha256}`);
    failed++;
    continue;
  }
  const pathname = `downloads/${file}`;
  try {
    const existing = await head(pathname);
    if (existing.size === size) { console.log(`present   ${file}`); continue; }
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) throw err;
  }
  await put(pathname, createReadStream(path), {
    access: 'private',
    contentType: 'application/zip',
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: true,
  });
  console.log(`uploaded  ${file} (${(size / 1048576).toFixed(1)} MB)`);
}
process.exit(failed ? 1 : 0);
