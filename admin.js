// ============================================
// CONFIGURATION
// ============================================

// API Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbwcBwvrIdoF4oGWUfl6pg6LrwYOJPGPWbfSa9OzURAA8bYLy0qM7SH00MtPgt-Y4S_D/exec';

// Global State
let adminToken = null;
let allUsers = [];
let allContent = [];
let selectedUser = null;
let selectedPermissionUserId = null;
let editingContentId = null;

// DOM Elements
const elements = {
    loginPage: document.getElementById('login-page'),
    dashboardPage: document.getElementById('dashboard-page'),
    adminLoginForm: document.getElementById('admin-login-form'),
    loginMessage: document.getElementById('login-message'),
    adminName: document.getElementById('admin-name'),
    logoutBtn: document.getElementById('admin-logout-btn'),

    // Views
    usersView: document.getElementById('users-view'),
    contentView: document.getElementById('content-view'),
    permissionsView: document.getElementById('permissions-view'),
    statsView: document.getElementById('stats-view'),

    // Tables
    usersTableBody: document.getElementById('users-table-body'),
    contentTableBody: document.getElementById('content-table-body'),

    // Modals
    userModal: document.getElementById('user-modal'),
    userModalBody: document.getElementById('user-modal-body'),

    // Permission Editor
    permissionEditor: document.getElementById('permission-editor'),
    permissionPlaceholder: document.getElementById('permission-placeholder'),
    permissionContentList: document.getElementById('permission-content-list'),
    selectedUserEmail: document.getElementById('selected-user-email'),
    selectedUserName: document.getElementById('selected-user-name'),
    selectedUserPaid: document.getElementById('selected-user-paid')
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAdminSession();
});

function setupEventListeners() {
    // Login
    elements.adminLoginForm.addEventListener('submit', handleAdminLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });

    // User Search
    document.getElementById('search-btn').addEventListener('click', searchUsers);
    document.getElementById('user-search').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchUsers();
    });

    // Permission Search
    document.getElementById('permission-search-btn').addEventListener('click', searchPermissionUsers);
    document.getElementById('permission-search').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchPermissionUsers();
    });

    // Permission Editor
    document.getElementById('close-editor').addEventListener('click', closePermissionEditor);
    document.getElementById('select-all-btn').addEventListener('click', selectAllPermissions);
    document.getElementById('deselect-all-btn').addEventListener('click', deselectAllPermissions);
    document.getElementById('save-permissions-btn').addEventListener('click', savePermissions);

    // User Modal
    document.getElementById('close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('toggle-paid-status').addEventListener('click', togglePaidStatus);
    document.getElementById('toggle-active-status').addEventListener('click', toggleActiveStatus);
    document.getElementById('manage-permissions').addEventListener('click', () => {
        closeUserModal();
        editPermissions(selectedUser.user_id);
    });
}

// ============================================
// API CALLS
// ============================================

async function callApi(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleAdminLogin(e) {
    e.preventDefault();

    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        const res = await callApi('adminLogin', { email, password });

        if (res.status === 'success') {
            adminToken = res.data.token;
            elements.adminName.textContent = res.data.name;
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminName', res.data.name);

            showDashboard();
            loadUsers();
            loadContent();
        } else {
            elements.loginMessage.textContent = res.message;
            elements.loginMessage.className = 'message error';
        }
    } catch (err) {
        elements.loginMessage.textContent = '登入失敗，請稍後再試';
        elements.loginMessage.className = 'message error';
    }
}

function handleLogout() {
    adminToken = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');

    elements.loginPage.classList.remove('hidden');
    elements.dashboardPage.classList.add('hidden');
    elements.adminLoginForm.reset();
    elements.loginMessage.textContent = '';
}

function checkAdminSession() {
    const token = localStorage.getItem('adminToken');
    const name = localStorage.getItem('adminName');

    if (token && name) {
        adminToken = token;
        elements.adminName.textContent = name;
        showDashboard();
        loadUsers();
        loadContent();
    }
}

function showDashboard() {
    elements.loginPage.classList.add('hidden');
    elements.dashboardPage.classList.remove('hidden');
}

// ============================================
// NAVIGATION
// ============================================

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    // Show selected view
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Set active nav link
    const navLink = document.querySelector(`[data-view="${viewName}"]`);
    if (navLink) {
        navLink.classList.add('active');
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

// ============================================
// USER MANAGEMENT
// ============================================

async function loadUsers() {
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
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn primary" onclick="viewUser('${user.user_id}')">查看</button>
                <button class="action-btn secondary" onclick="editPermissions('${user.user_id}')">權限</button>
                <button class="action-btn danger" onclick="deleteUser('${user.user_id}')">刪除</button>
            </td>
        </tr>
    `).join('');
}

function updateUserStats() {
    const totalUsers = allUsers.length;
    const paidUsers = allUsers.filter(u => u.is_paid).length;
    const activeUsers = allUsers.filter(u => u.is_active).length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('paid-users').textContent = paidUsers;
    document.getElementById('active-users').textContent = activeUsers;
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

function viewUser(userId) {
    selectedUser = allUsers.find(u => u.user_id === userId);
    if (!selectedUser) return;

    elements.userModalBody.innerHTML = `
        <p><strong>Email:</strong> ${selectedUser.email}</p>
        <p><strong>姓名:</strong> ${selectedUser.name}</p>
        <p><strong>註冊方式:</strong> ${selectedUser.auth_provider}</p>
        <p><strong>付費狀態:</strong> ${selectedUser.is_paid ? '付費' : '免費'}</p>
        <p><strong>帳號狀態:</strong> ${selectedUser.is_active ? '啟用' : '停用'}</p>
        <p><strong>註冊日期:</strong> ${new Date(selectedUser.created_at).toLocaleString()}</p>
    `;

    elements.userModal.classList.remove('hidden');
}

function closeUserModal() {
    elements.userModal.classList.add('hidden');
    selectedUser = null;
}

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

// ============================================
// CONTENT MANAGEMENT
// ============================================

async function loadContent() {
    try {
        const res = await callApi('getAllContent', { token: adminToken });

        if (res.status === 'success') {
            allContent = res.data.content;
            renderContent(allContent);
        } else {
            elements.contentTableBody.innerHTML = `<tr><td colspan="5" class="loading">載入失敗: ${res.message}</td></tr>`;
        }
    } catch (err) {
        console.error('Load content error:', err);
        elements.contentTableBody.innerHTML = '<tr><td colspan="5" class="loading">載入失敗</td></tr>';
    }
}

function renderContent(content) {
    if (content.length === 0) {
        elements.contentTableBody.innerHTML = '<tr><td colspan="5" class="loading">沒有內容資料</td></tr>';
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
                    <button class="action-btn danger" onclick="deleteContent('${item.content_id}')">刪除</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddContentModal() {
    editingContentId = null;
    document.getElementById('content-modal-title').textContent = '新增影片';
    document.getElementById('content-title').value = '';
    document.getElementById('content-url').value = '';
    document.getElementById('content-type').value = 'paid';
    document.getElementById('content-description').value = '';
    document.getElementById('content-modal').classList.remove('hidden');
}

async function editContent(contentId) {
    const content = allContent.find(c => c.content_id.toString() === contentId.toString());
    if (!content) return;

    editingContentId = contentId;
    document.getElementById('content-modal-title').textContent = '編輯影片';
    document.getElementById('content-title').value = content.title;
    document.getElementById('content-url').value = content.url;
    document.getElementById('content-type').value = content.content_type || 'paid';
    document.getElementById('content-description').value = content.description || '';
    document.getElementById('content-modal').classList.remove('hidden');
}

function closeContentModal() {
    document.getElementById('content-modal').classList.add('hidden');
    editingContentId = null;
}

async function saveContent() {
    const title = document.getElementById('content-title').value.trim();
    const url = document.getElementById('content-url').value.trim();
    const contentType = document.getElementById('content-type').value;
    const description = document.getElementById('content-description').value.trim();

    if (!title || !url) {
        alert('請填寫標題和 YouTube 連結');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        alert('請輸入有效的 YouTube 連結');
        return;
    }

    try {
        const action = editingContentId ? 'updateContent' : 'addContent';
        const data = {
            token: adminToken,
            title,
            url,
            content_type: contentType,
            description
        };

        if (editingContentId) {
            data.content_id = editingContentId;
        }

        const res = await callApi(action, data);

        if (res.status === 'success') {
            alert(editingContentId ? '影片更新成功！' : '影片新增成功！');
            closeContentModal();
            loadContent();
        } else {
            alert('操作失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Save content error:', err);
        alert('操作失敗');
    }
}

async function deleteContent(contentId) {
    const content = allContent.find(c => c.content_id.toString() === contentId.toString());
    if (!content) return;

    const confirmMsg = `確定要刪除影片「${content.title}」嗎？\n\n此操作將同時刪除所有相關的權限和發佈日期設定，且無法復原！`;
    if (!confirm(confirmMsg)) return;

    try {
        const res = await callApi('deleteContent', {
            token: adminToken,
            content_id: contentId
        });

        if (res.status === 'success') {
            alert('影片刪除成功！');
            loadContent();
        } else {
            alert('刪除失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Delete content error:', err);
        alert('刪除失敗');
    }
}

function isValidYouTubeUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];

    return patterns.some(pattern => pattern.test(url));
}

// ============================================
// PERMISSION MANAGEMENT
// ============================================

function searchPermissionUsers() {
    const query = document.getElementById('permission-search').value.toLowerCase();

    if (!query) {
        alert('請輸入搜尋關鍵字');
        return;
    }

    const user = allUsers.find(u =>
        u.email.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query)
    );

    if (user) {
        editPermissions(user.user_id);
    } else {
        alert('找不到符合的用戶');
    }
}

async function editPermissions(userId) {
    selectedPermissionUserId = userId;
    const user = allUsers.find(u => u.user_id === userId);

    if (!user) return;

    elements.selectedUserEmail.textContent = user.email;
    elements.selectedUserName.textContent = user.name;
    elements.selectedUserPaid.textContent = user.is_paid ? '付費' : '免費';

    elements.permissionPlaceholder.classList.add('hidden');
    elements.permissionEditor.classList.remove('hidden');

    switchView('permissions');

    await loadPermissions(userId);
}

async function loadPermissions(userId) {
    try {
        const res = await callApi('getUserPermissions', {
            token: adminToken,
            userId: userId
        });

        if (res.status === 'success') {
            renderPermissionList(res.data.permissions);
            await loadUserReleaseDates(userId);
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

        const releaseDateValue = perm.release_date ? new Date(perm.release_date).toISOString().split('T')[0] : '';

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
                <div class="content-item-date">
                    <label for="release-date-${perm.content_id}">發佈日期：</label>
                    <input type="date" 
                           id="release-date-${perm.content_id}" 
                           class="date-input"
                           value="${releaseDateValue}">
                </div>
            </div>
        `;
    }).join('');
}

async function loadUserReleaseDates(userId) {
    try {
        const res = await callApi('getUserReleaseDate', {
            token: adminToken,
            userId: userId
        });

        if (res.status === 'success') {
            const releaseDates = res.data.releaseDates;
            releaseDates.forEach(item => {
                const dateInput = document.getElementById(`release-date-${item.content_id}`);
                if (dateInput && item.release_date) {
                    const date = new Date(item.release_date);
                    const dateStr = date.toISOString().split('T')[0];
                    dateInput.value = dateStr;
                }
            });
        }
    } catch (err) {
        console.error('Load release dates error:', err);
    }
}

function closePermissionEditor() {
    elements.permissionEditor.classList.add('hidden');
    elements.permissionPlaceholder.classList.remove('hidden');
    selectedPermissionUserId = null;
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
    if (!selectedPermissionUserId) return;

    const checkboxes = document.querySelectorAll('#permission-content-list input[type="checkbox"]');
    const permissions = Array.from(checkboxes).map(cb => ({
        content_id: cb.dataset.contentId,
        has_access: cb.checked
    }));

    try {
        const res = await callApi('updateUserPermissions', {
            token: adminToken,
            userId: selectedPermissionUserId,
            permissions: permissions
        });

        if (res.status === 'success') {
            alert('權限更新成功！');
        } else {
            alert('更新失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Save permissions error:', err);
        alert('更新失敗');
    }
}

async function saveReleaseDates() {
    if (!selectedPermissionUserId) return;

    const releaseDates = [];
    const dateInputs = document.querySelectorAll('[id^="release-date-"]');

    dateInputs.forEach(input => {
        const contentId = input.id.replace('release-date-', '');
        const dateValue = input.value;

        releaseDates.push({
            content_id: contentId,
            release_date: dateValue || null
        });
    });

    try {
        const res = await callApi('updateUserReleaseDate', {
            token: adminToken,
            userId: selectedPermissionUserId,
            releaseDates: releaseDates
        });

        if (res.status === 'success') {
            alert('發佈日期設定成功！');
        } else {
            alert('設定失敗: ' + res.message);
        }
    } catch (err) {
        console.error('Save release dates error:', err);
        alert('設定失敗');
    }
}

function batchSetReleaseDate() {
    const dateStr = prompt('請輸入要批量設定的日期（格式：YYYY-MM-DD）：');
    if (!dateStr) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        alert('日期格式錯誤，請使用 YYYY-MM-DD 格式');
        return;
    }

    const dateInputs = document.querySelectorAll('[id^="release-date-"]');
    dateInputs.forEach(input => {
        input.value = dateStr;
    });

    alert(`已將所有影片的發佈日期設為 ${dateStr}`);
}

function clearAllReleaseDates() {
    if (!confirm('確定要清除所有發佈日期設定嗎？')) return;

    const dateInputs = document.querySelectorAll('[id^="release-date-"]');
    dateInputs.forEach(input => {
        input.value = '';
    });

    alert('已清除所有發佈日期設定');
}

// ============================================
// STATISTICS
// ============================================

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

// ============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================

window.viewUser = viewUser;
window.editPermissions = editPermissions;
window.deleteUser = deleteUser;
window.showAddContentModal = showAddContentModal;
window.editContent = editContent;
window.closeContentModal = closeContentModal;
window.saveContent = saveContent;
window.deleteContent = deleteContent;
window.saveReleaseDates = saveReleaseDates;
window.batchSetReleaseDate = batchSetReleaseDate;
window.clearAllReleaseDates = clearAllReleaseDates;
