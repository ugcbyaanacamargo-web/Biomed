# BIOMED — Plataforma de Estudo Guiado

BIOMED ensina fisiologia sensorial, nocicepção, dor e modulação da dor por uma trilha progressiva:

**Perceber → Conduzir → Processar → Modular → Aplicar**

## Uma única experiência do aluno

Após autenticar, o aluno entra no mesmo aplicativo guiado:

- Início
- Minha trilha
- Tutor IA
- Praticar
- Provas e simulados
- Meu progresso
- Ranking
- Biblioteca / Revisão

A interface principal está em `study-platform.js`. Não existe um segundo painel legado por baixo dela.

## Tutor IA

O Tutor é um **professor adaptativo**, não um agente de programação.

Os modelos gratuitos do OpenCode aceitam uso apenas de dentro do OpenCode. Por isso o runtime correto é:

```
aluno
  ↓
Vercel /api/tutor
  ↓
proxy curto
  ↓
Railway — OpenCode persistente e já aquecido
  ↓
modelo gratuito OpenCode
  ↓
validação BIOMED
  ↓
atividade visual
```

O OpenCode é iniciado **uma vez por container Railway**, não uma vez por pergunta. Não existe Vercel Sandbox no caminho do Tutor.

A tela mostra uma atividade pedagógica segura imediatamente; a IA refina essa atividade quando responde.

## Segurança

O agente `biomed-tutor` possui permissões de ferramentas negadas. Ele não edita arquivos, não usa terminal e não recebe CPF, tokens ou segredos.

## Hospedagem

- **Vercel:** site principal e APIs leves.
- **Railway:** runtime persistente do OpenCode para o Tutor.
- **Supabase:** progresso, sessões, avaliações e eventos.

## Testes

```
npm test
```

Leia `AGENTS.md` e `docs/architecture.md` antes de alterar a arquitetura.
