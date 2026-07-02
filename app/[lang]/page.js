import { translations } from "../../i18n-config";

export default function HomePage({ params }) {
  const t = translations[params.lang] || translations.en;

  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-blue-900 text-white py-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            {t.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
            {t.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-50 transition">
              {t.viewProducts}
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-white/10 transition">
              {t.contactUs}
            </button>
          </div>
        </div>
        {/* 装饰性背景 */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/20 to-transparent pointer-events-none" />
      </section>

      {/* 产品分类入口 */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(t.categories).map(([key, value]) => (
            <div key={key} className="group p-8 border rounded-2xl hover:shadow-xl transition-all cursor-pointer bg-white">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                {key === 'sublimation' ? '💧' : key === 'textile' ? '🧵' : key === 'office' ? '🖥️' : '🏗️'}
              </div>
              <h3 className="text-xl font-bold mb-2">{value}</h3>
              <div className="w-10 h-1 bg-blue-600 transition-all group-hover:w-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
