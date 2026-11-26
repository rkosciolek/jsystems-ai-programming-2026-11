# Testing rules for plans

## 1. Layers

| Layer | What is real | What may be replaced |
|---|---|---|
| Unit | Our code | External endpoints only, through in-process mock models or clients whose **content is copied from a named recording** |
| Integration | Our code, framework, file system, storage, parsers, the real SDK/provider | Only the HTTP exchange with external endpoints, **replayed from recordings** through an injected `fetch` (or equivalent) |
| E2E | Everything: the production build, real external services, real test data | **Nothing.** No mocks, no request interception, no stubbed routes. |
| Manual QA | Everything, driven by the browser automation CLI on the running app | **Nothing** |

If the project's `AGENTS.md` describes the test strategy differently, follow the stricter rule. List the conflict in the plan's review log.

## 2. Recorded mocks (unit and integration)

1. **Recording script.** It is re-runnable (e.g. `npm run capture`) and makes the real calls through the **same code paths** the app uses.
2. **Saved files.** Each exchange is saved verbatim to `tests/fixtures/captured/<name>/`:
   - the request, with the authorization header removed;
   - the response status and headers;
   - the raw body, including the complete stream for streamed responses;
   - metadata: date, endpoint, model or service ID and the version or snapshot the response reports, hashes of the prompts, schemas and question sets used, and the app commit.
3. **What to record:**
   - every success shape the app consumes;
   - real error responses: unknown model/ID (4xx) and invalid key (401) for every external endpoint;
   - streamed responses, including tool calls when the app uses tools.
4. **When to record:** after the prompts, output schemas and question sets exist, or the recordings are stale on arrival. Split recording into an early task (gate check, endpoints whose inputs are already fixed, errors) and a later one (calls that depend on prompts and schemas).
5. **Replay.**
   - Clients accept an injected `fetch`. Verify that the SDK supports this before planning on it.
   - The replay function returns the recorded status, headers and body, re-emitting streams in their recorded chunks.
   - The real SDK parses the result.
6. **Mutations.** When a shape cannot be produced for real (a boundary certainty, a rule-violating model output, a missing field), load a recording and change the minimum fields. Declare every mutation in `tests/fixtures/captured/MUTATIONS.md` (recording, field, old → new value, reason). Never write a body from scratch.
7. **Faults.**
   - A timeout replays a recorded success after a delay.
   - An upstream error replays a recorded real error.
   - A network drop is a rejected `fetch` with the platform's real error class.
8. **Freshness.** A unit test compares the stored hashes with the current prompts, schemas and question sets, and fails when a recording is stale. Refresh recordings when a model ID, prompt, schema or SDK major version changes.
9. **Content.** Recordings contain no secrets and no personal data. Inputs are the project's real fixtures plus synthetic form data.
10. **Mechanical check:** a grep over `tests/` finds no external response body defined inline.

## 3. Real-stack E2E

- **One build, many configurations.** Build once and start several servers with different runtime env (ports S1…Sn). Server-side env is read at runtime, so one build serves every configuration.
- **Knobs make every path reproducible for real.** Add each knob to the ADR's env table, labelled "test/evaluation only". Typical knobs:

  | Knob | Path it makes reproducible |
  |---|---|
  | Mode that forces one decision method (e.g. classifier-only, LLM-only) | Each decision path on its own |
  | Short TTL or expiry | Session or case expiry |
  | Invalid model or service ID | A real upstream failure, before or after the main step (e.g. the case succeeds, then chat fails) |
  | Tiny total timeout | The timeout path |
  | Invalid key for the external service | Real 401 handling |

- **Evidence from logs.** Each server writes its own structured log. Specs read the log entry for their request ID to prove which path ran and which external calls were made. Never infer this from the UI alone.
- **Assertions.**
  - Structural and invariant assertions are deterministic: `retries: 0`.
  - Assertions on what a model writes or decides are tagged (e.g. `@model`) and run with `retries: 2`. Failures after retries are reported as model-quality findings with the transcript; they are never fixed by weakening the assertion.
  - Never assert what a model "sees" in a real fixture. Assert structure, invariants and logged paths.
- **Browsers.** Cover what the PRD requires. If an engine cannot be installed on the machine, the QA report says "not verified"; do not silently skip it.
- **Budget.** State the number of paid external calls per full run and get the owner's OK.
- **Truly impossible paths.** List those that cannot be produced for real (e.g. a model violating a rule twice in a row). Each is covered by an integration test on a declared mutation and watched for in the logs during manual QA.

## 4. Test data

- Use the project's real fixtures (photos, documents, sample files). Read the fixture folder's README; its rules bind every test.
- Generated payloads are allowed **only** for rejection tests (too large, wrong format), and only with owner approval when the README forbids generated files.
- Synthetic personal data only.

## 5. QA gates (manual, after every phase)

- **Every phase delivers something runnable.** If the final UI for a feature comes in a later phase, add a temporary view so the earlier gate can exercise the backend through the UI.
- **A gate runs on the running app** (production build plus the needed server set) with the browser automation CLI (e.g. `playwright-cli`). It covers:
  - the phase's flows, error states and keyboard use;
  - the target viewports, e.g. 360 px and 1920 px;
  - a comparison against the brand reference;
  - UI language;
  - the browser console;
  - a grep of the logs for failure events, explaining every hit.
- **It also records** compile/build, test execution (with counts and skips) and startup **as separate checks**.
- **Screenshots** are committed in the repository: `docs/qa/<plan-name>/<gate>/NN-<screen>-<viewport>.png`, with a `README.md` listing each image, what it shows and pass/fail. No secrets or terminals in any image; synthetic data only.
- **Gate result.**
  - Pass → the gate is closed with evidence.
  - Fail → `Qn.x` fix tasks for the owners, the full gate is re-run, and the next phase is blocked.
- **UI tasks** also get a quick browser-CLI look at the touched screen before acceptance (AGENTS.md "manual QA after every task that affects the running app").

## 6. Demo video (final documentation)

After the last QA gate and before the PR:
1. **ffmpeg.** If `which ffmpeg` fails, install it with the system package manager. If sudo needs a password, ask the owner to run it (e.g. `! sudo apt-get install -y ffmpeg`). Record the version.
2. **Set the screen.** Start the needed servers from one build. Open a **headed** browser window at 1920 × 1080 on the X display (`$DISPLAY`). Keep everything else off screen: no terminal, no env files.
3. **Record** that screen area with `ffmpeg -f x11grab` at 30 fps while the browser CLI drives a scripted tour of the main flows, with pauses so each screen can be read.
4. **Encode** H.264, `yuv420p`, CRF about 28, `+faststart`; at most about 3 minutes and 25 MB, so it can be committed.
5. **Check** it with `ffprobe` (duration, resolution, codec), and watch it in full.
6. **Save** it to `docs/qa/<plan-name>/final/demo.mp4` with a README listing the scene timestamps.
7. **Link** it in the final PR body. Mention that the owner can upload it through the web UI if they want inline playback.
