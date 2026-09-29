# Arquitetura BIOMED

## Responsabilidades

### Navegador
`auth.js` autentica. `study-platform.js` é o aplicativo. `learning-components.js` renderiza blocos pedagógicos. `visual-tutor.js` mostra uma atividade imediata e aplica o refinamento da IA.

### Vercel
Hospeda a experiência principal e APIs leves. A rota do Tutor encaminha a solicitação para o runtime persistente do Railway.

### Railway
Mantém `opencode serve` vivo em `127.0.0.1`. O processo é aquecido quando o container inicia. Cada interação cria apenas a sessão lógica necessária e usa o modelo; não reinstala nem reinicia o OpenCode.

### Supabase
Persiste aluno, sessão, eventos, progresso e provas.

## Fluxo do Tutor

```
Aluno
  ↓
atividade local imediata
  ↓
POST /api/tutor (Vercel)
  ↓
Railway /api/tutor
  ↓
perfil pedagógico no Supabase
  ↓
OpenCode persistente
  ↓
modelo -free
  ↓
tutor-schema.js
  ↓
interface refina a atividade
```

## Por que não usar Zen direto para o free tier

O endpoint Zen é público, mas o provedor atualmente rejeita os modelos `-free` quando chamados fora do OpenCode. O runtime foi validado em produção e retornou HTTP 403 com a mensagem de que o free tier só pode ser usado dentro do OpenCode.

Portanto, chamadas Zen diretas podem ser usadas futuramente para modelos que permitam isso, mas não são a arquitetura do Tutor gratuito.

## Latência

O ganho vem de manter o OpenCode já iniciado no Railway. Assim, o aluno não paga por instalação, boot de Sandbox ou boot do servidor OpenCode em cada pergunta.

O benchmark compara modelos gratuitos usando o mesmo prompt JSON e é habilitado somente de forma controlada por `BIOMED_MODEL_BENCHMARK=1`.

## Banco

A implementação atual ainda compartilha um projeto Supabase com outro sistema. Isso é dívida técnica.

Destino correto: projeto Supabase exclusivo do BIOMED, com migrations próprias e `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` configurados na hospedagem.

## Critério de mudança

Uma mudança está correta quando reduz duplicação, mantém uma única fonte de verdade, preserva o Tutor como professor e passa `npm test`.
