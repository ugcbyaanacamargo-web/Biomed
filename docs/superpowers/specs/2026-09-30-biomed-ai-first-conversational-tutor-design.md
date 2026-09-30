# BIOMED — Tutor IA Conversacional como Aplicação Principal

**Data:** 2026-09-30  
**Status:** design aprovado em conversa; aguardando revisão da especificação antes do plano de implementação.

## 1. Objetivo

Reconstruir o BIOMED para que o **Tutor IA seja a própria experiência de aprendizagem**.

O aluno não deve navegar por um curso rígido composto por páginas, módulos, aulas fixas, prática separada, biblioteca separada e provas controladas pelo frontend. Depois do login, a experiência principal deve ser uma conversa contínua com um professor de IA que:

- descobre o nível do aluno;
- define o que estudar;
- gera o conteúdo;
- explica;
- pergunta;
- corrige;
- adapta a dificuldade;
- revisa lacunas;
- cria exercícios e casos;
- decide quando avançar;
- registra memória e progresso;
- retoma exatamente de onde o aluno parou.

O site fornece interface, autenticação, persistência, segurança e visualização do estado. A decisão pedagógica pertence ao Tutor IA.

## 2. Princípio central

A regra permanente passa a ser:

> **O Tutor é a aplicação.**

Fluxo principal:

```
Aluno
  ↓
Login
  ↓
Conversa atual + histórico + memória pedagógica
  ↓
GPT-OSS 120B na Groq
  ↓
resposta conversacional + atualização do estado pedagógico
  ↓
persistência no Supabase
  ↓
próximo turno
```

Não existe outro agente, OpenCode, Sandbox, Railway ou AI Gateway no caminho.

## 3. Experiência do aluno

Após autenticação, o aluno entra diretamente no Tutor.

A interface deve se aproximar de um chat moderno:

```
┌───────────────────┬───────────────────────────────────────┐
│ BIOMED            │ Tutor BIOMED                          │
│                   │                                       │
│ + Nova conversa   │ histórico da conversa                 │
│                   │                                       │
│ Conversas         │ Tutor ↔ Aluno                         │
│ anteriores        │                                       │
│                   │                                       │
│ Progresso         │                                       │
│ resumido          │                                       │
│                   │                                       │
│ Conta / sair      │ [ Converse com seu tutor... ] [Enviar]│
└───────────────────┴───────────────────────────────────────┘
```

No celular, a barra lateral vira menu recolhível e a conversa ocupa a tela.

A navegação principal não deve competir com o chat. O aluno não precisa decidir entre "aula", "prática", "prova" ou "biblioteca". Essas experiências são iniciadas pela própria conversa.

## 4. Papel do Tutor IA

O Tutor deve agir como professor de Biomedicina, não como FAQ.

A cada turno ele deve decidir pedagogicamente entre ações como:

- diagnosticar conhecimento prévio;
- explicar;
- simplificar;
- aprofundar;
- comparar;
- dar analogia;
- usar exemplo;
- fazer pergunta;
- pedir justificativa;
- criar múltipla escolha;
- criar resposta aberta;
- criar caso clínico;
- criar revisão;
- testar retenção;
- corrigir;
- identificar confusão;
- registrar domínio;
- alterar o plano;
- avançar;
- voltar;
- pesquisar a web quando informação atual for necessária.

A conversa deve parecer natural. O aluno pode interromper, mudar de assunto, pedir nova explicação, responder parcialmente ou fazer perguntas livres.

## 5. Currículo

O currículo deixa de ser uma sequência de aulas hardcoded.

O BIOMED mantém apenas um **mapa curricular de objetivos**, suficiente para orientar o Tutor:

- sensibilidade somática;
- receptores sensoriais;
- transdução;
- fibras Aβ, Aδ e C;
- vias ascendentes;
- processamento medular e encefálico;
- nocicepção;
- dor;
- modulação;
- controle descendente;
- integração clínica.

O GPT-OSS 120B cria e adapta o plano individual do aluno a partir desse mapa.

O sistema não deve exigir que todos façam a mesma ordem, o mesmo número de aulas ou os mesmos exercícios.

## 6. Conversas persistentes

A Groq não mantém estado conversacional por conta própria. O BIOMED deve persistir as conversas e reenviar o contexto necessário em cada chamada.

### 6.1 Tabelas

Criar:

```
biomed_ai_conversations
- id uuid primary key
- student_id uuid not null
- title text
- status text
- current_goal text
- memory_summary text
- study_state jsonb
- created_at timestamptz
- updated_at timestamptz
- last_message_at timestamptz
```

```
biomed_ai_messages
- id uuid primary key
- conversation_id uuid not null
- student_id uuid not null
- role text check ('user','assistant','system')
- content text
- metadata jsonb
- created_at timestamptz
```

```
biomed_ai_memory
- student_id uuid primary key
- long_term_summary text
- study_plan jsonb
- strengths jsonb
- weaknesses jsonb
- mastered_topics jsonb
- current_focus text
- recent_misconceptions jsonb
- updated_at timestamptz
```

### 6.2 Regras

- Toda mensagem do aluno deve ser persistida antes ou junto da geração.
- Toda resposta válida do Tutor deve ser persistida.
- O histórico da conversa deve sobreviver a logout, troca de dispositivo e nova sessão.
- A memória pedagógica pertence ao aluno, não a uma única conversa.
- Uma conversa nova continua podendo usar a memória pedagógica acumulada.
- O aluno pode abrir uma conversa antiga e continuar de onde parou.

## 7. Contexto enviado ao modelo

Cada chamada deve incluir, nessa ordem lógica:

1. instrução permanente do Tutor;
2. currículo/objetivos permitidos;
3. memória pedagógica do aluno;
4. resumo da conversa quando necessário;
5. janela recente de mensagens;
6. nova mensagem do aluno.

O sistema não deve reenviar indefinidamente todo o histórico bruto. Quando uma conversa crescer, deve gerar e armazenar um resumo fiel das partes antigas e manter apenas uma janela recente verbatim.

Essa estratégia reduz tokens sem perder continuidade.

## 8. Resposta do modelo

Para conversas normais, usar **Structured Outputs** do GPT-OSS 120B para que uma única geração retorne:

```json
{
  "message": "texto natural mostrado ao aluno",
  "learning": {
    "mode": "teach",
    "currentGoal": "entender fibras C",
    "nextGoal": "relacionar mielina e velocidade",
    "progress": 32,
    "mastered": ["Aβ"],
    "struggling": ["diferença Aδ x C"],
    "misconceptions": []
  },
  "interaction": {
    "type": "free_text",
    "question": "",
    "options": []
  },
  "conversation": {
    "suggestedTitle": "Fibras Aδ e C",
    "shouldSummarize": false
  }
}
```

O frontend mostra apenas `message` e, quando presente, controles de interação simples.

O restante atualiza silenciosamente memória e progresso.

## 9. Tipos de interação

O chat continua sendo a interface principal, mas pode renderizar controles dentro da conversa.

Tipos permitidos inicialmente:

- `free_text`
- `multiple_choice`
- `true_false`
- `short_answer`
- `case_question`
- `continue`

Esses controles não formam um segundo motor de aulas. Eles são apenas maneiras de responder ao Tutor.

Quando o aluno clica numa opção, o valor escolhido vira uma mensagem normal do aluno e entra no histórico.

## 10. Pesquisa na internet

O GPT-OSS 120B suporta `browser_search` na Groq.

A ferramenta deve ser habilitada apenas quando:

- o aluno pedir explicitamente pesquisa;
- a pergunta depender de informação atual;
- houver diretriz, artigo, notícia, guideline ou recomendação recente;
- o Tutor identificar que conhecimento desatualizado poderia prejudicar a resposta.

Como `browser_search` não é compatível com Structured Outputs na mesma chamada, existem dois modos:

### Modo normal

```
mensagens + memória
→ GPT-OSS 120B com JSON Schema
→ resposta + estado pedagógico
```

### Modo web

```
mensagens + memória
→ GPT-OSS 120B + browser_search
→ resposta textual com fontes
→ persistir resposta
→ atualizar memória pedagógica por regra do servidor ou em atualização posterior quando necessário
```

Busca web nunca é obrigatória para perguntas conceituais estáveis.

## 11. API

Substituir a API atual orientada por "planos visuais" por endpoints centrados em conversação.

### `GET /api/conversations`

Lista conversas do aluno autenticado.

### `POST /api/conversations`

Cria uma conversa.

### `GET /api/conversations/:id`

Retorna metadados da conversa e mensagens paginadas.

### `POST /api/chat`

Entrada:

```json
{
  "conversationId": "uuid",
  "message": "Eu ainda não entendi fibra C"
}
```

Responsabilidades:

1. autenticar sessão;
2. confirmar que a conversa pertence ao aluno;
3. persistir mensagem;
4. carregar memória/histórico necessário;
5. decidir se busca web é necessária;
6. chamar Groq diretamente;
7. validar saída;
8. persistir resposta;
9. atualizar memória pedagógica;
10. retornar a resposta.

### `DELETE /api/conversations/:id`

Arquiva ou remove uma conversa do aluno conforme política definida na implementação.

## 12. Prompt permanente do Tutor

O prompt de sistema deve ser versionado no repositório e tratado como parte central do produto.

Princípios obrigatórios:

- ensinar antes de avaliar;
- descobrir o que o aluno já sabe;
- evitar despejar conteúdo longo sem interação;
- fazer uma pergunta por vez quando estiver avaliando;
- adaptar linguagem ao aluno;
- pedir raciocínio, não apenas memorização;
- detectar e corrigir concepções erradas;
- não fingir que o aluno entendeu;
- não repetir conteúdo já dominado sem motivo;
- usar exemplos e analogias;
- conectar conteúdos novos a conteúdos já dominados;
- registrar objetivos, domínio e dificuldades;
- diferenciar educação de orientação médica pessoal;
- quando houver incerteza factual atual, usar busca web em vez de inventar.

## 13. Primeiro acesso

No primeiro acesso, o Tutor não deve abrir com uma aula fixa.

Fluxo:

```
Tutor apresenta seu papel
→ pergunta objetivo do aluno / contexto de estudo
→ faz diagnóstico curto
→ cria plano inicial
→ começa o primeiro bloco de ensino
```

O diagnóstico acontece conversando.

## 14. Retorno do aluno

Quando o aluno volta:

```
carregar memória
→ carregar conversa mais recente
→ Tutor identifica onde parou
→ retoma sem reiniciar o curso
```

Exemplo:

> "Na última sessão você já diferenciou Aβ de C, mas ainda confundiu Aδ com C. Vamos continuar exatamente daí."

## 15. Progresso

O progresso deixa de ser calculado por "aulas concluídas".

A IA mantém estado pedagógico por objetivos.

Exemplo:

```json
{
  "overall": 38,
  "currentFocus": "fibras",
  "objectives": {
    "receptores": {"mastery": 90},
    "transducao": {"mastery": 80},
    "fibras": {"mastery": 55},
    "vias": {"mastery": 20}
  }
}
```

O percentual é indicativo, não uma trava rígida.

A interface pode exibir um resumo discreto, mas nunca competir com a conversa.

## 16. Avaliações

Provas e simulados deixam de ser um subsistema separado controlado por `assessment-engine.js`.

O Tutor pode iniciar uma avaliação dentro da conversa:

> "Você já domina bem esta parte. Vou fazer cinco questões sem dar pistas. No final eu corrijo tudo."

As perguntas são geradas pela IA e as respostas continuam dentro do histórico.

Ao final, o Tutor registra:

- tópicos avaliados;
- desempenho;
- erros;
- nível de confiança;
- assuntos que precisam de revisão;
- próximo objetivo.

A implementação pode manter registros estruturados de avaliações para relatório futuro, mas a experiência permanece conversacional.

## 17. Interface

A aplicação autenticada deve ter apenas três áreas principais:

### Barra lateral

- Nova conversa
- histórico de conversas
- progresso resumido
- nome do aluno
- sair

### Área principal

- mensagens;
- respostas estruturadas quando necessário;
- indicador de geração;
- fontes quando houve busca web;
- botão de retomar geração em falha recuperável.

### Compositor

- textarea expansível;
- enviar;
- Enter/Shift+Enter acessível;
- estado de envio;
- bloqueio contra envio duplicado.

Não haverá dashboard obrigatório antes do Tutor.

## 18. Streaming

A arquitetura deve permitir resposta progressiva.

Se a implementação via Vercel Functions suportar streaming de forma confiável no stack atual, usar streaming da Groq para reduzir percepção de latência.

Se a persistência estruturada exigir resposta completa antes da gravação final, o backend pode acumular o stream, mostrar texto progressivamente e persistir a resposta somente após o encerramento com sucesso.

Falha no meio de stream não deve gravar resposta incompleta como válida.

## 19. Segurança

- `GROQ_API_KEY` permanece apenas no servidor.
- CPF nunca é enviado à Groq.
- O Tutor recebe apenas ID interno e contexto pedagógico.
- Cada conversa é isolada por `student_id`.
- Toda leitura/escrita exige sessão válida.
- RPCs não podem confiar em `student_id` enviado pelo navegador.
- Funções `SECURITY DEFINER` devem derivar o aluno exclusivamente do token e ter privilégios explícitos mínimos.
- Tabelas novas têm RLS habilitado.
- Nenhum conteúdo gerado pela IA é executado como HTML ou JavaScript.
- Markdown, se permitido, deve ser sanitizado.

## 20. Migração

A reconstrução deve evitar a falha anterior de "construir outra aplicação por cima".

Estratégia:

1. criar o novo subsistema conversacional em branch isolada;
2. criar e testar persistência;
3. construir nova API de chat;
4. construir nova interface;
5. validar fluxo completo;
6. somente então trocar o entrypoint autenticado;
7. remover código legado comprovadamente não usado.

Arquivos candidatos a remoção após a troca:

- `data/course-model.js`
- `assessment-engine.js`
- `learning-components.js`
- `learning-components.css`
- `visual-tutor.js`
- `tutor-schema.js`
- grande parte de `study-platform.js`
- APIs antigas de estado/aula que se tornarem redundantes.

Não apagar dados históricos durante a migração.

## 21. Compatibilidade com dados existentes

Preservar:

- `biomed_students`;
- `biomed_sessions`;
- histórico de eventos;
- notas/provas existentes enquanto ainda forem úteis;
- autenticação atual.

O estado legado pode ser usado como contexto inicial para alunos antigos, mas deixa de controlar a sequência futura.

## 22. Falhas e recuperação

### Groq indisponível

Mostrar erro claro e permitir tentar novamente.

Não inventar conteúdo local fingindo ser resposta da IA.

### Limite de cota

Mostrar indisponibilidade temporária de IA e preservar a mensagem ainda não respondida para nova tentativa.

### Falha ao salvar mensagem

Não gerar resposta se a mensagem do aluno não puder ser associada com segurança à conversa.

### Resposta inválida

No modo estruturado, rejeitar JSON inválido e fazer uma única tentativa de reparo controlado. Se continuar inválido, registrar falha e não atualizar domínio.

### Histórico muito grande

Usar resumo persistido + janela recente.

## 23. Telemetria

Eventos mínimos, sem CPF:

- `conversation_created`
- `conversation_opened`
- `message_sent`
- `assistant_response_completed`
- `assistant_response_failed`
- `web_search_used`
- `learning_goal_changed`
- `mastery_updated`
- `assessment_started`
- `assessment_completed`

Telemetria não é requisito para o chat funcionar.

## 24. Testes obrigatórios

### Banco

- aluno A nunca lê conversa do aluno B;
- sessão expirada falha;
- mensagem persiste;
- ordenação do histórico é estável;
- memória é atualizada apenas para o aluno correto;
- paginação funciona;
- exclusão/arquivamento respeita propriedade.

### Backend

- chamada normal usa `openai/gpt-oss-120b`;
- modelo diferente é rejeitado;
- histórico é enviado em ordem correta;
- CPF nunca entra no prompt;
- saída estruturada válida atualiza memória;
- saída inválida não atualiza memória;
- modo web habilita `browser_search`;
- modo web não usa `response_format` incompatível;
- timeout preserva conversa consistente.

### Frontend

- conversa abre;
- histórico carrega;
- nova conversa funciona;
- mensagens do aluno e Tutor aparecem na ordem correta;
- envio duplicado é evitado;
- mobile funciona;
- teclado funciona;
- erro permite retry;
- recarregar página mantém a conversa.

### Produção

- login real de conta sintética;
- criar conversa;
- enviar pergunta;
- receber GPT-OSS 120B;
- recarregar;
- confirmar histórico;
- abrir conversa antiga;
- confirmar memória pedagógica;
- testar uma pergunta que force web search.

## 25. Critérios de aceite

A reconstrução só é considerada concluída quando:

1. após login, o Tutor é a interface principal;
2. o aluno conversa livremente como em um chat moderno;
3. existem múltiplas conversas persistentes;
4. histórico sobrevive a recarregamento e novo dispositivo;
5. Tutor lembra o estado pedagógico do aluno entre conversas;
6. Tutor cria o plano de estudo;
7. Tutor gera o conteúdo;
8. Tutor cria perguntas e exercícios;
9. Tutor corrige e adapta o próximo passo;
10. sequência de estudo não depende de `course-model.js`;
11. provas não dependem de perguntas locais fixas;
12. GPT-OSS 120B é o único modelo principal;
13. chamadas vão diretamente à Groq;
14. busca web funciona quando necessária;
15. chave permanece somente no servidor;
16. CPF nunca é enviado ao modelo;
17. conversas são isoladas por aluno;
18. UI funciona em desktop e celular;
19. testes passam;
20. deploy Vercel fica READY;
21. fluxo real em produção é validado;
22. código legado substituído é removido, não mantido como segunda aplicação por baixo.

## 26. Fora de escopo

- diagnóstico médico pessoal;
- prescrição;
- acesso do Tutor a GitHub, Vercel, terminal ou Supabase administrativo;
- geração ou execução livre de HTML/JavaScript pelo modelo;
- múltiplos agentes;
- OpenCode;
- Railway;
- Vercel Sandbox;
- troca automática para modelos pagos;
- marketplace, gamificação ou ranking como prioridade desta reconstrução.

## 27. Decisão arquitetural

O BIOMED será reconstruído como um **aplicativo conversacional AI-first com memória persistente**.

A autoridade pedagógica deixa de estar no frontend e passa para o GPT-OSS 120B, enquanto o código local assume somente responsabilidades determinísticas:

- autenticação;
- persistência;
- segurança;
- montagem de contexto;
- validação;
- renderização;
- recuperação de falhas.

Essa decisão substitui a especificação anterior de "plataforma guiada por telas com Tutor visual como orquestrador".
