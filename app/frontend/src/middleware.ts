import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/boutique', '/api', '/_next', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les chemins publics
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path)) || pathname === '/'
  if (isPublic) return NextResponse.next()

  // Protéger /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    const token =
      request.cookies.get('vendix_token')?.value ??
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
