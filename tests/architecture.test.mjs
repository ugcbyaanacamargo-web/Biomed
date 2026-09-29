import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";

const index=await readFile(new URL("../index.html",import.meta.url),"utf8");
const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
const tutor=await readFile(new URL("../api/tutor.js",import.meta.url),"utf8");
const zen=await readFile(new URL("../api/_lib/zen-client.js",import.meta.url),"utf8");
const visual=await readFile(new URL("../visual-tutor.js",import.meta.url),"utf8");

test("frontend has one student app instead of layered legacy apps",()=>{
  assert.match(index,/auth\.js/);
  assert.match(index,/study-platform\.js/);
  for(const old of ["student-app.js","adaptive-engine.js","browser-tutor.js","learning-bridge.js","app.js"])assert.doesNotMatch(index,new RegExp(old.replace(".","\\.")));
});

test("Tutor calls OpenCode Zen directly",()=>{
  assert.match(tutor,/zen-client/);
  assert.match(zen,/https:\/\/opencode\.ai\/zen\/v1\/responses/);
  assert.match(zen,/Authorization:"Bearer "/);
  assert.doesNotMatch(zen,/opencode serve|Sandbox|getOrCreate|spawn\(/);
});

test("runtime no longer installs coding-agent infrastructure",()=>{
  assert.equal(pkg.dependencies["opencode-ai"],undefined);
  assert.equal(pkg.dependencies["@vercel/sandbox"],undefined);
});

test("visual tutor keeps immediate safe activity while cloud AI refines it",()=>{
  assert.match(visual,/localTutorPlan/);
  assert.match(visual,/renderPlan\(canvas,localPlan/);
});
