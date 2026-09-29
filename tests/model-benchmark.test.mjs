import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const server=await readFile(new URL("../server.js",import.meta.url),"utf8");
const bench=await readFile(new URL("../api/_lib/model-benchmark.js",import.meta.url),"utf8");

test("cloud benchmark stays opt-in",()=>{
  assert.match(server,/BIOMED_MODEL_BENCHMARK/);
  assert.match(server,/runModelBenchmark/);
});

test("benchmark compares free direct models using the Tutor structured-output shape",()=>{
  for(const model of ["muse-spark-1.3-contributor-free","nemotron-3.5-lightning-free","mimo-v2.6-flash-free","ling-3.0-flash-fin-free"])assert.ok(bench.includes(model),model);
  assert.match(bench,/runZenTutor/);
  assert.match(bench,/validJson/);
  assert.match(bench,/Responda SOMENTE JSON válido/);
});
