# Aulas de Canto · Louvor IMCM

Controle dos reembolsos das aulas de canto (prof. João Liasch) e relatório mensal para o financeiro.
Regras e escopo: [SPEC.md](SPEC.md). Protótipo validado: [docs/prototipo.html](docs/prototipo.html).

- Next.js (App Router, JS) na Vercel · Supabase (Postgres + Auth por link mágico)
- Acesso só para e-mails na tabela `admins` (RLS em todas as tabelas)
- Schema: `supabase/schema.sql` · cálculos na view `resumo_mes`

Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`).
