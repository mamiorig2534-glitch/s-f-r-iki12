const V='sifir2-v1',A=['./','index.html','manifest.json','config.js','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.pathname==='/ws'||u.protocol==='ws:'||u.protocol==='wss:')return;
 e.respondWith(fetch(r).then(s=>{if(s.ok&&u.origin===location.origin){const c=s.clone();caches.open(V).then(x=>x.put(r,c))}return s}).catch(()=>caches.match(r)))});
