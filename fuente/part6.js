/* ==================================================================
   ===============   VISTA 1.2 — CONTROL DE REVISIONES  =============
   ==================================================================
   Cada documento conserva su historial completo: las revisiones no se
   sobrescriben. Aquí vive además el ciclo de comentarios, que es lo
   que determina si un documento puede liberarse para construcción.
   ================================================================== */

function verRevisiones(id){ ESTADO_UI.docSel = id; ir('ingenieria/revisiones'); }

function totalComentariosAbiertos(){
  return DB.documentos.reduce(function(a,d){ return a + comentariosAbiertos(d); }, 0);
}
function docsConAltasAbiertas(){
  return DB.documentos.filter(function(d){ return altasAbiertas(d) > 0; });
}

function renderRevisiones(){
  const sel = ESTADO_UI.docSel ? docPorId(ESTADO_UI.docSel) : null;
  let html = '';
  html += '<div class="page-title"><h1>1.2 Control de revisiones</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.revs + '</div>';

  const bloqueados = docsConAltasAbiertas();
  html += '<div class="grid kpis" style="margin-bottom:14px">' +
    kpi('Comentarios abiertos', totalComentariosAbiertos(), 'Abiertos o en respuesta, todo el contrato', totalComentariosAbiertos() ? 'warn' : 'good') +
    kpi('Documentos con criticidad Alta abierta', bloqueados.length, 'No pueden liberarse para construcción', bloqueados.length ? 'bad' : 'good') +
    kpi('Documentos con más de una revisión', DB.documentos.filter(function(d){ return d.revisiones.length > 1; }).length, 'Ciclos de comentarios ya cerrados', '') +
    kpi('Total de revisiones registradas', DB.documentos.reduce(function(a,d){ return a + d.revisiones.length; }, 0), 'Historial completo', '') +
  '</div>';

  if(bloqueados.length){
    html += '<div class="badbox"><b>⚠ Regla de negocio:</b> los siguientes documentos tienen comentarios de criticidad ' +
      '<b>Alta</b> sin cerrar y por lo tanto <b>no pueden marcarse "Vigente para construcción"</b>: ' +
      bloqueados.map(function(d){
        return '<a href="#/ingenieria/revisiones" onclick="verRevisiones(\'' + d.id + '\')" class="mono">' + esc(d.codigo) + '</a>';
      }).join(' · ') + '</div>';
  }

  /* --- selector de documento --- */
  html += '<div class="card card-pad" style="margin-bottom:14px">' +
    '<label class="f" for="selDoc">Documento a revisar ' + ayuda('Elija el documento cuyo historial de revisiones y comentarios quiere ver o editar.') + '</label>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<select class="inp" id="selDoc" style="flex:1 1 320px">' +
        '<option value="">— Seleccione un documento —</option>' +
        DB.documentos.slice().sort(function(a,b){ return a.correlativo - b.correlativo; }).map(function(d){
          const ab = comentariosAbiertos(d);
          return '<option value="' + attr(d.id) + '"' + (sel && sel.id === d.id ? ' selected' : '') + '>' +
                 esc(d.codigo + ' · Rev. ' + revActual(d).rev + ' — ' + recorta(d.titulo, 60)) +
                 (ab ? ' [' + ab + ' coment. abiertos]' : '') + '</option>';
        }).join('') +
      '</select>' +
      (sel ? '<button class="btn" onclick="nuevaRevision(\'' + sel.id + '\')">+ Registrar nueva revisión</button>' +
             '<button class="btn" onclick="fichaDocumento(\'' + sel.id + '\')">Ver ficha</button>' : '') +
    '</div></div>';

  if(!sel){
    html += '<div class="card empty-state"><div class="big">🗒</div>Seleccione un documento para ver su línea de tiempo de revisiones y su ciclo de comentarios.</div>';
    return html;
  }

  /* --- encabezado del documento --- */
  const alt = altasAbiertas(sel);
  html += '<div class="card card-pad" style="margin-bottom:14px">' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline">' +
      '<span class="mono" style="font-size:15px;font-weight:700">' + esc(sel.codigo) + '</span>' +
      '<span style="color:var(--text-2)">' + esc(sel.titulo) + '</span></div>' +
    '<div style="margin-top:8px"><span class="tag">' + esc(sel.disciplina) + '</span><span class="tag">' + esc(sel.tipo) + '</span>' +
      '<span class="tag">' + esc(sel.fase) + '</span><span class="tag">' + esc(sel.area || 'Sin área') + '</span>' +
      pill(sel.estadoFinal === 'Vigente para construcción' ? (alt ? 'bad' : 'ok') : 'neutral', sel.estadoFinal) + '</div>' +
    (alt ? '<div class="badbox" style="margin:10px 0 0">⚠ <b>' + alt + '</b> comentario(s) de criticidad Alta abiertos: ' +
           'este documento <b>no puede liberarse para construcción</b> hasta cerrarlos.</div>' : '') +
  '</div>';

  /* --- línea de tiempo --- */
  html += '<h2>Línea de tiempo de revisiones</h2>';
  html += '<div class="card card-pad"><div class="timeline">';
  sel.revisiones.slice().reverse().forEach(function(r){
    const e = estadoInfo(r.estado);
    const vig = (r.id === revActual(sel).id);
    html += '<div class="tl-item"><span class="tl-dot" style="border-color:' + e.color + '"></span>' +
      '<div class="tl-head"><span class="tl-rev">Rev. ' + esc(r.rev) + '</span>' +
        pillEstado(r.estado) + (vig ? '<span class="pill neutral">vigente</span>' : '') +
        '<span style="color:var(--text-2);font-size:12px">Recibida ' + fmtFecha(r.fechaRecepcion) +
        (r.fechaRespuesta ? ' · Respondida ' + fmtFecha(r.fechaRespuesta) : '') + '</span>' +
        (enlaceDoc(sel, r) ? '<a class="btn sm" style="margin-left:auto" href="' + attr(enlaceDoc(sel, r)) + '" target="_blank" rel="noopener" onclick="return clickDoc(event,\'' + sel.id + '\',\'' + r.id + '\')">⤢ Abrir PDF</a>' : '<span style="margin-left:auto"></span>') +
        '<button class="btn sm" onclick="formComentario(\'' + sel.id + '\',\'' + r.id + '\')">+ Comentario</button>' +
        (sel.revisiones.length > 1 ? '<button class="btn sm danger" onclick="eliminarRevision(\'' + sel.id + '\',\'' + r.id + '\')" title="Eliminar esta revisión">✕</button>' : '') +
      '</div>' +
      '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:6px">' +
        (r.transmittal ? '<span class="tag">' + esc(r.transmittal) + '</span>' : '') +
        (r.revisor ? 'Revisor: ' + esc(r.revisor) + ' · ' : '') +
        'Motivo: ' + esc(r.motivo || '—') + ' · Comentarios anteriores incorporados: <b>' + esc(r.incorporacion) + '</b>' +
      '</div>' +
      tablaComentarios(sel, r) +
    '</div>';
  });
  html += '</div></div>';
  return html;
}

function renderRevisionesPost(){
  const s = document.getElementById('selDoc');
  if(s) s.addEventListener('change', function(){ ESTADO_UI.docSel = s.value || null; render(); });
}

function tablaComentarios(doc, rev){
  if(!rev.comentarios.length){
    return '<div style="font-size:12px;color:var(--text-3);border:1px dashed var(--border);border-radius:6px;padding:8px 10px">' +
           'Sin comentarios registrados uno a uno' + (rev.nComentarios ? ' (se declararon ' + rev.nComentarios + ' comentarios en total).' : '.') + '</div>';
  }
  let h = '<div class="tbl-wrap"><table><thead><tr>' +
    '<th style="cursor:default">N°</th><th style="cursor:default">Comentario</th><th style="cursor:default">Disciplina</th>' +
    '<th style="cursor:default">Criticidad</th><th style="cursor:default">Respuesta del emisor</th>' +
    '<th style="cursor:default">Estado</th><th style="cursor:default">Cierre</th><th style="cursor:default"></th></tr></thead><tbody>';
  rev.comentarios.forEach(function(c){
    const critCls = c.criticidad === 'Alta' ? 'bad' : c.criticidad === 'Media' ? 'warn' : 'neutral';
    const estCls  = c.estado === 'Cerrado' ? 'ok' : c.estado === 'Abierto' ? 'bad' : c.estado === 'Respondido' ? 'warn' : 'neutral';
    h += '<tr>' +
      '<td class="num">' + c.n + '</td>' +
      '<td class="wrap">' + esc(c.descripcion) + '</td>' +
      '<td>' + esc(c.disciplina || doc.disciplina) + '</td>' +
      '<td>' + pill(critCls, c.criticidad) + '</td>' +
      '<td class="wrap">' + (c.respuesta ? esc(c.respuesta) : '<span style="color:var(--text-3)">—</span>') + '</td>' +
      '<td>' + pill(estCls, c.estado) + '</td>' +
      '<td>' + fmtFecha(c.fechaCierre) + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="btn sm" onclick="formComentario(\'' + doc.id + '\',\'' + rev.id + '\',\'' + c.id + '\')">Editar</button> ' +
        '<button class="btn sm danger" onclick="eliminarComentario(\'' + doc.id + '\',\'' + rev.id + '\',\'' + c.id + '\')">✕</button>' +
      '</td></tr>';
  });
  return h + '</tbody></table></div>';
}

/* ---- Registrar una nueva revisión (no sobrescribe la anterior) ---- */
function nuevaRevision(docId){
  const d = docPorId(docId);
  if(!d) return;
  const act = revActual(d);
  const sugerida = siguienteRev(act.rev);

  abrirModal(
    '<div class="modal-head"><h2>Nueva revisión de ' + esc(d.codigo) + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' +
      '<div class="help">La revisión vigente (<b>Rev. ' + esc(act.rev) + '</b>) se conserva en el historial. ' +
      'Si marca la casilla, quedará como <b>Superada por nueva revisión</b>, que es lo habitual al recibir una emisión posterior.</div>' +
      '<div id="formErr"></div>' +
      '<div class="fgrid">' +
        campo('nRev', 'Revisión *', '<input class="inp" id="nRev" value="' + attr(sugerida) + '">', '') +
        campo('nFecRec', 'Fecha de recepción *', '<input class="inp" id="nFecRec" type="date" value="' + hoyISO() + '">', '') +
        campo('nTrans', 'Medio / N° de transmittal', '<input class="inp" id="nTrans" value="">', '') +
        campo('nIncorp', 'Comentarios anteriores incorporados *',
          '<select class="inp" id="nIncorp">' + opciones(INCORPORACION, act.comentarios.length ? 'Sí' : 'No aplica') + '</select>',
          'Declare si el emisor resolvió los comentarios de la revisión anterior.') +
        campo('nRevisor', 'Revisor asignado', '<input class="inp" id="nRevisor" value="' + attr(act.revisor) + '">', '') +
        campo('nPlazo', 'Plazo comprometido (días)', '<input class="inp" id="nPlazo" type="number" min="1" value="' + DB.params.plazoRevisionDias + '">', '') +
        campo('nArchivo', 'Archivo PDF de la nueva revisión', '<input class="inp" id="nArchivo" value="" placeholder="nombre-del-archivo Rev X.pdf">', 'Nombre del archivo en la carpeta de la app; con esto el clic en el documento abre la revisión vigente.') +
      '</div>' +
      '<div class="field"><label class="f" for="nMotivo">Motivo del cambio *</label>' +
      '<textarea class="inp" id="nMotivo" placeholder="Incorpora comentarios Rev. ' + esc(act.rev) + ' / actualiza por cambio de proveedor / etc."></textarea></div>' +
      '<label class="chk"><input type="checkbox" id="nSuperar" checked> Marcar la Rev. ' + esc(act.rev) + ' como "Superada por nueva revisión"</label>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primary" onclick="guardarNuevaRevision(\'' + d.id + '\')">Registrar revisión</button></div>');
}

function siguienteRev(rev){
  rev = str(rev).trim();
  if(/^\d+$/.test(rev)) return String(Number(rev) + 1);
  if(/^[A-Za-z]$/.test(rev)){
    if(rev.toUpperCase() === 'Z') return '0';
    return String.fromCharCode(rev.charCodeAt(0) + 1).toUpperCase();
  }
  return rev + '-1';
}

function guardarNuevaRevision(docId){
  const d = docPorId(docId);
  if(!d) return;
  const rev = valorCampo('nRev'), fec = valorCampo('nFecRec'), motivo = valorCampo('nMotivo');
  const errores = [];
  if(!rev) errores.push('La revisión es obligatoria.');
  if(!fec) errores.push('La fecha de recepción es obligatoria.');
  if(!motivo) errores.push('El motivo del cambio es obligatorio.');
  if(d.revisiones.some(function(r){ return r.rev.toLowerCase() === rev.toLowerCase(); }))
    errores.push('La revisión <b>' + esc(rev) + '</b> ya existe en este documento.');
  const ult = revActual(d);
  if(fec && ult.fechaRecepcion && fec < ult.fechaRecepcion)
    errores.push('La fecha de recepción no puede ser anterior a la de la revisión vigente (' + fmtFecha(ult.fechaRecepcion) + ').');

  if(errores.length){
    document.getElementById('formErr').innerHTML = '<div class="badbox"><ul style="margin:0 0 0 16px;padding:0">' +
      errores.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ul></div>';
    return;
  }

  if(document.getElementById('nSuperar').checked) ult.estado = 'superado';

  const nueva = normalizarRev({
    rev: rev, fechaRecepcion: fec, transmittal: valorCampo('nTrans'), motivo: motivo,
    incorporacion: valorCampo('nIncorp'), revisor: valorCampo('nRevisor'),
    estado: 'recibido', plazoDias: Number(valorCampo('nPlazo')) || DB.params.plazoRevisionDias,
    archivo: valorCampo('nArchivo')
  });
  d.revisiones.push(nueva);
  guardarDB(); cerrarModal();
  ESTADO_UI.docSel = d.id;
  render();
  toast('Rev. ' + esc(rev) + ' registrada en ' + esc(d.codigo) + '.', 'ok');
}

function eliminarRevision(docId, revId){
  const d = docPorId(docId);
  if(!d || d.revisiones.length <= 1) return;
  const r = d.revisiones.filter(function(x){ return x.id === revId; })[0];
  if(!r) return;
  confirmar('Eliminar revisión',
    '<p>Se eliminará la <b>Rev. ' + esc(r.rev) + '</b> de ' + esc(d.codigo) + ' y sus ' + r.comentarios.length +
    ' comentario(s). El historial no se puede recuperar.</p>',
    function(){
      d.revisiones = d.revisiones.filter(function(x){ return x.id !== revId; });
      guardarDB(); render(); toast('Revisión eliminada.', 'ok');
    });
}

/* ---- Ciclo de comentarios ---- */
function formComentario(docId, revId, comId){
  const d = docPorId(docId);
  if(!d) return;
  const r = d.revisiones.filter(function(x){ return x.id === revId; })[0];
  if(!r) return;
  const c = comId ? r.comentarios.filter(function(x){ return x.id === comId; })[0] : null;
  const nSig = c ? c.n : (r.comentarios.reduce(function(m,x){ return Math.max(m, x.n); }, 0) + 1);

  abrirModal(
    '<div class="modal-head"><h2>' + (c ? 'Editar comentario' : 'Nuevo comentario') + ' — ' + esc(d.codigo) + ' Rev. ' + esc(r.rev) + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body"><div id="formErr"></div>' +
      '<div class="help">Un comentario de criticidad <b>Alta</b> abierto impide declarar el documento "Vigente para construcción". ' +
      'El comentario se cierra cuando el emisor responde y la oficina técnica acepta la respuesta.</div>' +
      '<div class="fgrid">' +
        campo('cN', 'N° de comentario *', '<input class="inp" id="cN" type="number" min="1" value="' + nSig + '">', '') +
        campo('cDisc', 'Disciplina', '<select class="inp" id="cDisc">' + opciones(DISCIPLINAS, (c && c.disciplina) || d.disciplina) + '</select>', '') +
        campo('cCrit', 'Criticidad *', '<select class="inp" id="cCrit">' + opciones(CRITICIDADES, c ? c.criticidad : 'Media') + '</select>',
          'Alta: impide liberar para construcción. Media: debe resolverse antes del montaje. Baja: mejora o aclaración.') +
        campo('cEst', 'Estado *', '<select class="inp" id="cEst">' + opciones(EST_COMENTARIO, c ? c.estado : 'Abierto') + '</select>', '') +
        campo('cFec', 'Fecha de cierre', '<input class="inp" id="cFec" type="date" value="' + attr(c ? c.fechaCierre : '') + '">', 'Obligatoria cuando el estado es Cerrado o Rechazado.') +
      '</div>' +
      '<div class="field"><label class="f" for="cDesc">Descripción del comentario *</label>' +
        '<textarea class="inp" id="cDesc">' + esc(c ? c.descripcion : '') + '</textarea></div>' +
      '<div class="field"><label class="f" for="cResp">Respuesta del emisor</label>' +
        '<textarea class="inp" id="cResp">' + esc(c ? c.respuesta : '') + '</textarea></div>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primary" onclick="guardarComentario(\'' + docId + '\',\'' + revId + '\',' + (comId ? "'" + comId + "'" : 'null') + ')">Guardar</button></div>');
}

function guardarComentario(docId, revId, comId){
  const d = docPorId(docId);
  const r = d.revisiones.filter(function(x){ return x.id === revId; })[0];
  const errores = [];
  const desc = valorCampo('cDesc'), est = valorCampo('cEst'), fec = valorCampo('cFec');
  const n = Number(valorCampo('cN'));

  if(!desc) errores.push('La descripción del comentario es obligatoria.');
  if(!n || n < 1) errores.push('El N° de comentario debe ser un número positivo.');
  if((est === 'Cerrado' || est === 'Rechazado') && !fec) errores.push('Indique la fecha de cierre para un comentario ' + est.toLowerCase() + '.');
  if(fec && r.fechaRecepcion && fec < r.fechaRecepcion) errores.push('La fecha de cierre no puede ser anterior a la recepción de la revisión.');
  if(r.comentarios.some(function(x){ return x.n === n && x.id !== comId; })) errores.push('Ya existe un comentario N° ' + n + ' en esta revisión.');

  if(errores.length){
    document.getElementById('formErr').innerHTML = '<div class="badbox"><ul style="margin:0 0 0 16px;padding:0">' +
      errores.map(function(e){ return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>';
    return;
  }

  const datos = {
    n: n, descripcion: desc, disciplina: valorCampo('cDisc'), criticidad: valorCampo('cCrit'),
    respuesta: valorCampo('cResp'), estado: est, fechaCierre: fec
  };
  if(comId){
    const c = r.comentarios.filter(function(x){ return x.id === comId; })[0];
    Object.assign(c, datos);
  }else{
    r.comentarios.push(Object.assign({ id: uid() }, datos));
  }
  r.comentarios.sort(function(a,b){ return a.n - b.n; });
  r.nComentarios = r.comentarios.length;
  /* Si aparecen comentarios y la revisión seguía "en revisión", se refleja el estado */
  if(r.estado === 'recibido' || r.estado === 'revision') r.estado = 'comentarios';

  guardarDB(); cerrarModal(); render();
  toast('Comentario guardado.', 'ok');
}

function eliminarComentario(docId, revId, comId){
  const d = docPorId(docId);
  const r = d.revisiones.filter(function(x){ return x.id === revId; })[0];
  confirmar('Eliminar comentario', '<p>Se eliminará el comentario del historial de la Rev. ' + esc(r.rev) + '.</p>', function(){
    r.comentarios = r.comentarios.filter(function(x){ return x.id !== comId; });
    r.nComentarios = r.comentarios.length;
    guardarDB(); render(); toast('Comentario eliminado.', 'ok');
  });
}

/* ==================================================================
   ===============  VISTA 1.3 — TRAZABILIDAD A TERRENO  =============
   ==================================================================
   Vincula la ingeniería recibida con lo verificado en obra. Toda
   discrepancia debe derivar en un RFI, una modificación de ingeniería
   o una aceptación formal.
   ================================================================== */

function verTerreno(id){ ESTADO_UI.docSel = id; ir('ingenieria/terreno'); }

function discrepanciasAbiertas(){
  let n = 0;
  DB.documentos.forEach(function(d){
    d.terreno.discrepancias.forEach(function(x){ if(!x.resuelta) n++; });
  });
  return n;
}
function docsConDiscrepancias(){
  return DB.documentos.filter(function(d){
    return d.terreno.discrepancias.some(function(x){ return !x.resuelta; });
  });
}

function renderTerreno(){
  let html = '';
  html += '<div class="page-title"><h1>1.3 Trazabilidad a terreno</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> ' + AYUDA.terreno + '</div>';

  const verif = DB.documentos.filter(function(d){ return d.terreno.estado === 'Verificado conforme'; }).length;
  const disc  = docsConDiscrepancias();
  html += '<div class="grid kpis" style="margin-bottom:14px">' +
    kpi('Documentos verificados en terreno', verif, 'De ' + DB.documentos.length + ' recibidos', verif ? 'good' : '') +
    kpi('Documentos con discrepancia', disc.length, 'Con al menos una discrepancia sin resolver', disc.length ? 'bad' : 'good') +
    kpi('Discrepancias sin resolver', discrepanciasAbiertas(), 'Requieren RFI, modificación o aceptación', discrepanciasAbiertas() ? 'bad' : 'good') +
    kpi('RFI vigentes', DB.documentos.filter(function(d){ return d.terreno.rfiNumero && d.terreno.rfiEstado !== 'Cerrada' && d.terreno.rfiEstado !== 'No aplica'; }).length, 'Consultas técnicas abiertas', '') +
  '</div>';

  html += '<div class="tbl-wrap"><table><thead><tr>' +
    ['Código','Rev.','Título','Disciplina','Área / Sistema','Verificación en terreno','Discrep. sin resolver','Acción requerida','RFI','Estado RFI','NCR',''].map(function(t){
      return '<th style="cursor:default">' + esc(t) + '</th>';
    }).join('') + '</tr></thead><tbody>';

  DB.documentos.slice().sort(function(a,b){ return a.correlativo - b.correlativo; }).forEach(function(d){
    const t = d.terreno;
    const abiertas = t.discrepancias.filter(function(x){ return !x.resuelta; });
    const cls = t.estado === 'Verificado conforme' ? 'ok' : t.estado === 'Discrepancia detectada' ? 'bad' : 'neutral';
    const acciones = {};
    abiertas.forEach(function(x){ acciones[x.accion] = true; });
    html += '<tr>' +
      '<td><span class="mono">' + esc(d.codigo) + '</span></td>' +
      '<td><b>' + esc(revActual(d).rev) + '</b></td>' +
      '<td class="wrap">' + esc(recorta(d.titulo, 55)) + '</td>' +
      '<td>' + esc(d.disciplina) + '</td>' +
      '<td>' + esc(d.area || '—') + '</td>' +
      '<td>' + pill(cls, t.estado) + '</td>' +
      '<td class="num">' + (abiertas.length ? '<span class="pill bad">' + abiertas.length + '</span>' : '0') + '</td>' +
      '<td>' + (Object.keys(acciones).length ? Object.keys(acciones).map(function(a){ return '<span class="tag">' + esc(a) + '</span>'; }).join('') : '—') + '</td>' +
      '<td><span class="mono">' + esc(t.rfiNumero || '—') + '</span></td>' +
      '<td>' + esc(t.rfiEstado) + '</td>' +
      '<td><span class="mono">' + esc(t.ncr || '—') + '</span></td>' +
      '<td style="white-space:nowrap"><button class="btn sm" onclick="formTerreno(\'' + d.id + '\')">Gestionar</button></td>' +
    '</tr>';
  });
  html += '</tbody></table></div>';

  /* --- detalle de discrepancias abiertas --- */
  if(disc.length){
    html += '<h2 style="margin-top:20px">Discrepancias sin resolver</h2>';
    disc.forEach(function(d){
      html += '<div class="card card-pad" style="margin-bottom:10px">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline">' +
          '<span class="mono" style="font-weight:700">' + esc(d.codigo) + '</span>' +
          '<span style="color:var(--text-2)">' + esc(recorta(d.titulo, 70)) + '</span>' +
          '<button class="btn sm" style="margin-left:auto" onclick="formTerreno(\'' + d.id + '\')">Gestionar</button></div>';
      d.terreno.discrepancias.filter(function(x){ return !x.resuelta; }).forEach(function(x){
        html += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12.5px">' +
          esc(x.descripcion) +
          '<div style="margin-top:6px;color:var(--text-2)">' +
            'Detectada el <b>' + fmtFecha(x.fecha) + '</b> por ' + esc(x.responsable || '—') +
            (x.referencia ? ' · Referencia: ' + esc(x.referencia) : '') + '</div>' +
          '<div style="margin-top:6px">' +
            (x.impacto.length ? x.impacto.map(function(i){ return '<span class="tag">Impacto: ' + esc(i) + '</span>'; }).join('') : '') +
            pill('warn', x.accion) + '</div>' +
        '</div>';
      });
      html += '</div>';
    });
  }
  return html;
}

function formTerreno(docId){
  const d = docPorId(docId);
  if(!d) return;
  const t = d.terreno;

  let html = '<div class="modal-head"><h2>Trazabilidad a terreno — ' + esc(d.codigo) + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div><div class="modal-body">' +
    '<div class="help">Registre aquí lo verificado en obra contra este documento. Si hay discrepancia, ' +
    'defina la acción: consulta técnica (RFI), modificación de ingeniería o aceptación formal del estado actual.</div>' +
    '<div class="fgrid">' +
      campo('tEstado', 'Estado de verificación en terreno', '<select class="inp" id="tEstado">' + opciones(EST_TERRENO, t.estado) + '</select>', '') +
      campo('tRfi', 'N° de RFI / consulta técnica', '<input class="inp" id="tRfi" value="' + attr(t.rfiNumero) + '" placeholder="RFI-018">', '') +
      campo('tRfiEst', 'Estado del RFI', '<select class="inp" id="tRfiEst">' + opciones(EST_RFI, t.rfiEstado) + '</select>', '') +
      campo('tNcr', 'NCR / observación asociada', '<input class="inp" id="tNcr" value="' + attr(t.ncr) + '" placeholder="NCR-004">', 'Por ahora es solo el número; el Módulo 03 lo consumirá cuando se desarrolle.') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 8px">' +
      '<h3 style="margin:0;flex:1">Discrepancias registradas (' + t.discrepancias.length + ')</h3>' +
      '<button class="btn sm" onclick="formDiscrepancia(\'' + d.id + '\')">+ Agregar discrepancia</button></div>';

  if(!t.discrepancias.length){
    html += '<div style="font-size:12.5px;color:var(--text-3);border:1px dashed var(--border);border-radius:6px;padding:10px">Sin discrepancias registradas.</div>';
  }else{
    html += '<div class="tbl-wrap"><table><thead><tr>' +
      ['Descripción','Fecha','Responsable','Referencia','Impacto','Acción requerida','Estado',''].map(function(x){ return '<th style="cursor:default">' + esc(x) + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    t.discrepancias.forEach(function(x){
      html += '<tr>' +
        '<td class="wrap">' + esc(x.descripcion) + '</td>' +
        '<td>' + fmtFecha(x.fecha) + '</td>' +
        '<td>' + esc(x.responsable || '—') + '</td>' +
        '<td class="wrap">' + esc(x.referencia || '—') + '</td>' +
        '<td>' + (x.impacto.length ? x.impacto.map(function(i){ return '<span class="tag">' + esc(i) + '</span>'; }).join('') : '—') + '</td>' +
        '<td>' + esc(x.accion) + '</td>' +
        '<td>' + pill(x.resuelta ? 'ok' : 'bad', x.resuelta ? 'Resuelta' : 'Sin resolver') + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn sm" onclick="formDiscrepancia(\'' + d.id + '\',\'' + x.id + '\')">Editar</button> ' +
          '<button class="btn sm danger" onclick="eliminarDiscrepancia(\'' + d.id + '\',\'' + x.id + '\')">✕</button></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
  }

  html += '</div><div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cerrar</button>' +
    '<button class="btn primary" onclick="guardarTerreno(\'' + d.id + '\')">Guardar</button></div>';
  abrirModal(html);
}

function guardarTerreno(docId){
  const d = docPorId(docId);
  d.terreno.estado    = valorCampo('tEstado');
  d.terreno.rfiNumero = valorCampo('tRfi');
  d.terreno.rfiEstado = valorCampo('tRfiEst');
  d.terreno.ncr       = valorCampo('tNcr');
  guardarDB(); cerrarModal(); render();
  toast('Trazabilidad actualizada.', 'ok');
}

function formDiscrepancia(docId, discId){
  const d = docPorId(docId);
  const x = discId ? d.terreno.discrepancias.filter(function(y){ return y.id === discId; })[0] : null;

  abrirModal(
    '<div class="modal-head"><h2>' + (x ? 'Editar discrepancia' : 'Nueva discrepancia') + ' — ' + esc(d.codigo) + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body"><div id="formErr"></div>' +
      '<div class="field"><label class="f" for="xDesc">Descripción de la discrepancia *</label>' +
      '<textarea class="inp" id="xDesc" placeholder="Qué dice la ingeniería y qué se encontró en terreno.">' + esc(x ? x.descripcion : '') + '</textarea></div>' +
      '<div class="fgrid">' +
        campo('xFecha', 'Fecha de detección *', '<input class="inp" id="xFecha" type="date" value="' + attr(x ? x.fecha : hoyISO()) + '">', '') +
        campo('xResp', 'Responsable de la detección', '<input class="inp" id="xResp" value="' + attr(x ? x.responsable : '') + '">', '') +
        campo('xRef', 'Fotografía o referencia', '<input class="inp" id="xRef" value="' + attr(x ? x.referencia : '') + '" placeholder="Foto IMG_2291 / levantamiento L-14">', 'Identificación del respaldo: número de foto, levantamiento topográfico, informe de terreno.') +
        campo('xAccion', 'Acción requerida *', '<select class="inp" id="xAccion">' + opciones(ACCIONES_DISC, x ? x.accion : 'Por definir') + '</select>', '') +
      '</div>' +
      '<div class="field"><label class="f">Impacto</label><div>' +
        IMPACTOS.map(function(i){
          return '<label class="chk"><input type="checkbox" class="xImp" value="' + attr(i) + '"' +
                 (x && x.impacto.indexOf(i) >= 0 ? ' checked' : '') + '> ' + esc(i) + '</label>';
        }).join('') + '</div></div>' +
      '<label class="chk"><input type="checkbox" id="xResuelta"' + (x && x.resuelta ? ' checked' : '') + '> Discrepancia resuelta</label>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="formTerreno(\'' + docId + '\')">Volver</button>' +
    '<button class="btn primary" onclick="guardarDiscrepancia(\'' + docId + '\',' + (discId ? "'" + discId + "'" : 'null') + ')">Guardar</button></div>');
}

function guardarDiscrepancia(docId, discId){
  const d = docPorId(docId);
  const desc = valorCampo('xDesc'), fecha = valorCampo('xFecha');
  const errores = [];
  if(!desc)  errores.push('La descripción es obligatoria.');
  if(!fecha) errores.push('La fecha de detección es obligatoria.');
  if(errores.length){
    document.getElementById('formErr').innerHTML = '<div class="badbox"><ul style="margin:0 0 0 16px;padding:0">' +
      errores.map(function(e){ return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>';
    return;
  }
  const datos = {
    descripcion: desc, fecha: fecha, responsable: valorCampo('xResp'), referencia: valorCampo('xRef'),
    impacto: $$('.xImp').filter(function(c){ return c.checked; }).map(function(c){ return c.value; }),
    accion: valorCampo('xAccion'), resuelta: document.getElementById('xResuelta').checked
  };
  if(discId){
    Object.assign(d.terreno.discrepancias.filter(function(y){ return y.id === discId; })[0], datos);
  }else{
    d.terreno.discrepancias.push(Object.assign({ id: uid() }, datos));
    if(d.terreno.estado !== 'Discrepancia detectada') d.terreno.estado = 'Discrepancia detectada';
  }
  guardarDB();
  formTerreno(docId);
  toast('Discrepancia guardada.', 'ok');
}

function eliminarDiscrepancia(docId, discId){
  const d = docPorId(docId);
  confirmar('Eliminar discrepancia', '<p>Se eliminará el registro de la discrepancia.</p>', function(){
    d.terreno.discrepancias = d.terreno.discrepancias.filter(function(y){ return y.id !== discId; });
    guardarDB(); formTerreno(docId); toast('Discrepancia eliminada.', 'ok');
  });
}
