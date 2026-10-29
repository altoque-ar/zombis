// Zombis - controles para celular (pantalla táctil).
// Dos modos que funcionan a la vez:
//  - Sin ver: gestos en toda la pantalla y la voz del juego (también para moverse por los menús).
//  - Visual: joystick y botones dibujados para los que ven.
// Los gestos y botones mandan las mismas teclas que la computadora, así todo funciona igual.
(() => {
'use strict';
const Z = window.__zombis;
if (!Z) return;
const $ = s => document.querySelector(s);

// ================= Opciones =================
const OT = { controles: 'auto', vibrar: true, sinVer: false };
try { Object.assign(OT, JSON.parse(localStorage.getItem('zombis-tactil') || '{}')); } catch (e) {}
const guardarOT = () => { try { localStorage.setItem('zombis-tactil', JSON.stringify(OT)); } catch (e) {} };
const esTactil = () => !!window.ZAndroid || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const sinVer = () => OT.sinVer && Z.OP.vozJuego;
const conBotones = () => OT.controles === 'botones' || OT.controles === 'ambos' || (OT.controles === 'auto' && !sinVer());
const hablar = t => Z.anunciar(t);

// ================= Teclas =================
const abiertas = new Set();
function tecla(code, abajo, o = {}) {
  document.dispatchEvent(new KeyboardEvent(abajo ? 'keydown' : 'keyup', { code, key: o.key || '', shiftKey: !!o.shift, bubbles: true, cancelable: true }));
}
function mantener(code, si) {
  if (si && !abiertas.has(code)) { abiertas.add(code); tecla(code, true); }
  else if (!si && abiertas.has(code)) { abiertas.delete(code); tecla(code, false); }
}
function soltarTodo() { for (const c of [...abiertas]) mantener(c, false); }
function pulsar(code, o) { tecla(code, true, o); setTimeout(() => tecla(code, false, o), 45); }

// ================= Acciones =================
// Cada gesto o botón termina en una acción con nombre. En el tutorial se cuentan; en el juego mandan teclas.
const ACCION = {
  disparar: () => pulsar('Space'),
  golpe: () => pulsar('KeyF'),
  usar: () => pulsar('KeyE'),
  recargar: () => pulsar('KeyR'),
  armaSig: () => pulsar('Period'),
  armaAnt: () => pulsar('Comma'),
  granada: () => pulsar('Backquote'),
  botiquin: () => pulsar('KeyQ'),
  cabezaArriba: () => pulsar('ArrowUp'),
  zonaAbajo: () => pulsar('ArrowDown'),
  pausa: () => pulsar('Escape')
};
let tutorial = null;
function accion(nombre) {
  if (tutorial) { tutorial.hecho(nombre); return; }
  if (ACCION[nombre]) ACCION[nombre]();
  vibrar(nombre === 'disparar' ? 12 : 0);
}

// ================= Menú rápido =================
const RAPIDO = [
  ['Vida y botiquines', 'KeyH'], ['Armas y balas', 'KeyB'], ['Ronda, puntos y misiones', 'KeyN'], ['Radar de zombis', 'KeyZ'],
  ['Girar hacia el zombi más peligroso', 'KeyV'], ['Guía a la puerta o árbol más cercano', 'KeyX'], ['Guía a la cosa más cercana', 'KeyC'],
  ['Girar hacia la guía', 'KeyG'], ['Cancelar la guía', 'Backspace'], ['Tienda', 'KeyP'], ['Usar botiquín', 'KeyQ'],
  ['Cambiar arma blanca', 'KeyF', { shift: true }], ['Subir o bajar del árbol, trabar puerta', 'KeyE'], ['Hacia dónde mirás', 'KeyM'],
  ['Prender o apagar el radar de paredes', 'KeyT'], ['Pausa', 'Escape']
];
let rapido = null;
function abrirRapido() {
  rapido = { i: 0 };
  mostrarRapido();
  hablar(`Menú rápido. ${RAPIDO[0][0]}. Deslizá a los costados para elegir, tocá para usar, deslizá para arriba para cerrar.`);
}
function moverRapido(p) {
  rapido.i = (rapido.i + p + RAPIDO.length) % RAPIDO.length;
  mostrarRapido(); hablar(RAPIDO[rapido.i][0]);
}
function usarRapido() {
  const [, code, o] = RAPIDO[rapido.i];
  cerrarRapido(true);
  if (tutorial) { tutorial.hecho('menu'); return; }
  pulsar(code, o);
}
function cerrarRapido(callado) { rapido = null; mostrarRapido(); if (!callado) hablar('Menú cerrado.'); }

// ================= Capa de la partida =================
const capa = document.createElement('div');
capa.id = 'tactil'; capa.setAttribute('aria-hidden', 'true');
capa.innerHTML = `
  <div id="t-joy"><i></i></div>
  <div id="t-botones">
    <button data-a="menu" class="t-chico">☰</button>
    <button data-a="pausa" class="t-chico">❚❚</button>
    <button data-a="granada">Granada</button>
    <button data-a="botiquin">Botiquín</button>
    <button data-a="usar">Usar / Subir</button>
    <button data-a="armaSig">Cambiar arma</button>
    <button data-a="recargar">Recargar</button>
    <button data-a="golpe" class="t-medio">Arma blanca</button>
    <button data-a="disparar" class="t-grande">Disparar</button>
    <div id="t-zona"><button data-a="cabezaArriba">▲</button><button data-a="zonaAbajo">▼</button></div>
  </div>
  <div id="t-rapido"></div>`;
document.body.appendChild(capa);
const estilo = document.createElement('style');
estilo.textContent = `
  #tactil { display: none; position: fixed; inset: 0; z-index: 4; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  body.tactil-juego #tactil { display: block; }
  #t-joy { display: none; position: absolute; width: 130px; height: 130px; margin: -65px 0 0 -65px; border-radius: 50%; background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.35); pointer-events: none; }
  #t-joy i { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: rgba(255,255,255,.35); }
  #t-botones { display: none; }
  body.tactil-botones #t-botones { display: block; }
  #t-botones button { position: absolute; font: 700 .8rem system-ui, sans-serif; color: #fff; background: rgba(20,25,20,.42); border: 2px solid rgba(255,255,255,.4); border-radius: 50%; width: 62px; height: 62px; padding: 0; text-shadow: 0 1px 2px #000; }
  #t-botones button:active { background: rgba(255,255,255,.3); }
  #t-botones [data-a="disparar"] { right: 4vw; bottom: 22vh; width: 96px; height: 96px; border-color: rgba(255,90,70,.7); font-size: .95rem; }
  #t-botones [data-a="golpe"] { right: calc(4vw + 108px); bottom: calc(22vh - 34px); width: 72px; height: 72px; }
  #t-botones [data-a="recargar"] { right: calc(4vw + 17px); bottom: calc(22vh + 106px); }
  #t-botones [data-a="armaSig"] { right: calc(4vw + 92px); bottom: calc(22vh + 84px); font-size: .68rem; }
  #t-botones [data-a="usar"] { right: calc(4vw + 186px); bottom: calc(22vh + 20px); font-size: .66rem; }
  #t-botones [data-a="granada"] { left: 16px; top: 76px; font-size: .7rem; width: 58px; height: 58px; }
  #t-botones [data-a="botiquin"] { left: 82px; top: 76px; font-size: .66rem; width: 58px; height: 58px; }
  #t-botones .t-chico { width: 44px; height: 44px; border-radius: 10px; font-size: 1rem; top: 52px; }
  #t-botones [data-a="menu"] { left: calc(50% - 50px); } #t-botones [data-a="pausa"] { left: calc(50% + 6px); }
  #t-zona { position: absolute; right: calc(4vw + 172px); bottom: calc(22vh + 92px); display: none; }
  #t-zona button { position: static !important; display: block; width: 46px !important; height: 32px !important; border-radius: 10px !important; margin: 4px 0; }
  body.tactil-botones #t-zona { display: block; }
  body.tactil-botones .h-inf { left: 50%; right: auto; transform: translateX(-50%); bottom: 6px; gap: 10px; }
  body.tactil-botones .h-arma, body.tactil-botones .h-blanca { min-width: 0; padding: 4px 10px; background: rgba(0,0,0,.4); }
  body.tactil-botones .h-mun b { font-size: 1.7rem; } body.tactil-botones .h-mun span { font-size: 1rem; }
  body.tactil-botones #g-mision { top: 100px; }
  body.g3d main { height: 100vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  #t-rapido { display: none; position: absolute; left: 50%; top: 60px; transform: translateX(-50%); width: min(420px, 86vw); background: rgba(10,14,10,.88); border: 2px solid #4f6b45; border-radius: 14px; padding: 8px; color: #fff; font: 600 1rem system-ui, sans-serif; max-height: 70vh; overflow: hidden; }
  #t-rapido.abierto { display: block; }
  #t-rapido div { padding: 8px 12px; border-radius: 8px; }
  #t-rapido div.sel { background: #3c6b2f; }
  #navGestos { display: none; position: fixed; inset: 0; z-index: 50; touch-action: none; }
  body.tactil-nav #navGestos { display: block; }
  .nav-sel { outline: 4px solid #e2b33a !important; outline-offset: 3px; }
  @media (orientation: portrait) { body.tactil-juego #t-girar { display: grid; } }
  #t-girar { display: none; position: fixed; inset: 0; z-index: 60; place-items: center; background: rgba(0,0,0,.85); color: #fff; font: 700 1.3rem system-ui, sans-serif; text-align: center; padding: 20px; pointer-events: none; }
`;
document.head.appendChild(estilo);
const girarAviso = document.createElement('div'); girarAviso.id = 't-girar'; girarAviso.setAttribute('aria-hidden', 'true'); girarAviso.textContent = 'Girá el celular y ponelo acostado'; document.body.appendChild(girarAviso);

function mostrarRapido() {
  const el = $('#t-rapido');
  el.classList.toggle('abierto', !!rapido);
  if (!rapido) { el.innerHTML = ''; return; }
  const desde = Math.max(0, Math.min(rapido.i - 3, RAPIDO.length - 8));
  el.innerHTML = RAPIDO.slice(desde, desde + 8).map((r, k) => `<div class="${desde + k === rapido.i ? 'sel' : ''}">${r[0]}</div>`).join('');
}

// ---- reconocedor de gestos de la partida ----
const dedos = new Map(); // id -> info
let salioTienda = 0;
const ancho = () => innerWidth, alto = () => innerHeight;
function enTienda() { const J = Z.J; return J && J.tiendaAbierta; }

function inicio(t) {
  const x = t.clientX, y = t.clientY, ahora = performance.now();
  const d = { id: t.identifier, x0: x, y0: y, x, y, t0: ahora, modo: null, zona: x < ancho() / 2 ? 'izq' : 'der' };
  if (y < 44 && !rapido) d.zona = 'arriba';
  // dos dedos: si ya hay uno apoyado hace poco, se juntan en un gesto de dos dedos
  const otros = [...dedos.values()].filter(o => !o.terminado && o.zona !== 'izq' && ahora - o.t0 < 300 && !o.modo);
  if (d.zona !== 'izq' && otros.length && !rapido && !enTienda()) {
    const o = otros[0]; o.modo = 'dos'; o.par = d; d.modo = 'dosB'; o.x0b = x; o.y0b = y;
    cancelarMantener(o);
  }
  dedos.set(t.identifier, d);
  if (rapido || enTienda()) return;
  if (d.zona === 'der' && d.modo !== 'dosB') d.timer = setTimeout(() => { if (!d.modo) { d.modo = 'rafaga'; if (tutorial) tutorial.hecho('mantener'); else mantener('Space', true); } }, 300);
  if (d.zona === 'izq') {
    d.timer = setTimeout(() => { if (!d.modo) { d.modo = 'usado'; accion('usar'); vibrar(30); } }, 650);
    if (conBotones()) { const j = $('#t-joy'); j.style.display = 'block'; j.style.left = x + 'px'; j.style.top = y + 'px'; j.firstElementChild.style.transform = ''; }
  }
}
function cancelarMantener(d) { clearTimeout(d.timer); if (d.modo === 'rafaga') mantener('Space', false); }
function mover(t) {
  const d = dedos.get(t.identifier); if (!d) return;
  d.x = t.clientX; d.y = t.clientY;
  const dx = d.x - d.x0, dy = d.y - d.y0, dist = Math.hypot(dx, dy);
  if (rapido || enTienda() || d.zona === 'arriba' || d.modo === 'dos' || d.modo === 'dosB') return;
  if (d.zona === 'izq') {
    if (dist > 14 && d.modo !== 'usado') { d.modo = 'caminar'; clearTimeout(d.timer); }
    if (d.modo !== 'caminar') return;
    const zm = 18;
    if (tutorial) { if (dist > 40) tutorial.hecho(dy < 0 ? 'caminar' : 'caminarAtras'); }
    else {
      mantener('KeyW', dy < -zm); mantener('KeyS', dy > zm);
      mantener('KeyA', dx < -zm * 1.4); mantener('KeyD', dx > zm * 1.4);
      mantener('ShiftLeft', dist > 95);
    }
    const k = Math.min(1, 55 / (dist || 1));
    $('#t-joy').firstElementChild.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    return;
  }
  // mitad derecha
  if (!d.modo && Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy)) { d.modo = 'giro'; clearTimeout(d.timer); }
  if (!d.modo && Math.abs(dy) > 38 && Math.abs(dy) > Math.abs(dx) * 1.4 && performance.now() - d.t0 < 450) {
    d.modo = 'hecho'; clearTimeout(d.timer);
    accion(dy < 0 ? 'cabezaArriba' : 'zonaAbajo');
  }
  if (d.modo === 'giro') {
    if (tutorial) { if (Math.abs(dx) > 50) tutorial.hecho('girar'); return; }
    mantener('ArrowRight', dx > 12); mantener('ArrowLeft', dx < -12);
  }
}
function fin(t) {
  const d = dedos.get(t.identifier); if (!d) return;
  dedos.delete(t.identifier); d.terminado = true;
  clearTimeout(d.timer);
  const dx = d.x - d.x0, dy = d.y - d.y0, dur = performance.now() - d.t0, dist = Math.hypot(dx, dy);
  // menú rápido abierto
  if (rapido) {
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) moverRapido(dx > 0 ? 1 : -1);
    else if (dy < -50) cerrarRapido();
    else if (dist < 20 && dur < 400) usarRapido();
    return;
  }
  // tienda abierta: arriba/abajo productos, costados secciones, toque compra, dos dedos sale
  if (enTienda() || performance.now() - salioTienda < 600) {
    if (performance.now() - salioTienda < 600) return;
    if (dedos.size || d.par) { salioTienda = performance.now(); pulsar('Escape'); return; }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) pulsar(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    else if (Math.abs(dy) > 40) pulsar(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    else if (dist < 20 && dur < 400) pulsar('Enter');
    return;
  }
  if (d.zona === 'arriba') { if (dy > 50) { if (tutorial && tutorial.paso().a !== 'abrirMenu') return; abrirRapido(); if (tutorial) tutorial.hecho('abrirMenu'); } return; }
  if (d.zona === 'izq') {
    $('#t-joy').style.display = 'none';
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft']) mantener(k, false);
    if (!d.modo && dur < 300 && dist < 14) { accion('golpe'); vibrar(20); }
    return;
  }
  if (d.modo === 'dosB') return; // lo resuelve el primer dedo
  if (d.modo === 'dos') {
    const p = d.par, pdx = p ? p.x - p.x0 : 0, pdy = p ? p.y - p.y0 : 0;
    const mx = (dx + pdx) / 2, my = (dy + pdy) / 2;
    if (Math.abs(mx) > 45 && Math.abs(mx) > Math.abs(my)) accion(mx > 0 ? 'armaSig' : 'armaAnt');
    else if (my < -45) accion('granada');
    else if (my > 45) accion('botiquin');
    else if (dur > 900) accion('pausa');
    else accion('recargar');
    return;
  }
  if (d.modo === 'rafaga') { mantener('Space', false); return; }
  if (d.modo === 'giro') { mantener('ArrowRight', false); mantener('ArrowLeft', false); return; }
  if (!d.modo && dur < 300 && dist < 20) accion('disparar');
}
capa.addEventListener('touchstart', e => {
  const b = e.target.closest && e.target.closest('#t-botones button');
  if (b) { e.preventDefault(); const a = b.dataset.a; if (a === 'menu') { rapido ? cerrarRapido() : abrirRapido(); } else if (a === 'disparar') { b._t = setTimeout(() => { b._r = true; mantener('Space', true); }, 250); } else accion(a); vibrar(15); return; }
  e.preventDefault();
  for (const t of e.changedTouches) inicio(t);
}, { passive: false });
capa.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) mover(t); }, { passive: false });
const terminar = e => {
  const b = e.target.closest && e.target.closest('#t-botones button');
  if (b && b.dataset.a === 'disparar') { clearTimeout(b._t); if (b._r) { b._r = false; mantener('Space', false); } else accion('disparar'); }
  for (const t of e.changedTouches) fin(t);
};
capa.addEventListener('touchend', e => { e.preventDefault(); terminar(e); }, { passive: false });
capa.addEventListener('touchcancel', e => { for (const t of e.changedTouches) { const d = dedos.get(t.identifier); if (d) { clearTimeout(d.timer); dedos.delete(t.identifier); } } soltarTodo(); });

// ================= Menús con gestos (modo sin ver) =================
// Deslizar a la derecha o izquierda: siguiente o anterior. Doble toque: elegir. Un toque: repetir.
// Deslizar arriba o abajo: cambiar el valor de una barra o lista.
const nav = document.createElement('div'); nav.id = 'navGestos'; nav.setAttribute('aria-hidden', 'true'); document.body.appendChild(nav);
let navI = 0, navToque = null, navUltimoTap = 0, navLista = [];
function visible(el) { return el && el.offsetParent !== null && !el.closest('[hidden]'); }
function contenedorActivo() {
  const paneles = [...document.querySelectorAll('.panel')].filter(p => !p.hidden);
  if (paneles.length) return paneles[paneles.length - 1];
  return [...document.querySelectorAll('main > section')].find(s => !s.hidden) || document.body;
}
function elementos() {
  const c = contenedorActivo();
  return [...c.querySelectorAll('h1, h2, p, li, button, input, select')].filter(el => visible(el) && !el.closest('#hud') && el.id !== 'textoVisible' && (el.matches('button, input, select') || el.textContent.trim()) && !el.matches('.oculto'));
}
function etiqueta(el) {
  if (el.matches('button')) return el.textContent.trim() + ', botón';
  if (el.matches('input[type=range]')) return (el.closest('label') ? el.closest('label').textContent.trim() : '') + ', ' + el.value + ', barra. Deslizá arriba o abajo para cambiar.';
  if (el.matches('input[type=checkbox]')) return el.closest('label').textContent.trim() + (el.checked ? ', activado' : ', desactivado') + '. Tocá dos veces para cambiar.';
  if (el.matches('select')) return (el.closest('label') ? el.closest('label').childNodes[0].textContent.trim() : '') + ', ' + (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') + ', lista. Deslizá arriba o abajo para cambiar.';
  if (el.matches('input')) return (el.closest('label') ? el.closest('label').textContent.trim() : '') + ', campo de texto. Para escribir, prendé un momento el lector de pantalla.';
  return el.textContent.trim();
}
function navEnfocar(i, decir = true) {
  navLista = elementos(); if (!navLista.length) return;
  navI = (i + navLista.length) % navLista.length;
  document.querySelectorAll('.nav-sel').forEach(e => e.classList.remove('nav-sel'));
  const el = navLista[navI]; el.classList.add('nav-sel');
  if (el.matches('button, input, select')) try { el.focus({ preventScroll: false }); } catch (e) {}
  el.scrollIntoView && el.scrollIntoView({ block: 'nearest' });
  if (decir) hablar(etiqueta(el));
}
// al abrir un menú o panel: dice el título y se para en el primer botón
function entrarMenu() {
  navLista = elementos(); if (!navLista.length) return;
  const titulo = navLista.find(e => e.matches('h1, h2'));
  const k = navLista.findIndex(e => e.matches('button'));
  navEnfocar(k >= 0 ? k : 0, false);
  hablar((titulo ? titulo.textContent.trim() + '. ' : '') + etiqueta(navLista[navI]));
}
function navActivar() {
  const el = navLista[navI]; if (!el) return;
  if (el.matches('button')) { el.click(); setTimeout(() => { if (enPartida()) return; navLista = elementos(); const f = document.activeElement; const k = navLista.indexOf(f); if (k >= 0) navEnfocar(k, true); else entrarMenu(); }, 150); }
  else if (el.matches('input[type=checkbox]')) { el.click(); hablar(el.checked ? 'Activado.' : 'Desactivado.'); }
  else if (el.matches('input:not([type=range])')) { hablar('Para escribir, prendé el lector de pantalla un momento.'); }
}
function navCambiar(p) {
  const el = navLista[navI]; if (!el) return;
  if (el.matches('input[type=range]')) { el.value = +el.value + p * (+el.step || 1); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); hablar(String(el.value)); }
  else if (el.matches('select')) { el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + p)); el.dispatchEvent(new Event('change', { bubbles: true })); hablar(el.options[el.selectedIndex].text); }
}
nav.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; navToque = { x: t.clientX, y: t.clientY, t: performance.now() }; }, { passive: false });
nav.addEventListener('touchend', e => {
  e.preventDefault(); if (!navToque) return;
  const t = e.changedTouches[0], dx = t.clientX - navToque.x, dy = t.clientY - navToque.y, dur = performance.now() - navToque.t;
  navToque = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { navEnfocar(navI + (dx > 0 ? 1 : -1)); return; }
  if (Math.abs(dy) > 40) { navCambiar(dy < 0 ? 1 : -1); return; }
  if (dur < 400) {
    const ahora = performance.now();
    if (ahora - navUltimoTap < 380) { navUltimoTap = 0; clearTimeout(nav._t); navActivar(); }
    else { navUltimoTap = ahora; nav._t = setTimeout(() => { navLista = elementos(); if (navLista[navI]) hablar(etiqueta(navLista[navI])); }, 390); }
  }
}, { passive: false });

// ================= Vibración =================
function vibrar(p) {
  if (!p || !OT.vibrar) return;
  if (window.ZAndroid) { try { window.ZAndroid.vibrar(Array.isArray(p) ? p.join(',') : String(p)); } catch (e) {} return; }
  if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {}
}
window.addEventListener('zombis', e => {
  const { t, d } = e.detail || {};
  if (t === 'herido') vibrar(Math.min(250, 60 + d.n * 4));
  else if (t === 'explosion') vibrar([0, 120, 40, 200]);
  else if (t === 'muerte' && d.cabeza) vibrar([0, 30, 30, 30]);
});
let lockAntes = null, agarreT = 0, latidoT = 0;
setInterval(() => {
  const J = Z.J; if (!J || J.pausa || J.fase === 'fin') { lockAntes = null; return; }
  if (J.lock && J.lock !== lockAntes) vibrar([18, 35, 60][J.jug.zona] || 25);
  lockAntes = J.lock;
  agarreT -= .1; latidoT -= .1;
  if (J.jug.agarrado && agarreT <= 0) { agarreT = .35; vibrar(180); }
  if (J.jug.vida < 30 && latidoT <= 0) { latidoT = 2.1; vibrar([0, 40, 120, 60]); }
}, 100);

// ================= Estado: qué capa está activa =================
let enPartidaAntes = false, wake = null;
function enPartida() { return !!Z.J && !$('#juego').hidden && !Z.J.pausa && Z.J.fase !== 'fin' && [...document.querySelectorAll('.panel')].every(p => p.hidden); }
function actualizarEstado() {
  const tactil = esTactil();
  const juega = tactil && (enPartida() || !!tutorial);
  document.body.classList.toggle('tactil-juego', juega);
  document.body.classList.toggle('tactil-botones', juega && !tutorial && conBotones());
  document.body.classList.toggle('tactil-nav', tactil && sinVer() && !juega && !tutorial && !(document.activeElement && document.activeElement.matches('input:not([type=range]):not([type=checkbox])')));
  if (juega !== enPartidaAntes) {
    enPartidaAntes = juega;
    if (!juega) { soltarTodo(); if (rapido) cerrarRapido(true); }
    if (juega) pedirPantalla(); else soltarPantalla();
    if (!juega && sinVer() && tactil) setTimeout(entrarMenu, 300);
  }
}
setInterval(actualizarEstado, 150);
async function pedirPantalla() {
  try { if (navigator.wakeLock && !wake) wake = await navigator.wakeLock.request('screen'); } catch (e) {}
}
function soltarPantalla() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden && Z.J && !$('#juego').hidden && !Z.J.pausa && Z.J.fase !== 'fin') { soltarTodo(); try { Z.pausar(); } catch (e) {} }
  if (!document.hidden && enPartidaAntes) { wake = null; pedirPantalla(); }
});
// Pantalla completa y acostado al empezar a jugar en el celular
function completa() {
  if (!esTactil()) return;
  try { const el = document.documentElement; const p = el.requestFullscreen ? el.requestFullscreen() : null; if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-mapa], #bOtra')) completa(); }, true);
// botón Atrás del celular: pausa en vez de salir
try { history.pushState({ z: 1 }, ''); addEventListener('popstate', () => { history.pushState({ z: 1 }, ''); if (Z.J && !$('#juego').hidden && !Z.J.pausa && Z.J.fase !== 'fin') Z.pausar(); else { const v = [...document.querySelectorAll('.panel')].filter(p => !p.hidden).pop(); const b = v && [...v.querySelectorAll('button')].find(b => /Cerrar|Volver|Seguir|Listo/.test(b.textContent)); if (b) b.click(); } }); } catch (e) {}

// ================= Tutorial de gestos =================
const PASOS = [
  { a: 'caminar', t: 'Caminar: apoyá un dedo en la mitad izquierda de la pantalla y corrélo hacia arriba, como un joystick. Hacia abajo vas para atrás, a los costados de costado. Si lo llevás lejos, corrés.' },
  { a: 'girar', t: 'Girar: apoyá un dedo en la mitad derecha y deslizalo a la derecha o a la izquierda. Mientras lo tenés corrido, seguís girando.' },
  { a: 'disparar', t: 'Disparar: tocá una vez la mitad derecha.' },
  { a: 'mantener', t: 'Ráfaga: mantené apoyado el dedo en la mitad derecha, sin moverlo. Las armas automáticas disparan mientras lo dejás apoyado.' },
  { a: 'cabezaArriba', t: 'Apuntar a la cabeza: en la mitad derecha, deslizá rápido para arriba. Para abajo vas al pecho y a las piernas.' },
  { a: 'golpe', t: 'Arma blanca: tocá una vez la mitad izquierda. Si un zombi te agarra, tocá varias veces rápido.' },
  { a: 'usar', t: 'Subir al árbol o trabar una puerta: mantené apoyado el dedo en la mitad izquierda, sin moverlo, hasta que vibre.' },
  { a: 'recargar', t: 'Recargar: tocá con dos dedos juntos en la mitad derecha.' },
  { a: 'armaSig', t: 'Cambiar de arma: con dos dedos, deslizá a la derecha o a la izquierda.' },
  { a: 'granada', t: 'Granada: con dos dedos, deslizá para arriba.' },
  { a: 'botiquin', t: 'Botiquín: con dos dedos, deslizá para abajo.' },
  { a: 'abrirMenu', t: 'Menú rápido: deslizá un dedo desde el borde de arriba de la pantalla hacia abajo.' },
  { a: 'menu', t: 'En el menú rápido deslizá a los costados para pasar de una opción a otra y tocá para elegir una.' }
];
function empezarTutorial() {
  let i = 0;
  tutorial = {
    paso: () => PASOS[i],
    hecho(nombre) {
      const p = PASOS[i]; if (!p) return;
      if (nombre === 'pausa') { hablar('Saliste de la práctica de gestos.'); terminarTutorial(); return; }
      const ok = nombre === p.a || (p.a === 'armaSig' && nombre === 'armaAnt') || (p.a === 'cabezaArriba' && nombre === 'zonaAbajo') || (p.a === 'caminar' && nombre === 'caminarAtras');
      if (!ok) { if (nombre !== 'caminarAtras' && nombre !== 'abrirMenu') hablar('Ese no. ' + p.t); return; }
      vibrar(40); i++;
      if (i >= PASOS.length) { hablar('¡Muy bien! Ya sabés todos los gestos. En la partida también podés pausar con el botón Atrás del celular.'); terminarTutorial(); return; }
      const sig = PASOS[i]; setTimeout(() => { if (tutorial && tutorial.paso() === sig) hablar('¡Bien! ' + sig.t); }, 350);
    }
  };
  document.body.classList.add('tactil-juego'); document.body.classList.remove('tactil-botones', 'tactil-nav');
  hablar('Práctica de gestos. Para salir cuando quieras, mantené dos dedos apoyados un segundo. ' + PASOS[0].t);
}
function terminarTutorial() {
  tutorial = null; dedos.clear(); soltarTodo();
  document.body.classList.remove('tactil-juego');
  setTimeout(entrarMenu, 1800);
}
// ================= Botones y opciones en los menús =================
function armarMenus() {
  const menu = $('#inicio .menu');
  if (menu && !$('#bSinVer')) {
    const b1 = document.createElement('button'); b1.id = 'bSinVer';
    const pintar = () => { b1.textContent = sinVer() ? 'Celular: modo sin ver activado' : 'Celular: activar modo sin ver'; };
    b1.onclick = () => {
      OT.sinVer = !sinVer(); Z.OP.vozJuego = OT.sinVer; Z.guardarOp(); guardarOT(); pintar();
      if (OT.sinVer) hablar('Modo sin ver activado. El juego habla con su propia voz. Ahora suspendé TalkBack, por ejemplo manteniendo los dos botones de volumen. Después deslizá a los costados para moverte por el menú y tocá dos veces para elegir. Empezá por Práctica de gestos.');
      else hablar('Modo sin ver desactivado.');
      const o = document.getElementById('oVoz'); if (o) o.checked = Z.OP.vozJuego;
    };
    pintar();
    const b2 = document.createElement('button'); b2.id = 'bGestos'; b2.textContent = 'Práctica de gestos (celular)';
    b2.onclick = () => { if (!esTactil()) { hablar('La práctica de gestos es para la pantalla táctil del celular.'); return; } empezarTutorial(); };
    menu.insertBefore(b1, $('#bAyuda')); menu.insertBefore(b2, $('#bAyuda'));
    if (!esTactil()) { b1.hidden = true; b2.hidden = true; }
  }
  const caja = document.querySelector('#opciones .caja');
  if (caja && !$('#oVozSel')) {
    const listo = $('#bCerrarOp');
    const l1 = document.createElement('label'); l1.className = 'campo'; l1.innerHTML = 'Voz del juego <select id="oVozSel"></select>';
    const l2 = document.createElement('label'); l2.className = 'campo'; l2.innerHTML = 'Velocidad de la voz <input id="oVelVoz" type="range" min="0.6" max="2.5" step="0.1">';
    const l3 = document.createElement('label'); l3.className = 'campo'; l3.innerHTML = 'Controles en el celular <select id="oCtrl"><option value="auto">Automático</option><option value="gestos">Solo gestos (sin botones en pantalla)</option><option value="botones">Botones en pantalla</option><option value="ambos">Gestos y botones</option></select>';
    const l4 = document.createElement('label'); l4.className = 'check'; l4.innerHTML = '<input id="oVibrar" type="checkbox"> Vibrar (zombi en la mira, te agarran, te lastiman)';
    for (const l of [l1, l2, l3, l4]) caja.insertBefore(l, listo);
    const sel = $('#oVozSel');
    const llenar = () => {
      const voces = 'speechSynthesis' in window ? speechSynthesis.getVoices() : [];
      const orden = [...voces].sort((a, b) => (/^es/i.test(b.lang) ? 1 : 0) - (/^es/i.test(a.lang) ? 1 : 0));
      sel.innerHTML = '<option value="">La del sistema</option>' + orden.map(v => `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name} (${v.lang})</option>`).join('');
      sel.value = Z.OP.voz || '';
    };
    llenar();
    if (window.ZAndroid) { l1.innerHTML = 'Voz del juego: la que tengas elegida en Android (Ajustes, Accesibilidad, Salida de texto a voz). Ahí podés poner Eloquence u otra.'; }
    if ('speechSynthesis' in window) speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', llenar);
    sel.onchange = () => { Z.OP.voz = sel.value; Z.guardarOp(); if (Z.OP.vozJuego) hablar('Esta es la voz del juego.'); };
    const vel = $('#oVelVoz'); vel.value = Z.OP.velVoz || 1.25;
    vel.onchange = () => { Z.OP.velVoz = +vel.value; Z.guardarOp(); if (Z.OP.vozJuego) hablar('Velocidad ' + vel.value + '.'); };
    const ct = $('#oCtrl'); ct.value = OT.controles; ct.onchange = () => { OT.controles = ct.value; guardarOT(); };
    const vb = $('#oVibrar'); vb.checked = OT.vibrar; vb.onchange = () => { OT.vibrar = vb.checked; guardarOT(); vibrar(80); };
    if (!esTactil()) { l3.hidden = true; l4.hidden = true; }
  }
  // en la ayuda, cómo se juega en el celular
  const ay = document.querySelector('#ayuda .caja');
  if (ay && !$('#ayudaCel')) {
    const h = document.createElement('h3'); h.id = 'ayudaCel'; h.textContent = 'En el celular';
    const ul = document.createElement('ul');
    ul.innerHTML = PASOS.slice(0, 12).map(p => `<li>${p.t}</li>`).join('') + '<li>Con dos dedos mantenidos: pausa. También con el botón Atrás.</li><li>En la tienda: arriba y abajo los productos, a los costados las secciones, un toque compra y dos dedos sale.</li><li>Modo sin ver: en los menús deslizá a los costados para moverte, tocá dos veces para elegir y deslizá arriba o abajo para cambiar un valor.</li>';
    const ref = $('#pruebas') ? $('#pruebas').previousElementSibling : null;
    if (ref) { ay.insertBefore(h, ref); ay.insertBefore(ul, ref); } else { ay.appendChild(h); ay.appendChild(ul); }
  }
}
armarMenus();
window.TACTIL = { _int: () => ({ OT, dedos, abiertas, tutorial: () => tutorial, empezarTutorial, abrirRapido }) };
})();
