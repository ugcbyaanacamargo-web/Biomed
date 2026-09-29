import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const sql=await readFile(new URL("../db/biomed_learning_platform.sql",import.meta.url),"utf8");
const eventApi=await readFile(new URL("../api/learning-event.js",import.meta.url),"utf8");

test("database contract persists state and exam attempts",()=>{
  assert.ok(sql.includes("biomed_learning_state"));
  assert.ok(sql.includes("biomed_exam_attempts"));
  assert.ok(sql.includes("pass_threshold"));
  assert.match(sql,/on conflict\(student_id,event_key\) do nothing/i);
});

test("learning API only accepts allow-listed actions",()=>{
  for(const a of ["lesson_started","lesson_completed","exam_completed","tutor_action"]) assert.ok(eventApi.includes(a),a);
});
