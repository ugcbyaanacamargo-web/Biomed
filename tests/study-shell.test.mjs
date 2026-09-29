import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const js=await readFile(new URL("../study-platform.js",import.meta.url),"utf8");
const css=await readFile(new URL("../study-shell.css",import.meta.url),"utf8");

test("authenticated shell has explicit separate sections",()=>{
  for(const t of ["Minha trilha","Tutor IA","Praticar","Provas e simulados","Meu progresso","Ranking","Biblioteca / Revisão"]) assert.ok(js.includes(t),t);
});

test("legacy long layout is hidden when guided app is active",()=>{
  assert.ok(css.includes("guided-study-active .layout"));
  assert.ok(js.includes("Continuar estudando"));
});
