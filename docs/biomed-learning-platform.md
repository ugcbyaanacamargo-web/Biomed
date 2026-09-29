# BIOMED — Plataforma de Estudo Guiado

## Arquitetura

O BIOMED autenticado funciona como um aplicativo orientado por estado. A página longa original continua no repositório como fonte de conteúdo e fallback, mas é ocultada quando a sessão persistente do aluno é carregada.

Fluxo principal:

```
CPF → sessão BIOMED → painel → próxima aula → interação → persistência
                                      ↓
                                  Tutor IA
                                      ↓
                              plano JSON validado
                                      ↓
                         componentes visuais BIOMED
```

## Áreas do aluno

- **Início:** progresso geral, Learning Score, última nota, etapa atual e um único CTA “Continuar estudando”.
- **Minha trilha:** Perceber → Conduzir → Processar → Modular → Aplicar.
- **Tutor IA:** experiência visual adaptativa; texto livre existe apenas como canal complementar.
- **Praticar:** treino recomendado pela IA ou modos específicos de perguntas, resposta aberta, simulação e casos.
- **Provas e simulados:** prova de cada etapa, simulado cumulativo, histórico, melhor/última nota e aprovação.
- **Meu progresso:** progresso por etapa e nota da prova.
- **Ranking:** Learning Score e nível; CPF nunca é exibido.
- **Biblioteca / Revisão:** consulta rápida separada da trilha.

## Curso

O curso possui cinco módulos e quinze aulas iniciais em `data/course-model.js`.

Cada aula contém blocos controlados, como conceito, caminho neural, comparação de fibras, pergunta objetiva, resposta aberta, caso e simulação.

A aula é concluída explicitamente e o backend grava o próximo ponto de retomada.

## Tutor IA visual

O modelo principal continua sendo **Muse Spark 1.3 Contributor Free** executado pelo **OpenCode CLI dentro de Vercel Sandbox**.

O modelo não recebe o repositório, credenciais de GitHub ou acesso administrativo. No modo visual, ele não pode retornar HTML livre. Ele recebe um contrato e pode escolher apenas tipos autorizados:

```
concept
key_point
neural_path
fiber_comparison
compare
multiple_choice
prediction
open_answer
ordering
case_step
simulation
gate_diagram
feedback
checkpoint
tutor_message
```

O backend normaliza a resposta com `tutor-schema.js`. O frontend monta a experiência por `learning-components.js`.

O resultado é: **a IA organiza a aula; o BIOMED controla a interface**.

## Avaliações

`assessment-engine.js` define a nota mínima padrão:

```
PASS_THRESHOLD = 70
```

A prova de etapa possui 10 questões. Durante a prova, a resposta correta não é revelada. No fim:

- nota de 0 a 100;
- aprovado/revisão necessária;
- tópicos fracos;
- histórico de tentativas;
- melhor nota;
- nota mais recente;
- recomendação de recuperação.

O simulado cumulativo usa o mesmo mecanismo, com questões de todos os módulos.

## Persistência

Objetos principais:

- `biomed_students`
- `biomed_sessions`
- `biomed_events`
- `biomed_learning_state`
- `biomed_exam_attempts`
- `biomed_private_config`

RPCs da nova experiência:

- `biomed_learning_profile(token)`
- `biomed_learning_action(token,event_key,action,payload)`

APIs Vercel:

- `GET /api/learning-state`
- `POST /api/learning-event`
- `POST /api/tutor`

Os eventos são idempotentes por `event_key`.

O CPF original continua sem persistência. A identidade persistente usa o mecanismo HMAC já existente no BIOMED.

## Segurança

As tabelas BIOMED têm RLS ativa e não são expostas para leitura/escrita direta. O acesso da aplicação ocorre pelos RPCs controlados.

Os advisors do Supabase sinalizam funções `SECURITY DEFINER` acessíveis ao papel `anon`. Isso é intencional nesta arquitetura específica porque a API Vercel chama o REST RPC com a chave publicável e a autorização efetiva é feita pelo token BIOMED passado ao RPC. Os RPCs validam esse token antes de acessar o aluno.

Não transformar essas funções em `SECURITY INVOKER` ou revogar `anon` sem primeiro mudar o backend para uma credencial server-side apropriada, pois isso quebraria a autenticação atual.

## Analytics / PostHog

`analytics.js` oferece uma camada central de eventos e sanitização.

Eventos previstos:

```
student_dashboard_viewed
study_resumed
lesson_started
lesson_block_viewed
answer_submitted
answer_correct
lesson_completed
practice_started
simulation_used
exam_started
exam_completed
exam_passed
exam_failed
tutor_action_rendered
student_stuck_detected
```

Propriedades com nomes relacionados a CPF/documento/token/senha são descartadas, assim como valores com formato de CPF.

A inicialização é opcional. `GET /api/runtime-config` expõe somente configuração pública:

- `POSTHOG_PUBLIC_KEY`
- `POSTHOG_HOST`

Sem essas variáveis, analytics vira no-op e não interfere no estudo.

**Importante:** o conector PostHog disponível durante esta implementação estava apontando para um workspace externo que não é o BIOMED. Nenhuma alteração foi feita nesse workspace. Para ingestão real do BIOMED, configurar as duas variáveis públicas no projeto Vercel usando um projeto PostHog pertencente ao BIOMED.

## Testes

`npm test` executa:

1. verificação de sintaxe dos módulos críticos;
2. testes do modelo do curso;
3. testes de avaliação;
4. testes de segurança do schema do Tutor;
5. testes de privacidade dos analytics;
6. testes estruturais do shell;
7. testes do contrato de persistência.

O workflow `.github/workflows/biomed-ci.yml` usa Node 22 e executa essa suíte em push e pull request.

## Design

Referência Figma criada durante a reconstrução:

- Painel do aluno;
- Aula visual;
- Tutor IA visual;
- Resultado de prova.

Arquivo: https://www.figma.com/design/imoWOWbZT4UgDOq5Jz6g0A

## Implantação

A implementação é desenvolvida na branch `feature/biomed-guided-learning`, validada em preview e depois integrada à `main`.

A `main` é a origem da produção Vercel:

https://biomed-sepia.vercel.app/

## Regra operacional

Uma mudança de aprendizagem só é considerada completa quando:

```
código
→ testes
→ banco/API
→ preview
→ navegador real
→ produção
→ verificação de erros
```
