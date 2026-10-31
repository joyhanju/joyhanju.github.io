/* 사라진 걸작을 찾아라 · 게임 동작 코드 */
/* ============ 유틸 ============ */
const $=s=>document.querySelector(s);
const app=$('#app'), bar=$('#bar'), ov=$('#overlay');
const SAVE='artDetective.v3', PREF='artDetective.pref';
let S=null, PUZ=null, timerId=null;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,r=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}}
function loadSave(){try{const v=JSON.parse(localStorage.getItem(SAVE));return v&&v.v===3?v:null}catch(e){return null}}
function getPref(){try{return JSON.parse(localStorage.getItem(PREF))||{}}catch(e){return{}}}
function setPref(p){try{localStorage.setItem(PREF,JSON.stringify(Object.assign(getPref(),p)))}catch(e){}}
function fmt(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function josa(w,a,b){const c=w.charCodeAt(w.length-1);if(c<0xAC00||c>0xD7A3)return w+a;return w+((c-0xAC00)%28?a:b)}
function pt(w,a,b){return josa(w,a,b).slice(w.length)}
const C=()=>CASES[S.caseId];
const M=()=>MODES[S.mode];
const NUM=['①','②','③','④','⑤'],PARA=['가','나','다','라','마','바'];
const IMG_DIR='images/';
const imgCache={};
function loadImg(file){if(!file)return Promise.resolve(null);if(!imgCache[file])imgCache[file]=new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=IMG_DIR+file});return imgCache[file]}
function preloadCase(id){const c=CASES[id],I=IMAGES[id];[I.scene,I.vault,...I.rooms,...c.suspects.map(s=>s.img),...['f','m'].flatMap(x=>['search','idea','think','point','oops','happy'].map(p=>det(p,x)))].filter(Boolean).forEach(loadImg)}
function imgTag(file,cls,alt){return file?`<img class="${cls}" src="${IMG_DIR+file}" alt="${alt||''}" loading="lazy" decoding="async" onerror="this.remove()">`:''}
const imgUrl=f=>IMG_DIR+f;
let curSex='f';
/* 장소마다 탐정을 정한다: 시작 성별은 무작위, 이후 장소마다 번갈아 가되 가끔 같은 탐정이 이어지기도 한다 */
function makeDets(){const keys=['prologue','map','r0','r1','r2','r3','r4','vault','result'];let x=Math.random()<.5?'f':'m';const o={};keys.forEach(k=>{o[k]=x;x=Math.random()<.8?(x==='f'?'m':'f'):x});return o}
function detSex(){return curSex}
function det(pose,sex){sex=sex||detSex();const alt=(DETECTIVE.missing[sex]||{})[pose];return `detective/${sex}-${alt||pose}.webp`}
/* 장면 띠: 배경 그림 + 화면 아래에 걸친 탐정 상반신(클로즈업) + 돋보기 렌즈.
   opt.lens: 'roam'(배경 곳곳을 확대해 살핌) | 'lineup'(용의자 얼굴을 하나씩 들여다봄) */
/* 용의자 키 눈금 벽: 로즈 점토 벽 위에 크림색 눈금선 (SVG, 렌즈 안에도 같이 보임) */
const HCHART=(()=>{let g='';for(let k=1;k<12;k++){const y=k*75,cm=185-k*5,big=cm%10===0;
  g+=`<line x1="0" x2="1600" y1="${y}" y2="${y}" stroke="#fbe9cf" stroke-opacity="${big?.5:.22}" stroke-width="${big?3:1.5}"/>`;
  if(big)g+=`<text x="28" y="${y-10}" font-size="30" font-family="sans-serif" font-weight="700" fill="#fbe9cf" fill-opacity=".7">${cm}</text><text x="1572" y="${y-10}" text-anchor="end" font-size="30" font-family="sans-serif" font-weight="700" fill="#fbe9cf" fill-opacity=".7">${cm}</text>`}
  return "url('data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none">${g}</svg>`)+"')"})();
/* 용의자별 좌우 위치 미세 조정(%): 얼굴이 겹치지 않게 */
const LX={k:{4:-2.4},m:{3:2.4,4:1.2}};
/* 용의자 줄에 서는 순서 (데이터 순서는 그대로): 몽유도원도는 강한주와 윤채리 자리를 바꿈 */
const DORD={m:[0,1,5,3,4,2]};
/* 얼굴이 칸 한가운데 오도록 그림을 옆으로 밀어 줌 (카메라·셀카봉 때문에 그림 가운데와 얼굴이 어긋나는 경우) */
function faceAlign(im){const f=faceOf(im);im.style.translate=((.5-f.fx)*100).toFixed(1)+'% 0'}
/* 용의자 그림에서 얼굴 중심 찾기: 머리 꼭대기 아래쪽 불투명 영역의 가운데 (그림마다 한 번만 계산) */
function faceOf(im){
  if(im._face)return im._face;
  let fx=.5,fy=.13;
  try{const W=60,H=Math.round(W*im.naturalHeight/im.naturalWidth)||150,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d');g.drawImage(im,0,0,W,H);const d=g.getImageData(0,0,W,H).data,A=(x,y)=>d[(y*W+x)*4+3]>80;
    let top=0;outer:for(;top<H;top++)for(let x=0;x<W;x++)if(A(x,top))break outer;
    const y0=top+Math.round(H*.04),y1=top+Math.round(H*.13);let sx=0,n=0;
    for(let y=y0;y<=y1&&y<H;y++)for(let x=0;x<W;x++)if(A(x,y)){sx+=x;n++}
    if(n){fx=sx/n/W;fy=(top+H*.085)/H}}catch(e){}
  return im._face={fx,fy};
}
function stage(bg,pose,opt={}){
  const lens=opt.lens||(pose?'roam':'');
  const who=pose?`<span class="detwrap"><img class="det bust" id="detImg" src="${imgUrl(det(pose))}" alt="" onerror="this.remove()"></span>`:'';
  let line='';
  if(opt.lineup){const sus=C().suspects,ord=DORD[S.caseId]||sus.map((_,k)=>k);line=`<div class="lineup">${ord.map((i,k)=>[sus[i],i,k]).map(([x,i,k])=>`<div class="lfig ${S.crossed.includes(i)?'x':''}" data-i="${i}" style="left:${25.5+k*13.4+((LX[S.caseId]||{})[i]||0)}%${S.caseId==='m'?`;z-index:${10-k}`:''}"><img src="${imgUrl(x.img)}" alt="${x.name}" onload="faceAlign(this)" onerror="this.remove()"><span class="lname">${x.name}</span><span class="verd ${S.crossed.includes(i)?'no':''}">${S.crossed.includes(i)?'아니야!':''}</span></div>`).join('')}</div>`}
  return `<div class="stagebox ${opt.cls||''} ${opt.lineup?'has-lineup':''}" data-lens="${lens}" data-pose="${pose||''}" style="background-image:${opt.lineup?`${HCHART},url('${imgUrl('title/wall-rose.webp')}')`:`url('${imgUrl(bg)}')`}">${line}${who}${opt.extra||''}</div>`}
let lensRun=0;
function initStages(){const run=++lensRun;document.querySelectorAll('.stagebox[data-lens]:not([data-lens=""])').forEach(b=>runLens(b,run))}
/* 돋보기: images/ui/magnifier.webp 의 유리 중심(36%,36%), 안쪽 반지름 25.5%에 맞춰 렌즈를 겹친다 */
const MAG={cx:.3635,cy:.3556,ri:.208};
function runLens(box,run){
  const mode=box.dataset.lens,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,Z=1.75;
  const w=document.createElement('div');w.className='lensw';
  w.innerHTML=`<span class="lens-handle"></span><div class="lens-glass"><div class="lens-in"></div><span class="glint"></span></div><img class="lens-frame" src="${imgUrl('ui/magnifier.webp')}" alt="" onload="this.parentNode.classList.add('framed')" onerror="this.remove()">`;
  box.appendChild(w);
  const fr=w.querySelector('.lens-frame');fr.style.width=(100/(2*MAG.ri))+'%';fr.style.left=(50-MAG.cx*100/(2*MAG.ri))+'%';fr.style.top=(50-MAG.cy*100/(2*MAG.ri))+'%';fr.style.transformOrigin=`${MAG.cx*100}% ${MAG.cy*100}%`;
  const glass=w.querySelector('.lens-glass'),inner=w.querySelector('.lens-in');inner.style.backgroundImage=box.style.backgroundImage;
  const lu=box.querySelector('.lineup');if(lu){const c=lu.cloneNode(true);c.querySelectorAll('.verd,.lname').forEach(e=>e.remove());inner.appendChild(c)}
  const dimg=box.querySelector('.det');
  let x=0,y=0,rot=0;
  const place=(px,py)=>{const vx=px-x;x=px;y=py;const L=w.offsetWidth,bw=box.clientWidth,bh=box.clientHeight,gb=glass.clientLeft;
    rot=rot*.85+Math.max(-14,Math.min(14,vx*1.6))*.15;
    w.style.transform=`translate(${px-L/2}px,${py-L/2}px)`;w.style.setProperty('--rot',rot.toFixed(2)+'deg');
    inner.style.width=bw+'px';inner.style.height=bh+'px';
    inner.style.transform=`translate(${L/2-gb-Z*px}px,${L/2-gb-Z*py}px) scale(${Z})`;
    /* 탐정이 돋보기 쪽으로 몸을 살짝 기울임 */
    if(dimg){const k=px/bw-.5;dimg.style.setProperty('--tilt',(k*7).toFixed(2)+'deg');dimg.style.setProperty('--dx',(k*3).toFixed(2)+'%')}};
  const alive=()=>run===lensRun&&document.body.contains(box);
  const tween=(tx,ty,ms,shake)=>new Promise(res=>{const sx=x,sy=y,t0=performance.now();
    const f=now=>{if(!alive())return;let k=Math.min(1,(now-t0)/ms);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      let px=sx+(tx-sx)*e,py=sy+(ty-sy)*e;if(shake)px+=Math.sin(k*Math.PI*6)*14*(1-k);place(px,py);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)});
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const bw=()=>box.clientWidth,bh=()=>box.clientHeight;
  const base=box.dataset.pose||'search';
  place(bw()*.6,bh()*.45);
  if(reduce)return;
  (async()=>{
    if(mode==='lineup'){
      const figs=[...box.querySelectorAll(':scope>.lineup>.lfig')];let order=[],last=-1;
      while(alive()){if(!order.length){order=shuffle(figs.map((_,k)=>k));if(order[0]===last)order.push(order.shift())}
        const idx=order.shift();last=idx;const f=figs[idx],im=f.querySelector('img');
        let tx,ty;
        if(im&&im.complete&&im.naturalWidth){const br=box.getBoundingClientRect(),r=im.getBoundingClientRect(),fc=faceOf(im);tx=r.left-br.left+r.width*fc.fx;ty=r.top-br.top+r.height*fc.fy}
        else{const br=box.getBoundingClientRect(),r=f.getBoundingClientRect();tx=r.left-br.left+r.width/2;ty=r.top-br.top+r.height*.12}
        w.classList.remove('zoom');setPose('search');await tween(tx,ty,1100);if(!alive())return;w.classList.add('zoom');
        const v=f.querySelector('.verd');
        if(f.classList.contains('x')){setPose('point');await tween(tx,ty,700,true);v.textContent='아니야!';v.className='verd no show';await wait(900)}
        else{setPose('think');v.textContent='?';v.className='verd q show';await wait(1300);v.className='verd q'}
        w.classList.remove('zoom');setPose(base);await wait(250);}
    }else{
      /* 배경 살피기: 움직일 때는 돋보기를 들고, 멈추면 생각하거나 가리키거나 번뜩인다 */
      const acts=shuffle(['think','point','search','idea','oops','happy','think','point']);let n=0;
      while(alive()){setPose(base);await tween(bw()*(.32+Math.random()*.6),bh()*(.25+Math.random()*.5),1400);if(!alive())return;
        const a=acts[n++%acts.length];setPose(a);if(dimg&&a==='search')dimg.classList.add('leanin');
        await wait(1100+Math.random()*700);if(dimg)dimg.classList.remove('leanin')}
    }})();
}
/* 우체국 소인처럼 화면 가운데 '쾅' 찍히는 도장 */
function stampFx([big,sub]){
  const d=new Date(),ds=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  const el=document.createElement('div');el.className='pstamp-wrap';el.setAttribute('role','status');
  const rot=-8-Math.random()*10,mx=Math.round(Math.random()*100),my=Math.round(Math.random()*100);
  el.innerHTML=`<div class="psbox"><div class="pstamp" style="--rot:${rot}deg;--mx:${mx}%;--my:${my}%"><span class="ps-top">${C().venue}</span><b class="ps-big ${big.length>4?'long':''}">${big}</b><span class="ps-sub">${sub}</span><span class="ps-date">${ds}</span><i class="ps-wave"></i></div></div>`;
  document.body.appendChild(el);document.body.classList.add('thud');setTimeout(()=>document.body.classList.remove('thud'),450);
  setTimeout(()=>el.classList.add('out'),1900);setTimeout(()=>el.remove(),2400)}
function setPose(p){const d=$('#detImg');if(!d)return;const src=imgUrl(det(p));if(d.getAttribute('src')===src)return;d.src=src;d.classList.remove('pop');void d.offsetWidth;d.classList.add('pop')}
function drawCover(ctx,im,W,H){const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;ctx.drawImage(im,(W-w)/2,(H-h)/2,w,h)}
function applyScale(){document.documentElement.style.setProperty('--scale',getPref().big?1.25:1);document.documentElement.dataset.theme=getPref().dark?'dark':'light'}
applyScale();
function memoFig(q){const f=q.fig;return f?`<figure class="mroute"><div class="mr-in"><img src="${imgUrl(f.img)}" alt="몽유도원도: 현실 세계, 기암절벽, 복숭아밭 순서로 이어지는 경로"><svg viewBox="0 0 1062 386" aria-hidden="true">${f.svg}</svg></div><figcaption>${f.cap}</figcaption></figure>`:''}
function memoHtml(q){let k=0;return `<div class="memo-h">${q.title}</div>${memoFig(q)}`+q.memo.map((p,pi)=>`<p><b>(${PARA[pi]})</b>${p.map(s=>`<span data-s="${k++}">${s}</span>`).join(' ')}</p>`).join('')}

/* ============ 추리 순서 ============
   단서 4개 중 3개가 나올 때까지는 용의자가 2명 이상 남고, 마지막 단서(전시실 5)에서 1명으로 좁혀지는 순서만 고른다. */
function permutations(a){if(a.length<2)return[a];return a.flatMap((x,i)=>permutations([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]))}
function pickTraitOrder(c,culprit,hard){
  const ct=c.suspects[culprit].t;
  const opts=permutations([0,1,2,3]).map(p=>{let alive=c.suspects.map((_,i)=>i);const counts=p.map(t=>{alive=alive.filter(i=>c.suspects[i].t[t]===ct[t]);return alive.length});return{p,counts}})
    .filter(o=>o.counts[2]>=2&&o.counts[3]===1);
  if(!opts.length)return shuffle([0,1,2,3]);
  if(hard){const best=Math.max(...opts.map(o=>o.counts[0]+o.counts[1]+o.counts[2]));return shuffle(opts.filter(o=>o.counts[0]+o.counts[1]+o.counts[2]===best))[0].p}
  return shuffle(opts)[0].p;
}

/* ============ 게임 상태 ============ */
function newGame(caseId,name,mode,cls){
  preloadCase(caseId);
  const c=CASES[caseId];
  const method=Math.floor(Math.random()*3), place=Math.floor(Math.random()*4), culprit=Math.floor(Math.random()*6);
  const wm=shuffle([0,1,2].filter(i=>i!==method)).map(i=>({k:'m',i}));
  const wp=shuffle([0,1,2,3].filter(i=>i!==place)).map(i=>({k:'p',i}));
  const elimOrder=[wp[0],wm[0],wp[1],wm[1],wp[2]];
  S={v:3,caseId,mode,name:name||'탐정',cls:cls||'',dets:makeDets(),culprit,method,place,
     traitOrder:pickTraitOrder(c,culprit,mode==='hard'),elimOrder,solved:[false,false,false,false,false],
     hints:0,wrong:0,elapsed:0,crossed:[],xm:[],xp:[],screen:'prologue',room:0,finished:false};
  save();go('prologue');
}
function clueFor(i){
  const c=C(),out=[];
  if(i>=1){const t=S.traitOrder[i-1],v=c.suspects[S.culprit].t[t];out.push({lbl:t===0?'범인의 행적':'범인의 특징',text:v?c.traits[t].yes:c.traits[t].no,icon:IMAGES[S.caseId].clueIcons[t]});}
  const e=S.elimOrder[i],it=e.k==='m'?c.methods[e.i]:c.places[e.i];
  if(S.mode==='hard')out.push({lbl:e.k==='m'?'수법 단서':'숨긴 곳 단서',text:it.elim,icon:IMAGES.common.elim,manual:true});
  else out.push({lbl:e.k==='m'?'수법 제외':'숨긴 곳 제외',text:`‘${it.name}’${pt(it.name,'은','는')} 아니다. ${it.elim}`,icon:IMAGES.common.elim});
  return out;
}
function elimSet(){if(S.mode==='hard')return{m:new Set(S.xm||[]),p:new Set(S.xp||[])};const s={m:new Set(),p:new Set()};S.elimOrder.forEach((e,i)=>{if(S.solved[i])s[e.k].add(e.i)});return s}
function startTimer(){clearInterval(timerId);timerId=setInterval(()=>{if(S&&!S.finished&&document.visibilityState==='visible'&&['map','room','clue','vault','prologue'].includes(S.screen)){S.elapsed++;const t=$('#tm');if(t)t.textContent=fmt(S.elapsed);if(S.elapsed%5===0)save();}},1000)}

/* ============ 화면 전환 ============ */
function go(screen,extra){
  if(S){S.screen=screen;if(extra!=null)S.room=extra;if(!S.dets)S.dets=makeDets();
    const key=['room','clue'].includes(screen)?'r'+S.room:screen;curSex=S.dets[key]||'f';
    if(screen==='map')curSex=S.dets.map=Math.random()<.5?'f':'m';save();}
  document.body.dataset.case=S?S.caseId:'';
  PUZ=null;ov.innerHTML='';
  window.scrollTo(0,0);
  ({prologue:vPrologue,map:vMap,room:vRoom,clue:vClue,vault:vVault,result:vResult})[screen]();
  renderBar();initStages();
}
function renderBar(){
  if(!S){bar.innerHTML='';return}
  bar.innerHTML=`<div class="bar"><div class="bar-in">
    <div class="bar-case">${C().title}</div>
    <span class="chip" title="걸린 시간">시간 <b id="tm">${fmt(S.elapsed)}</b></span>
    <span class="chip">힌트 ${S.hints}</span>
    <span class="chip">증거 ${S.solved.filter(Boolean).length}/5</span>
    <button class="btn" id="bNb">탐정 수첩</button>
    <button class="btn ghost gearb" id="bT" aria-label="관리자 메뉴" title="관리자 메뉴">${GEAR_SVG}</button>
  </div></div>`;
  $('#bNb').onclick=openNotebook;$('#bT').onclick=openAdmin;
}

/* 코드로 만든 입체 로고: 글자를 여러 겹 쌓아 두께를 만든다 */
function logo3d(){const T='사라진 걸작을 찾아라';let i=0;
  return `<h1 class="lrow" aria-label="${T}">`+[...T].map(c=>{if(c===' ')return '<span class="sp"></span>';const n=i++;let l='';
    for(let d=10;d>=1;d--){const t=d/10;l+=`<span class="lyr" style="transform:translateZ(${-d*0.006}em);color:rgb(${Math.round(201-90*t)},${Math.round(122-60*t)},${Math.round(37-20*t)})">${c}</span>`}
    return `<span class="ch" style="--i:${n}" aria-hidden="true">${l}<span class="face">${c}</span></span>`}).join('')+'</h1>'}
/* ============ 타이틀 ============ */
let pendingNew=null,splashDone=false;
function vTitle(){
  S=null;bar.innerHTML='';document.body.dataset.case='';
  const sv=loadSave(),pref=getPref(),done=pref.done||{};
  const mode='hard'; /* 하드 모드로만 진행 */
  app.innerHTML=`<div class="keyart ttl"><div class="t-wall" style="background-image:url('${imgUrl('title/wall-rose.webp')}')"></div>
    <div class="t-frame"><img src="${imgUrl('title/frame-sq.webp')}" alt=""><span class="t-in t-plate" style="background-image:url('${imgUrl('title/title-plate.webp')}')"><h1 class="vh">사라진 걸작을 찾아라</h1></span><span class="t-tag" style="background-image:url('${imgUrl('title/tag-flip.webp')}')"><b><i>STOLEN</i><em>${(d=>d.getDate()+" "+["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()])(new Date())}</em></b></span></div>
    <button class="t-btn" id="bStart" ${splashDone?'hidden':''} style="background-image:url('${imgUrl('title/btn-clay.webp')}')"><span>수사 시작</span><small>START</small></button>
    <div class="t-dark"></div>
    <img class="t-peek t-f" src="${imgUrl('title/f3.webp')}" alt="">
    <img class="t-peek t-m" src="${imgUrl('title/m3.webp')}" alt="">
    <div class="t-sash" style="border-image-source:url('${imgUrl('title/window2.webp')}')"></div>
    <img class="t-peek t-f t-hand" src="${imgUrl('title/f3.webp')}" alt=""></div>
  <div id="setup" ${splashDone?'':'hidden'}>
  <section class="hero">
    <p class="muted" style="max-width:36em">전시실 다섯 곳의 수수께끼를 풀어 증거를 모으고, 용의자 여섯 명 가운데 범인을 찾아내세요. 범인은 할 때마다 바뀌고, 마지막 증거가 나와야 정체가 드러납니다.</p>
    ${sv&&!sv.finished?`<div class="row"><button class="btn primary" id="bRes">이어서 하기 · ${CASES[sv.caseId].title} (${fmt(sv.elapsed)})</button></div>`:''}
    <div class="name-in"><span id="nmL">탐정의 학년·반과 이름</span><div class="nm2" role="group" aria-labelledby="nmL"><span class="nbar"><span class="clrow"><input id="cg" class="num" maxlength="1" inputmode="numeric" placeholder="　" aria-label="학년" autocomplete="off" value="${pref.cg||''}"><b>학년</b><input id="cc" class="num" maxlength="2" inputmode="numeric" placeholder="　" aria-label="반" autocomplete="off" value="${pref.cc||''}"><b>반</b></span></span><span class="nbar"><input id="nm" maxlength="12" placeholder="이름" aria-label="이름" autocomplete="off" value="${(pref.name||'').replace(/"/g,'')}"></span></div></div>
  </section>
  <h2 style="font-size:1.6rem">탐정님, 어떤 사건을 먼저 해결하시겠습니까?</h2>
  <div class="cases">
    ${['k','m'].map(id=>`<button class="case-card plate" data-c="${id}"><div class="cc"><span class="eyebrow">사건 ${id==='k'?'1':'2'} · ${id==='k'?'클림트':'안견'}</span><h3>${CASES[id].title}</h3><span class="csub">${CASES[id].sub}</span>${done[id]?`<span class="done-tag">해결 완료 · ${done[id]}</span>`:''}</div></button>`).join('')}
  </div>
  <div class="row" style="margin-top:28px"><button class="btn ghost" id="bBig">${pref.big?'글자 보통으로':'글자 크게 (전자칠판)'}</button><button class="btn ghost" id="bDark">${pref.dark?'밝은 화면으로':'어두운 화면으로'}</button><button class="btn ghost" id="bT2">선생님 안내</button></div>
  </div>`;
  document.body.classList.toggle('splash',!splashDone);
  $('#bStart').onclick=()=>{splashDone=true;document.body.classList.remove('splash');$('#bStart').hidden=true;const su=$('#setup');su.hidden=false;su.classList.add('rise');requestAnimationFrame(()=>su.scrollIntoView({behavior:'smooth',block:'start'}))};
  document.querySelectorAll('.case-card').forEach(b=>b.onclick=()=>{const n=$('#nm').value.trim(),cg=$('#cg').value.trim(),cc=$('#cc').value.trim(),cl=(cg?cg+'학년':'')+(cg&&cc?' ':'')+(cc?cc+'반':'');setPref({name:n,cg,cc,cls:cl});
    if(sv&&!sv.finished&&pendingNew!==b.dataset.c){pendingNew=b.dataset.c;b.querySelector('.cc').insertAdjacentHTML('beforeend','<strong style="color:var(--stamp)">진행 중인 사건이 지워집니다. 한 번 더 누르면 새로 시작해요.</strong>');return}
    pendingNew=null;newGame(b.dataset.c,n,'hard',cl)});
  const r=$('#bRes');if(r)r.onclick=()=>{S=sv;preloadCase(S.caseId);go(S.screen,S.room)};
  $('#bBig').onclick=()=>{setPref({big:!getPref().big});applyScale();vTitle()};
  $('#bDark').onclick=()=>{setPref({dark:!getPref().dark});applyScale();vTitle()};
  $('#bT2').onclick=()=>openTeacher(true);
}

/* ============ 프롤로그 ============ */
function vPrologue(){
  const c=C();
  app.innerHTML=`<div class="scene">
    <p class="eyebrow">사건 파일 · ${c.venue} · ${M().label}</p>
    <h2 style="font-size:clamp(2rem,5vw,3rem)">${c.title}</h2>
    ${stage(IMAGES[S.caseId].scene,'think')}
    ${c.intro.map(l=>`<p class="${l.startsWith('「')?'quote':''}">${l}</p>`).join('')}
    <p><b>${S.cls?S.cls+' ':''}${S.name}</b> 탐정님의 임무: 전시실 다섯 곳을 조사해 증거를 모으고, 마지막에 수장고에서 <b>범인 · 수법 · 그림을 숨긴 곳</b>을 지목하세요.</p>
    <p class="muted">탐정 수첩에는 용의자들의 알리바이 진술이 적혀 있습니다. ${S.mode==='hard'?'다른 특징도 진술로만 적혀 있으니 꼼꼼히 읽고 판단하세요.':'다른 특징은 O/X로 정리되어 있습니다.'} 증거와 맞지 않는 사람을 지워 나가세요. 범인은 마지막 전시실의 증거까지 모아야 확실히 드러납니다.</p>
  </div>
  <h3 style="margin:26px 0 12px;font-size:1.4rem">용의자 파일</h3>
  <div class="suspects" style="--room:url('${imgUrl(IMAGES.common.interrogation)}')">${c.suspects.map(s=>`<div class="sus"><div class="sfig"><span class="sfb">${s.name[0]}</span>${imgTag(s.img,"sfimg",s.name)}</div><div><b>${s.name}</b><small>${s.role}</small><small style="margin-top:4px">${s.desc}</small></div></div>`).join('')}</div>
  <div class="row gorow"><button class="btn primary bigbtn" id="bGo">미술관 지도 보기 ▶</button></div>`;
  $('#bGo').onclick=()=>go('map');
}

/* ============ 지도 ============ */
function vMap(){
  const c=C(),n=S.solved.filter(Boolean).length,next=S.solved.indexOf(false);
  const I=IMAGES[S.caseId],K=IMAGES.common,fresh=S.justSolved;
  const stamp=i=>`<span class="clear ${fresh===i?'fresh':''}"><b>해결</b><small>CLEAR</small></span>`;
  app.innerHTML=`${stage(K.lobby,'search',{lineup:true,lens:'lineup',cls:'short'})}
  <section class="mapboard"><div class="room-head maphead"><p class="eyebrow">${c.venue} 평면도</p><h2>어느 전시실을 조사할까요?</h2>
    <p class="mapmsg">${n<5?`반짝이는 전시실부터 차례로 조사하세요 (모은 증거 <b>${n}</b>개)`:'증거를 모두 모았습니다. 수장고로 가서 범인을 지목하세요!'}</p></div>
  <div class="plan">
    ${c.rooms.map((r,i)=>{const st=S.solved[i]?'solved':(i===next?'open':'locked');
      return `<button class="roomc ${st}" data-r="${i}" ${st==='locked'?'disabled':''}><span class="rthumb" style="background-image:url('${imgUrl(I.rooms[i])}')"><span class="st">${st==='solved'?'증거 다시 보기':st==='open'?'조사하기 ▶':'잠김'}</span>${st==='locked'?`<img class="sticon" src="${imgUrl(K.lock)}" alt="">`:''}${st==='solved'?stamp(i):''}</span><span class="rt"><span class="no">전시실 ${i+1}</span><h3>${r.name}</h3></span></button>`}).join('')}
    <button class="roomc vault ${n===5?'open':'locked'}" id="bV" ${n<5?'disabled':''}><span class="rthumb" style="background-image:url('${imgUrl(I.vault)}')"><span class="st">${n===5?'범인 지목하기 ▶':`증거 ${n}/5`}</span>${n<5?`<img class="sticon" src="${imgUrl(K.lock)}" alt="">`:''}</span><span class="rt"><span class="no">마지막</span><h3>수장고</h3></span></button>
  </div></section>`;
  if(fresh!=null){S.justSolved=null;save()}
  document.querySelectorAll('.roomc[data-r]').forEach(b=>b.onclick=()=>{const i=+b.dataset.r;go(S.solved[i]?'clue':'room',i)});
  $('#bV').onclick=()=>go('vault');
}

/* ============ 전시실 ============ */
const GEAR_SVG='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z"/></svg>';
const ADMIN_PIN='0614';
function vRoom(){
  const c=C(),i=S.room,r=c.rooms[i],maxH=M().hints,admin=['tiles','spot'].includes(r.type);
  app.innerHTML=`<div class="room-head"><p class="eyebrow">전시실 ${i+1}</p><h2>${r.name}</h2></div>
  ${stage(IMAGES[S.caseId].rooms[i],'search')}
  <div class="scene" style="margin-top:14px">${r.lines.map(l=>`<p class="${l.includes('「')?'quote':''}">${l}</p>`).join('')}</div>
  <section class="puz">${admin?`<button class="gear" id="bGear" aria-label="교사용 관리자 모드" title="교사용">${GEAR_SVG}</button><div class="adm" id="adm" hidden><b>교사용 관리자 모드</b><span class="muted">비밀번호를 넣으면 이 퍼즐이 모두 풀립니다.</span><div class="row"><input id="admPin" type="password" inputmode="numeric" maxlength="8" placeholder="비밀번호" aria-label="관리자 비밀번호"><button class="btn" id="admOk">모두 풀기</button><button class="btn ghost" id="admX">닫기</button></div><p class="msg" id="admMsg"></p></div>`:''}<div id="pz"></div>
    <div id="hb"></div>
    <div class="puz-foot"><button class="btn ghost" id="bBack">지도로 돌아가기</button><button class="btn" id="bHint"><img class="bi" src="${imgUrl(IMAGES.common.hint)}" alt="">힌트 보기 (<span id="hl">${maxH}</span>번 남음)</button></div>
  </section>`;
  let used=0,fin=false;
  const done=()=>{if(fin)return;fin=true;S.solved[i]=true;S.justSolved=i;save();setPose('happy');stampFx((c.stamps||[])[i]||['해결!','증거를 찾았습니다']);setTimeout(()=>{if(S&&S.screen==='room'&&S.room===i)go('clue',i)},2300)};
  PUZ=PUZZLES[r.type]($('#pz'),done);
  $('#bBack').onclick=()=>go('map');
  $('#bHint').onclick=()=>{if(used>=maxH)return;used++;S.hints++;save();renderBar();
    const txt=PUZ.hint(used,maxH);$('#hb').innerHTML=`<div class="hintbox"><b>힌트 ${used}</b> ${txt}</div>`;
    $('#hl').textContent=maxH-used;if(used>=maxH)$('#bHint').disabled=true;};
  if(admin){const adm=$('#adm');
    $('#bGear').onclick=()=>{adm.hidden=!adm.hidden;if(!adm.hidden)$('#admPin').focus()};
    $('#admX').onclick=()=>adm.hidden=true;
    const tryPin=()=>{const m=$('#admMsg');if($('#admPin').value!==ADMIN_PIN){m.className='msg no';m.textContent='비밀번호가 맞지 않습니다.';return}
      m.className='msg ok';m.textContent='퍼즐을 모두 풀었습니다.';if(PUZ&&PUZ.solve)PUZ.solve();setTimeout(()=>{if(document.body.contains(adm))adm.hidden=true},900)};
    $('#admOk').onclick=tryPin;$('#admPin').onkeydown=e=>{if(e.key==='Enter')tryPin()};}
  /* 몽유도원도 안내 데스크: 해설 메모를 기억하라는 안내 */
  if(S.caseId==='m'&&r.type==='quiz'&&!S.memoAck){
    ov.innerHTML=`<div class="tch"><div class="tch-in memo-pop" role="dialog" aria-label="꼭 읽어 주세요">
      <div class="mtext"><p class="eyebrow">잠깐! 꼭 읽어 주세요</p>
      <h2 style="font-size:1.5rem">이 해설 메모는 뒤에서 다시 나와요</h2>
      <p>안내 데스크의 해설 메모 내용은 나중에 <b>‘두루마리 복도’</b> 전시실 문제에서도 다시 쓰입니다.</p>
      <p>특히 <b>(나) 문단에 나오는 안평대군의 꿈 이야기 순서</b>를 꼼꼼하게 읽고 기억해 두세요.</p>
      <div class="row"><button class="btn primary" id="bAck">확인했습니다</button></div></div>
      <span class="mdet"><img src="${imgUrl(det('think'))}" alt="" onerror="this.parentNode.remove()"></span></div></div>`;
    $('#bAck').onclick=()=>{S.memoAck=true;save();ov.innerHTML=''};}
}

/* ============ 증거 ============ */
function vClue(){
  const i=S.room,ev=clueFor(i);
  app.innerHTML=`<div class="room-head"><p class="eyebrow">전시실 ${i+1} · ${C().rooms[i].name}</p><h2>증거를 찾았습니다</h2></div>
  <div class="cluelay"><img class="cdet" src="${imgUrl(det('idea'))}" alt="" onerror="this.remove()"><div class="evid">${ev.map(e=>`<div class="ecard">${e.icon?`<img class="eicon" src="${imgUrl(e.icon)}" alt="" onerror="this.remove()">`:''}<span class="stampmark">증거</span><span class="lbl">${e.lbl}</span><p>${e.text}</p></div>`).join('')}</div></div>
  <p class="muted" style="margin-top:18px;max-width:40em">${S.mode==='hard'?'하드 모드: 수법과 숨긴 곳은 자동으로 지워지지 않습니다. 단서를 읽고 어느 후보가 아닌지 판단해, 탐정 수첩에서 직접 눌러 지우세요.'+(i===0?' 범인의 특징은 다음 전시실부터 하나씩 드러납니다.':''):i===0?'첫 증거는 수사 범위를 좁혀 줍니다. 범인의 특징은 다음 전시실부터 하나씩 드러납니다.':'증거는 탐정 수첩에 자동으로 적혔습니다. 수첩을 열어 이 증거와 맞지 않는 용의자를 눌러 지우세요.'}</p>
  <div class="row" style="margin-top:18px"><button class="btn primary" id="bNb2">탐정 수첩 열기</button><button class="btn" id="bMap">지도로 가기</button></div>`;
  $('#bNb2').onclick=openNotebook;$('#bMap').onclick=()=>go('map');
}

/* ============ 수첩 ============ */
function openNotebook(){
  const c=C(),el=elimSet(),hard=S.mode==='hard';
  const clues=[];S.solved.forEach((s,i)=>{if(s)clueFor(i).forEach(e=>clues.push(e))});
  const card=(s,i)=>`<button class="note ${S.crossed.includes(i)?'x':''}" data-s="${i}"><span class="nhead"><span class="nthumb">${imgTag(s.img,'',s.name)}</span><b>${s.name}<small>${s.role}</small></b></span>
    <p class="alibi"><em>알리바이</em>${s.notes[0]}</p>
    ${hard?`<ul>${s.notes.slice(1).map(n=>`<li>${n}</li>`).join('')}</ul>`:`<div class="tchips">${[1,2,3].map(t=>`<span>${c.traitShort[t]}<b>${s.t[t]?'O':'X'}</b></span>`).join('')}</div>`}</button>`;
  const draw=()=>{const el=elimSet();ov.innerHTML=`<div class="nb" id="nbBg"><div class="nb-in" role="dialog" aria-label="탐정 수첩">
    <div class="row" style="justify-content:space-between"><h2>탐정 수첩</h2><button class="btn" id="nbX">닫기</button></div>
    <section><h3>모은 증거 (${clues.length})</h3>${clues.length?`<ul class="cl" style="margin-top:8px">${clues.map(e=>`<li><b>${e.lbl}</b> · ${e.text}</li>`).join('')}</ul>`:'<p style="margin-top:8px">아직 증거가 없습니다. 전시실을 조사하세요.</p>'}</section>
    <section><h3>용의자 조사 기록</h3><p style="font-size:.88rem;margin:6px 0 10px">알리바이와 특징을 증거와 맞춰 보고, 맞지 않는 사람을 눌러 지우세요. 다시 누르면 되살아납니다.</p>
      <div class="notes">${c.suspects.map(card).join('')}</div></section>
    ${hard?'<p style="font-size:.88rem;margin:-6px 0 0">하드 모드: 단서를 읽고 아닌 수법과 숨긴 곳을 직접 눌러 지우세요. 다시 누르면 되살아납니다.</p>':''}
    <section><h3>수법 후보</h3><ul class="ml" style="margin-top:8px">${c.methods.map((m,i)=>hard?`<li><button class="mlb ${el.m.has(i)?'x':''}" data-k="xm" data-i="${i}">${m.name}</button></li>`:`<li class="${el.m.has(i)?'x':''}">${m.name}</li>`).join('')}</ul></section>
    <section><h3>그림을 숨긴 곳 후보</h3><ul class="ml" style="margin-top:8px">${c.places.map((m,i)=>hard?`<li><button class="mlb ${el.p.has(i)?'x':''}" data-k="xp" data-i="${i}">${m.name}</button></li>`:`<li class="${el.p.has(i)?'x':''}">${m.name}</li>`).join('')}</ul></section>
    <section><h3>자료실</h3><details style="margin-top:8px"><summary>${c.quiz.title}</summary><div class="memo">${memoHtml(c.quiz)}</div></details></section>
  </div></div>`;
  $('#nbX').onclick=()=>ov.innerHTML='';
  $('#nbBg').onclick=e=>{if(e.target.id==='nbBg')ov.innerHTML=''};
  document.querySelectorAll('.mlb').forEach(b=>b.onclick=()=>{const k=b.dataset.k,i=+b.dataset.i;S[k]=S[k]||[];S[k]=S[k].includes(i)?S[k].filter(x=>x!==i):[...S[k],i];save();const sc=$('.nb-in').scrollTop;draw();$('.nb-in').scrollTop=sc});
  document.querySelectorAll('.note[data-s]').forEach(tr=>tr.onclick=()=>{const i=+tr.dataset.s;S.crossed=S.crossed.includes(i)?S.crossed.filter(x=>x!==i):[...S.crossed,i];save();const sc=$('.nb-in').scrollTop;draw();$('.nb-in').scrollTop=sc});
  };draw();
}

/* ============ 수장고 ============ */
function vVault(){
  const c=C(),el=elimSet();let pick={s:null,m:null,p:null};
  app.innerHTML=`<div class="room-head"><p class="eyebrow">마지막 방</p><h2>수장고</h2></div>
  ${stage(IMAGES[S.caseId].vault,'point',{lineup:true,lens:'lineup'})}
  <div class="scene" style="margin-top:14px">${c.vault.map((l,i)=>`<p class="${i?'quote':''}">${l}</p>`).join('')}</div>
  <div class="pick"><h3 style="font-size:1.25rem;margin-top:16px">범인</h3><div class="pgrid" id="gS">${c.suspects.map((s,i)=>`<button class="pbtn ${S.crossed.includes(i)?'dim':''}" data-v="${i}"><span class="pthumb">${imgTag(s.img,'',s.name)}</span><span>${s.name}<small>${s.role}</small></span></button>`).join('')}</div></div>
  <div class="pick"><h3 style="font-size:1.25rem;margin-top:10px">수법</h3><div class="pgrid" id="gM">${c.methods.map((m,i)=>`<button class="pbtn ${el.m.has(i)?'dim':''}" data-v="${i}">${m.name}</button>`).join('')}</div></div>
  <div class="pick"><h3 style="font-size:1.25rem;margin-top:10px">그림을 숨긴 곳</h3><div class="pgrid" id="gP">${c.places.map((m,i)=>`<button class="pbtn ${el.p.has(i)?'dim':''}" data-v="${i}">${m.name}</button>`).join('')}</div></div>
  <p class="msg" id="vm" style="margin-top:16px"></p>
  <div class="row" style="margin-top:8px"><button class="btn primary" id="bAcc" disabled>지목하기</button><button class="btn" id="bNb3">탐정 수첩 확인</button></div>`;
  const bind=(id,k)=>document.querySelectorAll(`#${id} .pbtn`).forEach(b=>b.onclick=()=>{document.querySelectorAll(`#${id} .pbtn`).forEach(x=>x.classList.remove('on'));b.classList.add('on');pick[k]=+b.dataset.v;$('#bAcc').disabled=pick.s==null||pick.m==null||pick.p==null});
  bind('gS','s');bind('gM','m');bind('gP','p');
  $('#bNb3').onclick=openNotebook;
  $('#bAcc').onclick=()=>{
    const ok=(pick.s===S.culprit)+(pick.m===S.method)+(pick.p===S.place);
    if(ok===3){S.finished=true;save();go('result');return}
    S.wrong++;save();setPose('oops');setTimeout(()=>setPose('point'),2500);
    const m=$('#vm');m.className='msg no';
    m.textContent=S.mode==='hard'?`증거와 맞지 않습니다. 수첩을 다시 확인하세요. (잘못 지목 ${S.wrong}번)`:`증거와 맞지 않습니다. 세 가지 중 ${ok}가지만 맞았어요. 수첩을 다시 확인하세요. (잘못 지목 ${S.wrong}번)`;
  };
}

/* ============ 결과 ============ */
function vResult(){
  const c=C(),s=c.suspects[S.culprit],md=M();
  const mins=Math.round(S.elapsed/60);
  const score=mins+S.hints*2+S.wrong*5;
  const rank=score<=md.gold?'골드':score<=md.silver?'실버':'브론즈';
  const code=`${S.caseId==='k'?'K':'M'}${S.mode==='hard'?'H':'N'}${rank==='골드'?'G':rank==='실버'?'S':'B'}-${String(mins).padStart(2,'0')}${S.hints}${S.wrong}-${((S.elapsed*7+S.hints*13+S.culprit*31)%900+100)}`;
  const pref=getPref();pref.done=pref.done||{};pref.done[S.caseId]=`${md.label} ${rank} 탐정`;setPref({done:pref.done});
  const other=S.caseId==='k'?'m':'k';
  const artName=c.art.replace(/」$/,''),artJ=c.art+pt(artName,'을','를');
  const d=new Date(),today=`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
  app.innerHTML=`<div class="stagebox win" style="background-image:url('${imgUrl(IMAGES[S.caseId].win)}')"><div class="winname"><small>찾았어요!</small><b>${S.cls?S.cls+' ':''}${S.name} 탐정</b><span>${today} · ${c.title} 해결</span></div></div>
  <div class="confess has-img"><img class="cimg2" src="${imgUrl(s.confess||s.img)}" alt="${s.name}" onerror="this.src='${imgUrl(s.img)}'"><div class="ctext">
    <p class="eyebrow">사건 해결</p>
    <p class="big">범인은 ${s.role} ${s.name}!</p>
    <p class="quote" style="font-size:1.15rem">${s.motive}</p>
    <p>${josa(s.name,'은','는')} <b>${c.methods[S.method].name}</b> 방법으로 그림을 빼돌려 <b>${c.places[S.place].name}</b>에 숨겼습니다. ${c.art}${S.caseId==='k'?'은':'는'} 무사히 제자리로 돌아왔습니다.</p>
  </div></div>
  <div class="cert2" style="background-image:url('${imgUrl(IMAGES.common.cert)}')"><div class="cin">
    <p class="ct">감 사 장</p>
    ${S.cls?`<p class="ccls">${S.cls}</p>`:''}<p class="cname">${S.name} <small>탐정</small></p>
    <p class="cbody">위 탐정은 「${c.title}」 사건을 날카로운 관찰력과 끈기 있는 추리로 해결하여 ${artJ} 무사히 되찾아 주었습니다. 이에 그 공을 기리며 감사의 마음을 담아 이 감사장을 드립니다.</p>
    <p class="crank">${md.label} · ${rank} 탐정</p>
    <p class="cdate">${today}</p>
    <p class="csign">${c.venue}장<span class="seal">${c.venue.slice(0,2)}<br>${c.venue.slice(2,4)}</span></p>
  </div></div>
  <div class="certinfo"><dl><dt>걸린 시간</dt><dd>${fmt(S.elapsed)}</dd><dt>사용한 힌트</dt><dd>${S.hints}번</dd><dt>잘못 지목</dt><dd>${S.wrong}번</dd></dl>
    <div><p style="font-size:.85rem">선생님께 보여 드릴 완료 코드</p><div class="code">${code}</div></div></div>
  <section class="real" style="margin-top:26px"><p class="eyebrow">진짜 이야기</p><h3 style="font-size:1.5rem">${c.real.title}</h3>${imgTag(IMAGES[S.caseId].real,"realimg",c.real.title)}${c.real.text.map(t=>`<p>${t}</p>`).join('')}</section>
  <div class="row" style="margin-top:26px"><button class="btn primary" id="bOther">다음 사건: ${CASES[other].title}</button><button class="btn" id="bHome">처음 화면으로</button></div>`;
  $('#bOther').onclick=()=>newGame(other,S.name,'hard',S.cls);
  $('#bHome').onclick=vTitle;
}

/* ============ 선생님 ============ */
function openTeacher(fromTitle){
  ov.innerHTML=`<div class="tch" id="tBg"><div class="tch-in" role="dialog" aria-label="선생님 안내">
    <h2 style="font-size:1.6rem">선생님 안내</h2>
    <ol>
      <li>학생(또는 모둠)이 이름을 쓰고 사건을 고릅니다.</li>
      <li>전시실 5곳의 문제를 차례로 풀면 증거가 하나씩 나옵니다. 문제에 필요한 정보는 모두 화면에 있어서, 미리 배운 내용이 없어도 풀 수 있습니다.</li>
      <li>학생은 ‘탐정 수첩’에서 알리바이와 특징을 증거와 맞춰 보며 용의자를 지웁니다. 범인은 마지막 전시실 증거까지 모아야 확정됩니다.</li>
      <li>수장고에서 범인·수법·숨긴 곳을 모두 맞히면 감사장과 완료 코드가 나옵니다.</li>
      <li>힌트는 방마다 1번입니다. 힌트와 잘못 지목은 등급에 반영됩니다.</li>
      <li>수법·숨긴 곳 단서는 이유만 보여 주므로, 학생이 읽고 판단해 수첩에서 직접 지워야 합니다.</li>
      <li>범인은 게임마다 무작위로 바뀝니다. 진행 상황은 같은 기기에 자동 저장됩니다.</li>
    </ol>
    <div class="tdl"><b>답안지 내려받기</b><span>선생님용 답안지 파일은 아래 주소에서 내려받을 수 있습니다.</span><a href="https://joyhanju.github.io" target="_blank" rel="noopener">joyhanju.github.io</a></div>

    <div class="row"><button class="btn primary" id="tX">닫기</button></div>
  </div></div>`;
  $('#tX').onclick=()=>ov.innerHTML='';
  $('#tBg').onclick=e=>{if(e.target.id==='tBg')ov.innerHTML=''};
}


/* ============ 관리자 메뉴 (상단 톱니바퀴) ============ */
function openAdmin(){
  ov.innerHTML=`<div class="tch" id="aBg"><div class="tch-in adm-in" role="dialog" aria-label="관리자 메뉴">
    <h2 style="font-size:1.5rem">관리자 메뉴</h2>
    <form class="row" id="aForm"><input id="aPin" type="password" inputmode="numeric" maxlength="8" placeholder="비밀번호" aria-label="관리자 비밀번호" autocomplete="off"><button class="btn" type="submit">확인</button></form>
    <div id="aBody"></div>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="aX">닫기</button></div>
  </div></div>`;
  const close=()=>ov.innerHTML='';
  $('#aX').onclick=close;$('#aBg').onclick=e=>{if(e.target.id==='aBg')close()};
  setTimeout(()=>{const p=$('#aPin');if(p)p.focus()},50);
  $('#aForm').onsubmit=e=>{e.preventDefault();
    if($('#aPin').value.trim()!==ADMIN_PIN){$('#aBody').innerHTML='<p class="msg no">비밀번호가 맞지 않습니다.</p>';return}
    $('#aForm').hidden=true;
    const c=C(),cur=S.screen,rm=S.room;
    const btn=(id,label,on)=>`<button class="btn ${on?'primary':''}" data-go="${id}">${label}</button>`;
    $('#aBody').innerHTML=`
      <h3 class="adm-h">단계 바로 가기</h3>
      <div class="adm-grid">
        ${btn('prologue','사건 소개',cur==='prologue')}
        ${btn('map','전시실 지도',cur==='map')}
        ${c.rooms.map((r,i)=>btn('room:'+i,`전시실 ${i+1} · ${r.name}`,cur==='room'&&rm===i)).join('')}
        ${btn('vault','수장고 (범인 지목)',cur==='vault')}
      </div>
      <p class="muted adm-note">수장고로 가면 다섯 전시실의 증거를 모두 받은 상태가 됩니다.</p>
      <h3 class="adm-h">이번 게임의 정답</h3>
      <div class="ans"><p><b>범인</b> ${c.suspects[S.culprit].role} ${c.suspects[S.culprit].name}</p><p><b>수법</b> ${c.methods[S.method].name}</p><p><b>숨긴 곳</b> ${c.places[S.place].name}</p></div>
      <div class="row" style="margin-top:10px">${cur==='room'&&!S.solved[rm]?'<button class="btn" id="aSkip">이 방 풀린 것으로 하기</button>':''}<button class="btn ghost" id="aReset">게임 지우고 처음으로</button></div>`;
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const [scr,i]=b.dataset.go.split(':');close();
      if(scr==='room')go('room',+i);
      else if(scr==='vault'){S.solved=S.solved.map(()=>true);save();go('vault')}
      else go(scr)});
    const sk=$('#aSkip');if(sk)sk.onclick=()=>{S.solved[rm]=true;save();close();go('clue',rm)};
    $('#aReset').onclick=()=>{try{localStorage.removeItem(SAVE)}catch(e){}close();vTitle()};
  };
}

/* ============ 그림 생성 ============ */
function spiral(ctx,x,y,r,turns,col,w){ctx.beginPath();for(let a=0;a<turns*Math.PI*2;a+=.15){const rr=r*a/(turns*Math.PI*2);ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke()}
function goldBg(ctx,W,H,r){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#a8781f');g.addColorStop(.45,'#e6c35e');g.addColorStop(1,'#9c6b1a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<W*H/700;i++){ctx.fillStyle=`rgba(${r()<.5?'255,240,190':'90,60,10'},${.12+r()*.2})`;const s=2+r()*5;ctx.fillRect(r()*W,r()*H,s,s)}
}
function drawKlimt(ctx,W,H,seed){
  const r=rng(seed);goldBg(ctx,W,H,r);
  ctx.save();ctx.scale(W/480,H/480);
  ctx.fillStyle='#3b2410';ctx.fillRect(228,250,24,230);
  [[120,150,70],[360,150,70],[70,320,55],[410,320,55],[240,95,55],[160,265,40],[320,265,40]].forEach(([x,y,s])=>spiral(ctx,x,y,s,2.6,'#3b2410',7));
  ctx.strokeStyle='#3b2410';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(240,260);ctx.quadraticCurveTo(170,200,120,150);ctx.moveTo(240,260);ctx.quadraticCurveTo(310,200,360,150);ctx.moveTo(240,330);ctx.quadraticCurveTo(140,330,70,320);ctx.moveTo(240,330);ctx.quadraticCurveTo(340,330,410,320);ctx.stroke();
  ctx.fillStyle='#f6efe0';ctx.beginPath();ctx.ellipse(240,200,34,16,0,0,7);ctx.fill();ctx.fillStyle='#1d1d1d';ctx.beginPath();ctx.arc(240,200,9,0,7);ctx.fill();
  [['#b8322f',40,40],['#2c5d8f',440,40],['#2f7d4f',40,440],['#1d1d1d',440,440]].forEach(([c,x,y])=>{for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#f5f0e1':c;ctx.beginPath();ctx.arc(x+(k%2?18:-6)*(x<240?1:-1),y+(k>1?18:-6)*(y<240?1:-1),14-k*2,0,7);ctx.fill()}});
  for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#1d1d1d':'#f5f0e1';ctx.fillRect(200+i*14,430,12,26)}
  for(let i=0;i<5;i++){ctx.fillStyle=['#b8322f','#2c5d8f','#7a3b8f','#2f7d4f','#1d1d1d'][i];ctx.beginPath();ctx.arc(30+i*18,230,7,0,7);ctx.fill();ctx.beginPath();ctx.arc(450-i*18,230,7,0,7);ctx.fill()}
  ctx.restore();
}
function mountain(ctx,base,peakH,col,r,x0,x1,jag){
  ctx.beginPath();ctx.moveTo(x0,base);const n=14;
  for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n;const t=Math.sin(Math.PI*i/n);ctx.lineTo(x,base-peakH*t*(.65+r()*.5)-(r()*jag))}
  ctx.lineTo(x1,base);ctx.closePath();ctx.fillStyle=col;ctx.fill();
}
function paperBg(ctx,W,H,r){ctx.fillStyle='#e9dec3';ctx.fillRect(0,0,W,H);for(let i=0;i<W*H/300;i++){ctx.fillStyle=`rgba(120,95,60,${r()*.08})`;ctx.fillRect(r()*W,r()*H,1.5,1.5)}}
function drawInk(ctx,W,H,seed){
  const r=rng(seed);paperBg(ctx,W,H,r);
  ctx.save();ctx.scale(W/480,H/480);
  mountain(ctx,300,60,'rgba(80,80,75,.25)',r,0,220,10);
  mountain(ctx,330,40,'rgba(60,60,55,.35)',r,0,180,8);
  mountain(ctx,260,230,'rgba(40,40,38,.55)',r,200,480,40);
  mountain(ctx,330,170,'rgba(30,30,28,.75)',r,250,440,30);
  mountain(ctx,400,120,'rgba(35,35,32,.8)',r,140,330,25);
  ctx.fillStyle='rgba(240,236,225,.9)';ctx.fillRect(300,160,10,140);
  for(let i=0;i<3;i++){ctx.fillStyle='rgba(233,222,195,.75)';ctx.beginPath();ctx.ellipse(120+i*130,300+i*40,120,14,0,0,7);ctx.fill()}
  for(let i=0;i<70;i++){const x=330+r()*140,y=360+r()*100;ctx.fillStyle=r()<.7?'rgba(226,120,145,.85)':'rgba(250,235,238,.9)';ctx.beginPath();ctx.arc(x,y,3+r()*4,0,7);ctx.fill()}
  ctx.fillStyle='#5b4632';ctx.fillRect(390,410,34,20);ctx.fillStyle='#8a6a42';ctx.beginPath();ctx.moveTo(384,412);ctx.lineTo(407,394);ctx.lineTo(430,412);ctx.fill();
  ctx.strokeStyle='rgba(60,50,40,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(10,460);ctx.quadraticCurveTo(80,420,150,440);ctx.stroke();
  ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(70,428,4,0,7);ctx.fill();ctx.fillRect(68,432,4,10);
  ctx.fillStyle='#b5332e';ctx.fillRect(28,28,26,26);ctx.fillStyle='#e9dec3';ctx.fillRect(33,33,6,16);ctx.fillRect(43,33,6,16);
  ctx.restore();
}

/* 조각 퍼즐 전용 몽유도원도풍 산수화: 빈 여백이 없도록 화면 전체를 채우고,
   왼쪽(현실·누런 비단빛) → 오른쪽(꿈속·분홍빛)으로 바탕색이 조금씩 바뀌어 조각마다 위치를 짐작할 수 있다. */
function tintMong(ctx,W,H){
  ctx.save();
  let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(196,150,70,.20)');g.addColorStop(.5,'rgba(150,170,150,.10)');g.addColorStop(1,'rgba(220,110,140,.22)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(120,140,170,.14)');g.addColorStop(.55,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(90,70,40,.16)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.restore();
}
function drawMongPuzzle(ctx,W,H,seed){
  const r=rng(seed);
  ctx.save();ctx.scale(W/480,H/480);ctx.lineCap='round';
  /* 1. 비단 바탕 */
  let g=ctx.createLinearGradient(0,0,480,480);g.addColorStop(0,'#e3cc98');g.addColorStop(.5,'#e4d8bb');g.addColorStop(1,'#ecc9c4');
  ctx.fillStyle=g;ctx.fillRect(0,0,480,480);
  g=ctx.createLinearGradient(0,0,0,480);g.addColorStop(0,'rgba(165,182,200,.5)');g.addColorStop(.4,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,480,480);
  for(let i=0;i<5200;i++){ctx.fillStyle=`rgba(110,85,50,${r()*.09})`;ctx.fillRect(r()*480,r()*480,1.2+r()*1.6,1)}
  /* 2. 왼쪽 위 화제(글씨)와 낙관 */
  ctx.fillStyle='rgba(40,32,24,.78)';
  for(let c=0;c<7;c++){const x=18+c*15;for(let k=0;k<9;k++){const y=16+k*13+(r()*2);ctx.fillRect(x+r()*2,y,8+r()*3,2);ctx.fillRect(x+2+r()*4,y-3,2,8+r()*2);if(r()<.6)ctx.fillRect(x+r()*5,y+4,6,1.6)}}
  ctx.fillStyle='#b5332e';ctx.fillRect(118,118,20,20);ctx.fillStyle='#e9dec3';ctx.fillRect(122,122,5,12);ctx.fillRect(130,122,5,12);
  ctx.fillStyle='#a52d2a';ctx.fillRect(128,146,14,14);
  /* 3. 하늘: 해, 구름 소용돌이, 새 */
  ctx.fillStyle='rgba(205,90,70,.75)';ctx.beginPath();ctx.arc(262,44,15,0,7);ctx.fill();
  ctx.strokeStyle='rgba(95,100,120,.55)';ctx.lineWidth=1.6;
  for(let i=0;i<14;i++){const x=150+r()*320,y=12+r()*80;spiral(ctx,x,y,7+r()*6,1.6,'rgba(95,100,120,.5)',1.4);ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+12,y-6,x+26,y+6,x+40+r()*20,y);ctx.stroke()}
  ctx.strokeStyle='rgba(40,40,40,.75)';ctx.lineWidth=1.6;
  [[200,40],[218,30],[236,52],[300,22],[318,34],[160,90],[420,24],[440,52],[380,14],[340,70]].forEach(([x,y])=>{ctx.beginPath();ctx.moveTo(x-6,y-3);ctx.quadraticCurveTo(x,y,x,y+1);ctx.quadraticCurveTo(x,y,x+7,y-4);ctx.stroke()});
  /* 4. 먼 산 */
  const ridge=(base,amp,col,x0,x1,f)=>{ctx.beginPath();ctx.moveTo(x0,480);for(let x=x0;x<=x1;x+=6){const tp=Math.min(1,(x-x0)/70);ctx.lineTo(x,base+(1-tp)*40-amp*tp*(.55+.45*Math.sin(x/f+seed))*(.8+.2*Math.sin(x/7)))}ctx.lineTo(x1,480);ctx.closePath();ctx.fillStyle=col;ctx.fill()};
  ridge(150,40,'rgba(135,150,165,.55)',140,500,31);
  ridge(190,55,'rgba(105,118,130,.6)',170,500,23);
  /* 5. 꿈속의 험한 바위산: 둥근 기둥 봉우리 + 주름 */
  const peak=(x,base,h,w,col)=>{ctx.beginPath();ctx.moveTo(x-w,base);ctx.bezierCurveTo(x-w*.9,base-h*.5,x-w*.5,base-h*.95,x,base-h);ctx.bezierCurveTo(x+w*.5,base-h*.95,x+w*.9,base-h*.5,x+w,base);ctx.closePath();ctx.fillStyle=col;ctx.fill();
    ctx.save();ctx.clip();for(let k=0;k<70;k++){const px=x-w+r()*w*2,py=base-h+r()*h;ctx.strokeStyle=r()<.35?'rgba(225,220,205,.45)':'rgba(15,15,12,.55)';ctx.lineWidth=1+r()*1.3;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+3,py+4,px+(r()-.5)*4,py+6+r()*6);ctx.stroke()}ctx.restore()};
  [[300,290,150,34],[455,290,185,40],[340,290,200,30],[410,290,230,36],[262,290,110,30],[372,290,140,28],[480,290,120,30],[230,290,80,26]].forEach(([x,b,h,w])=>peak(x,b,h,w,`rgb(${62+r()*25},${62+r()*22},${58+r()*20})`));
  ctx.fillStyle='rgba(245,242,232,.92)';ctx.fillRect(388,120,6,150);ctx.fillRect(318,170,4,90);
  /* 6. 현실의 부드러운 언덕 (왼쪽, 오른쪽으로 갈수록 낮아짐) */
  const hill=(base,amp,col,f,ph)=>{ctx.beginPath();ctx.moveTo(-10,480);for(let x=-10;x<=490;x+=6){const fade=Math.max(0,1-Math.max(0,x-170)/130);ctx.lineTo(x,base+(1-fade)*60-amp*fade*(.6+.4*Math.sin(x/f+ph)))}ctx.lineTo(490,480);ctx.closePath();ctx.fillStyle=col;ctx.fill()};
  hill(215,45,'rgb(150,160,118)',40,1);
  hill(262,48,'rgb(118,134,92)',33,3);
  hill(318,34,'rgb(156,146,100)',28,5);
  for(let i=0;i<280;i++){const x=r()*270,y=175+r()*170;ctx.fillStyle=`rgba(${50+r()*40},${70+r()*40},${40+r()*20},.7)`;ctx.beginPath();ctx.arc(x,y,1.5+r()*2.5,0,7);ctx.fill()}
  /* 7. 소나무 */
  const pine=(x,y,s)=>{ctx.fillStyle='#4a3826';ctx.fillRect(x-1.5*s,y,3*s,22*s);ctx.fillStyle='#2f4a35';for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(x,y-k*8*s+4*s,(16-k*4)*s,5.5*s,0,0,7);ctx.fill()}};
  [[30,196,1],[62,212,.8],[96,186,1.1],[150,236,.9],[205,250,1],[245,276,.8],[22,300,1.2],[118,300,1],[180,322,.9],[70,262,.9]].forEach(([x,y,z])=>pine(x,y,z));
  /* 8. 굽이치는 시내 */
  ctx.beginPath();ctx.moveTo(-5,420);ctx.bezierCurveTo(90,370,150,450,240,400);ctx.bezierCurveTo(300,368,360,410,485,372);ctx.lineTo(485,404);ctx.bezierCurveTo(360,440,300,400,242,432);ctx.bezierCurveTo(150,478,80,400,-5,452);ctx.closePath();
  ctx.fillStyle='rgb(122,154,168)';ctx.fill();
  ctx.strokeStyle='rgba(235,240,240,.75)';ctx.lineWidth=1.2;
  const y0=x=>x<240?425-Math.sin(x/240*Math.PI)*24:404-(x-240)/240*20;
  for(let i=0;i<80;i++){const x=r()*470,y=y0(x)+r()*18;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+5,y-2,x+10,y);ctx.stroke()}
  /* 9. 앞쪽 땅과 풀 */
  ctx.beginPath();ctx.moveTo(-5,452);ctx.bezierCurveTo(80,400,150,478,242,432);ctx.bezierCurveTo(300,400,360,440,485,404);ctx.lineTo(485,485);ctx.lineTo(-5,485);ctx.closePath();ctx.fillStyle='rgb(158,124,84)';ctx.fill();
  for(let i=0;i<340;i++){const x=r()*480,y=438+r()*44;ctx.strokeStyle=`rgba(${60+r()*40},${70+r()*30},40,.75)`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(r()-.5)*3,y-4-r()*5);ctx.stroke()}
  [[40,462],[120,470],[200,458],[300,450],[420,446],[460,470]].forEach(([x,y])=>{ctx.fillStyle='rgb(90,85,78)';ctx.beginPath();ctx.ellipse(x,y,12,6,0,0,7);ctx.fill()});
  /* 오솔길과 말 탄 두 사람 */
  ctx.strokeStyle='rgba(205,175,125,.95)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-5,342);ctx.bezierCurveTo(70,320,110,360,170,340);ctx.bezierCurveTo(210,326,230,350,262,330);ctx.stroke();
  [[80,334],[100,338]].forEach(([x,y],k)=>{ctx.fillStyle=k?'#6b4a2f':'#e8e2d2';ctx.beginPath();ctx.ellipse(x,y,9,4,0,0,7);ctx.fill();ctx.fillRect(x-7,y,2,7);ctx.fillRect(x+5,y,2,7);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(x,y-8,3,0,7);ctx.fill();ctx.fillRect(x-2,y-6,4,6)});
  /* 10. 복숭아꽃 숲 (가장자리가 부드러운 구름 모양) */
  const blob=(cx,cy,rx,ry,n)=>{for(let i=0;i<n;i++){const a=r()*6.283,d=Math.sqrt(r());const x=cx+Math.cos(a)*rx*d,y=cy+Math.sin(a)*ry*d;ctx.fillStyle=r()<.72?`rgba(${215+r()*30},${100+r()*40},${130+r()*30},.85)`:'rgba(252,238,240,.92)';ctx.beginPath();ctx.arc(x,y,1.8+r()*3,0,7);ctx.fill()}};
  for(let i=0;i<34;i++){const x=270+r()*200,y=300+r()*80;ctx.strokeStyle='#4a3826';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y+12);ctx.lineTo(x,y);ctx.lineTo(x-6,y-6);ctx.moveTo(x,y+2);ctx.lineTo(x+6,y-5);ctx.stroke()}
  blob(330,320,80,48,300);blob(430,300,70,44,260);blob(390,360,90,30,200);blob(300,262,34,22,60);
  /* 대나무와 초가집 */
  for(let i=0;i<22;i++){const x=440+r()*40;ctx.strokeStyle='rgba(70,110,60,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,362);ctx.lineTo(x+(r()-.5)*6,318);ctx.stroke()}
  [[345,345],[392,352],[432,338]].forEach(([x,y])=>{ctx.fillStyle='#d9ccb0';ctx.fillRect(x-14,y,28,16);ctx.fillStyle='#8a6a42';ctx.beginPath();ctx.moveTo(x-20,y+2);ctx.quadraticCurveTo(x,y-14,x+20,y+2);ctx.fill();ctx.fillStyle='#3a2a1a';ctx.fillRect(x+3,y+5,7,11)});
  ctx.fillStyle='#6b4a2f';ctx.beginPath();ctx.moveTo(300,396);ctx.lineTo(336,396);ctx.lineTo(328,404);ctx.lineTo(308,404);ctx.fill();
  /* 11. 옅은 안개 */
  [[150,170,120],[300,215,80]].forEach(([x,y,w])=>{const gg=ctx.createRadialGradient(x,y,0,x,y,w);gg.addColorStop(0,'rgba(245,240,230,.4)');gg.addColorStop(1,'rgba(245,240,230,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.ellipse(x,y,w,w*.22,0,0,7);ctx.fill()});
  ctx.restore();
  tintMong(ctx,W,H);
}

/* ============ 퍼즐 ============ */
const PUZZLES={
quiz(el,done){
  const q=C().quiz,n=M().quizN;
  const qs=(n>=q.qs.length?q.qs:shuffle(q.qs.map((x,i)=>({...x,i}))).slice(0,n).sort((a,b)=>a.i-b.i)).map(x=>({...x,opts:shuffle([x.a,...x.o])}));
  const solved=new Set();
  el.innerHTML=`<div class="quizlay"><div class="memo" id="memo">${memoHtml(q)}</div>
  <div class="qlist">${qs.map((x,qi)=>`<div class="q" data-q="${qi}"><p class="q-t">${qi+1}. ${x.q}</p><div class="optlist">${x.opts.map((o,oi)=>`<button class="opt" data-o="${oi}">${NUM[oi]} ${o}</button>`).join('')}</div></div>`).join('')}
  <p class="msg" id="qm"></p></div></div>`;
  el.querySelectorAll('.q').forEach(qd=>{const qi=+qd.dataset.q;qd.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    if(solved.has(qi))return;
    if(qs[qi].opts[+b.dataset.o]===qs[qi].a){b.classList.add('ok');qd.classList.add('done');solved.add(qi);if(solved.size===qs.length){$('#qm').className='msg ok';$('#qm').textContent='딸깍! 금고가 열렸습니다.';done()}}
    else{b.classList.remove('no');void b.offsetWidth;b.classList.add('no')}
  })});
  return{hint(l,max){const qi=qs.findIndex((_,i)=>!solved.has(i));if(qi<0)return '이미 모두 맞혔어요.';
    el.querySelectorAll('.memo span').forEach(s=>s.classList.remove('hl'));qs[qi].s.forEach(k=>{const sp=el.querySelector(`#memo span[data-s="${k}"]`);if(sp)sp.classList.add('hl')});
    if(l===2){const oi=qs[qi].opts.indexOf(qs[qi].a);el.querySelector(`.q[data-q="${qi}"] .opt[data-o="${oi}"]`).classList.add('glow');return `${qi+1}번 문제의 정답에 테두리를 표시했어요.`}
    return `${qi+1}번 문제의 근거는 메모에서 노란색으로 표시한 문장에 있어요. 선택지를 하나씩 그 문장과 비교해 보세요.`}};
},
tiles(el,done){
  const N=M().tiles,T=N*N;
  const cv=document.createElement('canvas');cv.width=cv.height=600;
  if(S.caseId==='k')drawKlimt(cv.getContext('2d'),600,600,7);else drawMongPuzzle(cv.getContext('2d'),600,600,11);
  let url=cv.toDataURL('image/jpeg',.85);
  let order;do{order=shuffle([...Array(T).keys()])}while(order.filter((v,i)=>v===i).length>1);
  let sel=null,fin=false;
  el.innerHTML=`<div class="row" style="justify-content:space-between"><p class="tip">두 조각을 차례로 누르면 서로 자리가 바뀝니다. ${T}조각을 모두 제자리에 맞추세요.</p><span class="chip" id="tc"></span></div><div class="boardwrap" style="--board:url('${imgUrl(IMAGES[S.caseId].board)}')"><div class="tiles" id="tg" style="grid-template-columns:repeat(${N},1fr)"></div></div><div id="pv"></div>`;
  const tg=$('#tg');tg.innerHTML='<p class="tip" style="grid-column:1/-1;align-self:center;text-align:center">그림 조각을 준비하는 중…</p>';
  const paint=()=>{const ok=order.filter((v,i)=>v===i).length;$('#tc').textContent=`제자리 ${ok}/${T}`;
    tg.innerHTML=order.map((p,i)=>`<button class="tile ${sel===i?'sel':''}" data-i="${i}" aria-label="조각 ${i+1}" style="background-image:url(${url});background-size:${N*100}% ${N*100}%;background-position:${(p%N)/(N-1)*100}% ${Math.floor(p/N)/(N-1)*100}%"></button>`).join('');
    tg.querySelectorAll('.tile').forEach(t=>t.onclick=()=>{if(fin)return;const i=+t.dataset.i;if(sel==null){sel=i}else if(sel===i){sel=null}else{[order[sel],order[i]]=[order[i],order[sel]];sel=null;
      if(order.every((v,k)=>v===k)){fin=true;tg.classList.add('solved');paint();done();return}}paint()})};
  loadImg(IMAGES[S.caseId].puzzle).then(im=>{if(im){const c2=document.createElement('canvas');c2.width=c2.height=600;drawCover(c2.getContext('2d'),im,600,600);url=c2.toDataURL('image/jpeg',.85)}if(document.body.contains(tg))paint()});
  return{solve(){order=[...Array(T).keys()];sel=null;fin=true;tg.classList.add('solved');paint();done()},
    hint(l){if(l===1){$('#pv').innerHTML=`<p class="tip">완성된 모습</p><img class="preview" src="${url}" alt="완성된 그림">`;return '아래에 완성된 그림을 보여 드려요. 네 모서리와 가장자리 조각부터 맞추면 쉬워요.'}
    let n=0;for(let i=0;i<T&&n<5;i++){if(order[i]!==i){const j=order.indexOf(i);[order[i],order[j]]=[order[j],order[i]];n++}}
    if(order.every((v,k)=>v===k)){fin=true;tg.classList.add('solved');paint();done()}else paint();
    return '조각 다섯 개를 제자리로 옮겨 두었어요.'}};
},
match(el,done){
  /* 이름표 붙이기: 작품 카드를 격자로 한 화면에 보여 주고, 화가 이름표는 화면 아래에 고정한다.
     이름표를 누르고 작품을 누르면(또는 반대 순서) 같은 색 이름표가 작품에 붙는다. */
  const d=C().match,hard=S.mode==='hard';
  const idx=hard?d.pairs.map((_,i)=>i):d.normal;
  const COLS=['#c0392b','#2c6fb0','#2e8a4e','#8e44ad','#d35400','#13806f','#a07b0a','#6d5a4a','#c2185b','#3d5a80'];
  const artists=shuffle([...idx.map(i=>({k:'p'+i,a:d.pairs[i].a,bio:d.pairs[i].bio})),...(hard?d.extra.map((e,j)=>({k:'x'+j,a:e.a,bio:e.bio})):[])]).map((a,n)=>({...a,col:COLS[n%COLS.length]}));
  const AK=k=>artists.find(a=>a.k===k);
  const works=shuffle(idx);const link={};const locked=new Set();let sel=null,fin=false;
  el.innerHTML=`<p class="tip">아래 <b>화가 이름표</b>를 누른 다음, 그 화가의 <b>작품 카드</b>를 누르면 이름표가 붙습니다. 붙인 이름표를 떼려면 작품 카드를 한 번 더 누르세요.${hard?' 작품이 없는 화가도 두 명 섞여 있어요.':''}</p>
  <div class="wgrid ${hard?'g4':'g3'}">${works.map(w=>{const p=d.pairs[w];return `<button class="wcard2" data-w="${w}"><span class="wthumb"><span class="wph">「${p.w}」</span>${p.img?`<img src="${imgUrl(p.img)}" alt="${p.w}" onerror="this.remove()">`:''}</span><b>「${p.w}」</b><span class="wd">${p.d}</span><span class="tag empty">이름표를 붙이세요</span></button>`}).join('')}</div>
  <p class="msg" id="mm"></p>
  <div class="tray"><p class="stage">화가 이름표 <span class="muted" style="font-family:var(--f-body)">· 먼저 누르고 작품을 고르세요</span></p><div class="chips2 ${hard?'c5':'c3'}">${artists.map(a=>`<button class="achip" data-a="${a.k}" style="--c:${a.col}"><b>${a.a}</b><small>${a.bio}</small></button>`).join('')}</div></div>`;
  const draw=()=>{
    el.querySelectorAll('.achip').forEach(b=>{b.classList.toggle('sel',!!(sel&&sel.a===b.dataset.a));b.classList.toggle('used',Object.values(link).includes(b.dataset.a))});
    el.querySelectorAll('.wcard2').forEach(b=>{const w=+b.dataset.w,k=link[w],t=b.querySelector('.tag');b.classList.toggle('sel',!!(sel&&sel.w===w));b.classList.toggle('lock',locked.has(w));b.classList.toggle('has',!!k);
      if(k){const a=AK(k);t.className='tag';t.style.setProperty('--c',a.col);t.textContent=(locked.has(w)?'✓ ':'')+a.a}else{t.className='tag empty';t.style.removeProperty('--c');t.textContent=sel&&sel.a?'여기에 붙이기':'이름표를 붙이세요'}})};
  const connect=(w,k)=>{Object.keys(link).forEach(x=>{if(link[x]===k&&!locked.has(+x))delete link[x]});link[w]=k;sel=null;draw();
    const c=el.querySelector(`.wcard2[data-w="${w}"]`);c.classList.remove('stuck');void c.offsetWidth;c.classList.add('stuck');check()};
  const check=()=>{if(!works.every(x=>link[x]))return;const wrong=works.filter(x=>link[x]!=='p'+x);const m=$('#mm');
    if(!wrong.length){fin=true;m.className='msg ok';m.textContent='이름표를 모두 바르게 붙였습니다!';done();return}
    wrong.forEach(x=>el.querySelector(`.wcard2[data-w="${x}"]`).classList.add('bad'));
    m.className='msg no';m.textContent=hard?'틀린 이름표가 있어요. 빨갛게 흔들린 카드의 이름표를 떼어 냈어요.':`${wrong.length}개가 틀렸어요. 빨갛게 흔들린 카드의 이름표를 떼어 냈어요. 설명을 다시 읽어 보세요.`;
    setTimeout(()=>{wrong.forEach(x=>{delete link[x];el.querySelector(`.wcard2[data-w="${x}"]`).classList.remove('bad')});draw()},1100)};
  el.querySelectorAll('.achip').forEach(b=>b.onclick=()=>{if(fin)return;const k=b.dataset.a;const lw=Object.keys(link).find(x=>link[x]===k);if(lw!=null&&locked.has(+lw))return;
    if(sel&&sel.w!=null){connect(sel.w,k);return}sel=sel&&sel.a===k?null:{a:k};draw()});
  el.querySelectorAll('.wcard2').forEach(b=>b.onclick=()=>{if(fin)return;const w=+b.dataset.w;if(locked.has(w))return;
    if(sel&&sel.a){connect(w,sel.a);return}
    if(link[w]!=null&&!sel){delete link[w];draw();return}
    sel=sel&&sel.w===w?null:{w};draw()});
  draw();
  return{hint(l,max){if(l===1&&max>1)return '작품 설명 속의 나라 이름과 시대, 특징(발명가, 요양원, 인상주의 같은 말)을 화가 이름표의 소개와 하나씩 맞춰 보세요.';
    let n=0;for(const w of works){if(n>=2)break;if(locked.has(w))continue;Object.keys(link).forEach(x=>{if(link[x]==='p'+w)delete link[x]});link[w]='p'+w;locked.add(w);n++}
    sel=null;draw();check();return '작품 두 개에 바른 이름표를 붙여 두었어요(✓ 표시).'}};
},
spot(el,done){
  const sp=IMAGES[S.caseId].spot;
  if(sp){let inner=null;el.innerHTML='<p class="tip">그림을 불러오는 중…</p>';
    Promise.all([loadImg(sp.a),loadImg(S.mode==='hard'?sp.hard:sp.norm)]).then(([a,b])=>{if(!document.body.contains(el))return;inner=(a&&b)?spotImg(el,done,sp,a,b):spotDraw(el,done)});
    return{solve(){if(inner)inner.solve();else done()},hint(l,m){return inner?inner.hint(l,m):'그림을 불러오는 중이에요.'}}}
  return spotDraw(el,done);
},
obang(el,done){
  const D=['동','남','중앙','서','북'],pos={북:1,서:3,중앙:4,동:5,남:7};
  const COL={동:['청','#1f5fa8','#fff'],남:['적','#c0392b','#fff'],중앙:['황','#e0b11e','#1a1a1a'],서:['백','#f3f0e6','#1a1a1a'],북:['흑','#1c1c1c','#fff']};
  const stages=[
    {title:'색과 방위',tip:'색을 누른 뒤, 그 색이 가야 할 방위 칸을 누르세요.',chips:D.map(d=>({t:COL[d][0],ans:d,bg:COL[d][1],fg:COL[d][2]})),why:'청(동)·적(남)·황(중앙)·백(서)·흑(북)'},
    {title:'수호 동물',tip:'각 방위를 지키는 수호 동물을 알맞은 칸에 놓으세요. 동물 이름 첫 글자에 색이 숨어 있어요.',chips:[['청룡','동'],['주작','남'],['황룡','중앙'],['백호','서'],['현무','북']].map(([t,a],k)=>({t,ans:a,img:`obang/a${k+1}.webp`})),why:'청룡(동)·주작(남)·황룡(중앙)·백호(서)·현무(북). 고구려 고분 벽화의 사신도에도 그려져 있어요.'},
    {title:'오행',tip:'세상을 이루는 다섯 기운(오행)을 알맞은 칸에 놓으세요.',chips:[['나무','동'],['불','남'],['흙','중앙'],['쇠','서'],['물','북']].map(([t,a],k)=>({t,ans:a,img:`obang/e${k+1}.webp`})),why:'나무(동)·불(남)·흙(중앙)·쇠(서)·물(북)'},
  ].slice(0,M().obang);
  let st=0,sel=null,place={},locked=new Set();
  const draw=()=>{const s=stages[st],cells=Array(9).fill(null);Object.entries(pos).forEach(([d,i])=>cells[i]=d);
    const chimg=c=>c.img?`<img class="chimg" src="${imgUrl(c.img)}" alt="" onerror="this.remove()">`:'';
    el.innerHTML=`<div class="obwrap"><div class="obleft"><div class="board"><b>오방색 안내판</b>${C().obangBoard}</div>
    <p class="stage">자물쇠 ${st+1}/${stages.length} · ${s.title}</p><p class="tip">${s.tip}</p>
    <div class="chips">${s.chips.map((c,i)=>`<button class="cchip ${c.img?'hasimg gray':''} ${sel===i?'sel':''} ${Object.values(place).includes(i)?'used':''}" data-i="${i}" style="${c.bg?`background:${c.bg};color:${c.fg}`:''}">${chimg(c)}<span>${c.t}</span></button>`).join('')}</div></div>
    <div class="obright"><div class="obang">${cells.map(d=>{if(!d)return'<div></div>';const pc=place[d]!=null?s.chips[place[d]]:null;const ok=locked.has(d);
      const sty=pc&&pc.bg?`background:${pc.bg};color:${pc.fg}`:ok&&st>0?`background:${COL[d][1]};color:${COL[d][2]}`:'';
      return `<button class="slot ${pc?'filled':''} ${pc&&pc.img&&!ok?'gray':''} ${ok?'ok':''}" data-d="${d}" style="${sty}">${pc?`${chimg(pc)}<span>${pc.t}</span>`:''}<small>${d}${d==='중앙'?'':'쪽'}</small></button>`}).join('')}</div></div></div><p class="msg" id="om"></p>`;
    el.querySelectorAll('.cchip').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;const d=Object.keys(place).find(k=>place[k]===i);if(d){if(locked.has(d))return;delete place[d]}sel=i;draw()});
    el.querySelectorAll('.slot').forEach(b=>b.onclick=()=>{const d=b.dataset.d;if(locked.has(d))return;if(sel==null){if(place[d]!=null){delete place[d];draw()}return}place[d]=sel;sel=null;
      if(Object.keys(place).length===5){const bad=Object.entries(place).filter(([d,i])=>s.chips[i].ans!==d).map(([d])=>d);
        if(!bad.length){Object.keys(place).forEach(d=>locked.add(d));draw();const m=$('#om');m.className='msg ok';m.textContent='딸깍! '+s.why;el.querySelectorAll('.slot,.cchip').forEach(x=>x.disabled=true);
          st++;if(st===stages.length){done()}else setTimeout(()=>{place={};locked=new Set();draw()},1800);return}
        Object.keys(place).filter(d=>!bad.includes(d)).forEach(d=>locked.add(d));bad.forEach(d=>delete place[d]);draw();$('#om').className='msg no';$('#om').textContent=`${bad.length}개가 제자리가 아니라서 빼 두었어요. 안내판을 다시 읽어 보세요.`;return}
      draw()});};
  draw();
  return{hint(l,max){if(l===1&&max>1)return '안내판에서 “동쪽”, “남쪽”처럼 방위가 나오는 문장마다 밑줄을 긋듯 읽어 보세요. 지금 자물쇠에 필요한 말은 그 문장 안에 있어요.';
    const s=stages[st];['중앙','동'].forEach(d=>{const i=s.chips.findIndex(c=>c.ans===d);Object.keys(place).forEach(k=>{if(place[k]===i)delete place[k]});place[d]=i;locked.add(d)});draw();return '지금 자물쇠의 가운데와 동쪽 칸을 채워 두었어요.'}};
},
order(el,done){
  const od=C().order,idx=S.mode==='hard'?od.cards.map((_,i)=>i):od.normal,n=idx.length;
  const pool=shuffle(idx.map((_,i)=>i));const slots=Array(n).fill(null);const locked=new Set();
  let memoOpen=false;
  const memoBox=()=>{if(!memoOpen)return '';const q=C().quiz;let k=0;const para=q.memo.findIndex(p=>p.length>4);
    return `<div class="memo ordmemo">${`<div class="memo-h">${q.title}</div>`+q.memo.map((p,pi)=>`<p class="${pi===para?'focus':''}"><b>(${PARA[pi]})</b>${p.map(x=>`<span class="${pi===para?'hl':''}" data-s="${k++}">${x}</span>`).join(' ')}</p>`).join('')}</div>`};
  const draw=()=>{el.innerHTML=`${memoBox()}<p class="tip">${od.tip}</p>
    <div class="scroll-ax"><span>${od.axis[0]}</span><span>${od.axis[1]}</span></div>
    <div class="slots">${slots.map((v,i)=>`<button class="oslot ${v!=null?'filled':''} ${locked.has(i)?'lock':''}" data-i="${i}"><span class="n">칸 ${i+1}</span>${v!=null?`<b>${od.cards[idx[v]].t}</b>`:''}</button>`).join('')}</div>
    <div class="pool">${pool.map(v=>`<button class="ocard ${slots.includes(v)?'used':''}" data-c="${v}">${od.cards[idx[v]].img?`<span class="wthumb othumb"><span class="wph">「${od.cards[idx[v]].t}」</span><img src="${imgUrl(od.cards[idx[v]].img)}" alt="" onerror="this.remove()"></span>`:''}<b>${od.cards[idx[v]].t}</b><span>${od.cards[idx[v]].d}</span></button>`).join('')}</div><p class="msg" id="orm"></p>`;
    el.querySelectorAll('.ocard').forEach(b=>b.onclick=()=>{const v=+b.dataset.c;const i=slots.indexOf(null);if(i<0)return;slots[i]=v;draw();
      if(!slots.includes(null)){const right=slots.filter((v,i)=>v===i).length;const m=$('#orm');
        if(right===n){m.className='msg ok';m.textContent=od.win;el.querySelectorAll('button').forEach(x=>x.disabled=true);done()}
        else{m.className='msg no';m.textContent=S.mode==='hard'?'순서가 맞지 않아요. 칸을 눌러 카드를 떼고 다시 붙여 보세요.':`${n}장 중 ${right}장만 제자리에 있어요. 칸을 눌러 카드를 떼고 다시 붙여 보세요.`}}});
    el.querySelectorAll('.oslot').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(locked.has(i))return;slots[i]=null;draw()});};
  draw();
  const lockTwo=()=>{for(let i=0;i<n;i++)if(slots[i]!==i&&!locked.has(i))slots[i]=null;
    [0,1].forEach(i=>{const j=slots.indexOf(i);if(j>=0&&j!==i)slots[j]=null;slots[i]=i;locked.add(i)});draw()};
  return{hint(l,max){
    if(od.memoHint){ /* 첫 힌트: 안내 데스크의 해설 메모를 다시 펼쳐 보여 줌 */
      if(l===1){memoOpen=true;draw();const m=el.querySelector('.ordmemo');if(m)m.scrollIntoView({behavior:'smooth',block:'start'});return od.hint1}
      lockTwo();return '앞의 두 카드를 붙여 두었어요. '+(od.hint2||'')}
    if(l===1&&max>1)return od.hint1;
    lockTwo();return '앞의 두 카드를 붙여 두었어요. '+od.hint1}};
},
};

function spotImg(el,done,sp,imA,imB){
  const md=M(),W=480,Hh=Math.round(W*sp.h/sp.w),k=W/sp.w,isK=S.caseId==='k';
  const diffs=sp.diffs.slice(0,S.mode==='hard'?10:7).map(p=>({pts:p.map(([x,y])=>({x:x*k,y:y*k})),f:false}));
  diffs.forEach(d=>{d.x=d.pts[0].x;d.y=d.pts[0].y});
  const N=diffs.length;
  el.innerHTML=`<div class="row" style="justify-content:space-between"><p class="tip">두 그림에서 다른 곳을 눌러 찾으세요. 색, 크기, 위치, 방향이 바뀐 것도 있어요.${md.spotCool?' 엉뚱한 곳을 누르면 돋보기가 3초 동안 식습니다.':''}</p><span class="chip" id="sc">찾은 곳 0/${N}</span></div>
  <div class="pair"><figure><canvas class="cv" id="c1" width="${W*2}" height="${Hh*2}"></canvas><figcaption>${isK?'진품 사진':'원본 사진'}</figcaption></figure><figure><canvas class="cv" id="c2" width="${W*2}" height="${Hh*2}"></canvas><figcaption>${isK?'연습용 모작':'연습용 모사본'}</figcaption></figure></div><p class="msg" id="sm"></p>`;
  let ring=null,cool=0,fin=false;
  const paint=()=>[['c1',imA],['c2',imB]].forEach(([id,im])=>{const ctx=$('#'+id).getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.drawImage(im,0,0,W,Hh);
    diffs.forEach(d=>{if(d.f)d.pts.forEach(p=>{ctx.strokeStyle='#d62828';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(p.x,p.y,22,0,7);ctx.stroke()})});
    if(ring){ctx.strokeStyle='#ffffff';ctx.setLineDash([6,5]);ctx.lineWidth=4;ctx.beginPath();ctx.arc(ring.x,ring.y,ring.r,0,7);ctx.stroke();ctx.setLineDash([])}});
  paint();
  ['c1','c2'].forEach(id=>$('#'+id).onclick=e=>{if(fin)return;const m=$('#sm');if(Date.now()<cool){m.className='msg no';m.textContent='돋보기가 식는 중이에요. 잠시 기다리세요.';return}
    const b=e.currentTarget.getBoundingClientRect();const x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*Hh/b.height;
    let best=null,bd=1e9;diffs.forEach(d=>{if(d.f)return;d.pts.forEach(p=>{const q=Math.hypot(p.x-x,p.y-y);if(q<bd){bd=q;best=d}})});
    if(best&&bd<md.spotTol){const d=best;d.f=true;if(ring&&Math.hypot(ring.cx-d.x,ring.cy-d.y)<80)ring=null;const n=diffs.filter(d=>d.f).length;$('#sc').textContent=`찾은 곳 ${n}/${N}`;m.className='msg ok';m.textContent='찾았다!';paint();if(n===N){fin=true;m.textContent='다른 곳을 모두 찾았습니다.';done()}}
    else{m.className='msg no';m.textContent='여기는 같아요. 다시 살펴보세요.';if(md.spotCool)cool=Date.now()+md.spotCool*1000}});
  return{solve(){diffs.forEach(d=>d.f=true);ring=null;fin=true;$('#sc').textContent=`찾은 곳 ${N}/${N}`;const m=$('#sm');m.className='msg ok';m.textContent='다른 곳을 모두 찾았습니다.';paint();done()},
    hint(){const d=diffs.find(d=>!d.f);if(!d)return '이미 모두 찾았어요.';ring={x:Math.min(W-60,Math.max(60,d.x+(Math.random()-.5)*50)),y:Math.min(Hh-60,Math.max(60,d.y+(Math.random()-.5)*40)),r:70,cx:d.x,cy:d.y};paint();return '흰 점선 동그라미 안 어딘가에 다른 곳이 하나 숨어 있어요.'}};
}
function spotDraw(el,done){
  const md=M(),W=480,Hh=320,isK=S.caseId==='k',r=rng((isK?41:53)+(S.mode==='hard'?7:0)),cols=8,rows=5,cw=W/cols,ch=Hh/rows;
  const KT=['circle','square','spiral','eye','tri'],KP=['#1d1d1d','#f5f0e1','#b8322f','#2c5d8f','#2f7d4f','#7a3b8f'];
  const MT=['pine','peach','rock','house','bird','boat'],MP={pine:['#2f4a35','#8a9a3a'],peach:['#e07a95','#f4f1ea','#b8323e'],rock:['#4f4c47','#8d8a83'],house:['#6b4a2f','#2b2b2b'],bird:['#222222','#a03030'],boat:['#6b4a2f','#2b5d7a']};
  const ROT=isK?['eye','tri']:['bird','boat','house'];
  const nObj=S.mode==='hard'?32:28,base=S.mode==='hard'?.62:.7;
  const cellsAll=shuffle([...Array(cols*rows).keys()],r);const cells=cellsAll.slice(0,nObj),empty=cellsAll.slice(nObj);
  const mk=c=>{const t=isK?KT[Math.floor(r()*KT.length)]:MT[Math.floor(r()*MT.length)];return{x:(c%cols)*cw+cw/2+(r()-.5)*cw*.25,y:Math.floor(c/cols)*ch+ch/2+(r()-.5)*ch*.2,t,c:isK?KP[Math.floor(r()*KP.length)]:MP[t][0],s:base*(.85+r()*.3),rot:0}};
  const objs=cells.map(mk);const mod=objs.map(o=>({...o}));
  const ops=S.mode==='hard'?['remove','color','type','size','add','shift','rotate','color','size','shift']:['remove','color','type','size','add','color','remove'];
  const pickable=shuffle([...objs.keys()],r);const diffs=[];let ei=0;const used=new Set();
  const take=pred=>{const j=pickable.find(j=>!used.has(j)&&(!pred||pred(mod[j])));if(j!=null)used.add(j);return j};
  ops.forEach(op=>{
    if(op==='add'){const o=mk(empty[ei++]);mod.push(o);diffs.push({x:o.x,y:o.y,f:false});return}
    let i;if(op==='rotate'){i=take(o=>ROT.includes(o.t));if(i==null){op='color';i=take()}}else i=take();
    const o=mod[i];
    if(op==='remove')o.hide=true;
    else if(op==='color'){const pal=isK?KP:MP[o.t];o.c=pal.find(c=>c!==o.c)}
    else if(op==='type'){const ts=isK?KT:MT;o.t=ts.find(t=>t!==o.t);if(!isK)o.c=MP[o.t][0]}
    else if(op==='size')o.s*=.6;
    else if(op==='shift'){o.x+=(o.x<W/2?1:-1)*14;o.y+=8}
    else if(op==='rotate')o.rot=Math.PI;
    diffs.push({x:(objs[i].x+o.x)/2,y:(objs[i].y+o.y)/2,f:false});
  });
  function drawObj(ctx,o){if(o.hide)return;const c=o.c;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot||0);ctx.scale(o.s,o.s);
    switch(o.t){
      case'circle':ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.strokeStyle=c==='#f5f0e1'?'#1d1d1d':'#f5f0e1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.stroke();break;
      case'square':ctx.fillStyle=c;ctx.fillRect(-20,-20,40,40);ctx.fillStyle=c==='#f5f0e1'?'#1d1d1d':'#f5f0e1';ctx.fillRect(-8,-8,16,16);break;
      case'spiral':spiral(ctx,0,0,24,2.4,c,5);break;
      case'eye':ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-28,0);ctx.quadraticCurveTo(0,-22,28,0);ctx.quadraticCurveTo(0,10,-28,0);ctx.fill();ctx.fillStyle=c==='#1d1d1d'?'#f5f0e1':'#1d1d1d';ctx.beginPath();ctx.arc(4,-3,6,0,7);ctx.fill();break;
      case'tri':ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-6,-24);ctx.lineTo(22,18);ctx.lineTo(-22,18);ctx.fill();break;
      case'pine':ctx.fillStyle='#4a3826';ctx.fillRect(-3,0,6,24);ctx.fillStyle=c;for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(0,-k*10+4,20-k*5,7,0,0,7);ctx.fill()}break;
      case'peach':ctx.strokeStyle='#4a3826';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,24);ctx.lineTo(0,0);ctx.lineTo(-12,-12);ctx.moveTo(0,4);ctx.lineTo(13,-10);ctx.stroke();ctx.fillStyle=c;[[-12,-14],[13,-12],[0,-18],[-6,-4],[8,-2],[-16,-2],[16,-20]].forEach(([a,b])=>{ctx.beginPath();ctx.arc(a,b,6,0,7);ctx.fill()});break;
      case'rock':ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-24,20);ctx.lineTo(-16,-8);ctx.lineTo(-2,-22);ctx.lineTo(14,-10);ctx.lineTo(24,20);ctx.fill();ctx.strokeStyle='#e9dec3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-10);ctx.lineTo(-10,12);ctx.stroke();break;
      case'house':ctx.fillStyle='#d9ccb0';ctx.fillRect(-16,-2,32,20);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-24,0);ctx.quadraticCurveTo(0,-12,24,0);ctx.lineTo(16,-16);ctx.lineTo(-16,-16);ctx.fill();ctx.fillStyle='#3a2a1a';ctx.fillRect(4,6,8,12);break;
      case'bird':ctx.strokeStyle=c;ctx.lineWidth=4;ctx.lineCap='round';[[-10,0],[12,-10]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(a-10,b-6);ctx.quadraticCurveTo(a,b,a,b+2);ctx.quadraticCurveTo(a,b,a+12,b-9);ctx.stroke()});break;
      case'boat':ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-26,4);ctx.lineTo(26,4);ctx.lineTo(16,16);ctx.lineTo(-16,16);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(10,-8,5,0,7);ctx.fill();ctx.fillRect(7,-4,6,9);break;
    }ctx.restore()}
  const N=diffs.length;
  el.innerHTML=`<div class="row" style="justify-content:space-between"><p class="tip">두 그림에서 다른 곳을 눌러 찾으세요. 색, 크기, 위치, 방향이 바뀐 것도 있어요.${md.spotCool?' 엉뚱한 곳을 누르면 돋보기가 3초 동안 식습니다.':''}</p><span class="chip" id="sc">찾은 곳 0/${N}</span></div>
  <div class="pair"><figure><canvas class="cv" id="c1" width="${W}" height="${Hh}"></canvas><figcaption>${isK?'진품 사진':'원본 사진'}</figcaption></figure><figure><canvas class="cv" id="c2" width="${W}" height="${Hh}"></canvas><figcaption>${isK?'연습용 모작':'연습용 모사본'}</figcaption></figure></div><p class="msg" id="sm"></p>`;
  let ring=null,cool=0,fin=false;
  const paint=()=>[['c1',objs],['c2',mod]].forEach(([id,list])=>{const ctx=$('#'+id).getContext('2d');const rr=rng(99);
    if(isK)goldBg(ctx,W,Hh,rr);else{paperBg(ctx,W,Hh,rr);mountain(ctx,Hh,130,'rgba(60,60,55,.16)',rng(5),0,W,20)}
    list.forEach(o=>drawObj(ctx,o));
    diffs.forEach(d=>{if(d.f){ctx.strokeStyle='#d62828';ctx.lineWidth=4;ctx.beginPath();ctx.arc(d.x,d.y,24,0,7);ctx.stroke()}});
    if(ring){ctx.strokeStyle='#ffffff';ctx.setLineDash([6,5]);ctx.lineWidth=4;ctx.beginPath();ctx.arc(ring.x,ring.y,ring.r,0,7);ctx.stroke();ctx.setLineDash([])}});
  paint();
  ['c1','c2'].forEach(id=>$('#'+id).onclick=e=>{if(fin)return;const m=$('#sm');if(Date.now()<cool){m.className='msg no';m.textContent='돋보기가 식는 중이에요. 잠시 기다리세요.';return}
    const b=e.currentTarget.getBoundingClientRect();const x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*Hh/b.height;
    const d=diffs.find(d=>!d.f&&Math.hypot(d.x-x,d.y-y)<md.spotTol);
    if(d){d.f=true;if(ring&&Math.hypot(ring.cx-d.x,ring.cy-d.y)<80)ring=null;const n=diffs.filter(d=>d.f).length;$('#sc').textContent=`찾은 곳 ${n}/${N}`;m.className='msg ok';m.textContent='찾았다!';paint();if(n===N){fin=true;m.textContent='다른 곳을 모두 찾았습니다.';done()}}
    else{m.className='msg no';m.textContent='여기는 같아요. 다시 살펴보세요.';if(md.spotCool)cool=Date.now()+md.spotCool*1000}});
  return{solve(){diffs.forEach(d=>d.f=true);ring=null;fin=true;$('#sc').textContent=`찾은 곳 ${N}/${N}`;const m=$('#sm');m.className='msg ok';m.textContent='다른 곳을 모두 찾았습니다.';paint();done()},
    hint(){const d=diffs.find(d=>!d.f);if(!d)return '이미 모두 찾았어요.';ring={x:Math.min(W-60,Math.max(60,d.x+(Math.random()-.5)*50)),y:Math.min(Hh-60,Math.max(60,d.y+(Math.random()-.5)*40)),r:70,cx:d.x,cy:d.y};paint();return '흰 점선 동그라미 안 어딘가에 다른 곳이 하나 숨어 있어요.'}};
}

/* ============ 시작 ============ */
/* 나중에 넣은 그림 자동 인식: 파일이 생기면 대신 쓰던 그림 대신 진짜 그림을 쓴다 */
Object.entries(DETECTIVE.missing).forEach(([sex,m])=>Object.keys(m).forEach(pose=>loadImg(`detective/${sex}-${pose}.webp`).then(im=>{if(im)delete m[pose]})));
['k','m'].forEach(id=>CASES[id].suspects.forEach((x,i)=>{const f=`suspects/${id}${i+1}-confess.webp`;if(x.confess!==f)loadImg(f).then(im=>{if(im)x.confess=f})}));
startTimer();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S)save()});
vTitle();
