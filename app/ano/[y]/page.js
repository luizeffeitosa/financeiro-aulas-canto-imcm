import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/supabase'
import { brl, curto, MES_CURTO, MESES } from '@/lib/fmt'

export default async function Ano({ params, searchParams }) {
  const { y } = await params, { escopo = 'ano', mes = '' } = await searchParams
  if (!/^\d{4}$/.test(y)) notFound()
  const sb = await db(), ini = `${y}-01-01`, fim = `${y}-12-01`
  let qDeb = sb.from('mensalidades').select('competencia, valor_aluno, aluno_id, alunos(nome)').eq('status', 'pendente').order('competencia')
  if (escopo !== 'todos') qDeb = mes ? qDeb.eq('competencia', `${y}-${mes}-01`) : qDeb.gte('competencia', ini).lte('competencia', fim)
  const [{ data: anos }, { data: res }, { data: lanc }, { data: deb }] = await Promise.all([
    sb.from('meses').select('competencia'),
    sb.from('resumo_mes').select('*').gte('competencia', ini).lte('competencia', fim).order('competencia'),
    sb.from('mensalidades').select('competencia, status, conta, aluno_id, alunos(nome)').gte('competencia', ini).lte('competencia', fim),
    qDeb,
  ])
  const listaAnos = [...new Set((anos || []).map((x) => x.competencia.slice(0, 4)))].sort()
  const R = res || []
  const soma = (k) => R.reduce((s, r) => s + Number(r[k] || 0), 0)
  const semNF = R.some((r) => r.nf == null)
  const max = Math.max(...R.map((r) => Number(r.a_receber)), 1)
  const porMes = Object.fromEntries(R.map((r) => [+r.competencia.slice(5, 7), r]))
  const alunos = {}
  ;(lanc || []).forEach((x) => { (alunos[x.aluno_id] ??= { nome: x.alunos.nome, m: {} }).m[+x.competencia.slice(5, 7)] = x })
  const linhas = Object.values(alunos).sort((a, b) => a.nome.localeCompare(b.nome))
  const devedores = {}
  ;(deb || []).forEach((x) => { const d = (devedores[x.aluno_id] ??= { nome: x.alunos.nome, xs: [], tot: 0 }); d.xs.push(x.competencia.slice(0, 7)); d.tot += Number(x.valor_aluno) })
  const dv = Object.values(devedores).sort((a, b) => b.tot - a.tot)
  const dvTot = dv.reduce((s, d) => s + d.tot, 0)
  const q = (o) => `/ano/${y}?${new URLSearchParams(o)}`

  return (
    <>
      <div className="bar"><div className="mpick">{listaAnos.map((a) => <Link key={a} href={`/ano/${a}`} className={a === y ? 'on' : ''}>{a}</Link>)}</div></div>
      <div className="kpis">
        <div className="kpi"><small>Recebido no ano</small><strong className="pos">{brl(soma('recebido'))}</strong><em>de {brl(soma('a_receber'))}</em></div>
        <div className="kpi"><small>Saldo do ano</small><strong className={soma('pendente') ? 'neg' : ''}>{brl(-soma('pendente'))}</strong><em>pendências das competências do ano</em></div>
        <div className="kpi"><small>NFs do João</small><strong>{brl(soma('nf'))}</strong><em>{semNF ? 'só meses com mensalidade registrada' : `${R.length} meses`}</em></div>
        <div className="kpi"><small>Igreja pagou</small><strong>{brl(soma('parcela_igreja'))}</strong><em>NF − reembolsos recebidos</em></div>
      </div>

      <h2>Recebido × pendente por mês</h2>
      <div className="chart">
        {MES_CURTO.map((n, k) => { const r = porMes[k + 1]; return (
          <Link key={n} href={r ? `/mes/${y}-${String(k + 1).padStart(2, '0')}` : '#'} className="col" title={r ? `${MESES[k]}: recebido ${brl(r.recebido)}, pendente ${brl(r.pendente)}` : ''}>
            {r && <><i className="p" style={{ height: `${(r.pendente / max) * 110}px` }} /><i style={{ height: `${(r.recebido / max) * 110}px` }} /></>}
            <span>{n}</span>
          </Link>) })}
      </div>
      <div className="legend"><span><b className="dot ok" />Recebido</span><span><b className="dot warn" />Pendente</span></div>

      <h2>Quem pagou em {y}</h2>
      <div className="grid-wrap"><table>
        <thead><tr><th>Aluno</th>{MES_CURTO.map((n) => <th key={n} className="c">{n}</th>)}</tr></thead>
        <tbody>{linhas.map((a) => (
          <tr key={a.nome}><td>{a.nome}</td>{MES_CURTO.map((n, k) => { const x = a.m[k + 1]; return (
            <td key={n} className="c">{x ? <span className={`cell c-${x.status}`} title={`${x.status}${x.conta ? ' · ' + x.conta : ''}`}>{x.status === 'pago' ? (x.conta && x.conta !== 'PagSeguro' ? '•' : '✓') : x.status === 'pendente' ? '!' : '–'}</span> : <span className="cell c-x">·</span>}</td>) })}</tr>
        ))}</tbody>
      </table></div>
      <div className="legend"><span><span className="cell c-pago">✓</span> Pago</span><span><span className="cell c-pago">•</span> Pago fora do PagSeguro</span><span><span className="cell c-pendente">!</span> Pendente</span><span><span className="cell c-isento">–</span> Isento</span></div>

      <h2>Débitos em aberto</h2>
      <div className="bar">
        <Link className={`chip ${escopo !== 'todos' ? 'on' : ''}`} href={`/ano/${y}`}>Só {y}</Link>
        <Link className={`chip ${escopo === 'todos' ? 'on' : ''}`} href={q({ escopo: 'todos' })}>Todos os anos</Link>
        {escopo !== 'todos' && (
          <span className="chips">
            <Link className={`chip ${!mes ? 'on' : ''}`} href={`/ano/${y}`}>Ano inteiro</Link>
            {MES_CURTO.map((n, k) => porMes[k + 1] && <Link key={n} className={`chip ${mes === String(k + 1).padStart(2, '0') ? 'on' : ''}`} href={q({ mes: String(k + 1).padStart(2, '0') })}>{n}</Link>)}
          </span>
        )}
        <b className="neg push">{brl(dvTot)}</b>
      </div>
      <div className="list">
        {dv.map((d) => <div className="row" key={d.nome}><div className="who"><b>{d.nome}</b><small>{d.xs.map(curto).join(', ')}</small></div><b className="neg">{brl(d.tot)}</b></div>)}
        {!dv.length && <div className="row">Nenhum débito neste período.</div>}
      </div>
    </>
  )
}
