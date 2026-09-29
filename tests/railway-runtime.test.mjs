import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
const server=await readFile(new URL("../server.js",import.meta.url),"utf8");
const runtime=await readFile(new URL("../api/_lib/opencode-runtime.js",import.meta.url),"utf8");
const local=await readFile(new URL("../api/_lib/opencode-local.js",import.meta.url),"utf8");

test("Railway has a persistent Node entrypoint",()=>{
  assert.equal(pkg.scripts.start,"node server.js");
  assert.match(server,/0\.0\.0\.0/);
  assert.match(server,/process\.env\.PORT/);
  assert.match(server,/\/api\/tutor/);
});

test("Railway Tutor uses local persistent OpenCode instead of Vercel Sandbox",()=>{
  assert.match(runtime,/RAILWAY_ENVIRONMENT/);
  assert.match(runtime,/opencode-local/);
  assert.match(local,/railway-persistent-opencode/);
  assert.ok(local.includes("node_modules/.bin/"));\n  assert.match(local,/spawn\(BIN/);
  assert.match(local,/\["serve","--hostname"/);
  assert.match(local,/DEADLINE_MS=12000/);
});

test("OpenCode binary is installed as an application dependency",()=>{
  assert.ok(pkg.dependencies["opencode-ai"]);
});
