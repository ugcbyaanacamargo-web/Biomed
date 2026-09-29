import {spawn} from "node:child_process";
import {access} from "node:fs/promises";
import path from "node:path";

const PORT=4096;
const BASE="http://127.0.0.1:"+PORT;
const DEADLINE_MS=Math.max(3000,Math.min(45000,Number(process.env.OPENCODE_DEADLINE_MS)||12000));
const BIN=path.resolve("node_modules/.bin/"+(process.platform==="win32"?"opencode.cmd":"opencode"));\nconst SERVER_USER=String(process.env.OPENCODE_SERVER_USERNAME||"opencode");\nconst SERVER_PASSWORD=String(process.env.OPENCODE_SERVER_PASSWORD||"");

let startPromise=null;
let child=null;

const delay=ms=>new Promise(r=>setTimeout(r,ms));

function serverHeaders(extra={}){
  if(!SERVER_PASSWORD)return extra;
  const token=Buffer.from(SERVER_USER+":"+SERVER_PASSWORD).toString("base64");
  return{...extra,Authorization:"Basic "+token};
}
async function healthy(){
  for(const pathname of ["/global/health","/api/health"]){
    try{
      const res=await fetch(BASE+pathname,{headers:serverHeaders(),signal:AbortSignal.timeout(1200)});
      if(res.ok)return true;
    }catch{}
  }
  return false;
}

async function ensureServer(apiKey){
  if(await healthy())return;
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    await access(BIN);
    const env={
      ...process.env,
      OPENCODE_API_KEY:apiKey,
      OPENCODE_PERMISSION:JSON.stringify({"*":"deny"}),
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
  const headers=serverHeaders(options?.headers||{});
  const res=await fetch(BASE+pathname,{...options,headers,signal:controller.signal});
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
        agent:"biomed-tutor",
        parts:[{type:"text",text:String(prompt||"").slice(0,50000)}]
      })
    },controller);

    const parts=Array.isArray(result?.parts)?result.parts:[];
    const content=parts.filter(p=>p?.type==="text"&&p.text).map(p=>p.text).join("\n").trim();
    if(!content)throw new Error("OpenCode retornou resposta vazia");
    return{content,model,runtime:"railway-persistent-opencode",durationMs:Date.now()-started};
  }catch(error){
    if(sessionId){
      try{await fetch(BASE+"/session/"+encodeURIComponent(sessionId)+"/abort",{method:"POST",headers:serverHeaders()})}catch{}
    }
    const e=new Error(String(error?.message||error));
    e.code=controller.signal.aborted?"OPENCODE_MODEL_TIMEOUT":"OPENCODE_RUNTIME_ERROR";
    e.durationMs=Date.now()-started;
    throw e;
  }finally{
    clearTimeout(timer);
    if(sessionId){
      try{await fetch(BASE+"/session/"+encodeURIComponent(sessionId),{method:"DELETE",headers:serverHeaders()})}catch{}
    }
  }
}

export async function warmOpenCodeLocal(apiKey){if(!apiKey)throw new Error("OPENCODE_API_KEY ausente");await ensureServer(apiKey);return true}\n\nexport const RAILWAY_OPENCODE={port:PORT,deadlineMs:DEADLINE_MS,binary:BIN,agent:"biomed-tutor"};
