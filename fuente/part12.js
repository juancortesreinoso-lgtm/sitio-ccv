/* ==================================================================
   ===============   02 CALIDAD — CARPETA EN GOOGLE DRIVE  ==========
   ==================================================================
   La carpeta de calidad (PIE / ITP / protocolos / dossier) vive en
   Google Drive y la administra el encargado de calidad. Este módulo
   la muestra en modo LECTURA con la vista incrustada de Drive:
     · siempre refleja el contenido actual (cada carga y cada 5 min);
     · un clic en un documento lo abre en el visor de Drive (solo
       lectura para quien no tenga permiso de edición en Drive);
     · nada se guarda en la app: no hay que "cargar" documentos aquí.
   Requisito: la carpeta compartida como "Cualquier persona con el
   enlace → Lector" (o con las personas que deban verla).
   ================================================================== */

const CALIDAD_REFRESCO_MS = 5 * 60 * 1000;
const CALIDAD_UI = { vista: 'list', timer: null };

function idCarpetaDrive(url){
  const m = str(url).match(/folders\/([A-Za-z0-9_-]{10,})/) || str(url).match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : '';
}
function urlCarpetaCalidad(){ return str(DB.contrato.carpetaCalidad || CARPETA_CALIDAD_URL).trim(); }
function urlEmbebidaCalidad(){
  const id = idCarpetaDrive(urlCarpetaCalidad());
  return id ? 'https://drive.google.com/embeddedfolderview?id=' + id + '#' + CALIDAD_UI.vista : '';
}

function renderCalidad(){
  const url = urlCarpetaCalidad(), id = idCarpetaDrive(url);
  let html = '';
  html += '<div class="page-title"><h1>02 — Calidad (PIE / ITP / Protocolos)</h1>' +
          '<span class="pill ok" style="margin-top:4px"><span class="dot"></span>Carpeta en Google Drive · solo lectura</span></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> La carpeta de calidad del contrato tal como está <b>hoy</b> en Google Drive: PIE/ITP, protocolos de montaje y ensayo, ' +
          'registros firmados y dossier. La administra el encargado de calidad directamente en Drive; aquí se consulta. ' +
          'Cada documento que se agregue o reemplace en Drive aparece solo (la vista se actualiza al abrir el módulo y cada 5 minutos). ' +
          '<b>Un clic en un documento lo abre en el visor de Drive</b> en una pestaña nueva; los subcarpetas se navegan con doble clic. ' +
          'Nadie puede editar ni borrar desde aquí.</div>';
  if(!id){
    html += '<div class="badbox">No hay una carpeta de calidad configurada o la URL no es de una carpeta de Google Drive. ' +
            'Configúrela en <a href="#/config">09 — Configuración del Contrato</a> (campo "Carpeta de Calidad").</div>';
    return html;
  }
  html += '<div class="toolbar">' +
    '<a class="btn primary" href="' + attr(url) + '" target="_blank" rel="noopener">▲ Abrir carpeta en Google Drive</a>' +
    '<button class="btn" onclick="refrescarCalidad()" title="Volver a leer la carpeta">↻ Actualizar</button>' +
    '<span class="spacer"></span>' +
    '<span style="font-size:12px;color:var(--text-2)">Vista:</span>' +
    '<button class="btn sm' + (CALIDAD_UI.vista === 'list' ? ' primary' : '') + '" onclick="vistaCalidad(\'list\')">☰ Lista</button>' +
    '<button class="btn sm' + (CALIDAD_UI.vista === 'grid' ? ' primary' : '') + '" onclick="vistaCalidad(\'grid\')">▦ Cuadrícula</button>' +
    '<span id="calidadHora" style="font-size:11.5px;color:var(--text-3);margin-left:8px"></span>' +
  '</div>';
  html += '<div class="card" style="overflow:hidden">' +
          '<iframe id="calidadFrame" class="drive-frame" src="' + attr(urlEmbebidaCalidad()) + '" title="Carpeta de calidad en Google Drive" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '</div>';
  html += '<p class="sub" style="margin-top:12px">Si en lugar de la lista aparece "Necesitas acceso" o una pantalla de inicio de sesión, la carpeta no está compartida con enlace: ' +
          'en Drive → clic derecho sobre la carpeta → <b>Compartir</b> → Acceso general: <b>Cualquier persona con el enlace · Lector</b>. ' +
          'Quien edite en Drive sigue necesitando su permiso de editor; la app no otorga permisos.</p>';
  html += '<details class="acc" style="margin-top:10px"><summary>Próximas etapas de este módulo</summary>' +
          '<ul class="wip-list"><li>Matriz PIE / ITP por sistema y actividad con hold points y witness points.</li>' +
          '<li>Estado de firma de protocolos y registros de ensayo (megado, torque, continuidad, puesta a tierra, pruebas funcionales).</li>' +
          '<li>Índice del dossier de calidad para la entrega final.</li></ul></details>';
  return html;
}
function renderCalidadPost(){
  marcarHoraCalidad();
  if(CALIDAD_UI.timer) clearInterval(CALIDAD_UI.timer);
  CALIDAD_UI.timer = setInterval(function(){
    if(ESTADO_UI.ruta !== 'calidad'){ clearInterval(CALIDAD_UI.timer); CALIDAD_UI.timer = null; return; }
    refrescarCalidad(true);
  }, CALIDAD_REFRESCO_MS);
}
function marcarHoraCalidad(){
  const el = document.getElementById('calidadHora');
  if(el) el.textContent = 'Leída a las ' + new Date().toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
}
function refrescarCalidad(silencioso){
  const f = document.getElementById('calidadFrame');
  if(!f) return;
  /* recarga forzada (la URL puede ser la misma) */
  const s = urlEmbebidaCalidad(); f.src = 'about:blank'; setTimeout(function(){ f.src = s; }, 50);
  marcarHoraCalidad();
  if(!silencioso) toast('Carpeta de calidad actualizada desde Google Drive.', 'ok', 2500);
}
function vistaCalidad(v){ CALIDAD_UI.vista = v === 'grid' ? 'grid' : 'list'; render(); }
