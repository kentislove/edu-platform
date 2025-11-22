/**
 * Frontend Logic for Educational Platform
 * 
 * IMPORTANT: You must replace the API_URL below with your deployed Web App URL.
 */

// REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyQhsZ8LHNh0lAMmig8_IavNcaogLkYOwGqqDFdAlH_3LVbYMafMJyAs-g22xjrsBIE/exec';

// State
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

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

    app.authMessage.textContent = '登入中...';

    try {
        const res = await callApi('login', { email, password });
        if (res.status === 'success') {
            currentUser = res.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showDashboard();
        } else {
            app.authMessage.textContent = '登入失敗: ' + res.message;
        }
    } catch (err) {
        app.authMessage.textContent = '連線錯誤';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    app.authMessage.textContent = '註冊中...';

    try {
        const res = await callApi('register', { name, email, password });
        if (res.status === 'success') {
            alert('註冊成功！請登入。');
            // Switch to login tab
            document.querySelector('[data-tab="login"]').click();
        } else {
            app.authMessage.textContent = '註冊失敗: ' + res.message;
        }
    } catch (err) {
        app.authMessage.textContent = '連線錯誤';
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

    app.contentGrid.innerHTML = '<p>載入中...</p>';

    try {
        const res = await callApi('getContent', { token: currentUser.token });

        if (res.status === 'success') {
            renderContent(res.data.content);
        } else {
            app.contentGrid.innerHTML = '<p>無法載入內容: ' + res.message + '</p>';
            if (res.message === 'Session expired') handleLogout();
        }
    } catch (err) {
        app.contentGrid.innerHTML = '<p>載入失敗</p>';
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
