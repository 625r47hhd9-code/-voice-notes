const CACHE="assistant-v7.6";
const ASSETS=[
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data && event.data.type==="SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET") return;

  const url=new URL(req.url);

  if(req.mode==="navigate" || url.pathname.endsWith("/index.html")){
    event.respondWith(
      fetch(req,{cache:"no-store"})
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
          return res;
        })
        .catch(()=>caches.match("./index.html").then(r=>r||caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req,{cache:"no-store"})
        .then(res=>{
          if(res && res.status===200){
            const copy=res.clone();
            caches.open(CACHE).then(cache=>cache.put(req,copy));
          }
          return res;
        })
        .catch(()=>cached);
      return cached || network;
    })
  );
});
