import {z} from "zod";
import {richTutorTurnSchema,learningUpdateSchema,type RichTutorTurn} from "./tutor-schema";
import {buildSystemPrompt,recentModelMessages,type TutorContext} from "./context-builder";
import {sanitizeLearning,sanitizeTurn} from "./learning";

export const GROQ_MODEL="openai/gpt-oss-120b";
const ENDPOINT="https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS=21000;

type Usage={prompt_tokens?:number;completion_tokens?:number};
type ToolSearchResult={title?:string;url?:string};
type GroqMessage={
  content?:string|null;
  executed_tools?:Array<{search_results?:ToolSearchResult[]}>;
};
type GroqResponse={
  choices?:Array<{message?:GroqMessage;finish_reason?:string}>;
  usage?:Usage;
  error?:{message?:string};
  message?:string;
};

function assertConfigured(){
  if(!process.env.GROQ_API_KEY)throw Object.assign(new Error("GROQ_API_KEY ausente"),{status:503});
  const configured=String(process.env.BIOMED_AI_MODEL||GROQ_MODEL).trim();
  if(configured!==GROQ_MODEL)throw Object.assign(new Error("Modelo BIOMED não autorizado"),{status:503});
}

function usageNumbers(usage?:Usage){
  return{
    inputTokens:Number(usage?.prompt_tokens||0)||undefined,
    outputTokens:Number(usage?.completion_tokens||0)||undefined
  };
}

function modelMessages(context:TutorContext){
  return[
    {role:"system" as const,content:buildSystemPrompt(context)},
    ...recentModelMessages(context)
  ];
}

function cleanJsonSchema(schema:unknown){
  if(!schema||typeof schema!=="object")return schema;
  const copy=structuredClone(schema as Record<string,unknown>);
  delete (copy as Record<string,unknown>).$schema;
  return copy;
}

async function callGroq(body:Record<string,unknown>):Promise<GroqResponse>{
  assertConfigured();
  const response=await fetch(ENDPOINT,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(TIMEOUT_MS),
    cache:"no-store"
  });

  const text=await response.text();
  let data:GroqResponse={};
  try{data=text?JSON.parse(text) as GroqResponse:{}}catch{}
  if(!response.ok){
    const message=String(data.error?.message||data.message||`Groq HTTP ${response.status}`);
    const error=Object.assign(new Error(message),{status:response.status});
    throw error;
  }
  return data;
}

function assistantText(data:GroqResponse){
  const choice=data.choices?.[0];
  if(choice?.finish_reason==="length")throw new Error("Resposta da IA foi cortada pelo limite");
  const content=choice?.message?.content;
  if(typeof content!=="string"||!content.trim())throw new Error("Resposta vazia da Groq");
  return content.trim();
}

function parseStructured<T>(content:string,schema:z.ZodType<T>):T{
  let raw=content.trim();
  raw=raw.replace(/^\`\`\`json\s*/i,"").replace(/\s*\`\`\`$/,"");
  try{return schema.parse(JSON.parse(raw))}
  catch(error){throw Object.assign(new Error("Resposta estruturada inválida da IA"),{cause:error})}
}

function structuredFormat(name:string,schema:z.ZodType){
  return{
    type:"json_schema",
    json_schema:{
      name,
      strict:true,
      schema:cleanJsonSchema(z.toJSONSchema(schema,{target:"draft-2020-12"}))
    }
  };
}

export async function generateStructuredTutorTurn(context:TutorContext){
  const data=await callGroq({
    model:GROQ_MODEL,
    messages:modelMessages(context),
    response_format:structuredFormat("biomed_tutor_turn",richTutorTurnSchema),
    temperature:0.45,
    max_completion_tokens:3500,
    reasoning_effort:"medium",
    stream:false
  });
  const turn=sanitizeTurn(parseStructured(assistantText(data),richTutorTurnSchema));
  return{turn,usage:usageNumbers(data.usage)};
}

const webStateSchema=z.object({
  learning:learningUpdateSchema,
  conversation:z.object({
    suggestedTitle:z.string().trim().min(1).max(80),
    memorySummary:z.string().trim().max(5000),
    shouldSummarize:z.boolean()
  }).strict()
}).strict();

function extractSources(data:GroqResponse){
  const tools=data.choices?.[0]?.message?.executed_tools||[];
  const found=tools.flatMap(tool=>Array.isArray(tool.search_results)?tool.search_results:[]);
  const unique=new Map<string,{title:string;url:string;domain:string}>();
  for(const item of found){
    if(!item?.url)continue;
    try{
      const url=new URL(item.url);
      unique.set(item.url,{
        title:String(item.title||item.url).slice(0,300),
        url:item.url,
        domain:url.hostname
      });
    }catch{}
  }
  return[...unique.values()].slice(0,8);
}

export async function generateWebTutorTurn(context:TutorContext){
  const web=await callGroq({
    model:GROQ_MODEL,
    messages:[
      {role:"system",content:`${buildSystemPrompt(context)}

Este turno exige informação atual. Use a pesquisa web. Responda ao aluno de forma pedagógica e objetiva. Baseie afirmações atuais nos resultados encontrados e cite as fontes de forma legível.`},
      ...recentModelMessages(context)
    ],
    tools:[{type:"browser_search"}],
    tool_choice:"required",
    temperature:0.35,
    max_completion_tokens:2800,
    reasoning_effort:"medium",
    stream:false
  });
  const answer=assistantText(web);

  const state=await callGroq({
    model:GROQ_MODEL,
    messages:[
      {role:"system",content:`${buildSystemPrompt(context)}

Atualize APENAS o estado pedagógico depois da resposta pesquisada. Não reescreva o conteúdo factual. Use somente IDs do currículo.`},
      ...recentModelMessages(context),
      {role:"assistant",content:answer},
      {role:"user",content:"Extraia somente a atualização pedagógica deste turno."}
    ],
    response_format:structuredFormat("biomed_web_learning_state",webStateSchema),
    temperature:0.2,
    max_completion_tokens:1300,
    reasoning_effort:"low",
    stream:false
  });

  const parsed=parseStructured(assistantText(state),webStateSchema);
  const learning=sanitizeLearning(parsed.learning);
  const sources=extractSources(web);
  const turn:RichTutorTurn={
    schemaVersion:1,
    message:answer,
    blocks:[
      {type:"markdown",content:answer},
      ...(sources.length?[{type:"sources" as const,items:sources}]:[])
    ],
    learning,
    conversation:parsed.conversation
  };
  const a=usageNumbers(web.usage),b=usageNumbers(state.usage);
  return{
    turn,
    usage:{
      inputTokens:(a.inputTokens||0)+(b.inputTokens||0)||undefined,
      outputTokens:(a.outputTokens||0)+(b.outputTokens||0)||undefined
    }
  };
}
