import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, linksComprovantes } from '@/lib/supabase'
import { brl, rotulo, curto, dataBR, hojeSP } from '@/lib/fmt'
import { Imprimir } from '@/app/ui'

function T({ head, rows }) {
  return (
    <table><thead><tr>{head.map((h, i) => <th key={h} className={i === head.length - 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
      <tbody>{rows.length ? rows : <tr><td colSpan={head.length}>Nenhum.</td></tr>}</tbody></table>
  )
}

export default async function Relatorio({ params }) {
  const { m } = await params
  const comp = `${m}-01`, sb = await db()
  const fimMes = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).toISOString().slice(0, 10)
  const [{ data: r }, { data: lanc }, { data: aj }, { data: atras }] = await Promise.all([
    sb.from('resumo_mes').select('*').eq('competencia', comp).maybeSingle(),
    sb.from('mensalidades').select('*, alunos(nome)').eq('competencia', comp),
    sb.from('ajustes').select('*').eq('competencia', comp).order('id'),
    sb.from('mensalidades').select('*, alunos(nome)').eq('status', 'pago').lt('competencia', comp).gte('pago_em', comp).lte('pago_em', fimMes),
  ])
  if (!r) notFound()
  const L = (lanc || []).sort((a, b) => a.alunos.nome.localeCompare(b.alunos.nome))
  const pagos = L.filter((x) => x.status === 'pago'), pend = L.filter((x) => x.status === 'pendente'), isent = L.filter((x) => x.status === 'isento')
  const foraPS = pagos.filter((x) => x.conta && x.conta !== 'PagSeguro')
  // comprovantes: pagamentos da competência + recebidos no mês de competências anteriores
  const recebidos = [...pagos, ...(atras || [])]
  const links = await linksComprovantes(sb, recebidos.map((x) => x.comprovante), 3600)
  const faltando = recebidos.filter((x) => !links[x.comprovante])
  const anexos = recebidos.filter((x) => links[x.comprovante])
  const vistos = new Set()

  return (
    <>
      <div className="bar noprint"><Link className="btn ghost" href={`/mes/${m}`}>‹ Voltar</Link><Imprimir /></div>
      <article className="paper">
        <div className="ph">
          <div><b className="logo">m<i>.</i> Louvor IMCM</b><div className="sub">Prestação de contas · Aulas de canto (prof. João Liasch)</div></div>
          <div className="right"><b className="cap">{rotulo(m)}</b><br />Emitido em {dataBR(hojeSP())}</div>
        </div>
        <div className="resumo">
          <div><small>NF do mês</small><b>{brl(r.nf)}</b></div>
          <div><small>Recebido dos alunos</small><b>{brl(r.recebido)}</b></div>
          <div><small>Não pago</small><b>{brl(r.pendente)}</b></div>
          <div><small>Parcela da igreja</small><b>{brl(r.parcela_igreja)}</b></div>
        </div>

        <h3>1 · Nota fiscal</h3>
        <T head={['Item', 'Valor']} rows={[
          <tr key="b"><td>{r.alunos} alunos × {brl(r.valor_mensalidade)}</td><td className="num">{brl(r.valor_mensalidade == null ? null : r.alunos * r.valor_mensalidade)}</td></tr>,
          ...(aj || []).map((j) => <tr key={j.id}><td>Ajuste: {j.descricao}</td><td className="num">{brl(j.valor)}</td></tr>),
          <tr key="t"><td><b>NF final</b></td><td className="num"><b>{brl(r.nf)}</b></td></tr>]} />

        <h3>2 · Divisão</h3>
        <T head={['Parte', 'Valor']} rows={[
          <tr key="1"><td>Reembolso esperado dos alunos ({r.alunos - r.isentos} pagantes)</td><td className="num">{brl(r.a_receber)}</td></tr>,
          <tr key="2"><td>Reembolso recebido</td><td className="num">{brl(r.recebido)}</td></tr>,
          <tr key="3"><td>Parcela da igreja (NF − recebido)</td><td className="num">{brl(r.parcela_igreja)}</td></tr>]} />

        <h3>3 · Pagaram ({pagos.length}){foraPS.length ? ` · ${foraPS.length} fora do PagSeguro` : ''}</h3>
        <T head={['Aluno', 'Conta', 'Data', 'Valor']} rows={pagos.map((x) => (
          <tr key={x.id}><td>{x.alunos.nome}</td><td>{x.conta || 'não informada'}{x.conta && x.conta !== 'PagSeguro' && <span className="tag"> fora do PagSeguro</span>}</td><td>{dataBR(x.pago_em)}</td><td className="num">{brl(x.valor_aluno)}</td></tr>))} />

        <h3>4 · Não pagaram ({pend.length}) · {brl(r.pendente)}</h3>
        <T head={['Aluno', 'Valor']} rows={pend.map((x) => <tr key={x.id}><td>{x.alunos.nome}</td><td className="num">{brl(x.valor_aluno)}</td></tr>)} />

        <h3>5 · Isentos ({isent.length})</h3>
        <T head={['Aluno', 'Motivo', 'Igreja cobre']} rows={isent.map((x) => <tr key={x.id}><td>{x.alunos.nome}</td><td>{x.motivo || '—'}</td><td className="num">{brl(r.valor_mensalidade)}</td></tr>)} />

        <h3>6 · Recebidos neste mês de meses anteriores</h3>
        <T head={['Aluno', 'Competência', 'Conta', 'Valor']} rows={(atras || []).map((x) => <tr key={x.id}><td>{x.alunos.nome}</td><td>{curto(x.competencia.slice(0, 7))}</td><td>{x.conta}</td><td className="num">{brl(x.valor_aluno)}</td></tr>)} />

        <h3>7 · Comprovantes ({anexos.length} de {recebidos.length}){faltando.length ? <span className="tag"> · {faltando.length} faltando</span> : ''}</h3>
        <T head={['Aluno', 'Competência', 'Conta', 'Comprovante']} rows={recebidos.map((x) => (
          <tr key={x.id}><td>{x.alunos.nome}</td><td>{curto(x.competencia.slice(0, 7))}</td><td>{x.conta || '—'}</td>
            <td className="num">{links[x.comprovante] ? '✓ anexado' : <span className="tag">faltando</span>}</td></tr>))} />
        {faltando.length > 0 && <p className="aviso">Não enviaram comprovante: {faltando.map((x) => x.alunos.nome).join(', ')}.</p>}
      </article>
      {anexos.filter((x) => !vistos.has(x.comprovante) && vistos.add(x.comprovante)).map((x) => {
        const mesmos = anexos.filter((y) => y.comprovante === x.comprovante)
        return (
          <article className="paper anexo" key={x.id}>
            <div className="anexo-cab"><b>Comprovante · {x.alunos.nome}</b><span>{mesmos.map((y) => curto(y.competencia.slice(0, 7))).join(' + ')} · {x.conta || 'conta não informada'} · {brl(mesmos.reduce((s, y) => s + Number(y.valor_aluno), 0))}{x.pago_em ? ` · ${dataBR(x.pago_em)}` : ''}</span></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={links[x.comprovante]} alt={`Comprovante de ${x.alunos.nome}`} />
          </article>
        )
      })}
    </>
  )
}
