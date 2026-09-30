/* ==================================================================
   ===============        ROUTER / NAVEGACIÓN         ===============
   ==================================================================
   Router simple por hash: #/ingenieria/matriz
   Cada vista es enlazable y el botón "atrás" del navegador funciona.
   ================================================================== */

const ESTADO_UI = {
  abiertos: { ingenieria: true },   // carpetas expandidas del árbol
  ruta: 'dashboard',
  /* estado de la tabla de la matriz */
  orden: { campo: 'correlativo', asc: true },
  filtros: { texto:'', disciplina:'', estado:'', fase:'', tipo:'', soloVencidos:false, soloComentarios:false },
  docSel: null                       // documento seleccionado en 1.2 / 1.3
};

/* Índice ruta -> {nodo, padre} para breadcrumb y activación */
function buscarRuta(ruta){
  for(let i=0;i<MENU.length;i++){
    const m = MENU[i];
    if(m.route === ruta) return { nodo:m, padre:null };
    if(m.children){
      /* ruta del módulo padre (p. ej. #/plan o #/guia): abre su primera página */
      if(ruta === m.id || ruta === m.children[0].route.split('/')[0]) return { nodo:m.children[0], padre:m };
      for(let j=0;j<m.children.length;j++){
        if(m.children[j].route === ruta) return { nodo:m.children[j], padre:m };
      }
    }
  }
  return null;
}
function rutaActual(){
  const h = (location.hash || '').replace(/^#\/?/, '');
  return h || 'dashboard';
}
function ir(ruta){ location.hash = '#/' + ruta; }

function onHashChange(){
  const r = rutaActual();
  ESTADO_UI.ruta = buscarRuta(r) ? r : 'dashboard';
  const info = buscarRuta(ESTADO_UI.ruta);
  if(info && info.padre) ESTADO_UI.abiertos[info.padre.id] = true;
  cerrarModal();
  render();
  document.querySelector('.content').scrollTop = 0;
  window.scrollTo(0, 0);
  const sb = document.getElementById('sidebar');
  if(window.innerWidth <= 860) sb.classList.remove('open');
}

/* ---- Íconos SVG inline (nada externo) ---- */
const ICO = {
  folderClosed: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.5 3.5h4l1.2 1.6h7.8v7.4H1.5z"/></svg>',
  folderOpen:   '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.5 12.5V3.5h4l1.2 1.6h7.8v1.6"/><path d="M1.5 12.5l1.8-5.4h12L13.5 12.5z"/></svg>',
  chart:        '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 13.5h12"/><path d="M4 13V8M8 13V3.5M12 13V6"/></svg>',
  gear:         '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.3"/><path d="M8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M12.5 3.5l-1.3 1.3M4.8 11.2L3.5 12.5"/></svg>',
  doc:          '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 1.5h5l3 3v10H4z"/><path d="M9 1.5v3h3"/></svg>',
  book:         '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2.5 2.5h4.5a1.5 1.5 0 0 1 1.5 1.5v10a1.2 1.2 0 0 0-1.2-1.2H2.5z"/><path d="M13.5 2.5H9a1.5 1.5 0 0 0-1.5 1.5v10a1.2 1.2 0 0 1 1.2-1.2h4.8z"/></svg>'
};

/* ---- Construcción del árbol lateral ---- */
function renderMenu(){
  const tree = document.getElementById('tree');
  const ruta = ESTADO_UI.ruta;
  let html = '';

  MENU.forEach(function(m){
    const tieneHijos = !!(m.children && m.children.length);
    const abierto = !!ESTADO_UI.abiertos[m.id];
    const activo = (m.route === ruta) || (tieneHijos && m.children.some(function(c){ return c.route === ruta; }));
    const ico = m.icon === 'chart' ? ICO.chart : m.icon === 'gear' ? ICO.gear : m.icon === 'book' ? ICO.book
              : (tieneHijos && abierto ? ICO.folderOpen : ICO.folderClosed);
    const badge = contadorModulo(m);

    html += '<div class="node">';
    html += '<button class="node-head' + (activo ? ' active' : '') + '" data-id="' + attr(m.id) + '"' +
            (m.route ? ' data-route="' + attr(m.route) + '"' : '') +
            ' data-tree="' + (tieneHijos ? '1' : '0') + '">' +
            (tieneHijos ? '<span class="caret' + (abierto ? ' open' : '') + '">▶</span>' : '<span class="caret" style="visibility:hidden">▶</span>') +
            '<span class="ico">' + ico + '</span>' +
            '<span class="txt">' + esc(m.code + ' — ' + m.label) + '</span>' +
            badge + '</button>';

    if(tieneHijos && abierto){
      html += '<div class="children">';
      m.children.forEach(function(c){
        html += '<button class="node-head' + (c.route === ruta ? ' active' : '') + '" data-route="' + attr(c.route) + '" data-tree="0">' +
                '<span class="ico">' + ICO.doc + '</span><span class="txt">' + esc(c.label) + '</span></button>';
      });
      html += '</div>';
    }
    html += '</div>';
  });

  tree.innerHTML = html;

  $$('.node-head', tree).forEach(function(b){
    b.addEventListener('click', function(){
      const esArbol = b.getAttribute('data-tree') === '1';
      const id = b.getAttribute('data-id');
      const route = b.getAttribute('data-route');
      if(esArbol){
        ESTADO_UI.abiertos[id] = !ESTADO_UI.abiertos[id];
        renderMenu();
        return;
      }
      if(route) ir(route);
    });
  });
}

/* Badge por módulo: cantidad de registros o marca "en construcción" */
function contadorModulo(m){
  if(m.wip) return '<span class="badge wip" title="Módulo aún no desarrollado">en constr.</span>';
  if(m.id === 'ingenieria') return '<span class="badge">' + DB.documentos.length + '</span>';
  return '';
}

/* ---- Breadcrumb ---- */
function renderCrumb(){
  const info = buscarRuta(ESTADO_UI.ruta);
  const c = document.getElementById('crumb');
  if(!info){ c.textContent = ''; return; }
  if(info.padre){
    c.innerHTML = esc(info.padre.code + ' — ' + info.padre.label) +
                  '<span class="sep">›</span><b>' + esc(info.nodo.label) + '</b>';
  }else{
    c.innerHTML = '<b>' + esc(info.nodo.code + ' — ' + info.nodo.label) + '</b>';
  }
}

/* ---- Pie del sidebar: identificación del contrato ---- */
function renderPieSidebar(){
  const ct = DB.contrato;
  const partes = [];
  if(ct.nContrato) partes.push('Contrato ' + ct.nContrato);
  if(ct.ods) partes.push('ODS ' + ct.ods);
  document.getElementById('sbFoot').innerHTML =
    esc(ct.contratista || '—') + '<br>' + (partes.length ? esc(partes.join(' · ')) : 'Sin N° de contrato definido');
  document.getElementById('sbSubtitle').textContent = ct.mandante || 'Oficina Técnica y Calidad';
}

/* ---- Render principal ---- */
function render(){
  renderMenu();
  renderCrumb();
  renderPieSidebar();
  const info = buscarRuta(ESTADO_UI.ruta);
  const cont = document.getElementById('content');
  if(!info){ cont.innerHTML = ''; return; }
  const nodo = info.nodo;

  if(nodo.wip){ cont.innerHTML = vistaEnConstruccion(nodo); return; }
  const fn = window[nodo.render];
  if(typeof fn === 'function'){ cont.innerHTML = fn(); if(typeof window[nodo.render + 'Post'] === 'function') window[nodo.render + 'Post'](); }
  else cont.innerHTML = '<div class="card card-pad">Vista no implementada.</div>';
  if(typeof aplicarModoLectura === 'function') aplicarModoLectura(cont);
}

/* ---- Tarjeta de módulo en construcción ---- */
function vistaEnConstruccion(m){
  return '' +
    '<div class="page-title"><h1>' + esc(m.code + ' — ' + m.label) + '</h1>' +
    '<span class="pill neutral" style="margin-top:4px">En construcción</span></div>' +
    '<p class="sub">Este módulo ya existe en la estructura de la aplicación y se irá alimentando por etapas.</p>' +
    '<div class="card wip-card" style="max-width:820px">' +
      '<div class="wip-ico">🚧</div>' +
      '<h2 style="margin-top:8px">¿Qué contendrá este módulo?</h2>' +
      '<p style="color:var(--text-2);font-size:12.5px;margin:0">' + esc(m.wipDesc) + '</p>' +
      '<h3 style="margin-top:16px">Alcance previsto</h3>' +
      '<ul class="wip-list">' + (m.wipItems || []).map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '</div>';
}

/* ==================================================================
   ===============        BUSCADOR GLOBAL             ===============
   ==================================================================
   Filtra documentos por código, título o disciplina desde cualquier
   vista y lleva directamente a la ficha del documento.
   ================================================================== */
function buscarDocs(q){
  q = str(q).trim().toLowerCase();
  if(!q) return [];
  return DB.documentos.filter(function(d){
    return (d.codigo + ' ' + d.titulo + ' ' + d.disciplina + ' ' + d.area + ' ' + d.emisor).toLowerCase().indexOf(q) >= 0;
  }).slice(0, 12);
}
function initBuscador(){
  const inp = document.getElementById('globalSearch');
  const pop = document.getElementById('searchPop');

  function pintar(){
    const res = buscarDocs(inp.value);
    if(!inp.value.trim()){ pop.hidden = true; pop.innerHTML = ''; return; }
    pop.hidden = false;
    if(!res.length){ pop.innerHTML = '<div class="empty">Sin coincidencias.</div>'; return; }
    pop.innerHTML = res.map(function(d){
      const r = revActual(d);
      return '<button data-id="' + attr(d.id) + '"><span class="mono">' + esc(d.codigo) + '</span> · Rev. ' + esc(r.rev) +
             '<br><span style="color:var(--text-2)">' + esc(d.titulo) + '</span>' +
             '<br><span class="tag">' + esc(d.disciplina) + '</span>' + pillEstado(r.estado) + '</button>';
    }).join('');
    $$('button', pop).forEach(function(b){
      b.addEventListener('click', function(){
        pop.hidden = true; inp.value = '';
        fichaDocumento(b.getAttribute('data-id'));
      });
    });
  }
  inp.addEventListener('input', pintar);
  inp.addEventListener('focus', pintar);
  document.addEventListener('click', function(ev){
    if(!pop.contains(ev.target) && ev.target !== inp) pop.hidden = true;
  });
}

/* ==================================================================
   ===============       TEMA Y COMPORTAMIENTO UI     ===============
   ================================================================== */
function initTema(){
  let guardado = null;
  try{ guardado = localStorage.getItem(APP.storageKey + '_tema'); }catch(e){}
  if(guardado) document.documentElement.setAttribute('data-theme', guardado);
  document.getElementById('themeBtn').addEventListener('click', function(){
    const actual = document.documentElement.getAttribute('data-theme');
    let nuevo;
    if(actual === 'dark') nuevo = 'light';
    else if(actual === 'light') nuevo = 'dark';
    else nuevo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try{ localStorage.setItem(APP.storageKey + '_tema', nuevo); }catch(e){}
    if(ESTADO_UI.ruta === 'ingenieria/estadisticas' || ESTADO_UI.ruta === 'dashboard') render();
  });
}
function initDrive(){
  const b = document.getElementById('driveBtn');
  if(!b) return;
  b.addEventListener('click', function(){
    const u = str(DB.contrato.carpetaDrive).trim();
    if(!u){ toast('Configure la URL de la carpeta de Google Drive en el Módulo 09.', 'bad'); ir('config'); return; }
    window.open(u, '_blank', 'noopener');
  });
}
function initSidebar(){
  document.getElementById('sbToggle').addEventListener('click', function(){
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
  document.getElementById('hamb').addEventListener('click', function(){
    document.getElementById('sidebar').classList.toggle('open');
  });
}
