import test from "node:test";
import assert from "node:assert/strict";
import {FREE_MODEL,requireFreeModel,textFromGateway,callTutorAI} from "../api/_lib/ai-gateway.js";
test("never upgrades free model to billable SKU",()=>{
  assert.equal(requireFreeModel(FREE_MODEL),"inclusionai/ling-3.1-flash-free");
  assert.throws(()=>requireFreeModel("inclusionai/ling-3.1-flash"),e=>e.code==="AI_MODEL_NOT_FREE");
  assert.throws(()=>requireFreeModel("openai/gpt-5"),e=>e.code==="AI_MODEL_NOT_FREE");
});
test("reads valid assistant text and rejects empty or truncated text",()=>{
  assert.equal(textFromGateway({choices:[{message:{content:"O neurônio conduz o impulso."}}]}),"O neurônio conduz o impulso.");
  assert.throws(()=>textFromGateway({choices:[{message:{content:""}}]}),e=>e.code==="AI_EMPTY_RESPONSE");
  assert.throws(()=>textFromGateway({choices:[{finish_reason:"length",message:{content:"cortado"}}]}),e=>e.code==="AI_INCOMPLETE");
});
test("single HTTPS request uses only approved free model and server token",async()=>{
  let url,options;
  const fetchImpl=async(u,o)=>{url=u;options=o;return{ok:true,json:async()=>({choices:[{message:{content:"{\"ok\":true}"}}]})}};
  const result=await callTutorAI({prompt:"Descreva a fibra C",apiKey:"TEST_SECRET",fetchImpl});
  assert.equal(url,"https://ai-gateway.vercel.sh/v1/chat/completions");
  assert.equal(options.headers.Authorization,"Bearer TEST_SECRET");
  assert.equal(JSON.parse(options.body).model,FREE_MODEL);
  assert.equal(JSON.parse(options.body).stream,false);
  assert.equal(result.runtime,"vercel-ai-gateway");
});
test("HTTP 403 from provider remains visible as an error",async()=>{
  await assert.rejects(callTutorAI({prompt:"Teste",apiKey:"TEST",fetchImpl:async()=>({ok:false,status:403})}),e=>e.code==="AI_HTTP_403");
});
