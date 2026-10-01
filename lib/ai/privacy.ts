const CPF_PATTERN=/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-\s]?\d{2}\b/g;
const EMAIL_PATTERN=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN=/(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9\d{4}|\d{4})[\s.-]?\d{4}\b/g;

export function redactForModel(value:string){
  return String(value||"")
    .replace(CPF_PATTERN,"[CPF REDIGIDO]")
    .replace(EMAIL_PATTERN,"[EMAIL REDIGIDO]")
    .replace(PHONE_PATTERN,"[TELEFONE REDIGIDO]");
}

export function redactJsonForModel(value:unknown,maxLength:number){
  return redactForModel(JSON.stringify(value??{})).slice(0,maxLength);
}
