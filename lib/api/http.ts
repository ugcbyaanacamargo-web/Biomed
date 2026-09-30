import {NextResponse} from "next/server";

export function apiError(error:unknown,fallback="Erro interno"){
  const candidate=error as {status?:number;message?:string};
  const message=String(candidate?.message||fallback);
  const status=candidate?.status||(/Sessão|Conversa não encontrada/i.test(message)?401:500);
  return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
}

export function noStoreJson(data:unknown,status=200){
  return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
}
