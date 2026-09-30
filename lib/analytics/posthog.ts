const PROJECT_TOKEN=String(process.env.POSTHOG_PUBLIC_KEY||"phc_uhrkTGzSo5Yx7f9HstNyNCa2d78iS4d794y8v2D5Q4TG").trim();
const HOST=String(process.env.POSTHOG_HOST||"https://us.i.posthog.com").replace(/\/$/,"");

export async function captureEvent(distinctId:string,event:string,properties:Record<string,unknown>={}){
  if(!PROJECT_TOKEN||!distinctId)return;
  try{
    await fetch(`${HOST}/i/v0/e/`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({api_key:PROJECT_TOKEN,event,properties:{distinct_id:distinctId,...properties}}),
      signal:AbortSignal.timeout(2500)
    });
  }catch{}
}

export async function captureGeneration(input:{
  distinctId:string;conversationId:string;traceId:string;latencyMs:number;
  inputTokens?:number;outputTokens?:number;error?:string;web:boolean
}){
  await captureEvent(input.distinctId,"$ai_generation",{
    "$ai_trace_id":input.traceId,
    "$ai_session_id":input.conversationId,
    "$ai_model":"openai/gpt-oss-120b",
    "$ai_provider":"groq",
    "$ai_latency":input.latencyMs/1000,
    "$ai_input_tokens":input.inputTokens??null,
    "$ai_output_tokens":input.outputTokens??null,
    "$ai_stream":false,
    "$ai_tools":input.web?["browser_search"]:[],
    "$ai_is_error":Boolean(input.error),
    "$ai_error":input.error||null,
    "privacy_mode":true
  });
}
