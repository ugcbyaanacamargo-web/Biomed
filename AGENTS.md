# BIOMED — Contrato de arquitetura para agentes

Leia antes de qualquer refatoração.

## Objetivo

O BIOMED é uma plataforma educacional. O Tutor IA deve ajudar o aluno a entender, praticar, recuperar da memória e corrigir lacunas em fisiologia sensorial e dor.

O Tutor NÃO é um agente de programação.

## Regras permanentes

1. Existe um único aplicativo do aluno: `study-platform.js`.
2. Existe um único fluxo de autenticação: `auth.js` → `/api/auth`.
3. Não criar segundo painel, segunda trilha, segundo ranking ou banco local paralelo.
4. Modelos OpenCode `-free` devem ser usados **dentro do OpenCode**. O runtime correto é um `opencode serve` persistente no Railway, iniciado uma vez por container.
5. É proibido voltar ao Vercel Sandbox por pergunta ou iniciar OpenCode por requisição.
6. Vercel encaminha o Tutor ao Railway; APIs leves podem continuar na Vercel.
7. O agente `biomed-tutor` não pode usar ferramentas, editar arquivos ou executar terminal.
8. `visual-tutor.js` pode mostrar um plano local instantâneo enquanto a IA responde. Isso é fallback visual, não uma segunda fonte de progresso.
9. O progresso persistente pertence ao Supabase. Não criar perfil acadêmico paralelo em `localStorage`.
10. CPF, tokens, chaves e dados pessoais não podem ser enviados ao modelo.
11. Respostas visuais passam por `tutor-schema.js`.
12. Antes de adicionar arquivo novo, verificar se a função já existe; adaptar/remover é preferível a duplicar.
13. Toda mudança estrutural atualiza testes e `docs/architecture.md`.
14. O destino correto do banco é um projeto Supabase dedicado ao BIOMED.

## Núcleo

- `auth.js`
- `study-platform.js`
- `data/course-model.js`
- `learning-components.js`
- `assessment-engine.js`
- `visual-tutor.js`
- `tutor-schema.js`
- `api/tutor.js`
- `api/_lib/opencode-local.js`
- APIs de progresso/autenticação
- schema/migrations BIOMED

Não reintroduzir portal legado, WebLLM automático, Vercel Sandbox, banco local paralelo ou chamadas diretas ao Zen para modelos `-free`.
