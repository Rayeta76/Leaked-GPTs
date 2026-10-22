// Pruebas del núcleo: node test/run.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const code = /<script id="core">([\s\S]*?)<\/script>/.exec(html)[1];
const mod = { exports: {} };
new Function('module', code)(mod);
const Core = mod.exports;
const read = f => fs.readFileSync(path.join(__dirname, '../samples', f), 'utf8');
const sel = (an, feed, lead, pred = a => a.type === 'externo' && a.role === 'contorno') => {
  const m = new Map(); for (const a of an.arcs) if (pred(a)) m.set(a.i, { feed: String(feed), lead }); return m;
};

// --- Programa 6 (sin reducción): se debe parecer al patrón del programa 4
const p6 = read('programa6_radios_pequenos.cni');
const an6 = Core.analyze(p6);
const g6 = Core.groupArcs(an6);
assert.deepStrictEqual(g6.map(g => [g.tool, g.type, g.r, g.arcs.length, g.corners.size]), [['1210086', 'externo', 10, 8, 4]]);
assert.deepStrictEqual(an6.arcs.filter(a => a.role === 'enlace').map(a => [a.type, a.r]), [['entrada', 75], ['salida', 75]]);
const r6 = Core.transform(an6, sel(an6, 500, 2), { eol: '\n' });
const L = r6.text.split('\n');
const i1880 = L.findIndex(l => l.includes('G03 X=10.00000 Y=0.00000'));
console.log(L.slice(i1880 - 2, i1880 + 8).join('\n'));
assert(/F=500/.test(L[i1880]));
assert.strictEqual(L[i1880 + 1].replace(/^N\d+ /, ''), 'G01 X=12.00000 Y=0.00000');
assert.strictEqual(L[i1880 + 2].replace(/^N\d+ /, ''), 'G01 X=388.00000 Y=0.00000  F=2500');
assert.strictEqual(L[i1880 + 3].replace(/^N\d+ /, ''), 'G01 X=390.00000 Y=0.00000  F=500');

// --- Geometría intacta: misma longitud total y mismos puntos finales originales
const pr0 = Core.profile(an6), an6b = Core.analyze(r6.text), pr1 = Core.profile(an6b);
const tot = p => p.segs.reduce((t, s) => t + s.len, 0);
assert(Math.abs(tot(pr0) - tot(pr1)) < 1e-3, 'longitud total cambia');
const ends1 = new Set(pr1.segs.map(s => s.end.x.toFixed(3) + ',' + s.end.y.toFixed(3)));
for (const s of pr0.segs) assert(ends1.has(s.end.x.toFixed(3) + ',' + s.end.y.toFixed(3)), 'falta punto ' + JSON.stringify(s.end));
// Tramo lento: cada arco externo + 2 mm antes y después, a 500 (el primer arco viene de un arco de entrada: sin tramo previo)
const slowLen = pr1.segs.filter(s => s.feed === 500).reduce((t, s) => t + s.len, 0);
const arcLen = an6.arcs.filter(a => a.type === 'externo').reduce((t, a) => t + a.len, 0);
assert(Math.abs(slowLen - (arcLen + 8 * 2 * 2 - 2)) < 1e-3, 'tramo lento = ' + slowLen);
assert(pr1.time > pr0.time);
// Numeración consecutiva de 10 en 10
const ns = r6.text.split('\n').filter(l => /^N\d+/.test(l)).map(l => +/^N(\d+)/.exec(l)[1]);
ns.forEach((n, k) => k && assert.strictEqual(n - ns[k - 1], 10));
// Nada se pierde fuera del contorno
assert(r6.text.includes('N' + (ns[ns.length - 1] - 10) + ' G01 G40'));

// --- Programa 4 (ya reducido): con F igual o mayor al existente es idempotente
const p4 = read('programa4_diamantada.cni');
const an4 = Core.analyze(p4);
assert.deepStrictEqual(Core.groupArcs(an4).map(g => [g.type, +g.r.toFixed(1), g.arcs.length]), [['externo', 10, 4], ['externo', 10.4, 4]]);
const same4 = Core.transform(an4, sel(an4, 500, 2), { renumber: false });
assert.strictEqual(same4.text, p4, 'idempotencia con F=500');
// Y con 400 baja los arcos y los tramos de 2 mm, sin tocar los rápidos
const r4 = Core.transform(an4, sel(an4, 400, 2), { renumber: false });
const l4 = r4.text.split('\n');
assert(l4.filter(l => /F=400/.test(l)).length === 8 && r4.inserted === 0);
assert(!l4.some(l => /F=500/.test(l)), 'quedan F=500');
assert(l4.some(l => /X=388.00000 Y=-0.40000\s+F=2800/.test(l)));

// --- Sin compensación: detección por forma del contorno cerrado
const noComp = p6.replace('G01 G42', 'G01');
const anN = Core.analyze(noComp);
assert(anN.arcs.filter(a => a.type === 'externo').length === 8 && anN.arcs.every(a => a.type !== 'externo' || a.byShape));

// --- Centros incrementales
const inc = 'N10 G01 G42 X=0 Y=10 F=2000\nN20 G03 X=10 Y=0 I=10 J=0\nN30 G01 X=100 Y=0\n';
const anI = Core.analyze(inc);
assert(anI.arcs.length === 1 && Math.abs(anI.arcs[0].r - 10) < 1e-9);

// --- Archivo real saez1.CNI: separación por herramienta, entradas/salidas y preselección automática
const sz = read('saez1.CNI');
const anS = Core.analyze(sz);
assert.deepStrictEqual(anS.tools.map(t => [t.code, t.dia, t.maxF, t.reduced]),
  [['1210081', 100, 3000, true], ['1210084', 100, 2800, true], ['1210086', 100, 2500, false]]);
assert(/brillo/.test(anS.tools[2].desc));
assert.deepStrictEqual(Core.groupArcs(anS).map(g => [g.tool, g.type, +g.r.toFixed(1), g.corners.size, g.arcs.length]),
  [['1210081', 'externo', 10.8, 4, 4], ['1210084', 'externo', 10, 4, 4], ['1210084', 'externo', 10.4, 4, 4], ['1210086', 'externo', 10, 4, 8]]);
assert(anS.arcs.filter(a => a.r > 70).every(a => a.role === 'enlace'));
// Solo la herramienta de brillo: lo demás del archivo queda idéntico (salvo numeración)
const selS = new Map(); anS.arcs.filter(a => a.tool === '1210086' && a.role === 'contorno').forEach(a => selS.set(a.i, { feed: '500', lead: 2 }));
const rS = Core.transform(anS, selS, { renumber: false });
assert.ok(rS.text.endsWith('\r\n') && rS.text.split('\r\n').length === sz.split('\r\n').length + rS.inserted);
const cut = t => t.slice(0, t.indexOf('N1580'));
assert.strictEqual(cut(rS.text), cut(sz), 'cambió algo antes de la herramienta 1210086');
assert(rS.inserted === 15 && /N1880 G03 X=10.00000 Y=0.00000  I=10.00000 J=10.00000  ?F=500/.test(rS.text));
const rSn = Core.transform(anS, selS, {});
assert(rSn.text.includes('N10 G71') && /N2280 L=PFINE/.test(rSn.text), 'renumeración');

// --- Herramientas: línea de LAVORAZIONI con un solo número y palabras T= que no son herramientas
const sz2 = sz.replace('[LAVORAZIONI01]\r\n', '[LAVORAZIONI01]\r\n 1 - Contorneo - 3620 - Fresa 6sectores D22\r\n')
  .replace('N1870 M128', 'N1870 M128\r\nN1875 G68 T=0.329').replace('N1590 L=PCAMBIOUT', 'N1590 L=PCAMBIOUT\r\nN1595 G01 X=-75.00000 T=0.401');
const anS2 = Core.analyze(sz2);
assert.deepStrictEqual(anS2.tools.map(t => t.code), ['1210081', '1210084', '1210086'], 'herramientas fantasma');
assert.deepStrictEqual(Core.groupArcs(anS2).filter(g => g.tool === '1210086').map(g => [g.corners.size, g.arcs.length]), [[4, 8]]);
assert(/^\s*\d+(?:\s*-\s*\d+)*/.test(' 1 - Contorneo - 3620 - Fresa 6sectores D22'));
const t3620 = Core.analyze('[LAVORAZIONI01]\n 1 - Contorneo - 3620 - Fresa 6sectores D22\n%\nN10 ST1="3620"\nN20 G01 G42 X=0 Y=10 F=850\nN30 G03 X=10 Y=0 I=10 J=10\nN40 G01 X=100 Y=0\nN50 G03 X=110 Y=10 I=100 J=10\nN60 G01 X=110 Y=100\nN70 G01 X=0 Y=100\nN80 G01 X=0 Y=10\n').tools[0];
assert.deepStrictEqual([t3620.code, t3620.desc, t3620.dia], ['3620', 'Fresa 6sectores D22', 22]);

// --- Rampa de salida: 8 mm en 4 escalones de 500 a 2500
const rR = Core.transform(an6, new Map([...sel(an6, 500, 2)].map(([i, v]) => [i, { feed: '500', leadIn: 2, leadOut: 8, ramp: 4 }])), { eol: '\n' });
const LR = rR.text.split('\n'), k0 = LR.findIndex(l => l.includes('G03 X=10.00000 Y=0.00000'));
assert.deepStrictEqual(LR.slice(k0 + 1, k0 + 7).map(l => l.replace(/^N\d+ /, '')), [
  'G01 X=12.00000 Y=0.00000', 'G01 X=14.00000 Y=0.00000  F=1000', 'G01 X=16.00000 Y=0.00000  F=1500',
  'G01 X=18.00000 Y=0.00000  F=2000', 'G01 X=388.00000 Y=0.00000  F=2500', 'G01 X=390.00000 Y=0.00000  F=500']);
const prR = Core.profile(Core.analyze(rR.text));
assert(Math.abs(prR.segs.reduce((t, x) => t + x.len, 0) - tot(pr0)) < 1e-3, 'rampa cambia la geometría');
console.log('OK');
