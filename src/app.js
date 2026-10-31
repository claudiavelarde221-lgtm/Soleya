'use strict';

/* ============ Datos ============ */
const KEY = 'soleya.v1';

// t = tipos (cada uno con su precio), v = tallas/medidas (cada una con su precio)
const DEFAULT_CATS = [
  { n: 'Cobijas', t: ['Salomón', 'Piel de conejo', 'Ovejera', 'Marmoleada ovejera', 'Solo fondo ovejera', 'Con diseño ovejera', 'Económica'], v: [] },
  { n: 'Peluches con cobija', t: [], v: [] },
  { n: 'Chaquetas', t: [], v: ['S', 'M', 'L', 'XL'], note: 'Unisex (dama y caballero)' },
  { n: 'Juego de sábana normal', t: [], v: ['1.20', '1.40'] },
  { n: 'Sábana con cortina', t: [], v: ['1.20', '1.40'] },
  { n: 'Conjuntos dama', t: [], v: ['M', 'L'] },
  { n: 'Ruanas', t: ['Sublimada en lana de alpaca (unisex)', 'Ruana con manga dama'], v: [] },
  { n: 'Saco tejido dama', t: ['Conjunto', 'Sueter',], v: [] },
  { n: 'Pantalón dama', t: [], v: [] },
  { n: 'Blusas económicas', t: [], v: [] },
  { n: 'Edredones', t: [], v: [] },
];

const DEFAULT_REQUEST =
  `Hola {nombre} 😊 ¡Gracias por tu pedido en Soleya! Para realizar tu envío necesito por favor estos datos:

👤 Nombre completo:
🪪 Número de cédula:
📍 Dirección:
🏙️ Departamento:
🌆 Ciudad:
🏘️ Barrio:
📱 Número de celular:

Quedo pendiente, ¡gracias! ☀️`;

const THANKS = [
  'Muchas gracias por tu compra. La elegiste con el corazón y la empacamos con muchísimo cariño. Esperamos que te acompañe en muchos momentos bonitos y que cada abrazo sea más cálido con ella.',
  'Gracias por confiar en Soleya. Detrás de cada pedido hay una historia, y es un honor ser parte de la tuya. Que lo disfrutes tanto como nosotros disfrutamos prepararlo para ti.',
  'Tu compra nos alegra el día. Deseamos que este detalle te llene de calidez, comodidad y sonrisas. ¡Que el sol brille siempre en tu hogar!',
];

const DEFAULTS = {
  products: [],
  sales: [],
  cats: null,
  settings: { business: 'Soleya Store', phone: '+57 324 544 8043', city: 'Popayán, Cauca', tiktok: 'soleya_store', instagram: '@soleyaoficial', tagline: 'Tu tienda, siempre en orden', lowStock: 2, requestMsg: DEFAULT_REQUEST },
};

let db = load();
if (!db.cats) db.cats = JSON.parse(JSON.stringify(DEFAULT_CATS));
db.products.forEach(p => delete p.photo);   // la app ya no usa fotos
let state = { tab: 'home', invCat: '', invQ: '', invOpen: false, salesFilter: 'all' };
let cart = null;   // venta en construcción
let ship = null;   // borrador de datos de envío

function load() {
  let txt = null;
  try {
    txt = localStorage.getItem(KEY);
    const raw = JSON.parse(txt);
    if (raw) return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings || {}) } };
  } catch (e) {
    // Datos dañados: se guardan aparte para no perderlos al sobrescribir
    if (txt) try { localStorage.setItem(KEY + '.dañado', txt); } catch (e2) { /* sin espacio */ }
  }
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('⚠️ No se pudo guardar. Revisa el espacio del teléfono.'); }
}

/* ============ Utilidades ============ */
const $ = (s, el = document) => el.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(n || 0).toLocaleString('es-CO');
// Pesos colombianos: el punto separa miles (85.000 = 85000), nunca decimales
const num = v => { const d = String(v ?? '').replace(/\D/g, ''); return d ? parseInt(d, 10) : 0; };
const fmtNum = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = s => new Date(s + 'T00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const firstName = s => String(s || '').trim().split(/\s+/)[0] || '';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

function lastSaturday() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return ymd(d); }
function nextSaturday() { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return ymd(d); }

function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '57' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

const prodLabel = p => (p.name || p.cat) + (p.variant ? ' · ' + p.variant : '');
const prodById = id => db.products.find(p => p.id === id);
const saleTotal = s => s.items.reduce((a, i) => a + i.qty * i.price, 0);
const salePaid = s => s.payments.reduce((a, p) => a + p.amount, 0);
const saleDebt = s => Math.max(0, saleTotal(s) - salePaid(s));
const itemsText = s => s.items.map(i => `${i.qty} ${i.name}`).join(', ');

/* ============ Hoja (ventana emergente) ============ */
function sheet(html) {
  $('#sheet').innerHTML = html;
  $('#sheetWrap').hidden = false;
}
function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; cart = null; ship = null; render(); }
const sheetHead = t => `<button class="x" data-act="close">×</button><h3>${esc(t)}</h3>`;

/* ============ Pantallas ============ */
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  const titles = { home: db.settings.business.toUpperCase(), inv: 'Inventario', sales: 'Ventas', debt: 'Cobros', set: 'Ajustes' };
  $('#title').textContent = titles[state.tab];
  $('.top').classList.toggle('hero', state.tab === 'home');
  $('#tag').textContent = db.settings.tagline;
  const main = $('#main');
  main.innerHTML = { home: viewHome, inv: viewInv, sales: viewSales, debt: viewDebt, set: viewSet }[state.tab]();
  if (state.tab === 'inv') paintInv();
}

/* ----- Inicio ----- */
function viewHome() {
  const month = ymd().slice(0, 7);
  const monthSales = db.sales.filter(s => s.date.startsWith(month));
  const sold = monthSales.reduce((a, s) => a + saleTotal(s), 0);
  const collected = db.sales.flatMap(s => s.payments).filter(p => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0);
  const owed = db.sales.reduce((a, s) => a + saleDebt(s), 0);
  const low = db.products.filter(p => p.stock <= db.settings.lowStock).sort((a, b) => a.stock - b.stock);
  const units = db.products.reduce((a, p) => a + p.stock, 0);

  return `
    <div class="grid2">
      <div class="stat gold"><small>Me deben en total</small><b>${money(owed)}</b></div>
      <div class="stat blue"><small>Vendido este mes</small><b>${money(sold)}</b></div>
      <div class="stat blue"><small>Cobrado este mes</small><b>${money(collected)}</b></div>
      <div class="stat"><small>Unidades en stock</small><b>${units}</b></div>
    </div>
    <button class="btn" data-act="newSale">＋ Nueva venta / pedido</button>

    <h2>Stock bajo</h2>
    ${low.length ? `<div class="cards">${low.map(p => `
      <div class="row click" data-act="editProd" data-id="${p.id}">
        <div class="grow"><b>${esc(prodLabel(p))}</b><small>${esc(p.cat)}</small></div>
        <span class="badge ${p.stock <= 0 ? 'debt' : 'warn'}">${p.stock <= 0 ? 'Agotado' : 'Quedan ' + p.stock}</span>
      </div>`).join('')}</div>` : '<div class="empty">Todo con buen stock</div>'}`;
}

/* ----- Inventario: categorías a la izquierda, detalle a la derecha ----- */
const catTotal = c => db.products.filter(p => p.cat === c).reduce((a, p) => a + p.stock, 0);
const stockClass = n => (n <= 0 ? 'zero' : n <= db.settings.lowStock ? 'low' : '');
// Nombre dentro de su categoría: tipo y/o talla (sin repetir la categoría)
const subLabel = p => [p.name, p.variant].filter(Boolean).join(' · ') || p.cat;

function viewInv() {
  if (!db.cats.some(c => c.n === state.invCat)) {
    state.invCat = (db.cats.find(c => db.products.some(p => p.cat === c.n)) || db.cats[0] || {}).n;
  }
  return `
    <div class="invbar">
      <input id="invQ" placeholder="🔍 Buscar producto…" value="${esc(state.invQ)}">
      <button class="btn small fit" data-act="addProd">＋ Producto</button>
    </div>
    <div class="invwrap" id="invWrap">
      <div class="invlist" id="invCats"></div>
      <div class="invpanel" id="invPanel"></div>
    </div>`;
}

function subRow(p, showCat) {
  const li = p.lastIn ? `<span class="lastin">Último ingreso: +${p.lastIn.qty} · ${fmtDate(p.lastIn.date)}</span>` : '';
  return `
    <div class="srow">
      <div class="grow click" data-act="editProd" data-id="${p.id}">
        <b>${esc(showCat ? prodLabel(p) : subLabel(p))}</b>
        <small>${showCat ? esc(p.cat) + ' · ' : ''}${money(p.price)}</small>${li}
      </div>
      <div class="stepper">
        <button data-act="stockDown" data-id="${p.id}">−</button>
        <span class="n ${stockClass(p.stock)}">${p.stock}</span>
        <button data-act="stockUp" data-id="${p.id}">+</button>
      </div>
      <button class="btn small" data-act="addStock" data-id="${p.id}">Agregar</button>
    </div>`;
}

function paintInv() {
  const q = norm(state.invQ);
  $('#invWrap').classList.toggle('open', !!state.invOpen || !!q);

  $('#invCats').innerHTML = db.cats.map(c => `
    <button class="li ${!q && c.n === state.invCat ? 'sel' : ''}" data-act="invSel" data-n="${esc(c.n)}">
      <span>${esc(c.n)}</span><span class="n ${catTotal(c.n) <= 0 ? 'zero' : ''}">${catTotal(c.n)}</span>
    </button>`).join('');

  const panel = $('#invPanel');
  if (q) {   // búsqueda: resultados de todas las categorías
    const res = db.products.filter(p => norm(prodLabel(p) + ' ' + p.cat).includes(q));
    panel.innerHTML = `<h3 class="ptitle">Resultados</h3>${res.length ? res.map(p => subRow(p, true)).join('') : '<div class="empty">Sin resultados</div>'}`;
    return;
  }
  const c = db.cats.find(x => x.n === state.invCat);
  if (!c) { panel.innerHTML = '<div class="empty">Aún no tienes categorías.</div>'; return; }
  const order = p => (p.name && c.t.indexOf(p.name) >= 0 ? c.t.indexOf(p.name) : 0) * 100 + (c.v.indexOf(p.variant) >= 0 ? c.v.indexOf(p.variant) : 0);
  const prods = db.products.filter(p => p.cat === c.n).sort((a, b) => order(a) - order(b) || subLabel(a).localeCompare(subLabel(b)));
  const what = c.t.length ? 'tipo' : c.v.length ? 'talla o medida' : 'modelo';
  panel.innerHTML = `
    <div class="phead">
      <button class="back" data-act="invBack" aria-label="Volver">←</button>
      <h3 class="ptitle">${esc(c.n)}</h3>
      <span class="n ${catTotal(c.n) <= 0 ? 'zero' : ''}">${catTotal(c.n)}</span>
    </div>
    <div class="muted psub">${esc([c.t.length ? 'Tipos' : c.v.length ? 'Tallas / medidas' : '', c.note].filter(Boolean).join(' · '))}${prods.length ? '' : ''}</div>
    ${prods.length ? prods.map(p => subRow(p, false)).join('') : `<div class="empty">Aún no hay productos en ${esc(c.n)}.</div>`}
    <div class="btns">
      <button class="btn sec" data-act="newSub" data-n="${esc(c.n)}">＋ Nuevo ${what}</button>
      <button class="btn sec" data-act="addProd">Cargar varios a la vez</button>
    </div>`;
}

function openSubSheet(catName) {
  const c = db.cats.find(x => x.n === catName);
  const what = c.t.length ? 'tipo' : c.v.length ? 'talla o medida' : 'modelo';
  sheet(`
    ${sheetHead('Nuevo ' + what)}
    <div class="muted">En ${esc(c.n)}</div>
    <label>Nombre del ${what}</label>
    <input id="sName" placeholder="${c.v.length && !c.t.length ? 'Ej: XXL' : 'Ej: Marmoleada'}">
    <label>Precio de venta</label>
    <input id="sPrice" inputmode="numeric" data-money placeholder="$ precio">
    <label>Cantidad que ingresa</label>
    <input id="sStock" inputmode="numeric" placeholder="0">
    <button class="btn" data-act="saveSub" data-n="${esc(c.n)}">Guardar</button>`);
}

function openProdSheet(id, presetCat) {
  const p = id ? prodById(id) : null;
  const catName = p ? p.cat : presetCat || db.cats[0].n;
  sheet(`
    ${sheetHead(p ? 'Editar producto' : 'Nuevo producto')}
    <label>Categoría</label>
    <select id="pCat" data-change="prodCat" data-edit="${p ? p.id : ''}">
      ${db.cats.map(c => `<option ${c.n === catName ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}
      <option value="__new">＋ Nueva categoría…</option>
    </select>
    <div id="catNote" class="muted"></div>
    <div id="pStockArea"></div>
    <button class="btn" data-act="saveProd" data-id="${p ? p.id : ''}">Guardar</button>
    ${p ? `<button class="btn danger" data-act="delProd" data-id="${p.id}">Eliminar producto</button>` : ''}`);
  paintProdStock(p);
}
function paintProdStock(p) {
  const cat = db.cats.find(c => c.n === $('#pCat').value);
  $('#catNote').textContent = cat.note || '';
  if (p) {
    $('#pStockArea').innerHTML = `
      <label>Nombre / tipo</label>
      <input id="pName" list="typeList" value="${esc(p.name)}">
      <datalist id="typeList">${cat.t.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      <label>Talla / medida (si aplica)</label>
      <input id="pVar" list="varList" value="${esc(p.variant)}">
      <datalist id="varList">${cat.v.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      <label>Precio de venta</label>
      <input id="pPrice" inputmode="numeric" data-money value="${fmtNum(p.price)}">
      <label>Cantidad en stock</label>
      <input id="pStock" inputmode="numeric" value="${p.stock}">`;
    return;
  }
  // Una fila por tipo o talla, cada una con su precio y cantidad
  const rows = cat.t.length ? cat.t : cat.v.length ? cat.v : [''];
  $('#pStockArea').innerHTML = `
    ${rows[0] === '' ? `<label>Nombre / modelo (opcional)</label><input id="pName" placeholder="Ej: Luminosa, Negra, Rosada…">` : ''}
    ${cat.v.length && !cat.t.length ? `<label>Nombre / modelo (opcional)</label><input id="pName" placeholder="Ej: Negra, Gris…">` : ''}
    <div class="sec-title">${cat.t.length ? 'Tipos' : cat.v.length ? 'Tallas / medidas' : 'Precio y cantidad'} <span class="muted" style="font-weight:400">· deja vacío lo que no tengas</span></div>
    ${rows.map((r, i) => `
      <div class="prow nophoto">
        <span>${esc(r) || 'Precio'}</span>
        <input data-ri="${i}" data-f="price" inputmode="numeric" data-money placeholder="$ precio">
        <input data-ri="${i}" data-f="stock" inputmode="numeric" placeholder="Cant.">
      </div>`).join('')}`;
}

/* ----- Ventas ----- */
function viewSales() {
  const f = state.salesFilter;
  const list = db.sales
    .filter(s => f === 'all' || (f === 'debt' && saleDebt(s) > 0) || (f === 'paid' && saleDebt(s) <= 0) || (f === 'ship' && s.ship))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return `
    <div class="chips">
      ${[['all', 'Todas'], ['debt', 'Con saldo'], ['paid', 'Pago total'], ['ship', 'Envíos']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="salesFilter" data-f="${k}">${l}</button>`).join('')}
    </div>
    ${list.length ? `<div class="cards">${list.map(saleRow).join('')}</div>` : '<div class="empty">No hay ventas aquí todavía.</div>'}
    <button class="fab" data-act="newSale">＋ Venta</button>`;
}
function saleRow(s) {
  const debt = saleDebt(s);
  return `
    <div class="row click" data-act="openSale" data-id="${s.id}">
      <div class="grow"><b>${esc(s.customer)}</b><small>${fmtDate(s.date)} · ${esc(itemsText(s))}</small></div>
      <div class="right"><div class="price">${money(saleTotal(s))}</div>
        ${debt > 0 ? `<span class="badge debt">Debe ${money(debt)}</span>` : '<span class="badge ok">Pagado</span>'}
        ${s.ship ? '<span class="badge ship">Envío</span>' : ''}</div>
    </div>`;
}

function openNewSale() {
  cart = { customer: '', phone: '', items: [], mode: 'full', abono: '', ship: false, note: '', date: ymd(), q: '' };
  sheet(`
    ${sheetHead('Nueva venta')}
    <label>Cliente</label>
    <input id="custIn" data-bind="cart:customer" placeholder="Nombre del cliente" autocomplete="off">
    <div id="custSug" class="pick sug" hidden></div>
    <label>Celular / WhatsApp (opcional)</label>
    <input id="custPhone" data-bind="cart:phone" inputmode="tel" placeholder="3001234567">

    <div class="sec-title">Agregar productos <span class="muted" style="font-weight:400">· toca ＋ en todos los que lleve</span></div>
    <input id="pickQ" placeholder="🔍 Buscar producto…" autocomplete="off">
    <div class="chips nowrap" id="pickChips" style="margin-top:8px"></div>
    <div id="pickList"></div>
    <div class="sec-title">En esta venta <span class="muted" id="cartCount" style="font-weight:400"></span></div>
    <div id="cartLines"><div class="muted">Aún no has agregado productos.</div></div>
    <button class="btn sec small" style="margin-top:8px" data-act="freeItem">＋ Artículo que no está en inventario</button>
    <div class="total"><span>Total</span><span id="cartTotal">$0</span></div>

    <div class="sec-title">Pago</div>
    <select data-change="payMode">
      <option value="full">Pagó completo</option>
      <option value="credit">Fiado (con o sin abono inicial)</option>
    </select>
    <div id="abonoBox" hidden>
      <label>Abono inicial (lo que deja hoy)</label>
      <input data-bind="cart:abono" inputmode="numeric" data-money placeholder="$0">
    </div>

    <label class="inline" style="margin-top:14px"><input type="checkbox" class="fit" style="width:22px;height:22px" data-change="cartShip"> <span style="color:var(--ink);font-size:15px">Es envío nacional (pedido online)</span></label>
    <label>Nota (opcional)</label>
    <input data-bind="cart:note" placeholder="Ej: separado, entrega el sábado…">
    <button class="btn" data-act="saveSale">Guardar venta</button>`);
  paintCart();
  paintPick();
}

// Sugerencias de clientes: salen debajo del campo (no tapan el teclado) y se cierran al elegir
function paintCust() {
  const q = norm($('#custIn').value), box = $('#custSug');
  const names = [...new Set(db.sales.map(s => s.customer))].filter(n => q && norm(n).includes(q) && norm(n) !== q).slice(0, 5);
  box.hidden = !names.length;
  box.innerHTML = names.map(n => `<div data-act="pickCust" data-n="${esc(n)}">${esc(n)}</div>`).join('');
}

function paintCart() {
  $('#cartLines').innerHTML = cart.items.map((it, i) => `
    <div class="line">
      <div class="grow"><b style="font-weight:600">${esc(it.name)}</b><small>c/u</small></div>
      <input class="priceIn" data-in="price" data-i="${i}" inputmode="numeric" data-money value="${fmtNum(it.price)}">
      <div class="stepper">
        <button data-act="qtyDown" data-i="${i}">−</button><span class="n">${it.qty}</span><button data-act="qtyUp" data-i="${i}">+</button>
      </div>
    </div>`).join('');
  if (!cart.items.length) $('#cartLines').innerHTML = '<div class="muted">Aún no has agregado productos.</div>';
  paintTotal();
}
function paintTotal() {
  const t = cart.items.reduce((a, i) => a + i.qty * i.price, 0);
  const n = cart.items.reduce((a, i) => a + i.qty, 0);
  $('#cartTotal').textContent = money(t);
  $('#cartCount').textContent = n ? `· ${n} artículo(s)` : '';
}
const cartQty = pid => cart.items.filter(i => i.pid === pid).reduce((a, i) => a + i.qty, 0);

// Lista de productos para vender: se queda abierta para agregar varios, de cualquier categoría
function paintPick() {
  const q = norm($('#pickQ').value);
  const cats = ['Todas', ...db.cats.map(c => c.n).filter(n => db.products.some(p => p.cat === n))];
  cart.cat = cats.includes(cart.cat) ? cart.cat : 'Todas';
  $('#pickChips').innerHTML = cats.map(c => `<button class="chip ${cart.cat === c ? 'on' : ''}" data-act="pickCat" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const res = db.products
    .filter(p => (cart.cat === 'Todas' || p.cat === cart.cat) && (!q || norm(prodLabel(p) + ' ' + p.cat).includes(q)))
    .sort((a, b) => db.cats.findIndex(c => c.n === a.cat) - db.cats.findIndex(c => c.n === b.cat) || prodLabel(a).localeCompare(prodLabel(b)));
  $('#pickList').innerHTML = !db.products.length
    ? '<div class="muted" style="padding:6px">Aún no hay productos en el inventario. Puedes usar “Artículo que no está en inventario”.</div>'
    : res.length
      ? `<div class="pick">${res.map(p => {
        const n = cartQty(p.id);
        return `<div data-act="addToCart" data-id="${p.id}"><span class="grow">${esc(prodLabel(p))}<br><small>${esc(p.cat)} · stock ${p.stock} · ${money(p.price)}</small></span>${n
          ? `<span class="stepper"><button data-act="pickMinus" data-id="${p.id}">−</button><span class="n">${n}</span><button data-act="addToCart" data-id="${p.id}">+</button></span>`
          : '<span class="badge">＋ Agregar</span>'}</div>`;
      }).join('')}</div>`
      : '<div class="muted" style="padding:6px">No hay coincidencias.</div>';
}

function saveSale() {
  const name = cart.customer.trim();
  if (!name) return toast('Escribe el nombre del cliente');
  if (!cart.items.length) return toast('Agrega al menos un producto');
  const short = cart.items.filter(i => i.pid && prodById(i.pid) && i.qty > prodById(i.pid).stock);
  if (short.length && !confirm('No hay suficiente stock de:\n' + short.map(i => `• ${i.name} (hay ${prodById(i.pid).stock})`).join('\n') + '\n\n¿Guardar de todos modos?')) return;

  const sale = { id: uid(), date: cart.date, customer: name, phone: cart.phone.trim(), items: cart.items.map(i => ({ ...i })), payments: [], note: cart.note.trim(), ship: null };
  const total = saleTotal(sale);
  const first = cart.mode === 'full' ? total : Math.min(num(cart.abono), total);
  if (first > 0) sale.payments.push({ id: uid(), date: cart.date, amount: first });
  if (cart.ship) sale.ship = { nombre: name, cedula: '', direccion: '', departamento: '', ciudad: '', barrio: '', celular: cart.phone.trim() };

  for (const i of sale.items) { const p = i.pid && prodById(i.pid); if (p) p.stock = Math.max(0, p.stock - i.qty); }
  db.sales.push(sale);
  save();
  const goShip = !!sale.ship;
  closeSheet();
  toast('Venta guardada ✓');
  if (goShip) openSale(sale.id);
}

function openSale(id) {
  const s = db.sales.find(x => x.id === id);
  if (!s) return closeSheet();
  const debt = saleDebt(s);
  sheet(`
    ${sheetHead(s.customer)}
    <div class="muted">${fmtDate(s.date)}${s.phone ? ' · ' + esc(s.phone) : ''}${s.note ? ' · ' + esc(s.note) : ''}</div>
    <div class="card" style="margin-top:10px">
      ${s.items.map(i => `<div class="inline" style="padding:3px 0"><span>${i.qty} × ${esc(i.name)}</span><span class="right">${money(i.qty * i.price)}</span></div>`).join('')}
      <div class="total"><span>Total</span><span>${money(saleTotal(s))}</span></div>
      <div class="inline"><span>Abonado</span><span class="right">${money(salePaid(s))}</span></div>
      <div class="inline" style="font-weight:700;color:${debt > 0 ? 'var(--bad)' : 'var(--ok)'}"><span>${debt > 0 ? 'Debe' : 'Pagado ✓'}</span><span class="right">${money(debt)}</span></div>
    </div>

    <div class="sec-title">Abonos</div>
    ${s.payments.length ? s.payments.map(p => `
      <div class="line"><div class="grow">${fmtDate(p.date)}</div><b>${money(p.amount)}</b>
      <button class="x" style="font-size:20px" data-act="delPay" data-id="${s.id}" data-pid="${p.id}">🗑</button></div>`).join('') : '<div class="muted">Sin abonos todavía.</div>'}
    ${debt > 0 ? `<div class="muted" style="margin-top:8px">Para registrar un abono ve a la pestaña Cobros.</div>
      ${s.phone ? `<a class="btn sec" style="display:block;text-align:center;text-decoration:none" target="_blank" href="${waLink(s.phone, reminderText(s.customer, debt))}">Recordar saldo por WhatsApp</a>` : ''}` : ''}

    ${s.ship ? shipBlock(s) : `<button class="btn sec" data-act="makeShip" data-id="${s.id}">📦 Convertir en envío nacional</button>`}
    <button class="btn danger" data-act="delSale" data-id="${s.id}">Anular venta (devuelve al stock)</button>`);
}

const reminderText = (name, debt) =>
  `Hola ${firstName(name)} 😊 te recuerdo con cariño tu saldo pendiente en Soleya: ${money(debt)}. ¡Gracias por tu confianza! ☀️`;

function shipBlock(s) {
  const complete = s.ship.cedula && s.ship.direccion && s.ship.ciudad;
  return `
    <div class="sec-title">Envío nacional ${complete ? '<span class="badge ok">Datos listos</span>' : '<span class="badge warn">Faltan datos</span>'}</div>
    <div class="btns">
      <button class="btn sec" data-act="openShip" data-id="${s.id}">1 · Pedir datos / llenar</button>
      <button class="btn" data-act="printLabel" data-id="${s.id}">2 · Imprimir rótulo</button>
    </div>
    <button class="btn sec" data-act="openThanks" data-id="${s.id}">3 · Nota de gracias</button>`;
}

/* ----- Envío: pedir datos y llenar formulario ----- */
const SHIP_FIELDS = [
  ['nombre', 'Nombre completo'], ['cedula', 'Número de cédula'], ['direccion', 'Dirección'],
  ['departamento', 'Departamento'], ['ciudad', 'Ciudad'], ['barrio', 'Barrio'], ['celular', 'Número de celular'],
  ['notas', 'Notas (opcional)'], ['transportadora', 'Transportadora'],
];
const CARRIERS = ['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Envía'];

function openShip(id) {
  const s = db.sales.find(x => x.id === id);
  ship = { id, ...s.ship };
  const msg = db.settings.requestMsg.replace(/\{nombre\}/g, firstName(s.customer));
  sheet(`
    ${sheetHead('Datos de envío')}
    <div class="sec-title">Paso 1 · Mensaje para pedir los datos</div>
    <div class="msgbox" id="reqMsg">${esc(msg)}</div>
    <div class="btns">
      <button class="btn sec" data-act="copyReq">Copiar</button>
      <a class="btn green" style="text-align:center;text-decoration:none" target="_blank" href="${waLink(s.ship.celular || s.phone, msg)}">Abrir WhatsApp</a>
    </div>

    <div class="sec-title">Paso 2 · Datos que respondió el cliente</div>
    <label>Pega aquí su respuesta y la lleno sola (opcional)</label>
    <textarea id="pasteBox" style="min-height:80px" placeholder="Nombre: ...&#10;Cédula: ...&#10;Dirección: ..."></textarea>
    <button class="btn sec small" style="margin-top:8px" data-act="parseResp">Llenar formulario con lo pegado</button>

    ${SHIP_FIELDS.map(([k, l]) => k === 'transportadora'
    ? `<label>${l}</label><input id="sf-${k}" data-bind="ship:${k}" list="carrierList" value="${esc(ship[k])}" placeholder="Elige o escribe otra"><datalist id="carrierList">${CARRIERS.map(c => `<option value="${c}">`).join('')}</datalist>`
    : `<label>${l}</label><input id="sf-${k}" data-bind="ship:${k}" value="${esc(ship[k])}" ${k === 'celular' ? 'inputmode="tel"' : ''}>`).join('')}
    <button class="btn" data-act="saveShip">Guardar datos</button>`);
}
function parseResp(text) {
  const map = { nombre: /nombre/, cedula: /c[eé]dula|cedula|\bcc\b|\bc c\b|identificaci/, direccion: /direcci/, departamento: /departamento/, ciudad: /ciudad|municipio/, barrio: /barrio/, notas: /^notas?$|observaci/, transportadora: /transportadora/, celular: /celular|tel[eé]fono|n[uú]mero de cel|whatsapp/ };
  let found = 0;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/[*_]/g, '').match(/^\s*(?:[^\p{L}\d]*\s*)?([\p{L} ]+?)\s*[:\-–]\s*(.+)$/u);
    if (!m) continue;
    const label = norm(m[1]), val = m[2].trim();
    for (const k in map) if (map[k].test(label)) { ship[k] = val; const el = $('#sf-' + k); if (el) el.value = val; found++; break; }
  }
  return found;
}

/* ----- Impresión ----- */
function printHTML(html) {
  $('#printRoot').innerHTML = html;
  const native = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins.SoleyaPrint;
  setTimeout(() => (native ? native.print({ name: 'Soleya' }).catch(e => toast(e.message || 'No se pudo imprimir')) : window.print()), 150);
}
function qrSvg(text) {
  try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  catch (e) { return ''; }
}
function labelHTML(s) {
  const d = s.ship, st = db.settings;
  const field = (l, v) => `<div class="f"><span class="fl">${l} :</span><span class="fv">${esc(v)}</span></div>`;
  const dptoCiudad = [d.departamento, d.ciudad].filter(Boolean).join(' - ');
  const carrier = (d.transportadora || '').trim();
  const known = CARRIERS.find(c => norm(c) === norm(carrier));
  const wa = 'https://wa.me/' + String(st.phone).replace(/\D/g, '');
  return `<div class="label">
    <div class="lbl-head">
      <div class="lbl-logo"><img src="icons/logo-negro.png" alt="" onerror="this.onerror=null;this.src='icons/icon-192.png'"></div>
      <div class="lbl-title"><div class="brand">${esc(st.business.toUpperCase())}</div><div>${esc(st.city)}</div><div>Cel: ${esc(st.phone)}</div></div>
      <div class="lbl-qr">${qrSvg(wa)}<b>WhatsApp</b></div>
    </div>
    <div class="stripe"></div>
    <div class="lbl-send">Enviar a :</div>
    ${field('Nombre', d.nombre || s.customer)}
    ${field('Identificación', d.cedula)}
    ${field('Teléfono', d.celular)}
    ${field('Dirección', d.direccion)}
    ${field('Dpto y Ciudad', dptoCiudad)}
    ${field('Barrio', d.barrio)}
    ${field('Notas', d.notas)}
    <div class="f"><span class="fv"></span></div>
    <div class="f"><span class="fv"></span></div>
    <div class="lbl-carrier"><b>Transportadora:</b>
      <div class="boxes">${CARRIERS.map(c => `<span><i class="box">${known === c ? '✓' : ''}</i>${c}</span>`).join('')}
        <span class="other"><i class="box">${carrier && !known ? '✓' : ''}</i>Otra: <u>${carrier && !known ? esc(carrier) : ''}</u></span></div>
    </div>
    <div class="stripe"></div>
    <div class="lbl-foot"><b>¡GRACIAS POR TU COMPRA!</b>
      <div>${st.tiktok ? '♪ ' + esc(st.tiktok) : ''}${st.tiktok && st.instagram ? '&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${st.instagram ? '◎ ' + esc(st.instagram) : ''}</div></div>
  </div>`;
}

// Tarjeta de agradecimiento: logo dorado sin fondo, flores y corazones en fucsia
function thanksHTML(name, text, p) {
  const st = db.settings;
  const fl = (cls, st2) => `<svg class="d ${cls}" style="${st2}" viewBox="-24 -24 48 48"><use href="#${p}f" x="-24" y="-24" width="48" height="48"/></svg>`;
  const hr = (st2, c) => `<svg class="d" style="${st2};color:${c}" viewBox="-12 -12 24 24"><use href="#${p}h" x="-12" y="-12" width="24" height="24"/></svg>`;
  const social = [st.instagram, st.tiktok && '♪ ' + st.tiktok].filter(Boolean).join('   ·   ');
  return `<div class="tcard">
    <svg width="0" height="0" style="position:absolute"><defs>
      <symbol id="${p}f" viewBox="-24 -24 48 48"><g fill="#F472B6"><ellipse cy="-12" rx="7" ry="11"/><ellipse cy="-12" rx="7" ry="11" transform="rotate(72)"/><ellipse cy="-12" rx="7" ry="11" transform="rotate(144)"/><ellipse cy="-12" rx="7" ry="11" transform="rotate(216)"/><ellipse cy="-12" rx="7" ry="11" transform="rotate(288)"/></g><circle r="6.5" fill="#F7C948"/><circle r="2.5" fill="#fff" opacity=".65"/></symbol>
      <symbol id="${p}h" viewBox="-12 -12 24 24"><path d="M0 9C-14 -1 -8 -12 0 -5C8 -12 14 -1 0 9Z" fill="currentColor"/></symbol>
    </defs></svg>
    ${fl('', 'left:-22px;top:-22px;width:104px;height:104px')}
    ${fl('', 'right:-16px;top:-14px;width:80px;height:80px;transform:rotate(25deg)')}
    ${fl('', 'left:-18px;bottom:-20px;width:86px;height:86px;transform:rotate(-15deg)')}
    ${fl('', 'right:-24px;bottom:-24px;width:112px;height:112px;transform:rotate(10deg)')}
    ${fl('', 'left:5%;top:42%;width:34px;height:34px')}
    ${fl('', 'right:4%;top:56%;width:30px;height:30px;transform:rotate(30deg)')}
    ${hr('left:20%;top:5%;width:20px;height:20px;transform:rotate(-15deg)', '#D81B80')}
    ${hr('right:22%;top:8%;width:16px;height:16px;transform:rotate(12deg)', '#F472B6')}
    ${hr('left:9%;top:30%;width:16px;height:16px', '#F472B6')}
    ${hr('right:8%;top:34%;width:22px;height:22px;transform:rotate(14deg)', '#D81B80')}
    ${hr('left:10%;top:70%;width:20px;height:20px;transform:rotate(-10deg)', '#D81B80')}
    ${hr('right:11%;top:76%;width:16px;height:16px', '#F472B6')}
    ${hr('left:28%;bottom:3%;width:16px;height:16px', '#F472B6')}
    ${hr('right:30%;bottom:4%;width:20px;height:20px;transform:rotate(-8deg)', '#D81B80')}
    <div class="tin">
      <img class="tlogo" src="icons/logo-dorado.png" alt="">
      <div class="tbrand">${esc(st.business.toUpperCase())}</div>
      <div class="tdiv"><i></i><svg viewBox="-12 -12 24 24" style="color:#D81B80"><use href="#${p}h" x="-12" y="-12" width="24" height="24"/></svg><i></i></div>
      <div class="thello">¡Gracias, ${esc(name)}!</div>
      <div class="tbody">${esc(text)}</div>
      <div class="tdiv"><i></i><svg viewBox="-12 -12 24 24" style="color:#F472B6"><use href="#${p}h" x="-12" y="-12" width="24" height="24"/></svg><i></i></div>
      <div class="tsign">Con cariño,<br><b>${esc(st.business)}</b></div>
      ${social ? `<div class="tsoc">${esc(social)}</div>` : ''}
    </div>
  </div>`;
}
function paintThanks() { $('#thCard').innerHTML = thanksHTML($('#thName').value.trim(), $('#thText').value, 'pv'); }

function openThanks(id) {
  const s = db.sales.find(x => x.id === id);
  const name = cap(firstName(s.ship?.nombre || s.customer));
  sheet(`
    ${sheetHead('Nota de gracias')}
    <div id="thCard" class="thwrap"></div>
    <label>Nombre en la nota</label>
    <input id="thName" value="${esc(name)}">
    <label>Mensaje (elige uno o edítalo)</label>
    <select data-change="thPick">${THANKS.map((t, i) => `<option value="${i}">Mensaje ${i + 1}</option>`).join('')}</select>
    <textarea id="thText" style="margin-top:8px">${esc(THANKS[0])}</textarea>
    <button class="btn" data-act="printThanks">🖨️ Imprimir nota</button>`);
  paintThanks();
}

/* ----- Cobros (fiados) ----- */
function debtors() {
  const map = {};
  for (const s of db.sales) {
    const d = saleDebt(s);
    if (d <= 0) continue;
    const k = norm(s.customer);
    const g = map[k] ||= { key: k, name: s.customer, phone: '', debt: 0, sales: [], lastPay: '' };
    g.debt += d; g.sales.push(s);
    if (s.phone) g.phone = s.phone;
  }
  // último abono considerando todas las ventas del cliente
  for (const s of db.sales) {
    const g = map[norm(s.customer)];
    if (g) for (const p of s.payments) if (p.date > g.lastPay) g.lastPay = p.date;
  }
  return Object.values(map).sort((a, b) => b.debt - a.debt);
}
function lateThisWeek(g) {
  const sat = lastSaturday();
  const oldest = g.sales.reduce((m, s) => (s.date < m ? s.date : m), '9999');
  return oldest < sat && g.lastPay < sat;
}
function debtorRow(g) {
  return `
    <div class="row click" data-act="openDebtor" data-key="${esc(g.key)}">
      <div class="grow"><b>${esc(g.name)}</b><small>${g.lastPay ? 'Último abono ' + fmtDate(g.lastPay) : 'Sin abonos aún'}</small></div>
      <div class="right"><div class="price">${money(g.debt)}</div>${lateThisWeek(g) ? '<span class="badge warn">Sin abono</span>' : ''}</div>
    </div>`;
}
function viewDebt() {
  const list = debtors();
  const total = list.reduce((a, g) => a + g.debt, 0);
  return `
    <div class="stat gold"><small>Total por cobrar · próximo sábado ${fmtDate(nextSaturday())}</small><b>${money(total)}</b></div>
    <h2>Quién me debe</h2>
    ${list.length ? `<div class="cards">${list.map(debtorRow).join('')}</div>` : '<div class="empty">Nadie te debe por ahora 🎉</div>'}`;
}
function openDebtor(key) {
  const g = debtors().find(x => x.key === key);
  if (!g) return closeSheet();
  sheet(`
    ${sheetHead(g.name)}
    <div class="stat gold" style="margin-top:8px"><small>Saldo total</small><b>${money(g.debt)}</b></div>

    <div class="sec-title">Registrar abono</div>
    <div class="muted">Se aplica primero a la deuda más antigua.</div>
    <div class="inline" style="margin-top:8px">
      <input id="dpAmt" inputmode="numeric" data-money placeholder="Monto">
      <input id="dpDate" type="date" class="fit" style="width:150px" value="${ymd()}">
    </div>
    <button class="btn" data-act="payDebtor" data-key="${esc(key)}">Registrar abono</button>
    ${g.phone ? `<a class="btn sec" style="display:block;text-align:center;text-decoration:none" target="_blank" href="${waLink(g.phone, reminderText(g.name, g.debt))}">Recordar saldo por WhatsApp</a>` : ''}

    <div class="sec-title">Lo que se ha llevado</div>
    ${g.sales.sort((a, b) => a.date.localeCompare(b.date)).map(s => `
      <div class="row click" data-act="openSale" data-id="${s.id}">
        <div class="grow"><b>${fmtDate(s.date)}</b><small>${esc(itemsText(s))}</small></div>
        <div class="right"><div class="price">${money(saleDebt(s))}</div><small>de ${money(saleTotal(s))}</small></div>
      </div>`).join('')}`);
}

/* ----- Ajustes ----- */
function viewSet() {
  const st = db.settings;
  return `
    <div class="cols2">
      <div>
        <h2>Mi negocio</h2>
        <label>Nombre</label><input id="sBiz" value="${esc(st.business)}">
        <label>Frase debajo del nombre (pantalla de inicio)</label><input id="sTag" value="${esc(st.tagline)}">
        <label>Mi celular (sale en el rótulo y en el QR de WhatsApp)</label><input id="sPhone" inputmode="tel" value="${esc(st.phone)}">
        <label>Ciudad desde donde envío</label><input id="sCity" value="${esc(st.city)}">
        <label>TikTok</label><input id="sTik" value="${esc(st.tiktok)}">
        <label>Instagram</label><input id="sIg" value="${esc(st.instagram)}">
        <label>Avisar “stock bajo” cuando queden este número o menos</label><input id="sLow" inputmode="numeric" value="${st.lowStock}">
        <button class="btn" data-act="saveSet">Guardar ajustes</button>
      </div>
      <div>
        <h2>Mensaje para pedir datos de envío</h2>
        <div class="muted">Usa {nombre} para que salga el primer nombre del cliente.</div>
        <textarea id="sReq" style="min-height:250px;margin-top:6px">${esc(st.requestMsg)}</textarea>
        <button class="btn" data-act="saveSet">Guardar ajustes</button>

        <h2>Copia de seguridad</h2>
        <div class="muted">Tus datos viven en este aparato. Guarda una copia de vez en cuando por si lo cambias o borras la app.</div>
        <div class="btns">
          <button class="btn sec" data-act="backup">Descargar copia</button>
          <button class="btn sec" data-act="restore">Restaurar copia</button>
        </div>
        <input type="file" id="restoreFile" accept="application/json" hidden>
      </div>
    </div>

    <h2>Categorías de productos</h2>
    <div class="muted">Agrega categorías nuevas o cambia los tipos, tallas y medidas de las que ya tienes.</div>
    <div class="cards" style="margin-top:8px">
      ${db.cats.map(c => `
        <div class="row">
          <div class="grow"><b>${esc(c.n)}</b><small>${esc([c.t.length ? c.t.length + ' tipos' : '', c.v.length ? 'Tallas/medidas: ' + c.v.join(', ') : ''].filter(Boolean).join(' · ') || 'Sin tipos ni tallas')}</small></div>
          <button class="btn sec small" data-act="editCat" data-n="${esc(c.n)}">Editar</button>
        </div>`).join('')}
    </div>
    <button class="btn sec" style="max-width:340px" data-act="newCat">＋ Nueva categoría</button>`;
}

/* ----- Categorías ----- */
function openCatSheet(name, from, editId) {
  const c = name ? db.cats.find(x => x.n === name) : null;
  sheet(`
    ${sheetHead(c ? 'Editar categoría' : 'Nueva categoría')}
    <label>Nombre de la categoría</label>
    <input id="cName" value="${esc(c ? c.n : '')}" ${c ? 'readonly' : ''} placeholder="Ej: Bufandas, Pijamas, Gorros…">
    <label>Tipos (opcional) · uno por línea, cada tipo tendrá su propio precio</label>
    <textarea id="cTypes" style="min-height:100px" placeholder="Ej:&#10;Lana&#10;Algodón">${esc(c ? c.t.join('\n') : '')}</textarea>
    <label>Tallas o medidas (opcional) · separadas por coma</label>
    <input id="cVars" value="${esc(c ? c.v.join(', ') : '')}" placeholder="Ej: S, M, L, XL">
    <label>Nota (opcional)</label>
    <input id="cNote" value="${esc(c ? c.note || '' : '')}" placeholder="Ej: Unisex">
    <button class="btn" data-act="saveCat" data-n="${esc(c ? c.n : '')}" data-from="${from || ''}" data-edit="${editId || ''}">Guardar categoría</button>
    ${c && c.n !== 'Otros' ? `<button class="btn danger" data-act="delCat" data-n="${esc(c.n)}">Eliminar categoría</button>` : ''}`);
}

/* ============ Acciones ============ */
const acts = {
  tab: el => { state.tab = el.dataset.tab; render(); scrollTo(0, 0); },
  close: closeSheet,

  invSel: el => {
    state.invCat = el.dataset.n; state.invOpen = true; state.invQ = '';
    const q = $('#invQ'); if (q) q.value = '';
    paintInv(); scrollTo(0, 0);
  },
  invBack: () => { state.invOpen = false; paintInv(); },
  addStock: el => {
    const p = prodById(el.dataset.id);
    const n = num(prompt('¿Cuántas unidades ingresan de “' + prodLabel(p) + '”?') || 0);
    if (n <= 0) return;
    p.stock += n; p.lastIn = { date: ymd(), qty: n };
    save(); paintInv(); toast('+' + n + ' agregadas ✓');
  },
  newSub: el => openSubSheet(el.dataset.n),
  saveSub: el => {
    const c = db.cats.find(x => x.n === el.dataset.n);
    const name = $('#sName').value.trim(), price = num($('#sPrice').value), st = num($('#sStock').value);
    if (!name) return toast('Escribe el nombre');
    if (price <= 0) return toast('Escribe el precio');
    const byType = c.t.length > 0, bySize = !byType && c.v.length > 0;
    if (byType && !c.t.includes(name)) c.t.push(name);
    if (bySize && !c.v.includes(name)) c.v.push(name);
    const pn = bySize ? '' : name, pv = bySize ? name : '';
    const ex = db.products.find(p => p.cat === c.n && p.name === pn && p.variant === pv);
    if (ex) { ex.price = price; ex.stock += st; if (st > 0) ex.lastIn = { date: ymd(), qty: st }; }
    else db.products.push({ id: uid(), cat: c.n, name: pn, variant: pv, price, stock: st, lastIn: st > 0 ? { date: ymd(), qty: st } : null });
    state.invCat = c.n; state.invOpen = true;
    save(); closeSheet(); toast('Guardado ✓');
  },
  newCat: () => openCatSheet(null),
  editCat: el => openCatSheet(el.dataset.n),
  saveCat: el => {
    const n = $('#cName').value.trim();
    if (!n) return toast('Escribe el nombre de la categoría');
    const t = $('#cTypes').value.split('\n').map(s => s.trim()).filter(Boolean);
    const v = $('#cVars').value.split(',').map(s => s.trim()).filter(Boolean);
    const note = $('#cNote').value.trim();
    const old = el.dataset.n && db.cats.find(c => c.n === el.dataset.n);
    if (old) Object.assign(old, { t, v, note });
    else {
      if (db.cats.some(c => norm(c.n) === norm(n))) return toast('Ya existe esa categoría');
      const at = db.cats.findIndex(c => c.n === 'Otros');
      db.cats.splice(at < 0 ? db.cats.length : at, 0, { n, t, v, note });
    }
    save(); toast('Categoría guardada ✓');
    if (el.dataset.from === 'prod') openProdSheet(el.dataset.edit || null, n); else closeSheet();
  },
  delCat: el => {
    const n = el.dataset.n;
    const count = db.products.filter(p => p.cat === n).length;
    const msg = count
      ? `La categoría “${n}” tiene ${count} producto(s). Si la eliminas, también se eliminan esos productos del inventario (las ventas ya registradas no cambian).\n\n¿Eliminar la categoría y sus productos?`
      : `¿Eliminar la categoría “${n}”?`;
    if (!confirm(msg)) return;
    db.products = db.products.filter(p => p.cat !== n);
    db.cats = db.cats.filter(c => c.n !== n);
    if (state.invCat === n) state.invCat = '';
    save(); closeSheet(); toast('Categoría eliminada');
  },

  invCat: el => { state.invCat = el.dataset.cat; render(); },
  addProd: () => openProdSheet(),
  editProd: el => openProdSheet(el.dataset.id),
  stockUp: el => { const p = prodById(el.dataset.id); p.stock++; save(); paintInv(); },
  stockDown: el => { const p = prodById(el.dataset.id); p.stock = Math.max(0, p.stock - 1); save(); paintInv(); },
  saveProd: el => {
    const id = el.dataset.id, cat = $('#pCat').value, c = db.cats.find(x => x.n === cat);
    if (id) {
      const price = num($('#pPrice').value);
      if (price <= 0) return toast('Escribe el precio');
      Object.assign(prodById(id), { cat, name: $('#pName').value.trim(), price, variant: $('#pVar').value.trim(), stock: Math.max(0, Math.round(num($('#pStock').value))) });
    } else {
      const free = $('#pName') ? $('#pName').value.trim() : '';
      const rows = c.t.length ? c.t : c.v.length ? c.v : [''];
      const made = [];
      rows.forEach((r, i) => {
        const pr = $(`[data-ri="${i}"][data-f="price"]`).value.trim(), st = $(`[data-ri="${i}"][data-f="stock"]`).value.trim();
        if (pr !== '' || st !== '') made.push({ r, i, pr: num(pr), st: Math.max(0, Math.round(num(st))) });
      });
      if (!made.length) return toast('Escribe el precio y la cantidad de al menos uno');
      if (made.some(m => m.pr <= 0)) return toast('Falta el precio en alguno de los que llenaste');
      for (const m of made) {
        const name = c.t.length ? m.r : free, variant = c.v.length && !c.t.length ? m.r : '';
        const ex = db.products.find(p => p.cat === cat && p.name === name && p.variant === variant);
        const entrada = m.st > 0 ? { date: ymd(), qty: m.st } : null;
        if (ex) { ex.price = m.pr; ex.stock += m.st; if (entrada) ex.lastIn = entrada; }
        else db.products.push({ id: uid(), cat, name, variant, price: m.pr, stock: m.st, lastIn: entrada });
        state.invCat = cat;
      }
    }
    save(); closeSheet(); toast('Producto guardado ✓');
  },
  delProd: el => { if (confirm('¿Eliminar este producto del inventario?')) { db.products = db.products.filter(p => p.id !== el.dataset.id); save(); closeSheet(); } },

  salesFilter: el => { state.salesFilter = el.dataset.f; render(); },
  newSale: openNewSale,
  addToCart: el => {
    const p = prodById(el.dataset.id), ex = cart.items.find(i => i.pid === p.id);
    if (ex) ex.qty++; else cart.items.push({ pid: p.id, name: prodLabel(p), qty: 1, price: p.price });
    paintPick(); paintCart();
  },
  pickMinus: el => {
    const i = cart.items.findIndex(x => x.pid === el.dataset.id);
    if (i >= 0 && --cart.items[i].qty <= 0) cart.items.splice(i, 1);
    paintPick(); paintCart();
  },
  pickCust: el => {
    const n = el.dataset.n, last = db.sales.filter(s => s.customer === n && s.phone).pop();
    cart.customer = n; $('#custIn').value = n;
    if (last && !cart.phone) { cart.phone = last.phone; $('#custPhone').value = last.phone; }
    $('#custSug').hidden = true;
  },
  pickCat: el => { cart.cat = el.dataset.cat; paintPick(); $('#pickList').scrollIntoView({ block: 'nearest' }); },
  freeItem: () => {
    const name = prompt('Nombre del artículo:'); if (!name) return;
    const price = num(prompt('Precio:') || 0);
    cart.items.push({ pid: null, name: name.trim(), qty: 1, price }); paintCart();
  },
  qtyUp: el => { cart.items[el.dataset.i].qty++; paintCart(); paintPick(); },
  qtyDown: el => {
    const i = +el.dataset.i;
    if (--cart.items[i].qty <= 0) cart.items.splice(i, 1);
    paintCart(); paintPick();
  },
  saveSale,
  openSale: el => openSale(el.dataset.id),
  delPay: el => {
    if (!confirm('¿Borrar este abono?')) return;
    const s = db.sales.find(x => x.id === el.dataset.id);
    s.payments = s.payments.filter(p => p.id !== el.dataset.pid); save(); openSale(s.id);
  },
  delSale: el => {
    if (!confirm('¿Anular esta venta? Los productos vuelven al inventario.')) return;
    const s = db.sales.find(x => x.id === el.dataset.id);
    for (const i of s.items) { const p = i.pid && prodById(i.pid); if (p) p.stock += i.qty; }
    db.sales = db.sales.filter(x => x !== s); save(); closeSheet(); toast('Venta anulada');
  },
  makeShip: el => {
    const s = db.sales.find(x => x.id === el.dataset.id);
    s.ship = { nombre: s.customer, cedula: '', direccion: '', departamento: '', ciudad: '', barrio: '', celular: s.phone }; save(); openSale(s.id);
  },

  openShip: el => openShip(el.dataset.id),
  copyReq: async () => {
    try { await navigator.clipboard.writeText($('#reqMsg').textContent); toast('Mensaje copiado ✓'); }
    catch (e) { toast('No se pudo copiar, selecciónalo manualmente'); }
  },
  parseResp: () => { const n = parseResp($('#pasteBox').value); toast(n ? `Llené ${n} campo(s). Revisa antes de guardar.` : 'No encontré datos con formato “Campo: valor”'); },
  saveShip: () => {
    const s = db.sales.find(x => x.id === ship.id);
    s.ship = Object.fromEntries(SHIP_FIELDS.map(([k]) => [k, (ship[k] || '').trim()]));
    save(); openSale(s.id); toast('Datos guardados ✓');
  },
  printLabel: el => {
    const s = db.sales.find(x => x.id === el.dataset.id);
    if (!s.ship.direccion) return toast('Primero llena los datos de envío');
    printHTML(labelHTML(s));
  },
  openThanks: el => openThanks(el.dataset.id),
  printThanks: () => printHTML(thanksHTML($('#thName').value.trim(), $('#thText').value, 'pr')),

  openDebtor: el => openDebtor(el.dataset.key),
  payDebtor: el => {
    const g = debtors().find(x => x.key === el.dataset.key);
    let amt = num($('#dpAmt').value);
    if (amt <= 0) return toast('Escribe el monto');
    const date = $('#dpDate').value || ymd();
    amt = Math.min(amt, g.debt);
    for (const s of g.sales.sort((a, b) => a.date.localeCompare(b.date))) {
      if (amt <= 0) break;
      const pay = Math.min(amt, saleDebt(s));
      s.payments.push({ id: uid(), date, amount: pay }); amt -= pay;
    }
    save(); toast('Abono registrado ✓');
    debtors().some(x => x.key === g.key) ? openDebtor(g.key) : closeSheet();
  },

  saveSet: () => {
    Object.assign(db.settings, {
      business: $('#sBiz').value.trim() || 'Soleya Store', tagline: $('#sTag').value.trim(), phone: $('#sPhone').value.trim(), city: $('#sCity').value.trim(),
      tiktok: $('#sTik').value.trim(), instagram: $('#sIg').value.trim(),
      lowStock: Math.max(0, Math.round(num($('#sLow').value))), requestMsg: $('#sReq').value,
    });
    save(); toast('Ajustes guardados ✓');
  },
  backup: async () => {
    const P = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins;
    if (P && P.Filesystem && P.Share) {
      // En el celular no hay "descargas" del navegador: se guarda y se comparte (WhatsApp, Drive, correo…)
      try {
        const f = await P.Filesystem.writeFile({ path: `soleya-copia-${ymd()}.json`, data: JSON.stringify(db, null, 1), directory: 'CACHE', encoding: 'utf8' });
        await P.Share.share({ title: 'Copia de Soleya', files: [f.uri] });
      } catch (e) { if (!/cancel/i.test(e.message || '')) toast('No se pudo crear la copia'); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));
    a.download = `soleya-copia-${ymd()}.json`; a.click();
  },
  restore: () => $('#restoreFile').click(),
};

/* ============ Eventos ============ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && acts[el.dataset.act]) { e.preventDefault(); acts[el.dataset.act](el, e); }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.money !== undefined) t.value = t.value.replace(/\D/g, '') ? fmtNum(num(t.value)) : '';
  if (t.id === 'invQ') { state.invQ = t.value; paintInv(); }
  else if (t.id === 'pickQ') paintPick();
  else if (t.id === 'thName' || t.id === 'thText') paintThanks();
  else if (t.dataset.in === 'price') { cart.items[t.dataset.i].price = num(t.value); paintTotal(); }
  else if (t.dataset.bind) { const [o, k] = t.dataset.bind.split(':'); (o === 'cart' ? cart : ship)[k] = t.value; if (t.id === 'custIn') paintCust(); }
});

document.addEventListener('change', e => {
  const t = e.target;
  switch (t.dataset.change) {
    case 'prodCat':
      if (t.value === '__new') openCatSheet(null, 'prod', t.dataset.edit);
      else if (!t.dataset.edit) paintProdStock(null);
      break;
    case 'payMode': cart.mode = t.value; $('#abonoBox').hidden = t.value === 'full'; break;
    case 'cartShip': cart.ship = t.checked; break;
    case 'thPick': $('#thText').value = THANKS[+t.value]; paintThanks(); break;
  }
  if (t.id === 'restoreFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.products) || !Array.isArray(d.sales)) throw 0;
        if (!confirm('Esto reemplaza todo lo que hay ahora en la app. ¿Continuar?')) return;
        db = { ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } };
        if (!db.cats) db.cats = JSON.parse(JSON.stringify(DEFAULT_CATS));
        db.products.forEach(p => delete p.photo);
        save(); render(); toast('Copia restaurada ✓');
      } catch (err) { toast('Ese archivo no es una copia válida'); }
    };
    r.readAsText(t.files[0]);
    t.value = '';
  }
});

$('#sheetWrap').addEventListener('click', e => { if (e.target.id === 'sheetWrap') closeSheet(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });

render();
