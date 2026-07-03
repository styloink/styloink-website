import { Inter } from "next/font/google";
import "@/app/globals.css";
import { i18n } from "@/i18n-config";

const inter = Inter({ subsets: ["latin"] });

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default function RootLayout({ children, params }) {
  const isRtl = params.lang === 'ar';

  return (
    <html lang={params.lang} dir={isRtl ? 'rtl' : 'ltr'}>
      <body className={`${inter.className} antialiased`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black italic transform transition-transform group-hover:rotate-12">S</div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">STYLO<span className="text-blue-600 font-extrabold italic">INK</span></span>
            </div>
            
            <div className="hidden md:flex gap-10 text-sm font-semibold text-slate-600">
              <a href="#" className="text-blue-600 border-b-2 border-blue-600">Home</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Products</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Technology</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Certificates</a>
            </div>

            <div className="flex items-center gap-4">
               <div className="text-xs font-bold px-3 py-1.5 bg-slate-100 rounded-full text-slate-500 uppercase tracking-widest">{params.lang}</div>
               <button className="hidden sm:block btn-primary py-2 px-5 text-sm">INQUIRY</button>
            </div>
          </nav>
        </header>

        {children}

        <footer className="bg-slate-900 text-slate-400 py-16 mt-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-800 pb-12 mb-12">
            <div>
              <div className="text-white text-xl font-bold mb-6 italic">STYLOINK</div>
              <p className="text-sm leading-relaxed">Leading digital inkjet solutions provider since 1999. Exporting professional quality ink to 60+ countries worldwide.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white">Product Series</a></li>
                <li><a href="#" className="hover:text-white">OEM Solutions</a></li>
                <li><a href="#" className="hover:text-white">Quality Reports</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Contact</h4>
              <p className="text-sm">Email: sales@styloink.com</p>
              <p className="text-sm mt-2">Factory: Xiamen, Fujian, China</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 text-center text-xs font-mono tracking-widest opacity-50 uppercase">
             © 2026 STYLOINK MANUFACTURE CO., LTD. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </body>
    </html>
  );
}
