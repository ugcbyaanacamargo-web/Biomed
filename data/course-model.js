export const MODULES=[
  {
    id:"perceber",number:1,title:"Perceber",subtitle:"O receptor detecta",icon:"◎",accent:"cyan",
    description:"Reconheça modalidades sensoriais, receptores e transdução antes de seguir o sinal.",
    lessons:[
      {id:"perceber-1",title:"O que é sensibilidade somática?",minutes:6,blocks:[
        {type:"concept",eyebrow:"COMECE AQUI",title:"Seu corpo está recebendo informação o tempo todo",text:"Pele, músculos, tendões e articulações possuem receptores que detectam mudanças e transformam estímulos em sinais que o sistema nervoso consegue conduzir.",asset:"receptores"},
        {type:"key_point",title:"Ideia central",text:"Antes de existir percepção, precisa existir detecção."},
        {type:"multiple_choice",id:"p1-check",question:"Qual é o primeiro passo do caminho sensorial?",options:["O cérebro interpreta","O receptor detecta","A medula decide a emoção"],answer:1,explanation:"O caminho começa quando um receptor sensorial detecta o estímulo."}
      ]},
      {id:"perceber-2",title:"Receptores e modalidades",minutes:8,blocks:[
        {type:"concept",title:"Cada receptor é especializado",text:"Mecanorreceptores respondem a deformação; termorreceptores a temperatura; nociceptores a estímulos potencialmente lesivos; proprioceptores informam posição e movimento.",asset:"receptores"},
        {type:"ordering",id:"p2-order",question:"Ordene a lógica do processo",items:["Estímulo","Receptor","Sinal elétrico","Sistema nervoso central"],answer:["Estímulo","Receptor","Sinal elétrico","Sistema nervoso central"]},
        {type:"open_answer",id:"p2-open",question:"Explique em uma frase por que o receptor pode ser chamado de tradutor.",hint:"Pense em transformar energia do ambiente em linguagem elétrica."}
      ]},
      {id:"perceber-3",title:"Transdução",minutes:7,blocks:[
        {type:"neural_path",title:"Do estímulo ao potencial de ação",steps:["Estímulo","Transdução","Potencial receptor","Potenciais de ação"]},
        {type:"key_point",title:"Não confunda",text:"Transdução não é o trajeto até o cérebro. É a conversão inicial do estímulo em alteração elétrica."},
        {type:"multiple_choice",id:"p3-check",question:"Transdução significa:",options:["Converter energia do estímulo em sinal elétrico","Levar o sinal pelo tálamo","Inibir a dor no córtex"],answer:0,explanation:"Transdução é a conversão do estímulo em sinal elétrico."}
      ]}
    ]
  },
  {
    id:"conduzir",number:2,title:"Conduzir",subtitle:"A fibra transmite",icon:"⇢",accent:"blue",
    description:"Compare fibras Aβ, Aδ e C e entenda por que velocidade e função mudam.",
    lessons:[
      {id:"conduzir-1",title:"Por que alguns sinais chegam mais rápido?",minutes:6,blocks:[
        {type:"concept",title:"Diâmetro e mielina mudam a velocidade",text:"Fibras maiores e mais mielinizadas conduzem mais rapidamente porque a propagação do sinal é mais eficiente.",asset:"fibras"},
        {type:"fiber_comparison",title:"Compare as três fibras"},
        {type:"prediction",id:"c1-predict",question:"Sem decorar: qual fibra deve conduzir mais rápido?",options:["Aβ","Aδ","C"],answer:0,explanation:"Aβ tem maior diâmetro e mais mielina."}
      ]},
      {id:"conduzir-2",title:"Aβ, Aδ e C",minutes:9,blocks:[
        {type:"fiber_comparison",title:"Função, mielina e sensação"},
        {type:"key_point",title:"Macetes úteis",text:"Aβ = toque rápido. Aδ = agulhada rápida. C = continua e demora."},
        {type:"multiple_choice",id:"c2-check",question:"Qual combinação está correta?",options:["Aβ — toque discriminativo","C — vibração rápida","Aδ — propriocepção principal"],answer:0,explanation:"Aβ participa principalmente de tato discriminativo, pressão e vibração."}
      ]},
      {id:"conduzir-3",title:"Vias ascendentes",minutes:9,blocks:[
        {type:"neural_path",title:"Coluna dorsal / lemnisco medial",steps:["Receptor","Medula","Bulbo","Tálamo","Córtex"],caption:"Tato discriminativo, vibração e propriocepção."},
        {type:"neural_path",title:"Sistema anterolateral",steps:["Nociceptor","Corno dorsal","Cruza na medula","Tálamo","Áreas encefálicas"],caption:"Dor, temperatura e tato grosseiro."},
        {type:"multiple_choice",id:"c3-check",question:"Dor e temperatura seguem principalmente:",options:["Sistema anterolateral","Coluna dorsal apenas","Trato corticoespinal"],answer:0,explanation:"O sistema anterolateral conduz principalmente dor e temperatura."}
      ]}
    ]
  },
  {
    id:"processar",number:3,title:"Processar",subtitle:"Medula + cérebro interpretam",icon:"⌁",accent:"purple",
    description:"Separe nocicepção de dor e entenda por que contexto, atenção e emoção importam.",
    lessons:[
      {id:"processar-1",title:"Nocicepção não é dor",minutes:7,blocks:[
        {type:"concept",title:"Dois conceitos diferentes",text:"Nocicepção é o processo neural de detectar e transmitir estímulos potencialmente lesivos. Dor é uma experiência sensorial e emocional.",asset:"hero"},
        {type:"compare",left:{title:"Nocicepção",text:"Processamento neural"},right:{title:"Dor",text:"Experiência percebida"}},
        {type:"multiple_choice",id:"pr1-check",question:"Duas pessoas com estímulos parecidos podem relatar dores diferentes?",options:["Não","Sim"],answer:1,explanation:"A dor depende também de processamento central, contexto, atenção, emoção e experiências anteriores."}
      ]},
      {id:"processar-2",title:"Atenção, emoção e expectativa",minutes:8,blocks:[
        {type:"concept",title:"O cérebro não é um medidor passivo",text:"Atenção pode aumentar a saliência do estímulo; distração pode reduzir percepção em algumas situações; medo, estresse e expectativa também modulam a experiência."},
        {type:"case_step",id:"pr2-case",title:"Caso rápido",scenario:"Duas pessoas recebem o mesmo estímulo. Uma está muito ansiosa; a outra está distraída conversando.",question:"Quem pode relatar mais dor?",options:["A pessoa ansiosa","A pessoa distraída","Obrigatoriamente igual"],answer:0,explanation:"Ansiedade e atenção aumentada podem elevar a percepção dolorosa."},
        {type:"key_point",title:"Cuidado",text:"Isso não significa que a dor é imaginária. Significa que a experiência é construída por redes biológicas que integram múltiplas informações."}
      ]},
      {id:"processar-3",title:"Integração no sistema nervoso",minutes:8,blocks:[
        {type:"neural_path",title:"Integração",steps:["Aferência periférica","Corno dorsal","Tronco encefálico / tálamo","Redes corticais","Percepção"]},
        {type:"open_answer",id:"pr3-open",question:"Explique por que 'mais lesão = exatamente mais dor' é uma simplificação.",hint:"Inclua processamento do sistema nervoso e contexto."}
      ]}
    ]
  },
  {
    id:"modular",number:4,title:"Modular",subtitle:"O sistema pode amplificar ou inibir",icon:"◇",accent:"orange",
    description:"Entenda o Portão da Dor e o controle descendente com diagramas e simulações.",
    lessons:[
      {id:"modular-1",title:"Portão da Dor",minutes:9,blocks:[
        {type:"concept",title:"O portão é uma metáfora de circuito",text:"No corno dorsal, atividade excitadora e inibitória pode aumentar ou reduzir a transmissão nociceptiva.",asset:"portao"},
        {type:"gate_diagram",title:"Ative o toque e observe a inibição"},
        {type:"prediction",id:"m1-predict",question:"Ao esfregar a região dolorida, a entrada Aβ tende a:",options:["Favorecer inibição","Sempre aumentar nocicepção"],answer:0,explanation:"A entrada tátil de fibras de maior diâmetro pode recrutar interneurônios inibitórios."}
      ]},
      {id:"modular-2",title:"Controle descendente",minutes:8,blocks:[
        {type:"concept",title:"O cérebro também envia sinais de volta",text:"Circuitos descendentes do mesencéfalo e tronco encefálico podem inibir ou facilitar a nocicepção na medula.",asset:"descendente"},
        {type:"neural_path",title:"Via descendente",steps:["Encéfalo","Mesencéfalo / tronco","Corno dorsal","Modulação da transmissão"]},
        {type:"multiple_choice",id:"m2-check",question:"Controle descendente atua apenas aumentando a dor?",options:["Sim","Não"],answer:1,explanation:"Pode inibir ou facilitar a transmissão nociceptiva."}
      ]},
      {id:"modular-3",title:"Simule o circuito",minutes:8,blocks:[
        {type:"simulation",id:"m3-sim",title:"Simulação do portão",simulation:"gate"},
        {type:"open_answer",id:"m3-open",question:"Descreva o que aconteceu quando você aumentou o toque Aβ.",hint:"Observe o efeito sobre inibição e saída nociceptiva."}
      ]}
    ]
  },
  {
    id:"aplicar",number:5,title:"Aplicar",subtitle:"Use o mecanismo para resolver casos",icon:"✓",accent:"green",
    description:"Integre receptor, fibra, via, processamento e modulação em situações clínicas.",
    lessons:[
      {id:"aplicar-1",title:"Semáforo sensorial",minutes:7,blocks:[
        {type:"concept",title:"Classifique pelo mecanismo",text:"Vermelho indica fatores que favorecem maior entrada/percepção; amarelo indica modulação contextual; verde destaca mecanismos inibitórios.",asset:"semaforo"},
        {type:"case_step",id:"a1-case",title:"Caso",scenario:"Depois de bater a perna, uma pessoa esfrega suavemente o local.",question:"Qual cor e mecanismo combinam melhor?",options:["Verde — entrada tátil pode favorecer inibição","Vermelho — sempre aumenta a dor","Amarelo — sem mecanismo"],answer:0,explanation:"A entrada tátil Aβ pode favorecer circuitos inibitórios no corno dorsal."}
      ]},
      {id:"aplicar-2",title:"Localização e perda sensorial",minutes:8,blocks:[
        {type:"concept",title:"O padrão de perda ajuda a localizar",text:"Alterações diferentes de tato, vibração, dor, temperatura ou propriocepção orientam o raciocínio sobre onde uma via pode estar comprometida."},
        {type:"case_step",id:"a2-case",title:"Caso integrado",scenario:"Paciente perde vibração e propriocepção em um padrão compatível com via específica.",question:"Qual sistema deve ser lembrado primeiro?",options:["Coluna dorsal / lemnisco medial","Sistema anterolateral apenas","Via motora"],answer:0,explanation:"Vibração e propriocepção são modalidades clássicas da coluna dorsal/lemnisco medial."}
      ]},
      {id:"aplicar-3",title:"Integração final",minutes:10,blocks:[
        {type:"neural_path",title:"Caminho completo",steps:["Perceber","Conduzir","Processar","Modular","Aplicar"]},
        {type:"open_answer",id:"a3-open",question:"Explique o caminho de um estímulo doloroso desde a periferia até a percepção e cite uma forma de modulação.",hint:"Inclua receptor, fibra/via, processamento e modulação."},
        {type:"checkpoint",title:"Pronto para a prova?",text:"Conclua esta aula e faça a prova da etapa Aplicar. Depois, o simulado cumulativo integra todo o curso."}
      ]}
    ]
  }
];

export const MODULE_ORDER=MODULES.map(m=>m.id);
export const LESSONS=MODULES.flatMap(m=>m.lessons.map(l=>({...l,moduleId:m.id,moduleTitle:m.title})));

export function getModule(id){return MODULES.find(m=>m.id===id)||MODULES[0]}
export function getLesson(id){return LESSONS.find(l=>l.id===id)||LESSONS[0]}
export function lessonIndex(id){return LESSONS.findIndex(l=>l.id===id)}
export function nextLesson(id){
  const i=lessonIndex(id);
  return LESSONS[Math.min(i+1,LESSONS.length-1)]||LESSONS[0];
}
export function previousLesson(id){
  const i=lessonIndex(id);
  return LESSONS[Math.max(i-1,0)]||LESSONS[0];
}
export function moduleProgress(moduleId,completed=[]){
  const m=getModule(moduleId),done=m.lessons.filter(l=>completed.includes(l.id)).length;
  return Math.round(done/Math.max(1,m.lessons.length)*100);
}
export function overallProgress(completed=[]){
  return Math.round(LESSONS.filter(l=>completed.includes(l.id)).length/LESSONS.length*100);
}
export function firstIncomplete(completed=[]){
  return LESSONS.find(l=>!completed.includes(l.id))||LESSONS[LESSONS.length-1];
}
export function recommendedNext(state={}){
  const completed=Array.isArray(state.completedLessons)?state.completedLessons:[];
  const current=getLesson(state.currentLesson);
  if(current&&!completed.includes(current.id)) return current;
  return firstIncomplete(completed);
}
