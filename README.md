# BIOMED

BIOMED é um tutor conversacional de fisiologia sensorial. O produto autenticado é uma única aplicação **AI-first**: o aluno conversa com o Tutor, e o GPT-OSS 120B cria o caminho de estudo, explicações, diagramas, exercícios e revisões de acordo com o histórico e o domínio demonstrado.

## Arquitetura

```
Aluno
  → Next.js / React
  → rotas /api/*
  → sessão BIOMED + Supabase
  → Groq API direta
  → openai/gpt-oss-120b
  → Rich Learning UI
  → histórico + memória pedagógica no Supabase
```

Não há OpenCode, Railway, Vercel Sandbox, Vercel AI Gateway ou segundo motor de curso.

## Rich Learning UI

A IA nunca executa HTML ou JavaScript. Ela retorna dados estruturados validados por Zod. O frontend renderiza componentes seguros para:

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

Supabase armazena:

- `biomed_ai_conversations`;
- `biomed_ai_messages`;
- `biomed_ai_memory`.

O CPF não é enviado ao modelo. O navegador não recebe a chave da Groq nem acesso administrativo ao Supabase.

## IA

Modelo fixo:

```
openai/gpt-oss-120b
```

Chamadas normais usam Structured Outputs. Perguntas que exigem informação atual usam `browser_search`; como a Groq não combina browser search e Structured Outputs na mesma chamada, o estado pedagógico é extraído por uma segunda chamada curta somente nesses turnos.

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
- Plano: `docs/superpowers/plans/2026-09-30-biomed-ai-first-rebuild.md`
