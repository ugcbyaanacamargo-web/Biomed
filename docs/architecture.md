# Arquitetura BIOMED

## 1. Responsabilidade de cada camada

### Navegador
`auth.js` autentica. `study-platform.js` é o aplicativo. `learning-components.js` renderiza blocos pedagógicos. `visual-tutor.js` orquestra a experiência do Tutor.

### API
As rotas `/api/*` validam sessão e fazem a ponte com Supabase e OpenCode Zen. A chave do Zen fica somente no servidor.

### Banco
Supabase persiste aluno, sessão, eventos, progresso e provas. O navegador não deve manter uma segunda base acadêmica paralela.

### IA
`api/_lib/zen-client.js` chama diretamente o endpoint oficial do OpenCode Zen. Para Muse Spark Contributor Free:

`POST https://opencode.ai/zen/v1/responses`

A saída passa pelo contrato do BIOMED antes de virar interface.

## 2. Fluxo do Tutor

```
Aluno
  ↓
visual-tutor.js mostra atividade local imediata
  ↓
POST /api/tutor
  ↓
carrega perfil pedagógico no Supabase
  ↓
zen-client.js
  ↓
OpenCode Zen
  ↓
tutor-schema.js valida/normaliza
  ↓
interface refina a atividade
```

Não há CLI OpenCode, servidor local OpenCode, Vercel Sandbox ou criação/remoção de sessão de agente.

## 3. Por que a atividade local continua

Ela evita tela bloqueada e permite estudar quando um provedor de IA está lento. Não grava uma identidade paralela e não substitui a persistência do servidor.

## 4. Hospedagem

Vercel hospeda a produção principal. Railway usa o mesmo `server.js` e o mesmo cliente Zen quando for necessário um runtime secundário ou benchmark. A arquitetura deve ser igual nos dois ambientes.

## 5. Banco — estado e destino correto

A implementação atual nasceu dentro de um projeto Supabase compartilhado com outro sistema. Isso é dívida técnica comprovada.

**Destino correto:** projeto Supabase exclusivo do BIOMED, com as migrations BIOMED aplicadas e variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` configuradas na hospedagem.

O código aceita essas variáveis para que a migração não exija nova refatoração. O fallback atual existe somente para preservar a produção até a migração autorizada do projeto dedicado ser concluída.

## 6. Critério para mudanças futuras

Uma mudança está correta quando reduz duplicação, preserva uma única fonte de verdade, mantém o Tutor focado em pedagogia e passa `npm test`.
