import { Sandbox } from "@vercel/sandbox";

const OPENCODE_BIN="/home/vercel-sandbox/.opencode/bin/opencode";
const DEFAULT_MODEL="muse-spark-1.3-contributor-free";
const SAFE_PERMISSION=JSON.stringify({"*":"ask","external_directory":"deny"});

async function setupSandbox(sbx){
  const install=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","curl -fsSL https://opencode.ai/install | bash && mkdir -p /tmp/biomed-tutor"]
  });
  if(install.exitCode!==0){
    throw new Error("Falha ao instalar OpenCode: "+(await install.stderr()).slice(-500));
  }
}

function cleanOutput(text){
  return String(text||"")
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g,"")
    .replace(/\r/g,"")
    .trim();
}

export async function runOpenCodeTutor({studentId,prompt,model=DEFAULT_MODEL,apiKey}){
  if(!apiKey) throw new Error("OPENCODE_API_KEY ausente");
  const safeId=String(studentId||"anon").replace(/[^a-zA-Z0-9]/g,"").slice(0,16)||"anon";
  const name=("biomed-tutor-"+safeId).toLowerCase();

  const sbx=await Sandbox.getOrCreate({
    name,
    runtime:"node24",
    timeout:15*60*1000,
    resources:{vcpus:1},
    env:{
      OPENCODE_API_KEY:apiKey,
      OPENCODE_PERMISSION:SAFE_PERMISSION,
      OPENCODE_DISABLE_DEFAULT_PLUGINS:"true",
      OPENCODE_DISABLE_CLAUDE_CODE:"true",
      OPENCODE_DISABLE_AUTOCOMPACT:"true"
    },
    onCreate:async sandbox=>setupSandbox(sandbox)
  });

  const ensure=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","mkdir -p /tmp/biomed-tutor; test -x /home/vercel-sandbox/.opencode/bin/opencode || curl -fsSL https://opencode.ai/install | bash"]
  });
  if(ensure.exitCode!==0){
    throw new Error("Falha ao preparar OpenCode: "+(await ensure.stderr()).slice(-500));
  }

  const result=await sbx.runCommand({
    cmd:OPENCODE_BIN,
    args:[
      "--pure",
      "run",
      "--model","opencode/"+model,
      "--agent","build",
      "--format","default",
      String(prompt||"").slice(0,70000)
    ],
    cwd:"/tmp/biomed-tutor"
  });

  const stdout=cleanOutput(await result.stdout());
  const stderr=cleanOutput(await result.stderr());
  if(result.exitCode!==0){
    throw new Error("OpenCode falhou ("+result.exitCode+"): "+(stderr||stdout).slice(-900));
  }
  if(!stdout) throw new Error("OpenCode retornou resposta vazia");
  return {content:stdout,model,sandbox:name};
}
