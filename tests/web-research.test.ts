import {describe,expect,it} from "vitest";
import {buildBiomedicalSearchQuery} from "../lib/ai/web-research";

describe("buildBiomedicalSearchQuery",()=>{
  it("normalizes Portuguese nociception research requests to biomedical English keywords",()=>{
    const query=buildBiomedicalSearchQuery("Pesquise uma fonte biomédica atual sobre nocicepção e me explique citando as fontes.");
    expect(query.toLowerCase()).toContain("nociception");
    expect(query.toLowerCase()).not.toContain("pesquise uma fonte");
  });

  it("keeps recognized pain concepts compact",()=>{
    const query=buildBiomedicalSearchQuery("Quero estudos recentes sobre dor neuropática");
    expect(query.toLowerCase()).toContain("neuropathic pain");
    expect(query.length).toBeLessThan(120);
  });
});
