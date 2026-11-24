# WS2 - Long-context and needle-retrieval benchmarks with per-language results (2025-2026)

Report date: 2026-11-24. Scope: primary sources for multilingual long-context retrieval and understanding, with focus on Polish and other Slavic languages vs English. Only numbers seen in fetched text are cited. Where a figure was read through a model-based page summary and not checked against the table or figure itself, it is marked MEDIUM, not HIGH.

## 1) Executive summary

- The only long-context benchmark found that puts Polish above English is OneRuler (arXiv 2503.01996, COLM 2025). It reports Polish first (about 88% average NIAH accuracy at 64K and 128K across models) and English 6th of 26 (about 83.9%). Models tested are 2024-2025 generation (Gemini 1.5 Flash, o3-mini-high, Qwen2.5, Llama 3.x).
- OneRuler's Polish-English gap is small in aggregate. For o3-mini-high at 128K, the text reports Polish 92%, Ukrainian 89%, English 67%. English's low score is driven by missing-needle failures, so this is not a clean reasoning-level signal.
- I found no 2026 per-language long-context result for any Slavic language on the newest models (GPT-5.x, Gemini 3.x, Claude 4.x/4.6, DeepSeek V4, Qwen3.5). Vendor cards report MRCR v2 and MMMLU only as aggregates, with no per-language split.
- Other 2025-2026 multilingual long-context benchmarks do not cover Polish/Slavic at all or only partly: MLRBench (en, de, es, hi, ar, vi, zh), LongBench Pro (en, zh), MGAL (six UN languages, names not confirmed), mLongRR (en, vi, id, sw, so), LOOM-Scope (en, zh, ru as a framework).
- The 2026 reasoning-side evidence (mmPISA-bench, arXiv 2606.07069, zero-shot PISA items, not long-context) shows Polish close to English. English is ahead in 3 of 4 model/effort cells, but cells hold about 25 items, so differences of 1-6 points are within noise.
- Russian has a dedicated long-context benchmark (LIBRA / "Long Context Benchmark for the Russian Language", CODI 2025, DOI 10.18653/v1/2025.codi-1.1). It reports no English comparison in the text I read.
- No Ukrainian, Czech or Bulgarian/Slovak long-context benchmark with results was found. Czech and Ukrainian appear only in OneRuler's language set and figures.
- Bottom line for the team: "Polish beats English" rests on one 2025 benchmark with older models. The newest models have no published per-language long-context breakdown that I could find.

## 2) Findings table

Confidence: HIGH = primary text read directly and cross-checked; MEDIUM = primary document read once (including via a summarized fetch) and not cross-checked; LOW = secondary or snippet only. Source type: "preprint" = arXiv, not checked for peer review; "peer-reviewed" = venue confirmed in fetched page.

| ID | Claim (paraphrased) | Numbers | Language(s) | Model(s) | Task / context length | Source URL | arXiv / DOI | Location in doc | Publication date | Source type & peer review | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WS2-01 | OneRuler: Polish is the top language for NIAH tasks, English ranks 6th of 26 | Polish avg 88% across all models; English avg 83.9% (rank 6/26) | pl, en (26 languages total) | Gemini 1.5 Flash, o3-mini-high, Qwen2.5 72B/7B, Llama 3.3 70B / 3.1 8B, DeepSeek-R1 (English only) | NIAH, 64K and 128K | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 (v2, 2025-08-08) | Sec. 3.1, "English and Chinese are not the highest-performing languages"; also Abstract / Sec. 1 for the rank | 2025-08-08 (v2); v1 March 2025 (ID-based) | preprint; COLM 2025 per search metadata (venue not confirmed on the page I read) | MEDIUM |
| WS2-02 | OneRuler, per-model: Polish leads for o3-mini-high at 128K; English is well below | Polish 92%, Ukrainian 89%, English 67% (o3-mini-high, 128K) | pl, uk, en | o3-mini-high | NIAH, 128K | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Sec. 3.1, "Individual model performance varies" | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-03 | OneRuler: instruction language matters. Switching the instruction language while the context stays in English changes accuracy by up to about 20 points | English context, Korean instruction: 91% -> 71% (64K) | en, ko | Not stated in summary | NIAH, 64K | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Sec. 4, "Cross-lingual performance is language-dependent" | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-04 | OneRuler language set includes Polish, Czech, Russian, Ukrainian and Serbian, but not Bulgarian, Slovak, Croatian or Slovenian | 26 languages, Slavic subset: cs, pl, ru, uk, sr | cs, pl, ru, uk, sr | n/a | Benchmark design | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Sec. 2 (language list); Table 2 (Wikipedia and speaker counts) | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-05 | OneRuler: Czech, Russian, Serbian, Ukrainian values appear only in a heatmap, not in text | No numeric values extracted (figure-only) | cs, ru, sr, uk | n/a | NIAH, 8K-128K | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Figure 3 (heatmap), Figure 4(b) (bar chart, 64K and 128K) | 2025-08-08 (v2) | preprint | LOW (values not extracted) |
| WS2-06 | OneRuler: Romance languages best at all lengths; Polish and Russian named among the strongest | Qualitative only | pl, ru, romance | n/a | NIAH, all lengths | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Figure 3 caption | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-07 | OneRuler: gap between low- and high-resource languages widens from 8K to 128K | Qualitative | all | all tested | NIAH, 8K-128K | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Abstract and Sec. 3 | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-08 | OneRuler: many errors come from false "no needle" answers | Qualitative, with the nonexistent-needle variant much lower | all | o3-mini-high named as the main offender | NIAH with absent needle | https://arxiv.org/html/2503.01996v2 | arXiv:2503.01996 | Sec. 3 (absent-needle discussion) | 2025-08-08 (v2) | preprint | MEDIUM |
| WS2-09 | OneRuler code and data are public. The repo has no per-language results files. | Repo: MIT license, 26 language folders under prompt/, no results files in the root listing | 26 languages | n/a | Data generation and evaluation scripts | https://github.com/mungg/OneRuler | arXiv:2503.01996 | README; root listing | repo date not visible | code repo | MEDIUM |
| WS2-10 | Long Context Benchmark for the Russian Language (LIBRA successor): 18 datasets, 4 difficulty levels, context up to 128K. Results and any English comparison are not in the text I read | None (abstract only) | ru | not in abstract | Retrieval, QA, reasoning; up to 128K | https://aclanthology.org/2025.codi-1.1 | DOI 10.18653/v1/2025.codi-1.1 | Abstract | 2025-11 (CODI 2025, Suzhou) | peer-reviewed (CODI 2025 workshop, ACL Anthology) | HIGH for metadata; no results |
| WS2-11 | LIBRA (earlier preprint): 21 datasets, 4 difficulty groups, 4k-128k tokens | None (abstract only) | ru | not in abstract | Long-context understanding | https://arxiv.org/html/2408.02439v1 | arXiv:2408.02439 | Abstract | 2024-08 (preprint) | preprint; older (2024) | LOW (abstract only) |
| WS2-12 | MLRBench: 7 languages (en, de, es, hi, ar, vi, zh). Only Llama-3.1-8B-Instruct tested. Long-context accuracy is English-highest among the 7 languages. No Slavic language | Table 6 (avg over methods): en 4k 0.565 / >=32k 0.467; de 0.470 / 0.423; es 0.488 / 0.436; hi 0.444 / 0.373; ar 0.411 / 0.362; vi 0.414 / 0.366; zh 0.327 / 0.281 | en, de, es, hi, ar, vi, zh | Llama-3.1-8B-Instruct (only LLM) | Synthetic bAbI-style multi-hop, aggregation and absence tasks; 0-128K | https://arxiv.org/html/2504.12845v1 | arXiv:2504.12845 (v1, 2025-04-17); EACL 2026, DOI 10.18653/v1/2026.eacl-long.290 | Section 2.2 (languages); Table 1 (context lengths); Table 6 (per-language) | 2025-04-17 (preprint); EACL 2026 (March 2026 per fetched page) | peer-reviewed at EACL 2026 (venue from the ACL page); arXiv version is a preprint | HIGH for numbers as read (single fetch of the HTML summary; not cross-checked against PDF) |
| WS2-13 | LongBench Pro: English vs Chinese only. Cross-lingual gap is small (about -3.4 to +7.6 points), narrowing with model strength. No Slavic language | Table 3 (thinking scores): Gemini-2.5-Pro 72.35 EN / 74.49 ZH; GPT-5 73.24 / 71.97; Claude-4-Sonnet 71.09 / 68.65; DeepSeek-V3.2 67.89 / 67.75; Qwen3-235B-Thinking-2507 66.83 / 67.12; GLM-4.6 56.50 / 59.92; Kimi-K2 56.96 / 54.10; MiniMax-M2 52.87 / 53.55; Llama-3.1-405B 44.46 / 36.86 | en, zh | Gemini-2.5-Pro, GPT-5, Claude-4-Sonnet, DeepSeek-V3.2, Qwen3, GLM-4.6, Kimi-K2, MiniMax-M2, Llama-3.1-405B | Bilingual long-context, 1M / 272K / 256K / 160K / 128K | https://arxiv.org/html/2601.02872v1 | arXiv:2601.02872 (v1, 2026-01-06) | Sec. 5.2 finding (3); Table 3 | 2026-01-06 | preprint | MEDIUM (single fetch; the summarizer flagged a text-vs-table mismatch on Kimi-K2) |
| WS2-14 | MGAL: multilingual granularity-aware long-context benchmark. Covers six official UN languages, 8K-128K. Closed-source models have an advantage in lower-resource languages. Per-language numbers not in the abstract | None in the page I read | six UN languages (names not confirmed on the page; Russian is likely but unverified) | not named | 8K-128K | https://proceedings.mlr.press/v306/li26ib.html ; https://arxiv.org/abs/2608.20853 | PMLR v306 (ICML 2026); arXiv:2608.20853 (v1, 2026-08-21) | Abstract | 2026 (PMLR); 2026-08-21 (arXiv) | peer-reviewed (ICML 2026 PMLR) per page; arXiv version preprint | LOW (abstract only; no language list or results) |
| WS2-15 | LOOM-Scope: evaluation framework, 22 benchmarks; language coverage EN, ZH, RU. Only the Russian benchmark is LIBRA. No per-language results | None | en, zh, ru | framework (no models listed in summary) | 8K-2M | https://arxiv.org/html/2507.04723v1 | arXiv:2507.04723 (v1, 2025-07-07) | Appendix B.1 summary block; Table 4 | 2025-07-07 | preprint | MEDIUM |
| WS2-16 | Gemini 3.1 Pro model card: MRCR v2 (8-needle) 128K average. Gemini 3.1 Pro 84.9%, Gemini 3 Pro 77.0%, Sonnet 4.6 84.9%, Opus 4.6 84.0%, GPT-5.2 83.8%. Aggregate only, no per-language split | 128K: 84.9 / 77.0 / 84.9 / 84.0 / 83.8 | en (aggregate; no per-language) | Gemini 3.1 Pro, Gemini 3 Pro, Sonnet 4.6, Opus 4.6, GPT-5.2 | MRCR v2 8-needle, 128K avg | https://deepmind.google/models/model-cards/gemini-3-1-pro/ | n/a (vendor page) | Benchmark table, "Long context" row | Published 2026-02-19 (page) | vendor claim (model card) | HIGH for numbers as read; no per-language data |
| WS2-17 | Gemini 3.1 Pro model card: MRCR v2 at 1M (pointwise) 26.3% for both 3.1 Pro and 3 Pro. Other models "Not supported" | 1M: 26.3 / 26.3 | aggregate | Gemini 3.1 Pro, 3 Pro | MRCR v2, 1M | same URL | n/a | Benchmark table, same row | 2026-02-19 | vendor claim | HIGH for numbers as read |
| WS2-18 | Gemini 3.1 Pro model card: MMMLU multilingual Q&A aggregate. No per-language breakdown on the page | 92.6 (3.1 Pro) / 91.8 (3 Pro) / 89.3 (Sonnet 4.6) / 91.1 (Opus 4.6) / 89.6 (GPT-5.2) | multilingual aggregate | as listed | MMMLU, 0-shot | same URL | n/a | Benchmark table | 2026-02-19 | vendor claim | HIGH for numbers as read; no per-language |
| WS2-19 | DeepSeek-V4-Pro model card: MRCR 1M (MMR) only long-context row. V4-Pro-Max 83.5; Opus-4.6 92.9; Gemini-3.1-Pro 76.3. No multilingual split | 83.5 (V4-Pro Max); 83.3 (V4-Pro High); 44.7 (V4-Pro Non-Think); 78.7 (V4-Flash Max) | en (aggregate) | DeepSeek-V4-Pro / V4-Flash, Opus 4.6, Gemini 3.1 Pro | MRCR 1M | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | n/a | "Long Context" tables 1 and 2 on the model card | date not shown on the card; search snippets suggest 2026-04 (unconfirmed) | vendor claim (model card) | HIGH for numbers as read; no per-language |
| WS2-20 | Qwen3 technical report: RULER long-context results up to 128K. Thinking mode slightly degrades. Multilingual coverage 119 languages; no per-language long-context numbers found | RULER table (Table 23, per search summary, not read) | multilingual (not broken out) | Qwen3 (dense and MoE) | RULER 4K-128K | https://arxiv.org/abs/2505.09388 | arXiv:2505.09388 (2025-05-14) | Appendix (RULER) | 2025-05-14 | tech report; OLDER (2025 generation) | LOW (snippet only) |
| WS2-21 | Polish ModernBERT (encoders, not generative LLMs) introduces a long-context benchmark. Four tasks. Long-context average 67.47 -> 77.15 (Base) and 75.88 -> 78.49 (Large) vs Polish RoBERTa-8K | Base: 67.47 -> 77.15; Large: 75.88 -> 78.49 | pl | Polish ModernBERT Base/Large (8K), RoBERTa-8K baselines | Encoder classification tasks on long Polish documents (8K) | https://arxiv.org/abs/2609.01379 | arXiv:2609.01379 (submitted 2026-09-01) | Abstract | 2026-09-01 | preprint | MEDIUM (abstract read). Not comparable with English LLM results |
| WS2-22 | Long-context Polish encoder up to 8192 tokens; best average among Polish and multilingual encoders on 25 tasks | Not extracted | pl | Polish encoder (encoder-only) | Classification/regression, 8K | https://arxiv.org/abs/2603.12191 | arXiv:2603.12191 (2026-03) | Abstract | 2026-03 | preprint | LOW (search snippet only) |
| WS2-23 | Bielik 11B v3 architecture: native context 32,768; YaRN extension to 131,072. Spec only, no long-context benchmark | 32,768 / 131,072 | pl | Bielik 11B v3 | spec | https://arxiv.org/pdf/2601.11579 | arXiv:2601.11579 (Dec 2025 per search) | Architecture table | 2025-12 | tech report (Bielik) | LOW (search snippet) |
| WS2-24 | mmPISA-bench: zero-shot multiple-choice reasoning (PISA math and reading) in 43 languages, including Polish, Czech, Russian, Bulgarian, Slovak, Croatian, Serbian, Slovenian (no Ukrainian). Polish vs English at 4 model/effort cells: English higher in 3 of 4. Not long-context | Table 1 (% accuracy, PL / EN): Claude none (Haiku 4.5) 87.2 / 90.4; Claude high (Opus 4.5) 94.4 / 100.0; GPT-5.1 none 78.4 / 76.8; GPT-5.1 high 96.0 / 96.8 | pl, en (plus 41 others) | Claude Opus-4.5 (high); Claude Haiku-4.5 (as 'none'); GPT-5.1 (none/low/medium/high) | Reasoning, zero-shot, 25 items (original + machine translation) | https://arxiv.org/html/2606.07069 | arXiv:2606.07069 (2026-06-05) | Sec. 4, Table 1; Sec. 5.1 | 2026-06-05 | preprint (single-author-pair, one independent scholar, one CMU) | MEDIUM. Confounded: 'none' Claude cell uses a different model. No SD or significance reported |
| WS2-25 | Slovak prompt sensitivity (Slovak migration media discourse): native-language prompts give modest, task-dependent gains; no Slovak vs English numbers in abstract | None | sk (vs. presumably English) | Unnamed "large models" | Classification and extraction, not long-context | https://arxiv.org/abs/2611.01219 | arXiv:2611.01219 (submitted 2026-10-31; page lists LowResNLP 2025 proceedings) | Abstract | date conflict: 2026-10-31 (arXiv) vs LowResNLP 2025 | preprint; venue date inconsistent | LOW |

Notes on the table:
- The Slavic-specific results for newest models are missing. The Gemini 3.1 Pro card (WS2-16, WS2-17, WS2-18) and DeepSeek V4 (WS2-19) have no per-language split.
- Two items were found only in secondary descriptions and are not in the table as evidence: a Polish Radio article (news) and a Hugging Face / Dell mirror for DeepSeek V4. Both were followed to primary sources where possible.

## 3) Does English beat or lose to Polish / Slavic in these results?

Evidence that Polish is ahead of English on long-context retrieval:
- OneRuler (WS2-01, WS2-02). Polish 88% vs English 83.9% averaged over models at 64K and 128K. For o3-mini-high at 128K, Polish 92% vs English 67%. The effect is large for that one model.
- Caveat on size: each task-configuration has 50 examples (paper, Sec. 2). Using the paper's 50-per-config figure, one task at about 88% has a standard error near 4.6 points. Pooling over tasks reduces this, but a 4-point gap averaged over models and two lengths is not clearly significant. The paper gives no significance tests in the text I read.
- Caveat on mechanism: much of English's low score is the "no needle" false-negative failure, not inability to find the needle (WS2-08). That affects the absent-needle variant. It may not transfer to other prompt styles.

Evidence that English is at or above Polish/Slavic:
- MLRBench (WS2-12) does not test Polish, but on its 7 languages English has the highest long-context accuracy (0.467 vs next best de 0.423). This is the only English-vs-other comparison in a long-context benchmark from 2025-2026 that I could read in full data. It uses one 8B model.
- LongBench Pro (WS2-13) is EN vs ZH only. English is ahead for several models, with a gap of about 1-3 points for the frontier models and up to 7.6 points for Llama 3.1 405B in the opposite direction. The gap is small and narrows with stronger models.
- mmPISA-bench (WS2-24), 2026, not long-context: English is ahead in 3 of 4 cells, by 1.6 to 5.6 points. Each cell holds about 25 items, so the binomial standard error near 90% is about 6 points. These gaps are within noise. Polish is ahead in one cell (GPT-5.1 'none', 78.4 vs 76.8), again within noise.

Summary judgment:
- Long-context: the "Polish beats English" claim comes from one 2025 benchmark (OneRuler) on 2024-2025 models. It has not been replicated on current models, and the newest vendor reports do not split by language.
- Reasoning (2026): no evidence that Polish is clearly ahead of English. Results are mixed and within noise.
- Slavic languages other than Polish: no 2026 long-context per-language evidence found for Czech, Russian, Ukrainian, Bulgarian, Slovak, Croatian, Serbian or Slovenian. Czech, Russian, Ukrainian and Serbian exist only as figure values in OneRuler (not extracted).

## 4) Items NOT found, and search log

### Items not found (with what was tried)

| Item | Result | Iterations |
|---|---|---|
| mRULER (as a distinct paper) | Not found. Search returned OneRuler only. The first search failed with a rate limit, and a later search also returned only OneRuler | 3 |
| Global-MRCR / multilingual OpenAI MRCR per-language | Not found. OpenAI MRCR v2 is mentioned in the GPT-5.2 announcement (not read in primary form), no per-language split found | 2 |
| GPT-5.2 system card, section 3.9 "Multilingual Performance" | Not extracted. The PDF came back as raw binary (FlateDecode). No PDF text tool (pdftotext, pypdf, fitz) is installed in this environment, so I could not extract text. The section may contain MMMLU per-language tables; this is UNVERIFIED | 2 |
| Claude Opus 4.6 system card, MRCR multilingual | Not found. Launch-post claim "76% on 8-needle 1M MRCR v2" seen only in a search snippet (UNVERIFIED-SECONDARY). Sonnet 4.6 card has GMMLU and MILU sections (snippet) - not extracted | 2 |
| Qwen3.5 technical report (RULER / MRCR / multilingual) | Not found. Launch blog says the technical report will come later. Qwen3.5-Omni report exists but covers speech, not RULER | 2 |
| Qwen3 multilingual per-language long-context | Not found. Qwen3 report: RULER only, no per-language | 1 |
| NoLiMa multilingual extension | Not found. Only the English NoLiMa paper (arXiv:2502.05167) | 2 |
| BABILong multilingual version | Not found. The closest is MLRBench (a bAbI-style multilingual variant) | 1 |
| HELMET multilingual | Not found | 1 |
| Fiction.LiveBench per-language split | Not found. Epoch AI description only; no language data | 1 |
| XL-LongBench | Not found (no search hits) | 1 |
| mLongRR languages | Found: en, vi, id, sw, so (MRL 2024, arXiv 2409.18006). No Slavic. Older, 2024 | 1 |
| Polish-specific long-context generative LLM benchmark ("PL-LongBench" or similar) | Not found under that name. A Polish long-context encoder benchmark exists (WS2-21). A search snippet described a Polish "LongContext" set of five legal and literary tasks; this conflicts with the primary abstract's four tasks and was not verified | 6 |
| PLLuM / Bielik long-context evaluation | Not found. Bielik 11B v3 gives context spec only (WS2-23) | 2 |
| Speakleash leaderboards with long-context | Not found | 1 |
| Ukrainian long-context benchmark | Not found. Closest: LIBRA (Russian) and UA-Code-Bench (code, not long-context) | 2 |
| Czech long-context benchmark | Not found. Czech appears in OneRuler only | 2 |
| Russian long-context results for newest models | Not found in the table. LIBRA results not in the text I could read | 2 |
| Per-language MMMLU for Polish/Slavic in 2026 vendor cards | Not found. Gemini 3.1 Pro card is aggregate only | 2 |
| MultiLoKo Polish results | Not found in text (benchmark covers 31 languages, arXiv:2504.10356; per-language numbers not read) | 1 |

### Search log (every query and its usefulness)

| # | Query (abbreviated) | Result | Useful? |
|---|---|---|---|
| 1 | OneRuler arXiv 2503.01996 Polish results | Rate-limited (x2) | No |
| 2 | multilingual long-context benchmark 2026 per-language accuracy NIAH | Returned OneRuler, MLRBench, MLNeedle (2024) | Yes |
| 3 | mRULER multilingual RULER | Rate-limited | No |
| 4 | Global-MRCR multilingual per-language 2026 | Nothing relevant | No |
| 5 | OneRuler follow-up 2026 | No 2026 follow-up | No (confirmed absence) |
| 6 | Polish long-context benchmark, Polish needle-in-a-haystack (Polish query) | Polish encoders, Bielik, OneRuler | Partly |
| 7 | Czech long-context benchmark (Czech query) | OneRuler (Czech in language list), BenCzechMark (not long-context) | Partly |
| 8 | Russian long-context benchmark (Russian query) | LIBRA and CODI 2025 paper | Yes |
| 9 | PLLuM / Bielik long-context 2026 | Bielik spec, Polish encoder | Partly |
| 10 | Polish long-context speakleash | Same | Partly |
| 11 | Qwen3 technical report MRCR | RULER only | Partly |
| 12 | Gemini 3 model card MRCR multilingual | Gemini 3.1 Pro card | Yes |
| 13 | GPT-5.2 system card MRCR multilingual | Card URL found; PDF not extractable | Partly |
| 14 | Slavic long-context study 2026 | No 2026 Slavic study | No |
| 15 | NoLiMa multilingual | English NoLiMa only | No |
| 16 | BABILong multilingual | MLRBench | Partly |
| 17 | LongBench multilingual 2026 | LongBench Pro (EN/ZH), MGAL | Yes |
| 18 | DeepSeek V4 technical report MRCR multilingual | Model card MRCR 1M | Yes |
| 19 | Qwen3.5 tech report RULER / MRCR | Not published yet | No |
| 20 | PL-LongBench | Polish LongContext (encoder) | Partly |
| 21 | Claude Opus 4.6 system card MRCR multilingual | Launch-post snippet only | Partly |
| 22 | effective context length by language 2026 | MLNeedle (2024), OneRuler, LongBench Pro | Partly |
| 23 | MultiLoKo Polish | MultiLoKo paper (31 languages), no Polish numbers read | Partly |
| 24 | Polish vs English prompt reasoning 2026 | mmPISA-bench (2606.07069) | Yes |
| 25 | mRULER arXiv (retry) | OneRuler only | No |
| 26 | XL-LongBench / LOOM-Scope / mLongRR | LOOM-Scope (EN, ZH, RU), mLongRR | Partly |
| 27 | HELMET multilingual / Fiction.LiveBench | Nothing multilingual | No |
| 28 | Ukrainian long-context (Ukrainian query) | LIBRA, UA-Code-Bench | Partly |
| 29 | Russian (Russian query) | LIBRA | Yes |

Retry rule: Polish/Slavic-specific long-context results were searched with 6+ differently phrased queries, in English, Polish, Czech, Russian and Ukrainian, plus arXiv / ACL / vendor-card routes. Result: no 2026 per-language long-context results for Polish or other Slavic languages on generative models were found. Several queries were rate-limited, and the mRULER query was retried once.

## 5) Primary-source URL list

- https://arxiv.org/html/2503.01996v2 (OneRuler, arXiv:2503.01996, v2 2025-08-08)
- https://arxiv.org/abs/2503.01996 (OneRuler abstract page)
- https://github.com/mungg/OneRuler (OneRuler code, MIT)
- https://aclanthology.org/2026.eacl-long.290/ (MLRBench, EACL 2026, DOI 10.18653/v1/2026.eacl-long.290)
- https://arxiv.org/html/2504.12845v1 (MLRBench, arXiv:2504.12845)
- https://aclanthology.org/2025.codi-1.1 (Long Context Benchmark for the Russian Language, CODI 2025, DOI 10.18653/v1/2025.codi-1.1)
- https://arxiv.org/html/2408.02439v1 (LIBRA, arXiv:2408.02439, 2024; older)
- https://arxiv.org/html/2601.02872v1 (LongBench Pro, arXiv:2601.02872, 2026-01-06)
- https://proceedings.mlr.press/v306/li26ib.html (MGAL, PMLR v306, ICML 2026)
- https://arxiv.org/abs/2608.20853 (MGAL arXiv version, 2026-08-21)
- https://arxiv.org/html/2507.04723v1 (LOOM-Scope, arXiv:2507.04723)
- https://arxiv.org/abs/2502.05167 (NoLiMa, English only)
- https://arxiv.org/abs/2504.10356 (MultiLoKo, arXiv:2504.10356, Apr 2025)
- https://arxiv.org/abs/2505.09388 (Qwen3 technical report, arXiv:2505.09388, 2025-05; older)
- https://deepmind.google/models/model-cards/gemini-3-1-pro/ (Gemini 3.1 Pro model card, published 2026-02-19)
- https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro (DeepSeek-V4-Pro model card)
- https://arxiv.org/abs/2609.01379 (Polish ModernBERT, submitted 2026-09-01; encoders)
- https://arxiv.org/abs/2603.12191 (Long-context Polish encoder, 2026-03)
- https://arxiv.org/pdf/2601.11579 (Bielik 11B v3, snippet only)
- https://arxiv.org/html/2606.07069 (mmPISA-bench, arXiv:2606.07069, 2026-06-05)
- https://arxiv.org/abs/2611.01219 (Slovak prompt sensitivity, arXiv:2611.01219)
- https://cdn.openai.com/pdf/3a4153c8-c748-4b71-8e31-aecbde944f8d/oai_5_2_system-card.pdf (GPT-5.2 system card; not extracted, binary PDF)

Secondary pointers (not cited as evidence): Polish Radio news article on OneRuler (https://www.polskieradio.pl/395/7789/Artykul/3599379,polish-outperforms-english-in-ai-longcontext-chatbot-tasks), Habr news item on OneRuler (https://habr.com/en/news/963376).
