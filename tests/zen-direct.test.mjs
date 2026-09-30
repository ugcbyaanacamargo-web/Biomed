import test from "node:test";
import assert from "node:assert/strict";
import {callZen,endpointForModel,extractZenText} from "../api/_lib/opencode-direct.js";

test("Model IDs use the official Zen endpoint, not opencode/ prefix",()=>{
  assert.equal(endpointForModel("muse-spark-1.3-contributor-free"),"https://opencode.ai/zen/v1/responses");
  assert.equal(endpointForModel("nemotron-3-ultra-free"),"https://opencode.ai/zen/v1/chat/completions");
  assert.equal(endpointForModel("nemotron-3.5-lightning-free"),"https://opencode.ai/zen/v1/chat/completions");
  assert.equal(endpointForModel("mimo-v2.6-flash-free"),"https://opencode.ai/zen/v1/chat/completions");
  assert.throws(()=>endpointForModel("gpt-6-sol"),/não autorizado/);
  assert.throws(()=>endpointForModel("opencode/muse-spark-1.3-contributor-free"),/não autorizado/);
});

test("Extracts finished text from Responses and Chat Completions",()=>{
  assert.equal(extractZenText({output:[{type:"message",content:[{type:"output_text",text:'{"ok":true}'}]}]}),'{"ok":true}');
  assert.equal(extractZenText({choices:[{message:{content:'{"ok":true}'}}]}),'{"ok":true}');
  assert.throws(()=>extractZenText({output:[{type:"reasoning"}]}),/vazia/);
});

test("Direct Zen request carries only server-side key and prompt",async()=>{
  let call;
  const fetchImpl=async(url,options)=>{
    call={url,options};return{ok:true,status:200,json:async()=>({output:[{type:"message",content:[{type:"output_text",text:'{"screen":{"title":"Teste"},"blocks":[]}'}]}]})};
  };
  const data=await callZen({prompt:"Lição guiada",model:"muse-spark-1.3-contributor-free",apiKey:"CHAVE_DE_TESTE",fetchImpl});
  assert.equal(data.runtime,"zen-direct");
  assert.match(data.content,/Teste/);
  assert.equal(call.url,"https://opencode.ai/zen/v1/responses");
  assert.equal(JSON.parse(call.options.body).model,"muse-spark-1.3-contributor-free");
  assert.equal(JSON.parse(call.options.body).input,"Lição guiada");
  assert.equal(call.options.headers.Authorization,"Bearer CHAVE_DE_TESTE");
});

test("Chat-completions mode uses the corresponding official API",async()=>{
  let body;
  const fetchImpl=async(url,options)=>{
    assert.match(url,/chat\/completions$/);
    body=JSON.parse(options.body);
    return{ok:true,status:200,json:async()=>({choices:[{message:{content:"Olá, aluno."}}]})};
  };
  const d=await callZen({prompt:"Oi",model:"nemotron-3-ultra-free",apiKey:"TEST",fetchImpl});
  assert.equal(d.content,"Olá, aluno.");
  assert.equal(body.messages[0].role,"user");
});

test("403 is observable, not disguised as model slowness",async()=>{
  const fetchImpl=async()=>({ok:false,status:403,json:async()=>({error:"not permitted"})});
  await assert.rejects(
    callZen({prompt:"Oi",model:"muse-spark-1.3-contributor-free",apiKey:"TEST",fetchImpl}),
    e=>e.code==="ZEN_HTTP_403"&&e.durationMs>=0
  );
});
