import {describe,expect,it} from "vitest";
import {sanitizeLearning} from "../lib/ai/learning";

describe("sanitizeLearning",()=>{
  it("drops curriculum ids invented by the model",()=>{
    const clean=sanitizeLearning({
      mode:"teach",currentGoal:"fibras",nextGoal:"vias",progress:50,
      objectives:[{id:"fibras",mastery:65,confidence:.7},{id:"inventado",mastery:100,confidence:1}],
      mastered:["receptores","inventado"],struggling:["fibras","fake"],misconceptions:[]
    });
    expect(clean.objectives.map(x=>x.id)).toEqual(["fibras"]);
    expect(clean.mastered).toEqual(["receptores"]);
    expect(clean.struggling).toEqual(["fibras"]);
  });
});
