import {describe,expect,it} from "vitest";
import {shouldUseWeb} from "../lib/ai/web-mode";

describe("shouldUseWeb",()=>{
  it("uses web for explicitly current biomedical information",()=>{
    expect(shouldUseWeb("Pesquise a diretriz mais recente de 2026 sobre dor neuropática")).toBe(true);
  });
  it("does not waste web search on stable physiology",()=>{
    expect(shouldUseWeb("Explique por que a fibra C conduz devagar")).toBe(false);
  });
});
