# BIOMED — Plataforma de Estudo Guiado

BIOMED ensina fisiologia sensorial, nocicepção, dor e modulação da dor por uma trilha curta e progressiva:

**Perceber → Conduzir → Processar → Modular → Aplicar**

## Arquitetura atual

O projeto possui **um único aplicativo do aluno**. Após autenticar, o aluno entra no painel guiado com:

- Início
- Minha trilha
- Tutor IA
- Praticar
- Provas e simulados
- Meu progresso
- Ranking
- Biblioteca / Revisão

O estado acadêmico fica no Supabase. A interface principal está em `study-platform.js`.

## Tutor IA

O Tutor é um **professor adaptativo**, não um agente de programação.

Fluxo:

```
aluno → /api/tutor → OpenCode Zen API → modelo → validação BIOMED → componente pedagógico
```

O servidor chama o Zen diretamente. Não existe OpenCode CLI, `opencode serve`, sessão de agente ou Vercel Sandbox no caminho da resposta.

A tela mostra uma atividade pedagógica segura imediatamente e substitui/refina o conteúdo quando a resposta da IA chega.

Modelo padrão:

`muse-spark-1.3-contributor-free`

## Persistência

Tabelas centrais:

- `biomed_students`
- `biomed_sessions`
- `biomed_events`
- `biomed_learning_state`
- `biomed_exam_attempts`
- `biomed_private_config`

O CPF original não é enviado ao Tutor IA.

## Hospedagem

- **Vercel:** produção principal — https://biomed-sepia.vercel.app
- **Railway:** runtime secundário/benchmark do mesmo código, sem uma segunda arquitetura de IA.

## Testes

```
npm test
```

Consulte `AGENTS.md` e `docs/architecture.md` antes de alterar a arquitetura.
