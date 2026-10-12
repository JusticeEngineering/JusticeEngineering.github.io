// Home page figure: Toyota 1HZ inline-six diesel as a turnable line drawing.
// Built from primitives (dimensions approximate, in mm) and drawn with a
// normal + depth edge pass so curved parts keep their silhouettes at any angle.
// Needs three.js r128 loaded first.
(function(){
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
  const beltMat=new THREE.LineBasicMaterial({color:INK});
  const meshes=[];
  const MESH=1,LINE=2; // layers: the edge pass sees only solids

  // ---------- part catalogue (shown in the inspector) ----------
  const PARTS={
    block:['Cylinder block','Cast iron, six cylinders in line'],
    head:['Cylinder head','Single overhead cam, two valves per cylinder'],
    cover:['Valve cover','Over the camshaft and rockers'],
    timing:['Timing belt cover','The belt turns the camshaft and the injection pump'],
    pump:['Injection pump','Rotary distributor type, driven by the timing belt'],
    injectors:['Injectors ×6','One per cylinder, into the swirl chamber'],
    lines:['Injection lines','Six steel lines from the pump head'],
    intake:['Intake manifold','Naturally aspirated, opposite the exhaust (cross-flow head)'],
    exhaust:['Exhaust manifold','Two cast pieces: front 2 ports, rear 4 ports'],
    damper:['Crank pulley','Drives the accessory belts'],
    water:['Water pump and fan clutch','Belt driven from the crank'],
    alt:['Alternator','Belt driven from the crank'],
    steer:['Power steering pump','Second belt off the crank'],
    pan:['Oil pan','Deep sump at the front, over the front axle'],
    filter:['Oil filter','Spin-on, mounted low on the pump side'],
    starter:['Starter motor','Bolted to the flywheel housing'],
    bell:['Flywheel housing','Mates to the transmission'],
    mounts:['Engine mounts','One each side of the block'],
    outlet:['Water outlet','Thermostat housing, to the radiator'],
    dipstick:['Oil dipstick','']
  };

  function add(geo,part,opt){
    opt=opt||{};
    const m=new THREE.Mesh(geo,plain);m.userData.part=part;m.layers.set(MESH);
    if(opt.pos)m.position.copy(opt.pos);
    scene.add(m);meshes.push(m);return m;
  }
  // Prism: profile drawn in (z,y), extruded along +x from x0 by len.
  function prismX(pts,x0,len,part,curve){
    const s=new THREE.Shape();s.moveTo(-pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)s.lineTo(-pts[i][0],pts[i][1]);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false,curveSegments:curve||12});
    g.rotateY(Math.PI/2);g.translate(x0,0,0);return add(g,part);
  }
  // Cylinder along x.
  function cylX(r,x0,x1,y,z,part,r2,seg){
    const g=new THREE.CylinderGeometry(r2==null?r:r2,r,x1-x0,seg||48);g.rotateZ(-Math.PI/2);g.translate((x0+x1)/2,y,z);return add(g,part);
  }
  // Cylinder between two points.
  function cylAB(r,a,b,part,seg){
    const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,d.length(),seg||32);
    const m=add(g,part);m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m;
  }
  function box(x0,x1,y0,y1,z0,z1,part){
    const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return add(g,part);
  }
  function tube(pts,r,part,seg){
    const c=new THREE.CatmullRomCurve3(pts.map(p=>V(p[0],p[1],p[2])));
    return add(new THREE.TubeGeometry(c,seg||40,r,16,false),part);
  }
  // Convex hull (monotone chain) of points in 2D, for covers and belts.
  function hull(P){
    P=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lo=[],up=[];
    for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
    for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
    up.pop();lo.pop();return lo.concat(up);
  }
  const ring=(cz,cy,r,n)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([cz+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;};
  function belt(x,circles){
    let P=[];circles.forEach(c=>{P=P.concat(ring(c[0],c[1],c[2],72));});
    const h=hull(P),pts=h.map(p=>V(x,p[1],p[0]));
    const l=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),beltMat);l.layers.set(LINE);scene.add(l);
  }

  // ---------- geometry ----------
  const P=108,XC=i=>84+P*i; // cylinder pitch and centres, front (timing end) at x=0

  // block, with flared skirt and side ribs
  prismX([[-115,300],[115,300],[108,140],[125,60],[125,-60],[-125,-60],[-125,60],[-108,140]],0,690,'block');
  for(let i=0;i<=6;i++){const x=30+P*i;box(x-6,x+6,150,296,108,122,'block');box(x-6,x+6,150,296,-122,-108,'block');}
  [190,406].forEach(x=>{const g=new THREE.CylinderGeometry(18,18,8,32);g.rotateX(Math.PI/2);g.translate(x,200,114);add(g,'block');});
  // head and gasket line
  prismX([[-122,298],[122,298],[122,304],[-122,304]],12,672,'head');
  prismX([[-120,304],[120,304],[120,410],[-120,410]],15,665,'head');
  // valve cover with a centre ridge and filler cap
  prismX([[-112,410],[112,410],[112,440],[88,468],[-88,468],[-112,440]],22,650,'cover');
  box(40,650,468,475,-50,50,'cover');
  {const g=new THREE.CylinderGeometry(26,26,22,40);g.translate(130,486,-40);add(g,'cover');}
  // lifting eyes
  box(-6,14,410,470,58,72,'head');box(668,688,410,470,-72,-58,'head');

  // timing belt cover: hull around the crank, cam and pump pulleys
  {const pts=hull(ring(0,0,118,48).concat(ring(0,385,82,48),ring(-150,190,78,48)));
   prismX(pts,-38,38,'timing',4);}
  // crank pulley with two grooves
  cylX(96,-78,-62,0,0,'damper');cylX(84,-62,-52,0,0,'damper');cylX(96,-52,-38,0,0,'damper');cylX(30,-90,-78,0,0,'damper');
  // water pump pulley and fan clutch
  cylX(58,-78,-62,250,0,'water');cylX(36,-62,-38,250,0,'water');cylX(70,-135,-80,250,0,'water');cylX(42,-150,-135,250,0,'water');
  // alternator
  cylX(68,-20,140,150,185,'alt');cylX(34,-78,-62,150,185,'alt');cylX(18,-62,-20,150,185,'alt');
  box(20,110,160,180,120,170,'alt');
  // power steering pump (second belt)
  cylX(46,-30,100,-30,182,'steer');cylX(48,-62,-50,-30,182,'steer');cylX(16,-50,-30,-30,182,'steer');
  // belts
  belt(-70,[[0,0,96],[0,250,58],[185,150,34]]);
  belt(-56,[[0,0,84],[182,-30,48]]);

  // injection pump, low on the -z side behind the cover
  cylX(50,0,175,190,-150,'pump');cylX(38,175,232,190,-150,'pump');
  box(40,170,232,278,-186,-114,'pump');box(150,162,278,300,-160,-140,'pump');
  const outlets=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2;outlets.push([232,190+Math.sin(a)*24,-150+Math.cos(a)*24]);}
  outlets.forEach(o=>cylX(5,232,244,o[1],o[2],'pump',null,12));
  // injectors on the intake (-z) side of the head, below the manifold; lines from the pump head
  for(let i=0;i<6;i++){
    const x=XC(i);
    cylAB(10,V(x,350,-152),V(x,334,-118),'injectors',20);
    cylAB(13,V(x,355,-168),V(x,350,-152),'injectors',20);
    const o=outlets[i];
    tube([[o[0]+12,o[1],o[2]],[o[0]+40,o[1]+10,o[2]-12],[x-20+i*4,300,-196],[x,348,-184],[x,355,-172]],3.5,'lines',48);
  }

  // intake (cross-flow head: opposite the exhaust), plenum with six runners and an elbow
  cylX(42,70,620,398,-212,'intake');
  for(let i=0;i<6;i++){const x=XC(i);tube([[x,398,-207],[x,397,-168],[x,388,-122]],20,'intake');}
  tube([[72,398,-212],[40,405,-219],[10,433,-225],[-8,465,-225]],38,'intake');
  cylAB(50,V(-6,463,-225),V(-16,481,-225),'intake',40);
  // exhaust: two cast pieces (front 2 ports, rear 4) meeting at the outlet flange
  cylX(28,60,220,288,180,'exhaust');cylX(28,256,630,288,180,'exhaust');
  box(214,262,250,316,156,206,'exhaust');
  for(let i=0;i<6;i++){const x=XC(i);tube([[x,340,121],[x,326,152],[x,298,174]],18,'exhaust');}
  tube([[238,252,184],[240,170,200],[248,40,212],[262,-110,214]],32,'exhaust');

  // oil pan, flange and rear sump
  prismX([[-127,-60],[127,-60],[127,-67],[-127,-67]],0,690,'pan');
  prismX([[-120,-67],[120,-67],[112,-118],[-112,-118]],15,670,'pan');
  prismX([[-108,-118],[108,-118],[96,-245],[-96,-245]],40,300,'pan');
  {const g=new THREE.CylinderGeometry(14,14,12,24);g.translate(300,-251,40);add(g,'pan');}
  // oil filter, dipstick
  cylAB(34,V(330,60,-126),V(330,40,-150),'filter');cylAB(48,V(330,40,-150),V(330,-30,-240),'filter');
  tube([[250,-40,-128],[252,120,-136],[248,300,-146],[240,440,-150]],4.5,'dipstick');
  {const g=new THREE.TorusGeometry(13,3.5,10,28);g.rotateY(Math.PI/2);g.translate(240,456,-150);add(g,'dipstick');}
  // starter
  cylX(48,560,690,-25,-155,'starter');cylX(24,575,680,42,-155,'starter');
  // flywheel housing
  {const g=new THREE.CylinderGeometry(250,232,70,72);g.rotateZ(-Math.PI/2);g.translate(725,0,0);add(g,'bell');}
  // mounts
  box(170,240,0,70,124,180,'mounts');box(170,240,0,70,-180,-124,'mounts');
  cylAB(30,V(205,70,180),V(205,70,215),'mounts');cylAB(30,V(205,70,-180),V(205,70,-215),'mounts');
  // water outlet on the head front
  cylAB(24,V(45,410,40),V(-10,455,40),'outlet');cylAB(34,V(48,406,40),V(40,414,40),'outlet');

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
  const rtN=mkRT(true),rtC=mkRT(false);
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
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),edge));

  function size(){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);
    const bw=canvas.width,bh=canvas.height;W=w;H=h;
    rtN.setSize(bw,bh);rtC.setSize(bw,bh);
    edge.uniforms.texel.value.set(1/bw,1/bh);
    edge.uniforms.stepPx.value=Math.max(1,renderer.getPixelRatio()*.85);
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
    renderer.setRenderTarget(null);renderer.render(quadScene,quadCam);
    if(out)out.textContent='Az '+deg(-yaw+Math.PI).toFixed(0).padStart(3,'0')+'° · El '+(pitch*180/Math.PI).toFixed(0).padStart(2,'0')+'°';
  }
  requestAnimationFrame(frame);
})();
