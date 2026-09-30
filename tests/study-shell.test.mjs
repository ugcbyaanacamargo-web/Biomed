import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const js=await readFile(new URL("../study-platform.js",import.meta.url),"utf8");
const css=await readFile(new URL("../study-shell.css",import.meta.url),"utf8");

test("authenticated shell has explicit separate sections",()=>{
  for(const t of ["Minha trilha","Tutor IA","Praticar","Provas e simulados","Meu progresso","Ranking","Biblioteca / Revisão"]) assert.ok(js.includes(t),t);
});

test("study UI has no legacy layout hiding rules",()=>{
  assert.ok(!css.includes("guided-study-active .layout"));
  assert.ok(!css.includes("guided-study-active .topbar"));
  assert.ok(js.includes("Continuar estudando"));
});

test('restored sessions do not show the login screen while loading', async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const auth=await readFile(new URL('../auth.js',import.meta.url),'utf8');
  assert.ok(html.includes('biomed-restoring-session'));
  assert.ok(html.includes('biomedBoot'));
  assert.ok(html.indexOf('localStorage.getItem(')<html.indexOf('<main id="authGate"'));
  assert.ok(js.includes("classList.add('biomed-ready')"));
  assert.ok(auth.includes('classList.remove("biomed-restoring-session","biomed-ready")'));
});
