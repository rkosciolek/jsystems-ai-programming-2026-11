| Recording | Field | Old -> new | Reason |
|---|---|---|---|
| llm-error-unknown-model | response.body `error.metadata...user_id` (OpenRouter account id) | real value -> `REDACTED` | Privacy redaction of an account identifier (orchestrator decision 2026-11-26); not a behavioural mutation |
| jev-complaint-laptop-1 | response.body `answers.image_usable.noul` | `0.84` -> `0.5` | Exercise the ADR-001 §3.2 inclusive noul threshold edge (`p >= 0.5`) |
| jev-complaint-laptop-1 | response.body `answers` | object -> field removed | Exercise invalid-response handling when required answer data is missing |
| jev-complaint-laptop-1 | response.body `answers.device_category.confidence` | `1` -> `0.02` | Confirm TD-101 certainty uses `probabilities[choice]`, while preserving `confidence` in `raw` |
