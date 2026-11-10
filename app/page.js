import { redirect } from 'next/navigation'
import { db } from '@/lib/supabase'

export default async function Home() {
  const sb = await db()
  const { data } = await sb.from('meses').select('competencia').order('competencia', { ascending: false }).limit(1)
  if (!data?.length) return <p className="note">Nenhum mês cadastrado.</p>
  redirect(`/mes/${data[0].competencia.slice(0, 7)}`)
}
