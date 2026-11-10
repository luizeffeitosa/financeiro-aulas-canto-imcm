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
