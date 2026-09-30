import test from "node:test";
import assert from "node:assert/strict";
import {endpointForModel} from "../api/_lib/opencode-direct.js";

 test("model routing supports documented free Zen models",()=>{
   const names=["muse-spark-1.3-contributor-free","nemotron-3-ultra-free","nemotron-3.5-lightning-free","mimo-v2.6-flash-free","ling-3.0-flash-fin-free"];
   for(const name of names)assert.match(endpointForModel(name),/https:\/\/opencode\.ai\/zen\/v1\//);
 });
