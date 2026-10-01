import {z} from "zod";
import {richTutorTurnSchema,type RichTutorTurn} from "./tutor-schema";
import {buildSystemPrompt,recentModelMessages,type TutorContext} from "./context-builder";
import {sanitizeTurn} from "./learning";
import {searchBiomedicalSources,type BiomedicalSource} from "./web-research";

export const NVIDIA_MODEL="nvidia/nemotron-3.5-lightning-30b-a3b";
const ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions";
const NORMAL_TIMEOUT_MS=13000;
const RETRY_TIMEOUT_MS=8000;
const REPAIR_TIMEOUT_MS=5500;
const NORMAL_MAX_TOKENS=1100;
const RETRY_MAX_TOKENS=650;
const REPAIR_MAX_TOKENS=650;

type Usage={prompt_tokens?:number;completion_tokens?:number;total_tokens?:number};
type NvidiaResponse={
  choices?:Array<{message?:{content?:string|null};finish_reason?:string}>;
  usage?:Usage;
  error?:{message?:string};
  message?:string;
};

const RICH_JSON_CONTRACT=`
Responda SOMENTE JSON válido neste formato:
{"schemaVersion":1,"message":"texto ao aluno","blocks":[],"learning":{"mode":"diagnose|teach|practice|review|assessment","currentGoal":"...","nextGoal":"...","progress":0,"objectives":[{"id":"ID_CURRICULO","mastery":0,"confidence":0}],"mastered":[],"struggling":[],"misconceptions":[]},"conversation":{"suggestedTitle":"...","memorySummary":"...","shouldSummarize":false}}

Use no máximo 4 blocks curtos. Tipos permitidos:
markdown(content); callout(tone,title,body); diagram(variant,title,caption,nodes[{id,label,kind}],edges[{from,to,label}]); comparison(title,columns[{title,subtitle,items[{label,value,emphasis}]}]); steps(title,items[{title,description}]); timeline(title,items[{label,description}]); table(title,columns,rows); flashcards(title,cards[{front,back}]); choice(id,question,options[{label,value}],multiple); true_false(id,statement); short_answer(id,question,placeholder); case(title,scenario,question); sequence(id,instruction,items[{label,value}]); progress(title,items[{label,value}]); sources(items[{title,url,domain}]); suggestions(items[{label,value}]).

diagram.variant: neural_path|gate_control|concept_map|fiber_structure.
diagram.nodes.kind: receptor|fiber|nerve|spinal_cord|brainstem|thalamus|cortex|interneuron|synapse|concept|body.
callout.tone: info|key|success|warning.
IDs: letras/números/_/-. Nunca gere HTML/JS/SVG bruto. Seja visual e conciso; prefira 1-3 blocks.
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

function isTimeout(error:unknown){
  const e=error as {name?:string;message?:string};
  return e?.name==="TimeoutError"||/timeout|timed out|aborted/i.test(String(e?.message||""));
}

async function callNvidia(
  messages:Array<{role:string;content:string}>,
  maxTokens:number,
  timeoutMs:number
):Promise<NvidiaResponse>{
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
      temperature:0.25,
      top_p:0.9,
      max_tokens:maxTokens,
      response_format:{type:"json_object"},
      chat_template_kwargs:{enable_thinking:false},
      stream:false
    }),
    signal:AbortSignal.timeout(timeoutMs),
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

function parseTurn(content:string){
  const raw=content.trim().replace(/^```json\s*/i,"").replace(/\s*```$/,"");
  try{return richTutorTurnSchema.parse(JSON.parse(raw))}
  catch(error){return {raw,error} as const}
}

function compactTurn(turn:RichTutorTurn):RichTutorTurn{
  return sanitizeTurn({...turn,blocks:turn.blocks.slice(0,4)});
}

async function repairTurn(content:string,context:TutorContext){
  const first=parseTurn(content);
  if(!("error" in first))return compactTurn(first);

  const issues=first.error instanceof z.ZodError
    ? first.error.issues.slice(0,6).map(issue=>`${issue.path.join(".")}: ${issue.message}`).join("\n")
    : "JSON inválido";

  const repaired=await callNvidia([
    {role:"system",content:`Corrija o JSON para o contrato BIOMED. Retorne somente JSON. ${RICH_JSON_CONTRACT}`},
    {role:"user",content:`JSON:\n${String(first.raw).slice(0,9000)}\nERROS:\n${issues}\nContexto resumido: ${String(context.conversation?.currentGoal||"")}`}
  ],REPAIR_MAX_TOKENS,REPAIR_TIMEOUT_MS);

  const second=parseTurn(assistantText(repaired));
  if("error" in second)throw Object.assign(new Error("Resposta estruturada inválida da IA"),{status:502});
  return compactTurn(second);
}

function baseMessages(context:TutorContext,extraSystem=""){
  return[
    {role:"system",content:`${buildSystemPrompt(context)}\n\n${RICH_JSON_CONTRACT}\n${extraSystem}\nResponda de forma curta o bastante para uma interação. Não tente encerrar vários tópicos em um único turno.`},
    ...recentModelMessages(context)
  ];
}

function retryMessages(context:TutorContext,extraSystem=""){
  const recent=recentModelMessages(context).slice(-8);
  return[
    {role:"system",content:`${buildSystemPrompt({...context,messages:[]})}\n\n${RICH_JSON_CONTRACT}\n${extraSystem}\nMODO RÁPIDO: no máximo 2 blocks e explicação curta.`},
    ...recent
  ];
}

async function generateWithFastRetry(context:TutorContext,extraSystem=""){
  try{
    const data=await callNvidia(baseMessages(context,extraSystem),NORMAL_MAX_TOKENS,NORMAL_TIMEOUT_MS);
    return{data,turn:await repairTurn(assistantText(data),context)};
  }catch(error){
    if(!isTimeout(error))throw error;
    const data=await callNvidia(retryMessages(context,extraSystem),RETRY_MAX_TOKENS,RETRY_TIMEOUT_MS);
    const parsed=parseTurn(assistantText(data));
    if("error" in parsed)throw Object.assign(new Error("Resposta estruturada inválida da IA após retry rápido"),{status:502});
    return{data,turn:compactTurn(parsed)};
  }
}

export async function generateStructuredTutorTurn(context:TutorContext){
  const generated=await generateWithFastRetry(context);
  return{
    turn:generated.turn,
    usage:usageNumbers(generated.data.usage),
    provider:"nvidia" as const,
    model:NVIDIA_MODEL
  };
}

function sourceContext(sources:BiomedicalSource[]){
  return sources.slice(0,3).map((source,index)=>`[${index+1}] ${source.title}
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

  const extra=`Este turno usa literatura atual. Use SOMENTE as fontes abaixo para afirmações atuais. Não invente estudo, autor, data ou URL.\nFONTES:\n${sourceContext(sources)}`;
  const generated=await generateWithFastRetry(context,extra);
  const trustedSources={
    type:"sources" as const,
    items:sources.slice(0,4).map(source=>({title:source.title,url:source.url,domain:source.domain}))
  };
  const turn:RichTutorTurn={
    ...generated.turn,
    blocks:[...generated.turn.blocks.filter(block=>block.type!=="sources").slice(0,3),trustedSources]
  };
  return{
    turn,
    usage:usageNumbers(generated.data.usage),
    provider:"nvidia" as const,
    model:NVIDIA_MODEL
  };
}
