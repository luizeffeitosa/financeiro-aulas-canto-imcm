import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, linksComprovantes } from '@/lib/supabase'
import { brl, rotulo, curto, slug, CONTAS, proximo, anterior, hojeSP } from '@/lib/fmt'
import * as A from '@/app/actions'
import { AutoForm, Comprovante, SeletorMes } from '@/app/ui'

export default async function Mes({ params, searchParams }) {
  const { m } = await params, { f } = await searchParams
  if (!/^\d{4}-\d{2}$/.test(m)) notFound()
  const comp = `${m}-01`, sb = await db()
  const [{ data: meses }, { data: r }, { data: lanc }, { data: ajustes }, { data: alunos }, { data: atrasos }] = await Promise.all([
    sb.from('meses').select('competencia').order('competencia'),
    sb.from('resumo_mes').select('*').eq('competencia', comp).maybeSingle(),
    sb.from('mensalidades').select('*, alunos(nome, turma)').eq('competencia', comp),
    sb.from('ajustes').select('*, alunos(nome)').eq('competencia', comp).order('id'),
    sb.from('alunos').select('id, nome').eq('ativo', true).order('nome'),
    sb.from('mensalidades').select('aluno_id, competencia, valor_aluno').eq('status', 'pendente').lt('competencia', comp).order('competencia'),
  ])
  // débitos de meses anteriores por aluno (alerta na lista)
  const deve = {}
  ;(atrasos || []).forEach((d) => { const x = (deve[d.aluno_id] ??= { meses: [], tot: 0 }); x.meses.push(curto(d.competencia.slice(0, 7))); x.tot += Number(d.valor_aluno) })
  const lista = (meses || []).map((x) => x.competencia.slice(0, 7))
  const ultimo = lista.at(-1)
  const hoje = hojeSP().slice(0, 7)
  if (!r) {
    if (!ultimo || m !== proximo(ultimo)) notFound()
    return (
      <div className="stack">
        <h1 className="titulo">{rotulo(m)}</h1>
        <p className="note">Este mês ainda não foi aberto. Ao abrir, todos os alunos ativos entram como pendentes, com os valores de {rotulo(ultimo)}.</p>
        <form action={A.abrirMes}><input type="hidden" name="mes" value={m} /><button className="btn">Abrir {rotulo(m)}</button></form>
      </div>
    )
  }
  const rows = (lanc || []).sort((a, b) => a.alunos.turma - b.alunos.turma || a.alunos.nome.localeCompare(b.alunos.nome))
  const vis = f === 'pend' ? rows.filter((x) => x.status === 'pendente') : rows
  const pend = rows.filter((x) => x.status === 'pendente').length
  const links = await linksComprovantes(sb, rows.map((x) => x.comprovante))
  const fora = (lanc || []).map((x) => x.aluno_id)
  const semMes = (alunos || []).filter((a) => !fora.includes(a.id))
  const pct = r.a_receber > 0 ? (r.recebido / r.a_receber) * 100 : 0
  const ant = lista.includes(anterior(m)) ? anterior(m) : null
  const prox = lista.includes(proximo(m)) || m === ultimo ? proximo(m) : null

  return (
    <>
      <div className="bar">
        <div className="mpick">
          {ant ? <Link href={`/mes/${ant}`} aria-label="Mês anterior">‹</Link> : <span>‹</span>}
          <strong>{rotulo(m)}</strong>
          {prox ? <Link href={`/mes/${prox}`} aria-label="Próximo mês">›</Link> : <span>›</span>}
        </div>
        <SeletorMes atual={m} meses={lista} />
        {m !== hoje && <Link className="chip on" href={`/mes/${hoje}`}>Mês atual</Link>}
        <div className="filters">
          <Link className={`chip ${f !== 'pend' ? 'on' : ''}`} href={`/mes/${m}`}>Todos</Link>
          <Link className={`chip ${f === 'pend' ? 'on' : ''}`} href={`/mes/${m}?f=pend`}>Só pendentes</Link>
        </div>
        <Link className="btn" href={`/relatorio/${m}`}>Gerar relatório</Link>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Recebido dos alunos</small><strong className="pos">{brl(r.recebido)}</strong><em>de {brl(r.a_receber)}</em></div>
        <div className="kpi"><small>Saldo do mês</small><strong className={r.pendente > 0 ? 'neg' : ''}>{brl(-r.pendente)}</strong><em>{pend} pendente(s)</em></div>
        <div className="kpi"><small>NF do João</small><strong>{brl(r.nf)}</strong><em>{r.alunos} alunos{Number(r.ajustes) ? ` · ajustes ${brl(r.ajustes)}` : ''}</em></div>
        <div className="kpi"><small>Parcela da igreja</small><strong>{brl(r.parcela_igreja)}</strong><em>{r.isentos} isento(s)</em></div>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <div className="legend"><span><b className="dot ok" />{pct.toFixed(0)}% recebido</span></div>

      <h2>Alunos · toque em Pago ao receber o comprovante</h2>
      <div className="list">
        {vis.map((x) => (
          <div className="row" key={x.id}>
            <div className="who"><b>{x.alunos.nome}</b><small>Turma {x.alunos.turma}{Number(x.valor_aluno) !== Number(r.valor_aluno) ? ` · parcela ${brl(x.valor_aluno)}` : ''}</small>
              {deve[x.aluno_id] && <small className="alerta">⚠ Deve {deve[x.aluno_id].meses.length === 1 ? '1 mês anterior' : `${deve[x.aluno_id].meses.length} meses anteriores`} · {brl(deve[x.aluno_id].tot)} ({deve[x.aluno_id].meses.join(', ')})</small>}</div>
            <div className="seg" role="group" aria-label={`Situação de ${x.alunos.nome}`}>
              {['pago', 'pendente', 'isento'].map((s) => (
                <form key={s} action={A.setStatus}>
                  <input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value={s} />
                  <button className={`${s} ${x.status === s ? 'on' : ''}`}>{s[0].toUpperCase() + s.slice(1)}</button>
                </form>
              ))}
            </div>
            {x.status === 'pago' && (
              <div className="detail">
                <span className="chips">
                  {CONTAS.map((c) => (
                    <form key={c} action={A.setConta}>
                      <input type="hidden" name="id" value={x.id} /><input type="hidden" name="conta" value={c} />
                      <button className={`chip ${x.conta === c ? (c === 'PagSeguro' ? 'on' : 'on flag') : ''}`}>{c}</button>
                    </form>
                  ))}
                </span>
                <Comprovante id={x.id} path={`${m.slice(0, 4)}/${m.slice(5, 7)}/${slug(x.alunos.nome)}.jpg`} url={links[x.comprovante]} salvar={A.salvarComprovante} />
                <AutoForm action={A.setPagoEm}>
                  <input type="hidden" name="id" value={x.id} />
                  <label>recebido em <input type="date" name="pago_em" defaultValue={x.pago_em || ''} /></label>
                </AutoForm>
              </div>
            )}
            {x.status === 'isento' && (
              <div className="detail">
                <AutoForm action={A.setMotivo}>
                  <input type="hidden" name="id" value={x.id} />
                  <label>Motivo <input name="motivo" defaultValue={x.motivo || ''} placeholder="opcional (ex.: bolsa)" /></label>
                </AutoForm>
              </div>
            )}
            {x.status === 'pendente' && m === ultimo && (
              <div className="detail">
                <form action={A.removerDoMes} className="inline"><input type="hidden" name="id" value={x.id} /><button className="link">Não fez aula este mês</button></form>
              </div>
            )}
          </div>
        ))}
        {!vis.length && <div className="row">Ninguém pendente neste mês.</div>}
        {semMes.length > 0 && (
          <form action={A.addAlunoNoMes} className="row">
            <div className="detail">
              <input type="hidden" name="competencia" value={comp} />
              <select name="aluno_id" aria-label="Aluno">{semMes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
              <button className="btn ghost">Incluir neste mês</button>
            </div>
          </form>
        )}
      </div>

      <h2>Ajustes da NF</h2>
      <div className="list">
        {(ajustes || []).map((j) => (
          <div className="row" key={j.id}>
            <div className="who"><b>{j.descricao}</b><small>{j.alunos?.nome || '—'}</small></div>
            <form action={A.delAjuste} className="inline"><input type="hidden" name="id" value={j.id} /><b className={j.valor < 0 ? 'neg' : ''}>{brl(j.valor)}</b> <button className="link" aria-label="Remover ajuste">remover</button></form>
          </div>
        ))}
        <form action={A.addAjuste} className="row">
          <div className="detail">
            <input type="hidden" name="competencia" value={comp} />
            <input name="valor" type="number" step="0.01" placeholder="Valor (±)" required className="w120" aria-label="Valor" />
            <input name="descricao" placeholder="Descrição" required className="grow" aria-label="Descrição" />
            <select name="aluno_id" aria-label="Aluno (opcional)"><option value="">Aluno (opcional)</option>{(alunos || []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
            <button className="btn ghost">Adicionar ajuste</button>
          </div>
        </form>
      </div>

      <h2>Valores do mês</h2>
      <form action={A.setParams} className="list"><div className="row"><div className="detail">
        <input type="hidden" name="competencia" value={comp} />
        <label>Mensalidade <input name="valor_mensalidade" type="number" step="0.01" defaultValue={r.valor_mensalidade ?? ''} className="w120" /></label>
        <label>Parcela do aluno <input name="valor_aluno" type="number" step="0.01" defaultValue={r.valor_aluno} required className="w120" /></label>
        <button className="btn ghost">Salvar valores</button>
      </div></div></form>

      <div className="bar mt">
        {m === ultimo && <Link className="btn ghost" href={`/mes/${proximo(m)}`}>Abrir {rotulo(proximo(m))}</Link>}
      </div>
    </>
  )
}
