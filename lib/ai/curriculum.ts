export const CURRICULUM=[
  {id:"sensibilidade-somatica",label:"Sensibilidade somática",goal:"Entender modalidades e função geral da sensibilidade corporal."},
  {id:"receptores",label:"Receptores sensoriais",goal:"Relacionar tipos de receptores aos estímulos detectados."},
  {id:"transducao",label:"Transdução",goal:"Explicar como energia do estímulo se transforma em sinal elétrico."},
  {id:"fibras",label:"Fibras Aβ, Aδ e C",goal:"Comparar diâmetro, mielina, velocidade e função."},
  {id:"vias-ascendentes",label:"Vias ascendentes",goal:"Rastrear coluna dorsal/lemnisco medial e sistema anterolateral."},
  {id:"integracao-central",label:"Integração central",goal:"Relacionar medula, tronco, tálamo e córtex à percepção."},
  {id:"nocicepcao",label:"Nocicepção e dor",goal:"Distinguir processamento nociceptivo de experiência dolorosa."},
  {id:"modulacao",label:"Modulação",goal:"Entender facilitação e inibição da transmissão nociceptiva."},
  {id:"controle-descendente",label:"Controle descendente",goal:"Explicar circuitos encefálicos que modulam o corno dorsal."},
  {id:"aplicacao-clinica",label:"Integração clínica",goal:"Aplicar mecanismos sensoriais a casos e padrões de déficit."}
] as const;

export const CURRICULUM_IDS=new Set(CURRICULUM.map(item=>item.id));
export type CurriculumId=(typeof CURRICULUM)[number]["id"];

export function curriculumPrompt(){
  return CURRICULUM.map(item=>`- ${item.id}: ${item.label} — ${item.goal}`).join("\n");
}
