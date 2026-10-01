import {z} from "zod";
import {learningUpdateSchema,richBlockSchema,richTutorTurnSchema,type RichTutorTurn} from "./tutor-schema";
import {buildSystemPrompt,recentModelMessages,type TutorContext} from "./context-builder";
import {sanitizeTurn} from "./learning";
import {searchBiomedicalSources,type BiomedicalSource} from "./web-research";

export const NVIDIA_MODEL="google/diffusiongemma-26b-a4b-it";
const ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions";
const TIMEOUT_MS=9000;
const MAX_TOKENS=650;

type Usage={prompt_tokens?:number;completion_tokens?:number;total_tokens?:number};
type NvidiaResponse={
  choices?:Array<{message?:{content?:string|null};finish_reason?:string}>;
  usage?:Usage;
  error?:{message?:string};
  message?:string;
};

const RICH_JSON_CONTRACT=`
Retorne SOMENTE JSON:
{"schemaVersion":1,"message":"texto curto","blocks":[],"learning":{"mode":"diagnose|teach|practice|review|assessment","currentGoal":"...","nextGoal":"...","progress":0,"objectives":[],"mastered":[],"struggling":[],"misconceptions":[]},"conversation":{"suggestedTitle":"...","memorySummary":"...","shouldSummarize":false}}
Use no máximo 3 blocks. Priorize:
- diagram: {"type":"diagram","variant":"neural_path|gate_control|concept_map|fiber_structure","title":"...","caption":"...","nodes":[{"id":"a","label":"...","kind":"receptor|fiber|nerve|spinal_cord|brainstem|thalamus|cortex|interneuron|synapse|concept|body"}],"edges":[{"from":"a","to":"b","label":"..."}]}
- choice: {"type":"choice","id":"q1","question":"...","options":[{"label":"...","value":"..."}],"multiple":false}
- steps: {"type":"steps","title":"...","items":[{"title":"...","description":"..."}]}
- comparison: {"type":"comparison","title":"...","columns":[{"title":"...","subtitle":"...","items":[{"label":"...","value":"...","emphasis":false}]}]}
- callout: {"type":"callout","tone":"info|key|success|warning","title":"...","body":"..."}
- markdown: {"type":"markdown","content":"..."}
Se uma explicação simples bastar, blocks pode ser [].
`;

function assertConfigured(){
  if(!process.env.NVIDIA_API_KEY)throw Object.assign(new Error("NVIDIA_API_KEY ausente"),{status:503});
}

function usageNumbers(usage?:Usage){
  return{
    inputTokens:Number(usage?.prompt_tokens||0)||undefined,
    outputTokens:Number(usage?.completion_tokens||0)||undefined
  };
}

export function cleanJsonSchema(schema:unknown):unknown{
  if(Array.isArray(schema))return schema.map(cleanJsonSchema);
  if(!schema||typeof schema!=="object")return schema;
  const source=schema as Record<string,unknown>;
  const cleaned:Record<string,unknown>={};
  for(const [key,value] of Object.entries(source)){
    if(key==="$schema"||key==="format")continue;
    cleaned[key]=cleanJsonSchema(value);
  }
  return cleaned;
}

const TUTOR_JSON_SCHEMA=cleanJsonSchema(
  z.toJSONSchema(richTutorTurnSchema,{target:"draft-2020-12"})
);

async function callNvidia(messages:Array<{role:string;content:string}>):Promise<NvidiaResponse>{
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
      temperature:0.2,
      top_p:0.9,
      max_tokens:MAX_TOKENS,
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"biomed_tutor_turn",
          schema:TUTOR_JSON_SCHEMA
        }
      },
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
  if(choice?.finish_reason==="length")throw Object.assign(new Error("Resposta da IA excedeu o limite compacto"),{status:502});
  const content=choice?.message?.content;
  if(typeof content!=="string"||!content.trim())throw new Error("Resposta vazia da NVIDIA");
  return content.trim();
}

function extractJsonObject(content:string){
  const normalized=content
    .replace(/<\|[^|>]+\|>/g,"")
    .replace(/```json/gi,"")
    .replace(/```/g,"")
    .trim();

  try{
    JSON.parse(normalized);
    return normalized;
  }catch{}

  const first=normalized.indexOf("{");
  const last=normalized.lastIndexOf("}");
  if(first<0||last<=first)throw Object.assign(new Error("JSON inválido da IA"),{status:502});
  return normalized.slice(first,last+1);
}

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function recoverTurn(json:unknown):RichTutorTurn|null{
  const root=record(json);
  const message=typeof root?.message==="string"?root.message.trim().slice(0,6000):"";
  if(!message)return null;

  const blocks=Array.isArray(root?.blocks)
    ?root.blocks.flatMap(block=>{
      const parsed=richBlockSchema.safeParse(block);
      return parsed.success?[parsed.data]:[];
    }).slice(0,3)
    :[];

  const parsedLearning=learningUpdateSchema.safeParse(root?.learning);
  const learning=parsedLearning.success?parsedLearning.data:{
    mode:"teach" as const,
    currentGoal:"",
    nextGoal:"",
    progress:0,
    objectives:[],
    mastered:[],
    struggling:[],
    misconceptions:[]
  };

  const rawConversation=record(root?.conversation);
  const title=typeof rawConversation?.suggestedTitle==="string"
    ?rawConversation.suggestedTitle.trim().slice(0,80)
    :"";
  const memorySummary=typeof rawConversation?.memorySummary==="string"
    ?rawConversation.memorySummary.trim().slice(0,5000)
    :"";

  return sanitizeTurn({
    schemaVersion:1,
    message,
    blocks,
    learning,
    conversation:{
      suggestedTitle:title||"Estudo BIOMED",
      memorySummary,
      shouldSummarize:typeof rawConversation?.shouldSummarize==="boolean"
        ?rawConversation.shouldSummarize
        :false
    }
  });
}

function parseTurn(content:string){
  let json:unknown;
  try{json=JSON.parse(extractJsonObject(content))}
  catch(error){
    if((error as {status?:number})?.status)throw error;
    throw Object.assign(new Error("JSON inválido da IA"),{status:502});
  }
  const parsed=richTutorTurnSchema.safeParse(json);
  if(parsed.success)return sanitizeTurn({...parsed.data,blocks:parsed.data.blocks.slice(0,3)});
  const recovered=recoverTurn(json);
  if(recovered)return recovered;
  throw Object.assign(new Error("Resposta estruturada inválida da IA"),{status:502});
}

function baseMessages(context:TutorContext,extraSystem=""){
  return[
    {role:"system",content:`${buildSystemPrompt(context)}\n\n${RICH_JSON_CONTRACT}\n${extraSystem}\nMantenha o turno curto e interativo.`},
    ...recentModelMessages(context)
  ];
}

export async function generateStructuredTutorTurn(context:TutorContext){
  const data=await callNvidia(baseMessages(context));
  return{
    turn:parseTurn(assistantText(data)),
    usage:usageNumbers(data.usage),
    provider:"nvidia" as const,
    model:NVIDIA_MODEL
  };
}

function sourceContext(sources:BiomedicalSource[]){
  return sources.slice(0,2).map((source,index)=>`[${index+1}] ${source.title}
Ano: ${source.year||"?"}
URL: ${source.url}
Resumo: ${source.abstract.slice(0,650)||"(sem resumo)"}`).join("\n\n");
}

export async function generateResearchTutorTurn(context:TutorContext,query:string){
  const sources=await searchBiomedicalSources(query);
  if(!sources.length){
    throw Object.assign(new Error("Não encontrei literatura biomédica atual suficiente para responder com fontes agora."),{status:503});
  }

  const extra=`Use somente estas fontes para fatos atuais:\n${sourceContext(sources)}`;
  const data=await callNvidia(baseMessages(context,extra));
  const parsed=parseTurn(assistantText(data));
  const trustedSources={
    type:"sources" as const,
    items:sources.slice(0,3).map(source=>({title:source.title,url:source.url,domain:source.domain}))
  };
  const turn:RichTutorTurn={
    ...parsed,
    blocks:[...parsed.blocks.filter(block=>block.type!=="sources").slice(0,2),trustedSources]
  };
  return{
    turn,
    usage:usageNumbers(data.usage),
    provider:"nvidia" as const,
    model:NVIDIA_MODEL
  };
}
