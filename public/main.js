/* ==========================================================================
   LAnalytics - Script Principal (main.js)
   ========================================================================== */

let currentCatSelect = '';

// Initialisation globale au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initEventListeners();
    loadLastTransactions();
    setCat();
});

/**
 * Initialisation de l'interface et gestion des accès utilisateur
 */
function initUI() {
    const dateInput = document.querySelector('#dateInput');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    const userConnect = document.querySelector('#userConnect');
    const userDisconnect = document.querySelector('#userDisconnect');

    if (userConnect && userDisconnect) {
        const isConnected = userConnect.textContent.trim() !== 'Connexion';
        userDisconnect.hidden = !isConnected;
        if (isConnected) {
            userConnect.href = '/Profil/profil.html';
        }
    }

    const userAnalytics = localStorage.getItem('userAnalytics');
    const user = userAnalytics ? JSON.parse(userAnalytics) : null;

    if (!user) {
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
    const menuToggle = document.querySelector('#menuToggle');
    const navMenu = document.querySelector('#navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
    }

    const btnDisconnect = document.querySelector('#userDisconnect');
    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            localStorage.removeItem('userAnalytics');
            localStorage.removeItem('dataAnalytics');
        });
    }

    const btnAddCategory = document.querySelector('#addCategory');
    if (btnAddCategory) {
        btnAddCategory.addEventListener('click', () => {
            document.location.href = '/Profil/profil.html';
        });
    }

    const typeSelect = document.querySelector('#type');
    if (typeSelect) {
        typeSelect.addEventListener('change', setCat);
    }

    const formAdd = document.querySelector('#formAdd');
    if (formAdd) {
        formAdd.addEventListener('submit', submitForm);
    }

    document.querySelector('#transactionSearch')?.addEventListener('input', filterLastTransactions);

    // Délégation d'événement sur la liste
    document.addEventListener('click', (e) => {
        const btnDelete = e.target.closest('.btn-delete-trans');
        if (btnDelete) {
            const timeStamp = btnDelete.dataset.timestamp;
            const date = btnDelete.dataset.date;
            const name = btnDelete.dataset.name;
            confirmDeleteTransaction({ timeStamp, date, name });
        }
    });
}

/**
 * Modal de confirmation dynamique en JS/HTML natif
 */
function confirmDeleteTransaction(transactionData) {
    const oldModal = document.querySelector('#deleteConfirmModal');
    if (oldModal) oldModal.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'deleteConfirmModal';
    dialog.style.cssText = `
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-width: 400px;
        width: 90%;
        margin: auto;
    `;

    dialog.innerHTML = `
        <h4 style="margin-bottom: 0.75rem; font-size: 1.1rem;">Confirmer la suppression</h4>
        <p style="margin-bottom: 1.25rem; color: #64748b; font-size: 0.95rem;">
            Voulez-vous vraiment supprimer <strong>${transactionData.name || 'cette transaction'}</strong> ?
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button id="btnCancelDelete" style="padding: 0.5rem 1rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer;">Annuler</button>
            <button id="btnConfirmDelete" style="padding: 0.5rem 1rem; border: none; background: #ef4444; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600;">Supprimer</button>
        </div>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();

    dialog.querySelector('#btnCancelDelete').addEventListener('click', () => {
        dialog.close();
        dialog.remove();
    });

    dialog.querySelector('#btnConfirmDelete').addEventListener('click', async () => {
        dialog.close();
        dialog.remove();
        await executeDeleteTransaction(transactionData);
    });
}

/**
 * Suppression côté serveur
 */
async function executeDeleteTransaction(element) {
    const userAnalytics = localStorage.getItem('userAnalytics');
    const userMail = userAnalytics ? JSON.parse(userAnalytics).mail : '';

    if (!userMail) return;

    try {
        const response = await fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: userMail, element: element })
        });

        const json = await response.json();

        if (json.statut === 'success') {
            loadLastTransactions();
        } else {
            alert(json.err || 'Erreur lors de la suppression');
        }
    } catch (err) {
        console.error("Erreur suppression :", err);
    }
}

/**
 * Soumission formulaire
 */
async function submitForm(e) {
    e.preventDefault();

    const cat = document.querySelector('#name');
    if (!cat || cat.value === '') {
        alert('Catégorie non définie');
        return;
    }

    const userAnalytics = localStorage.getItem('userAnalytics');
    const userMail = userAnalytics ? JSON.parse(userAnalytics).mail : '';

    const data = { user: userMail, timeStamp: Date.now() };

    for (const element of e.target.elements) {
        if (!element.name || element.name === 'submit') continue;

        if (element.name === 'name') {
            const [mainCat, name] = element.value.split('-');
            data['categorie'] = mainCat;
            data[element.name] = name;
        } else if (element.name === 'frais') {
            data[element.name] = element.checked;
        } else {
            data[element.name] = element.value;
        }
    }

    try {
        const response = await fetch('/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        
        if (json.statut === 'success') {
            localStorage.setItem('dataAnalytics', JSON.stringify(json.data));
            loadLastTransactions();
            setCat();
            e.target.reset();
            const dateInput = document.querySelector('#dateInput');
            if (dateInput) dateInput.valueAsDate = new Date();
        } else {
            alert(json.err || 'Erreur lors de l’ajout');
        }
    } catch (err) {
        console.error("Erreur ajout :", err);
    }
}

function normalizeSearchText(value) {
    return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function filterLastTransactions() {
    const search = document.querySelector('#transactionSearch');
    const emptyMessage = document.querySelector('#transactionSearchEmpty');
    const query = normalizeSearchText(search.value.trim());
    const amountQuery = query.replace(/[\s€]/g, '').replace(',', '.');
    const dateQuery = query.replace(/\//g, '-');
    let hasResult = false;

    document.querySelectorAll('#lastContent > .subdiv').forEach((card) => {
        const { searchName, searchAmounts, searchDates } = card.dataset;
        const matches = !query
            || searchName.includes(query)
            || (amountQuery && searchAmounts.split(' ').some((amount) => amount.includes(amountQuery)))
            || searchDates.split(' ').some((date) => date.includes(dateQuery));

        card.hidden = !matches;
        hasResult ||= Boolean(matches);
    });

    emptyMessage.hidden = !query || hasResult;
}

/**
 * Chargement des transactions
 */
async function loadLastTransactions() {
    const div = document.querySelector('#lastContent');
    if (!div) return;

    const userAnalytics = localStorage.getItem('userAnalytics');
    const userMail = userAnalytics ? JSON.parse(userAnalytics).mail : '';

    if (!userMail) return;

    try {
        const response = await fetch('/getLastTransactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: userMail })
        });

        const json = await response.json();

        if (json.statut !== 'success' || !Array.isArray(json.data)) return;

        div.innerHTML = '';

        json.data.forEach(({ categorie, timeStamp, name, type, montant, description, date }) => {
            const subdiv = document.createElement('div');
            const typeClass = type === 'revenue' ? 'type-revenue' : 'type-depense';

            subdiv.className = `subdiv ${typeClass}`;
            const formattedDate = date ? date.split('-').reverse().join('-') : '';

            const addedDate = new Date(timeStamp);
            const frenchAddedDate = addedDate.toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }).replaceAll('/', '-');

            subdiv.dataset.searchName = normalizeSearchText(name || '');
            subdiv.dataset.searchAmounts = [montant, Number(montant).toFixed(2)].join(' ');
            subdiv.dataset.searchDates = [date, formattedDate, frenchAddedDate].join(' ');

            subdiv.innerHTML = `
                <div class="firstInfoSubdiv">
                    <p class="dateShowDiv">Ajouté le ${addedDate.toLocaleString()}</p>
                    <button type="button" 
                            class="btn-delete-trans" 
                            data-timestamp="${timeStamp}"
                            data-date="${date || ''}"
                            data-name="${name || ''}"
                            title="Supprimer">
                        🗑️
                    </button>
                </div>
                <div class="secondInfoSubdiv">
                    <div class="categorieShow"><p>${categorie || ''}</p></div>
                    <div class="infoShowDiv">
                        <p><strong>${name || ''}</strong> (${formattedDate})</p>
                        <p class="montantShow">${montant} €</p>
                    </div>
                </div>
                ${description ? `<p class="descShow">${description}</p>` : ''}
            `;

            div.appendChild(subdiv);
        });

        filterLastTransactions();
    } catch (err) {
        console.error("Erreur chargement :", err);
    }
}

/**
 * Gestion sélecteur catégorie
 */
function setCat() {
    const typeElem = document.querySelector('#type');
    const nameElem = document.querySelector('#name');
    const labelFrais = document.querySelector('#labelFrais');

    if (!typeElem || !nameElem) return;

    const storedData = localStorage.getItem('dataAnalytics');
    if (!storedData) return;

    const dataUser = JSON.parse(storedData);
    if (!dataUser || !dataUser.categories) return;

    const type = typeElem.value;
    nameElem.innerHTML = '<option value="">Choisir la catégorie</option>';

    let categories = [];
    let favSubs = {};

    if (type === 'depense') {
        categories = Object.entries(dataUser.categories.depense || {});
        favSubs = dataUser.categories.favoris?.depense?.subs || {};
        if (labelFrais) labelFrais.hidden = false;
    } else {
        if (labelFrais) labelFrais.hidden = true;
        categories = Object.entries(dataUser.categories.revenue || {});
        favSubs = dataUser.categories.favoris?.revenue?.subs || {};
    }

    categories.sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    categories.forEach(([mainCategorie, sousCategories]) => {
        const favList = favSubs[mainCategorie] || [];
        const favSubCats = sousCategories.filter(sub => favList.includes(sub));

        if (favSubCats.length > 0) {
            const optGroup = document.createElement('optgroup');
            optGroup.label = `★ ${mainCategorie}`;
            optGroup.className = 'Cat Cat-Fav';

            favSubCats.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                .forEach(sub => {
                    const option = document.createElement('option');
                    option.textContent = `★ ${sub}`;
                    option.value = `${mainCategorie}-${sub}`;
                    option.title = mainCategorie;
                    optGroup.append(option);
                });

            nameElem.append(optGroup);
        }
    });

    categories.forEach(([mainCategorie, sousCategories]) => {
        const favList = favSubs[mainCategorie] || [];
        const regularSubCats = sousCategories.filter(sub => !favList.includes(sub));

        if (regularSubCats.length > 0) {
            const optGroup = document.createElement('optgroup');
            optGroup.label = mainCategorie;
            optGroup.className = 'Cat';

            regularSubCats.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                .forEach(sub => {
                    const option = document.createElement('option');
                    option.textContent = sub;
                    option.value = `${mainCategorie}-${sub}`;
                    option.title = mainCategorie;
                    optGroup.append(option);
                });

            nameElem.append(optGroup);
        }
    });
}
