// Home page figure: Toyota 1HZ inline-six diesel as a turnable line drawing.
// Geometry is baked from dj's detailed Blender model into assets/1hz.bin and
// drawn with a normal + depth edge pass so curved parts keep their silhouettes.
// Needs three.js r128 loaded first.
(async function(){
  const SRC=new URL('1hz.bin',document.currentScript.src);
  const fig=document.getElementById('hz-fig');
  if(!fig)return;
  const canvas=fig.querySelector('canvas'),note=fig.querySelector('.nogl');
  if(!window.THREE){canvas.hidden=true;note.hidden=false;return;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:false});}catch(e){canvas.hidden=true;note.hidden=false;return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG=new THREE.Color(css('--bg')||'#fff'),INK=new THREE.Color(css('--line')||'#1a1d1b'),ACC=new THREE.Color(css('--accent')||'#a83d26');

  const scene=new THREE.Scene();
  const plain=new THREE.MeshBasicMaterial({color:BG});
  const tint=new THREE.MeshBasicMaterial({color:BG.clone().lerp(ACC,.16)});
  const meshes=[];
  const MESH=1;

  // ---------- part catalogue (shown in the inspector) ----------
  const PARTS={
    block:['Cylinder block','Cast iron, six cylinders in line'],
    head:['Cylinder head','Single overhead cam, two valves per cylinder'],
    cover:['Valve cover','Over the camshaft and rockers'],
    timing:['Timing belt cover','Belt between the injection pump pulley and the camshaft pulley'],
    gears:['Timing gear case','Crank, idler and injection pump gears, with the oil pump inside'],
    vacuum:['Vacuum pump','On the timing gear case, for the brake booster'],
    pump:['Injection pump','Rotary distributor type, gear driven off the crank'],
    injectors:['Injectors ×6','One per cylinder, into the swirl chamber'],
    lines:['Injection lines','Six steel lines from the pump head, clamped in two bundles'],
    leak:['Injector leak-off rail','Returns spill fuel from the injectors'],
    glow:['Glow plugs ×6','Bussed together along the head'],
    intake:['Intake manifold','Naturally aspirated, opposite the exhaust (cross-flow head)'],
    exhaust:['Exhaust manifold','Two cast pieces: front 3 ports, rear 3 ports'],
    insulator:['Exhaust heat shield','Pressed sheet over the manifold'],
    damper:['Crank pulley','Twin V-groove, drives the accessory belts'],
    belts:['Accessory belts','Matched pair: crank, water pump and alternator'],
    water:['Water pump and fan','Viscous fan clutch on the pump shaft'],
    alt:['Alternator','Pivot mounted, strap adjusted'],
    steer:['Power steering pump','Gear driven, with its reservoir'],
    pan:['Oil pan','Pressed steel sump'],
    filter:['Oil filter and cooler','Spin-on filter on the angled adapter'],
    starter:['Starter motor','Engages the flywheel ring gear'],
    flywheel:['Flywheel','With the starter ring gear'],
    mounts:['Engine mounts','One each side of the block'],
    outlet:['Coolant pipes','Water outlet, hoses and heater return'],
    dipstick:['Oil dipstick','']
  };

  // ---------- model: baked from a detailed Blender model (assets/1hz.bin) ----------
  // Header: u32 length + JSON {bb, parts:[{c,v,i,i32,p,n,x}]}, then int16 positions
  // quantised to bb, int8 normals and indices per part. Source axes are glTF metres
  // (y up, crank along z, front at +z); here x runs front to rear in mm, crank at y=0.
  let buf;
  try{const r=await fetch(SRC);if(!r.ok)throw 0;buf=await r.arrayBuffer();}catch(e){canvas.hidden=true;note.textContent='The engine drawing could not load.';note.hidden=false;return;}
  {
    const hl=new Uint32Array(buf,0,1)[0],head=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,hl)));
    const body=(4+hl+3)&~3,bb=head.bb,FRONT=.48,AXIS=.315;
    for(const pt of head.parts){
      const q=new Int16Array(buf,body+pt.p,pt.v*3),qn=new Int8Array(buf,body+pt.n,pt.v*3);
      const pos=new Float32Array(pt.v*3),nor=new Float32Array(pt.v*3);
      for(let i=0;i<pt.v;i++){
        const g=[0,1,2].map(k=>bb[k]+(q[i*3+k]+32767)/65534*(bb[k+3]-bb[k]));
        pos[i*3]=(FRONT-g[2])*1000;pos[i*3+1]=(g[1]-AXIS)*1000;pos[i*3+2]=g[0]*1000;
        nor[i*3]=-qn[i*3+2]/127;nor[i*3+1]=qn[i*3+1]/127;nor[i*3+2]=qn[i*3]/127;
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
      geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
      geo.setIndex(new THREE.BufferAttribute(pt.i32?new Uint32Array(buf,body+pt.x,pt.i):new Uint16Array(buf,body+pt.x,pt.i),1));
      geo.computeBoundingSphere();
      const m=new THREE.Mesh(geo,plain);m.userData.part=pt.c;m.layers.set(MESH);scene.add(m);meshes.push(m);
    }
  }

  // ---------- camera ----------
  const bb=new THREE.Box3();meshes.forEach(m=>bb.expandByObject(m));
  const C=bb.getCenter(new THREE.Vector3()),R=bb.getBoundingSphere(new THREE.Sphere()).radius;
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,1,R*6);cam.layers.enableAll();
  const D0=V(-.78,.5,.9).normalize();
  let yaw=Math.atan2(D0.x,D0.z),pitch=Math.asin(D0.y);
  const out=fig.querySelector('[data-hz=angle]');

  // ---------- passes ----------
  let W=1,H=1;
  const mkRT=depth=>{const t=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});if(depth){t.depthTexture=new THREE.DepthTexture();t.depthTexture.type=THREE.UnsignedIntType;}return t;};
  // Everything is drawn supersampled (SS× the canvas buffer) and averaged down,
  // so thin lines stay put while the drawing turns instead of crawling pixel to pixel.
  const rtN=mkRT(true),rtC=mkRT(false),rtE=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  let SS=2;
  const normalMat=new THREE.MeshNormalMaterial();
  const quadScene=new THREE.Scene(),quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const edge=new THREE.ShaderMaterial({
    uniforms:{tN:{value:rtN.texture},tD:{value:rtN.depthTexture},tC:{value:rtC.texture},texel:{value:new THREE.Vector2()},stepPx:{value:1},span:{value:1},ink:{value:INK},dThr:{value:6}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:[
      'uniform sampler2D tN,tD,tC;uniform vec2 texel;uniform float stepPx,span,dThr;uniform vec3 ink;varying vec2 vUv;',
      'float D(vec2 u){return texture2D(tD,u).x;}',
      'vec3 N(vec2 u){return normalize(texture2D(tN,u).xyz*2.-1.);}',
      'float nd(vec3 a,vec2 u,float d){return d<1.?1.-dot(a,N(u)):0.;}',
      'void main(){',
      ' vec2 ox=vec2(texel.x*stepPx,0.),oy=vec2(0.,texel.y*stepPx);',
      ' float c=D(vUv),l=D(vUv-ox),r=D(vUv+ox),u=D(vUv+oy),d=D(vUv-oy);',
      ' float de=max(abs(l+r-2.*c),abs(u+d-2.*c))*span;',
      ' float e=smoothstep(dThr,dThr*2.,de);',
      ' if(c<1.){vec3 n=N(vUv);float ne=max(max(nd(n,vUv-ox,l),nd(n,vUv+ox,r)),max(nd(n,vUv+oy,u),nd(n,vUv-oy,d)));e=max(e,smoothstep(.2,.38,ne));}',
      ' vec3 col=texture2D(tC,vUv).rgb;gl_FragColor=vec4(mix(col,ink,e),1.);',
      '}'].join('\n'),
    depthTest:false,depthWrite:false
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),edge);quadScene.add(quad);
  // box-filter the supersampled image down to the canvas: four bilinear taps cover an SS×SS block
  const down=new THREE.ShaderMaterial({
    uniforms:{tE:{value:rtE.texture},off:{value:new THREE.Vector2()}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'uniform sampler2D tE;uniform vec2 off;varying vec2 vUv;void main(){gl_FragColor=.25*(texture2D(tE,vUv+off)+texture2D(tE,vUv-off)+texture2D(tE,vUv+vec2(off.x,-off.y))+texture2D(tE,vUv+vec2(-off.x,off.y)));}',
    depthTest:false,depthWrite:false
  });

  function size(){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);
    const bw=canvas.width,bh=canvas.height;W=w;H=h;
    SS=Math.max(1,Math.min(2,Math.sqrt(6e6/(bw*bh))));
    const sw=Math.round(bw*SS),sh=Math.round(bh*SS);
    rtN.setSize(sw,sh);rtC.setSize(sw,sh);rtE.setSize(sw,sh);
    down.uniforms.off.value.set(SS/4/bw,SS/4/bh);
    edge.uniforms.texel.value.set(1/sw,1/sh);
    edge.uniforms.stepPx.value=Math.max(1,renderer.getPixelRatio()*.85*SS);
    const asp=w/h,hh=Math.max(R*.62,R*.86/asp);
    cam.left=-hh*asp;cam.right=hh*asp;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix();
    needs=true;
  }

  // ---------- hover inspector ----------
  const selEl=fig.querySelector('[data-hz=sel]');
  let hover=null;
  function setHover(part){
    if(part===hover)return;hover=part;
    meshes.forEach(m=>{m.material=m.userData.part===part?tint:plain;});
    if(part){const p=PARTS[part];selEl.innerHTML='<b>'+p[0]+'</b>'+(p[1]?'<br>'+p[1]:'');}
    else selEl.textContent='Hover a part to name it.';
    needs=true;
  }
  const ray=new THREE.Raycaster();ray.layers.set(MESH);
  function pick(x,y){ray.setFromCamera(new THREE.Vector2(x/W*2-1,-(y/H*2-1)),cam);const h=ray.intersectObjects(meshes,false);return h.length?h[0].object.userData.part:null;}

  // ---------- input ----------
  let drag=null,lastInput=-1e9,needs=true,vis=true;
  const loc=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  canvas.addEventListener('pointerdown',e=>{const [x,y]=loc(e);drag={x,y,yaw,pitch,id:e.pointerId,moved:false};});
  canvas.addEventListener('pointermove',e=>{
    const [x,y]=loc(e);
    if(drag){const dx=x-drag.x,dy=y-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)>3){drag.moved=true;try{canvas.setPointerCapture(drag.id);}catch(_){}}
      if(drag.moved){yaw=drag.yaw-dx*.008;pitch=Math.min(1.25,Math.max(-.35,drag.pitch+dy*.006));lastInput=performance.now();needs=true;return;}}
    if(e.pointerType!=='touch')setHover(pick(x,y));
  });
  const end=e=>{if(drag&&!drag.moved){const [x,y]=loc(e);setHover(pick(x,y));}drag=null;lastInput=performance.now();};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('pointerleave',()=>{if(!drag)setHover(null);});
  canvas.addEventListener('keydown',e=>{
    const k=e.key,st=Math.PI/36;
    if(k==='ArrowLeft')yaw+=st;else if(k==='ArrowRight')yaw-=st;else if(k==='ArrowUp')pitch=Math.min(1.25,pitch+st);else if(k==='ArrowDown')pitch=Math.max(-.35,pitch-st);else return;
    e.preventDefault();lastInput=performance.now();needs=true;
  });
  new ResizeObserver(size).observe(canvas);size();
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;needs=true;}).observe(canvas);

  // ---------- loop ----------
  const deg=r=>((r*180/Math.PI)%360+360)%360;
  let last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(.1,(now-last)/1000);last=now;
    if(!vis)return;
    if(!reduce&&!drag&&now-lastInput>3500){yaw-=dt*2*Math.PI/70;needs=true;}
    if(!needs)return;needs=false;
    const dir=V(Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw));
    cam.position.copy(C).addScaledVector(dir,R*3);cam.up.set(0,1,0);cam.lookAt(C);cam.updateMatrixWorld();
    edge.uniforms.span.value=cam.far-cam.near;
    // pass 1: normals + depth of the solids
    cam.layers.set(MESH);scene.overrideMaterial=normalMat;
    renderer.setRenderTarget(rtN);renderer.setClearColor(0x000000,1);renderer.clear();renderer.render(scene,cam);
    // pass 2: flat fill (hover tint) plus belts
    cam.layers.enableAll();scene.overrideMaterial=null;
    renderer.setRenderTarget(rtC);renderer.setClearColor(BG,1);renderer.clear();renderer.render(scene,cam);
    // pass 3: ink the edges
    quad.material=edge;renderer.setRenderTarget(rtE);renderer.render(quadScene,quadCam);
    // pass 4: average down to the canvas
    quad.material=down;renderer.setRenderTarget(null);renderer.render(quadScene,quadCam);
    if(out)out.textContent='Az '+deg(-yaw+Math.PI).toFixed(0).padStart(3,'0')+'° · El '+(pitch*180/Math.PI).toFixed(0).padStart(2,'0')+'°';
  }
  requestAnimationFrame(frame);
})();
