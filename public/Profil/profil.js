document.addEventListener('DOMContentLoaded', () => {
    initUI();
    getFolder();
    getDelFolder();
    initFavorites();
});

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
        userConnect.href = '#';
    }

    document.querySelectorAll('.set').forEach((el, i) => {
        el.addEventListener('click', () => {
            const folder = document.querySelectorAll('.choice');
            const secondFolder = document.querySelectorAll('.show-form');

            if (folder[i].hidden) {
                folder[i].hidden = false;
                secondFolder[i].hidden = false;
                el.textContent = '−';
                el.setAttribute('aria-expanded', 'true');
            } else {
                folder[i].hidden = true;
                secondFolder[i].hidden = true;
                el.textContent = '+';
                el.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

function getFolder() {
    const mainCheck = document.querySelector('#main');
    const show = document.querySelector('#show');

    if (!show || !mainCheck) return;

    if (mainCheck.checked) {
        show.innerHTML = `
            <div class="field">
                <label>Type d'opération</label>
                <select class="type">
                    <option>Dépense</option>
                    <option>Revenue</option>
                </select>
            </div>
            <div class="field">
                <label for="categorie">Nom de la Grande Catégorie :</label>
                <input type="text" id="categorie" placeholder="ex: Alimentation">
            </div>
            <div class="field">
                <label for="sousCategorie">Nom de la première Sous-Catégorie :</label>
                <input type="text" id="sousCategorie" placeholder="ex: Supermarché">
            </div>
            <button id="validCat" class="buttonVal">Enregistrer</button>
            <p id="error" hidden></p>
        `;

        document.querySelector('#validCat').addEventListener('click', async () => {
            const p = document.querySelector('#error');
            const main = document.querySelector('#categorie');
            const second = document.querySelector('#sousCategorie');
            const type = document.querySelectorAll('.type')[0];

            p.hidden = true;

            if (!main.value.trim()) {
                p.textContent = "Veuillez renseigner le nom d'une grande catégorie.";
                main.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            main.style.borderColor = '';

            if (!second.value.trim()) {
                p.textContent = "Veuillez renseigner le nom d'une sous-catégorie.";
                second.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            second.style.borderColor = '';

            const data = {
                user: typeof user !== 'undefined' ? user.mail : '',
                categorie: 'main',
                type: type.value,
                main: main.value.trim(),
                second: second.value.trim()
            };

            await sendCategoryRequest('../addCategory', data, () => {
                main.value = '';
                second.value = '';
                refreshFavorites();
            }, p);
        });
    } else {
        show.innerHTML = `
            <div class="field">
                <label>Type d'opération</label>
                <select class="type" onchange="setCat(document.querySelector('#categorie'), 0)">
                    <option>Dépense</option>
                    <option>Revenue</option>
                </select>
            </div>
            <div class="field">
                <label for="categorie">Sélectionner la Grande Catégorie :</label>
                <select id="categorie">
                    <option value="">Choisir une Catégorie Principale...</option>
                </select>
            </div>
            <div class="field">
                <label for="sousCategorie">Nom de la Sous-Catégorie :</label>
                <input type="text" id="sousCategorie" placeholder="ex: Restauration">
            </div>
            <button id="validCat" class="buttonVal">Enregistrer</button>
            <p id="error" hidden></p>
        `;

        setCat(document.querySelector('#categorie'), 0);

        document.querySelector('#validCat').addEventListener('click', async () => {
            const p = document.querySelector('#error');
            const main = document.querySelector('#categorie');
            const second = document.querySelector('#sousCategorie');
            const type = document.querySelectorAll('.type')[0];

            p.hidden = true;

            if (!main.value) {
                p.textContent = 'Veuillez choisir une catégorie principale.';
                main.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            main.style.borderColor = '';

            if (!second.value.trim()) {
                p.textContent = "Veuillez renseigner le nom d'une sous-catégorie.";
                second.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            second.style.borderColor = '';

            const data = {
                user: typeof user !== 'undefined' ? user.mail : '',
                categorie: 'second',
                type: type.value,
                main: main.value,
                second: second.value.trim()
            };

            await sendCategoryRequest('../addCategory', data, () => {
                second.value = '';
                refreshFavorites();
            }, p);
        });
    }
}

function getDelFolder() {
    const mainCheck = document.querySelector('#mainDel');
    const show = document.querySelectorAll('.show-form')[1];

    if (!show || !mainCheck) return;

    if (mainCheck.checked) {
        show.innerHTML = `
            <div class="field">
                <label>Type d'opération</label>
                <select class="type" id="0" onchange="setCat(document.querySelector('#categorieDel'), 1)">
                    <option>Dépense</option>
                    <option>Revenue</option>
                </select>
            </div>
            <div class="field">
                <label for="categorieDel">Sélectionner la catégorie principale à supprimer :</label>
                <select id="categorieDel"></select>
            </div>
            <button id="validDel" class="buttonVal">Supprimer</button>
            <p id="errorDel" hidden></p>
        `;

        setCat(document.querySelector('#categorieDel'), 1);

        document.querySelector('#validDel').addEventListener('click', async () => {
            const p = document.querySelector('#errorDel');
            const main = document.querySelector('#categorieDel');
            const type = document.querySelectorAll('.type')[1];

            p.hidden = true;

            if (!main.value) {
                p.textContent = 'Veuillez sélectionner une grande catégorie.';
                main.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            main.style.borderColor = '';

            const data = {
                user: typeof user !== 'undefined' ? user.mail : '',
                categorie: 'main',
                type: type.value,
                main: main.value
            };

            await sendCategoryRequest('../delCategory', data, () => {
                setCat(document.querySelector('#categorieDel'), 1);
                refreshFavorites();
            }, p);
        });
    } else {
        show.innerHTML = `
            <div class="field">
                <label>Type d'opération</label>
                <select class="type" id="1" onchange="setCat(document.querySelector('#categorieDel'), 1); showSousCat();">
                    <option>Dépense</option>
                    <option>Revenue</option>
                </select>
            </div>
            <div class="field">
                <label for="categorieDel">Sélectionner la catégorie principale :</label>
                <select id="categorieDel" onchange="showSousCat()"></select>
            </div>
            <div class="field">
                <label for="sousCategorieDel" id="labelSousCat" hidden>Sélectionner la sous-catégorie à supprimer :</label>
                <select id="sousCategorieDel" hidden></select>
            </div>
            <button id="validDel" class="buttonVal">Supprimer</button>
            <p id="errorDel" hidden></p>
        `;

        setCat(document.querySelector('#categorieDel'), 1);

        document.querySelector('#validDel').addEventListener('click', async () => {
            const p = document.querySelector('#errorDel');
            const main = document.querySelector('#categorieDel');
            const second = document.querySelector('#sousCategorieDel');
            const type = document.querySelectorAll('.type')[1];

            p.hidden = true;

            if (!main.value) {
                p.textContent = 'Veuillez sélectionner une catégorie principale.';
                main.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            main.style.borderColor = '';

            if (!second.value) {
                p.textContent = 'Veuillez sélectionner une sous-catégorie.';
                second.style.borderColor = 'red';
                p.hidden = false;
                return;
            }
            second.style.borderColor = '';

            const data = {
                user: typeof user !== 'undefined' ? user.mail : '',
                categorie: 'second',
                type: type.value,
                main: main.value,
                second: second.value
            };

            await sendCategoryRequest('../delCategory', data, () => {
                showSousCat();
                refreshFavorites();
            }, p);
        });
    }
}

async function setCat(element, num) {
    if (!element) return;

    element.innerHTML = `<option value="">Choisir une Catégorie Principale...</option>`;
    const typeElem = document.querySelectorAll('.type')[num];
    const storedData = localStorage.getItem('dataAnalytics');

    if (!storedData || !typeElem) return;

    const { categories } = JSON.parse(storedData);
    if (!categories) return;

    const key = typeElem.value === 'Revenue' ? 'revenue' : 'depense';
    const targetCategories = categories[key] || {};
    const favSubs = categories.favoris?.[key]?.subs || {};

    // Une grande catégorie est "favorite" si TOUTES ses sous-catégories le sont
    const isMainFullyFav = (main) => {
        const subs = targetCategories[main] || [];
        return subs.length > 0 && subs.every(s => (favSubs[main] || []).includes(s));
    };

    Object.keys(targetCategories)
        .sort((a, b) => {
            const aFav = isMainFullyFav(a);
            const bFav = isMainFullyFav(b);
            if (aFav !== bFav) return aFav ? -1 : 1;
            return a.localeCompare(b, 'fr', { sensitivity: 'base' });
        })
        .forEach(categorie => {
            const option = document.createElement('option');
            option.textContent = isMainFullyFav(categorie) ? `★ ${categorie}` : categorie;
            option.value = categorie;
            element.append(option);
        });
}

function showSousCat() {
    const label = document.querySelector('#labelSousCat');
    const element = document.querySelector('#sousCategorieDel');
    const parent = document.querySelector('#categorieDel')?.value;

    if (!element || !label) return;

    if (!parent) {
        label.hidden = true;
        element.hidden = true;
        return;
    }

    label.hidden = false;
    element.hidden = false;
    element.innerHTML = `<option value="">Choisir la sous-catégorie...</option>`;

    const typeElem = document.querySelectorAll('.type')[1];
    const key = typeElem?.value === 'Revenue' ? 'revenue' : 'depense';

    const storedData = localStorage.getItem('dataAnalytics');
    if (!storedData) return;

    const categories = JSON.parse(storedData).categories;
    const list = categories?.[key]?.[parent] || [];

    [...list]
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
        .forEach(sousCategorie => {
            const option = document.createElement('option');
            option.textContent = sousCategorie;
            option.value = sousCategorie;
            element.append(option);
        });
}

async function sendCategoryRequest(url, data, onSuccess, errorElem) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch(url, options);
        const json = await response.json();

        if (json.statut === 'failed') {
            errorElem.textContent = json.err;
            errorElem.hidden = false;
        } else {
            localStorage.setItem('dataAnalytics', JSON.stringify(json.data));
            onSuccess();
        }
    } catch (err) {
        console.error('Erreur lors de la mise à jour des catégories :', err);
    }
}

/* ==========================================================================
   Gestion des favoris
   ========================================================================== */

function initFavorites() {
    const favType = document.querySelector('#favType');
    const favContainer = document.querySelector('#favContent');
    if (!favContainer) return;

    if (favType) {
        favType.addEventListener('change', renderFavorites);
    }
    renderFavorites();
}

function refreshFavorites() {
    if (document.querySelector('#favContent')) {
        renderFavorites();
    }
}

function renderFavorites() {
    const container = document.querySelector('#favContent');
    const favType = document.querySelector('#favType');
    if (!container) return;

    const storedData = JSON.parse(localStorage.getItem('dataAnalytics') || '{}');
    const key = (favType && favType.value === 'Revenue') ? 'revenue' : 'depense';
    const categories = storedData.categories?.[key] || {};
    const favSubs = storedData.categories?.favoris?.[key]?.subs || {};

    container.innerHTML = '';

    const sortedMains = Object.keys(categories)
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    // ---------- Section 1 : résumé des favoris ----------
    const favTitle = document.createElement('h3');
    favTitle.textContent = '★ Favoris';
    favTitle.style.margin = '0.5rem 0 0.25rem';
    container.append(favTitle);

    const mainsWithFav = sortedMains.filter(main => (favSubs[main] || []).length > 0);

    if (mainsWithFav.length === 0) {
        const empty = document.createElement('p');
        empty.style.color = '#888';
        empty.style.fontSize = '0.9em';
        empty.textContent = 'Aucun favori pour le moment.';
        container.append(empty);
    } else {
        mainsWithFav.forEach(main => {
            const mainLine = document.createElement('p');
            mainLine.style.fontWeight = 'bold';
            mainLine.style.margin = '0.4rem 0 0.15rem';
            mainLine.textContent = main;
            container.append(mainLine);

            [...(favSubs[main] || [])]
                .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                .forEach(sub => {
                    const subLine = document.createElement('p');
                    subLine.style.margin = '0 0 0 1rem';
                    subLine.style.color = '#555';
                    subLine.textContent = sub;
                    container.append(subLine);
                });
        });
    }

    const separator = document.createElement('hr');
    separator.style.margin = '0.75rem 0';
    container.append(separator);

    // ---------- Section 2 : toutes les catégories ----------
    const allTitle = document.createElement('h3');
    allTitle.textContent = 'Toutes les catégories';
    allTitle.style.margin = '0.5rem 0 0.25rem';
    container.append(allTitle);

    sortedMains.forEach(main => {
        const subList = [...(categories[main] || [])]
            .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        const favSubList = favSubs[main] || [];
        const isMainFullyFav = subList.length > 0 && subList.every(s => favSubList.includes(s));

        // Ligne pour la grande catégorie : clic = bascule TOUTES ses sous-catégories
        const mainRow = document.createElement('div');
        mainRow.className = 'favRow mainRow';
        mainRow.style.display = 'flex';
        mainRow.style.justifyContent = 'space-between';
        mainRow.style.alignItems = 'center';
        mainRow.style.padding = '0.5rem';
        mainRow.style.fontWeight = 'bold';
        mainRow.style.borderBottom = '1px solid #ccc';

        mainRow.innerHTML = `
            <span>${main}</span>
            <button type="button" class="favBtn ${isMainFullyFav ? 'active' : ''}" data-main="${main}" data-type="main" aria-label="Basculer favori de toute la catégorie">
                ${isMainFullyFav ? '★' : '☆'}
            </button>
        `;
        container.append(mainRow);

        // Lignes pour chaque sous-catégorie : clic = bascule uniquement celle-ci
        subList.forEach(sub => {
            const isSubFav = favSubList.includes(sub);

            const subRow = document.createElement('div');
            subRow.className = 'favRow subRow';
            subRow.style.display = 'flex';
            subRow.style.justifyContent = 'space-between';
            subRow.style.alignItems = 'center';
            subRow.style.padding = '0.35rem 0.5rem 0.35rem 1.5rem';
            subRow.style.borderBottom = '1px solid #eee';

            subRow.innerHTML = `
                <span style="font-size: 0.9em; color: #555;">${sub}</span>
                <button type="button" class="favBtn ${isSubFav ? 'active' : ''}" data-main="${main}" data-sub="${sub}" data-type="sub" aria-label="Basculer favori de la sous-catégorie">
                    ${isSubFav ? '★' : '☆'}
                </button>
            `;
            container.append(subRow);
        });
    });

    container.querySelectorAll('.favBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const current = e.currentTarget;
            const isSub = current.dataset.type === 'sub';

            const data = {
                user: typeof user !== 'undefined' ? user.mail : '',
                type: favType ? favType.value : 'Dépense',
                main: current.dataset.main,
                sub: isSub ? current.dataset.sub : '' // Uniquement envoyé si c'est une sous-catégorie
            };

            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };

            try {
                const response = await fetch('../toggleFavorite', options);
                const json = await response.json();

                if (json.statut === 'success') {
                    localStorage.setItem('dataAnalytics', JSON.stringify(json.data));
                    renderFavorites();
                } else {
                    alert(json.err || 'Erreur lors de la mise à jour du favori');
                }
            } catch (err) {
                console.error('Erreur lors du toggle favori :', err);
            }
        });
    });
}
