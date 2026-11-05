export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.DEV ? 'http://127.0.0.1:8002' : '');

export function getToken() {
  return localStorage.getItem('discfinanci_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('discfinanci_token', token);
  } else {
    localStorage.removeItem('discfinanci_token');
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem('discfinanci_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('discfinanci_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('discfinanci_user');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    window.dispatchEvent(new CustomEvent('backend_offline', { detail: { url, error: err } }));
    throw new Error('Servidor backend offline (porta 8002). Certifique-se de que a janela do DiscFinanci está aberta.');
  }

  window.dispatchEvent(new CustomEvent('backend_online'));

  if (response.status === 401) {
    // Se o token for inválido ou expirado, limpa e dispara evento de logout
    setToken(null);
    setCurrentUser(null);
    window.dispatchEvent(new Event('auth_unauthorized'));
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg = `Erro ${response.status}: Falha na requisição.`;
    if (typeof data?.detail === 'string') {
      errorMsg = data.detail;
    } else if (Array.isArray(data?.detail)) {
      errorMsg = data.detail
        .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
        .join(' • ');
    } else if (data?.detail && typeof data?.detail === 'object') {
      errorMsg = data.detail.msg || JSON.stringify(data.detail);
    } else if (data?.message) {
      errorMsg = data.message;
    }
    throw new Error(errorMsg);
  }

  return data;
}

// ----------------- Auth API -----------------
export const authApi = {
  async register(name, email, password, initial_balance = 0) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        initial_balance: Number(initial_balance) || 0,
      }),
    });
    setToken(data.access_token);
    setCurrentUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    setCurrentUser(data.user);
    return data;
  },

  async getMe() {
    const user = await apiRequest('/api/auth/me');
    setCurrentUser(user);
    return user;
  },

  async updateBalance(balance, mode = 'available') {
    const num = Number(balance) || 0;
    const user = await apiRequest('/api/auth/balance', {
      method: 'PUT',
      body: JSON.stringify({
        balance: num,
        initial_balance: num,
        mode,
      }),
    });
    setCurrentUser(user);
    return user;
  },

  async updateInitialBalance(initial_balance) {
    return this.updateBalance(initial_balance, 'available');
  },

  async getDiscordToken() {
    return await apiRequest('/api/auth/discord-token', { method: 'POST' });
  },

  async unlinkDiscord() {
    return await apiRequest('/api/auth/unlink-discord', { method: 'POST' });
  },

  logout() {
    setToken(null);
    setCurrentUser(null);
    window.location.reload();
  },
};

// ----------------- Categories API -----------------
export const categoriesApi = {
  async list() {
    return await apiRequest('/api/categories');
  },
  async create(data) {
    return await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
  },
};

// ----------------- Transactions API -----------------
export const transactionsApi = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/transactions${query}`);
  },

  async create(data) {
    return await apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async quickParse(text, autoSave = false) {
    return await apiRequest('/api/transactions/quick-parse', {
      method: 'POST',
      body: JSON.stringify({ text, auto_save: autoSave }),
    });
  },

  async update(id, data) {
    return await apiRequest(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return await apiRequest(`/api/transactions/${id}`, { method: 'DELETE' });
  },
};

// ----------------- Recurring Expenses API -----------------
export const recurringApi = {
  async list(month, year) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const qs = params.toString();
    return await apiRequest(`/api/recurring${qs ? `?${qs}` : ''}`);
  },

  async pay(id, { month, year, date } = {}) {
    return await apiRequest(`/api/recurring/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ month, year, date }),
    });
  },

  async unpay(id, { month, year } = {}) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const qs = params.toString();
    return await apiRequest(`/api/recurring/${id}/unpay${qs ? `?${qs}` : ''}`, {
      method: 'POST',
    });
  },

  async create(data) {
    return await apiRequest('/api/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return await apiRequest(`/api/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggle(id) {
    return await apiRequest(`/api/recurring/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  async delete(id) {
    return await apiRequest(`/api/recurring/${id}`, { method: 'DELETE' });
  },
};

// ----------------- Savings / Economias API -----------------
export const savingsApi = {
  async list() {
    return await apiRequest('/api/savings');
  },

  async create(data) {
    return await apiRequest('/api/savings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return await apiRequest(`/api/savings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deposit(id, amount) {
    return await apiRequest(`/api/savings/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });
  },

  async withdraw(id, amount) {
    return await apiRequest(`/api/savings/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });
  },

  async delete(id) {
    return await apiRequest(`/api/savings/${id}`, { method: 'DELETE' });
  },
};

// ----------------- Analytics API -----------------
export const analyticsApi = {
  async getSummary(month, year) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    return await apiRequest(`/api/analytics/summary?${params.toString()}`);
  },
};

// Utilitário para formatar moeda brasileira
export function formatBRL(value) {
  if (value === undefined || value === null) return 'R$ 0,00';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Utilitário robusto para ler valores digitados em reais (suporta 1.500,00, 1500,50, 1500, 1.500, etc.)
export function parseBRLInput(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).replace(/[R$\s]/g, '').trim();
  
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Padrão brasileiro: 1.500,50 -> remove os pontos e troca vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: 1,500.50 -> remove vírgulas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula: 1500,50 -> 1500.50
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos (ex: 1.000.000) -> todos são separadores de milhar
      str = str.replace(/\./g, '');
    } else if (parts[1].length === 3) {
      // Ex: 1.500 ou 10.000 -> separador de milhar brasileiro
      str = str.replace('.', '');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

