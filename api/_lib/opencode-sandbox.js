import { Sandbox } from "@vercel/sandbox";

const OPENCODE_BIN="/home/vercel-sandbox/.opencode/bin/opencode";
const DEFAULT_MODEL="muse-spark-1.3-contributor-free";

const TUTOR_RULES=[
  "Você é o Tutor BIOMED, professor virtual de fisiologia sensorial e modulação da dor.",
  "Você existe somente para ensinar, testar, simular e avaliar respostas do aluno.",
  "Nunca altere arquivos, repositórios, GitHub, Vercel, banco de dados, configurações ou credenciais.",
  "Nunca execute shell, edição, subagentes ou acesso web em nome do aluno.",
  "Nunca solicite CPF, documento, senha, token, chave ou endereço.",
  "Não diagnostique doenças. Para saúde pessoal, explique apenas conceitos gerais.",
  "Faça o aluno raciocinar e adapte a dificuldade ao nível e ao domínio.",
  "Ao corrigir resposta livre, avalie mecanismo e cadeia causal, não somente palavras-chave.",
  "Diga o que foi correto, o que faltou, o erro conceitual e proponha nova pergunta focada na lacuna.",
  "Em múltipla escolha, use distratores plausíveis e uma única melhor resposta.",
  "Em simulações, peça previsão antes de explicar o resultado."
].join("\\n");

function opencodeConfig(model){
  return JSON.stringify({
    $schema:"https://opencode.ai/config.json",
    model:"opencode/"+model,
    agent:{
      tutor:{
        description:"Tutor BIOMED educacional somente leitura",
        mode:"primary",
        model:"opencode/"+model,
        prompt:"{file:./TUTOR_RULES.md}",
        permission:{
          "*":"deny",
          read:"allow",
          glob:"allow",
          grep:"allow",
          list:"allow",
          edit:"deny",
          bash:"deny",
          task:"deny",
          webfetch:"deny",
          websearch:"deny",
          external_directory:"deny"
        }
      }
    }
  },null,2);
}

async function setupSandbox(sbx,model){
  const install=await sbx.runCommand({
    cmd:"bash",
    args:["-lc","curl -fsSL https://opencode.ai/install | bash"]
  });
  if(install.exitCode!==0){
    throw new Error("Falha ao instalar OpenCode: "+(await install.stderr()).slice(-500));
  }
  await sbx.writeFiles([
    {path:"/vercel/sandbox/opencode.json",content:Buffer.from(opencodeConfig(model))},
    {path:"/vercel/sandbox/TUTOR_RULES.md",content:Buffer.from(TUTOR_RULES)}
  ]);
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
    env:{OPENCODE_API_KEY:apiKey},
    onCreate:async sandbox=>setupSandbox(sandbox,model)
  });

  await sbx.writeFiles([
    {path:"/vercel/sandbox/opencode.json",content:Buffer.from(opencodeConfig(model))},
    {path:"/vercel/sandbox/TUTOR_RULES.md",content:Buffer.from(TUTOR_RULES)}
  ]);

  const result=await sbx.runCommand({
    cmd:OPENCODE_BIN,
    args:[
      "run",
      "--model","opencode/"+model,
      "--agent","tutor",
      "--format","default",
      String(prompt||"").slice(0,70000)
    ],
    cwd:"/vercel/sandbox"
  });

  const stdout=cleanOutput(await result.stdout());
  const stderr=cleanOutput(await result.stderr());
  if(result.exitCode!==0){
    throw new Error("OpenCode falhou ("+result.exitCode+"): "+(stderr||stdout).slice(-900));
  }
  if(!stdout) throw new Error("OpenCode retornou resposta vazia");
  return {content:stdout,model,sandbox:name};
}
