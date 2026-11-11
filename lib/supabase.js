import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function db() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {} },
    },
  })
}

// links temporários para os comprovantes (bucket privado)
export async function linksComprovantes(sb, paths, segundos = 600) {
  const unicos = [...new Set(paths.filter(Boolean))]
  if (!unicos.length) return {}
  const { data } = await sb.storage.from('comprovantes').createSignedUrls(unicos, segundos)
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}

export async function listarTurmas(sb) {
  const { data } = await sb.from('turmas').select('*').order('ordem').order('nome')
  return data || []
}
