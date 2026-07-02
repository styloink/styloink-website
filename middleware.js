import { NextResponse } from 'next/server'
import { i18n } from './i18n-config'

export function middleware(request) {
  const pathname = request.nextUrl.pathname
  
  // 检查路径是否已经包含语言代码
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // 如果没有语言代码，则重定向到默认语言 (en)
  if (pathnameIsMissingLocale) {
    const locale = i18n.defaultLocale
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    )
  }
}

export const config = {
  // 匹配所有路径，除了 api, _next/static, _next/image, favicon.ico 等
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
