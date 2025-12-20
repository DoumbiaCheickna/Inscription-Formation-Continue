// Gestion des inscriptions
class InscriptionManager {
    constructor() {
        this.currentStep = 1;
        this.selectedFormation = null;
        this.formData = {};
    }

    async init() {
        this.loadFormations();
        this.setupEventListeners();
        this.loadFromUrl();
    }

    async loadFormations() {
        try {
            const snapshot = await db.collection('formations')
                .where('status', '==', 'active')
                .get();
            
            const select = document.getElementById('formation');
            if (!select) return;
            
            select.innerHTML = '<option value="">Sélectionnez une formation</option>';
            
            snapshot.forEach(doc => {
                const formation = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${formation.title} - ${formation.price}€`;
                option.dataset.formation = JSON.stringify({
                    id: doc.id,
                    ...formation
                });
                select.appendChild(option);
            });
            
            // Sélectionner la formation depuis l'URL
            this.selectFormationFromUrl();
            
        } catch (error) {
            console.error('Error loading formations:', error);
        }
    }

    loadFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const formationId = urlParams.get('formation');
        
        if (formationId) {
            this.selectedFormationId = formationId;
        }
    }

    async selectFormationFromUrl() {
        if (!this.selectedFormationId) return;
        
        const select = document.getElementById('formation');
        if (!select) return;
        
        // Trouver l'option correspondante
        for (let option of select.options) {
            if (option.value === this.selectedFormationId) {
                select.value = this.selectedFormationId;
                this.handleFormationChange();
                break;
            }
        }
    }

    setupEventListeners() {
        // Navigation des étapes
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                this.goToStep(nextStep);
            });
        });
        
        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                this.goToStep(prevStep);
            });
        });
        
        // Changement de formation
        const formationSelect = document.getElementById('formation');
        if (formationSelect) {
            formationSelect.addEventListener('change', () => {
                this.handleFormationChange();
            });
        }
        
        // Changement de financement
        const financementSelect = document.getElementById('financement');
        if (financementSelect) {
            financementSelect.addEventListener('change', () => {
                this.handleFinancementChange();
            });
        }
        
        // Soumission du formulaire
        const form = document.getElementById('inscriptionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitInscription();
            });
        }
        
        // Validation en temps réel
        this.setupRealTimeValidation();
    }

    goToStep(step) {
        // Valider l'étape courante
        if (!this.validateStep(this.currentStep)) {
            return;
        }
        
        // Sauvegarder les données de l'étape
        this.saveStepData(this.currentStep);
        
        // Cacher l'étape courante
        document.getElementById(`step${this.currentStep}`).classList.remove('active');
        document.querySelector(`.step[data-step="${this.currentStep}"]`).classList.remove('active');
        
        // Afficher la nouvelle étape
        this.currentStep = step;
        document.getElementById(`step${step}`).classList.add('active');
        document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
        
        // Mettre à jour le résumé si c'est la dernière étape
        if (step === 4) {
            this.updateSummary();
        }
    }

    validateStep(step) {
        let isValid = true;
        
        switch(step) {
            case 1:
                // Valider les informations personnelles
                const requiredFields = ['nom', 'prenom', 'email', 'telephone'];
                requiredFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (!field || !field.value.trim()) {
                        isValid = false;
                        this.showFieldError(field, 'Ce champ est obligatoire');
                    } else {
                        this.clearFieldError(field);
                    }
                    
                    // Validation spécifique de l'email
                    if (fieldId === 'email' && field.value) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(field.value)) {
                            isValid = false;
                            this.showFieldError(field, 'Email invalide');
                        }
                    }
                });
                break;
                
            case 2:
                // Valider le choix de la formation
                const formationSelect = document.getElementById('formation');
                const modeInputs = document.querySelectorAll('input[name="mode"]:checked');
                const sessionSelect = document.getElementById('session');
                
                if (!formationSelect || !formationSelect.value) {
                    isValid = false;
                    this.showFieldError(formationSelect, 'Veuillez sélectionner une formation');
                } else {
                    this.clearFieldError(formationSelect);
                }
                
                if (modeInputs.length === 0) {
                    isValid = false;
                    const radioGroup = document.querySelector('.radio-group');
                    this.showFieldError(radioGroup, 'Veuillez sélectionner un mode de formation');
                } else {
                    const radioGroup = document.querySelector('.radio-group');
                    this.clearFieldError(radioGroup);
                }
                
                if (!sessionSelect || !sessionSelect.value) {
                    isValid = false;
                    this.showFieldError(sessionSelect, 'Veuillez sélectionner une session');
                } else {
                    this.clearFieldError(sessionSelect);
                }
                break;
                
            case 3:
                // Valider le financement
                const financementSelect = document.getElementById('financement');
                if (!financementSelect || !financementSelect.value) {
                    isValid = false;
                    this.showFieldError(financementSelect, 'Veuillez sélectionner un mode de financement');
                } else {
                    this.clearFieldError(financementSelect);
                }
                break;
        }
        
        if (!isValid) {
            this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
        }
        
        return isValid;
    }

    showFieldError(field, message) {
        field.style.borderColor = 'var(--danger-color)';
        
        // Ajouter ou mettre à jour le message d'erreur
        let errorSpan = field.nextElementSibling;
        if (!errorSpan || !errorSpan.classList.contains('error-message')) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'error-message';
            field.parentNode.insertBefore(errorSpan, field.nextSibling);
        }
        
        errorSpan.textContent = message;
        errorSpan.style.color = 'var(--danger-color)';
        errorSpan.style.fontSize = '14px';
        errorSpan.style.marginTop = '5px';
        errorSpan.style.display = 'block';
    }

    clearFieldError(field) {
        field.style.borderColor = '';
        
        const errorSpan = field.nextElementSibling;
        if (errorSpan && errorSpan.classList.contains('error-message')) {
            errorSpan.remove();
        }
    }

    showNotification(message, type = 'info') {
        // Créer une notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Style de la notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            backgroundColor: type === 'error' ? 'var(--danger-color)' : 
                          type === 'success' ? 'var(--success-color)' : 
                          'var(--secondary-color)',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: '300px',
            maxWidth: '500px'
        });
        
        document.body.appendChild(notification);
        
        // Auto-remove après 5 secondes
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Bouton de fermeture
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    async handleFormationChange() {
        const select = document.getElementById('formation');
        if (!select || !select.value) return;
        
        try {
            // Récupérer les données de la formation
            const option = select.selectedOptions[0];
            const formationData = JSON.parse(option.dataset.formation);
            this.selectedFormation = formationData;
            
            // Mettre à jour la carte de formation
            this.updateFormationCard(formationData);
            
        } catch (error) {
            console.error('Error loading formation details:', error);
        }
    }

    updateFormationCard(formation) {
        const container = document.getElementById('selectedFormationCard');
        if (!container) return;
        
        container.innerHTML = `
            <div class="selected-formation-content">
                <div class="formation-card-header">
                    <h3>${formation.title}</h3>
                    <span class="formation-price">${formation.price}€</span>
                </div>
                <div class="formation-card-details">
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>${formation.duration} heures</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${formation.places} places disponibles</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${formation.category}</span>
                    </div>
                </div>
                <p class="formation-card-description">${formation.description.substring(0, 150)}...</p>
            </div>
        `;
    }

    handleFinancementChange() {
        const select = document.getElementById('financement');
        const detailsContainer = document.getElementById('financementDetails');
        
        if (!select || !detailsContainer) return;
        
        const value = select.value;
        let detailsHTML = '';
        
        switch(value) {
            case 'entreprise':
                detailsHTML = `
                    <div class="financement-info">
                        <p><strong>Financement entreprise :</strong></p>
                        <p>Votre entreprise prend en charge tout ou partie du coût de la formation.</p>
                        <div class="form-group">
                            <label for="entrepriseContact">Contact RH / Formation</label>
                            <input type="text" id="entrepriseContact">
                        </div>
                        <div class="form-group">
                            <label for="entrepriseEmail">Email du contact</label>
                            <input type="email" id="entrepriseEmail">
                        </div>
                    </div>
                `;
                break;
                
            case 'cpf':
                detailsHTML = `
                    <div class="financement-info">
                        <p><strong>Compte Personnel de Formation (CPF) :</strong></p>
                        <p>Utilisez vos heures de formation disponibles sur votre compte CPF.</p>
                        <div class="form-group">
                            <label for="cpfNumber">Numéro CPF</label>
                            <input type="text" id="cpfNumber">
                        </div>
                    </div>
                `;
                break;
                
            case 'pole_emploi':
                detailsHTML = `
                    <div class="financement-info">
                        <p><strong>Financement Pôle Emploi :</strong></p>
                        <p>Pour les demandeurs d'emploi, des aides peuvent être disponibles.</p>
                        <div class="form-group">
                            <label for="poleEmploiId">Identifiant Pôle Emploi</label>
                            <input type="text" id="poleEmploiId">
                        </div>
                    </div>
                `;
                break;
                
            case 'autre':
                detailsHTML = `
                    <div class="financement-info">
                        <div class="form-group">
                            <label for="autreFinancement">Précisez le mode de financement</label>
                            <input type="text" id="autreFinancement">
                        </div>
                    </div>
                `;
                break;
        }
        
        detailsContainer.innerHTML = detailsHTML;
    }

    saveStepData(step) {
        switch(step) {
            case 1:
                this.formData.personal = {
                    nom: document.getElementById('nom').value,
                    prenom: document.getElementById('prenom').value,
                    email: document.getElementById('email').value,
                    telephone: document.getElementById('telephone').value,
                    adresse: document.getElementById('adresse').value,
                    ville: document.getElementById('ville').value,
                    codePostal: document.getElementById('codePostal').value,
                    pays: document.getElementById('pays').value
                };
                break;
                
            case 2:
                this.formData.formation = {
                    id: document.getElementById('formation').value,
                    titre: this.selectedFormation?.title || '',
                    mode: document.querySelector('input[name="mode"]:checked')?.value || '',
                    session: document.getElementById('session').value
                };
                break;
                
            case 3:
                this.formData.financement = {
                    type: document.getElementById('financement').value,
                    entreprise: document.getElementById('entreprise').value,
                    entrepriseContact: document.getElementById('entrepriseContact')?.value || '',
                    entrepriseEmail: document.getElementById('entrepriseEmail')?.value || '',
                    cpfNumber: document.getElementById('cpfNumber')?.value || '',
                    poleEmploiId: document.getElementById('poleEmploiId')?.value || '',
                    autreFinancement: document.getElementById('autreFinancement')?.value || '',
                    message: document.getElementById('message').value
                };
                break;
        }
    }

    updateSummary() {
        // Informations personnelles
        const personal = this.formData.personal || {};
        document.getElementById('summaryPersonal').innerHTML = `
            <p><strong>Nom :</strong> ${personal.nom} ${personal.prenom}</p>
            <p><strong>Email :</strong> ${personal.email}</p>
            <p><strong>Téléphone :</strong> ${personal.telephone}</p>
            ${personal.adresse ? `<p><strong>Adresse :</strong> ${personal.adresse}, ${personal.codePostal} ${personal.ville}, ${personal.pays}</p>` : ''}
        `;
        
        // Formation
        const formation = this.formData.formation || {};
        document.getElementById('summaryFormation').innerHTML = `
            <p><strong>Formation :</strong> ${formation.titre}</p>
            <p><strong>Mode :</strong> ${formation.mode}</p>
            <p><strong>Session :</strong> ${formation.session ? new Date(formation.session).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}</p>
        `;
        
        // Financement
        const financement = this.formData.financement || {};
        let financementText = `<p><strong>Mode de financement :</strong> ${this.getFinancementLabel(financement.type)}</p>`;
        
        if (financement.entreprise) {
            financementText += `<p><strong>Entreprise :</strong> ${financement.entreprise}</p>`;
        }
        
        if (financement.message) {
            financementText += `<p><strong>Informations complémentaires :</strong> ${financement.message}</p>`;
        }
        
        document.getElementById('summaryFinancement').innerHTML = financementText;
    }

    getFinancementLabel(type) {
        const labels = {
            'personnel': 'Financement personnel',
            'entreprise': 'Financement entreprise',
            'cpf': 'Compte Personnel de Formation (CPF)',
            'pole_emploi': 'Pôle Emploi',
            'autre': 'Autre'
        };
        return labels[type] || type;
    }

    async submitInscription() {
        const submitBtn = document.getElementById('submitInscription');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement en cours...';
        
        try {
            // Vérifier la connexion de l'utilisateur
            if (!auth.currentUser) {
                // Créer un compte pour l'utilisateur
                await this.createUserAccount();
            }
            
            // Préparer les données d'inscription
            const inscriptionData = {
                ...this.formData.personal,
                ...this.formData.formation,
                ...this.formData.financement,
                userId: auth.currentUser?.uid || 'anonymous',
                statut: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Enregistrer dans Firestore
            await db.collection('inscriptions').add(inscriptionData);
            
            // Mettre à jour le compteur de places si nécessaire
            if (this.selectedFormation) {
                await this.updateFormationPlaces(this.selectedFormation.id);
            }
            
            // Afficher la confirmation
            this.showSuccessModal();
            
            // Envoyer un email de confirmation (à implémenter avec Cloud Functions)
            // await this.sendConfirmationEmail(inscriptionData);
            
        } catch (error) {
            console.error('Error submitting inscription:', error);
            this.showNotification('Une erreur est survenue lors de l\'inscription. Veuillez réessayer.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async createUserAccount() {
        const personal = this.formData.personal || {};
        
        // Créer un compte utilisateur
        const userCredential = await auth.createUserWithEmailAndPassword(
            personal.email,
            this.generatePassword()
        );
        
        // Mettre à jour le profil
        await userCredential.user.updateProfile({
            displayName: `${personal.prenom} ${personal.nom}`
        });
        
        // Enregistrer dans Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            ...personal,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Envoyer un email de réinitialisation de mot de passe
        await auth.sendPasswordResetEmail(personal.email);
    }

    generatePassword() {
        return Math.random().toString(36).slice(-8) + 'A1!';
    }

    async updateFormationPlaces(formationId) {
        try {
            const formationRef = db.collection('formations').doc(formationId);
            const formationDoc = await formationRef.get();
            
            if (formationDoc.exists) {
                const currentPlaces = formationDoc.data().places || 0;
                await formationRef.update({
                    places: currentPlaces - 1,
                    inscriptionCount: firebase.firestore.FieldValue.increment(1)
                });
            }
            
        } catch (error) {
            console.error('Error updating formation places:', error);
        }
    }

    showSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Fermer le modal après 10 secondes
            setTimeout(() => {
                modal.style.display = 'none';
                window.location.href = 'dashboard.html';
            }, 10000);
            
            // Fermeture manuelle
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('close-modal')) {
                    modal.style.display = 'none';
                    window.location.href = 'dashboard.html';
                }
            });
        }
    }

    setupRealTimeValidation() {
        // Validation en temps réel pour l'email
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmail(emailInput.value);
            });
        }
        
        // Validation du téléphone
        const phoneInput = document.getElementById('telephone');
        if (phoneInput) {
            phoneInput.addEventListener('blur', () => {
                this.validatePhone(phoneInput.value);
            });
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            this.showFieldError(document.getElementById('email'), 'Email invalide');
            return false;
        }
        return true;
    }

    validatePhone(phone) {
        const phoneRegex = /^[0-9]{10}$/;
        if (phone && !phoneRegex.test(phone.replace(/\s/g, ''))) {
            this.showFieldError(document.getElementById('telephone'), 'Numéro de téléphone invalide');
            return false;
        }
        return true;
    }
}

// Initialiser le manager des inscriptions
const inscriptionManager = new InscriptionManager();