'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// envia o formulário assim que o campo muda (data do pagamento, motivo da isenção)
export function AutoForm({ action, children }) {
  return <form action={action} onChange={(e) => e.currentTarget.requestSubmit()} className="inline">{children}</form>
}

export function Nav({ ultimo }) {
  const p = usePathname()
  const itens = [[`/mes/${ultimo}`, 'Mês', '/mes'], [`/ano/${ultimo?.slice(0, 4)}`, 'Ano', '/ano'], ['/alunos', 'Alunos', '/alunos']]
  return <nav>{itens.map(([href, t, base]) => <Link key={t} href={href} aria-current={p.startsWith(base) || (base === '/mes' && p.startsWith('/relatorio')) ? 'page' : undefined}>{t}</Link>)}</nav>
}

export function Imprimir() {
  return <button className="btn" onClick={() => window.print()}>Baixar PDF</button>
}

// reduz a imagem para no máx. 1600px e JPEG ~80% antes de enviar
async function comprimir(file) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8))
}

export function Comprovante({ id, path, url, salvar }) {
  const [estado, setEstado] = useState('')
  const inputId = `comp-${id}`
  async function enviar(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setEstado('Envie uma imagem (print ou foto do comprovante).'); return }
    setEstado('Enviando…')
    try {
      const blob = await comprimir(file)
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { error } = await sb.storage.from('comprovantes').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' })
      if (error) throw error
      await salvar(id, path)
      setEstado('')
    } catch (err) { setEstado('Não foi possível enviar. Tente de novo.') }
  }
  return (
    <span className="inline">
      {url && <a className="chip ok" href={url} target="_blank" rel="noreferrer">📎 Ver comprovante</a>}
      <label htmlFor={inputId} className={`chip ${url ? '' : 'flag'}`}>{url ? 'Trocar' : '📎 Anexar comprovante'}</label>
      <input id={inputId} type="file" accept="image/*" hidden onChange={enviar} />
      {estado ? <span>{estado}</span> : !url && <span className="hint">só imagem</span>}
    </span>
  )
}

// seletor único: setas para o mês vizinho + toque no nome abre a grade de meses/anos
const NOMES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const NOMES_LONGOS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
export function SeletorMes({ atual, meses, hoje }) {
  const [aberto, setAberto] = useState(false)
  const [ano, setAno] = useState(atual.slice(0, 4))
  const ref = useRef(null)
  const disponiveis = new Set(meses)
  const anos = [...new Set(meses.map((m) => m.slice(0, 4)))]
  const i = meses.indexOf(atual)
  const ant = meses[i - 1], prox = meses[i + 1]
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('pointerdown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  return (
    <div className="picker" ref={ref}>
      {ant ? <Link className="seta" href={`/mes/${ant}`} aria-label="Mês anterior">‹</Link> : <span className="seta off">‹</span>}
      <button className="rotulo" aria-expanded={aberto} onClick={() => { setAno(atual.slice(0, 4)); setAberto(!aberto) }}>
        {NOMES_LONGOS[+atual.slice(5) - 1]} {atual.slice(0, 4)} <span aria-hidden="true">▾</span>
      </button>
      {prox ? <Link className="seta" href={`/mes/${prox}`} aria-label="Próximo mês">›</Link> : <span className="seta off">›</span>}
      {aberto && (
        <div className="pop" role="dialog" aria-label="Escolher mês">
          <div className="pop-ano">
            <button aria-label="Ano anterior" disabled={ano <= anos[0]} onClick={() => setAno(String(+ano - 1))}>‹</button>
            <b>{ano}</b>
            <button aria-label="Próximo ano" disabled={ano >= anos.at(-1)} onClick={() => setAno(String(+ano + 1))}>›</button>
          </div>
          <div className="pop-grade">
            {NOMES.map((n, k) => {
              const m = `${ano}-${String(k + 1).padStart(2, '0')}`
              const cls = [m === atual && 'sel', m === hoje && 'hoje'].filter(Boolean).join(' ')
              return disponiveis.has(m)
                ? <Link key={n} href={`/mes/${m}`} className={cls} onClick={() => setAberto(false)}>{n}</Link>
                : <span key={n} className="off">{n}</span>
            })}
          </div>
          {atual !== hoje && <Link className="pop-hoje" href={`/mes/${hoje}`} onClick={() => setAberto(false)}>Ir para o mês atual</Link>}
        </div>
      )}
    </div>
  )
}
