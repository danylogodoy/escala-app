# Escala-App — Resumo do Projeto

## O que o app faz
- Login por email/senha (Supabase Auth)
- Cadastro de prestadores
- Lançamento de horários (fora da escala), com soma automática de horas e valor em R$
- Controle de refeições (0 a 5 por lançamento) com custo unitário configurável (informativo)
- Histórico de lançamentos + totais do filtro
- Exportação XLS
- Evita duplicidade de horário do mesmo prestador no mesmo dia (conflito)

## Stack
- Front-end: Next.js (App Router) + TypeScript
- Back-end: Supabase (Postgres + Auth + RLS)
- Deploy: Vercel

## Variáveis de ambiente (.env.local)
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=

## Páginas
- /login
- /logs (lançamentos)
- /providers (prestadores)
- /settings (config: valor hora dia/noite e refeição)
- /summary (resumo do mês/filtrado)

## Tabelas Supabase (principais)
- providers: id, user_id, name, active, created_at
- work_logs: id, user_id, provider_id, date, start_time, end_time, minutes_day, minutes_night, total_value, meals_qty, total_meal_cost, note, created_at
- settings: id, user_id, rate_day, rate_night, meal_unit (ou meal_unit_value), created_at

## Regras RLS (ideia)
- Cada tabela: user_id = auth.uid()
- Permitir SELECT/INSERT/UPDATE/DELETE somente do próprio user_id

## Como rodar local (Windows)
- npm install
- npm run dev
- http://localhost:3000

## Como subir (GitHub)
- git add .
- git commit -m "..."
- git push

## Como deploy (Vercel)
- Conectar repositório
- Configurar env vars iguais ao .env.local
- Deploy
