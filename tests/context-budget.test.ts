import {describe,expect,it} from "vitest";
import {buildSystemPrompt,recentModelMessages} from "../lib/ai/context-builder";

describe("AI context budget",()=>{
  it("sends only the last eight conversation messages",()=>{
    const messages=Array.from({length:20},(_,i)=>({role:i%2?"assistant":"user" as const,content:`m${i}`})) as any;
    const recent=recentModelMessages({messages});
    expect(recent).toHaveLength(8);
    expect(recent[0]?.content).toBe("m12");
    expect(recent[7]?.content).toBe("m19");
  });

  it("caps the system prompt even when stored memory is large",()=>{
    const prompt=buildSystemPrompt({
      student:{level:"bronze",learningScore:0},
      memory:{longTermSummary:"x".repeat(12000)},
      conversation:{studyState:{blob:"y".repeat(12000)},memorySummary:"z".repeat(12000)}
    });
    expect(prompt.length).toBeLessThan(7000);
  });
});
