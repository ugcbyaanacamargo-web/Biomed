import test from "node:test";
import assert from "node:assert/strict";
import {GROQ_MODEL,requireGroqModel,textFromGroq,callTutorAI} from "../api/_lib/groq.js";

test("locks Tutor to GPT-OSS 120B and rejects silent model changes",()=>{
  assert.equal(requireGroqModel(GROQ_MODEL),"openai/gpt-oss-120b");
  assert.throws(()=>requireGroqModel("openai/gpt-oss-20b"),e=>e.code==="AI_MODEL_NOT_ALLOWED");
  assert.throws(()=>requireGroqModel("openai/gpt-5"),e=>e.code==="AI_MODEL_NOT_ALLOWED");
});

test("reads valid assistant text and rejects empty or truncated text",()=>{
  assert.equal(textFromGroq({choices:[{message:{content:"O neurônio conduz o impulso."}}]}),"O neurônio conduz o impulso.");
  assert.throws(()=>textFromGroq({choices:[{message:{content:""}}]}),e=>e.code==="AI_EMPTY_RESPONSE");
  assert.throws(()=>textFromGroq({choices:[{finish_reason:"length",message:{content:"cortado"}}]}),e=>e.code==="AI_INCOMPLETE");
});

test("single HTTPS request goes directly to Groq with optional server-side browser search",async()=>{
  let url,options;
  const fetchImpl=async(u,o)=>{url=u;options=o;return{ok:true,json:async()=>({choices:[{message:{content:"{\"ok\":true}"}}]})}};
  const result=await callTutorAI({prompt:"Pesquise uma diretriz atual",apiKey:"TEST_SECRET",fetchImpl,enableBrowserSearch:true});
  const body=JSON.parse(options.body);
  assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
  assert.equal(options.headers.Authorization,"Bearer TEST_SECRET");
  assert.equal(body.model,GROQ_MODEL);
  assert.equal(body.stream,false);
  assert.deepEqual(body.tools,[{type:"browser_search"}]);
  assert.equal(result.runtime,"groq-direct");
});

test("normal tutoring request avoids browser-search latency when current web data is unnecessary",async()=>{
  let options;
  const fetchImpl=async(_u,o)=>{options=o;return{ok:true,json:async()=>({choices:[{message:{content:"Resposta"}}]})}};
  await callTutorAI({prompt:"Explique a fibra C",apiKey:"TEST",fetchImpl,enableBrowserSearch:false});
  assert.equal("tools" in JSON.parse(options.body),false);
});

test("HTTP 403 from Groq remains visible as an error",async()=>{
  await assert.rejects(callTutorAI({prompt:"Teste",apiKey:"TEST",fetchImpl:async()=>({ok:false,status:403,json:async()=>({error:{message:"forbidden"}})})}),e=>e.code==="AI_HTTP_403");
});
