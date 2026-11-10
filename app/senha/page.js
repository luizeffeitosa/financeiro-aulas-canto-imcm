'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Senha() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [estado, setEstado] = useState('')
  async function salvar(e) {
    e.preventDefault()
    if (a.length < 8) return setEstado('A senha precisa ter pelo menos 8 caracteres.')
    if (a !== b) return setEstado('As duas senhas não são iguais.')
    setEstado('Salvando…')
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await sb.auth.updateUser({ password: a })
    setEstado(error ? `Não foi possível salvar: ${error.message}` : 'ok')
  }
  if (estado === 'ok') return <p className="note">Senha definida. Na próxima vez, entre com e-mail e senha.</p>
  return (
    <form onSubmit={salvar} className="stack" style={{ maxWidth: 380 }}>
      <h1 className="titulo">Definir senha</h1>
      <label htmlFor="s1">Nova senha</label>
      <input id="s1" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} required />
      <label htmlFor="s2">Repita a senha</label>
      <input id="s2" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} required />
      <button className="btn">Salvar senha</button>
      {estado && <p className={estado.startsWith('Salvando') ? 'muted' : 'neg'}>{estado}</p>}
    </form>
  )
}
