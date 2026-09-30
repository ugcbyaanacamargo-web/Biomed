import {z} from "zod";

const text=z.string().trim().min(1).max(6000);
const short=z.string().trim().min(1).max(300);
const id=z.string().trim().regex(/^[a-zA-Z0-9_-]{1,80}$/);

const markdownBlock=z.object({
  type:z.literal("markdown"),
  content:text
}).strict();

const calloutBlock=z.object({
  type:z.literal("callout"),
  tone:z.enum(["info","key","success","warning"]),
  title:short,
  body:text
}).strict();

const diagramNode=z.object({
  id,
  label:short,
  kind:z.enum(["receptor","fiber","nerve","spinal_cord","brainstem","thalamus","cortex","interneuron","synapse","concept","body"])
}).strict();

const diagramEdge=z.object({
  from:id,
  to:id,
  label:z.string().trim().max(180)
}).strict();

const diagramBlock=z.object({
  type:z.literal("diagram"),
  variant:z.enum(["neural_path","gate_control","concept_map","fiber_structure"]),
  title:short,
  caption:z.string().trim().max(600),
  nodes:z.array(diagramNode).min(2).max(12),
  edges:z.array(diagramEdge).min(1).max(18)
}).strict();

const comparisonBlock=z.object({
  type:z.literal("comparison"),
  title:short,
  columns:z.array(z.object({
    title:short,
    subtitle:z.string().trim().max(180),
    items:z.array(z.object({label:short,value:short,emphasis:z.boolean()}).strict()).min(1).max(8)
  }).strict()).min(2).max(4)
}).strict();

const stepsBlock=z.object({
  type:z.literal("steps"),
  title:short,
  items:z.array(z.object({title:short,description:z.string().trim().min(1).max(800)}).strict()).min(2).max(8)
}).strict();

const timelineBlock=z.object({
  type:z.literal("timeline"),
  title:short,
  items:z.array(z.object({label:short,description:z.string().trim().min(1).max(800)}).strict()).min(2).max(8)
}).strict();

const tableBlock=z.object({
  type:z.literal("table"),
  title:short,
  columns:z.array(short).min(2).max(5),
  rows:z.array(z.array(z.string().trim().max(400)).min(2).max(5)).min(1).max(10)
}).strict();

const flashcardsBlock=z.object({
  type:z.literal("flashcards"),
  title:short,
  cards:z.array(z.object({front:short,back:z.string().trim().min(1).max(900)}).strict()).min(1).max(8)
}).strict();

const choiceBlock=z.object({
  type:z.literal("choice"),
  id,
  question:text,
  options:z.array(z.object({label:short,value:id}).strict()).min(2).max(6),
  multiple:z.boolean()
}).strict();

const trueFalseBlock=z.object({
  type:z.literal("true_false"),
  id,
  statement:text
}).strict();

const shortAnswerBlock=z.object({
  type:z.literal("short_answer"),
  id,
  question:text,
  placeholder:z.string().trim().max(180)
}).strict();

const caseBlock=z.object({
  type:z.literal("case"),
  title:short,
  scenario:text,
  question:z.string().trim().max(1200)
}).strict();

const sequenceBlock=z.object({
  type:z.literal("sequence"),
  id,
  instruction:text,
  items:z.array(z.object({label:short,value:id}).strict()).min(2).max(8)
}).strict();

const progressBlock=z.object({
  type:z.literal("progress"),
  title:short,
  items:z.array(z.object({label:short,value:z.number().min(0).max(100)}).strict()).min(1).max(10)
}).strict();

const sourcesBlock=z.object({
  type:z.literal("sources"),
  items:z.array(z.object({
    title:short,
    url:z.string().url().max(1200),
    domain:z.string().trim().max(200)
  }).strict()).min(1).max(8)
}).strict();

const suggestionsBlock=z.object({
  type:z.literal("suggestions"),
  items:z.array(z.object({label:short,value:z.string().trim().min(1).max(600)}).strict()).min(1).max(6)
}).strict();

export const richBlockSchema=z.discriminatedUnion("type",[
  markdownBlock,calloutBlock,diagramBlock,comparisonBlock,stepsBlock,timelineBlock,tableBlock,
  flashcardsBlock,choiceBlock,trueFalseBlock,shortAnswerBlock,caseBlock,sequenceBlock,
  progressBlock,sourcesBlock,suggestionsBlock
]);

export const learningUpdateSchema=z.object({
  mode:z.enum(["diagnose","teach","practice","review","assessment"]),
  currentGoal:z.string().trim().max(400),
  nextGoal:z.string().trim().max(400),
  progress:z.number().min(0).max(100),
  objectives:z.array(z.object({
    id,
    mastery:z.number().min(0).max(100),
    confidence:z.number().min(0).max(1)
  }).strict()).max(10),
  mastered:z.array(id).max(24),
  struggling:z.array(id).max(24),
  misconceptions:z.array(z.string().trim().max(500)).max(12)
}).strict();

export const richTutorTurnSchema=z.object({
  schemaVersion:z.literal(1),
  message:text,
  blocks:z.array(richBlockSchema).max(8),
  learning:learningUpdateSchema,
  conversation:z.object({
    suggestedTitle:z.string().trim().min(1).max(80),
    memorySummary:z.string().trim().max(5000),
    shouldSummarize:z.boolean()
  }).strict()
}).strict();

export type RichTutorTurn=z.infer<typeof richTutorTurnSchema>;
export type RichBlock=z.infer<typeof richBlockSchema>;
export type LearningUpdate=z.infer<typeof learningUpdateSchema>;
