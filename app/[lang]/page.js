import { translations } from "@/i18n-config";

export default function HomePage({ params }) {
  const t = translations[params.lang] || translations.en;

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center bg-slate-950 text-white overflow-hidden">
        {/* 背景动态图形 */}
        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
          <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-150 rotate-12">
            <path fill="#2563eb" d="M790,660.5Q684,821,489.5,851.5Q295,882,185,711Q75,540,188,382.5Q301,225,498.5,190.5Q696,156,796,328Q896,500,790,660.5Z" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 py-20 text-center lg:text-left grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/30 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200">ISO 9001 & SGS Certified Factory</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1] tracking-tight">
              Professional Ink <br/> <span className="text-blue-500 italic">Solutions.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-xl font-light leading-relaxed">
              {t.heroSub}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
              <button className="btn-primary py-4 px-10 text-lg shadow-xl shadow-blue-900/50">
                {t.viewProducts}
              </button>
              <button className="px-10 py-4 rounded-xl border border-white/20 font-bold hover:bg-white/5 transition-all">
                About Us
              </button>
            </div>
          </div>
          
          {/* 右侧展示 (三语示例卡片) */}
          <div className="hidden lg:grid grid-cols-2 gap-4 rotate-3 opacity-80">
             <div className="p-6 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/10 mt-10">
                <div className="text-3xl mb-4">60+</div>
                <div className="text-xs uppercase font-bold tracking-widest text-slate-500">Countries Served</div>
             </div>
             <div className="p-6 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-600/30">
                <div className="text-3xl mb-4">SGS</div>
                <div className="text-xs uppercase font-bold tracking-widest text-blue-100">Quality Verified</div>
             </div>
          </div>
        </div>
      </section>

      {/* 信任背书 - 客户数据栏 */}
      <section className="bg-slate-50 border-y border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-8 opacity-60">
           {['OEKO-TEX', 'ISO 9001', 'ISO 14001', 'SGS', 'CE'].map(cert => (
             <span key={cert} className="text-xl font-black text-slate-300 tracking-tighter grayscale hover:grayscale-0 transition-all cursor-default">{cert}</span>
           ))}
        </div>
      </section>

      {/* 产品分类入口 */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Explore Our Professional Series</h2>
          <div className="w-20 h-2 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(t.categories).map(([key, value]) => (
            <div key={key} className="card-hover group p-10 rounded-[2rem]">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl mb-8 flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-500">
                {key === 'sublimation' ? '💧' : key === 'textile' ? '🧵' : key === 'office' ? '🖥️' : '🏗️'}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{value}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">High-performance digital printing ink designed for industrial reliability.</p>
              <div className="flex items-center gap-2 font-bold text-blue-600 text-xs tracking-widest group-hover:gap-4 transition-all">
                LEARN MORE <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 为什么选择厦门文仪 */}
      <section className="bg-blue-600 py-24 px-6 rounded-[3rem] mx-6 text-white text-center">
         <h2 className="text-3xl font-black mb-6">Source Factory with Professional R&D Team</h2>
         <p className="max-w-2xl mx-auto text-blue-100 text-lg mb-10 leading-relaxed font-light">Since 1999, we have been focusing on ink technology. Our PhD team ensures every drop of ink meets the highest standards.</p>
         <button className="bg-white text-blue-600 px-10 py-4 rounded-xl font-black hover:scale-105 transition-transform shadow-2xl">Download Catalog (PDF)</button>
      </section>
    </main>
  );
}
