# BIOMED — Tutor IA Conversacional com Conteúdo Rico Gerado por IA

**Data:** 2026-09-30  
**Status:** revisão arquitetural após aprovação do conceito AI-first; aguardando revisão final desta versão antes do plano de implementação.

## 1. Resultado pretendido

O BIOMED será reconstruído como um **ambiente de estudo conversacional dirigido por IA**.

Depois do login, o aluno não entra em um dashboard de aulas fixas. Ele entra diretamente em uma conversa contínua com o Tutor BIOMED. O Tutor:

- descobre o que o aluno já sabe;
- cria e modifica o plano individual de estudo;
- gera explicações e exemplos;
- cria conteúdo visual;
- cria diagramas e fluxos;
- cria botões e escolhas;
- cria questões e casos;
- corrige respostas;
- identifica confusões;
- acompanha domínio;
- decide quando revisar ou avançar;
- retoma o ensino em outro dispositivo;
- consulta a web quando informação atual for necessária.

A aplicação deixa de conter um "curso pronto" concorrendo com a IA.

> **O Tutor é a aplicação. O frontend é o ambiente visual, seguro e persistente em que o Tutor trabalha.**

## 2. Problema da arquitetura atual

O repositório atual distribui responsabilidade pedagógica entre vários motores:

- `data/course-model.js` define sequência e conteúdo fixos;
- `study-platform.js` decide telas e fluxo;
- `assessment-engine.js` gera avaliações locais;
- `visual-tutor.js` encaixa a IA em uma atividade predefinida;
- `tutor-schema.js` descreve um formato orientado a "telas";
- `learning-components.js` mantém outra camada de apresentação pedagógica.

Isso transforma o modelo em complemento de uma aplicação rígida.

A reconstrução inverte essa relação:

```
ANTES

curso hardcoded
  ↓
frontend decide aula
  ↓
frontend decide atividade
  ↓
IA preenche parte da atividade


DEPOIS

memória do aluno + currículo amplo + conversa
  ↓
GPT-OSS 120B decide o próximo ato pedagógico
  ↓
gera narrativa + conteúdo rico + interação + atualização de domínio
  ↓
frontend somente valida e renderiza
```

## 3. Stack definitiva

O frontend autenticado será substituído por **uma aplicação Next.js App Router + React + TypeScript**.

Stack:

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn/ui para primitivas;
- Vercel AI Elements somente nos elementos de chat apropriados;
- componentes próprios BIOMED para conteúdo educacional rico;
- AI SDK v6 como camada de UI/integração quando útil;
- `@ai-sdk/groq` para chamar a Groq diretamente;
- **sem Vercel AI Gateway**;
- GPT-OSS 120B como modelo principal;
- Supabase PostgreSQL como persistência;
- PostHog para produto e AI Observability;
- Vercel para deploy.

A utilização de `@ai-sdk/groq` é apenas um SDK de cliente. O fluxo continua direto:

```
BIOMED → Groq → openai/gpt-oss-120b
```

Não existe roteador/modelo intermediário.

## 4. Migração limpa, sem aplicação antiga por baixo

Esta reconstrução não será adicionada "por cima" da aplicação atual.

A nova aplicação será construída em branch isolada e só substituirá a produção quando o fluxo novo estiver completo e validado.

Após o corte, arquivos substituídos serão apagados.

### 4.1 Candidatos obrigatórios a remoção

Quando suas funções estiverem totalmente substituídas:

- `index.html`
- `auth.js`
- `auth.css`
- `study-platform.js`
- `study-shell.css`
- `learning-components.js`
- `learning-components.css`
- `visual-tutor.js`
- `tutor-schema.js`
- `assessment-engine.js`
- `data/course-model.js`
- `data/knowledge-base.json`
- `server.js`
- APIs antigas de aprendizagem que não tiverem consumidor;
- testes que validem comportamento removido;
- documentação antiga que descreva arquitetura substituída.

Nenhum arquivo legado deve permanecer apenas "porque talvez seja útil".

### 4.2 Conteúdo visual reaproveitável

SVGs antigos só permanecem se tiverem uso real no novo renderer.

Os que forem usados serão movidos para uma estrutura explícita, por exemplo:

```
public/
  biomed/
    diagrams/
      receptors.svg
      fibers.svg
      gate-control.svg
      descending-control.svg
```

Depois disso, a pasta antiga de assets é removida.

### 4.3 Banco legado

Dados antigos não serão apagados durante o corte inicial.

Depois que a nova memória pedagógica estiver validada:

1. extrair informação útil do estado antigo;
2. converter para a nova memória;
3. gerar snapshot/migração;
4. verificar;
5. somente então propor remoção de tabelas BIOMED obsoletas.

Tabelas não relacionadas ao BIOMED no mesmo projeto Supabase jamais entram nessa limpeza.

## 5. Experiência visual

O design deve ser de produto educacional contemporâneo, não de painel administrativo e não de "chat genérico roxo".

Direção:

- base clara, limpa e clínica;
- azul profundo / teal como identidade;
- tipografia Geist;
- alto contraste e leitura confortável;
- mensagens do Tutor integradas ao conteúdo visual;
- muito espaço respirável;
- animações pequenas e funcionais;
- ícones consistentes;
- mobile-first;
- dark mode opcional, não obrigatório para a primeira entrega.

Layout desktop:

```
┌──────────────────────┬───────────────────────────────────────────────┐
│ BIOMED               │ Tutor BIOMED                                  │
│                      │                                               │
│ + Nova conversa      │ [mensagem]                                    │
│                      │ [diagrama / comparação / exercício]           │
│ Hoje                 │ [mensagem]                                    │
│ • Fibras Aδ e C      │ [botões / resposta]                           │
│ • Modulação          │                                               │
│                      │                                               │
│ Anteriores           │                                               │
│ • Nocicepção         │                                               │
│                      │                                               │
│ ─────────────        │                                               │
│ Progresso            │                                               │
│ Fibras      55%      │                                               │
│ Vias        20%      │                                               │
│                      │                                               │
│ Perfil / sair        │ [ Escreva para o Tutor...              ] [↑]  │
└──────────────────────┴───────────────────────────────────────────────┘
```

No celular:

- conversa ocupa a tela;
- histórico/progresso abre em drawer;
- compositor permanece acessível;
- botões e exercícios têm área de toque adequada.

## 6. Chat não significa texto simples

A conversa é a estrutura principal, mas uma resposta do Tutor pode conter vários **blocos pedagógicos ricos**.

Uma mensagem da IA pode ser:

```
Tutor:
"Você entendeu por que a mielina importa. Agora veja como isso muda
a velocidade entre Aβ, Aδ e C."

[ desenho da fibra e mielina ]

[ comparação Aβ × Aδ × C ]

Tutor:
"Sem decorar: qual delas tende a conduzir mais lentamente?"

[ Aβ ] [ Aδ ] [ C ]
```

Tudo isso é **um turno da mesma conversa**.

## 7. BIOMED Rich Learning UI

O modelo não gera HTML, JSX, CSS ou JavaScript.

Ele produz uma linguagem de apresentação estruturada e versionada. O renderer transforma essa estrutura em componentes React bonitos, acessíveis e seguros.

### 7.1 Envelope de um turno

Exemplo conceitual:

```json
{
  "schemaVersion": 1,
  "message": "Agora compare estas fibras pelo mecanismo, não pelo nome.",
  "blocks": [
    {
      "type": "diagram",
      "variant": "neural_path",
      "title": "Velocidade de condução",
      "nodes": [],
      "edges": []
    },
    {
      "type": "comparison",
      "title": "Aβ × Aδ × C",
      "columns": []
    },
    {
      "type": "choice",
      "question": "Qual tende a conduzir mais lentamente?",
      "options": []
    }
  ],
  "learning": {},
  "conversation": {}
}
```

### 7.2 Registro inicial de blocos

O renderer suportará inicialmente:

- `markdown` — explicação formatada;
- `callout` — conceito-chave, alerta ou resumo;
- `diagram` — desenho SVG semântico;
- `comparison` — comparação visual;
- `steps` — processo em etapas;
- `timeline` — sequência temporal/fisiológica;
- `table` — tabela responsiva;
- `flashcards` — cartões de revisão;
- `choice` — opções clicáveis;
- `true_false`;
- `short_answer`;
- `case` — caso clínico em card;
- `sequence` — ordenar elementos;
- `progress` — atualização visual de domínio;
- `sources` — fontes usadas em pesquisa web;
- `suggestions` — possíveis caminhos de continuação.

O registro é extensível. Novo tipo só entra após componente, schema e teste.

## 8. Desenhos gerados pela IA

"Gerar desenho" não significa permitir SVG arbitrário do modelo.

O Tutor gera uma **descrição semântica de diagrama**.

Exemplo:

```json
{
  "type": "diagram",
  "variant": "neural_path",
  "title": "Da pele ao córtex",
  "nodes": [
    {"id":"skin","label":"Receptor cutâneo","kind":"receptor"},
    {"id":"cord","label":"Medula","kind":"spinal_cord"},
    {"id":"thalamus","label":"Tálamo","kind":"brain"},
    {"id":"cortex","label":"Córtex","kind":"cortex"}
  ],
  "edges": [
    {"from":"skin","to":"cord","label":"aferência"},
    {"from":"cord","to":"thalamus","label":"via ascendente"},
    {"from":"thalamus","to":"cortex","label":"projeção"}
  ]
}
```

O React gera o SVG.

Isso permite:

- setas;
- destaques;
- rótulos;
- cores semânticas;
- legendas;
- sequência animada;
- caminhos neurais;
- mapas conceituais;
- fluxos;
- circuitos;
- comparação visual.

### 8.1 Biblioteca biomédica

O novo frontend terá componentes vetoriais reutilizáveis:

- receptor/pele;
- fibra mielinizada e não mielinizada;
- nervo periférico;
- medula/corno dorsal;
- tálamo;
- córtex;
- circuito de portão;
- controle descendente.

A IA seleciona e combina peças; não recebe autoridade para executar desenho arbitrário.

## 9. Botões e fluxos gerados

Botões não terão comportamento codificado pelo texto da IA.

Cada interação produz valor estruturado.

Exemplo:

```json
{
  "type": "choice",
  "id": "fiber-speed",
  "question": "Qual fibra conduz mais lentamente?",
  "options": [
    {"label":"Aβ","value":"abeta"},
    {"label":"Aδ","value":"adelta"},
    {"label":"C","value":"c"}
  ]
}
```

Ao clicar em C, o frontend envia um novo turno:

```
display: "C"
value: "c"
interactionId: "fiber-speed"
```

O modelo recebe isso junto do histórico e decide o próximo passo.

Portanto:

> **o fluxo é gerado pela decisão pedagógica da IA, não por árvores de if/else no frontend.**

## 10. Quando usar conteúdo rico

O Tutor deve escolher o formato pelo objetivo pedagógico.

Regras de prompt:

- explicação de mecanismo → preferir diagrama/steps;
- comparação → preferir comparison/table;
- revisão → flashcards/choice;
- raciocínio clínico → case;
- processo temporal → timeline;
- teste de compreensão → choice/short_answer;
- informação atual → texto + sources;
- pergunta simples de esclarecimento → texto pode bastar.

Durante uma sequência de ensino, o Tutor não deve produzir longas paredes de texto quando um bloco visual ou interativo tornar a ideia mais clara.

## 11. AI Elements

AI Elements será usado apenas onde resolve infraestrutura real do chat:

- `Conversation`;
- `MessageResponse` para Markdown;
- `PromptInput`;
- `Loader`;
- `Sources`;
- `Suggestion`;
- ações básicas de mensagem quando úteis.

Não instalar a biblioteca inteira.

Os blocos pedagógicos do BIOMED são componentes próprios, porque comparação fisiológica, circuito neural e exercícios educacionais não devem parecer tool calls de um agente de programação.

## 12. Modelo e geração

Modelo fixo:

```
openai/gpt-oss-120b
```

Provider:

```
@ai-sdk/groq
```

O modelo não pode trocar silenciosamente.

### 12.1 Turno normal

Usar Structured Outputs com schema estrito para gerar:

- mensagem;
- blocos;
- interação;
- atualização pedagógica;
- título sugerido da conversa.

### 12.2 Turno com pesquisa web

A Groq não permite `browser_search` junto de Structured Outputs.

Fluxo:

```
contexto
  ↓
GPT-OSS 120B + browser_search
  ↓
resposta com fontes
  ↓
persistir resposta
  ↓
se o conteúdo mudar domínio/plano:
    chamada curta estruturada para extrair atualização pedagógica
```

A segunda chamada é feita apenas quando necessária.

## 13. Currículo

Não haverá aulas fixas.

O repositório terá um pequeno arquivo versionado de **objetivos curriculares**, não conteúdo didático pronto.

Exemplo:

```
Sensibilidade somática
├─ modalidades
├─ receptores
├─ transdução
├─ fibras
├─ vias
├─ integração central
├─ nocicepção e dor
├─ modulação
└─ aplicação
```

O Tutor monta caminhos individualizados.

Esse arquivo serve para:

- evitar lacunas graves;
- orientar abrangência;
- medir domínio;
- impedir que a IA transforme o curso em assuntos aleatórios.

Ele não contém aulas nem respostas.

## 14. Prompt do professor

Criar arquivo versionado, por exemplo:

```
src/lib/ai/tutor-instructions.ts
```

Ele define comportamento, não conteúdo estático.

Princípios:

- conversar como professor humano;
- ensinar antes de cobrar;
- uma pergunta por vez quando diagnosticando;
- raciocínio antes de memorização;
- descobrir a causa do erro;
- adaptar profundidade;
- reconhecer quando o aluno já domina;
- não elogiar automaticamente resposta errada;
- corrigir com clareza;
- relacionar conceitos;
- criar exemplos novos;
- usar visual quando útil;
- nunca fingir que pesquisou;
- usar web para fatos atuais;
- distinguir educação de orientação médica individual;
- não diagnosticar nem prescrever para o aluno.

## 15. Persistência

### 15.1 `biomed_ai_conversations`

- `id uuid`
- `student_id uuid`
- `title text`
- `status active|archived`
- `current_goal text`
- `memory_summary text`
- `study_state jsonb`
- timestamps

### 15.2 `biomed_ai_messages`

- `id uuid`
- `conversation_id uuid`
- `student_id uuid`
- `client_message_id uuid` para idempotência;
- `role user|assistant`
- `content text`
- `ui jsonb`
- `metadata jsonb`
- `generation_status complete|failed`
- timestamp

### 15.3 `biomed_ai_memory`

Uma linha por aluno:

- resumo de longo prazo;
- plano atual;
- objetivos/domínio;
- forças;
- dificuldades;
- concepções erradas recentes;
- foco atual;
- última recomendação;
- timestamp.

### 15.4 Índices

Índices mínimos:

- mensagens por `conversation_id, created_at`;
- conversas por `student_id, last_message_at`;
- idempotência por `conversation_id, client_message_id`.

## 16. Segurança do Supabase

O projeto atual compartilha tabelas BIOMED com outro sistema. A reconstrução toca somente objetos prefixados com `biomed_`.

Os advisors atuais apontam funções BIOMED `SECURITY DEFINER` públicas. A reconstrução deve reduzir essa superfície.

Direção:

- navegador nunca chama tabelas de IA diretamente;
- navegador chama apenas rotas Next.js;
- token BIOMED continua sendo validado no servidor;
- lógica privilegiada fica em funções mínimas;
- funções auxiliares devem ir para schema não exposto quando possível;
- `PUBLIC EXECUTE` deve ser explicitamente revogado em funções privilegiadas;
- RLS permanece habilitado nas tabelas;
- nenhum `student_id` vindo do cliente é confiável;
- ownership sempre deriva da sessão;
- rodar advisors após toda migration.

Se a arquitetura atual de chave publishable exigir um RPC público específico, somente esse RPC recebe grant explícito e valida token internamente.

## 17. Histórico e contexto

Groq é stateless.

Para cada turno, montar:

1. system prompt;
2. objetivos curriculares;
3. memória pedagógica;
4. resumo da conversa antiga;
5. janela recente de mensagens;
6. nova mensagem/interação.

Não reenviar a conversa inteira indefinidamente.

### 17.1 Compressão

Quando a conversa ultrapassar limite de contexto interno da aplicação:

- resumir partes antigas;
- persistir resumo;
- preservar fatos pedagógicos;
- manter últimas mensagens completas.

Resumo nunca substitui a memória pedagógica.

## 18. Primeira experiência

Primeiro acesso:

```
Tutor se apresenta
→ pergunta objetivo/contexto
→ diagnóstico curto conversacional
→ identifica nível
→ cria plano inicial
→ inicia estudo
```

Nada de formulário pedagógico longo.

## 19. Retorno

Ao voltar:

```
carregar memória
→ abrir conversa mais recente
→ recuperar contexto
→ mostrar mensagem anterior
→ aluno continua
```

Se iniciar conversa nova, o Tutor ainda possui a memória pedagógica de longo prazo.

## 20. Avaliações

Avaliação é um **modo conversacional**, não uma página separada.

Exemplo:

> "Você já mostrou domínio de receptores e transdução. Vou fazer cinco perguntas sem pistas e depois revisar o que aparecer."

A IA gera as perguntas.

Durante uma avaliação:

- não revelar resposta antes da tentativa;
- registrar resultados no estado pedagógico;
- mostrar resultado final visual;
- gerar revisão dos erros.

O frontend apenas renderiza os blocos e transmite respostas.

## 21. Progresso

Domínio é por objetivo curricular, não por "aula concluída".

Exemplo:

```json
{
  "overall": 38,
  "currentFocus": "fibras",
  "objectives": {
    "receptores": {"mastery": 90, "confidence": 0.9},
    "transducao": {"mastery": 80, "confidence": 0.8},
    "fibras": {"mastery": 55, "confidence": 0.6},
    "vias": {"mastery": 20, "confidence": 0.3}
  }
}
```

O modelo propõe atualizações; o servidor:

- limita valores;
- valida IDs curriculares;
- rejeita chaves desconhecidas;
- persiste somente estado validado.

## 22. API nova

Rotas Next.js:

```
POST   /api/auth
GET    /api/profile

GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/[id]
DELETE /api/conversations/[id]

POST   /api/chat
POST   /api/chat/retry
```

### `POST /api/chat`

Ordem obrigatória:

1. validar sessão;
2. validar payload;
3. validar ownership;
4. deduplicar `clientMessageId`;
5. persistir mensagem do aluno;
6. montar contexto;
7. escolher normal/web;
8. chamar GPT-OSS 120B;
9. validar resposta;
10. persistir resposta;
11. aplicar atualização pedagógica;
12. atualizar conversation metadata;
13. emitir telemetria;
14. responder ao frontend.

## 23. Falhas

### IA indisponível

- mensagem do aluno permanece;
- resposta não é falsificada localmente;
- UI mostra retry;
- nenhuma atualização de domínio acontece.

### HTTP 429 / cota

- estado explícito de limite;
- retry manual;
- não trocar automaticamente para modelo pago.

### JSON inválido

- uma tentativa controlada de reparo;
- se falhar, resposta marcada como failed;
- não persistir estado pedagógico inválido.

### Clique/enviar duplicado

`client_message_id` impede duplicação.

## 24. PostHog

O PostHog atual ainda não recebeu evento do produto. A nova aplicação deve instrumentar desde o início.

Eventos de produto:

- `conversation_created`
- `conversation_opened`
- `message_sent`
- `rich_block_rendered`
- `interaction_answered`
- `learning_goal_changed`
- `mastery_updated`
- `web_search_used`
- `assistant_response_failed`

Usar AI Observability para chamadas LLM:

- generation;
- modelo/provider;
- latência;
- tokens;
- erros;
- trace;
- conversation/session ID interno.

Não enviar CPF.

Conteúdo integral de prompts/respostas só deve ser enviado ao PostHog se a política de privacidade definida para o produto permitir; caso contrário usar modo de privacidade e manter somente metadados de observabilidade.

## 25. Estrutura de código alvo

```
app/
  layout.tsx
  page.tsx
  chat/
    [conversationId]/
      page.tsx
  api/
    auth/route.ts
    profile/route.ts
    chat/route.ts
    chat/retry/route.ts
    conversations/route.ts
    conversations/[id]/route.ts

components/
  chat/
    chat-shell.tsx
    conversation-sidebar.tsx
    tutor-message.tsx
    composer.tsx
  learning/
    rich-turn.tsx
    callout.tsx
    bio-diagram.tsx
    comparison.tsx
    steps.tsx
    timeline.tsx
    table.tsx
    flashcards.tsx
    choice.tsx
    case-card.tsx
    sequence.tsx
    progress-card.tsx
    sources.tsx

lib/
  ai/
    groq.ts
    tutor-instructions.ts
    tutor-schema.ts
    curriculum.ts
    context-builder.ts
    web-mode.ts
  auth/
    session.ts
  db/
    supabase.ts
    conversations.ts
    memory.ts
  analytics/
    posthog-server.ts
    posthog-client.ts

public/
  biomed/
    diagrams/

supabase/
  migrations/

tests/
```

Arquivos podem ser refinados no plano, mas não voltar a concentrar toda a aplicação em um arquivo gigante.

## 26. Testes

### Schema/UI

- todo tipo de bloco válido renderiza;
- tipo desconhecido é rejeitado;
- HTML/JS arbitrário é rejeitado;
- diagramas têm labels acessíveis;
- opções clicadas viram mensagens;
- markdown é sanitizado.

### Persistência

- histórico persiste após reload;
- conversa nova preserva memória global;
- aluno A não acessa aluno B;
- soft-delete remove da lista;
- idempotência impede mensagem duplicada.

### Pedagogia

Cenários simulados:

- aluno responde corretamente;
- aluno erra pelo mesmo motivo duas vezes;
- aluno pede outra explicação;
- aluno muda de assunto;
- aluno pede prova;
- aluno retorna depois;
- Tutor não repete conteúdo dominado sem motivo.

### Groq

- modelo obrigatório é 120B;
- structured output normal;
- browser search só no modo web;
- web mode não combina response_format incompatível;
- timeout;
- 429;
- resposta inválida.

### Browser

- desktop;
- mobile;
- teclado;
- drawer;
- scroll;
- composer;
- rich blocks;
- retry;
- reload;
- histórico.

### Produção

- conta sintética;
- nova conversa;
- conteúdo rico real;
- diagrama real;
- botão real;
- correção real;
- reload;
- nova conversa com memória;
- web search com fontes;
- inspeção de logs;
- PostHog recebendo eventos;
- Vercel sem erro runtime.

## 27. Critérios de aceite

A entrega só termina quando:

1. Tutor é a aplicação autenticada principal;
2. conversa é natural, persistente e multi-turn;
3. histórico funciona em dispositivos diferentes;
4. IA gera plano;
5. IA gera conteúdo;
6. IA gera explicações visuais;
7. IA gera diagramas/desenhos;
8. IA gera botões e exercícios;
9. cliques alimentam o mesmo fluxo conversacional;
10. IA corrige e adapta;
11. memória pedagógica sobrevive a novas conversas;
12. conteúdo não depende de aulas hardcoded;
13. avaliações não dependem de perguntas hardcoded;
14. GPT-OSS 120B é fixo;
15. Groq é chamada diretamente;
16. busca web funciona quando necessária;
17. UI é bonita e responsiva;
18. nenhuma resposta rica executa código arbitrário;
19. isolamento de aluno é testado;
20. PostHog mede produto e LLM;
21. CI passa;
22. preview Vercel passa;
23. teste real de produção passa;
24. arquivos substituídos são removidos;
25. imports/referências mortas são zero;
26. documentação contraditória é removida ou atualizada;
27. não existe segunda aplicação escondida por baixo da nova.

## 28. Fora de escopo

- diagnóstico médico pessoal;
- prescrição;
- GitHub/Vercel/Supabase administrativo acessível ao Tutor;
- OpenCode;
- Railway;
- Vercel Sandbox;
- AI Gateway;
- múltiplos agentes;
- HTML/JS livre gerado pelo modelo;
- fallback automático para modelo pago;
- ranking/gamificação como prioridade.

## 29. Decisão final

O BIOMED será uma aplicação **AI-first, conversacional e multimodal na apresentação**, com GPT-OSS 120B como cérebro pedagógico.

"Multimodal na apresentação" nesta fase significa que a IA produz texto, estrutura visual, diagramas SVG, comparações, cartões, botões, fluxos e exercícios através de dados estruturados renderizados pelo frontend. Não significa executar código arbitrário gerado pela IA.

A reconstrução também substitui o frontend vanilla antigo por uma base Next.js/React coerente e remove os arquivos substituídos após validação, evitando novamente uma arquitetura feita de camadas abandonadas.
