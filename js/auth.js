// Gestion de l'authentification Firebase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Écouter les changements d'authentification
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
        });
    }

    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        
        if (!authButtons && !userMenu) return;

        if (this.currentUser) {
            // Utilisateur connecté
            if (authButtons) {
                authButtons.innerHTML = `
                    <div class="user-dropdown">
                        <img src="${this.currentUser.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg'}" 
                             alt="Profil" class="user-avatar">
                        <span>${this.currentUser.displayName || 'Utilisateur'}</span>
                        <i class="fas fa-chevron-down"></i>
                        <div class="dropdown-menu">
                            <a href="dashboard.html"><i class="fas fa-user"></i> Mon compte</a>
                            <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Déconnexion</a>
                        </div>
                    </div>
                `;
            }
            
            if (userMenu) {
                userMenu.innerHTML = `
                    <div class="user-dropdown">
                        <img src="${this.currentUser.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg'}" 
                             alt="Profil" class="user-avatar">
                        <div class="dropdown-menu">
                            <a href="dashboard.html"><i class="fas fa-user"></i> ${this.currentUser.displayName || 'Utilisateur'}</a>
                            <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Déconnexion</a>
                        </div>
                    </div>
                `;
            }
            
            // Ajouter l'événement de déconnexion
            setTimeout(() => {
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.logout();
                    });
                }
            }, 100);
            
        } else {
            // Utilisateur non connecté
            if (authButtons) {
                authButtons.innerHTML = `
                    <a href="login.html" class="btn btn-outline">Connexion</a>
                    <a href="register.html" class="btn btn-primary">Inscription</a>
                `;
            }
            
            if (userMenu) {
                userMenu.innerHTML = `
                    <a href="login.html" class="btn btn-outline">Connexion</a>
                    <a href="register.html" class="btn btn-primary">Inscription</a>
                `;
            }
        }
    }

    async register(email, password, userData) {
        try {
            // Créer l'utilisateur
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Mettre à jour le profil
            await userCredential.user.updateProfile({
                displayName: `${userData.prenom} ${userData.nom}`
            });

            // Enregistrer les informations supplémentaires dans Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                ...userData,
                email: email,
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return userCredential.user;

        } catch (error) {
            throw new Error(this.getErrorMessage(error.code));
        }
    }

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            throw new Error(this.getErrorMessage(error.code));
        }
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await auth.signInWithPopup(provider);
            
            // Vérifier si l'utilisateur existe déjà dans Firestore
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            
            if (!userDoc.exists) {
                // Créer un nouveau document utilisateur
                await db.collection('users').doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    nom: userCredential.user.displayName?.split(' ')[1] || '',
                    prenom: userCredential.user.displayName?.split(' ')[0] || '',
                    role: 'user',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            
            return userCredential.user;
        } catch (error) {
            throw new Error(this.getErrorMessage(error.code));
        }
    }

    async logout() {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    }

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            throw new Error(this.getErrorMessage(error.code));
        }
    }

    getErrorMessage(errorCode) {
        const messages = {
            'auth/email-already-in-use': 'Cet email est déjà utilisé.',
            'auth/invalid-email': 'Email invalide.',
            'auth/operation-not-allowed': 'Opération non autorisée.',
            'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
            'auth/user-disabled': 'Ce compte a été désactivé.',
            'auth/user-not-found': 'Aucun compte avec cet email.',
            'auth/wrong-password': 'Mot de passe incorrect.',
            'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
            'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.'
        };
        
        return messages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
    }
}

// Initialiser l'authentification
const authManager = new AuthManager();

// Exporter les fonctions
async function registerUser(email, password, userData) {
    return await authManager.register(email, password, userData);
}

async function loginUser(email, password) {
    return await authManager.login(email, password);
}

async function loginWithGoogle() {
    return await authManager.loginWithGoogle();
}

async function logoutUser() {
    return await authManager.logout();
}

async function resetPassword(email) {
    return await authManager.resetPassword(email);
}