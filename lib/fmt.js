export const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
export const MES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
export const CONTAS = ['PagSeguro', 'Bradesco', 'PicPay', 'Outra']

export const brl = (v) => v == null ? '—' :
  (Number(v) < 0 ? '−' : '') + 'R$ ' + Math.abs(Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// competência no formato 'YYYY-MM'
export const rotulo = (m) => `${MESES[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`
export const curto = (m) => `${MES_CURTO[+m.slice(5, 7) - 1]}/${m.slice(2, 4)}`
export const dataBR = (d) => d ? d.split('-').reverse().join('/') : ''
export const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
export const proximo = (m) => { let [y, mm] = m.split('-').map(Number); mm++; if (mm > 12) { mm = 1; y++ } return `${y}-${String(mm).padStart(2, '0')}` }
export const anterior = (m) => { let [y, mm] = m.split('-').map(Number); mm--; if (mm < 1) { mm = 12; y-- } return `${y}-${String(mm).padStart(2, '0')}` }
// nome de arquivo seguro para o Storage: "Mayara Pavan" -> "mayara-pavan"
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// mensagem de cobrança para o WhatsApp (mês da tela + mês anterior, se em aberto)
export function linkCobranca({ nome, apelido, telefone }, mes, hoje, pendAtual, pendAnterior) {
  const quem = apelido || nome.split(' ')[0]
  const ehAtual = mes === hoje
  const deste = ehAtual ? 'deste mês' : `de ${MESES[+mes.slice(5, 7) - 1]}`
  const doAnterior = ehAtual ? 'do mês passado' : `de ${MESES[+anterior(mes).slice(5, 7) - 1]}`
  let corpo
  if (pendAtual && pendAnterior) corpo = `Quando puder, me manda o comprovante do pagamento da aula de canto ${deste}? Notei também que não recebi o ${doAnterior}, pode me enviar?`
  else if (pendAtual) corpo = `Quando puder, me manda o comprovante do pagamento da aula de canto ${deste}?`
  else corpo = `Notei que não recebi o comprovante do pagamento da aula de canto ${doAnterior}, pode me enviar quando puder?`
  const texto = `Opa, ${quem}! Tudo certo?\n\n${corpo} Preciso finalizar a checagem pra enviar ao financeiro da igreja. Obrigado! 🙏`
  let fone = (telefone || '').replace(/\D/g, '')
  if (fone.length === 10 || fone.length === 11) fone = '55' + fone
  return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`
}

// destinatário do relatório no financeiro (troque aqui se mudar a pessoa)
export const FINANCEIRO = 'fulano'
export const textoRelatorio = (mes) =>
  `Oi, ${FINANCEIRO}! Tudo certo?\n\nSegue o relatório de ${rotulo(mes)} referente às aulas de canto.`

// agrupa pessoas por turma (ordem da turma, "Sem turma" no fim) e por nome dentro do grupo
export function agrupar(itens, turmas, getAluno = (x) => x) {
  const porId = Object.fromEntries((turmas || []).map((t) => [t.id, t]))
  const grupos = {}
  for (const x of itens) {
    const t = porId[getAluno(x).turma]
    const k = t ? t.id : 0
    ;(grupos[k] ??= { id: k, nome: t ? t.nome : 'Sem turma', ordem: t ? t.ordem : 1e9, itens: [] }).itens.push(x)
  }
  return Object.values(grupos)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    .map((g) => ({ ...g, itens: g.itens.sort((a, b) => getAluno(a).nome.localeCompare(getAluno(b).nome)) }))
}
