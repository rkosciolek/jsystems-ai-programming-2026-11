# WS6 report (agents, tool use, instruction following, tokenization, counter-evidence)
Saved by coordinator from the subagent's hand-back message (agent could not write files). Status of every row: AS REPORTED BY HAIKU AGENT, NOT YET INDEPENDENTLY VERIFIED unless a verification file says otherwise.

## Findings (agent-reported; confidence as given by agent)
| ID | Claim | Numbers | Source | Location | Date | Agent confidence |
|---|---|---|---|---|---|---|
| F01 | Tokenizer fertility, 25 European languages, parallel SIB-200 text, 6 tokenizers (Llama 4 Maverick, Llama 3.3 70B, Gemma 2 27B, GPT-4o, DeepSeek V3, Qwen3 32B) | tokens/word: EN 1.23; PL 2.25 (1.88-2.60); CS 2.28; BG 2.33; SK 2.45; UK 2.66; PL/EN ratio ~1.83 (computed) | arXiv:2605.24718 (https://arxiv.org/html/2605.24718v1) | Table 4 | 2026-05-23, preprint, single author | MEDIUM |
| F03 | Polish constitution preamble token counts | Llama2 PL 681 vs EN 427 (1.59); Mistral v0.1 747 vs 408 (1.83); APT3 344 vs 615 (0.56) | arXiv:2410.18565 (Bielik 7B) | Table 2 | 2024-10-24 (older) | MEDIUM |
| F09 | Marco-Bench-MIF (IFEval in 30 languages incl. Polish), en/pl | Claude3.5-Sonnet 90.3/74.5; GPT-4o 87.8/73.0; GPT-4o-mini 84.9/69.5; Qwen-Max 87.4/74.9; Aya-expanse-32B 74.3/66.5; LLaMA3-70B 82.0/44.3; MT underestimates by 7-22% | arXiv:2507.11882 (ACL 2025 long) | Table 3, Abstract | 2025-07-16 (older models) | MEDIUM |
| F10 | OneRuler NIAH averages | PL 88%, EN 83.9% (6th/26); DeepSeek-R1 only English; instruction/context language mismatch up to ~20 pts | arXiv:2503.01996 | Sec 3.1, Fig 4(b) | v1 2025-03-03, v3 2025-09-30 | MEDIUM |
| F11 | OmnilingualGAIA2 agentic gap, 10 langs, NO Polish | pooled non-EN vs EN pass@3: Gemini-3.1-Pro 62.2 vs 53.4; Claude-4.7-Opus 82.7 vs 73.6; GPT-5.4 68.4 vs 58.5; Gemma-4-31B 63.3 vs 51.4; Qwen-3.6-27B 62.2 vs 50.2; Kimi-2.6 66.5 vs 54.2; Qwen-3.6-35B-A3B 56.6 vs 38.2 (NB: agent's labelling of which side is higher is odd - verify direction) | arXiv:2608.08775 | Table 1 | 2026-08-09 | MEDIUM (gaps computed by agent) |
| F12 | tau-bench-LILT: largest drops Korean/Farsi up to 61 pts pass^4; no Polish | | arXiv:2611.07203 | Abstract | 2026-11-04 | MEDIUM |
| F13 | mmPISA-bench, 43 langs incl. PL, CS, BG, HR, SK, SL, RU, SR | Claude Opus-4-5 none: EN 90.4 vs others 80.0-94.4; high effort: EN 100.0 vs min 88.0 (Greek); GPT-5.1 none EN 76.8 vs 73.6-84.8; high EN 96.8 vs 90.4-100; human vs MT totals ~equal | arXiv:2606.07069 | Table 1-3 | 2026-06-05 | MEDIUM (Polish row NOT extracted) |
| F14 | MAPS (EACL 2026 findings), 11 langs, NO Polish | GAIA EN 47.4 vs non-EN mean 35.8 | arXiv:2505.15935 | Table 2 | v3 2026-02-10 | LOW-MEDIUM |
| F15 | Kang et al.: reasoning gap is mostly language-understanding failure; selective translation of ~20% inputs ~matches full translation | qualitative | arXiv:2510.27269 | Abstract | v3 2026-04-13, Findings ACL 2026 | MEDIUM |
| F16 | MLCL tool calling (Chinese, Hindi, Igbo; no Polish) | qualitative | arXiv:2601.05366 | Abstract | 2026 | MEDIUM |
| F21 | Translated-benchmark validity | qualitative | arXiv:2605.24904 | Abstract | 2026-05-24 | MEDIUM |

## UNVERIFIED-SECONDARY (do not cite without verification)
F04 Bielik 11B v3 tokenizer table (arXiv:2601.11579, PDF unread); F05 French token premium (arXiv ID given as 2609.39001 - ID FORMAT SUSPICIOUS, verify it exists); F06 Petrov et al. 15x (arXiv:2305.15425); F07 Russian token premium (vgtimes/habr news, no primary); F08 Polish +40% tokens (practitioner estimate); F17 MASSIVE-Agents etc; F18 Bielik reasoning (2603.10640); F19 PoVisLE VLM (2608.07763); F20 round-trip translation (2604.12911); F22 localized vs translated correlation 0.68 vs 0.47 (2504.15521); F23 M-IFEval (no Polish); F24 HumanEval-XL (Polish unconfirmed).

## Not found (agent, 10+ PL/RU/CS/UK/EN queries)
Polish-specific 2026 agentic/tool-use/function-calling benchmark; Polish IFEval in 2026; same-agent EN vs PL prompt study on 2026 text models; official token-fertility numbers from Anthropic/OpenAI for Polish; effective-context-length study for Polish; PolEval 2026 tool-calling task.

## Counter-evidence (agent synthesis)
1. mmPISA: near parity at high reasoning effort; gaps mostly at low effort and for a few languages. 2. MT vs human translation conflict between mmPISA (no loss) and Marco-Bench-MIF (underestimates 7-22%). 3. Kang et al.: gap = comprehension, fixable by translating input. 4. OneRuler not like-for-like. 5. Localization confounds translation (tau-bench-LILT). 6. Tokenization premium is cost, not competence. 7. Most 2026 agentic benchmarks exclude Polish. 8. Most Polish-inclusive evidence uses 2024-2025 models.
