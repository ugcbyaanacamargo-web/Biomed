import { Sandbox } from "@vercel/sandbox";

const OPENCODE_BIN="/home/vercel-sandbox/.opencode/bin/opencode";
const RUNTIME_NAME="biomed-tutor-runtime-v2";
const WORKDIR="/tmp/biomed-tutor";
const CLIENT_PATH=WORKDIR+"/client.mjs";
const DEFAULT_MODEL="muse-spark-1.3-contributor-free";
const SAFE_PERMISSION=JSON.stringify({"*":"ask","external_directory":"deny"});
const SERVER_PORT=4096;
const MODEL_DEADLINE_MS=12000;

const CLIENT_SOURCE=`
const [encodedPrompt,model,deadlineText,titleText]=process.argv.slice(2);
const prompt=Buffer.from(encodedPrompt||"", "base64url").toString("utf8");
const deadline=Math.max(3000,Math.min(30000,Number(deadlineText)||12000));
const base="http://127.0.0.1:4096";
let sessionId="";
const jsonHeaders={"content-type":"application/json"};
const timerController=new AbortController();
const timer=setTimeout(()=>timerController.abort(new Error("model deadline exceeded")),deadline);

async function request(path,options={}){
  const response=await fetch(base+path,{...options,signal:timerController.signal});
  const text=await response.text();
  if(!response.ok) throw new Error("OpenCode HTTP "+response.status+": "+text.slice(-600));
  return text?JSON.parse(text):null;
}

try{
  const session=await request("/session",{method:"POST",headers:jsonHeaders,body:JSON.stringify({title:String(titleText||"BIOMED Tutor").slice(0,80)})});
  sessionId=session?.id;
  if(!sessionId) throw new Error("OpenCode session id ausente");

  const result=await request("/session/"+encodeURIComponent(sessionId)+"/message",{
    method:"POST",
    headers:jsonHeaders,
    body:JSON.stringify({
      model:{providerID:"opencode",modelID:String(model||"muse-spark-1.3-contributor-free")},
      agent:"build",
      parts:[{type:"text",text:prompt}]
    })
  });

  const parts=Array.isArray(result?.parts)?result.parts:[];
  const content=parts.filter(p=>p?.type==="text"&&p.text).map(p=>p.text).join("\\n").trim();
  if(!content) throw new Error("OpenCode retornou resposta vazia");
  process.stdout.write(JSON.stringify({ok:true,content}));
}catch(error){
  if(sessionId){
    try{await fetch(base+"/session/"+encodeURIComponent(sessionId)+"/abort",{method:"POST"});}catch{}
  }
  process.stdout.write(JSON.stringify({ok:false,error:String(error?.message||error),timeout:timerController.signal.aborted}));
  process.exitCode=2;
}finally{
  clearTimeout(timer);
  if(sessionId){
    try{await fetch(base+"/session/"+encodeURIComponent(sessionId),{method:"DELETE"});}catch{}
  }
}
`;

async function installRuntime(sbx){
  const install=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","set -e; curl -fsSL https://opencode.ai/install | bash; mkdir -p "+WORKDIR]
  });
  if(install.exitCode!==0){
    throw new Error("Falha ao instalar OpenCode: "+(await install.stderr()).slice(-500));
  }
  await sbx.writeFiles([{path:CLIENT_PATH,content:Buffer.from(CLIENT_SOURCE)}]);
}

async function startServer(sbx){
  const health=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","curl -fsS --max-time 1 http://127.0.0.1:"+SERVER_PORT+"/global/health >/dev/null 2>&1"]
  });
  if(health.exitCode===0) return;

  await sbx.runCommand({
    cmd:OPENCODE_BIN,
    args:["serve","--hostname","127.0.0.1","--port",String(SERVER_PORT)],
    cwd:WORKDIR,
    detached:true
  });

  const ready=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","for i in 1 2 3 4 5 6 7 8; do curl -fsS --max-time 1 http://127.0.0.1:"+SERVER_PORT+"/global/health >/dev/null 2>&1 && exit 0; sleep .4; done; exit 1"]
  });
  if(ready.exitCode!==0) throw new Error("Servidor OpenCode não ficou pronto");
}

function cleanOutput(text){
  return String(text||"")
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g,"")
    .replace(/\r/g,"")
    .trim();
}

export async function runOpenCodeTutor({studentId,prompt,model=DEFAULT_MODEL,apiKey}){
  if(!apiKey) throw new Error("OPENCODE_API_KEY ausente");

  const sbx=await Sandbox.getOrCreate({
    name:RUNTIME_NAME,
    resume:true,
    runtime:"node24",
    timeout:30*60*1000,
    resources:{vcpus:1},
    env:{
      OPENCODE_API_KEY:apiKey,
      OPENCODE_PERMISSION:SAFE_PERMISSION,
      OPENCODE_DISABLE_DEFAULT_PLUGINS:"true",
      OPENCODE_DISABLE_CLAUDE_CODE:"true",
      OPENCODE_DISABLE_AUTOCOMPACT:"true"
    },
    onCreate:async sandbox=>installRuntime(sandbox),
    onResume:async sandbox=>startServer(sandbox)
  });

  const exists=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","test -x "+OPENCODE_BIN+" && test -f "+CLIENT_PATH]
  });
  if(exists.exitCode!==0) await installRuntime(sbx);

  await startServer(sbx);

  const safeId=String(studentId||"anon").replace(/[^a-zA-Z0-9]/g,"").slice(0,10)||"anon";
  const encoded=Buffer.from(String(prompt||"").slice(0,50000)).toString("base64url");
  const started=Date.now();

  const result=await sbx.runCommand({
    cmd:"node",
    args:[CLIENT_PATH,encoded,String(model||DEFAULT_MODEL),String(MODEL_DEADLINE_MS),"BIOMED "+safeId],
    cwd:WORKDIR
  });

  const stdout=cleanOutput(await result.stdout());
  const stderr=cleanOutput(await result.stderr());
  let payload=null;
  try{payload=JSON.parse(stdout)}catch{}

  if(result.exitCode!==0||!payload?.ok){
    const reason=payload?.error||stderr||stdout||"OpenCode falhou";
    const error=new Error(String(reason).slice(-900));
    error.code=payload?.timeout?"OPENCODE_MODEL_TIMEOUT":"OPENCODE_RUNTIME_ERROR";
    error.durationMs=Date.now()-started;
    throw error;
  }

  return {
    content:payload.content,
    model,
    sandbox:RUNTIME_NAME,
    runtime:"persistent-server",
    durationMs:Date.now()-started
  };
}

export {MODEL_DEADLINE_MS,RUNTIME_NAME};
