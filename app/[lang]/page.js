import { translations } from "@/i18n-config";

export default function HomePage({ params }) {
  const t = translations[params.lang] || translations.en;
  const isRtl = params.lang === 'ar';

  return (
    <main className="bg-white">
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-[#0F1D3D] via-[#1B3368] to-[#2D5FA0] text-white overflow-hidden pt-20">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <circle cx="80" cy="20" r="40" fill="white" />
             <circle cx="10" cy="80" r="30" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full py-20">
          <div className="inline-block px-4 py-1.5 bg-blue-400/20 border border-blue-400/30 rounded-full text-blue-200 text-xs font-bold tracking-widest mb-8 animate-fade-in">
            SINCE 1999
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight max-w-4xl">
             {params.lang === 'zh' ? <>专业油墨<br/><span className="text-blue-300">为每一抹色彩负责</span></> : 
              params.lang === 'es' ? <>Tinta Profesional<br/><span className="text-blue-300">Calidad en cada gota</span></> :
              params.lang === 'ar' ? <>أحبار احترافية<br/><span className="text-blue-300">مسؤولون عن كل لون</span></> :
              <>Professional Ink<br/><span className="text-blue-300 text-opacity-90 font-light italic">Refined in Every Drop</span></>}
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-12 max-w-xl leading-relaxed font-light">
            {t.heroSub}
          </p>
          <div className="flex flex-wrap gap-5">
            <button className="px-10 py-4 bg-[#4A80C4] hover:bg-[#2D5FA0] text-white font-bold rounded-full transition-all hover:-translate-y-1 shadow-lg shadow-blue-900/50">
              {t.contactUs}
            </button>
            <button className="px-10 py-4 bg-transparent border border-white/30 hover:border-white hover:bg-white/5 text-white font-bold rounded-full transition-all hover:-translate-y-1">
              {t.viewProducts}
            </button>
          </div>

          <div className="flex gap-12 mt-20 pt-12 border-t border-white/10">
             <div>
                <div className="text-3xl font-bold text-white">1800+</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Partners</div>
             </div>
             <div>
                <div className="text-3xl font-bold text-white">60+</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Countries</div>
             </div>
             <div>
                <div className="text-3xl font-bold text-white">20+</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Series</div>
             </div>
          </div>
        </div>
      </section>

      {/* ===== About Us ===== */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative group">
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl overflow-hidden shadow-2xl relative z-10">
               <div className="absolute inset-0 flex items-center justify-center text-white/20 text-lg italic">Factory Presence</div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-blue-400 rounded-3xl -z-0 opacity-20 group-hover:scale-110 transition-transform"></div>
          </div>
          <div>
             <div className="text-blue-500 font-bold text-xs tracking-widest uppercase mb-4">About Us</div>
             <h2 className="text-4xl font-bold text-[#0F1D3D] mb-8 leading-tight">
                {params.lang === 'zh' ? "近三十年专注，只为一滴好墨" : "Decades of Dedication to Perfect Ink"}
             </h2>
             <div className="space-y-6 text-slate-500 leading-relaxed">
                <p>StyloInk was established in 1999, headquartered in Xiamen, China. We possess industry-leading R&D laboratories and fully automated production lines.</p>
                <p>From raw material selection to final delivery, every process follows ISO 9001 and ISO 14001 standards, ensuring precise color and strong adhesion.</p>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-12">
                {['ISO 9001', 'ISO 14001', 'REACH/RoHS', 'SGS Verified'].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#1B3368]">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    {item}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* ===== Products ===== */}
      <section className="py-32 bg-[#F0F5FB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="text-blue-500 font-bold text-xs tracking-widest uppercase mb-4">Our Products</div>
            <h2 className="text-4xl font-bold text-[#0F1D3D]">Professional Ink Solutions</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {Object.entries(t.categories).map(([key, value]) => (
              <div key={key} className="bg-white p-12 rounded-2xl border border-slate-100 transition-all hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 bg-blue-50 rounded-xl mb-8 flex items-center justify-center text-2xl text-blue-500">
                  {key === 'sublimation' ? '💧' : key === 'textile' ? '🧵' : key === 'office' ? '🖥️' : '🏗️'}
                </div>
                <h4 className="text-xl font-bold text-[#0F1D3D] mb-4">{value}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">High-performance digital printing ink designed for industrial reliability and vibrant output.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Why Us ===== */}
      <section className="py-32 max-w-7xl mx-auto px-6 text-center">
        <div className="mb-20">
          <div className="text-blue-500 font-bold text-xs tracking-widest uppercase mb-4">Advantages</div>
          <h2 className="text-4xl font-bold text-[#0F1D3D]">Why Choose StyloInk</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
           {[
             {title: "Stable Quality", desc: "12-stage testing process ensuring DeltaE < 1.5"},
             {title: "Quick Response", desc: "Sample in 72h, delivery in 7-15 days"},
             {title: "Custom R&D", desc: "20+ specialists for deep OEM/ODM collaboration"},
             {title: "Eco-Friendly", desc: "Strictly compliant with REACH & RoHS standards"}
           ].map((adv, i) => (
             <div key={i} className="p-8 rounded-2xl hover:bg-[#F0F5FB] transition-colors group">
               <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-400 rounded-2xl mx-auto mb-8 flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">✓</div>
               <h4 className="font-bold text-[#0F1D3D] mb-3">{adv.title}</h4>
               <p className="text-xs text-slate-400 leading-relaxed">{adv.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 bg-gradient-to-r from-[#1B3368] to-[#2D5FA0] text-white text-center mx-6 rounded-[2rem]">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Find the best ink solution for your business</h2>
          <p className="text-white/60 mb-10">Whether it's standard products or custom needs, our technical team will contact you within 24 hours.</p>
          <button className="px-12 py-5 bg-white text-[#1B3368] font-bold rounded-full hover:bg-blue-50 hover:shadow-2xl transition-all active:scale-95">
             Inquiry Now
          </button>
        </div>
      </section>
    </main>
  );
}
