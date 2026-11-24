# Does the language of the prompt change LLM and agent quality? Polish and Slavic languages vs English

Evidence review, 24 November 2026. Polish version: [REPORT.pl.md](REPORT.pl.md). Raw agent reports and verification logs: [evidence/](evidence/).

## 1. Bottom line

1. **"Polish beats English" does not hold up as a general claim.** The article on cryps.pl (25 Oct 2025) rests on one benchmark, OneRuler (arXiv 2503.01996). It measures needle-in-a-haystack retrieval at 64K and 128K tokens, pooled over seven 2024–25 models, with a different source book for every language and no significance test. We found no replication on 2026 frontier models.
2. **Where a like-for-like comparison exists (same questions, same model), English is equal or slightly ahead.** The gap is a few points for strong models and shrinks to statistical noise when the model reasons at high effort (mmPISA, June 2026). It is larger for older or smaller models, for instruction following, and for agentic tasks.
3. **Language does affect results, but mostly through comprehension and cost, not through a different "level of reasoning".** One 2026 study finds the gap in reasoning models is mainly a language-understanding failure, which translating about 20% of the input largely repairs. A Polish text also costs about 1.8 times the tokens of the same English text, which means higher cost and a shorter effective context.
4. **Data for Polish are thin.** Polish is missing from most agentic, tool-use and MMLU-ProX/PolyMath-style benchmarks. We found no 2026 study that compares the same model, task and data in Polish and English for retrieval, RAG or agents. Polish-only evaluations (Bielik, PLLuM) have no English arm.

Confidence in this summary: **medium**. All numbers below were checked by a second, stronger model against the primary documents, but through a web-page summariser rather than raw PDF text. Spot-check the five numbers marked ★ before citing them externally.

## 2. What the article claims and what the primary source says

| Item | Article (cryps.pl) | Primary source (OneRuler, arXiv 2503.01996) |
|---|---|---|
| Ranking | Polish 1st of 26, English 6th | Confirmed (Sec 3.1): Polish 88% average, English 83.9% (6th of 26), Chinese 62.1% |
| Scope | "64k and 128k tokens" | Averages are NIAH tasks pooled over all models and over 64K+128K. Only the Polish sentence states the lengths explicitly. Per-length values are not printed |
| Models | Gemini 1.5 Flash, Llama 3, Qwen2.5 | Qwen2.5 7B/72B, Llama 3.1 8B, Llama 3.3 70B, o3-mini-high, Gemini 1.5 Flash; DeepSeek-R1 only in English. No GPT-5.x, Gemini 2.5/3, Claude 4.x, Qwen3 |
| Cause | "Complex structure may reduce ambiguity" (speculation) | The paper offers no tested explanation |

Facts about the paper that the article does not mention:

- **Different book per language** (App. A, Table 4): English *Little Women*; Polish *Noce i dnie* vol. 3; Czech *Švejk* vol. 3; Russian *War and Peace*; Serbian Dragutin Ilić; Ukrainian Marko Vovchok. Language and text are confounded.
- **No confidence intervals or significance test** for the language ranking. The statement "not statistically significant" appears only in a PAP press piece (27 Nov 2025), in the journalist's words. It is not in the paper.
- **One model drives much of the effect.** o3-mini-high at 128K: Polish 92%, Ukrainian 89%, English 67%; the "none" option lowers English S-NIAH by 32% at 128K (Sec 3.1, Sec 4).
- **Instruction language matters as much:** English context with Korean instructions fell from 91% to 71% at 64K (one cell, Sec 4).
- Slavic languages in the benchmark: Czech, Polish, Russian, Serbian, Ukrainian. Slovak, Croatian, Slovenian and Bulgarian are not included.
- Versions: v1 3 Mar 2025, v2 8 Aug 2025, v3 30 Sep 2025. COLM 2025 appears only in a search summary of the PDF header and is **not confirmed**.
- Per-language values exist only in a bar chart. Approximate readings from the chart as reproduced by cryps.pl (±1.5 points): Polish 88.5, Russian 86, English 84, Ukrainian 83, Czech 73.5, Serbian 71, Chinese 62.5. These are readings, not published numbers.

## 3. Evidence by area

Legend: ✔ verified by an independent second pass; ◐ verified at abstract or partial level; ✖ not verified. "Like-for-like" means the same items and model in both languages.

### 3.1 Long-context retrieval

| Finding | Numbers | Source | Like-for-like | Status |
|---|---|---|---|---|
| OneRuler averages (above) | PL 88, EN 83.9 | arXiv 2503.01996 Sec 3.1 | No (different books, pooled models) | ✔ ★ |
| Newer models with OneRuler-style data | Qwen3/3.5, Granite 4.0: English vs a 10-language average; no Slavic rows read | arXiv 2609.35378 Table 2 (Sep 2026) | n/a | ◐ |
| Long-context reasoning recipe, 10 languages including Russian only | no PL/EN/CS/UK/SR | arXiv 2605.12227 Table 11 | n/a | ◐ |
| Gemini 3.1 Pro card (19 Feb 2026) | MRCR v2 128K 84.9%, MMMLU 92.6%, aggregate only | deepmind.google model card | n/a | ✔ |
| DeepSeek-V4-Pro card | MRCR 1M 83.5, aggregate only; card date unconfirmed | Hugging Face model card | n/a | ✔ |
| Other multilingual long-context benchmarks | MLRBench, LongBench Pro, LOOM-Scope, mLongRR have no Polish; Russian only in LIBRA (2025) | arXiv / ACL Anthology | n/a | ◐ |

Result: **no 2026 per-language long-context data for Polish on frontier models.** GPT-5.x and Claude system cards were not checked (PDF could not be read); this is "not checked", not "does not exist".

### 3.2 Information retrieval and RAG

| Finding | Numbers | Source | Like-for-like | Status |
|---|---|---|---|---|
| BEIR-PL, BM25 (13 datasets, Google Translate; 11 with English BM25) | EN 42.41 vs PL 35.67 nDCG@10 (−6.74). Recomputed from Table 3 | BEIR-PL paper (2024) | Yes, machine-translated | ✔ |
| multilingual-e5-large on six translated-BEIR datasets | EN 48.57 vs PL 44.25 (−4.32; per dataset −1.4 to −10.8). BM25 on the same sets: −5.26 | mE5 paper arXiv 2402.05672 Table 7 vs PL-MTEB arXiv 2405.10138 Table 7 | Roughly (two papers, two runs, MT Polish, older model) | ✔ |
| 2026 embedder tables | PIRB: Qwen3-Embedding-8B 60.93, PolDense-1B 64.11, stella-pl 62.69, mE5-large 57.29 | arXiv 2609.12913 Table 1 (Sep 2026) | **No.** English set (14 BEIR + 8 RTEB tasks) differs from the Polish set (PIRB, 41 tasks); not a language penalty | ✔ |
| Query language effect in RAG | Russian: English-preference citation gaps −4.2 to −12.2 points. Polish, Czech, Ukrainian not tested | arXiv 2509.13930 Table 13 (ICML 2026 spotlight) | n/a | ✔ |
| Counter-reading | English preference is "mostly" an artefact of evidence distribution (MKQA only) | arXiv 2601.02956 | n/a | ✔ |
| Mixed corpora favour English documents | No Polish or Czech; Russian only in 2606.13537 (ACL 2026 Main) | arXiv 2604.05684, 2606.13537 | n/a | ✔ |
| Polish RAG 2026 | Bielik vs PLLuM judge averages 4.521 vs 4.025; Bielik preferred 81.5% only in the favourable order (54.3% with reversed order, PLLuM wins 63.7% under a Qwen judge). No English arm | LREC 2026 (2026.lrec-1.211) Tables 3–5 | n/a | ✔ |

Result: retrieval quality in Polish is **somewhat below** English on like-for-like translated benchmarks (−4 to −7 nDCG points), with older models and machine translation. There is **no evidence that Polish queries beat English** in retrieval or RAG. Retrieval tables from 2026 are not like-for-like and must not be read as a language effect.

### 3.3 Reasoning and knowledge

**mmPISA-bench** (arXiv 2606.07069, 5 Jun 2026) is the most useful 2026 source: PISA-style math and reading, 43 languages, official human translations, 25 questions per cell, 5 runs. Accuracy %:

| Language | Claude Haiku 4.5 (no reasoning) | Claude Opus 4.5 (high effort) | GPT-5.1 (none) | GPT-5.1 (high) |
|---|---|---|---|---|
| English | 90.4 | 100.0 | 76.8 | 96.8 |
| **Polish** | 87.2 | 94.4 | 78.4 | 96.0 |
| Czech | 84.8 | 96.8 | 79.2 | 94.4 |
| Russian | 85.6 | 95.2 | 84.8 | 94.4 |
| Bulgarian | 85.6 | 96.8 | 84.0 | 90.4 |
| Slovak | 88.0 | 96.0 | 74.4 | 95.2 |
| Slovene | 89.6 | 95.2 | 80.0 | 96.0 |
| Croatian | 88.8 | 96.8 | 78.4 | 96.0 |
| Serbian | 87.2 | 99.2 | 77.6 | 96.0 |
| Mean of all 43 | 87.5 | 96.6 | 78.9 | 95.7 |

Caveats: the two Claude columns are **different models** (Haiku vs Opus), so they do not show an effort effect. Polish minus English is −3.2, −5.6, +1.6, −0.8 points. Counting the 5 runs as independent gives p≈0.014 only for the Claude high-effort cell; the runs repeat the same 25 questions, so the effective gap is about 1.4 questions and all four differences are within noise. Human and machine translation give about the same totals (Claude 92.3 vs 92.8, GPT 89.5 vs 90.1). No Ukrainian. Models are late-2025 generation.

**Other evidence**

| Finding | Numbers | Source | Status |
|---|---|---|---|
| PluraMath: Polish is one of 18 target languages, DeepL translation, 500 items per language | Claude Haiku 4.5: en 33.5, high-resource mean 28.7, pl 26.3, cs 27.6, sr 27.1, uk 32.3, sk 18.1. GPT-5.4: en 17.3, mean 16.2, pl 16.2, cs 15.6, sr 16.0, uk 16.5, sk 14.5. The paper's "+0.67 for Greek and Polish" is a joint figure and could not be reproduced | arXiv 2607.05992 (Jul 2026) | ◐ (two model rows aligned) |
| MMLU-ProX: English ahead of Czech, Russian, Serbian, Ukrainian in all 15 cells re-checked, by 0.6 to 8.6 points; largest gaps for Russian: o4-mini −11.7, GPT-4.1 −8.6. **No Polish** | arXiv 2503.10497 Table 3 (older models) | ✔ |
| PolyMath, hardest subset: Russian ≥ English for DeepSeek-R1 and o1-mini, lower for Gemini 2.5 Pro. **No Polish** (18 languages) | arXiv 2504.18428 (NeurIPS 2025) | ✔ |
| Forcing the reasoning chain into a low-resource language hurts: Swahili MATH-500 57.4 vs 25.9 | arXiv 2505.17407 (recomputed from four models) | ✔ |
| Target-language chain-of-thought lags English-pivot chain-of-thought; nine languages, no Slavic | arXiv 2508.14828 (ICLR 2026) | ✔ |
| In reasoning models the gap is mainly language understanding; translating about 20% of the input recovers most of it | arXiv 2510.27269 (Findings ACL 2026) | ◐ abstract level |
| Polish reasoning paper with an English arm (Llama-PLLuM-8B-instruct): Belebele PL 0.609 vs EN 0.656. Not like-for-like (900 sampled items per dataset, parallelism of PL and EN not stated, LLM judge) | EACL 2026 Findings (findings-eacl.92) Table 3 | ✔ indicative only |
| CUS-QA (Czech, Slovak, Ukrainian knowledge QA), Llama-3.3-70B, Czechia block: cs 57.5, sk 52.3, uk 30.0, en 56.2. "en" is the annotators' English translation; others are machine translations. Direction flips with the judge (LLM judge favours English, human judges favour the local language) | TACL 2026, DOI 10.1162/tacl.a.737, Tables 10, 11, 15 | ✔ |
| OpenAI MMMLU has 14 languages: no Polish, Russian, Ukrainian, Czech or Serbian | GPT-5 card / Hugging Face | ✔ |

Result: **no primary source shows Polish reasoning beating English.** Differences are small (within noise) for strong reasoning models and larger for weaker ones or when reasoning is forced into a low-resource language.

### 3.4 Instruction following and agents

| Finding | Numbers | Source | Like-for-like | Status |
|---|---|---|---|---|
| Marco-Bench-MIF (IFEval in 30 languages; Polish is localized, not machine-translated) | Polish vs English: Claude 3.5 Sonnet 74.5 vs 90.3; GPT-4o 73.0 vs 87.8; Table 3 average row 58.6 vs 76.2 (metric not named in the caption; matches the mean of Table 2's four IFEval metrics) | arXiv 2507.11882 (ACL 2025) | Partly | ✔ (2025 models) |
| OmnilingualGAIA2 (agentic tasks; 10 target languages, **no Polish**) | English vs target average: Gemini-3.1-Pro 62.2 vs 53.4; Claude-4.7-Opus 82.7 vs 73.6; GPT-5.4 68.4 vs 58.5; Gemma-4-31B 63.3 vs 51.4; Qwen-3.6-27B 62.2 vs 50.2; Kimi-2.6 66.5 vs 54.2; Qwen-3.6-35B-A3B 56.6 vs 38.2. Gaps 8.8 to 18.4 points (recomputed). The English side is the higher one in every row | arXiv 2608.08775 Table 1 (Aug 2026) | Yes (translated scenarios, paired tests) | ✔ ★ |
| Other agentic and tool-use benchmarks (MAPS, tau-bench-LILT, MLCL) | None includes Polish | arXiv 2505.15935, 2611.07203, 2601.05366 | n/a | ◐ abstract level |

Result: for agentic tasks the latest evidence (2026, current models) shows English **ahead by 9–18 points** in other languages. The paper's authors report that the gap does not shrink with model scale (not independently checked). Polish was not tested.

### 3.5 Tokenization and cost

| Finding | Numbers | Source | Status |
|---|---|---|---|
| Tokens per word, six tokenizers (mean), parallel SIB-200 text | EN 1.23; PL 2.25; CS 2.28; HR 2.31; SL 2.28; BG 2.33; SK 2.45; UK 2.66. PL/EN ≈ 1.83 | arXiv 2605.24718 Table 4 (May 2026; single-author preprint; abstract says 25 languages, HTML title 24) | ✔ ★ |
| Polish constitution preamble, tokens PL vs EN | Llama 2 681 vs 427 (1.59); Mistral v0.1 747 vs 408 (1.83); Bielik's Polish tokenizer 344 vs 615 (0.56) | arXiv 2410.18565 Table 2 (2024) | ✔ |
| Bielik 11B v3 table | Qwen3 625 vs 373 (1.68); EuroLLM 437 vs 404 (1.08); Mistral Small 3.2 547 vs 377 (1.45) | arXiv 2601.11579 (PDF) | ✔ |
| Largest token gap across all languages | "up to 15x" is the extreme over all language pairs, not Slavic. Polish about 1.7–1.9x English on LLaMA, Qwen, cl100k | Petrov et al., arXiv 2305.15425 and repo CSV | ✔ |

Consequence: the same content in Polish costs roughly 1.8 times as much and fills a fixed context window about 1.8 times faster. A Polish-optimised tokenizer can reverse this (0.56). Tokenization measures cost, not competence. A self-measured check with tiktoken was not completed because the sandbox blocked the download of parallel text.

## 4. Does language change an agent's level of reasoning?

What the evidence supports:

- **Yes, a little, and unevenly.** Same-question benchmarks show English equal or ahead in almost every cell; the gap ranges from noise (frontier models, high reasoning effort, mmPISA) to 9–18 points (agentic tasks in non-Polish languages) and about 15 points (instruction following, 2025 models).
- **The mechanism points to comprehension, not logic.** Reasoning-model gaps shrink sharply when only part of the input is translated (arXiv 2510.27269, abstract level). Forcing the chain of thought into a low-resource language hurts much more than forcing it into English.
- **Strong models plus reasoning effort largely close the gap for Slavic languages.** This is based on one benchmark with 25 questions per cell, so treat it as a hint.
- **Long-context retrieval is the only place where Polish looked best,** and that result carries confounds (different books, pooled models, one model driving the effect). It says little about reasoning.
- **Cost differs more reliably than quality:** about 1.8x tokens for Polish and Czech, 2.3–2.7x for Ukrainian and Bulgarian relative to English's 1.23 tokens per word.

What the evidence does not support: that Polish prompts make a model reason better than English prompts.

## 5. What we did not find (and how hard we looked)

Search effort: six research agents made about 335 tool calls (searches and page fetches) in English, Polish, Czech, Russian and Ukrainian (WS1: 8 native-language iterations; WS5: 6 iterations plus a follow-up wave; WS2: about 29 queries; WS6: 17 searches, ten of them Slavic-specific; WS3 and WS4 about 20 each). Five stronger-model verifiers then re-opened the sources. The rule "at least five iterations before concluding that data do not exist" was applied to each negative result.

Not found after the required iterations:

- A 2026 study comparing the **same model, task and data in Polish and English** for retrieval, RAG or agents.
- Polish in any agentic or tool-use benchmark from 2025–2026 (MAPS, OmnilingualGAIA2, tau-bench-LILT and MLCL exclude it).
- Per-language long-context results for frontier models from vendors.
- A measured effective-context study for Polish.

Found but weaker than hoped (read as leads, not evidence): Open PL LLM Leaderboard scores (dataset returns 401, so unreachable); PolEval 2026 results (not yet published); Slovak, Serbian, Croatian, Bulgarian native-language searches (only partial); CLARIN-PL, IPI PAN, NASK 2026 reports (none found).

Not checked: GPT-5.x, Claude and Qwen3.x per-language tables in vendor system cards (PDFs unreadable); arXiv 2412.00559 (Polish-English medical transfer, a possible like-for-like source); the live MTEB, PIRB and PL-MTEB leaderboards.

## 6. Corrections made during verification

- The "Claude Opus-4-5 none" label in an early agent report was wrong: the no-reasoning Claude column in mmPISA is Haiku 4.5 and the high-effort column is Opus 4.5.
- The OmnilingualGAIA2 gap direction was reversed in the first transcription; English is the higher score everywhere.
- The BEIR-PL BM25 averages are recomputed by us from Table 3, not printed in the paper.
- "COLM 2025" for OneRuler is unconfirmed.
- 2503.00995 is "Evaluating Polish linguistic and cultural competency in LLMs", not a Polish RAG needle-in-a-haystack paper.
- The Russian "4x more expensive" headline is not supported: the primary is a small self-built corpus, and 3.9x compares two models on Russian, not Russian with English.
- LLMzSzŁ (arXiv 2501.02266) is not a like-for-like Polish-vs-English test.
- The 81.5% Bielik preference holds only in the favourable order.
- The earlier flag on arXiv 2609.39001 ("suspicious ID") was wrong; the paper exists.
- Tokka-Bench (2610.08794) shows a submission date of 25 Mar 2026, which conflicts with its ID; it is not cited here.

## 7. Practical implications for the team

- Do not choose prompt language on the strength of "Polish beats English". If the user and documents are Polish, keep them Polish; there is no evidence that translating to English helps strong reasoning models, and mixed-language corpora can favour English documents in RAG.
- For smaller or older models, instruction following and multi-step agent tasks, expect a few to about 15 points of loss in Polish and test it on your own data.
- Budget about 1.8x tokens for Polish text (cost and context). A Polish-aware tokenizer (Bielik, PLLuM) changes this.
- Build a tiny paired evaluation of your own: 30–50 tasks written in both languages, run with the model and reasoning effort you use, five runs each, and compare. This is cheap, and it answers the question for your stack where no published benchmark covers Polish.

Claude Code tips for this kind of work (for the course):

- Keep the research brief (scope, source rules, report format, minimum iterations) as a **skill**, for example `/research-fanout`, so the next study needs only a topic.
- Keep source and verification rules in a scoped `CLAUDE.md` or `AGENTS.md` inside the research folder, not in the root file.
- Use a cheaper model for broad collection and a stronger model for verification, as here. Give verifiers the instruction to open the primary document and not to trust the report.
- Useful tools to add: an arXiv or Semantic Scholar MCP server for citation lookups, and a PDF-to-text CLI such as `pdftotext`, because several checks here failed on unreadable PDFs.

## 8. Method and limits

- Pipeline: source tracing, then six research agents (Haiku) with separate scopes, then five verification agents (Sonnet) that re-opened the primary documents, then this report written by the coordinating agent.
- Pages were read through a web-fetch summariser, not through raw PDF text. Table columns were mapped by the readers and cross-checked where two readers agreed. Figure values are visual readings.
- Many 2026 papers are preprints and not peer reviewed. Peer-reviewed items: OneRuler is a preprint (venue unconfirmed); Marco-Bench-MIF (ACL 2025), PolyMath (NeurIPS 2025), Barua et al. (ICLR 2026), Linguistic Nepotism (ICML 2026 spotlight), CUS-QA (TACL 2026), the EACL and LREC 2026 papers, Kang et al. (Findings ACL 2026).
- No participant data or credentials were used. No files were pushed or committed.
