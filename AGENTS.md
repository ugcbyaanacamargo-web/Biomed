# BIOMED — Contrato de arquitetura para agentes

Leia este arquivo antes de qualquer refatoração.

## Objetivo do produto

O BIOMED é uma plataforma educacional. O Tutor IA deve ajudar o aluno a **entender, praticar, recuperar da memória e corrigir lacunas** em fisiologia sensorial e dor.

O Tutor NÃO é um agente de programação e NÃO deve receber ferramentas para editar o projeto.

## Regras permanentes

1. Existe **um único aplicativo do aluno**: `study-platform.js`.
2. Existe **um único fluxo de autenticação**: `auth.js` → `/api/auth`.
3. Não criar um segundo painel, segunda trilha, segundo ranking ou segundo banco local por cima do aplicativo existente.
4. O Tutor usa **OpenCode Zen por API direta**. Não instalar/executar OpenCode CLI, `opencode serve`, Vercel Sandbox ou sessões de agente para inferência pedagógica.
5. `visual-tutor.js` pode mostrar um plano local instantâneo enquanto a IA responde. Isso é fallback de interface, não uma segunda fonte de progresso.
6. O progresso persistente pertence ao Supabase. Não criar perfil paralelo em `localStorage`.
7. CPF, tokens, chaves e dados pessoais não podem ser enviados ao modelo.
8. Respostas visuais da IA devem passar por `tutor-schema.js`; a IA escolhe conteúdo/interação, o frontend controla o que pode ser renderizado.
9. Vercel é a produção principal. Railway pode executar o mesmo código como runtime secundário/benchmark, mas não pode ter uma arquitetura diferente.
10. Antes de adicionar arquivo novo, verifique se a função já existe. Prefira adaptar/remover a duplicar.
11. Toda mudança estrutural deve atualizar testes e `docs/architecture.md`.
12. Nunca tratar uma solução temporária como arquitetura final: a meta de banco é um projeto Supabase dedicado ao BIOMED.

## Núcleo que deve permanecer coerente

- `auth.js`
- `study-platform.js`
- `data/course-model.js`
- `learning-components.js`
- `assessment-engine.js`
- `visual-tutor.js`
- `tutor-schema.js`
- `api/tutor.js`
- `api/_lib/zen-client.js`
- APIs de progresso/autenticação
- schema/migrations do BIOMED

Se uma proposta reintroduzir um dos componentes removidos (portal legado, WebLLM automático, OpenCode server, sandbox de agente, perfil local paralelo), ela precisa ser rejeitada ou redesenhada.
