import { db } from '@/lib/supabase'
import * as A from '@/app/actions'
import { AutoForm } from '@/app/ui'

export default async function Alunos() {
  const sb = await db()
  const { data } = await sb.from('alunos').select('*').order('nome')
  const linha = (a) => {
    return (
      <div className="row" key={a.id}>
        <div className="who"><b>{a.nome}</b>
          <small>Turma {a.turma}{a.apelidos?.length ? ` · na planilha: ${a.apelidos.join(', ')}` : ''}</small></div>
        <form action={A.toggleAluno} className="inline"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ativo" value={String(a.ativo)} />
          <button className={`chip ${a.ativo ? 'on' : ''}`}>{a.ativo ? 'Ativo' : 'Inativo'}</button></form>
        {(
          <AutoForm action={A.atualizarAluno}>
            <div className="campos">
              <input type="hidden" name="id" value={a.id} />
              <label>Nome<input name="nome" defaultValue={a.nome} required className="nome" /></label>
              <label>Apelido (mensagens)<input name="apelido" defaultValue={a.apelido || ''} placeholder={a.nome.split(' ')[0]} /></label>
              <label>WhatsApp<input name="telefone" type="tel" inputMode="tel" defaultValue={a.telefone || ''} placeholder="(44) 99999-9999" /></label>
            </div>
          </AutoForm>
        )}
      </div>
    )
  }
  return (
    <>
      <p className="note">Todos os alunos aparecem em cada mês. Inativos e quem estava desabilitado no mês anterior já vêm desabilitados (fora da NF); habilite na tela do mês se precisar. Os campos salvam sozinhos ao sair deles.</p>
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
