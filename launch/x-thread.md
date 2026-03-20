1. Paperjam is a new open-source idea for the OCR / Document AI stack:

chaos engineering for documents.

Instead of asking “which OCR model wins on a clean benchmark?”, it asks:

which stack breaks first when the page gets ugly?

Repo: https://github.com/PLACEHOLDER/paperjam

2. The live builder conversation keeps centering on named model swaps:
- GLM-OCR
- OpenOCR
- Tesseract
- LlamaParse / parser-style stacks

That matters.

But the more useful operator question is:
what changes in reliability after glare, highlighting, skew, stamps, and compression hit the page?

3. Recent signal that pushed me here:
SAP + Stanford’s “OCR or Not? Rethinking Document Information Extraction in the MLLMs Era” shows that better multimodal models do not magically erase structural/failure-mode problems.

https://arxiv.org/abs/2603.02789

4. So Paperjam takes a document image, creates hostile variants, runs local OCR, and ranks fragility.

Today it ships with:
- realistic mutations
- local OCR via tesseract.js
- HTML report
- summary JSON
- generated social/share card

5. Why I think this category matters:

Document AI teams already have parsers.
They already have benchmarks.
They often do *not* have a lightweight robustness harness they can run before a pipeline or model change goes live.

6. If you’re comparing OCR / VLM / parser stacks right now, I think the next useful layer is:

not just extraction quality,
but document stress tolerance.

That changes stack choice, rollback discipline, and CI design.

7. If this direction is useful, next steps are obvious:
- plug-in adapters for external OCR outputs
- field-aware JSON scoring
- PDF ingestion
- CI-ready failure packs
- region heatmaps

8. Repo again:
https://github.com/PLACEHOLDER/paperjam

If you build in OCR / IDP / Document AI, I’d love to know which real-world document failure mode costs you the most.
