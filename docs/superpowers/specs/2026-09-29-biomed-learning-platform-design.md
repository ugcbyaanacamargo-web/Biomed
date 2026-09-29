# BIOMED — Plataforma de Estudo Guiado por IA

**Data:** 2026-09-29  
**Status:** Design aprovado em conversa, aguardando revisão deste documento antes do plano de implementação.

## 1. Objetivo

Transformar o BIOMED de uma página longa com conteúdo sequencial em uma plataforma educacional guiada, com navegação por telas, progresso persistente, avaliações formais e um Tutor IA que conduz o aluno por experiências visuais e interativas.

O conteúdo conceitual já existente continua válido. O que muda é a arquitetura de experiência: o aluno deve sempre saber onde está, o que fazer agora, o que já concluiu e qual é o próximo passo.

## 2. Princípio central

A IA não cria o site nem escreve HTML/CSS arbitrário para cada aluno.

O site é construído previamente com componentes visuais seguros e consistentes. A IA atua como **orquestradora pedagógica**: escolhe qual componente mostrar, qual conteúdo preencher, qual pergunta fazer, qual simulação abrir, quando revisar e quando aplicar uma prova.

Fluxo:

```
Aluno
  ↓
Estado de aprendizagem
  ↓
Tutor IA
  ↓
Decisão pedagógica estruturada
  ↓
Renderizador BIOMED
  ↓
Tela visual/interativa
  ↓
Resposta do aluno
  ↓
Avaliação + progresso
  ↓
Próxima decisão da IA
```

## 3. Navegação principal

Após autenticação, o aluno entra no **Painel**, não no conteúdo longo.

Menu principal:

```
🏠 Início

📚 Minha trilha
   ├── 1. Perceber
   ├── 2. Conduzir
   ├── 3. Processar
   ├── 4. Modular
   └── 5. Aplicar

🧠 Tutor IA

🎯 Praticar
   ├── Perguntas
   ├── Respostas abertas
   ├── Simulações
   └── Casos

📝 Provas e simulados
   ├── Prova da etapa
   ├── Simulado cumulativo
   ├── Histórico
   └── Notas / aprovação

📊 Meu progresso

🏆 Ranking

📖 Biblioteca / Revisão
```

Cada item abre uma **tela própria**. O conteúdo principal não será mais exposto como uma única rolagem gigantesca.

## 4. Painel inicial

O Painel deve responder imediatamente:

1. Onde eu estou?
2. O que eu faço agora?
3. Quanto falta?
4. Como estou indo?
5. Qual foi minha última nota?
6. O Tutor recomenda o quê?

Elementos:

- Saudação pelo nome.
- Nível atual: Bronze, Prata, Ouro ou Diamante.
- Progresso geral do curso.
- Learning Score.
- Última atividade.
- Última nota.
- Status de aprovação da etapa atual.
- Card principal **Continuar estudando**.
- Card **Recomendação do Tutor**.
- Trilha resumida com estados: concluído, atual, bloqueado/opcional.
- Próxima revisão programada.

## 5. Estrutura da trilha

Cada etapa é dividida em aulas menores.

Exemplo:

```
2. CONDUZIR
   ├── Aula 1 — Por que o sinal precisa viajar
   ├── Aula 2 — Fibras Aβ
   ├── Aula 3 — Fibras Aδ
   ├── Aula 4 — Fibras C
   ├── Aula 5 — Comparação Aβ × Aδ × C
   ├── Checagem da etapa
   └── Prova da etapa
```

Cada aula é uma tela controlada por estado. O aluno vê somente o necessário naquele momento.

## 6. Componentes educacionais visuais

O frontend terá uma biblioteca fixa de componentes reutilizáveis. A IA pode escolher e preencher esses componentes, mas não inventar a estrutura da aplicação.

Componentes previstos:

- `LessonHero`
- `LearningGoal`
- `ConceptCard`
- `NeuralPathDiagram`
- `FiberComparison`
- `BodyMap`
- `GateControlDiagram`
- `DescendingControlDiagram`
- `StimulusAnimation`
- `KeyPoint`
- `StepExplanation`
- `MultipleChoice`
- `TrueFalse`
- `OpenAnswer`
- `PredictionPrompt`
- `OrderingExercise`
- `CaseStep`
- `SimulationPanel`
- `FeedbackCard`
- `ProgressCheckpoint`
- `ExamIntro`
- `ExamQuestion`
- `ExamResult`
- `TutorCoach`
- `NextAction`

Esses componentes formam páginas completas, bonitas e demonstrativas, preservando o estilo visual já existente no BIOMED.

## 7. Tutor IA visual

O Tutor deixa de ser um chat simples.

Ele passa a ser uma experiência de aula orientada por IA.

A tela pode conter simultaneamente:

- fala curta do Tutor;
- título;
- objetivo;
- ilustração;
- diagrama;
- animação conceitual;
- pergunta;
- opções clicáveis;
- campo de resposta aberta;
- feedback;
- barra de progresso;
- botão de próxima ação.

O chat textual continua existindo como apoio, mas não é mais a interface principal.

### 7.1 Exemplo de fluxo

```
Tutor: "Vamos descobrir por que esfregar uma região dolorida pode aliviar."

[Diagrama visual]
mão → fibra Aβ → corno dorsal → interneurônio inibitório

Tutor: "Antes de eu explicar, faça uma previsão."

[ Aumenta a dor ] [ Diminui a dor ]

Aluno clica.

↓ IA avalia

[Feedback visual]

↓ IA escolhe próximo passo

[Animação do portão + explicação]

[ Continuar ]
```

## 8. Contrato de saída da IA

A IA deve responder ao frontend em formato estruturado, não em texto livre arbitrário.

Exemplo conceitual:

```json
{
  "screen": {
    "title": "Fibras Aβ, Aδ e C",
    "objective": "Comparar velocidade, mielina e função.",
    "progressLabel": "Aula 3 de 5"
  },
  "blocks": [
    {
      "type": "fiber_comparison",
      "data": {}
    },
    {
      "type": "prediction",
      "question": "Qual fibra conduz mais rapidamente?",
      "options": ["Aβ", "Aδ", "C"]
    }
  ],
  "nextAction": {
    "type": "wait_for_answer"
  }
}
```

O backend valida o formato e aceita somente tipos de componentes previamente autorizados.

## 9. Respostas do aluno

A IA deve interagir das duas formas pedidas:

### 9.1 Resposta clicável

- múltipla escolha;
- verdadeiro/falso;
- selecionar região;
- ordenar etapas;
- escolher mecanismo;
- mover controle em simulação.

### 9.2 Resposta escrita

- explicação curta;
- resposta discursiva;
- justificativa;
- interpretação de caso.

A IA avalia a resposta escrita por mecanismo e raciocínio, não apenas por palavras-chave.

## 10. Prática

A área **Praticar** não segue uma sequência fixa. A IA ordena a sessão com base em desempenho, confusões e retenção.

Pode alternar automaticamente:

```
pergunta objetiva
→ resposta aberta
→ simulação
→ caso clínico
→ revisão curta
→ nova pergunta
```

O aluno pode selecionar um modo manualmente, mas o botão principal será **Treino recomendado pela IA**.

## 11. Provas e simulados

A plataforma terá avaliações formais separadas da prática.

### 11.1 Prova da etapa

Cada etapa possui uma prova.

Exemplo de regra inicial:

- 10 questões;
- mistura objetiva, interpretação e resposta curta;
- nota de 0 a 100;
- aprovado com 70 ou mais;
- abaixo de 70: IA cria revisão direcionada e permite nova tentativa;
- histórico de todas as tentativas;
- melhor nota e nota mais recente armazenadas.

A nota mínima deve ficar configurável no sistema.

### 11.2 Simulado cumulativo

Mistura conteúdos de várias etapas.

Exemplo:

- Bronze: etapas já estudadas;
- Prata: múltiplas etapas;
- Ouro/Diamante: integração, casos e transferência.

### 11.3 Resultado

Após a prova:

```
PROVA — CONDUZIR

Nota: 82 / 100
Status: APROVADO ✓

Você dominou:
✓ fibras Aβ
✓ sistema anterolateral

Precisa revisar:
! diferença entre Aδ e C

[ Revisar erros ]
[ Próxima etapa ]
```

A IA explica os erros após o encerramento da prova, sem revelar respostas antes.

## 12. Progressão

O progresso não depende de checkbox manual.

Eventos que contam para progresso:

- aula visual concluída;
- checkpoint respondido;
- atividade prática realizada;
- prova realizada;
- domínio demonstrado;
- revisão de retenção concluída.

Cada aula terá estados:

```
não iniciada
em andamento
concluída
revisão recomendada
```

Cada etapa terá:

```
progresso %
domínio %
nota da prova
status de aprovação
última atividade
```

## 13. Regras de avanço

O sistema recomenda a sequência, mas evita travas desnecessárias.

Fluxo normal:

```
Aulas da etapa
→ checagem
→ prova
→ aprovado
→ próxima etapa
```

Se não aprovado:

```
resultado
→ IA identifica lacunas
→ mini trilha de recuperação
→ novo treino
→ nova tentativa
```

## 14. Adaptação pela IA

A IA recebe somente contexto pedagógico necessário:

- etapa atual;
- aula atual;
- progresso;
- domínio por tópico;
- últimas respostas;
- erros recorrentes;
- notas;
- tentativas;
- retenção;
- nível;
- histórico recente.

A IA decide entre ações permitidas:

- explicar;
- exemplificar;
- mostrar diagrama;
- comparar;
- perguntar;
- pedir previsão;
- abrir simulação;
- apresentar caso;
- revisar;
- aplicar checkpoint;
- recomendar prova;
- corrigir resposta;
- avançar.

## 15. Ilustrações

A IA não gera layout livre em HTML.

O site possui diagramas e componentes gráficos próprios para:

- receptores;
- fibras;
- vias;
- medula;
- cérebro;
- portão da dor;
- modulação descendente;
- semáforo;
- corpo/região estimulada.

A IA escolhe qual ilustração mostrar e quais estados destacar.

Para conteúdo variável, o frontend pode alterar:

- rótulos;
- destaques;
- setas;
- intensidade;
- região corporal;
- fibra selecionada;
- estado do portão;
- cor/ênfase semântica;
- sequência mostrada.

## 16. Experiência visual

Diretrizes:

- aparência de aplicativo, não artigo;
- uma tarefa principal por tela;
- chamadas claras: **Faça isto agora**;
- barra de progresso sempre visível;
- botão principal destacado;
- cards grandes e legíveis;
- ilustrações integradas à explicação;
- feedback imediato;
- sem blocos longos de texto;
- textos divididos em passos;
- versão móvel completa;
- acessibilidade por teclado e foco visível.

## 17. Dados e persistência

O Supabase continua como fonte de verdade.

O modelo de dados deve representar:

- aluno;
- sessão;
- progresso por etapa;
- progresso por aula;
- domínio por tópico;
- atividades;
- respostas;
- avaliações;
- tentativas de prova;
- notas;
- aprovação;
- recomendações;
- revisões;
- eventos pedagógicos.

O CPF bruto continua fora do banco persistente.

## 18. Segurança

Separar claramente:

### Tutor do aluno

- sem GitHub;
- sem Vercel;
- sem Supabase administrativo;
- sem shell;
- sem edição de arquivos;
- somente decisões pedagógicas dentro do contrato autorizado.

### Desenvolvedor/admin

Permissões separadas e nunca acessíveis pelo aluno.

## 19. Analytics

PostHog será usado para medir experiência, sem enviar CPF.

Eventos principais:

- `student_dashboard_viewed`
- `study_resumed`
- `lesson_started`
- `lesson_block_viewed`
- `answer_submitted`
- `answer_correct`
- `lesson_completed`
- `practice_started`
- `simulation_used`
- `exam_started`
- `exam_completed`
- `exam_passed`
- `exam_failed`
- `tutor_action_rendered`
- `student_stuck_detected`

Objetivo: medir onde o aluno abandona, repete, erra ou não entende a próxima ação.

## 20. Migração do conteúdo atual

O conteúdo existente será reaproveitado e quebrado em unidades menores.

Mapeamento inicial:

- Perceber → módulo 1;
- Conduzir → módulo 2;
- Processar → módulo 3;
- Modular → módulo 4;
- Aplicar → módulo 5;
- Laboratório → motor de prática;
- Revisão → biblioteca e revisão espaçada;
- Quiz atual → base para provas;
- Semáforo → componente de casos.

A antiga página longa deixa de ser a experiência principal.

## 21. Critérios de sucesso

A reconstrução só será considerada concluída quando:

1. o aluno autenticado cair no Painel;
2. houver um único CTA principal de continuidade;
3. nenhum módulo exigir rolar por todo o curso;
4. cada módulo/aula tiver tela própria;
5. progresso real for persistido;
6. notas e aprovação aparecerem no perfil;
7. prova de etapa funcionar;
8. simulado cumulativo funcionar;
9. Tutor gerar sequência estruturada;
10. Tutor renderizar componentes visuais, não apenas texto;
11. aluno puder responder clicando ou escrevendo;
12. IA adaptar o próximo passo;
13. conteúdo visual atual for reaproveitado;
14. versão móvel funcionar;
15. deploy da Vercel passar;
16. fluxos críticos forem testados em navegador real;
17. eventos de progresso forem verificáveis;
18. falhas não deixarem o aluno sem próxima ação.

## 22. Conta sintética de teste

Para testes automatizados não será usado CPF real do usuário.

Como o formulário valida CPF, será criado um **CPF sintético válido matematicamente**, sem relação com pessoa real, com nome:

`ChatGPT Teste BIOMED`

A conta será marcada/identificada como teste no ambiente ou removida após a validação para não poluir ranking e métricas.

## 23. Fora de escopo desta reconstrução

- diagnóstico médico;
- geração livre de HTML pela IA;
- acesso do Tutor do aluno ao GitHub;
- criação de páginas administrativas nesta fase;
- mudança do conteúdo científico para outros temas além do escopo atual.

## 24. Decisão arquitetural

A implementação seguirá a abordagem de **aplicativo educacional orientado por estado**, com:

- shell de aplicação;
- roteamento por telas;
- motor de aulas;
- motor de avaliações;
- motor de progresso;
- biblioteca de componentes educacionais;
- Tutor IA estruturado;
- Supabase para estado persistente;
- Vercel para frontend/backend;
- PostHog para telemetria;
- testes de fluxo em navegador real.

Essa abordagem substitui a navegação baseada em uma página longa e preserva o conteúdo e a lógica pedagógica já construídos.
