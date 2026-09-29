# BIOMED — Plataforma de Estudo Guiado

Plataforma educacional para sensibilidade somática, nocicepção, dor e modulação da dor.

## Experiência atual

Após o acesso, o aluno entra em um aplicativo com telas separadas:

- Início
- Minha trilha
- Tutor IA
- Praticar
- Provas e simulados
- Meu progresso
- Ranking
- Biblioteca / Revisão

A trilha principal é:

```
Perceber → Conduzir → Processar → Modular → Aplicar
```

Cada etapa possui aulas curtas, atividades e prova. O Painel mostra sempre a próxima ação.

## Tutor IA visual

O modelo principal é **Muse Spark 1.3 Contributor Free**, executado pelo OpenCode em um Vercel Sandbox isolado.

A IA não cria o site. Ela escolhe a próxima ação pedagógica e retorna um plano estruturado. O BIOMED valida esse plano e monta componentes visuais: conceitos, diagramas, comparação de fibras, perguntas clicáveis, respostas abertas, casos, simulações e feedback.

## Provas e progresso

- 10 questões por prova de etapa;
- nota de 0 a 100;
- aprovação padrão em 70%;
- histórico de tentativas;
- melhor e última nota;
- recuperação direcionada;
- simulado cumulativo.

O progresso considera aulas, atividades, avaliações e domínio demonstrado.

## Learning Score

- 40% domínio por tópico
- 25% provas
- 15% simulações e casos
- 10% retenção
- 5% consistência
- 5% respostas abertas

Níveis: **Bronze → Prata → Ouro → Diamante**.

## Persistência

Estruturas centrais:

- `biomed_students`
- `biomed_events`
- `biomed_sessions`
- `biomed_learning_state`
- `biomed_exam_attempts`
- `biomed_private_config`

O identificador civil original não é persistido no banco.

## Arquivos principais

- `study-platform.js` — shell, rotas e telas do aplicativo
- `study-shell.css` — interface principal
- `data/course-model.js` — módulos e aulas
- `learning-components.js` — componentes educacionais interativos
- `assessment-engine.js` — provas e pontuação
- `visual-tutor.js` — Tutor visual
- `tutor-schema.js` — validação da saída da IA
- `analytics.js` — eventos e privacidade
- `api/learning-state.js`
- `api/learning-event.js`
- `api/tutor.js`
- `db/biomed_learning_platform.sql`
- `tests/*.test.mjs`

## Testes

```
npm test
```

A suíte verifica sintaxe, curso, progresso, avaliações, Tutor visual, analytics e persistência.

## Documentação

- `docs/biomed-learning-platform.md`
- `docs/superpowers/specs/2026-09-29-biomed-learning-platform-design.md`
- `docs/superpowers/plans/2026-09-29-biomed-guided-learning-platform.md`

## Produção

https://biomed-sepia.vercel.app

A branch `main` publica automaticamente na Vercel.
