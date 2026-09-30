import {noStoreJson} from "@/lib/api/http";
export async function GET(){
  return noStoreJson({
    ok:true,
    architecture:"ai-first-conversational-v3",
    framework:"nextjs",
    tutorAIConfigured:Boolean(process.env.GROQ_API_KEY),
    tutorAIModel:"openai/gpt-oss-120b",
    tutorAIRuntime:"groq-direct",
    persistence:"supabase-conversations",
    richLearningUI:true,
    posthog:true
  });
}
