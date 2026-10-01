import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";

describe("conversation creation",()=>{
  it("creates an empty conversation without calling the AI provider",()=>{
    const route=readFileSync("app/api/conversations/route.ts","utf8");
    expect(route).not.toContain("generateStructuredTutorTurn");
    expect(route).not.toContain("biomed_ai_seed_assistant");
    expect(route).toContain("biomed_ai_create_conversation");
  });
});
