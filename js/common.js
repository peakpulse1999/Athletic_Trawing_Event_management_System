const PROV={"Western":["#c8102e","#ffd100"],"Central":["#6a1b9a","#ffc107"],"Southern":["#0277bd","#ffffff"],"Northern":["#e65100","#ffffff"],"Eastern":["#2e7d32","#ffffff"],"North Western":["#00838f","#ffd100"],"North Central":["#6d4c41","#ffd100"],"Uva":["#ad1457","#ffffff"],"Sabaragamuwa":["#1b5e20","#ffd100"]};
const PN=Object.keys(PROV);
const S={athletes:{},events:{},results:{},flags:{},meta:{}};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let _ready=false;
// ---- Firebase Realtime Database layer (replaces the old Node server) ----
const _cfg=Object.assign({},FIREBASE_CONFIG);if(!_cfg.databaseURL)delete _cfg.databaseURL;
firebase.initializeApp(_cfg);
const DB=firebase.database(),ROOT=DB.ref('meet'),COLS=['athletes','events','results','flags','meta'];
// server clock (identical on every phone + scoreboard, used by the 90 s countdown)
let _off=0;DB.ref('.info/serverTimeOffset').on('value',s=>{_off=s.val()||0});
const srvNow=()=>Date.now()+_off;
// every record is stored as a JSON string (keeps arrays with gaps / nulls exactly as they are)
const _dec=v=>{const o={};for(const k in v){try{o[k]=JSON.parse(v[k])}catch(e){}}return o};
const _needLogin=()=>typeof REQUIRE_LOGIN!=='undefined'&&REQUIRE_LOGIN&&/\/(admin|timing)(\.html)?\/?$/.test(location.pathname);
function _loginBox(go){
 const box=document.createElement('div');box.id='lg';
 box.style.cssText='position:fixed;inset:0;background:#0b1220;z-index:99999;display:none;align-items:center;justify-content:center;font-family:system-ui,Arial,sans-serif;padding:16px';
 box.innerHTML='<div style="background:#fff;color:#111;border-radius:14px;padding:22px;width:100%;max-width:340px;box-shadow:0 10px 40px #0008"><h2 style="margin:0 0 4px">Officials login</h2><p style="margin:0 0 12px;color:#555;font-size:14px">Enter the email and password given by the meet admin.</p><input id="lge" type="email" placeholder="Email" autocomplete="username" style="width:100%;box-sizing:border-box;padding:11px;margin-bottom:8px;font-size:16px;border:1px solid #bbb;border-radius:8px"><input id="lgp" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:11px;margin-bottom:8px;font-size:16px;border:1px solid #bbb;border-radius:8px"><button id="lgb" style="width:100%;padding:12px;font-size:16px;border:0;border-radius:8px;background:#0b5ed7;color:#fff;font-weight:700">Login</button><p id="lgm" style="color:#c00;font-size:14px;min-height:18px;margin:8px 0 0"></p></div>';
 document.body.appendChild(box);
 const a=firebase.auth();let started=false;
 const doLogin=()=>{$('#lgm').textContent='';a.signInWithEmailAndPassword($('#lge').value.trim(),$('#lgp').value).catch(e=>{$('#lgm').textContent=(e.code==='auth/network-request-failed')?'No internet connection':'Wrong email or password'})};
 $('#lgb').onclick=doLogin;$('#lgp').onkeydown=e=>{if(e.key==='Enter')doLogin()};
 a.onAuthStateChanged(u=>{if(u){box.style.display='none';if(!started){started=true;go()}}else box.style.display='flex'})}
function connect(cb){
 const go=()=>{
  DB.ref('.info/connected').on('value',s=>document.body.classList.toggle('off',!s.val()));
  ROOT.on('value',snap=>{const v=snap.val()||{};COLS.forEach(c=>{S[c]=_dec(v[c]||{})});_ready=true;cb()},e=>{document.body.classList.add('off');console.error(e)})};
 if(_needLogin())_loginBox(go);else go()}
async function patch(ops){
 let upd={};
 try{for(const o of ops){
   if(o.reset){if(Object.keys(upd).length){await ROOT.update(upd);upd={}}await ROOT.update(o.reset==='full'?{athletes:null,events:null,results:null,flags:null,meta:null}:{athletes:null,events:null,results:null,'meta/slots':null,'meta/call':null});continue}
   upd[o.c+'/'+o.id]=(o.d===null||o.d===undefined)?null:JSON.stringify(o.d)}
  if(Object.keys(upd).length)await ROOT.update(upd)}
 catch(e){if(String(e&&e.code||e).toUpperCase().includes('PERMISSION'))alert('Saving is blocked. Please log in (Control room / Mobile entry page) and check the database rules.');throw e}}
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const meetName=()=>(S.meta.main&&S.meta.main.name)||'Athletics Championships';
function normProv(p){p=String(p||'').trim().toLowerCase().replace(/\s*province$/,'');return PN.find(x=>x.toLowerCase()===p)||(p&&PN.find(x=>x.toLowerCase().startsWith(p)))||''}
function parseT(s){s=String(s).trim().replace(',',':');if(!s)return null;let m=s.match(/^(\d+):(\d+(?:\.\d+)?)$/);if(m)return +m[1]*60+ +m[2];return/^\d+(\.\d+)?$/.test(s)?+s:NaN}
const isNum=v=>typeof v==='number';
const evKind=ev=>(S.events[ev]&&S.events[ev].kind)||'track';
const better=(a,b,ev)=>evKind(ev)==='field'?a>b:a<b;
function bestOf(ev,att){const n=att.filter(isNum);return n.length?(evKind(ev)==='field'?Math.max(...n):Math.min(...n)):null}
function cmpRes(ev){const f=evKind(ev)==='field',s=f?-1:1;return(a,b)=>{if(a.t==null||b.t==null)return a.t==null?(b.t==null?0:1):-1;if(a.t!==b.t)return s*(a.t-b.t);if(!f)return 0;
 const A=getAtt(a).filter(isNum).sort((p,q)=>q-p),B=getAtt(b).filter(isNum).sort((p,q)=>q-p);for(let i=1;i<Math.max(A.length,B.length);i++){if(A[i]==null||B[i]==null)return A[i]==null?(B[i]==null?0:1):-1;if(A[i]!==B[i])return B[i]-A[i]}return 0}}
document.head.insertAdjacentHTML('beforeend','<style>.rc{display:inline-block;width:.5em;height:.72em;background:#e11d1d;border-radius:.09em;vertical-align:-.1em;box-shadow:0 0 0 .05em #fff6,0 .04em .12em #0006;transform:rotate(-8deg);-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>');
function fmtT(t){if(t==null)return'--.--';if(t<60)return t.toFixed(2);const m=Math.floor(t/60);return m+':'+(t-m*60).toFixed(2).padStart(5,'0')}
function res(ev,st){const c=cmpRes(ev);return Object.entries(S.results).filter(([k,r])=>r.ev===ev&&r.st===st).map(([k,r])=>({k,...r})).sort((a,b)=>c(a,b)||a.ts-b.ts)}
// value formatting: number -> time (track) or metres (field); 'X' = foul (red card); '-' = pass / attempt not used
const fmtV=(v,ev)=>v==null?'--.--':v==='X'?'X':v==='-'?'-':evKind(ev)==='field'?v.toFixed(2):fmtT(v);
const attHTML=(v,ev,pend='--')=>v==null?pend:v==='X'?'<i class="rc" title="Foul"></i>':v==='-'?'-':esc(fmtV(v,ev));
function flag(p,cls=''){const f=S.flags[p];if(f)return`<img class="flag ${cls}" src="${f}" alt="">`;const c=PROV[p]||['#556','#fff'];
 return`<svg class="flag ${cls}" viewBox="0 0 60 40"><rect width="60" height="40" fill="${c[0]}"/><rect y="26" width="60" height="14" fill="${c[1]}"/><text x="30" y="22" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="Arial">${(p||'?').split(' ').map(w=>w[0]).join('').toUpperCase()}</text></svg>`}
const ath=id=>S.athletes[id]||{name:'Unknown',prov:''};
const evList=()=>Object.entries(S.events).sort((a,b)=>a[1].created-b[1].created);
const evLabel=e=>`${e.name}${e.dist?' '+e.dist:''}`;
function latestEvent(){return Object.keys(S.events).sort((a,b)=>S.events[b].upd-S.events[a].upd)[0]}
const evAtt=ev=>(S.events[ev]&&S.events[ev].att)||3;
const getAtt=r=>r.att||(r.t!=null?[r.t]:[]);
const bibTag=a=>a&&a.bib?`<span class="bib">${esc(a.bib)}</span>`:'';
async function setAttempt(key,i,v){const r=S.results[key],a=[...getAtt(r)];while(a.length<=i)a.push(null);a[i]=v;const t=bestOf(r.ev,a);
 const ops=[{c:'results',id:key,d:{...r,att:a,t,ts:Date.now()}},{c:'events',id:r.ev,d:{...S.events[r.ev],upd:Date.now()}}];
 const c=S.meta&&S.meta.call;if(v!=null&&c&&c.k===key&&c.i===i)ops.push({c:'meta',id:'call',d:null}); // mark entered -> call finished
 await patch(ops)}
async function enter(ev,a){const e=S.events[ev],k=`${ev}_${e.stage}_${a}`;if(S.results[k])return;await patch([{c:'results',id:k,d:{ev,st:e.stage,ath:a,att:[],t:null,ts:Date.now()}}])}
async function makeFinal(ev){const rows=res(ev,'r1').filter(r=>r.t!=null).slice(0,8);if(rows.length<2){alert('Enter Round 1 times first');return}
 if(!confirm(`Top ${rows.length} athletes move to the Final. Continue?`))return;
 await patch([{c:'events',id:ev,d:{...S.events[ev],stage:'final',upd:Date.now()}},...rows.map(r=>({c:'results',id:`${ev}_final_${r.ath}`,d:{ev,st:'final',ath:r.ath,att:[],t:null,ts:Date.now()}}))])}
function tally(){const T={};PN.forEach(p=>T[p]={g:0,s:0,b:0});Object.keys(S.events).forEach(ev=>{if(S.events[ev].stage!=='final')return;res(ev,'final').filter(r=>r.t!=null).slice(0,3).forEach((r,i)=>{const p=ath(r.ath).prov;if(T[p])T[p]['gsb'[i]]++})});return Object.entries(T).sort((a,b)=>b[1].g-a[1].g||b[1].s-a[1].s||b[1].b-a[1].b)}
// ---- NEXT UP + CALL COUNTDOWN ----
const CALL_SECS=90;            // time allowed after an athlete is called
const CALL_KINDS=['field'];    // events where the CALL button / countdown is available
const STALE_CALL=900;          // a call older than (CALL_SECS + this many seconds) is ignored
const fmtClock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const byBib=(a,b)=>(+ath(a.ath).bib||9999)-(+ath(b.ath).bib||9999)||ath(a.ath).name.localeCompare(ath(b.ath).name);
// competition order: everybody's attempt 1 (by bib), then everybody's attempt 2, ...
function slotList(ev,st){const n=evAtt(ev),rows=Object.entries(S.results).filter(([k,r])=>r.ev===ev&&r.st===st).map(([k,r])=>({k,...r})).sort(byBib),out=[];
 for(let i=0;i<n;i++)rows.forEach(r=>out.push({k:r.k,i,ath:r.ath}));return out}
const slotDone=s=>{const r=S.results[s.k];return !!r&&getAtt(r)[s.i]!=null};
const nextSlot=(ev,st)=>slotList(ev,st).find(s=>!slotDone(s))||null;
const ownSlot=k=>{const r=S.results[k];if(!r)return null;const n=evAtt(r.ev);for(let i=0;i<n;i++)if(getAtt(r)[i]==null)return{k,i,ath:r.ath};return null};
function activeCall(){const c=S.meta&&S.meta.call;if(!c||!S.results[c.k])return null;if(slotDone(c))return null;if((srvNow()-c.start)/1000>(c.dur||CALL_SECS)+STALE_CALL)return null;return c}
const callFor=(ev)=>{const c=activeCall(),e=S.events[ev];return c&&e&&c.ev===ev&&c.st===e.stage?c:null};
const callLeft=c=>{const d=c.dur||CALL_SECS;return Math.max(0,Math.min(d,d-(srvNow()-c.start)/1000))};
const callState=c=>{const L=callLeft(c);return L<=0?'over':L<=10?'crit':L<=30?'warn':''};
const canCall=ev=>CALL_KINDS.includes(evKind(ev));
async function callSlot(s){const r=S.results[s.k];if(!r)return;
 await patch([{c:'meta',id:'call',d:{k:s.k,i:s.i,ev:r.ev,st:r.st,ath:r.ath,start:srvNow(),dur:CALL_SECS}},{c:'events',id:r.ev,d:{...S.events[r.ev],upd:Date.now()}}])}
const stopCall=()=>patch([{c:'meta',id:'call',d:null}]);

// ---- Copyright footer (every page) ----
(function(){const yr=new Date().getFullYear();
 document.querySelectorAll('.yr').forEach(e=>e.textContent=yr);
 if(document.querySelector('.foot'))return; // scoreboards carry the notice in their own footer
 const f=document.createElement('footer');f.className='pp-foot';
 f.style.cssText="text-align:center;padding:14px 12px;font:13px system-ui,Arial,sans-serif;color:inherit;opacity:.65;border-top:1px solid rgba(128,128,128,.35);margin-top:16px";
 f.innerHTML='&copy; '+yr+' PEAK PLUSE. All rights reserved.';
 document.body.appendChild(f)})();
