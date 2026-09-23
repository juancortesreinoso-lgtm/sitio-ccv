/* ==================================================================
   ===============    IMPORTAR / EXPORTAR / CARGA     ===============
   ================================================================== */

/* --- Respaldo completo en JSON --- */
function exportarJSON(){
  const nombre = 'respaldo_control_contrato_' + hoyISO() + '.json';
  descargar(nombre, JSON.stringify(DB, null, 2), 'application/json;charset=utf-8');
  toast('Respaldo JSON descargado.', 'ok');
}
function importarJSON(){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = function(){
    const f = inp.files && inp.files[0];
    if(!f) return;
    const fr = new FileReader();
    fr.onload = function(){
      try{
        const obj = JSON.parse(fr.result);
        DB = normalizarDB(obj);
        guardarDB(); render();
        toast('Base restaurada: ' + DB.documentos.length + ' documento(s).', 'ok');
      }catch(e){ toast('Archivo JSON inválido: ' + esc(e.message), 'bad'); }
    };
    fr.readAsText(f, 'utf-8');
  };
  inp.click();
}

/* --- Exportación CSV compatible con Excel en español --- */
function csvCampo(v){
  const s = str(v).replace(/"/g,'""');
  return '"' + s + '"';
}
function exportarCSV(docs){
  const cab = ['N°','Código','Revisión','Título','Disciplina','Tipo','Fase','Área / Sistema','Emisor',
               'Fecha recepción','Transmittal','Formatos','Revisor','Inicio revisión','Estado de revisión',
               'Comentarios emitidos','Comentarios abiertos','Fecha respuesta','Días en revisión',
               'Plazo (días)','Semáforo','Estado final','Verificación terreno','RFI','NCR','Observaciones'];
  const filas = docs.map(function(doc){
    const r = revActual(doc), s = semaforo(doc), dv = diasEnRevision(doc);
    return [
      doc.correlativo, doc.codigo, r.rev, doc.titulo, doc.disciplina, doc.tipo, doc.fase, doc.area, doc.emisor,
      fmtFecha(r.fechaRecepcion), r.transmittal, doc.formatos.join(' / '), r.revisor, fmtFecha(r.fechaInicioRevision),
      estadoInfo(r.estado).label, nComentarios(r), comentariosAbiertos(doc), fmtFecha(r.fechaRespuesta),
      (dv == null ? '' : dv), r.plazoDias, s.label, doc.estadoFinal, doc.terreno.estado,
      doc.terreno.rfiNumero, doc.terreno.ncr, doc.observaciones
    ].map(csvCampo).join(';');
  });
  const texto = '\uFEFF' + cab.map(csvCampo).join(';') + '\r\n' + filas.join('\r\n') + '\r\n';
  descargar('matriz_ingenieria_recibida_' + hoyISO() + '.csv', texto, 'text/csv;charset=utf-8');
  toast('CSV descargado (' + docs.length + ' fila(s)). Se abre directo en Excel.', 'ok');
}

/* --- Carga masiva pegando desde Excel (columnas separadas por tabulador) --- */
function dialogoCargaMasiva(){
  abrirModal(
    '<div class="modal-head"><h2>Carga masiva desde Excel</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' +
      '<div class="help">Copie las filas desde Excel y péguelas abajo. Cada columna debe ir en este orden ' +
      '(separadas por tabulador, tal como quedan al copiar desde una planilla):<br>' +
      '<b>Código · Revisión · Título · Disciplina · Tipo · Fase · Área/Sistema · Emisor · Fecha recepción (dd-mm-aaaa) · Transmittal</b><br>' +
      'Las columnas que falten quedan vacías y se completan después en la ficha del documento. ' +
      'Si el código ya existe con esa misma revisión, la fila se omite.</div>' +
      '<textarea class="inp" id="bulkTxt" style="min-height:190px;font-family:ui-monospace,monospace;font-size:12px" ' +
      'placeholder="AND-CC-EL-PL-011&#9;A&#9;Plano de canalizaciones nivel 1&#9;Eléctrica&#9;Plano&#9;Detalle&#9;Sala Eléctrica&#9;AUSENCO&#9;15-09-2026&#9;TR-AUS-0170"></textarea>' +
      '<div id="bulkMsg" style="margin-top:10px"></div>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primary" onclick="procesarCargaMasiva()">Cargar filas</button></div>');
}

function fechaDesdeTexto(t){
  t = str(t).trim();
  if(!t) return '';
  let m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if(m) return m[3] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[1]));
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3]));
  return '';
}
function coincide(lista, valor, porDefecto){
  const v = str(valor).trim().toLowerCase();
  for(let i=0;i<lista.length;i++) if(lista[i].toLowerCase() === v) return lista[i];
  for(let i=0;i<lista.length;i++) if(v && lista[i].toLowerCase().indexOf(v) === 0) return lista[i];
  return porDefecto;
}

function procesarCargaMasiva(){
  const txt = document.getElementById('bulkTxt').value;
  const lineas = txt.split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
  if(!lineas.length){ document.getElementById('bulkMsg').innerHTML = '<div class="badbox">No se pegó ninguna fila.</div>'; return; }

  let agregados = 0, omitidos = 0;
  const detalle = [];
  lineas.forEach(function(linea, i){
    const c = linea.split('\t');
    const codigo = str(c[0]).trim();
    if(!codigo){ omitidos++; detalle.push('Fila ' + (i+1) + ': sin código.'); return; }
    const rev = str(c[1]).trim() || 'A';
    const dup = DB.documentos.some(function(d){
      return d.codigo.toLowerCase() === codigo.toLowerCase() &&
             d.revisiones.some(function(r){ return r.rev.toLowerCase() === rev.toLowerCase(); });
    });
    if(dup){ omitidos++; detalle.push('Fila ' + (i+1) + ': ' + codigo + ' Rev. ' + rev + ' ya existe.'); return; }

    const nuevo = normalizarDoc({
      correlativo: DB.correlativo++,
      codigo: codigo, titulo: str(c[2]).trim(),
      disciplina: coincide(DISCIPLINAS, c[3], 'Eléctrica'),
      tipo: coincide(TIPOS_DOC, c[4], 'Otro'),
      fase: coincide(FASES, c[5], 'Detalle'),
      area: str(c[6]).trim(), emisor: str(c[7]).trim(),
      revisiones: [{
        rev: rev, fechaRecepcion: fechaDesdeTexto(c[8]) || hoyISO(), transmittal: str(c[9]).trim(),
        motivo: 'Carga masiva', incorporacion:'No aplica', estado:'recibido',
        plazoDias: DB.params.plazoRevisionDias
      }]
    });
    DB.documentos.push(nuevo); agregados++;
  });

  guardarDB();
  document.getElementById('bulkMsg').innerHTML =
    '<div class="' + (agregados ? 'help' : 'warnbox') + '"><b>' + agregados + '</b> documento(s) agregado(s), <b>' +
    omitidos + '</b> omitido(s).' + (detalle.length ? '<br>' + detalle.slice(0,8).map(esc).join('<br>') : '') + '</div>';
  if(agregados){ toast(agregados + ' documento(s) cargado(s).', 'ok'); }
}
