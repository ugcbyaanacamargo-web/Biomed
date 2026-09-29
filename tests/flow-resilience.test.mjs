import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const app=await readFile(new URL("../study-platform.js",import.meta.url),"utf8");

test("Practice has instant local content while AI adapts in background",()=>{
  assert.match(app,/renderLocalPractice/);
  assert.match(app,/Adaptando com IA|IA ajustando/i);
});

test("Exam landing exposes explicit assessment choices before starting",()=>{
  assert.match(app,/assessment-choice/);
  assert.match(app,/Começar prova|Iniciar prova/);
  assert.match(app,/Simulado cumulativo/);
});

test("Progress screen includes score, XP, accuracy and attempt history",()=>{
  for(const label of ["Learning Score","XP","Precisão","Histórico de avaliações"]){
    assert.ok(app.includes(label),label);
  }
});
