import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const index=await readFile(new URL("../index.html",import.meta.url),"utf8");
const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
const tutor=await readFile(new URL("../api/tutor.js",import.meta.url),"utf8");
const zen=await readFile(new URL("../api/_lib/opencode-direct.js",import.meta.url),"utf8");
const server=await readFile(new URL("../server.js",import.meta.url),"utf8");
const config=await readFile(new URL("../opencode.json",import.meta.url),"utf8");
const visual=await readFile(new URL("../visual-tutor.js",import.meta.url),"utf8");

test("frontend has one student app instead of layered legacy apps",()=>{
  assert.match(index,/auth\.js/);
  assert.match(index,/study-platform\.js/);
  for(const old of ["student-app.js","adaptive-engine.js","browser-tutor.js","learning-bridge.js","app.js"])assert.doesNotMatch(index,new RegExp(old.replace(".","\\.")));
});

test("Tutor calls Zen directly on both hosts with no CLI or Railway proxy",()=>{
  assert.match(tutor,/callZen/);
  assert.doesNotMatch(tutor,/runOpenCodeLocalTutor|TUTOR_RAILWAY_URL|proxyTutorToRailway/);
  assert.match(zen,/https:\/\/opencode\.ai\/zen\/v1/);
  assert.doesNotMatch(server,/warmOpenCodeLocal/);
  assert.equal(pkg.dependencies["@vercel/sandbox"],undefined);
  assert.equal(pkg.dependencies["opencode-ai"],undefined);
});


test("visual tutor keeps immediate safe activity while cloud AI refines it",()=>{
  assert.match(visual,/localTutorPlan/);
  assert.match(visual,/renderPlan\(canvas,localPlan/);
});
