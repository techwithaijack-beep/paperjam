import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const VARIANTS = [
  {
    id: 'baseline',
    label: 'Baseline',
    description: 'Clean source image.',
    mutate: async (img) => img.png().toBuffer()
  },
  {
    id: 'phone-glare',
    label: 'Phone glare',
    description: 'Simulates glossy capture under harsh light.',
    mutate: async (img, meta) => img.composite([{ input: glareOverlay(meta.width, meta.height), blend: 'screen' }]).modulate({ brightness: 1.08, saturation: 0.82 }).png().toBuffer()
  },
  {
    id: 'highlight-scan',
    label: 'Highlighted scan',
    description: 'Semi-transparent marker plus slight washout.',
    mutate: async (img, meta) => img
      .composite([{ input: highlightOverlay(meta.width, meta.height), blend: 'multiply' }])
      .modulate({ brightness: 1.03, saturation: 0.92 })
      .png()
      .toBuffer()
  },
  {
    id: 'copier-streak',
    label: 'Copier streak',
    description: 'Vertical banding + faint dust common in office rescans.',
    mutate: async (img, meta) => img.composite([{ input: streakOverlay(meta.width, meta.height), blend: 'multiply' }]).png().toBuffer()
  },
  {
    id: 'rotation-blur',
    label: 'Desk skew + blur',
    description: 'Slight misalignment and camera motion blur.',
    mutate: async (img) => img.rotate(-2.4, { background: '#f5f3ee' }).blur(1.1).png().toBuffer()
  },
  {
    id: 'stamp-occlusion',
    label: 'Stamp + occlusion',
    description: 'Approval stamp lands on top of key text.',
    mutate: async (img, meta) => img.composite([{ input: stampOverlay(meta.width, meta.height), blend: 'over' }]).png().toBuffer()
  },
  {
    id: 'jpeg-crush',
    label: 'Messaging-app recompress',
    description: 'Downstream compression after document sharing.',
    mutate: async (img) => {
      const crushed = await img.jpeg({ quality: 34, chromaSubsampling: '4:2:0' }).toBuffer();
      return sharp(crushed).png().toBuffer();
    }
  }
];

export async function runDemo({ out = 'out/demo' } = {}) {
  const inputSvg = path.resolve('examples/sample-invoice.svg');
  const demoPng = path.join(path.resolve(out), 'sample-source.png');
  await fs.mkdir(path.resolve(out), { recursive: true });
  const png = await sharp(inputSvg).png().toBuffer();
  await fs.writeFile(demoPng, png);
  const summary = await runPipeline({ input: demoPng, outDir: path.resolve(out), title: 'Paperjam demo report' });
  console.log(`\nPaperjam demo complete.`);
  console.log(`Report: ${summary.reportPath}`);
  console.log(`Social card: ${summary.cardPath}`);
  console.log(`Worst variant: ${summary.worstVariant.label} (${summary.worstVariant.similarityPct}% similarity)`);
}

export async function runAnalyze({ input, out = 'out/custom' } = {}) {
  const summary = await runPipeline({ input: path.resolve(input), outDir: path.resolve(out), title: `Paperjam report — ${path.basename(input)}` });
  console.log(`\nPaperjam analysis complete.`);
  console.log(`Report: ${summary.reportPath}`);
  console.log(`Social card: ${summary.cardPath}`);
  console.log(`Worst variant: ${summary.worstVariant.label} (${summary.worstVariant.similarityPct}% similarity)`);
}

async function runPipeline({ input, outDir, title }) {
  await fs.mkdir(outDir, { recursive: true });
  const variantsDir = path.join(outDir, 'variants');
  await fs.mkdir(variantsDir, { recursive: true });

  const source = sharp(input);
  const meta = await source.metadata();
  const sourcePng = await source.png().toBuffer();

  const worker = await createWorker('eng', 1, { cachePath: path.join(outDir, '.tesseract-cache') });
  const baselineText = normalizeText((await worker.recognize(sourcePng)).data.text);
  const results = [];

  for (const variant of VARIANTS) {
    const fresh = sharp(sourcePng);
    const buffer = await variant.mutate(fresh, meta);
    const imagePath = path.join(variantsDir, `${variant.id}.png`);
    await fs.writeFile(imagePath, buffer);
    const ocr = normalizeText((await worker.recognize(buffer)).data.text);
    const similarity = variant.id === 'baseline' ? 1 : similarityScore(baselineText, ocr);
    results.push({
      id: variant.id,
      label: variant.label,
      description: variant.description,
      imagePath,
      text: ocr,
      similarity,
      similarityPct: Math.round(similarity * 100),
      chars: ocr.length,
      missingChars: Math.max(0, baselineText.length - ocr.length)
    });
  }

  await worker.terminate();

  const ranked = [...results].sort((a, b) => a.similarity - b.similarity);
  const baseline = results.find((r) => r.id === 'baseline');
  const worstVariant = ranked[0];
  const reportPath = path.join(outDir, 'report.html');
  const cardPath = path.join(outDir, 'paperjam-card.png');
  const summaryPath = path.join(outDir, 'summary.json');

  await fs.writeFile(reportPath, renderReport({ title, input, baselineText, results: ranked }));
  await fs.writeFile(cardPath, await renderCard({ title, worstVariant, ranked }));
  await fs.writeFile(summaryPath, JSON.stringify({ title, input, baselineChars: baselineText.length, variants: ranked }, null, 2));

  return { reportPath, cardPath, summaryPath, worstVariant, baseline };
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[|]/g, 'I')
    .trim();
}

function similarityScore(a, b) {
  if (!a && !b) return 1;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / Math.max(a.length, b.length, 1));
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

function shortText(text, max = 230) {
  if (!text) return '(no OCR text)';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function renderReport({ title, input, baselineText, results }) {
  const rows = results.map((r) => `
    <article class="card ${r.id === 'baseline' ? 'baseline' : ''}">
      <div class="thumb"><img src="variants/${r.id}.png" alt="${escapeHtml(r.label)}"></div>
      <div class="meta">
        <div class="topline">
          <h3>${escapeHtml(r.label)}</h3>
          <span class="score ${scoreClass(r.similarityPct)}">${r.similarityPct}%</span>
        </div>
        <p>${escapeHtml(r.description)}</p>
        <div class="mini">OCR chars: ${r.chars} · missing vs baseline: ${r.missingChars}</div>
        <pre>${escapeHtml(shortText(r.text))}</pre>
      </div>
    </article>`).join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f172a; color: #e5eefc; }
    .wrap { max-width: 1220px; margin: 0 auto; padding: 32px; }
    .hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: 22px; margin-bottom: 28px; }
    .panel { background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 20px; padding: 22px; box-shadow: 0 15px 50px rgba(0,0,0,0.25); }
    h1 { margin: 0 0 10px; font-size: 40px; }
    h2 { margin-top: 0; }
    .pill { display: inline-block; padding: 7px 12px; border-radius: 999px; background: #1d4ed8; color: white; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .source { color: #cbd5e1; word-break: break-all; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px; }
    .card { display: grid; grid-template-columns: 210px 1fr; gap: 16px; background: rgba(15, 23, 42, 0.78); border: 1px solid rgba(148,163,184,.18); border-radius: 18px; overflow: hidden; }
    .card.baseline { border-color: rgba(59,130,246,.55); }
    .thumb { background: #0b1120; display: flex; align-items: center; justify-content: center; min-height: 280px; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .meta { padding: 18px 18px 18px 0; }
    .topline { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .score { font-weight: 800; font-size: 28px; }
    .score.good { color: #86efac; }
    .score.warn { color: #facc15; }
    .score.bad { color: #fca5a5; }
    p { color: #cbd5e1; line-height: 1.5; }
    .mini { font-size: 14px; color: #94a3b8; margin-bottom: 10px; }
    pre { white-space: pre-wrap; background: rgba(2,6,23,.75); color: #dbeafe; padding: 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; overflow: auto; }
    .stat { font-size: 34px; font-weight: 800; margin: 0; }
    ul { color: #cbd5e1; }
    @media (max-width: 860px) { .hero, .card { grid-template-columns: 1fr; } .meta { padding: 0 18px 18px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="panel">
        <span class="pill">Chaos engineering for OCR</span>
        <h1>${escapeHtml(title)}</h1>
        <p>Paperjam mutates a document into realistic hostile variants, runs local OCR, and shows which stresses actually break your stack. This demo is intentionally model-agnostic: swap in a different OCR engine or VLM later, keep the same stress harness.</p>
        <p class="source"><strong>Source:</strong> ${escapeHtml(input)}</p>
      </div>
      <div class="panel">
        <h2>Baseline summary</h2>
        <p class="stat">${baselineText.length}</p>
        <p>Characters recognized on the clean source image.</p>
        <ul>
          <li>Lowest similarity variant = the one most likely to break downstream extraction.</li>
          <li>Use this report as a regression fixture before swapping OCR/VLM models.</li>
          <li>Demo thought: OCR can be fuzz-tested like an API, not just benchmarked once.</li>
        </ul>
      </div>
    </section>
    <section class="grid">${rows}</section>
  </div>
</body>
</html>`;
}

async function renderCard({ title, worstVariant, ranked }) {
  const width = 1600;
  const height = 900;
  const thumbs = ranked.slice(0, 4);
  const thumbBuffers = await Promise.all(thumbs.map((v) => sharp(v.imagePath).resize({ width: 280 }).png().toBuffer()));
  const composites = [
    { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="46" y="46" width="1508" height="808" rx="34" fill="#0b1220" stroke="#334155" stroke-width="2"/></svg>`), top: 0, left: 0 },
    { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="82" y="138" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#f8fafc">Paperjam</text><text x="82" y="190" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#93c5fd">Chaos engineering for OCR</text><text x="82" y="255" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#cbd5e1">${escapeXml(title)}</text><text x="82" y="332" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#fca5a5">Worst variant: ${escapeXml(worstVariant.label)} · ${worstVariant.similarityPct}% text similarity</text><text x="82" y="386" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#cbd5e1">Model upgrades do not matter if glare, highlights, compression, and stamps still destroy the page.</text></svg>`), top: 0, left: 0 }
  ];
  thumbBuffers.forEach((buf, index) => {
    composites.push({ input: buf, top: 470, left: 82 + index * 360 });
    const item = thumbs[index];
    composites.push({ input: Buffer.from(`<svg width="320" height="120" xmlns="http://www.w3.org/2000/svg"><text x="0" y="38" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#f8fafc">${escapeXml(item.label)}</text><text x="0" y="78" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#93c5fd">Similarity: ${item.similarityPct}%</text></svg>`), top: 760, left: 82 + index * 360 });
  });

  return sharp({ create: { width, height, channels: 4, background: '#0f172a' } }).composite(composites).png().toBuffer();
}

function scoreClass(score) {
  if (score >= 88) return 'good';
  if (score >= 70) return 'warn';
  return 'bad';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

function glareOverlay(width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.02)"/><stop offset="50%" stop-color="rgba(255,255,255,0.78)"/><stop offset="100%" stop-color="rgba(255,255,255,0.04)"/></linearGradient></defs><rect width="100%" height="100%" fill="none"/><ellipse cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.23)}" rx="${Math.round(width * 0.31)}" ry="${Math.round(height * 0.2)}" fill="url(#g)" transform="rotate(-11 ${Math.round(width * 0.72)} ${Math.round(height * 0.23)})"/><ellipse cx="${Math.round(width * 0.46)}" cy="${Math.round(height * 0.58)}" rx="${Math.round(width * 0.16)}" ry="${Math.round(height * 0.07)}" fill="rgba(255,255,255,0.22)" transform="rotate(-8 ${Math.round(width * 0.46)} ${Math.round(height * 0.58)})"/></svg>`);
}

function highlightOverlay(width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="120" y="560" width="700" height="70" rx="18" fill="rgba(255, 235, 59, 0.58)"/><rect x="120" y="620" width="760" height="68" rx="18" fill="rgba(255, 235, 59, 0.36)"/></svg>`);
}

function streakOverlay(width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" fill="none"/><rect x="${Math.round(width * 0.21)}" y="0" width="14" height="100%" fill="rgba(80,80,80,0.13)"/><rect x="${Math.round(width * 0.77)}" y="0" width="20" height="100%" fill="rgba(100,100,100,0.10)"/><circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.18)}" r="9" fill="rgba(90,90,90,0.18)"/><circle cx="${Math.round(width * 0.26)}" cy="${Math.round(height * 0.74)}" r="6" fill="rgba(90,90,90,0.16)"/></svg>`);
}

function stampOverlay(width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-10 ${Math.round(width * 0.77)} ${Math.round(height * 0.52)})"><rect x="${Math.round(width * 0.58)}" y="${Math.round(height * 0.42)}" width="${Math.round(width * 0.3)}" height="${Math.round(height * 0.16)}" rx="16" fill="rgba(255,255,255,0.18)" stroke="rgba(220,38,38,0.92)" stroke-width="10"/><text x="${Math.round(width * 0.61)}" y="${Math.round(height * 0.52)}" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700" fill="rgba(220,38,38,0.92)">REVIEWED</text></g><rect x="${Math.round(width * 0.76)}" y="${Math.round(height * 0.79)}" width="220" height="74" rx="12" fill="rgba(255,255,255,0.86)"/><text x="${Math.round(width * 0.795)}" y="${Math.round(height * 0.84)}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="rgba(220,38,38,0.9)">PAST DUE</text></svg>`);
}
