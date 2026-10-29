// Zombis - gráficos en 3D, primera persona.
// Lee el estado del juego (window.__zombis) y lo dibuja; no cambia nada de la partida.
(() => {
'use strict';
const THREE = window.THREE, Z = window.__zombis;
if (!THREE || !Z) return;

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const elegir = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const VACIO = 0, PARED = 1, PUERTA = 2, ARBOL = 3, BARRICADA = 4;
const ALTO_PARED = 2.9;

// ================= Calidad =================
const CAL = {
  alta:  { pr: 2,    sombra: 2048, sombras: true,  luzSombra: true,  pasto: 1,   part: 1,   lamparas: 6 },
  media: { pr: 1.25, sombra: 1024, sombras: true,  luzSombra: false, pasto: .55, part: .7,  lamparas: 4 },
  baja:  { pr: .85,  sombra: 0,    sombras: false, luzSombra: false, pasto: .25, part: .45, lamparas: 2 }
};
let modo = 'alta';
try { modo = localStorage.getItem('zombis-graficos') || 'alta'; } catch (e) {}
if (!CAL[modo] && modo !== 'apagados') modo = 'alta';
const Qc = () => CAL[modo] || CAL.baja;

// ================= Renderer =================
const lienzoVista = document.createElement('canvas');
lienzoVista.id = 'vista';
lienzoVista.setAttribute('aria-hidden', 'true');
document.body.prepend(lienzoVista);
const velo = document.createElement('div');
velo.id = 'velo'; velo.setAttribute('aria-hidden', 'true');
document.body.prepend(velo);
document.body.prepend(lienzoVista);

let R;
try {
  R = new THREE.WebGLRenderer({ canvas: lienzoVista, antialias: modo !== 'baja', powerPreference: 'high-performance' });
} catch (e) { lienzoVista.remove(); velo.remove(); return; }
R.outputEncoding = THREE.sRGBEncoding;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
R.autoClear = false;
const ANISO = Math.min(8, R.capabilities.getMaxAnisotropy());

const escena = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(72, 1, .05, 220);
cam.rotation.order = 'YXZ';
const vmEscena = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(52, 1, .01, 10);
let escalaPuntos = 500;

function redimensionar() {
  const w = innerWidth, h = innerHeight;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, Qc().pr));
  R.setSize(w, h, false);
  cam.aspect = vmCam.aspect = w / h;
  cam.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  escalaPuntos = h * R.getPixelRatio() / (2 * Math.tan(cam.fov * Math.PI / 360));
}
addEventListener('resize', redimensionar);
redimensionar();

// ================= Texturas dibujadas =================
function lienzo(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function tex(c, rx = 1, ry = rx, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = ANISO;
  return t;
}
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
function manchas(g, w, h, n, f) { for (let i = 0; i < n; i++) { const x = Math.random() * w, y = Math.random() * h, r = f.r(); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, f.c()); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); } } }
function granos(g, w, h, n, col) { for (let i = 0; i < n; i++) { g.fillStyle = col(); g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } }

const TX = {};
function T(nombre) { if (!TX[nombre]) TX[nombre] = GEN[nombre](); return TX[nombre]; }
const GEN = {
  pasto: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#34502a'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 40, { r: () => rnd(15, 50), c: () => hsl(rnd(80, 110), rnd(30, 50), rnd(14, 30), .5) });
    for (let i = 0; i < 4000; i++) { const x = Math.random() * w, y = Math.random() * h, l = rnd(3, 9), a = rnd(-.6, .6); g.strokeStyle = hsl(rnd(70, 115), rnd(30, 60), rnd(18, 42), .8); g.lineWidth = rnd(.6, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke(); }
    granos(g, w, h, 300, () => hsl(30, 30, rnd(15, 30), .7));
  }),
  hojas: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2e1c'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 30, { r: () => rnd(20, 60), c: () => hsl(rnd(20, 45), 40, rnd(10, 22), .6) });
    for (let i = 0; i < 900; i++) { g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * TAU); const s = rnd(3, 8); g.fillStyle = hsl(elegir([25, 35, 45, 60, 80]), rnd(35, 65), rnd(16, 38), .9); g.beginPath(); g.ellipse(0, 0, s, s * .45, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,12,5,.5)'; g.lineWidth = .5; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore(); }
  }),
  tierra: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#4e3d2b'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 60, { r: () => rnd(10, 40), c: () => hsl(rnd(22, 35), rnd(20, 35), rnd(16, 34), .5) });
    for (let i = 0; i < 260; i++) { g.fillStyle = hsl(30, rnd(5, 20), rnd(25, 50), .9); g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(1, 3.5), rnd(1, 2.5), Math.random() * 3, 0, TAU); g.fill(); }
    granos(g, w, h, 1500, () => hsl(28, 25, rnd(10, 40), .6));
  }),
  barro: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#2f251b'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 50, { r: () => rnd(10, 45), c: () => hsl(rnd(20, 30), 30, rnd(8, 20), .7) });
    manchas(g, w, h, 18, { r: () => rnd(6, 20), c: () => 'rgba(140,150,150,.18)' });
    granos(g, w, h, 900, () => hsl(25, 20, rnd(8, 25), .6));
  }),
  arena: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#c49a62'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 40, { r: () => rnd(20, 70), c: () => hsl(rnd(28, 38), rnd(40, 55), rnd(48, 66), .4) });
    for (let y = 0; y < h; y += 6) { g.strokeStyle = 'rgba(120,80,40,.18)'; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / 18 + y * .3) * 2.5); g.stroke(); }
    granos(g, w, h, 2500, () => hsl(30, 40, rnd(35, 80), .6));
  }),
  madera: () => lienzo(512, 512, (g, w, h) => {
    const filas = 8, alto = h / filas;
    for (let r = 0; r < filas; r++) {
      let x = -rnd(0, 200);
      while (x < w) {
        const largo = rnd(160, 320), l = rnd(20, 32);
        g.fillStyle = hsl(rnd(22, 30), rnd(35, 50), l); g.fillRect(x, r * alto, largo, alto);
        for (let k = 0; k < 14; k++) { g.strokeStyle = hsl(25, 40, l - rnd(4, 10), .5); g.lineWidth = rnd(.5, 1.5); g.beginPath(); const yy = r * alto + rnd(2, alto - 2); g.moveTo(x, yy); g.bezierCurveTo(x + largo * .3, yy + rnd(-3, 3), x + largo * .6, yy + rnd(-3, 3), x + largo, yy + rnd(-2, 2)); g.stroke(); }
        g.fillStyle = 'rgba(10,5,2,.85)'; g.fillRect(x, r * alto, 2, alto);
        x += largo;
      }
      g.fillStyle = 'rgba(10,5,2,.9)'; g.fillRect(0, r * alto, w, 2);
    }
    manchas(g, w, h, 25, { r: () => rnd(20, 80), c: () => 'rgba(15,8,3,.35)' });
  }),
  baldosa: () => lienzo(256, 256, (g, w, h) => {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? hsl(40, 15, rnd(62, 70)) : hsl(30, 8, rnd(28, 34)); g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = 'rgba(30,25,20,.9)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    manchas(g, w, h, 30, { r: () => rnd(10, 50), c: () => 'rgba(60,45,25,.25)' });
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(20,15,10,.6)'; g.lineWidth = .8; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rnd(-15, 15); y += rnd(-15, 15); g.lineTo(x, y); } g.stroke(); }
  }),
  detalle: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 120, { r: () => rnd(4, 30), c: () => `rgba(${Math.random() < .5 ? '90,90,90' : '170,170,170'},.35)` });
    granos(g, w, h, 5000, () => `rgba(${Math.random() < .5 ? 70 : 190},${Math.random() < .5 ? 70 : 190},${Math.random() < .5 ? 70 : 190},.35)`);
  }),
  corteza: () => lienzo(128, 256, (g, w, h) => {
    g.fillStyle = '#3b2c20'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w; g.strokeStyle = hsl(rnd(20, 30), rnd(15, 30), rnd(8, 30), .8); g.lineWidth = rnd(1, 4); g.beginPath(); g.moveTo(x, 0); let xx = x; for (let y = 0; y <= h; y += 16) { xx += rnd(-3, 3); g.lineTo(xx, y); } g.stroke(); }
    manchas(g, w, h, 12, { r: () => rnd(6, 20), c: () => 'rgba(70,90,40,.35)' });
  }),
  cortezaClara: () => lienzo(128, 256, (g, w, h) => {
    g.fillStyle = '#8d8070'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) { const x = Math.random() * w; g.strokeStyle = hsl(30, 10, rnd(30, 55), .7); g.lineWidth = rnd(1, 3); g.beginPath(); g.moveTo(x, 0); let xx = x; for (let y = 0; y <= h; y += 16) { xx += rnd(-2, 2); g.lineTo(xx, y); } g.stroke(); }
  }),
  hoja: () => lienzo(256, 256, (g, w, h) => {
    for (let i = 0; i < 70; i++) {
      const x = rnd(25, w - 25), y = rnd(25, h - 25), s = rnd(12, 24), a = Math.random() * TAU;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = hsl(rnd(85, 120), rnd(35, 60), rnd(22, 42));
      g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * .55, s, 0); g.quadraticCurveTo(0, s * .55, -s, 0); g.fill();
      g.strokeStyle = 'rgba(200,230,150,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke();
      g.restore();
    }
  }),
  pino: () => lienzo(256, 256, (g, w, h) => {
    for (let i = 0; i < 1600; i++) { const x = rnd(10, w - 10), y = rnd(10, h - 10), a = rnd(-1, 1) + Math.PI / 2, l = rnd(8, 18); g.strokeStyle = hsl(rnd(110, 140), rnd(25, 45), rnd(14, 30)); g.lineWidth = rnd(1, 2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }),
  palma: () => lienzo(128, 512, (g, w, h) => {
    g.strokeStyle = '#4b5e24'; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
    for (let y = 8; y < h; y += 7) { const l = (w / 2 - 4) * Math.sin(Math.PI * y / h) + 6; g.strokeStyle = hsl(rnd(75, 100), rnd(40, 55), rnd(22, 35)); g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * l * .5, y + 6, w / 2 + s * l, y + 16); g.stroke(); } }
  }),
  mata: () => lienzo(128, 128, (g, w, h) => {
    for (let i = 0; i < 46; i++) {
      const x0 = rnd(20, w - 20), l = rnd(50, 120), c = rnd(-30, 30);
      const gr = g.createLinearGradient(0, h, 0, h - l); gr.addColorStop(0, hsl(rnd(70, 95), 40, 10)); gr.addColorStop(1, hsl(rnd(70, 110), rnd(35, 60), rnd(30, 48)));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - 2.5, h); g.quadraticCurveTo(x0 + c * .4, h - l * .6, x0 + c, h - l); g.quadraticCurveTo(x0 + c * .4 + 1, h - l * .6, x0 + 2.5, h); g.fill();
    }
  }),
  matSeca: () => lienzo(128, 128, (g, w, h) => {
    for (let i = 0; i < 30; i++) { const x0 = rnd(30, w - 30), l = rnd(30, 90), c = rnd(-50, 50); g.strokeStyle = hsl(rnd(30, 45), rnd(25, 45), rnd(30, 55)); g.lineWidth = rnd(1, 2.5); g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + c * .3, h - l * .5, x0 + c, h - l); g.stroke(); }
  }),
  helecho: () => lienzo(256, 256, (g, w, h) => {
    for (let f = 0; f < 7; f++) {
      g.save(); g.translate(w / 2, h); g.rotate(rnd(-1.1, 1.1));
      const l = rnd(150, 230);
      g.strokeStyle = '#2e4a1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -l * .5, 0, -l); g.stroke();
      for (let y = 15; y < l; y += 7) { const s = 26 * Math.sin(Math.PI * y / l); g.fillStyle = hsl(rnd(85, 110), rnd(40, 60), rnd(20, 35)); for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * s * .5, -y, s * .55, 3, d * .4, 0, TAU); g.fill(); } }
      g.restore();
    }
  }),
  pared: () => lienzo(256, 720, (g, w, h) => {
    const base = 470;
    g.fillStyle = '#6e6450'; g.fillRect(0, 0, w, base);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(90,70,45,.35)'; g.fillRect(x, 0, 12, base); }
    for (let y = 20; y < base; y += 60) for (let x = 16; x < w; x += 64) { g.fillStyle = 'rgba(120,95,60,.35)'; g.beginPath(); g.ellipse(x + (y / 60 % 2) * 32, y, 6, 10, 0, 0, TAU); g.fill(); }
    manchas(g, w, base, 16, { r: () => rnd(30, 90), c: () => 'rgba(55,40,20,.35)' });
    for (let i = 0; i < 5; i++) { const x = rnd(0, w); const gr = g.createLinearGradient(0, 0, 0, rnd(150, 400)); gr.addColorStop(0, 'rgba(60,45,25,.5)'); gr.addColorStop(1, 'rgba(60,45,25,0)'); g.fillStyle = gr; g.fillRect(x, 0, rnd(10, 40), 420); }
    g.fillStyle = '#3d2818'; g.fillRect(0, base, w, h - base);
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, base + 20, 3, h - base - 60); g.strokeStyle = 'rgba(120,80,45,.35)'; g.strokeRect(x + 10, base + 30, 44, h - base - 90); }
    g.fillStyle = '#2b1b10'; g.fillRect(0, base, w, 14); g.fillRect(0, h - 40, w, 40);
    g.fillStyle = 'rgba(160,110,60,.3)'; g.fillRect(0, base + 12, w, 3);
    manchas(g, w, h, 6, { r: () => rnd(10, 40), c: () => 'rgba(0,0,0,.25)' });
  }),
  techo: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#8b8577'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 30, { r: () => rnd(15, 70), c: () => Math.random() < .5 ? 'rgba(70,55,35,.35)' : 'rgba(160,155,140,.3)' });
    for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(40,35,30,.5)'; g.lineWidth = .8; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rnd(-20, 20); y += rnd(-20, 20); g.lineTo(x, y); } g.stroke(); }
  }),
  puerta: () => lienzo(128, 256, (g, w, h) => {
    g.fillStyle = '#5a3a20'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = hsl(25, 40, rnd(15, 30), .5); g.lineWidth = 1; g.beginPath(); const x = Math.random() * w; g.moveTo(x, 0); g.lineTo(x + rnd(-4, 4), h); g.stroke(); }
    g.strokeStyle = 'rgba(20,10,5,.7)'; g.lineWidth = 4;
    g.strokeRect(14, 14, w - 28, h * .42); g.strokeRect(14, h * .5, w - 28, h * .45);
    g.fillStyle = '#b08a3a'; g.beginPath(); g.arc(w - 18, h * .52, 5, 0, TAU); g.fill();
    manchas(g, w, h, 5, { r: () => rnd(8, 25), c: () => 'rgba(90,10,5,.45)' });
  }),
  tabla: () => lienzo(256, 64, (g, w, h) => {
    g.fillStyle = '#7a5a36'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 25; i++) { g.strokeStyle = hsl(28, 35, rnd(25, 45), .6); g.lineWidth = rnd(.5, 2); g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(80, y + rnd(-4, 4), 170, y + rnd(-4, 4), w, y + rnd(-3, 3)); g.stroke(); }
    g.fillStyle = '#222'; for (const x of [10, w - 14]) { g.beginPath(); g.arc(x, h / 2, 3, 0, TAU); g.fill(); }
  }),
  piel: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#9a9c86'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, 70, { r: () => rnd(8, 40), c: () => elegir(['rgba(90,110,80,.45)', 'rgba(120,90,90,.4)', 'rgba(60,60,50,.4)', 'rgba(170,165,140,.35)']) });
    for (let i = 0; i < 25; i++) { g.strokeStyle = 'rgba(90,40,70,.4)'; g.lineWidth = rnd(.6, 1.6); g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-14, 14); y += rnd(-14, 14); g.lineTo(x, y); } g.stroke(); }
    manchas(g, w, h, 40, { r: () => rnd(10, 45), c: () => elegir(['rgba(40,45,30,.5)', 'rgba(70,50,35,.45)', 'rgba(25,25,20,.45)']) });
    manchas(g, w, h, 18, { r: () => rnd(6, 22), c: () => 'rgba(100,10,8,.75)' });
    manchas(g, w, h, 12, { r: () => rnd(4, 12), c: () => 'rgba(40,12,8,.85)' });
    // chorreadas de sangre seca
    for (let i = 0; i < 12; i++) { const x = Math.random() * w, y = Math.random() * h, l = rnd(20, 70); const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(90,8,6,.8)'); gr.addColorStop(1, 'rgba(90,8,6,0)'); g.fillStyle = gr; g.fillRect(x, y, rnd(2, 6), l); }
  }),
  ropa: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${rnd(.02, .08)})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${rnd(.01, .05)})`; g.fillRect(x, 0, 1, h); }
    manchas(g, w, h, 30, { r: () => rnd(10, 50), c: () => 'rgba(60,45,30,.35)' });
    manchas(g, w, h, 14, { r: () => rnd(8, 35), c: () => 'rgba(110,10,8,.75)' });
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(30,20,15,.85)'; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) g.lineTo(x + rnd(-14, 14), y + rnd(-10, 10)); g.fill(); }
  }),
  sangre: () => lienzo(128, 128, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = 'rgba(95,5,5,.95)';
    g.beginPath(); g.arc(c, c, rnd(18, 26), 0, TAU); g.fill();
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, d = rnd(15, 55), r = rnd(2, 9); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0, TAU); g.fill(); g.lineWidth = r * .8; g.strokeStyle = 'rgba(95,5,5,.9)'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * d, c + Math.sin(a) * d); g.stroke(); }
    const gr = g.createRadialGradient(c, c, 2, c, c, 30); gr.addColorStop(0, 'rgba(160,20,15,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
  quemado: () => lienzo(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(5,4,3,.95)'); gr.addColorStop(.6, 'rgba(15,12,10,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
  suave: () => lienzo(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  humo: () => lienzo(128, 128, (g, w, h) => { for (let i = 0; i < 26; i++) { const x = 64 + rnd(-28, 28), y = 64 + rnd(-28, 28), r = rnd(14, 34); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }),
  fogonazo: () => lienzo(128, 128, (g, w, h) => {
    g.translate(64, 64);
    for (let i = 0; i < 9; i++) { g.rotate(TAU / 9 + rnd(-.2, .2)); const l = rnd(30, 62); const gr = g.createLinearGradient(0, 0, l, 0); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.5, 'rgba(255,170,60,.7)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -6); g.lineTo(l, 0); g.lineTo(0, 6); g.fill(); }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 28); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(1, 'rgba(255,160,50,0)'); g.fillStyle = gr; g.fillRect(-64, -64, 128, 128);
  }),
  cartel: () => lienzo(512, 160, (g, w, h) => {
    g.fillStyle = '#2a1a0e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8a640'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffd36a'; g.font = 'bold 96px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff9a2a'; g.shadowBlur = 20; g.fillText('TIENDA', w / 2, h / 2 + 4);
  }),
  toldo: () => lienzo(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#e8dcc0' : '#9e2a22'; g.fillRect(x, 0, 32, h); } manchas(g, w, h, 12, { r: () => rnd(8, 25), c: () => 'rgba(40,25,10,.35)' }); }),
  cuadro: () => lienzo(128, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, hsl(rnd(0, 360), 25, 25)); gr.addColorStop(1, hsl(rnd(0, 360), 30, 12)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(w / 2, h * .45, 26, 34, 0, 0, TAU); g.fill(); g.fillRect(w / 2 - 34, h * .62, 68, 60);
    g.strokeStyle = '#6b4a1e'; g.lineWidth = 12; g.strokeRect(0, 0, w, h);
  }),
  alfombra: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#5a1e1a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c29a52'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 2; g.strokeRect(30, 30, w - 60, h - 60);
    g.save(); g.translate(w / 2, h / 2); for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); g.fillStyle = 'rgba(194,154,82,.6)'; g.beginPath(); g.ellipse(40, 0, 30, 10, 0, 0, TAU); g.fill(); } g.restore();
    manchas(g, w, h, 20, { r: () => rnd(10, 50), c: () => 'rgba(20,10,5,.4)' });
  }),
  ventana: () => lienzo(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fb8ff'); gr.addColorStop(1, '#3a4e88'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  metal: () => lienzo(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},.05)`; g.fillRect(Math.random() * w, Math.random() * h, rnd(2, 30), 1); } manchas(g, w, h, 6, { r: () => rnd(5, 20), c: () => 'rgba(90,50,20,.25)' }); }),
  municion: () => lienzo(128, 64, (g, w, h) => { g.fillStyle = '#4a5530'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8d070'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AMMO', w / 2, h / 2); manchas(g, w, h, 8, { r: () => rnd(5, 15), c: () => 'rgba(20,20,10,.4)' }); }),
  botiquin: () => lienzo(128, 128, (g, w, h) => { g.fillStyle = '#e8e4dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4161c'; g.fillRect(48, 22, 32, 84); g.fillRect(22, 48, 84, 32); manchas(g, w, h, 6, { r: () => rnd(5, 18), c: () => 'rgba(80,60,40,.3)' }); }),
  cajon: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#7b5a35'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 42) { g.fillStyle = hsl(28, 40, rnd(25, 35)); g.fillRect(0, y, w, 40); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, y + 40, w, 2); }
    g.strokeStyle = '#3a2814'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18); g.beginPath(); g.moveTo(9, 9); g.lineTo(w - 9, h - 9); g.stroke();
    g.fillStyle = 'rgba(230,230,230,.85)'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillText('SUMINISTROS', w / 2, h / 2 + 50);
  })
};

// ================= Materiales =================
const M = {};
function mat(nombre) {
  if (M[nombre]) return M[nombre];
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const crear = {
    corteza: () => S({ map: tex(T('corteza'), 1, 3), roughness: .95, color: '#c8b8a8' }),
    cortezaClara: () => S({ map: tex(T('cortezaClara'), 1, 3), roughness: .9 }),
    pared: () => S({ map: tex(T('pared')), roughness: .9 }),
    techo: () => S({ map: tex(T('techo'), 1, 1), roughness: 1, side: THREE.DoubleSide }),
    puerta: () => S({ map: tex(T('puerta')), roughness: .7 }),
    tabla: () => S({ map: tex(T('tabla')), roughness: .8 }),
    madera: () => S({ color: '#6b4425', roughness: .6, map: tex(T('tabla'), 1, 1) }),
    maderaOsc: () => S({ color: '#3a2414', roughness: .65 }),
    metalOsc: () => S({ color: '#26282b', metalness: .7, roughness: .45, map: tex(T('metal')), envMapIntensity: .35 }),
    metalClaro: () => S({ color: '#6a6f76', metalness: .8, roughness: .32, map: tex(T('metal')), envMapIntensity: .45 }),
    acero: () => S({ color: '#b9bec4', metalness: .95, roughness: .22, envMapIntensity: .6 }),
    polimero: () => S({ color: '#1c1d1e', roughness: .75, metalness: .1 }),
    bronce: () => S({ color: '#c0913c', metalness: 1, roughness: .28 }),
    vidrio: () => S({ color: '#152030', metalness: .9, roughness: .05 }),
    guante: () => S({ color: '#222420', roughness: .9 }),
    manga: () => S({ color: '#39402f', roughness: .95, map: tex(T('ropa')) }),
    naranja: () => S({ color: '#d0661c', roughness: .5 }),
    oliva: () => S({ color: '#4b5530', roughness: .7 }),
    hueso: () => S({ color: '#d9cfb3', roughness: .6 }),
    roca: () => S({ color: '#7d776d', roughness: .95, flatShading: true }),
    rocaArena: () => S({ color: '#7d5f43', roughness: 1, flatShading: true }),
    cactus: () => S({ color: '#33492a', roughness: .85, flatShading: true }),
    estaca: () => S({ color: '#5a4430', roughness: .9, map: tex(T('corteza'), 1, 2) }),
    municion: () => S({ map: tex(T('municion')), roughness: .7 }),
    botiquin: () => S({ map: tex(T('botiquin')), roughness: .6 }),
    cajon: () => S({ map: tex(T('cajon')), roughness: .8 }),
    toldo: () => S({ map: tex(T('toldo'), 2, 1), roughness: .9, side: THREE.DoubleSide }),
    tela: () => S({ color: '#d8d0bd', roughness: 1, side: THREE.DoubleSide }),
    paracaidas: () => S({ color: '#cf3b25', roughness: .9, side: THREE.DoubleSide }),
    alfombra: () => S({ map: tex(T('alfombra')), roughness: 1 }),
    cartel: () => new THREE.MeshBasicMaterial({ map: tex(T('cartel')), toneMapped: false }),
    foco: () => new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false }),
    focoRojo: () => new THREE.MeshBasicMaterial({ color: '#ff3020', toneMapped: false }),
    ventana: () => new THREE.MeshBasicMaterial({ map: tex(T('ventana')), color: '#6f84b8' }),
    sangre: () => new THREE.MeshBasicMaterial({ map: tex(T('sangre')), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: '#9a9a9a' }),
    quemado: () => new THREE.MeshBasicMaterial({ map: tex(T('quemado')), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }),
    brillo: () => new THREE.MeshBasicMaterial({ map: tex(T('suave')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    fogonazo: () => new THREE.MeshBasicMaterial({ map: tex(T('fogonazo')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })
  };
  M[nombre] = crear[nombre]();
  return M[nombre];
}

// Viento en hojas y pasto
const uTiempo = { value: 0 };
function conViento(m, fuerza, desde) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTiempo = uTiempo;
    sh.vertexShader = 'uniform float uTiempo;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 semillaV = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
      #else
        vec2 semillaV = vec2(0.0);
      #endif
      float hV = max(position.y - ${desde.toFixed(2)}, 0.0);
      transformed.x += sin(uTiempo * 1.6 + semillaV.x * 0.7 + semillaV.y * 0.3) * ${fuerza.toFixed(3)} * hV;
      transformed.z += cos(uTiempo * 1.3 + semillaV.y * 0.6) * ${(fuerza * .7).toFixed(3)} * hV;`);
  };
  return m;
}
function matHojas(nombre, color, fuerza = .025, desde = 2) {
  const m = new THREE.MeshStandardMaterial({ map: tex(T(nombre)), alphaTest: .45, side: THREE.DoubleSide, roughness: .85, color });
  return conViento(m, fuerza, desde);
}
function profundidadHojas(m) { return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: .45 }); }

// ================= Geometrías =================
function unir(geos) {
  const partes = geos.map(g => g.index ? g.toNonIndexed() : g);
  const total = partes.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of partes) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  r.computeBoundingSphere();
  return r;
}
function geoTronco(alto, r0, r1, ramas = 0, curva = 0) {
  const gs = [];
  const t = new THREE.CylinderGeometry(r1, r0, alto, 9, 8, true);
  const p = t.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + alto / 2, k = y / alto;
    p.setX(i, p.getX(i) * (1 + Math.sin(y * 3 + p.getZ(i) * 5) * .08) + curva * k * k);
    p.setZ(i, p.getZ(i) * (1 + Math.cos(y * 2.3 + p.getX(i) * 4) * .08));
    p.setY(i, y);
  }
  t.computeVertexNormals();
  // raíces: base ensanchada
  const base = new THREE.CylinderGeometry(r0 * 1.05, r0 * 1.7, .5, 9, 1, true); base.translate(0, .25, 0);
  gs.push(t, base);
  for (let i = 0; i < ramas; i++) {
    const l = rnd(1.2, 2.2), b = new THREE.CylinderGeometry(r1 * .35, r1 * .8, l, 6, 1, true);
    b.translate(0, l / 2, 0); b.rotateZ(rnd(.7, 1.1)); b.rotateY(i / ramas * TAU + rnd(-.4, .4)); b.translate(curva * .7, alto * rnd(.6, .85), 0);
    gs.push(b);
  }
  return unir(gs);
}
// árbol seco del desierto: tronco torcido con ramas que se abren en ramitas
function geoArbolSeco() {
  const gs = [geoTronco(2.6, .24, .13, 0, .25)];
  const rama = (x, y, z, l, r, inc, gir, nivel) => {
    const c = new THREE.CylinderGeometry(r * .55, r, l, 6, 1, true); c.translate(0, l / 2, 0); c.rotateZ(inc); c.rotateY(gir); c.translate(x, y, z); gs.push(c);
    if (nivel <= 0) return;
    const fx = x + Math.sin(inc) * -l * Math.cos(gir) * -1, fy = y + Math.cos(inc) * l, fz = z + Math.sin(inc) * l * Math.sin(gir) * -1;
    const ex = x - Math.sin(inc) * l * Math.cos(gir), ez = z + Math.sin(inc) * l * Math.sin(gir);
    for (let i = 0; i < 2; i++) rama(ex, fy, ez, l * rnd(.55, .75), r * .6, inc + rnd(-.5, .5), gir + rnd(-.9, .9), nivel - 1);
    void fx; void fz;
  };
  for (let i = 0; i < 4; i++) rama(.25, rnd(1.8, 2.5), 0, rnd(1, 1.6), .09, rnd(.5, .9), i / 4 * TAU + rnd(-.3, .3), 2);
  return unir(gs);
}
function geoCopa(n, rx, ry, cy, tam = 1.3) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const q = new THREE.PlaneGeometry(tam * rnd(.8, 1.2), tam * rnd(.8, 1.2));
    q.rotateX(rnd(0, TAU)); q.rotateY(rnd(0, TAU)); q.rotateZ(rnd(0, TAU));
    const u = Math.random() * TAU, v = Math.acos(rnd(-1, 1)), r = Math.cbrt(Math.random()) * .9 + .1;
    const x = Math.sin(v) * Math.cos(u) * rx * r, y = Math.cos(v) * ry * r, z = Math.sin(v) * Math.sin(u) * rx * r;
    q.translate(x, y + cy, z);
    // normales hacia afuera para que la copa se ilumine como un volumen
    const nrm = q.attributes.normal, ps = q.attributes.position;
    for (let k = 0; k < nrm.count; k++) { const vx = ps.getX(k), vy = ps.getY(k) - cy, vz = ps.getZ(k); const l = Math.hypot(vx, vy, vz) || 1; nrm.setXYZ(k, vx / l, vy / l + .3, vz / l); }
    gs.push(q);
  }
  return unir(gs);
}
function geoPino(alto) {
  const gs = [];
  const capas = 7;
  for (let c = 0; c < capas; c++) {
    const k = c / capas, y = 1.6 + k * (alto - 2), r = (1 - k) * 2.1 + .35;
    for (let i = 0; i < 9; i++) {
      const q = new THREE.PlaneGeometry(r * 1.3, 1.1);
      q.translate(r * .55, 0, 0); q.rotateZ(-.35 - rnd(0, .2)); q.rotateY(i / 9 * TAU + c * .5 + rnd(-.2, .2)); q.translate(0, y, 0);
      const nrm = q.attributes.normal, ps = q.attributes.position;
      for (let kk = 0; kk < nrm.count; kk++) { const vx = ps.getX(kk), vz = ps.getZ(kk); const l = Math.hypot(vx, vz) || 1; nrm.setXYZ(kk, vx / l, .6, vz / l); }
      gs.push(q);
    }
  }
  return unir(gs);
}
function geoPalma(alto) {
  const gs = [];
  for (let i = 0; i < 9; i++) {
    const l = rnd(2.4, 3.2), q = new THREE.PlaneGeometry(.9, l, 1, 6);
    q.translate(0, l / 2, 0);
    const p = q.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k), t = y / l; p.setZ(k, -t * t * l * .7); p.setY(k, y * (1 - t * .25)); }
    q.computeVertexNormals();
    q.rotateX(-.5 - rnd(0, .4)); q.rotateY(i / 9 * TAU + rnd(-.2, .2)); q.translate(alto * .12, alto, 0);
    gs.push(q);
  }
  return unir(gs);
}
function geoMata(ancho, alto) {
  const gs = [];
  for (let i = 0; i < 3; i++) { const q = new THREE.PlaneGeometry(ancho, alto); q.translate(0, alto / 2, 0); q.rotateY(i * Math.PI / 3); const n = q.attributes.normal; for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0); gs.push(q); }
  return unir(gs);
}
function geoRoca(r) {
  const g = new THREE.IcosahedronGeometry(r, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const f = 1 + Math.sin(p.getX(i) * 7 + p.getZ(i) * 3) * .18 + Math.cos(p.getY(i) * 9) * .1; p.setXYZ(i, p.getX(i) * f, Math.max(-r * .3, p.getY(i) * f * .65), p.getZ(i) * f); }
  g.computeVertexNormals(); return g;
}

// ================= Cielo =================
const cieloMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, cC: { value: new THREE.Color() }, solDir: { value: new THREE.Vector3(0, 1, 0) }, solCol: { value: new THREE.Color() }, estrellas: { value: 0 }, nubes: { value: .5 }, disco: { value: 1 }, t: uTiempo, flash: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 cA, cB, cC, solCol, solDir; uniform float estrellas, nubes, disco, t, flash; varying vec3 vDir;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float s=0.0, a=.5; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }
    void main(){
      vec3 d = normalize(vDir); float y = d.y;
      vec3 col = mix(cC, cB, smoothstep(-0.05, 0.22, y));
      col = mix(col, cA, smoothstep(0.22, 0.85, y));
      col = mix(col, cC * 0.35, smoothstep(0.0, -0.3, y));
      float sd = max(dot(d, normalize(solDir)), 0.0);
      col += solCol * (pow(sd, 6.0) * 0.35 + pow(sd, 60.0) * 0.6);
      col += solCol * smoothstep(0.9993, 0.9997, sd) * 3.0 * disco;
      float st = step(0.9965, h(floor(d * 380.0))) * smoothstep(0.05, 0.4, y);
      col += vec3(st) * estrellas * (0.6 + 0.4 * sin(t * 3.0 + h(floor(d*380.0)) * 40.0));
      float c = fbm(vec3(d.xz / max(y + 0.25, 0.08) * 1.6 + vec2(t * 0.01, 0.0), t * 0.02).xzy);
      float cm = smoothstep(0.45, 0.85, c) * smoothstep(-0.02, 0.25, y) * nubes;
      col = mix(col, mix(cC * 0.6, cB * 1.1, smoothstep(0.0, 0.6, y)) + solCol * pow(sd, 4.0) * 0.4, cm * 0.85);
      col += vec3(0.75, 0.8, 1.0) * flash * (0.5 + cm);
      gl_FragColor = vec4(col, 1.0);
    }`
});
const cielo = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), cieloMat);
cielo.frustumCulled = false; cielo.renderOrder = -10;
escena.add(cielo);

// ================= Paletas por mapa =================
const PAL = {
  bosque:   { cA: '#070d22', cB: '#26335c', cC: '#6d5470', sol: [-.5, .32, -.7], solCol: '#a8b8ff', solInt: 1.1, hemiA: '#5b6fa5', hemiB: '#1a2214', hemi: .55, niebla: '#1c2440', dens: .032, estrellas: 1, nubes: .45, exp: 1.25, part: 'luciernagas', linterna: 1, disco: 1 },
  selva:    { cA: '#151d1e', cB: '#3a4744', cC: '#5d6a62', sol: [.3, .6, -.4], solCol: '#8a9a95', solInt: .55, hemiA: '#6f8580', hemiB: '#18200f', hemi: .7, niebla: '#2e3a36', dens: .042, estrellas: 0, nubes: 1, exp: 1.2, part: 'lluvia', linterna: 1, disco: 0, rayos: true },
  jungla:   { cA: '#0e2a24', cB: '#3d6a52', cC: '#b4b98a', sol: [.6, .35, .3], solCol: '#ffd9a0', solInt: 1.4, hemiA: '#a4c49a', hemiB: '#1a2810', hemi: .65, niebla: '#4a6650', dens: .048, estrellas: 0, nubes: .6, exp: 1.05, part: 'neblina', linterna: .7, disco: .4 },
  desierto: { cA: '#1b2756', cB: '#b65e3a', cC: '#ffb066', sol: [-.8, .12, .2], solCol: '#ffae6a', solInt: 2, hemiA: '#ffcfa0', hemiB: '#6b4528', hemi: .75, niebla: '#c4825a', dens: .016, estrellas: .3, nubes: .35, exp: .95, part: 'polvo', linterna: .35, disco: 1 },
  casa:     { cA: '#080a14', cB: '#141a2c', cC: '#22283c', sol: [.3, .7, .2], solCol: '#7f94d0', solInt: 0, hemiA: '#4a4a58', hemiB: '#1a140e', hemi: .3, niebla: '#0b0a09', dens: .055, estrellas: .8, nubes: .3, exp: 1.35, part: 'motas', linterna: 1.15, disco: 1, interior: true }
};

const hemi = new THREE.HemisphereLight('#fff', '#333', .5); escena.add(hemi);
const sol = new THREE.DirectionalLight('#fff', 1);
sol.shadow.camera.left = sol.shadow.camera.bottom = -24; sol.shadow.camera.right = sol.shadow.camera.top = 24;
sol.shadow.camera.near = 1; sol.shadow.camera.far = 90; sol.shadow.bias = -.0006; sol.shadow.normalBias = .04;
escena.add(sol, sol.target);
const linterna = new THREE.SpotLight('#fff3dc', 5, 32, .48, .55, 1.6);
linterna.shadow.mapSize.set(1024, 1024); linterna.shadow.bias = -.0005; linterna.shadow.camera.near = .3;
escena.add(linterna, linterna.target);
const luzDisparo = new THREE.PointLight('#ffb35a', 0, 14, 2); escena.add(luzDisparo);
const luzExplosion = new THREE.PointLight('#ff8a3a', 0, 30, 2); escena.add(luzExplosion);
const luzTienda = new THREE.PointLight('#ffb35c', 3, 11, 2); escena.add(luzTienda);
const luzCaja = new THREE.PointLight('#ff3a2a', 0, 9, 2); escena.add(luzCaja);
const lucesLampara = [];
for (let i = 0; i < 6; i++) { const l = new THREE.PointLight('#ffd49a', 0, 9, 2); escena.add(l); lucesLampara.push(l); }
escena.fog = new THREE.FogExp2('#000', .03);

const pmrem = new THREE.PMREMGenerator(R);
let envActual = null;
function generarEntorno() {
  const e = new THREE.Scene(); const c = cielo.clone(); c.material = cieloMat; e.add(c);
  if (envActual) envActual.dispose();
  envActual = pmrem.fromScene(e, 0, .1, 200).texture;
  escena.environment = envActual;
}

// ================= Partículas =================
class Particulas {
  constructor(n, textura, aditivo) {
    this.n = n; this.lista = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.alfa = new Float32Array(n); this.tam = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aAlfa', new THREE.BufferAttribute(this.alfa, 1));
    g.setAttribute('aTam', new THREE.BufferAttribute(this.tam, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { mapa: { value: tex(textura, 1, 1) }, escala: { value: 500 }, niebla: { value: .03 } },
      vertexShader: `attribute float aAlfa; attribute float aTam; attribute vec3 color; varying vec3 vC; varying float vA; uniform float escala, niebla;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; float d = -mv.z;
          gl_PointSize = aTam * escala / max(d, .1); vC = color; vA = aAlfa * exp(-d * niebla * 1.2); }`,
      fragmentShader: `uniform sampler2D mapa; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(mapa, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); if (gl_FragColor.a < .004) discard; }`,
      transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.puntos = new THREE.Points(g, this.mat); this.puntos.frustumCulled = false;
    escena.add(this.puntos);
  }
  emitir(o) {
    if (this.lista.length >= this.n) this.lista.shift();
    const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, vida: 1, t: 0, t0: .2, t1: .2, r: 1, g: 1, b: 1, a: 1, a1: 0, grav: 0, roce: 0, suelo: false }, o);
    p.edad = 0; this.lista.push(p); return p;
  }
  actualizar(dt) {
    const L = this.lista;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.edad += dt;
      if (p.edad >= p.vida) { L.splice(i, 1); continue; }
      p.vy -= p.grav * dt; const f = Math.max(0, 1 - p.roce * dt); p.vx *= f; p.vy *= f; p.vz *= f;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.suelo && p.y < .02) { p.y = .02; p.vy = 0; p.vx *= .5; p.vz *= .5; }
      if (p.fn) p.fn(p, dt);
    }
    for (let i = 0; i < this.n; i++) {
      const p = L[i];
      if (!p) { this.alfa[i] = 0; this.tam[i] = 0; continue; }
      const k = p.edad / p.vida;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.alfa[i] = lerp(p.a, p.a1, k); this.tam[i] = lerp(p.t0, p.t1, k);
    }
    const g = this.puntos.geometry;
    for (const k of ['position', 'color', 'aAlfa', 'aTam']) g.attributes[k].needsUpdate = true;
    this.mat.uniforms.escala.value = escalaPuntos;
    this.mat.uniforms.niebla.value = escena.fog.density;
  }
}
const pAdd = new Particulas(900, T('suave'), true);
const pNorm = new Particulas(700, T('suave'), false);
const pHumo = new Particulas(260, T('humo'), false);

// lluvia
const lluvia = (() => {
  const n = 2200, pos = new Float32Array(n * 6), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: '#9fb3c0', transparent: true, opacity: .35, depthWrite: false });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.visible = false; escena.add(l);
  const gotas = []; for (let i = 0; i < n; i++) gotas.push({ x: rnd(-18, 18), y: rnd(0, 14), z: rnd(-18, 18), v: rnd(16, 22) });
  return { l, gotas, pos };
})();

// ================= Mundo =================
let mundo = null;            // { grupo, mapa, pal, ... }
const decal = { sangre: [], quemado: [] };

function limpiar(obj) {
  const cache = new Set([...Object.values(M), ...Object.values(matsZ)]);
  const mapasCache = new Set(Object.values(M).map(m => m.map).filter(Boolean));
  obj.traverse(o => {
    if (o.geometry && !o.geometry.__comp) o.geometry.dispose();
    if (o.material && !cache.has(o.material)) { if (o.material.map && !mapasCache.has(o.material.map)) o.material.map.dispose(); o.material.dispose(); }
  });
}

function construirMundo(mapa) {
  if (mundo) { escena.remove(mundo.grupo); limpiar(mundo.grupo); }
  for (const k of ['sangre', 'quemado']) { for (const d of decal[k]) escena.remove(d); decal[k] = []; }
  const P = PAL[mapa.id] || PAL.bosque;
  const grupo = new THREE.Group();
  const W = mapa.W, H = mapa.H, g = mapa.g;
  const Qx = Qc();
  mundo = { grupo, mapa, pal: P, lamparas: [], puertas: new Map(), barricadas: new Map(), firmaBarr: '', tienda: null, interior: !!P.interior };

  // luces y cielo
  cieloMat.uniforms.cA.value.set(P.cA); cieloMat.uniforms.cB.value.set(P.cB); cieloMat.uniforms.cC.value.set(P.cC);
  cieloMat.uniforms.solDir.value.set(...P.sol).normalize(); cieloMat.uniforms.solCol.value.set(P.solCol);
  cieloMat.uniforms.estrellas.value = P.estrellas; cieloMat.uniforms.nubes.value = P.nubes; cieloMat.uniforms.disco.value = P.disco;
  hemi.color.set(P.hemiA); hemi.groundColor.set(P.hemiB); hemi.intensity = P.hemi;
  sol.color.set(P.solCol); sol.intensity = P.solInt; sol.visible = P.solInt > 0;
  escena.fog.color.set(P.niebla); escena.fog.density = P.dens;
  R.toneMappingExposure = P.exp;
  generarEntorno();

  // ---- suelo ----
  const s = mapa.casa ? 40 : 34;
  const tipos = {}; for (const t of mapa.suelo) tipos[t] = (tipos[t] || 0) + 1;
  const base = Object.keys(tipos).sort((a, b) => tipos[b] - tipos[a])[0];
  const patron = (gg, t) => { const p = gg.createPattern(T(t === 'agua' ? 'barro' : t), 'repeat'); const k = (t === 'madera' ? 4 : t === 'baldosa' ? 1.6 : 2.2) * s / T(t === 'agua' ? 'barro' : t).width; p.setTransform(new DOMMatrix().scale(k)); return p; };
  const RUG = { pasto: 235, hojas: 225, tierra: 215, barro: 120, agua: 30, arena: 238, madera: 150, baldosa: 80 };
  const cSuelo = lienzo(W * s, H * s, (gg) => { gg.fillStyle = patron(gg, base); gg.fillRect(0, 0, W * s, H * s); });
  const cRug = lienzo(W * s, H * s, (gg) => { gg.fillStyle = `rgb(${RUG[base]},${RUG[base]},${RUG[base]})`; gg.fillRect(0, 0, W * s, H * s); });
  const gS = cSuelo.getContext('2d'), gR = cRug.getContext('2d');
  for (const t of Object.keys(tipos)) {
    if (t === base) continue;
    // máscara chica (8 px por metro) y después agrandada con suavizado: bordes blandos y rápido
    const k = 8;
    const chica = lienzo(W * k, H * k, (gg) => {
      if (!mapa.casa) gg.filter = 'blur(3px)';
      gg.fillStyle = '#fff';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mapa.suelo[y * W + x] === t) { if (mapa.casa) gg.fillRect(x * k, y * k, k, k); else { gg.beginPath(); gg.arc((x + .5) * k, (y + .5) * k, k * .78, 0, TAU); gg.fill(); } }
    });
    const mascara = lienzo(W * s, H * s, (gg) => { gg.imageSmoothingEnabled = !mapa.casa; gg.drawImage(chica, 0, 0, W * s, H * s); });
    const capa = lienzo(W * s, H * s, (gg) => { gg.drawImage(mascara, 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = patron(gg, t); gg.fillRect(0, 0, W * s, H * s); });
    gS.drawImage(capa, 0, 0);
    const capaR = lienzo(W * s, H * s, (gg) => { gg.drawImage(mascara, 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = `rgb(${RUG[t]},${RUG[t]},${RUG[t]})`; gg.fillRect(0, 0, W * s, H * s); });
    gR.drawImage(capaR, 0, 0);
  }
  // sombras de contacto (árboles y paredes) y manchas de sangre
  gS.globalCompositeOperation = 'multiply';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y * W + x];
    if (c === ARBOL) { const gr = gS.createRadialGradient((x + .5) * s, (y + .5) * s, s * .2, (x + .5) * s, (y + .5) * s, s * 1.6); gr.addColorStop(0, 'rgba(60,50,40,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); gS.fillStyle = gr; gS.fillRect((x - 1.2) * s, (y - 1.2) * s, s * 3.4, s * 3.4); }
    if (c === PARED && mapa.casa) { const gr = gS.createRadialGradient((x + .5) * s, (y + .5) * s, s * .4, (x + .5) * s, (y + .5) * s, s * 1.1); gr.addColorStop(0, 'rgba(70,65,60,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); gS.fillStyle = gr; gS.fillRect((x - .7) * s, (y - .7) * s, s * 2.4, s * 2.4); }
  }
  gS.globalCompositeOperation = 'source-over';
  for (let i = 0; i < (mapa.casa ? 14 : 8); i++) { gS.save(); gS.translate(rnd(2, W - 2) * s, rnd(2, H - 2) * s); gS.rotate(rnd(0, TAU)); const k = rnd(.8, 2) * s; gS.globalAlpha = rnd(.4, .8); gS.drawImage(T('sangre'), -k, -k, k * 2, k * 2); gS.restore(); }
  gS.globalAlpha = 1;
  const sueloMat = new THREE.MeshStandardMaterial({ map: tex(cSuelo, 1, 1), roughnessMap: tex(cRug, 1, 1, false), roughness: 1, metalness: 0, envMapIntensity: .6 });
  sueloMat.map.wrapS = sueloMat.map.wrapT = THREE.ClampToEdgeWrapping;
  const det = tex(T('detalle'), 1, 1, false);
  sueloMat.onBeforeCompile = sh => {
    sh.uniforms.uDet = { value: det }; sh.uniforms.uRep = { value: new THREE.Vector2(W, H) };
    sh.fragmentShader = 'uniform sampler2D uDet; uniform vec2 uRep;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 detA = texture2D(uDet, vUv * uRep * 0.9).rgb; float detB = texture2D(uDet, vUv * uRep * 0.11).g;
      diffuseColor.rgb *= detA * 1.85 * (0.72 + detB * 0.56);`);
  };
  const ext = mapa.casa ? 0 : 40;
  const pisoGeo = new THREE.PlaneGeometry(W, H); pisoGeo.rotateX(-Math.PI / 2);
  const piso = new THREE.Mesh(pisoGeo, sueloMat); piso.position.set(W / 2, 0, H / 2); piso.receiveShadow = true; grupo.add(piso);
  if (ext) {
    // terreno de afuera del mapa
    const fueraMat = new THREE.MeshStandardMaterial({ map: tex(T(base === 'agua' ? 'barro' : base), (W + ext * 2) / 2.2, (H + ext * 2) / 2.2), roughness: 1, color: '#aaa' });
    const fg = new THREE.PlaneGeometry(W + ext * 2, H + ext * 2, 40, 40); fg.rotateX(-Math.PI / 2);
    const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), d = Math.max(Math.abs(x) - W / 2, Math.abs(z) - H / 2); fp.setY(i, d > 2 ? (d - 2) * (mapa.id === 'desierto' ? .25 : .08) * (1 + Math.sin(x * .2) * Math.cos(z * .17)) - .03 : -.03); }
    fg.computeVertexNormals();
    const fuera = new THREE.Mesh(fg, fueraMat); fuera.position.set(W / 2, 0, H / 2); fuera.receiveShadow = true; grupo.add(fuera);
  }
  // agua
  const aguaCeldas = []; for (let i = 0; i < W * H; i++) if (mapa.suelo[i] === 'agua' && g[i] !== PARED) aguaCeldas.push(i);
  if (aguaCeldas.length) {
    const gs = aguaCeldas.map(i => { const q = new THREE.PlaneGeometry(1.15, 1.15); q.rotateX(-Math.PI / 2); q.translate(i % W + .5, .035, Math.floor(i / W) + .5); return q; });
    const am = new THREE.MeshStandardMaterial({ color: '#0e201d', roughness: .12, metalness: .1, transparent: true, opacity: .88, envMapIntensity: .55 });
    const agua = new THREE.Mesh(unir(gs), am); agua.receiveShadow = true; grupo.add(agua);
    mundo.agua = am;
  }

  if (mapa.casa) construirCasa(mapa, grupo);
  else construirAfuera(mapa, grupo, P);

  escena.add(grupo);
  return mundo;
}

// ---- afuera ----
function instanciar(geo, material, lista, sombra = true, recibe = true) {
  if (!lista.length) return null;
  const im = new THREE.InstancedMesh(geo, material, lista.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const col = new THREE.Color();
  lista.forEach((o, i) => {
    e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); v.set(o.x, o.y || 0, o.z); sc.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1);
    m4.compose(v, q, sc); im.setMatrixAt(i, m4);
    if (o.c != null) { col.setHSL(...o.c); im.setColorAt(i, col); }
  });
  im.castShadow = sombra; im.receiveShadow = recibe;
  im.frustumCulled = false;
  return im;
}
function construirAfuera(mapa, grupo, P) {
  const W = mapa.W, H = mapa.H, g = mapa.g, Qx = Qc();
  const id = mapa.id;
  // tipos de árbol por mapa
  const tiposArbol = [];
  const corteza = mat('corteza');
  if (id === 'bosque') {
    const mPino = matHojas('pino', '#7f9a74', .02, 2);
    const mHoja = matHojas('hoja', '#8fa070', .025, 3);
    tiposArbol.push({ tronco: geoTronco(7.5, .26, .1), copa: geoPino(8), mc: mPino, peso: .55 });
    tiposArbol.push({ tronco: geoTronco(4.6, .34, .2, 4, .3), copa: geoCopa(70, 2.4, 1.7, 5.2), mc: mHoja, peso: .45 });
  } else if (id === 'selva') {
    const mHoja = matHojas('hoja', '#7d9466', .03, 3);
    tiposArbol.push({ tronco: geoTronco(6.5, .38, .22, 5, .2), copa: geoCopa(95, 3.2, 1.5, 6.6, 1.5), mc: mHoja, peso: .7 });
    tiposArbol.push({ tronco: geoTronco(4, .28, .18, 3, .4), copa: geoCopa(60, 2.2, 1.6, 4.4), mc: mHoja, peso: .3 });
  } else if (id === 'jungla') {
    const mHoja = matHojas('hoja', '#6f9a5a', .03, 3);
    const mPalma = matHojas('palma', '#a8b878', .04, 4);
    tiposArbol.push({ tronco: geoTronco(7, .4, .25, 6, .3), copa: geoCopa(110, 3.4, 1.8, 7.2, 1.6), mc: mHoja, peso: .5 });
    tiposArbol.push({ tronco: geoTronco(6, .2, .15, 0, .8), copa: geoPalma(6), mc: mPalma, peso: .5 });
  } else {
    const mPalma = matHojas('palma', '#a8a46a', .035, 4);
    tiposArbol.push({ tronco: geoArbolSeco(), copa: null, peso: .55, mt: mat('cortezaClara') });
    tiposArbol.push({ tronco: geoTronco(5.5, .2, .14, 0, .9), copa: geoPalma(5.5), mc: mPalma, peso: .4 });
  }
  const listas = tiposArbol.map(() => []);
  const elegirTipo = () => { let r = Math.random(); for (let i = 0; i < tiposArbol.length; i++) { r -= tiposArbol[i].peso; if (r <= 0) return i; } return 0; };
  const ponerArbol = (x, z, s) => { const t = elegirTipo(); listas[t].push({ x, z, ry: rnd(0, TAU), s: s || rnd(.85, 1.2), c: [rnd(.2, .33), rnd(.25, .45), rnd(.42, .58)] }); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] === ARBOL) ponerArbol(x + .5 + rnd(-.08, .08), y + .5 + rnd(-.08, .08));
  // árboles de afuera del borde (dan profundidad)
  const densFuera = id === 'desierto' ? .02 : .3;
  for (let y = -12; y < H + 12; y++) for (let x = -12; x < W + 12; x++) {
    if (x >= -1 && y >= -1 && x <= W && y <= H) continue;
    const d = Math.max(-x, -y, x - W, y - H);
    // pegado al cerco, tupido; más lejos, más espaciado (la niebla lo tapa igual)
    if (Math.random() < densFuera * (d < 3 ? 1.3 : d < 7 ? .7 : .35) * (Qx.pasto > .5 ? 1 : .5)) ponerArbol(x + rnd(0, 1), y + rnd(0, 1), rnd(.9, 1.4));
  }
  tiposArbol.forEach((t, i) => {
    const tr = instanciar(t.tronco, t.mt || corteza, listas[i]); if (tr) grupo.add(tr);
    if (t.copa) {
      const cp = instanciar(t.copa, t.mc, listas[i], true, true);
      if (cp) { cp.customDepthMaterial = profundidadHojas(t.mc); grupo.add(cp); }
    }
  });
  // lianas en la jungla y la selva
  if (id === 'jungla' || id === 'selva') {
    const lianas = [];
    listas[0].forEach(o => { if (Math.random() < .6) for (let k = 0; k < 3; k++) { const l = rnd(2, 4.5); lianas.push({ x: o.x + rnd(-2, 2), y: 6.6 - l / 2, z: o.z + rnd(-2, 2), sy: l, s: 1 }); } });
    const lg = new THREE.CylinderGeometry(.02, .02, 1, 4); const lm = new THREE.MeshStandardMaterial({ color: '#25301a', roughness: .95 });
    const li = instanciar(lg, lm, lianas, false); if (li) grupo.add(li);
  }
  // cerco del borde
  const estacas = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] === PARED) for (let k = 0; k < 3; k++) estacas.push({ x: x + .2 + k * .3 + rnd(-.05, .05), z: y + .5 + rnd(-.15, .15), sy: rnd(1.6, 2.4), s: 1, rx: rnd(-.08, .08), rz: rnd(-.08, .08) });
  const eg = new THREE.CylinderGeometry(.07, .09, 1, 6); eg.translate(0, .5, 0);
  const pg = new THREE.ConeGeometry(.07, .25, 6); pg.translate(0, 1.12, 0);
  const estacaGeo = unir([eg, pg]);
  grupo.add(instanciar(estacaGeo, mat('estaca'), estacas));
  // pasto, matas, helechos, rocas, cactus
  const libres = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (g[i] === VACIO) libres.push(i); }
  const pasto = [], helechos = [], rocas = [], cactus = [], matas = [];
  const dens = Qx.pasto;
  for (const i of libres) {
    const x = i % W, y = (i / W) | 0, su = mapa.suelo[i];
    if (su === 'agua') { if (Math.random() < .5) pasto.push({ x: x + rnd(0, 1), z: y + rnd(0, 1), s: rnd(.9, 1.6), ry: rnd(0, TAU), c: [rnd(.2, .28), .4, rnd(.3, .45)] }); continue; }
    if (id === 'desierto') {
      if (Math.random() < .25 * dens + .05) matas.push({ x: x + rnd(0, 1), z: y + rnd(0, 1), s: rnd(.6, 1.3), ry: rnd(0, TAU) });
      if (Math.random() < .04) rocas.push({ x: x + rnd(.2, .8), z: y + rnd(.2, .8), s: rnd(.15, .5), ry: rnd(0, TAU) });
      if (Math.random() < .012) cactus.push({ x: x + .5, z: y + .5, s: rnd(.8, 1.3), ry: rnd(0, TAU) });
      continue;
    }
    const n = Math.round((su === 'pasto' ? 7 : su === 'hojas' ? 4 : 2) * dens);
    for (let k = 0; k < n; k++) pasto.push({ x: x + rnd(0, 1), z: y + rnd(0, 1), s: rnd(.6, 1.2), ry: rnd(0, TAU), c: [rnd(.18, .3), rnd(.3, .55), rnd(.35, .55)] });
    if ((id !== 'bosque' && Math.random() < .35 * dens + .05) || (id === 'bosque' && Math.random() < .06)) helechos.push({ x: x + rnd(0, 1), z: y + rnd(0, 1), s: rnd(.7, 1.4), ry: rnd(0, TAU), c: [rnd(.22, .32), .45, rnd(.35, .5)] });
    if (Math.random() < .025) rocas.push({ x: x + rnd(.2, .8), z: y + rnd(.2, .8), s: rnd(.15, .45), ry: rnd(0, TAU) });
  }
  if (pasto.length) {
    const pm = new THREE.MeshStandardMaterial({ map: tex(T('mata')), alphaTest: .4, side: THREE.DoubleSide, roughness: 1, color: id === 'jungla' ? '#a8c890' : '#b0b890' });
    conViento(pm, .12, .05);
    grupo.add(instanciar(geoMata(.55, .5), pm, pasto, false, true));
  }
  if (helechos.length) {
    const hm = new THREE.MeshStandardMaterial({ map: tex(T('helecho')), alphaTest: .4, side: THREE.DoubleSide, roughness: .9, color: '#a8b890' });
    conViento(hm, .08, .1);
    const hi = instanciar(geoMata(1.5, 1.1), hm, helechos, Qx.sombras, true); hi.customDepthMaterial = profundidadHojas(hm); grupo.add(hi);
  }
  if (matas.length) {
    const mm = new THREE.MeshStandardMaterial({ map: tex(T('matSeca')), alphaTest: .4, side: THREE.DoubleSide, roughness: 1 });
    conViento(mm, .06, .05);
    grupo.add(instanciar(geoMata(.9, .6), mm, matas, false, true));
  }
  if (rocas.length) grupo.add(instanciar(geoRoca(1), id === 'desierto' ? mat('rocaArena') : mat('roca'), rocas));
  if (cactus.length) {
    const cg = [new THREE.CylinderGeometry(.16, .18, 2.2, 8)]; cg[0].translate(0, 1.1, 0);
    const b1 = new THREE.CylinderGeometry(.1, .11, .8, 8); b1.translate(.35, 1.4, 0); const b1c = new THREE.CylinderGeometry(.1, .1, .4, 8); b1c.rotateZ(Math.PI / 2); b1c.translate(.2, 1.05, 0);
    const b2 = new THREE.CylinderGeometry(.09, .1, .6, 8); b2.translate(-.3, 1.6, 0); const b2c = new THREE.CylinderGeometry(.09, .09, .3, 8); b2c.rotateZ(Math.PI / 2); b2c.translate(-.17, 1.35, 0);
    grupo.add(instanciar(unir([...cg, b1, b1c, b2, b2c]), mat('cactus'), cactus));
  }
  // dunas lejanas en el desierto
  if (id === 'desierto') {
    const dunas = [];
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = rnd(45, 70); dunas.push({ x: W / 2 + Math.cos(a) * r, z: H / 2 + Math.sin(a) * r, sx: rnd(10, 22), sy: rnd(2.5, 6), sz: rnd(8, 15), ry: rnd(0, TAU) }); }
    const dg = new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2);
    grupo.add(instanciar(dg, new THREE.MeshStandardMaterial({ map: tex(T('arena'), 6, 6), roughness: 1 }), dunas, false));
  }
}

// ---- casa ----
function construirCasa(mapa, grupo) {
  const W = mapa.W, H = mapa.H, g = mapa.g, Qx = Qc();
  const paredes = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] === PARED) {
    const zona = (Math.floor(x / 7) * 31 + Math.floor(y / 6) * 17) % 5;
    const tonos = [[.1, .18, .62], [.08, .12, .55], [.55, .1, .55], [.3, .1, .6], [0, .15, .58]];
    paredes.push({ x: x + .5, y: ALTO_PARED / 2, z: y + .5, sy: ALTO_PARED, c: tonos[zona] });
  }
  const pg = new THREE.BoxGeometry(1, 1, 1);
  grupo.add(instanciar(pg, mat('pared'), paredes, true, true));
  // techo
  const tg = new THREE.PlaneGeometry(W, H); tg.rotateX(Math.PI / 2);
  const tm = mat('techo').clone(); tm.map = tex(T('techo'), W / 3, H / 3);
  const techo = new THREE.Mesh(tg, tm); techo.position.set(W / 2, ALTO_PARED, H / 2); techo.receiveShadow = true; grupo.add(techo);
  // vigas
  const vigas = []; for (let y = 3; y < H; y += 4) vigas.push({ x: W / 2, y: ALTO_PARED - .1, z: y, sx: W, sy: .2, sz: .18 });
  grupo.add(instanciar(new THREE.BoxGeometry(1, 1, 1), mat('maderaOsc'), vigas, false, true));
  // habitaciones (para lámparas y decoración)
  const sala = new Int32Array(W * H).fill(-1); const salas = [];
  for (let i = 0; i < W * H; i++) {
    if (sala[i] >= 0 || g[i] !== VACIO) continue;
    const id = salas.length, celdas = [], cola = [i]; sala[i] = id;
    while (cola.length) { const c = cola.pop(); celdas.push(c); const x = c % W, y = (c / W) | 0; for (const n of [c - 1, c + 1, c - W, c + W]) { const nx = n % W, ny = (n / W) | 0; if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue; if (n < 0 || n >= W * H || sala[n] >= 0 || g[n] !== VACIO) continue; sala[n] = id; cola.push(n); } }
    salas.push(celdas);
  }
  const lampGeo = unir([(() => { const c = new THREE.CylinderGeometry(.005, .005, .5, 4); c.translate(0, -.25, 0); return c; })(), (() => { const c = new THREE.ConeGeometry(.22, .18, 14, 1, true); c.translate(0, -.55, 0); return c; })()]);
  for (const celdas of salas) {
    if (celdas.length < 4) continue;
    let sx = 0, sy = 0; for (const c of celdas) { sx += c % W; sy += (c / W) | 0; }
    sx /= celdas.length; sy /= celdas.length;
    let mejor = celdas[0], md = 1e9; for (const c of celdas) { const d = Math.hypot(c % W - sx, ((c / W) | 0) - sy); if (d < md) { md = d; mejor = c; } }
    const lx = mejor % W + .5, lz = ((mejor / W) | 0) + .5;
    const lamp = new THREE.Mesh(lampGeo, mat('metalOsc')); lamp.position.set(lx, ALTO_PARED, lz); grupo.add(lamp);
    const foco = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), mat('foco').clone()); foco.position.set(lx, ALTO_PARED - .6, lz); grupo.add(foco);
    const roto = Math.random() < .3;
    mundo.lamparas.push({ x: lx, y: ALTO_PARED - .65, z: lz, foco, roto, fase: rnd(0, 100), apagada: Math.random() < .12 });
    if (Math.random() < .55) { const a = new THREE.Mesh(new THREE.PlaneGeometry(rnd(1.6, 2.6), rnd(1.2, 2)), mat('alfombra')); a.rotation.x = -Math.PI / 2; a.rotation.z = Math.random() < .5 ? 0 : Math.PI / 2; a.position.set(lx, .012, lz); a.receiveShadow = true; grupo.add(a); }
  }
  // puertas
  const header = new THREE.BoxGeometry(1, ALTO_PARED - 2.15, 1);
  for (let i = 0; i < W * H; i++) {
    if (g[i] !== PUERTA && g[i] !== BARRICADA) continue;
    const x = i % W, y = (i / W) | 0;
    const horiz = g[i - 1] === PARED || g[i + 1] === PARED; // la pared corre de este a oeste
    const h = new THREE.Mesh(header, mat('pared')); h.position.set(x + .5, 2.15 + (ALTO_PARED - 2.15) / 2, y + .5); h.castShadow = true; grupo.add(h);
    // marco
    const marco = new THREE.Group();
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.15, 1.04), mat('maderaOsc')); j.position.set(s * .5, 1.075, 0); marco.add(j); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.08, .08, 1.04), mat('maderaOsc')); top.position.y = 2.15; marco.add(top);
    // con la pared de este a oeste, el paso es norte-sur y las jambas van a los costados (en x)
    marco.position.set(x + .5, 0, y + .5); marco.rotation.y = horiz ? 0 : Math.PI / 2;
    grupo.add(marco);
    // hoja abierta, apoyada contra la pared del lado de una habitación
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.1, .045), mat('puerta')); hoja.castShadow = true;
    let puesta = false;
    for (const a of [-1, 1]) for (const b of [1, -1]) {
      if (puesta) break;
      if (horiz) { if (g[i + a] === PARED && g[i + a + b * W] === VACIO) { hoja.position.set(x + .5 + a * .95, 1.05, y + .5 + b * .53); puesta = true; } }
      else if (g[i + a * W] === PARED && g[i + a * W + b] === VACIO) { hoja.rotation.y = Math.PI / 2; hoja.position.set(x + .5 + b * .53, 1.05, y + .5 + a * .95); puesta = true; }
    }
    if (puesta) grupo.add(hoja);
    mundo.puertas.set(i, { x: x + .5, z: y + .5, horiz });
  }
  // ventanas tapiadas en las paredes de afuera, cuadros y estantes
  const tablaGeo = new THREE.BoxGeometry(1, .14, .04);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y * W + x] !== VACIO) continue;
    const vecinos = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of vecinos) {
      const nx = x + dx, ny = y + dy;
      if (g[ny * W + nx] !== PARED) continue;
      const cercaPuerta = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[(y + b) * W + x + a] === PUERTA);
      if (cercaPuerta) continue;
      const borde = nx === 0 || ny === 0 || nx === W - 1 || ny === H - 1;
      const cx = x + .5 + dx * .49, cz = y + .5 + dy * .49, ry = dx ? (dx > 0 ? -Math.PI / 2 : Math.PI / 2) : (dy > 0 ? Math.PI : 0);
      const r = Math.random();
      if (borde && r < .18) {
        const v = new THREE.Group();
        const vid = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1), mat('ventana')); vid.position.set(0, 1.45, -.005); v.add(vid);
        for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(tablaGeo, mat('tabla')); t.scale.x = rnd(.95, 1.15); t.position.set(0, 1.05 + k * .26 + rnd(-.03, .03), .03); t.rotation.z = rnd(-.2, .2); t.castShadow = true; v.add(t); }
        v.position.set(cx, 0, cz); v.rotation.y = ry; grupo.add(v);
        mundo.ventanas = (mundo.ventanas || 0) + 1;
      } else if (r < .07) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(.55, .7), new THREE.MeshStandardMaterial({ map: tex(GEN.cuadro()), roughness: .6 }));
        c.position.set(cx - dx * .01, rnd(1.4, 1.7), cz - dy * .01); c.rotation.y = ry; c.rotation.z = rnd(-.15, .15); grupo.add(c);
      } else if (r < .11) {
        const e = new THREE.Group();
        const caja = new THREE.Mesh(new THREE.BoxGeometry(.85, 1.9, .22), mat('maderaOsc')); caja.position.y = .95; caja.castShadow = caja.receiveShadow = true; e.add(caja);
        for (let k = 0; k < 4; k++) for (let b = 0; b < 7; b++) if (Math.random() < .75) { const l = new THREE.Mesh(new THREE.BoxGeometry(.06, rnd(.2, .3), .16), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), .4, .25), roughness: .8 })); l.position.set(-.33 + b * .11, .3 + k * .45, .04); l.rotation.z = rnd(-.15, .15); e.add(l); }
        e.position.set(x + .5 + dx * .38, 0, y + .5 + dy * .38); e.rotation.y = ry; grupo.add(e);
      }
    }
  }
}

// ---- barricadas ----
function actualizarBarricadas(J) {
  const m = J.mapa;
  let firma = '';
  for (const B of J.barricadas.values()) firma += B.i + ':' + Math.ceil(B.vida / 34) + ',';
  if (firma === mundo.firmaBarr) return;
  mundo.firmaBarr = firma;
  for (const [i, o] of mundo.barricadas) { if (!J.barricadas.has(i)) { mundo.grupo.remove(o); mundo.barricadas.delete(i); emitirAstillas(o.position.x, o.position.z); } }
  for (const B of J.barricadas.values()) {
    let o = mundo.barricadas.get(B.i);
    const tablas = Math.ceil(B.vida / 34);
    if (o && o.userData.tablas === tablas) continue;
    if (o) { mundo.grupo.remove(o); emitirAstillas(o.position.x, o.position.z); }
    o = new THREE.Group(); o.userData.tablas = tablas;
    const x = B.i % m.W, y = (B.i / m.W) | 0;
    const horiz = m.g[B.i - 1] === PARED || m.g[B.i + 1] === PARED;
    const alturas = [.55, 1.15, 1.75].slice(0, tablas);
    for (const h of alturas) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, .2, .06), mat('tabla')); t.position.set(0, h, 0); t.rotation.z = rnd(-.35, .35); t.castShadow = true; o.add(t); }
    o.position.set(x + .5, 0, y + .5); o.rotation.y = horiz ? 0 : Math.PI / 2;
    mundo.grupo.add(o); mundo.barricadas.set(B.i, o);
  }
}
function emitirAstillas(x, z) {
  for (let i = 0; i < 18; i++) pNorm.emitir({ x, y: rnd(.4, 1.8), z, vx: rnd(-3, 3), vy: rnd(0, 3), vz: rnd(-3, 3), grav: 9, vida: rnd(.6, 1.2), t0: .08, t1: .06, r: .45, g: .3, b: .15, a: 1, a1: 1, suelo: true });
}

// ================= Tienda =================
function construirTienda(x, z) {
  const t = new THREE.Group();
  const mostrador = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1, .6), mat('madera')); mostrador.position.y = .5; mostrador.castShadow = mostrador.receiveShadow = true; t.add(mostrador);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.8, .06, .7), mat('maderaOsc')); tapa.position.y = 1.03; t.add(tapa);
  for (const s of [-1, 1]) for (const d of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.5, 6), mat('maderaOsc')); p.position.set(s * .85, 1.25, d * .45); p.castShadow = true; t.add(p); }
  const toldo = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.3, 8, 1), mat('toldo')); toldo.rotation.x = -Math.PI / 2 + .25; toldo.position.set(0, 2.55, 0); toldo.castShadow = true; t.add(toldo);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .44), mat('cartel')); cartel.position.set(0, 2.15, .47); t.add(cartel);
  const cartel2 = cartel.clone(); cartel2.rotation.y = Math.PI; cartel2.position.z = -.47; t.add(cartel2);
  // gramófono
  const gram = new THREE.Group();
  const caja = new THREE.Mesh(new THREE.BoxGeometry(.3, .16, .3), mat('maderaOsc')); gram.add(caja);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .01, 24), mat('polimero')); disco.position.y = .09; gram.add(disco);
  const bocina = new THREE.Mesh(new THREE.ConeGeometry(.17, .38, 20, 1, true), mat('bronce')); bocina.rotation.z = -1.1; bocina.position.set(.12, .32, 0); gram.add(bocina);
  gram.position.set(-.5, 1.14, 0); t.add(gram); t.userData.disco = disco;
  // cajas y frascos
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.25, .2, .25), i % 2 ? mat('municion') : mat('botiquin')); c.position.set(.15 + i * .2, 1.16, rnd(-.15, .15)); c.rotation.y = rnd(-.3, .3); t.add(c); }
  const farol = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), mat('foco')); farol.position.set(.8, 2.2, .45); t.add(farol);
  t.position.set(x, 0, z);
  return t;
}

// ================= Zombis =================
const GZ = {}; // geometrías compartidas
function gz(nombre, fn) { if (!GZ[nombre]) { GZ[nombre] = fn(); GZ[nombre].__comp = true; } return GZ[nombre]; }
const ZCFG = {
  comun:    { esc: 1,    ancho: 1,    piel: ['#70745c', '#7b7462', '#666e5e'], ropa: ['#3a4252', '#56483a', '#4a3230', '#34402f', '#5e5c54', '#6b6250'], pant: ['#252a33', '#352d22', '#1f1f1f', '#3a3a40'], ojos: '#e8d47a', incl: .18 },
  corredor: { esc: 1.02, ancho: .85,  piel: ['#7f7466', '#776c60'], ropa: ['#6e2620', '#25405f', '#8f8670'], pant: ['#1a2230', '#222'], ojos: '#ffe680', incl: .5 },
  tanque:   { esc: 1.15, ancho: 1.65, piel: ['#646b50', '#5e604a'], ropa: null, pant: ['#2e291f', '#23272b'], ojos: '#ffd060', incl: .1, panza: true },
  griton:   { esc: .97,  ancho: .9,   piel: ['#8a8174', '#80786e'], ropa: ['#4a2440', '#5f5470', '#2f3c4a'], pant: ['#221a22'], ojos: '#c8f0ff', incl: .05, pelo: true, vestido: true },
  trepador: { esc: 1,    ancho: .8,   piel: ['#56605f', '#4f5859'], ropa: ['#2a2c30'], pant: ['#1c1c1c'], ojos: '#9effa0', incl: .7, brazosLargos: true },
  jefe:     { esc: 1.75, ancho: 1.25, piel: ['#55463e'], ropa: ['#221d1a'], pant: ['#1a1613'], ojos: '#ff3020', incl: .2, puas: true }
};
const matsZ = {};
function matZ(clave, color, tipo, doble) {
  const k = clave + color + (doble ? 'd' : '');
  if (!matsZ[k]) matsZ[k] = new THREE.MeshStandardMaterial({ color, map: tex(T(tipo)), roughness: tipo === 'piel' ? .72 : .97, envMapIntensity: .3, side: doble ? THREE.DoubleSide : THREE.FrontSide });
  return matsZ[k];
}
function capsula(r, l, mat_, y) { const m = new THREE.Mesh(gz(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10)), mat_); m.position.y = y; m.castShadow = true; return m; }
// tela rota: cilindro abierto con el borde de abajo desflecado
function geoRotura(r0, r1, alto, seed) {
  const g = new THREE.CylinderGeometry(r0, r1, alto, 14, 2, true); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -alto / 2 + .001) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) - Math.abs(Math.sin(a * 5 + seed) * Math.cos(a * 3 + seed * 2)) * alto * .9); }
  g.computeVertexNormals(); return g;
}
function crearZombiMalla(tipo) {
  const C = ZCFG[tipo] || ZCFG.comun;
  const piel = matZ('p', elegir(C.piel), 'piel');
  const colRopa = C.ropa ? elegir(C.ropa) : null;
  const ropa = colRopa ? matZ('r', colRopa, 'ropa') : piel;
  const ropaD = colRopa ? matZ('r', colRopa, 'ropa', true) : null;
  const pant = matZ('r', elegir(C.pant), 'ropa');
  const oscuro = new THREE.MeshBasicMaterial({ color: '#140604' });
  const herida = matZ('h', '#5a0c08', 'piel');
  const raiz = new THREE.Group();
  const cuerpo = new THREE.Group(); raiz.add(cuerpo);
  const var_ = rnd(.94, 1.06);
  cuerpo.scale.set(C.esc * C.ancho * var_, C.esc * rnd(.95, 1.05), C.esc * C.ancho * var_);
  const cadera = new THREE.Group(); cadera.position.y = .95; cuerpo.add(cadera);
  const pelvis = capsula(.14, .12, pant, .02); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1.2, .9); cadera.add(pelvis);
  const torso = new THREE.Group(); cadera.add(torso);
  const pecho = capsula(.17, .3, ropa, .32); pecho.scale.set(1.22, 1, .78); torso.add(pecho);
  // espalda encorvada
  const joroba = new THREE.Mesh(gz('joroba', () => new THREE.SphereGeometry(.15, 12, 8)), ropa); joroba.position.set(0, .48, -.07); joroba.scale.set(1.35, .8, .8); joroba.castShadow = true; torso.add(joroba);
  if (colRopa && !C.vestido) { const r = new THREE.Mesh(gz('rotura' + (Math.random() * 3 | 0), () => geoRotura(.2, .225, .2, rnd(0, 10))), ropaD); r.position.y = .1; r.scale.set(1.1, 1, .85); r.castShadow = true; torso.add(r); }
  if (Math.random() < .5) { const h = new THREE.Mesh(gz('herida', () => new THREE.SphereGeometry(.06, 8, 6)), herida); h.position.set(rnd(-.1, .1), rnd(.25, .45), .125); h.scale.set(1, 1.3, .35); torso.add(h); }
  if (C.panza) { const p = new THREE.Mesh(gz('panza', () => new THREE.SphereGeometry(.26, 16, 12)), piel); p.position.set(0, .2, .1); p.scale.set(1, .95, .95); p.castShadow = true; torso.add(p); const h = new THREE.Mesh(gz('herida', () => new THREE.SphereGeometry(.06, 8, 6)), herida); h.position.set(.08, .22, .34); h.scale.set(1.4, 1, .3); torso.add(h); }
  if (C.vestido) { const v = new THREE.Mesh(gz('vestido', () => geoRotura(.17, .3, .62, 3)), ropaD); v.position.y = -.25; v.castShadow = true; cadera.add(v); }
  if (C.puas) {
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(gz('pua', () => new THREE.ConeGeometry(.035, .22, 6)), mat('hueso')); p.position.set(rnd(-.12, .12), .25 + i * .07, -.13); p.rotation.x = -1.1; p.castShadow = true; torso.add(p); }
    for (const s of [-1, 1]) { const p = new THREE.Mesh(gz('pua2', () => new THREE.ConeGeometry(.05, .26, 6)), mat('hueso')); p.position.set(s * .22, .58, 0); p.rotation.z = -s * .8; torso.add(p); }
    const brasa = new THREE.MeshBasicMaterial({ color: '#ff5a1a', toneMapped: false });
    for (let i = 0; i < 4; i++) { const gr = new THREE.Mesh(gz('grieta', () => new THREE.BoxGeometry(.015, .2, .01)), brasa); gr.position.set(rnd(-.1, .1), rnd(.2, .45), .135); gr.rotation.z = rnd(-.8, .8); torso.add(gr); }
  }
  const cuello = new THREE.Group(); cuello.position.y = .6; torso.add(cuello);
  cuello.add(capsula(.05, .06, piel, .03));
  const cabeza = new THREE.Group(); cabeza.position.y = .1; cuello.add(cabeza);
  const craneo = new THREE.Mesh(gz('craneo', () => { const g = new THREE.SphereGeometry(.115, 18, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (z > .04 && y < .02) p.setZ(i, z * .9); if (y < -.05) p.setX(i, p.getX(i) * .82); if (z > .06 && y > .0 && y < .05) p.setZ(i, z * .95); } g.computeVertexNormals(); return g; }), piel);
  craneo.scale.set(.9, 1.1, 1); craneo.position.y = .1; craneo.castShadow = true; cabeza.add(craneo);
  // cejas, nariz, orejas, pelo ralo
  const ceja = new THREE.Mesh(gz('ceja', () => new THREE.BoxGeometry(.11, .022, .03)), piel); ceja.position.set(0, .145, .095); ceja.rotation.x = .2; cabeza.add(ceja);
  const nariz = new THREE.Mesh(gz('nariz', () => new THREE.ConeGeometry(.016, .045, 5)), piel); nariz.position.set(0, .09, .115); nariz.rotation.x = 1.9; cabeza.add(nariz);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(gz('oreja', () => new THREE.SphereGeometry(.024, 6, 5)), piel); o.position.set(s * .1, .1, 0); o.scale.set(.4, 1, .7); cabeza.add(o); }
  if (!C.pelo && !C.puas && Math.random() < .65) { const p = new THREE.Mesh(gz('pelo' + (Math.random() * 3 | 0), () => new THREE.SphereGeometry(.122, 12, 8, rnd(0, 2), rnd(3.5, 5.5), 0, rnd(.9, 1.4))), matZ('pelo', elegir(['#1a1410', '#2b2118', '#3a3530', '#5a5048']), 'ropa')); p.position.y = .11; p.scale.set(.93, 1.1, 1.02); p.rotation.y = rnd(0, TAU); cabeza.add(p); }
  const mandibula = new THREE.Group(); mandibula.position.set(0, .04, .02); cabeza.add(mandibula);
  const mand = new THREE.Mesh(gz('mand', () => new THREE.BoxGeometry(.12, .04, .1)), piel); mand.position.set(0, -.015, .035); mandibula.add(mand);
  const dientesM = mat('hueso');
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(gz('diente', () => new THREE.BoxGeometry(.012, .016, .01)), dientesM); d.position.set(-.03 + i * .015, .005, .08); mandibula.add(d); const d2 = d.clone(); d2.position.set(-.03 + i * .015, .052, .105); if (Math.random() < .8) cabeza.add(d2); }
  const boca = new THREE.Mesh(gz('boca', () => new THREE.BoxGeometry(.08, .035, .02)), oscuro); boca.position.set(0, .04, .1); cabeza.add(boca);
  const ojoMat = new THREE.MeshBasicMaterial({ color: C.ojos, toneMapped: false });
  for (const s of [-1, 1]) {
    const cuenca = new THREE.Mesh(gz('cuenca', () => new THREE.SphereGeometry(.026, 8, 6)), oscuro); cuenca.position.set(s * .042, .115, .093); cuenca.scale.z = .6; cabeza.add(cuenca);
    const ojo = new THREE.Mesh(gz('ojo', () => new THREE.SphereGeometry(.01, 8, 6)), ojoMat); ojo.position.set(s * .042, .113, .105); cabeza.add(ojo);
  }
  if (C.pelo) { for (let i = 0; i < 11; i++) { const p = new THREE.Mesh(gz('mecha', () => { const g = new THREE.BoxGeometry(.035, .4, .018); g.translate(0, -.2, 0); return g; }), matZ('pelo', '#1c1612', 'ropa')); const a = (i / 10 - .5) * 2.6; p.position.set(Math.sin(a) * .105, .2, -Math.cos(a) * .1 - .01); p.rotation.set(-.12, a, rnd(-.1, .1)); p.scale.y = rnd(.8, 1.15); cabeza.add(p); } const cap = new THREE.Mesh(gz('pelo0', () => new THREE.SphereGeometry(.122, 12, 8, 0, TAU, 0, 1.3)), matZ('pelo', '#1c1612', 'ropa')); cap.position.y = .11; cap.scale.set(.95, 1.1, 1.05); cabeza.add(cap); }
  // brazos
  const brazos = [];
  const largo = C.brazosLargos ? 1.35 : 1;
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); hombro.position.set(s * .22, .52, 0); torso.add(hombro);
    hombro.add(capsula(.055, .2 * largo, C.ropa ? ropa : piel, -.14 * largo));
    if (colRopa && Math.random() < .7) { const m = new THREE.Mesh(gz('manga', () => geoRotura(.062, .066, .12, 7)), ropaD); m.position.y = -.22 * largo; m.castShadow = true; hombro.add(m); }
    const codo = new THREE.Group(); codo.position.y = -.3 * largo; hombro.add(codo);
    codo.add(capsula(.043, .19 * largo, piel, -.13 * largo));
    const mano = new THREE.Mesh(gz('mano', () => new THREE.BoxGeometry(.065, .09, .03)), piel); mano.position.y = -.28 * largo; mano.castShadow = true; codo.add(mano);
    for (let f = 0; f < 4; f++) { const d = new THREE.Mesh(gz('dedo', () => { const g = new THREE.BoxGeometry(.012, .075, .012); g.translate(0, -.037, 0); return g; }), piel); d.position.set(-.024 + f * .016, -.32 * largo, 0); d.rotation.x = .35 + f * .05; codo.add(d); }
    brazos.push({ hombro, codo });
  }
  // piernas
  const piernas = [];
  for (const s of [-1, 1]) {
    const cad = new THREE.Group(); cad.position.set(s * .1, 0, 0); cadera.add(cad);
    cad.add(capsula(.072, .3, pant, -.22));
    const rodilla = new THREE.Group(); rodilla.position.y = -.45; cad.add(rodilla);
    rodilla.add(capsula(.058, .3, pant, -.22));
    const descalzo = Math.random() < .25;
    const pie = new THREE.Mesh(gz('pie', () => new THREE.BoxGeometry(.1, .07, .24)), descalzo ? piel : matZ('z', '#221c18', 'ropa')); pie.position.set(0, -.465, .05); pie.castShadow = true; rodilla.add(pie);
    piernas.push({ cad, rodilla });
  }
  // cada zombi camina distinto: un brazo caído, renguera, cabeza ladeada
  const caido = tipo === 'comun' || tipo === 'tanque' ? (Math.random() < .4 ? (Math.random() < .5 ? 0 : 1) : -1) : -1;
  return { raiz, cuerpo, cadera, torso, cuello, cabeza, mandibula, brazos, piernas, C, tipo, fase: rnd(0, TAU), yaw: 0, flinch: 0, tic: 0, ticT: rnd(1, 4), boca: 0,
    caido, renguea: Math.random() < .3, ladeo: rnd(-.35, .35), inclExtra: rnd(-.08, .2) };
}

const zVis = new Map();   // id -> visual
const cadaveres = [];
function actualizarZombisVis(J, dt, jx, jz) {
  const vivos = new Set();
  const P = J.jug;
  for (const z of J.zombis) {
    vivos.add(z.id);
    let v = zVis.get(z.id);
    if (!v) {
      v = crearZombiMalla(z.tipo); v.px = z.x; v.py = z.y; v.vel = 0; v.yaw = Math.atan2(jx - z.x, jz - z.y);
      v.raiz.position.set(z.x, 0, z.y); escena.add(v.raiz); zVis.set(z.id, v);
      v.aparece = 0;
    }
    v.z = z;
    const dx = z.x - v.px, dy = z.y - v.py; v.px = z.x; v.py = z.y;
    const velInst = Math.hypot(dx, dy) / Math.max(dt, .001);
    v.vel = lerp(v.vel, velInst, Math.min(1, dt * 6));
    const R_ = v.raiz, C = v.C;
    let ty = 0;
    const agarra = P.agarrado === z;
    let objX = z.x, objZ = z.y;
    if (z.estado === 'trepa' || z.estado === 'arriba') {
      const a = P.arbol || { x: Math.floor(P.x) + .5, y: Math.floor(P.y) + .5 };
      const ax = (a.x != null ? a.x : P.x), ay = (a.y != null ? a.y : P.y);
      const ang = Math.atan2(z.x - ax, z.y - ay);
      objX = ax + Math.sin(ang) * .42; objZ = ay + Math.cos(ang) * .42;
      ty = z.estado === 'arriba' ? 1.9 : clamp((z.trepaT || 0) / 3, 0, 1) * 1.8;
    }
    if (agarra && !P.arbol) { const ang = Math.atan2(z.x - jx, z.y - jz); objX = jx + Math.sin(ang) * .62; objZ = jz + Math.cos(ang) * .62; }
    R_.position.x = lerp(R_.position.x, objX, Math.min(1, dt * 14));
    R_.position.z = lerp(R_.position.z, objZ, Math.min(1, dt * 14));
    R_.position.y = lerp(R_.position.y, ty, Math.min(1, dt * 5));
    // aparecer saliendo de la niebla (y del piso)
    if (v.aparece < 1) { v.aparece = Math.min(1, v.aparece + dt * 1.2); v.cuerpo.position.y = -(1 - v.aparece) * 1.2; }
    // a dónde mira
    const dJug = Math.hypot(jx - z.x, jz - z.y);
    let yawObj = v.yaw;
    if (dJug < 3 || z.estado !== 'camina' || agarra) yawObj = Math.atan2(jx - R_.position.x, jz - R_.position.z);
    else if (v.vel > .1) yawObj = Math.atan2(dx, dy);
    let dYaw = yawObj - v.yaw; while (dYaw > Math.PI) dYaw -= TAU; while (dYaw < -Math.PI) dYaw += TAU;
    v.yaw += dYaw * Math.min(1, dt * 6);
    R_.rotation.y = v.yaw;
    // animación
    const pasos = v.vel * (z.tipo === 'corredor' ? 2.1 : z.tipo === 'jefe' ? 1.6 : 2.6) / C.esc;
    v.fase += dt * (pasos + .3);
    const f = v.fase, mov = clamp(v.vel / .6, 0, 1);
    const lento = z.lentoT > 0;
    const ampP = (z.tipo === 'corredor' ? .9 : .55) * mov;
    const rng = lento || v.renguea;
    v.piernas[0].cad.rotation.x = Math.sin(f) * ampP * (rng ? .4 : 1);
    v.piernas[1].cad.rotation.x = -Math.sin(f) * ampP;
    v.piernas[0].rodilla.rotation.x = Math.max(0, Math.sin(f - 1.3)) * ampP * 1.4 + (C.brazosLargos ? .5 : .05);
    v.piernas[1].rodilla.rotation.x = Math.max(0, -Math.sin(f - 1.3)) * ampP * 1.4 + (C.brazosLargos ? .5 : .05);
    v.cadera.position.y = .95 - Math.abs(Math.cos(f)) * .045 * mov - (C.brazosLargos ? .12 : 0) - (rng ? Math.max(0, Math.sin(f)) * .06 : 0);
    v.cadera.rotation.z = Math.sin(f) * .06 * mov + (rng ? .12 : 0);
    v.cadera.rotation.y = Math.sin(f) * .1 * mov;
    v.flinch = Math.max(0, v.flinch - dt * 4);
    v.torso.rotation.x = C.incl + v.inclExtra + Math.sin(f * 2) * .04 * mov - v.flinch * .7;
    v.torso.rotation.z = Math.sin(f * .5 + 1) * .05;
    // brazos estirados hacia adelante, como zombi
    const brazoBase = z.tipo === 'griton' ? -.7 : z.tipo === 'jefe' ? -.4 : -1.35;
    let alcance = agarra ? -1.6 : (dJug < 2.2 ? -1.55 : brazoBase);
    if (z.estado === 'trepa') {
      v.brazos[0].hombro.rotation.x = -2.8 + Math.sin(v.fase * 3) * .4; v.brazos[1].hombro.rotation.x = -2.8 - Math.sin(v.fase * 3) * .4;
      v.brazos[0].codo.rotation.x = v.brazos[1].codo.rotation.x = -.6;
      v.fase += dt * 2;
    } else {
      v.brazos[0].hombro.rotation.x = alcance + Math.sin(f + .5) * .15 * mov + Math.sin(J_t * 1.7 + z.id) * .06;
      v.brazos[1].hombro.rotation.x = alcance - Math.sin(f + .5) * .15 * mov + Math.sin(J_t * 1.5 + z.id * 2) * .06;
      v.brazos[0].hombro.rotation.z = -.12 - (agarra ? .1 : 0); v.brazos[1].hombro.rotation.z = .12 + (agarra ? .1 : 0);
      v.brazos[0].codo.rotation.x = v.brazos[1].codo.rotation.x = agarra ? -.7 : -.25;
      if (v.caido >= 0 && !agarra && dJug > 2.2) { const b = v.brazos[v.caido]; b.hombro.rotation.x = .1 + Math.sin(f) * .25 * mov; b.hombro.rotation.z = (v.caido ? 1 : -1) * .12; b.codo.rotation.x = -.1; }
      if (z.tipo === 'griton' && z.gritoT != null && z.gritoT < .5) { v.brazos[0].hombro.rotation.x = v.brazos[1].hombro.rotation.x = -2.6; }
    }
    // cabeza y boca
    v.ticT -= dt; if (v.ticT <= 0) { v.ticT = rnd(1.5, 5); v.tic = rnd(-.6, .6); }
    v.tic *= Math.max(0, 1 - dt * 3);
    v.cuello.rotation.z = v.ladeo + v.tic * .6 + Math.sin(J_t * .8 + z.id) * .08;
    v.cuello.rotation.x = -C.incl * .8 + (agarra ? .3 : 0) - .1;
    const gritando = z.tipo === 'griton' && z.gritoT != null && z.gritoT < .6;
    v.mandibula.rotation.x = gritando || agarra ? .55 + Math.sin(J_t * 30) * .1 : .15 + Math.max(0, Math.sin(J_t * 4 + z.id)) * .25;
    // sombras solo de cerca (rendimiento)
    const conSombra = Qc().sombras && dJug < 22;
    if (v.sombra !== conSombra) { v.sombra = conSombra; v.raiz.traverse(o => { if (o.isMesh) o.castShadow = conSombra; }); }
  }
  for (const [id, v] of zVis) if (!vivos.has(id)) { zVis.delete(id); matarVisual(v, jx, jz); }
  // cadáveres
  for (let i = cadaveres.length - 1; i >= 0; i--) {
    const c = cadaveres[i]; c.t += dt;
    const k = clamp(c.t / .65, 0, 1), e = k * k * (3 - 2 * k);
    c.v.cuerpo.rotation.x = c.dir * e * (Math.PI / 2 - .08);
    c.v.cuerpo.position.y = e * .16 * c.v.C.esc;
    c.v.raiz.position.y = Math.max(0, c.y0 * (1 - k * 1.6));
    c.v.brazos.forEach((b, j) => { b.hombro.rotation.x = lerp(b.hombro.rotation.x, c.dir > 0 ? -2.4 : -.3, dt * 3); b.hombro.rotation.z = lerp(b.hombro.rotation.z, (j ? 1 : -1) * .9, dt * 3); });
    c.v.piernas.forEach((p, j) => { p.cad.rotation.x = lerp(p.cad.rotation.x, j ? .25 : -.15, dt * 3); p.rodilla.rotation.x = lerp(p.rodilla.rotation.x, .3, dt * 3); });
    c.v.mandibula.rotation.x = .5;
    if (c.t > 9) c.v.raiz.position.y -= dt * .25;
    if (c.t > 11 || cadaveres.length > 22 && i === 0) { escena.remove(c.v.raiz); cadaveres.splice(i, 1); }
  }
}
let ultimaMuerte = new Map();
function matarVisual(v, jx, jz) {
  const info = ultimaMuerte.get(v.z && v.z.id) || {};
  if (v.z) ultimaMuerte.delete(v.z.id);
  const atras = Math.atan2(v.raiz.position.x - jx, v.raiz.position.z - jz);
  // cae para atrás (alejándose de vos)
  let dif = atras - v.yaw; while (dif > Math.PI) dif -= TAU; while (dif < -Math.PI) dif += TAU;
  const dir = Math.abs(dif) < Math.PI / 2 ? 1 : -1;
  if (info.cabeza && v.cabeza) {
    v.cabeza.visible = false;
    const p = new THREE.Vector3(); v.cuello.getWorldPosition(p);
    for (let i = 0; i < 40 * Qc().part; i++) pNorm.emitir({ x: p.x, y: p.y + .08, z: p.z, vx: rnd(-1.5, 1.5), vy: rnd(1, 4), vz: rnd(-1.5, 1.5), grav: 9.8, vida: rnd(.5, 1.1), t0: rnd(.05, .12), t1: .03, r: .35, g: .02, b: .02, a: 1, a1: .8, suelo: true });
  }
  if (info.explosion) { v.cuerpo.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(.25); } }); }
  cadaveres.push({ v, t: 0, dir, y0: v.raiz.position.y });
  manchaSangre(v.raiz.position.x, v.raiz.position.z, rnd(.9, 1.5) * v.C.esc);
}

// ================= Decals =================
function manchaSangre(x, z, s) {
  let d;
  if (decal.sangre.length >= 45) { d = decal.sangre.shift(); }
  else { d = new THREE.Mesh(gz('plano', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }), mat('sangre')); escena.add(d); }
  d.position.set(x, .015 + decal.sangre.length * .0002, z); d.scale.set(s, 1, s); d.rotation.y = rnd(0, TAU); decal.sangre.push(d);
}
function quemadura(x, z) {
  let d;
  if (decal.quemado.length >= 12) d = decal.quemado.shift();
  else { d = new THREE.Mesh(gz('plano', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }), mat('quemado')); escena.add(d); }
  d.position.set(x, .02, z); d.scale.set(4.2, 1, 4.2); d.rotation.y = rnd(0, TAU); decal.quemado.push(d);
}

// ================= Objetos del piso =================
const itemVis = new Map();
const COLOR_ITEM = { balas: '#ffd76a', botiquin: '#ff5a5a', arma: '#7fd0ff', blanca: '#c8e0ff', granada: '#9cff7a', caja: '#ff7a3a' };
function crearItemMalla(it) {
  const g = new THREE.Group(), cont = new THREE.Group(); g.add(cont);
  if (it.tipo === 'balas') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(.32, .16, .2), mat('municion')); c.position.y = .08; c.castShadow = true; cont.add(c);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(gz('bala', () => { const a = new THREE.CylinderGeometry(.012, .012, .06, 8); const p = new THREE.ConeGeometry(.012, .025, 8); p.translate(0, .042, 0); return unir([a, p]); }), mat('bronce')); b.position.set(-.08 + i * .05, .19, rnd(-.03, .03)); b.rotation.z = rnd(-.2, .2); cont.add(b); }
  } else if (it.tipo === 'botiquin') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(.34, .2, .24), mat('botiquin')); c.position.y = .1; c.castShadow = true; cont.add(c);
    const asa = new THREE.Mesh(new THREE.TorusGeometry(.06, .012, 6, 12, Math.PI), mat('polimero')); asa.position.y = .2; cont.add(asa);
  } else if (it.tipo === 'arma') {
    const a = crearArma(it.sub); a.g.scale.setScalar(1.15); a.g.rotation.set(0, rnd(0, TAU), Math.PI / 2); a.g.position.y = .06; a.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); cont.add(a.g);
  } else if (it.tipo === 'blanca') {
    const a = crearBlanca(it.sub || 'cuchillo'); a.g.rotation.set(-Math.PI / 2, 0, rnd(0, TAU)); a.g.position.y = .05; a.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); cont.add(a.g);
  } else if (it.tipo === 'granada') {
    cont.add(crearGranadaMalla()); cont.position.y = .06;
  } else if (it.tipo === 'caja') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(.9, .7, .9), mat('cajon')); c.position.y = .35; c.castShadow = c.receiveShadow = true; cont.add(c);
    const para = new THREE.Group();
    const tela = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8, 0, TAU, 0, Math.PI / 2.4), mat('paracaidas')); tela.position.y = 4; para.add(tela);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const cuerda = new THREE.Mesh(gz('cuerda', () => new THREE.CylinderGeometry(.005, .005, 1, 3)), mat('tela')); const x1 = Math.cos(a) * 1.25, z1 = Math.sin(a) * 1.25; cuerda.position.set(x1 / 2, 2.4, z1 / 2); cuerda.scale.y = Math.hypot(x1, 3.3, z1); cuerda.lookAt(x1, 4.1, z1); cuerda.rotateX(Math.PI / 2); para.add(cuerda); }
    g.add(para); g.userData.para = para;
  }
  const brillo = new THREE.Mesh(gz('plano', () => { const p = new THREE.PlaneGeometry(1, 1); p.rotateX(-Math.PI / 2); return p; }), mat('brillo').clone());
  brillo.material.color.set(COLOR_ITEM[it.tipo] || '#fff'); brillo.scale.setScalar(it.tipo === 'caja' ? 2.2 : 1.1); brillo.position.y = .02; g.add(brillo);
  g.userData.brillo = brillo; g.userData.cont = cont; g.userData.fase = rnd(0, TAU);
  return g;
}
function crearGranadaMalla() {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(gz('granada', () => new THREE.SphereGeometry(.045, 12, 10)), new THREE.MeshStandardMaterial({ color: '#3d4a28', roughness: .6, metalness: .3 })); cuerpo.scale.y = 1.25; cuerpo.castShadow = true; g.add(cuerpo);
  const tapa = new THREE.Mesh(gz('gtapa', () => new THREE.CylinderGeometry(.018, .02, .03, 8)), mat('metalClaro')); tapa.position.y = .065; g.add(tapa);
  const palanca = new THREE.Mesh(gz('gpal', () => new THREE.BoxGeometry(.012, .07, .02)), mat('metalClaro')); palanca.position.set(.03, .045, 0); palanca.rotation.z = -.3; g.add(palanca);
  return g;
}
function actualizarItems(J, dt) {
  const vistos = new Set();
  for (const it of J.items) {
    vistos.add(it);
    let o = itemVis.get(it);
    if (!o) {
      o = crearItemMalla(it); o.position.set(it.x, 0, it.y); escena.add(o); itemVis.set(it, o);
      if (it.tipo === 'caja' && J.tiempo > 2) o.userData.cae = 0;
    }
    const u = o.userData;
    u.fase += dt;
    if (it.tipo !== 'caja') { u.cont.position.y = (it.tipo === 'granada' ? .06 : 0) + .04 + Math.sin(u.fase * 2) * .03; u.cont.rotation.y += dt * .6; }
    u.brillo.material.opacity = .45 + Math.sin(u.fase * 3) * .2;
    if (u.cae != null && u.cae < 1) {
      u.cae = Math.min(1, u.cae + dt / 3.2);
      o.position.y = (1 - u.cae) * 22;
      o.rotation.z = Math.sin(u.fase * 1.5) * .08 * (1 - u.cae);
      if (u.cae >= 1) { for (let i = 0; i < 25; i++) pHumo.emitir({ x: it.x + rnd(-.6, .6), y: .2, z: it.y + rnd(-.6, .6), vx: rnd(-1.5, 1.5), vy: rnd(.2, .8), vz: rnd(-1.5, 1.5), roce: 1.5, vida: rnd(1, 2), t0: .6, t1: 1.6, r: .55, g: .48, b: .38, a: .5, a1: 0 }); u.caido = 0; }
    } else if (u.para) {
      u.caido = (u.caido || 0) + dt;
      u.para.position.y = -Math.min(3.9, u.caido * 2.2); u.para.rotation.z = Math.min(1.3, u.caido * .8);
      if (u.caido > 2.5) u.para.visible = false;
    }
    if (it.tipo === 'caja' && Math.random() < dt * 14 * Qc().part) pHumo.emitir({ x: it.x + .35, y: .75 + o.position.y, z: it.y + .35, vx: rnd(-.2, .2), vy: rnd(.8, 1.3), vz: rnd(-.2, .2), vida: rnd(2, 3.5), t0: .25, t1: 1.3, r: .9, g: .2, b: .15, a: .55, a1: 0, roce: .3 });
  }
  for (const [it, o] of itemVis) if (!vistos.has(it)) {
    escena.remove(o); itemVis.delete(it);
    for (let i = 0; i < 14; i++) pAdd.emitir({ x: it.x, y: .2, z: it.y, vx: rnd(-.8, .8), vy: rnd(.5, 2), vz: rnd(-.8, .8), vida: rnd(.4, .8), t0: .07, t1: 0, ...colRGB(COLOR_ITEM[it.tipo] || '#fff'), a: 1, a1: 0 });
  }
  // luz roja de la caja más cercana
  let caja = null, cd = 1e9;
  for (const it of J.items) if (it.tipo === 'caja') { const d = Math.hypot(it.x - cam.position.x, it.y - cam.position.z); if (d < cd) { cd = d; caja = it; } }
  if (caja) { const o = itemVis.get(caja); luzCaja.position.set(caja.x + .35, .9 + (o ? o.position.y : 0), caja.y + .35); luzCaja.intensity = 1.6 + Math.sin(J_t * 9) * .4 + Math.random() * .3; }
  else luzCaja.intensity = 0;
}
const _c = new THREE.Color();
function colRGB(h) { _c.set(h); return { r: _c.r, g: _c.g, b: _c.b }; }

// ================= Granadas en vuelo =================
const granVis = new Map();
function actualizarGranadas(J, dt) {
  const vistos = new Set();
  for (const gr of J.granadas) {
    vistos.add(gr);
    let o = granVis.get(gr);
    if (!o) {
      o = crearGranadaMalla(); o.scale.setScalar(1.3);
      o.userData = { x0: cam.position.x, y0: cam.position.y - .2, z0: cam.position.z, t: 0 };
      const luz = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), mat('focoRojo')); luz.position.y = .08; o.add(luz); o.userData.luz = luz;
      escena.add(o); granVis.set(gr, o);
    }
    const u = o.userData;
    u.t += dt;
    const k = clamp(u.t / .6, 0, 1);
    if (k < 1) {
      o.position.set(lerp(u.x0, gr.x, k), lerp(u.y0, .06, k) + Math.sin(k * Math.PI) * 1.6, lerp(u.z0, gr.y, k));
      o.rotation.x += dt * 12; o.rotation.z += dt * 7;
    } else { o.position.set(gr.x, .06, gr.y); o.rotation.x = lerp(o.rotation.x, Math.PI / 2, dt * 6); }
    u.luz.visible = Math.sin(J_t * (gr.t < 1 ? 30 : 14)) > 0;
  }
  for (const [gr, o] of granVis) if (!vistos.has(gr)) { escena.remove(o); granVis.delete(gr); }
}

// ================= Explosiones, sangre, disparos =================
let temblor = 0, rojoDaño = 0, flashExpl = 0;
function explosionVis(x, z) {
  const d = Math.hypot(x - cam.position.x, z - cam.position.z);
  temblor = Math.max(temblor, clamp(1.4 - d / 14, .1, 1.2));
  luzExplosion.position.set(x, 1.5, z); luzExplosion.intensity = 40; flashExpl = 1;
  const k = Qc().part;
  for (let i = 0; i < 70 * k; i++) { const a = rnd(0, TAU), v = rnd(2, 9), u = rnd(.2, 1); pAdd.emitir({ x, y: .4, z, vx: Math.cos(a) * v * u, vy: rnd(1, 7), vz: Math.sin(a) * v * u, roce: 2.5, grav: 1.5, vida: rnd(.35, .9), t0: rnd(.5, 1.2), t1: rnd(1.3, 2.2), r: 1, g: rnd(.45, .7), b: .15, a: 1, a1: 0 }); }
  for (let i = 0; i < 40 * k; i++) { const a = rnd(0, TAU), v = rnd(5, 16); pAdd.emitir({ x, y: .4, z, vx: Math.cos(a) * v, vy: rnd(2, 10), vz: Math.sin(a) * v, grav: 14, vida: rnd(.5, 1.2), t0: .06, t1: .02, r: 1, g: .8, b: .4, a: 1, a1: .3, suelo: true }); }
  for (let i = 0; i < 34 * k; i++) { const a = rnd(0, TAU), v = rnd(.5, 3); pHumo.emitir({ x: x + rnd(-.5, .5), y: rnd(.3, 1.5), z: z + rnd(-.5, .5), vx: Math.cos(a) * v, vy: rnd(.8, 2.5), vz: Math.sin(a) * v, roce: 1.2, vida: rnd(2.5, 4.5), t0: rnd(1, 2), t1: rnd(3.5, 5.5), r: .16, g: .14, b: .13, a: .7, a1: 0 }); }
  for (let i = 0; i < 26 * k; i++) { const a = rnd(0, TAU), v = rnd(3, 8); pNorm.emitir({ x, y: .3, z, vx: Math.cos(a) * v, vy: rnd(2, 7), vz: Math.sin(a) * v, grav: 12, vida: rnd(.8, 1.4), t0: .07, t1: .05, r: .2, g: .16, b: .1, a: 1, a1: 1, suelo: true }); }
  quemadura(x, z);
}
function sangreVis(z, alto, fuerte) {
  const v = zVis.get(z.id);
  const x = v ? v.raiz.position.x : z.x, zz = v ? v.raiz.position.z : z.y, y0 = v ? v.raiz.position.y : 0;
  const esc = v ? v.C.esc : 1;
  const y = y0 + alto * esc;
  const ax = x - cam.position.x, az = zz - cam.position.z, l = Math.hypot(ax, az) || 1;
  const n = (fuerte ? 30 : 16) * Qc().part;
  for (let i = 0; i < n; i++) pNorm.emitir({ x, y, z: zz, vx: ax / l * rnd(.5, 3.5) + rnd(-1, 1), vy: rnd(-.5, 2.5), vz: az / l * rnd(.5, 3.5) + rnd(-1, 1), grav: 9.8, vida: rnd(.4, .9), t0: rnd(.04, .1), t1: .03, r: .38, g: .02, b: .02, a: 1, a1: .8, suelo: true });
  for (let i = 0; i < 4; i++) pNorm.emitir({ x, y, z: zz, vx: ax / l * .6, vy: .2, vz: az / l * .6, roce: 3, vida: rnd(.3, .5), t0: .15, t1: .45, r: .45, g: .03, b: .03, a: .6, a1: 0 });
  if (v) v.flinch = 1;
  if (Math.random() < .5) manchaSangre(x + ax / l * rnd(.3, 1), zz + az / l * rnd(.3, 1), rnd(.3, .7));
}
function chispas(x, y, z, col) {
  for (let i = 0; i < 10 * Qc().part; i++) pAdd.emitir({ x, y, z, vx: rnd(-2, 2), vy: rnd(0, 3), vz: rnd(-2, 2), grav: 9.8, vida: rnd(.15, .4), t0: .035, t1: .01, r: 1, g: .8, b: .45, a: 1, a1: 0 });
  for (let i = 0; i < 4; i++) pHumo.emitir({ x, y, z, vx: rnd(-.3, .3), vy: rnd(.1, .5), vz: rnd(-.3, .3), roce: 2, vida: rnd(.8, 1.4), t0: .15, t1: .6, ...(col || { r: .5, g: .45, b: .4 }), a: .4, a1: 0 });
}

// ================= Arma en la mano =================
function caja(w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function cil(r, l, m, x, y, z, eje = 'z', seg = 14, r2 = r) { const g = new THREE.CylinderGeometry(r2, r, l, seg); if (eje === 'z') g.rotateX(Math.PI / 2); if (eje === 'x') g.rotateZ(Math.PI / 2); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; }
function crearArma(id) {
  const g = new THREE.Group(), mo = mat('metalOsc'), mc = mat('metalClaro'), mad = mat('madera'), pol = mat('polimero'), vi = mat('vidrio');
  let boca = new THREE.Vector3(0, 0, -.2), mano2 = -.15, retro = .6, expulsa = true;
  const add = (...o) => o.forEach(x => g.add(x));
  switch (id) {
    case 'pistola':
      add(caja(.034, .036, .19, mo, 0, .01, -.08), caja(.03, .026, .16, pol, 0, -.02, -.07), caja(.03, .11, .045, pol, 0, -.075, .0, .22), caja(.006, .03, .04, pol, 0, -.045, -.04), cil(.008, .02, mo, 0, .012, -.18));
      boca.set(0, .012, -.19); mano2 = .02; retro = .7; break;
    case 'revolver':
      add(cil(.011, .17, mo, 0, .015, -.17), cil(.028, .05, mc, 0, .0, -.05), caja(.03, .04, .1, mo, 0, .01, -.05), caja(.032, .11, .045, mad, 0, -.07, .02, .3), caja(.004, .018, .02, mo, 0, .035, -.24));
      boca.set(0, .015, -.255); mano2 = .03; retro = 1; expulsa = false; break;
    case 'escopeta':
      add(cil(.014, .62, mo, 0, .022, -.38), cil(.012, .5, mo, 0, -.008, -.33), caja(.046, .048, .17, mad, 0, -.008, -.34), caja(.046, .065, .17, mo, 0, .005, -.0), caja(.042, .085, .3, mad, 0, -.035, .21, .12), caja(.01, .03, .05, mo, 0, -.04, .02));
      boca.set(0, .022, -.69); mano2 = -.34; retro = 1.5; break;
    case 'doble':
      add(cil(.014, .55, mo, -.014, .02, -.35), cil(.014, .55, mo, .014, .02, -.35), caja(.05, .03, .26, mad, 0, -.005, -.24), caja(.05, .06, .12, mc, 0, .005, -.02), caja(.044, .09, .3, mad, 0, -.035, .18, .14));
      boca.set(0, .02, -.62); mano2 = -.24; retro = 1.7; expulsa = false; break;
    case 'subfusil':
      add(caja(.045, .06, .26, mo, 0, .01, -.06), cil(.01, .1, mo, 0, .015, -.24), caja(.026, .14, .035, pol, 0, -.08, -.08, -.1), caja(.03, .09, .04, pol, 0, -.06, .04, .25), caja(.012, .012, .2, mo, 0, .01, .14), caja(.01, .02, .02, mo, 0, .05, -.15));
      boca.set(0, .015, -.29); mano2 = -.1; retro = .3; break;
    case 'fusil':
      add(caja(.05, .065, .3, mo, 0, .0, -.05), cil(.009, .32, mo, 0, .012, -.34), caja(.052, .05, .18, mad, 0, -.005, -.24), cil(.007, .16, mo, 0, .045, -.25), caja(.04, .07, .26, mad, 0, -.028, .22, .1), caja(.006, .03, .01, mo, 0, .04, -.45), caja(.03, .09, .04, mad, 0, -.07, .05, .3));
      { const m1 = caja(.028, .09, .05, mo, 0, -.075, -.1, .25), m2 = caja(.028, .08, .05, mo, 0, -.15, -.12, .5); add(m1, m2); }
      boca.set(0, .012, -.5); mano2 = -.24; retro = .35; break;
    case 'ametralladora':
      add(caja(.07, .09, .42, mo, 0, .0, -.05), cil(.016, .45, mo, 0, .015, -.48), cil(.026, .25, mc, 0, .015, -.35, 'z', 10), caja(.08, .09, .11, mat('oliva'), .07, -.03, -.06), caja(.05, .08, .26, pol, 0, -.02, .28), caja(.03, .1, .04, pol, 0, -.08, .05, .3), caja(.02, .03, .12, mo, 0, .07, -.05));
      for (let i = 0; i < 6; i++) add(caja(.012, .03, .008, mat('bronce'), .05 + i * .006, -.08 - i * .012, -.06 + i * .01));
      for (const s of [-1, 1]) add(caja(.008, .2, .008, mo, s * .03, -.1, -.6, 0, 0, s * .3));
      boca.set(0, .015, -.71); mano2 = -.25; retro = .45; break;
    case 'rifle':
      add(caja(.045, .06, .78, mad, 0, -.02, -.05), cil(.011, .5, mo, 0, .012, -.42), caja(.04, .045, .14, mo, 0, .015, -.04), cil(.022, .3, mo, 0, .062, -.08), cil(.026, .05, vi, 0, .062, -.24), cil(.026, .05, vi, 0, .062, .08), cil(.006, .05, mo, .03, .02, .01, 'x'));
      boca.set(0, .012, -.67); mano2 = -.25; retro = 1.3; break;
    case 'francotirador':
      add(caja(.05, .07, .55, pol, 0, -.01, -.05), cil(.014, .6, mo, 0, .015, -.55), caja(.04, .03, .07, mo, 0, .015, -.86), cil(.028, .36, mo, 0, .075, -.08), cil(.032, .06, vi, 0, .075, -.28), cil(.032, .06, vi, 0, .075, .12), caja(.045, .09, .26, pol, 0, -.04, .3), caja(.03, .1, .04, pol, 0, -.07, .06, .3));
      for (const s of [-1, 1]) add(caja(.008, .22, .008, mo, s * .035, -.1, -.5, 0, 0, s * .35));
      boca.set(0, .015, -.9); mano2 = -.25; retro = 1.8; break;
    case 'lanzagranadas':
      add(cil(.038, .4, mo, 0, .01, -.2), cil(.042, .06, mc, 0, .01, -.4), caja(.03, .1, .04, pol, 0, -.07, -.0, .25), caja(.03, .08, .04, pol, 0, -.06, -.2), caja(.006, .05, .03, mo, 0, .06, -.12), caja(.04, .07, .2, pol, 0, -.01, .12));
      boca.set(0, .01, -.42); mano2 = -.2; retro = 1.2; expulsa = false; break;
    case 'ballesta':
      add(caja(.04, .05, .5, mad, 0, -.01, -.1), caja(.03, .1, .04, mad, 0, -.07, .08, .3), caja(.04, .08, .18, mad, 0, -.02, .18));
      for (const s of [-1, 1]) { add(caja(.24, .02, .03, mo, s * .12, 0, -.34, 0, s * .45, 0)); add(caja(.004, .004, .28, mat('tela'), s * .1, 0, -.22, 0, s * -1.08, 0)); }
      add(cil(.005, .34, mc, 0, .03, -.2), cil(.01, .04, mo, 0, .03, -.38, 'z', 6, 0));
      boca.set(0, .03, -.4); mano2 = -.25; retro = .8; expulsa = false; break;
    default:
      add(caja(.034, .036, .19, mo, 0, .01, -.08));
  }
  g.traverse(o => { if (o.isMesh) o.material = o.material; });
  return { g, boca, mano2, retro, expulsa };
}
function crearBlanca(tipo) {
  const g = new THREE.Group(), ac = mat('acero'), mad = mat('madera'), pol = mat('polimero');
  const add = (...o) => o.forEach(x => g.add(x));
  switch (tipo) {
    case 'cuchillo': add(cil(.013, .11, pol, 0, 0, .0), caja(.004, .032, .18, ac, 0, .006, -.14), caja(.06, .012, .012, ac, 0, 0, -.055)); break;
    case 'machete': add(cil(.014, .13, mad, 0, 0, 0), caja(.004, .055, .46, ac, 0, .01, -.29), caja(.004, .02, .1, ac, 0, .035, -.48, .4)); break;
    case 'hacha': add(cil(.016, .62, mad, 0, 0, -.22), caja(.022, .13, .1, ac, 0, .04, -.5), caja(.01, .16, .03, ac, 0, .06, -.56)); break;
    case 'martillo': add(cil(.014, .34, mad, 0, 0, -.1), cil(.022, .13, ac, 0, .0, -.28, 'y')); break;
    case 'golf': add(cil(.012, .1, pol, 0, 0, 0), cil(.006, .85, ac, 0, 0, -.45), caja(.03, .04, .1, ac, 0, -.02, -.88)); break;
    case 'bate': add(cil(.016, .72, mad, 0, 0, -.32, 'z', 14, .034)); break;
    case 'espada': add(cil(.013, .15, mat('maderaOsc'), 0, 0, 0), caja(.16, .018, .02, mat('bronce'), 0, 0, -.08), caja(.006, .045, .76, ac, 0, 0, -.46), new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), mat('bronce'))); g.children[g.children.length - 1].position.z = .08; break;
    case 'motosierra': add(caja(.12, .14, .28, mat('naranja'), 0, 0, .02), caja(.012, .06, .46, ac, 0, -.01, -.32), caja(.016, .066, .46, pol, 0, -.01, -.32), cil(.012, .14, pol, 0, .1, -.06, 'x'), caja(.03, .03, .12, pol, 0, .02, .2)); break;
    default: add(caja(.06, .06, .1, mat('guante'), 0, 0, 0)); // puños
  }
  return { g };
}
// manos
function crearManos() {
  const g = new THREE.Group();
  const der = new THREE.Group();
  const antD = new THREE.Mesh(new THREE.CapsuleGeometry(.038, .28, 4, 8), mat('manga')); antD.rotation.x = Math.PI / 2 - .25; antD.position.set(.02, -.13, .17); der.add(antD);
  const manoD = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .09), mat('guante')); manoD.position.set(0, -.07, .02); der.add(manoD);
  const izq = new THREE.Group();
  const antI = new THREE.Mesh(new THREE.CapsuleGeometry(.036, .3, 4, 8), mat('manga')); antI.rotation.set(Math.PI / 2 - .35, .5, 0); antI.position.set(-.09, -.12, .14); izq.add(antI);
  const manoI = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .08), mat('guante')); manoI.position.set(0, -.04, 0); izq.add(manoI);
  g.add(der, izq);
  return { g, der, izq };
}

const VM = { grupo: new THREE.Group(), arma: null, armaId: undefined, blanca: null, blancaId: undefined, manos: crearManos(), patada: 0, cambio: 1, golpeT: 0, recargaK: 0, balanceo: 0, fogonazo: null, vainas: [] };
vmEscena.add(VM.grupo);
VM.grupo.add(VM.manos.g);
const vmHemi = new THREE.HemisphereLight('#fff', '#333', .9); vmEscena.add(vmHemi);
const vmSol = new THREE.DirectionalLight('#fff', 1.2); vmSol.position.set(.5, 1, .6); vmEscena.add(vmSol);
const vmLuzDisparo = new THREE.PointLight('#ffb35a', 0, 2, 2); vmLuzDisparo.position.set(0, 0, -.6); vmEscena.add(vmLuzDisparo);
VM.fogonazo = new THREE.Group();
for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), mat('fogonazo')); p.rotation.y = i * Math.PI / 3; VM.fogonazo.add(p); }
const fogFrente = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), mat('fogonazo')); fogFrente.rotation.x = 0; VM.fogonazo.add(fogFrente);
VM.fogonazo.visible = false;
const vmBlancaGrupo = new THREE.Group(); VM.grupo.add(vmBlancaGrupo);

function ponerArmaVM(id) {
  if (VM.arma) { VM.grupo.remove(VM.arma.g); VM.arma = null; }
  VM.armaId = id;
  if (!id) return;
  VM.arma = crearArma(id); VM.arma.g.scale.setScalar(.85);
  VM.arma.g.add(VM.fogonazo); VM.fogonazo.position.copy(VM.arma.boca);
  VM.grupo.add(VM.arma.g);
  VM.manos.izq.position.set(-.005, -.03, VM.arma.mano2);
  VM.manos.izq.visible = !['pistola', 'revolver'].includes(id);
  VM.cambio = 0;
}
function ponerBlancaVM(tipo) {
  while (vmBlancaGrupo.children.length) vmBlancaGrupo.remove(vmBlancaGrupo.children[0]);
  VM.blancaId = tipo;
  VM.blanca = crearBlanca(tipo || 'puños');
  vmBlancaGrupo.add(VM.blanca.g);
}
function disparoVM(id) {
  const a = VM.arma; if (!a) return;
  VM.patada = Math.min(1.6, VM.patada + a.retro);
  VM.fogonazo.visible = true; VM.fogT = .05;
  VM.fogonazo.rotation.z = rnd(0, TAU); VM.fogonazo.scale.setScalar(rnd(.8, 1.3) * (['escopeta', 'doble', 'francotirador', 'ametralladora'].includes(id) ? 1.6 : 1));
  vmLuzDisparo.intensity = 4;
  if (id === 'ballesta' || id === 'lanzagranadas') { VM.fogonazo.visible = false; vmLuzDisparo.intensity = 0; }
  if (a.expulsa && VM.vainas.length < 25) {
    const v = new THREE.Mesh(gz('vaina', () => new THREE.CylinderGeometry(.006, .006, .025, 6)), mat('bronce'));
    v.position.copy(a.g.position).add(new THREE.Vector3(.03, .035, -.05)); vmEscena.add(v);
    VM.vainas.push({ m: v, vx: rnd(.7, 1.1), vy: rnd(.8, 1.2), vz: rnd(-.1, .2), t: 0, rx: rnd(5, 15) });
  }
}

// ================= Estado de dibujo =================
let J_t = 0;
let enArbolK = 0, ultimoArbol = null;
VM.fogT = 0;
let ojoAlto = 1.65, pitch = 0, bob = 0, bobFase = 0, ultX = null, ultY = null, rollMuerte = 0, yawSuave = 0;
let mundoDe = null, tiendaVis = null, demo = null;
let ultimaFase = null, ultimaRonda = 0;

// eventos que manda el juego
const COLA = [];
window.GRAF = {
  evento(tipo, d) { COLA.push({ tipo, d }); },
  modo: () => modo,
  _int: () => ({ VM, escena, vmEscena, vmCam, cam, zVis, crearArma, crearBlanca })
};
function procesarEventos(J) {
  while (COLA.length) {
    const { tipo, d } = COLA.shift();
    if (tipo === 'disparo') {
      disparoVM(d.arma);
      luzDisparo.intensity = d.arma === 'ballesta' || d.arma === 'lanzagranadas' ? 0 : 6;
      const P = J.jug;
      const f = new THREE.Vector3(Math.sin(P.ang), 0, -Math.cos(P.ang));
      if (!d.blancos.length && !d.explota) {
        const px = P.x + f.x * d.dist, pz = P.y + f.z * d.dist;
        if (d.pared) setTimeout(() => chispas(px - f.x * .1, ojoAlto - .1 + rnd(-.15, .15), pz - f.z * .1, J.mapa.casa ? { r: .6, g: .55, b: .45 } : { r: .4, g: .32, b: .22 }), d.dist * 8);
        trazador(d.dist, d.arma);
      } else if (d.blancos.length) trazador(d.blancos[0].d, d.arma);
      marcaMira = d.blancos.length ? .25 : 0;
    } else if (tipo === 'golpe') {
      VM.golpeT = .38; VM.golpeTipo = d.tipo;
    } else if (tipo === 'impacto') {
      const alto = d.clase === 'explosion' ? 1.1 : d.cuerpo ? 1.25 : [1.62, 1.25, .6][J.jug.zona] || 1.2;
      sangreVis(d.z, alto, d.cabeza || d.clase === 'rifle' || d.clase === 'perdigon');
    } else if (tipo === 'muerte') {
      ultimaMuerte.set(d.z.id, { cabeza: d.cabeza, explosion: d.clase === 'explosion' });
      if (d.cabeza) marcaMuerte = .4;
    } else if (tipo === 'explosion') explosionVis(d.x, d.y);
    else if (tipo === 'herido') { rojoDaño = Math.min(1, rojoDaño + .35 + d.n / 60); temblor = Math.max(temblor, .25 + d.n / 80); }
  }
}
const trazos = [];
const trazoMat = new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
function trazador(dist, arma) {
  if (arma === 'ballesta' || arma === 'lanzagranadas') {
    if (arma === 'lanzagranadas') { for (let i = 0; i < 10; i++) pHumo.emitir({ x: cam.position.x, y: cam.position.y - .15, z: cam.position.z, vx: rnd(-.3, .3), vy: rnd(0, .4), vz: rnd(-.3, .3), roce: 2, vida: 1.2, t0: .2, t1: .8, r: .6, g: .6, b: .6, a: .4, a1: 0 }); }
    return;
  }
  if (Math.random() < .4 && !['escopeta', 'doble', 'rifle', 'francotirador', 'ametralladora', 'fusil', 'subfusil'].includes(arma)) return;
  const m = new THREE.Mesh(gz('trazo', () => { const g = new THREE.BoxGeometry(.012, .012, 1); g.translate(0, 0, -.5); return g; }), trazoMat);
  const o = new THREE.Vector3(.12, -.14, -.6).applyQuaternion(cam.quaternion).add(cam.position);
  const fin = new THREE.Vector3(0, 0, -Math.min(dist, 60)).applyQuaternion(cam.quaternion).add(cam.position);
  m.position.copy(o); m.lookAt(fin); m.scale.z = o.distanceTo(fin);
  escena.add(m); trazos.push({ m, t: .06 });
}
let marcaMira = 0, marcaMuerte = 0;

// ================= HUD visible =================
const hud = document.createElement('div');
hud.id = 'hud3d'; hud.setAttribute('aria-hidden', 'true');
hud.innerHTML = `
  <div class="h-sup">
    <div class="h-vida"><div class="h-bar"><i id="g-vida"></i><b id="g-vidaN">100</b></div><div class="h-bar h-chaleco" id="g-chalecoB"><i id="g-chaleco"></i></div><div class="h-chico" id="g-bot"></div></div>
    <div class="h-brujula"><div id="g-brujula"></div><span class="h-aguja"></span></div>
    <div class="h-pts"><div><small>Puntos</small><b id="g-pts">0</b></div><div><small>Plata</small><b id="g-plata">0</b></div></div>
  </div>
  <div id="g-banner"></div>
  <div id="g-mision"></div>
  <div class="h-mira" id="g-mira"><i></i><i></i><i></i><i></i><span></span></div>
  <div id="g-zona"></div>
  <div id="g-marca">✕</div>
  <div class="h-inf">
    <div class="h-blanca"><small id="g-blancaN">Cuchillo</small><div class="h-dur"><i id="g-blancaD"></i></div><div class="h-chico" id="g-gran"></div></div>
    <div class="h-arma"><small id="g-armaN">Pistola</small><div class="h-mun"><b id="g-carg">12</b><span id="g-res">/ 0</span></div><div class="h-dur"><i id="g-armaD"></i></div></div>
  </div>
  <div id="g-rojo"></div>
  <div id="g-agarre">¡TE AGARRÓ! &nbsp; F</div>`;
document.body.appendChild(hud);
const $g = id => document.getElementById(id);
const PUNTOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
(() => { let h = ''; for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) h += `<span class="${i % 2 ? 'c2' : ''}">${PUNTOS[i]}</span>`; $g('g-brujula').innerHTML = h; })();

const estilo = document.createElement('style');
estilo.textContent = `
  #vista { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; z-index: 0; background: #000; }
  #velo { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 40%, rgba(0,0,0,.05), rgba(0,0,0,.55) 75%), linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.35)); }
  body.g3d { background: #000; overflow: hidden; }
  body.g3d main { position: relative; z-index: 2; }
  body.g3d #inicio h1 { font-size: clamp(3rem, 9vw, 6rem); text-shadow: 0 4px 30px rgba(0,0,0,.9), 0 0 60px rgba(160,0,0,.45); letter-spacing: .08em; }
  body.g3d #inicio .sub, body.g3d .version { text-shadow: 0 2px 8px #000; color: #d3dccd; }
  body.g3d .menu button { background: rgba(20,28,18,.72); backdrop-filter: blur(6px); }
  body.g3d .menu button.principal { background: rgba(60,107,47,.85); }
  body.g3d #mapas h2 { text-shadow: 0 2px 10px #000; }
  body.g3d.jugando #velo { display: none; }
  body.g3d.jugando #hud { display: none; }
  body.g3d.jugando #juego { position: fixed; inset: 0; pointer-events: none; }
  body.g3d.jugando #textoVisible { position: fixed; left: 50%; bottom: 118px; transform: translateX(-50%); max-width: min(680px, 80vw); font-size: .95rem; background: rgba(0,0,0,.4); padding: 5px 14px; border-radius: 10px; text-shadow: 0 1px 3px #000; z-index: 3; }
  body.g3d.jugando #textoVisible:empty { display: none; }
  #hud3d { display: none; position: fixed; inset: 0; z-index: 1; pointer-events: none; color: #eef3ea; font-family: system-ui, "Segoe UI", sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,.9); }
  body.g3d.jugando #hud3d { display: block; }
  .h-sup { position: absolute; top: 14px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .h-vida { width: min(300px, 32vw); }
  .h-bar { position: relative; height: 22px; background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.25); border-radius: 4px; overflow: hidden; transform: skewX(-12deg); }
  .h-bar i { position: absolute; inset: 0; width: 100%; background: linear-gradient(90deg, #7a0d0d, #e0402c); transition: width .25s; }
  .h-bar b { position: absolute; left: 10px; top: 0; line-height: 22px; font-size: .95rem; transform: skewX(12deg); }
  .h-chaleco { height: 7px; margin-top: 4px; display: none; } .h-chaleco i { background: linear-gradient(90deg, #1d4f8a, #5aa8ff); }
  .h-chico { margin-top: 6px; font-size: .9rem; font-weight: 600; opacity: .9; }
  .h-brujula { position: relative; width: min(420px, 34vw); height: 30px; overflow: hidden; background: linear-gradient(90deg, transparent, rgba(0,0,0,.5) 20%, rgba(0,0,0,.5) 80%, transparent); border-top: 1px solid rgba(255,255,255,.2); border-bottom: 1px solid rgba(255,255,255,.2); }
  #g-brujula { position: absolute; top: 0; left: 0; height: 30px; display: flex; white-space: nowrap; }
  #g-brujula span { display: inline-block; width: 60px; text-align: center; line-height: 30px; font-weight: 800; font-size: 1rem; }
  #g-brujula span.c2 { font-size: .75rem; opacity: .7; }
  .h-aguja { position: absolute; left: 50%; top: 0; width: 2px; height: 8px; background: #ffcf4a; transform: translateX(-1px); }
  .h-pts { display: flex; gap: 18px; text-align: right; } .h-pts small { display: block; font-size: .72rem; opacity: .75; text-transform: uppercase; letter-spacing: .1em; } .h-pts b { font-size: 1.5rem; }
  #g-banner { position: absolute; top: 18vh; left: 0; right: 0; text-align: center; font-size: clamp(1.6rem, 4vw, 3.2rem); font-weight: 900; letter-spacing: .12em; opacity: 0; transition: opacity .4s; text-shadow: 0 3px 20px #000, 0 0 30px rgba(180,0,0,.6); }
  #g-banner small { display: block; font-size: .4em; letter-spacing: .25em; opacity: .85; font-weight: 700; }
  #g-mision { position: absolute; top: 64px; right: 16px; max-width: 320px; text-align: right; font-size: .88rem; font-weight: 600; line-height: 1.35; }
  #g-mision .dif { color: #ffcc4a; }
  .h-mira { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
  .h-mira i { position: absolute; background: rgba(255,255,255,.9); box-shadow: 0 0 2px #000; transition: transform .08s; }
  .h-mira i:nth-child(1) { width: 2px; height: 10px; left: -1px; top: -22px; } .h-mira i:nth-child(2) { width: 2px; height: 10px; left: -1px; top: 12px; }
  .h-mira i:nth-child(3) { width: 10px; height: 2px; left: -22px; top: -1px; } .h-mira i:nth-child(4) { width: 10px; height: 2px; left: 12px; top: -1px; }
  .h-mira span { position: absolute; width: 4px; height: 4px; left: -2px; top: -2px; border-radius: 50%; background: #fff; box-shadow: 0 0 2px #000; }
  .h-mira.lock i, .h-mira.lock span { background: #ff3a2a; }
  #g-zona { position: absolute; left: 50%; top: calc(50% + 30px); transform: translateX(-50%); font-size: .72rem; font-weight: 800; letter-spacing: .2em; opacity: .75; }
  #g-marca { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -52%); font-size: 30px; color: #fff; opacity: 0; font-weight: 900; }
  .h-inf { position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .h-arma, .h-blanca { background: linear-gradient(90deg, transparent, rgba(0,0,0,.45)); padding: 8px 14px; border-radius: 8px; min-width: 200px; }
  .h-blanca { background: linear-gradient(270deg, transparent, rgba(0,0,0,.45)); }
  .h-arma { text-align: right; } .h-arma small, .h-blanca small { font-size: .9rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .9; }
  .h-mun b { font-size: 3rem; font-weight: 900; line-height: 1; } .h-mun span { font-size: 1.3rem; opacity: .8; margin-left: 6px; }
  .h-dur { height: 4px; background: rgba(255,255,255,.18); margin-top: 6px; border-radius: 2px; overflow: hidden; } .h-dur i { display: block; height: 100%; background: #c9e8b8; transition: width .3s; }
  #g-rojo { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 45%, rgba(150,0,0,.85)); opacity: 0; }
  #g-agarre { position: absolute; left: 0; right: 0; top: 62%; text-align: center; font-size: 2.2rem; font-weight: 900; color: #ff4a3a; letter-spacing: .1em; display: none; text-shadow: 0 0 20px #000, 0 2px 4px #000; }
  @media (max-width: 640px) { .h-brujula { display: none; } .h-mun b { font-size: 2.2rem; } .h-arma, .h-blanca { min-width: 0; } }
`;
document.head.appendChild(estilo);

let bannerT = 0;
function banner(txt, sub, dur = 2.5) { const b = $g('g-banner'); b.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); b.style.opacity = 1; bannerT = dur; }
let hudT = 0;
function actualizarHud3D(J, dt) {
  const P = J.jug;
  hudT -= dt;
  $g('g-agarre').style.display = P.agarrado ? 'block' : 'none';
  // brújula: 60px por octavo
  const grados = ((P.ang % TAU) + TAU) % TAU / TAU * 360;
  const ancho = $g('g-brujula').parentElement.clientWidth;
  $g('g-brujula').style.transform = `translateX(${ancho / 2 - 30 - (8 * 60) - grados / 45 * 60}px)`;
  // mira
  const mira = $g('g-mira');
  mira.classList.toggle('lock', !!J.lock);
  const ab = 1 + VM.patada * 6 + (Math.abs(bob) > .001 ? 3 : 0);
  mira.querySelectorAll('i').forEach((el, i) => { const d = [[0, -1], [0, 1], [-1, 0], [1, 0]][i]; el.style.transform = `translate(${d[0] * ab}px, ${d[1] * ab}px)`; });
  marcaMira = Math.max(0, marcaMira - dt); marcaMuerte = Math.max(0, marcaMuerte - dt);
  const mk = $g('g-marca'); mk.style.opacity = Math.max(marcaMira * 4, marcaMuerte * 2.5); mk.style.color = marcaMuerte > 0 ? '#ff3a2a' : '#fff';
  // rojo
  rojoDaño = Math.max(0, rojoDaño - dt * .8);
  const bajo = P.vida < 30 ? (.25 + Math.sin(J_t * 6) * .12) * (1 - P.vida / 30) + .1 : 0;
  $g('g-rojo').style.opacity = clamp(rojoDaño + bajo + (J.fase === 'fin' ? .8 : 0) + (P.agarrado ? .3 : 0), 0, 1);
  // banner de fases
  if (J.fase !== ultimaFase || J.ronda !== ultimaRonda) {
    if (J.fase === 'ronda') banner(`RONDA ${J.ronda}`, J.misionDificil ? 'MISIÓN DIFÍCIL · PUNTOS x2' : '', 3);
    else if (J.fase === 'descanso') banner('RONDA SUPERADA', 'DESCANSO', 3);
    else if (J.fase === 'recoleccion') banner(J.mapa.nombre.toUpperCase(), 'JUNTÁ TODO LO QUE PUEDAS', 3.5);
    else if (J.fase === 'fin') banner('TE COMIERON', `RONDA ${J.ronda} · ${J.puntos} PUNTOS`, 999);
    ultimaFase = J.fase; ultimaRonda = J.ronda;
  }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $g('g-banner').style.opacity = 0; }
  if (hudT > 0) return;
  hudT = .1;
  $g('g-vida').style.width = clamp(P.vida, 0, 100) + '%';
  $g('g-vidaN').textContent = Math.round(P.vida);
  $g('g-chalecoB').style.display = P.chaleco > 0 ? 'block' : 'none';
  $g('g-chaleco').style.width = clamp(P.chaleco, 0, 100) + '%';
  $g('g-bot').textContent = `✚ ${P.botiquines}   ●  ${P.granadas} granadas`;
  $g('g-pts').textContent = J.puntos; $g('g-plata').textContent = J.plata;
  const A = Z.ARMAS && P.actual ? Z.ARMAS[P.actual] : null;
  if (A) {
    const W_ = P.armas[P.actual];
    $g('g-armaN').textContent = A.nombre + (W_.rep && W_.rep.length ? `  +${W_.rep.length}` : '');
    $g('g-carg').textContent = W_.carg; $g('g-res').textContent = '/ ' + P.mun[A.mun];
    $g('g-armaD').style.width = clamp(W_.dur, 0, 100) + '%';
    $g('g-armaD').style.background = W_.dur < 20 ? '#ff6a4a' : '#c9e8b8';
    $g('g-carg').style.color = W_.carg === 0 ? '#ff5a4a' : '';
  } else { $g('g-armaN').textContent = 'Sin arma de fuego'; $g('g-carg').textContent = '–'; $g('g-res').textContent = ''; $g('g-armaD').style.width = '0'; }
  const B = P.blanca;
  $g('g-blancaN').textContent = B ? (Z.BLANCAS ? Z.BLANCAS[B.tipo].nombre : B.tipo) + (P.blancasRep.length ? `  +${P.blancasRep.length}` : '') : 'Manos';
  $g('g-blancaD').style.width = B ? clamp(B.dur, 0, 100) + '%' : '0';
  $g('g-zona').textContent = ['CABEZA', 'PECHO', 'PIERNAS'][P.zona] || '';
  let fase = '';
  if (J.fase === 'recoleccion') fase = `Llegan en ${Math.max(0, Math.ceil(J.faseT))} s`;
  else if (J.fase === 'descanso') fase = `Descanso: ${Math.max(0, Math.ceil(J.faseT))} s`;
  else if (J.fase === 'ronda') fase = `Ronda ${J.ronda} · quedan ${J.zombis.length + J.porSalir.length}`;
  let mis = `<div>${fase}</div>`;
  if (J.mision) mis += `<div>${J.mision.texto}${J.mision.meta ? ` (${J.mision.prog}/${J.mision.meta})` : ''}</div>`;
  if (J.misionDificil) mis += `<div class="dif">★ ${J.misionDificil.texto}${J.misionDificil.meta ? ` (${J.misionDificil.prog}/${J.misionDificil.meta})` : ''}</div>`;
  $g('g-mision').innerHTML = mis;
}

// ================= Demo del menú =================
function crearDemo() {
  const mapa = Z.crearMapa(elegir(['bosque', 'selva', 'jungla', 'desierto']));
  const zs = [];
  const tipos = ['comun', 'comun', 'corredor', 'tanque', 'griton', 'comun', 'trepador', 'comun'];
  tipos.forEach((t, i) => { const a = rnd(0, TAU), r = rnd(5, 12); zs.push({ id: -1 - i, tipo: t, x: mapa.inicio.x + Math.cos(a) * r, y: mapa.inicio.y + Math.sin(a) * r, estado: 'camina', ang: rnd(0, TAU), vel: ZTIPO_VEL[t] * .5 }); });
  return { mapa, zombis: zs, items: [], granadas: [], barricadas: new Map(), jug: { x: mapa.inicio.x, y: mapa.inicio.y, ang: 0, zona: 1, vida: 100, armas: {}, blancasRep: [] }, fase: 'demo', ronda: 0, tiempo: 0 };
}
const ZTIPO_VEL = { comun: 1, corredor: 2.4, tanque: .8, griton: 1.2, trepador: 1.5, jefe: 1 };
function moverDemo(D, dt) {
  D.tiempo += dt;
  const m = D.mapa;
  for (const z of D.zombis) {
    z.ang += rnd(-.6, .6) * dt;
    const dx = z.x - m.inicio.x, dy = z.y - m.inicio.y, d = Math.hypot(dx, dy);
    if (d > 13) z.ang = Math.atan2(-dx, -dy);
    const nx = z.x + Math.sin(z.ang) * z.vel * dt, ny = z.y + Math.cos(z.ang) * z.vel * dt;
    const c = m.g[Math.floor(ny) * m.W + Math.floor(nx)];
    if (c === VACIO) { z.x = nx; z.y = ny; } else z.ang += 1.5;
  }
  D.jug.ang = D.tiempo * .07;
}

// ================= Bucle de dibujo =================
let ultimo = performance.now(), activo = false;
function dibujar() {
  requestAnimationFrame(dibujar);
  const ahora = performance.now();
  const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
  if (modo === 'apagados') { if (activo) { activo = false; lienzoVista.style.display = velo.style.display = 'none'; document.body.classList.remove('g3d', 'jugando'); } return; }
  if (!activo) { activo = true; lienzoVista.style.display = velo.style.display = ''; document.body.classList.add('g3d'); }
  const juego = Z.J;
  const enJuego = !!juego && !document.getElementById('juego').hidden;
  document.body.classList.toggle('jugando', enJuego);
  let J = enJuego ? juego : null;
  if (!J) { if (!demo) demo = crearDemo(); moverDemo(demo, dt); J = demo; }
  else demo = null;
  const pausado = J.pausa;
  if (!pausado) { J_t += dt; uTiempo.value = J_t; }
  if (mundoDe !== J.mapa) {
    construirMundo(J.mapa); mundoDe = J.mapa;
    for (const v of zVis.values()) escena.remove(v.raiz); zVis.clear();
    for (const c of cadaveres) escena.remove(c.v.raiz); cadaveres.length = 0;
    for (const o of itemVis.values()) escena.remove(o); itemVis.clear();
    for (const o of granVis.values()) escena.remove(o); granVis.clear();
    if (tiendaVis) escena.remove(tiendaVis); tiendaVis = null;
    ojoAlto = 1.65; rollMuerte = 0; ultimaFase = null; ultimaRonda = 0; COLA.length = 0;
    VM.armaId = undefined; VM.blancaId = undefined;
  }
  if (J.tienda && !tiendaVis) { tiendaVis = construirTienda(J.tienda.x, J.tienda.y); escena.add(tiendaVis); luzTienda.position.set(J.tienda.x + .8, 2.1, J.tienda.y + .45); }
  luzTienda.visible = !!tiendaVis;
  if (tiendaVis) { luzTienda.intensity = 2.6 + Math.sin(J_t * 11) * .2 + Math.random() * .2; tiendaVis.userData.disco.rotation.y += dt * 3; }
  const P = J.jug;
  const ddt = pausado ? 0 : dt;
  if (enJuego && !pausado) procesarEventos(J);
  if (J.barricadas && mundo) actualizarBarricadas(J);

  // ---- cámara ----
  const enArbol = P.arbol || P.trepando > 0;
  const altoObj = J.fase === 'fin' ? .25 : (enArbol && !(P.bajando > 0)) ? 3.5 : (J === demo ? 1.75 : 1.65);
  ojoAlto = lerp(ojoAlto, altoObj, Math.min(1, ddt * (J.fase === 'fin' ? 2.5 : 1.8)));
  const movio = ultX != null ? Math.hypot(P.x - ultX, P.y - ultY) : 0; ultX = P.x; ultY = P.y;
  const velJ = movio / Math.max(ddt, .001);
  if (velJ > .3 && !enArbol) { bobFase += ddt * velJ * 2.1; bob = lerp(bob, 1, ddt * 8); } else bob = lerp(bob, 0, ddt * 6);
  const bobY = Math.abs(Math.sin(bobFase)) * .045 * bob, bobX = Math.sin(bobFase) * .025 * bob;
  const pitchObj = J === demo ? -.04 + Math.sin(J_t * .2) * .05 : (enArbol ? -.42 : 0) + [.05, 0, -.12][P.zona] - VM.patada * .03;
  pitch = lerp(pitch, pitchObj, Math.min(1, ddt * 5));
  temblor = Math.max(0, temblor - ddt * 1.6);
  const tb = temblor * temblor;
  yawSuave = P.ang;
  if (J.fase === 'fin') rollMuerte = lerp(rollMuerte, 1.2, ddt * 2);
  const agarre = P.agarrado ? Math.sin(J_t * 40) * .02 : 0;
  // arriba del árbol, la cámara se acerca al tronco (como sentado en una rama)
  const arbolRef = P.arbol || (P.trepando > 0 ? P.arbolNuevo : null);
  enArbolK = lerp(enArbolK, arbolRef && !(P.bajando > 0) ? 1 : 0, Math.min(1, ddt * 1.8));
  if (arbolRef) ultimoArbol = arbolRef;
  let cx = P.x, cz = P.y;
  if (ultimoArbol && enArbolK > .001) {
    const dx = P.x - ultimoArbol.x, dz = P.y - ultimoArbol.y, l = Math.hypot(dx, dz) || 1;
    cx = lerp(P.x, ultimoArbol.x + dx / l * .45, enArbolK); cz = lerp(P.y, ultimoArbol.y + dz / l * .45, enArbolK);
  }
  cam.position.set(cx + Math.cos(P.ang) * bobX + rnd(-1, 1) * tb * .15, ojoAlto + bobY + rnd(-1, 1) * tb * .1, cz + Math.sin(P.ang) * bobX + rnd(-1, 1) * tb * .15);
  cam.rotation.set(pitch + rnd(-1, 1) * tb * .04 + agarre, -yawSuave + rnd(-1, 1) * tb * .04, rollMuerte + bobX * .3);
  cam.updateMatrixWorld();

  // ---- luces ----
  const Pp = mundo.pal;
  if (sol.visible) {
    const sd = cieloMat.uniforms.solDir.value;
    sol.position.set(cam.position.x + sd.x * 40, sd.y * 40 + 2, cam.position.z + sd.z * 40);
    sol.target.position.set(cam.position.x, 0, cam.position.z);
    sol.castShadow = Qc().sombras;
    if (sol.castShadow && sol.shadow.mapSize.x !== Qc().sombra) { sol.shadow.mapSize.set(Qc().sombra, Qc().sombra); if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; } }
  }
  cielo.position.copy(cam.position);
  linterna.intensity = (J === demo ? 0 : Pp.linterna * 3) * (J.fase === 'fin' ? .3 : 1);
  linterna.castShadow = Qc().luzSombra || (Qc().sombras && mundo.interior);
  linterna.position.copy(cam.position).add(new THREE.Vector3(.18, -.15, 0).applyQuaternion(cam.quaternion));
  linterna.target.position.copy(cam.position).add(new THREE.Vector3(0, 0, -6).applyQuaternion(cam.quaternion));
  luzDisparo.position.copy(cam.position).add(new THREE.Vector3(0, -.1, -1).applyQuaternion(cam.quaternion));
  luzDisparo.intensity = Math.max(0, luzDisparo.intensity - ddt * 120);
  flashExpl = Math.max(0, flashExpl - ddt * 2.5); luzExplosion.intensity = 40 * flashExpl * flashExpl;
  // lámparas de la casa
  if (mundo.lamparas.length) {
    const lista = mundo.lamparas.map(l => ({ l, d: Math.hypot(l.x - cam.position.x, l.z - cam.position.z) })).sort((a, b) => a.d - b.d);
    const n = Qc().lamparas;
    lucesLampara.forEach((luz, i) => {
      const o = lista[i];
      if (!o || i >= n) { luz.visible = false; return; }
      luz.visible = true; luz.position.set(o.l.x, o.l.y, o.l.z);
      let f = 1;
      if (o.l.apagada) f = 0;
      else if (o.l.roto) { const s = Math.sin(J_t * 13 + o.l.fase) + Math.sin(J_t * 7.3 + o.l.fase * 2); f = s > 1.2 ? .1 : (s > .9 ? .5 : 1); }
      luz.intensity = 2.2 * f;
      o.l.foco.material.color.setScalar(f > .5 ? 1 : .15);
    });
    for (let i = n; i < mundo.lamparas.length && i < lista.length; i++) { const l = lista[i].l; l.foco.material.color.setScalar(l.apagada ? .1 : .8); }
  } else lucesLampara.forEach(l => l.visible = false);
  // relámpagos
  if (Pp.rayos && !pausado) {
    mundo.rayoT = (mundo.rayoT == null ? rnd(8, 20) : mundo.rayoT) - ddt;
    if (mundo.rayoT <= 0) { mundo.rayoT = rnd(10, 26); mundo.rayo = 1; }
    mundo.rayo = Math.max(0, (mundo.rayo || 0) - ddt * 3);
    const fl = mundo.rayo > 0 ? (Math.sin(mundo.rayo * 40) > 0 ? mundo.rayo : 0) : 0;
    cieloMat.uniforms.flash.value = fl; hemi.intensity = Pp.hemi + fl * 2.5;
  } else cieloMat.uniforms.flash.value = 0;
  if (mundo.agua && mundo.agua.color) mundo.agua.roughness = .12 + Math.sin(J_t) * .02;

  // ---- partículas del ambiente ----
  if (!pausado) ambiente(Pp.part, ddt);

  // ---- cosas del juego ----
  actualizarZombisVis(J, ddt, P.x, P.y);
  actualizarItems(J, ddt);
  if (J.granadas) actualizarGranadas(J, ddt);
  for (let i = trazos.length - 1; i >= 0; i--) { trazos[i].t -= dt; if (trazos[i].t <= 0) { escena.remove(trazos[i].m); trazos.splice(i, 1); } }
  pAdd.actualizar(ddt); pNorm.actualizar(ddt); pHumo.actualizar(ddt);

  // ---- arma en la mano ----
  const muestraVM = enJuego && J.fase !== 'fin';
  VM.grupo.visible = muestraVM;
  if (muestraVM) actualizarVM(J, ddt, velJ);

  // ---- render ----
  R.clear();
  R.render(escena, cam);
  if (muestraVM) { R.clearDepth(); R.render(vmEscena, vmCam); }
  if (enJuego) actualizarHud3D(J, dt);
}

function ambiente(tipo, dt) {
  const k = Qc().part, cx = cam.position.x, cz = cam.position.z;
  lluvia.l.visible = tipo === 'lluvia';
  if (tipo === 'lluvia') {
    const p = lluvia.pos;
    lluvia.gotas.forEach((g, i) => {
      g.y -= g.v * dt;
      if (g.y < 0) { g.y = rnd(10, 14); g.x = rnd(-18, 18); g.z = rnd(-18, 18); if (Math.random() < .08) pNorm.emitir({ x: cx + g.x, y: .05, z: cz + g.z, vida: .25, t0: .05, t1: .12, r: .7, g: .75, b: .8, a: .4, a1: 0 }); }
      const x = cx + g.x, z = cz + g.z;
      p[i * 6] = x; p[i * 6 + 1] = g.y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + .05; p[i * 6 + 4] = g.y + .45; p[i * 6 + 5] = z + .02;
    });
    lluvia.l.geometry.attributes.position.needsUpdate = true;
    lluvia.l.geometry.setDrawRange(0, Math.floor(lluvia.gotas.length * 2 * k));
  }
  if (tipo === 'luciernagas' || tipo === 'neblina') {
    if (Math.random() < dt * 9 * k) { const a = rnd(0, TAU), r = rnd(3, 16); pAdd.emitir({ x: cx + Math.cos(a) * r, y: rnd(.4, 2.5), z: cz + Math.sin(a) * r, vx: rnd(-.3, .3), vy: rnd(-.1, .1), vz: rnd(-.3, .3), vida: rnd(3, 6), t0: .07, t1: .07, r: .75, g: 1, b: .35, a: 0, a1: 0, fn: (p) => { const q = p.edad / p.vida; p.a = Math.sin(q * Math.PI) * (.6 + Math.sin(p.edad * 8) * .4); p.a1 = p.a; p.vx += rnd(-.5, .5) * .05; p.vz += rnd(-.5, .5) * .05; } }); }
  }
  if (tipo === 'neblina' || tipo === 'luciernagas') {
    if (Math.random() < dt * (tipo === 'neblina' ? 5 : 2) * k) { const a = rnd(0, TAU), r = rnd(4, 20); pHumo.emitir({ x: cx + Math.cos(a) * r, y: rnd(.1, .6), z: cz + Math.sin(a) * r, vx: rnd(-.25, .25), vz: rnd(-.25, .25), vida: rnd(6, 10), t0: 3, t1: 5, ...colRGB(mundo.pal.niebla), a: 0, a1: 0, fn: p => { p.a = Math.sin(p.edad / p.vida * Math.PI) * .22; p.a1 = p.a; } }); }
  }
  if (tipo === 'polvo') {
    if (Math.random() < dt * 30 * k) { const a = rnd(0, TAU), r = rnd(1, 14); pNorm.emitir({ x: cx + Math.cos(a) * r, y: rnd(.05, 2), z: cz + Math.sin(a) * r, vx: rnd(1.5, 3), vy: rnd(-.05, .1), vz: rnd(-.3, .3), vida: rnd(2, 4), t0: .025, t1: .025, r: .85, g: .7, b: .5, a: .7, a1: 0 }); }
    if (Math.random() < dt * 2 * k) { const a = rnd(0, TAU), r = rnd(6, 20); pHumo.emitir({ x: cx + Math.cos(a) * r, y: rnd(.1, .8), z: cz + Math.sin(a) * r, vx: rnd(1.5, 3), vz: rnd(-.3, .3), vida: rnd(4, 7), t0: 1.5, t1: 4, r: .8, g: .62, b: .45, a: 0, a1: 0, fn: p => { p.a = Math.sin(p.edad / p.vida * Math.PI) * .25; p.a1 = p.a; } }); }
  }
  if (tipo === 'motas') {
    if (Math.random() < dt * 14 * k) { const a = rnd(0, TAU), r = rnd(.5, 5); pAdd.emitir({ x: cx + Math.cos(a) * r, y: rnd(.3, 2.6), z: cz + Math.sin(a) * r, vx: rnd(-.05, .05), vy: rnd(-.03, .03), vz: rnd(-.05, .05), vida: rnd(3, 6), t0: .012, t1: .012, r: 1, g: .9, b: .7, a: 0, a1: 0, fn: p => { p.a = Math.sin(p.edad / p.vida * Math.PI) * .5; p.a1 = p.a; } }); }
  }
}

function actualizarVM(J, dt, velJ) {
  const P = J.jug;
  if (P.actual !== VM.armaId) ponerArmaVM(P.actual);
  const bt = P.blanca ? P.blanca.tipo : null;
  if (bt !== VM.blancaId) ponerBlancaVM(bt);
  VM.cambio = Math.min(1, VM.cambio + dt * 3);
  VM.patada = Math.max(0, VM.patada - dt * 7 * (1 + VM.patada));
  VM.balanceo += dt * velJ * 2.1;
  const mov = clamp(velJ / 3, 0, 1);
  const enArbol = P.arbol || P.trepando > 0;
  const recarga = P.recargando > 0;
  VM.recargaK = lerp(VM.recargaK, recarga ? 1 : 0, dt * 8);
  const sinArma = !VM.arma;
  // golpe con arma blanca
  VM.golpeT = Math.max(0, VM.golpeT - dt);
  const g = VM.golpeT > 0 ? 1 - VM.golpeT / .38 : 0;
  const usandoBlanca = sinArma || VM.golpeT > 0;
  const arma = VM.arma ? VM.arma.g : null;
  const baja = (1 - VM.cambio) * .35 + VM.recargaK * .12 + (VM.golpeT > 0 ? .4 : 0) + (P.trepando > 0 || P.bajando > 0 ? .5 : 0);
  const respira = Math.sin(J_t * 1.6) * .004;
  const bx = Math.sin(VM.balanceo) * .012 * mov, by = Math.abs(Math.cos(VM.balanceo)) * .01 * mov;
  if (arma) {
    arma.position.set(.19 + bx, -.17 - baja + by + respira, -.42 + VM.patada * .04);
    arma.rotation.set(.03 + VM.patada * .12 + VM.recargaK * .5, .1 + VM.recargaK * -.3, -.06 + VM.recargaK * .5 + bx * 2);
    if (recarga) arma.rotation.z += Math.sin(J_t * 9) * .05;
    VM.manos.g.position.copy(arma.position); VM.manos.g.rotation.copy(arma.rotation);
    VM.manos.g.visible = true;
    if (VM.recargaK > .5) VM.manos.izq.position.y = -.03 - Math.abs(Math.sin(J_t * 6)) * .1; else VM.manos.izq.position.y = -.03;
  } else VM.manos.g.visible = false;
  // arma blanca: en la mano derecha si no hay arma de fuego, o aparece para el golpe
  vmBlancaGrupo.visible = usandoBlanca;
  if (usandoBlanca) {
    const e = g < .25 ? g / .25 : 1 - (g - .25) / .75;
    if (VM.golpeT > 0) {
      vmBlancaGrupo.position.set(.28 - g * .45, -.18 + Math.sin(g * Math.PI) * .12, -.4);
      vmBlancaGrupo.rotation.set(-.4 + e * -.6, .9 - g * 1.9, .9 - g * 1.6);
    } else {
      vmBlancaGrupo.position.set(.24 + bx, -.26 + by + respira, -.38);
      vmBlancaGrupo.rotation.set(-.35, .35, .55);
    }
  }
  VM.fogT -= dt; if (VM.fogT <= 0) VM.fogonazo.visible = false;
  vmLuzDisparo.intensity = Math.max(0, vmLuzDisparo.intensity - dt * 80);
  // vainas
  for (let i = VM.vainas.length - 1; i >= 0; i--) { const v = VM.vainas[i]; v.t += dt; v.vy -= 4.5 * dt; v.m.position.x += v.vx * dt * .5; v.m.position.y += v.vy * dt * .5; v.m.position.z += v.vz * dt * .5; v.m.rotation.x += v.rx * dt; v.m.rotation.z += v.rx * .7 * dt; if (v.t > .7) { vmEscena.remove(v.m); VM.vainas.splice(i, 1); } }
  // luz de la mano según el mapa
  const Pp = mundo.pal;
  vmHemi.color.set(Pp.hemiA); vmHemi.groundColor.set(Pp.hemiB); vmHemi.intensity = .5 + Pp.hemi * .6;
  vmSol.color.set(Pp.interior ? '#ffd9a8' : Pp.solCol); vmSol.intensity = Pp.interior ? .6 : .4 + Pp.solInt * .3;
  vmEscena.environment = envActual;
}

// ================= Opciones =================
function armarOpcion() {
  const caja = document.querySelector('#opciones .caja');
  if (!caja || document.getElementById('oGraf')) return;
  const l = document.createElement('label'); l.className = 'campo';
  l.innerHTML = 'Gráficos (para quien mira la pantalla) <select id="oGraf"><option value="alta">Alta calidad</option><option value="media">Media</option><option value="baja">Baja (computadoras lentas)</option><option value="apagados">Apagados</option></select>';
  const listo = document.getElementById('bCerrarOp');
  caja.insertBefore(l, listo);
  const s = l.querySelector('select'); s.value = modo;
  s.onchange = () => {
    modo = s.value; try { localStorage.setItem('zombis-graficos', modo); } catch (e) {}
    redimensionar(); mundoDe = null;
  };
}
armarOpcion();

requestAnimationFrame(dibujar);
})();
