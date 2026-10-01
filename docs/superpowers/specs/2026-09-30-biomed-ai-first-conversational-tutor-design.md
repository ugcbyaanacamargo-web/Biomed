# BIOMED — arquitetura AI-first vigente

**Data:** 2026-10-01  
**Status:** arquitetura de produção vigente.

## 1. Princípio

O Tutor é a aplicação. Depois do login, o aluno entra em um chat persistente; não existe curso rígido concorrente com a IA.

O Tutor cria e adapta:

- plano de estudo;
- explicações;
- exemplos;
- diagramas;
- comparações;
- exercícios;
- casos;
- perguntas;
- revisões;
- próximo passo pedagógico.

O frontend cuida de autenticação, segurança, persistência, validação e renderização.

## 2. Stack

- Next.js App Router;
- React + TypeScript;
- Tailwind CSS;
- componentes próprios BIOMED para Rich Learning UI;
- Supabase PostgreSQL;
- NVIDIA Build Free Endpoint;
- modelo `nvidia/nemotron-3.5-lightning-30b-a3b`;
- Europe PMC para recuperação de literatura biomédica atual;
- PostHog para produto e AI Observability;
- Vercel para deploy.

Fluxo normal:

```
Aluno
→ /api/chat
→ memória + histórico Supabase
→ NVIDIA integrate.api.nvidia.com
→ Nemotron 3.5 Lightning
→ JSON validado
→ Rich Learning UI
→ persistência
```

Fluxo de pesquisa:

```
Aluno pede informação atual
→ Europe PMC REST API
→ artigos/abstracts recentes
→ Nemotron sintetiza somente com as fontes recuperadas
→ resposta rica + bloco de fontes confiável
```

Não há OpenCode, Railway, Vercel Sandbox, AI Gateway ou fallback automático pago.

## 3. Modelo e latência

Modelo fixo:

```
nvidia/nemotron-3.5-lightning-30b-a3b
```

Endpoint:

```
https://integrate.api.nvidia.com/v1/chat/completions
```

Para turnos estruturados:

- `response_format: {"type":"json_object"}`;
- `chat_template_kwargs.enable_thinking: false`;
- `stream: false`;
- saída validada com Zod;
- uma única tentativa de reparo quando o JSON estiver inválido.

Thinking fica desligado no caminho normal para reduzir latência e evitar consumir orçamento antes do JSON pedagógico.

O Free Endpoint da NVIDIA é trial e pode aplicar rate limits. O produto não o descreve como ilimitado.

## 4. Rich Learning UI

A IA não gera HTML, JSX, CSS, JavaScript nem SVG arbitrário. Ela gera somente dados allow-listed.

Blocos suportados:

- `markdown`;
- `callout`;
- `diagram`;
- `comparison`;
- `steps`;
- `timeline`;
- `table`;
- `flashcards`;
- `choice`;
- `true_false`;
- `short_answer`;
- `case`;
- `sequence`;
- `progress`;
- `sources`;
- `suggestions`.

Diagramas são descrições semânticas de nós e arestas; React produz o SVG seguro.

Cliques em botões viram um novo turno da mesma conversa. A IA decide o próximo passo.

## 5. Persistência

Supabase:

- `biomed_ai_conversations`;
- `biomed_ai_messages`;
- `biomed_ai_memory`.

O histórico sobrevive a reload, logout e outro dispositivo. A memória pedagógica pertence ao aluno, não à conversa isolada.

Cada requisição envia ao modelo somente:

1. instruções do Tutor;
2. currículo;
3. memória pedagógica redigida;
4. resumo antigo redigido;
5. janela recente redigida;
6. turno atual redigido.

## 6. Privacidade

O trial da NVIDIA pode registrar entradas/saídas. Portanto:

- CPF nunca é enviado ao provider;
- e-mail reconhecível é redigido;
- telefone reconhecível é redigido;
- nome do aluno não é enviado;
- PostHog não recebe CPF;
- chave NVIDIA existe somente no servidor;
- o navegador não recebe segredos.

A sanitização é defesa adicional; o produto continua orientado a conteúdo educacional e não deve solicitar dados pessoais desnecessários.

## 7. Pesquisa atual

NVIDIA NIM fornece tool calling, mas não um buscador web hospedado equivalente ao antigo `browser_search` da Groq.

O BIOMED usa Europe PMC, serviço público do EMBL-EBI, para literatura biomédica atual.

O servidor:

1. detecta intenção atual/pesquisa;
2. busca até cinco registros `resultType=core`;
3. envia título, ano, autores, URL e resumo ao Nemotron;
4. remove qualquer bloco `sources` inventado pelo modelo;
5. adiciona as fontes reais recuperadas pelo servidor.

Se não houver evidência recuperada, o Tutor não inventa fonte.

## 8. Estado pedagógico

Cada turno validado pode atualizar:

- modo;
- objetivo atual;
- próximo objetivo;
- progresso;
- domínio por ID curricular;
- dificuldades;
- concepções erradas;
- resumo de memória;
- título da conversa.

IDs desconhecidos são removidos antes da persistência.

## 9. Falhas

- mensagem do aluno é persistida antes da geração;
- retry usa `client_message_id` e não duplica turnos;
- 429 mostra erro amigável e mantém a mensagem;
- timeout não altera domínio;
- JSON inválido tem uma tentativa de reparo;
- se o reparo falhar, nenhuma memória inválida é gravada;
- não existe resposta local falsa fingindo ser IA.

## 10. Segurança

- ownership deriva exclusivamente da sessão;
- `student_id` vindo do cliente não é autoridade;
- RLS permanece habilitado;
- funções privilegiadas usam grants mínimos;
- alterações de banco atingem somente objetos `biomed_*`;
- nenhuma resposta da IA é executada como código.

## 11. Telemetria

Eventos principais:

- `conversation_created`;
- `conversation_opened`;
- `message_sent`;
- `rich_block_rendered`;
- `interaction_answered`;
- `assistant_response_completed`;
- `assistant_response_failed`;
- `web_search_used`;
- `$ai_generation`.

AI Observability registra provider/model/latência/tokens/erros/trace sem conteúdo pessoal.

## 12. Critérios de aceite

A entrega permanece válida somente se:

1. chat é a experiência principal;
2. histórico persiste;
3. memória atravessa conversas;
4. IA gera conteúdo e sequência;
5. IA gera diagramas e interações;
6. cliques continuam o mesmo fluxo;
7. modelo principal é o Nemotron fixo;
8. NVIDIA é chamada diretamente;
9. pesquisa atual usa fontes reais;
10. PII reconhecível é redigida;
11. Supabase mantém isolamento entre alunos;
12. CI, typecheck e build passam;
13. preview Vercel fica READY;
14. teste real de produção recebe resposta do modelo;
15. PostHog recebe eventos;
16. não existem runtime/doc/testes da arquitetura substituída.

## 13. Fora de escopo

- diagnóstico médico pessoal;
- prescrição;
- código arbitrário gerado/executado pela IA;
- múltiplos agentes;
- OpenCode;
- Railway;
- Sandbox;
- AI Gateway;
- fallback automático para modelo pago.
