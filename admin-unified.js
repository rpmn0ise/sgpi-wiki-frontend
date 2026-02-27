// ===================================
// PANEL ADMIN UNIFIÉ - JAVASCRIPT COMPLET
// Wiki SGPI v2.0
// ===================================

const API_URL = 'https://backend-wiki-zaxy.onrender.com';

// État global
let currentAdmin = null;
let currentCategories = [];
let currentSections = [];
let currentLinks = [];
let currentTab = 'dashboard';

// ===================================
// INITIALISATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    initNavigation();
    initTheme();
    await loadDashboard();
    initEventListeners();
    initQuickAdd();
});

// ===================================
// AUTHENTIFICATION
// ===================================

async function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/api/admin-auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Session invalide');
        
        const data = await res.json();
        currentAdmin = data.admin;
        
        // UI update
        const usernameEl = document.getElementById('admin-username');
        const roleEl = document.getElementById('admin-role');
        const avatarEl = document.querySelector('.admin-sidebar-user-avatar');
        
        if (usernameEl) usernameEl.textContent = currentAdmin.username;
        if (roleEl) roleEl.textContent = getRoleLabel(currentAdmin.role);
        if (avatarEl) avatarEl.textContent = currentAdmin.username[0].toUpperCase();
        
    } catch (err) {
        localStorage.removeItem('admin_token');
        window.location.href = 'admin-login.html';
    }
}

function getRoleLabel(role) {
    const labels = {
        'super_admin': 'Super Admin',
        'admin': 'Administrateur',
        'moderator': 'Modérateur'
    };
    return labels[role] || role;
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = 'admin-login.html';
}

// ===================================
// NAVIGATION
// ===================================

function initNavigation() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Navigation
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');
    
    // Titre
    const titles = {
        'dashboard': 'Tableau de bord',
        'search': 'Recherche globale',
        'categories': 'Gestion des catégories',
        'sections': 'Gestion des sections',
        'links': 'Gestion des liens',
        'quick-add': 'Ajout rapide',
        'import': 'Import CSV/Excel',
        'export': 'Export & Backup',
        'validation': 'Validation des liens',
        'admins': 'Comptes admin',
        'logs': 'Historique',
        'settings': 'Paramètres'
    };
    
    const titleEl = document.getElementById('current-page-title');
    if (titleEl) titleEl.textContent = titles[tabName] || tabName;
    
    // Charger données
    loadTabData(tabName);
}

async function loadTabData(tabName) {
    switch(tabName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'categories':
            await loadCategories();
            break;
        case 'logs':
            await loadLogs();
            break;
        case 'admins':
            await loadAdmins();
            break;
    }
}

// ===================================
// TABLEAU DE BORD
// ===================================

async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/api/admin/stats/dashboard`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'x-admin-key': 'adminsgpi' // Fallback
            }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        // Stats avec sous-catégories et sous-sous-catégories
        updateStat('stat-categories', data.stats?.categories || 0);
        updateStat('stat-sections', `${data.stats?.subCategories || 0} sous-cat, ${data.stats?.subSubCategories || 0} sous-sous-cat`);
        updateStat('stat-links', data.stats?.links || 0);
        updateStat('stat-users', data.stats?.users || 0);
        
        // Activité récente
        displayRecentActivity(data.recentActivity || []);
        displayTopCategories(data.topCategories || []);
        
    } catch (err) {
        console.error('Dashboard error:', err);
        // Fallback avec clé admin
        loadDashboardFallback();
    }
}

async function loadDashboardFallback() {
    try {
        const res = await fetch(`${API_URL}/api/admin/stats?admin_key=adminsgpi`);
        const data = await res.json();
        
        updateStat('stat-categories', data.stats?.users?.total || 0);
        updateStat('stat-sections', 0);
        updateStat('stat-links', 0);
        updateStat('stat-users', data.stats?.users?.total || 0);
        
    } catch (err) {
        console.error('Fallback error:', err);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function displayRecentActivity(activity) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (activity.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Aucune activité récente</p></div>';
        return;
    }
    
    container.innerHTML = activity.slice(0, 10).map(log => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${formatAction(log.action)}</div>
                <div class="list-item-meta">
                    ${log.target ? log.target + ' • ' : ''}
                    ${new Date(log.timestamp).toLocaleString('fr-FR')}
                </div>
            </div>
        </div>
    `).join('');
}

function displayTopCategories(categories) {
    const container = document.getElementById('top-categories');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>Aucune catégorie</p></div>';
        return;
    }
    
    container.innerHTML = categories.slice(0, 5).map(cat => `
        <div class="list-item">
            <div style="font-size: 2rem;">${cat.emoji}</div>
            <div class="list-item-content">
                <div class="list-item-title">${cat.name}</div>
                <div class="list-item-meta">${cat.linksCount} liens • ${cat.subCategoriesCount || 0} sous-cat • ${cat.subSubCategoriesCount || 0} sous-sous-cat</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// RECHERCHE GLOBALE
// ===================================

let searchTimeout;
const searchInput = document.getElementById('global-search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performGlobalSearch(e.target.value);
        }, 300);
    });
}

async function performGlobalSearch(query) {
    if (!query || query.length < 2) {
        const resultsEl = document.getElementById('search-results');
        if (resultsEl) resultsEl.innerHTML = '';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/api/admin/search?q=${encodeURIComponent(query)}`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'x-admin-key': 'adminsgpi'
            }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        displaySearchResults(data.results);
        
    } catch (err) {
        console.error('Search error:', err);
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;
    
    if (!results || (results.categories.length === 0 && results.links.length === 0)) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>Aucun résultat trouvé</p></div>';
        return;
    }
    
    let html = '';
    
    if (results.categories.length > 0) {
        html += `<h3 style="margin: 20px 0 12px 0;">📁 Catégories (${results.categories.length})</h3>`;
        html += results.categories.map(cat => `
            <div class="list-item">
                <div style="font-size: 2rem;">${cat.emoji}</div>
                <div class="list-item-content">
                    <div class="list-item-title">${cat.name}</div>
                    <div class="list-item-meta">${cat.sectionsCount || 0} sections • ${cat.linksCount || 0} liens</div>
                </div>
            </div>
        `).join('');
    }
    
    if (results.links.length > 0) {
        html += `<h3 style="margin: 20px 0 12px 0;">🔗 Liens (${results.links.length})</h3>`;
        html += results.links.map(link => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${link.badge ? link.badge + ' ' : ''}${link.name}</div>
                    <div class="list-item-meta">${link.url}</div>
                    ${link.description ? `<div class="list-item-meta">${link.description}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    container.innerHTML = html;
}

// ===================================
// GESTION CATÉGORIES
// ===================================

async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/api/admin/categories`, {
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        currentCategories = data.categories;
        renderCategories();
        updateCategorySelects();
        
    } catch (err) {
        showToast('Erreur de chargement', 'error');
        console.error(err);
    }
}

function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    if (currentCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>Aucune catégorie</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    currentCategories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const emoji = document.createElement('div');
        emoji.style.fontSize = '2rem';
        emoji.textContent = cat.emoji;
        
        const content = document.createElement('div');
        content.className = 'list-item-content';
        
        const title = document.createElement('div');
        title.className = 'list-item-title';
        title.textContent = cat.name;
        
        const meta = document.createElement('div');
        meta.className = 'list-item-meta';
        meta.textContent = `${cat.sectionsCount || 0} sections • ${cat.linksCount || 0} liens`;
        
        content.appendChild(title);
        content.appendChild(meta);
        
        const actions = document.createElement('div');
        actions.className = 'list-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => editCategory(cat._id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => deleteCategory(cat._id, cat.name);
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(emoji);
        item.appendChild(content);
        item.appendChild(actions);
        
        container.appendChild(item);
    });
}

function updateCategorySelects() {
    const selects = [
        'section-category-select',
        'link-category-select',
        'qa-category-select',
        'export-md-category'
    ];
    
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const currentValue = select.value;
        const isExport = id === 'export-md-category';
        
        select.innerHTML = `<option value="">-- ${isExport ? 'Sélectionner' : 'Choisir'} une catégorie --</option>` +
            currentCategories.map(cat => 
                `<option value="${isExport ? cat.slug : cat._id}">${cat.emoji} ${cat.name}</option>`
            ).join('');
            
        if (currentValue) select.value = currentValue;
    });
}

function editCategory(id) {
    const category = currentCategories.find(c => c._id === id);
    if (!category) return;
    
    document.getElementById('modal-category-title').textContent = 'Modifier la Catégorie';
    document.getElementById('category-id').value = category._id;
    document.getElementById('category-emoji').value = category.emoji;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-slug').value = category.slug;
    
    openModal('modal-category');
}

function openCategoryModal() {
    document.getElementById('modal-category-title').textContent = 'Nouvelle Catégorie';
    document.getElementById('form-category').reset();
    document.getElementById('category-id').value = '';
    
    openModal('modal-category');
}

function openSectionModal() {
    const categoryId = document.getElementById('section-category-select')?.value;
    
    if (!categoryId) {
        showToast('Sélectionnez d\'abord une catégorie', 'warning');
        return;
    }
    
    document.getElementById('modal-section-title').textContent = 'Nouvelle Section';
    document.getElementById('form-section').reset();
    document.getElementById('section-id').value = '';
    document.getElementById('section-category-id').value = categoryId;
    
    openModal('modal-section');
}

function openLinkModal() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const sectionId = document.getElementById('link-section-select')?.value;
    
    if (!categoryId || !sectionId) {
        showToast('Sélectionnez une catégorie et une section', 'warning');
        return;
    }
    
    document.getElementById('modal-link-title').textContent = 'Nouveau Lien';
    document.getElementById('form-link').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('link-category-id').value = categoryId;
    document.getElementById('link-section-id').value = sectionId;
    
    // Reset badge selection
    document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('[data-badge=""]')?.classList.add('selected');
    
    openModal('modal-link');
}

function openAdminModal() {
    showToast('Gestion des admins à venir', 'info');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Fonction pour sélectionner un badge
function selectBadge(badge) {
    document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
    const selected = document.querySelector(`[data-badge="${badge}"]`);
    if (selected) selected.classList.add('selected');
    
    const badgeInput = document.getElementById('link-badge');
    if (badgeInput) badgeInput.value = badge;
}

// ===================================
// HANDLERS DE FORMULAIRES
// ===================================

async function handleCategorySubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('category-id').value;
    const emoji = document.getElementById('category-emoji').value;
    const name = document.getElementById('category-name').value;
    const slug = document.getElementById('category-slug').value;
    
    try {
        const url = id 
            ? `${API_URL}/api/admin/categories/${id}`
            : `${API_URL}/api/admin/categories`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({ name, emoji, slug })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(id ? 'Catégorie modifiée !' : 'Catégorie créée !', 'success');
        closeModal('modal-category');
        await loadCategories();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function handleSectionSubmit(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('section-category-id').value;
    const sectionId = document.getElementById('section-id').value;
    const name = document.getElementById('section-name').value;
    
    try {
        const url = sectionId
            ? `${API_URL}/api/admin/categories/${categoryId}/sections/${sectionId}`
            : `${API_URL}/api/admin/categories/${categoryId}/sections`;
        const method = sectionId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({ name })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(sectionId ? 'Section modifiée !' : 'Section créée !', 'success');
        closeModal('modal-section');
        await loadCategories();
        
        // Recharger les sections si on est dans l'onglet sections
        if (currentTab === 'sections') {
            await loadSectionsForCategory();
        }
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function handleLinkSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('link-id').value;
    const categoryId = document.getElementById('link-category-id').value;
    const sectionId = document.getElementById('link-section-id').value;
    const name = document.getElementById('link-name').value;
    const url = document.getElementById('link-url').value;
    const description = document.getElementById('link-description').value;
    const badge = document.getElementById('link-badge').value;
    
    try {
        const apiUrl = id
            ? `${API_URL}/api/admin/links/${id}`
            : `${API_URL}/api/admin/links`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(apiUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({ categoryId, sectionId, name, url, description, badge })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(id ? 'Lien modifié !' : 'Lien créé !', 'success');
        closeModal('modal-link');
        
        // Recharger les liens si on est dans l'onglet liens
        if (currentTab === 'links') {
            await loadLinksForSection();
        }
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// GESTION SECTIONS
// ===================================

async function loadSectionsForCategory() {
    const categoryId = document.getElementById('section-category-select')?.value;
    const addBtn = document.getElementById('add-section-btn');
    const container = document.getElementById('sections-list');
    
    if (!container) return;
    
    if (!categoryId) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><p>Sélectionnez une catégorie</p></div>';
        if (addBtn) addBtn.disabled = true;
        return;
    }
    
    if (addBtn) addBtn.disabled = false;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    currentSections = category.sections || [];
    renderSections();
}

function renderSections() {
    const container = document.getElementById('sections-list');
    if (!container) return;
    
    if (currentSections.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><p>Aucune section</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    currentSections.forEach(section => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const content = document.createElement('div');
        content.className = 'list-item-content';
        
        const title = document.createElement('div');
        title.className = 'list-item-title';
        title.textContent = section.name;
        
        content.appendChild(title);
        
        const actions = document.createElement('div');
        actions.className = 'list-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => editSection(section.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => deleteSection(section.id, section.name);
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(content);
        item.appendChild(actions);
        
        container.appendChild(item);
    });
}

function editSection(id) {
    const categoryId = document.getElementById('section-category-select')?.value;
    const section = currentSections.find(s => s.id === id);
    
    if (!section || !categoryId) return;
    
    document.getElementById('modal-section-title').textContent = 'Modifier la Section';
    document.getElementById('section-id').value = section.id;
    document.getElementById('section-category-id').value = categoryId;
    document.getElementById('section-name').value = section.name;
    
    openModal('modal-section');
}

async function deleteSection(id, name) {
    if (!confirm(`Supprimer "${name}" ?\n\nTous les liens de cette section seront supprimés.`)) return;
    
    const categoryId = document.getElementById('section-category-select')?.value;
    if (!categoryId) return;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}/sections/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Section supprimée', 'success');
        await loadCategories();
        await loadSectionsForCategory();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// GESTION LIENS
// ===================================

function loadSectionsForLinks() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const sectionSelect = document.getElementById('link-section-select');
    const addBtn = document.getElementById('add-link-btn');
    
    if (!sectionSelect) return;
    
    if (!categoryId) {
        sectionSelect.disabled = true;
        sectionSelect.innerHTML = '<option value="">-- Choisir une section --</option>';
        if (addBtn) addBtn.disabled = true;
        document.getElementById('links-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une catégorie</p></div>';
        return;
    }
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const sections = category.sections || [];
    
    sectionSelect.disabled = false;
    sectionSelect.innerHTML = '<option value="">-- Choisir une section --</option>' +
        sections.map(sec => `<option value="${sec.id}">${sec.name}</option>`).join('');
}

async function loadLinksForSection() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const sectionId = document.getElementById('link-section-select')?.value;
    const addBtn = document.getElementById('add-link-btn');
    const container = document.getElementById('links-list');
    
    if (!container) return;
    
    if (!categoryId || !sectionId) {
        if (addBtn) addBtn.disabled = true;
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une section</p></div>';
        return;
    }
    
    if (addBtn) addBtn.disabled = false;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/links?categoryId=${categoryId}&sectionId=${sectionId}`, {
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        currentLinks = data.links;
        renderLinks();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

function renderLinks() {
    const container = document.getElementById('links-list');
    if (!container) return;
    
    if (currentLinks.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Aucun lien</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    currentLinks.forEach(link => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const content = document.createElement('div');
        content.className = 'list-item-content';
        
        const title = document.createElement('div');
        title.className = 'list-item-title';
        title.textContent = (link.badge ? link.badge + ' ' : '') + link.name;
        
        const url = document.createElement('div');
        url.className = 'list-item-meta';
        url.textContent = link.url;
        
        content.appendChild(title);
        content.appendChild(url);
        
        if (link.description) {
            const desc = document.createElement('div');
            desc.className = 'list-item-meta';
            desc.textContent = link.description;
            content.appendChild(desc);
        }
        
        const actions = document.createElement('div');
        actions.className = 'list-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => editLink(link._id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => deleteLink(link._id, link.name);
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(content);
        item.appendChild(actions);
        
        container.appendChild(item);
    });
}

function editLink(id) {
    const link = currentLinks.find(l => l._id === id);
    if (!link) return;
    
    document.getElementById('modal-link-title').textContent = 'Modifier le Lien';
    document.getElementById('link-id').value = link._id;
    document.getElementById('link-category-id').value = link.categoryId;
    document.getElementById('link-section-id').value = link.sectionId;
    document.getElementById('link-name').value = link.name;
    document.getElementById('link-url').value = link.url;
    document.getElementById('link-description').value = link.description || '';
    document.getElementById('link-badge').value = link.badge || '';
    
    // Sélectionner le badge
    if (link.badge) {
        selectBadge(link.badge);
    } else {
        selectBadge('');
    }
    
    openModal('modal-link');
}

async function deleteLink(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/links/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Lien supprimé', 'success');
        
        // Recharger les liens de la sous-sous-catégorie actuelle (structure 3 niveaux)
        await loadLinksForSubSubCategory();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Supprimer "${name}" ?\n\nTous les liens seront supprimés.`)) return;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Catégorie supprimée', 'success');
        await loadCategories();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// AJOUT RAPIDE
// ===================================

function initQuickAdd() {
    const categorySelect = document.getElementById('qa-category-select');
    const linksInput = document.getElementById('qa-links-input');
    const form = document.getElementById('quick-add-form');
    
    if (categorySelect) {
        categorySelect.addEventListener('change', handleQACategoryChange);
    }
    
    if (linksInput) {
        linksInput.addEventListener('input', handleQALinksInput);
    }
    
    if (form) {
        form.addEventListener('submit', handleQASubmit);
    }
}

function handleQACategoryChange(e) {
    const categoryId = e.target.value;
    const sectionSelect = document.getElementById('qa-section-select');
    
    if (!sectionSelect) return;
    
    if (!categoryId) {
        sectionSelect.disabled = true;
        sectionSelect.innerHTML = '<option value="">Sélectionnez d\'abord une catégorie</option>';
        return;
    }
    
    const category = currentCategories.find(c => c._id === categoryId);
    
    if (!category || !category.sections || category.sections.length === 0) {
        sectionSelect.disabled = true;
        sectionSelect.innerHTML = '<option value="">Aucune section disponible</option>';
        showToast('Cette catégorie n\'a pas de sections', 'warning');
        return;
    }
    
    sectionSelect.disabled = false;
    sectionSelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        category.sections.map(sec => `<option value="${sec.id}">${sec.name}</option>`).join('');
}

function handleQALinksInput(e) {
    const links = parseLinks(e.target.value);
    const counter = document.getElementById('qa-link-counter');
    
    if (counter) {
        counter.textContent = `${links.length} lien${links.length > 1 ? 's' : ''} détecté${links.length > 1 ? 's' : ''}`;
        counter.classList.toggle('active', links.length > 0);
    }
}

function parseLinks(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const links = [];
    
    for (const line of lines) {
        const parts = line.split(/[|\t]/).map(p => p.trim());
        
        if (parts.length >= 2) {
            const link = {
                name: parts[0],
                url: parts[1],
                description: parts[2] || '',
                badge: parts[3] || ''
            };
            
            if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
                links.push(link);
            }
        }
    }
    
    return links;
}

async function handleQASubmit(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('qa-category-select')?.value;
    const sectionId = document.getElementById('qa-section-select')?.value;
    const linksText = document.getElementById('qa-links-input')?.value;
    
    if (!categoryId || !sectionId) {
        showToast('Sélectionnez catégorie et section', 'warning');
        return;
    }
    
    const links = parseLinks(linksText);
    
    if (links.length === 0) {
        showToast('Aucun lien valide détecté', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('qa-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Ajout en cours...';
    }
    
    try {
        const res = await fetch(`${API_URL}/api/admin/quick-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({ categoryId, sectionId, links })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(`✅ ${data.message}`, 'success');
        
        // Reset
        const linksInput = document.getElementById('qa-links-input');
        const counter = document.getElementById('qa-link-counter');
        
        if (linksInput) linksInput.value = '';
        if (counter) {
            counter.textContent = '0 liens détectés';
            counter.classList.remove('active');
        }
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Ajouter tous les liens';
        }
    }
}

// ===================================
// EXPORT
// ===================================

function exportMarkdown() {
    const slug = document.getElementById('export-md-category')?.value;
    
    if (!slug) {
        showToast('Sélectionnez une catégorie', 'warning');
        return;
    }
    
    showToast('Téléchargement en cours...', 'info');
    window.open(`${API_URL}/api/export/category/${slug}`, '_blank');
}

async function exportFullBackup() {
    try {
        showToast('Génération du backup...', 'info');
        
        const res = await fetch(`${API_URL}/api/admin/export/full`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'x-admin-key': 'adminsgpi'
            }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-wiki-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Backup téléchargé !', 'success');
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// VALIDATION LIENS
// ===================================

async function validateLinks() {
    const button = event?.target;
    if (button) {
        button.disabled = true;
        button.textContent = '⏳ Validation...';
    }
    
    const resultsContainer = document.getElementById('validation-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p style="color: var(--text-secondary);">Vérification en cours...</p>';
    }
    
    try {
        const res = await fetch(`${API_URL}/api/admin/validate-links`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'x-admin-key': 'adminsgpi'
            }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        displayValidationResults(data.results);
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
        if (resultsContainer) resultsContainer.innerHTML = '';
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = '🔍 Lancer la validation';
        }
    }
}

function displayValidationResults(results) {
    const container = document.getElementById('validation-results');
    if (!container) return;
    
    const working = results.filter(r => r.status === 'ok');
    const broken = results.filter(r => r.status === 'error');
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h3>Résumé</h3>
            <p>✅ Valides: ${working.length}</p>
            <p>❌ Cassés: ${broken.length}</p>
        </div>
    `;
    
    if (broken.length > 0) {
        html += `<h3 style="color: #ef4444; margin-top: 20px;">À corriger</h3>`;
        html += broken.map(link => `
            <div class="list-item" style="border-left: 4px solid #ef4444;">
                <div class="list-item-content">
                    <div class="list-item-title">${escapeHtml(link.name)}</div>
                    <div class="list-item-meta">${escapeHtml(link.url)}</div>
                    <div class="list-item-meta" style="color: #ef4444;">${escapeHtml(link.error)}</div>
                </div>
            </div>
        `).join('');
    }
    
    container.innerHTML = html;
}

// ===================================
// LOGS
// ===================================

async function loadLogs() {
    try {
        const res = await fetch(`${API_URL}/api/admin/logs?limit=50`, {
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        displayLogs(data.logs);
        
    } catch (err) {
        showToast('Erreur de chargement', 'error');
        console.error(err);
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logs-list');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Aucun log</p></div>';
        return;
    }
    
    container.innerHTML = logs.map(log => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${formatAction(log.action)}</div>
                <div class="list-item-meta">
                    ${log.target ? escapeHtml(log.target) + ' • ' : ''}
                    ${new Date(log.timestamp).toLocaleString('fr-FR')}
                </div>
            </div>
        </div>
    `).join('');
}

function formatAction(action) {
    const actions = {
        'create_category': '➕ Catégorie créée',
        'update_category': '✏️ Catégorie modifiée',
        'delete_category': '🗑️ Catégorie supprimée',
        'create_section': '➕ Section créée',
        'update_section': '✏️ Section modifiée',
        'delete_section': '🗑️ Section supprimée',
        'create_link': '➕ Lien créé',
        'update_link': '✏️ Lien modifié',
        'delete_link': '🗑️ Lien supprimé',
        'quick_add': '⚡ Ajout rapide'
    };
    return actions[action] || action;
}

// ===================================
// COMPTES ADMIN
// ===================================

async function loadAdmins() {
    try {
        const res = await fetch(`${API_URL}/api/admin-auth/list`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        displayAdmins(data.admins);
        
    } catch (err) {
        showToast('Erreur de chargement', 'error');
        console.error(err);
    }
}

function displayAdmins(admins) {
    const container = document.getElementById('admins-list');
    if (!container) return;
    
    if (admins.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>Aucun admin</p></div>';
        return;
    }
    
    container.innerHTML = admins.map(admin => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">
                    ${escapeHtml(admin.username)} 
                    ${admin.isActive ? '' : '<span style="color: #ef4444;">(Désactivé)</span>'}
                </div>
                <div class="list-item-meta">
                    ${getRoleLabel(admin.role)} • ${escapeHtml(admin.email)}
                </div>
            </div>
            ${currentAdmin && currentAdmin.role === 'super_admin' && admin._id !== currentAdmin.id ? `
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deleteAdmin('${admin._id}', '${escapeHtml(admin.username)}')">🗑️</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function deleteAdmin(id, username) {
    if (!confirm(`Supprimer l'admin "${username}" ?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/api/admin-auth/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(data.message, 'success');
        await loadAdmins();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// THÈME
// ===================================

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('admin_theme') || 'dark';
    body.className = `${savedTheme}-mode`;
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                localStorage.setItem('admin_theme', 'light');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                localStorage.setItem('admin_theme', 'dark');
            }
        });
    }
}

// ===================================
// EVENT LISTENERS
// ===================================

function initEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ===================================
// UTILITAIRES
// ===================================

function showToast(message, type = 'info') {
    if (typeof Toast !== 'undefined' && Toast[type]) {
        Toast[type](message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exposer les fonctions globalement
window.logout = logout;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editSection = editSection;
window.deleteSection = deleteSection;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.deleteAdmin = deleteAdmin;
window.exportMarkdown = exportMarkdown;
window.exportFullBackup = exportFullBackup;
window.validateLinks = validateLinks;
window.loadLogs = loadLogs;
window.openCategoryModal = openCategoryModal;
window.openSectionModal = openSectionModal;
window.openLinkModal = openLinkModal;
window.openAdminModal = openAdminModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectBadge = selectBadge;
window.handleCategorySubmit = handleCategorySubmit;
window.handleSectionSubmit = handleSectionSubmit;
window.handleLinkSubmit = handleLinkSubmit;
window.loadSectionsForCategory = loadSectionsForCategory;
window.loadSectionsForLinks = loadSectionsForLinks;
window.loadLinksForSection = loadLinksForSection;


// =====================================================
// CODE À AJOUTER DANS admin-unified.js
// Support 3 niveaux : Catégorie → Sous-catégorie → Sous-sous-catégorie
// =====================================================

// Remplacer la fonction loadSectionsForLinks par loadSubCategoriesForLinks

function loadSubCategoriesForLinks() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategorySelect = document.getElementById('link-subcategory-select');
    const subSubCategorySelect = document.getElementById('link-subsubcategory-select');
    const addBtn = document.getElementById('add-link-btn');
    
    if (!subCategorySelect) return;
    
    // Reset
    subCategorySelect.disabled = true;
    subCategorySelect.innerHTML = '<option value="">-- Choisir une sous-catégorie --</option>';
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Choisir une sous-sous-catégorie --</option>';
    addBtn.disabled = true;
    
    if (!categoryId) {
        document.getElementById('links-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une catégorie</p></div>';
        return;
    }
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    
    if (subCategories.length === 0) {
        subCategorySelect.innerHTML = '<option value="">Aucune sous-catégorie</option>';
        return;
    }
    
    subCategorySelect.disabled = false;
    subCategorySelect.innerHTML = '<option value="">-- Choisir une sous-catégorie --</option>' +
        subCategories.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
}

function loadSubSubCategoriesForLinks() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategorySelect = document.getElementById('link-subsubcategory-select');
    const addBtn = document.getElementById('add-link-btn');
    
    if (!subSubCategorySelect) return;
    
    // Reset
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Choisir une sous-sous-catégorie --</option>';
    addBtn.disabled = true;
    
    if (!categoryId || !subCategoryId) {
        document.getElementById('links-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une sous-catégorie</p></div>';
        return;
    }
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    const subCategory = subCategories.find(s => s.id === subCategoryId);
    if (!subCategory) return;
    
    const subSubCategories = subCategory.subSubCategories || [];
    
    if (subSubCategories.length === 0) {
        subSubCategorySelect.innerHTML = '<option value="">Pas de sous-sous-catégories</option>';
        document.getElementById('links-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Cette sous-catégorie n\'a pas de sous-sous-catégories</p></div>';
        return;
    }
    
    subSubCategorySelect.disabled = false;
    subSubCategorySelect.innerHTML = '<option value="">-- Choisir une sous-sous-catégorie --</option>' +
        subSubCategories.map(subsub => `<option value="${subsub.id}">${subsub.name}</option>`).join('');
}

async function loadLinksForSubSubCategory() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategoryId = document.getElementById('link-subsubcategory-select')?.value;
    const addBtn = document.getElementById('add-link-btn');
    const container = document.getElementById('links-list');
    
    if (!container) return;
    
    if (!categoryId || !subCategoryId || !subSubCategoryId) {
        addBtn.disabled = true;
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une sous-sous-catégorie</p></div>';
        return;
    }
    
    addBtn.disabled = false;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/links?categoryId=${categoryId}&subCategoryId=${subCategoryId}&subSubCategoryId=${subSubCategoryId}`, {
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        currentLinks = data.links;
        renderLinks();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// AJOUT RAPIDE - 3 NIVEAUX
// ===================================

function loadQASubCategories() {
    const categoryId = document.getElementById('qa-category-select')?.value;
    const subCategorySelect = document.getElementById('qa-subcategory-select');
    const subSubCategorySelect = document.getElementById('qa-subsubcategory-select');
    
    if (!subCategorySelect) return;
    
    // Reset
    subCategorySelect.disabled = true;
    subCategorySelect.innerHTML = '<option value="">Sélectionnez d\'abord une catégorie</option>';
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">Sélectionnez d\'abord une sous-catégorie</option>';
    
    if (!categoryId) return;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    
    if (subCategories.length === 0) {
        showToast('Cette catégorie n\'a pas de sous-catégories', 'warning');
        return;
    }
    
    subCategorySelect.disabled = false;
    subCategorySelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        subCategories.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
}

function loadQASubSubCategories() {
    const categoryId = document.getElementById('qa-category-select')?.value;
    const subCategoryId = document.getElementById('qa-subcategory-select')?.value;
    const subSubCategorySelect = document.getElementById('qa-subsubcategory-select');
    
    if (!subSubCategorySelect) return;
    
    // Reset
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">Sélectionnez d\'abord une sous-catégorie</option>';
    
    if (!categoryId || !subCategoryId) return;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    const subCategory = subCategories.find(s => s.id === subCategoryId);
    if (!subCategory) return;
    
    const subSubCategories = subCategory.subSubCategories || [];
    
    if (subSubCategories.length === 0) {
        showToast('Cette sous-catégorie n\'a pas de sous-sous-catégories', 'warning');
        return;
    }
    
    subSubCategorySelect.disabled = false;
    subSubCategorySelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        subSubCategories.map(subsub => `<option value="${subsub.id}">${subsub.name}</option>`).join('');
}

// ===================================
// MODAL LIEN - Mise à jour pour 3 niveaux
// ===================================

// Remplacer la fonction openLinkModal existante
function openLinkModal() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategoryId = document.getElementById('link-subsubcategory-select')?.value;
    
    if (!categoryId || !subCategoryId || !subSubCategoryId) {
        showToast('Sélectionnez catégorie, sous-catégorie et sous-sous-catégorie', 'warning');
        return;
    }
    
    document.getElementById('modal-link-title').textContent = 'Nouveau Lien';
    document.getElementById('form-link').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('link-category-id').value = categoryId;
    document.getElementById('link-section-id').value = subCategoryId; // Rétrocompatibilité nom
    
    // Ajouter field pour subSubCategoryId si pas existant
    let subSubInput = document.getElementById('link-subsubcategory-id');
    if (!subSubInput) {
        subSubInput = document.createElement('input');
        subSubInput.type = 'hidden';
        subSubInput.id = 'link-subsubcategory-id';
        document.getElementById('form-link').appendChild(subSubInput);
    }
    subSubInput.value = subSubCategoryId;
    
    // Reset badge selection
    document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('[data-badge=""]')?.classList.add('selected');
    
    openModal('modal-link');
}

// ===================================
// SUBMIT AJOUT RAPIDE - Mise à jour
// ===================================

// Remplacer handleQASubmit existant par celui-ci
async function handleQASubmit(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('qa-category-select').value;
    const subCategoryId = document.getElementById('qa-subcategory-select').value;
    const subSubCategoryId = document.getElementById('qa-subsubcategory-select').value;
    const linksText = document.getElementById('qa-links-input').value;
    
    if (!categoryId || !subCategoryId || !subSubCategoryId) {
        showToast('Sélectionnez tous les niveaux', 'warning');
        return;
    }
    
    const links = parseLinks(linksText);
    
    if (links.length === 0) {
        showToast('Aucun lien valide détecté', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('qa-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Ajout en cours...';
    }
    
    try {
        const res = await fetch(`${API_URL}/api/admin/quick-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({ 
                categoryId, 
                subCategoryId, 
                subSubCategoryId, 
                links 
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(`✅ ${data.message}`, 'success');
        
        // Reset
        document.getElementById('qa-links-input').value = '';
        document.getElementById('qa-link-counter').textContent = '0 liens détectés';
        document.getElementById('qa-link-counter').classList.remove('active');
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Ajouter tous les liens';
        }
    }
}

// ===================================
// EXPOSER FONCTIONS GLOBALEMENT
// ===================================

// À la fin du fichier, AJOUTER ces lignes :
window.loadSubCategoriesForLinks = loadSubCategoriesForLinks;
window.loadSubSubCategoriesForLinks = loadSubSubCategoriesForLinks;
window.loadLinksForSubSubCategory = loadLinksForSubSubCategory;
window.loadQASubCategories = loadQASubCategories;
window.loadQASubSubCategories = loadQASubSubCategories;

// =====================================================
// FIN DU CODE À AJOUTER
// =====================================================

// =====================================================
// GESTION STRUCTURE 3 NIVEAUX - Interface graphique
// À ajouter dans admin-unified.js
// =====================================================

// Variables globales
let currentStructureCategory = null;

// ===================================
// CHARGEMENT DE LA STRUCTURE
// ===================================

async function loadStructure() {
    const categoryId = document.getElementById('structure-category-select')?.value;
    const container = document.getElementById('structure-container');
    
    if (!container) return;
    
    if (!categoryId) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div><p>Sélectionnez une catégorie</p></div>';
        return;
    }
    
    currentStructureCategory = currentCategories.find(c => c._id === categoryId);
    if (!currentStructureCategory) return;
    
    renderStructureTree();
}

function renderStructureTree() {
    const container = document.getElementById('structure-container');
    if (!container || !currentStructureCategory) return;
    
    const subCategories = currentStructureCategory.subCategories || [];
    
    let html = '<div class="structure-tree">';
    
    if (subCategories.length === 0) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <p>Aucune sous-catégorie</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">Commencez par créer une sous-catégorie</p>
            </div>
        `;
    } else {
        // Afficher chaque sous-catégorie
        subCategories.forEach((subCat, index) => {
            const subSubCats = subCat.subSubCategories || [];
            const linkCount = countLinksInSubCategory(subCat.id);
            
            html += `
                <div class="tree-node level-1" data-subcat-id="${subCat.id}">
                    <div class="tree-header">
                        <span class="tree-icon">📂</span>
                        <span class="tree-name">${subCat.name}</span>
                        <span class="tree-count">${linkCount} liens</span>
                        <div class="tree-actions">
                            <button class="btn btn-sm btn-success" onclick="openAddSubSubCategoryModal('${subCat.id}')" title="Ajouter sous-sous-catégorie">
                                ➕ Sous-sous-cat
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="openEditSubCategoryModal('${subCat.id}')" title="Modifier">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSubCategory('${subCat.id}', '${escapeHtml(subCat.name)}')" title="Supprimer">
                                🗑️
                            </button>
                        </div>
                    </div>
            `;
            
            // Afficher les sous-sous-catégories
            if (subSubCats.length > 0) {
                html += '<div class="tree-children">';
                
                subSubCats.forEach(subSubCat => {
                    const subSubLinkCount = countLinksInSubSubCategory(subCat.id, subSubCat.id);
                    
                    html += `
                        <div class="tree-node level-2" data-subsubcat-id="${subSubCat.id}">
                            <div class="tree-header">
                                <span class="tree-icon">📄</span>
                                <span class="tree-name">${subSubCat.name}</span>
                                <span class="tree-count">${subSubLinkCount} liens</span>
                                <div class="tree-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="openEditSubSubCategoryModal('${subCat.id}', '${subSubCat.id}')" title="Modifier">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteSubSubCategory('${subCat.id}', '${subSubCat.id}', '${escapeHtml(subSubCat.name)}')" title="Supprimer">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    // Bouton ajouter sous-catégorie
    html += `
        <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="openAddSubCategoryModal()">
                ➕ Ajouter une sous-catégorie
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Compter les liens dans une sous-catégorie
function countLinksInSubCategory(subCatId) {
    let count = 0;
    const subCat = currentStructureCategory.subCategories?.find(s => s.id === subCatId);
    
    if (subCat && subCat.subSubCategories) {
        subCat.subSubCategories.forEach(subSubCat => {
            // Compter via l'API ou cache local si disponible
            count += countLinksInSubSubCategory(subCatId, subSubCat.id);
        });
    }
    
    return count;
}

// Compter les liens dans une sous-sous-catégorie
function countLinksInSubSubCategory(subCatId, subSubCatId) {
    // Pour l'instant, retourner un placeholder
    // On pourrait faire un appel API pour avoir le vrai count
    return 0; // À améliorer avec vraies données
}

// ===================================
// MODALS - SOUS-CATÉGORIES
// ===================================

function openAddSubCategoryModal() {
    document.getElementById('modal-subcategory-title').textContent = 'Nouvelle Sous-catégorie';
    document.getElementById('form-subcategory').reset();
    document.getElementById('subcategory-id').value = '';
    document.getElementById('subcategory-category-id').value = currentStructureCategory._id;
    
    openModal('modal-subcategory');
}

function openEditSubCategoryModal(subCatId) {
    const subCat = currentStructureCategory.subCategories?.find(s => s.id === subCatId);
    if (!subCat) return;
    
    document.getElementById('modal-subcategory-title').textContent = 'Modifier la sous-catégorie';
    document.getElementById('subcategory-id').value = subCat.id;
    document.getElementById('subcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subcategory-name').value = subCat.name;
    
    openModal('modal-subcategory');
}

async function handleSubCategorySubmit(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('subcategory-category-id').value;
    const subCatId = document.getElementById('subcategory-id').value;
    const name = document.getElementById('subcategory-name').value;
    
    try {
        // Récupérer la catégorie complète
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        
        if (subCatId) {
            // Modification
            const index = subCategories.findIndex(s => s.id === subCatId);
            if (index !== -1) {
                subCategories[index].name = name;
            }
        } else {
            // Création
            subCategories.push({
                id: 'subcat_' + Date.now(),
                name: name,
                order: subCategories.length,
                subSubCategories: []
            });
        }
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(subCatId ? 'Sous-catégorie modifiée !' : 'Sous-catégorie créée !', 'success');
        closeModal('modal-subcategory');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function deleteSubCategory(subCatId, name) {
    if (!confirm(`Supprimer la sous-catégorie "${name}" ?\n\n⚠️ ATTENTION : Toutes les sous-sous-catégories et leurs liens seront supprimés !`)) return;
    
    try {
        const categoryId = currentStructureCategory._id;
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        subCategories = subCategories.filter(s => s.id !== subCatId);
        
        // Supprimer aussi tous les liens associés
        await fetch(`${API_URL}/api/admin/links/batch-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                categoryId: categoryId,
                subCategoryId: subCatId
            })
        });
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Sous-catégorie supprimée', 'success');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// MODALS - SOUS-SOUS-CATÉGORIES
// ===================================

function openAddSubSubCategoryModal(subCatId) {
    document.getElementById('modal-subsubcategory-title').textContent = 'Nouvelle Sous-sous-catégorie';
    document.getElementById('form-subsubcategory').reset();
    document.getElementById('subsubcategory-id').value = '';
    document.getElementById('subsubcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subsubcategory-subcategory-id').value = subCatId;
    
    openModal('modal-subsubcategory');
}

function openEditSubSubCategoryModal(subCatId, subSubCatId) {
    const subCat = currentStructureCategory.subCategories?.find(s => s.id === subCatId);
    if (!subCat) return;
    
    const subSubCat = subCat.subSubCategories?.find(ss => ss.id === subSubCatId);
    if (!subSubCat) return;
    
    document.getElementById('modal-subsubcategory-title').textContent = 'Modifier la sous-sous-catégorie';
    document.getElementById('subsubcategory-id').value = subSubCat.id;
    document.getElementById('subsubcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subsubcategory-subcategory-id').value = subCatId;
    document.getElementById('subsubcategory-name').value = subSubCat.name;
    
    openModal('modal-subsubcategory');
}

async function handleSubSubCategorySubmit(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('subsubcategory-category-id').value;
    const subCatId = document.getElementById('subsubcategory-subcategory-id').value;
    const subSubCatId = document.getElementById('subsubcategory-id').value;
    const name = document.getElementById('subsubcategory-name').value;
    
    try {
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        const subCatIndex = subCategories.findIndex(s => s.id === subCatId);
        
        if (subCatIndex === -1) throw new Error('Sous-catégorie introuvable');
        
        let subSubCategories = subCategories[subCatIndex].subSubCategories || [];
        
        if (subSubCatId) {
            // Modification
            const index = subSubCategories.findIndex(ss => ss.id === subSubCatId);
            if (index !== -1) {
                subSubCategories[index].name = name;
            }
        } else {
            // Création
            subSubCategories.push({
                id: 'subsubcat_' + Date.now(),
                name: name,
                order: subSubCategories.length
            });
        }
        
        subCategories[subCatIndex].subSubCategories = subSubCategories;
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(subSubCatId ? 'Sous-sous-catégorie modifiée !' : 'Sous-sous-catégorie créée !', 'success');
        closeModal('modal-subsubcategory');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function deleteSubSubCategory(subCatId, subSubCatId, name) {
    if (!confirm(`Supprimer la sous-sous-catégorie "${name}" ?\n\n⚠️ ATTENTION : Tous les liens seront supprimés !`)) return;
    
    try {
        const categoryId = currentStructureCategory._id;
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        const subCatIndex = subCategories.findIndex(s => s.id === subCatId);
        
        if (subCatIndex === -1) throw new Error('Sous-catégorie introuvable');
        
        let subSubCategories = subCategories[subCatIndex].subSubCategories || [];
        subSubCategories = subSubCategories.filter(ss => ss.id !== subSubCatId);
        subCategories[subCatIndex].subSubCategories = subSubCategories;
        
        // Supprimer les liens
        await fetch(`${API_URL}/api/admin/links/batch-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                categoryId: categoryId,
                subCategoryId: subCatId,
                subSubCategoryId: subSubCatId
            })
        });
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Sous-sous-catégorie supprimée', 'success');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// UTILITAIRES
// ===================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ===================================
// INIT
// ===================================

// Charger les catégories dans le dropdown structure au démarrage
function initStructureTab() {
    const select = document.getElementById('structure-category-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Choisir une catégorie --</option>' +
        currentCategories.map(cat => 
            `<option value="${cat._id}">${cat.emoji} ${cat.name}</option>`
        ).join('');
}

// Appeler initStructureTab après loadCategories
const originalLoadCategories = loadCategories;
loadCategories = async function() {
    await originalLoadCategories();
    initStructureTab();
};

// ===================================
// EXPOSER GLOBALEMENT
// ===================================

window.loadStructure = loadStructure;
window.openAddSubCategoryModal = openAddSubCategoryModal;
window.openEditSubCategoryModal = openEditSubCategoryModal;
window.handleSubCategorySubmit = handleSubCategorySubmit;
window.deleteSubCategory = deleteSubCategory;
window.openAddSubSubCategoryModal = openAddSubSubCategoryModal;
window.openEditSubSubCategoryModal = openEditSubSubCategoryModal;
window.handleSubSubCategorySubmit = handleSubSubCategorySubmit;
window.deleteSubSubCategory = deleteSubSubCategory;

console.log('✅ Gestion structure 3 niveaux chargée');





// =====================================================
// CODE À AJOUTER/REMPLACER dans admin-unified.js
// Toutes les fonctions manquantes pour Structure 3 niveaux
// =====================================================

// ===================================
// GESTION LIENS - 3 NIVEAUX (CORRIGÉ)
// ===================================

// Fonction corrigée : loadSubCategoriesForLinks
function loadSubCategoriesForLinks() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategorySelect = document.getElementById('link-subcategory-select');
    const subSubCategorySelect = document.getElementById('link-subsubcategory-select');
    const addBtn = document.getElementById('add-link-btn');
    
    if (!subCategorySelect) return;
    
    // Reset
    subCategorySelect.disabled = true;
    subCategorySelect.innerHTML = '<option value="">-- Choisir une sous-catégorie --</option>';
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : liens généraux si vide --</option>';
    addBtn.disabled = true;
    
    const linksContainer = document.getElementById('links-list');
    if (linksContainer) {
        linksContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une sous-catégorie</p></div>';
    }
    
    if (!categoryId) return;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    
    if (subCategories.length === 0) {
        subCategorySelect.innerHTML = '<option value="">Aucune sous-catégorie</option>';
        return;
    }
    
    subCategorySelect.disabled = false;
    subCategorySelect.innerHTML = '<option value="">-- Choisir une sous-catégorie --</option>' +
        subCategories.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
}

// Fonction corrigée : loadSubSubCategoriesForLinks
function loadSubSubCategoriesForLinks() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategorySelect = document.getElementById('link-subsubcategory-select');
    const addBtn = document.getElementById('add-link-btn');
    
    if (!subSubCategorySelect) return;
    
    // Reset
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : liens généraux si vide --</option>';
    addBtn.disabled = true;
    
    const linksContainer = document.getElementById('links-list');
    
    if (!categoryId || !subCategoryId) {
        if (linksContainer) {
            linksContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>Sélectionnez une sous-catégorie</p></div>';
        }
        return;
    }
    
    // Activer le bouton car on peut ajouter des liens dans la sous-catégorie
    addBtn.disabled = false;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    const subCategory = subCategories.find(s => s.id === subCategoryId);
    if (!subCategory) return;
    
    const subSubCategories = subCategory.subSubCategories || [];
    
    if (subSubCategories.length === 0) {
        subSubCategorySelect.innerHTML = '<option value="">Pas de sous-sous-catégories (liens généraux)</option>';
        // Charger les liens de la sous-catégorie
        loadLinksForLevel();
        return;
    }
    
    subSubCategorySelect.disabled = false;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : liens généraux si vide --</option>' +
        subSubCategories.map(subsub => `<option value="${subsub.id}">${subsub.name}</option>`).join('');
    
    // Charger les liens de la sous-catégorie (généraux)
    loadLinksForLevel();
}

// Fonction NOUVELLE : loadLinksForLevel (manquante !)
async function loadLinksForLevel() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategoryId = document.getElementById('link-subsubcategory-select')?.value;
    const container = document.getElementById('links-list');
    
    if (!container || !categoryId || !subCategoryId) return;
    
    try {
        // Construire la query selon le niveau
        let query = `categoryId=${categoryId}&subCategoryId=${subCategoryId}`;
        
        if (subSubCategoryId) {
            query += `&subSubCategoryId=${subSubCategoryId}`;
        }
        
        const res = await fetch(`${API_URL}/api/admin/links?${query}`, {
            headers: { 'x-admin-key': 'adminsgpi' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        currentLinks = data.links || [];
        renderLinks();
        
    } catch (err) {
        console.error('Erreur chargement liens:', err);
        showToast('Erreur: ' + err.message, 'error');
    }
}

// Fonction corrigée : openLinkModal
function openLinkModal() {
    const categoryId = document.getElementById('link-category-select')?.value;
    const subCategoryId = document.getElementById('link-subcategory-select')?.value;
    const subSubCategoryId = document.getElementById('link-subsubcategory-select')?.value;
    
    if (!categoryId || !subCategoryId) {
        showToast('Sélectionnez au moins une catégorie et une sous-catégorie', 'warning');
        return;
    }
    
    document.getElementById('modal-link-title').textContent = 'Nouveau Lien';
    document.getElementById('form-link').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('link-category-id').value = categoryId;
    document.getElementById('link-section-id').value = subCategoryId;
    
    // Stocker subSubCategoryId (peut être vide)
    let subSubInput = document.getElementById('link-subsubcategory-id');
    if (!subSubInput) {
        subSubInput = document.createElement('input');
        subSubInput.type = 'hidden';
        subSubInput.id = 'link-subsubcategory-id';
        document.getElementById('form-link').appendChild(subSubInput);
    }
    subSubInput.value = subSubCategoryId || '';
    
    // Reset badge
    document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('[data-badge=""]')?.classList.add('selected');
    
    openModal('modal-link');
}

// ===================================
// AJOUT RAPIDE - 3 NIVEAUX OPTIONNEL
// ===================================

function loadQASubCategories() {
    const categoryId = document.getElementById('qa-category-select')?.value;
    const subCategorySelect = document.getElementById('qa-subcategory-select');
    const subSubCategorySelect = document.getElementById('qa-subsubcategory-select');
    
    if (!subCategorySelect) return;
    
    // Reset
    subCategorySelect.disabled = true;
    subCategorySelect.innerHTML = '<option value="">Sélectionnez d\'abord une catégorie</option>';
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : laissez vide pour liens généraux --</option>';
    
    if (!categoryId) return;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    
    if (subCategories.length === 0) {
        showToast('Cette catégorie n\'a pas de sous-catégories', 'warning');
        return;
    }
    
    subCategorySelect.disabled = false;
    subCategorySelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        subCategories.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
}

function loadQASubSubCategories() {
    const categoryId = document.getElementById('qa-category-select')?.value;
    const subCategoryId = document.getElementById('qa-subcategory-select')?.value;
    const subSubCategorySelect = document.getElementById('qa-subsubcategory-select');
    
    if (!subSubCategorySelect) return;
    
    // Reset
    subSubCategorySelect.disabled = true;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : laissez vide pour liens généraux --</option>';
    
    if (!categoryId || !subCategoryId) return;
    
    const category = currentCategories.find(c => c._id === categoryId);
    if (!category) return;
    
    const subCategories = category.subCategories || category.sections || [];
    const subCategory = subCategories.find(s => s.id === subCategoryId);
    if (!subCategory) return;
    
    const subSubCategories = subCategory.subSubCategories || [];
    
    if (subSubCategories.length === 0) {
        subSubCategorySelect.innerHTML = '<option value="">Pas de sous-sous-catégories (liens généraux OK)</option>';
        return;
    }
    
    subSubCategorySelect.disabled = false;
    subSubCategorySelect.innerHTML = '<option value="">-- Optionnel : laissez vide pour liens généraux --</option>' +
        subSubCategories.map(subsub => `<option value="${subsub.id}">${subsub.name}</option>`).join('');
}

// Fonction corrigée : handleQASubmit
async function handleQASubmit(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('qa-category-select').value;
    const subCategoryId = document.getElementById('qa-subcategory-select').value;
    const subSubCategoryId = document.getElementById('qa-subsubcategory-select').value || '';
    const linksText = document.getElementById('qa-links-input').value;
    
    if (!categoryId || !subCategoryId) {
        showToast('Sélectionnez au moins une catégorie et une sous-catégorie', 'warning');
        return;
    }
    
    const links = parseLinks(linksText);
    
    if (links.length === 0) {
        showToast('Aucun lien valide détecté', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('qa-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Ajout en cours...';
    }
    
    try {
        // Si pas de sous-sous-catégorie, ajouter dans la sous-catégorie
        const payload = {
            categoryId,
            subCategoryId,
            links
        };
        
        // Ajouter subSubCategoryId seulement s'il existe
        if (subSubCategoryId) {
            payload.subSubCategoryId = subSubCategoryId;
        }
        
        const res = await fetch(`${API_URL}/api/admin/quick-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(`✅ ${data.message}`, 'success');
        
        // Reset
        document.getElementById('qa-links-input').value = '';
        document.getElementById('qa-link-counter').textContent = '0 liens détectés';
        document.getElementById('qa-link-counter').classList.remove('active');
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Ajouter tous les liens';
        }
    }
}

// ===================================
// EXPOSER GLOBALEMENT (IMPORTANT!)
// ===================================

window.loadSubCategoriesForLinks = loadSubCategoriesForLinks;
window.loadSubSubCategoriesForLinks = loadSubSubCategoriesForLinks;
window.loadLinksForLevel = loadLinksForLevel;
window.openLinkModal = openLinkModal;
window.loadQASubCategories = loadQASubCategories;
window.loadQASubSubCategories = loadQASubSubCategories;
window.handleQASubmit = handleQASubmit;

console.log('✅ Fonctions liens 3 niveaux chargées');






console.log('✅ Panel Admin Unifié chargé');
// =====================================================
// CODE COMPLET - Gestion Structure 3 niveaux
// À REMPLACER dans admin-unified.js
// Copie TOUT ce fichier à la fin de admin-unified.js
// =====================================================

// Variables globales
let currentStructureCategory = null;

// ===================================
// CHARGEMENT DE LA STRUCTURE
// ===================================

async function loadStructure() {
    const categoryId = document.getElementById('structure-category-select')?.value;
    const container = document.getElementById('structure-container');
    
    if (!container) return;
    
    if (!categoryId) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div><p>Sélectionnez une catégorie</p></div>';
        return;
    }
    
    currentStructureCategory = currentCategories.find(c => c._id === categoryId);
    if (!currentStructureCategory) return;
    
    renderStructureTree();
}

function renderStructureTree() {
    const container = document.getElementById('structure-container');
    if (!container || !currentStructureCategory) return;
    
    const subCategories = currentStructureCategory.subCategories || [];
    
    let html = '<div class="structure-tree">';
    
    if (subCategories.length === 0) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <p>Aucune sous-catégorie</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">Commencez par créer une sous-catégorie</p>
            </div>
        `;
    } else {
        subCategories.forEach((subCat) => {
            const subSubCats = subCat.subSubCategories || [];
            
            html += `
                <div class="tree-node level-1" data-subcat-id="${subCat.id}">
                    <div class="tree-header">
                        <span class="tree-icon">📂</span>
                        <span class="tree-name">${subCat.name}</span>
                        <div class="tree-actions">
                            <button class="btn btn-sm btn-success" onclick="openAddSubSubCategoryModal('${subCat.id}')" title="Ajouter sous-sous-catégorie">
                                ➕ Sous-sous-cat
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="openEditSubCategoryModal('${subCat.id}')" title="Modifier">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSubCategory('${subCat.id}', '${escapeHtml(subCat.name)}')" title="Supprimer">
                                🗑️
                            </button>
                        </div>
                    </div>
            `;
            
            if (subSubCats.length > 0) {
                html += '<div class="tree-children">';
                
                subSubCats.forEach(subSubCat => {
                    html += `
                        <div class="tree-node level-2" data-subsubcat-id="${subSubCat.id}">
                            <div class="tree-header">
                                <span class="tree-icon">📄</span>
                                <span class="tree-name">${subSubCat.name}</span>
                                <div class="tree-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="openEditSubSubCategoryModal('${subCat.id}', '${subSubCat.id}')" title="Modifier">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteSubSubCategory('${subCat.id}', '${subSubCat.id}', '${escapeHtml(subSubCat.name)}')" title="Supprimer">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    html += `
        <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="openAddSubCategoryModal()">
                ➕ Ajouter une sous-catégorie
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ===================================
// MODALS - SOUS-CATÉGORIES
// ===================================

function openAddSubCategoryModal() {
    document.getElementById('modal-subcategory-title').textContent = 'Nouvelle Sous-catégorie';
    document.getElementById('form-subcategory').reset();
    document.getElementById('subcategory-id').value = '';
    document.getElementById('subcategory-category-id').value = currentStructureCategory._id;
    
    openModal('modal-subcategory');
}

function openEditSubCategoryModal(subCatId) {
    const subCat = currentStructureCategory.subCategories?.find(s => s.id === subCatId);
    if (!subCat) return;
    
    document.getElementById('modal-subcategory-title').textContent = 'Modifier la sous-catégorie';
    document.getElementById('subcategory-id').value = subCat.id;
    document.getElementById('subcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subcategory-name').value = subCat.name;
    
    openModal('modal-subcategory');
}

async function handleSubCategorySubmit(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('subcategory-category-id').value;
    const subCatId = document.getElementById('subcategory-id').value;
    const name = document.getElementById('subcategory-name').value;
    
    try {
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        
        if (subCatId) {
            // Modification
            const index = subCategories.findIndex(s => s.id === subCatId);
            if (index !== -1) {
                subCategories[index].name = name;
            }
        } else {
            // Création
            subCategories.push({
                id: 'subcat_' + Date.now(),
                name: name,
                order: subCategories.length,
                subSubCategories: []
            });
        }
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(subCatId ? 'Sous-catégorie modifiée !' : 'Sous-catégorie créée !', 'success');
        closeModal('modal-subcategory');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function deleteSubCategory(subCatId, name) {
    if (!confirm(`Supprimer la sous-catégorie "${name}" ?\n\n⚠️ ATTENTION : Toutes les sous-sous-catégories et leurs liens seront supprimés !`)) return;
    
    try {
        const categoryId = currentStructureCategory._id;
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        subCategories = subCategories.filter(s => s.id !== subCatId);
        
        // Supprimer les liens associés
        await fetch(`${API_URL}/api/admin/links/batch-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                categoryId: categoryId,
                subCategoryId: subCatId
            })
        });
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Sous-catégorie supprimée', 'success');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// MODALS - SOUS-SOUS-CATÉGORIES
// ===================================

function openAddSubSubCategoryModal(subCatId) {
    document.getElementById('modal-subsubcategory-title').textContent = 'Nouvelle Sous-sous-catégorie';
    document.getElementById('form-subsubcategory').reset();
    document.getElementById('subsubcategory-id').value = '';
    document.getElementById('subsubcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subsubcategory-subcategory-id').value = subCatId;
    
    openModal('modal-subsubcategory');
}

function openEditSubSubCategoryModal(subCatId, subSubCatId) {
    const subCat = currentStructureCategory.subCategories?.find(s => s.id === subCatId);
    if (!subCat) return;
    
    const subSubCat = subCat.subSubCategories?.find(ss => ss.id === subSubCatId);
    if (!subSubCat) return;
    
    document.getElementById('modal-subsubcategory-title').textContent = 'Modifier la sous-sous-catégorie';
    document.getElementById('subsubcategory-id').value = subSubCat.id;
    document.getElementById('subsubcategory-category-id').value = currentStructureCategory._id;
    document.getElementById('subsubcategory-subcategory-id').value = subCatId;
    document.getElementById('subsubcategory-name').value = subSubCat.name;
    
    openModal('modal-subsubcategory');
}

async function handleSubSubCategorySubmit(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('subsubcategory-category-id').value;
    const subCatId = document.getElementById('subsubcategory-subcategory-id').value;
    const subSubCatId = document.getElementById('subsubcategory-id').value;
    const name = document.getElementById('subsubcategory-name').value;
    
    try {
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        const subCatIndex = subCategories.findIndex(s => s.id === subCatId);
        
        if (subCatIndex === -1) throw new Error('Sous-catégorie introuvable');
        
        let subSubCategories = subCategories[subCatIndex].subSubCategories || [];
        
        if (subSubCatId) {
            // Modification
            const index = subSubCategories.findIndex(ss => ss.id === subSubCatId);
            if (index !== -1) {
                subSubCategories[index].name = name;
            }
        } else {
            // Création
            subSubCategories.push({
                id: 'subsubcat_' + Date.now(),
                name: name,
                order: subSubCategories.length
            });
        }
        
        subCategories[subCatIndex].subSubCategories = subSubCategories;
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast(subSubCatId ? 'Sous-sous-catégorie modifiée !' : 'Sous-sous-catégorie créée !', 'success');
        closeModal('modal-subsubcategory');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function deleteSubSubCategory(subCatId, subSubCatId, name) {
    if (!confirm(`Supprimer la sous-sous-catégorie "${name}" ?\n\n⚠️ ATTENTION : Tous les liens seront supprimés !`)) return;
    
    try {
        const categoryId = currentStructureCategory._id;
        const category = currentCategories.find(c => c._id === categoryId);
        if (!category) throw new Error('Catégorie introuvable');
        
        let subCategories = category.subCategories || [];
        const subCatIndex = subCategories.findIndex(s => s.id === subCatId);
        
        if (subCatIndex === -1) throw new Error('Sous-catégorie introuvable');
        
        let subSubCategories = subCategories[subCatIndex].subSubCategories || [];
        subSubCategories = subSubCategories.filter(ss => ss.id !== subSubCatId);
        subCategories[subCatIndex].subSubCategories = subSubCategories;
        
        // Supprimer les liens
        await fetch(`${API_URL}/api/admin/links/batch-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                categoryId: categoryId,
                subCategoryId: subCatId,
                subSubCategoryId: subSubCatId
            })
        });
        
        // Mettre à jour la catégorie
        const res = await fetch(`${API_URL}/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'adminsgpi'
            },
            body: JSON.stringify({
                name: category.name,
                emoji: category.emoji,
                slug: category.slug,
                subCategories: subCategories
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Sous-sous-catégorie supprimée', 'success');
        
        await loadCategories();
        await loadStructure();
        
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

// ===================================
// UTILITAIRES
// ===================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ===================================
// INIT
// ===================================

function initStructureTab() {
    const select = document.getElementById('structure-category-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Choisir une catégorie --</option>' +
        currentCategories.map(cat => 
            `<option value="${cat._id}">${cat.emoji} ${cat.name}</option>`
        ).join('');
}

// Hook dans loadCategories
document.addEventListener('DOMContentLoaded', function() {
    const originalLoadCat = window.loadCategories;
    if (originalLoadCat) {
        window.loadCategories = async function() {
            await originalLoadCat();
            initStructureTab();
        };
    }
});

// ===================================
// EXPOSER GLOBALEMENT (CRITIQUE!)
// ===================================

window.loadStructure = loadStructure;
window.openAddSubCategoryModal = openAddSubCategoryModal;
window.openEditSubCategoryModal = openEditSubCategoryModal;
window.handleSubCategorySubmit = handleSubCategorySubmit;
window.deleteSubCategory = deleteSubCategory;
window.openAddSubSubCategoryModal = openAddSubSubCategoryModal;
window.openEditSubSubCategoryModal = openEditSubSubCategoryModal;
window.handleSubSubCategorySubmit = handleSubSubCategorySubmit;
window.deleteSubSubCategory = deleteSubSubCategory;

console.log('✅ Gestion structure 3 niveaux chargée - COMPLET');
