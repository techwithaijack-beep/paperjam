# Paperjam: chaos engineering for OCR

Most OCR and Document AI teams still evaluate the stack like this:

1. pick a few clean benchmark samples
2. compare model outputs
3. swap the model or parser
4. discover later that production documents are uglier than the benchmark

That workflow is backwards.

The interesting question is no longer just **which OCR or parser is best on a clean page**.
The more valuable question is **which stack survives the specific visual abuse your real documents go through**.

That is the idea behind **Paperjam**.

## The category idea

Paperjam treats document understanding like a robustness problem.
It takes a source page, mutates it into realistic hostile variants, runs local OCR, and generates a report showing which visual stresses actually destroy recognition quality.

In other words:

**OCR can be fuzz-tested like an API.**

That sounds obvious once you say it, but most open-source tooling in the space still points in a different direction:

- extraction
- parsing
- structured outputs
- summarization
- wrappers around the newest model

Those are useful, but they are not the same thing as a robustness harness.

## Why this feels timely

The builder conversation in Document AI has become very model-specific:

- GLM-OCR
- OpenOCR
- Tesseract
- LlamaParse and agentic parser stacks
- broader multimodal document models

The conversation usually sounds like: which model is better?

But recent benchmark work from SAP + Stanford — *OCR or Not? Rethinking Document Information Extraction in the MLLMs Era* — reinforces a more practical point:

stronger multimodal systems do not erase failure modes automatically.

That matters because the real operational pain in document pipelines is often not abstract accuracy. It is the quiet breakage caused by things like:

- smartphone glare
- highlighted text
- copier artifacts
- stamps over key fields
- blur and skew
- low-quality message-app recompression

Those are not theoretical.
They are how production documents actually arrive.

## What the prototype does

The first Paperjam prototype is intentionally lightweight:

- local CLI
- hostile document mutations
- local OCR with no paid APIs
- visual HTML report
- JSON summary for automation
- generated share/demo card image

The goal is not to outbuild a full IDP platform.
The goal is to make one idea obvious in under two minutes.

## What changes if this category catches on

If teams adopt robustness harnesses as a standard layer, the practical consequences are bigger than they look.

### 1. Better stack comparisons

Instead of comparing OCR systems only on clean extraction, teams can compare them on failure tolerance.

### 2. Safer upgrades

Before swapping OCR/VLM/parser versions, teams can run a deterministic stress pack and see what broke.

### 3. Better CI for Document AI

Document pipelines can gain the equivalent of fuzz/regression testing that software teams already expect elsewhere.

### 4. More honest model selection

The best model is not always the one with the cleanest benchmark score.
Sometimes it is the one that fails less catastrophically on ugly documents.

## Where Paperjam should go next

The next obvious layer is not “more demo.”
It is deeper integration into real document engineering workflows:

- adapters for external OCR/VLM outputs
- field-aware JSON extraction scoring
- fixture bundles for CI
- PDF ingestion
- region-level failure maps
- synthetic document failure packs by document type

## Repo

PLACEHOLDER

If you work in OCR, IDP, or Document AI, the useful question is simple:

**Which visual failure mode hurts your system most today?**

That is probably where the next good open-source tool should start.
