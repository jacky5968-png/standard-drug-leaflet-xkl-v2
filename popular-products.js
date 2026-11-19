import {POPULARITY_CONFIG} from './popularity-config.js?v=20261119-google';
// Global totals only. No question text, account, cookie or browser identifier is sent.
export function createPopularityClient({endpoint, products, document: doc = document, window: win = window, fetch: request = fetch, timeout = 12000}) {
  const known = new Map(products.map(p => [p.license, p]));
  const api = new URL(endpoint);
  if (api.protocol !== 'https:' || api.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api.pathname)) throw new Error('Invalid popularity endpoint');
  let serial = 0;
  const jsonp = parameters => new Promise((resolve, reject) => {
    const callback = '__xklPopular_' + Date.now() + '_' + (++serial);
    const script = doc.createElement('script');
    const url = new URL(api);
    Object.entries({...parameters, callback}).forEach(([key, value]) => url.searchParams.set(key, value));
    let timer;
    const cleanup = () => { clearTimeout(timer); script.remove(); delete win[callback]; };
    win[callback] = value => { cleanup(); value?.ok ? resolve(value) : reject(new Error('Popularity service unavailable')); };
    script.onerror = () => { cleanup(); reject(new Error('Popularity network error')); };
    script.referrerPolicy = 'no-referrer';
    script.src = url.href;
    timer = setTimeout(() => { cleanup(); reject(new Error('Popularity timeout')); }, timeout);
    doc.head.append(script);
  });
  return {
    async top() {
      const result = await jsonp({action: 'top'});
      if (!Array.isArray(result.items)) throw new Error('Invalid popularity data');
      const seen = new Set();
      return result.items.filter(row => {
        if (!known.has(row.license) || seen.has(row.license) || !Number.isSafeInteger(row.count) || row.count <= 0) return false;
        seen.add(row.license); return true;
      }).sort((a,b) => b.count - a.count || (a.license < b.license ? -1 : a.license > b.license ? 1 : 0)).slice(0, 5).map(row => ({product: known.get(row.license), count: row.count}));
    },
    async record(license) {
      if (!known.has(license)) return false;
      const eventId = Date.now() + '.' + win.crypto.randomUUID();
      // Apps Script redirects ContentService responses. A simple POST sends the
      // event without CORS preflight; read-only JSONP confirms its actual receipt.
      for (let attempt = 0; attempt < 3; attempt++) {
        await request(api.href, {method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', headers: {'Content-Type': 'text/plain;charset=UTF-8'}, body: JSON.stringify({action: 'record', license, eventId}), signal: AbortSignal.timeout(timeout)});
        const result = await jsonp({action: 'status', license, eventId});
        if (result.recorded === true) return true;
        await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
      }
      return false;
    }
  };
}

export function renderPopularProducts(container, items, display, choose, doc = document) {
  container.replaceChildren();
  items.forEach(({product, count}, index) => {
    const button = doc.createElement('button');
    button.type = 'button'; button.className = 'popular-product';
    const label = display(product);
    button.title = [label.english, product.license, '累計 ' + count.toLocaleString('zh-TW') + ' 次'].join('｜');
    button.setAttribute('aria-label', '第' + (index + 1) + '名，' + label.chinese + '，累計' + count + '次，選擇此產品');
    const rank = doc.createElement('span'); rank.className = 'popular-rank'; rank.textContent = String(index + 1);
    const name = doc.createElement('span'); name.className = 'popular-name'; name.textContent = label.chinese || label.english;
    const total = doc.createElement('small'); total.className = 'popular-count'; total.textContent = count.toLocaleString('zh-TW') + ' 次';
    button.append(rank, name, total); button.onclick = () => choose(product); container.append(button);
  });
}

export function setupPopularProducts({products, display, choose, document: doc = document, window: win = window, fetch: request = fetch}) {
  const container = doc.getElementById('popular-products');
  const status = doc.getElementById('popular-status');
  if (!container || !status) return {record: async () => false};
  let client, loading = false, lastRead = 0;
  const refresh = async () => {
    if (!client || loading) return;
    loading = true;
    try {
      const items = await client.top();
      renderPopularProducts(container, items, display, choose, doc);
      status.textContent = items.length ? '全站累計・依查詢次數排序' : '目前尚無查詢紀錄';
      lastRead = Date.now();
    } catch { status.textContent = container.children.length ? '目前顯示上次載入的排名，暫時無法更新' : '熱門查詢暫時無法載入'; }
    finally { loading = false; }
  };
  const ready = (async () => {
    try {
      const config = POPULARITY_CONFIG;
      if (!config.enabled) {status.textContent = '熱門查詢尚未啟用'; return;}
      client = createPopularityClient({endpoint: config.endpoint, products, document: doc, window: win, fetch: request});
      // Local previews may read rankings but never add test queries to live totals.
      const production = new URL(config.siteUrl);
      client.canRecord = win.location.origin === production.origin && win.location.pathname.startsWith(production.pathname);
      await refresh();
    } catch { status.textContent = '熱門查詢暫時無法載入'; }
  })();
  win.addEventListener('focus', () => { if (Date.now() - lastRead > 30000) void refresh(); });
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden && Date.now() - lastRead > 30000) void refresh(); });
  return {
    ready,
    async record(license) {
      await ready;
      if (!client?.canRecord) return false;
      try {
        const recorded = await client.record(license);
        if (recorded) await refresh();
        return recorded;
      } catch { return false; } // Statistics must never interrupt the answer.
    }
  };
}
