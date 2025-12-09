const form = document.getElementById('mainForm');
const servicesContainer = document.getElementById('servicesContainer');
const servicesError = document.getElementById('servicesError');
const carpetaFields = document.getElementById('carpetaFields');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const resultDiv = document.getElementById('result');
const requesterEmailInput = document.getElementById('requesterEmail');
const requesterEmailGroup = document.getElementById('requesterEmailGroup');

let documentsData = [];
let selectedServices = new Set();

// Check URL parameters for requester email
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from') || urlParams.get('requester') || urlParams.get('email');

    if (fromParam && fromParam.includes('@')) {
        // Valid email provided in URL - hide the field and pre-fill
        requesterEmailInput.value = fromParam;
        requesterEmailGroup.style.display = 'none';
        requesterEmailInput.required = false;
    } else {
        // No email in URL - show the field as required
        requesterEmailGroup.style.display = 'block';
        requesterEmailInput.required = true;
    }
}

// Check URL params on page load
checkUrlParams();

// Toggle password visibility
const togglePasswordBtn = document.querySelector('.toggle-password');
const claveUnicaInput = document.getElementById('claveunica');

if (togglePasswordBtn && claveUnicaInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = claveUnicaInput.type === 'password';
        claveUnicaInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.classList.toggle('visible', !isPassword);
        togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
}

// Load documents from API on page load
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const data = await response.json();

        if (data.success) {
            documentsData = data.data;
            populateServiceSelect(documentsData);
        } else {
            console.error('Failed to load documents:', data.error);
            servicesContainer.innerHTML = '<p class="loading-text">Error cargando servicios</p>';
        }
    } catch (error) {
        console.error('Error fetching documents:', error);
        servicesContainer.innerHTML = '<p class="loading-text">Error cargando servicios</p>';
    }
}

function populateServiceSelect(documents) {
    servicesContainer.innerHTML = '';

    // Group by origin
    const grouped = documents.reduce((acc, doc) => {
        if (!acc[doc.origin]) {
            acc[doc.origin] = [];
        }
        acc[doc.origin].push(doc);
        return acc;
    }, {});

    // Create checkboxes grouped by origin
    Object.keys(grouped).sort().forEach(origin => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'service-group';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'service-group-title';
        groupTitle.textContent = origin;
        groupDiv.appendChild(groupTitle);

        grouped[origin].forEach(doc => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'service-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `service-${doc.script}`;
            checkbox.value = doc.script;
            checkbox.dataset.friendlyId = doc.friendlyid;

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedServices.add(doc.script);
                    if (doc.script === 'carpeta') {
                        carpetaFields.style.display = 'block';
                        document.getElementById('username').required = true;
                        document.getElementById('email').required = true;
                    }
                } else {
                    selectedServices.delete(doc.script);
                    // Hide carpeta fields only if carpeta is not selected
                    if (doc.script === 'carpeta' && !selectedServices.has('carpeta')) {
                        carpetaFields.style.display = 'none';
                        document.getElementById('username').required = false;
                        document.getElementById('email').required = false;
                    }
                }
                servicesError.style.display = 'none';
            });

            const label = document.createElement('label');
            label.htmlFor = `service-${doc.script}`;
            label.textContent = doc.label;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            groupDiv.appendChild(checkboxDiv);
        });

        servicesContainer.appendChild(groupDiv);
    });
}

// Load documents on page load
loadDocuments();

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedServices.size === 0) {
        servicesError.style.display = 'block';
        servicesError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const formData = new FormData(form);
    const payload = {
        rut: formData.get('rut'),
        claveunica: formData.get('claveunica'),
        documento: formData.get('documento'),
        requesterEmail: formData.get('requesterEmail'),
        services: Array.from(selectedServices)
    };

    // Add carpeta fields if carpeta service is selected
    if (selectedServices.has('carpeta')) {
        payload.username = formData.get('username');
        payload.email = formData.get('email');
    }

    setLoading(true);
    resultDiv.innerHTML = '';
    resultDiv.style.display = 'none';

    try {
        const response = await fetch('/api/submit-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showMultipleResults(data.results, data.requestId);
        } else {
            showResult('error', data.error || 'Error procesando la solicitud');
        }
    } catch (error) {
        showResult('error', 'Error de conexión', null, error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

function showMultipleResults(results, requestId = null) {
    resultDiv.className = 'result';
    resultDiv.style.display = 'block';

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    let html = `<h3>Resultados (${successCount}/${totalCount} exitosos)</h3>`;

    if (requestId) {
        html += `<p style="font-size: 0.9rem; color: #666; margin-top: 5px;">ID de Solicitud: <strong>${requestId}</strong></p>`;
    }

    results.forEach(result => {
        const serviceDoc = documentsData.find(d => d.script === result.service);
        const serviceName = serviceDoc ? serviceDoc.label : result.service;

        html += `<div class="result-item ${result.success ? 'success' : 'error'}">`;
        html += `<h4>${result.success ? '✓' : '✗'} ${serviceName}</h4>`;
        html += `<p>${result.msg || (result.success ? 'Completado' : 'Error')}</p>`;

        if (result.error) {
            html += `<details style="margin-top: 8px;"><summary>Detalles del error</summary><pre style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow-x: auto; font-size: 0.85rem;">${JSON.stringify(result.error, null, 2)}</pre></details>`;
        }

        if (result.data && result.success) {
            const blob = base64ToBlob(result.data, 'application/pdf');
            const url = URL.createObjectURL(blob);
            html += `<a href="${url}" download="${result.service}.pdf" class="download-btn">Descargar PDF</a>`;
        }

        html += `</div>`;
    });

    resultDiv.innerHTML = html;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showResult(type, message, base64Data = null, errorDetail = null) {
    resultDiv.className = `result ${type}`;
    resultDiv.style.display = 'block';

    let html = `<h3>${type === 'success' ? '✓ Éxito' : '✗ Error'}</h3><p>${message}</p>`;

    if (errorDetail) {
        html += `<details style="margin-top: 10px;"><summary>Detalles del error</summary><pre style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow-x: auto;">${JSON.stringify(errorDetail, null, 2)}</pre></details>`;
    }

    if (base64Data) {
        const blob = base64ToBlob(base64Data, 'application/pdf');
        const url = URL.createObjectURL(blob);
        html += `<a href="${url}" download="documento.pdf" class="download-btn">Descargar PDF</a>`;
    }

    resultDiv.innerHTML = html;

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}
