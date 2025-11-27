/**
 * Frontend Logic for Educational Platform
 * 
 * IMPORTANT: You must replace the API_URL below with your deployed Web App URL.
 */

// REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwcBwvrIdoF4oGWUfl6pg6LrwYOJPGPWbfSa9OzURAA8bYLy0qM7SH00MtPgt-Y4S_D/exec';

// State
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// Validation Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateName(name) {
    return name.trim().length >= 2;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    formGroup.classList.remove('success');

    let errorMsg = formGroup.querySelector('.error-message');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        formGroup.appendChild(errorMsg);
    }
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error');
    formGroup.classList.add('success');

    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.classList.remove('show');
    }
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="spinner"></div>';
}

function showMessage(message, type = 'info') {
    app.authMessage.textContent = message;
    app.authMessage.style.color = type === 'error' ? '#dc2626' : 'var(--primary)';
}

// DOM Elements
const app = {
    authContainer: document.getElementById('auth-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    contentGrid: document.getElementById('content-grid'),
    userGreeting: document.getElementById('user-greeting'),
    usernameDisplay: document.getElementById('username-display'),
    logoutBtn: document.getElementById('logout-btn'),
    authMessage: document.getElementById('auth-message'),
    videoModal: document.getElementById('video-modal'),
    videoPlayer: document.getElementById('video-player'),
    modalTitle: document.getElementById('modal-title'),
    lockMessage: document.getElementById('lock-message')
};

// Initialization
function init() {
    setupEventListeners();
    checkAuth();
}

function setupEventListeners() {
    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const tab = e.target.dataset.tab;
            if (tab === 'login') {
                app.loginForm.classList.remove('hidden');
                app.registerForm.classList.add('hidden');
            } else {
                app.loginForm.classList.add('hidden');
                app.registerForm.classList.remove('hidden');
            }
            app.authMessage.textContent = '';
        });
    });

    // Forms
    app.loginForm.addEventListener('submit', handleLogin);
    app.registerForm.addEventListener('submit', handleRegister);
    app.logoutBtn.addEventListener('click', handleLogout);

    // Modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        app.videoModal.classList.add('hidden');
        app.videoPlayer.src = ''; // Stop video
    });

    document.getElementById('refresh-btn').addEventListener('click', loadContent);

    // Navigation Menu
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;

            // Update Active State
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');

            // Show Page
            if (page === 'dashboard') {
                app.dashboardContainer.classList.remove('hidden');
                document.getElementById('about-container').classList.add('hidden');
            } else if (page === 'about') {
                app.dashboardContainer.classList.add('hidden');
                document.getElementById('about-container').classList.remove('hidden');
            }
        });
    });
}

function checkAuth() {
    if (currentUser && currentUser.token) {
        showDashboard();
    } else {
        showAuth();
    }
}

function showAuth() {
    app.authContainer.classList.remove('hidden');
    app.dashboardContainer.classList.add('hidden');
    document.getElementById('about-container').classList.add('hidden');

    app.userGreeting.classList.add('hidden');
    app.logoutBtn.classList.add('hidden');
    document.getElementById('main-nav').classList.add('hidden'); // Hide Nav
}

function showDashboard() {
    app.authContainer.classList.add('hidden');
    app.dashboardContainer.classList.remove('hidden');
    document.getElementById('about-container').classList.add('hidden');

    app.userGreeting.classList.remove('hidden');
    app.logoutBtn.classList.remove('hidden');
    document.getElementById('main-nav').classList.remove('hidden'); // Show Nav

    // Reset Nav Active State
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-page="dashboard"]').classList.add('active');

    app.usernameDisplay.textContent = currentUser.name;

    loadContent();
}

// API Calls
async function callApi(action, data = {}) {
    if (API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
        alert('請先設定 API_URL (請見 app.js)');
        return;
    }

    try {
        // Google Apps Script requires 'no-cors' or specific handling, 
        // but for 'text/plain' or simple JSON POST, we use standard fetch.
        // Note: GAS redirects, so we need to follow redirects.

        const payload = JSON.stringify({ action, ...data });

        const response = await fetch(API_URL, {
            method: 'POST',
            body: payload
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Validation
    let isValid = true;

    if (!validateEmail(email)) {
        showFieldError('login-email', '請輸入有效的 Email 地址');
        isValid = false;
    } else {
        clearFieldError('login-email');
    }

    if (!validatePassword(password)) {
        showFieldError('login-password', '密碼至少需要 6 個字元');
        isValid = false;
    } else {
        clearFieldError('login-password');
    }

    if (!isValid) return;

    showMessage('登入中...', 'info');

    try {
        const res = await callApi('login', { email, password });
        if (res.status === 'success') {
            currentUser = res.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMessage('登入成功！', 'success');
            setTimeout(() => showDashboard(), 500);
        } else {
            showMessage('登入失敗: ' + (res.message || '請檢查您的帳號密碼'), 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showMessage('連線錯誤，請稍後再試', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Validation
    let isValid = true;

    if (!validateName(name)) {
        showFieldError('reg-name', '姓名至少需要 2 個字元');
        isValid = false;
    } else {
        clearFieldError('reg-name');
    }

    if (!validateEmail(email)) {
        showFieldError('reg-email', '請輸入有效的 Email 地址');
        isValid = false;
    } else {
        clearFieldError('reg-email');
    }

    if (!validatePassword(password)) {
        showFieldError('reg-password', '密碼至少需要 6 個字元');
        isValid = false;
    } else {
        clearFieldError('reg-password');
    }

    if (!isValid) return;

    showMessage('註冊中...', 'info');

    try {
        const res = await callApi('register', { name, email, password });
        if (res.status === 'success') {
            showMessage('註冊成功！請登入', 'success');
            setTimeout(() => {
                document.querySelector('[data-tab="login"]').click();
                // Pre-fill email
                document.getElementById('login-email').value = email;
            }, 1000);
        } else {
            showMessage('註冊失敗: ' + (res.message || '請稍後再試'), 'error');
        }
    } catch (err) {
        console.error('Register error:', err);
        showMessage('連線錯誤，請稍後再試', 'error');
    }
}

// Google Login Logic (Called by the global handleGoogleCallback in index.html)
window.onGoogleLogin = async function (response) {
    console.log("Google Credential received");
    app.authMessage.textContent = 'Google 登入中...';

    try {
        const res = await callApi('googleLogin', { credential: response.credential });
        if (res.status === 'success') {
            currentUser = res.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showDashboard();
        } else {
            app.authMessage.textContent = 'Google 登入失敗: ' + res.message;
        }
    } catch (err) {
        app.authMessage.textContent = '連線錯誤';
        console.error(err);
    }
};

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    checkAuth();
}

async function loadContent() {
    if (!currentUser) return;

    showLoading('content-grid');

    try {
        const res = await callApi('getContent', { token: currentUser.token });

        if (res.status === 'success') {
            renderContent(res.data.content);
        } else {
            app.contentGrid.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text);">
                    <p style="font-size: 1.1rem; margin-bottom: 1rem;">😕 無法載入內容</p>
                    <p style="color: var(--text-light);">${res.message || '請稍後再試'}</p>
                    <button onclick="loadContent()" class="btn-secondary" style="margin-top: 1.5rem;">重試</button>
                </div>
            `;
            if (res.message === 'Session expired') {
                setTimeout(handleLogout, 2000);
            }
        }
    } catch (err) {
        console.error('Load content error:', err);
        app.contentGrid.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text);">
                <p style="font-size: 1.1rem; margin-bottom: 1rem;">❌ 載入失敗</p>
                <p style="color: var(--text-light);">請檢查網路連線</p>
                <button onclick="loadContent()" class="btn-secondary" style="margin-top: 1.5rem;">重試</button>
            </div>
        `;
    }
}

function renderContent(items) {
    app.contentGrid.innerHTML = '';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const statusClass = item.isUnlocked ? 'unlocked' : 'locked';
        const statusText = item.isUnlocked ? '已解鎖' : '需付費';

        card.innerHTML = `
            <div class="card-thumb" style="background-image: url('${item.thumbnail}')">
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <p>${item.type}</p>
            </div>
        `;

        card.addEventListener('click', () => openContent(item));
        app.contentGrid.appendChild(card);
    });
}

function openContent(item) {
    app.videoModal.classList.remove('hidden');
    app.modalTitle.textContent = item.title;

    if (item.isUnlocked) {
        app.lockMessage.classList.add('hidden');
        // Handle different providers if needed. Assuming iframe URL for now.
        app.videoPlayer.src = item.url;
    } else {
        app.lockMessage.classList.remove('hidden');
        app.videoPlayer.src = '';
    }
}

// Run
init();
