/* ==================================================================
   ===============   MÓDULO 10 — GUÍA DEL PROYECTO (DIDÁCTICA)  =====
   ==================================================================
   Explica, para quien llega por primera vez al contrato:
     10.1  cómo funciona el accionamiento del molino SAG con
           cicloconvertidor (unilineal interactivo + camino de la energía),
     10.2  el diagrama unilineal 202EL-00001 bloque a bloque,
     10.3  el alcance del contrato según las Bases Técnicas Rev 0,
     10.4  glosario y documentos clave.
   Fuentes: plano 4502319491-03221-202EL-00001 Rev 0 (Innomotics),
   GMD Wiring Manual CP-M0374, Bases Técnicas "Obras de Montaje
   Reemplazo de Cicloconvertidor Molino SAG" Rev 0 (CODELCO, mayo 2026),
   ESPME-00001, MNLME-0001.
   ================================================================== */

/* ---- Utilidades de la guía ---- */
function docPorCodigo(codigo){
  codigo = str(codigo).toLowerCase();
  for(let i=0;i<DB.documentos.length;i++) if(DB.documentos[i].codigo.toLowerCase() === codigo) return DB.documentos[i];
  return null;
}
/* Enlace a un documento de la matriz por su código: abre el PDF si existe */
function refDoc(codigo, texto){
  const d = docPorCodigo(codigo);
  const label = esc(texto || codigo);
  if(!d) return '<span class="mono" title="No está en la matriz">' + label + '</span>';
  return enlaceAbrir(d, label, 'mono') +
         ' <button class="btn sm" onclick="fichaDocumento(\'' + d.id + '\')" title="Ficha en la matriz">ficha</button>';
}
function guiaNav(actual){
  const items = [['guia/cicloconvertidor','10.1 Funcionamiento'],['guia/unilineal','10.2 Unilineal'],['guia/alcance','10.3 Alcance'],['guia/glosario','10.4 Glosario'],['guia/simuladores','10.5 Simuladores 3D'],['ingenieria/circuitos','1.5 Circuitos y cables']];
  return '<div class="toolbar" style="margin-bottom:14px">' + items.map(function(it){
    return '<a class="btn sm' + (it[0] === actual ? ' primary' : '') + '" href="#/' + it[0] + '">' + esc(it[1]) + '</a>';
  }).join('') + '<span class="spacer"></span>' +
  '<span style="font-size:12px;color:var(--text-3)">Fuente principal: ' + refDoc('4502319491-03221-202EL-00001', 'Unilineal MT 202EL-00001') + '</span></div>';
}

/* ==================================================================
   10.1  ¿CÓMO FUNCIONA EL CICLOCONVERTIDOR?
   ================================================================== */

/* Textos de cada bloque del unilineal interactivo */
const BLOQUES_CCV = {
  bus: {
    titulo: 'Barra 13,2 kV / 50 Hz — sala eléctrica existente (POR OTROS)',
    tag: 'Alimentación · interruptores 52 · relés =C01/=C02/=C03',
    texto: 'Toda la energía del accionamiento entra por la barra de media tensión de 13,2 kV de la sala eléctrica existente del molino. Desde ahí salen <b>cinco alimentadores</b>: uno para el transformador de excitación, uno para la compensación de factor de potencia y tres para los transformadores del convertidor. Cada alimentador tiene su interruptor de poder (ANSI 52) con relés de sobrecorriente 50T/51T y diferencial 87T. En el plano esta zona está rotulada <b>"BY OTHERS"</b>: no es suministro Innomotics, pero el contratista sí tiende y conecta los cables de fuerza entre esta sala y la nueva E-House.',
    docs: ['4502319491-03221-202EL-00001','4502319491-03221-106EL-00001']
  },
  exctrafo: {
    titulo: 'Transformador de excitación +1.B30',
    tag: '350 kVA · 13,2 kV / 330 V · Yy0 · uz = 9 %',
    texto: 'Baja la tensión de 13,2 kV a 330 V para alimentar el rectificador de excitación. Es pequeño comparado con los transformadores del convertidor porque el rotor solo necesita corriente continua de excitación (unos cientos de kW), no la potencia del molino. Lleva protecciones de sobrecorriente, temperatura y Buchholz (63).',
    docs: ['4502319491-03221-202EL-00001']
  },
  excrect: {
    titulo: 'Rectificador de excitación +1.B31 (=J01)',
    tag: 'Puente de tiristores → corriente continua al rotor (bornes K–J)',
    texto: 'Convierte los 330 V alternos en <b>corriente continua regulable</b> que se inyecta al devanado del rotor (polos) del motor a través de anillos rozantes (bornes K y J). Al variar esta corriente se controla el flujo magnético del motor: es la "excitación" de una máquina síncrona. Lleva resistencia de carga base &lt;9&gt;, medición de tensión &lt;7&gt; y pararrayos &lt;2&gt;. El control de lazo cerrado le da los pulsos de disparo. Protecciones asociadas: 40 (pérdida de excitación), 59 (sobretensión), sobretensión DC de rotor.',
    docs: ['4502319491-03221-202EL-00001']
  },
  pfc: {
    titulo: 'Compensación de factor de potencia (=F01)',
    tag: 'Banco de condensadores con reactancias · relé ΔI',
    texto: 'Un cicloconvertidor trabaja con <b>factor de potencia bajo</b> (del orden de 0,7–0,8 inductivo) y genera armónicos, porque sus tiristores conmutan "cortando" la onda de 50 Hz. El banco de condensadores compensa la potencia reactiva y, junto con sus reactancias, filtra armónicos para que la red de 13,2 kV no se vea afectada. Se protege con detección de desbalance de corriente (ΔI).',
    docs: ['4502319491-03221-202EL-00001']
  },
  trafo: {
    titulo: 'Transformadores del convertidor +1.C11 / +1.C21 / +1.C31',
    tag: '3 × 6.760 kVA (2 × 3.380 kVA) · 13,2 kV / 2 × 1.200 V · Yy0d5 · Uz = 10,5 %',
    texto: 'Tres transformadores idénticos, uno por fase del motor. Cada uno tiene <b>dos secundarios de 1.200 V</b>: uno en estrella (y0) y otro en triángulo (d5), desfasados 30° entre sí. Un secundario alimenta el puente del <b>sistema de devanado 1</b> y el otro el puente del <b>sistema de devanado 2</b>. El desfase de 30° hace que, vistos desde la red, los dos puentes se comporten como un convertidor de 12 pulsos, lo que cancela buena parte de los armónicos. Protecciones: diferencial 87T (2000 A/1 A), sobrecorriente, temperatura de aceite/devanado y Buchholz.',
    docs: ['4502319491-03221-202EL-00001','CP-M0374-01-WM-EAB101']
  },
  ccv: {
    titulo: 'Puentes cicloconvertidores =G11 =G12 =G13 (+.B21) y =G21 =G22 =G23 (+.B22)',
    tag: 'Símbolo &lt;30&gt; · 6 puentes de tiristores en antiparalelo · refrigerados por agua',
    texto: 'Aquí está el corazón del accionamiento. Cada puente &lt;30&gt; son <b>dos rectificadores de tiristores conectados en antiparalelo</b> (uno conduce la semionda positiva y el otro la negativa). Disparando los tiristores con el ángulo adecuado, el puente "recorta" trozos de la onda de 50 Hz y con ellos <b>construye directamente una onda de baja frecuencia</b> (unos pocos hertz), sin pasar por corriente continua. Como hay 3 fases por sistema de devanado y 2 sistemas, son 6 puentes. Cada puente entrega una fase del estator. La frecuencia de salida fija la velocidad del molino: a 9,52 rpm el estator recibe una onda de solo algunos hertz. Los tiristores se refrigeran con agua desionizada (bombas de 7,5 kW en la unidad de enfriamiento). Detección de falla a tierra &lt;22&gt; (64) en cada sistema.',
    docs: ['4502319491-03221-202EL-00001','4502319491-03221-105EL-0002','CP-M0374-01-WM-EAB101']
  },
  k01: {
    titulo: 'Seccionadores y puesta a tierra =K01',
    tag: 'Símbolos &lt;20&gt; y &lt;21&gt; · aislación segura del motor',
    texto: 'Entre los puentes y el motor hay <b>seccionadores con cuchilla de puesta a tierra</b> para cada sistema de devanado y para el circuito de excitación. Permiten aislar y aterrizar el motor para mantención con el convertidor energizado o viceversa. Sus contactos auxiliares van al PLC y bloquean el arranque si algún seccionador no está en posición correcta. Son puntos clave de los bloqueos (LOTO) durante la puesta en servicio.',
    docs: ['4502319491-03221-202EL-00001']
  },
  motor: {
    titulo: 'Motor anillo (Gearless Mill Drive) +1.U1',
    tag: '12.000 kW · 9,52 rpm · 2 sistemas de devanado × 1.900 V × 1.958 A · rotor K–J',
    texto: 'Es un <b>motor síncrono de muy baja velocidad</b> cuyo rotor son los polos montados alrededor del cuerpo del molino: el molino <b>es</b> el rotor. No hay reductor, piñón ni corona ("gearless"). El estator tiene dos sistemas trifásicos independientes (1U-1V-1W y 2U-2V-2W), cada uno alimentado por tres puentes cicloconvertidores. Al girar el campo del estator a unos pocos hertz, el rotor excitado lo sigue en sincronismo a 9,52 rpm. Protecciones: diferencial 87M (3000 A / 2×0,1 A con transductores LEM), sobrecorriente instantánea 50 estator/rotor, falla a tierra 64.',
    docs: ['4502319491-03221-202EL-00001','4502319491-03221-300EL-0001','4502319491-03221-104ME-00001']
  },
  ctrl: {
    titulo: 'Control de lazo cerrado +1.B18 y automatización (S7 / PCS 7)',
    tag: 'Entradas: n* &lt;11&gt;, i_estator &lt;3&gt;, u_estator &lt;7&gt;, i_rotor, n_motor &lt;10&gt;',
    texto: 'El regulador recibe la <b>referencia de velocidad n*</b> desde el sistema de control de la planta y mide continuamente corrientes y tensiones de estator, corriente de rotor y velocidad real. Con esos datos calcula, varias miles de veces por segundo, <b>qué tiristor disparar y cuándo</b>, tanto en los seis puentes como en el rectificador de excitación. Así controla el torque y la velocidad del molino desde cero rpm, puede hacer "inching" (giro lento para mantención), frenar en forma regenerativa y detectar carga congelada. La supervisión, alarmas y visualización van por PLC SIMATIC S7 / PCS 7 y las redes de la sala (ver plano de comunicaciones 413AT).',
    docs: ['4502319491-03221-202EL-00001','4502319491-03221-413AT-00001','4502319491-03221-401EL-00002']
  },
  prot: {
    titulo: 'Sistema de protecciones (hoja 3/3 del unilineal)',
    tag: 'Relés =C01…=C03 en 13,2 kV · funciones ANSI 25, 26, 27, 40, 50, 51T, 59, 63, 64, 86, 87T, 87M',
    texto: 'Dos grupos: <b>protecciones de red y transformadores</b> (sobrecorriente 50T/51T, diferencial 87T, Buchholz 63, temperatura 26, subtensión 27, sincronización 25, relé de bloqueo 86 con señal de pre-disparo) y <b>protecciones propias del convertidor y motor</b> (sobretensión 59, sobrecorriente por limitación, 50 instantánea estator/rotor, sobretensión DC rotor, pérdida de excitación 40, flujo y temperatura del agua de refrigeración, 64 falla a tierra, 87M diferencial de motor). El relé 86 es el que "amarra" el disparo: nada se vuelve a energizar sin reposición manual.',
    docs: ['4502319491-03221-202EL-00001']
  },
  ehouse: {
    titulo: 'Sala eléctrica modular (E-House) — nueva, 2° piso',
    tag: '12.000 × 4.360 × 3.378 mm · 24.656 kg · tipo mecano apernada sobre exoesqueleto',
    texto: 'Todo lo rotulado INNOMOTICS en el plano (puentes, excitación, control, refrigeración, SSAA) va dentro de la <b>nueva sala eléctrica modular</b>, que llega en packings al túnel SAG y se arma en terreno sobre la estructura existente (exoesqueleto), bajo supervisión del fabricante. El montaje de la sala, de sus equipos, canalizaciones, cables, red de incendio y HVAC es el núcleo del alcance del contratista (ver 10.3).',
    docs: ['4502319491-03221-ESPME-00001','4502319491-03221-MNLME-0001','4502319491-03221-200ME-00003','4502319491-03221-100ME-00001']
  }
};

/* ---- Onda de salida de un cicloconvertidor (SVG calculado) ---- */
function svgOndaCCV(){
  const W = 640, H = 200, mid = 100, amp = 70;
  const fin = 50, fout = 5, T = 0.2; /* 0,2 s = 10 ciclos de red, 1 ciclo de salida */
  let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Forma de onda de salida de un cicloconvertidor">';
  s += '<line x1="0" y1="' + mid + '" x2="' + W + '" y2="' + mid + '" stroke="var(--border-2)"/>';
  /* 6 tensiones de línea disponibles (3 fases × 2 polaridades), en gris */
  for(let k=0;k<6;k++){
    let d = '';
    for(let i=0;i<=W;i++){
      const t = i / W * T;
      const v = Math.sin(2*Math.PI*fin*t - k*Math.PI/3);
      d += (i ? 'L' : 'M') + i + ' ' + (mid - amp*v).toFixed(1);
    }
    s += '<path d="' + d + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
  }
  /* referencia de baja frecuencia */
  let dref = '';
  for(let i=0;i<=W;i++){ const t = i/W*T; dref += (i?'L':'M') + i + ' ' + (mid - amp*0.9*Math.sin(2*Math.PI*fout*t)).toFixed(1); }
  s += '<path d="' + dref + '" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>';
  /* salida (idealizada): cada 1/6 de ciclo de red se dispara el tiristor cuya tensión
     más se acerca a la referencia y se mantiene conduciendo ese tramo */
  let dout = '';
  const seg = W / (fin * T * 6);   /* píxeles por tramo de conducción */
  for(let i=0;i<=W;i++){
    const t = i/W*T, ref = 0.9*Math.sin(2*Math.PI*fout*t);
    const tm = (Math.floor(i/seg) + 0.5) * seg / W * T;   /* instante medio del tramo */
    const refm = 0.9*Math.sin(2*Math.PI*fout*tm);
    let best = 0, bd = 9;
    for(let k=0;k<6;k++){
      const vm = Math.sin(2*Math.PI*fin*tm - k*Math.PI/3);
      const dist = Math.abs(vm - refm);
      if(dist < bd){ bd = dist; best = k; }
    }
    const v = Math.sin(2*Math.PI*fin*t - best*Math.PI/3);
    dout += (i?'L':'M') + i + ' ' + (mid - amp*v).toFixed(1);
  }
  s += '<path d="' + dout + '" fill="none" stroke="var(--accent-2)" stroke-width="2.2"/>';
  s += '<text x="6" y="16" font-size="11" fill="var(--text-2)">Tensión</text>';
  s += '<text x="' + (W-6) + '" y="' + (H-6) + '" font-size="11" fill="var(--text-2)" text-anchor="end">tiempo → (0,2 s = 10 ciclos de red)</text>';
  s += '</svg>' +
    '<div class="legend"><span><i style="background:var(--border)"></i>Ondas de 50 Hz disponibles (3 fases × 2 polaridades)</span>' +
    '<span><i style="background:var(--warn)"></i>Referencia de baja frecuencia (5 Hz en el ejemplo)</span>' +
    '<span><i style="background:var(--accent-2)"></i>Salida real: trozos de 50 Hz que siguen a la referencia</span></div>';
  return s;
}

function renderGuiaCCV(){
  let html = '';
  html += '<div class="page-title"><h1>10.1 ¿Cómo funciona el cicloconvertidor del molino SAG?</h1></div>';
  html += guiaNav('guia/cicloconvertidor');
  html += '<div class="help"><b>¿Qué es esto?</b> Explicación para quien llega al contrato sin conocer el equipo. ' +
          'Está armada sobre el <b>diagrama unilineal real</b> del proyecto (' + refDoc('4502319491-03221-202EL-00001', '202EL-00001') +
          ') y el manual de cableado del accionamiento. <b>Haga clic en cualquier bloque</b> del esquema para ver qué hace y qué documentos lo respaldan.</div>';

  /* idea general */
  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>La idea en tres líneas</h2>' +
      '<ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.6">' +
      '<li>El molino SAG gira a solo <b>9,52 rpm</b> y necesita <b>12.000 kW</b>. Un motor normal tendría que girar rápido y usar un reductor gigante.</li>' +
      '<li>En un <b>Gearless Mill Drive (GMD)</b> los polos del motor van montados en el propio molino: el molino <b>es</b> el rotor y no hay reductor.</li>' +
      '<li>Para que un motor síncrono gire tan lento hay que alimentarlo con <b>corriente alterna de muy baja frecuencia</b> (unos pocos hertz). Eso es exactamente lo que fabrica el <b>cicloconvertidor</b> a partir de los 50 Hz de la red.</li>' +
      '</ol></div>' +
    '<div class="card card-pad"><h2>Datos de placa del sistema</h2><dl class="dl">' +
      fila('Motor anillo +1.U1', '12.000 kW · 9,52 rpm · 2 sistemas de devanado × 1.900 V / 1.958 A') +
      fila('Transformadores convertidor', '3 × 6.760 kVA (2 × 3.380) · 13,2 kV / 2 × 1.200 V · Yy0d5 · Uz 10,5 %') +
      fila('Trafo excitación +1.B30', '350 kVA · 13,2 kV / 330 V · Yy0 · uz 9 %') +
      fila('Puentes cicloconvertidor', '6 puentes de tiristores en antiparalelo (3 por sistema de devanado)') +
      fila('Refrigeración', 'Agua desionizada · 2 bombas 7,5 kW / 400 V · intercambiador en unidad de enfriamiento') +
      fila('Control', 'Regulador de lazo cerrado +1.B18 · PLC SIMATIC S7 / PCS 7 · UPS 230 V · cargador 24 Vcc') +
      fila('Red', '13,2 kV · 50 Hz · compensación de factor de potencia =F01') +
    '</dl></div></div>';

  /* unilineal interactivo */
  html += '<div class="card card-pad" style="margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
      '<h2 style="margin:0;flex:1">Unilineal simplificado — haga clic en un bloque del plano</h2>' +
      '<span style="font-size:12px;color:var(--text-2)">Zoom</span>' +
      '<button class="btn sm" id="zoomMenos" title="Alejar">−</button>' +
      '<button class="btn sm" id="zoomAjustar" title="Ajustar al ancho">Ajustar</button>' +
      '<button class="btn sm" id="zoomMas" title="Acercar">+</button>' +
      '<button class="btn sm" id="btnFlujo">▶ Animar flujo</button>' +
      '<button class="btn sm" id="btnPlanoTab" title="Abrir el dibujo en una pestaña (imprimir / ampliar)">⤢ Pestaña</button>' +
      refDoc('4502319491-03221-202EL-00001', 'Plano original') + '</div>' +
    '<div class="plano-wrap" id="planoWrap">' + svgUnilinealCCV() + '</div>' +
    '<div id="panelBloque" class="help" style="margin:12px 0 0">Seleccione un bloque del esquema para ver su explicación.</div>' +
  '</div>';

  /* camino de la energía */
  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>El camino de la energía, paso a paso</h2>' +
    '<ol class="pasos">' +
    paso('1', 'Red de 13,2 kV', 'La energía llega a la barra de media tensión de la sala eléctrica existente. Cinco interruptores 52 alimentan el sistema: excitación, compensación y los tres transformadores del convertidor. <i>Por otros</i>: el contratista tiende los cables nuevos entre esta sala, los transformadores y la E-House.') +
    paso('2', 'Transformadores del convertidor', 'Cada transformador baja de 13,2 kV a dos secundarios de 1.200 V desfasados 30° (Yy0d5). Así cada fase del motor tiene su transformador y cada sistema de devanado su propio secundario.') +
    paso('3', 'Puentes cicloconvertidores', 'Los seis puentes de tiristores recortan trozos de las ondas de 50 Hz y con ellos arman directamente una onda de baja frecuencia. No hay etapa de corriente continua: por eso se llama <b>ciclo</b>-convertidor (convierte de un ciclo a otro).') +
    paso('4', 'Seccionadores =K01', 'La salida de cada sistema de devanado pasa por seccionadores con puesta a tierra que permiten aislar el motor para mantención. Sus contactos van al bloqueo del arranque.') +
    paso('5', 'Estator del motor anillo', 'Dos sistemas trifásicos independientes (1U-1V-1W y 2U-2V-2W) reciben la onda de baja frecuencia y crean un campo magnético que gira lentamente alrededor del molino.') +
    paso('6', 'Excitación del rotor', 'En paralelo, el transformador de 350 kVA y el rectificador de tiristores inyectan corriente continua a los polos del rotor (bornes K–J). El rotor magnetizado "se engancha" al campo del estator y gira en sincronismo: 9,52 rpm.') +
    paso('7', 'Control de lazo cerrado', 'El regulador mide velocidad, corrientes y tensiones y decide cada disparo de tiristor. Controla torque desde 0 rpm, permite giro lento de mantención (inching) y frena regenerando energía a la red.') +
    paso('8', 'Protecciones y servicios', 'Relés 87T/87M/50/51/64/40/59 y el relé de bloqueo 86 vigilan todo el sistema; la refrigeración por agua, el HVAC de la sala, la UPS y el cargador 24 Vcc mantienen el conjunto operando.') +
    '</ol></div>';

  /* la onda */
  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>¿Cómo "fabrica" el puente una onda lenta?</h2>' +
      svgOndaCCV() +
      '<p class="sub" style="margin:10px 0 0">Cada puente dispone de las tres fases de 50 Hz en ambas polaridades (gris). El control dispara en cada instante el tiristor cuya tensión más se parece a la referencia lenta (línea punteada). El resultado (azul) es una onda de baja frecuencia formada por trozos de 50 Hz. ' +
      'La frecuencia de salida queda limitada a un tercio de la de red, lo que es perfecto para un motor de 9,52 rpm. El "recorte" de la onda es lo que produce armónicos y bajo factor de potencia, y por eso existe el banco de compensación =F01.</p></div>' +
    '<div class="card card-pad"><h2>Lo que conviene tener claro en terreno</h2>' +
      '<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6">' +
      '<li><b>Tres niveles de tensión conviven</b>: 13,2 kV (llegada), 1.200 V (secundarios) y 1.900 V de baja frecuencia (estator), más corriente continua en el rotor. Los cables son distintos para cada tramo (' + refDoc('4502319491-03221-106EL-00001', 'espec. de cables 106EL') + ').</li>' +
      '<li><b>Los cables al motor deben ser de igual largo y sin pantalla</b> (nota del manual de cableado: máx. 150 m, máx. 7 en paralelo). Cualquier diferencia desequilibra la corriente entre conductores.</li>' +
      '<li><b>Los transductores LEM</b> (4000 A / 1 A) del punto estrella son la base del diferencial 87M: su conexionado y torque están detallados en ' + refDoc('4502319491-03221-300EL-0001', '300EL-0001') + '.</li>' +
      '<li><b>Los seccionadores =K01</b> y las cuchillas de tierra son el punto de bloqueo eléctrico para trabajar en el motor con la E-House energizada.</li>' +
      '<li><b>Refrigeración por agua</b>: sin flujo o con temperatura alta el convertidor dispara. Las pruebas hidrostáticas y las conexiones a la unidad existente son parte del alcance.</li>' +
      '<li><b>Puesta en servicio</b>: el relé 86 exige reposición manual; los enclavamientos de seccionadores, agua, HVAC y puertas deben estar cerrados antes de energizar.</li>' +
      '</ul></div></div>';

  return html;
}
function paso(n, titulo, texto){
  return '<li><span class="pnum">' + n + '</span><div><b>' + esc(titulo) + '</b><div style="color:var(--text-2)">' + texto + '</div></div></li>';
}

function renderGuiaCCVPost(){
  const svg = document.getElementById('svgCCV');
  if(!svg) return;
  const panel = document.getElementById('panelBloque');
  $$('.blk', svg).forEach(function(g){
    g.addEventListener('click', function(ev){
      ev.stopPropagation();
      const k = g.getAttribute('data-k');
      const b = BLOQUES_CCV[k];
      if(!b) return;
      $$('.blk', svg).forEach(function(x){ x.classList.toggle('sel', x.getAttribute('data-k') === k); });
      const pref = { bus:'C0', trafo:'C0', ccv:'G', motor:'K01-W', excrect:'J01', exctrafo:'E01', k01:'K01', ctrl:'B18', prot:'', ehouse:'' }[k];
      panel.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="color:var(--text);font-size:14px">' + b.titulo + '</b>' +
        '<span class="tag">' + b.tag + '</span></div>' +
        '<p style="margin:8px 0 6px;color:var(--text)">' + b.texto + '</p>' +
        '<div style="font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">Documentos: ' + b.docs.map(function(c){ return refDoc(c); }).join(' · ') +
        (pref !== undefined ? '<button class="btn sm" onclick="verCircuitos(\'' + pref + '\')">⚡ Ver circuitos de este bloque</button>' : '') + '</div>';
    });
  });
  const bf = document.getElementById('btnFlujo');
  if(bf) bf.addEventListener('click', function(){
    const on = svg.classList.toggle('flow');
    bf.textContent = on ? '⏸ Detener' : '▶ Animar flujo';
  });
  /* zoom del plano */
  let zoom = 1;
  const wrap = document.getElementById('planoWrap');
  const aplicarZoom = function(){
    if(zoom <= 1){ svg.style.width = '100%'; }
    else { svg.style.width = Math.round(wrap.clientWidth * zoom) + 'px'; }
  };
  const bz = function(id, fn){ const b = document.getElementById(id); if(b) b.addEventListener('click', fn); };
  bz('zoomMas', function(){ zoom = Math.min(4, zoom + 0.5); aplicarZoom(); });
  bz('zoomMenos', function(){ zoom = Math.max(1, zoom - 0.5); aplicarZoom(); });
  bz('zoomAjustar', function(){ zoom = 1; aplicarZoom(); });
  bz('btnPlanoTab', function(){
    const w = window.open('about:blank', '_blank');
    if(!w) return;
    const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Unilineal simplificado — accionamiento GMD molino SAG</title>' +
      '<style>body{margin:0;background:#555;display:flex;align-items:flex-start;justify-content:center;padding:16px}svg{background:#fff;width:100%;max-width:1800px;height:auto;box-shadow:0 2px 12px rgba(0,0,0,.4)}@media print{body{background:#fff;padding:0}svg{box-shadow:none;max-width:none}}</style></head><body>' +
      svgUnilinealCCV() + '</body></html>';
    w.document.open(); w.document.write(html); w.document.close();
  });
}

/* ==================================================================
   10.2  UNILINEAL EXPLICADO BLOQUE A BLOQUE
   ================================================================== */
function renderGuiaUnilineal(){
  let html = '';
  html += '<div class="page-title"><h1>10.2 Diagrama unilineal 202EL-00001 explicado bloque a bloque</h1></div>';
  html += guiaNav('guia/unilineal');
  html += '<div class="help"><b>¿Qué es esto?</b> Lectura guiada del plano ' + refDoc('4502319491-03221-202EL-00001', 'Diagrama unilineal — Sistema de distribución MT (Rev 0, para construcción)') +
          ', hoja 2/3 (esquema) y hoja 3/3 (protecciones). Los <b>tags</b> (+1.B30, =G11…) son los mismos que verá en los gabinetes y en el manual de cableado; los números entre &lt; &gt; son la leyenda del plano.</div>';

  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>Bloques del esquema (hoja 2/3)</h2><div class="tbl-wrap"><table><thead><tr>' +
    ['Zona','Tag / referencia','Qué es','Datos del plano','Para qué sirve'].map(function(t){ return '<th style="cursor:default">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +
    filaUni('BY OTHERS','Barra 3 AC / 13,2 kV / 50 Hz','Barra de MT sala eléctrica existente','5 salidas con interruptor 52, motorizado (M), relés 86/94/27/57','Alimenta todo el accionamiento') +
    filaUni('BY OTHERS','=C01, =C02, =C03 · 400 A/5 A','Relés de protección de los alimentadores de los transformadores del convertidor','51T · 50T · 87T','Sobrecorriente y diferencial de transformador') +
    filaUni('BY OTHERS','&lt;6&gt; 20 A/5 A · 51T/50T','Protección alimentador de excitación','TC 20 A/5 A','Sobrecorriente del trafo de excitación') +
    filaUni('BY OTHERS','&lt;1&gt; 25 · 110 V','Transformador de sincronización','3 AC / 50 Hz · 110 V','Referencia de tensión y frecuencia de red para el control (&lt;1&gt; synchronizing voltage)') +
    filaUni('INNOMOTICS','+1.B30','Transformador de excitación','350 kVA · 13,2 kV / 330 V · Yy0 · uz 9 %','Alimenta el rectificador de excitación') +
    filaUni('INNOMOTICS','=F01 · ΔI','Compensación de factor de potencia','Banco de condensadores con reactancias, relé de desbalance','Corrige el bajo cos φ y filtra armónicos del cicloconvertidor') +
    filaUni('INNOMOTICS','+1.C11 / +1.C21 / +1.C31','Transformadores del convertidor (3)','6.760 kVA / 2×3.380 kVA · 13,2 kV / 2×1.200 V · Yy0d5 · Uz 10,5 %','Un transformador por fase; dos secundarios (uno por sistema de devanado) desfasados 30°') +
    filaUni('INNOMOTICS','87T =C0x · 2000 A/1 A','TC de protección diferencial de transformador','&lt;6&gt;','Compara corriente primaria y secundaria') +
    filaUni('INNOMOTICS','87M =G1x/=G2x · 3000 A/2×0,1 A','TC de protección diferencial de motor (lado convertidor)','&lt;6&gt; &lt;3&gt;','Se compara con los LEM del punto estrella del motor') +
    filaUni('INNOMOTICS','=N00 · &lt;20&gt;','Conectores de puesta a tierra','—','Aterrizar los secundarios para mantención') +
    filaUni('INNOMOTICS','+.B21 · =G11 =G12 =G13','Sección de potencia — sistema 1','Puentes &lt;30&gt; con pararrayos &lt;2&gt; y medición &lt;7&gt;','Alimentan fases 1U, 1V, 1W del estator') +
    filaUni('INNOMOTICS','+.B22 · =G21 =G22 =G23','Sección de potencia — sistema 2','Puentes &lt;30&gt;','Alimentan fases 2U, 2V, 2W del estator') +
    filaUni('INNOMOTICS','&lt;22&gt; 64','Detección de falla a tierra','Un relé por sistema de devanado','Detecta fugas a tierra en el circuito de baja frecuencia') +
    filaUni('INNOMOTICS','+1.B31 · =J01','Rectificador de excitación','Puente de tiristores, &lt;3&gt; medición de corriente, &lt;2&gt; pararrayos, &lt;9&gt; resistencia de carga base, &lt;7&gt; tensión','Corriente continua al rotor') +
    filaUni('INNOMOTICS','+1.B18','Control de lazo cerrado','Entradas &lt;11&gt; n*, &lt;3&gt;&lt;6&gt; i_estator, &lt;7&gt; u_estator, i_rotor, &lt;10&gt; n_motor','Genera los pulsos de disparo del convertidor y de la excitación') +
    filaUni('MOTOR','=K01 · &lt;21&gt;','Seccionadores con puesta a tierra','Uno por sistema de devanado y uno en excitación','Aislación segura del motor; contactos de enclavamiento') +
    filaUni('MOTOR','+1.U1 · 87M (LEM)','Motor anillo GMD','12.000 kW · 9,52 rpm · 2 sistemas × 1.900 V / 1.958 A · rotor K–J','El molino es el rotor; LEM 4000 A/1 A en el punto estrella') +
    '</tbody></table></div></div>';

  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>Leyenda del plano (&lt;n&gt;)</h2><div class="tbl-wrap"><table><thead><tr><th style="cursor:default">N°</th><th style="cursor:default">Significado</th></tr></thead><tbody>' +
      [['1','Tensión de sincronización'],['2','Pararrayos (surge arrester)'],['3','Medición de corriente para el control de lazo cerrado'],['6','Medición de corriente para protección'],
       ['7','Medición de tensión para el control de lazo cerrado'],['9','Resistencia de carga base'],['10','Velocidad real'],['11','Referencia de velocidad'],
       ['20','Conector de puesta a tierra'],['21','Seccionador'],['22','Detección de falla a tierra'],['30','Puente cicloconvertidor']].map(function(r){
        return '<tr><td class="num">' + r[0] + '</td><td class="wrap">' + r[1] + '</td></tr>'; }).join('') +
    '</tbody></table></div></div>' +
    '<div class="card card-pad"><h2>Funciones de protección (hoja 3/3)</h2><div class="tbl-wrap"><table><thead><tr><th style="cursor:default">ANSI</th><th style="cursor:default">Función</th><th style="cursor:default">Dónde</th></tr></thead><tbody>' +
      [['27','Subtensión','Red 13,2 kV'],['86','Relé de bloqueo (lockout): exige reposición manual','Interruptores 52'],['94','Relé de disparo con señal de pre-disparo (contacto abre ≤100 ms antes del 52)','Interruptores 52'],
       ['25','Transformador de sincronización / pérdida o frecuencia fuera de rango','Red'],['26','Temperatura de aceite alta-alta','Transformadores'],['63','Buchholz','Transformadores'],
       ['—','Nivel de aceite bajo-bajo · temperatura de devanado alta-alta','Transformadores'],['51T / 50T','Sobrecorriente temporizada / instantánea','Transformadores convertidor y excitación'],
       ['87T','Diferencial de transformador','Convertidor'],['59','Sobretensión entrada convertidor y excitación (limitador)','Convertidor'],['—','Sobrecorriente cicloconvertidor y excitación (limitación de corriente)','Control'],
       ['50','Sobrecorriente instantánea estator y rotor','Motor'],['—','Sobretensión DC de rotor','Excitación'],['40','Pérdida de excitación','Excitación'],
       ['—','Flujo de agua bajo / temperatura de agua alta','Unidad de enfriamiento'],['64','Falla a tierra','Sistemas de devanado'],['87M','Diferencial de motor','Motor / convertidor']].map(function(r){
        return '<tr><td class="mono">' + r[0] + '</td><td class="wrap">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') +
    '</tbody></table></div></div></div>';

  html += '<div class="card card-pad"><h2>Cómo leer los tags Innomotics</h2>' +
    '<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6">' +
    '<li><b>+1.B30, +1.C11, +1.U1</b>: el signo <b>+</b> indica <i>ubicación</i> (lugar físico: gabinete, transformador, motor). "+1" es la planta 1.</li>' +
    '<li><b>=G11, =K01, =C01, =F01, =J01</b>: el signo <b>=</b> indica <i>función</i> (grupo funcional: G = puente convertidor, K = seccionamiento, C = protección de alimentador, F = compensación, J = excitación).</li>' +
    '<li><b>+.B21 / +.B22</b>: secciones de potencia de los sistemas de devanado 1 y 2 dentro de la E-House; <b>+.B4</b>: sección de potencia completa.</li>' +
    '<li>El mismo sistema se usa en el manual de cableado ' + refDoc('CP-M0374-01-WM-EAB101', 'CP-M0374') + ' (EPLAN): buscar "=G11" ahí lleva directo a los esquemas de ese puente.</li>' +
    '</ul></div>';
  return html;
}
function filaUni(zona, tag, que, datos, para){
  const cls = zona === 'BY OTHERS' ? 'neutral' : zona === 'MOTOR' ? 'warn' : 'ok';
  return '<tr><td>' + pill(cls, zona) + '</td><td class="mono" style="white-space:normal;min-width:150px">' + tag + '</td><td class="wrap">' + que + '</td><td class="wrap">' + datos + '</td><td class="wrap">' + para + '</td></tr>';
}

/* ==================================================================
   10.3  ALCANCE DEL CONTRATO — BASES TÉCNICAS REV 0
   ================================================================== */
function renderGuiaAlcance(){
  const ct = DB.contrato;
  let html = '';
  html += '<div class="page-title"><h1>10.3 Alcance del contrato — Obras de Montaje Reemplazo de Cicloconvertidor Molino SAG</h1></div>';
  html += guiaNav('guia/alcance');
  html += '<div class="help"><b>¿Qué es esto?</b> Resumen didáctico de las <b>Bases Técnicas Rev 0 (CODELCO División Andina, mayo 2026)</b> ' +
          refDoc('BT-MONTAJE-CCV', 'ver documento en Drive') + '. Define qué hace el Contratista (' + esc(ct.contratista || 'MIES') +
          '), qué aporta CODELCO y qué queda con el fabricante Innomotics. <b>No reemplaza las Bases</b>: ante cualquier duda contractual manda el documento original y sus anexos.</div>';

  /* límites de batería */
  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>Quién hace qué (límites de batería)</h2>' +
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
    quien('CODELCO División Andina (mandante)', 'neutral',
      ['Suministra la E-House en packings al túnel SAG, los convertidores de MT, equipos de excitación, sistema de refrigeración y PLC (todos vía Innomotics)',
       'Suministra la red contra incendio y los cables de potencia principales (trafos → CCV, desconectador → CCV, excitación → rotor, desconectador → estator 1 y 2)',
       'Sala eléctrica existente de 13,2 kV, interruptores y transformadores: "BY OTHERS" en el unilineal',
       'ITO, administrador de contrato (AdC DAND), paradas de planta, capacitación GSSO, puntos topográficos']) +
    quien('Innomotics (fabricante / vendor)', 'ok',
      ['Diseña y fabrica la sala modular y todo el equipamiento del accionamiento',
       'Dirige y supervisa el armado de la E-House "en todo momento" (partida 3.1)',
       'Integración, comisionamiento y puesta en marcha del cicloconvertidor; el Contratista le da apoyo directo',
       'Entrega la ingeniería: planos, especificaciones, manual de montaje, manual de cableado']) +
    quien('Contratista de montaje (' + (ct.contratista || 'MIES') + ')', 'warn',
      ['Extensión del muro cortafuego · traslado Santiago → túnel SAG · armado de la E-House sobre el exoesqueleto',
       'Montaje de las 3 secciones del cicloconvertidor, unidad de enfriamiento, piping y pruebas hidrostáticas',
       'Canalizaciones, escalerillas, cables de fuerza/control, terminales, fibra óptica certificada, transductores LEM',
       'Red de incendio, HVAC, retiro de equipos y cables existentes, tie-ins en parada de planta, apoyo a integración, as-built']) +
    '</div></div>';

  /* objetivo y alcance general */
  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>Objetivo del servicio (BT 3)</h2>' +
      '<p style="font-size:13px;margin:0 0 8px">Reemplazar el cicloconvertidor y modernizar el sistema de control del motor anillo del molino SAG para evitar fallas por obsolescencia que generen pérdidas de producción. Contempla:</p>' +
      lista(['Reemplazo del cicloconvertidor','Sistema de accionamiento','Control de lazo cerrado','Sección de potencia (en nueva E-House)','Sistema de excitación',
             'Sistema de enfriamiento del convertidor (en nueva E-House)','Control y visualización (S7 PLC / PCS 7)','UPS 230 VAC','Cargador de baterías 24 VDC']) + '</div>' +
    '<div class="card card-pad"><h2>Alcance general (BT 4.1)</h2>' +
      lista(['Extensión muro cortafuego','Montaje sala eléctrica (E-House)','Modernización completa del sistema de accionamiento (en nueva E-House)',
             'Modernización del sistema de enfriamiento del convertidor','Modernización del sistema de automatización y visualización',
             'Modernización del cargador y banco de baterías 24 VDC','Modernización del sistema de excitación','Nueva UPS 230 VAC']) +
      '<p class="sub" style="margin:10px 0 0">Ubicación: Planta Concentradora, instalaciones subterráneas en el sector del molino SAG, Cordillera de Los Andes (3.500–4.200 m s.n.m.). Proyecto tipo <b>brownfield</b>: la sala eléctrica SAG sigue operando durante las obras.</p></div>' +
  '</div>';

  /* alcance específico (acordeón) */
  const ESP = [
    ['Extensión muro cortafuego', ['Suministro y montaje de estructura muro cortafuego','Suministro y montaje de panel tipo fast work']],
    ['Montaje sala eléctrica (E-House)', ['Traslado y montaje de estructura del piso de la sala','Montaje de estructura de piso soportante de equipos','Nivelación y fijación de piso','Instalación de paneles laterales','Instalación de techo','Complementos: puertas, unidades de aire acondicionado']],
    ['Sistema de accionamiento (en nueva E-House)', ['Traslado y montaje de secciones del cicloconvertidor (3 un)','Nivelación y fijación de secciones de cicloconvertidor']],
    ['Sistema de enfriamiento del convertidor', ['Traslado y montaje de unidad de enfriamiento','Traslado e instalación de soportes','Montaje de tramos de cañería próximos a los tie-ins','Pruebas hidrostáticas de cañerías','Conexión de cañerías en unidad de enfriamiento existente']],
    ['Canalizaciones', ['Suministro e instalación de soportes de escalerilla','Suministro y montaje de escalerilla']],
    ['Cables, conexionado y pruebas', ['Circuitos de fuerza nuevos entre sala eléctrica y transformador','Circuitos de fuerza entre sala eléctrica y molino SAG','Instalación temporal de circuitos definitivos entre sala eléctrica y molino (previo a parada)']],
    ['Fibra óptica', ['Suministro y montaje de cabeceras de F.O.','Soportación para F.O.','Suministro y montaje de fibra','Fusionado, conexionado y certificación']],
    ['Retiro de cables y equipos existentes', ['Cables de fuerza sala eléctrica ↔ molino y sala ↔ transformador','Gabinetes de control existentes','UPS y banco de baterías existentes','Excitatriz existente','CPU existente','Disposición final en patio de chatarra y normalización de áreas']],
    ['Montaje de equipos nuevos', ['UPS nueva','Banco de baterías nuevo','Gabinete de control nuevo','Excitatriz nueva','CPU nueva','Reemplazo de estación de operación existente']],
    ['Puesta en servicio', ['Cableado y conexionado','Pre-comisionamiento','Comisionamiento','Integración del sistema (apoyo directo al personal de Innomotics)']]
  ];
  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>Alcance específico (BT 4.2) — despliegue por grupo</h2>';
  ESP.forEach(function(g, i){
    html += '<details class="acc"' + (i === 0 ? ' open' : '') + '><summary>' + esc(g[0]) + ' <span class="tag">' + g[1].length + ' actividades</span></summary>' + lista(g[1]) + '</details>';
  });
  html += '</div>';

  /* secuencia constructiva */
  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>Secuencia constructiva (BT 5)</h2>' +
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' +
    fase('1 · Actividades previas y administrativas', ['Acreditación de personal, operadores y equipos; turno 7x7','Instalación de faena (túnel SAG / acceso MUN2)','Verificar nivelación, cuadratura y torque del exoesqueleto','Protocolo topográfico del marco de la E-House','Delimitar y señalizar el área']) +
    fase('2 · Montaje E-House (procedimiento del fabricante)', ['Preparación y posicionamiento de paneles','Unión de vigas de piso (pernos 1")','Unión de pilares de muro (pernos galvanizados 5/8")','Cerchas de techo (pernos 5/8")','Torque, cuadratura y terminaciones · Ref. ' + refDoc('4502319491-03221-MNLME-0001', 'MNLME-0001') + ' y ' + refDoc('4502319491-03221-200ME-00003', '200ME-00003')]) +
    fase('3 · Enfriamiento y montaje eléctrico', ['Unidad de enfriamiento, soportes, piping, hidrostáticas','Soportes y escalerillas nuevas','Circuitos de fuerza sala ↔ transformador y sala ↔ molino','Montaje y nivelación de las 3 secciones del CCV','Red de incendio: paneles, pulsadores, detectores, cilindro 84 L, conduit 25 mm, cañería SCH 40']) +
    fase('4 · Parada del molino SAG', ['Apoyo al personal de integración de Innomotics','Tie-ins de fuerza y control; pruebas y conexionado','Montaje de UPS, baterías, gabinetes de control y excitatriz nuevos','Retiro de CPU y montaje de la nueva; reemplazo de estación de operación','Conexión de cañería a unidad de enfriamiento existente']) +
    fase('5 · Post parada', ['Retiro de cables de fuerza existentes (molino y transformador)','Retiro de gabinetes, UPS y baterías antiguas','Disposición final en patio de chatarra','Normalización de áreas intervenidas','Documentación as-built y dossier']) +
    '</div></div>';

  /* partidas */
  const PART = ['1.1–1.2 Movilización, instalación de faena y desmovilización (SA)','Saneamiento y limpieza del área','Extensión de muro cortafuego','2.4 Traslado de suministro Innomotics Santiago → túnel SAG (PU por viaje)',
    '3.1 Montaje E-House proyectada (SA, dirigido por el vendor)','Trabajos previos a parada de planta','Montaje de piezas especiales en línea (proyectados)','Montaje de sistema de enfriamiento cicloconvertidor',
    'Suministro y montaje de canalizaciones eléctricas','Montaje de cables y pruebas','Suministro de terminales de cable (500 MCM y 350 MCM)','Suministro y montaje de cables de fibra óptica y pruebas',
    'Suministro, montaje de cables y pruebas','Suministro e instalación de fibra óptica (F.O.)','Suministro e instalación de cable transductores LEM','Montaje de equipos eléctricos',
    'Retiro y montaje de equipos (trabajos en parada de planta)','Tie-ins eléctricos','Apoyo directo al personal de integración','Retiro de equipos y cables (post parada)',
    'Suministro y montaje de equipos red de incendio','Suministro y montaje de canalizaciones conduit','Cañerías de acero','Tendido de cable de fuerza y control',
    'Documentación técnica exigida, firmada por el responsable','Gastos generales','Gastos reembolsables','Paralización de faena'];
  html += '<div class="grid cols2" style="margin-bottom:16px">' +
    '<div class="card card-pad"><h2>Partidas del itemizado (BT 6.2)</h2><ol style="margin:0;padding-left:20px;font-size:12.5px;line-height:1.55;columns:1">' +
      PART.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' +
      '<p class="sub" style="margin:8px 0 0">SA = suma alzada · PU = precio unitario. Las cubicaciones de las partidas a precio unitario son referenciales; se paga por la cantidad real medida con la ITO.</p></div>' +
    '<div class="card card-pad"><h2>Reglas que afectan a la Oficina Técnica (BT 8.1)</h2>' +
      lista(['Oficina técnica de terreno permanente, a cargo del Jefe de Oficina Técnica (personal clave, dedicación exclusiva)',
             'Es el nexo técnico con CODELCO: detecta discrepancias, falta de información e interferencias y emite la <b>SDI</b> (Solicitud de Información)',
             'Plazo para reportar discrepancias entre planos, especificaciones y terreno: <b>7 días corridos</b> desde recibida la información técnica',
             'CODELCO responde las SDI en <b>21 días</b>; la SDI no sirve para cambios de alcance',
             'El Contratista <b>no puede cambiar la ingeniería</b>; toda aclaración pasa por SDI',
             'Debe generar planos red-line y entregar el <b>as-built</b> digital y físico de todo su alcance',
             'Desarrolla procedimientos de respaldo: maniobras, modelación de montaje, andamios, transporte de superficie con análisis de riesgo',
             'Cronograma en Primavera P6 (o MS Project) con curva S, ruta crítica y avance físico mensual']) +
      '<p class="sub" style="margin:8px 0 0">Esta app es justamente la herramienta de esa oficina técnica: la matriz 1.1 registra lo recibido, la 1.3 registra las discrepancias que originan SDI y el Módulo 03 llevará las NCR.</p></div>' +
  '</div>';

  /* consideraciones */
  html += '<div class="card card-pad"><h2>Consideraciones críticas de ejecución (BT 4.3 y 11)</h2>' +
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' +
    quien('Brownfield', 'warn', ['Áreas operativas y equipos energizados en la sala SAG','Planificación secuencial y reuniones diarias con Operaciones','Talleres previos con Operaciones para incorporar sus observaciones']) +
    quien('Paradas de planta', 'bad', ['Todo lo que interfiere con la operación se hace solo en detenciones programadas','Desmontaje, montaje, tendido y tie-ins deben cerrarse dentro de la ventana','Traspasos de carga y conexiones eléctricas coordinados con el área eléctrica']) +
    quien('Segregación y tránsito', 'neutral', ['Señalética y barreras duras según estándar CODELCO','Gestión del tránsito en el túnel SAG','Radios, paleteros y vigías durante las intervenciones','Plan de tránsito y manejo de interferencias aprobado por DAND']) +
    quien('Seguridad y clima', 'ok', ['Reglamento de Seguridad Eléctrica DAND y Estándares de Control de Fatalidades','EPP para riesgo eléctrico, kit de primeros auxilios','Condiciones climáticas, nieve y caídas de rocas: los mayores tiempos son de cargo del Contratista']) +
    '</div></div>';
  return html;
}
function quien(titulo, cls, items){
  return '<div style="border:1px solid var(--border);border-radius:6px;padding:12px">' +
    '<div style="margin-bottom:6px">' + pill(cls, titulo) + '</div>' + lista(items) + '</div>';
}
function fase(titulo, items){
  return '<div style="border:1px solid var(--border);border-radius:6px;padding:12px"><b style="font-size:13px">' + titulo + '</b>' + lista(items) + '</div>';
}
function lista(items){
  return '<ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;line-height:1.55">' + items.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>';
}

/* ==================================================================
   10.4  GLOSARIO Y DOCUMENTOS CLAVE
   ================================================================== */
function renderGuiaGlosario(){
  let html = '';
  html += '<div class="page-title"><h1>10.4 Glosario y documentos clave</h1></div>';
  html += guiaNav('guia/glosario');

  const G = [
    ['GMD / motor anillo','Gearless Mill Drive: motor síncrono cuyos polos van montados en el molino. Sin reductor ni corona.'],
    ['CCV / cicloconvertidor','Convertidor de frecuencia con tiristores que transforma 50 Hz directamente en una frecuencia mucho menor, sin etapa de corriente continua.'],
    ['Tiristor','Semiconductor que conduce cuando recibe un pulso de disparo y deja de conducir cuando la corriente pasa por cero (conmutación natural).'],
    ['Antiparalelo','Dos puentes de tiristores conectados en sentido opuesto para que la salida pueda ser positiva y negativa (corriente alterna).'],
    ['Yy0d5','Transformador con un secundario en estrella (sin desfase) y otro en triángulo (desfasado 150° = 30° eléctricos efectivos); juntos dan reacción de 12 pulsos.'],
    ['Excitación','Corriente continua que se inyecta al rotor para crear su campo magnético. La produce el rectificador +1.B31.'],
    ['Sistema de devanado 1 / 2','El estator tiene dos conjuntos trifásicos independientes (1U-1V-1W y 2U-2V-2W). Cada uno tiene sus propios puentes y protecciones.'],
    ['LEM','Transductor de corriente de efecto Hall (4000 A / 1 A) instalado en el punto estrella del motor para el diferencial 87M.'],
    ['E-House','Sala eléctrica modular prefabricada (tipo mecano, apernada) que aloja el accionamiento nuevo. Se arma en terreno sobre el exoesqueleto.'],
    ['Exoesqueleto','Estructura metálica existente sobre la que se monta la E-House (segundo piso).'],
    ['SSAA','Servicios auxiliares: alimentación de 400/230 V para bombas, HVAC, iluminación, UPS, cargador.'],
    ['Tie-in','Punto de conexión entre lo nuevo y lo existente (eléctrico o de piping). Se ejecuta en parada de planta.'],
    ['Parada de planta','Detención programada del molino SAG en la que se hacen los trabajos que interfieren con la operación.'],
    ['SDI','Solicitud de Información: documento formal de la oficina técnica a CODELCO para aclarar la ingeniería (respuesta en 21 días).'],
    ['ITO','Inspección Técnica de Obras de CODELCO: recepciona los trabajos y aprueba estados de pago.'],
    ['AdC','Administrador de Contrato (de CODELCO o del Contratista).'],
    ['Transmittal','Carta o registro formal con que se envía o recibe documentación de ingeniería. Cada revisión llega con uno.'],
    ['Revisión A/B/C… vs 0/1/2…','Letras: emisiones para revisión o aprobación. Números: emisiones para construcción (Rev 0 = primera válida para construir).'],
    ['Red-line / As-built','Planos marcados a mano en terreno con lo realmente construido, y su versión definitiva dibujada.'],
    ['Hold point','Punto de detención del PIE: no se sigue sin la firma del mandante (por ejemplo, torque de la E-House, pruebas hidrostáticas, megado).'],
    ['NCR','No conformidad: registro de un incumplimiento respecto a planos, especificaciones o procedimientos.'],
    ['RFI','Request for Information: equivalente a la SDI en la nomenclatura del proveedor.'],
    ['Relé 86','Relé de bloqueo: tras un disparo grave impide re-energizar hasta que alguien lo reponga manualmente.'],
    ['87T / 87M','Protecciones diferenciales de transformador y motor: comparan la corriente que entra con la que sale.'],
    ['Inching / creeping','Giro lento controlado del molino para mantención o posicionamiento, posible gracias al control de torque desde 0 rpm.']
  ];
  html += '<div class="card card-pad" style="margin-bottom:16px"><h2>Glosario</h2><div class="tbl-wrap"><table><thead><tr><th style="cursor:default">Término</th><th style="cursor:default">Qué significa en este contrato</th></tr></thead><tbody>' +
    G.map(function(r){ return '<tr><td style="white-space:normal;min-width:150px"><b>' + esc(r[0]) + '</b></td><td class="wrap">' + esc(r[1]) + '</td></tr>'; }).join('') +
    '</tbody></table></div></div>';

  const T = [
    ['Entender el sistema eléctrico', ['4502319491-03221-202EL-00001','4502319491-03221-202EL-0002','4502319491-03221-402EL-00001','CP-M0374-01-WM-EAB101']],
    ['Cables y conexionado', ['4502319491-03221-106EL-00001','4502319491-03221-300EL-0001','4502319491-03221-104ME-00001','4502319491-03221-413AT-00001']],
    ['Montar la sala eléctrica', ['4502319491-03221-MNLME-0001','4502319491-03221-200ME-00003','4502319491-03221-400ME-00001','4502319491-03221-400ME-00002','4502319491-03221-ESPME-00001','4502319491-03221-HDDME-00001','4502319491-03221-MDCME-00001']],
    ['Layout y equipos dentro de la sala', ['4502319491-03221-100ME-00001','4502319491-03221-100ME-00002','4502319491-03221-104ME-00002','4502319491-03221-105EL-0002','4502319491-03221-401EL-00001','4502319491-03221-401EL-00002']],
    ['HVAC, incendio y terminaciones', ['4502319491-03221-100ME-00003','4502319491-03221-MDCME-00002','4502319491-03221-100EL-00001','4502319491-03221-CEREL-0003','4502319491-03221-500ME-0001']],
    ['Contrato y alcance', ['BT-MONTAJE-CCV','4502319491-03221-LSTAT-00001']]
  ];
  html += '<div class="card card-pad"><h2>Documentos clave por tema</h2><p class="sub">Un clic en el código abre el PDF (si la app está junto a los archivos); "ficha" lleva al registro en la matriz.</p>' +
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">' +
    T.map(function(t){
      return '<div style="border:1px solid var(--border);border-radius:6px;padding:12px"><b style="font-size:13px">' + esc(t[0]) + '</b>' +
        '<ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;line-height:1.7">' +
        t[1].map(function(c){ const d = docPorCodigo(c); return '<li>' + refDoc(c) + (d ? '<br><span style="color:var(--text-2)">' + esc(recorta(d.titulo, 80)) + '</span>' : '') + '</li>'; }).join('') +
        '</ul></div>';
    }).join('') + '</div></div>';
  return html;
}

/* Ir al listado de circuitos con un filtro de texto */
function verCircuitos(texto){
  FILTRO_CIRC.texto = texto || ''; FILTRO_CIRC.zona = ''; FILTRO_CIRC.grupo = ''; FILTRO_CIRC.alcance = '';
  ir('ingenieria/circuitos');
}
