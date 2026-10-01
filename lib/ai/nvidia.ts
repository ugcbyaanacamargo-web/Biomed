import {z} from "zod";
import {richTutorTurnSchema,type RichTutorTurn} from "./tutor-schema";
import {buildSystemPrompt,recentModelMessages,type TutorContext} from "./context-builder";
import {sanitizeTurn} from "./learning";
import {searchBiomedicalSources,type BiomedicalSource} from "./web-research";

export const NVIDIA_MODEL="nvidia/nemotron-3.5-lightning-30b-a3b";
const ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions";
const TIMEOUT_MS=24000;

type Usage={prompt_tokens?:number;completion_tokens?:number;total_tokens?:number};
type NvidiaResponse={
  choices?:Array<{message?:{content?:string|null};finish_reason?:string}>;
  usage?:Usage;
  error?:{message?:string};
  message?:string;
};

const RICH_JSON_CONTRACT=`
Retorne SOMENTE um objeto JSON válido, sem markdown externo e sem texto antes/depois.
Formato obrigatório:
{
  "schemaVersion": 1,
  "message": "resposta natural ao aluno",
  "blocks": [0 a 8 blocos],
  "learning": {
    "mode": "diagnose|teach|practice|review|assessment",
    "currentGoal": "texto curto",
    "nextGoal": "texto curto",
    "progress": 0..100,
    "objectives": [{"id":"ID_CURRICULO","mastery":0..100,"confidence":0..1}],
    "mastered": ["ID_CURRICULO"],
    "struggling": ["ID_CURRICULO"],
    "misconceptions": ["texto curto"]
  },
  "conversation": {
    "suggestedTitle": "título com até 80 caracteres",
    "memorySummary": "resumo pedagógico útil e sem dados pessoais",
    "shouldSummarize": false
  }
}

Tipos permitidos em blocks e campos:
- {"type":"markdown","content":"..."}
- {"type":"callout","tone":"info|key|success|warning","title":"...","body":"..."}
- {"type":"diagram","variant":"neural_path|gate_control|concept_map|fiber_structure","title":"...","caption":"...","nodes":[{"id":"id","label":"...","kind":"receptor|fiber|nerve|spinal_cord|brainstem|thalamus|cortex|interneuron|synapse|concept|body"}],"edges":[{"from":"id","to":"id","label":"..."}]}
- {"type":"comparison","title":"...","columns":[{"title":"...","subtitle":"...","items":[{"label":"...","value":"...","emphasis":false}]}]}
- {"type":"steps","title":"...","items":[{"title":"...","description":"..."}]}
- {"type":"timeline","title":"...","items":[{"label":"...","description":"..."}]}
- {"type":"table","title":"...","columns":["..."],"rows":[["...","..."]]}
- {"type":"flashcards","title":"...","cards":[{"front":"...","back":"..."}]}
- {"type":"choice","id":"id","question":"...","options":[{"label":"...","value":"id"}],"multiple":false}
- {"type":"true_false","id":"id","statement":"..."}
- {"type":"short_answer","id":"id","question":"...","placeholder":"..."}
- {"type":"case","title":"...","scenario":"...","question":"..."}
- {"type":"sequence","id":"id","instruction":"...","items":[{"label":"...","value":"id"}]}
- {"type":"progress","title":"...","items":[{"label":"...","value":0..100}]}
- {"type":"sources","items":[{"title":"...","url":"https://...","domain":"..."}]}
- {"type":"suggestions","items":[{"label":"...","value":"..."}]}

Regras: ids usam apenas letras/números/_/-. Nunca gere HTML, JSX, JavaScript ou SVG bruto.
`;

function assertConfigured(){
  if(!process.env.NVIDIA_API_KEY)throw Object.assign(new Error("NVIDIA_API_KEY ausente"),{status:503});
  const configured=String(process.env.BIOMED_AI_MODEL||NVIDIA_MODEL).trim();
  if(configured!==NVIDIA_MODEL)throw Object.assign(new Error("Modelo BIOMED não autorizado"),{status:503});
}

function usageNumbers(usage?:Usage){
  return{
    inputTokens:Number(usage?.prompt_tokens||0)||undefined,
    outputTokens:Number(usage?.completion_tokens||0)||undefined
  };
}

async function callNvidia(messages:Array<{role:string;content:string}>,maxTokens=3000):Promise<NvidiaResponse>{
  assertConfigured();
  const response=await fetch(ENDPOINT,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type":"application/json",
      Accept:"application/json"
    },
    body:JSON.stringify({
      model:NVIDIA_MODEL,
      messages,
      temperature:0.3,
      top_p:0.9,
      max_tokens:maxTokens,
      response_format:{type:"json_object"},
      chat_template_kwargs:{enable_thinking:false},
      stream:false
    }),
    signal:AbortSignal.timeout(TIMEOUT_MS),
    cache:"no-store"
  });

  const raw=await response.text();
  let data:NvidiaResponse={};
  try{data=raw?JSON.parse(raw) as NvidiaResponse:{}}catch{}
  if(!response.ok){
    const providerMessage=String(data.error?.message||data.message||`NVIDIA HTTP ${response.status}`);
    if(response.status===429){
      throw Object.assign(new Error("O endpoint gratuito da IA atingiu um limite temporário. Sua mensagem ficou salva; tente novamente em alguns instantes."),{
        status:429,providerMessage,retryAfter:response.headers.get("retry-after")
      });
    }
    throw Object.assign(new Error(providerMessage),{status:response.status,providerMessage});
  }
  return data;
}

function assistantText(data:NvidiaResponse){
  const choice=data.choices?.[0];
  if(choice?.finish_reason==="length")throw new Error("Resposta da IA foi cortada pelo limite");
  const content=choice?.message?.content;
  if(typeof content!=="string"||!content.trim())throw new Error("Resposta vazia da NVIDIA");
  return content.trim();
}

function parseTurn(content:string){
  let raw=content.trim().replace(/^\`\`\`json\s*/i,"").replace(/\s*\`\`\`$/,"");
  try{
    return richTutorTurnSchema.parse(JSON.parse(raw));
  }catch(error){
    return {raw,error} as const;
  }
}

async function validateOrRepair(content:string,context:TutorContext){
  const first=parseTurn(content);
  if(!("error" in first))return sanitizeTurn(first);

  const issues=first.error instanceof z.ZodError
    ? first.error.issues.slice(0,8).map(issue=>`${issue.path.join(".")}: ${issue.message}`).join("\n")
    : "JSON inválido";

  const repaired=await callNvidia([
    {role:"system",content:`${buildSystemPrompt(context)}

Você é um reparador de JSON. Corrija o objeto para obedecer EXATAMENTE ao contrato abaixo, preservando o sentido pedagógico. Retorne somente JSON.
${RICH_JSON_CONTRACT}`},
    {role:"user",content:`OBJETO INVÁLIDO:
${String(first.raw).slice(0,18000)}

ERROS DE VALIDAÇÃO:
${issues}`}
  ],3200);

  const second=parseTurn(assistantText(repaired));
  if("error" in second)throw Object.assign(new Error("Resposta estruturada inválida da IA"),{status:502});
  return sanitizeTurn(second);
}

function baseMessages(context:TutorContext,extraSystem=""){
  return[
    {role:"system",content:`${buildSystemPrompt(context)}

${RICH_JSON_CONTRACT}
${extraSystem}`},
    ...recentModelMessages(context)
  ];
}

export async function generateStructuredTutorTurn(context:TutorContext){
  const data=await callNvidia(baseMessages(context),3200);
  const turn=await validateOrRepair(assistantText(data),context);
  return{turn,usage:usageNumbers(data.usage),provider:"nvidia" as const,model:NVIDIA_MODEL};
}

function sourceContext(sources:BiomedicalSource[]){
  return sources.map((source,index)=>`[${index+1}] ${source.title}
Ano: ${source.year||"não informado"}
Autores: ${source.authors||"não informado"}
URL: ${source.url}
Resumo: ${source.abstract||"(sem resumo disponível)"}`).join("\n\n");
}

export async function generateResearchTutorTurn(context:TutorContext,query:string){
  const sources=await searchBiomedicalSources(query);
  if(!sources.length){
    throw Object.assign(new Error("Não encontrei literatura biomédica atual suficiente para responder com fontes agora."),{status:503});
  }

  const data=await callNvidia(baseMessages(context,`
Este turno depende de informação atual. Use SOMENTE as fontes biomédicas recuperadas abaixo para afirmações atuais. Não invente estudos, autores, datas ou URLs. Quando houver incerteza, diga explicitamente.

FONTES RECUPERADAS:
${sourceContext(sources)}
`),3200);

  const parsed=await validateOrRepair(assistantText(data),context);
  const trustedSources={
    type:"sources" as const,
    items:sources.map(source=>({title:source.title,url:source.url,domain:source.domain}))
  };
  const turn:RichTutorTurn={
    ...parsed,
    blocks:[...parsed.blocks.filter(block=>block.type!=="sources"),trustedSources].slice(0,8)
  };
  return{turn,usage:usageNumbers(data.usage),provider:"nvidia" as const,model:NVIDIA_MODEL};
}
