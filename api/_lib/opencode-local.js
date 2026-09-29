import {spawn} from "node:child_process";
import {access} from "node:fs/promises";
import path from "node:path";

const PORT=4096;
const BASE="http://127.0.0.1:"+PORT;
const DEADLINE_MS=12000;
const BIN=path.resolve("node_modules/opencode-ai/bin/"+(process.platform==="win32"?"opencode.exe":"opencode"));

let startPromise=null;
let child=null;

const delay=ms=>new Promise(r=>setTimeout(r,ms));

async function healthy(){
  try{
    const res=await fetch(BASE+"/global/health",{signal:AbortSignal.timeout(1200)});
    return res.ok;
  }catch{return false}
}

async function ensureServer(apiKey){
  if(await healthy())return;
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    await access(BIN);
    const env={
      ...process.env,
      OPENCODE_API_KEY:apiKey,
      OPENCODE_PERMISSION:JSON.stringify({"*":"ask","external_directory":"deny"}),
      OPENCODE_DISABLE_DEFAULT_PLUGINS:"true",
      OPENCODE_DISABLE_CLAUDE_CODE:"true",
      OPENCODE_DISABLE_AUTOCOMPACT:"true"
    };
    child=spawn(BIN,["serve","--hostname","127.0.0.1","--port",String(PORT)],{
      cwd:process.cwd(),
      env,
      stdio:["ignore","pipe","pipe"]
    });
    child.stdout?.on("data",chunk=>console.info("opencode_server",String(chunk).trim().slice(0,600)));
    child.stderr?.on("data",chunk=>console.warn("opencode_server",String(chunk).trim().slice(0,600)));
    child.on("exit",(code,signal)=>{
      console.warn("opencode_server_exit",JSON.stringify({code,signal}));
      child=null;startPromise=null;
    });
    for(let i=0;i<30;i++){
      if(await healthy())return;
      await delay(300);
    }
    try{child?.kill("SIGTERM")}catch{}
    throw new Error("OpenCode local não ficou pronto");
  })();
  try{return await startPromise}
  catch(e){startPromise=null;throw e}
}

async function request(pathname,options,controller){
  const res=await fetch(BASE+pathname,{...options,signal:controller.signal});
  const text=await res.text();
  if(!res.ok)throw new Error("OpenCode HTTP "+res.status+": "+text.slice(-700));
  return text?JSON.parse(text):null;
}

export async function runOpenCodeLocalTutor({studentId,prompt,model,apiKey}){
  if(!apiKey)throw new Error("OPENCODE_API_KEY ausente");
  await ensureServer(apiKey);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error("model deadline exceeded")),DEADLINE_MS);
  let sessionId="";
  const started=Date.now();
  try{
    const session=await request("/session",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({title:"BIOMED "+String(studentId||"anon").slice(0,10)})
    },controller);
    sessionId=session?.id||"";
    if(!sessionId)throw new Error("OpenCode session id ausente");

    const result=await request("/session/"+encodeURIComponent(sessionId)+"/message",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        model:{providerID:"opencode",modelID:String(model||"muse-spark-1.3-contributor-free")},
        agent:"build",
        parts:[{type:"text",text:String(prompt||"").slice(0,50000)}]
      })
    },controller);

    const parts=Array.isArray(result?.parts)?result.parts:[];
    const content=parts.filter(p=>p?.type==="text"&&p.text).map(p=>p.text).join("\n").trim();
    if(!content)throw new Error("OpenCode retornou resposta vazia");
    return{content,model,runtime:"railway-persistent-opencode",durationMs:Date.now()-started};
  }catch(error){
    if(sessionId){
      try{await fetch(BASE+"/session/"+encodeURIComponent(sessionId)+"/abort",{method:"POST"})}catch{}
    }
    const e=new Error(String(error?.message||error));
    e.code=controller.signal.aborted?"OPENCODE_MODEL_TIMEOUT":"OPENCODE_RUNTIME_ERROR";
    e.durationMs=Date.now()-started;
    throw e;
  }finally{
    clearTimeout(timer);
    if(sessionId){
      try{await fetch(BASE+"/session/"+encodeURIComponent(sessionId),{method:"DELETE"})}catch{}
    }
  }
}

export const RAILWAY_OPENCODE={port:PORT,deadlineMs:DEADLINE_MS,binary:BIN};
