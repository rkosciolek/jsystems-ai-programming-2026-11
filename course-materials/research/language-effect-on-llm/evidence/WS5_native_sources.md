# WS5 - Native-language and regional source hunt (Polish + Slavic)

Date of research: 2026-11-24. Scope: Polish, Czech, Slovak, Ukrainian, Russian, South Slavic (Serbian/Croatian, Slovene, Bulgarian, Macedonian).
Method: 6 iterations of web search, followed by WebFetch of primary documents (arXiv, ACL Anthology, ELRA/LREC, DOI landing pages). Several PDFs could not be parsed by WebFetch (binary/compressed streams); those are marked accordingly.
Caveat on method: WebFetch runs a small summarising model over the page. Numbers below were taken from that summary and checked against the table or text it quoted, where possible. Numbers marked MEDIUM were read once, from one fetch. No number was taken from memory.

## 1) Executive summary

- The OneRuler "Polish beats English" headline is real in the primary paper (arXiv 2503.01996, COLM 2025) but narrow: it is a synthetic needle-in-a-haystack (NIAH) retrieval score at 64K and 128K tokens, Polish 88% vs English 83.9% average accuracy, English ranked 6th of 26. It is NOT like-for-like: each language uses a different source book (English: *Little Women*; Polish: *Nights and Days*, vol. 3). The co-author publicly said the gap is not a claim that Polish is the best prompting language (Polish press, pointer only).
- No 2026 primary study found that directly compares the same model on the same task in Polish vs English for retrieval, RAG or logical reasoning. Polish 2026 papers (Bielik reasoning, Bielik/PLLuM RAG, EACL 2026 reasoning) are Polish-only.
- Best 2026 like-for-like Slavic-vs-English data is tokenisation, not model quality: arXiv 2605.24718 (May 2026) uses parallel SIB-200 text. Fertility (tokens/word): English 1.23, Polish 2.25, Czech 2.28, Slovak 2.45, Ukrainian 2.66. Slavic text costs roughly twice the tokens of English, which raises context-length cost in long-context and RAG tasks.
- Czech/Ukrainian regional QA (CUS-QA, TACL 2026) has native and English versions; the abstract gives only aggregate accuracy (above 40% textual, below 30% visual for the best open-weight models). The reported "better in English" effect appears only in secondary text; primary confirmation was not obtained.
- Polish and other Slavic 2026 venues found: EACL 2026 Findings (Polish reasoning), LREC 2026 (Polish RAG), UNLP 2026 (Ukrainian grammar benchmark, 347 items; best large models up to 59.6% accuracy, abstract only), Slavic MTEB dataset-scarcity study (arXiv 2608.24477, Aug 2026).
- Net: the team cannot cite a primary 2026 Polish-vs-English performance result. Reasonable claim: "tokenisation is 2x costlier for Slavic languages; OneRuler's Polish-first ranking is a retrieval result with a confounded design."

## 2) Findings table

Legend. Type: PR = peer-reviewed; PP = preprint; TR = tech report; IR = institutional report; VC = vendor claim; CL = community leaderboard; PO = pointer only (secondary). Like-for-like (L4L): YES / NO / PARTIAL / NOT REPORTED. "Abstract" = numbers from abstract only.

| ID | Claim | Numbers | Language(s) | Model(s) | Task | L4L vs English? | Source URL | DOI/arXiv/repo | Location | Pub. date | Source lang. | Type / peer-review | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WS5-01 | Polish ranks 1st and English 6th of 26 languages on long-context NIAH (64K, 128K) | Polish avg 88% (64K/128K); English 83.9%; English 6th of 26 | EN, PL + 24 others | 7 models incl. Qwen 2.5, Llama 3.1/3.3, OpenAI (per other coverage) | Synthetic NIAH retrieval, 64K/128K | NO: each language uses a different source book (Section 2.1, Appendix A, Table 4). Language effect confounded with text. | https://arxiv.org/abs/2503.01996 ; https://arxiv.org/html/2503.01996v2 | arXiv 2503.01996 (v2); code github.com/mungg/OneRuler | Sec. 3.1 and Fig. 4(b) | arXiv v1 2025-03 (ISO date of v1 not re-verified); COLM 2025 | EN | PP (arXiv) + PR (COLM 2025 per paper) | MEDIUM (primary read once via summarising fetch; numbers quoted in Notebookcheck/PL press also agree, but those are secondary) |
| WS5-02 | Gap is 11% (8K) to 34% (128K) between top-5 and bottom-5 languages | 11% at 8K; 34% at 128K | Multilingual (26 langs) | as WS5-01 | NIAH and aggregation | PARTIAL | same as WS5-01 | arXiv 2503.01996 | Sec. 3.1, Fig. 1(a) | 2025-03 | EN | PP / PR | MEDIUM |
| WS5-03 | Instruction language can change accuracy by up to 20%; Korean-instruction example drops 91% to 71% at 64K | up to 20%; 91% to 71% (64K, English context) | EN context, KO instructions | Not stated in summary | NIAH | NO (cross-lingual design, not PL vs EN) | same | arXiv 2503.01996 | Intro; Sec. 4, Fig. 6(a) | 2025-03 | EN | PP / PR | MEDIUM |
| WS5-04 | Adding the "answer none if absent" option drops English S-NIAH accuracy by 32% at 128K | -32 pp (relative per summary) at 128K | EN | Not stated | S-NIAH | Not a language comparison | same | arXiv 2503.01996 | Sec. 4, Fig. 1(b) | 2025-03 | EN | PP / PR | MEDIUM (wording "by 32%" may be relative or absolute; check Fig. 1(b)) |
| WS5-05 | Co-author says Polish-English difference is not statistically significant and not a claim that Polish is best for prompting | none in primary (no significance test found in the read text) | PL, EN | - | - | - | Pointer: scienceinpoland.pl/en/news/news,110407 (PAP quote); spidersweb.pl/2025/11 (Microsoft clarification) | - | - | 2025-11 (press) | PL/EN press | PO | LOW (press pointer; primary significance test not found) |
| WS5-06 | Slavic languages need about 1.8-2.2x more tokens per word than English for the same parallel text (mean fertility, 6 tokenisers): English 1.23, Polish 2.25, Czech 2.28, Slovak 2.45, Ukrainian 2.66 tokens/word | Table 4 means (min-max): EN 1.23 (1.21-1.25); PL 2.25 (1.88-2.60); CS 2.28 (2.03-2.93); SK 2.45 (2.13-2.93); UK 2.66 (2.16-3.62) | EN, PL, CS, SK, UK | 6 models (tokenisers), per-model values only in Fig. 2 heatmap | Tokenisation fertility, SIB-200 parallel text | YES (same parallel text) - but measures tokeniser cost, not reasoning quality | https://arxiv.org/abs/2605.24718 ; https://arxiv.org/html/2605.24718v1 ; HF: huggingface.co/papers/2605.24718 | arXiv 2605.24718 ; dataset huggingface.co/datasets/overthelex/tokenizer-fertility-map | Table 4; abstract (cross-check: abstract gives EN 1.2, Slavic 2.2-2.5, UK 2.7) | 2026-05-23 | EN | PP, single author | HIGH for fertility numbers (table and abstract agree); preprint |
| WS5-07 | Bielik 7B v0.1 tokeniser: same Polish constitution preamble vs English translation; Polish costs far more tokens with Llama 2 and Mistral v0.1 | APT3: PL 1.48 / EN 1.93; Llama2: PL 2.94 / EN 1.34; Mistral v0.1: PL 3.22 / EN 1.28 (tokens per word) | PL, EN | Llama2, Mistral v0.1, APT3 (Bielik tokeniser) | Tokenisation on parallel text | YES (same text, translation) - tokeniser only | https://arxiv.org/abs/2410.18565 ; https://arxiv.org/html/2410.18565v1 | arXiv 2410.18565 | Table 2 | 2024-10-24 | EN | PP (Bielik tech report; OLDER: Llama2/Mistral-v0.1 generation) | MEDIUM (table read once via summarising fetch) |
| WS5-08 | Bielik 11B v3: "outperforms models with 2-6x more parameters" (author claim); no PL vs EN comparison | none in extracted text | PL + EU languages | Bielik 11B v3 | General | NO | https://arxiv.org/abs/2601.11579 | arXiv 2601.11579 | Abstract | 2025-12-30 (v1) - OLDER than 2026-01 | EN | TR / PP (vendor-adjacent, authors are Bielik team) | LOW (abstract only; benchmark tables not read) |
| WS5-09 | Bielik reasoning field report: evaluation method and early results; questions originally written in Polish; no English comparison in read text | none verified (secondary site mentions Bielik-R, unconfirmed) | PL | Bielik 2.3 baseline; DeepSeek-R1 used as reference | Logical puzzles (riddles, inductive, formal) | NO (Polish-first; no EN arm found) | https://arxiv.org/abs/2603.10640 ; https://arxiv.org/html/2603.10640v1 | arXiv 2603.10640 | Full text sections not read | 2026-03-11 | EN | PP | LOW (abstract + summary only) |
| WS5-10 | Polish reasoning: high-quality reasoning traces beat longer or lower-quality traces; "reasoning clarity over verbosity" | none extracted (no numbers in landing page) | PL (MoT-PL variants) | fine-tuned 8B models (names not extracted) | Reasoning SFT | NO (no EN comparison in abstract) | https://aclanthology.org/2026.findings-eacl.92/ | DOI 10.18653/v1/2026.findings-eacl.92 | Abstract | 2026-03 | EN | PR (EACL 2026 Findings) | MEDIUM (abstract only) |
| WS5-11 | Polish RAG: Bielik-11B-v2.3-Instruct outperformed PLLuM-12B-nc-chat in accuracy and relevance; embedding comparison too | no numbers in abstract/landing page | PL | Bielik-11B-v2.3-Instruct; PLLuM-12B-nc-chat | RAG on low-code docs | NO (PL only) | https://aclanthology.org/2026.lrec-1.211/ | DOI 10.63317/36igcwtic7tn | Abstract; full text not read | 2026-05 (LREC 2026, pp. 2698-2704) | EN | PR (LREC 2026) | MEDIUM (abstract only) |
| WS5-12 | Ukrainian grammar/orthography gold benchmark (347 expert MCQ); smaller models at most 42.1%, large LLMs up to 59.6% accuracy; prompts in Ukrainian and English (no split reported in read text) | <=42.1% (small); up to 59.6% (large) | UK (prompts UK and EN) | GPT-OSS-120B, Gemma 3, Llama family, MamayLM, Lapa (per summary) | Grammar and orthography MCQ | NOT REPORTED (no per-language split in read text) | https://aclanthology.org/2026.unlp-1.12/ | ACL ID 2026.unlp-1.12 (UNLP 2026, pp. 121-135) | Abstract | 2026-05 | EN | PR (workshop, peer-reviewed) | MEDIUM (abstract only) |
| WS5-13 | Ukrainian: base models with few-shot beat instruction-tuned models with zero-shot on Ukrainian tasks (summarisation, QA, translation; LongFLORES) | none in landing page | UK | open-source models | Mixed | NO (no EN arm in abstract) | https://aclanthology.org/2025.ranlp-1.100/ | ACL ID 2025.ranlp-1.100 (RANLP 2025, pp. 876-883) | Abstract | 2025-09 | EN | PR (RANLP 2025) - OLDER | MEDIUM (abstract) |
| WS5-14 | CUS-QA: open-ended regional QA written natively in Czech, Slovak, Ukrainian, with English translations; best open-weight LLMs above 40% on textual, below 30% on visual questions | >40% textual; <30% visual (best open-weight) | CS, SK, UK, EN | Open-weight LLMs (not named in read text) | Regional-knowledge open QA | UNKNOWN from read text (translation pairs exist - potential L4L; per-language split not read) | https://aclanthology.org/2026.tacl-1.67/ | DOI 10.1162/tacl.a.737 (TACL vol. 14, pp. 1482-1509) | Abstract | 2026 (TACL) | EN | PR (TACL) | MEDIUM for abstract numbers. The secondary claim that models sometimes do better in English was NOT confirmed in primary. |
| WS5-15 | BenCzechMark: 50 Czech-centric tasks, native Czech (14 new), duel scoring, leaderboard, 50+ submissions | 50 tasks; 8 categories; leaderboard with 50 submissions (per summary) | CS | many | Multi-task Czech benchmark | NOT TESTED in read text (no EN arm identified in snippet) | https://arxiv.org/abs/2412.17933 | arXiv 2412.17933 ; DOI 10.1162/tacl.a.32 (TACL 2025, v13) | Search snippet and summary only | 2024-12-23 (v1); 2025-05-22 (v2) - OLDER | EN | PR (TACL 2025) | LOW (search summary, not read in full) |
| WS5-16 | skLEP: GLUE-style Slovak NLU benchmark, 9 tasks, partly translated from English, native post-edited; targets fine-tuned encoders | 9 tasks | SK | fine-tuned encoders (per summary) | NLU | NOT TESTED (no chat-LLM EN vs SK comparison) | https://arxiv.org/abs/2506.21508 ; https://aclanthology.org/2025.findings-acl.1371 | arXiv 2506.21508 ; ACL ID 2025.findings-acl.1371 | Search summary | 2025-06 - OLDER | EN | PR (ACL Findings 2025) | LOW (search summary) |
| WS5-17 | Slovene GaMS3-12B (Gemma 3 12B adapted): beats Gemma 3 12B on Slovene-LLM-Eval, EN-to-SL translation and Slovene LLM Arena; over 60% win rate vs GPT-4o in Arena | win rate >60% vs GPT-4o (Arena) | SL, EN | GaMS3-12B; Gemma 3 12B; GPT-4o | Instruction following, MT, arena | PARTIAL (EN used as source for MT only; not a SL-vs-EN capability test) | https://arxiv.org/abs/2603.01691 ; https://huggingface.co/cjvt/GaMS3-12B-Instruct | arXiv 2603.01691 (2026-03) | Search summary of PDF | 2026-03 | EN | PP (university preprint) | LOW (search summary only) |
| WS5-18 | Language Models on a Diet: paper states GPT-4 brings all South Slavic languages to English-version COPA level (sentence cited from another source, not measured here); own experiments are encoders on Croatian and Serbian COPA only | BERTic Croatian COPA step 0: 0.669 +/- 0.016 (accuracy, 10 runs); cseBERT 0.645 +/- 0.024 | HR, SR | BERTic, cseBERT, XLM-R (encoders) | COPA | NO (GPT-4 EN number not in paper) | https://arxiv.org/html/2404.05428v1 | arXiv 2404.05428 (2024-04-08) - OLDER | Intro; Tables 11-12 | 2024-04-08 | EN | PP (conference version not checked) | MEDIUM for table numbers, LOW for the GPT-4 claim (second-hand) |
| WS5-19 | Slavic-subset MTEB embedding study: severe benchmark sparsity; many language-task pairs rely on one dataset; a few transferable models | not extracted | Slavic subset | llama-embed-nemotron-8b, multilingual-e5-large-instruct (named) | Embedding retrieval/classification | NOT TESTED (no EN arm in abstract) | https://arxiv.org/abs/2608.24477 | arXiv 2608.24477 | Abstract | 2026-08-25 | EN | PP | MEDIUM (abstract only; PL/CS/SK/UK/RU listing not confirmed) |
| WS5-20 | MERA (Russian LLM benchmark, black-box, private answers) and MERA Multi (18 multimodal tasks, EACL 2026) | not extracted (versions differ: 21 vs 11 domains reported) | RU | base models, closed and open | Multi-skill (text, image, audio, video) | NOT TESTED (Russian only) | https://arxiv.org/abs/2401.04531 ; https://arxiv.org/abs/2511.15552 ; https://mera.a-ai.ru/en | arXiv 2401.04531 (2024-01, OLDER); arXiv 2511.15552 (2025-11, OLDER); ACL ID 2026.eacl-long.94 | Search summary | 2024-01 / 2025-11 / 2026 (EACL) | EN/RU | PR (EACL 2026 for Multi) | LOW (search summary only; no 2026 leaderboard numbers obtained) |
| WS5-21 | PLLuM family (Polish): 100+ contributors; Polish benchmarks (KLEJ, PolQA, PIRB, medical, PLCC) | not readable | PL | PLLuM | - | UNKNOWN | https://arxiv.org/abs/2511.03823 | arXiv 2511.03823 (2025-11) - OLDER | PDF not parsable | 2025-11 | EN | TR / PP | LOW (metadata only) |
| WS5-22 | Serbian SuperGLUE (7 tasks; LLM-assisted translation with expert review; std dev >10% in some configs) | 7 tasks; sd >10% (per summary) | SR | not extracted | NLU | NOT TESTED in read text | https://aclanthology.org/2026.loreslm-1.30.pdf | ACL ID 2026.loreslm-1.30 (LoResLM 2026, pp. 347-361) | PDF not parsable by tool | 2026 | EN | PR (workshop) | LOW (search summary; PDF unreadable) |
| WS5-23 | PolEval 2025: Task 1 machine-generated text detection (Gemma-3-27B and PLLuM-12B 81.22% on unseen generators per a participant paper); Task 2 gender-inclusive LLM editing for Polish (best F1 = 0.6283 +/- 0.0056) | 81.22%; F1 0.6283 (participant reports) | PL | Gemma-3-27B, PLLuM-12B, Qwen3-8B, Bielik-7B-Instruct | Detection; proofreading | NO | https://aclanthology.org/events/poleval-2025/ ; https://aclanthology.org/2025.poleval-main.6 | ACL ID 2025.poleval-main.6 | Search summary; poleval.pl not reached | 2025-11-17 (results) - OLDER | EN | PR-workshop (PolEval 2025 proceedings) | LOW (search summary) |
| WS5-24 | Ukrainian LLM vendor claims: MamayLM (9B, INSAIT, Apr 2025), Lapa LLM v0.1.2 (Oct 2025, Gemma-3-12B base) | not verified | UK, EN | MamayLM 9B, Lapa v0.1.2 | Mixed | Vendor claims (EN and UK both claimed) | https://huggingface.co/blog/INSAIT-Institute/mamaylm ; LinkedIn (pointer) | - | - | 2025-04 / 2025-10 - OLDER | - | VC / PO | LOW |
| WS5-25 | Polish tokeniser/other: Tokka-Bench reports EN about 1.3 tokens/word; Czech and Polish 2.2-3.7 depending on tokeniser | range 2.2-3.7 | CS, PL, EN | 100+ languages, many tokenisers | Tokenisation | YES (same texts), but snippet only | https://arxiv.org/abs/2610.08794 | arXiv 2610.08794 (Oct 2026) | Search summary | 2026-10 | EN | PP | LOW (search summary; consistent with WS5-06) |
| WS5-26 | Prompt-language effect on political-document analysis (RU vs UA prompts yield different orientations for same model) | not extracted | RU, UA | not extracted | Content analysis | Partial (same content, different prompt language) | https://arxiv.org/abs/2601.12164 | arXiv 2601.12164 (Jan 2026) | Search summary | 2026-01 | EN | PP | LOW (search summary) |
| WS5-27 | German RAG: reasoning in native language narrows but does not close the gap with English reasoning (adjacent, not Slavic) | not extracted | DE, EN | not extracted | RAG | Adjacent | https://arxiv.org/abs/2610.03136 | arXiv 2610.03136 (Oct 2026) | Search summary | 2026-10 | EN | PP | LOW (not Slavic; for method context only) |
| WS5-28 | ELOQUENT 2026 cultural-robustness study (6 languages incl. Polish; retrieval x reasoning factorial). Lightest intervention wins | not extracted | incl. PL | not extracted | RAG and reasoning modes | Probably PARTIAL | http://ceur-ws.org/Vol-4283/paper106.pdf | CEUR Vol-4283 | Search summary | 2026 | EN | Workshop (CEUR) | LOW (not fetched) |
| WS5-29 | Oxido 2026 Polish test (12 models, 20 tasks, 10 categories); winner Gemini 3.1 Pro; PLLuM and Bielik placed behind Meta and Chinese models | ranking only | PL | 12 models incl. Gemini 3.1 Pro, PLLuM, Bielik | Mixed | NO | Pointer: Rzeczpospolita (reported in search summary; not fetched) | - | - | 2026 (press) | PL | PO / VC | LOW (pointer; not verified; no primary) |

## 3) Iteration log

Iteration 1 - Polish sources (primary and OneRuler)
- Queries: "OneRuler long-context benchmark ... 2503.01996 Polish English results"; "benchmark modeli językowych język polski 2026 LLM ewaluacja"; "PLLuM Bielik ewaluacja benchmark raport 2026"; "Open PL LLM Leaderboard speakleash polish benchmark".
- Sites: arxiv.org (2503.01996, html v2, v1, v3, pdf); huggingface.co/spaces/speakleash/open_pl_llm_leaderboard (about.py); arxiv 2601.11579, 2603.10640, 2505.02410; codesota.com/polish-llm (secondary aggregator; not used as evidence).
- Found: OneRuler primary numbers (Sec. 3.1, Fig. 4(b), Fig. 1); Bielik 11B v3 (no PL vs EN numbers); Bielik reasoning report (no EN arm); Open PL LLM Leaderboard design (lm-eval fork, 0-shot and 5-shot; PLLuM excluded for contamination). Leaderboard scores themselves were NOT retrieved.
- Rate-limit: the second Polish query (PLLuM/Bielik 2026 report) returned too_many_requests and was not retried; this is a gap in Iteration 1.

Iteration 2 - Czech and Slovak
- Queries: "BenCzechMark Czech LLM benchmark arXiv"; "Slovak LLM benchmark skLEP slovenčina jazykové modely evaluácia".
- Sites: arxiv.org 2412.17933; aclanthology.org (2025.tacl-1.50; 2025.findings-acl.1371); arxiv 2506.21508; kinit.sk (search summary); CUS-QA found in later query.
- Found: BenCzechMark (TACL 2025, DOI 10.1162/tacl.a.32); skLEP (ACL Findings 2025); SkMTEB (announced for ACL 2026, not fetched); SK sk-bench (EMNLP 2026 claimed via LinkedIn, unverified).
- Not verified: No Czech/Slovak English-vs-native primary comparison found in this iteration. CUS-QA found in Iteration 6.

Iteration 3 - Russian and Ukrainian
- Queries: "MERA benchmark Russian LLM arXiv 2026 результаты"; "Ukrainian LLM benchmark UA ... Lapa MamayLM"; plus "Ukrainian Russian Czech English same benchmark translated ... language gap".
- Sites: arxiv 2401.04531 (v2, v3); arxiv 2511.15552 (v1-v3); aclanthology 2026.eacl-long.94; aclanthology 2026.unlp-1.12 (primary, abstract); aclanthology 2025.ranlp-1.100 (abstract); arxiv 2511.05040 (UA-Code-Bench, not fetched); arxiv 2605.29170 (UA-Legal-Bench, not fetched); arxiv 2602.22207 (Recovered in Translation, not fetched; languages do not include CS, EN, RU).
- Found: MERA (RU only); MERA Multi (EACL 2026); UNLP 2026 gold benchmark (347 items; numbers abstract-only); Paniv RANLP 2025.
- Not found: Ukrainian or Russian same-benchmark EN vs native comparison with numbers.

Iteration 4 - South Slavic (Serbian, Croatian, Bosnian, Montenegrin, Bulgarian, Slovene, Macedonian)
- Queries: "BgGLUE BgGPT INSAIT Bulgarian LLM benchmark ... English comparison"; "Serbian Croatian LLM benchmark YugoGPT COPA-HR arXiv 2025 2026"; "Slovene LLM evaluation SloBENCH GaMS CLARIN.SI 2026".
- Sites: arxiv 2306.02349 (bgGLUE, 2023, not fetched); arxiv 2412.10893 (BgGPT 1.0, snippet only); arxiv 2404.05428 (fetched); arxiv 2104.09243 (BERTic, snippet); huggingface.co/gordicaleksa/YugoGPT (snippet); aclanthology 2026.loreslm-1.30 (PDF unreadable); arxiv 2603.01691 (GaMS3, snippet); arxiv 2510.21575 (SloPragEval, snippet); clarin.si (snippet).
- Found: BgGPT reports BG and EN averages side by side (snippet, not verified in primary); GaMS3 (Mar 2026); Serbian SuperGLUE (2026, PDF unreadable); SloBENCH (no 2026 release found).
- Not found: a direct YugoGPT-on-COPA-HR 2025-26 result; a bgGLUE-vs-English LLM comparison.

Iteration 5 - Workshops, proceedings, tokenisation, PolEval
- Queries: "BSNLP 2026 workshop Balto-Slavic NLP proceedings LLM evaluation"; "tokenizer fertility Polish English LLM tokens per word Slavic arXiv"; "PolEval 2025 LLM zadanie wyniki poleval.pl".
- Sites: aclanthology.org/events/bsnlp-2025 (2025.bsnlp-1); aclanthology.org/events/poleval-2025 and 2025.poleval-main.6; arxiv 2605.24718 (fetched, Table 4); arxiv 2410.18565 (fetched, Table 2); arxiv 2604.10799 (Bielik v3 tokeniser, snippet only); arxiv 2610.08794 (Tokka-Bench, snippet); arxiv 2502.08489 (Salamandra, snippet: figures only); arxiv 2409.16235 (EuroLLM, snippet); arxiv 2510.09947 (fertility metric critique, snippet).
- Found: BSNLP 2025 (10th Slavic NLP workshop; no 2026 volume found); next edition "Slavic NLP 2027" at EACL 2027 (deadline 2027-01-09 per CFP summary); PolEval 2025 proceedings (3 tasks; results 2025-11-17); tokenisation evidence (WS5-06, WS5-07).
- Not reached: poleval.pl; bsnlp.cs.helsinki.fi (not fetched).

Iteration 6 - Cross-language LLM comparisons (Polish RAG and reasoning; cross-Slavic)
- Queries: "Polish vs English prompt language LLM reasoning RAG comparison arXiv 2026 translated benchmark"; "Making Bielik LLM Reason Better field report 2603.10640 English Polish reasoning results"; "Ukrainian Russian Czech English same benchmark translated LLM performance gap arXiv 2026".
- Sites: aclanthology 2026.tacl-1.67 (CUS-QA, abstract); aclanthology 2026.findings-eacl.92 (abstract; the preview.aclanthology URL returned 404); aclanthology 2026.lrec-1.211 (abstract); arxiv 2603.10640 (landing page); arxiv 2601.12164, 2610.03136 (snippets); arxiv 2602.22207 (snippet); arxiv 2604.01957 and 2605.07533 (snippets); scienceinpoland.pl and spidersweb.pl (press, pointer only, search summary).
- Found: CUS-QA (TACL 2026); Polish RAG (LREC 2026); Polish reasoning (EACL 2026 Findings); press reception of OneRuler (pointers).
- Not found: a Polish or Slavic same-model same-task English-vs-native retrieval or reasoning result with numbers in 2026.

Additional fetches for the OneRuler confound: Section 2.1 and Appendix A confirmed one book per language (WS5-01, WS5-05 pointer). Section 2 footnote 9 concerns tokenisation ranking agreement (Kendall tau 0.82), not language effects.

## 4) Items NOT found (after 6 iterations)

1. A 2026 primary study that compares the same model on the same task in Polish vs English for retrieval, RAG or logical reasoning, with numbers. Status: DOES NOT EXIST in the sources reached. Reason: Bielik and PLLuM 2026 papers are Polish-only; Bielik v3 (Dec 2025) makes no language comparison; EACL 2026 and LREC 2026 Polish papers are Polish-only.
2. Any 2026 OneRuler update, follow-up or replication. Status: NOT FOUND; the search did not surface a follow-up citing OneRuler with Polish results. (A proper citation-graph check on Semantic Scholar was not run.)
3. A primary Polish-language critique of OneRuler with its own data. Status: NOT FOUND; only press (PAP quote via Science in Poland; Microsoft clarification via Spidersweb; Android.com.pl) which are pointers.
4. Official PolEval 2025 leaderboard numbers from poleval.pl. Status: NOT REACHED.
5. Open PL LLM Leaderboard current scores (2026). Status: NOT RETRIEVED; only its design (lm-eval fork, 0/5-shot, PLLuM excluded for contamination) was read from search snippets of the HF space.
6. BSNLP or Slavic NLP proceedings dated 2026. Status: NOT FOUND (only the 2025 volume and the 2027 call).
7. Per-language numbers for UNLP 2026 (Ukrainian vs English prompts) and CUS-QA (CS/SK/UK vs EN). Status: NOT FOUND in the abstract-level pages reached; full PDFs not parsed.
8. Serbian SuperGLUE and any YugoGPT COPA-HR 2025-26 result. Status: NOT FOUND (PDF unreadable; no paper found for YugoGPT on COPA-HR).
9. Bulgarian BgGPT vs English averages (numbers). Status: NOT VERIFIED; snippet mentions a side-by-side table, but BgGPT 1.0 (arXiv 2412.10893) was not fetched.
10. Russian MERA 2026 leaderboard numbers. Status: NOT FOUND (only search summaries of 2024-2025 papers; mera.a-ai.ru not fetched).
11. Polish theses (praca magisterska / doktorska) on PL vs EN LLM performance. Status: NOT SEARCHED (not in the six iterations). Flagged for follow-up.
12. Macedonian LLM evaluation (2026). Status: NOT SEARCHED beyond a 2025 arXiv mention (2506.09560).
13. Polish ParaPhrase / CLARIN-PL / OPI PIB / IPI PAN institutional 2026 reports on LLM quality. Status: NOT SEARCHED specifically; Iteration 1 queries covered Bielik/PLLuM/OPI only in the generic query. Flag for a follow-up.

Declared "does not exist" only for item 1 after more than 5 iterations.

## 4a) CORRECTION to Section 4, item 1 (follow-up, 2026-11-24)

The earlier "does not exist" declaration is WITHDRAWN for one case. The EACL 2026 Findings paper (WS5-30 below) reports the same model's accuracy on Polish and English versions of the same benchmark (Belebele) and on Aya Collection subsets. It is a fine-tuning paper, but the original-model baseline row is a direct Polish-vs-English measurement. The LREC 2026 paper (WS5-11, WS5-32) has no English arm.

## 6) Follow-up update (coordinator request, 2026-11-24)

### 6.1 New and revised findings

| ID | Claim | Numbers | Language(s) | Model(s) | Task | Like-for-like vs English? | Source URL | DOI/arXiv/repo | Location | Pub. date | Source lang. | Type | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WS5-30 | EACL 2026: same base model (original row) scores Belebele in Polish and English, and Aya Collection subsets in Polish and English. Fine-tuned variants shift these. Original-model Belebele EN is higher than Belebele PL, and Aya PL higher than Aya EN. | Table 3 (original row): Belebele-PL 0.609; Belebele-EN 0.656; Aya-PL 0.656; Aya-EN 0.552; MoT-PL-eval 0.316; LightR1 0.172; Avg 0.494. Detailed row: Belebele-PL 0.709; Belebele-EN 0.774; Aya-PL 0.584; Aya-EN 0.592; MoT-PL-eval 0.437; LightR1 0.146; Avg 0.540. Other rows (Summarized, BabyThink, Lengthy) also listed; Belebele-EN is above Belebele-PL in every row (e.g., Summarized 0.568 vs 0.500). Text in Sec. 4 says fine-tuning on Detailed gives +10 pp Belebele-PL, +11.8 pp Belebele-EN, +4 pp Aya-EN, +12.1 pp MoT-PL-eval. These deltas reconcile with Table 3 (0.709-0.609, 0.774-0.656, 0.592-0.552, 0.437-0.316). | PL, EN (MoT-PL reasoning data translated from English, via DeepSeek-V3-0324) | Llama-PLLuM-8B-instruct (original) and fine-tuned variants | Belebele (reading comprehension MCQ), Aya Collection subsets, MoT-PL-eval, LightR1 | YES for Belebele (multi-lingual reading-comprehension benchmark; PL and EN versions evaluated with same model). PARTIAL for Aya (PL and EN subsets may not be parallel; design not verified in fetched text). Confounded by translation for MoT-PL. | https://aclanthology.org/2026.findings-eacl.92/ ; PDF https://aclanthology.org/2026.findings-eacl.92.pdf (fetched and parsed locally) | DOI 10.18653/v1/2026.findings-eacl.92 | Section 4 (Experimental Results) and Table 3 (page number not extracted). Translation method: Sec. 2 and Figure 1 caption | 2026-03 | EN | PR (EACL 2026 Findings, pp. 1796-1811) | MEDIUM-HIGH (numbers from parsed PDF text; deltas reconcile with text; column alignment read from the table row order; parsing via stdlib, not a PDF tool) |
| WS5-31 | CUS-QA cross-lingual test: per-model accuracy on textual questions for Czech, Slovak, Ukrainian, and English versions, within country blocks. Section 5.3 says that for Czech-related questions, the large model keeps stable accuracy across Czech, Slovak and English, but for smaller models English often beats the translated language. For Slovak questions, answering in English beats answering in Slovak. For Ukraine-related questions, English is better; Czech and Slovak translations perform poorly. Surprisingly, for Slovakia-related questions, Llama3 models work better in Czech than in Slovak. | Table 15 (textual, Llama-3.3-70B-Instruct row): 57.5 | 52.3 | 30.0 | 56.2 in the Czechia block (order read as cs, sk, uk, en from Sec. 5.3 wording). EuroLLM-9B-Instruct row: 35.5 | 29.8 | 8.3 | 31.7. Llama-3.1-8B-Instruct row: 28.5 | 17.0 | 8.9 | 31.3 (first block). Remaining blocks printed in the same table (Slovakia and Ukraine columns) but their column labels are not fully recoverable from the text extraction. Table 15 note: accuracies comparable only within the country block. | Cs, Sk, Uk, En (questions and answers translated) | EuroLLM-9B-Instruct, Llama-3.1-8B, Llama-3.3-70B, Llama-4-Scout, Mistral-7B-v0.3, plus gemma3 and others in visual block | Regional open-ended QA, textual and visual | YES: same questions translated into the other languages (paper says questions/answers were translated) | https://aclanthology.org/2026.tacl-1.67/ ; PDF https://aclanthology.org/2026.tacl-1.67.pdf (saved locally and parsed) | DOI 10.1162/tacl.a.737 (TACL 14, pp. 1482-1509) | Table 15 and Section 5.3 (Cross-Lingual Differences); Table 14 is the judge confusion matrix | 2026 | EN | PR (TACL 2026) | MEDIUM for the Czechia-block row values (layout read from text extraction); MEDIUM for the Section 5.3 statements (quoted from the paper's text). Column mapping for Slovak and Ukraine blocks NOT verified. |
| WS5-32 | LREC 2026 Bielik-11B vs PLLuM-12B RAG: NO English baseline in the body. English appears only in related-work references (English QA pairs for the retriever; English RAG benchmarks). Numbers: Table 1 and 2 retrieval (Accuracy/Recall/F1/NDCG), Table 3 1-5 judge scores, Table 4 and 5 A/B preferences. | Table 3 (1-5 scale). Columns PLLuM-12B-nc-chat / Bielik-11B-v2.3-Instruct: gpt-oss-20b 3.466 / 4.192; Mistral-Small-3.2-24B 4.219 / 4.548; Qwen3-30B-A3B 4.390 / 4.822; Average 4.025 / 4.521 (Average reconciles with the three evaluator rows). Table 4 (A before B, 146 questions): Bielik preferred 77.4% (113), 76.7% (112), 90.4% (132) for gpt-oss, Mistral, Qwen; Average Bielik 81.5% (119) vs PLLuM 18.5% (27). Table 5 (B before A) reverses: Bielik average 54.3% vs 45.7%. | PL | Bielik-11B-v2.3-Instruct vs PLLuM-12B-nc-chat | RAG on technical documentation | NO English comparison. Not a PL-vs-EN test. | https://aclanthology.org/2026.lrec-1.211/ ; PDF https://aclanthology.org/2026.lrec-1.211.pdf (saved locally and parsed) | DOI 10.63317/36igcwtic7tn | Tables 1-5; Conclusions Sec. 4 | 2026-05 | EN | PR (LREC 2026, pp. 2698-2704) | HIGH for the Polish-only finding (full text read, grep for English) ; MEDIUM for table values |
| WS5-33 | OneRuler: each language uses a different source book (verified primary location). | Sec. 2.1: "we collect and clean 26 open-domain non-copyrighted books, one per language." Appendix A: "we fill the surrounding context with books from each respective language." Appendix A Table 4: English = Little Women (Alcott, 1868); Polish = Nights and Days, vol. 3 (Dabrowska, 1934). Text also says short books are padded by replicating part of the book. | EN, PL + 24 others | 7 models (not re-verified) | NIAH and aggregation | NO (language confounded with book) | https://arxiv.org/html/2503.01996v2 | arXiv 2503.01996 | Sec. 2.1; Appendix A; Table 4 | 2025-03 | EN | PP / COLM 2025 | MEDIUM-HIGH (quotes from a single fetch of the HTML by summariser; wording of quotes is the summariser's, check verbatim) |
| WS5-34 | Karpińska's critique: primary location. The arXiv paper does NOT contain her critique. The statement exists only in a PAP interview (press). See 6.2. | - | PL | - | - | - | https://scienceinpoland.pl/en/news/news,110407,polish-language-not-superior-ai-prompting-researchers-say.html (PAP, Ludwika Tomala, 27.11.2025, interview in Polish, article translated) | - | - | 2025-11-27 | PL (original) / EN (translated) | PO (press interview) | LOW as a primary source; MEDIUM that the article reports her views |
| WS5-35 | PolDense 1B (OPI PIB) tops PIRB (Polish Information Retrieval Benchmark). Polish-language benchmark only. | PolDense 1B 64.11; Llama-Embed-Nemotron-8B 63.73; BGE-Multilingual-Gemma2-9B 63.26 (PIRB score points) | PL | PolDense 1B and comparators | Retrieval (embedding) | NO (no English arm) | https://opi.org.pl/en/poldense-sukces-nowej-generacji-polskich-modeli-jezykowych-do-wyszukiwania-informacji-opracowal-je-ai-lab-z-osrodka-przetwarzania-informacji/ | - | Article text | 2026 (copyright; exact date not stated; upload likely 2026-07) | PL | Institutional (OPI PIB news release) | MEDIUM for the numbers as printed; institutional, vendor-adjacent |
| WS5-36 | Bielik 11B vs PLLuM/Polish RAG LREC paper cross-check (no English), see WS5-32 | - | - | - | - | - | - | - | - | - | - | - | - |
| WS5-37 | Long-context Polish encoder (2603.12191, 12 Mar 2026): Polish-only; no English comparison in the abstract. Not a OneRuler follow-up (no mention found in abstract). | 8192-token encoder; 25 tasks incl. KLEJ; FinBench | PL | Polish encoders | NLU, long docs | NO | https://arxiv.org/abs/2603.12191 | arXiv 2603.12191 | Abstract | 2026-03-12 | EN | PP | LOW (abstract only) |
| WS5-38 | Open PL LLM Leaderboard: structure and provenance (scores NOT retrieved). Results dataset speakleash/open_pl_llm_leaderboard_results is gated (HTTP 401). Space live page is loaded client-side; WebFetch returned only the loader text. Task list (from src/about.py): polemo2, 8tags, belebele (polish_belebele_mc / _regex), DYK, PPC, PSC, CBD, KLEJ-NER, PolQA, PoQuAD, EQ-Bench (PL), PolEval2018 task3, abstractive PoQuAD RAG, PES. NUM_FEWSHOT = 0 in code; README reports 0-shot and 5-shot. Space last modified 2026-02-27 (HF API). PLLuM models excluded for contamination (per Iteration 1 snippet). | Scores NOT RETRIEVED | PL (plus a Belebele task) | community leaderboard | Polish NLP tasks | NO English arm in its own tasks, but Belebele is multi-lingual and PL/EN variants could be compared | https://huggingface.co/spaces/speakleash/open_pl_llm_leaderboard ; https://huggingface.co/api/spaces/speakleash/open_pl_llm_leaderboard (metadata) ; https://github.com/speakleash/lm-evaluation-harness (branch polish4, from README in raw about.py) | Space repo ; results dataset speakleash/open_pl_llm_leaderboard_results (401) | src/about.py, src/envs.py | 2026-02-27 (last modified) | EN/PL | CL | HIGH for the structure, NOT RETRIEVED for scores |

### 6.2 Karpińska's critique: what she said and where

Primary location: NONE in the paper. The arXiv paper (2503.01996) does not contain her critique, and I found no significance test in the parsed text. Her critique is in a press interview.

Source read: PAP (Ludwika Tomala), Science in Poland, dated 27.11.2025, updated the same day. Interview in Polish; the article is translated into English. URL: https://scienceinpoland.pl/en/news/news,110407,polish-language-not-superior-ai-prompting-researchers-say.html

What the article attributes to her (English translation, as given by the article):
- "It is not true. We have not researched this at all." (her response to the 'Polish best for prompting' claim)
- "We have created a tool for diagnosing language models."
- "We expected to achieve 100 percent accuracy in many languages. They did not."
- "There are so many different factors in this study."
- "You have to ask again and verify with a different model."

What the article reports, not as her direct quote: Polish performed slightly better on average, but the Polish-English differences were not statistically significant, and the study did not conclude that any language is superior. Each language used different works (Nights and Days for Polish, Little Women for English, Don Quixote for Spanish, The Magic Mountain for German). Karpińska said this could partly explain Polish's slight edge.

Caveat: The lines above are the article's translation. The Polish original was not fetched.

### 6.3 Iteration 7 (follow-up) log

- Retry of rate-limited query: done via the primary PDFs (below); the previous 'PLLuM/Bielik 2026 report' query was not retried, but Polish report sources are covered in iteration 8.
- Sites: aclanthology.org/2026.lrec-1.211 (PDF, saved and parsed locally with stdlib zlib); aclanthology.org/2026.findings-eacl.92 (PDF, parsed); aclanthology.org/2026.tacl-1.67 (PDF, parsed, 99 KB text); poleval.pl (fetched); huggingface.co/spaces/speakleash/open_pl_llm_leaderboard (fetched: loader page only); raw src/about.py, src/envs.py, app.py (fetched); huggingface.co/api/spaces/... (fetched); huggingface.co/api/datasets/speakleash/open_pl_llm_leaderboard_results (401); speakleash-open-pl-llm-leaderboard.hf.space (truncated, no table); arxiv 2603.12191; arxiv 2602.14073 (not Polish-English); opi.org.pl PolDense; scienceinpoland PAP article (fetched); OneRuler arXiv HTML (re-read for Sec. 2.1 and Appendix A); arxiv.org/pdf/2503.01996 (too large for WebFetch, 10 MB limit).
- Found: EACL Table 3 PL/EN (WS5-30); CUS-QA Table 15 (WS5-31); LREC Tables 3-5 with no English (WS5-32); PolEval 2026 task list (below); Open PL structure (WS5-38); Karpińska (WS5-34, 6.2).
- Not found: Open PL scores (gated dataset); CLARIN-PL, IPI PAN and NASK 2026 reports (searches returned PLLuM pages and a Codesota aggregator only; no primary 2026 NASK or CLARIN-PL report on LLM PL vs EN found; the OPI PLCC 'over 30 models' study is arXiv 2503.00995 from 2025 (older), not re-read); Karpińska's critique in the paper (absent).

### 6.4 PolEval (poleval.pl, fetched)

- The poleval.pl homepage lists PolEval 2026 tasks, with no 2025 results on the page itself (2025 edition link only: poleval.pl/2025/).
- PolEval 2026 tasks listed: (1) PolOCRBench: Polish Document Understanding; (2) Polish Language Document Layout Detection; (3) Adversarial Style Modification: Probing the Human-AI Perception Gap; (4) Reverse PolEval: Diagnostic Benchmark Design for Polish LLMs; (5) PoLiS: Polish Linguistic Skills.
- Dates per the page: 11 Aug 2026 call for task proposals; 17 Sep 2026 tasks announced; 8 Dec 2026 Test B data; 15 Dec 2026 Test B results deadline; 17 Dec 2026 final results; 4 Jan 2027 paper deadline. No 2026 results are published yet (as of 2026-11-24).
- Pointers: https://poleval.pl/2026/results/ exists but was not fetched.
- Note: PolEval 2026 is Polish-only by name; 'Reverse PolEval' and 'PoLiS' are the tasks most likely to include LLM diagnostics, but their specs were not read.

## 5) Primary-source URL list

Additional primary URLs from the follow-up:
- https://aclanthology.org/2026.findings-eacl.92.pdf (EACL 2026 Findings Polish reasoning; Table 3 PL/EN)
- https://aclanthology.org/2026.tacl-1.67.pdf (CUS-QA; Table 15 PL/EN by country block)
- https://aclanthology.org/2026.lrec-1.211.pdf (LREC 2026 Bielik vs PLLuM; Tables 1-5)
- https://arxiv.org/html/2503.01996v2 (OneRuler; Sec. 2.1, Appendix A Table 4)
- https://scienceinpoland.pl/en/news/news,110407,polish-language-not-superior-ai-prompting-researchers-say.html (PAP interview; pointer for Karpińska)
- https://poleval.pl (PolEval 2026 tasks and dates)
- https://huggingface.co/spaces/speakleash/open_pl_llm_leaderboard (structure; loader only)
- https://huggingface.co/spaces/speakleash/open_pl_llm_leaderboard/raw/main/src/about.py and .../src/envs.py (task list, repo names)
- https://opi.org.pl/en/poldense-sukces-nowej-generacji-polskich-modeli-jezykowych-do-wyszukiwania-informacji-opracowal-je-ai-lab-z-osrodka-przetwarzania-informacji/ (PIRB numbers)
- https://arxiv.org/abs/2603.12191 (Polish long-context encoder; Polish-only)

## 5a) Original primary-source URL list

Polish
- https://arxiv.org/abs/2503.01996 ; https://arxiv.org/html/2503.01996v2 ; https://github.com/mungg/OneRuler (OneRuler; COLM 2025; 2025-03)
- https://arxiv.org/abs/2601.11579 (Bielik 11B v3; 2025-12-30; older)
- https://arxiv.org/abs/2603.10640 (Bielik reasoning field report; 2026-03-11)
- https://aclanthology.org/2026.findings-eacl.92/ (DOI 10.18653/v1/2026.findings-eacl.92; 2026-03)
- https://aclanthology.org/2026.lrec-1.211/ (DOI 10.63317/36igcwtic7tn; 2026-05)
- https://arxiv.org/abs/2410.18565 (Bielik 7B v0.1 tokeniser table; 2024-10-24; older)
- https://arxiv.org/abs/2511.03823 (PLLuM; 2025-11; older; PDF unreadable)
- https://aclanthology.org/events/poleval-2025/ ; https://aclanthology.org/2025.poleval-main.6 (PolEval 2025; 2025-11-17)
- https://arxiv.org/abs/2604.10799 (Bielik v3 tokeniser; snippet only, not fetched)
- https://huggingface.co/spaces/speakleash/open_pl_llm_leaderboard (Open PL LLM Leaderboard; not fetched for scores)

Tokenisation (Slavic, cross-language)
- https://arxiv.org/abs/2605.24718 ; https://arxiv.org/html/2605.24718v1 (2026-05-23; Table 4)
- https://arxiv.org/abs/2610.08794 (Tokka-Bench; snippet)
- https://arxiv.org/abs/2510.09947 (fertility metric critique; snippet)

Czech and Slovak
- https://arxiv.org/abs/2412.17933 ; DOI 10.1162/tacl.a.32 (BenCzechMark; 2024-12-23 / TACL 2025)
- https://aclanthology.org/2026.tacl-1.67/ ; DOI 10.1162/tacl.a.737 (CUS-QA; TACL 2026)
- https://arxiv.org/abs/2506.21508 ; https://aclanthology.org/2025.findings-acl.1371 (skLEP; 2025)

Russian and Ukrainian
- https://arxiv.org/abs/2401.04531 (MERA; 2024; older)
- https://arxiv.org/abs/2511.15552 (MERA Multi; 2025-11; EACL 2026 ID 2026.eacl-long.94)
- https://aclanthology.org/2026.unlp-1.12/ (UNLP 2026; 2026-05)
- https://aclanthology.org/2025.ranlp-1.100/ (RANLP 2025; 2025-09)
- https://arxiv.org/abs/2511.05040 (UA-Code-Bench; snippet only)
- https://arxiv.org/abs/2605.29170 (UA-Legal-Bench; snippet only)
- https://huggingface.co/blog/INSAIT-Institute/mamaylm (MamayLM; vendor claim; not fetched)

South Slavic
- https://arxiv.org/abs/2404.05428 (Language Models on a Diet; 2024-04-08; older)
- https://aclanthology.org/2026.loreslm-1.30.pdf (Serbian SuperGLUE; PDF unreadable)
- https://arxiv.org/abs/2603.01691 (GaMS3-12B; 2026-03; snippet only)
- https://huggingface.co/cjvt/GaMS3-12B-Instruct
- https://arxiv.org/abs/2510.21575 (SloPragEval; 2025-10; snippet)
- https://arxiv.org/abs/2412.10893 (BgGPT 1.0; snippet only)
- https://arxiv.org/abs/2306.02349 (bgGLUE; 2023; snippet only)

Slavic cross-cutting
- https://arxiv.org/abs/2608.24477 (Slavic MTEB dataset scarcity; 2026-08-25)
- https://arxiv.org/abs/2601.12164 (RU/UA prompt-language effect; 2026-01; snippet)
- http://ceur-ws.org/Vol-4283/paper106.pdf (ELOQUENT 2026; snippet)
- https://arxiv.org/abs/2610.03136 (German RAG reasoning language; adjacent; snippet)

Press pointers only (NOT evidence)
- https://scienceinpoland.pl/en/news/news,110407,polish-language-not-superior-ai-prompting-researchers-say.html (PAP quote from co-author)
- https://spidersweb.pl/2025/11/polski-jezyk-ai-microsoft-dementuje-oneruler.html (Microsoft clarification)
- https://www.notebookcheck.net/A-surprising-language-beats-English-and-Chinese-in-LLM-tests-based-on-new-academic-study.1168913.0.html
- https://www.polskieradio.pl/395/7789/Artykul/3599379,polish-outperforms-english-in-ai-longcontext-chatbot-tasks
- https://www.codesota.com/polish-llm (aggregator; not evidence)
