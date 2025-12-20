// Script pour la gestion de l'administration
class AdminManager {
    constructor() {
        this.currentUser = null;
        this.formations = [];
        this.inscriptions = [];
        this.users = [];
        this.init();
    }

    async init() {
        this.checkAdminAuth();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    checkAdminAuth() {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            // Vérifier si l'utilisateur est admin
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== 'admin') {
                alert('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
                window.location.href = 'index.html';
                return;
            }
            
            this.currentUser = user;
            this.updateUserInfo();
        });
    }

    updateUserInfo() {
        const userInfoEl = document.getElementById('adminUserInfo');
        if (userInfoEl && this.currentUser) {
            userInfoEl.innerHTML = `
                <div class="user-dropdown">
                    <img src="${this.currentUser.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg'}" 
                         alt="Admin" class="user-avatar">
                    <span>${this.currentUser.displayName || 'Administrateur'}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href');
                this.showSection(target);
            });
        });

        // Modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        // Logout
        document.getElementById('logoutAdmin').addEventListener('click', () => {
            logoutUser();
        });

        // Add formation
        document.getElementById('addFormationBtn').addEventListener('click', () => {
            this.showAddFormationModal();
        });

        // Refresh data
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Formation form
        document.getElementById('formationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFormation();
        });
    }

    async loadDashboardData() {
        try {
            // Load formations count
            const formationsSnapshot = await db.collection('formations')
                .where('status', '==', 'active')
                .get();
            document.getElementById('totalFormations').textContent = formationsSnapshot.size;

            // Load inscriptions count
            const inscriptionsSnapshot = await db.collection('inscriptions').get();
            document.getElementById('totalInscriptions').textContent = inscriptionsSnapshot.size;

            // Load users count
            const usersSnapshot = await db.collection('users').get();
            document.getElementById('totalUsers').textContent = usersSnapshot.size;

            // Load revenue
            const revenueSnapshot = await db.collection('paiements')
                .where('status', '==', 'completed')
                .where('date', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                .get();
            
            let totalRevenue = 0;
            revenueSnapshot.forEach(doc => {
                totalRevenue += parseFloat(doc.data().amount || 0);
            });
            document.getElementById('totalRevenue').textContent = `${totalRevenue}€`;

            // Load recent inscriptions
            this.loadRecentInscriptions();

            // Load recent activity
            this.loadRecentActivity();

            // Load chart data
            this.loadChartData();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Erreur lors du chargement des données', 'error');
        }
    }

    async loadRecentInscriptions() {
        try {
            const snapshot = await db.collection('inscriptions')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            const tbody = document.getElementById('recentInscriptions');
            tbody.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();
                const row = `
                    <tr>
                        <td>${data.nom} ${data.prenom}</td>
                        <td>${data.formation}</td>
                        <td>${new Date(data.createdAt?.toDate()).toLocaleDateString()}</td>
                        <td><span class="status-badge status-${data.statut || 'pending'}">${data.statut || 'En attente'}</span></td>
                        <td>
                            <button class="btn-icon" onclick="admin.viewInscription('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="admin.editInscription('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });

        } catch (error) {
            console.error('Error loading recent inscriptions:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const snapshot = await db.collection('activity')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const container = document.getElementById('recentActivity');
            container.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();
                const activity = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-${data.icon || 'bell'}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${data.message}</p>
                            <small>${new Date(data.timestamp?.toDate()).toLocaleString()}</small>
                        </div>
                    </div>
                `;
                container.innerHTML += activity;
            });

        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    loadChartData() {
        const ctx = document.getElementById('formationsChart').getContext('2d');
        
        // Données d'exemple
        const data = {
            labels: ['Développement', 'Data Science', 'Cybersécurité', 'Marketing', 'Management'],
            datasets: [{
                data: [30, 20, 15, 20, 15],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12',
                    '#9b59b6'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Show target section
        const targetSection = document.querySelector(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Add active class to clicked link
        const activeLink = document.querySelector(`.sidebar-nav a[href="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load section data
        switch(sectionId) {
            case '#liste-formations':
                this.loadFormations();
                break;
            case '#inscriptions-admin':
                this.loadAllInscriptions();
                break;
            case '#utilisateurs':
                this.loadUsers();
                break;
        }
    }

    async loadFormations() {
        try {
            const snapshot = await db.collection('formations').get();
            this.formations = [];
            
            const tbody = document.getElementById('formationsTable');
            tbody.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();
                this.formations.push({ id: doc.id, ...data });
                
                const row = `
                    <tr>
                        <td>
                            <div class="table-image">
                                <img src="${data.imageUrl || 'https://via.placeholder.com/50'}" 
                                     alt="${data.title}">
                            </div>
                        </td>
                        <td>${data.title}</td>
                        <td><span class="category-badge">${data.category}</span></td>
                        <td>${data.price}€</td>
                        <td>${data.places}</td>
                        <td>
                            <span class="status-badge status-${data.status}">
                                ${data.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                        </td>
                        <td>${data.inscriptionCount || 0}</td>
                        <td>
                            <button class="btn-icon" onclick="admin.editFormation('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="admin.deleteFormation('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });

        } catch (error) {
            console.error('Error loading formations:', error);
            this.showNotification('Erreur lors du chargement des formations', 'error');
        }
    }

    showAddFormationModal() {
        document.getElementById('modalTitle').textContent = 'Ajouter une formation';
        document.getElementById('formationForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('formationModal').style.display = 'flex';
        this.loadCategories();
    }

    async loadCategories() {
        try {
            const snapshot = await db.collection('categories').get();
            const select = document.getElementById('formationCategory');
            select.innerHTML = '<option value="">Sélectionner...</option>';
            
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async saveFormation() {
        const submitBtn = document.getElementById('saveFormationBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enregistrement...';

        try {
            const formationData = {
                title: document.getElementById('formationTitle').value,
                category: document.getElementById('formationCategory').value,
                description: document.getElementById('formationDescription').value,
                duration: parseInt(document.getElementById('formationDuration').value),
                places: parseInt(document.getElementById('formationPlaces').value),
                price: parseFloat(document.getElementById('formationPrice').value),
                status: document.getElementById('formationStatus').value,
                content: document.getElementById('formationContent').value,
                prerequisites: document.getElementById('formationPrerequisites').value,
                updatedAt: new Date()
            };

            // Handle image upload
            const imageFile = document.getElementById('formationImage').files[0];
            if (imageFile) {
                const storageRef = storage.ref();
                const imageRef = storageRef.child(`formations/${Date.now()}_${imageFile.name}`);
                const snapshot = await imageRef.put(imageFile);
                const downloadURL = await snapshot.ref.getDownloadURL();
                formationData.imageUrl = downloadURL;
            }

            // Save to Firestore
            await db.collection('formations').add(formationData);

            this.showNotification('Formation enregistrée avec succès', 'success');
            this.hideModal();
            this.loadFormations();
            this.loadDashboardData();

        } catch (error) {
            console.error('Error saving formation:', error);
            this.showNotification('Erreur lors de l\'enregistrement', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async deleteFormation(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
            return;
        }

        try {
            await db.collection('formations').doc(id).delete();
            this.showNotification('Formation supprimée avec succès', 'success');
            this.loadFormations();
            this.loadDashboardData();

        } catch (error) {
            console.error('Error deleting formation:', error);
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    hideModal() {
        document.getElementById('formationModal').style.display = 'none';
    }

    // Méthodes pour les inscriptions et utilisateurs
    async loadAllInscriptions() {
        // Implémentation similaire à loadFormations
    }

    async loadUsers() {
        // Implémentation similaire à loadFormations
    }

    viewInscription(id) {
        // Voir les détails d'une inscription
    }

    editInscription(id) {
        // Modifier une inscription
    }

    editFormation(id) {
        // Modifier une formation
        const formation = this.formations.find(f => f.id === id);
        if (formation) {
            document.getElementById('modalTitle').textContent = 'Modifier la formation';
            document.getElementById('formationTitle').value = formation.title;
            document.getElementById('formationDescription').value = formation.description;
            // Remplir les autres champs...
            document.getElementById('formationModal').style.display = 'flex';
            this.loadCategories();
        }
    }
}

// Initialiser l'admin
const admin = new AdminManager();