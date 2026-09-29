# BIOMED — Portal Adaptativo de Fisiologia Sensorial

Plataforma educacional para sensibilidade somática, nocicepção e modulação da dor.

## Estado atual

- **Produção:** https://biomed-sepia.vercel.app
- **Banco persistente:** ativo.
- **Cadastro por CPF:** ativo; CPF bruto não é armazenado.
- **Ranking global:** ativo pelo banco persistente.
- **Tutor IA no navegador:** ativo com WebLLM + Qwen, sem API.
- **OpenCode no GitHub:** ativo com Ollama + Qwen local no próprio runner, sem API externa.
- **OpenCode Zen:** opcional; usado somente se uma chave Zen for configurada.

## Fluxo do aluno

1. O aluno informa o CPF.
2. Se for o primeiro acesso, informa o nome.
3. O servidor transforma o CPF em HMAC-SHA256 com um segredo mantido no banco.
4. O banco cria uma sessão aleatória de 30 dias e guarda apenas o hash da sessão.
5. O painel recupera nível, XP, domínio, provas, simulações e histórico.
6. O motor recomenda a próxima atividade.
7. O aluno progride em **Bronze → Prata → Ouro → Diamante**.

## Métrica de aprendizagem

**Learning Score**

- 40% domínio por tópico;
- 25% provas;
- 15% simulações e casos;
- 10% retenção;
- 5% consistência;
- 5% qualidade das respostas abertas.

O chat isolado não aumenta a posição no ranking.

### Níveis

- **Bronze** — fundamentos.
- **Prata** — score ≥45, diagnóstico concluído, pelo menos 4 módulos e prova ≥60%.
- **Ouro** — score ≥70, todos os tópicos ≥70%, prova ≥75% e práticas aprovadas.
- **Diamante** — score ≥88, tópicos ≥85%, prova ≥85%, retenção ≥80% e forte desempenho em respostas abertas.

## Tutor BIOMED

O chat possui três camadas:

### 1. OpenCode Zen opcional

Se `OPENCODE_API_KEY` estiver configurado, a função `/api/tutor` tenta os modelos gratuitos atuais do OpenCode Zen.

### 2. WebLLM local no navegador

Sem chave externa, o site carrega sob demanda:

`Qwen3-0.6B-q4f16_1-MLC`

A inferência ocorre no navegador via WebGPU. O modelo é baixado somente quando o aluno realmente precisa do chat e depois pode ser reaproveitado pelo cache do navegador.

Se o dispositivo não oferecer WebGPU, permanece disponível o motor pedagógico determinístico do BIOMED.

### 3. OpenCode no GitHub Actions

O workflow:

`.github/workflows/opencode-tutor.yml`

instala **Ollama**, baixa **Qwen2.5 3B** no runner e executa:

`opencode run --model ollama/qwen2.5:3b --agent tutor`

Portanto o OpenCode do GitHub não depende de OpenCode Zen, Vercel AI Gateway ou chave de API.

O agente `tutor` é somente leitura:

- edição: negada;
- shell pelo agente: negado;
- subagentes: negados;
- web: negada;
- diretórios externos: negados;
- checkout sem credencial persistente;
- workflow com permissões GitHub somente de leitura.

## Conteúdo adaptativo

O motor combina variáveis de:

- estímulo;
- região corporal;
- receptor;
- Aβ / Aδ / C;
- via sensorial;
- atenção;
- ansiedade;
- estresse;
- contexto;
- estimulação tátil;
- controle descendente;
- situação clínica.

Recursos:

- diagnóstico inicial;
- perguntas variáveis;
- perguntas abertas;
- correção de 0 a 10;
- casos em etapas;
- simulações;
- questões contrafactuais;
- prova de nível;
- revisão de retenção;
- detecção de confusões;
- mapa de domínio;
- recomendação da próxima atividade.

A base pedagógica interna está em:

`data/knowledge-base.json`

## Banco persistente

A conta Supabase atingiu o limite de projetos gratuitos, então não foi possível criar outro projeto físico sem liberar uma vaga.

Para não interromper a implantação, o BIOMED foi isolado dentro do projeto Supabase conectado usando somente objetos com prefixo `biomed_`.

Objetos principais:

- `biomed_students`
- `biomed_events`
- `biomed_sessions`
- `biomed_private_config`

RPCs públicas controladas:

- `biomed_auth`
- `biomed_profile`
- `biomed_record_event`
- `biomed_ranking`

As tabelas têm RLS ativa e não possuem políticas públicas de leitura/escrita. Helpers internos tiveram EXECUTE revogado para `anon` e `authenticated`.

O CPF original não é persistido. Apenas o HMAC é salvo.

## Ranking

O ranking exibe:

- posição;
- primeiro nome + inicial;
- nível;
- Learning Score;
- XP.

Nunca exibe CPF.

## Arquivos principais

- `index.html`
- `styles.css`
- `student.css`
- `app.js`
- `adaptive-engine.js`
- `student-app.js`
- `learning-bridge.js`
- `browser-tutor.js`
- `data/knowledge-base.json`
- `opencode.json`
- `TUTOR_RULES.md`
- `.github/workflows/opencode-tutor.yml`
- `api/auth.js`
- `api/profile.js`
- `api/event.js`
- `api/ranking.js`
- `api/tutor.js`
- `api/health.js`
- `db/schema.sql`

## Deploy

A branch `main` publica automaticamente na Vercel.
