import {NextResponse} from "next/server";

export function apiError(error:unknown,fallback="Erro interno"){
  const candidate=error as {status?:number;message?:string;name?:string};
  const message=String(candidate?.message||fallback);
  let status=candidate?.status;
  if(!status){
    if(candidate?.name==="ZodError")status=400;
    else if(/Sessão/i.test(message))status=401;
    else if(/Conversa não encontrada/i.test(message))status=404;
    else if(/inválid|ausente|required/i.test(message))status=400;
    else status=500;
  }
  return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
}

export function noStoreJson(data:unknown,status=200){
  return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
}
