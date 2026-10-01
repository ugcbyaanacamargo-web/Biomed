# BIOMED — contrato de arquitetura

## Regra principal

O BIOMED é uma aplicação educacional **AI-first**. Depois do login, o Tutor IA é a experiência principal; não existe curso rígido concorrente.

A especificação vigente é `docs/superpowers/specs/2026-09-30-biomed-ai-first-conversational-tutor-design.md`.

## Arquitetura permanente

1. Next.js App Router + React + TypeScript.
2. Chat persistente como interface principal.
3. Modelo principal fixo: `google/diffusiongemma-26b-a4b-it`.
4. Endpoint principal direto: `https://integrate.api.nvidia.com/v1/chat/completions`.
5. Turnos estruturados usam JSON mode e `enable_thinking:false`; saída sempre é validada no servidor e cada turno faz no máximo uma chamada ao provider.
6. Pesquisa atual biomédica usa Europe PMC; o modelo recebe resultados recuperados e não inventa fontes.
7. O Tutor gera narrativa, diagramas, comparações, botões, exercícios e fluxo pedagógico por dados estruturados.
8. O modelo nunca gera/executa HTML, JSX, CSS, JavaScript ou SVG arbitrário.
9. Conversas, mensagens e memória pedagógica persistem no Supabase.
10. CPF, e-mail, telefone e nome do aluno não são enviados ao provider.
11. O navegador não recebe segredos NVIDIA nem privilégios administrativos do Supabase.
12. PostHog mede produto e chamadas LLM sem PII.
13. Sem AI Gateway, OpenCode, Railway, Sandbox ou fallback automático pago.

## Regra de limpeza

Não manter segunda arquitetura, arquivo morto, TODO, placeholder, fallback local fingindo ser IA ou documentação contraditória. Código substituído deve ser apagado depois da validação.

## Segurança do banco

Alterações atingem somente objetos BIOMED. Toda operação privilegiada deriva o aluno da sessão, ignora `student_id` do navegador, mantém RLS e privilégios mínimos.

## Verificação obrigatória

Antes de concluir: testes, typecheck, build, preview Vercel, chamada real ao endpoint NVIDIA, persistência Supabase, PostHog e fluxo real no navegador.

## Produto

O Tutor ensina, não apenas responde. Cada turno escolhe a representação pedagógica mais útil: texto, diagrama, processo, comparação, tabela, cartão, caso, pergunta, botões, sequência, revisão ou fontes.
