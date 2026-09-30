# BIOMED — estudo guiado
Percurso único do aluno: Perceber → Conduzir → Processar → Modular → Aplicar.
## Aplicação
`index.html` prepara uma única tela de acesso ou restauração de sessão. `auth.js` autentica e `study-platform.js` constrói um único aplicativo com trilha, Tutor, treino, provas, progresso, ranking e biblioteca.
## Tutor IA
```
Aluno → /api/tutor na Vercel → Supabase (contexto anônimo do aluno)
      → Vercel AI Gateway → Ling 3.1 Flash (ID gratuito)
      → tutor-schema.js → atividade visual
```
Nenhum OpenCode CLI, Sandbox, Railway ou processos secundários. `visual-tutor.js` mostra atividade imediata e a substitui somente após receber resposta válida da IA.
A função usa o token OIDC automático da Vercel; `AI_GATEWAY_API_KEY` é opcional. Modelo permitido: `inclusionai/ling-3.1-flash-free`; ID terminado em `-free` impede migração silenciosa para plano pago.
**Gratuidade depende do provedor:** o modelo pode deixar de existir. O app não deve gastar créditos ou usar outro modelo sem revisão expressa.
## Dados
Supabase persiste aulas, provas e eventos; CPF nunca é fornecido ao modelo. O banco ainda precisa de isolamento próprio, sem migração destrutiva de produção.
## Verificação
`npm test`, implantação de prévia, e uma solicitação real de aluno autenticado. Saúde `/api/health` mostra configuração mas não substitui o teste real.
