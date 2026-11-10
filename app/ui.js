'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
