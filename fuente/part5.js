/* ==================================================================
   ===============    VISTAS — 1.1 MATRIZ DE DOCUMENTOS   ===========
   ================================================================== */

/* Columnas de la matriz: define encabezado, ancho de contenido y
   la función de valor usada tanto para mostrar como para ordenar.   */
const COLS = [
  { id:'correlativo', th:'N°',            val:function(d){ return d.correlativo; },                   cell:function(d){ return '<span class="num">' + d.correlativo + '</span>'; } },
  { id:'codigo',      th:'Código',        val:function(d){ return d.codigo.toLowerCase(); },          cell:function(d){ return enlaceAbrir(d, esc(d.codigo), 'mono') + badgeArchivo(d); } },
  { id:'rev',         th:'Rev.',          val:function(d){ return revActual(d).rev; },                cell:function(d){ return '<b>' + esc(revActual(d).rev) + '</b>'; } },
  { id:'titulo',      th:'Título',        val:function(d){ return d.titulo.toLowerCase(); },          cell:function(d){ return enlaceAbrir(d, '<span title="' + attr(d.titulo) + '">' + esc(recorta(d.titulo, 62)) + '</span>', ''); }, wrap:true },
  { id:'disciplina',  th:'Disciplina',    val:function(d){ return d.disciplina; },                    cell:function(d){ return esc(d.disciplina); } },
  { id:'tipo',        th:'Tipo',          val:function(d){ return d.tipo; },                          cell:function(d){ return esc(d.tipo); } },
  { id:'fase',        th:'Fase',          val:function(d){ return d.fase; },                          cell:function(d){ return esc(d.fase); } },
  { id:'area',        th:'Área / Sistema',val:function(d){ return d.area.toLowerCase(); },            cell:function(d){ return esc(d.area || '—'); } },
  { id:'emisor',      th:'Emisor',        val:function(d){ return d.emisor.toLowerCase(); },          cell:function(d){ return esc(d.emisor || '—'); } },
  { id:'frec',        th:'F. recepción',  val:function(d){ return revActual(d).fechaRecepcion; },     cell:function(d){ return fmtFecha(revActual(d).fechaRecepcion); } },
  { id:'transmittal', th:'Transmittal',   val:function(d){ return revActual(d).transmittal; },        cell:function(d){ return '<span class="mono">' + esc(revActual(d).transmittal || '—') + '</span>'; } },
  { id:'revisor',     th:'Revisor',       val:function(d){ return revActual(d).revisor.toLowerCase(); }, cell:function(d){ return esc(revActual(d).revisor || '—'); } },
  { id:'estado',      th:'Estado revisión', val:function(d){ return estadoInfo(revActual(d).estado).label; }, cell:function(d){ return pillEstado(revActual(d).estado); } },
  { id:'ncom',        th:'Coment.',       val:function(d){ return nComentarios(revActual(d)); },
    cell:function(d){ const ab = comentariosAbiertos(d);
      return '<span class="num">' + nComentarios(revActual(d)) + (ab ? ' <span class="pill warn" title="Comentarios abiertos o en respuesta">' + ab + ' abiertos</span>' : '') + '</span>'; } },
  { id:'dias',        th:'Días rev.',     val:function(d){ const x = diasEnRevision(d); return x == null ? -1 : x; },
    cell:function(d){ const x = diasEnRevision(d); return '<span class="num">' + (x == null ? '—' : x) + '</span>'; } },
  { id:'plazo',       th:'Plazo',         val:function(d){ return Number(revActual(d).plazoDias); },  cell:function(d){ return '<span class="num">' + revActual(d).plazoDias + '</span>'; } },
  { id:'semaforo',    th:'Semáforo',      val:function(d){ const s = semaforo(d); return s.restante == null ? 9999 : s.restante; },
    cell:function(d){ const s = semaforo(d); return pill(s.cls, s.label); } },
  { id:'final',       th:'Estado final',  val:function(d){ return d.estadoFinal; },
    cell:function(d){
      const bloq = bloqueadoParaConstruccion(d) && d.estadoFinal === 'Vigente para construcción';
      return esc(d.estadoFinal) + (bloq ? ' <span class="pill bad" title="Tiene comentarios de criticidad Alta abiertos">⚠ bloqueado</span>' : ''); } },
  { id:'terreno',     th:'Terreno',       val:function(d){ return d.terreno.estado; },
    cell:function(d){
      const e = d.terreno.estado;
      const cls = e === 'Verificado conforme' ? 'ok' : e === 'Discrepancia detectada' ? 'bad' : 'neutral';
      return pill(cls, e); } }
];

function recorta(s, n){ s = str(s); return s.length > n ? s.slice(0, n-1) + '…' : s; }

function docsFiltrados(){
  const f = ESTADO_UI.filtros;
  const q = f.texto.trim().toLowerCase();
  let lista = DB.documentos.filter(function(d){
    if(q && (d.codigo + ' ' + d.titulo + ' ' + d.disciplina + ' ' + d.area + ' ' + d.emisor + ' ' + revActual(d).transmittal).toLowerCase().indexOf(q) < 0) return false;
    if(f.disciplina && d.disciplina !== f.disciplina) return false;
    if(f.tipo && d.tipo !== f.tipo) return false;
    if(f.fase && d.fase !== f.fase) return false;
    if(f.estado && revActual(d).estado !== f.estado) return false;
    if(f.soloVencidos && !estaVencido(d)) return false;
    if(f.soloComentarios && comentariosAbiertos(d) === 0) return false;
    return true;
  });
  const col = COLS.filter(function(c){ return c.id === ESTADO_UI.orden.campo; })[0] || COLS[0];
  const asc = ESTADO_UI.orden.asc ? 1 : -1;
  lista.sort(function(a,b){
    const va = col.val(a), vb = col.val(b);
    if(va < vb) return -1*asc;
    if(va > vb) return 1*asc;
    return 0;
  });
  return lista;
}

function renderMatriz(){
  const f = ESTADO_UI.filtros;
  const lista = docsFiltrados();

  let html = '';
  html += '<div class="page-title"><h1>1.1 Matriz de documentos recibidos</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.matriz +
          ' <b>Un clic en el código o el título abre el PDF</b> (la app debe estar en la misma carpeta que los planos, por ejemplo la carpeta sincronizada con Google Drive).</div>';

  /* --- barra de herramientas y filtros --- */
  html += '<div class="toolbar">' +
    '<button class="btn primary" onclick="formDocumento()">+ Nuevo documento</button>' +
    '<button class="btn" onclick="dialogoCargaMasiva()">⇪ Carga masiva (Excel)</button>' +
    '<button class="btn" onclick="exportarCSV(docsFiltrados())">↓ Exportar CSV</button>' +
    '<button class="btn" onclick="exportarJSON()">↓ Respaldo JSON</button>' +
    '<button class="btn" onclick="importarJSON()">↑ Restaurar JSON</button>' +
    '<span class="spacer"></span>' +
    '<span style="font-size:12.5px;color:var(--text-2)">' + lista.length + ' de ' + DB.documentos.length + ' documento(s)</span>' +
  '</div>';

  html += '<div class="card card-pad" style="margin-bottom:14px">' +
    '<div class="fgrid">' +
      '<div><label class="f" for="fTexto">Buscar en la matriz</label>' +
        '<input class="inp" id="fTexto" type="search" value="' + attr(f.texto) + '" placeholder="Código, título, área, transmittal…"></div>' +
      '<div><label class="f" for="fDisc">Disciplina</label><select class="inp" id="fDisc"><option value="">Todas</option>' + opciones(DISCIPLINAS, f.disciplina) + '</select></div>' +
      '<div><label class="f" for="fTipo">Tipo de documento</label><select class="inp" id="fTipo"><option value="">Todos</option>' + opciones(TIPOS_DOC, f.tipo) + '</select></div>' +
      '<div><label class="f" for="fFase">Fase</label><select class="inp" id="fFase"><option value="">Todas</option>' + opciones(FASES, f.fase) + '</select></div>' +
      '<div><label class="f" for="fEstado">Estado de revisión</label><select class="inp" id="fEstado"><option value="">Todos</option>' +
        ESTADOS_REV.map(function(e){ return '<option value="' + e.id + '"' + (e.id === f.estado ? ' selected' : '') + '>' + esc(e.label) + '</option>'; }).join('') +
        '</select></div>' +
    '</div>' +
    '<div style="margin-top:10px">' +
      '<label class="chk"><input type="checkbox" id="fVenc"' + (f.soloVencidos ? ' checked' : '') + '> Solo vencidos en plazo</label>' +
      '<label class="chk"><input type="checkbox" id="fCom"' + (f.soloComentarios ? ' checked' : '') + '> Solo con comentarios abiertos</label>' +
      '<button class="btn sm" onclick="limpiarFiltros()">Limpiar filtros</button>' +
    '</div>' +
  '</div>';

  /* --- tabla --- */
  if(!lista.length){
    html += '<div class="card empty-state"><div class="big">🗂</div>' +
            (DB.documentos.length ? 'Ningún documento cumple los filtros aplicados.' :
             'Aún no hay documentos registrados. Use <b>+ Nuevo documento</b> o la carga masiva desde Excel.') + '</div>';
    return html;
  }

  html += '<div class="tbl-wrap"><table><thead><tr>';
  COLS.forEach(function(c){
    const act = ESTADO_UI.orden.campo === c.id;
    html += '<th onclick="ordenarPor(\'' + c.id + '\')" title="Ordenar por ' + attr(c.th) + '">' + esc(c.th) +
            '<span class="arr">' + (act ? (ESTADO_UI.orden.asc ? '▲' : '▼') : '⇅') + '</span></th>';
  });
  html += '<th style="cursor:default">Acciones</th></tr></thead><tbody>';

  lista.forEach(function(d){
    html += '<tr>';
    COLS.forEach(function(c){ html += '<td' + (c.wrap ? ' class="wrap"' : '') + '>' + c.cell(d) + '</td>'; });
    html += '<td style="white-space:nowrap">' +
      (enlaceDoc(d) ? '<a class="btn sm primary" href="' + attr(enlaceDoc(d)) + '" target="_blank" rel="noopener" onclick="return clickDoc(event,\'' + d.id + '\')" title="Abrir el archivo del documento">⤢ Abrir</a> '
        : (estadoArchivo(d) === 'ok' ? '<button class="btn sm primary" onclick="abrirDocumento(\'' + d.id + '\')" title="Abrir el archivo del documento">⤢ Abrir</button> ' : '')) +
      '<button class="btn sm" onclick="fichaDocumento(\'' + d.id + '\')" title="Ver ficha completa">Ficha</button> ' +
      '<button class="btn sm" onclick="formDocumento(\'' + d.id + '\')" title="Editar documento">Editar</button> ' +
      '<button class="btn sm" onclick="nuevaRevision(\'' + d.id + '\')" title="Duplicar como nueva revisión">+ Rev.</button> ' +
      '<button class="btn sm danger" onclick="eliminarDoc(\'' + d.id + '\')" title="Eliminar documento">✕</button>' +
    '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

/* Enlaza los filtros después de pintar la vista (patrón <vista>Post) */
function renderMatrizPost(){
  const f = ESTADO_UI.filtros;
  const t = document.getElementById('fTexto');
  if(t){
    t.addEventListener('input', function(){ f.texto = t.value; repintarTabla(); });
  }
  const map = { fDisc:'disciplina', fTipo:'tipo', fFase:'fase', fEstado:'estado' };
  Object.keys(map).forEach(function(k){
    const el = document.getElementById(k);
    if(el) el.addEventListener('change', function(){ f[map[k]] = el.value; render(); });
  });
  const v = document.getElementById('fVenc');  if(v) v.addEventListener('change', function(){ f.soloVencidos = v.checked; render(); });
  const c = document.getElementById('fCom');   if(c) c.addEventListener('change', function(){ f.soloComentarios = c.checked; render(); });
}
/* Repinta sin perder el foco del campo de texto */
function repintarTabla(){
  const cont = document.getElementById('content');
  const foco = document.activeElement;
  const pos = foco && foco.id === 'fTexto' ? foco.selectionStart : null;
  cont.innerHTML = renderMatriz();
  renderMatrizPost();
  if(pos != null){
    const t = document.getElementById('fTexto');
    if(t){ t.focus(); try{ t.setSelectionRange(pos, pos); }catch(e){} }
  }
}
function ordenarPor(campo){
  if(ESTADO_UI.orden.campo === campo) ESTADO_UI.orden.asc = !ESTADO_UI.orden.asc;
  else { ESTADO_UI.orden.campo = campo; ESTADO_UI.orden.asc = true; }
  render();
}
function limpiarFiltros(){
  ESTADO_UI.filtros = { texto:'', disciplina:'', estado:'', fase:'', tipo:'', soloVencidos:false, soloComentarios:false };
  render();
}

/* ==================================================================
   ===============   FICHA Y FORMULARIO DE DOCUMENTO  ===============
   ================================================================== */

function docPorId(id){
  for(let i=0;i<DB.documentos.length;i++) if(DB.documentos[i].id === id) return DB.documentos[i];
  return null;
}

function fichaDocumento(id){
  const d = docPorId(id);
  if(!d){ toast('Documento no encontrado.', 'bad'); return; }
  const r = revActual(d), s = semaforo(d), dv = diasEnRevision(d);
  const bloq = bloqueadoParaConstruccion(d);

  let html = '<div class="modal-head"><h2>' + esc(d.codigo) + ' · Rev. ' + esc(r.rev) + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div><div class="modal-body">';

  if(bloq && d.estadoFinal === 'Vigente para construcción'){
    html += '<div class="badbox"><b>⚠ No puede liberarse para construcción.</b> El documento tiene ' +
            altasAbiertas(d) + ' comentario(s) de criticidad <b>Alta</b> sin cerrar. Cierre esos comentarios antes de declararlo vigente.</div>';
  }

  html += '<div class="sec"><h3>Identificación</h3><dl class="dl">' +
    fila('N° correlativo interno', d.correlativo) +
    fila('Código del documento', '<span class="mono">' + esc(d.codigo) + '</span>') +
    fila('Revisión vigente', esc(r.rev) + ' <span class="tag">' + d.revisiones.length + ' revisión(es) en el historial</span>') +
    fila('Título', esc(d.titulo)) +
    fila('Disciplina', esc(d.disciplina)) +
    fila('Tipo de documento', esc(d.tipo)) +
    fila('Fase de ingeniería', esc(d.fase)) +
    fila('Área / Sistema', esc(d.area || '—')) +
  '</dl></div>';

  html += '<div class="sec"><h3>Recepción</h3><dl class="dl">' +
    fila('Emisor / Origen', esc(d.emisor || '—')) +
    fila('Fecha de recepción', fmtFecha(r.fechaRecepcion)) +
    fila('Medio / N° de transmittal', '<span class="mono">' + esc(r.transmittal || '—') + '</span>') +
    fila('Formato recibido', d.formatos.length ? d.formatos.map(function(x){ return '<span class="tag">' + esc(x) + '</span>'; }).join('') : '—') +
    fila('Archivo de la revisión vigente', (r.archivo ? '<a class="doclink mono" href="' + attr(hrefArchivo(r.archivo)) + '" target="_blank" rel="noopener" onclick="return clickDoc(event,\'' + d.id + '\')">' + esc(recorta(r.archivo, 70)) + '</a>' : '—') + badgeArchivo(d)) +
    fila('Archivo / enlace general', d.enlace ? '<a class="doclink mono" href="' + attr(hrefArchivo(d.enlace)) + '" target="_blank" rel="noopener">' + esc(recorta(d.enlace, 70)) + '</a>' : '—') +
    fila('Enlace en Google Drive', d.enlaceDrive ? '<a class="doclink" href="' + attr(d.enlaceDrive) + '" target="_blank" rel="noopener">' + esc(recorta(d.enlaceDrive, 70)) + '</a>' : '—') +
  '</dl></div>';

  html += '<div class="sec"><h3>Revisión y estado</h3><dl class="dl">' +
    fila('Revisor asignado', esc(r.revisor || '—')) +
    fila('Fecha inicio revisión', fmtFecha(r.fechaInicioRevision)) +
    fila('Estado de revisión', pillEstado(r.estado)) +
    fila('N° de comentarios emitidos', nComentarios(r) + (comentariosAbiertos(d) ? ' · <b>' + comentariosAbiertos(d) + '</b> abiertos en el documento' : '')) +
    fila('Fecha de respuesta / devolución', fmtFecha(r.fechaRespuesta)) +
    fila('Días en revisión', (dv == null ? '—' : dv + ' ' + (DB.params.usarDiasHabiles ? 'días hábiles' : 'días corridos'))) +
    fila('Plazo comprometido', r.plazoDias + ' días') +
    fila('Semáforo de plazo', pill(s.cls, s.label)) +
    fila('Estado final', esc(d.estadoFinal)) +
    fila('Observaciones', d.observaciones ? esc(d.observaciones) : '—') +
  '</dl></div>';

  html += '<div class="sec"><h3>Trazabilidad a terreno</h3><dl class="dl">' +
    fila('Verificación en terreno', pill(d.terreno.estado === 'Verificado conforme' ? 'ok' : d.terreno.estado === 'Discrepancia detectada' ? 'bad' : 'neutral', d.terreno.estado)) +
    fila('Discrepancias registradas', d.terreno.discrepancias.length) +
    fila('RFI / consulta técnica', esc(d.terreno.rfiNumero || '—') + ' · ' + esc(d.terreno.rfiEstado)) +
    fila('NCR / observación asociada', esc(d.terreno.ncr || '—')) +
  '</dl></div>';

  html += '</div><div class="modal-foot">' +
    (enlaceDoc(d) ? '<a class="btn primary" href="' + attr(enlaceDoc(d)) + '" target="_blank" rel="noopener" onclick="return clickDoc(event,\'' + d.id + '\')">⤢ Abrir documento</a>' : '') +
    (d.enlaceDrive ? '<a class="btn" href="' + attr(d.enlaceDrive) + '" target="_blank" rel="noopener">▲ Ver en Drive</a>' : '') +
    '<button class="btn" onclick="cerrarModal();verRevisiones(\'' + d.id + '\')">Ver historial de revisiones</button>' +
    '<button class="btn" onclick="cerrarModal();verTerreno(\'' + d.id + '\')">Ver trazabilidad</button>' +
    '<button class="btn" onclick="cerrarModal();nuevaRevision(\'' + d.id + '\')">+ Nueva revisión</button>' +
    '<button class="btn primary" onclick="cerrarModal();formDocumento(\'' + d.id + '\')">Editar</button>' +
  '</div>';

  abrirModal(html);
}
function fila(k, v){ return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }

/* ---- Formulario de alta / edición de documento ---- */
function formDocumento(id){
  const nuevo = !id;
  const d = nuevo ? null : docPorId(id);
  if(!nuevo && !d){ toast('Documento no encontrado.', 'bad'); return; }
  const r = nuevo ? revVacia('A') : revActual(d);

  const v = {
    codigo: nuevo ? '' : d.codigo, titulo: nuevo ? '' : d.titulo,
    disciplina: nuevo ? 'Eléctrica' : d.disciplina, tipo: nuevo ? 'Plano' : d.tipo,
    fase: nuevo ? 'Detalle' : d.fase, area: nuevo ? '' : d.area,
    emisor: nuevo ? '' : d.emisor, enlace: nuevo ? '' : d.enlace, enlaceDrive: nuevo ? '' : d.enlaceDrive,
    formatos: nuevo ? ['PDF'] : d.formatos,
    estadoFinal: nuevo ? 'Vigente para construcción' : d.estadoFinal,
    observaciones: nuevo ? '' : d.observaciones
  };

  let html = '<div class="modal-head"><h2>' + (nuevo ? 'Nuevo documento recibido' : 'Editar documento') + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div><div class="modal-body">' +
    '<div class="help">Los campos marcados con <b>*</b> son obligatorios. Al editar se modifica la <b>revisión vigente</b> (' +
    esc(r.rev) + '); para registrar una revisión nueva use el botón <b>+ Nueva revisión</b>, que conserva el historial.</div>' +
    '<div id="formErr"></div>';

  html += '<h3>Identificación</h3><div class="fgrid">' +
    campo('fCodigo', 'Código del documento *', '<input class="inp" id="fCodigo" value="' + attr(v.codigo) + '" placeholder="AND-CC-EL-PL-001">', 'Código con que lo identifica el emisor. No puede repetirse con la misma revisión.') +
    campo('fRev', 'Revisión *', '<input class="inp" id="fRev" value="' + attr(r.rev) + '" placeholder="A, B, 0, 1…">', 'Letras para revisiones de ingeniería en desarrollo, números para emisión para construcción.') +
    campo('fTitulo', 'Título del documento *', '<input class="inp" id="fTitulo" value="' + attr(v.titulo) + '">', '') +
    campo('fDisciplina', 'Disciplina *', '<select class="inp" id="fDisciplina">' + opciones(DISCIPLINAS, v.disciplina) + '</select>', '') +
    campo('fTipo2', 'Tipo de documento *', '<select class="inp" id="fTipo2">' + opciones(TIPOS_DOC, v.tipo) + '</select>', '') +
    campo('fFase2', 'Fase de ingeniería', '<select class="inp" id="fFase2">' + opciones(FASES, v.fase) + '</select>', '') +
    campo('fArea', 'Área / Sistema', '<input class="inp" id="fArea" value="' + attr(v.area) + '" placeholder="Sala Cicloconvertidores">', '') +
  '</div>';

  html += '<h3 style="margin-top:14px">Recepción</h3><div class="fgrid">' +
    campo('fEmisor', 'Emisor / Origen', '<input class="inp" id="fEmisor" value="' + attr(v.emisor) + '" placeholder="Mandante, ingeniería de detalle o proveedor">', '') +
    campo('fFecRec', 'Fecha de recepción *', '<input class="inp" id="fFecRec" type="date" value="' + attr(r.fechaRecepcion) + '">', '') +
    campo('fTrans', 'Medio / N° de transmittal', '<input class="inp" id="fTrans" value="' + attr(r.transmittal) + '" placeholder="TR-AUS-0112">', '') +
    campo('fArchivo', 'Archivo PDF de esta revisión', '<input class="inp" id="fArchivo" value="' + attr(r.archivo) + '" placeholder="nombre-del-archivo.pdf (misma carpeta)">',
      'Nombre del archivo tal como está en la carpeta de la app (o subcarpeta/archivo.pdf). Un clic en el código del documento lo abrirá.') +
    campo('fEnlace', 'Archivo / enlace general', '<input class="inp" id="fEnlace" value="' + attr(v.enlace) + '" placeholder="Ruta relativa, ruta de red o URL">',
      'Se usa si la revisión no tiene archivo propio.') +
    campo('fDrive', 'Enlace en Google Drive', '<input class="inp" id="fDrive" value="' + attr(v.enlaceDrive) + '" placeholder="https://drive.google.com/file/d/…/view">',
      'Opcional: URL del mismo documento en Drive, para abrirlo desde otro equipo o compartirlo.') +
  '</div>' +
  '<div class="field"><label class="f">Formato recibido</label><div>' +
    FORMATOS.map(function(x){
      return '<label class="chk"><input type="checkbox" class="fFormato" value="' + attr(x) + '"' +
             (v.formatos.indexOf(x) >= 0 ? ' checked' : '') + '> ' + esc(x) + '</label>';
    }).join('') + '</div></div>';

  html += '<h3 style="margin-top:14px">Revisión y estado</h3><div class="fgrid">' +
    campo('fRevisor', 'Revisor asignado', '<input class="inp" id="fRevisor" value="' + attr(r.revisor) + '">', '') +
    campo('fIniRev', 'Fecha inicio revisión', '<input class="inp" id="fIniRev" type="date" value="' + attr(r.fechaInicioRevision) + '">', '') +
    campo('fEstadoRev', 'Estado de revisión', '<select class="inp" id="fEstadoRev">' +
      ESTADOS_REV.map(function(e){ return '<option value="' + e.id + '"' + (e.id === r.estado ? ' selected' : '') + '>' + esc(e.label) + '</option>'; }).join('') +
      '</select>', '') +
    campo('fNCom', 'N° de comentarios emitidos', '<input class="inp" id="fNCom" type="number" min="0" value="' + (r.comentarios.length || r.nComentarios) + '"' + (r.comentarios.length ? ' disabled' : '') + '>',
      r.comentarios.length ? 'Se calcula desde los comentarios registrados en la vista 1.2.' : 'Si registra los comentarios uno a uno en la vista 1.2, este campo se calcula solo.') +
    campo('fFecResp', 'Fecha de respuesta / devolución', '<input class="inp" id="fFecResp" type="date" value="' + attr(r.fechaRespuesta) + '">', '') +
    campo('fPlazo', 'Plazo comprometido (días)', '<input class="inp" id="fPlazo" type="number" min="1" value="' + r.plazoDias + '">', 'Por defecto ' + DB.params.plazoRevisionDias + ' días, configurable en el Módulo 09.') +
    campo('fFinal', 'Estado final', '<select class="inp" id="fFinal">' + opciones(ESTADOS_FINALES, v.estadoFinal) + '</select>', 'No puede quedar "Vigente para construcción" con comentarios de criticidad Alta abiertos.') +
  '</div>' +
  '<div class="field"><label class="f" for="fObs">Observaciones</label><textarea class="inp" id="fObs">' + esc(v.observaciones) + '</textarea></div>';

  html += '</div><div class="modal-foot">' +
    '<button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primary" onclick="guardarDocumento(' + (nuevo ? 'null' : "'" + d.id + "'") + ')">Guardar</button>' +
  '</div>';

  abrirModal(html);
}
function campo(id, label, control, ayudaTxt){
  return '<div class="field"><label class="f" for="' + attr(id) + '">' + esc(label) +
         (ayudaTxt ? ' ' + ayuda(ayudaTxt) : '') + '</label>' + control + '</div>';
}

function guardarDocumento(id){
  const nuevo = !id;
  const d = nuevo ? null : docPorId(id);
  const errores = [];

  const codigo = valorCampo('fCodigo');
  const rev    = valorCampo('fRev');
  const titulo = valorCampo('fTitulo');
  const fRec   = valorCampo('fFecRec');
  const fResp  = valorCampo('fFecResp');
  const fIni   = valorCampo('fIniRev');

  if(!codigo) errores.push('El código del documento es obligatorio.');
  if(!rev)    errores.push('La revisión es obligatoria.');
  if(!titulo) errores.push('El título es obligatorio.');
  if(!fRec)   errores.push('La fecha de recepción es obligatoria.');

  /* código + revisión no duplicados */
  const dup = DB.documentos.some(function(x){
    if(!nuevo && x.id === id) return false;
    return x.codigo.toLowerCase() === codigo.toLowerCase() &&
           x.revisiones.some(function(r){ return r.rev.toLowerCase() === rev.toLowerCase(); });
  });
  if(dup) errores.push('Ya existe el documento <b>' + esc(codigo) + '</b> en la revisión <b>' + esc(rev) + '</b>.');

  /* coherencia de fechas */
  if(fResp && fRec && fResp < fRec) errores.push('La fecha de respuesta no puede ser anterior a la de recepción.');
  if(fIni && fRec && fIni < fRec)   errores.push('La fecha de inicio de revisión no puede ser anterior a la de recepción.');
  if(fResp && fIni && fResp < fIni) errores.push('La fecha de respuesta no puede ser anterior al inicio de la revisión.');

  /* regla de negocio: liberación para construcción */
  const estadoFinal = valorCampo('fFinal');
  if(!nuevo && estadoFinal === 'Vigente para construcción' && altasAbiertas(d) > 0){
    errores.push('No puede declararse <b>Vigente para construcción</b>: hay ' + altasAbiertas(d) +
                 ' comentario(s) de criticidad <b>Alta</b> sin cerrar (vista 1.2).');
  }

  if(errores.length){
    document.getElementById('formErr').innerHTML =
      '<div class="badbox"><b>Revise lo siguiente:</b><ul style="margin:6px 0 0 16px;padding:0">' +
      errores.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ul></div>';
    document.querySelector('.modal-body').scrollTop = 0;
    return;
  }

  const formatos = $$('.fFormato').filter(function(c){ return c.checked; }).map(function(c){ return c.value; });
  const datos = {
    codigo: codigo, titulo: titulo,
    disciplina: valorCampo('fDisciplina'), tipo: valorCampo('fTipo2'), fase: valorCampo('fFase2'),
    area: valorCampo('fArea'), emisor: valorCampo('fEmisor'), enlace: valorCampo('fEnlace'), enlaceDrive: valorCampo('fDrive'),
    formatos: formatos, estadoFinal: estadoFinal, observaciones: valorCampo('fObs')
  };
  const datosRev = {
    rev: rev, fechaRecepcion: fRec, transmittal: valorCampo('fTrans'),
    revisor: valorCampo('fRevisor'), fechaInicioRevision: fIni,
    estado: valorCampo('fEstadoRev'), fechaRespuesta: fResp,
    plazoDias: Number(valorCampo('fPlazo')) || DB.params.plazoRevisionDias,
    nComentarios: Number(valorCampo('fNCom')) || 0,
    archivo: valorCampo('fArchivo')
  };

  if(nuevo){
    const doc = normalizarDoc(Object.assign({ correlativo: DB.correlativo++, revisiones: [ Object.assign(revVacia(rev), datosRev) ] }, datos));
    DB.documentos.push(doc);
    toast('Documento <b>' + esc(codigo) + '</b> registrado.', 'ok');
  }else{
    Object.assign(d, datos);
    Object.assign(revActual(d), datosRev);
    toast('Documento actualizado.', 'ok');
  }
  guardarDB(); cerrarModal(); render();
}

function eliminarDoc(id){
  const d = docPorId(id);
  if(!d) return;
  confirmar('Eliminar documento',
    '<p>Se eliminará <b>' + esc(d.codigo) + '</b> con sus <b>' + d.revisiones.length +
    '</b> revisión(es) y todos sus comentarios. Esta acción no se puede deshacer.</p>',
    function(){
      DB.documentos = DB.documentos.filter(function(x){ return x.id !== id; });
      if(ESTADO_UI.docSel === id) ESTADO_UI.docSel = null;
      guardarDB(); render(); toast('Documento eliminado.', 'ok');
    });
}
