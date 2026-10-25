// Display labels only. Original names, ingredients, strengths and license IDs remain untouched.
const number = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;
const unit = String.raw`(?:mcg|[μµ]g|mg|ml|gm|g|i\.?u\.?|units?|%)`;
const dosePattern = new RegExp(String.raw`${number}(?:\s*\/\s*${number})*\s*${unit}(?:\s*\/\s*(?:${number}\s*)?(?:${unit}|ml|l))*(?![a-z])`, 'gi');

function plain(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}
function normalizeDose(value) {
  return value.replace(/,/g, '').replace(/\s+/g, '').replace(/毫克/g, 'mg').replace(/微克/g, 'mcg')
    .replace(/公克/g, 'g').replace(/毫升/g, 'mL').replace(/公絲/g, 'mg')
    .replace(/gm/gi, 'g').replace(/mcg|[μµ]g/gi, 'mcg').replace(/mg/gi, 'mg')
    .replace(/ml/gi, 'mL').replace(/G/g, 'g').replace(/units?/gi, 'units').replace(/i\.?u\.?/gi, 'IU');
}
function doses(value) {
  const text = plain(value).replace(/微克/g, 'mcg').replace(/毫克|公絲/g, 'mg').replace(/公克/g, 'g').replace(/毫升/g, 'mL');
  return [...new Set((text.match(dosePattern) || []).map(normalizeDose))];
}
function beforeManufacturer(value) {
  return plain(value).split(/\bstandard\b/i)[0].replace(/[\s"'“”‘’]+$/g, '').trim();
}

// Never select one number from a multi-ingredient or multi-strength source paragraph.
export function productDisplayStrength(p) {
  const english = beforeManufacturer(p.english).replace(/\([^)]*\)/g, ' ');
  // This license is the sugar-coated tablet; its source separately lists the film-coated strength.
  if (p.license === '衛署藥製字第013801號' && /糖衣錠/.test(p.name)) {
    const exactForm = plain(p.strength).match(/糖衣錠\s*[:：](.*?)(?=膜衣錠|$)/);
    const found = exactForm ? doses(exactForm[1]) : [];
    if (found.length === 1) return {value:found[0],source:'原規格欄明文：糖衣錠'};
  }
  for (const [source, value] of [['商品英文名', english], ['商品中文名', p.name], ['原規格欄', p.strength]]) {
    const found = doses(value);
    if (found.length === 1) {
      let dose = found[0];
      if (source === '原規格欄' && !dose.includes('/')) {
        if (/每\s*(?:一|1)?\s*(?:ml|毫升)|per\s*(?:1\s*)?ml/i.test(value)) dose += '/mL';
        else if (/每\s*(?:一|1)?\s*(?:gm|g|公克)/i.test(value)) dose += '/g';
      }
      return {value: dose, source};
    }
    if (found.length > 1) return {value: '', source: '', reason: source + '含多個劑量，未挑選或重新組合'};
  }
  return {value: '', source: '', reason: '商品名稱及規格欄沒有可直接確認的單一劑量'};
}

export function productDisplayForm(p) {
  const english = beforeManufacturer(p.english);
  const chinese = plain(p.name);
  // Product identity hints, never a statement that a formulation may be split or crushed.
  if (/enteric|gastro[ -]?resistant/i.test(english) || /腸溶/.test(chinese)) return '腸溶';
  if (/\bODT\b|orodispersible/i.test(english) || /口溶|口崩/.test(chinese)) return 'ODT';
  if (/\bXL\b/i.test(english)) return 'XL';
  if (/\bS\.?\s*R\.?/i.test(english)) return 'SR';
  if (/prolonged|sustained|extended[ -]?release/i.test(english) || /緩釋|持續(?:性)?(?:藥效|釋放)/.test(chinese)) return '緩釋';
  if (/injection|infusion|\binj\b/i.test(english) || /注射/.test(chinese)) return '注射劑';
  if (/nasal\s+spray/i.test(english) || /鼻.*噴/.test(chinese)) return '鼻噴劑';
  if (/vaginal/i.test(english) || /陰道/.test(chinese)) return '陰道錠';
  if (/troches?|lozenges?/i.test(english) || /口含/.test(chinese)) return '口含錠';
  if (/cream/i.test(english) || /乳膏/.test(chinese)) return '乳膏';
  if (/ointment/i.test(english) || /軟膏/.test(chinese)) return '軟膏';
  if (/gauze|dressing/i.test(english) || /紗布/.test(chinese)) return '紗布';
  if (/suspension/i.test(english) || /懸液/.test(chinese)) return '懸液劑';
  if (/syrup/i.test(english) || /糖漿/.test(chinese)) return '糖漿';
  if (/granules?/i.test(english) || /顆粒/.test(chinese)) return '顆粒';
  if (/solution|liquid|mixture/i.test(english) || /口服液|溶液/.test(chinese)) return '口服液';
  if (/powder/i.test(english) || /散劑/.test(chinese)) return '散劑';
  return '';
}

function brand(p) {
  let text = beforeManufacturer(p.english).replace(/\([^)]*\)/g, ' ').trim();
  // Cut at the first dosage-form descriptor, keeping compound brands such as Co-Midis.
  const formStart = /\s+(?:(?:S\.?\s*R\.?|F\.?\s*C\.?|S\.?\s*C\.?|XL|ODT)(?=[\s.]|$)|film[ -]?coated|gastro[ -]?resistant|enteric[ -]?microencapsulated|prolonged|sustained|extended|hard\s+caps|lyo[ -]?inj|tablets?\b|tab\.|capsules?\b|cap\.|injection\b|inj\.|for\s+I\.?V\b|lyophilized|nasal\s+spray|vaginal|troches?\b|cream\b|ointment\b|gauze\b|powder\b|granules?\b|suspension\b|syrup\b|solution\b|liquid\b|mixture\b)/i;
  const cut = text.search(formStart);
  if (cut >= 0) text = text.slice(0, cut);
  else text = text.replace(new RegExp(String.raw`\s+${number}.*$`), '');
  return text.replace(/[\s"'“”‘’.,;:]+$/g, '').trim() || plain(p.name).replace(/^["“「]?生達["”」]?\s*/, '') || p.license;
}

// Keep original English trade-name descriptors instead of replacing them with Chinese forms.
// SR/XL/ODT and special-release identity markers continue to use the established labels.
function sourceFormTradeName(p, form, strength) {
  if (!form || ['腸溶', 'ODT', 'XL', 'SR', '緩釋'].includes(form)) return '';
  const source = beforeManufacturer(p.english).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/\b(?:injection|infusion|inj|nasal\s+spray|vaginal|troches?|lozenges?|cream|ointment|gauze|dressing|suspension|syrup|granules?|solution|liquid|mixture|powder)\b/i.test(source)) return '';
  const dose = new RegExp(dosePattern.source, 'i').exec(source);
  const name = (dose ? source.slice(0, dose.index) : source).trim();
  return [name, strength].filter(Boolean).join(' ');
}

const labels = new Map();
function basicDisplay(p) {
  const strength = productDisplayStrength(p);
  const form = productDisplayForm(p);
  // MIXTURE belongs to this product's registered trade name; keep it intact.
  const fullTradeName = p.license === '衛署藥製字第030862號' && plain(p.english) === 'COUGH MIXTURE';
  const shielinTradeName = p.license === '衛署藥製字第004761號' && plain(p.english) === 'SHIELIN POWDER';
  return {
    english: shielinTradeName ? 'Shielin Powder' : fullTradeName ? 'COUGH MIXTURE' : sourceFormTradeName(p, form, strength.value) || [brand(p), form, strength.value].filter(Boolean).join(' '),
    chinese: plain(p.name).replace(/^["“「『〝]?生達["”」』〞]?\s*/, '').replace(/[(（][^()（）]*[)）]/g, '').trim(),
    strength: strength.value,
    strengthSource: strength.source,
    form,
    reason: strength.reason || '',
  };
}

export function configureProductDisplay(products) {
  labels.clear();
  const groups = new Map();
  for (const p of products) {
    const label = basicDisplay(p);
    labels.set(p.id || p.license, label);
    const key = label.english.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  // Keep different dosage forms/licenses distinguishable after shortening.
  for (const group of groups.values()) if (group.length > 1) {
    const formLabels = group.map(p => /capsule|\bcap\./i.test(p.english) ? '膠囊' : /tablet|\btab\./i.test(p.english) ? '錠劑' : '');
    const distinctForms = new Set(formLabels).size === group.length && formLabels.every(Boolean);
    group.forEach((p, index) => {
      const label = labels.get(p.id || p.license);
      label.english += distinctForms ? ' · ' + formLabels[index] : ' · ' + p.license;
      label.disambiguation = distinctForms ? '保留劑型以區分不同許可證' : '簡稱相同，保留許可證以免混淆';
    });
  }
  return products.map(p => ({id: p.id || p.license, ...productDisplay(p)}));
}

export function productDisplay(p) {
  return labels.get(p.id || p.license) || basicDisplay(p);
}

export function searchProductsForDisplay(products, query, originalSearch) {
  const terms = plain(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const compact = value => plain(value).toLowerCase().replace(/\s+/g, '');
  const aliases = products.filter(p => {
    const label = productDisplay(p);
    const previousLabel = [brand(p), label.form, label.strength].filter(Boolean).join(' ');
    const text = compact(label.english + ' ' + label.chinese + ' ' + previousLabel);
    return terms.every(term => text.includes(compact(term)));
  });
  return [...new Map([...originalSearch(products, query), ...aliases].map(p => [p.id || p.license, p])).values()];
}
