import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const runtime=await readFile(new URL("../api/_lib/opencode-sandbox.js",import.meta.url),"utf8");
const visual=await readFile(new URL("../visual-tutor.js",import.meta.url),"utf8");

test("Tutor runtime uses a shared persistent OpenCode server instead of opencode run per request",()=>{
  assert.match(runtime,/biomed-tutor-runtime-v2/);
  assert.match(runtime,/opencode serve/);
  assert.match(runtime,/detached:\s*true/);
  assert.doesNotMatch(runtime,/args:\s*\[\s*"--pure"\s*,\s*"run"/s);
});

test("Tutor runtime enforces a model deadline below the Vercel function timeout",()=>{
  assert.match(runtime,/MODEL_DEADLINE_MS/);
  assert.match(runtime,/abort/);
});

test("Visual tutor provides immediate content and clears submitted input",()=>{
  assert.match(visual,/localTutorPlan/);
  assert.match(visual,/ta\.value\s*=\s*""/);
  assert.match(visual,/performance\.now/);
});
