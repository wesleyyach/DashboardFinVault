/* ==========================================================
   main.js — FinVault Dashboard
   Responsável por: chamadas à API, renderização dos
   gráficos (Chart.js) e atualização dinâmica do DOM.
   ========================================================== */

   const API = "/api";;

/* ── Formatadores ── */
const fmt  = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const fmtN = n => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct  = n => (n >= 0 ? '+' : '') + fmtN(n) + '%';
const color = n => n >= 0 ? 'var(--green)' : 'var(--red)';

/* ── Relógio em tempo real ── */
function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
updateClock();
setInterval(updateClock, 1000);

/* ── Chart.js — Configurações globais ── */
Chart.defaults.color       = '#6B6B88';
Chart.defaults.borderColor = '#252535';
Chart.defaults.font.family = "'JetBrains Mono', monospace";

let priceChartInstance = null;
let allocChartInstance = null;

/* ============================================================
   PORTFOLIO — KPIs + Tabela de posições
   ============================================================ */
async function loadPortfolio() {
  try {
    const res  = await fetch(`${API}/portfolio`);
    const data = await res.json();
    renderPortfolio(data);
  } catch {
    console.warn('Backend offline — carregando dados demo (portfolio)');
    renderPortfolio(DEMO.portfolio);
  }
}

function renderPortfolio(d) {
  /* KPIs */
  document.getElementById('kpi-total').innerHTML =
    `<span style="color:var(--gold-light)">${fmt(d.total_value)}</span>`;

  const dc = d.daily_change;
  document.getElementById('kpi-daily').innerHTML =
    `<span style="color:${color(dc)}">${dc >= 0 ? '▲' : '▼'} ${fmt(Math.abs(dc))} hoje (${pct(d.daily_change_pct)})</span>`;

  const pnl = d.total_pnl;
  document.getElementById('kpi-pnl').innerHTML =
    `<span style="color:${color(pnl)}">${fmt(pnl)}</span>`;
  document.getElementById('kpi-pnl-pct').innerHTML =
    `<span style="color:${color(pnl)}">${pct(d.total_pnl_pct)} sobre capital</span>`;

  document.getElementById('kpi-invested').textContent = fmt(d.invested);
  document.getElementById('kpi-cash').textContent     = fmt(d.cash);

  /* Tabela de posições */
  document.getElementById('holdings-body').innerHTML = d.holdings.map(h => `
    <tr>
      <td>
        <span class="ticker-badge">${h.ticker}</span>
        <div class="stock-name">${h.name}</div>
      </td>
      <td class="mono">${h.shares}</td>
      <td>${fmt(h.avg_cost)}</td>
      <td>${fmt(h.current_price)}</td>
      <td>${fmt(h.value)}</td>
      <td style="color:${color(h.pnl)}">${fmt(h.pnl)}</td>
      <td style="color:${color(h.pnl_pct)};font-weight:500">${pct(h.pnl_pct)}</td>
    </tr>
  `).join('');
}

/* ============================================================
   PRICE CHART — Gráfico de linha (30 dias)
   ============================================================ */
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'];
let currentTicker = 'NVDA';

function buildTickerTabs() {
  document.getElementById('ticker-tabs').innerHTML = TICKERS.map(t => `
    <div class="ticker-tab ${t === currentTicker ? 'active' : ''}"
         onclick="loadChart('${t}')">${t}</div>
  `).join('');
}

async function loadChart(ticker) {
  currentTicker = ticker;
  buildTickerTabs();
  try {
    const res  = await fetch(`${API}/chart/${ticker}`);
    const data = await res.json();
    renderPriceChart(data.dates, data.prices, data.change >= 0);
    document.getElementById('chart-info').innerHTML =
      `<span style="color:${color(data.change)}">${pct(data.change_pct)} (30d)</span>`;
  } catch {
    renderPriceChart(DEMO.chart.dates, DEMO.chart.prices, true);
    document.getElementById('chart-info').innerHTML =
      `<span style="color:var(--green)">+demo</span>`;
  }
}

function renderPriceChart(labels, data, isUp) {
  const ctx       = document.getElementById('priceChart').getContext('2d');
  const baseColor = isUp ? '46,204,138' : '224,90,90';
  const grad      = ctx.createLinearGradient(0, 0, 0, 240);
  grad.addColorStop(0, `rgba(${baseColor},0.25)`);
  grad.addColorStop(1, `rgba(${baseColor},0)`);

  if (priceChartInstance) priceChartInstance.destroy();

  priceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: `rgba(${baseColor},0.9)`,
        backgroundColor: grad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: `rgba(${baseColor},1)`,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A28',
          borderColor: '#252535',
          borderWidth: 1,
          titleColor: '#6B6B88',
          bodyColor: '#E8E8F0',
          padding: 10,
          callbacks: { label: c => ' $' + fmtN(c.raw) }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8, font: { size: 10 } }
        },
        y: {
          position: 'right',
          grid: { color: '#1A1A28' },
          ticks: { font: { size: 10 }, callback: v => '$' + fmtN(v) }
        }
      }
    }
  });
}

/* ============================================================
   ALLOCATION — Gráfico donut
   ============================================================ */
async function loadAlloc() {
  try {
    const res  = await fetch(`${API}/allocation`);
    const data = await res.json();
    renderAllocChart(data.labels, data.values, data.colors);
  } catch {
    const d = DEMO.allocation;
    renderAllocChart(d.labels, d.values, d.colors);
  }
}

function renderAllocChart(labels, values, colors) {
  const ctx = document.getElementById('allocChart').getContext('2d');
  if (allocChartInstance) allocChartInstance.destroy();

  allocChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#13131C',
        borderWidth: 3,
        hoverBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A28',
          borderColor: '#252535',
          borderWidth: 1,
          callbacks: { label: c => ` ${c.label}: ${c.raw}%` }
        }
      }
    }
  });

  /* Legenda customizada */
  document.getElementById('alloc-legend').innerHTML = labels.map((l, i) => `
    <div class="alloc-item">
      <div class="alloc-dot-label">
        <div class="alloc-dot" style="background:${colors[i]}"></div>
        <span>${l}</span>
      </div>
      <span class="alloc-pct">${fmtN(values[i])}%</span>
    </div>
  `).join('');
}

/* ============================================================
   MOVERS — Maiores movimentos do dia
   ============================================================ */
async function loadMovers() {
  try {
    const res  = await fetch(`${API}/movers`);
    const data = await res.json();
    renderMovers(data);
  } catch {
    renderMovers(DEMO.movers);
  }
}

function renderMovers(data) {
  document.getElementById('movers-list').innerHTML = data.map(m => `
    <div class="mover-item">
      <div class="mover-left">
        <div class="mover-avatar">${m.ticker.substring(0, 4)}</div>
        <div>
          <div class="mover-name">${m.ticker}</div>
          <div class="mover-vol">Vol: ${m.volume}</div>
        </div>
      </div>
      <div class="mover-right">
        <div class="mover-price">$${fmtN(m.price)}</div>
        <div class="mover-pct" style="color:${color(m.change_pct)}">${pct(m.change_pct)}</div>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   TRANSACTIONS — Últimas transações
   ============================================================ */
async function loadTransactions() {
  try {
    const res  = await fetch(`${API}/transactions`);
    const data = await res.json();
    renderTxns(data);
  } catch {
    renderTxns(DEMO.transactions);
  }
}

function renderTxns(data) {
  document.getElementById('txn-list').innerHTML = data.map(t => `
    <div class="txn-item">
      <div class="txn-badge ${t.type.toLowerCase()}">${t.type}</div>
      <div class="txn-info">
        <div class="txn-title">${t.ticker} · ${t.shares} ações · $${fmtN(t.price)}/un</div>
        <div class="txn-date">${t.date}</div>
      </div>
      <div class="txn-amount">${fmt(t.total)}</div>
    </div>
  `).join('');
}

/* ============================================================
   INDICES — S&P 500, NASDAQ, DOW, VIX
   ============================================================ */
async function loadIndices() {
  try {
    const res  = await fetch(`${API}/indices`);
    const data = await res.json();
    renderIndices(data);
  } catch {
    renderIndices(DEMO.indices);
  }
}

function renderIndices(data) {
  document.getElementById('indices-bar').innerHTML = data.map(idx => `
    <div class="index-chip">
      <div>
        <div class="index-name">${idx.name}</div>
        <div class="index-value">${fmtN(idx.value)}</div>
      </div>
      <div class="index-change" style="color:${color(idx.change)}">${pct(idx.change)}</div>
    </div>
  `).join('');
}

/* ============================================================
   DADOS DEMO — Usados quando o backend está offline
   ============================================================ */
const DEMO = {
  portfolio: {
    total_value: 142380.50, invested: 118200.00,
    total_pnl: 24180.50,   total_pnl_pct: 20.46,
    cash: 12450.00,        daily_change: 872.30, daily_change_pct: 0.61,
    holdings: [
      { ticker:'NVDA',  name:'NVIDIA Corp.',      shares:15, avg_cost:620.00, current_price:875.30, value:13129.50, pnl:3829.50, pnl_pct:41.18 },
      { ticker:'MSFT',  name:'Microsoft Corp.',   shares:30, avg_cost:380.10, current_price:415.20, value:12456.00, pnl:1053.00, pnl_pct:9.23  },
      { ticker:'AAPL',  name:'Apple Inc.',        shares:50, avg_cost:165.30, current_price:189.45, value:9472.50,  pnl:1207.50, pnl_pct:14.61 },
      { ticker:'TSLA',  name:'Tesla Inc.',        shares:20, avg_cost:210.50, current_price:241.10, value:4822.00,  pnl:612.00,  pnl_pct:14.53 },
      { ticker:'GOOGL', name:'Alphabet Inc.',     shares:25, avg_cost:155.00, current_price:178.90, value:4472.50,  pnl:597.50,  pnl_pct:15.45 },
    ]
  },
  chart: (() => {
    const prices = [620], dates = [];
    const base = new Date(); base.setDate(base.getDate() - 29);
    for (let i = 0; i < 30; i++) {
      if (i > 0) prices.push(+(prices[i-1] * (1 + (Math.random() - 0.45) * 0.035)).toFixed(2));
      const d = new Date(base); d.setDate(base.getDate() + i);
      dates.push(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    return { prices, dates };
  })(),
  allocation: {
    labels: ['NVDA','MSFT','AAPL','TSLA','GOOGL','Cash'],
    values: [22.1, 21.0, 15.9, 8.1, 7.5, 25.4],
    colors: ['#C9A84C','#E8C96C','#A07830','#D4B468','#8B6520','#555566'],
  },
  movers: [
    { ticker:'NVDA', name:'NVIDIA Corp.',      price:875.30, change_pct:3.82,  volume:'62.4M' },
    { ticker:'TSLA', name:'Tesla Inc.',        price:241.10, change_pct:-2.14, volume:'48.9M' },
    { ticker:'META', name:'Meta Platforms',   price:513.80, change_pct:1.73,  volume:'27.1M' },
    { ticker:'AMZN', name:'Amazon.com',       price:198.70, change_pct:-0.94, volume:'35.6M' },
    { ticker:'AAPL', name:'Apple Inc.',        price:189.45, change_pct:0.61,  volume:'55.3M' },
    { ticker:'BRK',  name:'Berkshire Hathaway',price:612.40, change_pct:-0.28, volume:'12.2M' },
  ],
  transactions: [
    { date:'28/03', type:'BUY',  ticker:'NVDA',  shares:5,  price:862.10, total:4310.50 },
    { date:'25/03', type:'SELL', ticker:'TSLA',  shares:10, price:248.90, total:2489.00 },
    { date:'22/03', type:'BUY',  ticker:'AAPL',  shares:15, price:183.20, total:2748.00 },
    { date:'18/03', type:'BUY',  ticker:'MSFT',  shares:8,  price:408.50, total:3268.00 },
    { date:'14/03', type:'SELL', ticker:'GOOGL', shares:12, price:171.30, total:2055.60 },
  ],
  indices: [
    { name:'S&P 500',   value:5248.50,  change:0.58  },
    { name:'NASDAQ',    value:16432.80, change:0.92  },
    { name:'DOW JONES', value:39387.30, change:0.34  },
    { name:'VIX',       value:14.32,    change:-3.21 },
  ],
};

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
buildTickerTabs();

(async () => {
  await Promise.all([
    loadPortfolio(),
    loadAlloc(),
    loadMovers(),
    loadTransactions(),
    loadIndices(),
  ]);
  await loadChart(currentTicker);
})();

/* Auto-refresh a cada 30 segundos */
setInterval(() => {
  loadPortfolio();
  loadMovers();
  loadIndices();
  loadChart(currentTicker);
}, 30_000);
