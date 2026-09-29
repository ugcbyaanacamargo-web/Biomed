const SESSION_KEY="biomed-student-session-v1";
const gate=document.querySelector("#authGate");
const form=document.querySelector("#authForm");
const cpfInput=document.querySelector("#cpfInput");
const nameInput=document.querySelector("#nameInput");
const nameWrap=document.querySelector("#nameWrap");
const title=document.querySelector("#authTitle");
const hint=document.querySelector("#authHint");
const submit=document.querySelector("#authSubmit");
const errorBox=document.querySelector("#authError");

function digits(value){return String(value||"").replace(/\D/g,"")}
function validCPF(input){
  const cpf=digits(input);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
  const digit=(base,factor)=>{let total=0;for(const n of base)total+=Number(n)*factor--;const mod=(total*10)%11;return mod===10?0:mod};
  return digit(cpf.slice(0,9),10)===Number(cpf[9])&&digit(cpf.slice(0,10),11)===Number(cpf[10]);
}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
function showGate(message=""){
  document.body.classList.remove("student-authenticated","guided-study-active");
  gate?.classList.remove("hidden");
  if(message)errorBox.textContent=message;
}
function enter(token){
  localStorage.setItem(SESSION_KEY,JSON.stringify({token,mode:"server"}));
  gate?.classList.add("hidden");
  document.body.classList.add("student-authenticated");
  window.dispatchEvent(new CustomEvent("biomed:authenticated"));
}
function firstAccess(){
  nameWrap.classList.remove("hidden");
  nameInput.required=true;
  title.textContent="Primeiro acesso";
  hint.textContent="Informe seu nome para criar o perfil e começar a trilha.";
  submit.textContent="Criar meu perfil";
  nameInput.focus();
}
async function authenticate(cpf,name){
  const res=await fetch("/api/auth",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({cpf,name:name||undefined})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok){const e=new Error(data.error||"Não foi possível acessar o BIOMED.");e.status=res.status;throw e}
  return data;
}

cpfInput?.addEventListener("input",event=>{
  let value=digits(event.target.value).slice(0,11);
  if(value.length>9)value=value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,"$1.$2.$3-$4");
  else if(value.length>6)value=value.replace(/(\d{3})(\d{3})(\d+)/,"$1.$2.$3");
  else if(value.length>3)value=value.replace(/(\d{3})(\d+)/,"$1.$2");
  event.target.value=value;
});

form?.addEventListener("submit",async event=>{
  event.preventDefault();
  const cpf=cpfInput.value;
  const name=nameInput.value.trim();
  errorBox.textContent="";
  if(!validCPF(cpf)){errorBox.textContent="CPF inválido. Confira os 11 dígitos.";return}
  submit.disabled=true;submit.textContent="Entrando...";
  try{
    const data=await authenticate(cpf,name);
    if(data.newStudent&&!name){firstAccess();return}
    if(!data.token)throw new Error("O servidor não retornou uma sessão válida.");
    enter(data.token);
  }catch(error){
    errorBox.textContent=String(error?.message||"Não foi possível entrar.");
  }finally{
    submit.disabled=false;
    if(nameWrap.classList.contains("hidden"))submit.textContent="Continuar";
    else if(!readSession()?.token)submit.textContent="Criar meu perfil";
  }
});

window.addEventListener("biomed:auth-expired",()=>{
  localStorage.removeItem(SESSION_KEY);
  showGate("Sua sessão expirou. Entre novamente para continuar.");
});

const existing=readSession();
if(existing?.mode==="server"&&existing?.token){
  gate?.classList.add("hidden");
  document.body.classList.add("student-authenticated");
}else{
  showGate();
}
