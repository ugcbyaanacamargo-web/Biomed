# BIOMED — Portal Adaptativo de Fisiologia Sensorial

Plataforma educacional para sensibilidade somática, nocicepção e modulação da dor.

## Experiência do aluno

1. **Entrada por CPF**
   - o CPF é validado;
   - no servidor ele é transformado em HMAC-SHA256;
   - o CPF original não é gravado no banco;
   - se o aluno não existir, o site pede o nome e cria o perfil;
   - se já existir, recupera nome, nível e progresso.

2. **Painel personalizado**
   - domínio global;
   - XP;
   - precisão;
   - missão recomendada;
   - mapa de domínio por tema;
   - prova de nível;
   - evolução Bronze → Prata → Ouro → Diamante.

3. **Tutor BIOMED**
   - chat por texto;
   - explicação personalizada;
   - geração de perguntas novas;
   - simulações;
   - avaliação de resposta aberta de 0 a 10;
   - feedback e nova pergunta focada na lacuna.

4. **Laboratório adaptativo**
   - diagnóstico;
   - perguntas variáveis;
   - respostas abertas;
   - simulações;
   - casos clínicos em etapas;
   - mapa de domínio.

5. **Ranking**
   - usa domínio, provas, simulações/casos, retenção, consistência e respostas abertas;
   - chat isolado não aumenta ranking;
   - exibe nome mascarado, nunca CPF.

## Métrica de aprendizagem

Learning Score:

- 40% domínio por tópico;
- 25% provas;
- 15% simulações e casos;
- 10% retenção;
- 5% consistência;
- 5% qualidade de respostas abertas.

### Níveis

- **Bronze** — entrada e fundamentos.
- **Prata** — score ≥45, diagnóstico, ao menos 4 módulos e prova ≥60%.
- **Ouro** — score ≥70, todos os tópicos ≥70%, prova ≥75% e práticas aprovadas.
- **Diamante** — score ≥88, tópicos ≥85%, prova ≥85%, retenção ≥80% e respostas abertas fortes.

## OpenCode

O projeto contém dois caminhos separados:

### Tutor no site
A função `/api/tutor` usa a API OpenCode Zen e tenta, em ordem, modelos gratuitos compatíveis:

- `nemotron-3.5-lightning-free`
- `mimo-v2.6-flash-free`
- `ling-3.0-flash-fin-free`
- `space-bunny-free`

O CPF e o nome do aluno **não são enviados ao modelo**.

### OpenCode dentro do GitHub
`.github/workflows/opencode-tutor.yml` executa OpenCode no GitHub Actions em modo somente leitura.

`opencode.json` bloqueia:
- edição;
- escrita;
- bash;
- subagentes;
- web;
- diretórios externos.

Mesmo que um aluno escreva uma instrução para alterar o repositório, o Tutor não recebe permissões de escrita.

## Banco de dados

O repositório é público, portanto dados pessoais **não são gravados em arquivos GitHub**.

O código e o schema ficam no GitHub em:

`db/schema.sql`

Os registros de alunos ficam em banco persistente configurado pelo servidor.

Variáveis necessárias na Vercel:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CPF_HMAC_SECRET=
SESSION_SECRET=
OPENCODE_API_KEY=
OPENCODE_MODEL=nemotron-3.5-lightning-free
ALLOWED_ORIGIN=https://biomed-sepia.vercel.app
```

Enquanto o banco não estiver conectado, o frontend entra em **modo local** e salva o perfil apenas no navegador. Isso permite testar o fluxo, mas não oferece reconhecimento entre aparelhos nem ranking global.

## Arquivos principais

- `index.html` — conteúdo principal
- `styles.css` — design didático
- `student.css` — portal do aluno
- `app.js` — navegação
- `adaptive-engine.js` — motor adaptativo
- `student-app.js` — autenticação, painel, tutor, ranking e provas
- `api/auth.js`
- `api/profile.js`
- `api/event.js`
- `api/ranking.js`
- `api/tutor.js`
- `api/health.js`
- `db/schema.sql`
- `TUTOR_RULES.md`

## Deploy

Site: https://biomed-sepia.vercel.app

O projeto continua compatível com deploy automático da branch `main` na Vercel.
