/* ==================================================================
   gen57 — Informe diario digital (5.7): validación, cálculos y
   generación del Excel sobre la plantilla maestra "CCV v1.0".
   Navegador: window.G57 (requiere window.X57). Node: module.exports.
   ================================================================== */
(function(root){
'use strict';
const X = (typeof module !== 'undefined' && module.exports) ? require('./xlsx57.js') : root.X57;

const PLANTILLA_VERSION = 'CCV v1.0';
const H = { ACT: '01. Actividades', REC: '02. Recursos', USO: '03. Uso recursos Itemizado ', FOT: '04. Registro Fotográfico ', TT: '05.Tooltime actividades', POD: '6. POD', PRG: '08 Programa', FEC: 'Fecha, N° informe' };

/* ---------- mapa de campos (formulario → hoja/celda) ----------
   Se usa para generar y para el documento "mapa de campos".       */
const MAPA = {
  cabecera: [
    ['contrato.nombre', H.ACT, 'E2', 'Nombre del contrato (configuración del portal: proyecto)'],
    ['contrato.numero', H.ACT, 'E3', 'N.º de contrato (configuración: nContrato)'],
    ['contrato.empresa', H.ACT, 'E4', 'Empresa contratista (configuración: contratista)'],
    ['contrato.jefeProyecto', H.ACT, 'E5', 'Jefe de Proyecto'],
    ['contrato.adminContrato', H.ACT, 'L5', 'Administrador de Contrato MIES (configuración: adminContrato)'],
    ['fecha', H.ACT, 'Q2', 'Fecha del informe (serie de fecha, formato de la plantilla)'],
    ['revision', H.ACT, 'Q3', 'Revisión del informe (00, 01, …)'],
    ['horario', H.ACT, 'Q4', 'Horario del turno (texto “Turno - HH:MM - HH:MM”)'],
    ['jornada', H.ACT, 'Q5', 'Turno / jornada (p. ej. 7x7)'],
    ['numero', H.ACT, 'Q8', 'N.º de informe (correlativo asignado por el servidor)'],
    ['turno', H.ACT, 'B11', 'Rótulo “TURNO …” sobre la tabla de actividades'],
    ['sector', H.ACT, 'C8 + D8', 'Sector: marca “x” en C8 y nombre en D8'],
    ['sectorOtro', H.ACT, 'K8', 'Otro sector (texto)'],
    ['(fórmula)', H.ACT, 'E1, Q6', 'Título y día de la semana: fórmulas de la plantilla conservadas']
  ],
  bloques: [
    ['actividades[]', H.ACT, 'filas 13–19 (A n.º, D EDT, P observaciones); B ítem, F descripción “actividad en ubicación”, N unidad, O cantidad = fórmulas conservadas que leen 08 Programa y 05 Tooltime', 'se insertan filas antes de la 19 copiando formato, combinaciones y fórmulas'],
    ['siguiente[]', H.ACT, 'filas 22–28, columna B (B:Q combinadas)', 'inserción antes de la 28'],
    ['prevencion[]', H.ACT, 'filas 31–35, columna B', 'inserción antes de la 35'],
    ['varios[] + observaciones', H.ACT, 'filas 37–41 (42–43 ocultas en la plantilla; se muestran si se usan)', 'inserción antes de la 43'],
    ['interferencias[]', H.ACT, 'filas 45–46, columna B', 'inserción antes de la 46'],
    ['condiciones', H.ACT, 'casillas de verificación (controles de formulario) filas 49–52', 'estado guardado en ctrlProps y VML'],
    ['(fórmula)', H.ACT, 'D55:F58 resumen de personal', 'fórmulas conservadas (D56 corregida a 02!J15)'],
    ['elaboro.nombre / cargo / fecha', H.ACT, 'C61, C62, C63', 'C63 = fecha fija de elaboración (sin HOY())'],
    ['reviso.nombre / cargo', H.ACT, 'M61, M62', 'M63 y firmas quedan en blanco: no se generan firmas ni aprobaciones'],
    ['dotacion.indirecto[]', H.REC, 'filas 4–14: C cargo, J presentes, K calle larga, L teletrabajo, M descanso, N licencia, O horas, S comentario; I/P/Q/R fórmulas', 'inserción antes de la 14; totales fila 15 se extienden'],
    ['dotacion.directo[]', H.REC, 'filas 16–33 (mismas columnas)', 'inserción antes de la 33; totales fila 34'],
    ['dotacion.gg[]', H.REC, 'filas 35–51 (mismas columnas)', 'inserción antes de la 51; totales fila 52'],
    ['equipos.menores[]', H.REC, 'filas 61–70: C descripción, S operando, U sin operador, V mantención, W panne (1/0), T disponible = fórmula, X horas máquina, Y comentario', 'inserción antes de la 70; S71 = CONTARA'],
    ['equipos.mayores[]', H.REC, 'filas 72–81 (mismas columnas)', 'inserción antes de la 81; S82 = CONTARA'],
    ['usoRecursos[]', H.USO, 'filas 4–21: A ítem, B descripción, H identificación, I unidad, J cantidad, K comentario', 'inserción antes de la 21; área de impresión se extiende'],
    ['fotos[]', H.FOT, '8 marcos (filas 3/7/11/15, columnas B:C y E:F) con leyenda en filas 5/9/13/16', 'sobre 8 fotos se agregan bloques de 4 filas copiando el formato'],
    ['tooltime[]', H.TT, 'filas 10–51: A n.º actividad, B turno, C responsable, D inicio, E término, F área, G sub-área, H cuadrilla, I actividad, J ítem, K descripción, L tarea, M categoría, N cantidad, O unidad, P hombres, S estado, T tipo impacto, U código impacto, X observaciones, Y obs. CODELCO; Q duración, R HH, V causa, W subcausa = fórmulas', 'inserción antes de la 51'],
    ['pod[]', H.POD, 'filas 5–54 (Table_16): B n.º POD, C fecha, D turno, E responsable, F área, G actividad, H fuente, I ítem, K categoría, L Q programada, M Q real, N unidad, P obs., S tipo, T CNC, W descripción CNC, X HH no ganadas, Y plan de acción, Z compromiso, AA cierre, AB responsable; J descripción, O, R, U, V = fórmulas', 'inserción antes de la 54; la tabla se extiende'],
    ['programa (portal)', H.PRG, 'B EDT, C ítem, D descripción, E unidad, F cantidad', 'programa vigente del contrato; fuente de la validación de EDT y de la fórmula de ítem'],
    ['numero / fecha', H.FEC, 'B3, C3 (Tabla1)', 'registro del correlativo emitido']
  ]
};

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const COND = [ // clave, etiqueta, [cumple, no cumple, no aplica] (shapeId del control)
  ['art', 'Tiene ART', [7366, 7389, 7374]],
  ['procedimiento', 'Cumple procedimiento u otro documento', [7367, 7372, 7376]],
  ['programa', 'Se ajusta a programa', [7368, 7373, 7390]],
  ['iluminacion', 'Iluminación del frente de trabajo', [7377, 7381, 7385]],
  ['supervisor', 'Existe supervisor en el área', [7378, 7391, 7386]],
  ['conoce', 'Personal conoce los procedimientos', [7379, 7383, 7387]],
  ['prevencionista', 'Existe prevencionista', [7380, null, 7388]]
];
const ESTADOS_EQ = { operando: 'S', disponible: 'T', sinOperador: 'U', mantencion: 'V', panne: 'W' };

/* ---------- valores con estado: número confirmado / pendiente / no aplica ---------- */
function esNA(v){ return v === 'NA' || v === 'N/A'; }
function esPend(v){ return v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v)); }
function num(v){ return (typeof v === 'number' && isFinite(v)) ? v : (typeof v === 'string' && v.trim() !== '' && !esNA(v) && isFinite(+v.replace(',', '.'))) ? +v.replace(',', '.') : null; }
function celdaNum(v){ const n = num(v); if(n !== null) return n; if(esNA(v)) return 'N/A'; return 'Pendiente'; }
function hm(s){ if(!s) return null; const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function dur(a, b){ const x = hm(a), y = hm(b); if(x === null || y === null) return null; let d = y - x; if(d < 0) d += 1440; return d / 60; } // cruza medianoche
function txt(v){ return v == null ? '' : String(v).trim(); }
function normU(u){ return txt(u).toLowerCase().replace(/\.$/, '').replace(/^c\/u$/, 'un').replace(/^und?$/, 'un').replace(/^u$/, 'un').replace(/^gl$/, 'gl'); }
function pad(n, k){ return String(n).padStart(k, '0'); }

function totales(d){
  const t = { cat: {} }; let hhDir = 0;
  ['indirecto', 'directo', 'gg'].forEach(function(k){
    const rows = (d.dotacion && d.dotacion[k]) || []; const s = { presentes: 0, contratados: 0, hh: 0 };
    rows.forEach(function(r){ const p = num(r.presentes) || 0, h = num(r.horas) || 0; s.presentes += p; s.contratados += p + (num(r.calleLarga) || 0) + (num(r.teletrabajo) || 0) + (num(r.descanso) || 0) + (num(r.licencia) || 0); s.hh += p * h; });
    t.cat[k] = s;
  });
  t.presentes = t.cat.indirecto.presentes + t.cat.directo.presentes + t.cat.gg.presentes;
  t.hhDotacion = t.cat.indirecto.hh + t.cat.directo.hh + t.cat.gg.hh;
  t.hhDirectas = t.cat.directo.hh;
  let hhTT = 0, maxH = 0; const porAct = {};
  (d.tooltime || []).forEach(function(r){ const du = dur(r.inicio, r.fin), h = num(r.hombres); if(du !== null && h !== null){ hhTT += du * h; if(r.act) porAct[r.act] = (porAct[r.act] || 0) + du * h; } if(h !== null && h > maxH) maxH = h; });
  t.hhTooltime = Math.round(hhTT * 100) / 100; t.maxHombres = maxH; t.hhPorActividad = porAct;
  t.duracionTurno = dur(d.horaInicio, d.horaFin);
  return t;
}

/* ---------- validación ---------- */
function validar(d, ctx){
  ctx = ctx || {}; const err = [], av = [];
  const E = function(campo, m){ err.push({ campo: campo, msg: m }); }, A = function(campo, m){ av.push({ campo: campo, msg: m }); };
  const hoy = ctx.hoy || new Date().toISOString().slice(0, 10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) E('fecha', 'Falta la fecha del informe.');
  else if(d.fecha > hoy) E('fecha', 'La fecha del informe no puede ser posterior a hoy.');
  else if(ctx.fechaInicio && d.fecha < ctx.fechaInicio) A('fecha', 'La fecha es anterior al inicio del contrato (' + ctx.fechaInicio + ').');
  if(ctx.fechaOriginal && d.fecha !== ctx.fechaOriginal) E('fecha', 'La fecha de un informe ya emitido no se puede cambiar (' + ctx.fechaOriginal + ').');
  if(!txt(d.turno)) E('turno', 'Indica el turno.');
  if(hm(d.horaInicio) === null || hm(d.horaFin) === null) E('horario', 'Indica la hora de inicio y término del turno (HH:MM).');
  else if(dur(d.horaInicio, d.horaFin) === 0) E('horario', 'El turno no puede durar 0 horas.');
  if(!txt(d.jornada)) E('jornada', 'Indica la jornada (p. ej. 7x7).');
  const c = d.contrato || {};
  if(!txt(c.nombre) || !txt(c.numero) || !txt(c.empresa)) E('contrato', 'Faltan datos del contrato (nombre, número o empresa) en la configuración del portal.');
  if(ctx.contratoNumero && txt(c.numero) !== txt(ctx.contratoNumero)) E('contrato', 'El N.º de contrato (' + c.numero + ') no coincide con la configuración del portal (' + ctx.contratoNumero + ').');
  if(!txt(c.jefeProyecto)) E('contrato.jefeProyecto', 'Indica el Jefe de Proyecto.');
  if(!txt(c.adminContrato)) E('contrato.adminContrato', 'Indica el Administrador de Contrato.');
  if(!txt(d.sector)) E('sector', 'Indica el sector.');
  if(!txt(d.elaboro && d.elaboro.nombre) || !txt(d.elaboro && d.elaboro.cargo)) E('elaboro', 'Indica nombre y cargo de quien elabora.');
  if(!txt(d.reviso && d.reviso.nombre)) A('reviso', 'No se indicó quién revisa: el campo quedará en blanco.');

  const leaf = ctx.programa ? ctx.programa.filter(function(p){ return p.hoja; }) : null;
  const porEdt = {}; (ctx.programa || []).forEach(function(p){ porEdt[p.edt] = p; });
  const itemizado = {}; (ctx.itemizado || []).forEach(function(p){ itemizado[p.i] = p; });
  const acts = d.actividades || [];
  if(!acts.length && !d.sinActividades) E('actividades', 'Registra al menos una actividad ejecutada o marca “Sin actividades ejecutadas en el turno”.');
  const vistos = {}; const nums = {};
  acts.forEach(function(a, i){
    const k = 'actividades[' + i + ']', et = 'Actividad ' + (a.n || i + 1);
    if(!a.n) E(k, et + ': falta el n.º'); else if(nums[a.n]) E(k, et + ': n.º repetido.'); nums[a.n] = 1;
    if(!txt(a.edt)) E(k, et + ': falta el EDT.');
    else if(leaf && !porEdt[a.edt]) E(k, et + ': el EDT ' + a.edt + ' no existe en el programa vigente del contrato.');
    else if(leaf && porEdt[a.edt] && !porEdt[a.edt].hoja) E(k, et + ': el EDT ' + a.edt + ' es una tarea resumen; usa una tarea de detalle.');
    if(!txt(a.descripcion)) E(k, et + ': falta la descripción.');
    if(!txt(a.ubicacion)) E(k, et + ': falta la ubicación.');
    if(!txt(a.unidad)) E(k, et + ': falta la unidad.');
    const pr = porEdt[a.edt]; const it = pr && pr.item ? itemizado[pr.item] : null;
    if(it && txt(a.unidad) && normU(it.u) !== normU(a.unidad)) E(k, et + ': la unidad “' + a.unidad + '” no coincide con la del ítem ' + it.i + ' del contrato (“' + it.u + '”).');
    if(pr && pr.item && !it && txt(a.unidad)) A(k, et + ': el ítem ' + pr.item + ' no tiene unidad en el itemizado; unidad no verificable.');
    if(esPend(a.cantidad)) E(k, et + ': la cantidad ejecutada está pendiente (ingresa el valor, 0 confirmado o N/A).');
    else if(!esNA(a.cantidad) && num(a.cantidad) === null) E(k, et + ': cantidad no numérica.');
    else if(num(a.cantidad) < 0) E(k, et + ': cantidad negativa.');
    const clave = [a.edt, txt(a.descripcion).toLowerCase(), txt(a.ubicacion).toLowerCase()].join('|');
    if(vistos[clave]) E(k, et + ': duplica la actividad ' + vistos[clave] + ' (mismo EDT, descripción y ubicación).'); vistos[clave] = a.n || i + 1;
    if(!(d.tooltime || []).some(function(r){ return String(r.act) === String(a.n); })) E(k, et + ': no tiene registro de HH / Tooltime asociado.');
  });
  const tt = d.tooltime || []; const t = totales(d);
  const ini = hm(d.horaInicio), fin = hm(d.horaFin);
  tt.forEach(function(r, i){
    const k = 'tooltime[' + i + ']', et = 'Tooltime fila ' + (i + 1);
    if(!txt(r.actividad)) E(k, et + ': falta la actividad.');
    if(hm(r.inicio) === null || hm(r.fin) === null) E(k, et + ': falta hora de inicio o término.');
    else if(dur(r.inicio, r.fin) === 0) E(k, et + ': duración 0.');
    if(esPend(r.hombres)) E(k, et + ': falta la cantidad de hombres.');
    else if(num(r.hombres) === null || num(r.hombres) < 0 || num(r.hombres) % 1) E(k, et + ': hombres debe ser un entero ≥ 0.');
    if(r.act && !acts.some(function(a){ return String(a.n) === String(r.act); })) E(k, et + ': la actividad n.º ' + r.act + ' no existe en “Actividades ejecutadas”.');
    if(ini !== null && fin !== null && hm(r.inicio) !== null && hm(r.fin) !== null){
      const dentro = function(m){ return ini <= fin ? (m >= ini && m <= fin) : (m >= ini || m <= fin); };
      if(!dentro(hm(r.inicio)) || !dentro(hm(r.fin))) A(k, et + ': el horario ' + r.inicio + '–' + r.fin + ' queda fuera del turno ' + d.horaInicio + '–' + d.horaFin + '.');
    }
  });
  // solapamiento de una misma cuadrilla (doble conteo de HH)
  const porCuad = {};
  tt.forEach(function(r, i){ const q = txt(r.cuadrilla).toLowerCase(); if(!q || hm(r.inicio) === null || hm(r.fin) === null) return; let a = hm(r.inicio), b = hm(r.fin); if(b <= a) b += 1440; (porCuad[q] = porCuad[q] || []).push([a, b, i]); });
  Object.keys(porCuad).forEach(function(q){ const L = porCuad[q].sort(function(x, y){ return x[0] - y[0]; }); for(let j = 1; j < L.length; j++) if(L[j][0] < L[j - 1][1]) E('tooltime[' + L[j][2] + ']', 'La cuadrilla “' + q + '” tiene registros superpuestos (filas ' + (L[j - 1][2] + 1) + ' y ' + (L[j][2] + 1) + '): doble conteo de HH.'); });
  // dotación
  let hayDot = false; const cargos = {};
  ['indirecto', 'directo', 'gg'].forEach(function(cat){
    ((d.dotacion && d.dotacion[cat]) || []).forEach(function(r, i){
      const k = 'dotacion.' + cat + '[' + i + ']', et = 'Dotación ' + cat + ' fila ' + (i + 1);
      if(!txt(r.cargo)) E(k, et + ': falta el cargo.');
      const ck = txt(r.cargo).toLowerCase();
      if(ck){ if(cargos[ck] === cat) E(k, et + ': el cargo “' + r.cargo + '” está repetido en la misma categoría (doble conteo).'); else if(cargos[ck]) A(k, et + ': el cargo “' + r.cargo + '” aparece también en ' + cargos[ck] + '.'); cargos[ck] = cargos[ck] || cat; }
      ['presentes', 'calleLarga', 'teletrabajo', 'descanso', 'licencia'].forEach(function(f){ if(esPend(r[f])) E(k, et + ': falta “' + f + '” (0 si no hay).'); else if(!esNA(r[f]) && (num(r[f]) === null || num(r[f]) < 0 || num(r[f]) % 1)) E(k, et + ': “' + f + '” debe ser un entero ≥ 0.'); });
      if(num(r.presentes) > 0){ hayDot = true; if(esPend(r.horas) || num(r.horas) === null) E(k, et + ': faltan las horas diarias.'); else if(t.duracionTurno !== null && num(r.horas) > t.duracionTurno + 0.01) E(k, et + ': las horas (' + r.horas + ') superan la duración del turno (' + t.duracionTurno + ' h).'); }
    });
  });
  if(!hayDot) E('dotacion', 'Registra la dotación presente del turno.');
  // conciliación HH
  if(tt.length){
    if(t.maxHombres > t.cat.directo.presentes) E('conciliacion', 'Una fila del Tooltime usa ' + t.maxHombres + ' hombres y la dotación directa presente es ' + t.cat.directo.presentes + '.');
    if(t.hhTooltime > t.hhDirectas + 0.01) E('conciliacion', 'HH del Tooltime (' + t.hhTooltime + ') superan las HH directas de la dotación (' + t.hhDirectas + ').');
    else if(t.hhDirectas > 0 && t.hhTooltime < t.hhDirectas * 0.5) A('conciliacion', 'El Tooltime explica ' + t.hhTooltime + ' de ' + t.hhDirectas + ' HH directas (' + Math.round(t.hhTooltime / t.hhDirectas * 100) + '%).');
  }
  // condiciones de turno
  COND.forEach(function(cd){ const v = (d.condiciones || {})[cd[0]]; if(!v) E('condiciones.' + cd[0], 'Condiciones de turno: falta “' + cd[1] + '”.'); else if(v === 'no' && cd[2][1] === null) E('condiciones.' + cd[0], '“' + cd[1] + '” no tiene opción “No cumple” en la plantilla.'); });
  // equipos
  ['menores', 'mayores'].forEach(function(g){ ((d.equipos && d.equipos[g]) || []).forEach(function(e, i){ const k = 'equipos.' + g + '[' + i + ']', et = 'Equipo ' + g + ' fila ' + (i + 1); if(!txt(e.descripcion)) E(k, et + ': falta la descripción.'); if(!ESTADOS_EQ[e.estado]) E(k, et + ': falta el estado.'); if(esPend(e.hm)) E(k, et + ': faltan las horas máquina (0 si no operó).'); else if(!esNA(e.hm) && (num(e.hm) === null || num(e.hm) < 0)) E(k, et + ': horas máquina inválidas.'); else if(t.duracionTurno !== null && num(e.hm) > t.duracionTurno + 0.01) E(k, et + ': horas máquina (' + e.hm + ') superan la duración del turno.'); if(e.estado !== 'operando' && num(e.hm) > 0) A(k, et + ': registra horas máquina pero su estado no es “operando”.'); }); });
  (d.fotos || []).forEach(function(f, i){ if(!txt(f.descripcion)) E('fotos[' + i + ']', 'Foto ' + (i + 1) + ': falta la descripción.'); if(f.act && !acts.some(function(a){ return String(a.n) === String(f.act); })) E('fotos[' + i + ']', 'Foto ' + (i + 1) + ': la actividad n.º ' + f.act + ' no existe.'); });
  (d.pod || []).forEach(function(p, i){ if(!txt(p.actividad)) E('pod[' + i + ']', 'POD fila ' + (i + 1) + ': falta la actividad.'); if(!esPend(p.qReal) && !esNA(p.qReal) && num(p.qReal) === null) E('pod[' + i + ']', 'POD fila ' + (i + 1) + ': cantidad real inválida.'); });
  return { ok: err.length === 0, errores: err, avisos: av, totales: t };
}

/* ---------- tamaño de imagen (JPEG / PNG) ---------- */
function imgSize(b){
  if(b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0, ext: 'png' };
  if(b[0] === 0xFF && b[1] === 0xD8){ let i = 2; while(i < b.length){ if(b[i] !== 0xFF){ i++; continue; } const m = b[i + 1]; const len = b[i + 2] << 8 | b[i + 3]; if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8], ext: 'jpeg' }; i += 2 + len; } }
  throw new Error('Formato de imagen no admitido (usa JPG o PNG)');
}

/* ---------- generación ---------- */
async function generar(plantilla, d, opts){
  opts = opts || {};
  const b = await X.Book.load(plantilla); await b.loadSST();
  const ACT = await b.sheet(H.ACT), REC = await b.sheet(H.REC), USO = await b.sheet(H.USO), FOT = await b.sheet(H.FOT), TT = await b.sheet(H.TT), POD = await b.sheet(H.POD), PRG = await b.sheet(H.PRG), FEC = await b.sheet(H.FEC);
  const c = d.contrato || {}; const fser = X.dateSerial(d.fecha); const fd = new Date(d.fecha + 'T12:00:00Z');
  const programa = opts.programa || []; const porEdt = {}; programa.forEach(function(p){ porEdt[p.edt] = p; });
  const tt = d.tooltime || []; const acts = d.actividades || [];
  const ttFirst = {}; tt.forEach(function(r){ if(r.act && !ttFirst[r.act]) ttFirst[r.act] = r; });
  const t = totales(d);
  const tituloBase = txt(c.nombre);
  const usar = function(sh, r){ if(sh.rowAttr(r, 'hidden')) sh.rowAttr(r, 'hidden', null); };
  const extiende = async function(sheet, ultima, n, capacidad, modelo){ if(n > capacidad){ await b.insertRows(sheet, ultima, n - capacidad, modelo || ultima - 1); return n - capacidad; } return 0; };

  /* === 01. Actividades (de abajo hacia arriba para no mover lo pendiente) === */
  const L = function(arr){ return (arr || []).map(txt).filter(Boolean); };
  const interf = (d.interferencias || []).map(function(x){ return typeof x === 'string' ? x : [txt(x.texto), x.codigo ? '(CNC ' + x.codigo + ')' : '', x.hh != null && x.hh !== '' ? '— HH no ganadas: ' + x.hh : ''].filter(Boolean).join(' '); }).filter(Boolean);
  await extiende(H.ACT, 46, interf.length, 2, 45);
  interf.forEach(function(s, i){ ACT.setValue('B' + (45 + i), s); usar(ACT, 45 + i); });
  const varios = L(d.varios).concat(txt(d.observaciones) ? ['Observaciones: ' + txt(d.observaciones)] : []);
  if(varios.length > 5){ ACT.rowAttr(42, 'hidden', null); ACT.rowAttr(43, 'hidden', null); }
  await extiende(H.ACT, 43, varios.length, 7, 41);
  varios.forEach(function(s, i){ ACT.setValue('B' + (37 + i), s); usar(ACT, 37 + i); });
  const prev = L(d.prevencion);
  await extiende(H.ACT, 35, prev.length, 5, 34);
  prev.forEach(function(s, i){ ACT.setValue('B' + (31 + i), s); usar(ACT, 31 + i); });
  const sig = (d.siguiente || []).map(function(x){ return typeof x === 'string' ? x : [x.edt ? 'EDT ' + x.edt + ' —' : '', txt(x.texto), num(x.cantidad) !== null ? '(' + num(x.cantidad) + ' ' + txt(x.unidad) + ')' : ''].filter(Boolean).join(' '); }).filter(Boolean);
  await extiende(H.ACT, 28, sig.length, 7, 27);
  sig.forEach(function(s, i){ ACT.setValue('B' + (22 + i), s); usar(ACT, 22 + i); });
  const extraAct = await extiende(H.ACT, 19, acts.length, 7, 18);
  acts.forEach(function(a, i){
    const r = 13 + i; const pr = porEdt[a.edt] || {}; usar(ACT, r);
    ACT.setValue('A' + r, +a.n || a.n); ACT.setValue('D' + r, txt(a.edt)); ACT.setValue('P' + r, txt(a.obs));
    ACT.setFormula('B' + r, ACT.formula('B' + r) || "_xlfn.XLOOKUP(D" + r + ",'08 Programa'!B:B,'08 Programa'!C:C)", txt(pr.item) || '#N/A');
    ACT.setFormula('F' + r, ACT.formula('F' + r), txt(a.descripcion) + ' en ' + txt(a.ubicacion));
    ACT.setFormula('N' + r, ACT.formula('N' + r), txt(a.unidad));
    const cq = celdaNum(a.cantidad); ACT.setFormula('O' + r, ACT.formula('O' + r), cq);
  });
  // cabecera
  ACT.setValue('E2', tituloBase); ACT.setValue('E3', /^\d+$/.test(txt(c.numero)) ? +c.numero : txt(c.numero)); ACT.setValue('E4', txt(c.empresa)); ACT.setValue('E5', txt(c.jefeProyecto)); ACT.setValue('L5', txt(c.adminContrato));
  ACT.setValue('Q2', fser); ACT.setValue('Q3', +d.revision || 0); ACT.setValue('Q4', d.horario || (txt(d.turno) + ' - ' + d.horaInicio + ' - ' + d.horaFin)); ACT.setValue('Q5', txt(d.jornada)); ACT.setValue('Q8', +d.numero);
  ACT.setValue('B11', 'TURNO ' + txt(d.turno).toUpperCase());
  ACT.setValue('C8', 'x'); ACT.setValue('D8', txt(d.sector)); if(txt(d.sectorOtro)) ACT.setValue('K8', txt(d.sectorOtro));
  ACT.setFormula('E1', ACT.formula('E1'), tituloBase + ' \nINFORME DIARIO N°' + d.numero + ' \nACTIVIDADES');
  ACT.setFormula('Q6', ACT.formula('Q6'), DIAS[fd.getUTCDay()]);
  // condiciones de turno
  for(const cd of COND){ const v = (d.condiciones || {})[cd[0]]; const idx = v === 'cumple' ? 0 : v === 'no' ? 1 : v === 'na' ? 2 : -1; for(let k = 0; k < 3; k++) if(cd[2][k]) await b.setCheckbox(H.ACT, cd[2][k], k === idx); }
  // resumen de personal y firmas (filas desplazadas por las inserciones)
  const off = extraAct + Math.max(0, sig.length - 7) + Math.max(0, prev.length - 5) + Math.max(0, varios.length - 7) + Math.max(0, interf.length - 2);
  const rr = function(r){ return r + off; };
  const tc = t.cat;
  ACT.setFormula('D' + rr(55), ACT.formula('D' + rr(55)), tc.directo.presentes); ACT.setFormula('F' + rr(55), ACT.formula('F' + rr(55)), tc.directo.hh);
  ACT.setFormula('D' + rr(56), ACT.formula('D' + rr(56)), tc.indirecto.presentes); ACT.setFormula('F' + rr(56), ACT.formula('F' + rr(56)), tc.indirecto.hh);
  ACT.setFormula('D' + rr(57), ACT.formula('D' + rr(57)), tc.gg.presentes); ACT.setFormula('F' + rr(57), ACT.formula('F' + rr(57)), tc.gg.hh);
  ACT.setFormula('D' + rr(58), ACT.formula('D' + rr(58)), t.presentes); ACT.setFormula('F' + rr(58), ACT.formula('F' + rr(58)), t.hhDotacion);
  ACT.setValue('C' + rr(61), txt(d.elaboro && d.elaboro.nombre)); ACT.setValue('C' + rr(62), txt(d.elaboro && d.elaboro.cargo));
  ACT.setValue('C' + rr(63), X.dateSerial(d.fechaElaboracion || d.fecha));
  ACT.setFormula('C' + rr(65), ACT.formula('C' + rr(65)), txt(d.elaboro && d.elaboro.cargo));
  ACT.setValue('M' + rr(61), txt(d.reviso && d.reviso.nombre)); ACT.setValue('M' + rr(62), txt(d.reviso && d.reviso.cargo));
  ACT.setFormula('M' + rr(65), ACT.formula('M' + rr(65)), txt(d.reviso && d.reviso.cargo));

  /* === 02. Recursos (de abajo hacia arriba) === */
  const eqBlock = async function(lista, r0, r1, modelo){
    const n = (lista || []).length; await extiende(H.REC, r1, n, r1 - r0 + 1, modelo);
    (lista || []).forEach(function(e, i){ const r = r0 + i; usar(REC, r); REC.setValue('C' + r, txt(e.descripcion)); ['S', 'U', 'V', 'W'].forEach(function(col){ REC.setValue(col + r, ESTADOS_EQ[e.estado] === col ? 1 : 0); }); REC.setFormula('T' + r, REC.formula('T' + r) || ('1-S' + r + '-U' + r + '-V' + r + '-W' + r), e.estado === 'disponible' ? 1 : 0); REC.setValue('X' + r, celdaNum(e.hm)); if(txt(e.comentario)) REC.setValue('Y' + r, txt(e.comentario)); });
    return n;
  };
  await eqBlock(d.equipos && d.equipos.mayores, 72, 81, 73);
  await eqBlock(d.equipos && d.equipos.menores, 61, 70, 62);
  const dotBlock = async function(lista, r0, r1, modelo){
    const n = (lista || []).length; await extiende(H.REC, r1, n, r1 - r0 + 1, modelo);
    (lista || []).forEach(function(p, i){ const r = r0 + i; usar(REC, r); REC.setValue('C' + r, txt(p.cargo)); ['J:presentes', 'K:calleLarga', 'L:teletrabajo', 'M:descanso', 'N:licencia', 'O:horas'].forEach(function(cf){ const q = cf.split(':'); REC.setValue(q[0] + r, (q[1] === 'horas' && num(p.presentes) === 0 && esPend(p.horas)) ? 'N/A' : celdaNum(p[q[1]])); }); if(txt(p.comentario)) REC.setValue('S' + r, txt(p.comentario));
      const J = num(p.presentes) || 0, K = num(p.calleLarga) || 0, Lq = num(p.teletrabajo) || 0, M = num(p.descanso) || 0, N = num(p.licencia) || 0, O = num(p.horas) || 0;
      REC.setFormula('I' + r, REC.formula('I' + r), J + K + Lq + M + N); REC.setFormula('P' + r, REC.formula('P' + r), J * O); REC.setFormula('Q' + r, REC.formula('Q' + r), O * Lq); REC.setFormula('R' + r, REC.formula('R' + r), K * O); });
    return Math.max(n, r1 - r0 + 1) - (r1 - r0 + 1);
  };
  await dotBlock(d.dotacion && d.dotacion.gg, 35, 51, 36);
  await dotBlock(d.dotacion && d.dotacion.directo, 16, 33, 17);
  await dotBlock(d.dotacion && d.dotacion.indirecto, 4, 14, 5);
  REC.setFormula('F1', REC.formula('F1'), tituloBase + '\nINFORME DIARIO N°' + d.numero + '\nDOTACIÓN DE PERSONAL Y EQUIPOS');

  /* === 03. Uso de recursos === */
  const uso = d.usoRecursos || [];
  await extiende(H.USO, 21, uso.length, 18, 20);
  uso.forEach(function(u, i){ const r = 4 + i; usar(USO, r); USO.setValue('A' + r, txt(u.item)); USO.setValue('B' + r, txt(u.descripcion)); USO.setValue('H' + r, txt(u.identificacion)); USO.setValue('I' + r, txt(u.unidad)); USO.setValue('J' + r, celdaNum(u.cantidad)); USO.setValue('K' + r, txt(u.comentario)); });
  USO.setFormula('C1', USO.formula('C1'), tituloBase + '\nINFORME DIARIO N°' + d.numero + '\nUSO DE RECURSOS UNITARIOS DE TRABAJOS');

  /* === 05. Tooltime === */
  await extiende(H.TT, 51, tt.length, 42, 50);
  const yaQ = {};
  tt.forEach(function(x, i){
    const r = 10 + i; usar(TT, r); const first = x.act && !yaQ[x.act]; if(x.act) yaQ[x.act] = true;
    const a = x.act ? acts.filter(function(z){ return String(z.n) === String(x.act); })[0] : null;
    if(first) TT.setValue('A' + r, +x.act || x.act);
    TT.setValue('B' + r, txt(x.turno || d.turno)); TT.setValue('C' + r, txt(x.responsable));
    TT.setValue('D' + r, hm(x.inicio) / 1440); TT.setValue('E' + r, hm(x.fin) / 1440);
    TT.setValue('F' + r, txt(x.area)); TT.setValue('G' + r, a ? txt(a.ubicacion) : txt(x.subarea)); TT.setValue('H' + r, txt(x.cuadrilla));
    TT.setValue('I' + r, a ? txt(a.descripcion) : txt(x.actividad)); TT.setValue('J' + r, txt(x.item || (a && porEdt[a.edt] && porEdt[a.edt].item)));
    TT.setValue('K' + r, txt(x.descripcion)); TT.setValue('L' + r, txt(x.tarea)); TT.setValue('M' + r, txt(x.categoria));
    if(first && a){ TT.setValue('N' + r, celdaNum(a.cantidad)); TT.setValue('O' + r, txt(a.unidad)); } else if(!a){ if(!esPend(x.q)) TT.setValue('N' + r, celdaNum(x.q)); TT.setValue('O' + r, txt(x.unidad)); }
    TT.setValue('P' + r, celdaNum(x.hombres)); TT.setValue('S' + r, txt(x.estado)); TT.setValue('T' + r, txt(x.tipoImpacto)); TT.setValue('U' + r, txt(x.codigoImpacto)); TT.setValue('X' + r, txt(x.obs)); TT.setValue('Y' + r, txt(x.obsCodelco));
    const du = dur(x.inicio, x.fin); TT.setFormula('Q' + r, TT.formula('Q' + r), du !== null ? du / 24 : ''); TT.setFormula('R' + r, TT.formula('R' + r), du !== null && num(x.hombres) !== null ? num(x.hombres) * du : '');
    const cnc = (opts.listasCNC || {})[txt(x.codigoImpacto)]; TT.setFormula('V' + r, TT.formula('V' + r), x.codigoImpacto ? (cnc ? cnc[0] : 'N/A') : ''); TT.setFormula('W' + r, TT.formula('W' + r), x.codigoImpacto ? (cnc ? cnc[1] : 'N/A') : '');
  });
  TT.setValue('B1', 'Tablero Tooltime Actividades\n' + txt(c.numero) + ' ' + tituloBase + '\n' + DIAS[fd.getUTCDay()].replace(/^./, function(s){ return s.toUpperCase(); }) + ', ' + fd.getUTCDate() + ' de ' + MESES[fd.getUTCMonth()] + ' de ' + fd.getUTCFullYear() + '\nIngresar todas las actividades realizadas durante el día');

  /* === 6. POD === */
  const pod = d.pod || [];
  await extiende(H.POD, 54, pod.length, 50, 53);
  pod.forEach(function(p, i){
    const r = 5 + i; usar(POD, r);
    if(p.numeroPod) POD.setValue('B' + r, +p.numeroPod || p.numeroPod); if(p.fechaPod) POD.setValue('C' + r, X.dateSerial(p.fechaPod));
    POD.setValue('D' + r, txt(p.turno)); POD.setValue('E' + r, txt(p.responsable)); POD.setValue('F' + r, txt(p.area)); POD.setValue('G' + r, txt(p.actividad)); POD.setValue('H' + r, txt(p.fuente)); POD.setValue('I' + r, txt(p.item)); { const pi = programa.filter(function(q){ return q.item && q.item === txt(p.item); })[0]; POD.setFormula('J' + r, POD.formula('J' + r), p.item ? (pi ? pi.desc : 'N/A') : ''); } POD.setValue('K' + r, txt(p.categoria));
    POD.setValue('L' + r, esPend(p.qProg) ? null : celdaNum(p.qProg)); POD.setValue('M' + r, esPend(p.qReal) ? null : celdaNum(p.qReal)); POD.setValue('N' + r, txt(p.unidad)); POD.setValue('P' + r, txt(p.obs));
    POD.setValue('S' + r, txt(p.tipo)); POD.setValue('T' + r, txt(p.cnc)); POD.setValue('W' + r, txt(p.descCnc)); if(!esPend(p.hhNoGanadas)) POD.setValue('X' + r, celdaNum(p.hhNoGanadas)); POD.setValue('Y' + r, txt(p.planAccion)); if(p.fechaCompromiso) POD.setValue('Z' + r, X.dateSerial(p.fechaCompromiso)); if(p.fechaCierre) POD.setValue('AA' + r, X.dateSerial(p.fechaCierre)); POD.setValue('AB' + r, txt(p.responsableAccion));
    const L5 = num(p.qProg), M5 = num(p.qReal); const cum = (L5 !== null && M5 !== null) ? (M5 - L5 >= 0 ? 1 : 0) : '';
    POD.setFormula('O' + r, POD.formula('O' + r), cum); POD.setFormula('R' + r, POD.formula('R' + r), cum === 0 ? txt(p.actividad) : '');
  });

  if(4 + pod.length > 49) b.setDefinedName('_xlnm.Print_Area', H.POD, "'6. POD'!$A$1:$AB$" + (4 + pod.length));

  /* === 08 Programa (programa vigente del portal) === */
  programa.forEach(function(p, i){ const r = 2 + i; PRG.setValue('B' + r, p.edt); if(p.item) PRG.setValue('C' + r, p.item); PRG.setValue('D' + r, p.desc); if(p.unidad) PRG.setValue('E' + r, p.unidad); if(num(p.cantidad) !== null) PRG.setValue('F' + r, num(p.cantidad)); });
  FEC.setValue('B3', fser); FEC.setValue('C3', pad(d.numero, 4));

  /* === 04. Registro fotográfico === */
  const fotos = (d.fotos || []).filter(function(f){ return opts.fotos && opts.fotos[f.id]; });
  const drw = await b.drawingOf(H.FOT);
  const logos = (await b.listPictures(drw)).filter(function(p){ return p.from.row === 0; });
  let pares = [[3, 5], [7, 9], [11, 13], [15, 16]];
  if(fotos.length > 8){
    const k = Math.ceil((fotos.length - 8) / 2);
    await b.insertRows(H.FOT, 15, 4 * k, [11, 12, 13, 14]);
    pares = [[3, 5], [7, 9], [11, 13]]; for(let j = 0; j < k; j++) pares.push([15 + 4 * j, 17 + 4 * j]); pares.push([15 + 4 * k, 16 + 4 * k]);
  }
  const colsXml = /<cols>([\s\S]*?)<\/cols>/.exec(FOT.pre)[1]; const anchoCol = {};
  colsXml.replace(/<col\b([^>]*)\/>/g, function(_, a){ const o = {}; a.replace(/(\w+)="([^"]*)"/g, function(__, k2, v){ o[k2] = v; }); for(let ci = +o.min; ci <= +o.max; ci++) anchoCol[ci - 1] = Math.trunc(((256 * (+o.width) + Math.trunc(128 / 7)) / 256) * 7) * 9525; });
  const nuevas = [];
  fotos.forEach(function(f, i){
    const par = pares[Math.floor(i / 2)]; const lado = i % 2; const c0 = lado ? 4 : 1; const rowIdx = par[0] - 1;
    const boxW = anchoCol[c0] + anchoCol[c0 + 1]; const boxH = Math.round(parseFloat(FOT.rowAttr(par[0], 'ht') || '280.5') * 12700);
    const im = opts.fotos[f.id]; const sz = imgSize(im.bytes); const s = Math.min(boxW / sz.w, boxH / sz.h); const w = Math.round(sz.w * s), h = Math.round(sz.h * s);
    const ox = Math.round((boxW - w) / 2), oy = Math.round((boxH - h) / 2);
    const pos = function(x){ let col = c0, rest = x; while(rest > anchoCol[col] && col < c0 + 2){ rest -= anchoCol[col]; col++; } return { col: col, off: rest }; };
    const a0 = pos(ox), a1 = pos(ox + w);
    nuevas.push({ from: { col: a0.col, colOff: a0.off, row: rowIdx, rowOff: oy }, to: { col: a1.col, colOff: a1.off, row: rowIdx, rowOff: oy + h }, cx: w, cy: h, bytes: im.bytes, ext: sz.ext === 'png' ? 'png' : 'jpeg', descr: txt(f.descripcion) });
    const cap = (f.act ? 'Actividad ' + f.act + ' — ' : '') + txt(f.descripcion);
    FOT.setValue((lado ? 'E' : 'B') + par[1], cap);
  });
  await b.setPictures(drw, logos, nuevas);
  FOT.setFormula('C1', FOT.formula('C1'), tituloBase + '\nINFORME DIARIO N°' + d.numero + '\nREGISTRO FOTOGRÁFICO');

  /* === propiedades del documento === */
  const titulo = 'Informe diario CCV N°' + pad(d.numero, 4) + ' Rev' + pad(d.revision || 0, 2) + ' (' + d.fecha + ')';
  let core = await b.text('docProps/core.xml'); core = core.replace(/<dc:title>[\s\S]*?<\/dc:title>/, '<dc:title>' + X.xmlEsc(titulo) + '</dc:title>').replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, '<cp:lastModifiedBy>' + X.xmlEsc(txt(opts.usuario) || 'Control de Contrato CCV') + '</cp:lastModifiedBy>').replace(/(<dcterms:modified[^>]*>)[^<]*/, '$1' + (opts.ahora || new Date().toISOString()).replace(/\.\d+Z$/, 'Z'));
  b.put('docProps/core.xml', core);
  const bytes = await b.save({ type: opts.tipo || 'uint8array' });
  return { bytes: bytes, nombre: nombreArchivo(c.numero, d.fecha, d.numero, d.revision), plantilla: PLANTILLA_VERSION };
}

/* programa vigente del portal → filas de '08 Programa' */
function programaDesde(tareas, itemizado){
  const it = {}; (itemizado || []).forEach(function(p){ it[p.i] = p; });
  return (tareas || []).map(function(t){ const m = /^\s*(\d+(?:\.\d+)*)\s*[-–]\s*(.*)$/.exec(t.n || ''); const item = m ? m[1] : ''; const p = item ? it[item] : null;
    return { edt: String(t.w), item: item, desc: m ? m[2].trim() : String(t.n || '').trim(), unidad: p ? p.u : '', cantidad: p ? p.q : null, hoja: !t.S }; });
}

function nombreArchivo(contrato, fecha, numero, rev){ return '5.7_Informe_Diario_CCV_' + txt(contrato) + '_' + fecha + '_N' + pad(numero, 4) + '_Rev' + pad(rev || 0, 2) + '.xlsx'; }

const api = { generar: generar, programaDesde: programaDesde, validar: validar, totales: totales, nombreArchivo: nombreArchivo, MAPA: MAPA, COND: COND, H: H, PLANTILLA_VERSION: PLANTILLA_VERSION, dur: dur, hm: hm, num: num, esNA: esNA, esPend: esPend, imgSize: imgSize };
if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.G57 = api;
})(typeof window !== 'undefined' ? window : this);
