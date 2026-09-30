# BIOMED — contrato de arquitetura
Objetivo: ensinar fisiologia sensorial, nocicepção e modulação da dor; o Tutor é um professor e não um programador.
## Arquitetura permanente
1. Aplicativo único: `study-platform.js`. Autenticação única: `auth.js` → `/api/auth`.
2. Nenhuma interface anterior montada por baixo; não criar novos painéis, trilhas ou bancos locais.
3. Tutor: `api/tutor.js` → `api/_lib/ai-gateway.js` → Vercel AI Gateway, sem Sandbox, Railway, OpenCode CLI ou sessão externa.
4. Usar somente IDs de modelos confirmados gratuitos e explicitamente permitidos em `FREE_ALLOWLIST`; se o provedor encerrar a oferta, bloquear a chamada, nunca migrar para modelo pago automaticamente.
5. Autenticar no servidor via `VERCEL_OIDC_TOKEN` (padrão) ou `AI_GATEWAY_API_KEY`; nunca enviar credenciais ao navegador.
6. Dados de CPF ou de identificação não podem ir para o modelo. Supabase é a única fonte de progresso e provas.
7. `tutor-schema.js` verifica o formato visual; resposta inválida deve ser registrada como fallback, nunca como IA bem-sucedida.
8. Mostrar atividade local útil enquanto a IA responde; manter atividade inicial quando a IA falhar.
9. Alterar arquivos existentes, apagar código legado comprovadamente sem uso e atualizar testes/documentação a cada mudança.
10. Para confirmar IA real, exigir teste autenticado em produção e leitura de logs. Testes simulados não comprovam disponibilidade do serviço.
## Núcleo
`index.html`, `auth.js`, `study-platform.js`, `visual-tutor.js`, `tutor-schema.js`, `api/tutor.js`, `api/_lib/ai-gateway.js`, APIs de estudo e Supabase.
## Observação de compatibilidade
OpenCode Zen `-free` retornou HTTP 403 em produção (30/09/2026); não reintroduzir sem um teste efetivo de permissão.
