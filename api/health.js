import {allowCors,json} from "./_lib/security.js";
import {BIOMED_DB} from "./_lib/biomed-rpc.js";
import {callTutorAI,FREE_MODEL} from "./_lib/ai-gateway.js";
export default async function handler(req,res){
  // Verificação temporária: ativa somente em implantação preview, nunca em produção.
  if (process.env.VERCEL_ENV === "preview" && req.method === "GET" && req.query?.probe === "tutor-live") {
    const auth=String(process.env.AI_GATEWAY_API_KEY||req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN||"").trim();
    if(!auth)return json(res,503,{ok:false,code:"AI_NOT_CONFIGURED"});
    const prompt="Você é um tutor de fisiologia. Responda SOMENTE um objeto JSON válido, sem markdown, neste formato: {\"screen\":{\"title\":\"Fibras da dor\",\"objective\":\"Diferenciar A-delta e C\",\"progressLabel\":\"Teste\"},\"blocks\":[{\"type\":\"concept\",\"title\":\"Fibras sensoriais\",\"text\":\"Explique brevemente as diferenças fisiológicas entre fibras A-delta e C\"}],\"nextAction\":{\"type\":\"continue\",\"label\":\"Continuar\"}}. Escreva uma explicação factual no campo text.";
    try {
      const result=await callTutorAI({prompt,model:FREE_MODEL,apiKey:auth,timeoutMs:19000});
      const raw=result.content.trim().replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"");
      let parsed;
      try{parsed=JSON.parse(raw)}catch{}
      const valid=Boolean(parsed?.screen?.title&&Array.isArray(parsed?.blocks)&&parsed.blocks.length&&parsed.blocks[0]?.text&&parsed?.nextAction?.type);
      return json(res,valid?200:422,{ok:valid,code:valid?"MODEL_VALID_PLAN":"MODEL_INVALID_PLAN",runtime:result.runtime,model:result.model,durationMs:result.durationMs,blockTypes:parsed?.blocks?.map(b=>b.type)||[],title:parsed?.screen?.title||null,firstExplanation:String(parsed?.blocks?.[0]?.text||"").slice(0,360)});
    }catch(e){return json(res,503,{ok:false,code:e.code||"PROBE_FAILED",durationMs:e.durationMs||0});}
  }

  if(allowCors(req,res))return;
  return json(res,200,{
    ok:true,database:Boolean(BIOMED_DB.configured),databaseMode:"supabase-rpc",
    learningPlatform:"guided-v3",deploymentMarker:"vercel-free-gateway-v1",
    learningState:true,assessments:true,visualTutor:true,
    tutorAIConfigured:Boolean(process.env.AI_GATEWAY_API_KEY||req.headers["x-vercel-oidc-token"]||process.env.VERCEL_OIDC_TOKEN),
    tutorAIRuntime:"vercel-ai-gateway",tutorAIModel:FREE_MODEL,
    tutorAIFreeOnly:true,tutorAIStatus:"configured-not-probed",
    tutorDeadlineMs:Number(process.env.BIOMED_AI_TIMEOUT_MS||19000),
    tutorRepair:"local-safe-plan",hostRuntime:process.env.VERCEL?"vercel":"node-local",
    posthogConfigured:Boolean(process.env.POSTHOG_PUBLIC_KEY)
  });
}
