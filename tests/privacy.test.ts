import {describe,expect,it} from "vitest";
import {redactForModel} from "../lib/ai/privacy";

describe("redactForModel",()=>{
  it("removes common CPF, email and Brazilian phone patterns before provider calls",()=>{
    const value=redactForModel("Meu CPF é 123.456.789-09, email ana@example.com e telefone (62) 99999-8888.");
    expect(value).not.toContain("123.456.789-09");
    expect(value).not.toContain("ana@example.com");
    expect(value).not.toContain("99999-8888");
    expect(value).toContain("[CPF REDIGIDO]");
    expect(value).toContain("[EMAIL REDIGIDO]");
    expect(value).toContain("[TELEFONE REDIGIDO]");
  });
});
