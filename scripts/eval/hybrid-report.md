# Assessment 3 — Hybrid retrieval eval report

Measured at: 2026-10-09T15:11:31.203Z
Scenarios: 12 labelled gift/checkout cases (k=5)
Baseline mode: cosine (frozen in baseline-a2.json at 2026-10-09T13:29:44.300Z)
Compare mode: hybrid (FTS available: yes)

| Metric | Baseline (cosine A2) | Hybrid + re-rank |
| --- | ---: | ---: |
| Task-success % | 75.0% | 75.0% |
| Hit-rate | 58.3% | 58.3% |
| Precision@5 | 36.7% | 36.7% |
| Faithfulness | 100.0% | 100.0% |
| Answer-relevance | 86.7% | 86.7% |
| Noise hit-rate | 58.3% | 58.3% |

## Notes

- Baseline was produced with `mode=cosine` only (pre-hybrid retriever behaviour).
- Hybrid uses Postgres FTS ∪ cosine RRF then weighted re-ranker (0.45 cosine + 0.35 ts_rank + 0.20 title overlap).
- Faithfulness / answer-relevance use grounded catalog stubs over retrieved titles (not a live LLM chat loop).
- FTS RPC `match_products_fts` responded successfully.
