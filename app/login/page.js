'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Login() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('')
  async function enviar(e) {
    e.preventDefault()
    setEstado('enviando')
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: true },
    })
    setEstado(error ? 'erro' : 'ok')
  }
  return (
    <div className="login">
      <b className="logo">m<i>.</i> Aulas de Canto</b>
      <p className="muted">Louvor IMCM · acesso restrito</p>
      {estado === 'ok' ? <p>Enviamos um link de acesso para <b>{email}</b>. Abra o e-mail neste aparelho.</p> : (
        <form onSubmit={enviar} className="stack">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" disabled={estado === 'enviando'}>Enviar link de acesso</button>
          {estado === 'erro' && <p className="neg">Não foi possível enviar o link. Tente de novo em alguns minutos.</p>}
        </form>
      )}
    </div>
  )
}
