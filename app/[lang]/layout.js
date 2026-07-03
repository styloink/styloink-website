import { Inter } from "next/font/google";
import { i18n } from "@/i18n-config";

const inter = Inter({ subsets: ["latin"] });

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default function RootLayout({ children, params }) {
  const isRtl = params.lang === 'ar';

  return (
    <html lang={params.lang} dir={isRtl ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <header className="border-b bg-white sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">STYLOINK</div>
            <div className="flex gap-4">
               {/* 这里将来放置语言切换器 */}
               <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">Contact Us</button>
            </div>
          </nav>
        </header>
        {children}
        <footer className="bg-gray-50 border-t py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
             © 2026 STYLOINK. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
