# WS3 Evidence Report: Retrieval (embeddings, rerankers) and RAG, Polish/Slavic vs English

Date of research: 2026-11-24. Scope: primary sources (arXiv, ACL Anthology, benchmark papers). Web pages, blogs and news were used only as pointers and are flagged.

## 1) Executive summary

1. No primary source found that compares Polish and English retrieval for the same models on the same translated task set with 2026 models. The closest like-for-like evidence is from 2023-2024 (BEIR-PL BM25).
2. Same-model Polish vs English numbers in 2026 (PolDense, arXiv 2609.12913, Table 2) compare different task sets (PIRB 41 tasks vs BEIR/RTEB 22 tasks). They must not be read as a language penalty. For several multilingual models the Polish set scores higher than the English set.
3. Lexical retrieval shows a clear Polish penalty on translated BEIR data: BM25 averages 35.67 (PL) vs 42.41 (EN) nDCG@10 over 11 datasets, a gap of -6.74 points (BEIR-PL, 2024, machine-translated, BM25 only).
4. Query-language effects are documented for Russian (the only Slavic language in the 2025-2026 query-language RAG studies): models cite English sources over Russian ones, a gap of -4.2 to -12.2 citation-accuracy points vs English (Linguistic Nepotism, arXiv 2509.13930v3, Table 13). Polish, Czech and Ukrainian were not tested in those studies.
5. Counter-evidence exists: DELTA (arXiv 2601.02956, 2026) argues the English preference is largely a byproduct of evidence distribution and benchmark structure, not an intrinsic model bias.
6. Mixed-language indices favour English documents in several 2026 preprints (arXiv 2604.05684, 2606.13537, 2604.20199). None of these include Polish or Czech; only Russian appears as a Slavic language.
7. Polish-specific RAG studies in 2026 (LREC 2026, EACL 2026) compare Polish LLMs or embedders with no English counterpart. They do not answer the Polish-vs-English question.
8. For the course question "does Polish prompt improve retrieval?": no evidence of a Polish advantage in retrieval was found. Evidence that English documents or English queries get a retrieval/citation advantage is real but mostly non-Slavic or Russian only.
9. Confidence for the overall conclusion is MEDIUM-LOW: the evidence is thin for Polish, Czech and Ukrainian and largely covers 2024-2025 models.
10. Recommended action for the team: run a small in-house A/B test (native PL query vs EN-translated query, PL vs EN documents) on their own corpus, rather than rely on published numbers.

## 2) Findings table

Columns: ID | Claim | Numbers (metric) | Language(s) | Model(s) | Dataset/task | Like-for-like? | Source URL | arXiv/DOI | Location in doc | Publication date | Source type & peer-review | Confidence

Model generation tags: "older" = generation before 2026-01.

### 2a) Embedding and retrieval benchmarks

| ID | Claim | Numbers (metric) | Language(s) | Model(s) | Dataset/task | Like-for-like? | Source URL | arXiv/DOI | Location in doc | Publication date | Source type & peer-review | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | PIRB: Polish dense retrieval scores of multilingual models (older generation) | multilingual-e5-large 57.29, base 53.12, small 50.65; avg nDCG@10 over 41 tasks. BM25 41.85, SPLADE++ 52.93 | PL | multilingual-e5 s/b/l (older, 2023-24); SPLADE++, BM25 | PIRB 41 tasks: 9 new Polish sets, PolEval-2022 (7), BEIR-PL (11, machine-translated), MAUPQA (12) | No English counterpart in paper | https://arxiv.org/abs/2402.13350 ; https://arxiv.org/html/2402.13350 | arXiv:2402.13350 (LREC-COLING 2024: ACL Anthology 2024.lrec-main.1117) | Table 2 | arXiv 2024-02-20 (v2 2024-03-10); LREC-COLING 2024 | Peer-reviewed (LREC-COLING 2024); older | HIGH (57.29 also seen in 2609.12913 Table 1) |
| F-02 | 2026 models on PIRB (41 tasks): Polish-trained models lead; Qwen3 scores lower than Polish-specific models | Qwen3-Emb-8B 60.93, 4B 59.19, 0.6B 50.71; BGE-M3 55.75 (Table 1) vs 55.98 (Table 2, conflict); jina-v3 57.33; jina-v5-text-small 57.19; pplx-embed-v1-4b 62.09; stella-pl-retrieval-8k 62.69; BGE-Multilingual-Gemma2 63.26; PolDense-1B 64.11 (avg nDCG@10) | PL | Qwen3-Embedding (2025), jina-v3 (older), jina-v5 (2026), pplx-embed-v1 (2026), stella-pl (2024), PolDense-1B (2026, authors' own model) | PIRB 41 tasks | Yes within PIRB (same tasks); no English on this table | https://arxiv.org/abs/2609.12913 | arXiv:2609.12913 (v2, 16 Sep 2026) | Table 1 (and Table 2 for BGE-M3 value) | 2026-09-16 (v2) | Preprint, not peer-reviewed in text; authors are PIRB/PL-MTEB authors (self-reported own model) | MEDIUM (single source for 2026 numbers; internal BGE-M3 mismatch 55.75 vs 55.98) |
| F-03 | Same models, Polish vs English task sets: raw PL and EN averages do not show a consistent language penalty | Qwen3-8B PL 60.93 / EN 65.56; Qwen3-4B 59.19 / 63.57; Qwen3-0.6B 50.71 / 56.99; BGE-M3 55.98 / 50.36; mE5-large 57.29 / 51.27; jina-v3 57.33 / 53.58; jina-v5-small 57.19 / 58.65; snowflake-arctic-l-v2 59.22 / 54.90; pplx-4b 62.09 / 62.31; EuroDense-435M 61.16 / 59.22 (nDCG@10) | PL (41 PIRB tasks) vs EN (22 BEIR+RTEB tasks) | Qwen3-Emb 0.6B/4B/8B, BGE-M3, mE5-L, jina v3/v5, pplx-embed, snowflake-L-v2, EuroDense | PL = PIRB 41; EN = 22 English BEIR/RTEB tasks | NO. Different task sets; cannot attribute gap to language | https://arxiv.org/html/2609.12913 | arXiv:2609.12913 | Table 2 | 2026-09-16 (v2) | Preprint | MEDIUM (table read via fetch; not cross-checked against a second source) |
| F-04 | PL-MTEB retrieval (11 tasks, 30 models): stella-pl and Qwen3-8B lead; Polish-only models near top | avg nDCG@10: stella-pl-retrieval-8k 61.59, stella-pl 60.82, mmlw-retrieval-roberta-large-v2 58.35, Qwen3-Emb-8B 59.21, BGE-Multilingual-Gemma2 58.93, Qwen3-4B 56.65, mE5-large 52.43, Qwen3-0.6B 48.59, mE5-base 47.63, mE5-small 46.00 | PL | as listed | PL-MTEB retrieval: ArguAna-PL, DBPedia-PLHardNeg, FiQA-PL, HotpotQA-PLHardNeg, MSMARCO-PLHardNeg, NFCorpus-PL, NQ-PLHardNeg, Quora-PLHardNeg, SCIDOCS-PL, SciFact-PL, TRECCOVID-PL (mostly translated English datasets) | Would be like-for-like with English BEIR per dataset, but paper reports no English numbers | https://arxiv.org/html/2405.10138 (v2 dated 24 Apr 2026); https://github.com/rafalposwiata/pl-mteb | arXiv:2405.10138 (ACL Findings 2026: 2026.findings-acl.1773, DOI not retrieved) | Table 7 (nDCG@10), Table 2 (avg) | arXiv v1 May 2024; v2 2026-04-24; ACL Findings 2026 | Preprint (v2); ACL Findings 2026 peer-reviewed version not checked numerically | MEDIUM (table read via fetch; numbers may differ in the ACL version) |
| F-05 | BEIR-PL: machine translation to Polish lowers BM25 nDCG@10 on every shared dataset (authors attribute part to Polish inflection) | EN avg 42.41 vs PL 35.67, delta -6.74 over 11 datasets. Per dataset: NQ 32.6 vs 20.1 (-12.5); HotpotQA 60.2 vs 49.2 (-11.0); DBPedia 32.1 vs 22.9 (-9.2); TREC-COVID 68.9 vs 61.0 (-7.9); FiQA 25.4 vs 19.0 (-6.4); MSMARCO 47.7 vs 41.9 (-5.8); SciFact 69.1 vs 62.5 (-6.6); NFCorpus 34.3 vs 31.9 (-2.4); SciDocs 16.5 vs 14.1 (-2.4) | PL (machine translated) vs EN (original BEIR) | BM25 only | BEIR / BEIR-PL (11 tasks) | Yes for BM25 on same task structure, but PL corpora are Google-Translate outputs, so translation noise is confounded with language | https://arxiv.org/html/2305.19840v2 | arXiv:2305.19840 (v2 16 May 2024) | Table 3 (EN), Table 4 (PL), Table 1 (sizes) | v1 2023-05; v2 2024-05-16 | Preprint (venue not verified) ; older | MEDIUM (one source; BM25 is reproducible) |
| F-06 | BEIR-PL dense models: no English numbers for same models in paper | n/a | PL | LaBSE, mMiniLM, HerBERT, T5, ColBERT (older) | BEIR-PL | No | https://arxiv.org/html/2305.19840v2 | arXiv:2305.19840 | Table 4 | 2024-05-16 | Preprint; older | MEDIUM (negative finding) |
| F-07 | Qwen3-Embedding on English vs multilingual benchmarks (vendor tech report) | Retrieval: MTEB(eng,v2) 0.6B 61.83 / 4B 68.46 / 8B 69.44; MMTEB 0.6B 64.64 / 4B 69.60 / 8B 70.88 | EN; multilingual (no per-language split) | Qwen3-Embedding 0.6B/4B/8B (2025) | MTEB(eng,v2), MMTEB retrieval averages | Not for Polish; different task sets | https://arxiv.org/abs/2506.05176 | arXiv:2506.05176 | Table 7 (eng), Table 2 (MMTEB) | 2025-06-05 (rev 2025-06-11) | Tech report (vendor); older | MEDIUM (single source; no per-language values) |
| F-08 | MMTEB: retrieval averages for 12 models on MTEB(Europe) and MTEB(Multilingual); multilingual-e5-large-instruct ranks top overall in MTEB(Multilingual) | mE5-L-instruct 54.8 (Europe) / 57.1 (Multilingual); GritLM-7B 57.1 / 58.3; e5-mistral-7b 53.6 / 55.8; mE5-large 50.8 / 54.1 | Multilingual / European (no Polish breakdown in text read) | GritLM-7B, mE5-L-instruct, e5-mistral, mE5-large (2024-25) | MTEB(Europe), MTEB(Multilingual) retrieval averages | Not Polish-specific | https://arxiv.org/html/2502.13595v3 ; https://arxiv.org/abs/2502.13595 | arXiv:2502.13595 (ICLR 2025) | Section 3.3, Table 2 | arXiv v1 2025-02-19; ICLR 2025 | Peer-reviewed (ICLR 2025); older | MEDIUM |
| F-09 | Gemini Embedding 2 (2026): aggregate MTEB(Multilingual) and retrieval means; no Polish retrieval breakdown | MTEB(Multilingual) task mean 69.9 (prev. Gemini Embedding 68.4); retrieval mean 70.0 (prev. 64.0, values inferred from Table 2 footnote mapping); Polish PolEmo2.0-OUT classification 77.00; Belebele/MLQA/Wikipedia retrieval aggregates only | PL, CS, RU, EN appear only as single tasks | Gemini Embedding 2 (2026-05) | MTEB(Multilingual) Table 7 | Not like-for-like for Polish | https://arxiv.org/html/2605.27295 ; https://arxiv.org/pdf/2605.27295 | arXiv:2605.27295 (submitted 2026-05-26) | Table 2, Table 7 | 2026-05-26 | Tech report (vendor claim) | MEDIUM for aggregates; LOW for inferred retrieval mapping. Secondary RITS article quoting 68.32 "English" figure is NOT used (conflicts with primary) |
| F-10 | Slavic MTEB coverage is sparse; models named as transferable across Slavic tasks | No numbers seen (abstract only) | Slavic (languages not confirmed on abstract page) | llama-embed-nemotron-8b, multilingual-e5-large-instruct, Qwen3-Embedding variants | MTEB Slavic subset | n/a | https://arxiv.org/abs/2608.24477 | arXiv:2608.24477 (submitted 2026-08-25) | Abstract | 2026-08-25 | Preprint | LOW (abstract only; UNVERIFIED-SECONDARY for detail) |
| F-11 | Aggregated MTEB retrieval rankings are unreliable per language; language-balanced aggregation reduces rank inversions | Median pairwise inversion 33% (curated roster of 25 models); language-balanced aggregator 33% -> 14.5%; per-language Kendall tau reliable after FDR in 11/17 languages | 17 languages (Polish not mentioned on fetched page; Slavic not confirmed) | curated 25-model roster; granite-311m and harrier-0.6b flagged | MTEB(Multilingual) retrieval | n/a (method paper) | https://aclanthology.org/2026.aacl-short.28/ | DOI 10.18653/2026.aacl-short.28 (as shown on page) | Abstract/Results (page level) | 2026-11 (AACL-IJCNLP 2026) | Peer-reviewed short paper (AACL 2026) | MEDIUM (page-level read; no Polish numbers) |
| F-12 | Ukrainian retrieval in 2026 shared task: Qwen3-Embedding-8B best among embedders tested | Public 0.9426 / private 0.9592 (task score); Qwen3-0.6B 0.9370/0.9507; pplx-embed-v1-4b 0.8737/0.8759; reranker raises Recall@1 0.6957 -> 0.7935 | UK (no English) | Qwen3-Embedding 0.6B/8B, Qwen3-Reranker-8B, pplx-embed-v1-4b (2026) | UNLP 2026 shared task (Kaggle, Ukrainian MCQ over PDFs) | No English comparison | https://arxiv.org/html/2605.10296 | arXiv:2605.10296 (2026-05-11) | Sec 5.3, Table 2 | 2026-05-11 | System description for a shared task; peer review status unclear | MEDIUM-LOW (competition-specific metric) |
| F-13 | Russian ruMTEB and RusBEIR exist as Russian-native benchmarks; numbers not extracted | not extracted | RU | ru-en-RoSBERTa and others | ruMTEB (23 tasks, 17 new); RusBEIR (17 datasets) | n/a | https://arxiv.org/abs/2408.12503 ; https://arxiv.org/abs/2504.12879 | arXiv:2408.12503 (NAACL 2025, DOI 10.18653/v1/2025.naacl-long.12); arXiv:2504.12879 | Abstract | 2024-08-22 ; 2025-04 | Peer-reviewed (NAACL 2025) / preprint | UNVERIFIED-SECONDARY (search snippets only) |
| F-14 | Qualitative: Russian BM25 is the strongest lexical baseline in a 2026 compact-embedding study | mean RuMTEB 51.16 (StaRSE), BM25 strongest lexical baseline | RU | StaRSE static embeddings | RuMTEB v1.1 | n/a | https://arxiv.org/pdf/2611.14236 | arXiv:2611.14236 (2026-11) | snippet only | 2026-11 | Preprint | UNVERIFIED-SECONDARY |

### 2b) RAG and query-language effects

| ID | Claim | Numbers (metric) | Language(s) | Model(s) | Dataset/task | Like-for-like? | Source URL | arXiv/DOI | Location in doc | Publication date | Source type & peer-review | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-15 | Russian queries: models cite English sources more often than Russian ones (English-preference gap, citation accuracy); the gap is larger for weaker models; significant for most models | Russian minus English citation accuracy (d not-c = en): LLaMA-3.1-8B -5.3; LLaMA-3.3-70B -11.4; Qwen3-8B -12.2; Qwen3-14B -8.2; Gemma3-27B -9.1; Aya23-8B -11.9. Second setting (d not-c = ru): -4.2, -7.4, -8.0, -4.7, -6.8, -8.3 | RU vs EN (other 7 languages: AR, BN, ES, FR, KO, SW, ZH) | LLaMA-3.1-8B, LLaMA-3.3-70B, Qwen-3-8B, Qwen-3-14B, Gemma-3-27B, Aya23-8B (2025-26 open models) | ELI5 / WebGPT 270-query subset (translated queries and documents), citation accuracy | Partially: ELI5 translated into each language; not Polish | https://arxiv.org/abs/2509.13930 ; https://arxiv.org/html/2509.13930v3 | arXiv:2509.13930 (v1 2025-09-17; v3 2026-06-07) | Appendix D.6-D.7 and Table 13 (Russian rows); Table 1 (main languages) | v1 2025-09-17; v3 2026-06-07 | Preprint (venue not verified) | MEDIUM (Table 13 read via fetch; not cross-checked) |
| F-16 | Linguistic Nepotism: the English preference is biggest for mid-context documents and low-resource languages; models sometimes prefer irrelevant English docs over relevant non-English docs | Swahili -23.9 avg, Bengali -18.0, Spanish -8.1, French -8.8 (avg over 6 models; Table 1 in §5.1); position effect in Fig. 2 | AR, BN, ES, FR, KO, RU, SW, ZH (EN reference) | as F-15 | ELI5 | Not Slavic except RU | https://arxiv.org/html/2509.13930v3 | arXiv:2509.13930 | §5.1 Table 1, Fig. 2, §7 Fig. 5 | 2025-09-17 (v1) | Preprint | MEDIUM |
| F-17 | Russian MIRACL (retrieval-QA): English-document vs Russian-document citation gap | Table 18 values: gaps -12.8 to -21.1 pts; the text in the same table is internally inconsistent (one row "not shown exactly") | RU | as F-15 | MIRACL English dev subset (231 queries) | Partial | https://arxiv.org/html/2509.13930v3 | arXiv:2509.13930 | Appendix K, Table 18 and 20 | 2025-09-17 | Preprint | LOW (internal inconsistency) |
| F-18 | Query-language effect in the DELTA paper: native-language retrieval is worse than English-pivot retrieval in average end-to-end quality; the English-preference effect is argued to be an artefact of evidence distribution | Recall@50 (BGE-M3, native vs English pivot): Arabic 13.36 -> 23.57; Chinese 16.47 -> 26.53; Korean 15.62 -> 24.81. End-to-end avg (3-gram recall): MultiRAG native vs English translation: Qwen3-235B 51.30 vs 58.81; Gemini-2.5-Flash 43.80 vs 52.75; DeepSeek-v3.1 45.46 vs 55.26. DELTA avg Qwen3 62.88 | AR, ZH, KO, ES, JA, DE, TH, EN (MKQA). Polish and Czech NOT included; Russian only as query language in MKQA split tables | BGE-M3, Qwen3-235B, DeepSeek-v3.1, Gemini-2.5-Flash | MKQA (~10k queries; 2,827 subset overlapping KILT NQ), Wikipedia by language | No Slavic data | https://arxiv.org/abs/2601.02956 ; https://arxiv.org/html/2601.02956v3 | arXiv:2601.02956 (v1 2026-01-06; v3 2026-04-13); ACL 2026 Findings per comments | Table 1, Table 4, Table 5 | 2026-01-06 | Preprint (venue claim unverified) | MEDIUM (strong for non-Slavic; no Slavic) |
| F-19 | DELTA: retrievers favour monolingual query-document alignment; English preference explained mostly by evidence distribution and benchmark structure (exposure bias, gold prior, topic locality) | Metric DeLP replaces MLRS; correlation of bge-m3 preference with exposure prior drops 0.994 (MLRS) -> 0.142 (DeLP) (Table 4) | Non-Slavic | BGE-M3, paraphrase-multilingual MiniLM/mpnet | MKQA | No Slavic | https://arxiv.org/html/2601.02956v3 | arXiv:2601.02956 | §3.2, Table 4 | 2026-01-06 | Preprint | MEDIUM (direct conflict with F-16 interpretation; see §3) |
| F-20 | Reranking language bias in multilingual RAG: rerankers concentrate candidates in English and the query language; LAURA reduces it and improves NDCG@5 | Candidates from English + query language: "around 60%" (§2.3.1) vs "more than 70%" (Intro), CONFLICT. LAURA NDCG@5 for BGE 0.467 -> 0.553; Qwen3 0.370 -> 0.521 (Table 3) | 13 languages: AR, DE, EN, ES, FI, FR, IT, JA, KO, PT, RU, TH, ZH (RU only Slavic); no PL/CS | BGE-M3, BGE-Reranker-V2-M3, Qwen3-Reranker-0.6B; generators Qwen2.5-7B, Llama-3.1-8B | MKQA 2.7K subset, Wikipedia per language | No Polish | https://arxiv.org/html/2604.20199v1 ; https://arxiv.org/abs/2604.20199 | arXiv:2604.20199 (2026-04-22; ACL 2026 main per abstract page) | §2.3.1, Intro, Table 1, Table 3, Table 4 | 2026-04-22 | Preprint (ACL 2026 main per abstract page; not verified in proceedings) | MEDIUM for direction; LOW for exact percentages (internal conflict) |
| F-21 | Mixed English + query-language corpora: multilingual embedders often rank unrelated English docs above the same-language relevant doc; English is the strongest partner language | Max@R and Complete@10 values (authors' own metric; Max@R values exceed 100, so not interpretable without definition): e.g., mE5-base XQuAD Chinese queries Max@R 650.95 vs English queries 53.04; Belebele Chinese Complete@10 3.11 -> 82.44 after fine-tuning | ZH, AR, ES, TH, VI, EN, others (no Slavic in main text) | multilingual-E5-base, gte-multilingual-base, jina-v3, bge-m3 (fine-tuned variants) | XQuAD, Belebele (parallel, human-translated) | Parallel data, but no Slavic | https://arxiv.org/html/2604.05684 | arXiv:2604.05684 (2026-04-07) | §3.1, Table 1, Fig. 2b, §5.2 | 2026-04-07 | Preprint | LOW-MEDIUM (metric unusual; qualitative pattern is the useful part) |
| F-22 | Mixed query-language and English-index effect holds across model families and Qwen3 0.6B/4B/8B; without English documents, mixing helps (mean delta +0.95), with English documents the mean is -0.04 | nDCG@10 mean delta +0.70 across 105 settings; English-inclusive settings mean -0.04 (§4.3); typology Spearman -0.405 | 35 language pairs incl. RU (only Slavic); mMARCO 14 languages | BGE-M3 (main); mE5-L-instruct, gte-mult-base, jina-v3, Qwen3-Emb 0.6/4B/8B (ablation) | mMARCO (8.8M corpus), 1,484 queries | No Polish or Czech | https://arxiv.org/html/2606.13537 | arXiv:2606.13537 (2026-06-11) | §4.2-4.5, Table 1-2 | 2026-06-11 | Preprint | MEDIUM (truncated read; Tables 9-12 not checked) |
| F-23 | Document translation into English for dense retrieval is mixed (helps some, hurts others); query translation not tested | mE5 CLIRMatrix Recall@100 48.3 -> 19.5 when docs translated; mMARCO 77.5 -> 94.7; Nomic mMARCO 88.6 -> 92.2 and CLIRMatrix 82.6 -> 84.7 | 27 languages list incl. CS, PL, RU, UK; per-Polish breakdown not extracted | Nomic-embed-text-v2-moe, multilingual-E5, XLM-R, LaBSE | CLIRMatrix, mMARCO, Large-Scale | Not Polish-specific | https://arxiv.org/html/2511.19324v1 | arXiv:2511.19324 (2025-11-24; preprint, no venue stated) | Sec 4.2, Table 3, Table 5 | 2025-11-24 | Preprint | MEDIUM-LOW for Polish relevance |
| F-24 | Czech native vs machine-translated-to-English retrieval: the paper studies it, but the outcome was NOT extracted | not extracted (abstract says comparison made, outcome not stated on abstract page) | CS | SPLADE, PLAID, PLAID-X, SimCSE, Contriever, OpenAI ADA, Gemma2 | DaReCzech (Czech retrieval) | Would be like-for-like only if parallel data is used | https://arxiv.org/abs/2411.12921 | arXiv:2411.12921 (2024-11-19; v2 2024-12-20) | Abstract only; body not read | 2024-11-19 | Preprint; older | UNVERIFIED-SECONDARY (abstract only) |
| F-25 | Czech retrieval in a 2026 multimodal-RAG benchmark: BM25 is strong on Czech; no English comparison | Czech BM25* Top-1 68.59, Top-5 93.27 (authors' tuned BM25; selection on eval data; caveat) | CS (15 languages incl. CS, SL, HR; no PL, no EN) | BM25, ColQwen2-v0.1, others | VisR-Bench | Not parallel per paper | https://arxiv.org/html/2603.04238 | arXiv:2603.04238 (2026-03-04) | Table 1, Table 2 | 2026-03-04 | Preprint | LOW for cross-language use |
| F-26 | Polish RAG end-to-end (2026): the embedder best for Polish vector retrieval is KartonBERT-USE-base-v1 (abstract); generator Bielik-11B-v2.3-Instruct beats PLLuM-12B-nc-chat | No numbers on abstract page | PL only | KartonBERT-USE-base-v1; Bielik-11B-v2.3; PLLuM-12B-nc-chat | Polish RAG on technical domain (dataset not extracted) | No English | https://aclanthology.org/2026.lrec-1.211/ | DOI not retrieved; ACL Anthology 2026.lrec-1.211 | Abstract | 2026-05 (LREC 2026, Palma) | Peer-reviewed (LREC 2026) | LOW (abstract only) |
| F-27 | Polish RAG efficiency study: PLLuM-12 close to 70B quality with 83% less energy; quality saturates beyond 12B | Bradley-Terry quality ranking; 1,000 PolQA questions; GPT-4o judge; energy on H100 | PL only | PLLuM-12, Bielik, models 4B-70B | Polish Wikipedia RAG, PolQA | No English | https://aclanthology.org/2026.eacl-srw.55 | DOI 10.18653/v1/2026.eacl-srw.55 | Abstract-level page | 2026-03 (EACL 2026 SRW) | Peer-reviewed student workshop | MEDIUM (abstract-level quotes; no tables read) |

### 2c) Claims checked but not Slavic-specific (for context)

| ID | Claim | Source | Note |
|---|---|---|---|
| F-28 | Mixed-language query embeddings (2606.13537) and English-document effects are non-Slavic in main experiments | see F-22 | Not applicable to Polish |
| F-29 | MIRAGE-Bench language list includes Russian and not Polish | https://arxiv.org/pdf/2410.13716 (snippet) | Polish not evaluated |
| F-30 | NoMIRACL (18 languages) includes Russian per snippet; no per-language numbers extracted | https://arxiv.org/pdf/2312.11361 | Pointer only |

## 3) Does retrieval/RAG quality differ for Polish/Slavic vs English, and why?

### Evidence that a difference exists

- Lexical retrieval is weaker in Polish. On translated BEIR, BM25 loses 6.74 nDCG@10 points on average (F-05). The authors attribute part of this to Polish inflection. Confound: the Polish corpora are machine-translated, so translation noise is part of the gap. Treat this as an upper bound on the language penalty for lexical methods.
- Query-language preference in RAG is measurable for Russian: citation accuracy is 4-12 points below English across six open models (F-15). The effect is largest for models that also show weaker English-to-other transfer. Russian was the only Slavic language tested.
- Mixed English/native corpora tend to be dominated by English documents for several multilingual embedders (F-21, F-22). The non-Slavic evidence is consistent, and Russian is in the 2606.13537 set but Polish/Czech are absent.
- Reranking shows the same direction: LLM and cross-encoder rerankers pull candidates toward English and the query language (F-20).

### Evidence against or qualifying a "Polish is worse" reading

- Same-model comparisons on the PIRB/PolDense setup show Polish scores are often higher than English scores for multilingual models (F-03). However, the task sets differ, so this shows task difficulty and in-domain training data dominate, not that Polish is easier.
- DELTA (F-19) argues that the English-preference finding is largely an artefact of how benchmarks distribute evidence, and that retrievers mainly favour same-language query-document pairs. This conflicts with the Linguistic Nepotism reading (F-16) and needs to be treated as an open question.
- Polish-specialised embedders (stella-pl, PolDense) outperform the general multilingual models on PIRB, including 2026 models (F-02). The gain comes from Polish training data and distillation, not from an intrinsic property of Polish as a query language.
- Document translation to English is not a general improvement for dense retrieval (F-23), and DELTA reports that English pivoting is beaten by its own method. There is no evidence that translating a Polish query to English yields better retrieval in general.

### Why a difference may appear (hypotheses, with the evidence cited)

1. Training-data imbalance: multilingual embedders learn more English pairs, so English documents win ties in mixed pools (F-21, F-22).
2. Evidence distribution in benchmarks: English-heavy gold sets create apparent English preference (F-19).
3. Morphology: Polish inflection lowers lexical overlap (F-05, author explanation).
4. Translation noise: machine-translated benchmarks mix language effects with translation quality (F-05, F-06).
5. Task-set choice: cross-language averages mix different datasets, so raw comparisons mislead (F-03, F-04).

### What is NOT established

- No 2026 source compares Polish and English retrieval for the same model on the same translated task set.
- No primary Polish-specific RAG study compares native Polish queries with English-translated queries.
- No primary source shows a Polish prompt improves reasoning or retrieval relative to English (this workstream does not cover reasoning).
- The "Polish beats English" claim from the 25 Oct 2025 article is not supported by any WS3 source for retrieval. Its OneRuler basis belongs to another workstream.

## 4) Items NOT found and search log

### Items not found (requested but not located with primary numbers)

- PIRB leaderboard (Hugging Face Space sdadas/pirb) live entries for Gemini embedding, OpenAI text-embedding-3 or voyage/cohere. Not reached via fetch.
- PL-MTEB live leaderboard on Hugging Face (huggingface.co/PL-MTEB) and pl-mteb GitHub results files: not fetched.
- MTEB results repository per-language JSON for multilingual-e5-large and Qwen3 (English FiQA/NFCorpus/SciFact for the same models): GitHub API listings did not expose the English dataset files at the revision paths tried (404 on raw file). So same-model English per-dataset numbers for 2026 models were NOT obtained.
- Polish/Czech/Russian-specific query-translation vs native-query RAG study: not found (only DELTA and Linguistic Nepotism, neither Polish or Czech).
- MIRACL-ru, mMARCO-pl, NoMIRACL-ru and MIRAGE-Bench per-language numbers: not retrieved.
- Belebele Polish retrieval-QA numbers: not retrieved.
- DaReCzech native vs translate-to-English outcome: abstract only (F-24).
- OpenAI text-embedding-3 or voyage/cohere per-language Polish/Czech numbers in 2026: not found.
- Polish 2026 end-to-end RAG numbers with English counterpart: not found.
- Slovak, Serbian, Croatian, Bulgarian native-language RAG and retrieval studies: NOT searched natively (see log). Incidental: a Slovak IR benchmark SKQuad was mentioned in a snippet, not verified.
- ML-Embed-8B (arXiv 2605.15081, May 2026): search snippet only; claims Polish under-served; not fetched.

### Search log (iteration count and usefulness)

Retry rule: at least 5 differently phrased queries before concluding none exist. Met for Polish (queries 1, 2, 4, 5, 6, 7, 13, 17), Czech (8), Russian (9), Ukrainian (10), and English on query-language RAG (3, 11, 12, 14, 15).

| # | Query / URL | Lang | Useful? |
|---|---|---|---|
| 1 | PIRB Polish Information Retrieval Benchmark Dadas arXiv | EN | Yes: found PIRB 2402.13350 |
| 2 | MMTEB massive multilingual text embedding benchmark arXiv 2025 Polish | EN | Yes: MMTEB 2502.13595; PL-MTEB 2405.10138 |
| 3 | multilingual RAG language preference bias query language English documents arXiv 2025 | EN | Yes: Linguistic Nepotism, DELTA, Park & Lee 2502.11175 (not fetched) |
| 4 | PL-MTEB Polish text embedding benchmark stella-pl mmlw | EN | Yes: PL-MTEB Table 7 |
| 5 | 2026 multilingual embedding model MTEB Polish retrieval results new release | EN | Partial: AACL 2026 audit; ML-Embed snippet |
| 6 | wyszukiwanie informacji język polski benchmark RAG ewaluacja modele embeddingowe | PL | Yes: BEIR-PL, PIRB, IRSC pointer |
| 7 | Polish RAG benchmark evaluation PLLuM ... arXiv 2026 | EN | Yes: LREC 2026 (F-26), EACL 2026 (F-27) |
| 8 | vyhledávání informací čeština benchmark embedding modely RAG arXiv | CS | Yes: DaReCzech 2411.12921; 2603.04238; Czech Qwen3-4B pointer (blog, not used) |
| 9 | поиск информации русский язык бенчмарк эмбеддинги RAG ruMTEB arXiv 2026 | RU | Partial: ruMTEB 2408.12503; RusBEIR; StaRSE snippet |
| 10 | RAG українська мова оцінка багатомовний ретрівер benchmark Ukrainian | UK | Yes: 2605.10296 (F-12); DOU blog (secondary, not used) |
| 11 | cross-lingual retrieval translate query to English vs native ... Slavic 2026 | EN | Yes: 2511.19324 (F-23) |
| 12 | multilingual retrievers prefer unrelated English documents ... April 2026 | EN | Yes: 2604.05684 (F-21); 2606.13537 (F-22) |
| 13 | PIRB leaderboard Polish retrieval 2026 ... gemini-embedding | EN | Yes: 2609.12913 (F-02, F-03). Gemini on PIRB: not found |
| 14 | Slavic languages RAG evaluation Polish Czech Russian ... 2026 | EN | Yes: 2608.24477 (F-10, abstract only) |
| 15 | NoMIRACL MIRAGE-Bench multilingual RAG Russian Polish | EN | Partial (F-29, F-30) |
| 16 | Gemini embedding 2 or OpenAI ... 2026 technical report | EN | Yes: 2605.27295 (F-09). OpenAI 2026: not found |
| 17 | Polish rerankers PIRB evaluation paper 2026 | EN | Partial: 2402.14318 (2024, older; not tabled) |

Additional search iterations were run via fetches of 2609.12913 (x3), 2605.27295, 2604.05684 and others; roughly 17 WebSearch queries and about 25 WebFetch calls in total. Native-language queries used: Polish, Czech, Russian, Ukrainian. Not used: Slovak, Serbian, Croatian, Bulgarian (gap).

Failed fetches: raw GitHub results file for FiQA2018 (404); GitHub API listing of Qwen3-Embedding-8B result folder returned only a single subdirectory without files.

## 5) Primary-source URL list

- https://arxiv.org/abs/2402.13350 (PIRB; LREC-COLING 2024, https://aclanthology.org/2024.lrec-main.1117)
- https://arxiv.org/html/2402.13350 (PIRB HTML)
- https://arxiv.org/abs/2609.12913 (PolDense / Parameter-Efficient Retrievers, v2 2026-09-16)
- https://arxiv.org/html/2609.12913
- https://arxiv.org/html/2405.10138 (PL-MTEB, v2 2026-04-24); https://github.com/rafalposwiata/pl-mteb
- https://arxiv.org/html/2305.19840v2 (BEIR-PL)
- https://arxiv.org/abs/2502.13595 (MMTEB; ICLR 2025); https://arxiv.org/html/2502.13595v3
- https://arxiv.org/abs/2506.05176 (Qwen3 Embedding)
- https://arxiv.org/abs/2605.27295 (Gemini Embedding 2)
- https://arxiv.org/html/2608.24477 (Slavic MTEB sparsity, abstract)
- https://aclanthology.org/2026.aacl-short.28/ (AACL 2026, aggregated MTEB audit)
- https://arxiv.org/abs/2509.13930 ; https://arxiv.org/html/2509.13930v3 (Linguistic Nepotism)
- https://arxiv.org/abs/2601.02956 ; https://arxiv.org/html/2601.02956v3 (DELTA)
- https://arxiv.org/abs/2604.20199 ; https://arxiv.org/html/2604.20199v1 (All Languages Matter)
- https://arxiv.org/abs/2604.05684 (mixed English/query-language pool)
- https://arxiv.org/html/2606.13537 (mixing query embeddings)
- https://arxiv.org/html/2511.19324v1 (What Drives Cross-lingual Ranking)
- https://arxiv.org/abs/2411.12921 (DaReCzech; abstract only)
- https://arxiv.org/html/2603.04238 (Retrieval or Representation?)
- https://arxiv.org/html/2605.10296 (Ukrainian UNLP 2026 system)
- https://aclanthology.org/2026.lrec-1.211/ (Bartanowicz & Jassem, abstract)
- https://aclanthology.org/2026.eacl-srw.55 (Smits & Walkowiak, abstract-level)
- https://arxiv.org/abs/2408.12503 (ruMTEB; NAACL 2025) ; https://arxiv.org/abs/2504.12879 (RusBEIR)
- https://arxiv.org/abs/2402.14318 (reranking generalization in Polish; 2024, older)
- https://arxiv.org/pdf/2312.11361 (NoMIRACL)
- https://arxiv.org/pdf/2410.13716 (MIRAGE-Bench)

Pointer-only, not used for numbers: https://www.alphaxiv.org/abs/2605.15081.md (ML-Embed); https://arxiv.org/pdf/2611.14236 (StaRSE); https://dou.ua/goto/5aON (Ukrainian secondary blog); RITS NYU Shanghai article on Gemini Embedding 2 (secondary, conflicting 68.32 figure).

Source types: peer-reviewed = PIRB (LREC-COLING 2024), MMTEB (ICLR 2025), ruMTEB (NAACL 2025), AACL 2026 audit, LREC 2026, EACL 2026 SRW. Tech reports = Qwen3-Embedding, Gemini Embedding 2. Preprints = everything else. Community leaderboard: not reached.
