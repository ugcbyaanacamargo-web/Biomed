import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
const src=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const index=await src("index.html"),tutor=await src("api/tutor.js"),groq=await src("api/_lib/groq.js");
const server=await src("server.js"),visual=await src("visual-tutor.js"),pkg=JSON.parse(await src("package.json"));

test("single student app and no legacy overlapping portal",()=>{
  assert.match(index,/auth\.js/);assert.match(index,/study-platform\.js/);
  assert.match(index,/biomed-restoring-session/);
  for(const old of ["student-app.js","adaptive-engine.js","browser-tutor.js","learning-bridge.js","app.js"])assert.ok(!index.includes('src="/'+old+'"'));
});

test("Tutor calls GPT-OSS 120B directly on Groq without OpenCode, Sandbox, Railway or Vercel AI Gateway",async()=>{
  assert.match(tutor,/callTutorAI/);
  assert.match(groq,/api\.groq\.com\/openai\/v1\/chat\/completions/);
  assert.match(groq,/openai\/gpt-oss-120b/);
  assert.match(tutor,/GROQ_API_KEY/);
  assert.doesNotMatch(tutor,/VERCEL_OIDC_TOKEN|x-vercel-oidc-token|AI_GATEWAY_API_KEY/);
  assert.match(groq,/browser_search/);
  for(const old of ["runOpenCodeLocalTutor","TUTOR_RAILWAY_URL","proxyTutorToRailway","opencode serve"])assert.ok(!tutor.includes(old));
  assert.ok(!server.includes("warmOpenCodeLocal"));
  assert.ok(!("opencode-ai" in pkg.dependencies));
  for(const old of ["api/_lib/opencode-local.js","api/_lib/model-benchmark.js","api/_lib/ai-gateway.js","opencode.json"]){
    await assert.rejects(access(new URL("../"+old,import.meta.url)));
  }
});

test("visual tutor is immediate and visibly distinguishes real Groq AI from local fallback",()=>{
  assert.match(visual,/localTutorPlan/);
  assert.match(visual,/renderPlan\(canvas,localPlan/);
  assert.match(visual,/result\.provider==="groq"/);
});
