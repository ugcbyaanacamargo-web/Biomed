import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const server=await readFile(new URL("../server.js",import.meta.url),"utf8");
const bench=await readFile(new URL("../api/_lib/model-benchmark.js",import.meta.url),"utf8");

test("startup benchmark is opt-in only",()=>{
  assert.ok(server.includes("BIOMED_MODEL_BENCHMARK"));
  assert.ok(server.includes("runModelBenchmark"));
});

test("benchmark compares Muse and Nemotron with the same prompt",()=>{
  assert.ok(bench.includes("muse-spark-1.3-contributor-free"));
  assert.ok(bench.includes("nemotron-3-ultra-free"));
  assert.ok(bench.includes("Compare Aβ, Aδ e C em três frases."));
  assert.ok(bench.includes("model_benchmark"));
});
