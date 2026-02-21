// ===================================
// SIDEBAR DYNAMIQUE
// ===================================

async function loadDynamicSidebar() {
    const sidebar = document.querySelector('.nav-categories ul');
    
    if (!sidebar) {
        console.warn('Sidebar non trouvée dans le DOM');
        return;
    }
    
    // Afficher un loader
    sidebar.innerHTML = '<li style="padding: 12px; color: var(--text-secondary);">Chargement...</li>';
    
    try {
        const res = await fetch(`${API_URL}/api/categories`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
        
        if (!data.categories || data.categories.length === 0) {
            sidebar.innerHTML = '<li style="padding: 12px; color: var(--text-secondary);">Aucune catégorie</li>';
            return;
        }
        
        // Générer le HTML de la sidebar
        sidebar.innerHTML = data.categories.map(cat => `
            <li>
                <a href="category.html?slug=${cat.slug}" ${window.location.search.includes(cat.slug) ? 'class="active"' : ''}>
                    ${cat.emoji} ${cat.name}
                </a>
            </li>
        `).join('');
        
        // Ajouter un style actif si on est sur la page
        highlightActivePage();
        
    } catch (err) {
        console.error('Erreur chargement sidebar:', err);
        sidebar.innerHTML = `
            <li style="padding: 12px; color: #ef4444;">
                ❌ Erreur de chargement
            </li>
        `;
    }
}

// Mettre en surbrillance la catégorie active
function highlightActivePage() {
    const currentSlug = new URLSearchParams(window.location.search).get('slug');
    
    if (!currentSlug) return;
    
    const links = document.querySelectorAll('.nav-categories a');
    
    links.forEach(link => {
        if (link.href.includes(`slug=${currentSlug}`)) {
            link.style.background = 'var(--bg-hover)';
            link.style.borderLeft = '4px solid var(--accent)';
            link.style.paddingLeft = '12px';
            link.style.fontWeight = '600';
            link.style.color = 'var(--accent)';
        }
    });
}

// Charger automatiquement au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicSidebar);
} else {
    loadDynamicSidebar();
}
