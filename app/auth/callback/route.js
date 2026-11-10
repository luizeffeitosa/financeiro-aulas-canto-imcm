import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export async function GET(req) {
  const code = req.nextUrl.searchParams.get('code')
  if (code) {
    const supabase = await db()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.redirect(new URL('/login?erro=1', req.url))
}
