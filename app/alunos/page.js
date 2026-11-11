import { db, listarTurmas } from '@/lib/supabase'
import { agrupar } from '@/lib/fmt'
import * as A from '@/app/actions'
import { AutoForm, Confirmar } from '@/app/ui'

export default async function Alunos() {
  const sb = await db()
  const [{ data }, turmas] = await Promise.all([sb.from('alunos').select('*').order('nome'), listarTurmas(sb)])
  const opcoesTurma = (atual) => (
    <select name="turma" defaultValue={atual ?? ''} aria-label="Turma">
      {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      <option value="">Sem turma</option>
    </select>
  )
  const linha = (a) => (
    <div className="row" key={a.id}>
      <div className="who"><b>{a.nome}</b>{a.apelidos?.length ? <small>na planilha: {a.apelidos.join(', ')}</small> : null}</div>
      <form action={A.toggleAluno} className="inline"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ativo" value={String(a.ativo)} />
        <button className={`chip ${a.ativo ? 'on' : ''}`}>{a.ativo ? 'Ativo' : 'Inativo'}</button></form>
      <AutoForm action={A.atualizarAluno}>
        <div className="campos">
          <input type="hidden" name="id" value={a.id} />
          <label>Nome<input name="nome" defaultValue={a.nome} required className="nome" /></label>
          <label>Turma{opcoesTurma(a.turma)}</label>
          <label>Apelido (mensagens)<input name="apelido" defaultValue={a.apelido || ''} placeholder={a.nome.split(' ')[0]} /></label>
          <label>WhatsApp<input name="telefone" type="tel" inputMode="tel" defaultValue={a.telefone || ''} placeholder="(44) 99999-9999" /></label>
        </div>
      </AutoForm>
    </div>
  )
  const grupos = (lista) => agrupar(lista, turmas).map((g) => (
    <div key={g.id} className="grupo">
      <h3 className="grupo-tit">{g.nome} <span>({g.itens.length})</span></h3>
      <div className="list">{g.itens.map(linha)}</div>
    </div>
  ))
  const ativos = (data || []).filter((a) => a.ativo), ex = (data || []).filter((a) => !a.ativo)

  return (
    <>
      <p className="note">Todos os alunos aparecem em cada mês. Inativos e quem estava desabilitado no mês anterior já vêm desabilitados (fora da NF). Os campos salvam sozinhos ao sair deles; trocar a turma muda o agrupamento em todas as telas.</p>

      <h2>Turmas</h2>
      <div className="list">
        {turmas.map((t) => (
          <div className="row" key={t.id}>
            <AutoForm action={A.renomearTurma}><input type="hidden" name="id" value={t.id} /><input name="nome" defaultValue={t.nome} aria-label="Nome da turma" required /></AutoForm>
            <Confirmar acao={A.excluirTurma} campos={{ id: t.id }} rotulo="Excluir"
              pergunta={`Excluir ${t.nome}? ${(data || []).filter((a) => a.turma === t.id).length} aluno(s) ficam sem turma.`} />
          </div>
        ))}
        <form action={A.addTurma} className="row"><div className="detail">
          <input name="nome" placeholder="Nome da nova turma" required className="grow" aria-label="Nome da nova turma" />
          <button className="btn ghost">Adicionar turma</button>
        </div></form>
      </div>

      <h2>Ativos ({ativos.length})</h2>
      {grupos(ativos)}
      <form action={A.addAluno} className="list mt-s"><div className="row"><div className="detail">
        <input name="nome" placeholder="Nome completo" required className="grow" aria-label="Nome completo" />
        {opcoesTurma(turmas[0]?.id)}
        <button className="btn ghost">Adicionar aluno</button>
      </div></div></form>

      <h2>Ex-alunos ({ex.length})</h2>
      {grupos(ex)}
    </>
  )
}
