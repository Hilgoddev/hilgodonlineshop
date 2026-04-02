/* =============================================
   HILGOD — AUTH.JS
   localStorage-based authentication
   ============================================= */

const AUTH_KEY   = 'hilgod_user';
const USERS_KEY  = 'hilgod_users';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch { return null; }
}
function isLoggedIn() { return !!getCurrentUser(); }

function register(data) {
  const users = getUsers();
  if (users.find(u => u.email === data.email)) return { success: false, error: 'Email already registered.' };
  const user = { id: Date.now(), name: data.name, email: data.email, phone: data.phone || '', password: data.password, joined: new Date().toISOString() };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const { password, ...safeUser } = user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  return { success: true, user: safeUser };
}

function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, error: 'Invalid email or password.' };
  const { password: pw, ...safeUser } = user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  return { success: true, user: safeUser };
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

function updateHeaderAuth() {
  const user = getCurrentUser();
  const authLinks = document.querySelectorAll('.auth-links-wrap');
  const userDisplay = document.querySelectorAll('.user-display');
  const logoutBtns = document.querySelectorAll('.logout-btn');
  const accountBtns = document.querySelectorAll('.header-action-btn.account');

  if (user) {
    authLinks.forEach(el => el.style.display = 'none');
    userDisplay.forEach(el => {
      el.style.display = 'flex';
      const nameEl = el.querySelector('.user-greeting');
      if (nameEl) nameEl.textContent = user.name.split(' ')[0];
    });
    logoutBtns.forEach(btn => btn.style.display = 'block');
    accountBtns.forEach(btn => {
      const label = btn.querySelector('span');
      if (label) label.textContent = user.name.split(' ')[0];
    });
  } else {
    authLinks.forEach(el => el.style.display = 'flex');
    userDisplay.forEach(el => el.style.display = 'none');
    logoutBtns.forEach(btn => btn.style.display = 'none');
    accountBtns.forEach(btn => {
      const label = btn.querySelector('span');
      if (label) label.textContent = 'Account';
    });
  }
}

// ---- LOGIN FORM HANDLER ----
function handleLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const errEl = document.getElementById('login-error');
    const result = login(email, password);
    if (result.success) {
      showToast(`Welcome back, ${result.user.name.split(' ')[0]}! 👋`, 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } else {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
    }
  });
}

// ---- SIGNUP FORM HANDLER ----
function handleSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  const pwInput = form.querySelector('[name="password"]');
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const strength = calcPasswordStrength(pwInput.value);
      const bar = document.getElementById('pw-strength-bar');
      const label = document.getElementById('pw-strength-label');
      const colors = ['', '#dc2626','#f59e0b','#16a34a','#0369a1'];
      const labels = ['', 'Weak','Fair','Strong','Very Strong'];
      if (bar) { bar.style.width = (strength * 25) + '%'; bar.style.background = colors[strength]; }
      if (label) { label.textContent = labels[strength]; label.style.color = colors[strength]; }
    });
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value;
    const email = form.querySelector('[name="email"]').value;
    const phone = form.querySelector('[name="phone"]') ? form.querySelector('[name="phone"]').value : '';
    const password = form.querySelector('[name="password"]').value;
    const confirm = form.querySelector('[name="confirm"]').value;
    const errEl = document.getElementById('signup-error');
    if (password !== confirm) {
      if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
      return;
    }
    const result = register({ name, email, phone, password });
    if (result.success) {
      showToast(`Account created! Welcome, ${result.user.name.split(' ')[0]}! 🎉`, 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } else {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
    }
  });
}

function calcPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function togglePasswordVisibility(inputId) {
  const inp = document.getElementById(inputId);
  const icon = inp.nextElementSibling;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
  } else {
    inp.type = 'password';
    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  }
}
