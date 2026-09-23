/* ==================================================================
   ===============  VISTA 1.5 — LISTADO DE CIRCUITOS Y CABLES  ======
   ==================================================================
   Toma el listado de cables del GMD Wiring Manual (CABLES_MANUAL) y
   lo clasifica según las Bases Técnicas Rev 0:
     · dónde va cada extremo (E-House / terreno),
     · quién suministra el cable (DAND, Innomotics, Contratista),
     · si su tendido / cambio es alcance del Contratista y por qué,
     · datos técnicos para ejecutarlo (tipo, sección, tensión,
       requisitos de tendido, largo).
   Los datos que se levantan en obra (largo medido, estado,
   observaciones) se guardan en DB.circuitos por tag.
   ================================================================== */

/* ---- Ubicaciones (+1.xxx) del manual: descripción y zona ---- */
const UBIC = {
  'B1':  ['Contenedor E-House · sala de control (climatización)', 'ehouse'],
  'B2':  ['Contenedor E-House · sala de control', 'ehouse'],
  'B3':  ['Contenedor E-House · compartimento baterías / control', 'ehouse'],
  'B4':  ['Sección de potencia (gabinetes cicloconvertidor)', 'ehouse'],
  'B09': ['Alumbrado y tomas E-House (=Z01)', 'ehouse'],
  'B01': ['Gabinete auxiliar E-House', 'ehouse'],
  'B10': ['UPS 230 V (+1.B10)', 'ehouse'],
  'B11': ['Alimentador UPS / parada de emergencia', 'ehouse'],
  'B12': ['Gabinete PLC (=N40) bornes X3/X4', 'ehouse'],
  'B13': ['Gabinete PLC y protecciones (+1.B13)', 'ehouse'],
  'B14': ['Gabinete PLC SIMATIC S7 (=N40 +1.B14)', 'ehouse'],
  'B16': ['Gabinete de señales de transformadores y protección (+1.B16)', 'ehouse'],
  'B17': ['Gabinete auxiliar: UPS, SITOP, temperatura trafo excitación (+1.B17)', 'ehouse'],
  'B18': ['Gabinete regulador de lazo cerrado (+1.B18)', 'ehouse'],
  'B20': ['Unidad de enfriamiento del convertidor', 'ehouse'],
  'B20.1':['Unidad de enfriamiento del convertidor (bombas =H02…H05)', 'ehouse'],
  'B21': ['Sección de potencia sistema 1 (puentes =G11 =G12 =G13)', 'ehouse'],
  'B22': ['Sección de potencia sistema 2 (puentes =G21 =G22 =G23)', 'ehouse'],
  'B25': ['Panel de detección de incendio E-House (=N90)', 'ehouse'],
  'B30': ['Transformador de excitación +1.B30 (patio de transformadores)', 'campo'],
  'B31': ['Rectificador de excitación SINAMICS DCM (+1.B31)', 'ehouse'],
  'B32': ['Gabinete cargador 24 Vcc / SITOP (+1.B32)', 'ehouse'],
  'B33': ['Banco de baterías 24 Vcc (+1.B33)', 'ehouse'],
  'B35': ['Unidad compresor HVAC (+1.B35)', 'ehouse'],
  'B36': ['Gabinete de interfaz SSAA / señales de terreno (+1.B36)', 'ehouse'],
  'B42': ['Iluminación E-House', 'ehouse'],
  'B43': ['Unidad HVAC / calefacción (+1.B43)', 'ehouse'],
  'B44': ['Tablero de distribución BT SSAA (+1.B44)', 'ehouse'],
  'B46': ['Tablero auxiliar E-House (+1.B46)', 'ehouse'],
  'B47': ['Iluminación E-House', 'ehouse'], 'B48': ['Iluminación E-House', 'ehouse'],
  'B61': ['Gabinete de servidores y red (+1.B61)', 'ehouse'],
  'C12': ['Transformador del convertidor +1.C11 (secundarios)', 'campo'],
  'C22': ['Transformador del convertidor +1.C21 (secundarios)', 'campo'],
  'C32': ['Transformador del convertidor +1.C31 (secundarios)', 'campo'],
  'U1':  ['Motor anillo +1.U1 (cajas de bornes estator / rotor)', 'campo'],
  'U11': ['Seccionador =K01 sistema 1 (S91T), área molino', 'campo'],
  'U12': ['Seccionador =K01 sistema 2 (S92T), área molino', 'campo'],
  'U13': ['Seccionador =K01 excitación (S93T), área molino', 'campo'],
  'U14': ['Área molino (eje 2)', 'campo'], 'U17': ['Área molino', 'campo'],
  'U15': ['Caja de transductores LEM / punto estrella (+1.U15)', 'campo'],
  'U18': ['Caja punto estrella motor (+1.U18)', 'campo'],
  'U21': ['Caja de señales del motor (+1.U21)', 'campo'],
  'U23': ['Panel local de giro lento (creeping) +1.U23', 'campo'],
  'U3':  ['Ventilación motor (VE 1001)', 'campo'],
  'EARTH': ['Malla de tierra de planta (CODELCO)', 'campo'],
  'CUSTOMER': ['Malla de tierra de planta (CODELCO)', 'campo'],
  'DCS': ['DCS / sala de control planta (CODELCO)', 'campo'],
  'CELDA16': ['Celda 16 switchgear 13,2 kV existente', 'campo'],
  'CELDA19': ['Celda 19 switchgear 13,2 kV existente', 'campo']
};
function ubicDe(tag){
  const t = str(tag);
  let m = t.match(/\+1\.(B\d+(?:\.\d)?|U\d+|C\d+)/);
  if(m && UBIC[m[1]]) return { cod: m[1], desc: UBIC[m[1]][0], zona: UBIC[m[1]][1] };
  if(/EARTH|CUSTOMER/i.test(t)) return { cod:'EARTH', desc: UBIC.EARTH[0], zona:'campo' };
  if(/DCS|Cust\.Plant/i.test(t)) return { cod:'DCS', desc: UBIC.DCS[0], zona:'campo' };
  if(/CELDA(\d+)/i.test(t)){ const c = 'CELDA' + t.match(/CELDA(\d+)/i)[1]; return { cod:c, desc: (UBIC[c]||[c])[0], zona:'campo' }; }
  m = t.match(/\+1\.(\w+)/);
  return { cod: m ? m[1] : '', desc: m ? 'Ubicación +1.' + m[1] : 'Sin ubicación indicada', zona: 'ehouse' };
}

/* ---- Tensión de aislación por tipo de cable ---- */
function tensionCable(tipo){
  const t = str(tipo).toUpperCase();
  if(/3,6\/6|3\.6\/6/.test(t)) return '3,6 / 6 kV';
  if(/6,6 KV|6\.6 KV/.test(t)) return '6,6 kV';
  if(/NSGAF/.test(t)) return '1,8 / 3 kV (verificar hoja de datos)';
  if(/NSHXAFOEU|N2XH|RZ1|ÖLFLEX|OLFLEX/.test(t)) return '0,6 / 1 kV';
  if(/H07ZZ|H07RN/.test(t)) return '450 / 750 V';
  if(/JE-LIHCH|HSLCH|HSLH|LIHCH|HMH|PAAR|LI6Y/.test(t)) return '300 / 500 V (control)';
  if(/PROFIBUS|PROFINET|RJ45|IE |DP/.test(t)) return 'comunicación (80 V rms)';
  if(/FO|FOC|LWL|FIBRE|FIBER/.test(t)) return 'fibra óptica';
  return '—';
}

/* ---- Clasificación de cada cable ---- */
function clasificarCable(c){
  const tag = c[0], tipo = str(c[3]), cond = str(c[4]), cross = str(c[6]);
  const de = ubicDe(c[1]), a = ubicDe(c[2]);
  const campo = (de.zona === 'campo') || (a.zona === 'campo');
  const tU = tipo.toUpperCase();
  const esFO = /FO\b|FOC|LWL|FIBRE|FIBER/.test(tU) || cross === 'FO';
  const esPotMT = /NHXSGAFHXÖ|SISIF|NSGAF/.test(tU);
  const esLEM = /^K01-W(11|13|21|23)$/.test(tag) || /N11-W70/.test(tag);
  const esTierra = /RZ1-K|-W\d+E$/.test(tU + ' ' + tag) || /EARTH/i.test(c[1] + c[2]);

  let grupo, suministro, alcance, alcanceTxt, partida;
  if(/^C0[123]-W0[1-6]/.test(tag)) grupo = 'Fuerza — trafo convertidor → CCV (1.200 V)';
  else if(/^G[12][123]-W01\./.test(tag) || /^K01-W(1|2)\d\./.test(tag)) grupo = 'Fuerza — CCV → estator (baja frecuencia)';
  else if(/^E01-W0|^J01-W0[12]\.|^K01-W3\d\./.test(tag)) grupo = 'Excitación (trafo → rectificador → rotor)';
  else if(esTierra) grupo = 'Puesta a tierra';
  else if(esFO) grupo = 'Comunicaciones / fibra óptica';
  else if(/PROFIBUS|PROFINET|RJ45|IE FC|IE TP|^DP/.test(tU)) grupo = 'Comunicaciones / fibra óptica';
  else if(/^(H0|Z0|X5|X4|L\d|M0|J22|B5|B6|B7|B8)/.test(tag) && /H07|N2XH|ÖLFLEX|P5|P3|C1|C4/.test(tU + ' ' + tag)) grupo = 'SSAA / fuerza BT';
  else if(esLEM) grupo = 'Transductores LEM';
  else grupo = 'Control y señales';

  if(!campo){
    suministro = 'Innomotics (precableado en fábrica)';
    alcance = 'NO';
    alcanceTxt = 'Cable interno de la E-House: viene tendido y probado en fábrica (FAT en Santiago, ESPME-00001 etapa 2). El Contratista no lo tiende ni lo cambia; solo verifica que no haya sufrido daño en el transporte/armado y apoya al personal de integración de Innomotics (BT 6.2.19). Cualquier cambio lo define Innomotics.';
    partida = 'BT 6.2.19 Apoyo a la integración';
  }else if(esPotMT){
    suministro = 'CODELCO DAND (bodega KM7)';
    alcance = 'SÍ';
    alcanceTxt = 'Cable de potencia principal aportado por DAND (BT 10.4). El Contratista lo retira de bodega KM7, lo traslada, tiende por las escalerillas nuevas, confecciona terminales, conexiona en ambos extremos y ejecuta las pruebas (BT 4.2 "Montaje de cables, conexionado y pruebas", partidas 6.2.10, 6.2.11 terminales 500/350 MCM, 6.2.24 tendido). La conexión definitiva al molino se hace en la parada de planta (BT 5.7, tie-ins 6.2.18).';
    partida = 'BT 6.2.10 · 6.2.11 · 6.2.18 · 6.2.24';
  }else if(esFO){
    suministro = 'Contratista';
    alcance = 'SÍ';
    alcanceTxt = 'Fibra óptica de terreno: suministro, soportación, tendido, fusionado, conexionado y certificación por el Contratista (BT 4.2 "Suministro y montaje de F.O.", partidas 6.2.12 y 6.2.14). Nota del manual: "FO cables by FEAG" aplica a las fibras internas de los gabinetes, no a las de terreno.';
    partida = 'BT 6.2.12 · 6.2.14';
  }else if(esLEM){
    suministro = 'Contratista';
    alcance = 'SÍ';
    alcanceTxt = 'Cable de los transductores de corriente LEM del punto estrella: suministro e instalación por el Contratista (BT partida 6.2.15) según detalle de conexionado 300EL-0001. Debe tenderse a prueba de cortocircuito ("cables to be layed short-circuit proof", manual de cableado).';
    partida = 'BT 6.2.15';
  }else if(esTierra){
    suministro = 'Por confirmar (106EL: CODELCO · BT 6.2.13: Contratista)';
    alcance = 'SÍ';
    alcanceTxt = 'Conexión a la malla de tierra de planta: tendido y conexionado por el Contratista dentro de "Suministro, montaje de cables y pruebas" (BT 6.2.13). Verificar en el itemizado ECO-01 si el conductor lo aporta DAND o el Contratista.';
    partida = 'BT 6.2.13';
  }else{
    suministro = 'Por confirmar (106EL: CODELCO · BT 6.2.13: Contratista)';
    alcance = 'SÍ';
    alcanceTxt = 'Cable de control/señales entre la E-House y terreno: tendido, conexionado y pruebas por el Contratista (BT 4.2, partidas 6.2.13 y 6.2.24). La especificación 106EL-00001 indica que los cables los suministra CODELCO; el itemizado ECO-01 define si esta partida incluye suministro. Confirmar antes de comprar.';
    partida = 'BT 6.2.13 · 6.2.24';
  }
  return { tag:tag, de:de, a:a, campo:campo, grupo:grupo, suministro:suministro, alcance:alcance, alcanceTxt:alcanceTxt, partida:partida,
           tension: tensionCable(tipo), esPotMT: esPotMT, esFO: esFO };
}

/* ---- Circuitos existentes a retirar (BT 4.2 / 5.8) ---- */
const CIRCUITOS_RETIRO = [
  ['EX-01', 'Sala eléctrica SAG existente', 'Motor anillo (estator sist. 1 y 2)', 'Cables de fuerza existentes', '', '', '', '', 'RETIRO — cables de fuerza existentes sala eléctrica ↔ molino', 'BT 5.8'],
  ['EX-02', 'Sala eléctrica SAG existente', 'Transformadores existentes', 'Cables de fuerza existentes', '', '', '', '', 'RETIRO — cables de fuerza existentes sala eléctrica ↔ transformador', 'BT 5.8'],
  ['EX-03', 'Gabinetes de control existentes', 'Terreno / molino', 'Cables de control existentes', '', '', '', '', 'RETIRO — gabinetes de control, UPS, banco de baterías, excitatriz y CPU existentes', 'BT 5.7 / 5.8'],
  ['EX-04', 'Sala eléctrica SAG existente', 'Molino SAG', 'Circuitos definitivos (instalación temporal)', '', '', '', '', 'Instalación temporal de circuitos definitivos entre sala eléctrica y molino, previa a la parada (BT 5.1)', 'BT 5.1']
];

/* ---- Lista consolidada ---- */
let CIRC_CACHE = null;
function circuitos(){
  if(CIRC_CACHE) return CIRC_CACHE;
  const lista = CABLES_MANUAL.map(function(c){
    const k = clasificarCable(c);
    return { tag:c[0], desde:c[1], hasta:c[2], tipo:c[3], cond:c[4], usados:c[5], seccion:c[6], largo:c[7], funcion:c[8], hoja:c[9], k:k, retiro:false };
  });
  CIRCUITOS_RETIRO.forEach(function(c){
    lista.push({ tag:c[0], desde:c[1], hasta:c[2], tipo:c[3], cond:'', usados:'', seccion:'', largo:'', funcion:c[8], hoja:c[9], retiro:true,
      k:{ tag:c[0], de:{cod:'',desc:c[1],zona:'campo'}, a:{cod:'',desc:c[2],zona:'campo'}, campo:true, grupo:'Retiro / temporal (existente)',
          suministro:'No aplica (existente)', alcance:'SÍ', partida:c[9], tension:'—',
          alcanceTxt: c[0] === 'EX-04'
            ? 'Instalación temporal de los circuitos definitivos entre la sala eléctrica y el molino antes de la parada, para acortar la ventana de detención (BT 5.1 "Montaje eléctrico"). Se ejecuta con el cable definitivo aportado por DAND y se conexiona en forma definitiva durante la parada.'
            : 'Retiro de instalaciones existentes por el Contratista después de la parada del molino (BT 5.8, partida 6.2.20): desconexión con bloqueo LOTO, retiro, traslado y disposición final en patio de chatarra de la División, normalización de las áreas intervenidas.' } });
  });
  CIRC_CACHE = lista;
  return lista;
}
function datosCirc(tag){ return (DB.circuitos && DB.circuitos[tag]) || {}; }
function guardarCirc(tag, datos){
  if(!DB.circuitos) DB.circuitos = {};
  DB.circuitos[tag] = Object.assign(datosCirc(tag), datos);
  guardarDB();
}

const EST_CIRC = ['Pendiente','Cable en bodega','En tendido','Tendido','Conexionado','Probado','Retirado','No aplica'];
const FILTRO_CIRC = { texto:'', grupo:'', alcance:'', zona:'campo', estado:'' };

function renderCircuitos(){
  const f = FILTRO_CIRC;
  const todos = circuitos();
  const grupos = {}; todos.forEach(function(c){ grupos[c.k.grupo] = (grupos[c.k.grupo]||0)+1; });
  const q = f.texto.trim().toLowerCase();
  const lista = todos.filter(function(c){
    if(f.zona === 'campo' && !c.k.campo) return false;
    if(f.zona === 'ehouse' && c.k.campo) return false;
    if(f.grupo && c.k.grupo !== f.grupo) return false;
    if(f.alcance && c.k.alcance !== f.alcance) return false;
    if(f.estado && (datosCirc(c.tag).estado || 'Pendiente') !== f.estado) return false;
    if(q && (c.tag + ' ' + c.desde + ' ' + c.hasta + ' ' + c.tipo + ' ' + c.funcion + ' ' + c.k.de.desc + ' ' + c.k.a.desc).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  const enAlcance = todos.filter(function(c){ return c.k.alcance === 'SÍ'; });
  const campo = todos.filter(function(c){ return c.k.campo; });
  const largoIng = campo.reduce(function(a,c){ return a + (Number(String(c.largo).replace(',','.')) || 0); }, 0);
  const largoTer = campo.reduce(function(a,c){ return a + (Number(datosCirc(c.tag).largoTerreno) || 0); }, 0);

  let html = '';
  html += '<div class="page-title"><h1>1.5 Listado de circuitos y cables</h1></div>';
  html += '<div class="help"><b>¿Qué es esto?</b> Los ' + CABLES_MANUAL.length + ' cables del <b>GMD Wiring Manual</b> (' + refDoc('CP-M0374-01-WM-EAB101', 'CP-M0374 · cable overview') +
    ') más los circuitos existentes a retirar según las Bases Técnicas. <b>Haga clic en un circuito</b> para ver si su tendido o cambio es alcance del Contratista, ' +
    'la información técnica para ejecutarlo y el recorrido (desde → hasta, largo). Los largos de los cables principales <b>no vienen en la ingeniería recibida</b>: se miden en terreno y se registran aquí.</div>';

  html += '<div class="grid kpis" style="margin-bottom:14px">' +
    kpi('Circuitos en el listado', todos.length, CABLES_MANUAL.length + ' del manual + ' + CIRCUITOS_RETIRO.length + ' de retiro/temporal', '') +
    kpi('Con tendido a cargo del Contratista', enAlcance.length, 'cables de terreno + retiros', 'warn') +
    kpi('Internos E-House (Innomotics)', todos.length - campo.length, 'precableados en fábrica, fuera de alcance', '') +
    kpi('Largo indicado en la ingeniería', Math.round(largoIng) + ' m', 'solo cables de terreno con dato en el manual', '') +
    kpi('Largo medido en terreno', Math.round(largoTer) + ' m', 'suma de lo registrado en la app', largoTer ? 'good' : '') +
  '</div>';

  html += '<div class="card card-pad" style="margin-bottom:14px"><div class="fgrid">' +
    '<div><label class="f" for="cfTexto">Buscar</label><input class="inp" id="cfTexto" type="search" value="' + attr(f.texto) + '" placeholder="tag, ubicación, tipo, función…"></div>' +
    '<div><label class="f" for="cfZona">Recorrido</label><select class="inp" id="cfZona">' +
      '<option value="campo"' + (f.zona==='campo'?' selected':'') + '>Cables de terreno (E-House ↔ terreno) + retiros</option>' +
      '<option value="ehouse"' + (f.zona==='ehouse'?' selected':'') + '>Internos E-House</option>' +
      '<option value=""' + (f.zona===''?' selected':'') + '>Todos</option></select></div>' +
    '<div><label class="f" for="cfGrupo">Grupo</label><select class="inp" id="cfGrupo"><option value="">Todos</option>' +
      Object.keys(grupos).sort().map(function(g){ return '<option value="' + attr(g) + '"' + (g===f.grupo?' selected':'') + '>' + esc(g) + ' (' + grupos[g] + ')</option>'; }).join('') + '</select></div>' +
    '<div><label class="f" for="cfAlc">Alcance del Contratista</label><select class="inp" id="cfAlc"><option value="">Todos</option>' +
      '<option value="SÍ"' + (f.alcance==='SÍ'?' selected':'') + '>SÍ</option><option value="NO"' + (f.alcance==='NO'?' selected':'') + '>NO</option></select></div>' +
    '<div><label class="f" for="cfEst">Estado en obra</label><select class="inp" id="cfEst"><option value="">Todos</option>' + opciones(EST_CIRC, f.estado) + '</select></div>' +
    '</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<span style="font-size:12.5px;color:var(--text-2)">' + lista.length + ' circuito(s)</span><span class="spacer" style="flex:1"></span>' +
    '<button class="btn sm" onclick="exportarCircuitosCSV()">↓ Exportar CSV</button></div></div>';

  html += '<div class="tbl-wrap"><table><thead><tr>' +
    ['Tag','Función','Desde','Hasta','Tipo de cable','Cond. × sección','Largo ing.','Largo terreno','Grupo','Suministro','Alcance','Estado'].map(function(t){ return '<th style="cursor:default">' + t + '</th>'; }).join('') +
    '</tr></thead><tbody>';
  lista.forEach(function(c){
    const d = datosCirc(c.tag);
    const alcCls = c.k.alcance === 'SÍ' ? 'ok' : 'neutral';
    html += '<tr style="cursor:pointer" onclick="fichaCircuito(\'' + attr(c.tag) + '\')" title="Ver ficha del circuito">' +
      '<td class="mono"><b>' + esc(c.tag) + '</b></td>' +
      '<td class="wrap">' + esc(c.funcion || '—') + '</td>' +
      '<td class="wrap"><span class="mono">' + esc(c.desde) + '</span><br><span style="color:var(--text-2)">' + esc(c.k.de.desc) + '</span></td>' +
      '<td class="wrap"><span class="mono">' + esc(c.hasta) + '</span><br><span style="color:var(--text-2)">' + esc(c.k.a.desc) + '</span></td>' +
      '<td class="wrap">' + esc(c.tipo || '—') + '</td>' +
      '<td>' + esc(condTexto(c)) + '</td>' +
      '<td class="num">' + (c.largo ? esc(c.largo) + ' m' : '<span style="color:var(--text-3)">s/d</span>') + '</td>' +
      '<td class="num">' + (d.largoTerreno ? esc(d.largoTerreno) + ' m' : '—') + '</td>' +
      '<td class="wrap">' + esc(c.k.grupo) + '</td>' +
      '<td class="wrap">' + esc(c.k.suministro) + '</td>' +
      '<td>' + pill(alcCls, c.k.alcance) + '</td>' +
      '<td>' + pill(d.estado && d.estado !== 'Pendiente' ? (d.estado === 'Probado' || d.estado === 'Retirado' ? 'ok' : 'warn') : 'neutral', d.estado || 'Pendiente') + '</td>' +
    '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
function condTexto(c){
  if(!c.cond && !c.seccion) return '—';
  const cond = str(c.cond), sec = str(c.seccion);
  if(sec === 'FO') return cond + ' fibra';
  return (cond ? cond + ' ' : '') + (sec ? '× ' + sec + ' mm²' : '');
}
function renderCircuitosPost(){
  const f = FILTRO_CIRC;
  const t = document.getElementById('cfTexto');
  if(t) t.addEventListener('input', function(){ f.texto = t.value; const pos = t.selectionStart; document.getElementById('content').innerHTML = renderCircuitos(); renderCircuitosPost(); const t2 = document.getElementById('cfTexto'); if(t2){ t2.focus(); try{ t2.setSelectionRange(pos,pos); }catch(e){} } });
  [['cfZona','zona'],['cfGrupo','grupo'],['cfAlc','alcance'],['cfEst','estado']].forEach(function(p){
    const el = document.getElementById(p[0]);
    if(el) el.addEventListener('change', function(){ f[p[1]] = el.value; render(); });
  });
}
function exportarCircuitosCSV(){
  const cab = ['Tag','Función','Desde','Ubicación desde','Hasta','Ubicación hasta','Tipo de cable','Conductores','Usados','Sección mm²','Tensión','Largo ingeniería m','Largo terreno m','Grupo','Suministro','Alcance Contratista','Partida BT','Estado','Observaciones'];
  const filas = circuitos().map(function(c){ const d = datosCirc(c.tag); return [c.tag,c.funcion,c.desde,c.k.de.desc,c.hasta,c.k.a.desc,c.tipo,c.cond,c.usados,c.seccion,c.k.tension,c.largo,d.largoTerreno||'',c.k.grupo,c.k.suministro,c.k.alcance,c.k.partida,d.estado||'Pendiente',d.obs||''].map(csvCampo).join(';'); });
  descargar('listado_circuitos_' + hoyISO() + '.csv', '﻿' + cab.map(csvCampo).join(';') + '\r\n' + filas.join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
  toast('CSV de circuitos descargado.', 'ok');
}

/* ---- Requisitos técnicos según el tipo de circuito ---- */
function requisitosCirc(c){
  const k = c.k, r = [];
  if(k.esPotMT){
    r.push('Cable <b>unipolar, sin armadura y sin pantalla</b> (requisito CP-M0374-00-EE-EDC002 §3.1): un cable apantallado puede dañar el convertidor.');
    r.push('Tensión nominal mínima <b>3,6 / 6 kV</b> en todos los tramos: trafo → convertidor, convertidor → estator, trafo excitación → rectificador y rectificador → rotor (§3.5).');
    r.push('Sección máxima por conductor <b>240 mm² / 500 kcmil</b> (§3.3); conductor flexible <b>clase 5</b> IEC 60228 (§3.6); temperatura máxima del conductor <b>90 °C</b> (§3.7).');
    if(/trafo convertidor/.test(k.grupo)) r.push('Largo máximo <b>100 m</b> entre transformador del convertidor y convertidor; máximo <b>6 cables unipolares por fase</b> (§3.2).');
    else r.push('Largo máximo <b>150 m</b> entre convertidor y motor; máximo <b>7 cables unipolares por fase</b> (§3.2). Nota del unilineal: cables de igual largo.');
    r.push('Diferencia de largo entre cables de un mismo circuito <b>≤ 10 m</b>, para mantener la simetría del sistema (§3.2).');
    r.push('Tendido en <b>ternas L1-L2-L3 en trébol</b> sobre escalerilla, separación entre ternas ≥ 2 × diámetro (§3.8). Fijación con amarras/clamps no magnéticos.');
    r.push('Amarre y soportación dimensionados para esfuerzos de cortocircuito (§4.3); sellar extremos contra humedad durante el almacenamiento (§4.4).');
    r.push('Terminales: partida BT 6.2.11 "terminales de cable 500 MCM y 350 MCM"; torque según manual de cableado; medir aislación (megado) antes de conexionar y registrar en protocolo.');
    r.push('Tipo de referencia: SIENOPYR (N)HXSGAFHXÖ 3,6/6 kV (Pirelli/Prysmian) o SISIF-Cu 6,6 kV (motor); cualquier equivalente debe aprobarlo Innomotics.');
  }else if(k.esFO){
    r.push('Fibra según 106EL-00001 §3.3.2.4: <b>62,5/125 µm multimodo</b>, conectores ST/LC según equipo; para IBA usar 2 fibras dúplex.');
    r.push('Cabeceras (patch panels) y soportación en ambos extremos; radio de curvatura del fabricante; identificar cada fibra.');
    r.push('Fusionado y <b>certificación con OTDR / power meter</b> en ambos sentidos; entregar informe (BT 4.2 "certificación de fibra óptica").');
  }else if(/Comunicaciones/.test(k.grupo)){
    r.push('Profibus: cable violeta 2 hilos apantallado, impedancia 150 Ω, radio mínimo 60/80 mm, pantalla a tierra en un punto (106EL §3.3.2.1). Profinet/LAN: CAT 6A 4×2 con RJ45 industriales (§3.3.2.2 / 3.3.2.3).');
    r.push('Respetar largos máximos del bus y terminaciones activas; probar con analizador de bus antes de la integración.');
  }else if(/Control|LEM/.test(k.grupo)){
    r.push('Cable de control multiconductor libre de halógenos, cobre clase 5, chaqueta HSLCH-JZ / JE-LiHCH según manual; 300/500 V (106EL §3.3.1).');
    r.push('Calibre mínimo entre sala eléctrica y terreno <b>#14 AWG</b>; #16/#18 AWG solo dentro de la misma sala (106EL §3.3.1).');
    r.push('Pantallas a tierra en <b>un solo punto</b>; sin uniones en el recorrido; radio mínimo 10 × diámetro fijo (106EL §3.1 / 3.3.1).');
    if(/LEM/.test(k.grupo)) r.push('Tender a prueba de cortocircuito y separado de los cables de potencia; conexionado según ' + refDoc('4502319491-03221-300EL-0001', '300EL-0001') + '.');
  }else if(/tierra/.test(k.grupo)){
    r.push('Conductor RZ1-K 1×70 mm² a la malla de planta; conexión con terminal y prueba de continuidad / resistencia de puesta a tierra registrada.');
  }else if(c.retiro){
    r.push('Bloqueo eléctrico y mecánico (LOTO) y verificación de ausencia de tensión antes de intervenir (BT 4.3.4, Reglamento de Seguridad Eléctrica DAND).');
    r.push('Identificar y etiquetar ambos extremos antes de cortar; registrar en red-line qué se retira.');
    r.push('Disposición final en patio de chatarra de la División; normalizar escalerillas y sellos (BT 5.8, partida 6.2.20).');
  }else{
    r.push('Cable libre de halógenos, retardante a la llama; sin uniones en ductos; pantallas a tierra en un solo punto (106EL §3.1).');
  }
  r.push('Probar y protocolizar: continuidad, megado, identificación de fases/hilos y torque de bornes antes de la energización (BT 4.2 "Puesta en servicio").');
  return r;
}

/* ---- Ficha del circuito ---- */
function fichaCircuito(tag){
  const c = circuitos().filter(function(x){ return x.tag === tag; })[0];
  if(!c) return;
  const k = c.k, d = datosCirc(tag);
  const largoIng = c.largo ? c.largo + ' m' : 'no indicado en la ingeniería recibida';
  let html = '<div class="modal-head"><h2>Circuito <span class="mono">' + esc(c.tag) + '</span>' + (c.funcion ? ' · ' + esc(c.funcion) : '') + '</h2>' +
    '<button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div><div class="modal-body">';

  html += '<div class="' + (k.alcance === 'SÍ' ? 'help' : 'warnbox') + '" style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">' +
    '<div style="flex:0 0 auto;text-align:center;padding:6px 14px;border-radius:8px;background:var(--surface);border:1px solid var(--border)">' +
      '<div style="font-size:11px;color:var(--text-2);text-transform:uppercase">¿Es alcance del Contratista?</div>' +
      '<div style="font-size:28px;font-weight:700;color:' + (k.alcance === 'SÍ' ? 'var(--ok)' : 'var(--text-2)') + '">' + k.alcance + '</div>' +
      '<div style="font-size:11px;color:var(--text-2)">' + esc(k.partida) + '</div></div>' +
    '<div style="flex:1;min-width:260px"><b>' + esc(k.grupo) + '</b><br>' + k.alcanceTxt + '<br><span class="tag">Suministro: ' + esc(k.suministro) + '</span></div></div>';

  html += '<div class="grid cols2">';
  html += '<div class="card card-pad"><h3>Recorrido: desde → hasta</h3><dl class="dl">' +
    fila('Desde', '<span class="mono">' + esc(c.desde) + '</span><br>' + esc(k.de.desc) + ' ' + pill(k.de.zona === 'campo' ? 'warn' : 'neutral', k.de.zona === 'campo' ? 'terreno' : 'E-House')) +
    fila('Hasta', '<span class="mono">' + esc(c.hasta) + '</span><br>' + esc(k.a.desc) + ' ' + pill(k.a.zona === 'campo' ? 'warn' : 'neutral', k.a.zona === 'campo' ? 'terreno' : 'E-House')) +
    fila('Largo según ingeniería', esc(largoIng) + (c.largo ? ' <span class="tag">CP-M0374 cable overview</span>' : '')) +
    fila('Largo medido en terreno', '<input class="inp" id="ciLargo" type="number" min="0" step="0.5" value="' + attr(d.largoTerreno || '') + '" placeholder="m" style="max-width:140px"> m') +
    fila('Canalización', k.campo ? 'Escalerillas nuevas entre E-House y ' + (k.a.zona === 'campo' ? esc(k.a.desc) : esc(k.de.desc)) + ' (BT 6.2.9); tramos en conduit según 402EL / 100EL.' : 'Interna de la E-House (piso técnico y ductos de gabinete).') +
  '</dl></div>';
  html += '<div class="card card-pad"><h3>Datos técnicos</h3><dl class="dl">' +
    fila('Tipo de cable', esc(c.tipo || '—')) +
    fila('Conductores', esc(c.cond ? c.cond + (c.usados ? ' (usados: ' + c.usados + ')' : '') : '—')) +
    fila('Sección', esc(c.seccion ? (c.seccion === 'FO' ? 'fibra óptica' : c.seccion + ' mm²') : '—')) +
    fila('Tensión de aislación', esc(k.tension)) +
    fila('Cantidad por fase', /\.\.\.(\d)N/.test(c.tag) ? esc(c.tag.match(/\.\.\.(\d)N/)[1]) + ' cables unipolares por fase (' + esc(c.tag) + ')' : '—') +
    fila('Hoja del manual', c.hoja ? '<span class="mono">' + esc(c.hoja) + '</span> (' + refDoc('CP-M0374-01-WM-EAB101', 'abrir manual') + ')' : '—') +
  '</dl></div></div>';

  html += '<div class="card card-pad" style="margin-top:14px"><h3>Información técnica para ejecutar el cambio / tendido</h3>' +
    lista(requisitosCirc(c)) +
    '<p class="sub" style="margin:8px 0 0">Documentos: ' + refDoc('4502319491-03221-106EL-00001', '106EL-00001 espec. de cables') + ' · ' + refDoc('4502319491-03221-202EL-00001', '202EL-00001 unilineal') +
    ' · ' + refDoc('CP-M0374-01-WM-EAB101', 'CP-M0374 manual de cableado') + ' · ' + refDoc('BT-MONTAJE-CCV', 'Bases Técnicas') + '</p></div>';

  html += '<div class="card card-pad" style="margin-top:14px"><h3>Seguimiento en obra</h3><div class="fgrid">' +
    campo('ciEstado', 'Estado', '<select class="inp" id="ciEstado">' + opciones(EST_CIRC, d.estado || 'Pendiente') + '</select>', '') +
    campo('ciResp', 'Responsable', '<input class="inp" id="ciResp" value="' + attr(d.responsable || '') + '">', '') +
    campo('ciFecha', 'Fecha', '<input class="inp" id="ciFecha" type="date" value="' + attr(d.fecha || '') + '">', '') +
    '</div><div class="field"><label class="f" for="ciObs">Observaciones (ruta real, interferencias, SDI asociada, protocolo)</label>' +
    '<textarea class="inp" id="ciObs">' + esc(d.obs || '') + '</textarea></div></div>';

  html += '</div><div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cerrar</button>' +
    '<button class="btn primary" onclick="guardarFichaCircuito(\'' + attr(tag) + '\')">Guardar</button></div>';
  abrirModal(html);
}
function guardarFichaCircuito(tag){
  guardarCirc(tag, { largoTerreno: valorCampo('ciLargo'), estado: valorCampo('ciEstado'), responsable: valorCampo('ciResp'), fecha: valorCampo('ciFecha'), obs: valorCampo('ciObs') });
  cerrarModal(); render(); toast('Circuito ' + esc(tag) + ' actualizado.', 'ok');
}
