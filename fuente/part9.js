/* ==================================================================
   ===============   CARPETA CONECTADA (SINCRONIZACIÓN)   ===========
   ==================================================================
   Usa la File System Access API (Chrome / Edge) para leer la carpeta
   "Construccion" directamente desde el navegador:

     · el usuario la elige UNA vez con "📁 Conectar carpeta";
     · la app recuerda la carpeta (IndexedDB) y la reconecta al abrir
       (según el navegador, puede pedir un clic de confirmación);
     · cada vez que se abre la app —y cada minuto mientras está
       abierta— se revisa la carpeta: los PDF nuevos se dan de alta
       solos como documentos o revisiones nuevas, y los archivos que
       ya no están se marcan como faltantes;
     · los PDF se abren leyéndolos desde la carpeta, así que da lo
       mismo dónde esté guardado este HTML.

   En navegadores sin esta API (Firefox, Safari) la app sigue
   funcionando con los enlaces relativos: el HTML debe estar en la
   misma carpeta que los PDF.
   ================================================================== */

const CARPETA = { handle:null, nombre:'', archivos:{}, conectada:false, ultimaSync:null, ultimoInforme:null, timer:null };
const FS_INTERVALO_MS = 60000;

function fsaDisponible(){ return typeof window.showDirectoryPicker === 'function'; }

/* --- IndexedDB mínimo para guardar el "handle" de la carpeta --- */
function idbAbrir(){
  return new Promise(function(res, rej){
    try{
      const r = indexedDB.open('mies_ot_carpeta', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    }catch(e){ rej(e); }
  });
}
function idbSet(k, v){
  return idbAbrir().then(function(db){
    return new Promise(function(res, rej){
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = function(){ res(); };
      t.onerror = function(){ rej(t.error); };
    });
  });
}
function idbGet(k){
  return idbAbrir().then(function(db){
    return new Promise(function(res, rej){
      const t = db.transaction('kv', 'readonly');
      const q = t.objectStore('kv').get(k);
      q.onsuccess = function(){ res(q.result); };
      q.onerror = function(){ rej(q.error); };
    });
  });
}
function idbDel(k){
  return idbAbrir().then(function(db){
    return new Promise(function(res){
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').delete(k);
      t.oncomplete = function(){ res(); };
      t.onerror = function(){ res(); };
    });
  });
}

/* --- Conectar / reconectar --- */
function conectarCarpeta(){
  if(!fsaDisponible()){
    toast('Este navegador no permite leer carpetas. Use Chrome o Edge, o mantenga la app en la misma carpeta que los PDF.', 'bad', 8000);
    return;
  }
  window.showDirectoryPicker({ id: 'construccion', mode: 'read' }).then(function(h){
    return idbSet('carpeta', h).catch(function(){}).then(function(){ return usarCarpeta(h, true); });
  }).catch(function(e){
    if(e && e.name === 'AbortError') return;
    toast('No se pudo conectar la carpeta: ' + esc(e && e.message || e), 'bad');
  });
}
function reconectarCarpeta(){
  return idbGet('carpeta').then(function(h){
    if(!h) return false;
    return h.queryPermission({ mode: 'read' }).then(function(p){
      if(p === 'granted') return p;
      return h.requestPermission({ mode: 'read' });
    }).then(function(p){
      if(p !== 'granted') return false;
      return usarCarpeta(h, true).then(function(){ return true; });
    });
  }).catch(function(){ return false; });
}
/* Al arrancar: si la carpeta ya fue conectada antes, intenta usarla sin preguntar */
function autoConectarCarpeta(){
  if(!fsaDisponible()){ pintarEstadoCarpeta(); return; }
  idbGet('carpeta').then(function(h){
    if(!h){ pintarEstadoCarpeta(); return; }
    CARPETA.nombre = h.name; CARPETA.recordada = true;
    return h.queryPermission({ mode: 'read' }).then(function(p){
      if(p === 'granted') return usarCarpeta(h, false);
      pintarEstadoCarpeta();   /* hace falta un clic para reautorizar */
    });
  }).catch(function(){ pintarEstadoCarpeta(); });
}
function desconectarCarpeta(){
  CARPETA.handle = null; CARPETA.conectada = false; CARPETA.archivos = {}; CARPETA.recordada = false;
  if(CARPETA.timer){ clearInterval(CARPETA.timer); CARPETA.timer = null; }
  idbDel('carpeta').then(function(){ pintarEstadoCarpeta(); render(); toast('Carpeta desconectada.', 'ok'); });
}
function usarCarpeta(h, avisar){
  CARPETA.handle = h; CARPETA.nombre = h.name;
  return escanearCarpeta(avisar).then(function(){
    if(!CARPETA.timer) CARPETA.timer = setInterval(function(){ escanearCarpeta(true); }, FS_INTERVALO_MS);
  });
}

/* --- Lectura de la carpeta y sincronización con la base --- */
function listarPDFs(h){
  const archivos = {};
  const it = h.entries();
  function paso(){
    return it.next().then(function(r){
      if(r.done) return archivos;
      const nombre = r.value[0], entry = r.value[1];
      if(entry.kind === 'file' && /\.pdf$/i.test(nombre)) archivos[nombre] = entry;
      return paso();
    });
  }
  return paso();
}
function escanearCarpeta(avisar){
  if(!CARPETA.handle) return Promise.resolve();
  return listarPDFs(CARPETA.handle).then(function(archivos){
    CARPETA.archivos = archivos; CARPETA.conectada = true; CARPETA.ultimaSync = new Date();
    const inf = sincronizarDocumentos(Object.keys(archivos));
    CARPETA.ultimoInforme = inf;
    if(inf.nuevos.length || inf.revisiones.length || inf.vinculados.length){ guardarDB(); render(); }
    else if(document.getElementById('content')) render();
    pintarEstadoCarpeta();
    if(avisar){
      const partes = [];
      if(inf.nuevos.length) partes.push(inf.nuevos.length + ' documento(s) nuevo(s)');
      if(inf.revisiones.length) partes.push(inf.revisiones.length + ' revisión(es) nueva(s)');
      if(inf.vinculados.length) partes.push(inf.vinculados.length + ' archivo(s) vinculado(s)');
      if(inf.faltantes.length) partes.push(inf.faltantes.length + ' archivo(s) faltante(s)');
      toast('Carpeta <b>' + esc(CARPETA.nombre) + '</b> sincronizada: ' + Object.keys(archivos).length + ' PDF. ' +
            (partes.length ? partes.join(', ') + '.' : 'Sin cambios.'), inf.faltantes.length ? 'bad' : 'ok', 6000);
    }
  }).catch(function(e){
    CARPETA.conectada = false; pintarEstadoCarpeta();
    if(avisar) toast('No se pudo leer la carpeta: ' + esc(e && e.message || e), 'bad');
  });
}

/* Interpreta el nombre de un PDF: código y revisión */
function interpretarNombre(nombre){
  let base = nombre.replace(/\.pdf$/i, '').trim();
  let rev = '';
  /* "CÓDIGO Rev B", "CÓDIGO_Rev.0", "CÓDIGO - revisión 1" */
  let m = base.match(/^(.*?)[\s_\-]+rev(?:isi[oó]n)?\.?\s*([A-Za-z0-9]{1,3})$/i);
  /* "CÓDIGO_B", "CÓDIGO_1", "CÓDIGO_R2" (formato R&Q / CODELCO) */
  if(!m) m = base.match(/^(.+?-\d{3,6})_([A-Z]|\d{1,2}|R\d{1,2})$/i);
  if(m){ base = m[1].trim(); rev = m[2].toUpperCase(); }
  return { codigo: base, rev: rev || '0', revAsumida: !m };
}
function disciplinaPorCodigo(c){
  const m = c.match(/-\d*([A-Z]{2})-\d/);
  const d = m ? m[1] : '';
  return { EL:'Eléctrica', ME:'Mecánica', AT:'Instrumentación y Control', ES:'Estructuras', CI:'Civil', AR:'Arquitectura', PI:'Piping', HV:'HVAC' }[d] || 'Multidisciplina';
}
function tipoPorCodigo(c){
  const m = c.match(/-([A-Z0-9]{3})[A-Z]{2}-/);
  const s = m ? m[1] : '';
  if(s === 'MDC') return 'Memoria de cálculo';
  if(s === 'ESP') return 'Especificación técnica';
  if(s === 'HDD') return 'Datasheet';
  if(s === 'MNL' || s === 'PRO') return 'Procedimiento';
  if(s === 'LST') return 'Lista de materiales';
  if(s === 'CER' || s === 'INF') return 'Otro';
  if(s === '202') return 'Diagrama unilineal';
  if(s === '105' || s === '401') return 'Layout';
  return 'Plano';
}
function ordenRev(r){
  r = str(r).toUpperCase();
  if(/^\d+$/.test(r)) return 1000 + Number(r);          /* números: para construcción, después de las letras */
  if(/^R\d+$/.test(r)) return 500 + Number(r.slice(1));  /* R9 (Innomotics) */
  let v = 0; for(let i=0;i<r.length;i++) v = v*27 + (r.charCodeAt(i) - 64);
  return v;
}
function archivoConocido(nombre){
  const n = nombre.toLowerCase();
  for(let i=0;i<DB.documentos.length;i++){
    const d = DB.documentos[i];
    if(d.enlace && d.enlace.toLowerCase() === n) return d;
    for(let j=0;j<d.revisiones.length;j++) if(d.revisiones[j].archivo && d.revisiones[j].archivo.toLowerCase() === n) return d;
  }
  return null;
}
/* Da de alta lo nuevo y marca lo faltante. Devuelve un informe. */
function sincronizarDocumentos(nombres){
  const inf = { nuevos:[], revisiones:[], vinculados:[], copias:[], faltantes:[] };
  const hoy = hoyISO();
  const set = {}; nombres.forEach(function(n){ set[n.toLowerCase()] = n; });

  nombres.sort().forEach(function(nombre){
    if(archivoConocido(nombre)) return;
    const p = interpretarNombre(nombre);
    const doc = docPorCodigo(p.codigo);
    if(doc){
      const mismaRev = doc.revisiones.filter(function(r){ return r.rev.toUpperCase() === p.rev; })[0];
      if(mismaRev){
        if(!mismaRev.archivo){ mismaRev.archivo = nombre; inf.vinculados.push(nombre); }
        else inf.copias.push(nombre);
        return;
      }
      const nueva = normalizarRev({
        rev: p.rev, fechaRecepcion: hoy, transmittal: 'Detectado en carpeta', archivo: nombre,
        motivo: 'Revisión detectada automáticamente en la carpeta ' + CARPETA.nombre + (p.revAsumida ? ' (revisión no indicada en el nombre; se asume 0)' : ''),
        incorporacion: 'No aplica', estado: 'recibido', plazoDias: DB.params.plazoRevisionDias
      });
      doc.revisiones.push(nueva);
      doc.revisiones.sort(function(a,b){ return ordenRev(a.rev) - ordenRev(b.rev); });
      doc.revisiones.forEach(function(r, i){
        if(i < doc.revisiones.length - 1 && !estadoInfo(r.estado).cerrado) r.estado = 'superado';
      });
      inf.revisiones.push(doc.codigo + ' Rev. ' + p.rev);
      return;
    }
    /* ¿Está en la documentación base del contrato (con título, emisor y revisiones reales)? */
    const base = documentacionBase().filter(function(b){
      return b.codigo.toLowerCase() === p.codigo.toLowerCase() ||
             b.revisiones.some(function(r){ return r.archivo && r.archivo.toLowerCase() === nombre.toLowerCase(); });
    })[0];
    if(base){
      base.correlativo = DB.correlativo++;
      base.observaciones = (base.observaciones ? base.observaciones + ' · ' : '') + 'Detectado en la carpeta ' + CARPETA.nombre + ' el ' + fmtFecha(hoy) + '.';
      DB.documentos.push(base); inf.nuevos.push(base.codigo);
      return;
    }
    const fam = emisorPorCodigo(p.codigo);
    const disciplina = disciplinaPorCodigo(p.codigo), tipo = tipoPorCodigo(p.codigo);
    const nuevo = normalizarDoc({
      correlativo: DB.correlativo++, codigo: p.codigo,
      titulo: tipo + ' ' + disciplina.toLowerCase() + ' ' + p.codigo + ' (título por completar)',
      disciplina: disciplina, tipo: tipo, fase: fam ? fam.fase : 'Detalle',
      area: fam ? fam.area : '', emisor: fam ? fam.emisor : '', enlace: '',
      observaciones: 'Dado de alta automáticamente al detectar el archivo en la carpeta ' + CARPETA.nombre + ' el ' + fmtFecha(hoy) + '. Complete el título y el transmittal desde la ficha.',
      revisiones: [{
        rev: p.rev, fechaRecepcion: hoy, transmittal: 'Detectado en carpeta', archivo: nombre,
        motivo: 'Documento detectado automáticamente en la carpeta' + (p.revAsumida ? ' (revisión no indicada en el nombre; se asume 0)' : ''),
        estado: 'recibido', plazoDias: DB.params.plazoRevisionDias
      }]
    });
    DB.documentos.push(nuevo);
    inf.nuevos.push(nuevo.codigo);
  });

  /* faltantes: revisión vigente con archivo que ya no está en la carpeta */
  DB.documentos.forEach(function(d){
    const r = revActual(d);
    const a = r.archivo || (!esURL(d.enlace) ? d.enlace : '');
    if(a && !set[a.toLowerCase()]) inf.faltantes.push(d.codigo + ' → ' + a);
  });
  return inf;
}
/* ¿El archivo de la revisión vigente existe en la carpeta conectada? */
function estadoArchivo(doc, rev){
  const r = rev || revActual(doc);
  const a = r.archivo || (!esURL(doc.enlace) ? doc.enlace : '');
  if(!a) return doc.enlaceDrive ? 'drive' : 'sin';
  if(!CARPETA.conectada) return 'relativo';
  return CARPETA.archivos[a] ? 'ok' : 'falta';
}
function badgeArchivo(doc){
  const e = estadoArchivo(doc);
  if(e === 'falta') return ' <span class="pill bad" title="El archivo no está en la carpeta conectada">archivo faltante</span>';
  if(e === 'sin')   return ' <span class="pill neutral" title="Sin archivo asociado">sin archivo</span>';
  return '';
}

/* --- Apertura de PDF leyendo la carpeta conectada --- */
function entradaDe(nombre){ return CARPETA.conectada && nombre && !esURL(nombre) ? CARPETA.archivos[nombre] : null; }
function abrirDesdeCarpeta(nombre){
  const entry = entradaDe(nombre);
  if(!entry) return false;
  const w = window.open('about:blank', '_blank');  /* se abre ahora (gesto del usuario) y se llena después */
  if(!w){ toast('El navegador bloqueó la ventana emergente. Permita ventanas emergentes para este archivo.', 'bad'); return true; }
  entry.getFile().then(function(f){
    const url = URL.createObjectURL(f);
    /* La pestaña nueva hereda el origen de esta página, así que puede mostrar el blob en un iframe
       con el visor de PDF del navegador, y además queda con el nombre del documento como título. */
    const doc = w.document;
    doc.open();
    doc.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' + esc(nombre) + '</title>' +
      '<style>html,body{margin:0;height:100%;background:#2b2f36;font-family:sans-serif}' +
      '.bar{position:fixed;top:0;left:0;right:0;height:34px;background:#1b2027;color:#dfe5ec;display:flex;align-items:center;gap:12px;padding:0 12px;font-size:12px;z-index:2}' +
      '.bar a{color:#8cc6f5}iframe{position:absolute;top:34px;left:0;width:100%;height:calc(100% - 34px);border:0;background:#fff}</style></head>' +
      '<body><div class="bar"><b>' + esc(nombre) + '</b><span style="opacity:.7">· leído desde la carpeta ' + esc(CARPETA.nombre) + '</span>' +
      '<a href="' + url + '" download="' + attr(nombre) + '" style="margin-left:auto">Descargar</a></div>' +
      '<iframe src="' + url + '" title="' + attr(nombre) + '"></iframe></body></html>');
    doc.close();
  }).catch(function(e){
    try{ w.close(); }catch(x){}
    toast('No se pudo leer el archivo ' + esc(nombre) + ': ' + esc(e && e.message || e), 'bad');
  });
  return true;
}
/* Manejador de clic de los enlaces a documentos (matriz, ficha, guía, línea de tiempo) */
function clickDoc(ev, id, revId){
  const d = docPorId(id);
  if(!d) return true;
  const r = revId ? d.revisiones.filter(function(x){ return x.id === revId; })[0] : revActual(d);
  const nombre = (r && r.archivo) || d.enlace;
  if(abrirDesdeCarpeta(nombre)){ if(ev) ev.preventDefault(); return false; }
  if(CARPETA.conectada && nombre && !esURL(nombre)){
    if(ev) ev.preventDefault();
    toast('El archivo <b>' + esc(nombre) + '</b> no está en la carpeta conectada (' + esc(CARPETA.nombre) + ').', 'bad', 6000);
    return false;
  }
  return true;  /* sin carpeta conectada: el navegador sigue el enlace relativo o la URL */
}

/* --- Indicador en la cabecera y barra de aviso --- */
function pintarEstadoCarpeta(){
  const b = document.getElementById('carpetaBtn');
  const bar = document.getElementById('fsBar');
  if(!b || !bar) return;
  if(!fsaDisponible()){
    b.textContent = '📁 Carpeta: solo Chrome/Edge';
    b.className = 'btn sm'; b.title = 'Este navegador no permite leer carpetas; mantenga la app junto a los PDF.';
    bar.hidden = true;
    return;
  }
  if(CARPETA.conectada){
    b.textContent = '📁 ' + CARPETA.nombre + ' ✓';
    b.className = 'btn sm'; b.title = 'Carpeta conectada. Clic para volver a sincronizar ahora.';
    bar.hidden = true;
  }else if(CARPETA.recordada){
    b.textContent = '📁 Reconectar carpeta';
    b.className = 'btn sm primary'; b.title = 'Vuelva a autorizar el acceso a la carpeta ' + CARPETA.nombre;
    bar.hidden = false;
    bar.innerHTML = '<b>Carpeta ' + esc(CARPETA.nombre) + ' recordada.</b> Haga clic en <b>📁 Reconectar carpeta</b> para volver a leerla: ' +
      'así los PDF se abren con un clic y los archivos nuevos se dan de alta solos. ' +
      '<button class="btn sm primary" onclick="reconectarCarpeta()">Reconectar ahora</button>';
  }else if(MODO_WEB){
    /* versión publicada en la web: los planos se abren desde Google Drive; conectar carpeta es opcional */
    b.textContent = '📁 Carpeta local (opcional)';
    b.className = 'btn sm'; b.title = 'Si tiene la carpeta Construccion en este PC, conéctela para abrir los PDF localmente';
    bar.hidden = true;
  }else{
    b.textContent = '📁 Conectar carpeta';
    b.className = 'btn sm primary'; b.title = 'Elija la carpeta Construccion (una sola vez)';
    bar.hidden = false;
    bar.innerHTML = '<b>Conecte la carpeta de los planos</b> (una sola vez): la app leerá los PDF de <b>Construccion</b>, ' +
      'dará de alta automáticamente los documentos nuevos y abrirá cada plano con un clic, sin importar desde dónde se abra este archivo. ' +
      '<button class="btn sm primary" onclick="conectarCarpeta()">📁 Conectar carpeta</button>';
  }
}
function initCarpeta(){
  const b = document.getElementById('carpetaBtn');
  if(b) b.addEventListener('click', function(){
    if(CARPETA.conectada) escanearCarpeta(true);
    else if(CARPETA.recordada) reconectarCarpeta().then(function(ok){ if(!ok) conectarCarpeta(); });
    else conectarCarpeta();
  });
  autoConectarCarpeta();
}

/* --- Panel para el Módulo 09 --- */
function panelCarpetaConfig(){
  let h = '<div class="card card-pad" style="margin-bottom:14px;max-width:1000px"><h2>Carpeta de documentos (sincronización automática)</h2>';
  if(!fsaDisponible()){
    h += '<div class="warnbox">Este navegador no permite leer carpetas (use <b>Chrome</b> o <b>Edge</b>). Mientras tanto la app abre los PDF por ruta relativa: debe estar guardada en la misma carpeta que los planos.</div>';
    return h + '</div>';
  }
  if(CARPETA.conectada){
    const inf = CARPETA.ultimoInforme || { nuevos:[], revisiones:[], vinculados:[], copias:[], faltantes:[] };
    h += '<p class="sub">Conectada: <b>' + esc(CARPETA.nombre) + '</b> · ' + Object.keys(CARPETA.archivos).length + ' PDF · última revisión ' +
         (CARPETA.ultimaSync ? CARPETA.ultimaSync.toLocaleTimeString('es-CL') : '—') + ' · se vuelve a revisar cada ' + (FS_INTERVALO_MS/1000) + ' s y al abrir la app.</p>' +
      '<div class="toolbar" style="margin:0 0 10px"><button class="btn primary" onclick="escanearCarpeta(true)">↻ Sincronizar ahora</button>' +
      '<button class="btn" onclick="conectarCarpeta()">Cambiar carpeta</button><button class="btn danger" onclick="desconectarCarpeta()">Desconectar</button></div>';
    h += '<dl class="dl">' +
      fila('Documentos nuevos (última sincronización)', inf.nuevos.length ? inf.nuevos.map(esc).join(', ') : '—') +
      fila('Revisiones nuevas', inf.revisiones.length ? inf.revisiones.map(esc).join(', ') : '—') +
      fila('Archivos vinculados a revisiones existentes', inf.vinculados.length ? inf.vinculados.map(esc).join(', ') : '—') +
      fila('Copias no vinculadas (misma revisión ya con archivo)', inf.copias.length ? inf.copias.map(esc).join(', ') : '—') +
      fila('Archivos faltantes', inf.faltantes.length ? '<span style="color:var(--bad)">' + inf.faltantes.map(esc).join('<br>') + '</span>' : '—') +
    '</dl>';
  }else{
    h += '<p class="sub">Elija la carpeta <b>Construccion</b> una sola vez. La app la recordará: al abrirla revisará los PDF, dará de alta los nuevos y abrirá cada plano leyéndolo desde la carpeta.</p>' +
      '<div class="toolbar" style="margin:0"><button class="btn primary" onclick="' + (CARPETA.recordada ? 'reconectarCarpeta()' : 'conectarCarpeta()') + '">📁 ' + (CARPETA.recordada ? 'Reconectar ' + esc(CARPETA.nombre) : 'Conectar carpeta') + '</button>' +
      (CARPETA.recordada ? '<button class="btn" onclick="conectarCarpeta()">Elegir otra carpeta</button>' : '') + '</div>';
  }
  h += '<p class="sub" style="margin:10px 0 0">Regla de nombres para el alta automática: <span class="mono">CÓDIGO.pdf</span> o <span class="mono">CÓDIGO Rev X.pdf</span>. ' +
       'Se aceptan también <span class="mono">CÓDIGO_B.pdf</span> y <span class="mono">CÓDIGO_1.pdf</span> (formato R&amp;Q / CODELCO). ' +
       'Si el código está en la documentación base del contrato, se da de alta con su título, emisor, área y revisiones reales; si no, se crea con emisor y área deducidos del código y el título queda por completar. ' +
       'Un archivo con código existente y revisión distinta crea una revisión nueva y deja la anterior como superada.</p>';
  return h + '</div>';
}


/* ==================================================================
   Completar documentos dados de alta automáticamente con los datos
   de la documentación base (título, emisor, área, revisiones) y
   agregar los documentos base que aún no existan. Se ejecuta al
   iniciar; BASE_VERSION evita repetir la carga de base en cada
   apertura (así, un documento borrado a propósito no reaparece).
   ================================================================== */
const BASE_VERSION = 4;
function esStub(d){ return /^Completar título|\(título por completar\)$/i.test(str(d.titulo)); }
function migrarBase(){
  const base = documentacionBase();
  let cambios = 0;
  function archivosDe(d){ return d.revisiones.map(function(r){ return str(r.archivo).toLowerCase(); }).filter(Boolean); }
  function baseDe(d){
    const cod = d.codigo.toLowerCase(), arcs = archivosDe(d);
    return base.filter(function(b){
      return b.codigo.toLowerCase() === cod || archivosDe(b).some(function(a){ return arcs.indexOf(a) >= 0; });
    })[0] || null;
  }
  /* 1) Stubs → datos reales */
  DB.documentos.forEach(function(d, i){
    if(!esStub(d)) return;
    const b = baseDe(d);
    if(b){
      b.id = d.id; b.correlativo = d.correlativo; b.terreno = d.terreno;
      /* conserva comentarios hechos sobre la revisión vigente del stub */
      const vs = revActual(d), vb = revActual(b);
      if(vs && vb && vs.comentarios && vs.comentarios.length){ vb.comentarios = vs.comentarios; vb.nComentarios = vs.comentarios.length; }
      DB.documentos[i] = b; cambios++;
      return;
    }
    const fam = emisorPorCodigo(d.codigo);
    if(fam){
      if(!d.emisor){ d.emisor = fam.emisor; cambios++; }
      if(!d.area){ d.area = fam.area; cambios++; }
    }
    /* código con sufijo de revisión mal interpretado (…_B) */
    const m = d.codigo.match(/^(.+?-\d{3,6})_([A-Z]|\d{1,2})$/i);
    if(m){ d.codigo = m[1]; const r = revActual(d); if(r && r.rev === '0'){ r.rev = m[2].toUpperCase(); } cambios++; }
  });
  /* 2) Documentos base que faltan (una vez por versión de base) */
  if((Number(DB.params.baseVersion) || 0) < BASE_VERSION){
    base.forEach(function(b){
      const existe = DB.documentos.some(function(d){
        return d.codigo.toLowerCase() === b.codigo.toLowerCase() ||
               archivosDe(d).some(function(a){ return archivosDe(b).indexOf(a) >= 0; });
      });
      if(existe) return;
      b.correlativo = DB.correlativo++; DB.documentos.push(b); cambios++;
    });
    DB.params.baseVersion = BASE_VERSION; cambios++;
  }
  if(cambios) guardarDB();
  return cambios;
}
