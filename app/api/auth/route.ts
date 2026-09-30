import {z} from "zod";
import {rpc} from "@/lib/db/supabase";
import {apiError,noStoreJson} from "@/lib/api/http";

const bodySchema=z.object({
  cpf:z.string().min(11).max(18),
  name:z.string().trim().min(2).max(120).nullable().optional()
}).strict();

export async function POST(request:Request){
  try{
    const body=bodySchema.parse(await request.json());
    const data=await rpc("biomed_auth",{p_cpf:body.cpf,p_name:body.name||null});
    return noStoreJson(data);
  }catch(error){
    const message=String((error as Error)?.message||"Erro de acesso");
    if(/CPF inválido|Nome inválido|invalid/i.test(message))return noStoreJson({error:message},400);
    return apiError(error,"Erro de acesso");
  }
}
