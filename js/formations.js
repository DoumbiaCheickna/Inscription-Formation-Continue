// Gestion des formations
class FormationManager {
    constructor() {
        this.formations = [];
        this.categories = [];
    }

    async loadFormations(limit = null) {
        try {
            let query = db.collection('formations')
                .where('status', '==', 'active');
            
            if (limit) {
                query = query.limit(limit);
            }
            
            const snapshot = await query.get();
            this.formations = [];
            
            snapshot.forEach(doc => {
                this.formations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return this.formations;

        } catch (error) {
            console.error('Error loading formations:', error);
            return [];
        }
    }

    async loadFeaturedFormations() {
        const formations = await this.loadFormations(3);
        this.displayFormations(formations, 'featuredFormations');
    }

    async loadAllFormations() {
        const formations = await this.loadFormations();
        this.displayFormations(formations, 'formationsGrid');
    }

    displayFormations(formations, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        formations.forEach(formation => {
            const card = this.createFormationCard(formation);
            container.innerHTML += card;
        });

        // Ajouter les événements aux boutons
        this.addFormationEventListeners();
    }

    createFormationCard(formation) {
        return `
            <div class="formation-card" data-id="${formation.id}">
                <div class="formation-image" style="background-color: ${this.getCategoryColor(formation.category)};">
                    <i class="${this.getCategoryIcon(formation.category)}"></i>
                </div>
                <div class="formation-content">
                    <span class="formation-category">${formation.category}</span>
                    <h3 class="formation-title">${formation.title}</h3>
                    <p class="formation-description">${formation.description.substring(0, 100)}...</p>
                    <div class="formation-details">
                        <span><i class="far fa-clock"></i> ${formation.duration} heures</span>
                        <span><i class="fas fa-calendar-alt"></i> ${this.getDurationText(formation.duration)}</span>
                        <span><i class="fas fa-user-friends"></i> ${formation.places} places</span>
                    </div>
                    <div class="formation-price">${formation.price} €</div>
                    <button class="inscription-btn" data-id="${formation.id}">
                        S'inscrire à cette formation
                    </button>
                    <button class="btn-details" data-id="${formation.id}">
                        <i class="fas fa-info-circle"></i> Détails
                    </button>
                </div>
            </div>
        `;
    }

    getCategoryColor(category) {
        const colors = {
            'Développement': '#3498db',
            'Data Science': '#2ecc71',
            'Cybersécurité': '#e74c3c',
            'Marketing': '#f39c12',
            'Management': '#9b59b6',
            'Design': '#1abc9c'
        };
        return colors[category] || '#3498db';
    }

    getCategoryIcon(category) {
        const icons = {
            'Développement': 'fas fa-laptop-code',
            'Data Science': 'fas fa-chart-bar',
            'Cybersécurité': 'fas fa-shield-alt',
            'Marketing': 'fas fa-bullhorn',
            'Management': 'fas fa-briefcase',
            'Design': 'fas fa-palette'
        };
        return icons[category] || 'fas fa-book';
    }

    getDurationText(hours) {
        const weeks = Math.ceil(hours / 20); // 20h par semaine
        return weeks > 1 ? `${weeks} semaines` : '1 semaine';
    }

    addFormationEventListeners() {
        // Boutons d'inscription
        document.querySelectorAll('.inscription-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const formationId = e.target.getAttribute('data-id');
                this.handleInscription(formationId);
            });
        });

        // Boutons de détails
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const formationId = e.target.getAttribute('data-id');
                this.showFormationDetails(formationId);
            });
        });
    }

    async handleInscription(formationId) {
        // Vérifier si l'utilisateur est connecté
        if (!auth.currentUser) {
            if (confirm('Vous devez être connecté pour vous inscrire. Voulez-vous vous connecter ?')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // Rediriger vers la page d'inscription avec l'ID de la formation
        window.location.href = `inscription.html?formation=${formationId}`;
    }

    async showFormationDetails(formationId) {
        try {
            const formation = this.formations.find(f => f.id === formationId);
            if (!formation) {
                const doc = await db.collection('formations').doc(formationId).get();
                formation = { id: doc.id, ...doc.data() };
            }

            this.showDetailsModal(formation);

        } catch (error) {
            console.error('Error loading formation details:', error);
        }
    }

    showDetailsModal(formation) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="formation-details-modal">
                    <div class="formation-header" style="background-color: ${this.getCategoryColor(formation.category)};">
                        <h2>${formation.title}</h2>
                        <span class="formation-category">${formation.category}</span>
                    </div>
                    <div class="formation-body">
                        <div class="formation-info-grid">
                            <div class="info-item">
                                <i class="far fa-clock"></i>
                                <div>
                                    <strong>Durée</strong>
                                    <p>${formation.duration} heures (${this.getDurationText(formation.duration)})</p>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-users"></i>
                                <div>
                                    <strong>Places disponibles</strong>
                                    <p>${formation.places} places</p>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-euro-sign"></i>
                                <div>
                                    <strong>Prix</strong>
                                    <p>${formation.price} €</p>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-chalkboard-teacher"></i>
                                <div>
                                    <strong>Format</strong>
                                    <p>${formation.format || 'Présentiel/Distanciel'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="formation-section">
                            <h3><i class="fas fa-book-open"></i> Description</h3>
                            <p>${formation.description}</p>
                        </div>
                        
                        ${formation.content ? `
                        <div class="formation-section">
                            <h3><i class="fas fa-list"></i> Programme</h3>
                            <div class="formation-content">${formation.content}</div>
                        </div>
                        ` : ''}
                        
                        ${formation.prerequisites ? `
                        <div class="formation-section">
                            <h3><i class="fas fa-graduation-cap"></i> Prérequis</h3>
                            <p>${formation.prerequisites}</p>
                        </div>
                        ` : ''}
                        
                        <div class="formation-actions">
                            <button class="btn btn-primary" onclick="formationsManager.handleInscription('${formation.id}')">
                                <i class="fas fa-user-plus"></i> S'inscrire maintenant
                            </button>
                            <button class="btn btn-outline close-modal">
                                <i class="fas fa-times"></i> Fermer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Fermer le modal
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Fermer en cliquant en dehors
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async loadCategories() {
        try {
            const snapshot = await db.collection('categories').get();
            this.categories = [];
            
            snapshot.forEach(doc => {
                this.categories.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return this.categories;

        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    }
}

// Initialiser le manager des formations
const formationsManager = new FormationManager();

// Fonctions globales
async function loadFeaturedFormations() {
    return await formationsManager.loadFeaturedFormations();
}

async function loadAllFormations() {
    return await formationsManager.loadAllFormations();
}