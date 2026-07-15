/* ==========================================================================
   LAnalytics - Script de consultation des données (show.js)
   ========================================================================== */

const months = 'Janvier Février Mars Avril Mai Juin Juillet Août Septembre Octobre Novembre Décembre'.split(' ');

document.addEventListener('DOMContentLoaded', () => {
    initUI();
});

/**
 * Initialisation de l'interface et contrôle d'accès
 */
function initUI() {
    const btnDisconnect = document.querySelector('#userDisconnect');
    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            localStorage.removeItem('userAnalytics');
            localStorage.removeItem('dataAnalytics');
        });
    }

    const userConnect = document.querySelector('#userConnect');
    if (userConnect && userConnect.textContent.trim() !== 'Connexion') {
        if (btnDisconnect) btnDisconnect.hidden = false;
        userConnect.href = '/Profil/profil.html';
        requestData('getYears');
    } else {
        if (btnDisconnect) btnDisconnect.hidden = true;
    }
}

/**
 * Création dynamique du composant Bilan pour une année donnée
 */
function creatediv(year) {
    const mainContent = document.querySelector('#showContent') || document.body;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'mainDiv';

    const firstDiv = document.createElement('div');
    firstDiv.className = 'firstDiv';

    const secondDiv = document.createElement('div');
    secondDiv.className = 'secondDiv';

    mainDiv.append(firstDiv, secondDiv);

    const resultDiv = document.createElement('div');
    resultDiv.className = 'resultDiv';
    resultDiv.innerHTML = `<p class="result">${year}</p><p style="text-align:center; color:#64748b;">Sélectionnez une période pour afficher le bilan.</p>`;
    secondDiv.append(resultDiv);

    const yearDiv = document.createElement('div');
    yearDiv.className = 'yearDiv';

    const monthDiv = document.createElement('div');
    monthDiv.className = 'monthDiv';

    const dayDiv = document.createElement('div');
    dayDiv.className = 'dayDiv';

    firstDiv.append(yearDiv, monthDiv, dayDiv);

    // Bouton de l'Année
    const yearButton = document.createElement('button');
    yearButton.className = 'button';
    yearButton.style.width = '100%';
    yearButton.style.fontWeight = 'bold';
    yearButton.textContent = `${year}`;
    yearDiv.append(yearButton);

    mainContent.append(mainDiv);

    // Événement clic sur l'année
    yearButton.addEventListener('click', () => {
        requestData('getData', year).then(response => {
            if (!response || !response.body) return;
            const { depense, revenu } = response.body;
            const colorBalance = (revenu - depense) >= 0 ? '#22c55e' : '#ef4444';

            resultDiv.innerHTML = `
                <p class="result">${year}</p>
                <p class="depense"><span>Dépenses Annuelles :</span> <span class="montant">${depense.toFixed(2)} €</span></p>
                <p class="revenu"><span>Revenus Annuels :</span> <span class="montant">${revenu.toFixed(2)} €</span></p>
                <p class="balance"><span>Balance :</span> <span class="montant" style="color:${colorBalance}">${(revenu - depense).toFixed(2)} €</span></p>
            `;
            dayDiv.innerHTML = '';
        });
    });

    // Génération des boutons Mois
    months.forEach((monthName, i) => {
        const monthButton = document.createElement('button');
        monthButton.textContent = monthName;
        monthButton.className = 'button';
        monthDiv.append(monthButton);

        monthButton.addEventListener('click', () => {
            const currentMonth = (i + 1).toString().padStart(2, '0');

            requestData('getData', year, currentMonth).then(response => {
                if (!response || !response.body) return;
                const { depense, revenu, validDay } = response.body;
                const colorBalance = (revenu - depense) >= 0 ? '#22c55e' : '#ef4444';

                resultDiv.innerHTML = `
                    <p class="result">${months[i]} ${year}</p>
                    <p class="depense"><span>Dépenses Mensuelles :</span> <span class="montant">${depense.toFixed(2)} €</span></p>
                    <p class="revenu"><span>Revenus Mensuels :</span> <span class="montant">${revenu.toFixed(2)} €</span></p>
                    <p class="balance"><span>Balance :</span> <span class="montant" style="color:${colorBalance}">${(revenu - depense).toFixed(2)} €</span></p>
                `;

                // Génération de la grille des jours
                dayDiv.innerHTML = '';
                const totalDays = daysInMonth(year, parseInt(currentMonth));

                for (let d = 1; d <= totalDays; d++) {
                    const currentDay = d.toString().padStart(2, '0');
                    const button = document.createElement('button');
                    
                    button.textContent = d;
                    button.className = validDay.includes(currentDay) ? 'buttonValid' : 'button';
                    dayDiv.append(button);

                    button.addEventListener('click', () => {
                        requestData('getData', year, currentMonth, currentDay).then(resDay => {
                            if (!resDay || !resDay.body) return;
                            const { depense: dDep, revenu: dRev, infoDay } = resDay.body;
                            const dayColor = (dRev - dDep) >= 0 ? '#22c55e' : '#ef4444';

                            resultDiv.innerHTML = `
                                <p class="result">${d} ${months[parseInt(currentMonth) - 1]} ${year}</p>
                                <p class="depense"><span>Dépenses Journalières :</span> <span class="montant">${dDep.toFixed(2)} €</span></p>
                                <p class="revenu"><span>Revenus Journaliers :</span> <span class="montant">${dRev.toFixed(2)} €</span></p>
                                <p class="balance"><span>Balance :</span> <span class="montant" style="color:${dayColor}">${(dRev - dDep).toFixed(2)} €</span></p>
                            `;
                            showAdd(infoDay, resultDiv, year, currentMonth, currentDay);
                        });
                    });
                }
            });
        });
    });
}

/**
 * Affichage des transactions du jour sélectionné
 */
function showAdd(infoDay, parent, year, month, day) {
    if (!Array.isArray(infoDay)) return;

    infoDay.forEach((item) => {
        const { categorie, timestamp, name, type, montant, description, date } = item;
        const subdiv = document.createElement('div');

        let typeClass = 'type-depense';
        if (type === 'delete') typeClass = 'type-delete';
        else if (type === 'revenue') typeClass = 'type-revenue';

        subdiv.className = `subdiv ${typeClass}`;

        const formattedDate = date ? date.split('-').reverse().join('-') : '';
        const actionHtml = type === 'delete' 
            ? `<p style="color:#ef4444; font-weight:bold; font-size:0.8rem;">Supprimé</p>` 
            : `<button class="btn-edit">Modifier</button>`;

        subdiv.innerHTML = `
            <div class="firstInfoSubdiv">
                <p class="dateShowDiv">Ajouté le ${new Date(timestamp).toLocaleString()}</p>
                ${actionHtml}
            </div>
            <div class="secondInfoSubdiv">
                <div class="categorieShow"><p>${categorie || ''}</p></div>
                <div class="infoShowDiv">
                    <p><strong>${name || ''}</strong> (${formattedDate})</p>
                    <p class="montantShow">${montant} €</p>
                </div>
            </div>
            ${description ? `<p>${description}</p>` : ''}
        `;

        const btnEdit = subdiv.querySelector('.btn-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => openEditModal(item, year, month, day));
        }

        parent.appendChild(subdiv);
    });
}

/**
 * Remplissage dynamique des catégories dans un sélecteur
 */
function populateCategoriesSelect(selectElem, typeValue, selectedCatValue = '') {
    selectElem.innerHTML = '<option value="">Choisir la catégorie</option>';

    const storedData = localStorage.getItem('dataAnalytics');
    if (!storedData) return;

    const dataUser = JSON.parse(storedData);
    if (!dataUser || !dataUser.categories) return;

    const key = typeValue === 'depense' ? 'depense' : 'revenue';
    const categoriesObj = dataUser.categories[key] || {};

    Object.entries(categoriesObj).forEach(([mainCat, subCats]) => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = mainCat;

        subCats.forEach(subCat => {
            const option = document.createElement('option');
            const val = `${mainCat}-${subCat}`;
            option.value = val;
            option.textContent = subCat;
            if (val === selectedCatValue || subCat === selectedCatValue) {
                option.selected = true;
            }
            optGroup.appendChild(option);
        });

        selectElem.appendChild(optGroup);
    });
}

/**
 * Ouverture de la modale d'édition ergonomique
 */
function openEditModal(item, year, month, day) {
    const existingModal = document.querySelector('#editModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; backdrop-filter: blur(4px);
    `;

    const itemType = item.type || 'depense';

    modal.innerHTML = `
        <div style="background: #ffffff; width: 90%; max-width: 420px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); font-family: sans-serif;">
            <h3 style="margin-top:0; margin-bottom:16px; font-size:1.25rem; color:#0f172a; text-align:center;">Modifier la transaction</h3>
            
            <label style="display:block; font-size:0.85rem; color:#475569; margin-bottom:4px;">Type</label>
            <select id="modalType" style="width:100%; padding:8px 12px; margin-bottom:12px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                <option value="depense" ${itemType === 'depense' ? 'selected' : ''}>Dépense</option>
                <option value="revenue" ${itemType === 'revenue' ? 'selected' : ''}>Revenu</option>
            </select>

            <label style="display:block; font-size:0.85rem; color:#475569; margin-bottom:4px;">Catégorie</label>
            <select id="modalCategorie" style="width:100%; padding:8px 12px; margin-bottom:12px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;"></select>
            
            <label style="display:block; font-size:0.85rem; color:#475569; margin-bottom:4px;">Montant (€)</label>
            <input type="number" step="0.01" id="modalMontant" value="${item.montant || 0}" style="width:100%; padding:8px 12px; margin-bottom:12px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
            
            <label style="display:block; font-size:0.85rem; color:#475569; margin-bottom:4px;">Description</label>
            <textarea id="modalDescription" rows="3" style="width:100%; padding:8px 12px; margin-bottom:20px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">${item.description || ''}</textarea>
            
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <button id="btnModalDelete" style="background:#ef4444; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">Supprimer</button>
                <div style="display:flex; gap:8px;">
                    <button id="btnModalCancel" style="background:#f1f5f9; color:#475569; border:none; padding:8px 14px; border-radius:6px; cursor:pointer;">Annuler</button>
                    <button id="btnModalSave" style="background:#2563eb; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">Enregistrer</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const typeSelect = modal.querySelector('#modalType');
    const catSelect = modal.querySelector('#modalCategorie');

    // Initialisation des catégories
    populateCategoriesSelect(catSelect, typeSelect.value, item.categorie);

    // Changement de type => mise à jour des catégories
    typeSelect.addEventListener('change', () => {
        populateCategoriesSelect(catSelect, typeSelect.value);
    });

    // Annuler
    modal.querySelector('#btnModalCancel').addEventListener('click', () => modal.remove());

    // Enregistrer
    modal.querySelector('#btnModalSave').addEventListener('click', () => {
        const selectedCat = catSelect.value;
        const updatedData = {
            id: item.id,
            type: typeSelect.value,
            categorie: selectedCat,
            name: item.name, // conserve le champ d'origine
            montant: parseFloat(modal.querySelector('#modalMontant').value) || 0,
            description: modal.querySelector('#modalDescription').value
        };

        requestData('updateItem', year, month, day, updatedData).then(res => {
            modal.remove();
            if (res && res.success) {
                refreshDayView(year, month, day);
            }
        });
    });

    // Supprimer
    modal.querySelector('#btnModalDelete').addEventListener('click', () => {
        const userStorage = localStorage.getItem('userAnalytics');
        if (!userStorage) return;

        const user = JSON.parse(userStorage);
        const deletePayload = {
            user: user.mail,
            element: {
                timeStamp: item.timestamp,
                date: item.date,
                categorie: item.categorie,
                name: item.name,
                montant: item.montant,
                frais: item.frais,
                description: item.description
            }
        };

        fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deletePayload)
        })
        .then(res => res.json())
        .then(res => {
            modal.remove();
            if (res && res.statut === 'success') {
                refreshDayView(year, month, day);
            }
        });
    });
}

/**
 * Rafraîchit la vue du jour sélectionné après suppression ou édition
 */
function refreshDayView(year, month, day) {
    requestData('getData', year, month, day).then(resDay => {
        if (!resDay || !resDay.body) return;
        const parent = document.querySelector('.resultDiv');
        if (!parent) return;

        const { depense: dDep, revenu: dRev, infoDay } = resDay.body;
        const dayColor = (dRev - dDep) >= 0 ? '#22c55e' : '#ef4444';

        parent.innerHTML = `
            <p class="result">${parseInt(day)} ${months[parseInt(month) - 1]} ${year}</p>
            <p class="depense"><span>Dépenses Journalières :</span> <span class="montant">${dDep.toFixed(2)} €</span></p>
            <p class="revenu"><span>Revenus Journaliers :</span> <span class="montant">${dRev.toFixed(2)} €</span></p>
            <p class="balance"><span>Balance :</span> <span class="montant" style="color:${dayColor}">${(dRev - dDep).toFixed(2)} €</span></p>
        `;
        showAdd(infoDay, parent, year, month, day);
    });
}

/**
 * Nombre de jours dans un mois donné
 */
function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * Envoi des requêtes au serveur (/requestData)
 */
async function requestData(type, year = null, month = null, day = null, extraData = null) {
    const userStorage = localStorage.getItem('userAnalytics');
    if (!userStorage) return;

    const user = JSON.parse(userStorage);
    const data = { 
        user: user.mail, 
        request: { type, options: { year, month, day, extraData } } 
    };

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch('/requestData', options);
        const json = await response.json();

        if (type === 'getYears') {
            const years = json.years || [];
            years.forEach(el => creatediv(el));
            return;
        }
        return json;
    } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
    }
}
