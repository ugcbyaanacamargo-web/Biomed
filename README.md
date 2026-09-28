# BIOMED — Sensibilidade Somática e Modulação da Dor

Plataforma educacional interativa para estudo de fisiologia sensorial, nocicepção e modulação da dor.

## Arquitetura de aprendizagem

O conteúdo segue cinco etapas:

1. **Perceber** — modalidades e receptores.
2. **Conduzir** — fibras Aβ, Aδ e C e vias ascendentes.
3. **Processar** — nocicepção x dor, atenção, emoção e contexto.
4. **Modular** — Teoria do Portão e modulação descendente.
5. **Aplicar** — Semáforo Sensorial e situações práticas.

Depois o aluno entra em uma área de **treino adaptativo** e **revisão ativa**.

## Laboratório adaptativo

O site agora possui um motor local, sem API paga, que:

- aplica **diagnóstico inicial** de 10 questões intercaladas;
- mantém um **mapa de domínio por conceito**, em vez de contar apenas páginas concluídas;
- gera **questões variáveis** combinando assunto, contexto e caso;
- prioriza automaticamente os **assuntos com menor domínio**;
- registra **confusões recorrentes** (ex.: Aδ × C, nocicepção × dor);
- corrige **respostas abertas de 0 a 10** com rubrica por conceitos esperados;
- mostra exatamente **o que apareceu e o que faltou** na resposta;
- oferece **3 simulações**:
  - misturador de modulação da dor;
  - corrida de condução Aβ/Aδ/C;
  - perguntas contrafactuais “e se eu mudar só uma variável?”;
- apresenta **casos em etapas** com retirada progressiva da ajuda:
  - exemplo resolvido;
  - ajuda parcial;
  - resolução independente;
- mistura tópicos para **prática intercalada**;
- cria um **relatório do tutor** dizendo o que o aluno deve estudar a seguir;
- guarda progresso, domínio e histórico no armazenamento local do navegador;
- funciona sem conta, banco de dados ou servidor.

## Recursos gerais

- 6 ilustrações vetoriais próprias em assets/;
- navegação guiada em 5 etapas;
- três modos de estudo;
- continuar de onde parou;
- checagens rápidas por etapa;
- Teoria do Portão interativa;
- Semáforo Sensorial com 10 situações;
- flashcards e quiz;
- revisão distribuída sugerida;
- busca interna;
- modo claro/escuro;
- layout responsivo;
- versão para impressão.

## Base pedagógica

A estrutura combina:

- segmentação e sinalização em aprendizagem multimídia;
- prática de recuperação;
- prática distribuída;
- autoexplicação;
- exemplos resolvidos com retirada progressiva da ajuda;
- prática intercalada;
- avaliação formativa com feedback;
- aprendizagem por domínio.

As referências acadêmicas aparecem na página do site.

## Deploy

O projeto é HTML/CSS/JavaScript puro.

Na Vercel ou Netlify, publique a raiz do repositório sem comando de build.

Site atual: https://biomed-sepia.vercel.app
