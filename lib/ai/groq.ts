import {groq} from "@ai-sdk/groq";
import {generateText,Output} from "ai";
import {z} from "zod";
import {richTutorTurnSchema,learningUpdateSchema,type RichTutorTurn} from "./tutor-schema";
import {buildSystemPrompt,recentModelMessages,type TutorContext} from "./context-builder";
import {sanitizeLearning,sanitizeTurn} from "./learning";

export const GROQ_MODEL="openai/gpt-oss-120b";

function assertConfigured(){
  if(!process.env.GROQ_API_KEY)throw Object.assign(new Error("GROQ_API_KEY ausente"),{status:503});
  const configured=String(process.env.BIOMED_AI_MODEL||GROQ_MODEL).trim();
  if(configured!==GROQ_MODEL)throw Object.assign(new Error("Modelo BIOMED não autorizado"),{status:503});
}

function usageNumbers(usage:unknown){
  const u=(usage||{}) as Record<string,unknown>;
  return{
    inputTokens:Number(u.inputTokens||u.promptTokens||0)||undefined,
    outputTokens:Number(u.outputTokens||u.completionTokens||0)||undefined
  };
}

export async function generateStructuredTutorTurn(context:TutorContext){
  assertConfigured();
  const result=await generateText({
    model:groq(GROQ_MODEL),
    system:buildSystemPrompt(context),
    messages:recentModelMessages(context),
    output:Output.object({schema:richTutorTurnSchema}),
    temperature:0.45,
    maxOutputTokens:3500
  });
  if(!result.output)throw new Error("Resposta estruturada vazia");
  const turn=sanitizeTurn(richTutorTurnSchema.parse(result.output));
  return{turn,usage:usageNumbers(result.usage)};
}

const webStateSchema=z.object({
  learning:learningUpdateSchema,
  conversation:z.object({
    suggestedTitle:z.string().trim().min(1).max(80),
    memorySummary:z.string().trim().max(5000),
    shouldSummarize:z.boolean()
  }).strict()
}).strict();

export async function generateWebTutorTurn(context:TutorContext){
  assertConfigured();
  const system=buildSystemPrompt(context);
  const web=await generateText({
    model:groq(GROQ_MODEL),
    system:`${system}

Este turno exige informação atual. Use a pesquisa web. Responda ao aluno de forma pedagógica, objetiva e cite naturalmente o que encontrou. Não invente URLs.`,
    messages:recentModelMessages(context),
    tools:{browser_search:groq.tools.browserSearch({})},
    toolChoice:"required",
    temperature:0.35,
    maxOutputTokens:2800
  });
  const answer=web.text.trim();
  if(!answer)throw new Error("Pesquisa web retornou resposta vazia");

  const state=await generateText({
    model:groq(GROQ_MODEL),
    system:`${system}

Você atualizará APENAS o estado pedagógico depois de uma resposta obtida por pesquisa web. Não reescreva a resposta factual. Use somente IDs do currículo.`,
    messages:[
      ...recentModelMessages(context),
      {role:"assistant",content:answer},
      {role:"user",content:"Extraia apenas a atualização pedagógica decorrente deste turno."}
    ],
    output:Output.object({schema:webStateSchema}),
    temperature:0.2,
    maxOutputTokens:1300
  });
  if(!state.output)throw new Error("Estado pedagógico web vazio");
  const learning=sanitizeLearning(state.output.learning);
  const sources=(web.sources||[]).filter(source=>source.sourceType==="url").slice(0,8).map(source=>({
    title:String(source.title||source.url).slice(0,300),
    url:source.url,
    domain:new URL(source.url).hostname
  }));
  const turn:RichTutorTurn={
    schemaVersion:1,
    message:answer,
    blocks:[
      {type:"markdown",content:answer},
      ...(sources.length?[{type:"sources" as const,items:sources}]:[])
    ],
    learning,
    conversation:state.output.conversation
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
