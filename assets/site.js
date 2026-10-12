// Line drawings for the home page: hero crankshaft, Crew Chief J1962 connector,
// Drafting Table bracket. Needs three.js r128 loaded first.
(function(){
  if(!window.THREE){document.querySelectorAll('canvas').forEach(c=>c.hidden=true);document.querySelectorAll('.nogl').forEach(n=>n.hidden=false);return;}
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const Y=V(0,1,0);
  const clamp=(t,a=0,b=1)=>Math.min(b,Math.max(a,t));
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const easeOut=t=>1-Math.pow(1-t,3);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root=document.documentElement;
  const css=n=>getComputedStyle(root).getPropertyValue(n).trim();
  const tmp=new THREE.Vector3();
  const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};

  // ---------- shared materials, colored from CSS tokens ----------
  const M={
    fill:new THREE.MeshBasicMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}),
    hot:new THREE.MeshBasicMaterial({color:0xffeeee,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}),
    line:new THREE.LineBasicMaterial({color:0x000000}),
    hidden:new THREE.LineDashedMaterial({color:0x000000,dashSize:.07,gapSize:.05,depthFunc:THREE.GreaterDepth,depthWrite:false}),
    hiddenFlat:new THREE.LineDashedMaterial({color:0x000000,dashSize:.07,gapSize:.05,depthTest:false}),
    center:new THREE.LineDashedMaterial({color:0x000000,dashSize:.22,gapSize:.05,depthTest:false}),
    dim:new THREE.LineBasicMaterial({color:0x000000,depthTest:false}),
    accent:new THREE.LineBasicMaterial({color:0xff0000,depthTest:false}),
    pick:new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
  };
  const redraw=[];
  function theme(){
    const bg=css('--bg'),ln=css('--line'),i2=css('--ink-2'),ac=css('--accent');
    M.fill.color.set(bg);M.hot.color.set(bg).lerp(new THREE.Color(ac),.14);
    M.line.color.set(ln);M.hidden.color.set(i2);M.hiddenFlat.color.set(i2);M.center.color.set(i2);M.dim.color.set(i2);M.accent.color.set(ac);
    redraw.forEach(f=>f());
  }

  function makeRenderer(canvas){
    try{const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setClearColor(0x000000,0);return r;}
    catch(e){return null;}
  }

  // =====================================================================
  // Hero: inline-four crankshaft
  // =====================================================================
  (function(){
    const canvas=document.getElementById('crank'),thetaOut=document.getElementById('theta');
    const renderer=makeRenderer(canvas);if(!renderer){canvas.hidden=true;return;}
    let needs=true;redraw.push(()=>{needs=true;});
    const scene=new THREE.Scene(),spin=new THREE.Group(),body=new THREE.Group();scene.add(spin);spin.add(body);
    const THROW=45,cyls=[];
    function cyl(x0,len,r,oy,oz){
      const g=new THREE.CylinderGeometry(r,r,len,72,1,false);g.rotateZ(Math.PI/2);
      const m=new THREE.Mesh(g,M.fill);m.position.set(x0+len/2,oy,oz);
      const e=new THREE.LineSegments(new THREE.EdgesGeometry(g,30),M.line);e.position.copy(m.position);
      body.add(m,e);cyls.push({x0,x1:x0+len,r,p:V(0,oy,oz)});
    }
    const sh=new THREE.Shape(),a0=200*Math.PI/180,a1=340*Math.PI/180;
    sh.moveTo(27,THROW);sh.absarc(0,THROW,27,0,Math.PI,false);sh.lineTo(58*Math.cos(a0),58*Math.sin(a0));sh.absarc(0,0,58,a0,a1,false);sh.lineTo(27,THROW);
    function web(x0,ang){
      const g=new THREE.ExtrudeGeometry(sh,{depth:14,bevelEnabled:false,curveSegments:36});g.rotateY(Math.PI/2);g.rotateX(ang);
      const m=new THREE.Mesh(g,M.fill);m.position.x=x0;
      const e=new THREE.LineSegments(new THREE.EdgesGeometry(g,30),M.line);e.position.x=x0;body.add(m,e);
    }
    let x=0;cyl(x,40,16,0,0);x+=40;
    [0,Math.PI,Math.PI,0].forEach(a=>{cyl(x,22,25,0,0);x+=22;web(x,a);x+=14;cyl(x,20,22,THROW*Math.cos(a),THROW*Math.sin(a));x+=20;web(x,a);x+=14;});
    cyl(x,22,25,0,0);x+=22;cyl(x,12,48,0,0);x+=12;
    const LEN=x;body.position.x=-LEN/2;
    const silPos=new Float32Array(cyls.length*12),silGeo=new THREE.BufferGeometry();
    silGeo.setAttribute('position',new THREE.BufferAttribute(silPos,3));
    const sil=new THREE.LineSegments(silGeo,M.line);sil.frustumCulled=false;scene.add(sil);
    const cam=new THREE.OrthographicCamera(-1,1,1,-1,1,4000),vd=V(.3,.34,1).normalize();
    cam.position.copy(vd).multiplyScalar(1200);cam.lookAt(0,0,0);
    const nrm=V(1,0,0).cross(vd).normalize();
    function updateSil(a){const c=Math.cos(a),s=Math.sin(a);let i=0;cyls.forEach(k=>{const py=k.p.y*c-k.p.z*s,pz=k.p.y*s+k.p.z*c;for(const g of [1,-1]){const oy=py+nrm.y*k.r*g,oz=pz+nrm.z*k.r*g;silPos[i++]=k.x0-LEN/2;silPos[i++]=oy;silPos[i++]=oz;silPos[i++]=k.x1-LEN/2;silPos[i++]=oy;silPos[i++]=oz;}});silGeo.attributes.position.needsUpdate=true;}
    function size(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const asp=w/h,hh=Math.max(118,LEN*.56/asp),hw=hh*asp;cam.left=-hw;cam.right=hw;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix();needs=true;}
    new ResizeObserver(size).observe(canvas);size();
    let ang=reduce?.62:0,drag=null,vis=true,last=performance.now();const SPEED=2*Math.PI/48;
    canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,a:ang};try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;ang=drag.a+(e.clientX-drag.x)*.008;needs=true;});
    canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
    canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ang+=(e.key==='ArrowRight'?1:-1)*Math.PI/36;needs=true;e.preventDefault();}});
    new IntersectionObserver(es=>{vis=es[0].isIntersecting;needs=true;}).observe(canvas);
    function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(!vis)return;
      if(!reduce&&!drag){ang+=SPEED*dt;needs=true;}if(!needs)return;needs=false;
      spin.rotation.x=ang;updateSil(ang);renderer.render(scene,cam);
      thetaOut.textContent=(((ang*180/Math.PI)%360+360)%360).toFixed(1).padStart(5,'0')+'°';}
    requestAnimationFrame(frame);
  })();

  // =====================================================================
  // Drawing engine: ortho camera with view tweens, orbit, drafted annotations
  // =====================================================================
  class Drawing{
    constructor(fig,o){
      this.fig=fig;this.o=o;this.k=o.k;
      this.canvas=fig.querySelector('canvas');this.overlay=fig.querySelector('.ov');
      this.r=makeRenderer(this.canvas);
      if(!this.r){this.dead=true;this.canvas.hidden=true;fig.querySelector('.nogl').hidden=false;return;}
      this.scene=new THREE.Scene();this.cam=new THREE.OrthographicCamera(-1,1,1,-1,.001,1e5);
      this.items=[];this.pick=[];this.viewObjs=[];this.hiddenObjs=[];this.hiddenOn=true;
      this.view=o.initial;const v=o.views[o.initial];
      this.state={dir:v.dir.clone().normalize(),up:v.up.clone(),c:v.c.clone(),w:v.size[0],h:v.size[1]};
      this.tw=null;this.yaw=0;this.needs=true;this.visible=false;this.first=false;this.W=1;this.H=1;this.hover=null;
      redraw.push(()=>{this.needs=true;});
      o.build(this);this.bind();
      new ResizeObserver(()=>this.resize()).observe(this.canvas);this.resize();
      new IntersectionObserver(es=>{this.visible=es[0].isIntersecting;this.needs=true;
        if(this.visible&&!this.first){this.first=true;o.onFirst&&o.onFirst(this);}},{threshold:.3}).observe(this.canvas);
      fig.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>this.setView(b.dataset.view)));
    }
    resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.W=w;this.H=h;this.r.setSize(w,h,false);this.needs=true;}
    effState(){const s=this.state;const q=new THREE.Quaternion().setFromAxisAngle(Y,this.yaw);
      return {dir:s.dir.clone().applyQuaternion(q),up:s.up.clone().applyQuaternion(q),c:s.c.clone(),w:s.w,h:s.h};}
    setView(key){
      const v=this.o.views[key];
      this.tw={from:this.effState(),to:{dir:v.dir.clone().normalize(),up:v.up.clone(),c:v.c.clone(),w:v.size[0],h:v.size[1]},t0:performance.now(),dur:reduce?1:780};
      this.view=key;this.yaw=0;this.items.forEach(i=>{i.t=0;i.start=null;});this.needs=true;
      this.fig.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));
      this.o.onView&&this.o.onView(this,key);
    }
    settled(){return !this.tw&&Math.abs(this.yaw)<1e-4;}
    bind(){
      const cv=this.canvas,ray=new THREE.Raycaster();let down=null;
      const loc=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
      const pick=(x,y)=>{if(!this.pick.length)return null;ray.setFromCamera(new THREE.Vector2(x/this.W*2-1,-(y/this.H*2-1)),this.cam);const h=ray.intersectObjects(this.pick,false);return h.length?h[0].object:null;};
      cv.addEventListener('pointerdown',e=>{const [x,y]=loc(e);down={x,yaw:this.yaw,drag:false,id:e.pointerId};});
      cv.addEventListener('pointermove',e=>{const [x,y]=loc(e);
        if(down){const dx=x-down.x;
          if(!down.drag&&Math.abs(dx)>4){down.drag=true;if(this.tw){this.state=this.tw.to;this.tw=null;}try{cv.setPointerCapture(down.id);}catch(_){}
            this.fig.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));this.o.onOrbit&&this.o.onOrbit(this);}
          if(down.drag){this.yaw=down.yaw+dx*.008;this.needs=true;return;}}
        if(e.pointerType!=='touch')this.setHover(pick(x,y));});
      cv.addEventListener('pointerup',e=>{const [x,y]=loc(e);const d=down;down=null;if(d&&!d.drag)this.setHover(pick(x,y));});
      cv.addEventListener('pointercancel',()=>{down=null;});
      cv.addEventListener('pointerleave',()=>{if(!down)this.setHover(null);});
    }
    setHover(obj){if(this.hover===obj)return;this.hover=obj;this.o.hover&&this.o.hover(this,obj);this.needs=true;}
    frame(now){
      if(this.dead||!this.visible)return;
      let anim=false;
      if(this.tw){const e=clamp((now-this.tw.t0)/this.tw.dur),s=ease(e),a=this.tw.from,b=this.tw.to;
        this.state={dir:a.dir.clone().lerp(b.dir,s).normalize(),up:a.up.clone().lerp(b.up,s).normalize(),c:a.c.clone().lerp(b.c,s),w:a.w+(b.w-a.w)*s,h:a.h+(b.h-a.h)*s};
        anim=true;
        if(e>=1){this.state=b;this.tw=null;let i=0;this.items.forEach(it=>{if(it.view===this.view){it.start=now+60+i*140;i++;}});}}
      this.items.forEach(it=>{if(it.start!=null){if(now<it.start){anim=true;return;}it.t=reduce?1:clamp((now-it.start)/620);if(it.t>=1)it.start=null;else anim=true;}});
      if(this.o.tick&&this.o.tick(this,now))anim=true;
      if(!this.needs&&!anim)return;this.needs=false;
      const st=this.effState(),asp=this.W/this.H,hh=Math.max(st.h/2,st.w/2/asp),hw=hh*asp,c=this.cam;
      c.left=-hw;c.right=hw;c.top=hh;c.bottom=-hh;c.far=this.o.dist*4;
      c.position.copy(st.c).addScaledVector(st.dir,this.o.dist);c.up.copy(st.up);c.lookAt(st.c);c.updateProjectionMatrix();c.updateMatrixWorld();
      this.dir=st.dir;
      const ok=this.settled();
      this.viewObjs.forEach(v=>{v.obj.visible=ok&&v.view===this.view&&(!v.hidden||this.hiddenOn);});
      this.hiddenObjs.forEach(h=>{h.visible=this.hiddenOn;});
      this.items.forEach(it=>{it.update(ok&&it.view===this.view);
        if(!it.el.hidden){const p=tmp.copy(it.labelPos).project(c);
          it.el.style.transform='translate('+((p.x+1)/2*this.W).toFixed(1)+'px,'+((1-p.y)/2*this.H).toFixed(1)+'px) '+(it.align||'translate(-50%,-50%)');}});
      this.r.render(this.scene,c);
    }
  }
  function lineObj(dr,n,mat){const pos=new Float32Array(n*3),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const o=new THREE.LineSegments(g,mat);o.frustumCulled=false;o.renderOrder=5;dr.scene.add(o);return {pos,g,o};}
  function writeSegs(L,segs){for(let i=0;i<segs.length;i++){L.pos[i*3]=segs[i].x;L.pos[i*3+1]=segs[i].y;L.pos[i*3+2]=segs[i].z;}L.g.attributes.position.needsUpdate=true;L.g.setDrawRange(0,segs.length);}
  const fmt=(v,dp)=>v.toFixed(dp).replace(/^0\./,'.');

  class Dim{
    constructor(dr,view,o){Object.assign(this,o);this.dr=dr;this.view=view;this.t=0;this.start=null;
      this.L=lineObj(dr,48,M.dim);this.el=mk('div','dl');this.el.hidden=true;dr.overlay.appendChild(this.el);dr.items.push(this);}
    update(on){
      if(!on||this.t<=0){this.L.g.setDrawRange(0,0);this.el.hidden=true;return;}
      const k=this.dr.k,a=this.a,b=this.b,u=this.u,d=this.d,s=this.s;
      const ea=s-a.dot(d),eb=s-b.dot(d),A2=a.clone().addScaledVector(d,ea),B2=b.clone().addScaledVector(d,eb);
      const val=Math.abs(b.clone().sub(a).dot(u));
      const te=easeOut(clamp(this.t/.45)),tl=easeOut(clamp((this.t-.25)/.75));
      const segs=[],GAP=1*k,OV=1.6*k,AL=2.2*k,AW=.7*k;
      const ext=(p,e)=>{if(Math.abs(e)<GAP+.2*k)return;const sg=Math.sign(e),st=p.clone().addScaledVector(d,sg*GAP),en=p.clone().addScaledVector(d,e+sg*OV);segs.push(st,st.clone().lerp(en,te));};
      ext(a,ea);ext(b,eb);
      const mid=A2.clone().add(B2).multiplyScalar(.5),len=A2.distanceTo(B2);
      if(len>1e-6){const ua=A2.clone().sub(mid).normalize(),ub=ua.clone().negate(),short=len<AL*3.2;
        const arrow=(tp,out)=>{const base=tp.clone().addScaledVector(out,-AL);segs.push(tp,base.clone().addScaledVector(d,AW),tp,base.clone().addScaledVector(d,-AW));};
        if(short)segs.push(A2.clone().addScaledVector(ua,AL*2.2*tl),B2.clone().addScaledVector(ub,AL*2.2*tl));
        else segs.push(mid.clone().lerp(A2,tl),mid.clone().lerp(B2,tl));
        if(tl>.97){arrow(A2,short?ub:ua);arrow(B2,short?ua:ub);}}
      writeSegs(this.L,segs);
      this.labelPos=mid.add(this.lo||V(0,0,0));
      this.el.textContent=fmt(val*tl,this.dp||2);this.el.hidden=tl<=0;
    }
  }
  class Leader{
    constructor(dr,view,o){Object.assign(this,o);this.dr=dr;this.view=view;this.t=0;this.start=null;
      this.L=lineObj(dr,12,M.dim);this.el=mk('div','ll',o.text);this.el.hidden=true;dr.overlay.appendChild(this.el);dr.items.push(this);
      this.align=o.side>0?'translate(5px,-50%)':'translate(calc(-100% - 5px),-50%)';}
    update(on){
      if(!on||this.t<=0){this.L.g.setDrawRange(0,0);this.el.hidden=true;return;}
      const k=this.dr.k,A=this.anchor,E=this.elbow,S=E.clone().addScaledVector(this.along,this.len*this.side);
      const te=easeOut(clamp(this.t/.5)),ts=easeOut(clamp((this.t-.4)/.6)),segs=[A,A.clone().lerp(E,te)];
      if(ts>0)segs.push(E,E.clone().lerp(S,ts));
      if(te>.95){const u=A.clone().sub(E).normalize(),pp=u.clone().cross(this.dr.dir).normalize(),AL=2*k,AW=.6*k,base=A.clone().addScaledVector(u,-AL);
        segs.push(A,base.clone().addScaledVector(pp,AW),A,base.clone().addScaledVector(pp,-AW));}
      writeSegs(this.L,segs);this.labelPos=S;this.el.hidden=ts<.9;
    }
  }
  class Tag{
    constructor(dr,view,p,text,cls){this.dr=dr;this.view=view;this.labelPos=p;this.t=0;this.start=null;this.el=mk('div',cls,text);this.el.hidden=true;dr.overlay.appendChild(this.el);dr.items.push(this);}
    update(on){this.el.hidden=!on||this.t<.3;}
  }
  function solid(dr,geo,opt){opt=opt||{};
    const g=new THREE.Group(),m=new THREE.Mesh(geo,M.fill),eg=new THREE.EdgesGeometry(geo,opt.th||20),e=new THREE.LineSegments(eg,M.line);
    e.renderOrder=1;g.add(m,e);
    if(opt.hidden){const h=new THREE.LineSegments(eg,M.hidden);h.computeLineDistances();h.renderOrder=2;g.add(h);dr.hiddenObjs.push(h);}
    if(opt.pos)g.position.copy(opt.pos);
    if(opt.hit){m.userData=opt.hit;dr.pick.push(m);}
    dr.scene.add(g);return m;
  }
  function segLines(dr,pairs,mat,view,hidden){const pts=[];pairs.forEach(p=>pts.push(p[0],p[1]));
    const o=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),mat);o.computeLineDistances();o.renderOrder=4;o.frustumCulled=false;
    dr.scene.add(o);dr.viewObjs.push({obj:o,view,hidden});return o;}
  const poly=(pts,P)=>{const s=new (P||THREE.Shape)();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.lineTo(pts[0][0],pts[0][1]);return s;};
  const circ=(x,y,r)=>{const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,false);return p;};

  // =====================================================================
  // Crew Chief: J1962 data link connector (mm)
  // =====================================================================
  const PINFN={1:'Manufacturer discretionary',2:'SAE J1850 bus +',3:'Manufacturer discretionary',4:'Chassis ground',5:'Signal ground',
    6:'CAN high · ISO 15765-4',7:'K-line · ISO 9141-2 / 14230-4',8:'Manufacturer discretionary',9:'Manufacturer discretionary',10:'SAE J1850 bus −',
    11:'Manufacturer discretionary',12:'Manufacturer discretionary',13:'Manufacturer discretionary',14:'CAN low · ISO 15765-4',15:'L-line · ISO 9141-2 / 14230-4',16:'Battery +12 V'};
  const LEGEND=[16,4,5,6,14,7,15];
  const pinXY=n=>n<=8?[-12.25+(n-1)*3.5,2.5]:[-12.25+(n-9)*3.5,-2.5];
  const ccStatus=document.getElementById('cc-status'),ccPins=document.getElementById('cc-pins'),ccLog=document.getElementById('cc-log');
  const rings={};let ccHover=null,ccLegend=null,pulseUntil=0,lastPulse=false,nextAt=0;
  function ccShow(n){
    if(!n){ccStatus.textContent='Select a pin to see its function.';}
    else{ccStatus.innerHTML='<b>Pin '+n+'</b> · '+PINFN[n];}
    ccPins.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.pin===n));
  }
  function ccRings(now){const p=now<pulseUntil;for(const n in rings)rings[n].visible=(+n===ccHover)||(+n===ccLegend)||(p&&(n==='6'||n==='14'));return p;}

  LEGEND.forEach(n=>{const li=mk('li'),b=mk('button');b.type='button';b.dataset.pin=n;
    b.append(mk('span',null,String(n).padStart(2,'0')),mk('span',null,PINFN[n].replace(' · ISO 15765-4','').replace(' · ISO 9141-2 / 14230-4','')));
    const on=()=>{ccLegend=n;ccShow(n);cc&&(cc.needs=true);},off=()=>{ccLegend=null;ccShow(ccHover);cc&&(cc.needs=true);};
    b.addEventListener('mouseenter',on);b.addEventListener('mouseleave',off);b.addEventListener('focus',on);b.addEventListener('blur',off);
    b.addEventListener('click',()=>{if(cc&&cc.view!=='face')cc.setView('face');on();});
    li.append(b);ccPins.append(li);});

  // sample OBD2 mode 01 traffic, decoded per SAE J1979
  const hex=b=>b.toString(16).toUpperCase().padStart(2,'0');
  const PIDS=[
    {pid:0x0C,name:'engine speed',gen:()=>{const raw=Math.round((720+Math.random()*2300)*4);return [raw>>8,raw&255];},dec:b=>((b[0]*256+b[1])/4).toFixed(0)+' rpm'},
    {pid:0x05,name:'coolant temp',gen:()=>[Math.round(122+Math.random()*10)],dec:b=>(b[0]-40)+' °C'},
    {pid:0x0D,name:'vehicle speed',gen:()=>[Math.round(Math.random()*96)],dec:b=>b[0]+' km/h'},
    {pid:0x0B,name:'intake pressure',gen:()=>[Math.round(32+Math.random()*140)],dec:b=>b[0]+' kPa'},
    {pid:0x11,name:'throttle position',gen:()=>[Math.round(Math.random()*255)],dec:b=>(b[0]*100/255).toFixed(1)+' %'}
  ];
  let pidIx=0;
  function logLine(cls,id,bytes,dec,fresh){const li=mk('li',cls+(fresh?' new':''));li.append(mk('span','id',id),mk('span',null,bytes),mk('span','dec',dec));ccLog.prepend(li);while(ccLog.children.length>6)ccLog.lastChild.remove();}
  function exchange(fresh){const p=PIDS[pidIx++%PIDS.length],d=p.gen();
    logLine('tx','7DF',['02','01',hex(p.pid)].join(' '),'Request · '+p.name,fresh);
    logLine('rx','7E8',[hex(2+d.length),'41',hex(p.pid)].concat(d.map(hex)).join(' '),p.dec(d),fresh);}
  exchange(false);exchange(false);exchange(false);

  let cc=null;
  cc=new Drawing(document.getElementById('cc-fig'),{
    k:.5,dist:400,initial:'iso',
    views:{
      face:{dir:V(0,0,1),up:V(0,1,0),c:V(0,3,17),size:[100,52]},
      iso:{dir:V(.82,.5,1.05),up:V(0,1,0),c:V(0,1.5,10),size:[78,60]}
    },
    build(dr){
      const OUT=[[-21,9],[21,9],[21,-3],[15,-9],[-15,-9],[-21,-3]],CAV=[[-18,6.5],[18,6.5],[18,-2],[13.5,-6.5],[-13.5,-6.5],[-18,-2]];
      const shell=poly(OUT);shell.holes.push(poly(CAV,THREE.Path));
      solid(dr,new THREE.ExtrudeGeometry(shell,{depth:20,bevelEnabled:false}));
      const ins=poly(CAV);for(let n=1;n<=16;n++){const [x,y]=pinXY(n);ins.holes.push(circ(x,y,.95));}
      solid(dr,new THREE.ExtrudeGeometry(ins,{depth:14,bevelEnabled:false,curveSegments:20}));
      const fl=poly([[-30,-12],[30,-12],[30,12],[-30,12]]);fl.holes.push(poly(OUT,THREE.Path),circ(-25.5,0,1.7),circ(25.5,0,1.7));
      solid(dr,new THREE.ExtrudeGeometry(fl,{depth:2.5,bevelEnabled:false,curveSegments:20}),{pos:V(0,0,15)});
      for(let n=1;n<=16;n++){
        const [x,y]=pinXY(n);
        const sg=new THREE.CylinderGeometry(.5,.5,9,16);sg.rotateX(Math.PI/2);solid(dr,sg,{pos:V(x,y,9)});
        const disc=new THREE.Mesh(new THREE.CircleGeometry(1.6,20),M.pick);disc.position.set(x,y,14.05);disc.userData={pin:n};dr.scene.add(disc);dr.pick.push(disc);
        const pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;pts.push(V(x+Math.cos(a)*1.5,y+Math.sin(a)*1.5,14.12));}
        const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),M.accent);ring.visible=false;ring.renderOrder=6;dr.scene.add(ring);rings[n]=ring;
        new Tag(dr,'face',V(x,y+(n<=8?2.6:-2.6),14.1),String(n),'pn');
      }
      const lead=(n,ex,ey,side,text)=>{const [x,y]=pinXY(n),P=V(x,y,14.1),E=V(ex,ey,14.1),A=P.clone().addScaledVector(E.clone().sub(P).normalize(),1.6);
        new Leader(dr,'face',{anchor:A,elbow:E,along:V(1,0,0),side,len:2.4,text});};
      lead(4,-12,15,-1,'4  Chassis ground');
      lead(5,1.75,21,1,'5  Signal ground');
      lead(6,16,15,1,'6  CAN high');
      lead(14,4,-18,-1,'14  CAN low');
      lead(16,16,-14,1,'16  Battery +12 V');
    },
    onFirst(dr){setTimeout(()=>dr.setView('face'),reduce?0:650);nextAt=performance.now()+1400;},
    hover(dr,obj){ccHover=obj?obj.userData.pin:null;ccShow(ccHover||ccLegend);},
    tick(dr,now){
      if(!reduce&&now>=nextAt){exchange(true);pulseUntil=now+340;nextAt=now+2200;}
      const p=ccRings(now);const changed=p!==lastPulse;lastPulse=p;
      return p||changed;
    }
  });

  // =====================================================================
  // Drafting Table: gusseted angle bracket (inches)
  // =====================================================================
  const dtView=document.getElementById('dt-view'),dtHid=document.getElementById('dt-hid'),dtSel=document.getElementById('dt-sel'),dtBtn=document.getElementById('dt-hidden');
  const VIEWNAME={front:'Front',top:'Top',right:'Right side',iso:'Isometric'};
  const R=.203; // Ø.406 thru, for 3/8 bolts
  const dt=new Drawing(document.getElementById('dt-fig'),{
    k:.04,dist:40,initial:'iso',
    views:{
      front:{dir:V(0,0,1),up:V(0,1,0),c:V(2.25,1.75,1.5),size:[6.8,5.6]},
      top:{dir:V(0,1,0),up:V(0,0,-1),c:V(2.4,1,1.25),size:[7.4,4.8]},
      right:{dir:V(1,0,0),up:V(0,1,0),c:V(2,1.75,.9),size:[5.4,5.6]},
      iso:{dir:V(1,.85,1.25),up:V(0,1,0),c:V(2,1.7,1.5),size:[7.6,6.6]}
    },
    build(dr){
      // base plate 4.00 × 3.00 × .375 with two holes
      const bs=poly([[0,0],[4,0],[4,3],[0,3]]);bs.holes.push(circ(3.25,.75,R),circ(3.25,2.25,R));
      const bg=new THREE.ExtrudeGeometry(bs,{depth:.375,bevelEnabled:false,curveSegments:40});bg.rotateX(Math.PI/2);bg.translate(0,.375,0);
      solid(dr,bg,{hidden:true,hit:{part:'base'}});
      // upright 3.00 × 3.625 × .375 with vertical slot
      const us=poly([[0,.375],[3,.375],[3,4],[0,4]]);
      const sl=new THREE.Path(),y1=2.8,y2=3.394;sl.moveTo(1.5-R,y1);sl.lineTo(1.5-R,y2);sl.absarc(1.5,y2,R,Math.PI,0,true);sl.lineTo(1.5+R,y1);sl.absarc(1.5,y1,R,0,Math.PI,true);
      us.holes.push(sl);
      const ug=new THREE.ExtrudeGeometry(us,{depth:.375,bevelEnabled:false,curveSegments:40});ug.rotateY(-Math.PI/2);ug.translate(.375,0,0);
      solid(dr,ug,{hidden:true,hit:{part:'upright'}});
      // gusset .25 plate
      const gg=new THREE.ExtrudeGeometry(poly([[.375,.375],[2.5,.375],[.375,2.5]]),{depth:.25,bevelEnabled:false});gg.translate(0,0,1.375);
      solid(dr,gg,{hidden:true,hit:{part:'gusset'}});
      // hidden silhouettes of holes and slot, per view
      segLines(dr,[[V(3.25-R,0,3.1),V(3.25-R,.375,3.1)],[V(3.25+R,0,3.1),V(3.25+R,.375,3.1)],[V(0,y1-R,3.1),V(.375,y1-R,3.1)],[V(0,y2+R,3.1),V(.375,y2+R,3.1)]],M.hiddenFlat,'front',true);
      segLines(dr,[[V(4.1,0,.75-R),V(4.1,.375,.75-R)],[V(4.1,0,.75+R),V(4.1,.375,.75+R)],[V(4.1,0,2.25-R),V(4.1,.375,2.25-R)],[V(4.1,0,2.25+R),V(4.1,.375,2.25+R)]],M.hiddenFlat,'right',true);
      segLines(dr,[[V(0,4.1,1.5-R),V(.375,4.1,1.5-R)],[V(0,4.1,1.5+R),V(.375,4.1,1.5+R)]],M.hiddenFlat,'top',true);
      // centerlines
      const cm=(x,z)=>[[V(x-.36,.4,z),V(x+.36,.4,z)],[V(x,.4,z-.36),V(x,.4,z+.36)]];
      segLines(dr,cm(3.25,.75).concat(cm(3.25,2.25)),M.center,'top',false);
      segLines(dr,[[V(3.25,-.14,3.1),V(3.25,.52,3.1)]],M.center,'front',false);
      segLines(dr,[[V(4.1,y1-.45,1.5),V(4.1,y2+.45,1.5)],[V(4.1,-.14,.75),V(4.1,.52,.75)],[V(4.1,-.14,2.25),V(4.1,.52,2.25)]],M.center,'right',false);
      // dimensions
      new Dim(dr,'front',{a:V(0,0,3),b:V(4,0,3),u:V(1,0,0),d:V(0,-1,0),s:.5});
      new Dim(dr,'front',{a:V(0,0,3),b:V(0,4,3),u:V(0,1,0),d:V(-1,0,0),s:.5});
      new Dim(dr,'front',{a:V(4,0,3),b:V(4,.375,3),u:V(0,1,0),d:V(1,0,0),s:4.45,dp:3,lo:V(.34,0,0)});
      new Leader(dr,'front',{anchor:V(1.05,1.05,3),elbow:V(2.2,2.35,3),along:V(1,0,0),side:1,len:.3,text:'.25 gusset'});
      new Dim(dr,'top',{a:V(0,4,0),b:V(0,4,3),u:V(0,0,1),d:V(-1,0,0),s:.5});
      new Dim(dr,'top',{a:V(3.25,.375,.75),b:V(3.25,.375,2.25),u:V(0,0,1),d:V(1,0,0),s:4.45});
      new Leader(dr,'top',{anchor:V(3.25+R*.707,.4,.75-R*.707),elbow:V(3.75,.4,-.42),along:V(1,0,0),side:1,len:.25,text:'2× Ø.406 thru'});
      new Dim(dr,'right',{a:V(4,0,0),b:V(4,0,3),u:V(0,0,1),d:V(0,-1,0),s:.5});
      new Leader(dr,'right',{anchor:V(.4,y2+R,1.5),elbow:V(.4,4.4,.75),along:V(0,0,-1),side:1,len:.25,text:'.406 × 1.00 slot'});
    },
    onFirst(dr){setTimeout(()=>dr.setView('front'),reduce?0:900);},
    onView(dr,key){dtView.textContent=VIEWNAME[key];},
    onOrbit(){dtView.textContent='Orbit';},
    hover(dr,obj){
      dr.pick.forEach(m=>m.material=M.fill);
      if(!obj){dtSel.textContent='Hover a part to inspect it.';return;}
      obj.material=M.hot;
      const P={base:'<b>Base plate</b><br>4.00 × 3.00 × .375<br>2× Ø.406 thru, 1.50 c–c',
               upright:'<b>Upright</b><br>3.00 × 3.625 × .375<br>.406 × 1.00 slot',
               gusset:'<b>Gusset</b><br>.25 plate, 2.125 legs<br>Welded both sides'};
      dtSel.innerHTML=P[obj.userData.part];
    }
  });
  dtBtn.addEventListener('click',()=>{if(dt.dead)return;dt.hiddenOn=!dt.hiddenOn;dtBtn.setAttribute('aria-pressed',String(dt.hiddenOn));dtHid.textContent=dt.hiddenOn?'Shown, dashed':'Removed';dt.needs=true;});

  theme();
  const drawings=[cc,dt];
  function loop(now){requestAnimationFrame(loop);drawings.forEach(d=>d&&d.frame(now));}
  requestAnimationFrame(loop);
})();
