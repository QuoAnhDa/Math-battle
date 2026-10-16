// Chạy: node server.js  → mở http://<địa-chỉ-máy>:3000 (điện thoại cùng Wi-Fi dùng IP máy tính)
const http=require('http'),fs=require('fs'),cr=require('crypto'),path=require('path');
const DBF=path.join(__dirname,'data.json'),CAP=6,PORT=process.env.PORT||3000;
let D={u:{},s:{},m:[],q:null};try{D=JSON.parse(fs.readFileSync(DBF,'utf8'))}catch(e){}
const save=()=>fs.writeFileSync(DBF,JSON.stringify(D));
const hash=(p,s)=>cr.scryptSync(p,s,32).toString('hex');
const pub=id=>{const u=D.u[id];return u?{u:id,n:u.n,av:u.av||''}:null};
const own=u=>({u:u.id,n:u.n,av:u.av,un:u.un,st:u.st,adm:u.adm});
const view=(m,id)=>{const A=m.a==id,my=A?m.pa:m.pb,th=A?m.pb:m.pa;return{id:m.id,st:m.st,A,opp:pub(A?m.b:m.a),mine:my,sent:!!my,theirs:m.st=='pick'?null:th,seed:m.seed,w:m.w}};
const last=id=>[...D.m].reverse().find(m=>m.a==id||m.b==id);
const busy=id=>{const m=last(id);return m&&m.st!='done'};
const newM=(a,b)=>{const m={id:Date.now()+Math.floor(Math.random()*1e3),a,b,pa:null,pb:null,st:'pick',seed:Math.floor(Math.random()*2147483647),w:null};D.m.push(m);D.m=D.m.slice(-200);return m};
function api(b){
 const id=D.s[b.t],U=id&&D.u[id];
 if(b.a=='reg'||b.a=='login'){
  const u=String(b.u||'').toLowerCase(),p=String(b.p||'');
  if(!/^[a-z0-9_]{3,20}$/.test(u))return{err:'Tên đăng nhập 3–20 ký tự: a-z, 0-9, _'};
  if(b.a=='reg'){if(D.u[u])return{err:'Tên đăng nhập đã có người dùng'};if(p.length<4)return{err:'Mật khẩu tối thiểu 4 ký tự'};
   const s=cr.randomBytes(8).toString('hex');D.u[u]={id:u,s,h:hash(p,s),n:'Người chơi '+(100+Math.floor(Math.random()*900)),av:'',un:['D','p1','p2','sin','cos'],st:0,adm:'',fr:[],rq:[]}}
  else{const x=D.u[u];if(!x||x.h!==hash(p,x.s))return{err:'Sai tên đăng nhập hoặc mật khẩu'}}
  const t=cr.randomBytes(16).toString('hex');D.s[t]=u;save();return{t}}
 if(!U)return{bad:1,err:'Hãy đăng nhập'};
 U.seen=Date.now();
 switch(b.a){
  case'me':{const m=last(id);return{me:own(U),fr:U.fr.map(pub),rq:U.rq.map(pub),cap:CAP,m:m?view(m,id):null}}
  case'name':{const n=String(b.n||'').trim();if(n.length<2||n.length>20)return{err:'Tên hiển thị 2–20 ký tự'};if(n.toLowerCase()==id)return{err:'Tên hiển thị phải khác tên đăng nhập'};U.n=n;save();return{ok:1}}
  case'av':{if(!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(b.d||'')||b.d.length>60000)return{err:'Ảnh không hợp lệ'};U.av=b.d;save();return{ok:1}}
  case'prog':{if(Array.isArray(b.un))U.un=[...new Set(b.un.filter(k=>/^[\w:.@-]{1,30}$/.test(k)))].slice(0,300);if(Number.isInteger(b.st))U.st=Math.max(0,Math.min(99,b.st));if(typeof b.adm=='string')U.adm=b.adm.slice(0,64);save();return{ok:1}}
  case'fadd':{const t=String(b.u||'').toLowerCase(),T=D.u[t];if(!T||t==id)return{err:'Không tìm thấy người chơi này'};if(U.fr.includes(t))return{err:'Đã là bạn bè'};
   if(U.rq.includes(t)){U.rq=U.rq.filter(x=>x!=t);U.fr.push(t);T.fr.push(id)}else if(!T.rq.includes(id))T.rq.push(id);save();return{ok:'Đã gửi lời mời'}}
  case'facc':{if(U.rq.includes(b.u)&&D.u[b.u]){U.rq=U.rq.filter(x=>x!=b.u);U.fr.push(b.u);D.u[b.u].fr.push(id);save()}return{ok:1}}
  case'chal':{if(!U.fr.includes(b.to))return{err:'Chỉ thách đấu bạn bè'};if(busy(id)||busy(b.to))return{err:'Một trong hai người đang có trận'};newM(id,b.to);save();return{ok:1}}
  case'queue':{if(busy(id))return{err:'Bạn đang có trận'};const q=D.q&&D.u[D.q]&&D.q!=id&&Date.now()-D.u[D.q].seen<30000&&!busy(D.q)?D.q:null;if(q){D.q=null;newM(q,id)}else D.q=id;save();return{ok:1}}
  case'pick':{const m=D.m.find(x=>x.id==b.id&&(x.a==id||x.b==id));if(!m||m.st!='pick')return{err:'Trận không còn nhận đội hình'};const ro=b.ro||{};let n=0;
   for(const k in ro){if(!/^[\w:.@-]{1,30}$/.test(k)||!Number.isInteger(ro[k])||ro[k]<1)return{err:'Đội hình không hợp lệ'};n+=ro[k]}
   if(n<1||n>CAP)return{err:'Tổng số quân phải từ 1 đến '+CAP};
   if(m.a==id)m.pa=ro;else m.pb=ro;if(m.pa&&m.pb)m.st='ready';save();return{ok:1}}
  case'res':{const m=D.m.find(x=>x.id==b.id&&(x.a==id||x.b==id));if(m&&m.st=='ready'){m.w=[0,1].includes(b.w)?b.w:-1;m.st='done';save()}return{ok:1}}
 }
 return{err:'?'}}
http.createServer((q,r)=>{
 if(q.method=='POST'&&q.url=='/api'){let d='';q.on('data',c=>{d+=c;if(d.length>2e5)q.destroy()});
  q.on('end',()=>{let o;try{o=api(JSON.parse(d))}catch(e){o={err:'Lỗi máy chủ'}}r.setHeader('Content-Type','application/json');r.end(JSON.stringify(o))});return}
 const fl=fs.readdirSync(__dirname).filter(n=>/\.html?$/i.test(n)&&!/quan.?tri/i.test(n)),pg=fl.find(n=>/dai.?chien/i.test(n))||fl[0];
 fs.readFile(path.join(__dirname,pg||'x'),(e,x)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(x||'Không thấy file game .html cạnh server.js. Các file đang có: '+fs.readdirSync(__dirname).join(', '))})
}).listen(PORT,'0.0.0.0',()=>console.log('Mở http://localhost:'+PORT));
