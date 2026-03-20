# Paperjam

**Chaos engineering for OCR.**

Most document AI teams benchmark clean PDFs, swap OCR/VLM models, and hope production looks the same.

It doesn't.

`paperjam` takes a document image, mutates it into realistic hostile variants, runs local OCR, and generates a visual fragility report showing which visual stresses actually break text recovery.

That means you can test things like:

- phone glare
- copier streaks
- highlighting over text
- desk skew + motion blur
- approval stamp occlusion
- messaging-app recompression

## The hook

**OCR can be fuzz-tested like an API.**

Not just evaluated once.
Not just compared on a benchmark.
Actually stress-tested before a model swap or pipeline change ships.

That is the category Paperjam is pushing toward.

## Why this matters now

Current Document AI energy is shifting from "who has the best OCR model?" to:

- which stack survives ugly real documents
- whether VLM-only flows really replace OCR pipelines
- how to catch regressions before production traffic does
- how to compare GLM-OCR / OpenOCR / Tesseract / LlamaParse-style stacks on failure behavior, not just headline accuracy

Recent signal behind this repo direction:

- **SAP + Stanford:** *OCR or Not? Rethinking Document Information Extraction in the MLLMs Era* — benchmark + failure analysis showing that stronger visual models do not magically solve all document extraction failure modes. <https://arxiv.org/abs/2603.02789>
- **LlamaParse API v2:** more agentic parsing control, stronger table handling, and structured-output emphasis — which increases the need for regression fixtures, not less. <https://www.llamaindex.ai/blog/announcing-new-llamacloud-sdks-and-parse-api-v2>

## What Paperjam does today

- Generates realistic document-image variants locally
- Runs local OCR with `tesseract.js`
- Scores each variant against the clean baseline text
- Produces a visual HTML report for quick debugging / demos
- Produces a social/share card image automatically

## 2-minute demo

```bash
git clone https://github.com/YOUR_USERNAME/paperjam.git
cd paperjam
npm install
npm run demo
```

Then open:

- `out/demo/report.html`
- `out/demo/paperjam-card.png`

## Example output

Paperjam creates a report like this:

- clean baseline
- each hostile variant thumbnail
- text similarity score vs baseline
- OCR text preview per variant
- quick ranking of the most dangerous failure mode

## CLI usage

Analyze the bundled demo:

```bash
paperjam demo
```

Analyze your own document image:

```bash
paperjam analyze --input ./my-doc.png --out ./out/my-run
```

## Repo structure

```text
paperjam/
├── bin/                 # CLI entrypoint
├── examples/            # demo source document
├── launch/              # launch copy + distribution assets
├── src/                 # report + mutation pipeline
├── tests/               # lightweight coverage
└── out/                 # generated demo/report artifacts
```

## Architecture

### 1. Clean source → variant generator

A source image is mutated into several realistic stress cases:

- glare overlay
- marker highlight overlay
- copier streaking
- mild rotation + blur
- approval stamp / occlusion
- JPEG recompression

### 2. Baseline OCR → variant OCR

Paperjam OCRs the clean page first, then OCRs each hostile variant.

### 3. Similarity scoring

Variant OCR text is compared to the baseline text using normalized edit-distance scoring.

### 4. Output for humans

The tool emits:

- `report.html` for local review
- `summary.json` for automation
- `paperjam-card.png` for sharing/demo visuals

## Why this is more interesting than another OCR wrapper

This is not trying to be:

- another extraction SDK
- another PDF parser
- another RAG summarizer
- another generic model wrapper

It is trying to become the **document robustness harness** developers add before switching OCR / VLM / parsing stacks.

## Near-term roadmap

- [ ] plug-in adapter layer for external OCR/VLM outputs
- [ ] field-aware scoring for JSON extraction results
- [ ] batch mode across fixture folders
- [ ] PDF first-page ingestion
- [ ] interactive region heatmaps
- [ ] deterministic "failure packs" for CI

## Local-only by default

No paid APIs.
No uploads.
No backend.

## License

MIT
