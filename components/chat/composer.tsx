"use client";
import {useRef,useState} from "react";
import {ArrowUp} from "lucide-react";

export function Composer({disabled,onSend}:{disabled:boolean;onSend:(text:string)=>Promise<void>|void}){
  const [value,setValue]=useState(""),ref=useRef<HTMLTextAreaElement>(null);
  async function submit(){
    const text=value.trim();if(!text||disabled)return;
    setValue("");await onSend(text);ref.current?.focus();
  }
  return <div className="composer-shell"><div className="composer">
    <textarea ref={ref} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit()}}} rows={1} placeholder="Converse com seu Tutor BIOMED..." aria-label="Mensagem para o Tutor"/>
    <button type="button" onClick={()=>void submit()} disabled={disabled||!value.trim()} aria-label="Enviar"><ArrowUp size={20}/></button>
  </div><small>Enter envia • Shift+Enter quebra linha</small></div>;
}
