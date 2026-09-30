# BIOMED — estudo guiado
Percurso único do aluno: Perceber → Conduzir → Processar → Modular → Aplicar.

## Aplicação
`index.html` prepara uma única tela de acesso ou restauração de sessão. `auth.js` autentica e `study-platform.js` constrói um único aplicativo com trilha, Tutor, treino, provas, progresso, ranking e biblioteca.

## Tutor IA
```
Aluno → /api/tutor na Vercel → Supabase (contexto anônimo do aluno)
      → API direta da Groq → openai/gpt-oss-120b
      → tutor-schema.js → atividade visual
```

Não há OpenCode CLI, Vercel Sandbox, Railway, Ollama ou Vercel AI Gateway no caminho da IA. A função `/api/tutor` faz uma única chamada HTTPS à Groq.

O modelo fica travado em `openai/gpt-oss-120b`; o código rejeita troca silenciosa para outro modelo. A credencial fica somente em `GROQ_API_KEY` na Vercel e nunca deve ser salva no Git.

### Internet sem outro agente intermediário
O GPT-OSS 120B da Groq suporta `browser_search` executado nos próprios servidores da Groq. O BIOMED só habilita essa ferramenta quando a pergunta pede informação atual, pesquisa na web, fontes ou conteúdo recente. Perguntas normais de fisiologia não acionam busca, evitando latência desnecessária.

A arquitetura continua com fallback local imediato no frontend: se a IA externa falhar ou ultrapassar o limite, o aluno não fica preso na tela.

### Gratuidade
A integração foi desenhada para a cota gratuita da conta Groq. O aplicativo não troca automaticamente para outro modelo ou provedor. Limites e disponibilidade do plano gratuito são definidos pela Groq e podem mudar; o código mantém o modelo fixo para impedir migração silenciosa.

## Dados
Supabase persiste aulas, provas e eventos; CPF nunca é fornecido ao modelo. O contexto enviado à IA é pedagógico e anonimizado.

## Verificação
Execute `npm test`, publique a prévia e faça uma solicitação real de aluno autenticado. `/api/health` mostra se `GROQ_API_KEY` está configurada, mas o teste real de `/api/tutor` é a validação final.
