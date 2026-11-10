'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const cliente = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function Login() {
  const [modo, setModo] = useState('senha') // 'senha' | 'link'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [estado, setEstado] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setEstado('enviando')
    const sb = cliente()
    if (modo === 'senha') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha })
      if (error) return setEstado('erro-senha')
      location.assign('/')
    } else {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
      setEstado(error ? 'erro-link' : 'link-ok')
    }
  }

  return (
    <div className="login">
      <b className="logo">m<i>.</i> Aulas de Canto</b>
      <p className="muted">Louvor IMCM · acesso restrito</p>
      {estado === 'link-ok' ? (
        <p>Enviamos um link de acesso para <b>{email}</b>. Abra o e-mail neste aparelho.</p>
      ) : (
        <form onSubmit={entrar} className="stack">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {modo === 'senha' && <>
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </>}
          <button className="btn" disabled={estado === 'enviando'}>{modo === 'senha' ? 'Entrar' : 'Enviar link de acesso'}</button>
          {estado === 'erro-senha' && <p className="neg">E-mail ou senha incorretos. Se ainda não definiu uma senha, entre pelo link no e-mail.</p>}
          {estado === 'erro-link' && <p className="neg">Não foi possível enviar o link. Tente de novo em alguns minutos.</p>}
          <button type="button" className="link" onClick={() => { setModo(modo === 'senha' ? 'link' : 'senha'); setEstado('') }}>
            {modo === 'senha' ? 'Esqueci a senha / entrar com link no e-mail' : 'Entrar com senha'}
          </button>
        </form>
      )}
    </div>
  )
}
