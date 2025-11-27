/**
 * Admin Panel Logic for EduPlatform
 * Manages users, content, and permissions
 */

// REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwcBwvrIdoF4oGWUfl6pg6LrwYOJPGPWbfSa9OzURAA8bYLy0qM7SH00MtPgt-Y4S_D/exec';

// State
let adminToken = localStorage.getItem('adminToken') || null;
let adminUser = JSON.parse(localStorage.getItem('adminUser')) || null;
let allUsers = [];
let allContent = [];
let selectedUser = null;

// DOM Elements
const elements = {
    // Pages
    loginPage: document.getElementById('login-page'),
    dashboardPage: document.getElementById('dashboard-page'),

    // Login
    loginForm: document.getElementById('admin-login-form'),
    loginMessage: document.getElementById('login-message'),

    // Navbar
    adminName: document.getElementById('admin-name'),
    logoutBtn: document.getElementById('admin-logout-btn'),

    // Tables
    usersTableBody: document.getElementById('users-table-body'),
    contentTableBody: document.getElementById('content-table-body'),

    // Stats
    totalUsers: document.getElementById('total-users'),
    paidUsers: document.getElementById('paid-users'),
    activeUsers: document.getElementById('active-users'),

    // Permission Editor
    permissionEditor: document.getElementById('permission-editor'),
    permissionPlaceholder: document.getElementById('permission-placeholder'),
    selectedUserEmail: document.getElementById('selected-user-email'),
    selectedUserName: document.getElementById('selected-user-name'),
    selectedUserPaid: document.getElementById('selected-user-paid'),
    permissionContentList: document.getElementById('permission-content-list'),

    // Modals
    userModal: document.getElementById('user-modal'),
};

// Initialize
function init() {
    setupEventListeners();
    checkAuth();
}

function setupEventListeners() {
    // Login
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', searchUsers);
    document.getElementById('user-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUsers();
    });

    // Permission Editor
    document.getElementById('close-editor').addEventListener('click', closePermissionEditor);
    document.getElementById('select-all-btn').addEventListener('click', selectAllPermissions);
    document.getElementById('deselect-all-btn').addEventListener('click', deselectAllPermissions);
    document.getElementById('save-permissions-btn').addEventListener('click', savePermissions);

    // Modal
    document.getElementById('close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('toggle-paid-status').addEventListener('click', togglePaidStatus);
    document.getElementById('toggle-active-status').addEventListener('click', toggleActiveStatus);
    document.getElementById('manage-permissions').addEventListener('click', () => {
        if (selectedUser) {
            closeUserModal();
            editPermissions(selectedUser.user_id);
        }
    });
}

function checkAuth() {
    if (adminToken && adminUser) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    elements.loginPage.classList.remove('hidden');
    elements.dashboardPage.classList.add('hidden');
}

function showDashboard() {
    elements.loginPage.classList.add('hidden');
    elements.dashboardPage.classList.remove('hidden');
    elements.adminName.textContent = adminUser.name || 'Admin';

    // Load initial data
    loadUsers();
    loadContent();
    loadStats();
}

// API Calls
async function callApi(action, data = {}) {
    try {
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

// Login Handler
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    showMessage('登入中...', 'info');

    try {
        const res = await callApi('adminLogin', { email, password });

        if (res.status === 'success') {
            adminToken = res.data.token;
            adminUser = res.data;

            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminUser', JSON.stringify(adminUser));

            showMessage('登入成功！', 'success');
            setTimeout(() => showDashboard(), 500);
        } else {
            showMessage('登入失敗: ' + res.message, 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showMessage('連線錯誤，請稍後再試', 'error');
    }
}

function handleLogout() {
    adminToken = null;
    adminUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showLogin();
}

function showMessage(message, type = 'info') {
    elements.loginMessage.textContent = message;
    elements.loginMessage.className = `message ${type}`;
}

// View Switching
function switchView(viewName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Load data for specific views
    if (viewName === 'users') {
        loadUsers();
    } else if (viewName === 'content') {
        loadContent();
    } else if (viewName === 'stats') {
        loadStats();
    }
}

// Load Users
async function loadUsers() {
    elements.usersTableBody.innerHTML = '<tr><td colspan="7" class="loading">載入中...</td></tr>';

    try {
        const res = await callApi('getAllUsers', { token: adminToken });

        if (res.status === 'success') {
            allUsers = res.data.users;
            renderUsers(allUsers);
            updateUserStats();
        } else {
            elements.usersTableBody.innerHTML = `<tr><td colspan="7" class="loading">載入失敗: ${res.message}</td></tr>`;
        }
    } catch (err) {
        console.error('Load users error:', err);
        elements.usersTableBody.innerHTML = '<tr><td colspan="7" class="loading">載入失敗</td></tr>';
    }
}

function renderUsers(users) {
    if (users.length === 0) {
        elements.usersTableBody.innerHTML = '<tr><td colspan="7" class="loading">沒有用戶資料</td></tr>';
        return;
    }

    elements.usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.email}</td>
            <td>${user.name}</td>
            <td><span class="badge info">${user.auth_provider}</span></td>
            <td><span class="badge ${user.is_paid ? 'success' : 'warning'}">${user.is_paid ? '付費' : '免費'}</span></td>
            <td><span class="badge ${user.is_active ? 'success' : 'danger'}">${user.is_active ? '啟用' : '停用'}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString('zh-TW')}</td>
            <td>
                <button class="action-btn primary" onclick="viewUser('${user.user_id}')">查看</button>
                <button class="action-btn secondary" onclick="editPermissions('${user.user_id}')">權限</button>
                <button class="action-btn secondary" style="background: #ef4444; color: white;" onclick="deleteUser('${user.user_id}')">刪除</button>
            </td>
        </tr>
    `).join('');
}

function updateUserStats() {
    const total = allUsers.length;
    const paid = allUsers.filter(u => u.is_paid).length;
    const active = allUsers.filter(u => u.is_active).length;

    elements.totalUsers.textContent = total;
    elements.paidUsers.textContent = paid;
    elements.activeUsers.textContent = active;
}

function searchUsers() {
    const query = document.getElementById('user-search').value.toLowerCase();

    if (!query) {
        renderUsers(allUsers);
        return;
    }

    const filtered = allUsers.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
    );

    renderUsers(filtered);
}

// Load Content
async function loadContent() {
    elements.contentTableBody.innerHTML = '<tr><td colspan="6" class="loading">載入中...</td></tr>';

    try {
        const res = await callApi('getAllContent', { token: adminToken });

        if (res.status === 'success') {
            allContent = res.data.content;
            renderContent(allContent);
        } else {
            elements.contentTableBody.innerHTML = `<tr><td colspan="6" class="loading">載入失敗: ${res.message}</td></tr>`;
        }
    } catch (err) {
        console.error('Load content error:', err);
        elements.contentTableBody.innerHTML = '<tr><td colspan="6" class="loading">載入失敗</td></tr>';
    }
}

function renderContent(content) {
    if (content.length === 0) {
        elements.contentTableBody.innerHTML = '<tr><td colspan="6" class="loading">沒有內容資料</td></tr>';
        return;
    }

    elements.contentTableBody.innerHTML = content.map(item => {
        let typeBadge = '';
        if (item.content_type === 'free') {
            typeBadge = '<span class="badge success">免費</span>';
        } else if (item.content_type === 'paid') {
            typeBadge = '<span class="badge info">常態付費</span>';
        } else if (item.content_type === 'vip') {
            typeBadge = '<span class="badge warning">VIP</span>';
        }

        return `
            <tr>
                <td>${item.content_id}</td>
                <td>${item.title}</td>
                <td>${typeBadge}</td>
                <td>${item.access_count || 0} / ${allUsers.length}</td>
                <td>
                    <button class="action-btn primary" onclick="editContent('${item.content_id}')">編輯</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Permission Management
async function editPermissions(userId) {
    selectedUser = allUsers.find(u => u.user_id === userId);
    if (!selectedUser) return;

    // Switch to permissions view
    switchView('permissions');

    // Show editor
    elements.permissionPlaceholder.classList.add('hidden');
    elements.permissionEditor.classList.remove('hidden');

    // Update user info
    elements.selectedUserEmail.textContent = selectedUser.email;
    elements.selectedUserName.textContent = selectedUser.name;
    elements.selectedUserPaid.textContent = selectedUser.is_paid ? '付費用戶' : '免費用戶';

    // Load user permissions
    await loadUserPermissions(userId);
}

async function loadUserPermissions(userId) {
    elements.permissionContentList.innerHTML = '<p class="loading">載入中...</p>';

    try {
        const res = await callApi('getUserPermissions', {
            token: adminToken,
            userId: userId
        });

        if (res.status === 'success') {
            renderPermissionList(res.data.permissions);
        } else {
            elements.permissionContentList.innerHTML = `<p class="loading">載入失敗: ${res.message}</p>`;
        }
    } catch (err) {
        console.error('Load permissions error:', err);
        elements.permissionContentList.innerHTML = '<p class="loading">載入失敗</p>';
    }
}

function renderPermissionList(permissions) {
    elements.permissionContentList.innerHTML = permissions.map(perm => {
        let typeBadge = '';
        if (perm.content_type === 'free') {
            typeBadge = '<span class="badge success">免費</span>';
        } else if (perm.content_type === 'paid') {
            typeBadge = '<span class="badge info">常態付費</span>';
        } else if (perm.content_type === 'vip') {
            typeBadge = '<span class="badge warning">VIP</span>';
        }

        return `
            <div class="content-item">
                <div class="content-item-header">
                    <input type="checkbox" 
                           id="perm-${perm.content_id}" 
                           data-content-id="${perm.content_id}"
                           ${perm.has_access ? 'checked' : ''}>
                    <label for="perm-${perm.content_id}">
                        ${perm.title}
                        ${typeBadge}
                    </label>
                </div>
                <div class="content-item-controls">
                    <div class="content-item-type">
                        <label for="type-${perm.content_id}">影片類型：</label>
                        <select id="type-${perm.content_id}" 
                                class="type-select"
                                data-content-id="${perm.content_id}"
                                data-original-type="${perm.content_type}">
                            <option value="free" ${perm.content_type === 'free' ? 'selected' : ''}>免費</option>
                            <option value="paid" ${perm.content_type === 'paid' ? 'selected' : ''}>常態付費</option>
                            <option value="vip" ${perm.content_type === 'vip' ? 'selected' : ''}>VIP</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function closePermissionEditor() {
    elements.permissionEditor.classList.add('hidden');
    elements.permissionPlaceholder.classList.remove('hidden');
    selectedUser = null;
}

function selectAllPermissions() {
    document.querySelectorAll('#permission-content-list input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
}

function deselectAllPermissions() {
    document.querySelectorAll('#permission-content-list input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

async function savePermissions() {
    if (!selectedUser) return;

    const checkboxes = document.querySelectorAll('#permission-content-list input[type="checkbox"]');
    const permissions = Array.from(checkboxes).map(cb => ({
        content_id: cb.dataset.contentId,
        has_access: cb.checked
    }));

    try {
        const res = await callApi('updateUserPermissions', {
            token: adminToken,
            userId: selectedUser.user_id,
            permissions: permissions
        });

        if (res.status === 'success') {
            alert('權限更新成功！');
        } else {
            alert('權限更新失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Save permissions error:', err);
        alert('權限更新失敗');
    }
}

// Save Content Types - NEW FUNCTION
async function saveContentTypes() {
    if (!selectedUser) return;

    const typeSelects = document.querySelectorAll('.type-select');
    const contentTypes = [];
    let hasChanges = false;

    typeSelects.forEach(select => {
        const contentId = select.dataset.contentId;
        const newType = select.value;
        const originalType = select.dataset.originalType;

        if (newType !== originalType) {
            hasChanges = true;
        }

        contentTypes.push({
            content_id: contentId,
            content_type: newType
        });
    });

    if (!hasChanges) {
        alert('沒有變更需要儲存');
        return;
    }

    if (!confirm('確定要更新影片類型嗎？這將影響所有用戶對這些影片的存取權限。')) {
        return;
    }

    try {
        const res = await callApi('updateContentTypes', {
            token: adminToken,
            contentTypes: contentTypes
        });

        if (res.status === 'success') {
            alert('影片類型更新成功！');
            // 重新載入內容列表
            await loadContent();
            // 重新載入權限列表
            await loadUserPermissions(selectedUser.user_id);
        } else {
            alert('更新失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Save content types error:', err);
        alert('更新失敗');
    }
}

// User Details Modal
function viewUser(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) return;

    selectedUser = user;

    const modalBody = document.getElementById('user-modal-body');
    modalBody.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>姓名:</strong> ${user.name}</p>
            <p><strong>用戶 ID:</strong> ${user.user_id}</p>
            <p><strong>註冊方式:</strong> ${user.auth_provider}</p>
            <p><strong>付費狀態:</strong> <span class="badge ${user.is_paid ? 'success' : 'warning'}">${user.is_paid ? '付費' : '免費'}</span></p>
            <p><strong>帳號狀態:</strong> <span class="badge ${user.is_active ? 'success' : 'danger'}">${user.is_active ? '啟用' : '停用'}</span></p>
            <p><strong>註冊日期:</strong> ${new Date(user.created_at).toLocaleString('zh-TW')}</p>
        </div>
    `;

    elements.userModal.classList.remove('hidden');
}

function closeUserModal() {
    elements.userModal.classList.add('hidden');
    selectedUser = null;
}

// Toggle User Status Functions
async function togglePaidStatus() {
    if (!selectedUser) return;

    const newStatus = !selectedUser.is_paid;
    const confirmMsg = `確定要將 ${selectedUser.email} 的付費狀態改為「${newStatus ? '付費' : '免費'}」嗎？`;

    if (!confirm(confirmMsg)) return;

    try {
        const res = await callApi('updateUserStatus', {
            token: adminToken,
            userId: selectedUser.user_id,
            field: 'is_paid',
            value: newStatus
        });

        if (res.status === 'success') {
            alert('付費狀態更新成功！');
            closeUserModal();
            loadUsers();
        } else {
            alert('更新失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Toggle paid status error:', err);
        alert('更新失敗');
    }
}

async function toggleActiveStatus() {
    if (!selectedUser) return;

    const newStatus = !selectedUser.is_active;
    const confirmMsg = `確定要將 ${selectedUser.email} 的帳號狀態改為「${newStatus ? '啟用' : '停用'}」嗎？`;

    if (!confirm(confirmMsg)) return;

    try {
        const res = await callApi('updateUserStatus', {
            token: adminToken,
            userId: selectedUser.user_id,
            field: 'is_active',
            value: newStatus
        });

        if (res.status === 'success') {
            alert('帳號狀態更新成功！');
            closeUserModal();
            loadUsers();
        } else {
            alert('更新失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Toggle active status error:', err);
        alert('更新失敗');
    }
}

async function deleteUser(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) return;

    const confirmMsg = `確定要刪除用戶 ${user.email} (${user.name}) 嗎？\n\n此操作無法復原！`;

    if (!confirm(confirmMsg)) return;

    try {
        const res = await callApi('deleteUser', {
            token: adminToken,
            userId: userId
        });

        if (res.status === 'success') {
            alert('用戶刪除成功！');
            loadUsers();
        } else {
            alert('刪除失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Delete user error:', err);
        alert('刪除失敗');
    }
}

// Stats
async function loadStats() {
    try {
        const res = await callApi('getStats', { token: adminToken });

        if (res.status === 'success') {
            const stats = res.data;

            document.getElementById('stats-total-users').textContent = stats.totalUsers;
            document.getElementById('stats-paid-users').textContent = stats.paidUsers;
            document.getElementById('stats-free-users').textContent = stats.freeUsers;
            document.getElementById('stats-total-content').textContent = stats.totalContent;
            document.getElementById('stats-free-content').textContent = stats.freeContent;
            document.getElementById('stats-paid-content').textContent = stats.paidContent;
        }
    } catch (err) {
        console.error('Load stats error:', err);
    }
}

// Make functions global for onclick handlers
window.viewUser = viewUser;
window.editPermissions = editPermissions;
window.deleteUser = deleteUser;
window.saveContentTypes = saveContentTypes;
window.editContent = function (contentId) {
    alert('編輯內容功能開發中...');
};

// Initialize
init();
