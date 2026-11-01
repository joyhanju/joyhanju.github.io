/* 사라진 걸작을 찾아라 · 새 사건(덕종어보·절규)용 전시실 게임
   seal(도장 거울 글씨) · cctv(CCTV 동선 추리) · escape(방 탈출 탐색) · laser(레이저 통로 통과) */

/* ============ 1. 도장 거울 글씨 ============ */
const SEAL_ASYM=['溫','懿','敬','之','德','印','福','壽','永','安','孝','明'];
const SEAL_SYM=['王','大','文','中','山','工'];
const HANJA_NUM=['','一','二','三','四','五','六','七','八','九'];
function sealGlyph(g,f){return `<span class="sg ${f?'f'+f:''}">${g}</span>`}
function sealGrid(cells,kind,cls=''){const c=cells[0].length;return `<div class="sgrid ${kind} ${cls}" style="--c:${c}">${cells.flat().map(x=>sealGlyph(x.g,x.f)).join('')}</div>`}
const SealT={
  print:g=>g.map(r=>r.map(x=>({g:x,f:''}))),
  mirrorH:g=>g.map(r=>r.slice().reverse().map(x=>({g:x,f:'h'}))),      /* 바른 도장 면 */
  flipOnly:g=>g.map(r=>r.map(x=>({g:x,f:'h'}))),                        /* 글자만 뒤집고 자리는 그대로 */
  swapOnly:g=>g.map(r=>r.slice().reverse().map(x=>({g:x,f:''}))),       /* 자리만 바꾸고 글자는 그대로 */
  vflip:g=>g.slice().reverse().map(r=>r.map(x=>({g:x,f:'v'}))),         /* 위아래로 뒤집음 */
};
PUZZLES.seal=function(el,done){
  const ROUNDS=[
    {mode:'p2s',r:1,c:2,title:'두 글자 도장'},
    {mode:'p2s',r:2,c:2,title:'네 글자 도장'},
    {mode:'s2p',r:2,c:2,title:'거꾸로 생각하기'},
    {mode:'p2s',r:2,c:2,sym:2,title:'좌우가 똑같은 글자'},
    {mode:'s2p',r:2,c:3,title:'여섯 글자 도장'},
    {mode:'build',r:2,c:2,title:'도장 면 직접 새기기'},
    {mode:'build',r:2,c:3,title:'여섯 글자 도장 새기기'},
  ];
  const WHY={flipOnly:'글자 하나하나는 뒤집혔지만, 왼쪽 줄과 오른쪽 줄의 자리가 그대로예요.',swapOnly:'줄의 자리는 바뀌었지만, 글자 하나하나가 뒤집히지 않았어요.',vflip:'위아래로 뒤집혔어요. 도장을 찍으면 좌우만 바뀌어요.',print:'이건 찍힌 자국과 똑같은 모양이에요. 도장 면은 좌우가 뒤집혀 있어야 해요.'};
  let ri=0,fin=false,lockUntil=0,removed=new Set();
  const mk=R=>{let pool=shuffle(SEAL_ASYM);const sym=shuffle(SEAL_SYM);const n=R.r*R.c;let gs=[];
    if(R.sym){gs=shuffle([...sym.slice(0,R.sym),...pool.slice(0,n-R.sym)])}else gs=pool.slice(0,n);
    const g=[];for(let i=0;i<R.r;i++)g.push(gs.slice(i*R.c,(i+1)*R.c));return g};
  let G=null,opts=null,build=null;
  const setup=()=>{const R=ROUNDS[ri];G=mk(R);removed=new Set();
    if(R.mode==='build'){build={slots:Array(R.r*R.c).fill(null),pool:shuffle(G.flat().map((g,i)=>({g,i,f:''}))),sel:null};opts=null;return}
    build=null;
    const keys=R.mode==='p2s'?['mirrorH','flipOnly','swapOnly','vflip']:['print','flipOnly','swapOnly','vflip'];
    opts=shuffle(keys).map(k=>({k,cells:k==='print'?SealT.print(G):SealT[k](G)}));
    /* 거꾸로 문제(s2p)의 보기는 '찍힌 자국'이므로, 바른 답은 print, 나머지는 바른 자국을 잘못 바꾼 모양 */
    if(R.mode==='s2p')opts=opts.map(o=>o.k==='print'?o:{k:o.k,cells:o.k==='flipOnly'?SealT.flipOnly(G):o.k==='swapOnly'?SealT.swapOnly(G):SealT.vflip(G)});};
  const right=R=>R.mode==='p2s'?'mirrorH':'print';
  const draw=(msg='',cls='')=>{const R=ROUNDS[ri];
    const prog=ROUNDS.map((_,i)=>`<span class="sdot ${i<ri?'on':i===ri?'cur':''}"></span>`).join('');
    let body='';
    if(R.mode==='p2s'||R.mode==='s2p'){
      const given=R.mode==='p2s'?`<figure class="sgfig"><figcaption>찍힌 자국</figcaption>${sealGrid(SealT.print(G),'print')}</figure>`:`<figure class="sgfig"><figcaption>도장 면</figcaption>${sealGrid(SealT.mirrorH(G),'face')}</figure>`;
      const ask=R.mode==='p2s'?'이 자국을 찍은 <b>도장 면</b>은 어느 것일까요?':'이 도장을 종이에 찍으면 <b>어떤 자국</b>이 남을까요?';
      body=`<div class="sq"><div class="sgiven">${given}<p class="sask">${ask}</p></div>
        <div class="sopts">${opts.map((o,i)=>`<button class="sopt ${removed.has(i)?'gone':''}" data-i="${i}" ${removed.has(i)?'disabled':''}><span class="sn">${'ABCD'[i]}</span>${sealGrid(o.cells,R.mode==='p2s'?'face':'print')}</button>`).join('')}</div></div>`;
    }else{
      const b=build;
      body=`<div class="sq"><div class="sgiven"><figure class="sgfig"><figcaption>찍힌 자국</figcaption>${sealGrid(SealT.print(G),'print')}</figure>
        <p class="sask">이 자국이 찍히도록 <b>도장 면</b>을 직접 새기세요. 글자 조각을 누르고 빈 칸을 누르면 들어갑니다. 칸에 들어간 조각을 누르면 좌우로 뒤집히고, 한 번 더 누르면 빠집니다.</p></div>
        <div class="sbuild"><div class="sgrid face slots" style="--c:${R.c}">${b.slots.map((x,i)=>`<button class="sslot ${x?'has':''}" data-s="${i}">${x?sealGlyph(x.g,x.f):''}</button>`).join('')}</div>
        <div class="spool">${b.pool.map((x,i)=>`<button class="spc ${b.sel===i?'sel':''} ${b.slots.includes(x)?'used':''}" data-p="${i}">${sealGlyph(x.g,'')}</button>`).join('')}</div>
        <div class="row"><button class="btn primary" id="sChk">도장 찍어 보기</button></div></div></div>`;
    }
    el.innerHTML=`<div class="sealwrap"><div class="row" style="justify-content:space-between"><p class="stage">자물쇠 ${ri+1}/${ROUNDS.length} · ${R.title}</p><span class="sprog">${prog}</span></div>
      <p class="tip">진열장 속 연습용 도장으로 알아낸 것: 도장을 종이에 찍으면 도장 면의 모양이 어떻게 바뀌는지 생각해 보세요.</p>${body}<p class="msg ${cls}" id="sMsg">${msg}</p></div>`;
    el.querySelectorAll('.sopt').forEach(b=>b.onclick=()=>pick(+b.dataset.i));
    if(build){
      el.querySelectorAll('.spc').forEach(b=>b.onclick=()=>{const i=+b.dataset.p;if(build.slots.includes(build.pool[i]))return;build.sel=build.sel===i?null:i;draw()});
      el.querySelectorAll('.sslot').forEach(b=>b.onclick=()=>{const s=+b.dataset.s,cur=build.slots[s];
        if(build.sel!=null){const pc=build.pool[build.sel];if(cur){cur.f=''}build.slots[s]=pc;pc.f='';build.sel=null;draw();return}
        if(cur){if(!cur.f){cur.f='h'}else{cur.f='';build.slots[s]=null}draw()}});
      $('#sChk').onclick=checkBuild;
    }
  };
  const next=msg=>{ri++;if(ri>=ROUNDS.length){fin=true;el.innerHTML=`<div class="sealwrap"><div class="sdone">${sealGrid(SealT.print([['德','宗']]),'print','big')}<p class="msg ok">진열장 잠금장치가 모두 풀렸습니다!</p></div></div>`;done();return}
    setup();draw(msg,'ok')};
  const pick=i=>{if(fin)return;const R=ROUNDS[ri];if(Date.now()<lockUntil){draw('잠금장치가 식는 중이에요. 잠시 뒤에 다시 고르세요.','no');return}
    const o=opts[i];
    if(o.k===right(R)){const b=el.querySelector(`.sopt[data-i="${i}"]`);b.classList.add('ok');setTimeout(()=>next('딸깍! 맞았습니다. 다음 자물쇠로 넘어갑니다.'),700)}
    else{lockUntil=Date.now()+3000;const b=el.querySelector(`.sopt[data-i="${i}"]`);b.classList.remove('bad');void b.offsetWidth;b.classList.add('bad');
      const m=$('#sMsg');m.className='msg no';m.textContent='틀렸어요. '+(WHY[o.k]||'')+' (3초 동안 잠깁니다)'}};
  const checkBuild=()=>{if(fin)return;const R=ROUNDS[ri],want=SealT.mirrorH(G).flat();
    if(build.slots.includes(null)){draw('빈 칸이 남아 있어요.','no');return}
    const bad=build.slots.map((x,i)=>!(x.g===want[i].g&&x.f==='h')).map((b,i)=>b?i:-1).filter(i=>i>=0);
    if(!bad.length){next('');return}
    draw(`도장을 찍어 보니 ${bad.length}칸이 자국과 다르게 나왔어요. 글자의 자리와 방향을 다시 확인하세요.`,'no');
    bad.forEach(i=>{const s=el.querySelector(`.sslot[data-s="${i}"]`);if(s)s.classList.add('bad')})};
  setup();draw();
  return{solve(){if(fin)return;fin=true;done()},
    hint(){const R=ROUNDS[ri];
      if(build){const want=SealT.mirrorH(G).flat();[0,1,2].slice(0,R.c).forEach(s=>{const pc=build.pool.find(p=>p.g===want[s].g);build.slots=build.slots.map(x=>x===pc?null:x);build.slots[s]=pc;pc.f='h'});build.sel=null;draw();
        return '도장을 찍으면 좌우가 바뀌어요. 그래서 도장 면은 ① 글자 하나하나가 좌우로 뒤집혀 있고, ② 왼쪽 줄과 오른쪽 줄의 자리도 바뀌어 있어요. 앞의 두 칸을 채워 두었어요.'}
      const wrongIdx=opts.map((o,i)=>o.k!==right(R)?i:-1).filter(i=>i>=0&&!removed.has(i));shuffle(wrongIdx).slice(0,2).forEach(i=>removed.add(i));draw();
      return '도장을 찍으면 좌우가 바뀌어요. 글자 하나하나가 뒤집힐 뿐 아니라, 왼쪽 줄과 오른쪽 줄의 자리도 서로 바뀌어요. 틀린 보기 두 개를 지웠어요.'}};
};

/* ============ 2. CCTV 동선 추리 ============ */
function cctvMake(L,r){
  /* 3×3 방, 일부 벽을 막고(연결은 유지), 카메라 5~6대, 시작은 0(정문 로비), 끝은 8(수장고 앞) */
  for(let tries=0;tries<400;tries++){
    const E=[];for(let i=0;i<9;i++){if(i%3<2)E.push([i,i+1]);if(i<6)E.push([i,i+3])}
    const cut=shuffle(E,r).slice(0,2+Math.floor(r()*2));const edges=E.filter(e=>!cut.includes(e));
    const adj=[...Array(9)].map(()=>[]);edges.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a)});
    const seen=new Set([0]),st=[0];while(st.length){const x=st.pop();adj[x].forEach(y=>{if(!seen.has(y)){seen.add(y);st.push(y)}})}if(seen.size<9)continue;
    /* 정답 경로: 매 분 옆 방으로 이동, 방금 나온 방으로 곧장 되돌아가지 않음 */
    const walk=()=>{const p=[0];for(let t=1;t<=L;t++){const prev=p[t-2],cur=p[t-1];const ch=adj[cur].filter(y=>y!==prev&&(y!==8||t===L));if(!ch.length)return null;p.push(ch[Math.floor(r()*ch.length)])}return p};
    let path=null;for(let k=0;k<200&&!path;k++){const p=walk();if(p&&p[L]===8)path=p}if(!path)continue;
    const cams=shuffle([1,2,3,4,5,6,7],r).slice(0,4+Math.floor(r()*2)).concat([0,8]);
    const all=[];for(let t=1;t<L;t++)cams.forEach(c=>{if(c===0||c===8)return;all.push({t,c,in:path[t]===c})});
    const count=(obs,limit=2)=>{let n=0;const p=[0];const rec=t=>{if(n>=limit)return;if(t>L){if(p[L]===8)n++;return}
      const prev=p[t-2],cur=p[t-1];for(const y of adj[cur]){if(y===prev)continue;if((t===L)!==(y===8))continue;let ok=true;for(const o of obs){if(o.t===t&&((y===o.c)!==o.in)){ok=false;break}}if(!ok)continue;p.push(y);rec(t+1);p.pop()}};rec(1);return n};
    let obs=[];const cand=shuffle(all,r);
    /* '보였다' 기록을 조금 먼저 넣어 읽기 쉽게 */
    cand.splice(0,cand.length,...cand.filter(o=>o.in),...cand.filter(o=>!o.in));
    for(const o of cand){if(count(obs)<=1)break;const before=count(obs,50);obs.push(o);if(count(obs,50)>=before)obs.pop()}
    if(count(obs)!==1)continue;
    /* 없어도 되는 기록은 빼되, 너무 적으면 다시 채워 읽을 거리를 남김 */
    for(const o of shuffle(obs.slice(),r)){const t2=obs.filter(x=>x!==o);if(count(t2)===1)obs=t2}
    const want=Math.ceil(L*.7);for(const o of shuffle(all,r)){if(obs.length>=want)break;if(!obs.includes(o)&&!o.in===(r()<.6))obs.push(o)}
    for(const o of shuffle(all,r)){if(obs.length>=want)break;if(!obs.includes(o))obs.push(o)}
    return{L,adj,edges,path,cams,obs:obs.sort((a,b)=>a.t-b.t||a.c-b.c)};
  }
  return null;
}
PUZZLES.cctv=function(el,done){
  const names=C().cctvMap,STG=[{L:6,start:[23,10]},{L:8,start:[0,20]},{L:10,start:[2,40]}];
  let si=0,P=null,path=[0],fin=false,locked=0;
  const tm=t=>{const[h,m]=STG[si].start;const x=h*60+m+t;return `${String(Math.floor(x/60)%24).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`};
  const gen=()=>{P=null;for(let k=0;k<20&&!P;k++)P=cctvMake(STG[si].L,Math.random);path=[0];locked=0};
  const isAdj=(a,b)=>P.adj[a].includes(b);
  const draw=(msg='',cls='')=>{const L=P.L;
    const cx=i=>40+(i%3)*150,cy=i=>30+Math.floor(i/3)*120;
    const visits={};path.forEach((r,t)=>{(visits[r]=visits[r]||[]).push(t)});
    const last=path[path.length-1],prev=path[path.length-2];
    const TH=C().cctvThumbs||[],RW=120,RH=90;
    let svg=`<svg viewBox="0 0 470 390" class="cmap" role="group" aria-label="박물관 평면도"><defs><clipPath id="crc"><rect width="${RW}" height="${RH}" rx="10"/></clipPath><filter id="csh" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#3b2412" flood-opacity=".45"/></filter></defs>`;
    /* 문(연결된 통로): 점토 문턱 */
    P.edges.forEach(([a,b])=>{const x1=cx(a)+60,y1=cy(a)+45,x2=cx(b)+60,y2=cy(b)+45;svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="cdoor"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="cdoor2"/>`});
    for(let i=0;i<9;i++){const cam=P.cams.includes(i)&&i!==0&&i!==8,can=path.length<=L&&isAdj(last,i)&&i!==prev&&((path.length===L)===(i===8)),v=visits[i]||[];
      svg+=`<g class="croom ${can?'can':''} ${i===last?'here':''} ${v.length?'vis':''}" data-r="${i}" tabindex="0" role="button" aria-label="${names[i]}" transform="translate(${cx(i)},${cy(i)})">
        <g filter="url(#csh)"><rect class="cbase" width="${RW}" height="${RH}" rx="10"/></g>
        <g clip-path="url(#crc)">${TH[i]?`<image href="${imgUrl('thumb/'+TH[i]+'.webp')}" width="${RW}" height="${RH}" preserveAspectRatio="xMidYMid slice"/>`:''}<rect class="cshade" width="${RW}" height="${RH}"/><rect class="cband" y="${RH-24}" width="${RW}" height="24"/></g>
        <rect class="cring" width="${RW}" height="${RH}" rx="10"/>
        <text x="${RW/2}" y="${RH-7}" class="cname">${names[i]}</text>
        ${cam?`<image href="${imgUrl('ui/cctv-cam.webp')}" x="${RW-34}" y="2" width="32" height="32" class="ccamimg"/>`:''}
        ${i===0||i===8?`<rect class="ctagbg" x="5" y="5" width="34" height="18" rx="9"/><text x="22" y="18" class="ctag">${i===0?'출발':'도착'}</text>`:''}
        ${v.length?`<image href="${imgUrl('item/footprint.webp')}" x="${RW/2-17}" y="16" width="34" height="34" class="cfoot"/><rect class="cvisbg" x="${RW/2-40}" y="47" width="80" height="17" rx="8.5"/><text x="${RW/2}" y="60" class="cvis">${v.map(t=>tm(t).slice(3)+'분').join(' · ')}</text>`:''}</g>`}
    svg+='</svg>';
    const slots=[...Array(L+1)].map((_,t)=>`<span class="cslot ${path[t]!=null?'has':''} ${t===0||t===L?'fix':''} ${t<=locked&&t>0?'lock':''}"><small>${tm(t)}</small><b>${t===L&&path[t]==null?'수장고 앞?':path[t]!=null?names[path[t]]:'?'}</b></span>`).join('');
    const log=P.obs.map(o=>`<li class="${o.in?'in':'out'}"><span class="clt">${tm(o.t)}</span><span class="clc">${names[o.c]} 카메라</span><b>${o.in?'사람 그림자가 찍힘':'아무도 없음'}</b></li>`).join('');
    el.innerHTML=`<div class="cctvwrap"><div class="row" style="justify-content:space-between"><p class="stage">녹화 테이프 ${si+1}/${STG.length} · ${tm(0)}부터 ${L}분</p><span class="chip">${path.length-1}/${L}분</span></div>
      <div class="crules"><b>수사 규칙</b><ul><li>범인은 ${tm(0)}에 <b>정문 로비</b>에서 출발해, 1분마다 <b>문으로 이어진 옆 방</b>으로 한 칸씩 옮겼습니다. 같은 방에 머물지 않았어요.</li><li>범인은 서두르느라 <b>방금 나온 방으로 곧장 되돌아가지는 않았습니다.</b></li><li>범인은 ${tm(L)}에 처음으로 <b>수장고 앞</b>에 도착했습니다. 그 전에는 수장고 앞에 들어가지 않았어요.</li><li>카메라 그림이 붙은 방에만 CCTV가 있어요. 기록은 오른쪽 목록에 있는 것만 남았고, 나머지는 고장 났어요.</li></ul></div>
      <div class="clay"><div class="cleft">${svg}<p class="tip">지도에서 다음 1분 동안 범인이 들어간 방을 차례로 누르세요. 밝게 빛나는 방만 고를 수 있어요.</p></div>
      <div class="cright"><p class="stage">남은 CCTV 기록</p><ul class="clog">${log}</ul></div></div>
      <div class="cpath">${slots}</div>
      <div class="row"><button class="btn" id="cUndo" ${path.length<=Math.max(1,locked+1)?'disabled':''}>한 칸 지우기</button><button class="btn ghost" id="cClr" ${path.length<=Math.max(1,locked+1)?'disabled':''}>처음부터</button></div>
      <p class="msg ${cls}" id="cMsg">${msg}</p></div>`;
    el.querySelectorAll('.croom').forEach(g=>{const go=()=>step(+g.dataset.r);g.onclick=go;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
    $('#cUndo').onclick=()=>{if(path.length>Math.max(1,locked+1)){path.pop();draw()}};
    $('#cClr').onclick=()=>{path=path.slice(0,Math.max(1,locked+1));draw()};
  };
  const step=r=>{if(fin)return;const L=P.L,last=path[path.length-1],prev=path[path.length-2];
    if(path.length>L)return;
    if(!isAdj(last,r)){draw(`${names[last]}에서 ${names[r]}${pt(names[r],'으로','로')} 바로 가는 문이 없어요.`,'no');return}
    if(r===prev){draw('범인은 방금 나온 방으로 곧장 되돌아가지 않았어요.','no');return}
    if(path.length===L&&r!==8){draw(`${tm(L)}에는 수장고 앞에 있어야 해요.`,'no');return}
    if(path.length<L&&r===8){draw(`범인은 ${tm(L)}이 되어서야 수장고 앞에 도착했어요.`,'no');return}
    path.push(r);
    if(path.length===L+1)return check();
    draw()};
  const check=()=>{
    for(const o of P.obs){const was=path[o.t]===o.c;if(was!==o.in){
      draw(`기록과 맞지 않아요. ${tm(o.t)} ${names[o.c]} 카메라에는 ‘${o.in?'사람 그림자가 찍힘':'아무도 없음'}’이라고 남아 있는데, 지금 경로는 그때 ${o.in?names[path[o.t]]+'에 있어요':names[o.c]+'에 있어요'}. 경로를 고쳐 보세요.`,'no');return}}
    /* 기록과 모두 맞으면 정답(정답은 하나뿐이 되도록 만들었음) */
    if(si+1>=STG.length){fin=true;draw('범인이 지나간 길을 모두 되살렸습니다!','ok');done();return}
    si++;
    gen();draw('테이프의 기록과 경로가 딱 맞습니다! 다음 테이프를 확인하세요.','ok')};
  gen();draw();
  return{debug:()=>P,solve(){if(fin)return;fin=true;done()},
    hint(){const L=P.L,k=Math.ceil(L/2);path=P.path.slice(0,k+1);locked=k;draw();
      return `처음 ${k}분 동안의 경로를 채워 두었어요(잠금). ‘아무도 없음’ 기록은 그 시각에 그 방이 아니라는 뜻이에요. 갈 수 있는 방이 두 곳일 때, 기록과 어긋나는 쪽을 지워 보세요.`}};
};

/* ============ 3. 방 탈출 탐색 ============ */
const ESC_COL={빨강:'#c0392b',노랑:'#e0b11e',파랑:'#2c6fb0',초록:'#2e8a4e',보라:'#7d3c98'};
function escJar(col,num,lit){return `<svg viewBox="0 0 120 140" class="ezsvg"><g stroke="#5a3b22" stroke-width="3">${[30,45,60,75,90].map((x,i)=>`<line x1="${x}" y1="58" x2="${x+(i-2)*5}" y2="8"/>`).join('')}</g>
  <path d="M22 56 Q60 46 98 56 L94 128 Q60 136 26 128 Z" fill="#c9a77d" stroke="#7a5532" stroke-width="3"/>
  <rect x="24" y="78" width="72" height="16" fill="${ESC_COL[col]}"/>
  <text x="60" y="122" text-anchor="middle" font-size="${lit?22:9}" font-weight="700" fill="#3b2412" opacity="${lit?1:.35}">${lit?num:'···'}</text></svg>`}
function escSeal2(g){return `<svg viewBox="0 0 120 120" class="ezsvg"><rect x="20" y="20" width="80" height="80" rx="6" fill="#fff6ef" stroke="#b5332e" stroke-width="6"/><text x="60" y="80" text-anchor="middle" font-size="54" fill="#b5332e" font-family="'Noto Serif KR',serif" font-weight="700">${g}</text></svg>`}
function escSeal(num,dots){return `<svg viewBox="0 0 120 120" class="ezsvg"><rect x="20" y="20" width="80" height="80" rx="6" fill="#fff6ef" stroke="#b5332e" stroke-width="6"/><text x="60" y="80" text-anchor="middle" font-size="54" fill="#b5332e" font-family="'Noto Serif KR',serif" font-weight="700">${HANJA_NUM[num]}</text>${[...Array(dots)].map((_,i)=>`<circle cx="${108}" cy="${30+i*16}" r="5" fill="#b5332e"/>`).join('')}</svg>`}
const ESCAPES={
s(r){ /* 절규 · 복원실 */
  const cols=shuffle(Object.keys(ESC_COL),r),nums=cols.map(()=>1+Math.floor(r()*9));
  const jars=['jarL','jar1','jar2','jar3','jar4'];const jc={};jars.forEach((j,i)=>jc[j]={col:cols[i],num:nums[i]});
  const seq=shuffle(cols,r).slice(0,4),code=seq.map(c=>jc[jars[cols.indexOf(c)]].num).join('');
  const items={key:{name:'작은 열쇠',desc:'약병 밑에 붙어 있던 작은 놋쇠 열쇠.'},uv:{name:'UV 손전등',desc:'보랏빛 불이 나오는 손전등. 형광 물감을 비추면 보인다.'},log:{name:'복원 일지',desc:'김도윤의 복원 일지 한 장.',view:`<div class="ezpaper"><b>복원 일지</b><p>캐비닛 비밀번호는 잊지 않게 숨겨 둠.</p><p>① 이젤 캔버스에 <b>형광 물감</b>으로 찍은 색 순서대로</p><p>② 같은 색 띠를 두른 <b>붓통 바닥의 숫자</b>를 읽을 것.</p><p class="muted">※ 붓통 숫자는 작아서 밝은 불빛 아래에서만 보임</p></div>`}};
  const H=[
    {id:'shelf',r:[88,10,12,18],name:'약품 선반',act(s){if(!s.f.key){s.f.key=1;return{msg:'선반 위 약병을 하나씩 들어 보니, 가장 큰 병 밑에 작은 열쇠가 테이프로 붙어 있어요!',give:'key'}}return{msg:'보존 처리용 약품병들이에요. 더는 특별한 게 없어요.'}}},
    {id:'drawer',r:[75,62,11,9],name:'작은 서랍',act(s,it){if(s.f.drawer)return{msg:'서랍은 이제 비어 있어요.'};if(it==='key'){s.f.drawer=1;return{msg:'딸깍! 서랍이 열렸어요. 안에 UV 손전등과 복원 일지 한 장이 들어 있어요.',give:['uv','log'],use:'key'}}return{msg:'잠겨 있어요. 작은 열쇠 구멍이 보여요.'}}},
    {id:'easel',r:[16,42,14,24],name:'이젤 캔버스',act(s,it){if(it==='uv'||s.f.uv){s.f.uv=1;return{msg:it==='uv'?'UV 손전등을 비추자 하얀 캔버스 위에 형광 물감 자국 네 개가 빛나요!':'형광 물감 자국이 순서대로 찍혀 있어요.',zoom:`<div class="ezcanvas">${seq.map((c,i)=>`<span class="ezdot" style="--c:${ESC_COL[c]}"><b>${i+1}</b></span>${i<3?'<span class="ezarr">→</span>':''}`).join('')}</div><p class="tip">${seq.join(' → ')}</p>`}}
      return{msg:'아무것도 그려지지 않은 하얀 캔버스예요. 그런데 빛을 받으니 표면이 군데군데 살짝 반짝여요.'}}},
    {id:'lamp',r:[26,30,17,12],name:'돋보기 램프',act(s){if(!s.f.light){s.f.light=1;return{msg:'램프를 켰어요. 작업대와 붓통이 환해졌어요.',light:1}}return{msg:'돋보기 램프가 환하게 켜져 있어요.'}}},
    {id:'pics',r:[35,54,20,8],name:'작업대 위 그림',act(){return{msg:'노을 풍경을 연습한 그림 두 장이에요. 뒷면에 ‘형광 물감 실험 중 · 김도윤’이라고 적혀 있어요.'}}},
    {id:'tubes',r:[56,56,31,7],name:'물감 튜브',act(){return{msg:'빨강, 노랑, 파랑, 초록, 보라 물감 튜브가 흩어져 있어요.'}}},
    ...jars.map((j,k)=>({id:j,r:[[1,10,8,16],[58,41,6,14],[64,40,6,15],[72,42,7,13],[80,41,6,14]][k],name:k?`작업대 붓통 ${k}`:'왼쪽 선반 붓통',act(s){const c=jc[j];return{msg:s.f.light?`붓통에 ${c.col} 띠가 둘러져 있고, 바닥에 숫자 ${c.num}이 새겨져 있어요.`:`붓통에 ${c.col} 띠가 둘러져 있어요. 바닥에 작은 숫자가 있는데 너무 어두워서 안 보여요.`,zoom:escJar(c.col,c.num,s.f.light)}}})),
    {id:'cabL',r:[0,62,14,30],name:'왼쪽 캐비닛',act(){return{msg:'붓 상자와 헌 천뿐이에요.'}}},
    {id:'cabR',r:[87,64,13,30],name:'오른쪽 캐비닛',act(){return{msg:'네 자리 숫자 자물쇠가 걸려 있어요.',lock:4}}},
  ];
  const hint=s=>!s.f.key?'방 오른쪽 위 선반의 약병들을 살펴보세요.':!s.f.drawer?'찾은 열쇠를 아래 소지품에서 고른 뒤, 잠겨 있는 곳을 눌러 보세요.':!s.f.uv?'복원 일지를 읽어 보고, UV 손전등을 고른 채로 이젤의 캔버스를 눌러 보세요.':!s.f.light?'붓통 숫자가 어두워서 안 보여요. 방 안의 조명을 켜 보세요.':`색 순서는 ${seq.join(' → ')}이에요. 첫 두 자리는 ${code.slice(0,2)}예요.`;
  return{H,items,code,hint};
},
d(r){ /* 덕종어보 · 표구 연구실 (배경 bg/d-4) */
  const nums=[0,0,0,0].map(()=>1+Math.floor(r()*9)),pos=shuffle([1,2,3,4],r);
  const src=['lampS','lampB','scroll','stamp'];const sv={};src.forEach((k,i)=>sv[k]={num:nums[i],dots:pos[i]});
  const code=[1,2,3,4].map(p=>sv[src.find(k=>sv[k].dots===p)].num).join('');
  const realScroll=1+Math.floor(r()*4);                     /* 족자 네 점 중 하나에만 점 찍힌 낙관이 숨어 있음 */
  const decoy=['山','雲','松','月','水','石'];const dg=shuffle(decoy,r);
  const drawerJunk=shuffle(['비어 있어요.','얇은 한지 조각이 몇 장 들어 있어요.','말린 쑥 냄새가 나요. 벌레를 쫓으려고 넣어 둔 것 같아요.','실타래와 바늘이 들어 있어요.','몽당붓 몇 자루가 굴러다녀요.','종이를 펴는 나무 자가 들어 있어요.','부러진 먹 조각이 들어 있어요.'],r);
  const stampAt=[0,1,2,3,5,6,8][Math.floor(r()*7)];          /* 7번(아래 가운데)은 잠긴 서랍, 4번은 가운데 */
  const items={
    note:{name:'붉은 끈 쪽지',desc:'붉은 끈 두루마리 속에 있던 쪽지.',view:`<div class="ezpaper"><b>표구 장인의 쪽지</b><p>보관함 비밀번호는 이 방에 숨은 <b>점 찍힌 낙관 네 개</b>에 있다.</p><p>낙관에 새긴 <b>한자 숫자</b>가 비밀번호의 숫자이고, 낙관 옆 <b>점의 개수</b>가 몇째 자리인지 알려 준다.</p><p class="muted">※ 점이 없는 낙관은 화가의 이름 도장이니 헷갈리지 말 것.</p></div>`},
    table:{name:'한자 숫자표',desc:'천에 수놓인 한자 숫자표.',view:`<div class="ezpaper"><b>한자 숫자표</b><div class="eznum">${HANJA_NUM.slice(1).map((h,i)=>`<span><b>${h}</b>${i+1}</span>`).join('')}</div></div>`},
    pole:{name:'대나무 막대',desc:'끝이 갈고리처럼 굽은 긴 대나무 막대. 높은 곳에 걸린 물건을 끌어내릴 때 쓴다.'},
    dropper:{name:'연적',desc:'벼루에 물을 따를 때 쓰는 하얀 도자기 물병. 물이 조금 들어 있다.'},
    key:{name:'작은 놋쇠 열쇠',desc:'굳은 풀 속에 박혀 있던 작은 놋쇠 열쇠.'},
    loupe:{name:'돋보기',desc:'표구 장인이 쓰던 돋보기. 흐릿한 글씨나 낙관을 자세히 볼 수 있다.'},
    stamp:{name:'연습용 도장',desc:'나무로 깎은 작은 연습용 도장. 도장 면이 닳아서 그냥 보면 무슨 글자인지 알 수 없다. 인주를 묻혀 찍어 봐야 한다.'},
  };
  const drawers=()=>`<div class="ezdrawers">${[...Array(9)].map((_,i)=>`<button class="ezsub ezdr ${i===7?'lockd':''}" data-h="cabinet" data-s="${i}">${i===7?'🔒':''}</button>`).join('')}</div><p class="tip">서랍을 하나씩 눌러 열어 보세요.</p>`;
  const scrollAct=n=>({id:'scroll'+n,r:[[22.5,27,8,30],[37.8,25,7.7,24],[46.9,25,7.5,24],[56,25,7.3,16]][n-1],name:`족자 ${n}`,act(s,it){
    if(n!==realScroll)return{msg:it==='loupe'?'돋보기로 꼼꼼히 살펴봤지만, 오른쪽 위에 화가의 이름 도장만 있어요. 옆에 점은 없어요.':'먹으로 그린 산수화 족자예요. 오른쪽 위에 붉은 낙관이 찍혀 있어요.',zoom:escSeal2(dg[n%dg.length])};
    if(it==='loupe'||s.f.scroll){s.f.scroll=1;return{msg:'돋보기로 비춰 보니, 산 그림 아래 바위 그늘에 아주 흐릿한 낙관이 하나 더 숨어 있어요!',zoom:escSeal(sv.scroll.num,sv.scroll.dots)}}
    return{msg:'먹으로 그린 산수화 족자예요. 오른쪽 위에 낙관이 있고, 아래쪽 바위 그늘에 무언가 흐릿하게 찍혀 있는 것 같은데 눈으로는 잘 안 보여요.',zoom:escSeal2(dg[n%dg.length])}}});
  const H=[
    {id:'scrolls',r:[71,60,14.5,18],name:'두루마리 더미',act(s){if(!s.f.note){s.f.note=1;return{msg:'두루마리 아홉 개 중 하나만 붉은 끈으로 묶여 있어요. 펼쳐 보니 쪽지가 들어 있어요!',give:'note'}}return{msg:'표구를 마친 두루마리들이 쌓여 있어요.'}}},
    {id:'rack',r:[7,42,14,46],name:'수건걸이 천',act(s){if(!s.f.rack){s.f.rack=1;return{msg:'걸린 비단 천을 들춰 보니 뒤에 긴 대나무 막대가 기대어 있어요. 천 한 장에는 한자 숫자표가 수놓여 있어요.',give:['pole','table']}}return{msg:'표구할 때 쓰는 비단 천들이 걸려 있어요.'}}},
    {id:'lampS',r:[5,2,17,25],name:'작은 등 두 개',act(s,it){if(s.f.lampS||it==='pole'){s.f.lampS=1;return{msg:'대나무 막대로 등을 끌어내리니, 등 안쪽 종이에 낙관이 찍혀 있어요.',zoom:escSeal(sv.lampS.num,sv.lampS.dots)}}return{msg:'등이 높이 매달려 있어서 손이 닿지 않아요. 안쪽에 붉은 무언가가 비쳐 보여요.'}}},
    {id:'lampB',r:[43,0,14,21],name:'큰 종이등',act(s,it){if(s.f.lampB||it==='pole'){s.f.lampB=1;return{msg:'막대로 큰 종이등을 살짝 기울이니, 안쪽에 낙관이 하나 보여요.',zoom:escSeal(sv.lampB.num,sv.lampB.dots)}}return{msg:'천장 높이 매달린 큰 종이등이에요. 손이 닿지 않아요.'}}},
    scrollAct(1),scrollAct(2),scrollAct(3),scrollAct(4),
    {id:'brushes',r:[58.5,42,10.5,15],name:'붓걸이',act(){return{msg:'크기가 다른 붓 다섯 자루가 걸려 있어요. 붓끝이 모두 깨끗하게 씻겨 있어요.'}}},
    {id:'window',r:[69.5,30,10.5,24],name:'창호 문',act(){return{msg:'한지를 바른 창호 문이에요. 밖은 박물관 복도예요. 단단히 잠겨 있어요.'}}},
    {id:'bowl',r:[39.5,50,7.5,10],name:'풀 그릇',act(s,it){if(s.f.key)return{msg:'풀이 묽어졌어요. 더는 아무것도 없어요.'};
      if(it==='dropper'){s.f.key=1;return{msg:'연적의 물을 조금 부어 굳은 풀을 녹이자, 그 속에 박혀 있던 작은 놋쇠 열쇠가 쏙 빠져나왔어요!',give:'key',use:'dropper'}}
      return{msg:'표구할 때 쓰는 밀가루 풀이 딱딱하게 굳어 있어요. 그런데 풀 속에 작은 열쇠 머리가 반짝여요! 손으로는 빠지지 않아요.'}}},
    {id:'inkpad',r:[33.8,56,5.5,7],name:'인주함',act(s,it){if(it==='stamp'||s.f.stamped){s.f.stamped=1;return{msg:'연습용 도장에 붉은 인주를 묻혀 종이에 꾹 찍어 보니, 낙관이 또렷하게 나타났어요!',zoom:escSeal(sv.stamp.num,sv.stamp.dots),use:it==='stamp'?'stamp':undefined}}
      return{msg:'도장을 찍을 때 쓰는 붉은 인주가 담긴 동그란 함이에요.'}}},
    {id:'picA',r:[48.5,55,9,6.5],name:'왼쪽 그림',act(){return{msg:'표구를 기다리는 산수화예요. 구석에 화가의 이름 도장이 있어요. 옆에 점은 없어요.',zoom:escSeal2(dg[4])}}},
    {id:'picB',r:[57.8,55,9.5,6.5],name:'오른쪽 그림',act(){return{msg:'붉은 성벽이 그려진 그림이에요. 구석에 화가의 이름 도장이 있어요. 옆에 점은 없어요.',zoom:escSeal2(dg[5])}}},
    {id:'inkstone',r:[21,67,16.5,24],name:'벼루 상자',act(s){if(!s.f.dropper){s.f.dropper=1;return{msg:'뚜껑이 열린 벼루 상자 안에 벼루, 먹, 그리고 하얀 연적이 들어 있어요. 연적에는 물이 조금 남아 있어요.',give:'dropper'}}return{msg:'벼루와 먹이 들어 있어요.'}}},
    {id:'cabinet',r:[85.5,31,11.5,32],name:'약장',act(s,it,sub){
      if(sub==null)return{msg:'작은 서랍 아홉 칸이 달린 약장이에요. 맨 아래 가운데 서랍에만 자물쇠가 달려 있어요.',zoom:drawers()};
      const i=+sub;
      if(i===7){if(s.f.drawer)return{msg:'잠겨 있던 서랍은 이제 비어 있어요.',zoom:drawers()};
        if(it==='key'){s.f.drawer=1;return{msg:'딸깍! 놋쇠 열쇠로 맨 아래 서랍을 열었어요. 안에 돋보기가 들어 있어요!',give:'loupe',use:'key',zoom:drawers()}}
        return{msg:'맨 아래 가운데 서랍은 작은 자물쇠로 잠겨 있어요.',zoom:drawers()}}
      if(i===stampAt){if(!s.f.stamp){s.f.stamp=1;return{msg:`${i+1}번째 서랍을 열어 보니 작은 연습용 도장이 들어 있어요!`,give:'stamp',zoom:drawers()}}return{msg:'도장이 들어 있던 서랍이에요. 이제 비어 있어요.',zoom:drawers()}}
      const k=[0,1,2,3,4,5,6,8].filter(x=>x!==stampAt).indexOf(i);return{msg:`${i+1}번째 서랍: ${drawerJunk[k%drawerJunk.length]}`,zoom:drawers()}}},
    {id:'box',r:[53.5,68.5,13.3,12],name:'작업대 밑 보관함',act(){return{msg:'작업대 밑에 네 자리 숫자 자물쇠가 걸린 나무 보관함이 있어요.',lock:4}}},
  ];
  const hint=s=>!s.f.note?'방 오른쪽 아래에 쌓인 두루마리 더미부터 살펴보세요.'
    :!s.f.rack?'왼쪽 수건걸이에 걸린 천 뒤를 살펴보세요.'
    :!(s.f.lampS&&s.f.lampB)?'대나무 막대를 소지품에서 고른 채로 높이 매달린 등들을 눌러 보세요.'
    :!s.f.key?'풀 그릇 속 열쇠는 굳은 풀 때문에 빠지지 않아요. 물을 담을 수 있는 물건을 찾아 풀 그릇에 써 보세요.'
    :!s.f.drawer?'놋쇠 열쇠를 고른 채로 약장을 눌러, 잠긴 서랍을 열어 보세요.'
    :!s.f.scroll?'돋보기를 고른 채로 벽에 걸린 족자 네 점을 하나씩 살펴보세요. 한 점에만 숨은 낙관이 있어요.'
    :!s.f.stamp?'약장의 다른 서랍들도 하나씩 열어 보세요.'
    :!s.f.stamped?'연습용 도장을 고른 채로 인주함을 눌러 보세요.'
    :`점이 하나인 낙관의 숫자가 첫째 자리예요. 첫 두 자리는 ${code.slice(0,2)}예요.`;
  return{H,items,code,hint};
}};
PUZZLES.escape=function(el,done){
  const SC=ESCAPES[S.caseId](Math.random),st={f:{},inv:[],used:new Set(),sel:null,seen:new Set()};let fin=false,cool=0,entry='';let pose='search';
  const bg=IMAGES[S.caseId].rooms[S.room];
  const draw=(msg='살펴볼 곳을 누르세요. 찾은 물건은 아래 소지품에 들어가요.',zoom='',lock=false)=>{
    el.innerHTML=`<div class="escwrap"><div class="escscene ${st.f.light?'lit':''}" style="background-image:url('${imgUrl(bg)}')">${SC.H.map(h=>`<button class="hot ${st.seen.has(h.id)?'seen':''} ${h.r[1]<8?'lblin':''}" data-h="${h.id}" style="left:${h.r[0]}%;top:${h.r[1]}%;width:${h.r[2]}%;height:${h.r[3]}%" aria-label="${h.name}"><span>${h.name}</span></button>`).join('')}</div>
      <div class="esclay"><div class="escmsg"><span class="escdet"><img id="detImg" class="pop" src="${imgUrl(det(pose))}" alt="" onerror="this.remove()"></span><div class="escbub"><p>${msg}</p>${zoom?`<div class="ezoom">${zoom}</div>`:''}${lock?`<div class="ezlock"><div class="ezdisp">${[0,1,2,3].map(i=>`<span>${entry[i]||''}</span>`).join('')}</div><div class="ezkeys">${[1,2,3,4,5,6,7,8,9,'지우기',0,'열기'].map(k=>`<button class="btn ezk" data-k="${k}">${k}</button>`).join('')}</div></div>`:''}</div></div>
      <div class="escinv"><p class="stage">소지품 <span class="muted">· 누르면 자세히 보고, 고른 채로 장소를 누르면 사용해요</span></p><div class="invrow">${st.inv.length?st.inv.map(k=>`<button class="invi ${st.sel===k?'sel':''} ${st.used.has(k)?'usedup':''}" data-i="${k}">${SC.items[k].name}</button>`).join(''):'<span class="muted">아직 없음</span>'}</div></div></div>
      <p class="msg" id="eMsg"></p></div>`;
    el.querySelectorAll('.hot').forEach(b=>b.onclick=()=>look(b.dataset.h));
    el.querySelectorAll('.invi').forEach(b=>b.onclick=()=>{const k=b.dataset.i;st.sel=st.sel===k?null:k;const it=SC.items[k];draw(st.sel?`‘${it.name}’${pt(it.name,'을','를')} 골랐어요. 쓸 곳을 누르세요. · ${it.desc}`:it.desc,it.view||'')});
    el.querySelectorAll('.ezk').forEach(b=>b.onclick=()=>key(b.dataset.k));
    el.querySelectorAll('.ezsub').forEach(b=>b.onclick=()=>look(b.dataset.h,b.dataset.s));
  };
  const look=(id,sub)=>{if(fin)return;const h=SC.H.find(x=>x.id===id);st.seen.add(id);const it=st.sel;const res=h.act(st,it,sub)||{};
    const g=res.give?[].concat(res.give):[];g.forEach(k=>{if(!st.inv.includes(k))st.inv.push(k)});
    if(res.use){st.used.add(res.use)}
    if(it&&!res.use&&!g.length&&!res.zoom&&!res.light)res.msg=`${SC.items[it].name}${pt(SC.items[it].name,'은','는')} 여기에 쓸 수 없어요. ${res.msg}`;
    if(res.use||g.length)st.sel=null;
    pose=g.length||res.use?'idea':res.lock?'think':(it&&!res.zoom&&!res.light)?'oops':res.zoom?'point':'search';
    entry='';draw(`<b>${h.name}</b> · ${res.msg}`,res.zoom||'',!!res.lock)};
  const key=k=>{if(fin)return;const m=$('#eMsg');
    if(k==='지우기'){entry=entry.slice(0,-1)}else if(k==='열기'){if(Date.now()<cool){m.className='msg no';m.textContent='자물쇠가 잠시 잠겼어요. 조금 뒤에 다시 해 보세요.';return}
      if(entry===SC.code){fin=true;draw('<b>딸깍!</b> 자물쇠가 열렸어요. 안에서 증거를 찾았습니다!');done();return}
      cool=Date.now()+3000;entry='';pose='oops';setPose('oops');const d=el.querySelector('.ezdisp');if(d){d.classList.remove('bad');void d.offsetWidth;d.classList.add('bad')}m.className='msg no';m.textContent='비밀번호가 틀렸어요. (3초 동안 잠깁니다)';return}
    else if(entry.length<4)entry+=k;
    el.querySelectorAll('.ezdisp span').forEach((s,i)=>s.textContent=entry[i]||'')};
  draw();
  return{debug:()=>SC.code,solve(){if(fin)return;fin=true;done()},hint(){return SC.hint(st)}};
};

/* ============ 4. 레이저 통로 통과 ============ */
const LASER_LV=[
  {name:'첫 번째 통로',lasers:[{k:'row',r:1,p:2.6,on:1.3,ph:0},{k:'row',r:3,p:2.6,on:1.3,ph:.9},{k:'row',r:5,p:2.6,on:1.3,ph:1.8}],walls:[[1,2],[7,2],[1,4],[7,4],[4,4],[3,2],[5,2]]},
  {name:'두 번째 통로',lasers:[{k:'row',r:1,p:2.2,on:1.2,ph:0},{k:'sweep',r0:2,r1:4,c0:0,c1:8,p:5.2},{k:'col',c:2,r0:0,r1:6,p:3,on:1.4,ph:.4},{k:'col',c:6,r0:0,r1:6,p:3,on:1.4,ph:1.9},{k:'row',r:5,p:2.4,on:1.2,ph:1.1}],walls:[[4,3],[3,5],[5,1]]},
  {name:'마지막 통로',key:[0,3],lasers:[{k:'row',r:1,p:2,on:1.1,ph:0},{k:'row',r:2,c0:0,c1:5,p:2.4,on:1.3,ph:1.2},{k:'sweep',r0:3,r1:4,c0:0,c1:8,p:4.6},{k:'col',c:5,r0:0,r1:6,p:2.8,on:1.3,ph:.6},{k:'row',r:5,c0:3,c1:8,p:2.2,on:1.1,ph:.3}],walls:[[2,2],[7,4],[2,5],[4,4],[4,2],[6,1]]},
];
PUZZLES.laser=function(el,done){
  const CW=9,CH=7,U=64,W=CW*U,Hh=CH*U;let li=0,fin=false,slow=1,raf=0,t0=0,pl={x:4,y:6},hasKey=false,deaths=0,flash=0,best=[],lvStart=0;
  const goal={x:4,y:0};
  el.innerHTML=`<div class="laserwrap"><div class="row" style="justify-content:space-between"><p class="stage" id="lvN"></p><span class="chip" id="lvS"></span></div>
    <p class="tip">빨간 레이저가 꺼져 있을 때 지나가세요. 깜빡이기 직전에는 레이저 자리가 희미하게 보여요. 아래 방향 버튼을 누르거나(꾹 누르면 계속 가요), 그림 위를 손가락으로 밀거나 가고 싶은 쪽을 톡 치면 한 칸씩 움직여요. 키보드 화살표도 돼요.</p>
    <div class="lzbox"><canvas id="lz" width="${W*2}" height="${Hh*2}" aria-label="레이저 통로 게임 화면"></canvas><div class="lzover" id="lzO" hidden></div></div>
    <div class="dpad"><button class="btn" data-d="0,-1" aria-label="위로">▲</button><button class="btn" data-d="-1,0" aria-label="왼쪽으로">◀</button><button class="btn" data-d="1,0" aria-label="오른쪽으로">▶</button><button class="btn" data-d="0,1" aria-label="아래로">▼</button></div>
    <p class="msg" id="lzM"></p></div>`;
  const cv=$('#lz'),g=cv.getContext('2d');g.scale(2,2);
  let detIm=null;loadImg(det('search')).then(im=>detIm=im);
  const SP={};let floor=null;[['tile','ui/tile-marble.webp'],['frame','ui/goal-frame.webp'],['pedestal','ui/pedestal.webp'],['card','ui/keycard.webp'],['emitter','ui/laser-emitter.webp']].forEach(([k,f])=>loadImg(f).then(im=>{if(im){SP[k]=im;if(k==='tile')floor=null}}));
  const LV=()=>LASER_LV[li];
  const now=()=>(performance.now()-t0)/1000*slow;
  const cells=(z,t)=>{const out=[];
    if(z.k==='row'){if(((t+z.ph)%z.p)<z.on)for(let c=z.c0??0;c<=(z.c1??8);c++)out.push([c,z.r])}
    else if(z.k==='col'){if(((t+z.ph)%z.p)<z.on)for(let r=z.r0;r<=z.r1;r++)out.push([z.c,r])}
    else if(z.k==='sweep'){const k=(t%z.p)/z.p,u=k<.5?k*2:2-k*2,c=Math.round(z.c0+(z.c1-z.c0)*u);for(let r=z.r0;r<=z.r1;r++)out.push([c,r])}
    return out};
  const soon=(z,t)=>z.k!=='sweep'&&!cells(z,t).length&&cells(z,t+.45).length;
  const blocked=(x,y)=>x<0||y<0||x>=CW||y>=CH||LV().walls.some(([a,b])=>a===x&&b===y)||(LV().key&&!hasKey&&x===goal.x&&y===goal.y&&false);
  const reset=msg=>{pl={x:4,y:6};hasKey=false;flash=performance.now();if(msg){const m=$('#lzM');m.className='msg no';m.textContent=msg}};
  const startLv=(okMsg)=>{pl={x:4,y:6};hasKey=false;t0=performance.now();lvStart=performance.now();$('#lvN').textContent=`통로 ${li+1}/${LASER_LV.length} · ${LV().name}`;upd();const m=$('#lzM');m.className=okMsg?'msg ok':'msg';m.textContent=[okMsg,LV().key?'이번 통로는 출구가 잠겨 있어요. 먼저 왼쪽의 보안 카드(노란 카드)를 주워야 해요.':''].filter(Boolean).join(' ')};
  const upd=()=>{$('#lvS').textContent=`걸린 횟수 ${deaths}`};
  const hit=t=>LV().lasers.some(z=>cells(z,t).some(([x,y])=>x===pl.x&&y===pl.y));
  const move=(dx,dy)=>{if(fin)return;const nx=pl.x+dx,ny=pl.y+dy;if(blocked(nx,ny))return;
    if(LV().key&&!hasKey&&nx===goal.x&&ny===goal.y){const m=$('#lzM');m.className='msg no';m.textContent='출구가 잠겨 있어요. 보안 카드를 먼저 주우세요.';return}
    pl={x:nx,y:ny};
    if(LV().key&&!hasKey&&pl.x===LV().key[0]&&pl.y===LV().key[1]){hasKey=true;const m=$('#lzM');m.className='msg ok';m.textContent='보안 카드를 주웠어요! 이제 출구가 열립니다.'}
    if(hit(now())){deaths++;upd();reset('삐익! 레이저에 닿았어요. 출발점에서 다시 시작합니다.');return}
    if(pl.x===goal.x&&pl.y===goal.y){best.push(Math.round((performance.now()-lvStart)/1000));
      if(li+1>=LASER_LV.length){fin=true;cancelAnimationFrame(raf);paint(now());const o=$('#lzO');o.hidden=false;o.innerHTML=`<b>통과!</b><span>통로 기록 ${best.map((s,i)=>`${i+1}번 ${s}초`).join(' · ')}</span>`;const m=$('#lzM');m.className='msg ok';m.textContent='레이저를 모두 피해 액자 앞에 도착했어요!';done();return}
      li++;startLv(`${li}번 통로를 통과했어요! 다음 통로로 갑니다.`)}};
  const paint=t=>{g.clearRect(0,0,W,Hh);
    /* 바닥: 점토 대리석 타일을 칸마다 돌려 깔아 반복 티를 줄임 (한 번 그려 두고 다시 씀) */
    if(SP.tile&&!floor){floor=document.createElement('canvas');floor.width=W;floor.height=Hh;const f=floor.getContext('2d');f.fillStyle='#8f8a82';f.fillRect(0,0,W,Hh);
      const rr=rng(7);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){f.save();f.translate(x*U+U/2,y*U+U/2);f.rotate(Math.floor(rr()*4)*Math.PI/2);f.drawImage(SP.tile,-U/2+1,-U/2+1,U-2,U-2);f.restore();
        f.fillStyle=`rgba(${rr()<.5?'255,250,240':'60,50,40'},${(rr()*.08).toFixed(3)})`;f.fillRect(x*U,y*U,U,U)}}
    if(floor)g.drawImage(floor,0,0,W,Hh);else{for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){g.fillStyle=(x+y)%2?'#d9d4cc':'#cdc7bd';g.fillRect(x*U+1,y*U+1,U-2,U-2)}}
    /* 액자(출구) */
    const locked=LV().key&&!hasKey;
    if(SP.frame){g.save();if(locked)g.filter='grayscale(.8) brightness(.7)';const fw=U*.8,fh=fw*SP.frame.height/SP.frame.width;g.drawImage(SP.frame,goal.x*U+(U-fw)/2,goal.y*U+(U-fh)/2,fw,fh);g.restore()}
    else{g.fillStyle=locked?'#7b6a3a':'#d4a93a';g.fillRect(goal.x*U+8,goal.y*U+6,U-16,U-12)}
    if(locked){g.fillStyle='rgba(20,10,10,.75)';g.beginPath();g.roundRect?g.roundRect(goal.x*U+10,goal.y*U+U/2-12,U-20,24,8):g.rect(goal.x*U+10,goal.y*U+U/2-12,U-20,24);g.fill();g.fillStyle='#fff';g.font='bold 15px sans-serif';g.textAlign='center';g.fillText('잠김',goal.x*U+U/2,goal.y*U+U/2+5)}
    /* 기둥: 받침대 위 도자기 */
    LV().walls.forEach(([x,y])=>{if(SP.pedestal){const s=U*.92;g.drawImage(SP.pedestal,x*U+(U-s)/2,y*U+(U-s)/2-2,s,s*SP.pedestal.height/SP.pedestal.width)}else{g.fillStyle='#5d4a3a';g.fillRect(x*U+6,y*U+6,U-12,U-12)}});
    /* 보안 카드 */
    if(LV().key&&!hasKey){const[x,y]=LV().key,bob=Math.sin(performance.now()/300)*3;if(SP.card){const s=U*.7;g.drawImage(SP.card,x*U+(U-s)/2,y*U+(U-s)/2+bob,s,s*SP.card.height/SP.card.width)}else{g.fillStyle='#f1c40f';g.fillRect(x*U+16,y*U+20,U-32,U-40)}}
    /* 레이저 */
    LV().lasers.forEach(z=>{const on=cells(z,t);
      if(soon(z,t)){const fake=cells(z,t+.45);g.strokeStyle='rgba(255,70,60,.45)';g.setLineDash([6,6]);g.lineWidth=3;line(fake);g.setLineDash([])}
      if(on.length){g.save();g.shadowColor='rgba(255,30,30,.9)';g.shadowBlur=16;g.strokeStyle='rgba(255,60,50,.45)';g.lineWidth=12;line(on);g.restore();g.strokeStyle='#ff2a2a';g.lineWidth=4;line(on);g.strokeStyle='rgba(255,230,220,.9)';g.lineWidth=1.4;line(on)}
      /* 발사기 (점토 소품) */
      const em=(cx,cy)=>{const s=22;if(SP.emitter)g.drawImage(SP.emitter,cx-s/2,cy-s/2,s,s);else{g.fillStyle='#111';g.fillRect(cx-6,cy-6,12,12)}};
      if(z.k==='row'){const a=z.c0??0,b=z.c1??8;em(a*U+12,z.r*U+U/2);em((b+1)*U-12,z.r*U+U/2)}else if(z.k==='col'){em(z.c*U+U/2,z.r0*U+12);em(z.c*U+U/2,(z.r1+1)*U-12)}});
    function line(cs){if(!cs.length)return;const xs=cs.map(c=>c[0]),ys=cs.map(c=>c[1]);g.beginPath();
      if(new Set(ys).size===1){g.moveTo(Math.min(...xs)*U+4,ys[0]*U+U/2);g.lineTo((Math.max(...xs)+1)*U-4,ys[0]*U+U/2)}else{g.moveTo(xs[0]*U+U/2,Math.min(...ys)*U+4);g.lineTo(xs[0]*U+U/2,(Math.max(...ys)+1)*U-4)}g.stroke()}
    /* 탐정 */
    const px=pl.x*U+U/2,py=pl.y*U+U/2;g.save();g.shadowColor='rgba(40,20,10,.45)';g.shadowBlur=8;g.shadowOffsetY=3;g.beginPath();g.arc(px,py,U*.38,0,7);g.fillStyle='#fff8ec';g.fill();g.restore();g.save();g.beginPath();g.arc(px,py,U*.38,0,7);g.fillStyle='#fff8ec';g.fill();g.clip();
    if(detIm){const s=detIm.width*.46;g.drawImage(detIm,(detIm.width-s)/2,detIm.height*.13,s,s,px-U*.38,py-U*.38,U*.76,U*.76)}else{g.fillStyle='#8a5a2b';g.fillRect(px-20,py-20,40,40)}
    g.restore();g.strokeStyle='#8a5a2b';g.lineWidth=5;g.beginPath();g.arc(px,py,U*.38,0,7);g.stroke();g.strokeStyle='#f3d9a6';g.lineWidth=1.5;g.beginPath();g.arc(px,py,U*.38-2,0,7);g.stroke();
    if(performance.now()-flash<400){g.fillStyle=`rgba(255,0,0,${.4*(1-(performance.now()-flash)/400)})`;g.fillRect(0,0,W,Hh)}};
  const loop=()=>{if(!document.body.contains(cv)||fin){if(fin)paint(now());return}const t=now();
    if(!fin&&hit(t)&&!(pl.x===4&&pl.y===6)){deaths++;upd();reset('삐익! 레이저에 닿았어요. 출발점에서 다시 시작합니다.')}
    paint(t);raf=requestAnimationFrame(loop)};
  /* 손가락: 방향 버튼은 누르는 순간 바로 움직이고, 꾹 누르고 있으면 계속 움직임 */
  el.querySelectorAll('.dpad .btn').forEach(b=>{let rep=0;const[dx,dy]=b.dataset.d.split(',').map(Number);
    const stop=()=>{clearInterval(rep);rep=0;b.classList.remove('down')};
    b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture&&b.setPointerCapture(e.pointerId);b.classList.add('down');move(dx,dy);clearInterval(rep);rep=setInterval(()=>{if(!document.body.contains(b))return stop();move(dx,dy)},230)};
    b.onpointerup=stop;b.onpointercancel=stop;b.onpointerleave=stop;b.onclick=e=>{if(e.detail===0)move(dx,dy)}});
  /* 그림 위: 밀면(스와이프) 그 방향으로, 톡 치면 친 쪽으로 한 칸 */
  let sw=null;
  cv.onpointerdown=e=>{e.preventDefault();sw={x:e.clientX,y:e.clientY}};
  cv.onpointerup=e=>{if(!sw)return;const mx=e.clientX-sw.x,my=e.clientY-sw.y;sw=null;
    if(Math.hypot(mx,my)>24){Math.abs(mx)>Math.abs(my)?move(Math.sign(mx),0):move(0,Math.sign(my));return}
    const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*CW,y=(e.clientY-b.top)/b.height*CH,dx=x-(pl.x+.5),dy=y-(pl.y+.5);if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return;Math.abs(dx)>Math.abs(dy)?move(Math.sign(dx),0):move(0,Math.sign(dy))};
  cv.onpointercancel=()=>sw=null;
  const onKey=e=>{if(!document.body.contains(cv)){document.removeEventListener('keydown',onKey);return}const m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(m&&!e.target.closest('input')){e.preventDefault();move(...m)}};
  document.addEventListener('keydown',onKey);
  startLv();loop();
  return{debug:()=>({pl,li,deaths,hasKey,t:now(),danger:(x,y,t)=>LV().lasers.some(z=>cells(z,t).some(c=>c[0]===x&&c[1]===y))}),solve(){if(fin)return;fin=true;cancelAnimationFrame(raf);done()},
    hint(){const cur=now();slow=.65;t0=performance.now()-cur/slow*1000;return '레이저 속도를 느리게 바꿨어요. 깜빡이는 레이저 바로 앞 칸에서 기다렸다가, 레이저가 꺼지는 순간 지나가세요. 움직이는 레이저는 반대쪽 끝으로 멀어질 때 건너면 안전해요.'}};
};
