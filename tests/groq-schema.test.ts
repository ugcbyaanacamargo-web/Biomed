import {describe,expect,it} from "vitest";
import {cleanJsonSchema} from "../lib/ai/groq";

describe("Groq JSON Schema compatibility",()=>{
  it("removes unsupported JSON-Schema format keywords recursively",()=>{
    const result=cleanJsonSchema({
      $schema:"https://json-schema.org/draft/2020-12/schema",
      type:"object",
      properties:{
        url:{type:"string",format:"uri"},
        nested:{type:"array",items:{type:"string",format:"uuid"}}
      }
    });
    const raw=JSON.stringify(result);
    expect(raw).not.toContain('"format"');
    expect(raw).not.toContain('"$schema"');
    expect(raw).toContain('"url"');
  });
});
