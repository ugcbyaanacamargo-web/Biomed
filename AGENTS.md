# BIOMED — contrato de arquitetura

## Regra principal

O BIOMED é uma aplicação educacional **AI-first**.

Depois do login, o Tutor IA é a experiência principal. O frontend não contém um curso rígido concorrente com a IA. O GPT-OSS 120B decide a sequência pedagógica usando currículo amplo, memória do aluno e conversa.

A especificação vigente é:

`docs/superpowers/specs/2026-09-30-biomed-ai-first-conversational-tutor-design.md`

Ela substitui as decisões arquiteturais anteriores quando houver conflito.

## Arquitetura permanente

1. Frontend alvo: Next.js App Router + React + TypeScript.
2. Chat persistente como interface principal.
3. GPT-OSS 120B via Groq direta; sem AI Gateway, OpenCode, Railway ou Sandbox.
4. O Tutor gera narrativa, conteúdo rico, diagramas, comparações, botões, exercícios e fluxo pedagógico por dados estruturados.
5. O modelo nunca gera/executa HTML, JSX, CSS ou JavaScript arbitrário.
6. Blocos ricos são renderizados por componentes React allow-listed e validados.
7. Conversas, mensagens e memória pedagógica persistem no Supabase.
8. CPF nunca é enviado à IA.
9. O navegador não recebe segredos da Groq nem privilégios administrativos do Supabase.
10. PostHog mede produto e chamadas LLM sem CPF.
11. O modelo principal é fixo: `openai/gpt-oss-120b`.
12. Busca web é usada somente quando necessária e respeita a incompatibilidade da Groq entre `browser_search` e Structured Outputs.

## Regra de limpeza

A reconstrução não pode criar uma segunda aplicação por cima da anterior.

Quando a substituição estiver funcional e verificada:

- apagar código, testes e documentação que ficaram sem consumidor;
- mover somente assets realmente usados;
- remover imports e rotas mortas;
- não manter arquivos “por garantia”;
- não deixar TODO, placeholder ou componente sem ação;
- não manter fallback local fingindo ser resposta da IA.

Arquivos antigos citados como candidatos a remoção estão listados na especificação.

## Segurança do banco

O Supabase atual também contém tabelas de outro sistema. Alterações e limpezas desta reconstrução devem atingir exclusivamente objetos BIOMED.

Toda operação privilegiada deve:

- derivar o aluno da sessão;
- ignorar `student_id` fornecido pelo navegador;
- limitar `SECURITY DEFINER`;
- revogar `PUBLIC EXECUTE` quando aplicável;
- manter RLS;
- rodar advisors depois de migrations.

## Verificação obrigatória

Nenhuma etapa é concluída apenas porque o código foi escrito.

Exigir:

- testes;
- build;
- preview Vercel;
- fluxo real no navegador;
- chamada real à Groq;
- persistência real no Supabase;
- PostHog recebendo eventos;
- varredura de código legado sem uso antes do merge final.

## Produto

O Tutor deve ensinar, não apenas responder.

Cada turno pode escolher o melhor formato pedagógico: texto formatado, desenho/diagrama, processo, comparação, tabela, cartão, caso, pergunta, botões, sequência, revisão ou fontes.

A autoridade pedagógica é da IA. O código local fica responsável por autenticação, segurança, persistência, validação e renderização.
