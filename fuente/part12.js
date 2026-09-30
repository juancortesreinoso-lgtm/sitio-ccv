/* ==================================================================
   ===============   02 CALIDAD — CARPETA EN GOOGLE DRIVE  ==========
   ==================================================================
   La carpeta de calidad (PIE / ITP / protocolos / dossier) vive en
   Google Drive y la administra el encargado de calidad. Este módulo
   la muestra en modo LECTURA y se navega como en Drive, sin salir de
   la app:
     · un servicio de solo lectura (Apps Script, CALIDAD_SERVICIO_URL)
       entrega el árbol completo de la carpeta en JSON;
     · subcarpetas, ruta (migas de pan), buscador, orden y visor
       integrado (Drive preview) para PDF, Office, Google Docs, imágenes;
     · se relee al abrir el módulo, con ↻ y cada 5 minutos;
     · nada se guarda ni se modifica: los permisos son los de Drive.
   Si el servicio no responde, se muestra la vista incrustada de Drive.
   ================================================================== */

const CALIDAD_SERVICIO_URL = 'https://script.google.com/macros/s/AKfycbxdRWFXlNa-1OIrSc1dOB3B8AJz5yBF6kxV05BHWVzXY1ElIJ9YKXCv7qXglXJ10MnzoQ/exec';
const CALIDAD_REFRESCO_MS = 5 * 60 * 1000;
const CALIDAD = { arbol:null, hora:null, error:'', cargando:false, carpetaId:'', vista:'lista', orden:'nombre', buscar:'', doc:null, timer:null };

function idCarpetaDrive(url){
  const m = str(url).match(/folders\/([A-Za-z0-9_-]{10,})/) || str(url).match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : '';
}
function urlCarpetaCalidad(){ return str(DB.contrato.carpetaCalidad || CARPETA_CALIDAD_URL).trim(); }
function servicioCalidad(){ return str(DB.contrato.servicioCalidad || CALIDAD_SERVICIO_URL).trim(); }
function servicioCalidadOK(){ const u = servicioCalidad(); return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(u); }

/* ---------- carga del árbol ---------- */
function cargarCalidad(forzar){
  if(!servicioCalidadOK()){ CALIDAD.error = 'sin-servicio'; return Promise.resolve(); }
  if(CALIDAD.cargando) return Promise.resolve();
  CALIDAD.cargando = true; CALIDAD.error = '';
  pintarCalidad();
  const u = servicioCalidad() + (servicioCalidad().indexOf('?') > 0 ? '&' : '?') + 't=' + Date.now();
  return fetch(u, { method:'GET', redirect:'follow', cache:'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(j){
      if(!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida');
      CALIDAD.arbol = j.arbol; CALIDAD.hora = new Date(); CALIDAD.total = j.total;
      if(!CALIDAD.carpetaId || !buscarCarpeta(CALIDAD.arbol, CALIDAD.carpetaId)) CALIDAD.carpetaId = j.arbol.id;
    })
    .catch(function(e){ CALIDAD.error = String(e && e.message || e); })
    .then(function(){ CALIDAD.cargando = false; pintarCalidad(); });
}
function buscarCarpeta(nodo, id, ruta){
  ruta = ruta || [];
  if(!nodo) return null;
  if(nodo.id === id) return { nodo:nodo, ruta:ruta.concat([nodo]) };
  for(let i=0; i<(nodo.carpetas||[]).length; i++){
    const r = buscarCarpeta(nodo.carpetas[i], id, ruta.concat([nodo]));
    if(r) return r;
  }
  return null;
}
function todosLosArchivos(nodo, ruta, acc){
  acc = acc || []; ruta = ruta || [];
  (nodo.archivos||[]).forEach(function(a){ acc.push({ a:a, ruta:ruta.concat([nodo]) }); });
  (nodo.carpetas||[]).forEach(function(c){ todosLosArchivos(c, ruta.concat([nodo]), acc); });
  return acc;
}

/* ---------- tipos, íconos y visor ---------- */
function tipoArchivo(mime, nombre){
  mime = str(mime); const ext = (str(nombre).match(/\.([a-z0-9]+)$/i) || ['',''])[1].toLowerCase();
  if(mime === 'application/pdf' || ext === 'pdf') return { ico:'📄', label:'PDF', prev:'drive' };
  if(mime === 'application/vnd.google-apps.document') return { ico:'📝', label:'Google Docs', prev:'gdoc' };
  if(mime === 'application/vnd.google-apps.spreadsheet') return { ico:'📊', label:'Google Sheets', prev:'gsheet' };
  if(mime === 'application/vnd.google-apps.presentation') return { ico:'📽️', label:'Google Slides', prev:'gslides' };
  if(mime === 'application/vnd.google-apps.folder') return { ico:'📁', label:'Carpeta', prev:'' };
  if(/word|officedocument\.word|msword/.test(mime) || /^docx?$/.test(ext)) return { ico:'📝', label:'Word', prev:'drive' };
  if(/excel|spreadsheetml|ms-excel/.test(mime) || /^xlsx?$|^xlsm$|^csv$/.test(ext)) return { ico:'📊', label:'Excel', prev:'drive' };
  if(/powerpoint|presentationml/.test(mime) || /^pptx?$/.test(ext)) return { ico:'📽️', label:'PowerPoint', prev:'drive' };
  if(/^image\//.test(mime)) return { ico:'🖼️', label:'Imagen', prev:'drive' };
  if(/^video\//.test(mime)) return { ico:'🎬', label:'Video', prev:'drive' };
  if(/dwg|dxf|acad/.test(mime) || /^dwg$|^dxf$/.test(ext)) return { ico:'📐', label:'CAD', prev:'' };
  if(/zip|rar|7z|compressed/.test(mime) || /^zip$|^rar$|^7z$/.test(ext)) return { ico:'🗜️', label:'Comprimido', prev:'' };
  if(/^text\//.test(mime) || ext === 'txt') return { ico:'📃', label:'Texto', prev:'drive' };
  return { ico:'📎', label: ext ? ext.toUpperCase() : 'Archivo', prev:'drive' };
}
function urlVisor(a){
  const t = tipoArchivo(a.mime, a.nombre);
  if(t.prev === 'gdoc')    return 'https://docs.google.com/document/d/' + a.id + '/preview';
  if(t.prev === 'gsheet')  return 'https://docs.google.com/spreadsheets/d/' + a.id + '/preview';
  if(t.prev === 'gslides') return 'https://docs.google.com/presentation/d/' + a.id + '/preview';
  if(t.prev === 'drive')   return 'https://drive.google.com/file/d/' + a.id + '/preview';
  return '';
}
function fmtTam(n){
  n = Number(n) || 0;
  if(!n) return '—';
  if(n < 1024) return n + ' B';
  if(n < 1048576) return (n/1024).toFixed(0) + ' kB';
  if(n < 1073741824) return (n/1048576).toFixed(1) + ' MB';
  return (n/1073741824).toFixed(2) + ' GB';
}
function fmtFechaHora(iso){
  const d = new Date(iso); if(isNaN(d.getTime())) return '—';
  return pad(d.getDate()) + '-' + pad(d.getMonth()+1) + '-' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* ---------- vista ---------- */
function renderCalidad(){
  let html = '';
  html += '<div class="page-title"><h1>02 — Calidad (PIE / ITP / Protocolos)</h1>' +
          '<span class="pill ok" style="margin-top:4px"><span class="dot"></span>Carpeta en Google Drive · solo lectura</span></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> La carpeta de calidad del contrato tal como está <b>hoy</b> en Google Drive (PIE/ITP, protocolos, registros firmados, dossier), ' +
          'navegable aquí mismo como en Drive: entre a las subcarpetas, busque por nombre y abra cada documento en el visor integrado. ' +
          'La administra el encargado de calidad en Drive; lo que agregue o reemplace aparece solo (se relee al abrir, con ↻ y cada 5 minutos). Nadie edita ni borra desde aquí.</div>';
  html += '<div id="calidadCuerpo">' + cuerpoCalidad() + '</div>';
  return html;
}
function renderCalidadPost(){
  if(CALIDAD.timer) clearInterval(CALIDAD.timer);
  if(servicioCalidadOK()){
    if(!CALIDAD.arbol) cargarCalidad();
    CALIDAD.timer = setInterval(function(){
      if(ESTADO_UI.ruta !== 'calidad'){ clearInterval(CALIDAD.timer); CALIDAD.timer = null; return; }
      cargarCalidad(true);
    }, CALIDAD_REFRESCO_MS);
  }
}
function pintarCalidad(){
  const el = document.getElementById('calidadCuerpo');
  if(el) el.innerHTML = cuerpoCalidad();
}
function cuerpoCalidad(){
  const urlDrive = urlCarpetaCalidad();
  if(!servicioCalidadOK() || (CALIDAD.error && !CALIDAD.arbol)) return cuerpoCalidadEmbebido(urlDrive);
  if(!CALIDAD.arbol) return '<div class="card card-pad" style="text-align:center;color:var(--text-2)">Leyendo la carpeta de calidad en Google Drive…</div>';

  const enc = buscarCarpeta(CALIDAD.arbol, CALIDAD.carpetaId) || { nodo:CALIDAD.arbol, ruta:[CALIDAD.arbol] };
  const nodo = enc.nodo, ruta = enc.ruta;
  const q = CALIDAD.buscar.trim().toLowerCase();

  /* barra superior */
  let h = '<div class="toolbar">';
  h += '<a class="btn" href="' + attr(urlDrive) + '" target="_blank" rel="noopener" title="Abrir la carpeta en Google Drive (pestaña nueva)">▲ Ver en Drive</a>';
  h += '<button class="btn" onclick="cargarCalidad(true)" title="Volver a leer la carpeta"' + (CALIDAD.cargando ? ' disabled' : '') + '>↻ ' + (CALIDAD.cargando ? 'Leyendo…' : 'Actualizar') + '</button>';
  h += '<span class="search" style="flex:0 1 320px"><span class="mag">⌕</span><input class="inp" id="calidadBuscar" type="search" placeholder="Buscar en toda la carpeta…" value="' + attr(CALIDAD.buscar) + '" oninput="buscarCalidad(this.value)" style="padding-left:30px"></span>';
  h += '<span class="spacer"></span>';
  h += '<span style="font-size:12px;color:var(--text-2)">Vista:</span>' +
       '<button class="btn sm' + (CALIDAD.vista === 'lista' ? ' primary' : '') + '" onclick="vistaCalidad(\'lista\')">☰ Lista</button>' +
       '<button class="btn sm' + (CALIDAD.vista === 'cuadricula' ? ' primary' : '') + '" onclick="vistaCalidad(\'cuadricula\')">▦ Cuadrícula</button>';
  h += '<span style="font-size:11.5px;color:var(--text-3);margin-left:8px">' + (CALIDAD.hora ? 'Leída a las ' + pad(CALIDAD.hora.getHours()) + ':' + pad(CALIDAD.hora.getMinutes()) : '') +
       (CALIDAD.error ? ' · <span style="color:var(--bad)">sin conexión, mostrando la última lectura</span>' : '') + '</span>';
  h += '</div>';

  /* migas de pan */
  h += '<div class="migas">';
  ruta.forEach(function(c, i){
    const ultimo = (i === ruta.length - 1);
    h += (i ? '<span class="sep">›</span>' : '') +
         (ultimo && !q ? '<b>' + esc(i === 0 ? 'Calidad' : c.nombre) + '</b>' : '<a href="javascript:void 0" onclick="irCarpetaCalidad(\'' + attr(c.id) + '\')">' + esc(i === 0 ? 'Calidad' : c.nombre) + '</a>');
  });
  if(q) h += '<span class="sep">›</span><b>Resultados de "' + esc(CALIDAD.buscar.trim()) + '"</b>';
  h += '</div>';

  /* contenido */
  let carpetas = [], archivos = [];
  if(q){
    const todos = todosLosArchivos(CALIDAD.arbol);
    archivos = todos.filter(function(x){ return x.a.nombre.toLowerCase().indexOf(q) >= 0; });
    const cs = []; (function rec(n, r){ (n.carpetas||[]).forEach(function(c){ if(c.nombre.toLowerCase().indexOf(q) >= 0) cs.push({ c:c, ruta:r.concat([n]) }); rec(c, r.concat([n])); }); })(CALIDAD.arbol, []);
    carpetas = cs;
  }else{
    carpetas = (nodo.carpetas||[]).map(function(c){ return { c:c, ruta:ruta }; });
    archivos = (nodo.archivos||[]).map(function(a){ return { a:a, ruta:ruta }; });
  }
  const ord = CALIDAD.orden;
  const cmp = function(x, y){
    if(ord === 'fecha') return String(y.mod).localeCompare(String(x.mod));
    if(ord === 'tam') return (Number(y.tam)||0) - (Number(x.tam)||0);
    return String(x.nombre).localeCompare(String(y.nombre), 'es');
  };
  carpetas.sort(function(x,y){ return cmp(x.c, y.c); }); archivos.sort(function(x,y){ return cmp(x.a, y.a); });

  if(!carpetas.length && !archivos.length){
    h += '<div class="card"><div class="empty-state"><div class="big">📂</div>' + (q ? 'Ningún documento coincide con la búsqueda.' : 'Esta carpeta está vacía.') + '</div></div>';
  }else if(CALIDAD.vista === 'cuadricula'){
    h += '<div class="drv-grid">';
    carpetas.forEach(function(x){
      h += '<div class="drv-card" ondblclick="irCarpetaCalidad(\'' + attr(x.c.id) + '\')" onclick="irCarpetaCalidad(\'' + attr(x.c.id) + '\')" title="Abrir carpeta">' +
           '<div class="drv-ico">📁</div><div class="drv-nom">' + esc(x.c.nombre) + '</div><div class="drv-sub">Carpeta · ' + ((x.c.archivos||[]).length + (x.c.carpetas||[]).length) + ' elementos</div></div>';
    });
    archivos.forEach(function(x){
      const t = tipoArchivo(x.a.mime, x.a.nombre);
      h += '<div class="drv-card" onclick="verDocCalidad(\'' + attr(x.a.id) + '\')" title="' + attr(x.a.nombre) + '">' +
           '<div class="drv-ico">' + t.ico + '</div><div class="drv-nom">' + esc(x.a.nombre) + '</div>' +
           '<div class="drv-sub">' + esc(t.label) + ' · ' + fmtTam(x.a.tam) + ' · ' + fmtFechaHora(x.a.mod) + (q ? '<br>' + esc(rutaTexto(x.ruta)) : '') + '</div></div>';
    });
    h += '</div>';
  }else{
    h += '<div class="tbl-wrap"><table><thead><tr>' +
         '<th onclick="ordenCalidad(\'nombre\')">Nombre' + (ord === 'nombre' ? ' <span class="arr">▲</span>' : '') + '</th>' +
         (q ? '<th>Ubicación</th>' : '') +
         '<th>Tipo</th>' +
         '<th onclick="ordenCalidad(\'fecha\')">Modificado' + (ord === 'fecha' ? ' <span class="arr">▼</span>' : '') + '</th>' +
         '<th onclick="ordenCalidad(\'tam\')" class="num">Tamaño' + (ord === 'tam' ? ' <span class="arr">▼</span>' : '') + '</th>' +
         '<th></th></tr></thead><tbody>';
    carpetas.forEach(function(x){
      h += '<tr class="drv-row" onclick="irCarpetaCalidad(\'' + attr(x.c.id) + '\')" title="Abrir carpeta">' +
           '<td class="wrap">📁 <b>' + esc(x.c.nombre) + '</b></td>' + (q ? '<td class="wrap" style="color:var(--text-2)">' + esc(rutaTexto(x.ruta)) + '</td>' : '') +
           '<td>Carpeta</td><td>' + fmtFechaHora(x.c.mod) + '</td><td class="num">' + ((x.c.archivos||[]).length + (x.c.carpetas||[]).length) + ' elem.</td><td></td></tr>';
    });
    archivos.forEach(function(x){
      const t = tipoArchivo(x.a.mime, x.a.nombre);
      h += '<tr class="drv-row" onclick="verDocCalidad(\'' + attr(x.a.id) + '\')" title="Ver documento">' +
           '<td class="wrap">' + t.ico + ' ' + esc(x.a.nombre) + '</td>' + (q ? '<td class="wrap" style="color:var(--text-2)">' + esc(rutaTexto(x.ruta)) + '</td>' : '') +
           '<td>' + esc(t.label) + '</td><td>' + fmtFechaHora(x.a.mod) + '</td><td class="num">' + fmtTam(x.a.tam) + '</td>' +
           '<td style="white-space:nowrap"><button class="btn sm" onclick="event.stopPropagation();verDocCalidad(\'' + attr(x.a.id) + '\')">👁 Ver</button> ' +
           '<a class="btn sm" href="' + attr(x.a.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir en Drive (pestaña nueva)">⧉</a></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '<p class="sub" style="margin-top:10px">' + (q ? archivos.length + ' documento(s) y ' + carpetas.length + ' carpeta(s) encontrados en toda la carpeta de calidad.' :
       carpetas.length + ' carpeta(s) · ' + archivos.length + ' documento(s) en esta ubicación · ' + (CALIDAD.total || 0) + ' elementos en total.') + '</p>';
  return h;
}
function rutaTexto(ruta){ return (ruta||[]).map(function(c, i){ return i === 0 ? 'Calidad' : c.nombre; }).join(' › '); }
function cuerpoCalidadEmbebido(urlDrive){
  const id = idCarpetaDrive(urlDrive);
  let h = '';
  if(CALIDAD.error && CALIDAD.error !== 'sin-servicio') h += '<div class="warnbox">No se pudo leer el servicio de la carpeta (' + esc(CALIDAD.error) + '). Se muestra la vista incrustada de Drive. <button class="btn sm" onclick="cargarCalidad(true)">Reintentar</button></div>';
  if(!id) return h + '<div class="badbox">No hay una carpeta de calidad configurada. Configúrela en <a href="#/config">09 — Configuración del Contrato</a>.</div>';
  h += '<div class="toolbar"><a class="btn primary" href="' + attr(urlDrive) + '" target="_blank" rel="noopener">▲ Abrir carpeta en Google Drive</a>' +
       '<button class="btn" onclick="refrescarEmbebido()">↻ Actualizar</button></div>';
  h += '<div class="card" style="overflow:hidden"><iframe id="calidadFrame" class="drive-frame" src="https://drive.google.com/embeddedfolderview?id=' + attr(id) + '#list" title="Carpeta de calidad en Google Drive"></iframe></div>';
  return h;
}
function refrescarEmbebido(){ const f = document.getElementById('calidadFrame'); if(!f) return; const s = f.src; f.src = 'about:blank'; setTimeout(function(){ f.src = s; }, 50); }
function irCarpetaCalidad(id){ CALIDAD.carpetaId = id; CALIDAD.buscar = ''; pintarCalidad(); window.scrollTo(0, 0); }
function vistaCalidad(v){ CALIDAD.vista = v; pintarCalidad(); }
function ordenCalidad(o){ CALIDAD.orden = o; pintarCalidad(); }
function buscarCalidad(v){
  CALIDAD.buscar = v;
  clearTimeout(CALIDAD._t);
  CALIDAD._t = setTimeout(function(){
    const inp = document.getElementById('calidadBuscar'); const pos = inp ? inp.selectionStart : null;
    pintarCalidad();
    const n = document.getElementById('calidadBuscar'); if(n){ n.focus(); if(pos != null) n.setSelectionRange(pos, pos); }
  }, 180);
}

/* ---------- visor integrado ---------- */
function verDocCalidad(id){
  const todos = todosLosArchivos(CALIDAD.arbol);
  const x = todos.filter(function(t){ return t.a.id === id; })[0];
  if(!x) return;
  const a = x.a, t = tipoArchivo(a.mime, a.nombre), u = urlVisor(a);
  const idx = todos.map(function(t){ return t.a.id; }).indexOf(id);
  abrirModal(
    '<div class="modal-head"><h2 style="font-size:14px">' + t.ico + ' ' + esc(a.nombre) + '</h2>' +
      '<span class="pill neutral">solo lectura</span>' +
      '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body" style="padding:0">' +
      (u ? '<iframe class="visor-doc" src="' + attr(u) + '" title="' + attr(a.nombre) + '" allow="autoplay"></iframe>'
         : '<div class="empty-state"><div class="big">' + t.ico + '</div>Este tipo de archivo (' + esc(t.label) + ') no tiene vista previa en el navegador. Ábralo en Drive.</div>') +
    '</div>' +
    '<div class="modal-foot" style="justify-content:space-between">' +
      '<span style="font-size:12px;color:var(--text-2)">' + esc(rutaTexto(x.ruta)) + ' · ' + esc(t.label) + ' · ' + fmtTam(a.tam) + ' · modificado ' + fmtFechaHora(a.mod) + '</span>' +
      '<span>' +
        (idx > 0 ? '<button class="btn sm" onclick="verDocCalidad(\'' + attr(todos[idx-1].a.id) + '\')" title="Documento anterior">‹ Anterior</button> ' : '') +
        (idx < todos.length - 1 ? '<button class="btn sm" onclick="verDocCalidad(\'' + attr(todos[idx+1].a.id) + '\')" title="Documento siguiente">Siguiente ›</button> ' : '') +
        '<a class="btn sm" href="' + attr(a.url) + '" target="_blank" rel="noopener">⧉ Abrir en Drive</a> ' +
        '<button class="btn sm primary" onclick="cerrarModal()">Cerrar</button>' +
      '</span>' +
    '</div>'
  );
  const m = document.querySelector('#modalRoot .modal'); if(m) m.classList.add('wide');
}
