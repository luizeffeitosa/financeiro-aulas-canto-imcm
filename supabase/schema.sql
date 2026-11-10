-- Schema aplicado no projeto Supabase "aulas-canto-imcm" (migrations schema_inicial + fix_search_path).
-- Mantido aqui como referência; alterações futuras: novo arquivo em supabase/ e aplicar no projeto.
create table admins (email text primary key);
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'))
$$;
create table alunos (id serial primary key, nome text not null unique, apelidos text[] not null default '{}', turma int not null default 1, ativo boolean not null default true);
create table meses (competencia date primary key check (extract(day from competencia) = 1), valor_mensalidade numeric(10,2), valor_aluno numeric(10,2) not null);
create table mensalidades (
  id serial primary key, competencia date not null references meses on delete cascade, aluno_id int not null references alunos,
  status text not null default 'pendente' check (status in ('pendente','pago','isento')), valor_aluno numeric(10,2) not null,
  conta text check (conta in ('PagSeguro','Bradesco','PicPay','Outra')), pago_em date, motivo text, unique (competencia, aluno_id));
create table ajustes (id serial primary key, competencia date not null references meses on delete cascade, valor numeric(10,2) not null, descricao text not null, aluno_id int references alunos);
alter table admins enable row level security; alter table alunos enable row level security; alter table meses enable row level security;
alter table mensalidades enable row level security; alter table ajustes enable row level security;
create policy admin_all on alunos for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on meses for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on mensalidades for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on ajustes for all to authenticated using (is_admin()) with check (is_admin());
create view resumo_mes with (security_invoker = true) as
select m.competencia, m.valor_mensalidade, m.valor_aluno, count(x.id) as alunos, count(x.id) filter (where x.status = 'isento') as isentos,
  coalesce(sum(x.valor_aluno) filter (where x.status <> 'isento'),0) as a_receber,
  coalesce(sum(x.valor_aluno) filter (where x.status = 'pago'),0) as recebido,
  coalesce(sum(x.valor_aluno) filter (where x.status = 'pendente'),0) as pendente,
  (select coalesce(sum(valor),0) from ajustes a where a.competencia = m.competencia) as ajustes,
  case when m.valor_mensalidade is null then null else count(x.id) * m.valor_mensalidade + (select coalesce(sum(valor),0) from ajustes a where a.competencia = m.competencia) end as nf,
  case when m.valor_mensalidade is null then null else count(x.id) * m.valor_mensalidade + (select coalesce(sum(valor),0) from ajustes a where a.competencia = m.competencia)
    - coalesce(sum(x.valor_aluno) filter (where x.status = 'pago'),0) end as parcela_igreja
from meses m left join mensalidades x on x.competencia = m.competencia group by m.competencia;
create or replace function abrir_mes(p_competencia date) returns void language plpgsql security invoker set search_path = public as $$
declare prev meses;
begin
  select * into prev from meses where competencia < p_competencia order by competencia desc limit 1;
  insert into meses values (p_competencia, prev.valor_mensalidade, coalesce(prev.valor_aluno,70)) on conflict do nothing;
  insert into mensalidades (competencia, aluno_id, valor_aluno) select p_competencia, id, coalesce(prev.valor_aluno,70) from alunos where ativo on conflict do nothing;
end $$;
revoke execute on function abrir_mes(date) from anon, public; grant execute on function abrir_mes(date) to authenticated;
revoke execute on function is_admin() from anon, public; grant execute on function is_admin() to authenticated;
-- admin: insert into admins values ('<email do admin>');

-- comprovantes (migration "comprovantes")
alter table mensalidades add column comprovante text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy comprovantes_admin_select on storage.objects for select to authenticated using (bucket_id = 'comprovantes' and public.is_admin());
create policy comprovantes_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'comprovantes' and public.is_admin());
create policy comprovantes_admin_update on storage.objects for update to authenticated using (bucket_id = 'comprovantes' and public.is_admin()) with check (bucket_id = 'comprovantes' and public.is_admin());
create policy comprovantes_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'comprovantes' and public.is_admin());
