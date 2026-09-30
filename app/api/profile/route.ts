import {requireBearerToken,rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";

export async function GET(request:Request){
  try{
    const token=requireBearerToken(request);
    return noStoreJson(await rpc("biomed_profile",{p_token:token}));
  }catch(error){return apiError(error,"Sessão inválida ou expirada")}
}
