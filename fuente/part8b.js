/* ==================================================================
   ===============   UNILINEAL DIDÁCTICO — ESTILO PLANO   ===========
   ==================================================================
   Dibujo SVG del unilineal simplificado con la presentación de un
   plano de ingeniería de detalle: hoja con marco y zonas, rotulado,
   símbolos IEC, pesos de línea diferenciados y tipografía técnica
   pequeña. Cada bloque es clicable (clase .blk, atributo data-k) y
   se explica en el panel de la vista 10.1.
   ================================================================== */

function svgUnilinealCCV(){
  const W = 1400, H = 900;
  const s = [];
  const P = function(x){ s.push(x); };

  /* ---------- helpers de dibujo ---------- */
  const L = function(x1,y1,x2,y2,cls){ P('<line class="' + (cls||'w') + '" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>'); };
  const PATH = function(d,cls,extra){ P('<path class="' + (cls||'w') + '" d="'+d+'"' + (extra||'') + '/>'); };
  const T = function(x,y,str,cls,anchor,extra){ P('<text class="' + (cls||'lab') + '" x="'+x+'" y="'+y+'"' + (anchor?' text-anchor="'+anchor+'"':'') + (extra||'') + '>' + str + '</text>'); };
  const R = function(x,y,w,h,cls,extra){ P('<rect class="' + (cls||'sym') + '" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"' + (extra||'') + '/>'); };
  const C = function(cx,cy,r,cls){ P('<circle class="' + (cls||'sym') + '" cx="'+cx+'" cy="'+cy+'" r="'+r+'"/>'); };
  const HIT = function(x,y,w,h){ P('<rect class="hit" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3"/>'); };
  const G0 = function(k){ P('<g class="blk" data-k="' + k + '">'); };
  const G1 = function(){ P('</g>'); };

  /* símbolo interruptor extraíble 52 (caja con aspa) centrado en (x,y) */
  const breaker = function(x,y,tag){
    R(x-8, y-11, 16, 22, 'sym');
    L(x-8, y-11, x+8, y+11, 'thin'); L(x-8, y+11, x+8, y-11, 'thin');
    T(x+12, y+3, tag || '52', 'lab');
  };
  /* transformador de corriente: círculo sobre la línea */
  const ct = function(x,y,label,side){
    C(x, y, 6, 'sym');
    if(label) T(side === 'l' ? x-10 : x+10, y+3, label, 'lab2', side === 'l' ? 'end' : 'start');
  };
  /* transformador 2 devanados (vertical) */
  const trafo2 = function(x,y){ C(x, y-10, 13, 'sym'); C(x, y+10, 13, 'sym'); };
  /* transformador 3 devanados: primario arriba, dos secundarios abajo */
  const trafo3 = function(x,y){ C(x, y-12, 13, 'sym'); C(x-14, y+10, 13, 'sym'); C(x+14, y+10, 13, 'sym'); };
  /* tiristor: triángulo + barra + puerta; dir = 1 hacia abajo, -1 hacia arriba */
  const thy = function(x,y,dir,sc){
    sc = sc || 1; const h = 9*sc, w = 8*sc;
    if(dir > 0){
      PATH('M'+(x-w)+' '+(y-h)+' L'+(x+w)+' '+(y-h)+' L'+x+' '+(y+h)+' Z', 'thin');
      L(x-w, y+h, x+w, y+h, 'thin'); L(x+w-2, y+h, x+w+4, y+h-6, 'thin');
    }else{
      PATH('M'+(x-w)+' '+(y+h)+' L'+(x+w)+' '+(y+h)+' L'+x+' '+(y-h)+' Z', 'thin');
      L(x-w, y-h, x+w, y-h, 'thin'); L(x-w+2, y-h, x-w-4, y-h+6, 'thin');
    }
  };
  /* puente cicloconvertidor: caja con dos tiristores en antiparalelo */
  const ccvBox = function(x,y,tag,sub){
    R(x-24, y-24, 48, 48, 'sym');
    thy(x-9, y, 1, 0.8); thy(x+9, y, -1, 0.8);
    T(x, y+36, tag, 'tt', 'middle'); T(x, y+46, sub, 'lab2', 'middle');
  };
  /* seccionador con cuchilla de puesta a tierra, sobre línea vertical en x, entre y0 e y1 */
  const isolator = function(x,y){
    L(x, y-16, x, y-6, 'w'); L(x, y-6, x-9, y+8, 'sym'); L(x, y+8, x, y+16, 'w');
    C(x, y-6, 1.6, 'dot');
    /* cuchilla de tierra */
    L(x, y+11, x+10, y+11, 'thin'); L(x+10, y+11, x+17, y+4, 'thin');
    earth(x+17, y+14, 0.7);
  };
  const earth = function(x,y,sc){
    sc = sc || 1;
    L(x, y-6*sc, x, y, 'thin'); L(x-7*sc, y, x+7*sc, y, 'thin'); L(x-4.5*sc, y+3*sc, x+4.5*sc, y+3*sc, 'thin'); L(x-2*sc, y+6*sc, x+2*sc, y+6*sc, 'thin');
  };
  /* condensador (dos placas) centrado en (x,y), vertical */
  const cap = function(x,y){ L(x, y-8, x, y-3, 'thin'); L(x-7, y-3, x+7, y-3, 'sym'); L(x-7, y+3, x+7, y+3, 'sym'); L(x, y+3, x, y+8, 'thin'); };
  const reactor = function(x,y){ PATH('M'+x+' '+(y-8)+' a4 4 0 0 1 0 8 a4 4 0 0 1 0 8', 'thin'); };
  const arrow = function(x1,y1,x2,y2){ P('<line class="sig" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" marker-end="url(#arrS)"/>'); };

  /* ---------- cabecera SVG ---------- */
  P('<svg id="svgCCV" class="plano" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Diagrama unilineal simplificado del accionamiento GMD del molino SAG">');
  P('<defs><marker id="arrS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#333"/></marker></defs>');
  P('<style>' +
    '#svgCCV{background:#fff}' +
    '#svgCCV text{font-family:"Arial Narrow","Liberation Sans Narrow",Arial,Helvetica,sans-serif;fill:#111}' +
    '#svgCCV .lab{font-size:9px}#svgCCV .lab2{font-size:8px;fill:#333}#svgCCV .tt{font-size:9.5px;font-weight:700}' +
    '#svgCCV .big{font-size:12px;font-weight:700}#svgCCV .zl{font-size:8.5px;font-weight:700;fill:#555;letter-spacing:.7px}' +
    '#svgCCV .grid{font-size:8px;fill:#666}#svgCCV .tb{font-size:8px;fill:#222}#svgCCV .tbb{font-size:9.5px;font-weight:700;fill:#111}' +
    '#svgCCV .w{stroke:#111;stroke-width:1.3;fill:none}#svgCCV .mt{stroke-width:2}#svgCCV .bus{stroke:#111;stroke-width:4.5;fill:none}' +
    '#svgCCV .lf{stroke:#111;stroke-width:1.6;fill:none}#svgCCV .dc{stroke:#111;stroke-width:1.3;fill:none;stroke-dasharray:9 3}' +
    '#svgCCV .sig{stroke:#444;stroke-width:0.9;fill:none;stroke-dasharray:3 2.5}' +
    '#svgCCV .sym{stroke:#111;stroke-width:1.3;fill:#fff}#svgCCV .thin{stroke:#111;stroke-width:0.9;fill:none}#svgCCV .dot{fill:#111;stroke:none}' +
    '#svgCCV .frame{fill:none;stroke:#111;stroke-width:1.6}#svgCCV .frame2{fill:none;stroke:#111;stroke-width:0.8}' +
    '#svgCCV .zone{fill:none;stroke:#7a7a7a;stroke-width:0.9;stroke-dasharray:7 3}' +
    '#svgCCV .blk{cursor:pointer}#svgCCV .hit{fill:transparent;stroke:none}' +
    '#svgCCV .blk:hover .hit{fill:rgba(26,107,168,.09)}' +
    '#svgCCV .blk.sel .hit{fill:rgba(26,107,168,.13);stroke:#1a6ba8;stroke-width:1;stroke-dasharray:3 2}' +
    '#svgCCV.flow .mt,#svgCCV.flow .w.p{stroke:#12507e;stroke-dasharray:7 5;animation:ccvflow 1.1s linear infinite}' +
    '#svgCCV.flow .lf{stroke:#2e7d46;stroke-dasharray:7 5;animation:ccvflow 2.2s linear infinite}' +
    '#svgCCV.flow .dc{stroke:#9a6205;animation:ccvflow 1.6s linear infinite}' +
    '@keyframes ccvflow{to{stroke-dashoffset:-24}}' +
    '</style>');

  /* ---------- hoja: marco y zonas de referencia ---------- */
  R(20, 20, W-40, H-40, 'frame'); R(36, 36, W-72, H-72, 'frame2');
  const cols = 8, rows = 6;
  for(let i=0;i<=cols;i++){
    const x = 36 + (W-72)*i/cols;
    L(x, 20, x, 36, 'thin'); L(x, H-36, x, H-20, 'thin');
    if(i<cols){ const xm = 36 + (W-72)*(i+0.5)/cols; T(xm, 31, String(i+1), 'grid', 'middle'); T(xm, H-25, String(i+1), 'grid', 'middle'); }
  }
  for(let j=0;j<=rows;j++){
    const y = 36 + (H-72)*j/rows;
    L(20, y, 36, y, 'thin'); L(W-36, y, W-20, y, 'thin');
    if(j<rows){ const ym = 36 + (H-72)*(j+0.5)/rows; T(28, ym+3, 'ABCDEF'[j], 'grid', 'middle'); T(W-28, ym+3, 'ABCDEF'[j], 'grid', 'middle'); }
  }

  /* zonas del proceso */
  R(60, 60, 1280, 172, 'zone'); T(68, 73, 'SALA ELÉCTRICA EXISTENTE MOLINO SAG · SWITCHGEAR 13,2 kV · "BY OTHERS" (CODELCO) · CABLES NUEVOS TENDIDOS POR EL CONTRATISTA', 'zl');
  G0('ehouse'); HIT(60, 244, 1280, 374); R(60, 244, 1280, 374, 'zone');
  T(68, 257, 'E-HOUSE NUEVA · SALA ELÉCTRICA MODULAR 2° PISO SOBRE EXOESQUELETO · EQUIPOS SUMINISTRO INNOMOTICS · MONTAJE, CANALIZACIÓN Y CABLEADO CONTRATISTA', 'zl'); G1();
  R(60, 630, 1280, 160, 'zone'); T(68, 643, 'ÁREA MOLINO SAG · MOTOR ANILLO EXISTENTE +1.U1 · SECCIONADORES =K01 · TRANSDUCTORES LEM EN PUNTO ESTRELLA', 'zl');

  /* ---------- barra 13,2 kV ---------- */
  G0('bus'); HIT(100, 84, 1220, 44);
  L(120, 104, 1300, 104, 'bus');
  T(122, 96, 'BARRA 13,2 kV · 3~ · 50 Hz', 'big');
  T(1298, 96, 'RELÉS DE ALIMENTADOR =C01 · =C02 · =C03 (50T / 51T / 87T) · SINCRONIZACIÓN &lt;1&gt; 25 · SUBTENSIÓN 27 · BLOQUEO 86 · PRE-DISPARO 94', 'lab2', 'end');
  G1();

  /* alimentadores: interruptor 52 + TC */
  const FX = { exc:230, pfc:450, c1:680, c2:900, c3:1120 };
  const feeder = function(x, ctLabel, tag){
    L(x, 104, x, 139, 'w mt p'); breaker(x, 150, '52 M');
    L(x, 161, x, 184, 'w mt p'); ct(x, 190, ctLabel, 'r'); L(x, 196, x, 244, 'w mt p');
    if(tag) T(x-12, 154, tag, 'lab2', 'end');
  };
  feeder(FX.exc, 'TC 20/5 A · 50T/51T &lt;6&gt;', '86 94');
  feeder(FX.pfc, 'ΔI', '86');
  feeder(FX.c1, 'TC 400/5 A · =C01', '86 94');
  feeder(FX.c2, 'TC 400/5 A · =C02', '86 94');
  feeder(FX.c3, 'TC 400/5 A · =C03', '86 94');

  /* ---------- transformador de excitación ---------- */
  G0('exctrafo'); HIT(190, 246, 230, 80);
  L(FX.exc, 244, FX.exc, 269, 'w mt p'); trafo2(FX.exc, 292);
  T(FX.exc+22, 284, '+1.B30 · TRAFO DE EXCITACIÓN', 'tt');
  T(FX.exc+22, 296, '350 kVA · 13,2 kV / 330 V', 'lab');
  T(FX.exc+22, 307, 'Yy0 · uz 9 % · 50T/51T · 26 · 63', 'lab2');
  G1();
  L(FX.exc, 315, FX.exc, 372, 'w p');

  /* ---------- rectificador de excitación ---------- */
  G0('excrect'); HIT(190, 370, 320, 70);
  R(FX.exc-32, 376, 64, 48, 'sym'); thy(FX.exc-10, 400, 1, 0.9);
  T(FX.exc+8, 396, '~', 'big'); L(FX.exc+4, 404, FX.exc+22, 404, 'thin'); L(FX.exc+4, 408, FX.exc+22, 408, 'thin');
  T(FX.exc+42, 388, '+1.B31 · RECTIFICADOR DE EXCITACIÓN (=J01)', 'tt');
  T(FX.exc+42, 400, 'Puente de tiristores SINAMICS DCM · &lt;2&gt; pararrayos · &lt;9&gt; R carga base · &lt;7&gt; u', 'lab');
  T(FX.exc+42, 411, 'Protecciones: 59 · 40 · sobretensión DC rotor · limitación de corriente', 'lab2');
  G1();
  /* línea DC al rotor */
  PATH('M'+FX.exc+' 424 L'+FX.exc+' 554', 'dc');
  G0('k01'); HIT(200, 552, 120, 40); isolator(FX.exc, 570); T(FX.exc+30, 566, '=K01 · +1.U13', 'lab2'); T(FX.exc+30, 576, 'S93T seccionador excitación', 'lab2'); G1();
  PATH('M'+FX.exc+' 586 L'+FX.exc+' 770 L780 770 L780 712 L854 712', 'dc');
  T(300, 765, 'CORRIENTE CONTINUA DE EXCITACIÓN AL ROTOR · bornes K – J (anillos rozantes) · cables SISIF-Cu 185 mm² 6,6 kV (2 por polo)', 'lab2');

  /* ---------- compensación factor de potencia ---------- */
  G0('pfc'); HIT(380, 246, 250, 100);
  L(FX.pfc, 244, FX.pfc, 262, 'w mt p'); L(FX.pfc-18, 262, FX.pfc+18, 262, 'w');
  [FX.pfc-18, FX.pfc, FX.pfc+18].forEach(function(x){ L(x, 262, x, 270, 'thin'); reactor(x, 278); L(x, 286, x, 294, 'thin'); cap(x, 302); L(x, 310, x, 320, 'thin'); });
  L(FX.pfc-18, 320, FX.pfc+18, 320, 'w'); L(FX.pfc, 320, FX.pfc, 330, 'thin'); earth(FX.pfc, 336, 1);
  T(FX.pfc+30, 284, '=F01 · COMPENSACIÓN FP', 'tt');
  T(FX.pfc+30, 296, 'condensadores + reactancias', 'lab');
  T(FX.pfc+30, 307, 'corrige cos φ · filtra armónicos', 'lab2');
  T(FX.pfc+30, 318, 'ΔI · pararrayos &lt;2&gt;', 'lab2');
  G1();

  /* ---------- transformadores del convertidor ---------- */
  const TX = [FX.c1, FX.c2, FX.c3], TN = ['+1.C11', '+1.C21', '+1.C31'], CN = ['=C01', '=C02', '=C03'];
  G0('trafo'); HIT(660, 246, 620, 84);
  TX.forEach(function(x, i){
    L(x, 244, x, 270, 'w mt p'); trafo3(x, 294);
    T(x+30, 282, TN[i] + ' · TRAFO DEL CONVERTIDOR', 'tt');
    T(x+30, 294, '6.760 kVA · 13,2 kV / 2 × 1.200 V', 'lab');
    T(x+30, 305, 'Yy0d5 · Uz 10,5 % · 87T ' + CN[i] + ' · 26 · 63', 'lab2');
    T(x-30, 300, 'y0', 'lab2', 'end'); T(x+33, 320, 'd5', 'lab2');
  });
  G1();

  /* secundarios → puentes */
  TX.forEach(function(x){
    L(x-14, 317, x-14, 338, 'w p'); L(x-14, 338, x-36, 338, 'w p'); L(x-36, 338, x-36, 356, 'w p'); ct(x-36, 362, '', 'l'); L(x-36, 368, x-36, 384, 'w p');
    L(x+14, 317, x+14, 338, 'w p'); L(x+14, 338, x+36, 338, 'w p'); L(x+36, 338, x+36, 356, 'w p'); ct(x+36, 362, '', 'r'); L(x+36, 368, x+36, 384, 'w p');
  });
  T(FX.c1-50, 365, '87T 2000/1 A', 'lab2', 'end');
  T(FX.c1-50, 375, '=N00 &lt;20&gt; conector de tierra', 'lab2', 'end');

  /* ---------- puentes cicloconvertidores ---------- */
  G0('ccv'); HIT(620, 380, 700, 110);
  const G1n = ['=G11','=G12','=G13'], G2n = ['=G21','=G22','=G23'];
  TX.forEach(function(x, i){
    ccvBox(x-36, 408, G1n[i], 'sist. 1 · +.B21');
    ccvBox(x+36, 408, G2n[i], 'sist. 2 · +.B22');
  });
  T(600, 470, 'PUENTES CICLOCONVERTIDORES &lt;30&gt;', 'tt', 'end');
  T(600, 481, '6 × puente de tiristores en antiparalelo · refrigerados por agua desionizada', 'lab2', 'end');
  T(600, 491, 'sección de potencia +.B4 · &lt;22&gt; 64 falla a tierra por sistema de devanado', 'lab2', 'end');
  G1();

  /* salidas de baja frecuencia → colectores */
  TX.forEach(function(x){
    L(x-36, 432, x-36, 500, 'lf'); L(x+36, 432, x+36, 516, 'lf');
  });
  L(FX.c1-36, 500, FX.c3-36, 500, 'lf'); L(FX.c1+36, 516, FX.c3+36, 516, 'lf');
  C(FX.c1-36, 500, 1.8, 'dot'); C(FX.c2-36, 500, 1.8, 'dot'); C(FX.c1+36, 516, 1.8, 'dot'); C(FX.c2+36, 516, 1.8, 'dot');
  T(FX.c3-36+8, 497, 'SISTEMA 1 · 1U-1V-1W · 1.900 V baja frecuencia', 'lab2');
  T(FX.c3+36+8, 519, 'SISTEMA 2 · 2U-2V-2W', 'lab2');
  /* bajadas al motor */
  const D1 = FX.c2-36, D2 = FX.c2+36;
  L(D1, 500, D1, 554, 'lf'); L(D2, 516, D2, 554, 'lf');
  G0('k01'); HIT(820, 552, 250, 40);
  isolator(D1, 570); isolator(D2, 570);
  T(D2+40, 566, '=K01 · +1.U11 / +1.U12 · S91T / S92T', 'lab2'); T(D2+40, 576, 'seccionadores con cuchilla de tierra &lt;21&gt; &lt;20&gt;', 'lab2');
  G1();
  L(D1, 586, D1, 610, 'lf'); L(D2, 586, D2, 610, 'lf');
  ct(D1, 616, '87M', 'l'); ct(D2, 616, '3000 / 2×0,1 A', 'r');
  L(D1, 622, D1, 668, 'lf'); L(D2, 622, D2, 668, 'lf');
  T(D1-14, 627, 'cables NHXSGAFHXÖ 3,6/6 kV · 5 × 240 mm² por fase · sin pantalla · igual largo · máx. 150 m', 'lab2', 'end');

  /* ---------- motor anillo ---------- */
  G0('motor'); HIT(840, 664, 130, 110);
  C(FX.c2, 712, 44, 'sym'); C(FX.c2, 712, 36, 'thin');
  T(FX.c2, 706, 'M', 'big', 'middle'); T(FX.c2, 720, '3~ · GMD', 'lab', 'middle'); T(FX.c2, 731, '+1.U1', 'lab2', 'middle');
  G1();
  T(FX.c2+56, 700, 'MOTOR ANILLO · GMD', 'tt');
  T(FX.c2+56, 712, '12.000 kW · 9,52 rpm · síncrono', 'lab');
  T(FX.c2+56, 723, '2 sistemas de devanado × 1.900 V · 1.958 A', 'lab');
  T(FX.c2+56, 734, 'LEM 4000/1 A en punto estrella (87M) · rotor K–J', 'lab2');
  T(FX.c2+56, 745, 'el cuerpo del molino es el rotor: sin reductor', 'lab2');
  T(FX.c2, 770, '⏚ 64 · 50 · 87M', 'lab2', 'middle');

  /* ---------- control de lazo cerrado ---------- */
  G0('ctrl'); HIT(470, 656, 250, 84);
  R(470, 656, 250, 84, 'sym');
  T(595, 672, '+1.B18 · REGULADOR DE LAZO CERRADO', 'tt', 'middle');
  T(595, 685, 'Entradas: n* &lt;11&gt; · i estator &lt;3&gt;&lt;6&gt; · u estator &lt;7&gt; · i rotor · n motor &lt;10&gt;', 'lab2', 'middle');
  T(595, 697, 'Salidas: pulsos de disparo a los 6 puentes y al rectificador de excitación', 'lab2', 'middle');
  T(595, 709, 'Supervisión y HMI: PLC SIMATIC S7 / PCS 7 · Profibus / Profinet / F.O. (413AT)', 'lab2', 'middle');
  T(595, 722, 'Funciones: control de torque desde 0 rpm · inching · frenado regenerativo', 'lab2', 'middle');
  G1();
  arrow(595, 656, 595, 470); T(600, 560, 'pulsos de disparo', 'lab2'); T(600, 570, '(6 puentes)', 'lab2');
  arrow(470, 690, 262, 690); arrow(262, 690, 262, 426); T(268, 470, 'pulsos', 'lab2'); T(268, 480, 'excitación', 'lab2');
  arrow(856, 700, 722, 700);
  T(790, 696, 'medidas: n, i, u', 'lab2');

  /* ---------- protecciones ---------- */
  G0('prot'); HIT(1150, 656, 190, 122);
  R(1150, 656, 190, 122, 'sym');
  T(1245, 671, 'PROTECCIONES (hoja 3/3 · 202EL-00001)', 'tt', 'middle');
  [['27 · 86 · 94','red 13,2 kV, bloqueo y pre-disparo'],['25 · 26 · 63','sincronización, temperatura, Buchholz'],['50T · 51T · 87T','sobrecorriente y diferencial trafos'],
   ['59 · 40','sobretensión y pérdida de excitación'],['50 · 64 · 87M','estator/rotor, tierra, diferencial motor'],['flujo / T° agua','refrigeración del convertidor']].forEach(function(r,i){
    T(1156, 686 + i*15, r[0], 'lab'); T(1222, 686 + i*15, r[1], 'lab2');
  });
  G1();

  /* ---------- leyenda ---------- */
  R(36, 796, 896, 68, 'frame2');
  T(44, 809, 'LEYENDA', 'tbb');
  L(44, 822, 84, 822, 'bus'); T(90, 825, 'Barra 13,2 kV', 'tb');
  L(150, 822, 190, 822, 'w mt'); T(196, 825, 'Alimentador MT 13,2 kV', 'tb');
  L(300, 822, 340, 822, 'w'); T(346, 825, 'Secundario 1.200 V', 'tb');
  L(430, 822, 470, 822, 'lf'); T(476, 825, 'Baja frecuencia al estator (1.900 V)', 'tb');
  L(640, 822, 680, 822, 'dc'); T(686, 825, 'Corriente continua excitación', 'tb');
  L(44, 842, 84, 842, 'sig'); T(90, 845, 'Señales de control / medición', 'tb');
  C(230, 842, 6, 'sym'); T(240, 845, 'TC transformador de corriente', 'tb');
  R(360, 834, 12, 16, 'sym'); L(360, 834, 372, 850, 'thin'); L(360, 850, 372, 834, 'thin'); T(378, 845, 'Interruptor extraíble 52', 'tb');
  thy(520, 842, 1, 0.6); T(534, 845, 'Tiristor', 'tb');
  earth(600, 842, 0.8); T(612, 845, 'Puesta a tierra', 'tb');
  T(700, 845, '&lt;n&gt; = número de leyenda del plano original · +x = ubicación · =x = función', 'tb');
  T(44, 858, 'Fuente: 4502319491-03221-202EL-00001 Rev 0 (hoja 2/3 esquema, hoja 3/3 protecciones) · GMD Wiring Manual CP-M0374 (cable overview) · Requisitos de cables CP-M0374-00-EE-EDC002. Dibujo didáctico: no reemplaza al plano oficial.', 'tb');

  /* ---------- rotulado ---------- */
  R(940, 796, 424, 68, 'frame2');
  L(940, 818, 1364, 818, 'thin'); L(940, 840, 1364, 840, 'thin'); L(1200, 818, 1200, 864, 'thin'); L(1290, 840, 1290, 864, 'thin');
  T(946, 806, 'CODELCO CHILE · DIVISIÓN ANDINA · MOLINO SAG', 'tbb');
  T(946, 815, 'OBRAS DE MONTAJE REEMPLAZO DE CICLOCONVERTIDOR · ' + esc(recorta((DB.contrato.contratista || 'MIES'), 34).toUpperCase()), 'tb');
  T(946, 830, 'UNILINEAL SIMPLIFICADO · GMD 12.000 kW', 'tbb');
  T(946, 838, 'Guía didáctica de la Oficina Técnica · Sistema de distribución MT', 'tb');
  T(1206, 830, 'Ref. 202EL-00001 Rev 0', 'tb'); T(1206, 838, '66OP12040-INN-DAND-EL-PL0096', 'tb');
  T(946, 851, 'Dibujó: App Control de Contrato', 'tb'); T(946, 860, 'Revisó: Jefe Oficina Técnica', 'tb');
  T(1206, 851, 'Esc.: S/E', 'tb'); T(1206, 860, 'Hoja 1 de 1', 'tb');
  T(1296, 851, 'Rev. A', 'tb'); T(1296, 860, fmtFecha(hoyISO()), 'tb');

  P('</svg>');
  return s.join('');
}
