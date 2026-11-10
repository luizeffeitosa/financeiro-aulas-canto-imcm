import './globals.css'
import Link from 'next/link'
import { db } from '@/lib/supabase'
import { sair } from './actions'
import { Nav } from './ui'

export const metadata = { title: 'Aulas de Canto · Louvor IMCM', robots: { index: false } }
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#EEECE7' }

export default async function Layout({ children }) {
  const sb = await db()
  const { data: { user } } = await sb.auth.getUser()
  let admin = false, ultimo = null
  if (user) {
    const { data } = await sb.rpc('is_admin'); admin = !!data
    if (admin) {
      const { data: m } = await sb.from('meses').select('competencia').order('competencia', { ascending: false }).limit(1)
      ultimo = m?.[0]?.competencia.slice(0, 7)
    }
  }
  return (
    <html lang="pt-BR">
      <body>
        <div className="wrap">
          {user && (
            <header>
              <div className="brand"><b>m<i>.</i> Aulas de Canto</b><span>Louvor IMCM</span></div>
              <div className="sair inline"><Link className="chip" href="/senha">Senha</Link><form action={sair}><button className="chip">Sair</button></form></div>
            </header>
          )}
          {user && admin && (
            <Nav ultimo={ultimo} />
          )}
          {user && !admin ? <p className="note">O e-mail {user.email} não tem acesso a este app.</p> : children}
        </div>
      </body>
    </html>
  )
}
