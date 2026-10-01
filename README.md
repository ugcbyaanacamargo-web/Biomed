# BIOMED

BIOMED é um tutor conversacional de fisiologia sensorial. O aluno conversa com o Tutor, e a IA cria o caminho de estudo, explicações, diagramas, exercícios e revisões conforme o histórico e o domínio demonstrado.

## Arquitetura

```
Aluno
  → Next.js / React
  → rotas /api/*
  → sessão BIOMED + Supabase
  → NVIDIA Build Free Endpoint
  → google/diffusiongemma-26b-a4b-it
  → Rich Learning UI
  → histórico + memória pedagógica no Supabase
```

Para perguntas atuais de Biomedicina:

```
mensagem do aluno
  → Europe PMC REST API
  → artigos/abstracts atuais
  → Nemotron
  → resposta rica + fontes verificáveis
```

Não há OpenCode, Railway, Vercel Sandbox, Vercel AI Gateway ou segundo motor de curso.

## IA

Modelo principal fixo:

```
google/diffusiongemma-26b-a4b-it
```

Endpoint:

```
https://integrate.api.nvidia.com/v1/chat/completions
```

Turnos normais usam `response_format: {"type":"json_object"}`, `enable_thinking:false` e validação Zod no servidor. A resposta é validada com Zod; JSON inválido falha sem uma segunda chamada ao provider para preservar latência previsível.

O Free Endpoint da NVIDIA é um serviço trial e pode aplicar rate limits; o BIOMED não trata esse endpoint como ilimitado nem troca silenciosamente para modelo pago.

## Rich Learning UI

A IA nunca executa HTML ou JavaScript. Ela gera dados estruturados para componentes seguros:

- Markdown;
- conceitos e destaques;
- diagramas SVG semânticos;
- comparações;
- processos e timelines;
- tabelas;
- flashcards;
- múltipla escolha;
- verdadeiro/falso;
- resposta curta;
- casos;
- ordenação;
- progresso;
- fontes;
- sugestões de continuação.

## Persistência

Supabase armazena `biomed_ai_conversations`, `biomed_ai_messages` e `biomed_ai_memory`.

O navegador não recebe a chave NVIDIA nem privilégios administrativos do Supabase. CPF, e-mail e telefone reconhecíveis são redigidos antes do contexto enviado ao modelo. O nome do aluno também não é enviado ao provider.

## Desenvolvimento

```bash
npm ci --legacy-peer-deps
npm run test
npm run typecheck
npm run build
```

Variáveis necessárias estão em `.env.example`.

## Contratos

- Arquitetura: `AGENTS.md`
- Especificação: `docs/superpowers/specs/2026-09-30-biomed-ai-first-conversational-tutor-design.md`
