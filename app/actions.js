'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/supabase'
import { hojeSP } from '@/lib/fmt'

const feito = () => revalidatePath('/', 'layout')
async function ok(q) { const { error } = await q; if (error) throw new Error(error.message) }

export async function setStatus(fd) {
  const sb = await db(), status = fd.get('status')
  const patch = status === 'pago'
    ? { status, conta: fd.get('conta') || 'PagSeguro', pago_em: hojeSP() }
    : { status, conta: null, pago_em: null, comprovante: null }
  await ok(sb.from('mensalidades').update(patch).eq('id', fd.get('id'))); feito()
}
export async function setConta(fd) {
  const sb = await db()
  await ok(sb.from('mensalidades').update({ conta: fd.get('conta') }).eq('id', fd.get('id'))); feito()
}
export async function setPagoEm(fd) {
  const sb = await db()
  await ok(sb.from('mensalidades').update({ pago_em: fd.get('pago_em') || null }).eq('id', fd.get('id'))); feito()
}
export async function setMotivo(fd) {
  const sb = await db()
  await ok(sb.from('mensalidades').update({ motivo: fd.get('motivo') || null }).eq('id', fd.get('id'))); feito()
}
export async function addAjuste(fd) {
  const sb = await db()
  await ok(sb.from('ajustes').insert({
    competencia: fd.get('competencia'), valor: Number(fd.get('valor')),
    descricao: fd.get('descricao'), aluno_id: fd.get('aluno_id') || null,
  })); feito()
}
export async function delAjuste(fd) {
  const sb = await db()
  await ok(sb.from('ajustes').delete().eq('id', fd.get('id'))); feito()
}
export async function setParams(fd) {
  const sb = await db(), comp = fd.get('competencia'), aluno = Number(fd.get('valor_aluno'))
  await ok(sb.from('meses').update({ valor_mensalidade: Number(fd.get('valor_mensalidade')) || null, valor_aluno: aluno }).eq('competencia', comp))
  // mantém as parcelas do mês alinhadas ao novo valor (só as que ainda não foram pagas)
  await ok(sb.from('mensalidades').update({ valor_aluno: aluno }).eq('competencia', comp).neq('status', 'pago')); feito()
}
export async function abrirMes(fd) {
  const sb = await db(), m = fd.get('mes')
  await ok(sb.rpc('abrir_mes', { p_competencia: `${m}-01` })); feito(); redirect(`/mes/${m}`)
}
export async function addAluno(fd) {
  const sb = await db()
  await ok(sb.from('alunos').insert({ nome: fd.get('nome').trim(), turma: Number(fd.get('turma')) })); feito()
}
export async function addAlunoNoMes(fd) {
  const sb = await db(), comp = fd.get('competencia')
  const { data: mes } = await sb.from('meses').select('valor_aluno').eq('competencia', comp).single()
  await ok(sb.from('mensalidades').insert({ competencia: comp, aluno_id: fd.get('aluno_id'), valor_aluno: mes.valor_aluno })); feito()
}
export async function removerDoMes(fd) {
  const sb = await db()
  await ok(sb.from('mensalidades').delete().eq('id', fd.get('id')).eq('status', 'pendente')); feito()
}
export async function toggleAluno(fd) {
  const sb = await db()
  await ok(sb.from('alunos').update({ ativo: fd.get('ativo') !== 'true' }).eq('id', fd.get('id'))); feito()
}
export async function sair() {
  const sb = await db(); await sb.auth.signOut(); redirect('/login')
}

export async function salvarComprovante(id, path) {
  const sb = await db()
  const { data: m, error } = await sb.from('mensalidades').update({ comprovante: path }).eq('id', id).select('aluno_id, pago_em').single()
  if (error) throw new Error(error.message)
  // um mesmo Pix pode quitar vários meses: replica para os pagamentos do mesmo aluno no mesmo dia sem comprovante
  if (m.pago_em) await sb.from('mensalidades').update({ comprovante: path })
    .eq('aluno_id', m.aluno_id).eq('pago_em', m.pago_em).eq('status', 'pago').is('comprovante', null)
  feito()
}
