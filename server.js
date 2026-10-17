// Chạy: node server.js  → mở http://<địa-chỉ-máy>:3000 (điện thoại cùng Wi-Fi dùng IP máy tính)
const http=require('http'),fs=require('fs'),cr=require('crypto'),path=require('path');
const DBF=path.join(__dirname,'data.json'),CAP=6,PORT=process.env.PORT||3000;
let D={u:{},s:{},m:[],q:null};try{D=JSON.parse(fs.readFileSync(DBF,'utf8'))}catch(e){}
D.adm=D.adm||{codes:[]};D.pid=D.pid||100000;const ADMK=process.env.ADMIN_KEY||'';
const admok=c=>!!c&&D.adm.codes.some(x=>x.h===c&&!x.rv&&(!x.exp||x.exp>Date.now()));
const PRICE={p0:80,pi:120,p1:80,p2:100,p3:200,p4:300,sin:150,cos:150,tan:300,cot:300,secx:400,cscx:400,asin:700,acos:700,atan:700,acot:700,exp:500,ln:550,inv:450,sqrt:450,abs:400,an:900,csc:900,csn:1000,fib:1000,lim:1400,sig:1100,fac:1000,cmb:1200,arr:1200,mul:900,add:900,sinh:600,cosh:600,flo:600,det:1500,D:800,I:1500,J:1800,V:1500,M:2000,C:1600,S:1700};
const CHP={g:120,l:150,b:180,s:400};
const MKP=50,MKR=+process.env.MK_RATE||1000,HOOK=process.env.WEBHOOK_KEY||'',B={bin:process.env.BANK_BIN||'970422',acc:process.env.BANK_ACC||'',name:process.env.BANK_NAME||''};
D.o=D.o||{};D.tx=D.tx||{};
const qrUrl=(c,o)=>`https://img.vietqr.io/image/${B.bin}-${B.acc}-compact2.png?amount=${o.amt}&addInfo=${c}&accountName=${encodeURIComponent(B.name)}`;
const ordOf=U=>{const e=Object.entries(D.o).filter(([c,x])=>x.u==U.id&&x.st=='wait'&&Date.now()-x.ts<36e5).pop();return e?{code:e[0],amt:e[1].amt,qr:qrUrl(e[0],e[1])}:null};
let dirty=0;const save=()=>{try{fs.writeFileSync(DBF,JSON.stringify(D))}catch(e){}dirty=1};
// ===== Sao lưu dữ liệu vào kho GitHub RIÊNG TƯ (thư mục server/) =====
const GH={t:process.env.GH_TOKEN||'',r:process.env.GH_REPO||'',p:process.env.GH_PATH||'server/data.json',b:process.env.GH_BRANCH||'main',a:process.env.GH_API||'https://api.github.com'};
const ghOn=!!(GH.t&&GH.r);let ghSha='',pushing=0,ghOK=!ghOn;
const ghU=()=>`${GH.a}/repos/${GH.r}/contents/${GH.p.split('/').map(encodeURIComponent).join('/')}`;
const ghH=a=>({Authorization:'Bearer '+GH.t,Accept:a||'application/vnd.github+json','User-Agent':'dai-chien-server'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ghRestore(){if(!ghOn){console.log('Chưa đặt GH_TOKEN/GH_REPO: dữ liệu chỉ lưu tạm trên máy chủ');return true}
 try{const m=await fetch(ghU()+'?ref='+GH.b,{headers:ghH()});if(m.status==404){console.log('Kho chưa có file dữ liệu, sẽ tạo mới');return true}if(!m.ok)throw new Error('HTTP '+m.status);ghSha=(await m.json()).sha;
  const r=await fetch(ghU()+'?ref='+GH.b,{headers:ghH('application/vnd.github.raw+json')});if(!r.ok)throw new Error('HTTP '+r.status);D=JSON.parse(await r.text());
  D.u=D.u||{};D.s=D.s||{};D.m=D.m||[];D.adm=D.adm||{codes:[]};D.pid=D.pid||100000;D.o=D.o||{};D.tx=D.tx||{};try{fs.writeFileSync(DBF,JSON.stringify(D))}catch(e){}
  console.log('Đã khôi phục dữ liệu từ GitHub');return true}catch(e){console.log('Không khôi phục được dữ liệu:',e.message);return false}}
async function ghStart(){for(let i=0;i<4;i++){if(await ghRestore())break;if(i==3){console.log('Dừng: không đọc được kho dữ liệu (tránh ghi đè dữ liệu cũ)');process.exit(1)}await sleep(2000)}ghOK=true}
async function ghPush(force){if(!ghOn||!ghOK||pushing||(!dirty&&!force))return;pushing=1;dirty=0;
 try{for(let i=0;i<2;i++){const r=await fetch(ghU(),{method:'PUT',headers:ghH(),body:JSON.stringify({message:'data '+new Date().toISOString(),content:Buffer.from(JSON.stringify(D)).toString('base64'),branch:GH.b,...(ghSha?{sha:ghSha}:{})})});
   if(r.ok){ghSha=(await r.json()).content.sha;return}
   if(r.status==409||r.status==422){const m=await fetch(ghU()+'?ref='+GH.b,{headers:ghH()});ghSha=m.ok?(await m.json()).sha:'';continue}
   throw new Error('HTTP '+r.status)}}catch(e){dirty=1;console.log('Lưu lên GitHub lỗi:',e.message)}finally{pushing=0}}
const bye=async()=>{const t=Date.now();while(pushing&&Date.now()-t<8000)await sleep(200);await Promise.race([ghPush(1),sleep(8000)]);process.exit(0)};
process.on('SIGTERM',bye);process.on('SIGINT',bye);setInterval(()=>ghPush(),30000);
const hash=(p,s)=>cr.scryptSync(p,s,32).toString('hex');
const pidOf=u=>{if(!u.pid)u.pid=++D.pid;return u.pid};
const pub=id=>{const u=D.u[id];return u?{u:id,n:u.n,av:u.av||'',pid:pidOf(u)}:null};
const own=u=>({u:u.id,pid:pidOf(u),n:u.n,av:u.av,un:u.un,st:u.st,adm:u.adm,xp:u.xp||0,lv:1+Math.floor((u.xp||0)/100),rp:u.rp||0,mp:u.mp||0,mk:u.mk||0,init:u.init===undefined?(u.un.length?1:0):u.init,ch:u.ch||[],sq:u.sq||[]});
const view=(m,id)=>{const A=m.a==id,my=A?m.pa:m.pb,th=A?m.pb:m.pa;return{id:m.id,st:m.st,A,opp:m.bot?{u:'bot',n:m.bot.n,av:'',pid:0,lv:m.bot.lv,bot:1}:pub(A?m.b:m.a),ab:m.ab||0,mine:my,sent:!!my,theirs:m.st=='pick'?null:th,seed:m.seed,w:m.w,mode:m.mode}};
const last=id=>[...D.m].reverse().find(m=>m.a==id||m.b==id);
const stale=m=>m.st!='done'&&Date.now()-(m.ts||0)>(m.st=='pick'?18e4:6e5); // trận bỏ dở quá lâu thì coi như đã kết thúc
const busy=id=>{const m=last(id);return m&&m.st!='done'&&!stale(m)};
// ===== Ghép trận: ưu tiên người chơi, không có thì ghép bot cùng cấp =====
const BOT_WAIT=+process.env.BOT_WAIT||0,lvOf=u=>1+Math.floor((u.xp||0)/100),Q=()=>D.qq=D.qq||[];
const BN=['Số Pi','Hàm Sin','Đạo Hàm','Tích Phân','Ma Trận','Cấp Số','Giai Thừa','Vô Cực','Căn Bậc Hai','Parabol'];
const rpOk=(a,b)=>Math.abs(a-b)<=0.2*Math.max(a,b); // xếp hạng: lệch tối đa 20%
// ký hiệu "có được" ở cấp lv: giá ≤ 120+140·(lv-1); số quân tăng dần theo cấp
const botSquad=lv=>{const cap=120+140*(lv-1),pool=Object.keys(PRICE).filter(k=>PRICE[k]<=cap),n=Math.min(CAP,3+Math.floor(lv/3)),r={};for(let i=0;i<n;i++){const k=pool[Math.floor(Math.random()*pool.length)];r[k]=(r[k]||0)+1}return r};
function botFill(id){const w=Q().find(x=>x.id==id),U=D.u[id];if(!w||!U)return;if(Date.now()-w.ts<(BOT_WAIT||(w.mode=='rank'?12000:8000)))return;
 D.qq=Q().filter(x=>x!==w);if(busy(id))return;const lv=lvOf(U),m=newM(id,'bot',w.mode);m.bot={n:'🤖 Bot '+BN[Math.floor(Math.random()*BN.length)],lv};m.pb=botSquad(lv);save()}
const newM=(a,b,md)=>{const m={ts:Date.now(),mode:md||'normal',id:Date.now()+Math.floor(Math.random()*1e3),a,b,pa:null,pb:null,st:'pick',seed:Math.floor(Math.random()*2147483647),w:null};D.m.push(m);D.m=D.m.slice(-200);return m};
function api(b){
 const id=D.s[b.t],U=id&&D.u[id];
 if(b.a=='reg'||b.a=='login'){
  const u=String(b.u||'').toLowerCase(),p=String(b.p||'');
  if(!/^[a-z0-9_]{3,20}$/.test(u))return{err:'Tên đăng nhập 3–20 ký tự: a-z, 0-9, _'};
  if(b.a=='reg'){if(D.u[u])return{err:'Tên đăng nhập đã có người dùng'};if(p.length<4)return{err:'Mật khẩu tối thiểu 4 ký tự'};
   const s=cr.randomBytes(8).toString('hex');D.u[u]={id:u,s,h:hash(p,s),n:'Người chơi '+(100+Math.floor(Math.random()*900)),av:'',un:[],init:0,xp:0,rp:0,pid:++D.pid,st:0,adm:'',fr:[],rq:[]}}
  else{const x=D.u[u];if(!x||x.h!==hash(p,x.s))return{err:'Sai tên đăng nhập hoặc mật khẩu'}}
  const t=cr.randomBytes(16).toString('hex');D.s[t]=u;save();return{t}}
 if(b.a=='admget'||b.a=='admset'){
  if(!ADMK||b.k!==ADMK)return{err:'Sai khoá quản trị, hoặc server chưa đặt biến ADMIN_KEY'};
  if(b.a=='admset'){for(const c of b.codes||[]){if(!/^[0-9a-f]{64}$/.test(c.h||''))continue;const x=D.adm.codes.find(y=>y.h==c.h);
   if(!x)D.adm.codes.push({h:c.h,n:String(c.n||'').slice(0,40),by:String(c.by||'').slice(0,60),exp:+c.exp||0,rv:c.rv?1:0});else if(c.rv)x.rv=1}save()}
  return{codes:D.adm.codes}}
 if(!U)return{bad:1,err:'Hãy đăng nhập'};
 U.seen=Date.now();
 switch(b.a){
  case'me':{botFill(id);let m=last(id);if(m&&stale(m)){m.st='done';m.w=-1;m.ab=1;save()}const w=Q().find(x=>x.id==id);return{me:{...own(U),admok:admok(U.adm),ord:ordOf(U)},fr:U.fr.map(pub),rq:U.rq.map(pub),cap:CAP,m:m?view(m,id):null,qs:w?{mode:w.mode,e:Date.now()-w.ts}:null}}
  case'shop':return{p:PRICE,r:MKP,rate:MKR}
  case'top':{ // bảng xếp hạng: top 30 theo điểm xếp hạng + top 30 theo cấp (client tự sắp lại)
   const all=Object.values(D.u).filter(x=>(x.un&&x.un.length)||x.xp||x.rp).map(x=>({pid:pidOf(x),n:x.n,av:(x.av||'').length>20000?'':(x.av||''),xp:x.xp||0,lv:1+Math.floor((x.xp||0)/100),rp:x.rp||0}));
   const byR=[...all].sort((p,q)=>q.rp-p.rp||q.xp-p.xp),byL=[...all].sort((p,q)=>q.xp-p.xp||q.rp-p.rp),mp=pidOf(U);
   const seen=new Set(byR.slice(0,30).map(x=>x.pid)),top=byR.slice(0,30).concat(byL.slice(0,30).filter(x=>!seen.has(x.pid)));
   return{top,rk:{rp:byR.findIndex(x=>x.pid==mp)+1,lv:byL.findIndex(x=>x.pid==mp)+1,n:all.length}}}
  case'buy':{const p=PRICE[b.k];if(p==null)return{err:'Vật phẩm không tồn tại'};if(U.un.includes(b.k))return{err:'Bạn đã sở hữu ký hiệu này'};const cur=b.cur=='mk'?'mk':'mp',cost=cur=='mk'?Math.ceil(p/MKP):p;if((U[cur]||0)<cost)return{err:'Không đủ '+cur.toUpperCase()};U[cur]-=cost;U.un.push(b.k);save();return{ok:1}}
  case'clear':{const i=b.i;if(!Number.isInteger(i)||i<0||i>=40||i>(U.st||0))return{err:'Màn chưa mở'};const c=Math.floor(i/10),j=i%10,first=i==(U.st||0),base=Math.round([10,10,15,20,35,40,45,50,90,120][j]*(1+c*.5)),mp=first?base:Math.max(1,Math.floor(base*.2)),xp=first?20+j*5:5;U.mp=(U.mp||0)+mp;U.xp=(U.xp||0)+xp;if(first)U.st=i+1;save();return{mp,xp}}
  case'cbuy':{const p=CHP[b.k];if(p==null)return{err:'Nhân vật không tồn tại'};U.ch=U.ch||[];if(U.ch.includes(b.k))return{err:'Bạn đã có nhân vật này'};if((U.mp||0)<p)return{err:'Không đủ MP'};U.mp-=p;U.ch.push(b.k);save();return{ok:1}}
  case'sqset':{const l=b.l;if(!Array.isArray(l)||l.length>10)return{err:'Tối đa 10 đội hình'};const o=[];for(const q of l){const r=q&&q.r,n=String(q&&q.n||'').trim().slice(0,20);if(!n||!r||typeof r!='object')return{err:'Đội hình không hợp lệ'};let t=0;for(const k in r){if(!/^[\w:.@-]{1,30}$/.test(k)||!Number.isInteger(r[k])||r[k]<1)return{err:'Đội hình không hợp lệ'};t+=r[k]}if(t<1||t>CAP)return{err:'Tổng số quân phải từ 1 đến '+CAP};o.push({n,r})}U.sq=o;save();return{ok:1}}
  case'topup':{const a=b.amount;if(!B.acc)return{err:'Máy chủ chưa cấu hình tài khoản nhận tiền'};if(!Number.isInteger(a)||a%1000||a<10000||a>5000000)return{err:'Số tiền từ 10.000đ đến 5.000.000đ, chẵn nghìn'};
   for(const x of Object.values(D.o))if(x.u==id&&x.st=='wait')x.st='old';const code='MK'+cr.randomBytes(4).toString('hex').toUpperCase();D.o[code]={u:id,amt:a,st:'wait',ts:Date.now()};save();return{ok:1}}
  case'starter':{if(own(U).init)return{err:'Bạn đã nhận ký hiệu khởi đầu'};if(!['p1','p2','sin','cos'].includes(b.f)||!['p0','pi'].includes(b.c))return{err:'Lựa chọn không hợp lệ'};U.un=[b.f,b.c];U.init=1;save();return{ok:1}}
  case'name':{const n=String(b.n||'').trim();if(n.length<2||n.length>20)return{err:'Tên hiển thị 2–20 ký tự'};if(n.toLowerCase()==id)return{err:'Tên hiển thị phải khác tên đăng nhập'};U.n=n;save();return{ok:1}}
  case'av':{if(!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(b.d||'')||b.d.length>60000)return{err:'Ảnh không hợp lệ'};U.av=b.d;save();return{ok:1}}
  case'prog':{if(typeof b.adm=='string')U.adm=b.adm.slice(0,64);save();return{ok:1}}
  case'fadd':{const q_=String(b.u||'').trim().toLowerCase(),t=/^\d+$/.test(q_)?Object.keys(D.u).find(k=>pidOf(D.u[k])==+q_):q_,T=D.u[t];if(!T||t==id)return{err:'Không tìm thấy người chơi này'};if(U.fr.includes(t))return{err:'Đã là bạn bè'};
   if(U.rq.includes(t)){U.rq=U.rq.filter(x=>x!=t);U.fr.push(t);T.fr.push(id)}else if(!T.rq.includes(id))T.rq.push(id);save();return{ok:'Đã gửi lời mời'}}
  case'facc':{if(U.rq.includes(b.u)&&D.u[b.u]){U.rq=U.rq.filter(x=>x!=b.u);U.fr.push(b.u);D.u[b.u].fr.push(id);save()}return{ok:1}}
  case'chal':{if(!U.fr.includes(b.to))return{err:'Chỉ thách đấu bạn bè'};if(busy(id)||busy(b.to))return{err:'Một trong hai người đang có trận'};newM(id,b.to);save();return{ok:1}}
  case'queue':{const md=b.mode=='rank'?'rank':'normal';if(md=='rank'&&own(U).lv<7)return{err:'Cần đạt Lv 7 để chơi xếp hạng'};if(busy(id))return{err:'Bạn đang có trận'};
   const now=Date.now();D.qq=Q().filter(x=>D.u[x.id]&&now-D.u[x.id].seen<15000&&!busy(x.id));
   if(D.qq.some(x=>x.id==id&&x.mode==md))return{ok:1};D.qq=D.qq.filter(x=>x.id!=id);
   const cand=D.qq.find(x=>x.mode==md&&(md!='rank'||rpOk(U.rp||0,D.u[x.id].rp||0)));
   if(cand){D.qq=D.qq.filter(x=>x!==cand);newM(cand.id,id,md)}else D.qq.push({id,mode:md,ts:now});save();return{ok:1}}
  case'cq':{D.qq=Q().filter(x=>x.id!=id);D.m.forEach(m=>{if(m.st=='pick'&&(m.a==id||m.b==id)){m.st='done';m.w=-1;m.ab=1}});save();return{ok:1}}
  case'pick':{const m=D.m.find(x=>x.id==b.id&&(x.a==id||x.b==id));if(!m||m.st!='pick')return{err:'Trận không còn nhận đội hình'};const ro=b.ro||{};let n=0;
   for(const k in ro){if(!/^[\w:.@-]{1,30}$/.test(k)||!Number.isInteger(ro[k])||ro[k]<1)return{err:'Đội hình không hợp lệ'};n+=ro[k]}
   if(n<1||n>CAP)return{err:'Tổng số quân phải từ 1 đến '+CAP};
   if(m.a==id)m.pa=ro;else m.pb=ro;if(m.pa&&m.pb){m.st='ready';m.ts=Date.now()}save();return{ok:1}}
  case'res':{const m=D.m.find(x=>x.id==b.id&&(x.a==id||x.b==id));if(m&&m.st=='ready'){m.w=[0,1].includes(b.w)?b.w:-1;m.st='done';[[m.a,0],[m.b,1]].forEach(([p,i])=>{const P=D.u[p];if(!P)return;const win=m.w==i,dr=m.w==-1;P.xp=(P.xp||0)+(dr?15:win?(m.mode=='rank'?40:30):10);if(m.mode=='rank')P.rp=Math.max(0,(P.rp||0)+(dr?0:win?25:-15))});save()}return{ok:1}}
 }
 return{err:'?'}}
ghStart().then(()=>http.createServer((q,r)=>{
 r.setHeader('Access-Control-Allow-Origin','*');r.setHeader('Access-Control-Allow-Headers','Content-Type');if(q.method=='OPTIONS'){r.statusCode=204;r.end();return}
 if(q.method=='POST'&&q.url=='/hook'){let d='';q.on('data',c=>{d+=c;if(d.length>1e5)q.destroy()});q.on('end',()=>{r.setHeader('Content-Type','application/json');
  if(!HOOK||q.headers.authorization!=='Apikey '+HOOK){r.statusCode=401;r.end('{"success":false}');return}
  try{const j=JSON.parse(d),amt=+(j.transferAmount||j.amount||0),txt=String(j.content||j.description||'').toUpperCase(),m=txt.match(/MK[0-9A-F]{8}/),o=m&&D.o[m[0]],tid=String(j.id||j.referenceCode||m&&m[0]||'');
   if((j.transferType||'in')=='in'&&o&&o.st=='wait'&&amt>=o.amt&&!D.tx[tid]&&D.u[o.u]){D.u[o.u].mk=(D.u[o.u].mk||0)+Math.floor(amt/MKR);o.st='done';D.tx[tid]=1;save()}}catch(e){}
  r.end('{"success":true}')});return}
 if(q.method=='POST'&&q.url=='/api'){let d='';q.on('data',c=>{d+=c;if(d.length>2e5)q.destroy()});
  q.on('end',()=>{let o;try{o=api(JSON.parse(d))}catch(e){o={err:'Lỗi máy chủ'}}r.setHeader('Content-Type','application/json');r.end(JSON.stringify(o))});return}
 const fl=fs.readdirSync(__dirname).filter(n=>/\.html?$/i.test(n)&&!/quan.?tri/i.test(n)),pg=fl.find(n=>/dai.?chien/i.test(n))||fl[0];
 fs.readFile(path.join(__dirname,pg||'x'),(e,x)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(x||'Không thấy file game .html cạnh server.js. Các file đang có: '+fs.readdirSync(__dirname).join(', '))})
}).listen(PORT,'0.0.0.0',()=>console.log('Mở http://localhost:'+PORT)));
