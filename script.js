const API_URL = 'https://backend-wiki-zaxy.onrender.com';

// ===================================
// VÉRIFICATION ACCÈS
// ===================================

async function checkAuth() {
    const token = localStorage.getItem('wiki_access_token');
    const expiry = localStorage.getItem('wiki_access_expiry');
    
    if (!token) {
        window.location.href = 'auth.html';
        return false;
    }
    
    if (expiry && Date.now() > new Date(expiry).getTime()) {
        localStorage.removeItem('wiki_access_token');
        localStorage.removeItem('wiki_access_expiry');
        localStorage.removeItem('wiki_username');
        window.location.href = 'auth.html';
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Session invalide');
        }
        
        return true;
        
    } catch (error) {
        console.error('Erreur vérification session:', error);
        localStorage.removeItem('wiki_access_token');
        localStorage.removeItem('wiki_access_expiry');
        localStorage.removeItem('wiki_username');
        window.location.href = 'auth.html';
        return false;
    }
}

// Vérifier l'auth SAUF sur les pages auth, register ET account
// (account.html a sa propre vérification intégrée)
const currentPath = window.location.pathname;
if (!currentPath.includes('auth.html') && 
    !currentPath.includes('register.html') &&
    !currentPath.includes('account.html')) {
    checkAuth();
}

// ===================================
// INITIALISATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearch();
    initBackToTop();
    initMobileMenu();
    initSmoothScroll();
    initLogout();
    displayUsername();
});

// ===================================
// AFFICHER PSEUDO
// ===================================

function displayUsername() {
    const username = localStorage.getItem('wiki_username');
    if (username) {
        const header = document.querySelector('.header-actions');
        if (header) {
            const userSpan = document.createElement('span');
            userSpan.style.marginRight = '16px';
            userSpan.style.color = 'var(--text-secondary)';
            userSpan.style.fontSize = '0.9rem';
            userSpan.textContent = `👤 ${username}`;
            header.insertBefore(userSpan, header.firstChild);
        }
    }
}

// ===================================
// DÉCONNEXION
// ===================================

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('wiki_access_token');
            
            if (token) {
                try {
                    await fetch(`${API_URL}/api/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                } catch (error) {
                    console.error('Erreur déconnexion:', error);
                }
            }
            
            localStorage.removeItem('wiki_access_token');
            localStorage.removeItem('wiki_access_expiry');
            localStorage.removeItem('wiki_username');
            
            window.location.href = 'auth.html';
        });
    }
}

// ===================================
// THÈME DARK/LIGHT
// ===================================

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.className = `${savedTheme}-mode`;
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
}

// ===================================
// RECHERCHE
// ===================================

function initSearch() {
    const searchInput = document.getElementById('search');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            const resourceListItems = document.querySelectorAll('.resource-list li');
            resourceListItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
            
            const resourceItems = document.querySelectorAll('.resource-item');
            resourceItems.forEach(resource => {
                const title = resource.querySelector('.resource-title')?.textContent.toLowerCase() || '';
                const description = resource.querySelector('.resource-description')?.textContent.toLowerCase() || '';
                
                if (title.includes(query) || description.includes(query)) {
                    resource.classList.remove('hidden');
                } else {
                    resource.classList.add('hidden');
                }
            });
        });
    }
}

// ===================================
// BACK TO TOP
// ===================================

function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    
    if (btn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        });
        
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ===================================
// MOBILE MENU
// ===================================

function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && e.target !== menuToggle) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
}

// ===================================
// SMOOTH SCROLL
// ===================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}
