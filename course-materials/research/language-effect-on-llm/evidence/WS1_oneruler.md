# WS1 - OneRuler audit (arXiv:2503.01996) and follow-ups

Research date: 2026-11-24. Method: WebFetch/WebSearch only. Important limitation: the arXiv PDF (v1/v3) exceeded the tool's 10 MB limit, so every paper claim below was read through an HTML page or a summarising fetch, not from the PDF's own text layer. Per-language accuracy values exist only in figures, which I could not read. Quotes are paraphrased; figure numbers differ between fetches (see caveats).

## 0) Update v2 (2026-11-24, coordinator feedback) - supersedes earlier items where they conflict

**A. Per-language values (what is and is not verifiable)**
- Per-language accuracy is shown ONLY as a bar chart. Its title is "OneRuler accuracy per language for 64k & 128k" (legend: English / High-resource / Low-resource). The chart is the image at https://cryps.pl/wp-content/uploads/2025/10/oneruler_wykres.jpeg (pointer; its provenance is not stated). The paper's corresponding figure is Fig. 4(b) in the v2/v3 text (Sec. 3.1, "Performance by language"). I could not confirm from the paper that the image is that figure, and the arXiv HTML carries no printed values (only "Refer to caption" alt text; checked in v3 HTML).
- Visual reading of the bars, +/-1-2 points, LOW-MEDIUM confidence, pooled 64K+128K average across models: pl ~88, ru ~86, fr ~86, it ~85, es ~84.5, en ~84, uk ~83, sv ~83, pt ~82, de ~80.5, no ~80, nl ~77.5, hu ~77, da ~77, ja ~76, cs ~73.5, vi ~73, fi ~72.5, fa ~71.5, sr ~71, hi ~66, ko ~65, zh ~62.5, sw ~61, ta ~54.5, st ~44. Anchors match printed text (pl 88, en 83.9 rank 6, zh 62.1 rank 4th worst), which supports the reading. Each bar has an error bar (its meaning is not in the text).
- Czech ~73.5 and Serbian ~71 are therefore visual only; Russian ~86 (2nd) is visual, and a search snippet (secondary, MEDIUM-LOW) also gives "Russian 86%" and "Ukrainian 83%" for the top-10 list.
- Per-language values by context length (8K/32K/64K/128K) are NOT available from any text I could read. HF paper page (https://huggingface.co/papers/2503.01996) gives per-language micro-accuracy at 128K for six models (Figure 3, "selected rows": e.g. pl o3-mini 92, en o3-mini 67, pl Qwen2.5-72B 96, en Qwen2.5-72B 94, pl Gemini-1.5-Flash 98, en Gemini 99). These values come from a summariser that cannot see heatmap pixels and are NOT in the arXiv text; treat as UNVERIFIED-SECONDARY. The o3-mini values for pl (92) and en (67) do match the printed text.
- Model list confirmed (HF summary of Table 5, MEDIUM): Gemini 1.5 Flash (1M ctx), o3-mini-high (o3-mini-2025-01-31), DeepSeek-R1 (685B per table; 671B elsewhere), Llama 3.3 70B, Llama 3.1 8B (text says 7B - internal inconsistency), Qwen2.5 72B and 7B.
- Figure inventory (arXiv HTML v3 captions, HIGH for existence): Fig. 1(a) top/bottom-5 languages by Wikipedia size, S-NIAH; Fig. 1(b) nonexistent needle, o3-mini-high, English; Fig. 3 heatmap micro-accuracy by language x context for all NIAH; Fig. 4(a) by model, 4(b) by language; Fig. 5 per-task; Fig. 6(a) cross-lingual En/Ko/Pl; Fig. 7 Wikipedia size; Fig. 8 language family; Figs. 17-21 appendix error/token analyses; Figs. 22-25 not in the captured text.

**B. Books confound (PRIMARY, HIGH)**
- arXiv v3 HTML, Sec. 2.1 and Appendix A, Table 4: the authors use 26 open-domain non-copyrighted books, one per language (not translations of one text). Example titles: Little Women (en), Don Quixote (es), Der Zauberberg (de), Call to Arms (zh). Shorter books are padded by repetition. Table 4 token counts range from 12,279 (ko) to 1,112,514 (ru).
- Press (secondary, MEDIUM): PAP/Science in Poland quotes co-author Marzena Karpinska that the Polish result may reflect the book choice (Polish book = Nights and Days vol. 3, per notesfrompoland/PAP). URL: https://scienceinpoland.pl/en/news/news,110407,polish-language-not-superior-ai-prompting-researchers-say.html (article dated 2025-11-27 per page; CoLM "in October"). The same article quotes her: "It is not true. We have not researched this at all." and "we certainly cannot conclude on its basis that Polish is the best language for +prompting+". Treat as pointer; the primary fact is the book design in Table 4.

**C. Significance (PRIMARY check, HIGH for absence)**
- Fetching v3 HTML found NO significance test, confidence interval or p-value for language differences (Sec. 3.1, Sec. 4). The only p-value (p<0.001, footnote 9) concerns agreement of model rankings across two tokenisation settings (Kendall tau 0.82). The press statement "Polish vs English not statistically significant" (scienceinpoland, secondary) is therefore NOT supported by the paper's text; it is a co-author/press statement with no published test. Flag as a gap.
- Stated purpose (Abstract, Sec. 1, Conclusion): a diagnostic/"proxy" tool to spur multilingual long-context training; the paper does NOT recommend a prompting language; Sec. 4 calls its cross-lingual study a "starting point".

**D. o3-mini-high "none" effect - location of evidence (verified)**
- Abstract (arXiv v1-v3 abstract page): many LLMs, especially o3-mini-high, incorrectly predict that no answer exists even in high-resource languages.
- Sec. 1 and Fig. 1(b) caption: impact of a nonexistent needle on S-NIAH, shown for o3-mini-high in English.
- Sec. 3.1: o3-mini-high "achieves only 67% accuracy on English at 128K, compared to 92% on Polish and 89% on Ukrainian" (single-model figures).
- Sec. 4: the "none" option reduces S-NIAH accuracy by 32% at 128K (English). Figs. 18-19 (App. C.1): counts of incorrect "none" answers by language and model.
- Inference (MEDIUM, not stated by the paper): the headline 88%/83.9% averages are over "NIAH tasks", which the paper defines as five variants including None-NIAH, so the averages probably include the none-option behaviour. The paper does not separate them per language.

**E. Follow-up papers - tables read (not abstracts)**
- arXiv 2609.35378 (Multilinguality in Hybrid Attention LLMs, Bandarkar et al., v1 2026-09-28). Sec. 4 Table 2 read in two independent fetches (they agree): OneRuler-style NIAH, English vs "Non-Eng (10 langs)" averages. Models: Qwen3-30B-A3B, Qwen3.5-35B-A3B, Granite-4.0-Micro, Granite-4.0-H-Micro. Values (8K/32K/64K, Eng / non-Eng): Qwen3-30B-A3B 99.2/98.2, 98.0/95.3, 97.6/92.0; Qwen3.5-35B-A3B 100.0/96.9, 100.0/95.6, 99.6/93.8; Granite-4.0-Micro 80.4/71.2, 65.6/47.9, 47.2/38.1; Granite-4.0-H-Micro 75.2/52.1, 68.0/39.5, 61.6/34.9. Named non-English languages: Yoruba (tokenisation), Sesotho (lowest-resource, largest gap). NO Polish, Czech, Russian, Ukrainian or Serbian rows; the 10 languages are never listed in the text read. This is a 10-language subset, not the 26-language benchmark. The paper's own finding: English is at or above the non-English average for every model and length (the gap is largest for Granite-H at 8K: 75.2 vs 52.1). Confidence MEDIUM-HIGH (table read twice).
- arXiv 2605.12227 (A Recipe for Long-Context Reasoning..., Ramos, Alves, Martins; S2 date 2026-05-12). App. B.2 Table 11 "OneRULER results by language": Qwen3-1.7B vs the authors' model, 8K/32K/64K/128K. Languages: de, es, fr, it, ja, ko, nl, pt, ru, zh. NO en, pl, cs, uk, sr. Russian row: Qwen3-1.7B avg 63.7, 8K 99.0, 32K 85.4, 64K 68.9, 128K 1.5; authors' model avg 78.3, 8K 98.9, 32K 96.3, 64K 74.0, 128K 43.8. Average row: Qwen3-1.7B 65.7 (128K 1.2); authors' model 77.1 (128K 37.9). Found in one fetch of the HTML (Table 11) by two independent fetches; the second fetch could not read Appendix B and did NOT re-confirm the table, so MEDIUM. The paper does not compare English with other languages in text.
- arXiv 2605.30788 (XLGoBench, Jain, Jyothi, Piratla, Raju; submitted 2026-05-29; Findings of EMNLP 2026 per secondary). arXiv HTML (v1) and abs page did not give the full text (404 for HTML; abstract only). Abstract: "persistent cross-lingual gaps in multiple state-of-the-art models"; no languages or models named. The alphaxiv page is AI-generated and lists languages EN, AR, HI, JA, ZH, TA, TE and models Gemini-3-Flash, Gemma-4-31B, GLM-5.1 - UNVERIFIED-SECONDARY, not paper text. Figure 2 caption names Telugu and Arabic vs English (paper text via alphaxiv). No Slavic language found. It is NOT a long-context benchmark (algorithmic tasks). Status: INCOMPLETE - full PDF exceeds the 10 MB tool limit; needs a download with your permission.

**F. Search log additions (coordinator round)**
| # | Query / URL | Result |
|---|---|---|
| 31 | https://cryps.pl/wp-content/uploads/2025/10/oneruler_wykres.jpeg | Binary JPEG; saved locally; viewed the image with Read: bar chart, values as in section A (visual only) |
| 32 | https://arxiv.org/html/2503.01996v3 - figure captions / alt text | All figures have alt "Refer to caption"; captions listed in section A; no per-language numbers in captions |
| 33 | https://arxiv.org/html/2503.01996v3 - "printed values in HTML text?" | No printed cell or bar values in HTML |
| 34 | https://www.alphaxiv.org/overview/2503.01996 | Secondary; 88% and 31.5% CWE-easy and 32% none-effect only; no per-language table |
| 35 | https://github.com/mungg/OneRuler/issues | 2 open issues: "Is starbix/oneruler a proper implementation?" (Jun 2026, #3) and "Is the predicition file missing?" (Apr 2025, #1). No results or per-language data. Relevant: community doubts about implementation and missing prediction files |
| 36 | https://huggingface.co/papers/2503.01996 | Table 5 models (MEDIUM); HF per-language 128K values for Figure 3 (UNVERIFIED-SECONDARY, not in text) |
| 37 | WebSearch PL "OneRuler język polski wynik długi kontekst LLM test" | Pointers: imagazine, spidersweb, Polish press; 88%/83.9% repeated; Karpinska book point (press) |
| 38 | WebSearch PL "test igła w stogu siana LLM polski kontekst 128k" | Pointers; Polish RAG NIAH paper (Politechnika Śląska), arXiv 2503.00995 listed but not read; no Polish NIAH paper with new models |
| 39 | WebSearch PL "Karpińska OneRuler krytyka benchmark wielojęzyczny" | No critique found; description only. Press (Polish) quotes Karpinska on diagnostics; Microsoft denial reported (spidersweb.pl, 2025-11) - pointer only |
| 40 | WebSearch CS "OneRuler benchmark výsledky čeština dlouhý kontext LLM" | No Czech results; no Czech numbers at all |
| 41 | WebSearch RU "OneRuler многоязычный бенчмарк ... русский результаты" | Habr/Notebookcheck pointers; "Russian ~86" secondary; no primary Russian number |
| 42 | WebSearch UK "OneRuler український бенчмарк ..." | Pointer only; Ukrainian in the 26; no number |
| 43 | WebSearch EN "OneRuler Polish Czech Russian Ukrainian Serbian accuracy 128k" | Secondary: Russian 86% (top-10 list), Ukrainian 83%; Czech/Serbian not found |
| 44 | WebSearch EN "OneRuler Polish language results explanation books Microsoft clarification" | Press: Microsoft disputes "best prompting language"; books explanation (Karpinska) |
| 45 | scienceinpoland.pl article (WebFetch) | Co-author quotes and "not statistically significant" (press only) |
| 46 | https://arxiv.org/abs/2605.30788 and /html/2605.30788v1 | Abstract only; HTML 404 |

Native-language iteration count (coordinator rule >=5 more): Polish 3 (#37-39), Czech 1 (#40), Russian 1 (#41), Ukrainian 1 (#42), English 2 (#43-44) = 8 iterations logged this round; 2 of these returned useful Slavic-number pointers only. Chinese/Slovak/Croatian queries not run.

**Revised verdict (v2):** The headline 88% / 83.9% / 62.1% and the 6th-place English rank are confirmed in primary text. The books design (Table 4) is a primary-source confound that the paper itself documents, which makes the Polish-first result a book-plus-language effect, not a language property. The "not statistically significant" claim is in the press, not in the paper, which reports no test. No primary per-language values for Czech, Russian or Serbian exist in text; only visual chart readings exist.

## 1) Executive summary

- The OneRuler paper (Kim, Russell, Karpinska, Iyyer; arXiv 2503.01996) is a COLM 2025 paper per the arXiv PDF header (seen in a search snippet, not in the PDF itself). Versions: v1 2025-03-03, v2 2025-08-08, v3 2025-09-30. Peer review: conference (COLM), confirmed only secondhand.
- The cryps.pl headline numbers are present in the primary text: Polish is top on NIAH tasks with an average of 88% across models (64K and 128K); English is 6th of 26 at 83.9%; Chinese is 4th worst at 62.1%. These are averages across all models, not a single model, and are not broken out by context length in the text.
- The paper's text gives NO per-language table. Per-language accuracy (Polish, English, Czech, Russian, Ukrainian, Serbian, etc.) exists only in heatmaps/bar charts (Fig. 2b/4/23 depending on version). I could not extract those values. Czech, Russian and Serbian have no numbers in text.
- Only 5 Slavic languages are in OneRuler: Czech, Polish, Russian, Serbian, Ukrainian. Slovak, Croatian, Slovenian and Bulgarian are NOT in the benchmark.
- Models are old by late-2026 standards: Qwen2.5 7B/72B, Llama 3.1 8B, Llama 3.3 70B, o3-mini-high (2025-01-31 snapshot), Gemini 1.5 Flash; DeepSeek-R1 only for an English analysis. No GPT-5.x, Gemini 2.5/3, Claude 4.x/5, Qwen3 or Llama 4 in the paper.
- The paper itself warns that o3-mini-high often claims "no answer" (a None-NIAH effect, e.g. 67% English vs 92% Polish at 128K for o3-mini-high); the Polish vs English gap is therefore entangled with the "none" option behaviour. Instruction language can shift results by up to ~20 points (English context with Korean instructions drops 91% to 71% at 64K; only English, Polish, Korean tested cross-lingually).
- No 2026 paper found that re-runs OneRuler per-language with newer models. One 2026 paper (arXiv 2609.35378, Multilinguality in Hybrid Attention LLMs) uses OneRuler-style NIAH with Qwen3/Qwen3.5 and Granite 4.0 models (English vs 10 non-English averages, no Slavic numbers in what I could read). Another (arXiv 2605.12227) reports OneRuler by language for Qwen3-1.7B and its own model, but without Polish, English or Czech.
- Verdict for the team: the claim is accurately reported in the cryps.pl article for the paper's averages, but it is a 2025 result on 7 models with a benchmark whose top language ranking is confounded by the none-option behaviour. It cannot be taken as "Polish beats English in current models" for late 2026.

## 2) Findings table

Columns: ID | Claim (paraphrased) | Numbers | Language(s) | Model(s) | Context length / task | Source URL | arXiv/DOI | Location in doc | Publication date | Source type & peer-review status | Confidence

| ID | Claim (paraphrased) | Numbers | Language(s) | Model(s) | Context length / task | Source URL | arXiv/DOI | Location in doc | Publication date | Source type & peer-review status | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WS1-01 | Paper version history | v1 2025-03-03; v2 2025-08-08; v3 2025-09-30 | - | - | - | https://arxiv.org/abs/2503.01996 | arXiv:2503.01996 [cs.CL] | arXiv listing | 2025-03-03 (v1) to 2025-09-30 (v3) | Preprint (arXiv) | HIGH (fetched abs page; consistent with version links) |
| WS1-02 | Venue: COLM 2025 conference paper | "Published as a conference paper at COLM 2025" header | - | - | - | https://arxiv.org/pdf/2503.01996 (header seen only via search snippet) ; https://arxiv.org/pdf/2503.01996v3 | arXiv:2503.01996 | PDF first-page header | 2025 (COLM 2025) | Peer-reviewed conference (COLM 2025) per header; the COLM proceedings listing was NOT found; v2 HTML has no venue line | MEDIUM (secondhand via search; v2 HTML lacks the line) |
| WS1-03 | Benchmark = 26 languages, adapted from English-only RULER, 7 tasks | 26 languages | en, zh, cs, da, nl, fi, fr, de, hi, hu, it, ja, ko, no, fa, pl, pt, ru, sr, st, es, sw, sv, ta, uk, vi | - | 8K/32K/64K/128K; 50 examples per config | https://arxiv.org/html/2503.01996v3 ; abs page | 2503.01996 | Section 2 / language table (Table 2 per the summary) | 2025-09-30 (v3) | Preprint / COLM 2025 | HIGH (language list from one fetch; consistent with abstract "26 languages" in v1-v3) |
| WS1-04 | Slavic coverage: only 5 Slavic languages in benchmark | cs, pl, ru, sr, uk | Czech, Polish, Russian, Serbian, Ukrainian | - | - | https://arxiv.org/html/2503.01996v3 | 2503.01996 | Language list | 2025-09-30 | Preprint | HIGH for the list; Slovak, Croatian, Slovenian, Bulgarian absent (same list) |
| WS1-05 | Models evaluated | 7 models: Qwen2.5 7B & 72B; Llama 3.1 8B; Llama 3.3 70B; o3-mini-high; Gemini 1.5 Flash; DeepSeek-R1 (English only, analysis) | - | as listed | NIAH + CWE | https://arxiv.org/html/2503.01996v3 (Sec. 1, 3; Table 5 "model configs"); the repo README says "5 open source and 2 closed" | 2503.01996 | Sec. 1, Sec. 3, Table 5 | 2025-09-30 | Preprint | HIGH for the list (v2 and v3 summaries agree); note the cryps.pl article says "Llama 3" and omits DeepSeek - the paper says Llama 3.1/3.3 |
| WS1-06 | Models named in Table 5 with snapshot IDs | meta-llama/Llama-3.3-70B-Instruct; Qwen/Qwen2.5-72B-Instruct; Qwen/Qwen2.5-7B-Instruct; meta-llama/Meta-Llama-3.1-8B-Instruct; gemini-1.5-flash; o3-mini-2025-01-31 | - | as listed | - | https://huggingface.co/papers/2503.01996 (summary of paper Table 5) | 2503.01996 | Table 5 | 2025 | Preprint | MEDIUM (secondary extraction of Table 5) |
| WS1-07 | Headline: Polish is top performer on NIAH at 64K and 128K, average 88% across all models | 88% (avg across models) | Polish | All 7 models averaged | NIAH, 64K & 128K | https://arxiv.org/html/2503.01996v2 ; https://arxiv.org/html/2503.01996v3 (Sec. 3.1) | 2503.01996 | Sec. 3.1, paragraph on NIAH; Fig. 2b (v3 numbering) / Fig. 4(b) (v2) | 2025-08-08 (v2) / 2025-09-30 (v3) | Preprint / COLM 2025 | MEDIUM-HIGH (seen in v2 and v3 text summaries; not seen in a PDF text layer; the two summaries agree) |
| WS1-08 | English is 6th of 26 at 64K/128K NIAH | 83.9% (avg), rank 6/26 | English | All models averaged | NIAH 64K & 128K | same as WS1-07 | 2503.01996 | Abstract; Sec. 1; Sec. 3.1 ("English is only the 6th best language out of the 26"); Fig. 2 caption ("not among the top five") | 2025 | Preprint / COLM 2025 | HIGH for rank and 83.9% (abstract + Sec. 3.1 in v2 and v3 summaries agree); cryps.pl "~84%" matches |
| WS1-09 | Chinese is 4th worst | 62.1% (avg) | Chinese | All models averaged | NIAH 64K & 128K | https://arxiv.org/html/2503.01996v2 (Sec. 3.1) | 2503.01996 | Sec. 3.1 | 2025-08-08 | Preprint / COLM 2025 | MEDIUM-HIGH (v1 & v2 summaries agree; cryps.pl "62.1%" matches) |
| WS1-10 | Polish 92% vs English 67% for o3-mini-high at 128K; Ukrainian 89% | 92% (PL), 67% (EN), 89% (UK) | pl, en, uk | o3-mini-high only | NIAH 128K | https://arxiv.org/html/2503.01996v2 (Sec. 3.1); v3 summary agrees | 2503.01996 | Sec. 3.1 | 2025 | Preprint / COLM 2025 | MEDIUM (one model only; sentence cited in two fetches; not in a table) |
| WS1-11 | The Polish advantage is largest for a single model at 128K; English vs Polish gap widens with length | not given numerically | pl, en | - | 8K-128K | https://arxiv.org/abs/2503.01996 | 2503.01996 | Abstract (gap widens 8K->128K) | 2025-03-03 | Preprint | HIGH (abstract) for the widening-gap statement; per-length values NOT available |
| WS1-12 | High/low-resource gap widens with context | Gap "increases from 11% at 8K to 34%" (high vs low) | high vs low resource groups | averaged | 8K -> 128K | https://arxiv.org/html/2503.01996v1 (Sec. 3.1) | 2503.01996 | Sec. 3.1 | 2025-03-03 | Preprint | MEDIUM (single fetch of v1 text summary; the 34% endpoint is the 128K value, not confirmed) |
| WS1-13 | Top 10 languages are Slavic, Romance or Germanic with large Wikipedia | none | Slavic/Romance/Germanic | - | - | https://arxiv.org/html/2503.01996v3 (Sec. 3.1, cites Fig. 7) | 2503.01996 | Sec. 3.1; Fig. 7 | 2025-09-30 | Preprint | MEDIUM-HIGH |
| WS1-14 | Romance languages perform best across all context lengths, along with Polish and Russian | none | ro-langs, pl, ru | - | - | https://arxiv.org/html/2503.01996v3 (Fig. 3 caption) | 2503.01996 | Fig. 3 caption | 2025-09-30 | Preprint | MEDIUM (caption read through summariser) |
| WS1-15 | Czech is lowest-ranked of the top-10; Russian and Serbian have no numeric value in text | none | cs (rank only), ru, sr | - | - | https://arxiv.org/html/2503.01996v3 (Sec. 3.1) | 2503.01996 | Sec. 3.1 | 2025-09-30 | Preprint | MEDIUM (one fetch; conflicts with nothing else found) |
| WS1-16 | Instruction-language effect: English context with Korean instructions drops from 91% to 71% at 64K | 91% -> 71% | en (context), ko (instructions) | not stated in fetch | cross-lingual NIAH, 64K | https://arxiv.org/html/2503.01996v2 (Sec. 4); v1 summary also cites | 2503.01996 | Sec. 4 (cross-lingual) / Fig. 8a | 2025-08-08 | Preprint | MEDIUM (two fetches agree on the number; only en, pl, ko tested cross-lingually) |
| WS1-17 | Instruction language can shift performance by up to 20% | up to ~20 pts | multiple | - | cross-lingual | https://arxiv.org/abs/2503.01996 (abstract) | 2503.01996 | Abstract | 2025-03-03 | Preprint | HIGH (abstract; figure not checked) |
| WS1-18 | "none" option makes NIAH significantly harder; removing it / adding it drops S-NIAH accuracy | -32% at 128K (drop) | English | multiple | S-NIAH 128K | https://arxiv.org/html/2503.01996v2 (Sec. 4) | 2503.01996 | Sec. 4 | 2025-08-08 | Preprint | MEDIUM (one fetch; sign and baseline not fully clear) |
| WS1-19 | o3-mini-high frequently predicts "no answer" even in high-resource languages | qualitative | many | o3-mini-high | None-NIAH | https://arxiv.org/abs/2503.01996 (abstract) | 2503.01996 | Abstract | 2025-03-03 | Preprint | HIGH (abstract) |
| WS1-20 | Aggregation (CWE) is hardest; English CWE-easy average 31.5% across models; CWE-hard ~0% | 31.5% (CWE-easy, EN, avg); ~0% (CWE-hard) | English | all | CWE-easy/hard, 8K-128K | https://arxiv.org/html/2503.01996v3 (App. C.3; Fig. 5, Fig. 22) | 2503.01996 | App. C.3 | 2025-09-30 | Preprint | MEDIUM (one fetch, appendix chunk) |
| WS1-21 | Tokenisation: token counts differ across tokenizers (Tamil example, 128K cl100k = 33,249 o200k tokens) | 33,249 tokens | Tamil | - | 128K | https://arxiv.org/html/2503.01996v3 (App. D, Fig. 24) | 2503.01996 | App. D | 2025-09-30 | Preprint | MEDIUM |
| WS1-22 | Paper reports rank correlation of 0.82 between two token-count settings | tau = 0.82 | - | - | - | https://arxiv.org/html/2503.01996v3 (Sec. 2 / App. D) | 2503.01996 | Sec. 2 or App. D | 2025 | Preprint | LOW-MEDIUM (only summariser output) |
| WS1-23 | The paper does NOT explain why Polish scores high; authors call the English/Chinese underperformance "unexpected" and say it "remains unclear" | qualitative | pl, en, zh | - | - | https://arxiv.org/html/2503.01996v2 (Sec. 3.1 / conclusion) | 2503.01996 | Sec. 3.1 | 2025-08-08 | Preprint | MEDIUM (summary; no explanation found in text) |
| WS1-24 | Authors speculate on lack of low-resource data in long-context extension | qualitative | low-resource | - | - | https://arxiv.org/html/2503.01996v3 | 2503.01996 | Discussion | 2025-09-30 | Preprint | MEDIUM - speculation, not tested |
| WS1-25 | Tokenisation as a possible explanation: Fig. 23 pattern (fewer correct words) "possibly indicative of tokenization issues" | qualitative | high vs low resource | - | - | https://arxiv.org/html/2503.01996v3 (App. C/D; Fig. 23) | 2503.01996 | App. D | 2025-09-30 | Preprint | MEDIUM - authors' interpretation, not tested |
| WS1-26 | Controlled-length analysis: English "typically 8th" | rank 8 | English | - | controlled input length | https://arxiv.org/html/2503.01996v3 (Fig. 23 text) | 2503.01996 | Fig. 23 | 2025-09-30 | Preprint | MEDIUM |
| WS1-27 | Polish is 1st also at 8K-32K? | NOT FOUND | - | - | 8K, 32K | - | - | - | - | - | NOT FOUND - the 88%/rank claim is stated only for 64K/128K |
| WS1-28 | Repo: mungg/OneRuler, MIT license, code+data, misc/heatmap.png, no results files | - | - | - | - | https://github.com/mungg/OneRuler | - | README, repo tree | not shown (27 commits on main) | Code/data repo (author-hosted) | HIGH for structure; no 2026 updates visible |
| WS1-29 | Repo does NOT contain per-language results files; only a micro-accuracy heatmap | - | - | - | - | https://github.com/mungg/OneRuler (misc/heatmap.png) | - | repo tree | - | Repo | MEDIUM (from a single page fetch; eval/ directory not listed) |
| WS1-30 | Dataset location: generated data in dataset/ per model/language/context/task; translations in data/ | - | - | - | - | https://github.com/mungg/OneRuler (README) | - | README | - | Repo | MEDIUM |
| WS1-31 | Cited by 27 papers (Semantic Scholar), including 2026 papers | 27 citing papers | - | - | - | https://api.semanticscholar.org/graph/v1/paper/arXiv:2503.01996/citations (fetched 2026-11-24) | 2503.01996 | - | - | Index (secondary) | MEDIUM (list fetched; not every citing paper verified) |
| WS1-32 | Follow-up: uses OneRuler with newer open models (Qwen3, Qwen3.5, Granite 4.0), English vs 10 non-English languages, NIAH 8K-64K | Qwen3-30B-A3B: Eng 99.2/98.0/97.6 (8K/32K/64K), non-Eng avg 98.2/95.3/92.0; Qwen3.5-35B-A3B: Eng 100.0/100.0/99.6, non-Eng 96.9/95.6/93.8; Granite-4.0-Micro Eng 80.4/65.6/47.2; non-Eng 71.2/47.9/38.1; Granite-4.0-H-Micro Eng 75.2/68.0/61.6; non-Eng 52.1/39.5/34.9 | English vs "Non-Eng (10 langs)" (names not visible) | Qwen3-30B-A3B, Qwen3.5-35B-A3B, Granite-4.0-Micro, Granite-4.0-H-Micro | NIAH (5 tasks, no CWE) 8K/32K/64K | https://arxiv.org/html/2609.35378 (Sec. 4, Table 2) | arXiv:2609.35378 "Multilinguality in Hybrid Attention LLMs" (Bandarkar, Hu, Yang, Fayyaz, Peng) | Sec. 4, Table 2 | arXiv v1 2026-09-28 (S2) | Preprint (not peer reviewed as far as seen) | MEDIUM (one summariser read of Table 2; the summariser said the page was truncated at 100k chars; Polish/Czech/Russian not mentioned in what was read; verify before citing) |
| WS1-33 | Follow-up: OneRuler by language for Qwen3-1.7B vs own model (8K-128K) | Qwen3-1.7B avg 65.7; Ours avg 77.1; 128K: 1.2 vs 37.9. Per-language 128K (Qwen3-1.7B / Ours): de 0.1/29.6, es 1.0/43.3, fr 0.5/40.1, it 0.8/34.1, ja 0.0/21.0, ko 7.9/72.9, nl 0.1/31.5, pt 0.5/39.1, ru 1.5/43.8, zh 0.0/24.0 | de, es, fr, it, ja, ko, nl, pt, ru, zh (NO pl, en, cs, uk, sr) | Qwen3-1.7B; "Ours" (unnamed) | NIAH/OneRuler 8K/32K/64K/128K | https://arxiv.org/html/2605.12227 (App. B.2, Table 11) | arXiv:2605.12227 "A Recipe for Long-Context Reasoning in LLMs via On-Policy Optimization and Distillation" (Ramos, Alves, Martins) | Table 11 | S2 pub date 2026-05-12; arXiv page shows v3 revision 2026-09-10 | Preprint | MEDIUM-HIGH for the table (one summariser read; numbers self-consistent averages); Polish/English not present |
| WS1-34 | Follow-up: cross-lingual "reasoning" gap in algorithmic tasks; gap appears only in intermediate difficulty | qualitative | multiple | multiple SOTA models | algorithmic reasoning (not NIAH) | https://arxiv.org/abs/2605.30788 | arXiv:2605.30788 XLGoBench (Jain, Jyothi, Piratla, Raju); EMNLP 2026 Findings per secondary | - | - | 2026-05-29 | Preprint; Findings of EMNLP 2026 (ACL Anthology listing per search) | LOW-MEDIUM (abstract-level only; does not cite OneRuler per fetched info; relevant to the "reasoning" half of the question) |
| WS1-35 | Follow-up: MLNeedle, needle in non-English-family languages is worst; mid-context worst | qualitative | non-English-family | 4 SOTA LLMs | NIAH | https://aclanthology.org/2025.naacl-long.267/ | arXiv not checked (ACL 2025.naacl-long.267) | Abstract | 2025-04 (NAACL 2025, pp. 5165-5180) | Peer-reviewed (NAACL 2025) | HIGH (venue and abstract claim from ACL page); Slavic languages not confirmed |
| WS1-36 | Follow-up: Can LLMs reason over extended multilingual contexts (MLRBench) | "less than 30%" of claimed context used in multilingual settings | 7 languages (names not visible) | one open-weight LLM (not named in fetch) | reasoning over long multilingual context | https://aclanthology.org/2026.eacl-long.290/ | - (EACL 2026, pp. 6128-6152) | Abstract | 2026-03 | Peer-reviewed (EACL 2026) | MEDIUM-LOW (abstract only; Polish not confirmed) |
| WS1-37 | Follow-up: multilingual comprehension (12 languages, 3 models): English beaten by several Romance languages | qualitative | 12 languages incl. Indo-European, Afro-Asiatic, Turkic, Sino-Tibetan, Japonic (Polish not confirmed) | 3 popular models (not named in fetch) | comprehension, not long-context | https://arxiv.org/abs/2602.20065 | arXiv:2602.20065 (Moskvina et al.) | Abstract | 2026-02-23 | Preprint (cs.CL) | LOW-MEDIUM (search snippet only) |
| WS1-38 | Follow-up: long-context study on lexical density (not language) | qualitative | - | open-weight models 9B-685B | NIAH-type, ~12K tokens | https://arxiv.org/abs/2606.06203 | arXiv:2606.06203 (Dettori et al.) | Abstract | 2026-06-04 | Preprint | LOW (abstract/secondary only; relevance to language question is indirect) |
| WS1-39 | Follow-up: multi-turn 30-language eval, median non-English costs 31% more and scores 10% lower | 31%, 10% | 30 languages (EU-24+) | 9 open and commercial | multi-turn dialogue games, not long-context | https://arxiv.org/abs/2608.01395 | arXiv:2608.01395 (Hakimov et al.) | Abstract | 2026-08-02 | Preprint | LOW-MEDIUM (search snippet only) |
| WS1-40 | Commentary: Substack "Why Polish Wins" attributes the ranking to morphosyntax (hypothesis), tokenisation (hypothesis) and says nothing about script | - | pl | - | - | https://elzbietadawidek.substack.com/p/why-polish-wins | - | - | 2025 | Blog (NOT evidence; pointer only) | Pointer only - explanation is hypothesis, not tested |
| WS1-41 | Press pointers: Notebookcheck, UNU blog, aimodels.fyi (one claims 24 languages - wrong; paper says 26) | - | - | - | - | https://www.notebookcheck.net/A-surprising-language-beats-English-and-Chinese-in-LLM-tests-based-on-new-academic-study.1168913.0.html ; https://c3.unu.edu/blog/the-surprising-language-hierarchy-of-ai-why-polish-outperforms-english-in-long-context-understanding | - | - | - | - | - | Secondary (pointers only) | Pointer only |

## 3) Caveats and contradicting evidence

1. **No per-language table exists in the text.** Sec. 3 quotes only 88% (PL), 83.9% (EN), 62.1% (ZH), and o3-mini-high single-model values (PL 92, UK 89, EN 67 at 128K). Per-language values for the remaining 21 languages, and PL/EN/CZ/RU/UK/SR per length (8K/32K/64K/128K), live only in heatmaps/bars (Fig. 2b/4, 6, 7, 23, 25 depending on version). Cross-check of the "88% vs 83.9%" values: two independent fetches of v2 and v3 HTML say the same. Remaining gap: I could not read the figures.
2. **Figure numbering is inconsistent across fetches** (v1/v2/v3 summaries cite Fig. 2, 3, 4, 6, 7, 8, 23, 25 for the same statements). Do not cite figure numbers without opening the PDF.
3. **The 88% and 83.9% are averages across all 7 models** (including Gemini 1.5 Flash, Llama 3.1/3.3, Qwen2.5 and o3-mini-high). The cryps.pl article reads them as one ranking; it is a pooled average of models whose "none"-option behaviour differs strongly (see point 4).
4. **The None-NIAH confound.** The authors say many models, especially o3-mini-high, answer "no needle" incorrectly. Because the averages include None-NIAH, the English/Chinese ranking may reflect differences in how models respond to the "none" option and in instruction language, rather than retrieval ability in the language itself. The authors do not test this explanation per language.
5. **Instruction-language effect (up to ~20 pts) is larger than the Polish-English difference reported at 64K/128K in some comparisons** (e.g. 91% to 71% at 64K). The Polish-vs-English headline therefore depends on which instruction language was used. Only English, Polish and Korean instructions were tested cross-lingually.
6. **Length dependence:** the headline is stated for 64K and 128K only. Whether Polish is also top at 8K-32K is NOT verified from text. The authors say the gap widens with length; Fig. 23 (controlled for length) places English "typically 8th".
7. **Small sample:** 50 examples per configuration per language (abstract/Sec. 2). The 88%/83.9% differences (about 4 points, averaged over 7 models) are not accompanied by CIs or significance tests in any text I could read. Low-resource languages have small Wikipedia bases (Sesotho ~1,383 articles).
8. **Translation quality:** native speakers translated prompts (paid $25 per language; 7 languages volunteered per summariser). Quality checks were not verified.
9. **Tokenisation confound:** context is matched on total token count, which varies across tokenizers (Tamil example in App. D). A Kendall tau of 0.82 between two settings is reported (summariser only).
10. **Contamination:** the paper does not claim the benchmark is contaminated; it speculates that post-training with NIAH data may explain the "none" behaviour (speculation).
11. **Why Polish?** The paper offers no tested explanation. Blog-level explanations (morphosyntax, BPE segmentation) are hypotheses. Writing system is not an argument (Polish and English both use Latin script).
12. **Conflicting numbers:** none found on the headline values. Conflict on venue detail: one search snippet says COLM 2025 header is in the PDF; the v2 HTML has no venue line (may be absent from the HTML render, not necessarily the PDF). Conflict on 2605.12227 dates: S2 says 2026-05-12, arXiv page summary says v3 10 Sep 2026.
13. **Conflict on model names:** the cryps.pl article says "Llama 3"; the paper uses Llama 3.1 8B and Llama 3.3 70B. The aimodels.fyi summary says 24 languages; the paper says 26.
14. **Staleness:** Models in the paper are from 2024-2025 (o3-mini Jan 2025, Gemini 1.5 Flash, Qwen2.5). Nothing in the paper covers GPT-5.x, Gemini 2.5/3, Claude 4.x/5, Qwen3, Llama 4, DeepSeek V3.x or Gemma 3. The only 2026 follow-up with per-language OneRuler numbers that I found (2605.12227) uses Qwen3-1.7B and its own model, with no Polish/English/Czech.

## 4) Items NOT found + search log

### Not found
- Per-language accuracy values for Polish, English, Czech, Russian, Ukrainian, Serbian, and all other languages for each context length and model. Only figures contain them; they were not readable by my tools. Next step: download the arXiv PDF (needs user permission per the file-download rule; about 10 MB) and extract the vector figure labels with pdftotext/PyMuPDF, or read the mungg/OneRuler `misc/heatmap.png`.
- Mungg repo results files: the README mentions an `eval/` evaluation script and a `dataset/` directory, but no results files were visible in the tree.
- Official COLM 2025 proceedings page / OpenReview forum for 2503.01996: not found (search only returned arXiv).
- amazon-science/oneruler: 404 (wrong org; the correct repo is mungg/OneRuler).
- Semantic Scholar single-paper endpoint and a second citations call: HTTP 429 (rate limit). The first citations call succeeded (27 items).
- A 2026 paper that re-runs OneRuler per language with GPT-5.x, Gemini 2.5/3, Claude 4.x/5 or Qwen3 with Polish/English/Czech numbers: NOT found.
- Hugging Face dataset repo for OneRuler: not linked (the HF paper page lists only the GitHub repo).
- Ar5iv and HF pages: no per-language table.
- Hugging Face paper page date, upvotes, community comments: not in the fetched content.
- Independent replication of the Polish-first result: NOT found.

### Search log
| # | Query / URL | Result |
|---|---|---|
| 1 | https://arxiv.org/abs/2503.01996 | Useful: title, authors, v1-v3 dates, cs.CL |
| 2 | https://arxiv.org/html/2503.01996 | Useful: 26-language list, models, tasks, 8K-128K; no per-language values |
| 3 | https://arxiv.org/html/2503.01996v3 (Sec. 3, two chunks) | Useful: 88%, 83.9%, 62.1%, 92/89/67 values, Table list (no per-language table) |
| 4 | https://arxiv.org/html/2503.01996v3 (offset 50k/100k) | Partial: appendix C/D; CWE-easy EN 31.5%; figure-only per-language |
| 5 | https://github.com/amazon-science/oneruler | 404 |
| 6 | https://github.com/mungg/OneRuler | Useful: MIT, README, structure, heatmap only |
| 7 | https://arxiv.org/pdf/2503.01996v3 | Failed: >10MB |
| 8 | WebSearch "OneRuler ... Kim Russell Karpinska Iyyer" | Useful: found mungg repo; COLM claim |
| 9 | WebSearch "OneRuler COLM 2025 accepted" | Useful: COLM header claim (secondary) |
| 10 | WebSearch "multilingual needle ... Polish 2026 arXiv" | Found MLNeedle (NAACL 2025), MLRBench (EACL 2026) |
| 11 | https://arxiv.org/abs/2503.01996v1 | Useful: v1 has no "under review" line; abstract claims |
| 12 | https://arxiv.org/html/2503.01996v1 | Useful: 88/83.9/62.1; gap 11%->34%; models; contexts |
| 13 | https://arxiv.org/html/2503.01996v2 | Useful: same numbers; no COLM line in HTML; Fig. 4 numbering |
| 14 | WebSearch "COLM 2025 proceedings" | COLM header (secondary) |
| 15 | https://jenna-russell.github.io/assets/pdf/oneruler.pdf | Failed: >10MB |
| 16 | https://ar5iv.labs.arxiv.org/html/2503.01996 | No per-language table; figure-only |
| 17 | https://huggingface.co/papers/2503.01996 | Table 5 model IDs (secondary) |
| 18 | WebSearch "OneRuler per language table appendix" | Found 2605.12227 Table 11 pointer |
| 19 | WebSearch "cited 2026 GPT-5 Gemini 2.5 ..." | Nothing new; no 2026 citing paper with new models |
| 20 | https://arxiv.org/html/2605.12227 (offset 100k) | Useful: OneRuler by language table (no PL/EN/CS) |
| 21 | https://arxiv.org/html/2609.35378 | Useful: Table 2 Eng vs non-Eng with Qwen3.5 and Granite 4.0 |
| 22 | Semantic Scholar citations API | Useful: 27 citing papers (2026 list) |
| 23 | Semantic Scholar paper endpoint | 429 rate limit |
| 24 | https://aclanthology.org/2025.naacl-long.267/ | Useful: MLNeedle, NAACL 2025 |
| 25 | https://aclanthology.org/2026.eacl-long.290/ | Useful: MLRBench, EACL 2026 (abstract) |
| 26 | https://elzbietadawidek.substack.com/p/why-polish-wins | Pointer; hypothesis only |
| 27 | WebSearch "XLGoBench ..." / "Multilingual LLMs do not comprehend ..." / "Multilinguality in Hybrid Attention ..." / "Language Equality has a Price ..." / "Dense Contexts Are Hard Contexts ..." | Found arXiv IDs for 5 follow-ups (abstract-level) |
| 28 | https://arxiv.org/abs/2608.20853 (MGAL) | Does not cite OneRuler; UN six languages |
| 29 | https://arxiv.org/abs/2610.02404 | Not OneRuler |
| 30 | Ar5iv / PDF re-attempts for per-language figure values | Not obtainable from text |

Queries in Polish/Czech/Russian (e.g. "wielojęzyczne testy długiego kontekstu polski") were NOT run; I did not reach the 5-query minimum for per-language numbers via non-English queries. Remaining gap to close: figure extraction (see section 4 Not found).

## 5) Primary-source URLs

Paper and versions
- https://arxiv.org/abs/2503.01996 (abs, all versions)
- https://arxiv.org/abs/2503.01996v1
- https://arxiv.org/html/2503.01996v1
- https://arxiv.org/html/2503.01996v2
- https://arxiv.org/html/2503.01996v3
- https://arxiv.org/pdf/2503.01996v3 (not read: over size limit)
- https://arxiv.org/pdf/2503.01996 (venue header via search snippet)
- https://jenna-russell.github.io/assets/pdf/oneruler.pdf (v1 PDF; not read: over size limit)
- https://ar5iv.labs.arxiv.org/html/2503.01996

Code, data, metadata
- https://github.com/mungg/OneRuler (MIT; code and data; no results files)
- https://huggingface.co/papers/2503.01996 (paper page, Table 5 model IDs)
- https://api.semanticscholar.org/graph/v1/paper/arXiv:2503.01996/citations (27 citing papers)

Follow-ups
- https://arxiv.org/html/2605.12227 (arXiv:2605.12227, OneRuler by language, Table 11)
- https://arxiv.org/html/2609.35378 (arXiv:2609.35378, Multilinguality in Hybrid Attention LLMs, Table 2)
- https://arxiv.org/abs/2605.30788 (arXiv:2605.30788, XLGoBench, reasoning)
- https://arxiv.org/abs/2602.20065 (arXiv:2602.20065, multilingual comprehension)
- https://arxiv.org/abs/2608.01395 (arXiv:2608.01395, multi-turn EU-24+)
- https://arxiv.org/abs/2606.06203 (arXiv:2606.06203, lexical density)
- https://arxiv.org/abs/2608.20853 (arXiv:2608.20853, MGAL; no OneRuler)
- https://aclanthology.org/2025.naacl-long.267/ (MLNeedle, NAACL 2025)
- https://aclanthology.org/2026.eacl-long.290/ (MLRBench, EACL 2026)

Secondary / pointers only (not evidence)
- https://www.notebookcheck.net/A-surprising-language-beats-English-and-Chinese-in-LLM-tests-based-on-new-academic-study.1168913.0.html
- https://c3.unu.edu/blog/the-surprising-language-hierarchy-of-ai-why-polish-outperforms-english-in-long-context-understanding
- https://elzbietadawidek.substack.com/p/why-polish-wins
- https://www.aimodels.fyi/papers/arxiv/one-ruler-to-measure-them-all-benchmarking
- https://www.alphaxiv.org/overview/2503.01996v3
