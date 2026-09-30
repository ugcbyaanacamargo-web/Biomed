import {describe,expect,it} from "vitest";
import {existsSync,readFileSync} from "node:fs";

const legacy=[
  "index.html","auth.js","auth.css","study-platform.js","study-shell.css",
  "learning-components.js","learning-components.css","visual-tutor.js","tutor-schema.js",
  "assessment-engine.js","analytics.js","server.js","data/course-model.js","data/knowledge-base.json",
  "api/tutor.js","api/_lib/groq.js"
];

describe("AI-first architecture",()=>{
  it("contains no replaced guided-course runtime",()=>{
    for(const path of legacy)expect(existsSync(path),path).toBe(false);
  });
  it("uses direct Groq and one fixed model",()=>{
    const groq=readFileSync("lib/ai/groq.ts","utf8");
    expect(groq).toContain("https://api.groq.com/openai/v1/chat/completions");
    expect(groq).toContain('openai/gpt-oss-120b');
    expect(groq).not.toMatch(/ai-gateway|OpenCode|Railway|Sandbox/);
  });
  it("keeps the rich-learning contract and persistent memory",()=>{
    const schema=readFileSync("lib/ai/tutor-schema.ts","utf8");
    const migration=readFileSync("supabase/migrations/20260930221500_ai_first_conversations.sql","utf8");
    for(const type of ["diagram","comparison","steps","flashcards","choice","case","sequence","sources"]){
      expect(schema).toContain(`literal("${type}")`);
    }
    expect(migration).toContain("biomed_ai_conversations");
    expect(migration).toContain("biomed_ai_messages");
    expect(migration).toContain("biomed_ai_memory");
  });
});
