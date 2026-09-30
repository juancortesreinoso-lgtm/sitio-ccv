/* ==================================================================
   ===============  VISTA 1.4 — ESTADÍSTICAS DE INGENIERÍA  =========
   ==================================================================
   Tarjetas KPI y gráficos dibujados con SVG nativo (sin librerías).
   Todo se calcula desde la base; no requiere carga manual.
   ================================================================== */

/* Paleta de series para gráficos (coherente con la paleta de la app) */
const SERIE = ['#12507e','#2f8f83','#9a6205','#6b4fa0','#b3261e','#2e7d46','#5b6672','#a8562a','#1a6ba8'];

function kpi(label, valor, nota, cls){
  return '<div class="card kpi ' + (cls || '') + '">' +
    '<div class="k-lab">' + esc(label) + '</div>' +
    '<div class="k-val">' + valor + '</div>' +
    (nota ? '<div class="k-note">' + esc(nota) + '</div>' : '') + '</div>';
}

/* --- Agrupaciones --- */
function agrupar(lista, fn){
  const m = {};
  lista.forEach(function(x){ const k = fn(x) || '—'; m[k] = (m[k] || 0) + 1; });
  return m;
}

/* --- Gráfico de barras horizontales --- */
function barrasH(mapa, opciones){
  opciones = opciones || {};
  const claves = Object.keys(mapa).filter(function(k){ return mapa[k] > 0 || opciones.mostrarCeros; });
  if(!claves.length) return '<div class="empty-state">Sin datos suficientes.</div>';
  claves.sort(function(a,b){ return mapa[b] - mapa[a]; });

  const max = Math.max.apply(null, claves.map(function(k){ return mapa[k]; })) || 1;
  const filaH = 26, gap = 6, labW = 172, padR = 46;
  const w = 560, h = claves.length * (filaH + gap) + 6;
  let s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + attr(opciones.titulo || 'Gráfico de barras') + '">';
  claves.forEach(function(k, i){
    const y = i * (filaH + gap);
    const ancho = Math.max(2, (w - labW - padR) * (mapa[k] / max));
    const color = opciones.colores && opciones.colores[k] ? opciones.colores[k] : SERIE[i % SERIE.length];
    s += '<text x="0" y="' + (y + filaH/2 + 4) + '" font-size="11.5" fill="var(--text-2)">' + esc(recorta(k, 26)) + '</text>';
    s += '<rect x="' + labW + '" y="' + y + '" width="' + (w - labW - padR) + '" height="' + filaH + '" rx="4" fill="var(--surface-2)"/>';
    s += '<rect x="' + labW + '" y="' + y + '" width="' + ancho + '" height="' + filaH + '" rx="4" fill="' + color + '"/>';
    s += '<text x="' + (w - padR + 8) + '" y="' + (y + filaH/2 + 4) + '" font-size="11.5" font-weight="600" fill="var(--text)">' +
         esc(opciones.formato ? opciones.formato(mapa[k]) : mapa[k]) + '</text>';
  });
  return s + '</svg>';
}

/* --- Gráfico de dona --- */
function dona(mapa, colores){
  const claves = Object.keys(mapa).filter(function(k){ return mapa[k] > 0; });
  const total = claves.reduce(function(a,k){ return a + mapa[k]; }, 0);
  if(!total) return '<div class="empty-state">Sin datos suficientes.</div>';

  const cx = 110, cy = 110, rExt = 96, rInt = 58;
  let ang = -Math.PI/2, s = '<svg class="chart" viewBox="0 0 220 220" style="max-width:240px;margin:0 auto" role="img" aria-label="Distribución por estado">';
  claves.forEach(function(k, i){
    const frac = mapa[k] / total;
    const a2 = ang + frac * Math.PI * 2;
    const grande = frac > 0.5 ? 1 : 0;
    const color = (colores && colores[k]) || SERIE[i % SERIE.length];
    if(frac >= 0.9999){
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rExt+rInt)/2) + '" fill="none" stroke="' + color + '" stroke-width="' + (rExt-rInt) + '"/>';
    }else{
      const x1 = cx + rExt*Math.cos(ang),  y1 = cy + rExt*Math.sin(ang);
      const x2 = cx + rExt*Math.cos(a2),   y2 = cy + rExt*Math.sin(a2);
      const x3 = cx + rInt*Math.cos(a2),   y3 = cy + rInt*Math.sin(a2);
      const x4 = cx + rInt*Math.cos(ang),  y4 = cy + rInt*Math.sin(ang);
      s += '<path d="M' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
           ' A' + rExt + ' ' + rExt + ' 0 ' + grande + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
           ' L' + x3.toFixed(2) + ' ' + y3.toFixed(2) +
           ' A' + rInt + ' ' + rInt + ' 0 ' + grande + ' 0 ' + x4.toFixed(2) + ' ' + y4.toFixed(2) + ' Z" fill="' + color + '"/>';
    }
    ang = a2;
  });
  s += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="26" font-weight="650" fill="var(--text)">' + total + '</text>';
  s += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" fill="var(--text-2)">documentos</text>';
  s += '</svg>';

  s += '<div class="legend">' + claves.map(function(k, i){
    const color = (colores && colores[k]) || SERIE[i % SERIE.length];
    return '<span><i style="background:' + color + '"></i>' + esc(k) + ' · <b>' + mapa[k] + '</b> (' +
           Math.round(mapa[k]/total*100) + '%)</span>';
  }).join('') + '</div>';
  return s;
}

/* --- Curva acumulada de recepción por mes --- */
function curvaAcumulada(){
  const porMes = {};
  DB.documentos.forEach(function(d){
    d.revisiones.forEach(function(r){
      if(!r.fechaRecepcion) return;
      const k = r.fechaRecepcion.slice(0,7);
      porMes[k] = (porMes[k] || 0) + 1;
    });
  });
  const meses = Object.keys(porMes).sort();
  if(meses.length < 2) return '<div class="empty-state">Se necesitan al menos dos meses con recepciones para trazar la curva.</div>';

  let acum = 0;
  const puntos = meses.map(function(m){ acum += porMes[m]; return { mes:m, mensual:porMes[m], acum:acum }; });
  const max = acum;

  const w = 620, h = 240, padL = 40, padR = 14, padT = 14, padB = 34;
  const gw = w - padL - padR, gh = h - padT - padB;
  const x = function(i){ return padL + (puntos.length === 1 ? gw/2 : gw * i / (puntos.length - 1)); };
  const y = function(v){ return padT + gh - gh * (v / max); };

  let s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Curva acumulada de recepción de documentos">';
  /* grilla horizontal */
  for(let g=0; g<=4; g++){
    const v = max * g / 4, yy = y(v);
    s += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (w-padR) + '" y2="' + yy.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
    s += '<text x="' + (padL-6) + '" y="' + (yy+4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="var(--text-3)">' + Math.round(v) + '</text>';
  }
  /* barras mensuales */
  const bw = Math.min(26, gw / puntos.length * 0.5);
  puntos.forEach(function(p, i){
    const hh = gh * (p.mensual / max);
    s += '<rect x="' + (x(i) - bw/2).toFixed(1) + '" y="' + (padT + gh - hh).toFixed(1) + '" width="' + bw.toFixed(1) +
         '" height="' + Math.max(1, hh).toFixed(1) + '" rx="2" fill="var(--surface-3)"><title>' +
         esc(mesEtiqueta(p.mes + '-01')) + ': ' + p.mensual + ' recepción(es)</title></rect>';
  });
  /* línea acumulada */
  const d = puntos.map(function(p,i){ return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.acum).toFixed(1); }).join(' ');
  s += '<path d="' + d + '" fill="none" stroke="' + SERIE[0] + '" stroke-width="2.4" stroke-linejoin="round"/>';
  puntos.forEach(function(p,i){
    s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.acum).toFixed(1) + '" r="3.6" fill="var(--surface)" stroke="' + SERIE[0] + '" stroke-width="2"><title>' +
         esc(mesEtiqueta(p.mes + '-01')) + ': ' + p.acum + ' acumulado(s)</title></circle>';
    s += '<text x="' + x(i).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle" font-size="10.5" fill="var(--text-3)">' +
         esc(mesEtiqueta(p.mes + '-01')) + '</text>';
  });
  s += '</svg>';
  s += '<div class="legend"><span><i style="background:' + SERIE[0] + '"></i>Acumulado de recepciones</span>' +
       '<span><i style="background:var(--surface-3)"></i>Recepciones del mes</span></div>';
  return s;
}

/* --- Tiempo promedio de revisión por disciplina --- */
function promedioPorDisciplina(){
  const suma = {}, cuenta = {};
  DB.documentos.forEach(function(d){
    d.revisiones.forEach(function(r){
      if(!r.fechaRecepcion || !r.fechaRespuesta) return;
      const dd = dias(r.fechaRecepcion, r.fechaRespuesta);
      if(dd == null) return;
      suma[d.disciplina]   = (suma[d.disciplina]   || 0) + dd;
      cuenta[d.disciplina] = (cuenta[d.disciplina] || 0) + 1;
    });
  });
  const prom = {};
  Object.keys(suma).forEach(function(k){ prom[k] = Math.round(suma[k] / cuenta[k] * 10) / 10; });
  return prom;
}

function renderEstadisticas(){
  const docs = DB.documentos;
  const total = docs.length;
  const aprobados  = docs.filter(function(d){ const e = revActual(d).estado; return e === 'aprobado' || e === 'aprobcom'; }).length;
  const enRevision = docs.filter(function(d){ const e = revActual(d).estado; return e === 'revision' || e === 'recibido'; }).length;
  const conCom     = docs.filter(function(d){ return comentariosAbiertos(d) > 0; }).length;
  const vencidos   = docs.filter(estaVencido).length;
  const avance     = total ? Math.round(aprobados / total * 100) : 0;

  let html = '';
  html += '<div class="page-title"><h1>1.4 Estadísticas de ingeniería</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.stats + '</div>';

  html += '<div class="grid kpis" style="margin-bottom:16px">' +
    kpi('Documentos recibidos', total, 'Revisión vigente de cada documento', '') +
    kpi('Aprobados', aprobados, 'Incluye aprobados con comentarios', aprobados ? 'good' : '') +
    kpi('En revisión', enRevision, 'Recibidos y en revisión', '') +
    kpi('Con comentarios abiertos', conCom, 'Documentos con ciclo sin cerrar', conCom ? 'warn' : 'good') +
    kpi('Vencidos en plazo', vencidos, 'Superaron el plazo comprometido', vencidos ? 'bad' : 'good') +
    kpi('Avance de revisión', avance + '%', 'Aprobados / total recibidos', avance >= 80 ? 'good' : avance >= 50 ? 'warn' : '') +
  '</div>';

  /* barra de avance */
  html += '<div class="card card-pad" style="margin-bottom:16px">' +
    '<h2>Avance de revisión de la ingeniería recibida</h2>' +
    '<div style="background:var(--surface-2);border-radius:6px;height:22px;overflow:hidden;position:relative">' +
      '<div style="width:' + avance + '%;height:100%;background:' + SERIE[0] + '"></div>' +
      '<span style="position:absolute;inset:0;display:grid;place-items:center;font-size:12px;font-weight:650">' +
        avance + '% · ' + aprobados + ' de ' + total + ' documentos aprobados</span>' +
    '</div></div>';

  /* distribución por disciplina y por estado */
  const porDisc = agrupar(docs, function(d){ return d.disciplina; });
  const coloresEstado = {};
  ESTADOS_REV.forEach(function(e){ coloresEstado[e.label] = e.color; });
  const porEstado = agrupar(docs, function(d){ return estadoInfo(revActual(d).estado).label; });

  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>Distribución por disciplina</h2>' + barrasH(porDisc, { titulo:'Documentos por disciplina' }) + '</div>' +
    '<div class="card card-pad"><h2>Distribución por estado de revisión</h2>' + dona(porEstado, coloresEstado) + '</div>' +
  '</div>';

  /* curva acumulada */
  html += '<div class="card card-pad" style="margin-bottom:16px">' +
    '<h2>Curva acumulada de recepción de documentos</h2>' +
    '<p class="sub" style="margin-bottom:8px">Considera todas las revisiones recibidas, no solo la vigente.</p>' +
    curvaAcumulada() + '</div>';

  /* tiempos de revisión */
  const prom = promedioPorDisciplina();
  const unidad = DB.params.usarDiasHabiles ? 'días hábiles' : 'días corridos';
  html += '<div class="card card-pad">' +
    '<h2>Tiempo promedio de revisión por disciplina</h2>' +
    '<p class="sub" style="margin-bottom:8px">Desde la recepción hasta la devolución, en ' + unidad +
    '. Solo considera revisiones ya respondidas. Plazo comprometido: <b>' + DB.params.plazoRevisionDias + ' días</b>.</p>' +
    barrasH(prom, { formato: function(v){ return v + ' d'; },
                    colores: (function(){ const c = {}; Object.keys(prom).forEach(function(k){
                      c[k] = prom[k] > DB.params.plazoRevisionDias ? '#b3261e' : '#2e7d46'; }); return c; })() }) +
  '</div>';

  return html;
}

/* ==================================================================
   ===============    VISTA 00 — PANEL DE CONTROL     ===============
   ================================================================== */

function renderDashboard(){
  const docs = DB.documentos;
  const ct = DB.contrato;
  const total = docs.length;
  const aprobados = docs.filter(function(d){ const e = revActual(d).estado; return e === 'aprobado' || e === 'aprobcom'; }).length;
  const vencidos  = docs.filter(estaVencido);
  const bloqueados = docsConAltasAbiertas();
  const discrep = docsConDiscrepancias();
  const avance = total ? Math.round(aprobados / total * 100) : 0;

  let html = '';
  html += '<div class="page-title"><h1>Panel de Control</h1></div>';
  html += '<p class="sub">' + esc(ct.proyecto) + ' · ' + esc(ct.mandante) + '</p>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.dashboard + '</div>';

  /* cabecera del contrato */
  html += '<div class="card card-pad" style="margin-bottom:16px">' +
    '<h2>Identificación del contrato</h2>' +
    '<dl class="dl">' +
      fila('Proyecto', esc(ct.proyecto)) +
      fila('Mandante', esc(ct.mandante)) +
      fila('Contratista / Oficina Técnica', esc(ct.contratista)) +
      fila('N° de contrato', ct.nContrato ? esc(ct.nContrato) : '<span style="color:var(--text-3)">por completar en el Módulo 09</span>') +
      fila('ODS', ct.ods ? esc(ct.ods) : '<span style="color:var(--text-3)">por completar</span>') +
      fila('Plazo del contrato', (ct.fechaInicio || ct.fechaTermino)
          ? (fmtFecha(ct.fechaInicio) + ' → ' + fmtFecha(ct.fechaTermino)) : '<span style="color:var(--text-3)">por completar</span>') +
      fila('Administrador de contrato', ct.adminContrato ? esc(ct.adminContrato) : '<span style="color:var(--text-3)">por completar</span>') +
      fila('Jefe de oficina técnica', ct.jefeOT ? esc(ct.jefeOT) : '<span style="color:var(--text-3)">por completar</span>') +
      fila('Jefe de calidad', ct.jefeCalidad ? esc(ct.jefeCalidad) : '<span style="color:var(--text-3)">por completar</span>') +
    '</dl></div>';

  html += '<div class="grid kpis" style="margin-bottom:16px">' +
    kpi('Ingeniería recibida', total, 'Documentos en la matriz', '') +
    kpi('Avance de revisión', avance + '%', aprobados + ' aprobados', avance >= 80 ? 'good' : avance >= 50 ? 'warn' : '') +
    kpi('Comentarios abiertos', totalComentariosAbiertos(), 'En todo el contrato', totalComentariosAbiertos() ? 'warn' : 'good') +
    kpi('Documentos vencidos', vencidos.length, 'Fuera del plazo comprometido', vencidos.length ? 'bad' : 'good') +
    kpi('Bloqueados para construcción', bloqueados.length, 'Con criticidad Alta abierta', bloqueados.length ? 'bad' : 'good') +
    kpi('Discrepancias en terreno', discrepanciasAbiertas(), 'Sin resolver', discrepanciasAbiertas() ? 'bad' : 'good') +
  '</div>';

  /* alertas accionables */
  html += '<div class="grid cols2">';

  html += '<div class="card card-pad"><h2>Documentos vencidos en plazo de revisión</h2>';
  if(!vencidos.length){ html += '<p class="sub" style="margin:0">Ningún documento excede el plazo comprometido.</p>'; }
  else{
    html += '<div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Código</th><th style="cursor:default">Rev.</th>' +
            '<th style="cursor:default">Revisor</th><th style="cursor:default">Semáforo</th><th style="cursor:default"></th></tr></thead><tbody>';
    vencidos.forEach(function(d){
      const s = semaforo(d);
      html += '<tr><td><span class="mono">' + esc(d.codigo) + '</span></td><td>' + esc(revActual(d).rev) + '</td>' +
              '<td>' + esc(revActual(d).revisor || '—') + '</td><td>' + pill(s.cls, s.label) + '</td>' +
              '<td><button class="btn sm" onclick="fichaDocumento(\'' + d.id + '\')">Ficha</button></td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '<div class="card card-pad"><h2>Bloqueados para liberación a construcción</h2>';
  if(!bloqueados.length){ html += '<p class="sub" style="margin:0">Ningún documento tiene comentarios de criticidad Alta abiertos.</p>'; }
  else{
    html += '<div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Código</th><th style="cursor:default">Disciplina</th>' +
            '<th style="cursor:default">Altas abiertas</th><th style="cursor:default"></th></tr></thead><tbody>';
    bloqueados.forEach(function(d){
      html += '<tr><td><span class="mono">' + esc(d.codigo) + '</span></td><td>' + esc(d.disciplina) + '</td>' +
              '<td>' + pill('bad', altasAbiertas(d) + ' comentario(s)') + '</td>' +
              '<td><button class="btn sm" onclick="verRevisiones(\'' + d.id + '\')">Ver comentarios</button></td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '<div class="card card-pad"><h2>Discrepancias de terreno sin resolver</h2>';
  if(!discrep.length){ html += '<p class="sub" style="margin:0">Sin discrepancias abiertas entre ingeniería y terreno.</p>'; }
  else{
    html += '<div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Código</th><th style="cursor:default">Área</th>' +
            '<th style="cursor:default">RFI</th><th style="cursor:default">Sin resolver</th><th style="cursor:default"></th></tr></thead><tbody>';
    discrep.forEach(function(d){
      const ab = d.terreno.discrepancias.filter(function(x){ return !x.resuelta; }).length;
      html += '<tr><td><span class="mono">' + esc(d.codigo) + '</span></td><td>' + esc(d.area || '—') + '</td>' +
              '<td><span class="mono">' + esc(d.terreno.rfiNumero || '—') + '</span></td>' +
              '<td>' + pill('bad', ab) + '</td>' +
              '<td><button class="btn sm" onclick="verTerreno(\'' + d.id + '\')">Gestionar</button></td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '<div class="card card-pad"><h2>Últimas recepciones</h2>';
  const ultimos = docs.slice().sort(function(a,b){
    return str(revActual(b).fechaRecepcion).localeCompare(str(revActual(a).fechaRecepcion));
  }).slice(0, 6);
  if(!ultimos.length){ html += '<p class="sub" style="margin:0">Todavía no hay documentos registrados.</p>'; }
  else{
    html += '<div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Fecha</th><th style="cursor:default">Código</th>' +
            '<th style="cursor:default">Rev.</th><th style="cursor:default">Estado</th></tr></thead><tbody>';
    ultimos.forEach(function(d){
      const r = revActual(d);
      html += '<tr><td>' + fmtFecha(r.fechaRecepcion) + '</td><td><span class="mono">' + esc(d.codigo) + '</span></td>' +
              '<td>' + esc(r.rev) + '</td><td>' + pillEstado(r.estado) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

/* ==================================================================
   ===============  VISTA 09 — CONFIGURACIÓN DEL CONTRATO  ==========
   ==================================================================
   Ningún dato de cabecera está fijo en el código: todo se edita aquí
   y se refleja en el resto de la aplicación.
   ================================================================== */

function renderConfig(){
  const c = DB.contrato, p = DB.params;
  let html = '';
  html += '<div class="page-title"><h1>09 — Configuración del Contrato</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.config + '</div>';

  html += '<div class="card card-pad" style="margin-bottom:14px;max-width:1000px">' +
    '<h2>Datos de cabecera</h2>' +
    '<div class="fgrid">' +
      campo('cProyecto', 'Proyecto', '<input class="inp" id="cProyecto" value="' + attr(c.proyecto) + '">', '') +
      campo('cMandante', 'Mandante', '<input class="inp" id="cMandante" value="' + attr(c.mandante) + '">', '') +
      campo('cContratista', 'Contratista / Oficina Técnica', '<input class="inp" id="cContratista" value="' + attr(c.contratista) + '">', '') +
      campo('cNContrato', 'N° de contrato', '<input class="inp" id="cNContrato" value="' + attr(c.nContrato) + '" placeholder="4600027889">', '') +
      campo('cOds', 'N° de ODS / orden de servicio', '<input class="inp" id="cOds" value="' + attr(c.ods) + '" placeholder="ODS-69">', '') +
      campo('cIni', 'Fecha de inicio', '<input class="inp" id="cIni" type="date" value="' + attr(c.fechaInicio) + '">', '') +
      campo('cTer', 'Fecha de término', '<input class="inp" id="cTer" type="date" value="' + attr(c.fechaTermino) + '">', '') +
      campo('cAdmin', 'Administrador de contrato', '<input class="inp" id="cAdmin" value="' + attr(c.adminContrato) + '">', 'Responsable contractual ante el mandante.') +
      campo('cJefeOT', 'Jefe de oficina técnica', '<input class="inp" id="cJefeOT" value="' + attr(c.jefeOT) + '">', 'Responsable de la revisión y liberación de la ingeniería.') +
      campo('cJefeCal', 'Jefe de calidad', '<input class="inp" id="cJefeCal" value="' + attr(c.jefeCalidad) + '">', 'Responsable del PIE, protocolos y NCR.') +
      campo('cDrive', 'Carpeta del contrato en Google Drive (URL)', '<input class="inp" id="cDrive" value="' + attr(c.carpetaDrive) + '" placeholder="https://drive.google.com/drive/folders/…">',
        'Se abre con el botón "Drive" de la cabecera. Mantenga esta app y los PDF dentro de esa carpeta sincronizada con Google Drive para escritorio: así cada documento se abre con un clic desde cualquier PC.') +
      campo('cCalidad', 'Carpeta de Calidad en Google Drive (URL)', '<input class="inp" id="cCalidad" value="' + attr(c.carpetaCalidad || '') + '" placeholder="https://drive.google.com/drive/folders/…">',
        'La muestra el Módulo 02 en modo lectura. La carpeta debe estar compartida como "Cualquier persona con el enlace: Lector" para que todos la vean.') +
      campo('cServCal', 'Servicio de lectura de la carpeta de Calidad (URL de Apps Script)', '<input class="inp" id="cServCal" value="' + attr(c.servicioCalidad || '') + '" placeholder="https://script.google.com/macros/s/…/exec">',
        'Opcional. Si está vacío se usa el servicio configurado en la app. Permite navegar la carpeta dentro de la app (subcarpetas, buscador, visor). Sin servicio se muestra la vista incrustada de Drive.') +
    '</div>' +
    '<button class="btn primary" onclick="guardarContrato()">Guardar datos del contrato</button>' +
  '</div>';

  html += '<div class="card card-pad" style="margin-bottom:14px;max-width:1000px">' +
    '<h2>Parámetros de cálculo</h2>' +
    '<div class="fgrid">' +
      campo('pPlazo', 'Plazo de revisión por defecto (días)', '<input class="inp" id="pPlazo" type="number" min="1" value="' + p.plazoRevisionDias + '">',
        'Se aplica a los documentos nuevos. Cada documento puede tener su propio plazo.') +
      campo('pHabiles', 'Forma de contar los días',
        '<select class="inp" id="pHabiles"><option value="1"' + (p.usarDiasHabiles ? ' selected' : '') + '>Días hábiles (lunes a viernes)</option>' +
        '<option value="0"' + (!p.usarDiasHabiles ? ' selected' : '') + '>Días corridos</option></select>',
        'Afecta el cálculo de "días en revisión", el semáforo de plazo y los promedios de las estadísticas.') +
    '</div>' +
    '<button class="btn primary" onclick="guardarParams()">Guardar parámetros</button>' +
  '</div>';

  html += panelCarpetaConfig();

  html += '<div class="card card-pad" style="margin-bottom:14px;max-width:1000px">' +
    '<h2>Datos y respaldos</h2>' +
    '<p class="sub">La información se guarda en este navegador (<span class="mono">localStorage</span>). ' +
    'No se envía a ningún servidor. <b>Exporte un respaldo JSON con regularidad</b>: si se limpia el navegador o se cambia de equipo, los datos se pierden.</p>' +
    '<div class="toolbar" style="margin:0">' +
      '<button class="btn" onclick="exportarJSON()">↓ Exportar respaldo JSON</button>' +
      '<button class="btn" onclick="importarJSON()">↑ Restaurar desde JSON</button>' +
      '<button class="btn" onclick="exportarCSV(DB.documentos)">↓ Exportar matriz completa a CSV</button>' +
      '<button class="btn" onclick="recargarBase()">↻ Recargar documentación base del contrato</button>' +
      '<button class="btn danger" onclick="limpiarEjemplo()">Vaciar todos los documentos</button>' +
      '<button class="btn danger" onclick="borrarTodo()">Reiniciar toda la base</button>' +
    '</div>' +
    '<p class="sub" style="margin:12px 0 0">Estado del almacenamiento: ' +
      (ALMACEN_OK ? '<b style="color:var(--ok)">operativo</b>' : '<b style="color:var(--bad)">no disponible — trabaje con respaldos JSON</b>') +
      ' · Documentos en base: <b>' + DB.documentos.length + '</b>' +
      ' · Revisiones: <b>' + DB.documentos.reduce(function(a,d){ return a + d.revisiones.length; }, 0) + '</b>' +
    '</p>' +
  '</div>';

  html += '<div class="card card-pad" style="max-width:1000px">' +
    '<h2>Estructura de la aplicación</h2>' +
    '<p class="sub">Módulos declarados y su estado de desarrollo.</p>' +
    '<div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Módulo</th><th style="cursor:default">Estado</th></tr></thead><tbody>' +
    MENU.map(function(m){
      return '<tr><td>' + esc(m.code + ' — ' + m.label) + '</td><td>' +
             (m.wip ? pill('neutral', 'En construcción') : pill('ok', 'Operativo')) + '</td></tr>';
    }).join('') +
    '</tbody></table></div></div>';

  return html;
}

function guardarContrato(){
  DB.contrato = {
    proyecto: valorCampo('cProyecto'), mandante: valorCampo('cMandante'), contratista: valorCampo('cContratista'),
    nContrato: valorCampo('cNContrato'), ods: valorCampo('cOds'),
    fechaInicio: valorCampo('cIni'), fechaTermino: valorCampo('cTer'),
    adminContrato: valorCampo('cAdmin'), jefeOT: valorCampo('cJefeOT'), jefeCalidad: valorCampo('cJefeCal'),
    carpetaDrive: valorCampo('cDrive'),
    carpetaCalidad: valorCampo('cCalidad'),
    servicioCalidad: valorCampo('cServCal')
  };
  CALIDAD.arbol = null;
  if(DB.contrato.fechaInicio && DB.contrato.fechaTermino && DB.contrato.fechaTermino < DB.contrato.fechaInicio){
    toast('La fecha de término no puede ser anterior a la de inicio.', 'bad'); return;
  }
  guardarDB(); render(); toast('Datos del contrato guardados.', 'ok');
}
function guardarParams(){
  const plazo = Number(valorCampo('pPlazo'));
  if(!plazo || plazo < 1){ toast('El plazo debe ser un número mayor que cero.', 'bad'); return; }
  DB.params.plazoRevisionDias = plazo;
  DB.params.usarDiasHabiles = valorCampo('pHabiles') === '1';
  guardarDB(); render(); toast('Parámetros guardados.', 'ok');
}
function recargarBase(){
  confirmar('Recargar documentación base',
    '<p>Se agregarán los documentos de la carpeta <b>Construccion</b> que aún no existan en la base (por código). ' +
    'Los documentos ya registrados, sus revisiones y comentarios se conservan.</p>',
    function(){
      const base = documentacionBase();
      let n = 0;
      base.forEach(function(b){
        if(DB.documentos.some(function(d){ return d.codigo.toLowerCase() === b.codigo.toLowerCase(); })) return;
        b.correlativo = DB.correlativo++; DB.documentos.push(b); n++;
      });
      guardarDB(); render(); toast(n + ' documento(s) agregado(s) desde la base del contrato.', 'ok');
    }, 'Recargar');
}
function limpiarEjemplo(){
  confirmar('Vaciar todos los documentos',
    '<p>Se eliminarán <b>todos los documentos</b> de la matriz y quedará la base vacía. ' +
    'Los datos de cabecera y los parámetros se conservan. Puede volver a cargar la documentación base desde este mismo panel.</p>',
    function(){
      DB.documentos = []; DB.correlativo = 1; ESTADO_UI.docSel = null;
      guardarDB(); render(); toast('Base vacía.', 'ok');
    }, 'Limpiar');
}
function borrarTodo(){
  confirmar('Reiniciar toda la base',
    '<p>Se borrarán los documentos <b>y</b> los datos de cabecera del contrato, volviendo al estado inicial con ' +
    'la documentación base de la carpeta Construccion. Exporte antes un respaldo JSON si necesita conservar la información.</p>',
    function(){
      try{ localStorage.removeItem(APP.storageKey); }catch(e){}
      DB = dbVacia(); DB.documentos = datosDeEjemplo(); DB.correlativo = DB.documentos.length + 1;
      ESTADO_UI.docSel = null;
      guardarDB(); render(); toast('Base reiniciada.', 'ok');
    }, 'Borrar todo');
}

/* ==================================================================
   ===============            ARRANQUE                ===============
   ================================================================== */
(function inicio(){
  cargarDB();
  migrarBase();
  initTema();
  initSidebar();
  initDrive();
  initBuscador();
  initCarpeta();
  initAdmin();
  window.addEventListener('hashchange', onHashChange);
  ESTADO_UI.ruta = buscarRuta(rutaActual()) ? rutaActual() : 'dashboard';
  const info = buscarRuta(ESTADO_UI.ruta);
  if(info && info.padre) ESTADO_UI.abiertos[info.padre.id] = true;
  render();
  if(!ALMACEN_OK){
    toast('Este navegador no permite guardar datos localmente. La app funciona igual, pero los cambios se pierden al cerrar: exporte respaldos JSON.', 'bad', 9000);
  }
})();

/* ==================================================================
   ==========        CÓMO AGREGAR UN MÓDULO NUEVO          ==========
   ==================================================================

   La aplicación está armada para crecer por etapas. Para incorporar
   uno de los módulos 02 a 08 (o uno nuevo) basta con dos pasos:

   PASO 1 — Declararlo en el menú
   ------------------------------
   En la sección CONFIGURACIÓN, edite el arreglo MENU. Cada módulo es
   un objeto con esta forma:

     {
       id:    'calidad',                  // identificador único
       code:  '02',                       // número que se muestra
       label: 'Calidad (PIE / ITP)',      // nombre visible
       icon:  'folder',                   // 'folder' | 'chart' | 'gear' | 'book'
       route: 'calidad',                  // ruta del hash: #/calidad
       render:'renderCalidad'             // nombre de la función de vista
     }

   Si el módulo tiene submódulos, agregue el arreglo children con la
   misma forma (sin code):

     children: [
       { id:'pie', label:'2.1 Matriz PIE', route:'calidad/pie', render:'renderPIE' }
     ]

   Mientras el módulo no esté desarrollado, en lugar de render use:

     wip: true,
     wipDesc:  'Descripción breve de lo que contendrá.',
     wipItems: ['Alcance 1','Alcance 2']

   y la aplicación mostrará automáticamente la tarjeta "En construcción".

   PASO 2 — Escribir la función de vista
   -------------------------------------
   Agregue en la sección VISTAS una función global con el nombre que
   puso en render. Debe DEVOLVER el HTML de la vista (no escribirlo):

     function renderCalidad(){
       return '<div class="page-title"><h1>02 — Calidad</h1></div>' +
              '<div class="card card-pad">…</div>';
     }

   Si la vista necesita enlazar eventos después de pintarse (por
   ejemplo, escuchar un <select>), agregue además una función con el
   mismo nombre y el sufijo Post; el router la llama automáticamente:

     function renderCalidadPost(){
       document.getElementById('miSelect').addEventListener('change', …);
     }

   PASO 3 (solo si guarda datos nuevos)
   ------------------------------------
   a) Agregue el arreglo correspondiente en dbVacia(), por ejemplo
      protocolos: [].
   b) Normalícelo en normalizarDB() para que las bases antiguas o
      importadas no rompan la aplicación.
   c) Llame a guardarDB() después de cada cambio y a render() para
      repintar.

   COMPONENTES REUTILIZABLES DISPONIBLES
   -------------------------------------
     kpi(label, valor, nota, cls)        tarjeta KPI  (cls: good|warn|bad)
     pill(cls, texto)                    etiqueta de estado con punto
     pillEstado(idEstado)                etiqueta según ESTADOS_REV
     campo(id, label, control, ayuda)    campo de formulario con ayuda
     fila(clave, valor)                  fila de ficha (dentro de <dl class="dl">)
     abrirModal(html) / cerrarModal()    ventana modal
     confirmar(titulo, texto, fn, boton) confirmación antes de borrar
     toast(mensaje, 'ok'|'bad')          aviso flotante
     barrasH(mapa, opciones)             gráfico de barras horizontales
     dona(mapa, colores)                 gráfico de dona
     esc(texto) / attr(texto)            escapado seguro de HTML
     fmtFecha(iso)                       fecha en dd-mm-aaaa
     dias(desde, hasta)                  días hábiles o corridos según parámetros

   Clases CSS útiles: card, card-pad, grid kpis, grid cols2, toolbar,
   tbl-wrap + table, help, warnbox, badbox, empty-state, inp, btn,
   btn primary, btn danger, btn sm, tag, mono, num, sec, dl, pasos,
   details.acc (acordeón).

   ENLACES A ARCHIVOS
   ------------------
   refDoc('código', 'texto') devuelve un enlace que abre el PDF de un
   documento de la matriz (por su código) más el botón "ficha".
   enlaceDoc(doc) / abrirDocumento(id) resuelven la ruta: archivo de la
   revisión vigente → enlace general → enlace de Google Drive. Las rutas
   relativas se resuelven respecto de la carpeta donde está este HTML.

   ORDEN DE CARGA
   --------------
   El arranque (bloque "ARRANQUE") debe quedar siempre al final del
   archivo: las funciones de vista deben existir antes de render().
   ================================================================== */
