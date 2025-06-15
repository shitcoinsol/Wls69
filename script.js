
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjkyMzBkNGU3LWUyNjEtNGNiYi1hYzgzLTY4MDZmNDg5YzRhOSIsIm9yZ0lkIjoiNDUzNzM2IiwidXNlcklkIjoiNDY2ODMzIiwidHlwZUlkIjoiODVkOTcxZDMtODgzOS00NmYxLWJiMGEtM2IyY2Y5ZmE4NTU2IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDk4MDU3MTcsImV4cCI6NDkwNTU2NTcxN30.nbLVfn0ocROspwVeWXIOtw-d6Gm42Bnshujhlp3JrMI';
const SOLSCAN_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDk4NjAwMjIwMDUsImVtYWlsIjoid2F4amluaG8wMkBnbWFpbC5jb20iLCJhY3Rpb24iOiJ0b2tlbi1hcGkiLCJhcGlWZXJzaW9uIjoidjIiLCJpYXQiOjE3NDk4NjAwMjJ9.I1laMt2a0wIiMeQ0JFEDDWWqvwLQvnSjcS0mdvy-vM0';

async function showResults(fromFloating) {
  const ca = fromFloating
    ? document.getElementById("floatingInput")?.value || document.getElementById("mobileInput")?.value
    : document.getElementById("tokenInput").value;

  if (!ca || ca.length < 6) {
    showError();
    return;
  }

  // Validate contract address via Solscan
  let valid = false;
  try {
    const res = await fetch(`https://pro-api.solscan.io/v2.0/token/meta?tokenAddress=${ca}`,
      { headers: { token: SOLSCAN_API_KEY } });
    valid = res.ok;
  } catch (e) {}

  if (!valid) {
    showError();
    return;
  }

  // store recent searches
  let recents = JSON.parse(localStorage.getItem("recents") || "[]");
  recents = [ca, ...recents.filter((x) => x !== ca)].slice(0, 5);
  localStorage.setItem("recents", JSON.stringify(recents));
  const ul = document.getElementById("recent-list");
  if (ul) ul.innerHTML = recents.map((x) => `<li onclick="loadRecent('${x}')">${x}</li>`).join("");

  document.getElementById("intro").style.display = "none";
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("error-message").classList.add("hidden");
  document.getElementById("floating-search")?.classList.remove("hidden");
  document.getElementById("floating-button")?.classList.remove("hidden");
  document.getElementById("recent-searches")?.classList.remove("hidden");
  document.getElementById("project-info")?.style.setProperty("display", "none");

  window.scrollTo({ top: 0, behavior: "smooth" });

  loadTokenData(ca);
}

function loadRecent(ca) {
  document.getElementById("floatingInput").value = ca;
  showResults(true);
}

function showError() {
  document.getElementById("results").classList.add("hidden");
  document.getElementById("error-message").classList.remove("hidden");
}
function toggleMobileSearch() {
  const el = document.getElementById("mobile-search");
  el.classList.toggle("hidden");
}

async function loadTokenData(address) {
  const [meta, price, analytics, holders, holderChange, swaps] = await Promise.all([
    fetch(`https://solana-gateway.moralis.io/token/mainnet/${address}/metadata`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
    fetch(`https://solana-gateway.moralis.io/token/mainnet/${address}/price`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
    fetch(`https://deep-index.moralis.io/api/v2.2/tokens/${address}/analytics`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
    fetch(`https://solana-gateway.moralis.io/token/mainnet/${address}/top-holders`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
    fetch(`https://pro-api.solscan.io/v2.0/token/holders?tokenAddress=${address}`, {
      headers: { token: SOLSCAN_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
    fetch(`https://solana-gateway.moralis.io/token/mainnet/${address}/swaps`, {
      headers: { 'X-API-Key': MORALIS_API_KEY }
    }).then(r => r.json()).catch(() => ({})),
  ]);

  updateHeader(meta, price, analytics);
  updateChart(address);
  updateTopHolders(holders);
  updateHolderChange(holderChange);
  updateRecentSwaps(swaps);
  updateBuySellRatio(analytics);
}

function updateHeader(meta, price, analytics) {
  const header = document.querySelector('.token-header');
  const img = header.querySelector('img');
  if (meta.logo) img.src = meta.logo;

  const h2 = header.querySelector('h2');
  const priceSpan = h2.querySelector('.price');
  h2.firstChild.textContent = `${meta.symbol || ''} `;
  if (priceSpan) priceSpan.textContent = price.usdPrice ? `$${Number(price.usdPrice).toFixed(3)}` : '';

  const metas = header.querySelectorAll('.meta');
  if (metas[0]) metas[0].textContent = `Market Cap: ${formatCurrency(analytics.marketCapUsd)} · Liquidity: ${formatCurrency(analytics.liquidityUsd)}`;
  if (metas[1]) metas[1].textContent = `Supply: ${formatNumber(meta.supply)}`;
  if (metas[2]) metas[2].style.display = 'none';
}

function updateChart(address) {
  const container = document.querySelector('.chart');
  if (!container) return;
  container.innerHTML = '';
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@moralisweb3/charts/dist/widget.js';
  script.onload = () => {
    // eslint-disable-next-line no-undef
    new MoralisCharts.TokenPriceChart({ container, tokenAddress: address });
  };
  document.body.appendChild(script);
}

function updateTopHolders(data) {
  const div = document.querySelectorAll('.section-grid')[0].children[0];
  if (!div) return;
  const holders = (data.result || []).slice(0, 10);
  div.innerHTML = '<h4>Top Holders</h4><ul>' +
    holders.map(h => `<li>${shorten(h.address)} - ${Number(h.share).toFixed(2)}%</li>`).join('') +
    '</ul>';
}

function updateHolderChange(data) {
  const div = document.querySelectorAll('.section-grid')[0].children[1];
  if (!div) return;
  const change = data.change || 0;
  div.innerHTML = `<h4>Holder Change</h4><p>${change >= 0 ? '+' : ''}${change} in last hour</p>`;
}

function updateRecentSwaps(data) {
  const list = document.querySelectorAll('.section-grid')[1].children[0].querySelector('ul');
  if (!list) return;
  const swaps = (data.result || []).slice(0, 10);
  list.innerHTML = swaps.map(s => {
    const side = s.side?.toLowerCase() === 'buy' ? 'buy' : 'sell';
    return `<li class="${side}">${side === 'buy' ? 'Buy' : 'Sell'} - ${formatCurrency(s.quoteTokenPriceUsd)}</li>`;
  }).join('');
}

function updateBuySellRatio(data) {
  const div = document.querySelectorAll('.section-grid')[1].children[1];
  if (!div) return;
  const ratio = data.buySellRatio || { buy: 0, sell: 0 };
  const volume = data.volumeChange24h || 0;
  const wallets = (data.topActiveWallets || []).map(shorten).join(', ');
  div.innerHTML = `<h4>Buy/Sell Ratio</h4><p>${ratio.buy}% / ${ratio.sell}%</p>` +
    `<h4>Volume Change</h4><p>${volume}%</p>` +
    `<h4>Top Active Wallets</h4><p>${wallets}</p>`;
}

function formatCurrency(num) {
  num = Number(num || 0);
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'k';
  return '$' + num.toFixed(2);
}

function formatNumber(num) {
  num = Number(num || 0);
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return String(num);
}

function shorten(addr) {
  return addr ? addr.slice(0, 4) + '...' + addr.slice(-4) : '';
}

// Hide floating search components on non-result pages using classList
window.addEventListener('DOMContentLoaded', () => {
  const isVisible = !document.getElementById('results')?.classList.contains('hidden');
  if (!isVisible) {
    const ids = ['floating-search', 'mobile-search', 'floating-button', 'recent-searches'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
    });
    const infoBox = document.getElementById('project-info');
    if (infoBox) infoBox.style.display = 'none';
  }
});
