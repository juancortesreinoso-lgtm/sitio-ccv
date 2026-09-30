/* ==================================================================
   ===============      10.5 SIMULADORES 3D               ===========
   ==================================================================
   Los simuladores son archivos HTML independientes guardados en la
   subcarpeta "simuladores/" junto a este archivo (en la carpeta
   Construccion y en el sitio web). Se pueden abrir en pestaña nueva
   o incrustados dentro de la app.
   ================================================================== */

function renderSimuladores(){
  const abierto = ESTADO_UI.simAbierto ? SIMULADORES.filter(function(s){ return s.id === ESTADO_UI.simAbierto; })[0] : null;
  let html = '';
  html += '<div class="page-title"><h1>10.5 Simuladores 3D</h1></div>';
  html += guiaNav('guia/simuladores');
  html += '<div class="help"><b>¿Qué es esto?</b> Tres modelos interactivos en 3D para entender el proyecto sin abrir un plano: cómo funciona el accionamiento del molino, ' +
          'cómo es la sala eléctrica por dentro y en qué orden se arma su estructura. Funcionan en el navegador (requieren WebGL) y no modifican ningún dato de la app. ' +
          'Arrastre para girar, rueda para acercar, clic sobre un equipo para inspeccionarlo.</div>';

  if(abierto){
    html += '<div class="toolbar"><button class="btn" onclick="cerrarSimulador()">← Volver a la lista</button>' +
            '<b style="font-size:13px">' + esc(abierto.icono + ' ' + abierto.titulo) + '</b><span class="spacer"></span>' +
            '<a class="btn sm primary" href="' + attr(abierto.archivo) + '" target="_blank" rel="noopener">⧉ Abrir en pestaña nueva (pantalla completa)</a></div>';
    html += '<iframe class="sim-frame" src="' + attr(abierto.archivo) + '" title="' + attr(abierto.titulo) + '"></iframe>';
    return html;
  }

  html += '<div class="sim-grid">';
  SIMULADORES.forEach(function(s){
    html += '<div class="card sim-card">' +
      '<div class="sim-ico">' + s.icono + '</div>' +
      '<h2>' + esc(s.titulo) + '</h2>' +
      '<p>' + esc(s.resumen) + '</p>' +
      '<div class="sim-src">Fuente: ' + esc(s.fuente) + '</div>' +
      '<div class="toolbar">' +
        '<button class="btn primary" onclick="abrirSimulador(\'' + attr(s.id) + '\')">▶ Ver aquí</button>' +
        '<a class="btn" href="' + attr(s.archivo) + '" target="_blank" rel="noopener">⧉ Pestaña nueva</a>' +
      '</div></div>';
  });
  html += '</div>';
  html += '<p class="sub" style="margin-top:14px">Los archivos viven en la subcarpeta <span class="mono">simuladores/</span> junto a esta aplicación. ' +
          'Si un simulador no carga, verifique que esa carpeta se copió junto con el archivo HTML (o con el sitio web).</p>';
  return html;
}
function abrirSimulador(id){ ESTADO_UI.simAbierto = id; render(); window.scrollTo(0,0); }
function cerrarSimulador(){ ESTADO_UI.simAbierto = null; render(); }

/* ==================================================================
   ===============      MODO LECTURA / ADMINISTRADOR      ===========
   ==================================================================
   Por defecto la app es de SOLO LECTURA para cualquiera que la abra:
   los botones de crear / editar / borrar / importar se ocultan y las
   funciones correspondientes quedan bloqueadas. Con la clave de
   administrador (hash en ADMIN_HASH) se habilita la edición en la
   pestaña actual. Los datos siguen guardándose en el navegador de
   cada usuario (localStorage), nunca en el servidor.
   ================================================================== */

const ADMIN = { activo:false, token:'' };
const ADMIN_SESION_KEY = 'ccv_admin_sesion';
const ADMIN_TOKEN_KEY = 'ccv_admin_token';   /* token para escribir en el servicio de datos compartidos */

/* Funciones que modifican datos: se envuelven para exigir el modo administrador */
const FUNCIONES_EDICION = [
  'formDocumento','guardarDocumento','eliminarDoc','nuevaRevision','guardarNuevaRevision','eliminarRevision',
  'formComentario','guardarComentario','eliminarComentario',
  'formTerreno','guardarTerreno','formDiscrepancia','guardarDiscrepancia','eliminarDiscrepancia',
  'guardarFichaCircuito','guardarContrato','guardarParams',
  'dialogoCargaMasiva','procesarCargaMasiva','importarJSON','recargarBase','limpiarEjemplo','borrarTodo',
  'formAvance','guardarAvance','eliminarAvance','formRestriccion','guardarRestriccion','eliminarRestriccion','guardarFechaCorte'
];

/* SHA-256 (WebCrypto si existe; si no, implementación propia para file://) */
function sha256Hex(texto){
  const bytes = new TextEncoder().encode(texto);
  if(window.crypto && crypto.subtle && crypto.subtle.digest){
    return crypto.subtle.digest('SHA-256', bytes).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
    }).catch(function(){ return Promise.resolve(sha256JS(bytes)); });
  }
  return Promise.resolve(sha256JS(bytes));
}
function sha256JS(m){
  const KK = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = m.length, bitLen = l * 8;
  const padLen = ((l + 9 + 63) >> 6) << 6;
  const p = new Uint8Array(padLen); p.set(m); p[l] = 0x80;
  p[padLen-4] = (bitLen >>> 24) & 255; p[padLen-3] = (bitLen >>> 16) & 255; p[padLen-2] = (bitLen >>> 8) & 255; p[padLen-1] = bitLen & 255;
  const w = new Array(64);
  function rotr(x,n){ return (x >>> n) | (x << (32-n)); }
  for(let i=0;i<padLen;i+=64){
    for(let t=0;t<16;t++) w[t] = (p[i+t*4]<<24) | (p[i+t*4+1]<<16) | (p[i+t*4+2]<<8) | p[i+t*4+3];
    for(let t=16;t<64;t++){
      const s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15]>>>3);
      const s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2]>>>10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for(let t=0;t<64;t++){
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + KK[t] + w[t]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h=g; g=f; f=e; e=(d + t1)>>>0; d=c; c=b; b=a; a=(t1 + t2)>>>0;
    }
    H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
  }
  return H.map(function(x){ return ('00000000' + x.toString(16)).slice(-8); }).join('');
}

function esAdmin(){ return ADMIN.activo; }

/* Oculta los controles de edición cuando la app está en modo lectura */
function aplicarModoLectura(raiz){
  document.body.classList.toggle('lectura', !ADMIN.activo);
  const b = document.getElementById('adminBtn');
  if(b){
    b.textContent = ADMIN.activo ? '🔓 Administrador' : '🔒 Lectura';
    b.classList.toggle('on', ADMIN.activo);
    b.title = ADMIN.activo ? 'Edición habilitada. Clic para volver a modo lectura.' : 'Modo lectura: clic para ingresar la clave de administrador';
  }
  if(ADMIN.activo) return;
  const re = new RegExp('^\\s*(' + FUNCIONES_EDICION.join('|') + ')\\s*\\(');
  $$('[onclick]', raiz || document).forEach(function(el){
    if(re.test(el.getAttribute('onclick') || '')) el.classList.add('solo-admin');
  });
}
function bloqueoLectura(){
  toast('🔒 La aplicación está en <b>modo lectura</b>. Ingrese la clave de administrador (botón 🔒 arriba) para editar.', 'bad', 5000);
}
function instalarGuardias(){
  FUNCIONES_EDICION.forEach(function(nombre){
    const original = window[nombre];
    if(typeof original !== 'function') return;
    window[nombre] = function(){
      if(!ADMIN.activo){ bloqueoLectura(); return; }
      return original.apply(this, arguments);
    };
  });
}
function dialogoAdmin(){
  if(ADMIN.activo){
    ADMIN.activo = false; ADMIN.token = '';
    try{ sessionStorage.removeItem(ADMIN_SESION_KEY); sessionStorage.removeItem(ADMIN_TOKEN_KEY); }catch(e){}
    cerrarModal(); render(); toast('Modo lectura activado.', 'ok');
    return;
  }
  abrirModal(
    '<div class="modal-head"><h2>🔒 Clave de administrador</h2><button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' +
      '<p class="sub" style="margin-bottom:12px">La aplicación se abre en <b>modo lectura</b>: cualquiera puede consultar la matriz, abrir planos y usar los simuladores, pero nadie puede crear, editar ni borrar registros. ' +
      'Con la clave de administrador se habilita la edición en esta pestaña.</p>' +
      '<div class="field"><label class="f" for="adminClave">Clave</label>' +
      '<input class="inp" id="adminClave" type="password" autocomplete="current-password" placeholder="Ingrese la clave"></div>' +
      '<div id="adminMsg" class="sub" style="margin:0;color:var(--bad)"></div>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primary" id="adminOk">Habilitar edición</button></div>', 'narrow');
  const inp = document.getElementById('adminClave');
  const ok = document.getElementById('adminOk');
  function intentar(){
    const v = inp.value;
    if(!v){ inp.focus(); return; }
    ok.disabled = true;
    sha256Hex(v).then(function(h){
      if(h === ADMIN_HASH){
        ADMIN.activo = true;
        try{ sessionStorage.setItem(ADMIN_SESION_KEY, h); }catch(e){}
        sha256Hex('ccv-servidor|' + v).then(function(tk){ ADMIN.token = tk; try{ sessionStorage.setItem(ADMIN_TOKEN_KEY, tk); }catch(e){} });
        cerrarModal(); render(); toast('🔓 Edición habilitada para esta pestaña. Pulse el botón de administrador para volver a bloquear.', 'ok', 6000);
      }else{
        ok.disabled = false; inp.value = ''; inp.focus();
        document.getElementById('adminMsg').textContent = 'Clave incorrecta.';
      }
    });
  }
  ok.addEventListener('click', intentar);
  inp.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') intentar(); });
  inp.focus();
}
function initAdmin(){
  try{ if(sessionStorage.getItem(ADMIN_SESION_KEY) === ADMIN_HASH){ ADMIN.activo = true; ADMIN.token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''; } }catch(e){}
  instalarGuardias();
  const b = document.getElementById('adminBtn');
  if(b) b.addEventListener('click', dialogoAdmin);
  aplicarModoLectura(document);
}
