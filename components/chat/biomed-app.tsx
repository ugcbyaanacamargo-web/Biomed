"use client";
import {useEffect,useState} from "react";
import {AuthScreen} from "./auth-screen";
import {ChatShell} from "./chat-shell";

const SESSION_KEY="biomed-student-session-v1";
type Session={mode:"server";token:string;student?:any};

export function BiomedApp(){
  const [session,setSession]=useState<Session|null|undefined>(undefined);
  useEffect(()=>{try{setSession(JSON.parse(localStorage.getItem(SESSION_KEY)||"null"))}catch{setSession(null)}},[]);
  if(session===undefined)return <main className="boot-screen"><div className="brain-loader">🧠</div><strong>BIOMED</strong></main>;
  if(!session?.token)return <AuthScreen onAuthenticated={value=>{localStorage.setItem(SESSION_KEY,JSON.stringify(value));setSession(value)}}/>;
  return <ChatShell session={session} onLogout={()=>{localStorage.removeItem(SESSION_KEY);setSession(null)}}/>;
}
