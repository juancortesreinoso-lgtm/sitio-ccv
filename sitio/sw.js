/* Service worker mínimo: permite instalar el portal como app en el celular.
   No guarda nada en caché (los datos son cifrados y siempre se piden en línea). */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  if(e.request.mode !== 'navigate') return;   // solo la página: lo demás va directo a la red
  e.respondWith(fetch(e.request).catch(function(){
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#0A1633;color:#fff;padding:32px"><h2>Sin conexión</h2><p>Conéctese a internet para abrir el portal.</p></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
