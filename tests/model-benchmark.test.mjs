import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const server=await readFile(new URL("../server.js",import.meta.url),"utf8");
const bench=await readFile(new URL("../api/_lib/model-benchmark.js",import.meta.url),"utf8");

test("cloud benchmark stays opt-in",()=>{
  assert.match(server,/BIOMED_MODEL_BENCHMARK/);
  assert.match(server,/runModelBenchmark/);
});

test("benchmark compares direct free models with the same prompt",()=>{
  assert.match(bench,/muse-spark-1\.3-contributor-free/);
  assert.match(bench,/nemotron-3\.5-lightning-free/);
  assert.match(bench,/runZenTutor/);
  assert.match(bench,/Compare Aβ, Aδ e C em três frases\./);
});
