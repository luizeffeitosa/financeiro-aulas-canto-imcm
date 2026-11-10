import { db } from '@/lib/supabase'
import * as A from '@/app/actions'

export default async function Alunos() {
  const sb = await db()
  const { data } = await sb.from('alunos').select('*').order('nome')
  const linha = (a) => (
    <div className="row" key={a.id}>
      <div className="who"><b>{a.nome}</b><small>Turma {a.turma}{a.apelidos?.length ? ` · na planilha: ${a.apelidos.join(', ')}` : ''}</small></div>
      <form action={A.toggleAluno} className="inline"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ativo" value={String(a.ativo)} />
        <button className={`chip ${a.ativo ? 'on' : ''}`}>{a.ativo ? 'Ativo' : 'Inativo'}</button></form>
    </div>
  )
  return (
    <>
      <p className="note">Aluno ativo entra automaticamente no próximo mês aberto. Desativar não apaga o histórico.</p>
      <h2>Ativos</h2>
      <div className="list">{(data || []).filter((a) => a.ativo).map(linha)}</div>
      <form action={A.addAluno} className="list mt-s"><div className="row"><div className="detail">
        <input name="nome" placeholder="Nome completo" required className="grow" aria-label="Nome completo" />
        <select name="turma" aria-label="Turma"><option value="1">Turma 1</option><option value="2">Turma 2</option></select>
        <button className="btn ghost">Adicionar aluno</button>
      </div></div></form>
      <h2>Ex-alunos</h2>
      <div className="list">{(data || []).filter((a) => !a.ativo).map(linha)}</div>
    </>
  )
}
