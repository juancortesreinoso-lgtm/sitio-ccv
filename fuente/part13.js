/* ==================================================================
   ===============   05 PLANIFICACIÓN Y AVANCE            ===========
   ==================================================================
   Programa de montaje (MS Project, Rev. CLG 29-09) convertido a datos
   (part13data.js) y trabajado desde la app:
     5.1 Carta Gantt navegable (etapas, actividades, hitos, filtros)
     5.2 Avance físico: % real por actividad, curva S plan vs. real
     5.3 Hitos contractuales con estado
     5.4 Restricciones y desviaciones
     5.5 Informe semanal imprimible
   El programa (fechas plan) es de solo lectura; lo que se registra
   (avance real, restricciones, fecha de corte) vive en DB.programa y
   requiere modo administrador.
   ================================================================== */

/* ---------- datos compartidos (servicio Apps Script, clave "programa") ----------
   Lo que se registra en este módulo se guarda en el navegador (DB) y ADEMÁS se sube
   al servicio de datos compartidos, para que todos vean el mismo avance. Al abrir el
   módulo se descarga la última versión. Escribir requiere el token de administrador. */
const SINC = { estado:'', hora:null, version:0, error:'', pendiente:false, ultimaLectura:0 };
function servicioDatos(){ return (typeof servicioCalidad === 'function') ? servicioCalidad() : ''; }
function servicioDatosOK(){ return (typeof servicioCalidadOK === 'function') && servicioCalidadOK(); }
function bajarPrograma(forzar){
  if(!servicioDatosOK()) return Promise.resolve(false);
  if(!forzar && Date.now() - SINC.ultimaLectura < 45000) return Promise.resolve(false);
  SINC.ultimaLectura = Date.now(); SINC.estado = 'leyendo'; pintarSinc();
  return fetch(servicioDatos() + '?accion=leer&clave=programa&t=' + Date.now(), { redirect:'follow', cache:'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(j){
      if(!j || !j.ok) throw new Error((j && j.error) || 'respuesta inválida');
      SINC.error = ''; SINC.hora = new Date(); SINC.version = j.version || 0;
      if(j.datos && (j.version || 0) >= (DB.programa.version || 0) && !SINC.pendiente){
        const nuevo = normalizarPrograma(j.datos); nuevo.version = j.version || 0;
        const cambio = JSON.stringify(nuevo) !== JSON.stringify(DB.programa);
        if(cambio){ DB.programa = nuevo; guardarDB(); if(/^plan/.test(ESTADO_UI.ruta)) render(); }
      }
      SINC.estado = 'ok'; pintarSinc(); return true;
    })
    .catch(function(e){ SINC.estado = 'error'; SINC.error = String(e && e.message || e); pintarSinc(); return false; });
}
function subirPrograma(){
  if(!servicioDatosOK()) return Promise.resolve(false);
  if(!ADMIN.token){ SINC.estado = 'error'; SINC.error = 'sin token de administrador (vuelva a ingresar la clave)'; SINC.pendiente = true; pintarSinc(); return Promise.resolve(false); }
  SINC.estado = 'subiendo'; pintarSinc();
  const datos = JSON.parse(JSON.stringify(DB.programa)); delete datos.version;
  return fetch(servicioDatos(), { method:'POST', redirect:'follow', headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion:'guardar', clave:'programa', token:ADMIN.token, datos:datos, por:(DB.contrato.jefeOT || '') }) })
    .then(function(r){ return r.json(); })
    .then(function(j){
      if(!j || !j.ok) throw new Error((j && j.error) || 'respuesta inválida');
      DB.programa.version = j.version || 0; guardarDB();
      SINC.estado = 'ok'; SINC.error = ''; SINC.pendiente = false; SINC.hora = new Date(); SINC.version = j.version || 0; pintarSinc();
      toast('Avance sincronizado para todos (versión ' + SINC.version + ').', 'ok', 2500); return true;
    })
    .catch(function(e){ SINC.estado = 'error'; SINC.error = String(e && e.message || e); SINC.pendiente = true; pintarSinc();
      toast('Guardado en este navegador, pero no se pudo sincronizar (' + esc(SINC.error) + '). Se reintentará al guardar de nuevo.', 'bad', 6000); return false; });
}
function guardarPrograma(){ guardarDB(); subirPrograma(); }
function pintarSinc(){
  const el = document.getElementById('sincEstado'); if(!el) return;
  el.innerHTML = textoSinc();
}
function textoSinc(){
  if(!servicioDatosOK()) return '<span class="pill neutral" title="Sin servicio de datos configurado: los registros quedan solo en este navegador">solo local</span>';
  const h = SINC.hora ? pad(SINC.hora.getHours()) + ':' + pad(SINC.hora.getMinutes()) : '';
  if(SINC.estado === 'leyendo') return '<span class="pill neutral">⟳ leyendo datos compartidos…</span>';
  if(SINC.estado === 'subiendo') return '<span class="pill neutral">⟳ sincronizando…</span>';
  if(SINC.estado === 'error') return '<span class="pill bad" title="' + attr(SINC.error) + '">⚠ sin sincronizar' + (SINC.pendiente ? ' (pendiente)' : '') + '</span> <button class="btn sm" onclick="reintentarSinc()">Reintentar</button>';
  if(SINC.estado === 'ok') return '<span class="pill ok" title="Datos compartidos por todos los usuarios">✓ compartido · v' + SINC.version + (h ? ' · ' + h : '') + '</span>';
  return '';
}
function reintentarSinc(){ if(SINC.pendiente && ADMIN.activo) subirPrograma(); else bajarPrograma(true); }

/* ---------- índice del programa ---------- */
const PRG = (function(){
  const porUID = {}, hijos = {};
  PROGRAMA_TAREAS.forEach(function(t){ porUID[t.u] = t; hijos[t.u] = []; });
  PROGRAMA_TAREAS.forEach(function(t){ if(t.p && hijos[t.p]) hijos[t.p].push(t); });
  const raiz = PROGRAMA_TAREAS.filter(function(t){ return t.l === 1; })[0];
  const etapas = PROGRAMA_TAREAS.filter(function(t){ return t.l === 2; });
  const hojas = PROGRAMA_TAREAS.filter(function(t){ return !t.S; });
  const hitos = hojas.filter(function(t){ return t.M; });
  const sucesores = {};
  PROGRAMA_TAREAS.forEach(function(t){ (t.L||[]).forEach(function(l){ (sucesores[l.p] = sucesores[l.p] || []).push({ t:t, tipo:l.t, lag:l.g }); }); });
  const etapaIdx = {}; etapas.forEach(function(e, i){ etapaIdx[e.u] = i; });
  const ini = hojas.map(function(t){ return t.s; }).sort()[0], fin = hojas.map(function(t){ return t.f; }).sort().slice(-1)[0];
  return { porUID:porUID, hijos:hijos, raiz:raiz, etapas:etapas, hojas:hojas, hitos:hitos, sucesores:sucesores, etapaIdx:etapaIdx, inicio:ini, fin:fin };
})();
const PRG_COLORES = ['#526075','#17658d','#835520','#386c50','#76528b','#006c73','#2855a1','#96413c','#5c6530','#79516c'];
const PRG_UI = { escala:'meses', buscar:'', etapa:'', recurso:'', estado:'', criticas:false, colapsadas:null, filtroAvance:'atrasadas' };
const TIPOS_RESTR = ['Restricción','Desviación de plazo','Cambio de alcance','Interferencia','Falta de suministro','Clima / fuerza mayor','Otro'];
const EST_RESTR = ['Abierta','En gestión','Cerrada'];

/* ---------- fechas ---------- */
function prgFecha(iso){ return iso ? new Date(iso.slice(0,10) + 'T00:00:00') : null; }
function prgMs(iso){ const d = prgFecha(iso); return d ? d.getTime() : 0; }
function prgISO(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function fmtCorta(iso){ if(!iso) return '—'; const d = prgFecha(iso); const M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(); }
function fechaCorte(){ return DB.programa.fechaCorte || hoyISO(); }
function colorEtapa(t){ return PRG_COLORES[PRG.etapaIdx[t.ph]] || '#365970'; }
function nombreEtapa(t){ const i = PRG.etapaIdx[t.ph]; return i == null ? '—' : String(i+1).padStart(2,'0') + ' · ' + PROGRAMA_ETAPAS_META[i][1]; }
function fmtH(h){ return Number(h).toLocaleString('es-CL', { maximumFractionDigits:1 }) + ' h'; }
function fmtDias(h){ return Number(h / 8).toLocaleString('es-CL', { maximumFractionDigits:1 }) + ' d'; }

/* ---------- avance ---------- */
function avanceDe(t){ return DB.programa.avances[t.u] || null; }
function pesoHoja(t){ if(t.M) return 0; return t.k > 0 ? t.k : (t.d > 0 ? t.d : 0); }
function descendientesHoja(t){
  if(!t.S) return [t];
  let acc = []; (PRG.hijos[t.u]||[]).forEach(function(h){ acc = acc.concat(descendientesHoja(h)); }); return acc;
}
function pctRealHoja(t){ const a = avanceDe(t); if(a) return a.pct; return 0; }
function pctPlanHoja(t, corteISO){
  const c = prgMs(corteISO) + 86400000, s = prgMs(t.s), f = prgMs(t.f) + 86400000;
  if(c <= s) return 0; if(c >= f) return 100;
  return Math.round((c - s) / (f - s) * 1000) / 10;
}
function pctPonderado(t, fn){
  const hojas = descendientesHoja(t);
  let pesoT = 0, acum = 0, n = 0, sum = 0;
  hojas.forEach(function(h){ const w = pesoHoja(h); const v = fn(h); if(w > 0){ pesoT += w; acum += w * v; } n++; sum += v; });
  if(pesoT > 0) return Math.round(acum / pesoT * 10) / 10;
  return n ? Math.round(sum / n * 10) / 10 : 0;
}
function pctReal(t){ return t.S ? pctPonderado(t, pctRealHoja) : pctRealHoja(t); }
function pctPlan(t, corte){ corte = corte || fechaCorte(); return t.S ? pctPonderado(t, function(h){ return pctPlanHoja(h, corte); }) : pctPlanHoja(t, corte); }
function estadoActividad(t, corte){
  corte = corte || fechaCorte();
  const a = avanceDe(t), real = pctRealHoja(t), plan = pctPlanHoja(t, corte);
  if(t.M){
    if(a && (a.finReal || a.pct >= 100)) return { id:'completada', label:'Cumplido', cls:'aprobado' };
    return prgMs(t.f) < prgMs(corte) ? { id:'atrasada', label:'Vencido', cls:'rechazado' } : { id:'pendiente', label:'Pendiente', cls:'recibido' };
  }
  if(real >= 100) return { id:'completada', label:'Completada', cls:'aprobado' };
  if(plan > 0 && real + 0.05 < plan) return { id:'atrasada', label:'Atrasada', cls:'rechazado' };
  if(real > 0) return { id:'curso', label:'En curso', cls:'revision' };
  if(plan > 0) return { id:'atrasada', label:'Atrasada', cls:'rechazado' };
  return { id:'pendiente', label:'No iniciada', cls:'recibido' };
}
function totalReal(){ return pctReal(PRG.raiz); }
function totalPlan(corte){ return pctPlan(PRG.raiz, corte); }
function registrarCorte(){ DB.programa.cortes[fechaCorte()] = totalReal(); }

/* ---------- ficha de actividad ---------- */
function fichaActividad(uid){
  const t = PRG.porUID[uid]; if(!t) return;
  const a = avanceDe(t), est = estadoActividad(t), ruta = [];
  let p = PRG.porUID[t.p]; while(p){ ruta.unshift(p.n); p = PRG.porUID[p.p]; }
  const tipos = { '0':'FF fin–fin', '1':'FI fin–inicio', '2':'IF inicio–fin', '3':'II inicio–inicio' };
  const pred = (t.L||[]).map(function(l){ const q = PRG.porUID[l.p]; return q ? '<li><a href="javascript:void 0" onclick="fichaActividad(\'' + q.u + '\')">#' + esc(q.i) + ' ' + esc(q.n) + '</a> <span class="tag">' + (tipos[l.t]||l.t) + (l.g ? ' ' + (l.g>0?'+':'') + Math.round(l.g/PROGRAMA_META.minDia*10)/10 + ' d' : '') + '</span></li>' : ''; }).join('');
  const suc = (PRG.sucesores[t.u]||[]).map(function(s){ return '<li><a href="javascript:void 0" onclick="fichaActividad(\'' + s.t.u + '\')">#' + esc(s.t.i) + ' ' + esc(s.t.n) + '</a> <span class="tag">' + (tipos[s.tipo]||s.tipo) + '</span></li>'; }).join('');
  const hijos = t.S ? (PRG.hijos[t.u]||[]) : [];
  abrirModal(
    '<div class="modal-head"><div><div class="sub" style="margin:0 0 2px;font-size:11.5px">' + esc(ruta.join(' › ')) + '</div><h2>' + (t.M ? '◆ ' : t.S ? '▣ ' : '') + esc(t.n) + '</h2></div>' +
      pillEstado2(est) + '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' +
      '<div class="dl">' +
        '<dt>ID · EDT</dt><dd>#' + esc(t.i) + ' · ' + esc(t.w) + '</dd>' +
        '<dt>Etapa</dt><dd><span class="tag" style="background:' + colorEtapa(t) + ';color:#fff">' + esc(nombreEtapa(t)) + '</span></dd>' +
        '<dt>Inicio · término plan</dt><dd>' + fmtCorta(t.s) + ' → ' + fmtCorta(t.f) + (t.M ? ' (hito)' : '') + '</dd>' +
        '<dt>Duración · trabajo</dt><dd>' + fmtH(t.d) + ' (' + fmtDias(t.d) + ') · ' + fmtH(t.k) + '</dd>' +
        '<dt>Recursos</dt><dd>' + (t.r && t.r.length ? t.r.map(function(r){ return '<span class="tag">' + esc(r) + '</span>'; }).join(' ') : '—') + '</dd>' +
        '<dt>Ruta crítica (Project)</dt><dd>' + (t.C ? '<span class="pill bad"><span class="dot"></span>Crítica</span>' : 'No') + (t.sl != null ? ' · holgura total ' + fmtDias(Number(t.sl)/60) : '') + '</dd>' +
        '<dt>Avance plan a la fecha de corte</dt><dd><b>' + pctPlan(t) + ' %</b> <span class="sub" style="display:inline">(' + fmtFecha(fechaCorte()) + ')</span></dd>' +
        '<dt>Avance real registrado</dt><dd><b>' + pctReal(t) + ' %</b>' + (a ? ' · ' + (a.inicioReal ? 'inicio real ' + fmtFecha(a.inicioReal) : '') + (a.finReal ? ' · término real ' + fmtFecha(a.finReal) : '') + (a.fecha ? ' · registrado ' + fmtFecha(a.fecha) : '') : '') + '</dd>' +
        (a && a.comentario ? '<dt>Comentario</dt><dd>' + esc(a.comentario) + '</dd>' : '') +
      '</div>' +
      (hijos.length ? '<div class="sec"><h3>Actividades incluidas (' + hijos.length + ')</h3><ul class="wip-list">' + hijos.map(function(h){ return '<li><a href="javascript:void 0" onclick="fichaActividad(\'' + h.u + '\')">#' + esc(h.i) + ' ' + esc(h.n) + '</a> · ' + fmtCorta(h.s) + ' → ' + fmtCorta(h.f) + ' · real ' + pctReal(h) + ' %</li>'; }).join('') + '</ul></div>' : '') +
      (pred ? '<div class="sec"><h3>Predecesoras</h3><ul class="wip-list">' + pred + '</ul></div>' : '') +
      (suc ? '<div class="sec"><h3>Sucesoras</h3><ul class="wip-list">' + suc + '</ul></div>' : '') +
    '</div>' +
    '<div class="modal-foot">' + (!t.S ? '<button class="btn primary" onclick="formAvance(\'' + t.u + '\')">✎ Registrar avance</button>' : '') +
      '<button class="btn" onclick="cerrarModal()">Cerrar</button></div>');
}
function pillEstado2(e){ return '<span class="pill ' + e.cls + '"><span class="dot"></span>' + esc(e.label) + '</span>'; }

/* ---------- registro de avance (administrador) ---------- */
function formAvance(uid){
  const t = PRG.porUID[uid]; if(!t || t.S) return;
  const a = avanceDe(t) || { pct:0, inicioReal:'', finReal:'', comentario:'', fecha:'', por:'' };
  abrirModal(
    '<div class="modal-head"><h2>Registrar avance — #' + esc(t.i) + ' ' + esc(t.n) + '</h2><button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' +
      '<p class="sub">Plan: ' + fmtCorta(t.s) + ' → ' + fmtCorta(t.f) + ' · avance plan a la fecha de corte (' + fmtFecha(fechaCorte()) + '): <b>' + pctPlan(t) + ' %</b>. ' +
      (t.M ? 'Es un <b>hito</b>: márquelo cumplido con su fecha real.' : 'Registre el avance físico real de la actividad; 100 % la cierra.') + '</p>' +
      '<div class="fgrid">' +
        (t.M ? '<div class="field"><label class="f" for="avPct">Estado</label><select class="inp" id="avPct"><option value="0"' + (a.pct < 100 ? ' selected' : '') + '>Pendiente</option><option value="100"' + (a.pct >= 100 ? ' selected' : '') + '>Cumplido</option></select></div>'
             : '<div class="field"><label class="f" for="avPct">Avance real (%)</label><input class="inp" id="avPct" type="number" min="0" max="100" step="1" value="' + a.pct + '"></div>') +
        '<div class="field"><label class="f" for="avIni">Inicio real</label><input class="inp" id="avIni" type="date" value="' + attr(a.inicioReal) + '"></div>' +
        '<div class="field"><label class="f" for="avFin">Término real' + (t.M ? ' (fecha de cumplimiento)' : '') + '</label><input class="inp" id="avFin" type="date" value="' + attr(a.finReal) + '"></div>' +
        '<div class="field"><label class="f" for="avPor">Registrado por</label><input class="inp" id="avPor" value="' + attr(a.por || DB.contrato.jefeOT || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="f" for="avCom">Comentario / restricción observada</label><textarea class="inp" id="avCom">' + esc(a.comentario) + '</textarea></div>' +
    '</div>' +
    '<div class="modal-foot">' + (avanceDe(t) ? '<button class="btn danger" onclick="eliminarAvance(\'' + t.u + '\')">Borrar registro</button>' : '') +
      '<span class="spacer"></span><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
      '<button class="btn primary" onclick="guardarAvance(\'' + t.u + '\')">Guardar avance</button></div>');
}
function guardarAvance(uid){
  const t = PRG.porUID[uid]; if(!t) return;
  let pct = Math.max(0, Math.min(100, Number(valorCampo('avPct')) || 0));
  const fin = valorCampo('avFin'), ini = valorCampo('avIni');
  if(fin && !t.M && pct < 100){ pct = 100; }
  if(t.M && fin) pct = 100;
  if(ini && fin && fin < ini){ toast('El término real no puede ser anterior al inicio real.', 'bad'); return; }
  DB.programa.avances[uid] = { pct:pct, inicioReal:ini, finReal:fin, comentario:valorCampo('avCom'), fecha:hoyISO(), por:valorCampo('avPor') };
  registrarCorte(); guardarPrograma(); cerrarModal(); render();
  toast('Avance registrado: #' + esc(t.i) + ' → ' + pct + ' %. Avance total real: ' + totalReal() + ' %.', 'ok');
}
function eliminarAvance(uid){
  delete DB.programa.avances[uid]; registrarCorte(); guardarPrograma(); cerrarModal(); render(); toast('Registro de avance eliminado.', 'ok');
}
function guardarFechaCorte(v){
  DB.programa.fechaCorte = str(v); registrarCorte(); guardarPrograma(); render();
}

/* ==================================================================
   5.1 CARTA GANTT
   ================================================================== */
function prgNav(actual){
  const items = [['plan/gantt','5.1 Carta Gantt'],['plan/avance','5.2 Avance y curva S'],['plan/hitos','5.3 Hitos'],['plan/restricciones','5.4 Restricciones'],['plan/informe','5.5 Informe semanal']];
  return '<div class="toolbar" style="margin-bottom:12px">' + items.map(function(it){ return '<a class="btn sm' + (it[0] === actual ? ' primary' : '') + '" href="#/' + it[0] + '">' + esc(it[1]) + '</a>'; }).join('') +
    '<span class="spacer"></span><span id="sincEstado">' + textoSinc() + '</span><span style="font-size:11.5px;color:var(--text-3);margin-left:8px">Programa: ' + esc(PROGRAMA_META.fuente.replace(/\.xml$/i,'')) + ' · guardado ' + fmtCorta(PROGRAMA_META.guardado) + '</span></div>';
}
function renderAvancePost(){ bajarPrograma(); }
function renderHitosPost(){ bajarPrograma(); }
function renderRestriccionesPost(){ bajarPrograma(); }
function renderInformePost(){ bajarPrograma(); }
function filasGantt(){
  if(PRG_UI.colapsadas === null){ PRG_UI.colapsadas = {}; PROGRAMA_TAREAS.forEach(function(t){ if(t.S && t.l >= 3) PRG_UI.colapsadas[t.u] = true; }); }
  const q = PRG_UI.buscar.trim().toLowerCase(), corte = fechaCorte();
  const filtrando = !!(q || PRG_UI.etapa || PRG_UI.recurso || PRG_UI.estado || PRG_UI.criticas);
  function pasa(t){
    if(q && (t.n.toLowerCase().indexOf(q) < 0 && t.i !== q.replace('#','') && t.w.indexOf(q) !== 0)) return false;
    if(PRG_UI.etapa && t.ph !== PRG_UI.etapa && t.u !== PRG_UI.etapa) return false;
    if(PRG_UI.recurso && (t.r||[]).indexOf(PRG_UI.recurso) < 0) return false;
    if(PRG_UI.estado && estadoActividad(t, corte).id !== PRG_UI.estado) return false;
    if(PRG_UI.criticas && !t.C) return false;
    return true;
  }
  const out = [];
  if(filtrando){
    PROGRAMA_TAREAS.forEach(function(t){ if(!t.S && pasa(t)) out.push(t); });
    return out;
  }
  (function rec(t){
    out.push(t);
    if(t.S && !PRG_UI.colapsadas[t.u]) (PRG.hijos[t.u]||[]).forEach(rec);
  })(PRG.raiz);
  return out;
}
function renderGantt(){
  const filas = filasGantt(), corte = fechaCorte();
  const escala = PRG_UI.escala, ini = prgFecha(PRG.inicio), fin = prgFecha(PRG.fin);
  const t0 = new Date(ini.getFullYear(), ini.getMonth(), 1), t1 = new Date(fin.getFullYear(), fin.getMonth() + 1, 1);
  const pxDia = escala === 'semanas' ? 6 : 3;
  const ancho = Math.round((t1 - t0) / 86400000 * pxDia);
  const x = function(iso){ return Math.round((prgMs(iso) - t0.getTime()) / 86400000 * pxDia); };
  let h = '<div class="page-title"><h1>5.1 Carta Gantt del programa</h1></div>' + prgNav('plan/gantt');
  h += '<div class="help"><b>¿Qué es esto?</b> El programa de montaje aprobado (MS Project) con sus 10 etapas, ' + PRG.hojas.length + ' actividades y ' + PRG.hitos.length + ' hitos, ' +
       'del ' + fmtCorta(PRG.inicio) + ' al ' + fmtCorta(PRG.fin) + '. Las fechas plan son de solo lectura. Un clic en una fila abre la ficha; desde ahí el administrador registra el avance real. ' +
       'La barra clara es el plan y la barra oscura sobre ella, el avance real registrado; la línea roja es la fecha de corte.</div>';
  /* filtros */
  h += '<div class="card card-pad" style="margin-bottom:12px"><div class="fgrid">' +
    '<div><label class="f">Buscar actividad</label><input class="inp" id="gBuscar" placeholder="Nombre, N° o EDT…" value="' + attr(PRG_UI.buscar) + '" oninput="filtroGantt(\'buscar\',this.value)"></div>' +
    '<div><label class="f">Etapa</label><select class="inp" onchange="filtroGantt(\'etapa\',this.value)"><option value="">Todas las etapas</option>' +
      PRG.etapas.map(function(e, i){ return '<option value="' + e.u + '"' + (PRG_UI.etapa === e.u ? ' selected' : '') + '>' + String(i+1).padStart(2,'0') + ' · ' + esc(PROGRAMA_ETAPAS_META[i][1]) + '</option>'; }).join('') + '</select></div>' +
    '<div><label class="f">Recurso</label><select class="inp" onchange="filtroGantt(\'recurso\',this.value)"><option value="">Todos</option>' + PROGRAMA_RECURSOS.map(function(r){ return '<option' + (PRG_UI.recurso === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></div>' +
    '<div><label class="f">Estado a la fecha de corte</label><select class="inp" onchange="filtroGantt(\'estado\',this.value)"><option value="">Todos</option>' +
      [['pendiente','No iniciada / pendiente'],['curso','En curso'],['atrasada','Atrasada / vencido'],['completada','Completada / cumplido']].map(function(o){ return '<option value="' + o[0] + '"' + (PRG_UI.estado === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
    '</div><div class="toolbar" style="margin:10px 0 0">' +
    '<button class="btn sm' + (escala === 'meses' ? ' primary' : '') + '" onclick="escalaGantt(\'meses\')">Meses</button><button class="btn sm' + (escala === 'semanas' ? ' primary' : '') + '" onclick="escalaGantt(\'semanas\')">Semanas</button>' +
    '<button class="btn sm" onclick="expandirGantt(true)">Expandir todo</button><button class="btn sm" onclick="expandirGantt(false)">Contraer todo</button>' +
    '<button class="btn sm" onclick="limpiarGantt()">Limpiar filtros</button>' +
    '<label class="chk" style="margin-left:6px"><input type="checkbox"' + (PRG_UI.criticas ? ' checked' : '') + ' onchange="filtroGantt(\'criticas\',this.checked)"> Solo ruta crítica</label>' +
    '<span class="spacer"></span><span style="font-size:12px;color:var(--text-2)">' + filas.length + ' filas · corte ' + fmtFecha(corte) + ' · avance real total <b>' + totalReal() + ' %</b> vs plan <b>' + totalPlan(corte) + ' %</b></span></div></div>';

  /* cabecera de tiempo */
  let cab = '', cab2 = '';
  for(let d = new Date(t0); d < t1; d.setMonth(d.getMonth() + 1)){
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1), w = Math.round((n - d) / 86400000 * pxDia);
    const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    cab += '<div class="g-mes" style="width:' + w + 'px">' + M[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) + '</div>';
  }
  if(escala === 'semanas'){
    for(let d = new Date(t0); d < t1; d.setDate(d.getDate() + 7)){ cab2 += '<div class="g-sem" style="width:' + (7 * pxDia) + 'px">' + pad(d.getDate()) + '</div>'; }
  }
  const xCorte = x(corte);
  h += '<div class="gantt" id="gDer"><div class="g-row g-head"><div class="g-izq g-cab">ACTIVIDAD · EDT · N°</div><div class="g-der g-cab" style="width:' + ancho + 'px">' + cab + (cab2 ? '<div class="g-semanas">' + cab2 + '</div>' : '') + '</div></div>';
  filas.forEach(function(t){
    const est = estadoActividad(t, corte);
    const xi = x(t.s), xf = Math.max(x(t.f) + pxDia, xi + 3), w = xf - xi, real = pctReal(t), col = colorEtapa(t);
    h += '<div class="g-row' + (t.S ? ' g-res' : '') + '" onclick="fichaActividad(\'' + t.u + '\')">';
    h += '<div class="g-izq g-fila" style="padding-left:' + (8 + (t.l - 1) * 14) + 'px" title="' + attr(t.n) + '">' +
      (t.S ? '<button class="g-tog" onclick="event.stopPropagation();toggleGantt(\'' + t.u + '\')">' + (PRG_UI.colapsadas[t.u] ? '+' : '−') + '</button>' : '<span class="g-tog"></span>') +
      '<span class="g-nom">' + (t.M ? '◆ ' : '') + esc(t.n) + '</span>' +
      '<span class="g-sub">' + esc(t.w) + ' · #' + esc(t.i) + (t.S ? '' : ' · <span class="pill ' + est.cls + '" style="padding:0 6px;font-size:10px">' + esc(est.label) + '</span>') + '</span></div>';
    h += '<div class="g-der g-linea" style="width:' + ancho + 'px">';
    if(xCorte >= 0 && xCorte <= ancho) h += '<div class="g-corte" style="left:' + xCorte + 'px"></div>';
    if(t.M) h += '<div class="g-hito" style="left:' + (xi - 6) + 'px;border-color:' + col + '"></div>';
    else if(t.S) h += '<div class="g-barra g-resumen" style="left:' + xi + 'px;width:' + w + 'px;background:' + col + '"><div class="g-real" style="width:' + real + '%"></div></div>';
    else h += '<div class="g-barra' + (t.C && PRG_UI.criticas ? ' g-crit' : '') + '" style="left:' + xi + 'px;width:' + w + 'px;background:' + col + '55;border-color:' + col + '"><div class="g-real" style="width:' + real + '%;background:' + col + '"></div>' + (w > 40 ? '<span class="g-pct">' + real + ' %</span>' : '') + '</div>';
    h += '</div></div>';
  });
  h += '</div>';
  h += '<div class="legend"><span><i style="background:#17658d55;border:1px solid #17658d"></i>Plan</span><span><i style="background:#17658d"></i>Avance real</span><span>◆ Hito</span><span><i style="background:var(--bad)"></i>Fecha de corte</span><span>Los colores identifican la etapa · deslice horizontalmente para recorrer las fechas</span></div>';
  return h;
}
function renderGanttPost(){
  bajarPrograma();
  const der = document.getElementById('gDer'); if(!der) return;
  const corte = fechaCorte(), ini = prgFecha(PRG.inicio), t0 = new Date(ini.getFullYear(), ini.getMonth(), 1);
  const pxDia = PRG_UI.escala === 'semanas' ? 6 : 3;
  const xc = Math.round((prgMs(corte) - t0.getTime()) / 86400000 * pxDia);
  if(xc + 380 > der.clientWidth * 0.6) der.scrollLeft = xc + 380 - der.clientWidth * 0.5;
}
function filtroGantt(k, v){ PRG_UI[k] = v; if(k === 'buscar'){ clearTimeout(PRG_UI._t); PRG_UI._t = setTimeout(function(){ const i = document.getElementById('gBuscar'); const p = i ? i.selectionStart : null; render(); const n = document.getElementById('gBuscar'); if(n){ n.focus(); if(p != null) n.setSelectionRange(p, p); } }, 200); } else render(); }
function escalaGantt(e){ PRG_UI.escala = e; render(); }
function toggleGantt(uid){ PRG_UI.colapsadas[uid] = !PRG_UI.colapsadas[uid]; render(); }
function expandirGantt(abrir){ PRG_UI.colapsadas = {}; if(!abrir) PROGRAMA_TAREAS.forEach(function(t){ if(t.S && t.l >= 2) PRG_UI.colapsadas[t.u] = true; }); render(); }
function limpiarGantt(){ PRG_UI.buscar = ''; PRG_UI.etapa = ''; PRG_UI.recurso = ''; PRG_UI.estado = ''; PRG_UI.criticas = false; render(); }

/* ==================================================================
   5.2 AVANCE FÍSICO Y CURVA S
   ================================================================== */
function puntosCurvaS(){
  const ini = prgFecha(PRG.inicio), fin = prgFecha(PRG.fin), pts = [];
  const d = new Date(ini); d.setDate(d.getDate() - d.getDay() + 1); /* lunes */
  while(d <= fin){ const iso = prgISO(d); pts.push({ fecha:iso, plan:totalPlan(iso) }); d.setDate(d.getDate() + 7); }
  pts.push({ fecha:prgISO(fin), plan:100 });
  return pts;
}
function svgCurvaS(){
  const pts = puntosCurvaS(), w = 720, hh = 300, ml = 44, mr = 16, mt = 16, mb = 40;
  const x0 = prgMs(pts[0].fecha), x1 = prgMs(pts[pts.length-1].fecha);
  const X = function(iso){ return ml + (prgMs(iso) - x0) / (x1 - x0) * (w - ml - mr); };
  const Y = function(p){ return mt + (100 - p) / 100 * (hh - mt - mb); };
  let s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + hh + '" style="max-width:100%" role="img" aria-label="Curva S plan vs real">';
  for(let g = 0; g <= 100; g += 25){ s += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="var(--border)" stroke-width="1"/><text x="' + (ml - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end" font-size="11" fill="var(--text-3)">' + g + '%</text>'; }
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const ini = prgFecha(pts[0].fecha);
  for(let d = new Date(ini.getFullYear(), ini.getMonth(), 1); d.getTime() <= x1; d.setMonth(d.getMonth() + 1)){
    if(d.getTime() < x0) continue; const xx = X(prgISO(d));
    s += '<line x1="' + xx + '" x2="' + xx + '" y1="' + mt + '" y2="' + (hh - mb) + '" stroke="var(--border)" stroke-dasharray="2 3"/><text x="' + xx + '" y="' + (hh - mb + 16) + '" text-anchor="middle" font-size="10.5" fill="var(--text-3)">' + M[d.getMonth()] + (d.getMonth() === 0 || d.getTime() === new Date(ini.getFullYear(), ini.getMonth(), 1).getTime() ? ' ' + String(d.getFullYear()).slice(2) : '') + '</text>';
  }
  s += '<path d="' + pts.map(function(p, i){ return (i ? 'L' : 'M') + X(p.fecha).toFixed(1) + ' ' + Y(p.plan).toFixed(1); }).join(' ') + '" fill="none" stroke="#17658d" stroke-width="2.5"/>';
  const cortes = Object.keys(DB.programa.cortes).sort().map(function(f){ return { fecha:f, real:Number(DB.programa.cortes[f]) || 0 }; });
  const corte = fechaCorte(), realHoy = totalReal();
  const serie = cortes.filter(function(c){ return c.fecha < corte; }).concat([{ fecha:corte, real:realHoy }]);
  if(serie.length){
    s += '<path d="' + serie.map(function(p, i){ return (i ? 'L' : 'M') + X(p.fecha).toFixed(1) + ' ' + Y(p.real).toFixed(1); }).join(' ') + '" fill="none" stroke="#25703c" stroke-width="2.5"/>';
    serie.forEach(function(p){ s += '<circle cx="' + X(p.fecha) + '" cy="' + Y(p.real) + '" r="3.5" fill="#25703c"/>'; });
  }
  const xc = X(corte);
  s += '<line x1="' + xc + '" x2="' + xc + '" y1="' + mt + '" y2="' + (hh - mb) + '" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
       '<text x="' + (xc + 4) + '" y="' + (mt + 12) + '" font-size="11" fill="var(--bad)">corte ' + fmtFecha(corte) + '</text>';
  s += '<text x="' + (w - mr) + '" y="' + (Y(totalPlan(corte)) - 6) + '" text-anchor="end" font-size="11" fill="#17658d">plan ' + totalPlan(corte) + ' %</text>';
  s += '<text x="' + (w - mr) + '" y="' + (Y(realHoy) + 14) + '" text-anchor="end" font-size="11" fill="#25703c">real ' + realHoy + ' %</text>';
  s += '</svg>';
  return s;
}
function renderAvance(){
  const corte = fechaCorte(), plan = totalPlan(corte), real = totalReal(), desv = Math.round((real - plan) * 10) / 10;
  const act = PRG.hojas.filter(function(t){ return !t.M; });
  const porEstado = { pendiente:0, curso:0, atrasada:0, completada:0 };
  act.forEach(function(t){ porEstado[estadoActividad(t, corte).id]++; });
  const hitosVenc = PRG.hitos.filter(function(t){ return estadoActividad(t, corte).id === 'atrasada'; }).length;
  let h = '<div class="page-title"><h1>5.2 Avance físico y curva S</h1></div>' + prgNav('plan/avance');
  h += '<div class="help"><b>¿Qué es esto?</b> Compara lo que el programa dice que debería estar hecho a la <b>fecha de corte</b> (avance plan, ponderado por horas de trabajo de cada actividad) con lo realmente ejecutado (avance real registrado por actividad). ' +
       'La curva S verde se dibuja con los cortes que se van guardando. El administrador fija la fecha de corte y registra el avance con el botón ✎ de cada actividad.</div>';
  h += '<div class="toolbar"><label class="f" style="margin:0" for="fCorte">Fecha de corte</label><input class="inp" style="width:170px" type="date" id="fCorte" value="' + attr(corte) + '" onchange="guardarFechaCorte(this.value)"' + (esAdmin() ? '' : ' disabled') + '>' +
       '<button class="btn sm" onclick="exportarAvanceCSV()">↓ Exportar avance CSV</button><span class="spacer"></span>' +
       '<span style="font-size:12px;color:var(--text-2)">' + Object.keys(DB.programa.avances).length + ' actividades con registro · ' + Object.keys(DB.programa.cortes).length + ' cortes guardados</span></div>';
  h += '<div class="grid kpis" style="margin-bottom:14px">' +
    kpi('Avance plan a la fecha', plan + ' %', 'según programa', '') +
    kpi('Avance real', real + ' %', 'registrado', real >= plan ? 'good' : 'warn') +
    kpi('Desviación', (desv > 0 ? '+' : '') + desv + ' pts', desv < 0 ? 'atraso respecto del plan' : 'adelanto o en plan', desv < -5 ? 'bad' : desv < 0 ? 'warn' : 'good') +
    kpi('Actividades atrasadas', porEstado.atrasada, 'de ' + act.length + ' actividades', porEstado.atrasada ? 'bad' : 'good') +
    kpi('En curso', porEstado.curso, 'con avance parcial', '') +
    kpi('Completadas', porEstado.completada, 'al 100 %', 'good') +
    kpi('Hitos vencidos', hitosVenc, 'sin cumplir a la fecha', hitosVenc ? 'bad' : 'good') +
  '</div>';
  h += '<div class="grid cols2"><div class="card card-pad"><h2>Curva S — plan vs. real</h2>' + svgCurvaS() +
       '<div class="legend"><span><i style="background:#17658d"></i>Plan (programa)</span><span><i style="background:#25703c"></i>Real (cortes registrados)</span><span><i style="background:var(--bad)"></i>Fecha de corte</span></div></div>';
  /* avance por etapa */
  h += '<div class="card card-pad"><h2>Avance por etapa</h2><div class="tbl-wrap" style="border:0"><table><thead><tr><th>Etapa</th><th>Plan</th><th>Real</th><th>Desv.</th><th>Periodo</th></tr></thead><tbody>';
  PRG.etapas.forEach(function(e, i){
    const p = pctPlan(e, corte), r = pctReal(e), d = Math.round((r - p) * 10) / 10;
    h += '<tr style="cursor:pointer" onclick="fichaActividad(\'' + e.u + '\')"><td class="wrap"><span class="tag" style="background:' + PRG_COLORES[i] + ';color:#fff">' + String(i+1).padStart(2,'0') + '</span> ' + esc(PROGRAMA_ETAPAS_META[i][1]) + '</td>' +
         '<td>' + barraPct(p, '#17658d') + '</td><td>' + barraPct(r, '#25703c') + '</td><td class="num" style="color:' + (d < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (d > 0 ? '+' : '') + d + '</td><td style="font-size:11.5px">' + fmtCorta(e.s) + ' → ' + fmtCorta(e.f) + '</td></tr>';
  });
  h += '</tbody></table></div></div></div>';
  /* tabla de actividades */
  const f = PRG_UI.filtroAvance;
  let lista = act.filter(function(t){ const e = estadoActividad(t, corte).id; return f === 'todas' || (f === 'atrasadas' ? e === 'atrasada' : f === 'curso' ? (e === 'curso' || e === 'atrasada') : f === 'periodo' ? (prgMs(t.s) <= prgMs(corte) && prgMs(t.f) >= prgMs(corte) - 14*86400000) : e === f); });
  lista.sort(function(a, b){ return (pctReal(a) - pctPlan(a, corte)) - (pctReal(b) - pctPlan(b, corte)); });
  h += '<div class="card card-pad" style="margin-top:14px"><div class="toolbar"><h2 style="margin:0">Actividades</h2><span class="spacer"></span>' +
       [['atrasadas','Atrasadas'],['curso','En curso'],['periodo','Del periodo (±2 sem.)'],['completada','Completadas'],['todas','Todas']].map(function(o){ return '<button class="btn sm' + (f === o[0] ? ' primary' : '') + '" onclick="PRG_UI.filtroAvance=\'' + o[0] + '\';render()">' + o[1] + '</button>'; }).join('') + '</div>';
  if(!lista.length) h += '<div class="empty-state">Sin actividades en esta categoría a la fecha de corte.</div>';
  else {
    h += '<div class="tbl-wrap"><table><thead><tr><th>N°</th><th>Actividad</th><th>Etapa</th><th>Plan inicio → término</th><th>Plan</th><th>Real</th><th>Desv.</th><th>Estado</th><th></th></tr></thead><tbody>';
    lista.slice(0, 300).forEach(function(t){
      const p = pctPlanHoja(t, corte), r = pctRealHoja(t), d = Math.round((r - p) * 10) / 10, e = estadoActividad(t, corte);
      h += '<tr><td class="num">#' + esc(t.i) + '</td><td class="wrap"><a class="doclink" href="javascript:void 0" onclick="fichaActividad(\'' + t.u + '\')">' + esc(t.n) + '</a></td>' +
           '<td><span class="tag" style="background:' + colorEtapa(t) + ';color:#fff">' + String((PRG.etapaIdx[t.ph]||0)+1).padStart(2,'0') + '</span></td>' +
           '<td style="font-size:11.5px">' + fmtCorta(t.s) + ' → ' + fmtCorta(t.f) + '</td><td>' + barraPct(p, '#17658d') + '</td><td>' + barraPct(r, '#25703c') + '</td>' +
           '<td class="num" style="color:' + (d < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (d > 0 ? '+' : '') + d + '</td><td>' + pillEstado2(e) + '</td>' +
           '<td><button class="btn sm" onclick="formAvance(\'' + t.u + '\')">✎</button></td></tr>';
    });
    h += '</tbody></table></div>' + (lista.length > 300 ? '<p class="sub">Se muestran 300 de ' + lista.length + '.</p>' : '');
  }
  h += '</div>';
  return h;
}
function kpi(lab, val, nota, cls){ return '<div class="card kpi ' + (cls||'') + '"><div class="k-lab">' + esc(lab) + '</div><div class="k-val">' + val + '</div><div class="k-note">' + esc(nota) + '</div></div>'; }
function barraPct(p, col){ return '<div class="pbar" title="' + p + ' %"><div style="width:' + Math.max(0, Math.min(100, p)) + '%;background:' + col + '"></div><span>' + p + ' %</span></div>'; }
function exportarAvanceCSV(){
  const corte = fechaCorte();
  const filas = [['N°','EDT','Actividad','Etapa','Inicio plan','Término plan','Hito','Plan % (' + corte + ')','Real %','Desviación','Estado','Inicio real','Término real','Comentario','Registrado','Por']];
  PRG.hojas.forEach(function(t){ const a = avanceDe(t) || {}, p = pctPlanHoja(t, corte), r = pctRealHoja(t);
    filas.push([t.i, t.w, t.n, nombreEtapa(t), t.s.slice(0,10), t.f.slice(0,10), t.M ? 'Sí' : 'No', p, r, Math.round((r-p)*10)/10, estadoActividad(t, corte).label, a.inicioReal||'', a.finReal||'', a.comentario||'', a.fecha||'', a.por||'']); });
  const csv = '﻿' + filas.map(function(f){ return f.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(';'); }).join('\r\n');
  descargar('avance_programa_' + corte + '.csv', csv, 'text/csv;charset=utf-8');
}

/* ==================================================================
   5.3 HITOS CONTRACTUALES
   ================================================================== */
function renderHitos(){
  const corte = fechaCorte();
  const hitos = PRG.hitos.slice().sort(function(a, b){ return a.s.localeCompare(b.s); });
  const cumplidos = hitos.filter(function(t){ return estadoActividad(t, corte).id === 'completada'; }).length;
  const vencidos = hitos.filter(function(t){ return estadoActividad(t, corte).id === 'atrasada'; }).length;
  const prox = hitos.filter(function(t){ const e = estadoActividad(t, corte).id; return e === 'pendiente' && prgMs(t.s) - prgMs(corte) <= 30*86400000; }).length;
  let h = '<div class="page-title"><h1>5.3 Hitos contractuales y del programa</h1></div>' + prgNav('plan/hitos');
  h += '<div class="help"><b>¿Qué es esto?</b> Los ' + hitos.length + ' hitos del programa: los 10 de las Bases Técnicas (sección 15, cuadro de hitos: movilización día 30, sala eléctrica día 120, equipamiento día 150, tendido día 180, integración, parada de planta, puesta en marcha día 210, post-PEM y desmovilización día 365) y los hitos de inicio de contrato y de suministros. ' +
       'Un hito se marca cumplido con su fecha real desde la ficha (administrador). Vencido = fecha plan pasada sin cumplir a la fecha de corte.</div>';
  h += '<div class="grid kpis" style="margin-bottom:14px">' + kpi('Hitos', hitos.length, 'en el programa', '') + kpi('Cumplidos', cumplidos, 'con fecha real', 'good') + kpi('Vencidos', vencidos, 'a la fecha de corte ' + fmtFecha(corte), vencidos ? 'bad' : 'good') + kpi('Próximos 30 días', prox, 'pendientes por vencer', prox ? 'warn' : '') + '</div>';
  h += '<div class="card"><div class="timeline" style="padding:16px 18px 16px 30px">';
  hitos.forEach(function(t){
    const e = estadoActividad(t, corte), a = avanceDe(t), dias = Math.round((prgMs(t.s) - prgMs(corte)) / 86400000);
    const col = e.id === 'completada' ? 'var(--ok)' : e.id === 'atrasada' ? 'var(--bad)' : 'var(--accent)';
    h += '<div class="tl-item"><div class="tl-dot" style="border-color:' + col + '"></div><div class="tl-head">' +
         '<span class="tl-rev">' + fmtCorta(t.s) + '</span>' + pillEstado2(e) +
         '<span class="tag" style="background:' + colorEtapa(t) + ';color:#fff">' + esc(nombreEtapa(t)) + '</span>' +
         (e.id === 'pendiente' ? '<span class="sub" style="margin:0">' + (dias >= 0 ? 'faltan ' + dias + ' días' : '') + '</span>' : '') +
         (e.id === 'atrasada' ? '<span class="sub" style="margin:0;color:var(--bad)">vencido hace ' + Math.abs(dias) + ' días</span>' : '') +
         (a && a.finReal ? '<span class="sub" style="margin:0;color:var(--ok)">cumplido el ' + fmtFecha(a.finReal) + (a.finReal > t.s.slice(0,10) ? ' (+' + Math.round((prgMs(a.finReal) - prgMs(t.s))/86400000) + ' d)' : '') + '</span>' : '') +
         '<span class="spacer"></span><button class="btn sm" onclick="fichaActividad(\'' + t.u + '\')">Ficha</button> <button class="btn sm" onclick="formAvance(\'' + t.u + '\')">✎</button></div>' +
         '<div><a class="doclink" href="javascript:void 0" onclick="fichaActividad(\'' + t.u + '\')">#' + esc(t.i) + ' ' + esc(t.n) + '</a>' + (a && a.comentario ? '<div class="sub" style="margin:4px 0 0">' + esc(a.comentario) + '</div>' : '') + '</div></div>';
  });
  h += '</div></div>';
  return h;
}

/* ==================================================================
   5.4 RESTRICCIONES Y DESVIACIONES
   ================================================================== */
function renderRestricciones(){
  const R = DB.programa.restricciones.slice().sort(function(a, b){ return (b.fecha||'').localeCompare(a.fecha||''); });
  const abiertas = R.filter(function(r){ return r.estado !== 'Cerrada'; });
  const diasAbiertos = abiertas.reduce(function(s, r){ return s + (Number(r.diasImpacto)||0); }, 0);
  let h = '<div class="page-title"><h1>5.4 Restricciones y desviaciones</h1></div>' + prgNav('plan/restricciones');
  h += '<div class="help"><b>¿Qué es esto?</b> Registro de todo lo que impide cumplir el programa: restricciones (accesos, permisos, suministros, ingeniería), desviaciones de plazo y cambios de alcance, con la actividad afectada, el impacto estimado en días, el responsable y la acción acordada. ' +
       'Es la base del informe semanal y de las cartas de aviso al mandante. Lo registra el administrador.</div>';
  h += '<div class="grid kpis" style="margin-bottom:14px">' + kpi('Abiertas', abiertas.length, 'restricciones sin cerrar', abiertas.length ? 'warn' : 'good') + kpi('Impacto acumulado', diasAbiertos + ' d', 'días estimados (abiertas)', diasAbiertos ? 'bad' : '') + kpi('Cerradas', R.length - abiertas.length, 'resueltas', '') + '</div>';
  h += '<div class="toolbar"><button class="btn primary" onclick="formRestriccion()">+ Nueva restricción / desviación</button><button class="btn" onclick="exportarRestrCSV()">↓ Exportar CSV</button></div>';
  if(!R.length) h += '<div class="card"><div class="empty-state"><div class="big">✔</div>Sin restricciones registradas.</div></div>';
  else {
    h += '<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Actividad afectada</th><th>Impacto</th><th class="num">Días</th><th>Responsable</th><th>Acción</th><th>Estado</th><th></th></tr></thead><tbody>';
    R.forEach(function(r){
      const t = PRG.porUID[r.actividad];
      h += '<tr><td>' + fmtFecha(r.fecha) + '</td><td>' + esc(r.tipo) + '</td><td class="wrap">' + esc(r.descripcion) + '</td>' +
           '<td class="wrap">' + (t ? '<a class="doclink" href="javascript:void 0" onclick="fichaActividad(\'' + t.u + '\')">#' + esc(t.i) + ' ' + esc(recorta(t.n, 50)) + '</a>' : '—') + '</td>' +
           '<td>' + esc(r.impacto) + '</td><td class="num">' + (r.diasImpacto || '—') + '</td><td>' + esc(r.responsable || '—') + '</td><td class="wrap">' + esc(r.accion || '—') + '</td>' +
           '<td>' + pill(r.estado === 'Cerrada' ? 'ok' : r.estado === 'En gestión' ? 'warn' : 'bad', r.estado + (r.fechaCierre ? ' ' + fmtFecha(r.fechaCierre) : '')) + '</td>' +
           '<td style="white-space:nowrap"><button class="btn sm" onclick="formRestriccion(\'' + r.id + '\')">Editar</button> <button class="btn sm danger" onclick="eliminarRestriccion(\'' + r.id + '\')">✕</button></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  return h;
}
function formRestriccion(id){
  const r = DB.programa.restricciones.filter(function(x){ return x.id === id; })[0] || { fecha:hoyISO(), tipo:'Restricción', descripcion:'', actividad:'', impacto:'Plazo', diasImpacto:0, responsable:'', accion:'', estado:'Abierta', fechaCierre:'' };
  const opAct = '<option value="">— Sin actividad específica —</option>' + PROGRAMA_TAREAS.filter(function(t){ return !t.S; }).map(function(t){ return '<option value="' + t.u + '"' + (r.actividad === t.u ? ' selected' : '') + '>#' + t.i + ' ' + esc(recorta(t.n, 70)) + '</option>'; }).join('');
  abrirModal(
    '<div class="modal-head"><h2>' + (id ? 'Editar' : 'Nueva') + ' restricción / desviación</h2><button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body"><div class="fgrid">' +
      '<div class="field"><label class="f">Fecha de detección</label><input class="inp" id="rFecha" type="date" value="' + attr(r.fecha) + '"></div>' +
      '<div class="field"><label class="f">Tipo</label><select class="inp" id="rTipo">' + opciones(TIPOS_RESTR, r.tipo) + '</select></div>' +
      '<div class="field"><label class="f">Impacto principal</label><select class="inp" id="rImp">' + opciones(['Plazo','Costo','Seguridad','Calidad','Alcance'], r.impacto) + '</select></div>' +
      '<div class="field"><label class="f">Días de impacto estimados</label><input class="inp" id="rDias" type="number" min="0" value="' + attr(r.diasImpacto) + '"></div>' +
      '<div class="field"><label class="f">Responsable de la gestión</label><input class="inp" id="rResp" value="' + attr(r.responsable) + '"></div>' +
      '<div class="field"><label class="f">Estado</label><select class="inp" id="rEst">' + opciones(EST_RESTR, r.estado) + '</select></div>' +
      '<div class="field"><label class="f">Fecha de cierre</label><input class="inp" id="rCierre" type="date" value="' + attr(r.fechaCierre) + '"></div>' +
    '</div>' +
    '<div class="field"><label class="f">Actividad del programa afectada</label><select class="inp" id="rAct">' + opAct + '</select></div>' +
    '<div class="field"><label class="f">Descripción</label><textarea class="inp" id="rDesc">' + esc(r.descripcion) + '</textarea></div>' +
    '<div class="field"><label class="f">Acción acordada / plan de recuperación</label><textarea class="inp" id="rAcc">' + esc(r.accion) + '</textarea></div>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primary" onclick="guardarRestriccion(\'' + (id||'') + '\')">Guardar</button></div>');
}
function guardarRestriccion(id){
  const desc = valorCampo('rDesc').trim(); if(!desc){ toast('Describa la restricción.', 'bad'); return; }
  const obj = { id: id || uid(), fecha:valorCampo('rFecha'), tipo:valorCampo('rTipo'), descripcion:desc, actividad:valorCampo('rAct'), impacto:valorCampo('rImp'),
                diasImpacto:Number(valorCampo('rDias'))||0, responsable:valorCampo('rResp'), accion:valorCampo('rAcc'), estado:valorCampo('rEst'), fechaCierre:valorCampo('rCierre') };
  if(obj.estado === 'Cerrada' && !obj.fechaCierre) obj.fechaCierre = hoyISO();
  const i = DB.programa.restricciones.map(function(x){ return x.id; }).indexOf(obj.id);
  if(i >= 0) DB.programa.restricciones[i] = obj; else DB.programa.restricciones.push(obj);
  guardarPrograma(); cerrarModal(); render(); toast('Restricción guardada.', 'ok');
}
function eliminarRestriccion(id){
  confirmar('Eliminar restricción', '<p>¿Eliminar este registro? No se puede deshacer.</p>', function(){
    DB.programa.restricciones = DB.programa.restricciones.filter(function(x){ return x.id !== id; }); guardarPrograma(); render(); toast('Registro eliminado.', 'ok');
  });
}
function exportarRestrCSV(){
  const filas = [['Fecha','Tipo','Descripción','Actividad','Impacto','Días','Responsable','Acción','Estado','Cierre']];
  DB.programa.restricciones.forEach(function(r){ const t = PRG.porUID[r.actividad]; filas.push([r.fecha, r.tipo, r.descripcion, t ? '#' + t.i + ' ' + t.n : '', r.impacto, r.diasImpacto, r.responsable, r.accion, r.estado, r.fechaCierre]); });
  descargar('restricciones_' + hoyISO() + '.csv', '﻿' + filas.map(function(f){ return f.map(function(c){ return '"' + String(c==null?'':c).replace(/"/g,'""') + '"'; }).join(';'); }).join('\r\n'), 'text/csv;charset=utf-8');
}

/* ==================================================================
   5.5 INFORME SEMANAL
   ================================================================== */
function renderInforme(){
  const corte = fechaCorte(), plan = totalPlan(corte), real = totalReal(), desv = Math.round((real - plan) * 10) / 10;
  const semIni = prgISO(new Date(prgMs(corte) - 6*86400000));
  const act = PRG.hojas.filter(function(t){ return !t.M; });
  const atrasadas = act.filter(function(t){ return estadoActividad(t, corte).id === 'atrasada'; }).sort(function(a,b){ return (pctReal(a)-pctPlan(a,corte)) - (pctReal(b)-pctPlan(b,corte)); });
  const enCurso = act.filter(function(t){ return estadoActividad(t, corte).id === 'curso'; });
  const cerradas = act.filter(function(t){ const a = avanceDe(t); return a && a.pct >= 100 && a.fecha >= semIni; });
  const proxHitos = PRG.hitos.filter(function(t){ const e = estadoActividad(t, corte).id; return e !== 'completada' && prgMs(t.s) <= prgMs(corte) + 28*86400000; }).sort(function(a,b){ return a.s.localeCompare(b.s); });
  const prox2 = act.filter(function(t){ const e = estadoActividad(t, corte).id; return e === 'pendiente' && prgMs(t.s) > prgMs(corte) && prgMs(t.s) <= prgMs(corte) + 14*86400000; }).sort(function(a,b){ return a.s.localeCompare(b.s); });
  const restr = DB.programa.restricciones.filter(function(r){ return r.estado !== 'Cerrada'; });
  const c = DB.contrato;
  let h = '<div class="page-title"><h1>5.5 Informe semanal de avance</h1></div>' + prgNav('plan/informe');
  h += '<div class="help no-print"><b>¿Qué es esto?</b> Resumen listo para la reunión semanal con el mandante, generado con los datos registrados: avance plan vs. real a la fecha de corte, actividades atrasadas y en curso, hitos próximos, restricciones abiertas y lo que viene en las próximas dos semanas. ' +
       'Use <b>Imprimir / PDF</b> para emitirlo.</div>';
  h += '<div class="toolbar no-print"><button class="btn primary" onclick="window.print()">🖨 Imprimir / guardar PDF</button><span class="spacer"></span><span style="font-size:12px;color:var(--text-2)">Fecha de corte: ' + fmtFecha(corte) + ' (se cambia en 5.2)</span></div>';
  h += '<div class="card card-pad informe">';
  h += '<div class="inf-cab"><div><div class="sub" style="margin:0">' + esc(c.contratista) + ' · Oficina Técnica</div><h2 style="font-size:17px;margin:2px 0">Informe semanal de avance — ' + esc(c.proyecto) + '</h2><div class="sub" style="margin:0">' + esc(c.mandante) + (c.nContrato ? ' · Contrato ' + esc(c.nContrato) : '') + ' · Semana ' + fmtFecha(semIni) + ' al ' + fmtFecha(corte) + '</div></div>' +
       '<div style="text-align:right"><div class="sub" style="margin:0">Avance real</div><div style="font-size:30px;font-weight:700;color:' + (desv < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + real + ' %</div><div class="sub" style="margin:0">plan ' + plan + ' % · desv. ' + (desv > 0 ? '+' : '') + desv + ' pts</div></div></div>';
  h += '<div class="grid cols2" style="margin-top:12px"><div>' + svgCurvaS() + '</div><div>' +
       '<h3>Avance por etapa</h3><table style="font-size:12px"><thead><tr><th>Etapa</th><th>Plan</th><th>Real</th></tr></thead><tbody>' +
       PRG.etapas.map(function(e, i){ const p = pctPlan(e, corte), r = pctReal(e); if(!p && !r) return ''; return '<tr><td class="wrap">' + String(i+1).padStart(2,'0') + ' ' + esc(PROGRAMA_ETAPAS_META[i][1]) + '</td><td>' + barraPct(p, '#17658d') + '</td><td>' + barraPct(r, '#25703c') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  h += '<div class="sec"><h3>1. Actividades atrasadas (' + atrasadas.length + ')</h3>' + (atrasadas.length ? '<table style="font-size:12px"><thead><tr><th>N°</th><th>Actividad</th><th>Plan término</th><th>Plan %</th><th>Real %</th><th>Comentario</th></tr></thead><tbody>' +
       atrasadas.slice(0, 40).map(function(t){ const a = avanceDe(t)||{}; return '<tr><td>#' + esc(t.i) + '</td><td class="wrap">' + esc(t.n) + '</td><td>' + fmtCorta(t.f) + '</td><td>' + pctPlanHoja(t, corte) + '</td><td>' + pctRealHoja(t) + '</td><td class="wrap">' + esc(a.comentario||'') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="sub">Sin atrasos a la fecha de corte.</p>') + '</div>';
  h += '<div class="sec"><h3>2. Actividades en curso (' + enCurso.length + ') y cerradas en la semana (' + cerradas.length + ')</h3>' +
       (enCurso.length ? '<ul class="wip-list">' + enCurso.slice(0, 40).map(function(t){ return '<li>#' + esc(t.i) + ' ' + esc(t.n) + ' — ' + pctRealHoja(t) + ' % (plan ' + pctPlanHoja(t, corte) + ' %)</li>'; }).join('') + '</ul>' : '<p class="sub">Sin actividades en curso registradas.</p>') +
       (cerradas.length ? '<p style="font-size:12.5px;margin:8px 0 0"><b>Cerradas esta semana:</b> ' + cerradas.map(function(t){ return '#' + esc(t.i) + ' ' + esc(t.n); }).join('; ') + '.</p>' : '') + '</div>';
  h += '<div class="sec"><h3>3. Hitos próximos y vencidos</h3>' + (proxHitos.length ? '<ul class="wip-list">' + proxHitos.map(function(t){ const e = estadoActividad(t, corte); return '<li>' + fmtCorta(t.s) + ' — #' + esc(t.i) + ' ' + esc(t.n) + ' ' + pillEstado2(e) + '</li>'; }).join('') + '</ul>' : '<p class="sub">Sin hitos en las próximas 4 semanas.</p>') + '</div>';
  h += '<div class="sec"><h3>4. Restricciones y desviaciones abiertas (' + restr.length + ')</h3>' + (restr.length ? '<table style="font-size:12px"><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Impacto</th><th>Responsable</th><th>Acción</th></tr></thead><tbody>' +
       restr.map(function(r){ return '<tr><td>' + fmtFecha(r.fecha) + '</td><td>' + esc(r.tipo) + '</td><td class="wrap">' + esc(r.descripcion) + '</td><td>' + esc(r.impacto) + (r.diasImpacto ? ' · ' + r.diasImpacto + ' d' : '') + '</td><td>' + esc(r.responsable||'') + '</td><td class="wrap">' + esc(r.accion||'') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="sub">Sin restricciones abiertas.</p>') + '</div>';
  h += '<div class="sec"><h3>5. Próximas dos semanas — actividades que inician (' + prox2.length + ')</h3>' + (prox2.length ? '<ul class="wip-list">' + prox2.slice(0, 40).map(function(t){ return '<li>' + fmtCorta(t.s) + ' — #' + esc(t.i) + ' ' + esc(t.n) + (t.r && t.r.length ? ' <span class="sub" style="display:inline">(' + esc(t.r.join(', ')) + ')</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="sub">Sin inicios programados en el periodo.</p>') + '</div>';
  h += '<div class="sec" style="font-size:11.5px;color:var(--text-3)">Fuente: ' + esc(PROGRAMA_META.fuente) + ' (guardado ' + fmtCorta(PROGRAMA_META.guardado) + '). Avance plan ponderado por horas de trabajo; avance real según registros de la oficina técnica. Emitido ' + fmtFecha(hoyISO()) + (c.jefeOT ? ' · ' + esc(c.jefeOT) : '') + '.</div>';
  h += '</div>';
  return h;
}
