import { products } from "../../../data/products";
import { translations } from "../../../i18n-config";

export async function generateStaticParams() {
  const params = [];
  const locales = ['en', 'es', 'ar'];
  
  products.forEach((product) => {
    locales.forEach((locale) => {
      params.push({ lang: locale, slug: product.slug });
    });
  });
  
  return params;
}

export default function ProductPage({ params }) {
  const product = products.find(p => p.slug === params.slug);
  const t = product.translations[params.lang] || product.translations.en;
  const common = translations[params.lang] || translations.en;

  if (!product) return <div>Product not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* 图片展示 */}
        <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
           <img src={product.images[0]} alt={t.title} className="max-w-full h-auto" />
        </div>

        {/* 产品信息 */}
        <div>
          <nav className="text-sm text-gray-500 mb-4">
             Products / {product.specs.type}
          </nav>
          <h1 className="text-3xl font-bold mb-6">{t.title}</h1>
          <p className="text-gray-600 text-lg mb-8">{t.description}</p>
          
          <div className="space-y-4 mb-10">
            {t.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-blue-600">✔</span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
            <h4 className="font-bold mb-4">Technical Specifications</h4>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Ink Type:</span> <span>{product.specs.type}</span>
              <span className="text-gray-500">Volume:</span> <span>{product.specs.volume}</span>
              <span className="text-gray-500">MOQ:</span> <span>{product.specs.moq}</span>
            </div>
          </div>

          <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">
             {common.contactUs}
          </button>
        </div>
      </div>
    </div>
  );
}
