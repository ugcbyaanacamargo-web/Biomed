# Arquitetura operacional BIOMED (30/09/2026)
## Fluxo
Aluno → Vercel `/api/tutor` → leitura de perfil Supabase → Vercel AI Gateway → modelo gratuito explicitamente autorizado → validação `tutor-schema.js` → tela.
A execução é uma chamada HTTPS. Não existe instância do OpenCode, servidor intermediário, instalação por pergunta, armazenamento duplicado de sessões ou uso de Railway.
## Segurança
No runtime da função, a Vercel oferece o token OIDC no cabeçalho interno `x-vercel-oidc-token`; `VERCEL_OIDC_TOKEN` é usado principalmente em builds e ambiente local. Caso haja configuração explícita, usa `AI_GATEWAY_API_KEY`; nenhuma credencial vai para o browser. Dados pessoais devem ser redigidos. Prompt do Tutor proíbe alteração de infraestrutura. O progresso permanece no Supabase.
## Modelo e custos
Usar `inclusionai/ling-3.1-flash-free` (Vercel, publicado em 29/09/2026). Apenas modelos verificados em `FREE_ALLOWLIST` podem ser usados; trocar para variante sem sufixo é proibido sem autorização explícita. Não há garantia de gratuidade permanente; falha de disponibilidade devolve atividade local identificada e erro registrado, jamais chamada faturável automática.
O modelo Sante gratuito expira em 04/10/2026, por isso não foi escolhido como dependência fixa.
## Interface
`index.html` inspeciona somente a presença da sessão antes da primeira pintura, evitando mostrar o formulário de entrada durante o carregamento. `study-platform.js` apresenta o único painel. `visual-tutor.js` só apresenta conteúdo como vindo da IA após validação do JSON.
## Validação
CI: `npm test`; prévia na Vercel e verificação da rota de saúde. É necessário enviar uma mensagem real com aluno autenticado para concluir a prova de integração da IA; CI com resposta simulada não prova conexão ao provedor.
## Dívida técnica fora do escopo
O Supabase ainda tem compartilhamento de projeto; não executar migrações sem inventário e backup.
