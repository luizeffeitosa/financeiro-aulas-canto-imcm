'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
