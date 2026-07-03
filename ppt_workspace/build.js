const pptxgen = require('pptxgenjs');
const html2pptx = require('./scripts/html2pptx');
const path = require('path');

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = '武静';
  pptx.title = '泰禾康&朴润中医馆健康管理中心联合运营方案';

  const slidesDir = path.join(__dirname, 'slides');
  const slides = [];
  for (let i = 1; i <= 21; i++) {
    const num = String(i).padStart(2, '0');
    slides.push(path.join(slidesDir, `slide${num}.html`));
  }

  const failures = [];
  for (const file of slides) {
    try {
      await html2pptx(file, pptx);
    } catch (err) {
      failures.push(`[${path.basename(file)}] ${err.message}`);
    }
  }

  if (failures.length) {
    console.error('BUILD ERRORS:\n' + failures.join('\n'));
    process.exitCode = 1;
  }

  const outFile = path.join(__dirname, '..', '泰禾康朴润中医馆联合运营方案_美化版.pptx');
  await pptx.writeFile({ fileName: outFile });
  console.log(`Done! Built ${slides.length - failures.length}/${slides.length} slides.`);
  console.log(`Output: ${outFile}`);
}

main()
  .catch(err => { console.error(err.message || err); process.exitCode = 1; })
  .finally(() => html2pptx.close());
