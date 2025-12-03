const form = document.getElementById('mainForm');
const serviceSelect = document.getElementById('service');
const carpetaFields = document.getElementById('carpetaFields');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const resultDiv = document.getElementById('result');

let documentsData = [];

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
            serviceSelect.innerHTML = '<option value="">Error cargando servicios</option>';
        }
    } catch (error) {
        console.error('Error fetching documents:', error);
        serviceSelect.innerHTML = '<option value="">Error cargando servicios</option>';
    }
}

function populateServiceSelect(documents) {
    serviceSelect.innerHTML = '<option value="">Seleccione un servicio...</option>';

    // Group by origin
    const grouped = documents.reduce((acc, doc) => {
        if (!acc[doc.origin]) {
            acc[doc.origin] = [];
        }
        acc[doc.origin].push(doc);
        return acc;
    }, {});

    // Add optgroups
    Object.keys(grouped).sort().forEach(origin => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = origin;

        grouped[origin].forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.script;
            option.textContent = doc.label;
            option.dataset.friendlyId = doc.friendlyid;
            optgroup.appendChild(option);
        });

        serviceSelect.appendChild(optgroup);
    });
}

// Load documents on page load
loadDocuments();

serviceSelect.addEventListener('change', (e) => {
    if (e.target.value === 'carpeta') {
        carpetaFields.style.display = 'block';
        document.getElementById('username').required = true;
        document.getElementById('email').required = true;
    } else {
        carpetaFields.style.display = 'none';
        document.getElementById('username').required = false;
        document.getElementById('email').required = false;
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const service = formData.get('service');

    if (!service) {
        showResult('error', 'Por favor seleccione un servicio');
        return;
    }

    const payload = {
        rut: formData.get('rut'),
        documento: formData.get('documento'),
        claveunica: formData.get('claveunica')
    };

    if (service === 'carpeta') {
        payload.username = formData.get('username');
        payload.email = formData.get('email');
    }

    setLoading(true);

    try {
        const response = await fetch(`/api/${service}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showResult('success', data.msg, data.data);
        } else {
            showResult('error', data.msg || 'Error desconocido', null, data.error);
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
