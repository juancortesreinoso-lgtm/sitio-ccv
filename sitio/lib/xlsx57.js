/* ==================================================================
   xlsx57 — edición de una plantilla .xlsx preservando su formato
   ==================================================================
   Trabaja directamente sobre el paquete OOXML (zip) con JSZip. Solo se
   reescriben las hojas y partes que efectivamente se modifican; el resto
   de las partes (estilos, tema, combinaciones, áreas de impresión,
   márgenes, saltos, controles, imágenes, tablas, vínculos) se conserva
   byte a byte. Funciona en el navegador (window.JSZip) y en Node.
   Funciones:
     · setValue / setFormula / clearCell  (conserva el estilo de la celda)
     · insertRows: inserta filas dentro de un bloque copiando formato,
       alto, combinaciones y fórmulas de una fila modelo, y desplaza
       TODAS las referencias del libro (fórmulas de todas las hojas,
       nombres definidos, combinaciones, validaciones, formatos
       condicionales, saltos de página, anclas de dibujos, controles
       de formulario y VML, tablas).
     · imágenes: reemplazo y agregado de fotografías en un dibujo.
     · casillas de verificación (controles de formulario).
   ================================================================== */
(function(root){
'use strict';
const JSZipRef = (typeof module !== 'undefined' && module.exports) ? require('jszip') : root.JSZip;

/* ---------- utilidades ---------- */
function colNum(c){ let n = 0; for(let i = 0; i < c.length; i++) n = n * 26 + (c.charCodeAt(i) - 64); return n; }
function colStr(n){ let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function splitRef(ref){ const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(ref); return m ? { c: colNum(m[1]), r: +m[2] } : null; }
function xmlEsc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function xmlUnesc(s){ return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function(_, d){ return String.fromCharCode(+d); }).replace(/&#x([0-9a-f]+);/gi, function(_, h){ return String.fromCharCode(parseInt(h, 16)); }).replace(/&amp;/g, '&'); }
function parseAttrs(s){ const o = {}; const re = /([\w:]+)="([^"]*)"/g; let m; while((m = re.exec(s))) o[m[1]] = m[2]; return o; }
function attrStr(o, order){ const keys = order ? order.filter(function(k){ return k in o; }).concat(Object.keys(o).filter(function(k){ return order.indexOf(k) < 0; })) : Object.keys(o); return keys.map(function(k){ return ' ' + k + '="' + o[k] + '"'; }).join(''); }
function dateSerial(iso){ const p = String(iso).slice(0, 10).split('-'); const d = Date.UTC(+p[0], +p[1] - 1, +p[2]); return Math.round((d - Date.UTC(1899, 11, 30)) / 86400000); }
function timeFrac(hhmm){ const p = String(hhmm).split(':'); return ((+p[0]) * 60 + (+p[1] || 0)) / 1440; }
function quoteSheet(n){ return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) ? n : "'" + n.replace(/'/g, "''") + "'"; }

/* ---------- referencias dentro de fórmulas ----------
   Recorre la fórmula saltando literales de texto y aplica fn a cada
   referencia de celda/rango (con su hoja, si la tiene).               */
const REF_RE = /(^|[^A-Za-z0-9_.\]'"$])((?:'(?:[^']|'')+'|\[\d+\][^!'"\s(),;+\-*\/&=<>^]*|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?|\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\$?\d+:\$?\d+)(?![A-Za-z0-9_(!\[])/g;
function mapRefs(formula, fn){
  let out = '', i = 0;
  const parts = []; // segmentos fuera de comillas dobles
  while(i < formula.length){
    const q = formula.indexOf('"', i);
    if(q < 0){ parts.push([formula.slice(i), true]); break; }
    parts.push([formula.slice(i, q), true]);
    let j = q + 1;
    while(j < formula.length){ if(formula[j] === '"'){ if(formula[j + 1] === '"'){ j += 2; continue; } break; } j++; }
    parts.push([formula.slice(q, j + 1), false]);
    i = j + 1;
  }
  parts.forEach(function(p){
    if(!p[1]){ out += p[0]; return; }
    out += p[0].replace(REF_RE, function(all, pre, sheet, ref){
      let sh = null;
      if(sheet){ sh = sheet.slice(0, -1); if(sh[0] === "'") sh = sh.slice(1, -1).replace(/''/g, "'"); }
      const r = fn(sh, ref, !!sheet);
      return pre + (sheet || '') + (r == null ? ref : r);
    });
  });
  return out;
}
function parseCellPart(s){ const m = /^(\$?)([A-Z]{1,3})(\$?)(\d+)$/.exec(s); return m ? { ac: !!m[1], c: m[2], ar: !!m[3], r: +m[4] } : null; }
function fmtCellPart(p){ return (p.ac ? '$' : '') + p.c + (p.ar ? '$' : '') + p.r; }
/* traslada referencias relativas (como al copiar una celda) */
function translateFormula(f, dR, dC){
  return mapRefs(f, function(sh, ref){
    if(sh && sh[0] === '[') return null;
    return ref.split(':').map(function(part){
      const p = parseCellPart(part);
      if(p){ if(!p.ar) p.r += dR; if(!p.ac && dC) p.c = colStr(colNum(p.c) + dC); return fmtCellPart(p); }
      const mc = /^(\$?)([A-Z]{1,3})$/.exec(part);
      if(mc){ return (!mc[1] && dC) ? colStr(colNum(mc[2]) + dC) : part; }
      const mr = /^(\$?)(\d+)$/.exec(part);
      if(mr){ return (!mr[1] && dR) ? String(+mr[2] + dR) : part; }
      return part;
    }).join(':');
  });
}
/* desplaza referencias por inserción de n filas antes de la fila `at` de la hoja `target` */
function shiftRowNum(r, at, n){ return r >= at ? r + n : r; }
function shiftRangeStr(ref, at, n){
  const parts = ref.split(':');
  if(parts.length === 1){ const p = parseCellPart(parts[0]); if(!p) return ref; p.r = shiftRowNum(p.r, at, n); return fmtCellPart(p); }
  const a = parseCellPart(parts[0]), b = parseCellPart(parts[1]);
  if(a && b){ if(a.r >= at){ a.r += n; b.r += n; } else if(b.r >= at){ b.r += n; } return fmtCellPart(a) + ':' + fmtCellPart(b); }
  const ra = /^(\$?)(\d+)$/.exec(parts[0]), rb = /^(\$?)(\d+)$/.exec(parts[1]);
  if(ra && rb){ let x = +ra[2], y = +rb[2]; if(x >= at){ x += n; y += n; } else if(y >= at) y += n; return ra[1] + x + ':' + rb[1] + y; }
  return ref; // columnas completas
}
function shiftFormula(f, formulaSheet, target, at, n){
  return mapRefs(f, function(sh, ref){
    const s = sh == null ? formulaSheet : sh;
    if(s !== target) return null;
    return shiftRangeStr(ref, at, n);
  });
}
function shiftSqref(sq, at, n){ return sq.split(/\s+/).map(function(r){ return shiftRangeStr(r, at, n); }).join(' '); }

/* ---------- hoja (modelo de filas y celdas) ---------- */
function Sheet(book, name, path, xml){
  this.book = book; this.name = name; this.path = path;
  const i0 = xml.indexOf('<sheetData'), i1 = xml.indexOf('</sheetData>');
  if(i0 < 0) throw new Error('Hoja sin sheetData: ' + name);
  const open = xml.slice(i0, xml.indexOf('>', i0) + 1);
  this.pre = xml.slice(0, i0); this.post = i1 >= 0 ? xml.slice(i1 + 12) : xml.slice(i0 + open.length);
  const body = (i1 >= 0 && !open.endsWith('/>')) ? xml.slice(i0 + open.length, i1) : '';
  this.rows = new Map();
  const rowRe = /<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g; let m;
  while((m = rowRe.exec(body))){
    const at = parseAttrs(m[1]); const r = +at.r; const cells = new Map();
    if(m[3]){
      const cRe = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g; let c;
      while((c = cRe.exec(m[3]))){
        const ca = parseAttrs(c[1]); const inner = c[3] || '';
        const cell = { a: ca, f: null, v: null, is: null };
        const fm = /<f\b([^>]*?)(\/>|>([\s\S]*?)<\/f>)/.exec(inner);
        if(fm) cell.f = { a: parseAttrs(fm[1]), t: fm[3] != null ? xmlUnesc(fm[3]) : '' };
        const vm = /<v>([\s\S]*?)<\/v>/.exec(inner); if(vm) cell.v = vm[1];
        const im = /<is>[\s\S]*?<\/is>/.exec(inner); if(im) cell.is = im[0];
        cells.set(colNum(/^([A-Z]+)/.exec(ca.r)[1]), cell);
      }
    }
    this.rows.set(r, { a: at, cells: cells });
  }
  this.dirty = false;
  this.expandShared();
}
Sheet.prototype.expandShared = function(){
  const masters = {};
  const self = this;
  this.rows.forEach(function(row, r){ row.cells.forEach(function(cell, c){ if(cell.f && cell.f.a.t === 'shared' && cell.f.a.ref) masters[cell.f.a.si] = { r: r, c: c, t: cell.f.t }; }); });
  let n = 0;
  this.rows.forEach(function(row, r){ row.cells.forEach(function(cell, c){
    if(cell.f && cell.f.a.t === 'shared'){
      const ms = masters[cell.f.a.si];
      if(ms){ cell.f = { a: {}, t: (ms.r === r && ms.c === c) ? ms.t : translateFormula(ms.t, r - ms.r, c - ms.c) }; n++; }
    }
  }); });
  if(n) this.dirty = true;
};
Sheet.prototype.cell = function(ref, crear){
  const p = splitRef(ref); if(!p) throw new Error('Referencia inválida ' + ref);
  let row = this.rows.get(p.r);
  if(!row){ if(!crear) return null; row = { a: { r: String(p.r) }, cells: new Map() }; this.rows.set(p.r, row); }
  let cell = row.cells.get(p.c);
  if(!cell){ if(!crear) return null; const st = this.estiloPorDefecto(p.r, p.c); cell = { a: { r: ref.replace(/\$/g, '') }, f: null, v: null, is: null }; if(st) cell.a.s = st; row.cells.set(p.c, cell); }
  return cell;
};
Sheet.prototype.estiloPorDefecto = function(r, c){
  const row = this.rows.get(r); if(row && row.a.s && row.a.customFormat === '1') return row.a.s;
  const cols = /<cols>([\s\S]*?)<\/cols>/.exec(this.pre); if(!cols) return null;
  const re = /<col\b([^>]*)\/>/g; let m;
  while((m = re.exec(cols[1]))){ const a = parseAttrs(m[1]); if(c >= +a.min && c <= +a.max && a.style) return a.style; }
  return null;
};
Sheet.prototype.get = function(ref){ const c = this.cell(ref, false); if(!c) return null; if(c.is){ return xmlUnesc(c.is.replace(/<rPh[\s\S]*?<\/rPh>/g, '').replace(/<[^>]+>/g, '')); } if(c.v == null) return null; if(c.a.t === 's') return this.book.sharedString(+c.v); if(c.a.t === 'str' || c.a.t === 'inlineStr') return xmlUnesc(c.v); if(c.a.t === 'b') return c.v === '1'; if(c.a.t === 'e') return c.v; return +c.v; };
Sheet.prototype.formula = function(ref){ const c = this.cell(ref, false); return c && c.f ? c.f.t : null; };
Sheet.prototype._setV = function(cell, val){
  delete cell.a.t; cell.v = null; cell.is = null;
  if(val === null || val === undefined || val === ''){ return; }
  if(typeof val === 'number'){ if(!isFinite(val)) throw new Error('Número inválido'); cell.v = String(+val.toPrecision(15)); return; }
  if(typeof val === 'boolean'){ cell.a.t = 'b'; cell.v = val ? '1' : '0'; return; }
  cell.a.t = 'inlineStr';
  cell.is = '<is><t xml:space="preserve">' + xmlEsc(val) + '</t></is>';
};
Sheet.prototype.setValue = function(ref, val){ const cell = this.cell(ref, true); cell.f = null; this._setV(cell, val); this.dirty = true; return this; };
Sheet.prototype.setFormula = function(ref, f, cached){
  const cell = this.cell(ref, true); cell.f = { a: {}, t: f.replace(/^=/, '') }; delete cell.a.t; cell.v = null; cell.is = null;
  if(cached !== undefined && cached !== null && cached !== ''){
    if(typeof cached === 'number') cell.v = String(+cached.toPrecision(15));
    else if(typeof cached === 'boolean'){ cell.a.t = 'b'; cell.v = cached ? '1' : '0'; }
    else if(/^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!)$/.test(cached)){ cell.a.t = 'e'; cell.v = cached; }
    else { cell.a.t = 'str'; cell.v = xmlEsc(cached); }
  } else if(cached === ''){ cell.a.t = 'str'; cell.v = ''; }
  this.dirty = true; return this;
};
Sheet.prototype.clearCell = function(ref){ const cell = this.cell(ref, false); if(cell){ cell.f = null; this._setV(cell, null); this.dirty = true; } return this; };
Sheet.prototype.clearRange = function(range){
  const pr = range.split(':'); const a = splitRef(pr[0]), b = splitRef(pr[1] || pr[0]);
  for(let r = a.r; r <= b.r; r++){ const row = this.rows.get(r); if(!row) continue; row.cells.forEach(function(cell, c){ if(c >= a.c && c <= b.c){ cell.f = null; delete cell.a.t; cell.v = null; cell.is = null; } }); }
  this.dirty = true; return this;
};
Sheet.prototype.rowAttr = function(r, k, v){ const row = this.rows.get(r) || (this.rows.set(r, { a: { r: String(r) }, cells: new Map() }), this.rows.get(r)); if(v === undefined) return row.a[k]; if(v === null) delete row.a[k]; else row.a[k] = String(v); this.dirty = true; };
Sheet.prototype.maxRow = function(){ let m = 0; this.rows.forEach(function(_, r){ if(r > m) m = r; }); return m; };
Sheet.prototype.serialize = function(){
  const rs = Array.from(this.rows.keys()).sort(function(a, b){ return a - b; });
  let maxC = 1, minR = rs.length ? rs[0] : 1, maxR = rs.length ? rs[rs.length - 1] : 1;
  const out = [];
  const self = this;
  rs.forEach(function(r){
    const row = self.rows.get(r); row.a.r = String(r); delete row.a.spans;
    const cs = Array.from(row.cells.keys()).sort(function(a, b){ return a - b; });
    let body = '';
    cs.forEach(function(c){
      const cell = row.cells.get(c); cell.a.r = colStr(c) + r; if(c > maxC) maxC = c;
      let inner = '';
      if(cell.f) inner += '<f' + attrStr(cell.f.a) + '>' + xmlEsc(cell.f.t) + '</f>';
      if(cell.is && !cell.f) inner += cell.is;
      else if(cell.v != null) inner += '<v>' + cell.v + '</v>';
      body += '<c' + attrStr(cell.a, ['r', 's', 't']) + (inner ? '>' + inner + '</c>' : '/>');
    });
    out.push('<row' + attrStr(row.a, ['r']) + (body ? '>' + body + '</row>' : '/>'));
  });
  let pre = this.pre.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:' + colStr(maxC) + maxR + '"/>');
  return pre + '<sheetData>' + out.join('') + '</sheetData>' + this.post;
};

/* ---------- libro ---------- */
function Book(zip){ this.zip = zip; this.sheets = {}; this.mod = {}; this.sst = null; }
Book.load = async function(bytes){
  const zip = await JSZipRef.loadAsync(bytes);
  const b = new Book(zip);
  b.wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relMap = {}; rels.replace(/<Relationship\b([^>]*)\/>/g, function(_, a){ const o = parseAttrs(a); relMap[o.Id] = o.Target; });
  b.sheetList = [];
  b.wb.replace(/<sheet\b([^>]*)\/>/g, function(_, a){ const o = parseAttrs(a); const t = relMap[o['r:id']]; b.sheetList.push({ name: xmlUnesc(o.name), path: 'xl/' + t.replace(/^\/?xl\//, ''), state: o.state || 'visible' }); });
  b.ct = await zip.file('[Content_Types].xml').async('string');
  return b;
};
Book.prototype.text = async function(path){ if(this.mod[path] != null) return this.mod[path]; const f = this.zip.file(path); return f ? await f.async('string') : null; };
Book.prototype.put = function(path, content){ this.mod[path] = content; };
Book.prototype.sheetInfo = function(name){ const s = this.sheetList.filter(function(x){ return x.name === name; })[0]; if(!s) throw new Error('No existe la hoja "' + name + '"'); return s; };
Book.prototype.sheet = async function(name){
  if(this.sheets[name]) return this.sheets[name];
  const info = this.sheetInfo(name);
  const sh = new Sheet(this, name, info.path, await this.text(info.path));
  this.sheets[name] = sh; return sh;
};
Book.prototype.loadSST = async function(){
  if(this.sst) return; const x = await this.text('xl/sharedStrings.xml'); this.sst = [];
  if(!x) return; const re = /<si>([\s\S]*?)<\/si>/g; let m;
  while((m = re.exec(x))) this.sst.push(xmlUnesc(m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, '').replace(/<[^>]+>/g, '')));
};
Book.prototype.sharedString = function(i){ return this.sst ? this.sst[i] : null; };
Book.prototype.relsPath = function(path){ const i = path.lastIndexOf('/'); return path.slice(0, i) + '/_rels/' + path.slice(i + 1) + '.rels'; };
Book.prototype.rels = async function(path){ const x = await this.text(this.relsPath(path)); const o = {}; if(x) x.replace(/<Relationship\b([^>]*)\/>/g, function(_, a){ const r = parseAttrs(a); o[r.Id] = r; }); return o; };
Book.prototype.resolve = function(base, target){ if(target[0] === '/') return target.slice(1); const parts = base.split('/'); parts.pop(); target.split('/').forEach(function(p){ if(p === '..') parts.pop(); else if(p !== '.') parts.push(p); }); return parts.join('/'); };

/* nombres definidos: aplica fn al contenido de cada definedName que mencione la hoja */
Book.prototype.mapDefinedNames = function(sheetName, fn){
  const q1 = "'" + sheetName.replace(/'/g, "''") + "'!", q2 = sheetName + '!';
  this.wb = this.wb.replace(/(<definedName\b[^>]*>)([\s\S]*?)(<\/definedName>)/g, function(all, a, body, c){
    const txt = xmlUnesc(body);
    if(txt.indexOf(q1) < 0 && txt.indexOf(q2) < 0) return all;
    return a + xmlEsc(fn(txt)) + c;
  });
};
Book.prototype.definedName = function(name, localSheetName){
  const idx = localSheetName != null ? this.sheetList.findIndex(function(s){ return s.name === localSheetName; }) : -1;
  const re = new RegExp('<definedName name="' + name.replace(/\./g, '\\.') + '"([^>]*)>([\\s\\S]*?)</definedName>', 'g'); let m;
  while((m = re.exec(this.wb))){ const a = parseAttrs(m[1]); if((idx < 0 && a.localSheetId == null) || (idx >= 0 && +a.localSheetId === idx)) return xmlUnesc(m[2]); }
  return null;
};
Book.prototype.setDefinedName = function(name, localSheetName, value){
  const idx = this.sheetList.findIndex(function(s){ return s.name === localSheetName; });
  const re = new RegExp('(<definedName name="' + name.replace(/\./g, '\\.') + '"[^>]*localSheetId="' + idx + '"[^>]*>)([\\s\\S]*?)(</definedName>)');
  if(re.test(this.wb)) this.wb = this.wb.replace(re, function(_, a, b, c){ return a + xmlEsc(value) + c; });
  else this.wb = this.wb.replace('</definedNames>', '<definedName name="' + name + '" localSheetId="' + idx + '">' + xmlEsc(value) + '</definedName></definedNames>');
};

/* ---------- inserción de filas ---------- */
Book.prototype.insertRows = async function(sheetName, at, n, modelRow){
  if(n <= 0) return;
  const sh = await this.sheet(sheetName);
  const modelos = Array.isArray(modelRow) ? modelRow : [modelRow || at - 1];
  modelRow = modelos[0];
  /* 1. desplazar filas >= at y fórmulas de la propia hoja */
  const nuevas = new Map();
  sh.rows.forEach(function(row, r){
    row.cells.forEach(function(cell){ if(cell.f) cell.f.t = shiftFormula(cell.f.t, sheetName, sheetName, at, n); });
    nuevas.set(r >= at ? r + n : r, row);
  });
  /* 2. filas nuevas, copia de las filas modelo (en ciclo; ya desplazadas si correspondía) */
  const viejas = sh.rows; const modelData = modelos.map(function(m){ return viejas.get(m); });
  for(let k = 0; k < n; k++){
    const r = at + k; const mi = k % modelos.length; const model = modelData[mi]; const modelNew = modelos[mi] >= at ? modelos[mi] + n : modelos[mi];
    const a = Object.assign({}, model ? model.a : {}); a.r = String(r); delete a.spans; delete a.hidden;
    const cells = new Map();
    if(model) model.cells.forEach(function(cell, c){
      const nc = { a: Object.assign({}, cell.a), f: null, v: null, is: null }; delete nc.a.t; nc.a.r = colStr(c) + r;
      if(cell.f) nc.f = { a: {}, t: translateFormula(cell.f.t, r - modelNew, 0) };
      cells.set(c, nc);
    });
    nuevas.set(r, { a: a, cells: cells });
  }
  sh.rows = nuevas; sh.dirty = true;
  /* 3. combinaciones, validaciones, formatos condicionales, saltos, hipervínculos, autofiltro */
  let post = sh.post, pre = sh.pre;
  const modelMerges = modelos.map(function(){ return []; });
  post = post.replace(/<mergeCell ref="([^"]+)"\/>/g, function(_, ref){
    const p = ref.split(':'); const a = splitRef(p[0]), b = splitRef(p[1]);
    modelos.forEach(function(m, i){ if(a.r === m && b.r === m) modelMerges[i].push([a.c, b.c]); });
    return '<mergeCell ref="' + shiftRangeStr(ref, at, n) + '"/>';
  });
  if(modelMerges.some(function(x){ return x.length; })){
    let add = '';
    for(let k = 0; k < n; k++) modelMerges[k % modelos.length].forEach(function(mm){ add += '<mergeCell ref="' + colStr(mm[0]) + (at + k) + ':' + colStr(mm[1]) + (at + k) + '"/>'; });
    post = post.replace('</mergeCells>', add + '</mergeCells>');
    post = post.replace(/<mergeCells count="\d+"/, function(){ return '<mergeCells count="' + (post.match(/<mergeCell ref=/g) || []).length + '"'; });
  }
  post = post.replace(/(sqref=")([^"]+)(")/g, function(_, a, b, c){ return a + shiftSqref(b, at, n) + c; });
  post = post.replace(/(<xm:sqref>)([^<]+)(<\/xm:sqref>)/g, function(_, a, b, c){ return a + shiftSqref(b, at, n) + c; });
  post = post.replace(/(<formula1?>|<formula2>|<xm:f>)([\s\S]*?)(<\/formula1?>|<\/formula2>|<\/xm:f>)/g, function(_, a, b, c){ return a + xmlEsc(shiftFormula(xmlUnesc(b), sheetName, sheetName, at, n)) + c; });
  post = post.replace(/<brk id="(\d+)"/g, function(_, id){ return '<brk id="' + shiftRowNum(+id, at + 0, n) + '"'; });
  post = post.replace(/(<hyperlink\b[^>]*ref=")([^"]+)(")/g, function(_, a, b, c){ return a + shiftRangeStr(b, at, n) + c; });
  post = post.replace(/(<autoFilter\b[^>]*ref=")([^"]+)(")/g, function(_, a, b, c){ return a + shiftRangeStr(b, at, n) + c; });
  /* controles de formulario (anclas en la hoja, filas base 0) */
  post = post.replace(/(<xdr:row>)(\d+)(<\/xdr:row>)/g, function(_, a, r, c){ return a + (+r >= at - 1 ? +r + n : +r) + c; });
  pre = pre.replace(/(<selection\b[^>]*)(activeCell="[^"]*")?([^>]*sqref="[^"]*")?/g, function(m){ return m; });
  sh.pre = pre; sh.post = post;
  /* 4. fórmulas de las demás hojas que apunten a esta hoja */
  for(const info of this.sheetList){
    if(info.name === sheetName) continue;
    const loaded = this.sheets[info.name];
    if(loaded){ loaded.rows.forEach(function(row){ row.cells.forEach(function(cell){ if(cell.f){ const t = shiftFormula(cell.f.t, info.name, sheetName, at, n); if(t !== cell.f.t){ cell.f.t = t; loaded.dirty = true; } } }); }); continue; }
    const x = await this.text(info.path);
    const q = [sheetName + '!', xmlEsc("'" + sheetName.replace(/'/g, "''") + "'!"), "'" + sheetName.replace(/'/g, "''") + "'!"];
    if(!q.some(function(t){ return x.indexOf(t) >= 0; })) continue;
    const other = await this.sheet(info.name);
    other.rows.forEach(function(row){ row.cells.forEach(function(cell){ if(cell.f){ const t = shiftFormula(cell.f.t, info.name, sheetName, at, n); if(t !== cell.f.t){ cell.f.t = t; other.dirty = true; } } }); });
  }
  /* 5. nombres definidos (áreas de impresión, filtros, etc.) */
  this.mapDefinedNames(sheetName, function(t){ return shiftFormula(t, null, sheetName, at, n); });
  /* 6. dibujos (imágenes) y VML (controles) asociados a la hoja */
  const rels = await this.rels(sh.path);
  for(const id in rels){
    const r = rels[id]; const p = this.resolve(sh.path, r.Target);
    if(/\/drawing$/.test(r.Type)){
      const d = await this.text(p);
      this.put(p, d.replace(/(<xdr:row>)(\d+)(<\/xdr:row>)/g, function(_, a, rr, c){ return a + (+rr >= at - 1 ? +rr + n : +rr) + c; }));
    } else if(/\/vmlDrawing$/.test(r.Type)){
      const v = await this.text(p);
      this.put(p, v.replace(/(<x:Anchor>\s*)([^<]+)(<\/x:Anchor>)/g, function(_, a, b, c){
        const q = b.split(',').map(function(s){ return s.trim(); });
        if(+q[2] >= at - 1) q[2] = String(+q[2] + n);
        if(+q[6] >= at - 1) q[6] = String(+q[6] + n);
        return a + q.join(', ') + c;
      }).replace(/(<x:Row>)(\d+)(<\/x:Row>)/g, function(_, a, rr, c){ return a + (+rr >= at - 1 ? +rr + n : +rr) + c; }));
    } else if(/\/table$/.test(r.Type)){
      const t = await this.text(p);
      this.put(p, t.replace(/(<(?:table|autoFilter)\b[^>]*\bref=")([^"]+)(")/g, function(_, a, b, c){ return a + shiftRangeStr(b, at, n) + c; }));
    }
  }
};

/* ---------- casillas de verificación (control de formulario) ---------- */
Book.prototype.setCheckbox = async function(sheetName, shapeId, checked){
  const sh = await this.sheet(sheetName);
  const m = new RegExp('<control shapeId="' + shapeId + '" r:id="(rId\\d+)"').exec(sh.post);
  if(!m) throw new Error('Control ' + shapeId + ' no encontrado');
  const rels = await this.rels(sh.path);
  const cp = this.resolve(sh.path, rels[m[1]].Target);
  let x = await this.text(cp);
  x = x.replace(/\s+checked="[^"]*"/, '');
  if(checked) x = x.replace('objectType="CheckBox"', 'objectType="CheckBox" checked="Checked"');
  this.put(cp, x);
  for(const id in rels){
    if(!/\/vmlDrawing$/.test(rels[id].Type)) continue;
    const vp = this.resolve(sh.path, rels[id].Target);
    let v = await this.text(vp);
    const re = new RegExp('(<v:shape id="[^"]*"[^>]*o:spid="_x0000_s' + shapeId + '"[\\s\\S]*?</v:shape>|<v:shape id="_x0000_s' + shapeId + '"[\\s\\S]*?</v:shape>)');
    v = v.replace(re, function(s){
      s = s.replace(/\s*<x:Checked>[^<]*<\/x:Checked>/, '');
      if(checked) s = s.replace(/(<x:ClientData ObjectType="Checkbox">)/, '$1\n     <x:Checked>1</x:Checked>');
      return s;
    });
    this.put(vp, v);
  }
};

/* ---------- imágenes de un dibujo ---------- */
Book.prototype.drawingOf = async function(sheetName){
  const sh = await this.sheet(sheetName); const rels = await this.rels(sh.path);
  for(const id in rels) if(/\/drawing$/.test(rels[id].Type)) return this.resolve(sh.path, rels[id].Target);
  return null;
};
Book.prototype.listPictures = async function(drawingPath){
  const d = await this.text(drawingPath); const rels = await this.rels(drawingPath); const out = [];
  const re = /<xdr:twoCellAnchor\b[^>]*>[\s\S]*?<\/xdr:twoCellAnchor>/g; let m;
  while((m = re.exec(d))){
    const a = m[0]; const emb = /r:embed="([^"]+)"/.exec(a); if(!emb) continue;
    const g = function(tag){ const x = new RegExp('<xdr:' + tag + '><xdr:col>(\\d+)</xdr:col><xdr:colOff>(-?\\d+)</xdr:colOff><xdr:row>(\\d+)</xdr:row><xdr:rowOff>(-?\\d+)</xdr:rowOff></xdr:' + tag + '>').exec(a); return x ? { col: +x[1], colOff: +x[2], row: +x[3], rowOff: +x[4] } : null; };
    out.push({ xml: a, rid: emb[1], target: rels[emb[1]] && rels[emb[1]].Target, from: g('from'), to: g('to'), name: (/<xdr:cNvPr [^>]*name="([^"]*)"/.exec(a) || [])[1] });
  }
  return out;
};
/* Reescribe las fotos de un dibujo. fotos: [{from, to, bytes, ext, nombre, descr}]. conservar: anclas a mantener (logos). */
Book.prototype.setPictures = async function(drawingPath, conservar, fotos){
  let d = await this.text(drawingPath);
  const relsPath = this.relsPath(drawingPath);
  let rx = await this.text(relsPath);
  const keepRids = {}; conservar.forEach(function(p){ keepRids[p.rid] = true; });
  /* quitar anclas de fotos antiguas y sus relaciones (y medios no usados) */
  const old = await this.listPictures(drawingPath);
  const self = this;
  const quitar = old.filter(function(p){ return !keepRids[p.rid]; });
  quitar.forEach(function(p){ d = d.replace(p.xml, ''); });
  const usados = {}; old.filter(function(p){ return keepRids[p.rid]; }).forEach(function(p){ usados[p.rid] = true; });
  const relsObj = await this.rels(drawingPath);
  for(const rid in relsObj){
    if(/\/image$/.test(relsObj[rid].Type) && !usados[rid]){
      rx = rx.replace(new RegExp('<Relationship\\b[^>]*Id="' + rid + '"[^>]*/>'), '');
      const mp = this.resolve(drawingPath, relsObj[rid].Target);
      if(!(await this.mediaUsadoFuera(mp, drawingPath))) this.borrar(mp);
    }
  }
  /* agregar fotos nuevas */
  let maxId = 1; d.replace(/<xdr:cNvPr id="(\d+)"/g, function(_, i){ if(+i > maxId) maxId = +i; });
  let ridN = 1; rx.replace(/Id="rId(\d+)"/g, function(_, i){ if(+i >= ridN) ridN = +i + 1; });
  let add = '';
  for(let k = 0; k < fotos.length; k++){
    const f = fotos[k]; const rid = 'rId' + (ridN++); const id = ++maxId;
    const media = 'xl/media/i57_foto_' + (k + 1) + '_' + Date.now().toString(36) + '.' + f.ext;
    this.zip.file(media, f.bytes);
    rx = rx.replace('</Relationships>', '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/' + media.split('/').pop() + '"/></Relationships>');
    const cx = f.cx || 0, cy = f.cy || 0;
    add += '<xdr:twoCellAnchor editAs="oneCell">' +
      '<xdr:from><xdr:col>' + f.from.col + '</xdr:col><xdr:colOff>' + (f.from.colOff || 0) + '</xdr:colOff><xdr:row>' + f.from.row + '</xdr:row><xdr:rowOff>' + (f.from.rowOff || 0) + '</xdr:rowOff></xdr:from>' +
      '<xdr:to><xdr:col>' + f.to.col + '</xdr:col><xdr:colOff>' + (f.to.colOff || 0) + '</xdr:colOff><xdr:row>' + f.to.row + '</xdr:row><xdr:rowOff>' + (f.to.rowOff || 0) + '</xdr:rowOff></xdr:to>' +
      '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + id + '" name="Foto ' + (k + 1) + '" descr="' + xmlEsc(f.descr || '') + '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
      '<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
      '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>';
  }
  d = d.replace('</xdr:wsDr>', add + '</xdr:wsDr>');
  this.put(drawingPath, d); this.put(relsPath, rx);
};
Book.prototype.mediaUsadoFuera = async function(mediaPath, exceptDrawing){
  const files = Object.keys(this.zip.files).filter(function(f){ return /^xl\/drawings\/_rels\/.*\.rels$/.test(f); });
  for(const f of files){
    const owner = f.replace('_rels/', '').replace(/\.rels$/, '');
    if(owner === exceptDrawing) continue;
    const x = await this.text(f); const self = this; let usado = false;
    x.replace(/Target="([^"]+)"/g, function(_, t){ if(self.resolve(owner, t) === mediaPath) usado = true; });
    if(usado) return true;
  }
  return false;
};
Book.prototype.borrar = function(path){ this.zip.remove(path); delete this.mod[path]; this.ct = this.ct.replace(new RegExp('<Override PartName="/' + path.replace(/\./g, '\\.') + '"[^>]*/>'), ''); };

/* ---------- guardado ---------- */
Book.prototype.save = async function(opts){
  opts = opts || {};
  const self = this;
  Object.keys(this.sheets).forEach(function(n){ const s = self.sheets[n]; if(s.dirty) self.put(s.path, s.serialize()); });
  /* cadena de cálculo: se elimina para que Excel la reconstruya; recálculo completo al abrir */
  if(this.zip.file('xl/calcChain.xml')){
    this.zip.remove('xl/calcChain.xml');
    this.ct = this.ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, '');
    let r = await this.text('xl/_rels/workbook.xml.rels'); r = r.replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/, ''); this.put('xl/_rels/workbook.xml.rels', r);
  }
  this.wb = this.wb.replace(/<calcPr\b([^>]*?)\/>/, function(_, a){ const o = parseAttrs(a); o.fullCalcOnLoad = '1'; return '<calcPr' + attrStr(o) + '/>'; });
  this.put('xl/workbook.xml', this.wb);
  this.put('[Content_Types].xml', this.ct);
  Object.keys(this.mod).forEach(function(p){ self.zip.file(p, self.mod[p]); });
  /* [Content_Types].xml primero, como en los archivos de Office */
  const out = new JSZipRef();
  const names = Object.keys(this.zip.files).filter(function(n){ return !self.zip.files[n].dir; });
  names.sort(function(a, b){ return (a === '[Content_Types].xml' ? -1 : 0) - (b === '[Content_Types].xml' ? -1 : 0); });
  for(const n of names) out.file(n, await this.zip.file(n).async('uint8array'));
  return out.generateAsync({ type: opts.type || 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const api = { Book: Book, Sheet: Sheet, colNum: colNum, colStr: colStr, splitRef: splitRef, translateFormula: translateFormula, shiftFormula: shiftFormula, mapRefs: mapRefs, dateSerial: dateSerial, timeFrac: timeFrac, xmlEsc: xmlEsc, xmlUnesc: xmlUnesc, quoteSheet: quoteSheet };
if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.X57 = api;
})(typeof window !== 'undefined' ? window : this);

/* ---------- utilidades adicionales (plantilla maestra) ---------- */
(function(){
const X = (typeof module !== 'undefined' && module.exports) ? module.exports : this.X57;
const P = X.Sheet.prototype, B = X.Book.prototype;
/* borra solo los valores (no las fórmulas) de un rango */
P.clearValues = function(range){
  const pr = range.split(':'); const a = X.splitRef(pr[0]), b = X.splitRef(pr[1] || pr[0]);
  const self = this;
  for(let r = a.r; r <= b.r; r++){ const row = this.rows.get(r); if(!row) continue; row.cells.forEach(function(cell, c){ if(c >= a.c && c <= b.c && !cell.f){ delete cell.a.t; cell.v = null; cell.is = null; self.dirty = true; } }); }
  return this;
};
/* quita los valores en caché de todas las fórmulas (se recalculan al abrir) */
P.dropCached = function(){ const self = this; this.rows.forEach(function(row){ row.cells.forEach(function(cell){ if(cell.f && cell.v != null){ cell.v = null; delete cell.a.t; self.dirty = true; } }); }); };
P.deleteRowsFrom = function(r0){ const self = this; Array.from(this.rows.keys()).forEach(function(r){ if(r >= r0) self.rows.delete(r); }); this.dirty = true; };
P.eachCell = function(fn){ this.rows.forEach(function(row, r){ row.cells.forEach(function(cell, c){ fn(cell, r, c); }); }); };
/* recolecta las cadenas compartidas en uso y reconstruye sharedStrings.xml */
B.gcSharedStrings = async function(){
  const x = await this.text('xl/sharedStrings.xml'); if(!x) return;
  const sis = x.match(/<si>[\s\S]*?<\/si>|<si\/>/g) || [];
  for(const info of this.sheetList) await this.sheet(info.name);
  const map = {}; const nuevos = []; let total = 0;
  for(const n in this.sheets){ const sh = this.sheets[n]; sh.eachCell(function(cell){ if(cell.a.t === 's' && cell.v != null && !cell.f){ const i = +cell.v; if(!(i in map)){ map[i] = nuevos.length; nuevos.push(sis[i]); } cell.v = String(map[i]); total++; sh.dirty = true; } }); }
  const head = x.slice(0, x.indexOf('<sst')); const sstOpen = /<sst\b[^>]*>/.exec(x)[0].replace(/\s+count="\d+"/, '').replace(/\s+uniqueCount="\d+"/, '').replace('>', ' count="' + total + '" uniqueCount="' + nuevos.length + '">');
  this.put('xl/sharedStrings.xml', head + sstOpen + nuevos.join('') + '</sst>');
  this.sst = null; await this.loadSST();
};
B.removePart = function(path){ if(this.zip.file(path)) this.zip.remove(path); delete this.mod[path]; this.ct = this.ct.replace(new RegExp('<Override PartName="/' + path.replace(/[.\[\]]/g, '\\$&') + '"[^>]*/>'), ''); };
B.removeRels = async function(ownerPath, typeRe){
  const rp = this.relsPath(ownerPath); let r = await this.text(rp); if(!r) return [];
  const quitados = [];
  r = r.replace(/<Relationship\b[^>]*\/>/g, function(m){ const a = /Type="([^"]+)"/.exec(m)[1]; if(typeRe.test(a)){ quitados.push({ id: /Id="([^"]+)"/.exec(m)[1], target: /Target="([^"]+)"/.exec(m)[1] }); return ''; } return m; });
  this.put(rp, r); return quitados;
};
})();
