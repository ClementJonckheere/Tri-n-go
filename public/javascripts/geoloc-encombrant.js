// public/js/geoloc-encombrant.js
console.log('geoloc-encombrant.js chargé (API IGN + autocomplétion)');

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM ready pour la page de signalement');

    const form = document.querySelector('form');
    const adresseInput = document.getElementById('adresse');
    const villeInput = document.getElementById('ville');
    const cpInput = document.getElementById('codePostal');
    const warningEl = document.getElementById('geo-warning');

    if (!form || !adresseInput || !villeInput || !cpInput) {
        console.warn('Formulaire ou champs adresse/ville/codePostal introuvables');
        return;
    }

    function setWarning(msg) {
        if (!warningEl) return;
        warningEl.textContent = msg || '';
    }

    /* -------------------------------------------------
     * 1) AUTO-REMPLISSAGE AVEC LA POSITION GPS
     * ------------------------------------------------- */
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                console.log('Position navigateur :', lat, lon);

                try {
                    const url = `/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
                    const resp = await fetch(url, { headers: { Accept: 'application/json' } });

                    if (!resp.ok) {
                        console.error('Erreur HTTP /api/reverse-geocode :', resp.status);
                        return;
                    }

                    const data = await resp.json();
                    if (!data.ok) {
                        console.warn('Reverse geocode sans résultat :', data.message);
                        return;
                    }

                    console.log('Adresse trouvée via reverse :', data);

                    // Remplir les champs automatiquement
                    if (data.commune) {
                        villeInput.value = data.commune;
                    }
                    if (data.postcode) {
                        cpInput.value = data.postcode;
                    }
                    if (data.voie) {
                        const numero = data.numero ? data.numero + ' ' : '';
                        adresseInput.value = numero + data.voie;
                    } else if (data.label) {
                        adresseInput.value = data.label;
                    }

                    // Coordonnées cachées (optionnel pour stocker en BDD)
                    let latField = document.getElementById('geoLat');
                    let lonField = document.getElementById('geoLon');
                    if (!latField) {
                        latField = document.createElement('input');
                        latField.type = 'hidden';
                        latField.name = 'geoLat';
                        latField.id = 'geoLat';
                        form.appendChild(latField);
                    }
                    if (!lonField) {
                        lonField = document.createElement('input');
                        lonField.type = 'hidden';
                        lonField.name = 'geoLon';
                        lonField.id = 'geoLon';
                        form.appendChild(lonField);
                    }
                    latField.value = data.lat;
                    lonField.value = data.lon;
                } catch (err) {
                    console.error('Erreur reverse geocode :', err);
                }
            },
            (err) => {
                console.warn('Impossible de récupérer la géolocalisation :', err);
                setWarning(
                    'Nous n’avons pas pu récupérer votre position. ' +
                    'Merci de vérifier manuellement que l’adresse saisie est correcte.'
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        setWarning(
            'Votre navigateur ne supporte pas la géolocalisation. ' +
            'Merci de vérifier manuellement l’adresse saisie.'
        );
    }

    /* -------------------------------------------------
     * 2) AUTO-COMPLÉTION SUR LE CHAMP ADRESSE
     * ------------------------------------------------- */

    // conteneur de suggestions
    const suggestionsBox = document.createElement('div');
    suggestionsBox.className = 'adresse-suggestions';
    suggestionsBox.style.position = 'absolute';
    suggestionsBox.style.zIndex = '9999';
    suggestionsBox.style.background = '#fff';
    suggestionsBox.style.border = '1px solid #d1d9e6';
    suggestionsBox.style.borderRadius = '8px';
    suggestionsBox.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.15)';
    suggestionsBox.style.display = 'none';
    suggestionsBox.style.maxHeight = '220px';
    suggestionsBox.style.overflowY = 'auto';
    suggestionsBox.style.fontSize = '14px';
    suggestionsBox.style.width = '100%';

    // on place la box juste après le champ adresse
    adresseInput.parentNode.style.position = 'relative';
    adresseInput.parentNode.appendChild(suggestionsBox);

    function hideSuggestions() {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
    }

    function showSuggestions(list) {
        if (!list || !list.length) {
            hideSuggestions();
            return;
        }

        suggestionsBox.innerHTML = '';
        list.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'adresse-suggestion-item';
            div.textContent = item.label;
            div.style.padding = '8px 10px';
            div.style.cursor = 'pointer';

            div.addEventListener('mouseenter', () => {
                div.style.background = '#eff6ff';
            });
            div.addEventListener('mouseleave', () => {
                div.style.background = '#fff';
            });

            div.addEventListener('click', () => {
                const numero = item.numero ? item.numero + ' ' : '';
                adresseInput.value = numero + (item.voie || item.label || '');
                if (item.commune) villeInput.value = item.commune;
                if (item.postcode) cpInput.value = item.postcode;

                // on stocke aussi les coords dans les champs hidden si présents
                let latField = document.getElementById('geoLat');
                let lonField = document.getElementById('geoLon');
                if (!latField) {
                    latField = document.createElement('input');
                    latField.type = 'hidden';
                    latField.name = 'geoLat';
                    latField.id = 'geoLat';
                    form.appendChild(latField);
                }
                if (!lonField) {
                    lonField = document.createElement('input');
                    lonField.type = 'hidden';
                    lonField.name = 'geoLon';
                    lonField.id = 'geoLon';
                    form.appendChild(lonField);
                }
                latField.value = item.lat;
                lonField.value = item.lon;

                hideSuggestions();
            });

            suggestionsBox.appendChild(div);
        });

        suggestionsBox.style.display = 'block';
    }

    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    const handleAdresseInput = debounce(async () => {
        const query = (adresseInput.value || '').trim();
        if (query.length < 3) {
            hideSuggestions();
            return;
        }

        try {
            const params = new URLSearchParams({
                adresse: query,
                ville: villeInput.value.trim(),
                codePostal: cpInput.value.trim(),
            });

            const resp = await fetch('/api/geocode?' + params.toString(), {
                headers: { Accept: 'application/json' },
            });

            if (!resp.ok) {
                hideSuggestions();
                return;
            }

            const data = await resp.json();
            if (!data.ok) {
                hideSuggestions();
                return;
            }

            // L’API actuelle retourne UN résultat → on le met dans un tableau
            showSuggestions([data]);
        } catch (err) {
            console.error('Erreur autocomplétion adresse :', err);
            hideSuggestions();
        }
    }, 350);

    adresseInput.addEventListener('input', handleAdresseInput);

    document.addEventListener('click', (e) => {
        if (!suggestionsBox.contains(e.target) && e.target !== adresseInput) {
            hideSuggestions();
        }
    });

    /* Vérification à l’envoi du formulaire + popup */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const adresse = adresseInput.value.trim();
        const ville = villeInput.value.trim();
        const codePostal = cpInput.value.trim();

        if (!adresse || !ville || !codePostal) {
            form.submit(); // on laisse la validation serveur
            return;
        }

        setWarning('Vérification de l’adresse en cours…');

        try {
            const params = new URLSearchParams({
                adresse,
                ville,
                codePostal,
            });

            const resp = await fetch('/api/geocode?' + params.toString(), {
                headers: { Accept: 'application/json' },
            });

            if (!resp.ok) {
                console.error('Erreur HTTP /api/geocode :', resp.status);
                setWarning("Impossible de vérifier l’adresse. Le signalement sera tout de même envoyé.");
                form.submit();
                return;
            }

            const data = await resp.json();
            if (!data.ok) {
                setWarning(data.message || 'Adresse introuvable, merci de vérifier.');
                const okConfirm = window.confirm(
                    (data.message || 'Adresse introuvable.') +
                    '\n\nVoulez-vous quand même envoyer ce signalement ?'
                );
                if (okConfirm) form.submit();
                return;
            }

            // Mise à jour des champs avec l’adresse "propre"
            if (data.commune) villeInput.value = data.commune;
            if (data.postcode) cpInput.value = data.postcode;
            if (data.voie || data.label) {
                const numero = data.numero ? data.numero + ' ' : '';
                if (data.voie) {
                    adresseInput.value = (numero + data.voie).trim();
                } else {
                    adresseInput.value = data.label;
                }
            }

            // coords hidden
            let latField = document.getElementById('geoLat');
            let lonField = document.getElementById('geoLon');
            if (!latField) {
                latField = document.createElement('input');
                latField.type = 'hidden';
                latField.name = 'geoLat';
                latField.id = 'geoLat';
                form.appendChild(latField);
            }
            if (!lonField) {
                lonField = document.createElement('input');
                lonField.type = 'hidden';
                lonField.name = 'geoLon';
                lonField.id = 'geoLon';
                form.appendChild(lonField);
            }
            latField.value = data.lat;
            lonField.value = data.lon;

            setWarning('');

            // ==== POPUP DE CONFIRMATION (modale custom) ====
            const modalBackdrop = document.getElementById('confirm-modal-backdrop');
            const confirmAdresse = document.getElementById('confirm-adresse');
            const confirmVille = document.getElementById('confirm-ville');
            const confirmCp = document.getElementById('confirm-cp');
            const confirmWarning = document.getElementById('confirm-warning');
            const btnCancel = document.getElementById('confirm-cancel');
            const btnValidate = document.getElementById('confirm-validate');

            // Remplir les infos dans le popup
            if (confirmAdresse) confirmAdresse.textContent = adresseInput.value;
            if (confirmVille) confirmVille.textContent = villeInput.value;
            if (confirmCp) confirmCp.textContent = cpInput.value;
            if (confirmWarning) confirmWarning.textContent = '';

            if (!modalBackdrop) {
                // fallback : si pas de modal dans le HTML
                form.submit();
                return;
            }

            // Afficher la modale
            modalBackdrop.style.display = 'flex';

            const onCancel = () => {
                modalBackdrop.style.display = 'none';
                btnCancel.removeEventListener('click', onCancel);
                btnValidate.removeEventListener('click', onValidate);
            };

            const onValidate = () => {
                modalBackdrop.style.display = 'none';
                btnCancel.removeEventListener('click', onCancel);
                btnValidate.removeEventListener('click', onValidate);
                form.submit();
            };

            btnCancel.addEventListener('click', onCancel);
            btnValidate.addEventListener('click', onValidate);
        } catch (err) {
            console.error('Erreur vérification adresse avant submit :', err);
            form.submit();
        }
    });
    // ---------------------------------------------------------
    // 4) Upload de photo : drag & drop + prévisualisation
    // ---------------------------------------------------------
    const photoInput = document.getElementById('photo');
    const dropzone = document.getElementById('photo-dropzone');
    const filenameEl = document.getElementById('photo-filename');
    const previewWrapper = document.getElementById('photo-preview-wrapper');
    const previewImg = document.getElementById('photo-preview');
    const removeBtn = document.getElementById('photo-remove');

    if (photoInput && dropzone) {
        const resetPreview = () => {
            if (previewWrapper) previewWrapper.style.display = 'none';
            if (previewImg) previewImg.src = '';
            if (filenameEl) filenameEl.textContent = 'Aucune image sélectionnée';
        };

        const handleFiles = (files) => {
            if (!files || !files.length) {
                resetPreview();
                return;
            }

            const file = files[0];

            // on ne garde que les images
            if (!file.type.startsWith('image/')) {
                alert('Merci de sélectionner un fichier image (jpg, png, etc.).');
                photoInput.value = '';
                resetPreview();
                return;
            }

            if (filenameEl) {
                filenameEl.textContent = file.name;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg && e.target) {
                    previewImg.src = e.target.result;
                    if (previewWrapper) {
                        previewWrapper.style.display = 'flex';
                    }
                }
            };
            reader.readAsDataURL(file);
        };

        // changement via le bouton "Choisir un fichier"
        photoInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        // drag & drop sur la zone
        ['dragenter', 'dragover'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('is-dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer ? e.dataTransfer.files : null;
            if (files && files.length) {
                // on force aussi l'input file à contenir ce fichier
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                photoInput.files = dt.files;

                handleFiles(files);
            }
        });

        // bouton "Retirer l’image"
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                photoInput.value = '';
                resetPreview();
            });
        }
    }

});
