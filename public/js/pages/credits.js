// ═══ Credits Page ═══
import { api, currentUser } from '../api.js';
import { toast } from '../utils.js';
import { closeModal } from '../auth.js';

// 積分類型中文對照
const TYPE_LABELS = {
  deduction: '扣款',
  purchase: '充值',
  bonus: '獎勵',
  refund: '退款',
  signup_bonus: '註冊贈送',
  subscription: '訂閱',
};

const TYPE_ICONS = {
  deduction: '📉',
  purchase: '💳',
  bonus: '🎁',
  refund: '🔄',
  signup_bonus: '🎉',
  subscription: '📦',
};

let currentPage = 1;

// 更新導覽列積分顯示
export async function updateNavCredits() {
  if (!currentUser) {
    const el = document.getElementById('nav-credits');
    if (el) el.style.display = 'none';
    return;
  }
  try {
    const d = await api('/credits/balance');
    const el = document.getElementById('nav-credits');
    const amt = document.getElementById('credits-amount');
    if (el) el.style.display = 'flex';
    if (amt) amt.textContent = d.credits;
  } catch {
    // 靜默失敗
  }
}

// 載入積分管理頁面
export async function refreshCredits() {
  if (!currentUser) {
    document.getElementById('credits-empty').style.display = '';
    document.getElementById('credits-empty').querySelector('p').textContent = '請先登入以查看積分';
    return;
  }
  await Promise.all([
    loadBalance(),
    loadStats(),
    loadTransactions(1),
  ]);
}

async function loadBalance() {
  try {
    const d = await api('/credits/balance');
    document.getElementById('credits-balance').textContent = d.credits.toLocaleString();
    document.getElementById('credits-amount').textContent = d.credits;
  } catch (err) {
    console.error('載入積分餘額失敗:', err);
  }
}

async function loadStats() {
  try {
    const d = await api('/credits/stats');
    document.getElementById('credits-monthly-spent').textContent = d.monthlySpent.toLocaleString();
    document.getElementById('credits-monthly-added').textContent = d.monthlyAdded.toLocaleString();
  } catch (err) {
    console.error('載入統計失敗:', err);
  }
}

export async function loadTransactions(page = 1) {
  currentPage = page;
  const type = document.getElementById('tx-filter-type')?.value || '';
  const params = new URLSearchParams({ page, limit: 15 });
  if (type) params.set('type', type);

  try {
    const d = await api(`/credits/transactions?${params}`);
    const list = document.getElementById('transactions-list');
    const empty = document.getElementById('credits-empty');
    const pagination = document.getElementById('transactions-pagination');

    if (!d.transactions || d.transactions.length === 0) {
      list.innerHTML = '';
      empty.style.display = '';
      pagination.innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = d.transactions.map(tx => `
      <div class="tx-item">
        <div class="tx-icon">${TYPE_ICONS[tx.type] || '📝'}</div>
        <div class="tx-info">
          <div class="tx-desc">${tx.description || TYPE_LABELS[tx.type] || tx.type}</div>
          <div class="tx-time">${new Date(tx.created_at).toLocaleString('zh-TW')}</div>
        </div>
        <div class="tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
          ${tx.amount >= 0 ? '+' : ''}${tx.amount}
        </div>
        <div class="tx-balance">餘額 ${tx.balance_after.toLocaleString()}</div>
      </div>
    `).join('');

    // 分頁按鈕
    let pagHtml = '';
    if (d.pagination.totalPages > 1) {
      if (d.pagination.page > 1) {
        pagHtml += `<button class="btn btn-ghost btn-sm" data-tx-page="${d.pagination.page - 1}">‹ 上一頁</button>`;
      }
      pagHtml += `<span style="padding:.3rem .6rem;font-size:.8rem;color:var(--text-dim)">${d.pagination.page} / ${d.pagination.totalPages}</span>`;
      if (d.pagination.page < d.pagination.totalPages) {
        pagHtml += `<button class="btn btn-ghost btn-sm" data-tx-page="${d.pagination.page + 1}">下一頁 ›</button>`;
      }
    }
    pagination.innerHTML = pagHtml;
  } catch (err) {
    console.error('載入交易紀錄失敗:', err);
  }
}

// 顯示充值彈窗
export function showRechargeModal() {
  document.getElementById('recharge-modal')?.classList.add('active');
}

// 執行充值
export async function doRecharge() {
  // 從快捷按鈕或輸入框取得金額
  const selected = document.querySelector('.recharge-option.selected');
  const amountInput = document.getElementById('recharge-amount');
  const amount = selected ? parseInt(selected.dataset.amount) : parseInt(amountInput?.value);

  if (!amount || amount <= 0) {
    toast('請選擇或輸入充值金額', 'error');
    return;
  }
  if (amount > 100000) {
    toast('單次充值上限 100,000 積分', 'error');
    return;
  }

  try {
    const d = await api('/credits/recharge', {
      method: 'POST',
      body: { amount, description: `充值 ${amount} 積分` },
    });
    toast(`✅ ${d.message}`);
    closeModal();
    document.getElementById('recharge-amount').value = '';
    document.querySelectorAll('.recharge-option').forEach(o => o.classList.remove('selected'));
    await refreshCredits();
  } catch (err) {
    toast('充值失敗：' + err.message, 'error');
  }
}

// 初始化充值選項點擊
document.addEventListener('click', (e) => {
  const opt = e.target.closest('.recharge-option');
  if (opt) {
    document.querySelectorAll('.recharge-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    document.getElementById('recharge-amount').value = opt.dataset.amount;
  }

  // 分頁按鈕
  const pageBtn = e.target.closest('[data-tx-page]');
  if (pageBtn) {
    loadTransactions(parseInt(pageBtn.dataset.txPage));
  }
});

// 篩選器變更
document.addEventListener('change', (e) => {
  if (e.target.id === 'tx-filter-type') {
    loadTransactions(1);
  }
});
