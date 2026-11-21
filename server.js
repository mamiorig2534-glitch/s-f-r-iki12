// Sıfır İki — çevrimiçi sunucu (bağımlılık yok, Node 18+)
// Hem oyunu (public/) sunar hem de /ws üzerinden WebSocket odalarını yönetir.
const http=require('http'),https=require('https'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public'),MAXROOM=10,GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const rooms=new Map();

// --- three.js yoksa ilk açılışta indir (APK/çevrimdışı kullanım için) ---
const tp=path.join(PUB,'vendor','three.min.js');
if(!fs.existsSync(tp)){fs.mkdirSync(path.dirname(tp),{recursive:true});
  https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>{if(r.statusCode!==200){r.resume();return}const f=fs.createWriteStream(tp);r.pipe(f);f.on('finish',()=>console.log('three.js indirildi'))}).on('error',()=>{})}

const server=http.createServer((req,res)=>{
  const u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/health'){res.writeHead(200);return res.end('ok')}
  if(u==='/stats'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({rooms:rooms.size,players:[...rooms.values()].reduce((a,r)=>a+r.size,0)}))}
  const p=path.normalize(path.join(PUB,u==='/'?'index.html':u));
  if(!p.startsWith(PUB)){res.writeHead(403);return res.end()}
  fs.stat(p,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);return res.end('404')}
    const ext=path.extname(p);res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'||p.endsWith('sw.js')?'no-cache':'public,max-age=3600'});fs.createReadStream(p).pipe(res)})});

server.on('upgrade',(req,sock)=>{
  if(req.url.split('?')[0]!=='/ws'||!req.headers['sec-websocket-key']){sock.destroy();return}
  const acc=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  sock.setNoDelay(true);new Client(sock)});

function frame(op,buf){const l=buf.length;let h;if(l<126)h=Buffer.from([0x80|op,l]);else if(l<65536){h=Buffer.alloc(4);h[0]=0x80|op;h[1]=126;h.writeUInt16BE(l,2)}else{h=Buffer.alloc(10);h[0]=0x80|op;h[1]=127;h.writeBigUInt64BE(BigInt(l),2)}return Buffer.concat([h,buf])}

class Client{
  constructor(s){this.s=s;this.buf=Buffer.alloc(0);this.parts=[];this.op=0;this.room=null;this.id=null;this.pres={};this.alive=true;this.cnt=0;this.t0=Date.now();
    s.on('data',d=>this.data(d));s.on('close',()=>this.close());s.on('error',()=>this.close());
    this.iv=setInterval(()=>{if(!this.alive)return this.s.destroy();this.alive=false;this.raw(9,Buffer.alloc(0))},25000)}
  raw(op,b){if(!this.s.destroyed)this.s.write(frame(op,b))}
  send(o){this.raw(1,Buffer.from(JSON.stringify(o)))}
  data(d){this.buf=Buffer.concat([this.buf,d]);if(this.buf.length>1<<20)return this.s.destroy();
    for(;;){const b=this.buf;if(b.length<2)return;const fin=b[0]&128,op=b[0]&15,mk=b[1]&128;let l=b[1]&127,o=2;
      if(l===126){if(b.length<4)return;l=b.readUInt16BE(2);o=4}else if(l===127){if(b.length<10)return;l=Number(b.readBigUInt64BE(2));o=10}
      if(!mk||l>65536)return this.s.destroy();if(b.length<o+4+l)return;
      const m=b.slice(o,o+4),p=Buffer.from(b.slice(o+4,o+4+l));for(let i=0;i<l;i++)p[i]^=m[i&3];this.buf=b.slice(o+4+l);
      if(op===8){this.s.end(frame(8,Buffer.alloc(0)));return}if(op===9){this.raw(10,p);continue}if(op===10){this.alive=true;continue}
      if(op===1||op===2)this.op=op;this.parts.push(p);if(fin){const t=Buffer.concat(this.parts).toString();this.parts=[];this.msg(t)}}}
  msg(t){const n=Date.now();if(n-this.t0>1000){this.t0=n;this.cnt=0}if(++this.cnt>300)return; // saniyede 300 mesaj sınırı
    let m;try{m=JSON.parse(t)}catch(e){return}this.alive=true;
    if(m.t==='j'&&!this.room){const r=String(m.r||'');if(!/^[a-z0-9-]{1,32}$/.test(r)){this.send({t:'err',m:'bad room'});return}
      let R=rooms.get(r);if(!R)rooms.set(r,R=new Map());
      if(R.size>=MAXROOM){this.send({t:'err',m:'full'});return}
      this.id=String(m.id||'').slice(0,16)||crypto.randomBytes(4).toString('hex');if(R.has(this.id))this.id+=crypto.randomBytes(2).toString('hex');
      this.pres=m.d&&typeof m.d==='object'?m.d:{};this.room=r;R.set(this.id,this);this.list(R)}
    else if(!this.room)return;
    else if(m.t==='p'&&m.d&&typeof m.d==='object'){this.pres=m.d;this.others({t:'pr',p:this.id,d:m.d})}
    else if(m.t==='e'&&typeof m.k==='string'&&m.k.length<10)this.others({t:'m',k:m.k,d:m.d,f:this.id})}
  others(o){const R=rooms.get(this.room);if(!R)return;const s=JSON.stringify(o);for(const c of R.values())if(c!==this)c.raw(1,Buffer.from(s))}
  list(R){const o={t:'peers',l:[...R.values()].map(c=>[c.id,c.pres])},s=Buffer.from(JSON.stringify(o));for(const c of R.values())c.raw(1,s)}
  close(){if(this.dead)return;this.dead=true;clearInterval(this.iv);const R=this.room&&rooms.get(this.room);if(R){R.delete(this.id);if(!R.size)rooms.delete(this.room);else this.list(R)}try{this.s.destroy()}catch(e){}}}

server.listen(PORT,()=>console.log('Sıfır İki sunucusu: http://localhost:'+PORT));
