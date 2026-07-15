/* ==========================================================================
   LAnalytics - Script Principal (main.js)
   ========================================================================== */

let currentCatSelect = '';

// Initialisation globale au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initEventListeners();
    showLastAdd();
    setCat();
});

/**
 * Initialisation de l'interface et gestion des accès utilisateur
 */
function initUI() {
    // Définition de la date par défaut sur la date du jour
    const dateInput = document.querySelector('#dateInput');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Gestion de l'état connecté / déconnecté dans le header
    const userConnect = document.querySelector('#userConnect');
    const userDisconnect = document.querySelector('#userDisconnect');

    if (userConnect && userDisconnect) {
        const isConnected = userConnect.textContent.trim() !== 'Connexion';
        userDisconnect.hidden = !isConnected;
        if (isConnected) {
            userConnect.href = '/Profil/profil.html';
        }
    }

    // Vérification de présence de l'utilisateur (bloque l'accès si non identifié)
    if (typeof user === 'undefined' || !user) {
        const showContent = document.querySelector('#showContent');
        if (showContent) {
            showContent.innerHTML = '';
            const title = document.createElement('h2');
            title.id = 'logError';
            title.textContent = 'Merci de vous identifier pour accéder à vos données !';
            showContent.append(title);
        }
    }
}

/**
 * Attachement des écouteurs d'événements
 */
function initEventListeners() {
    // Menu Burger Mobile
    const menuToggle = document.querySelector('#menuToggle');
    const navMenu = document.querySelector('#navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
    }

    // Bouton de déconnexion
    const btnDisconnect = document.querySelector('#userDisconnect');
    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            localStorage.removeItem('userAnalytics');
            localStorage.removeItem('dataAnalytics');
        });
    }

    // Redirection pour l'ajout de catégorie
    const btnAddCategory = document.querySelector('#addCategory');
    if (btnAddCategory) {
        btnAddCategory.addEventListener('click', () => {
            document.location.href = '/Profil/profil.html';
        });
    }

    // Changement du type d'activité (dépense/revenu)
    const typeSelect = document.querySelector('#type');
    if (typeSelect) {
        typeSelect.addEventListener('change', setCat);
    }

    // Soumission du formulaire d'ajout
    const formAdd = document.querySelector('#formAdd');
    if (formAdd) {
        formAdd.addEventListener('submit', submitForm);
    }

    // Délégation d'événements pour la suppression d'une activité dans la liste
    const lastContent = document.querySelector('#lastContent');
    if (lastContent) {
        lastContent.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('cross')) {
                const timeStamp = e.target.dataset.timestamp;
                if (timeStamp) {
                    deleteElement(timeStamp);
                }
            }
        });
    }
}

/**
 * Traitement et envoi du formulaire vers le serveur (/add)
 */
async function submitForm(e) {
    e.preventDefault();

    const cat = document.querySelector('#name');
    if (!cat || cat.value === '') {
        alert('Catégorie non définie');
        return;
    }

    const data = {
        user: typeof user !== 'undefined' ? user.mail : '',
        timeStamp: Date.now()
    };

    // Parcours dynamique des éléments du formulaire
    for (const element of e.target.elements) {
        if (!element.name || element.name === 'submit') continue;

        if (element.name === 'name') {
            const [mainCat, name] = element.value.split('-');
            data['categorie'] = mainCat;
            data[element.name] = name;
            element.value = '';
        } else if (element.name === 'frais') {
            data[element.name] = element.checked;
        } else {
            data[element.name] = element.value;
            if (element.name !== 'type' && element.name !== 'date') {
                element.value = '';
            }
        }
    }

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch('/add', options);
        const json = await response.json();
        console.log(json);
        
        // Mise à jour des données locales et rafraîchissement de la vue
        localStorage.setItem('dataAnalytics', JSON.stringify(json.data));
        showLastAdd();
    } catch (err) {
        console.error("Erreur lors de l'envoi de l'activité :", err);
    }
}

/**
 * Affichage des dernières activités enregistrées (cards modernes)
 */
function showLastAdd() {
    const div = document.querySelector('#lastContent');
    if (!div) return;

    div.innerHTML = '';
    const storedData = localStorage.getItem('dataAnalytics');
    if (!storedData) return;

    const { lastUpdate } = JSON.parse(storedData);
    if (!Array.isArray(lastUpdate)) return;

    lastUpdate.forEach(({ categorie, timeStamp, name, type, montant, frais, description, date }) => {
        const subdiv = document.createElement('div');

        // Attribution de la classe CSS pour le liseré de couleur
        let typeClass = 'type-depense';
        if (type === 'delete') {
            typeClass = 'type-delete';
        } else if (type === 'revenue') {
            typeClass = 'type-revenue';
        }

        subdiv.className = `subdiv ${typeClass}`;

        const formattedDate = date ? date.split('-').reverse().join('-') : '';
        const actionHtml = type === 'delete'
            ? `<p class="deleteFile" style="color:#ef4444; font-weight:bold; font-size:0.8rem;">Supprimé</p>`
            : `<img src="Image/cross.png" alt="Supprimer" class="cross" data-timestamp="${timeStamp}">`;

        subdiv.innerHTML = `
            <div class="firstInfoSubdiv">
                <p class="dateShowDiv">Ajouté le ${new Date(timeStamp).toLocaleString()}</p>
                ${actionHtml}
            </div>
            <div class="secondInfoSubdiv">
                <div class="categorieShow"><p>${categorie}</p></div>
                <div class="infoShowDiv">
                    <p><strong>${name}</strong> (${formattedDate})</p>
                    <p class="montantShow">${montant} €</p>
                </div>
            </div>
            ${description ? `<p class="descShow">${description}</p>` : ''}
        `;

        div.appendChild(subdiv);
    });
}

/**
 * Requête de suppression d'un élément (/delete)
 */
async function deleteElement(elementTimeStamp) {
    const storedData = localStorage.getItem('dataAnalytics');
    if (!storedData) return;

    const lastUpdateArray = JSON.parse(storedData).lastUpdate;
    const index = lastUpdateArray.findIndex(({ timeStamp, type }) => elementTimeStamp == timeStamp && type !== 'delete');

    if (index === -1) {
        alert('Élément déjà supprimé ou introuvable');
        return;
    }

    const userAnalytics = localStorage.getItem('userAnalytics');
    const userMail = userAnalytics ? JSON.parse(userAnalytics).mail : '';

    const data = { 
        user: userMail, 
        element: lastUpdateArray[index] 
    };

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch('/delete', options);
        const json = await response.json();

        if (json.statut === 'success') {
            localStorage.setItem('dataAnalytics', JSON.stringify(json.data));
        } else {
            alert('Élément déjà supprimé dans la base de données');
        }
        
        showLastAdd();
    } catch (err) {
        console.error("Erreur lors de la suppression :", err);
    }
}

/**
 * Mise à jour dynamique du sélecteur de catégories selon le type choisi.
 * Tri : catégories favorites en premier, puis ordre alphabétique.
 * Les sous-catégories sont également triées par ordre alphabétique.
 */
function setCat() {
    const typeElem = document.querySelector('#type');
    const nameElem = document.querySelector('#name');
    const labelFrais = document.querySelector('#labelFrais');

    if (!typeElem || !nameElem) return;

    const type = typeElem.value;
    nameElem.innerHTML = '<option value="">Choisir la catégorie</option>';

    if (typeof dataUser === 'undefined' || !dataUser.categories) return;

    let categories = [];
    let favoris = [];

    if (type === 'depense') {
        categories = Object.entries(dataUser.categories.depense || {});
        favoris = dataUser.categories.favoris?.depense || [];
        if (labelFrais) labelFrais.hidden = false;
    } else {
        if (labelFrais) labelFrais.hidden = true;
        categories = Object.entries(dataUser.categories.revenue || {});
        favoris = dataUser.categories.favoris?.revenue || [];
    }

    // Tri : favoris d'abord, puis ordre alphabétique dans chaque groupe
    categories.sort(([a], [b]) => {
        const aFav = favoris.includes(a);
        const bFav = favoris.includes(b);
        if (aFav !== bFav) return aFav ? -1 : 1;
        return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });

    categories.forEach(([mainCategorie, sousCategories]) => {
        const mainCat = document.createElement('optgroup');
        mainCat.id = `${mainCategorie}Opt`;
        mainCat.label = favoris.includes(mainCategorie) ? `★ ${mainCategorie}` : mainCategorie;
        mainCat.className = 'Cat';

        [...sousCategories]
            .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
            .forEach(categorie => {
                const option = document.createElement('option');
                option.textContent = categorie;
                option.value = `${mainCategorie}-${categorie}`;
                option.title = mainCategorie;
                mainCat.append(option);
            });

        nameElem.append(mainCat);
    });
}
