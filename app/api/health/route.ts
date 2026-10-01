import {noStoreJson} from "@/lib/api/http";
import {NVIDIA_MODEL} from "@/lib/ai/nvidia";

export async function GET(){
  return noStoreJson({
    ok:true,
    architecture:"ai-first-conversational-v4",
    framework:"nextjs",
    tutorAIConfigured:Boolean(process.env.NVIDIA_API_KEY),
    tutorAIProvider:"nvidia",
    tutorAIModel:NVIDIA_MODEL,
    tutorAIRuntime:"nvidia-build-direct",
    tutorAIThinking:"off-structured",
    researchProvider:"europe-pmc",
    persistence:"supabase-conversations",
    richLearningUI:true,
    posthog:true
  });
}
