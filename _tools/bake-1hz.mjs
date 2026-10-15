// Bake the 1HZ GLB (Blender export) into assets/1hz.bin for assets/engine.js.
// Usage (needs @gltf-transform/core, meshoptimizer, gl-matrix): node _tools/bake-1hz.mjs model.glb assets/1hz.bin [errMeters]
import { NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { mat4, vec3, mat3 } from 'gl-matrix';
import fs from 'fs';

const [,, IN, OUT, ERR='0.0006'] = process.argv;
const err = +ERR;
await MeshoptSimplifier.ready;

const RULES = [
  [/washer|ferrule|Ring gear tooth|Clutch cover bolt hole|recessed dish|inner dish lip/i, null], // too small to read as lines
  [/heat shield|Shield fixing/i, 'insulator'],
  [/V-belt/i, 'belts'],
  [/^Glow/i, 'glow'],
  [/leak-off/i, 'leak'],
  [/^Injector 0/i, 'injectors'],
  [/Fuel pipe|Fuel bundle|delivery union|Injector compression union/i, 'lines'],
  [/^Vacuum/i, 'vacuum'],
  [/^Crank damper/i, 'damper'],
  [/^Water outlet|Upper coolant|Lower water pipe|Heater return/i, 'outlet'],
  [/^Water pump|^Fan|^Viscous/i, 'water'],
  [/^Alternator/i, 'alt'],
  [/Power steering|^Steering/i, 'steer'],
  [/^Sump|Oil pan/i, 'pan'],
  [/filter|Oil cooler/i, 'filter'],
  [/^Starter motor|^Starter end|^Starter case|^Starter solenoid|^Starter electrical|^Starter terminal/i, 'starter'],
  [/Flywheel|Pilot bearing|Starter ring gear/i, 'flywheel'],
  [/Engine mount|^Mount/i, 'mounts'],
  [/Dipstick/i, 'dipstick'],
  [/Front lower gear housing|Front gear case/i, 'gears'],
  [/Timing/i, 'timing'],
  [/^Injection pump|^Pump|Fuel shutoff|^Solenoid|^Throttle|^Accelerator/i, 'pump'],
  [/^Intake|^Plenum|^Crossover|Air intake/i, 'intake'],
  [/^Exhaust|exhaust collector/i, 'exhaust'],
  [/Valve cover|^Cover|TOYOTA|Oil filler|Filler cap/i, 'cover'],
  [/^Cylinder head|^Head|^Lifting/i, 'head'],
  [/.*/, 'block'],
];
const cat = n => { for (const [re, c] of RULES) if (re.test(n)) return c; };

const doc = await new NodeIO().read(IN);
const groups = {}; const unmatched = new Set(); let inTris = 0, outTris = 0;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const name = node.getName(); const c = cat(name);
  if (!c) continue;
  const M = node.getWorldMatrix(); const N = mat3.normalFromMat4(mat3.create(), M);
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION').getArray(), Nm = prim.getAttribute('NORMAL')?.getArray();
    let I = prim.getIndices()?.getArray(); if (!I) I = Uint32Array.from({length: P.length/3}, (_, i) => i);
    inTris += I.length/3;
    const pos = new Float32Array(P.length), nor = new Float32Array(P.length), v = vec3.create();
    for (let i = 0; i < P.length; i += 3) {
      vec3.transformMat4(v, [P[i], P[i+1], P[i+2]], M); pos.set(v, i);
      if (Nm) { vec3.transformMat3(v, [Nm[i], Nm[i+1], Nm[i+2]], N); vec3.normalize(v, v); nor.set(v, i); }
    }
    let idx = Uint32Array.from(I);
    if (idx.length > 300) {
      const [s] = MeshoptSimplifier.simplify(idx, pos, 3, 0, err, ['ErrorAbsolute']);
      if (s.length >= 3) idx = s;
    }
    outTris += idx.length/3;
    (groups[c] ||= []).push({ pos, nor, idx, name });
  }
}
// orientation: crank axis is whichever horizontal axis the damper→flywheel vector runs along
const centre = c => { const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9]; for (const g of groups[c]) for (let i=0;i<g.pos.length;i+=3) for (let k=0;k<3;k++){b[k]=Math.min(b[k],g.pos[i+k]);b[k+3]=Math.max(b[k+3],g.pos[i+k]);} return [0,1,2].map(k=>(b[k]+b[k+3])/2); };
const d = centre('damper'), f = centre('flywheel');
console.error('damper', d.map(x=>x.toFixed(3)), 'flywheel', f.map(x=>x.toFixed(3)), 'pump', centre('pump').map(x=>x.toFixed(3)), 'exhaust', centre('exhaust').map(x=>x.toFixed(3)));
fs.writeFileSync(OUT + '.groups.json', JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))));
// export raw (meters, glTF axes) — orientation applied on the client after inspection
const parts = []; const chunks = []; let off = 0;
let bb = [1e9,1e9,1e9,-1e9,-1e9,-1e9];
for (const gs of Object.values(groups)) for (const g of gs) for (let i=0;i<g.pos.length;i+=3) for (let k=0;k<3;k++){bb[k]=Math.min(bb[k],g.pos[i+k]);bb[k+3]=Math.max(bb[k+3],g.pos[i+k]);}
const push = a => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; } const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); chunks.push(u); const o = off; off += u.length; return o; };
for (const [c, gs] of Object.entries(groups)) {
  // merge, compacting each piece to the vertices its simplified indices still use
  let vc = 0, ic = 0; const pieces = [];
  for (const g of gs) { const map = new Map(); const ni = new Uint32Array(g.idx.length); for (let i=0;i<g.idx.length;i++){ let m = map.get(g.idx[i]); if (m===undefined){m=map.size;map.set(g.idx[i],m);} ni[i]=m+vc; } pieces.push({g,map,ni}); vc += map.size; ic += ni.length; }
  const P = new Int16Array(vc*3), Nn = new Int8Array(vc*3), I = vc < 65536 ? new Uint16Array(ic) : new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const {g,map,ni} of pieces) { for (const [src, dst] of map) for (let k=0;k<3;k++){ const t=(g.pos[src*3+k]-bb[k])/(bb[k+3]-bb[k]); P[(vo+dst)*3+k]=Math.round(t*65534-32767); Nn[(vo+dst)*3+k]=Math.round(g.nor[src*3+k]*127); } I.set(ni, io); io += ni.length; vo += map.size; }
  parts.push({ c, v: vc, i: ic, i32: !(I instanceof Uint16Array), p: push(P), n: push(Nn), x: push(I) });
}
const head = new TextEncoder().encode(JSON.stringify({ bb, parts }));
const hl = new Uint32Array([head.length]);
const body = Buffer.concat(chunks.map(c => Buffer.from(c)));
const padH = (4 - ((4 + head.length) % 4)) % 4;
fs.writeFileSync(OUT, Buffer.concat([Buffer.from(hl.buffer), Buffer.from(head), Buffer.alloc(padH), body]));
console.error('tris in', inTris, 'out', outTris, 'bytes', fs.statSync(OUT).size, 'parts', parts.map(p=>p.c+':'+p.i/3).join(' '));
