const form = document.getElementById('mainForm');
const servicesContainer = document.getElementById('servicesContainer');
const servicesError = document.getElementById('servicesError');
const carpetaFields = document.getElementById('carpetaFields');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const resultDiv = document.getElementById('result');
const emailInput = document.getElementById('email');
const emailGroup = document.getElementById('emailGroup');

let documentsData = [];
let selectedServices = new Set();
let currentStep = 1;
const totalSteps = 4;

// Check URL parameters for requester email
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from') || urlParams.get('requester') || urlParams.get('email');

    if (fromParam && fromParam.includes('@')) {
        // Valid email provided in URL - hide the field and pre-fill
        emailInput.value = fromParam;
        emailGroup.style.display = 'none';
        emailInput.required = false;
    } else {
        // No email in URL - show the field as required
        emailGroup.style.display = 'block';
        emailInput.required = true;
    }
}

// Check URL params on page load
checkUrlParams();

// RUT validation function for Chilean IDs
function validateRut(rut) {
    // Remove formatting (dots and hyphen)
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');

    if (cleanRut.length < 2) {
        return false;
    }

    // Separate body and verifier
    const body = cleanRut.slice(0, -1);
    const verifier = cleanRut.slice(-1).toLowerCase();

    // Calculate expected verifier using Chilean algorithm
    let sum = 0;
    let multiplier = 2;

    // Calculate from right to left
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedVerifier = 11 - (sum % 11);
    let expectedVerifierStr;

    if (expectedVerifier === 11) {
        expectedVerifierStr = '0';
    } else if (expectedVerifier === 10) {
        expectedVerifierStr = 'k';
    } else {
        expectedVerifierStr = expectedVerifier.toString();
    }

    return verifier === expectedVerifierStr;
}

// RUT formatting function (defined globally so it can be used after localStorage load)
function formatRut(input) {
    // Save cursor position
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;

    // Remove everything except numbers and K
    let value = input.value.replace(/[^0-9kK]/g, '');

    if (value.length === 0) {
        input.value = '';
        return;
    }

    // Only allow K at the end
    const kIndex = value.toLowerCase().indexOf('k');
    if (kIndex !== -1 && kIndex !== value.length - 1) {
        // Remove K if it's not at the end
        value = value.replace(/[kK]/g, '');
    }

    let formatted;
    if (value.length === 1) {
        // Just one character, no formatting needed
        formatted = value;
    } else {
        // Separate body and verification digit
        let body = value.slice(0, -1);
        let verifier = value.slice(-1).toUpperCase();

        // Format body with dots
        if (body.length > 0) {
            body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        // Combine with hyphen
        formatted = `${body}-${verifier}`;
    }

    input.value = formatted;

    // Adjust cursor position based on the change in length
    const newLength = formatted.length;
    const lengthDiff = newLength - oldLength;
    let newCursorPosition = cursorPosition + lengthDiff;

    // Make sure cursor stays within bounds
    if (newCursorPosition < 0) newCursorPosition = 0;
    if (newCursorPosition > newLength) newCursorPosition = newLength;

    input.setSelectionRange(newCursorPosition, newCursorPosition);
}

// Documento formatting function (XXX.XXX.XXX)
function formatDocumento(input) {
    let value = input.value.replace(/[^0-9]/g, ''); // Remove everything except numbers

    if (value.length === 0) {
        input.value = '';
        return;
    }

    // Format with dots every 3 digits
    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = formatted;
}

// RUT formatting - attach input listener
const rutInput = document.getElementById('rut');
if (rutInput) {
    rutInput.addEventListener('input', (e) => {
        formatRut(e.target);
    });
}

// Documento formatting - attach input listener
const documentoInput = document.getElementById('documento');
if (documentoInput) {
    documentoInput.addEventListener('input', (e) => {
        formatDocumento(e.target);
    });
}

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

    // Separate enabled and disabled documents
    const enabledDocs = documents.filter(doc => doc.enabled);
    const disabledDocs = documents.filter(doc => !doc.enabled);

    // Group enabled documents by origin
    const groupedEnabled = enabledDocs.reduce((acc, doc) => {
        if (!acc[doc.origin]) {
            acc[doc.origin] = [];
        }
        acc[doc.origin].push(doc);
        return acc;
    }, {});

    // Group disabled documents by origin
    const groupedDisabled = disabledDocs.reduce((acc, doc) => {
        if (!acc[doc.origin]) {
            acc[doc.origin] = [];
        }
        acc[doc.origin].push(doc);
        return acc;
    }, {});

    // Render enabled documents first
    Object.keys(groupedEnabled).sort().forEach(origin => {
        renderOriginGroup(origin, groupedEnabled[origin]);
    });

    // Render disabled documents last
    Object.keys(groupedDisabled).sort().forEach(origin => {
        renderOriginGroup(origin, groupedDisabled[origin]);
    });
}

function renderOriginGroup(origin, docs) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'service-group';

    const groupTitle = document.createElement('div');
    groupTitle.className = 'service-group-title';
    groupTitle.textContent = origin;
    groupDiv.appendChild(groupTitle);

    docs.forEach(doc => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'service-checkbox';
        if (!doc.enabled) {
            checkboxDiv.classList.add('disabled');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `service-${doc.id}`;
        checkbox.value = doc.id;
        checkbox.dataset.documentId = doc.id;
        checkbox.disabled = !doc.enabled;

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedServices.add(doc.id);
                if (doc.id === 'carpeta') {
                    carpetaFields.style.display = 'block';
                    document.getElementById('username').required = true;
                }
                // Mutual exclusion for matrimonio certificates
                if (doc.id === 'matrimonio') {
                    const nomatrimonioCheckbox = document.getElementById('service-nomatrimonio');
                    if (nomatrimonioCheckbox?.checked) {
                        nomatrimonioCheckbox.checked = false;
                        selectedServices.delete('nomatrimonio');
                    }
                } else if (doc.id === 'nomatrimonio') {
                    const matrimonioCheckbox = document.getElementById('service-matrimonio');
                    if (matrimonioCheckbox?.checked) {
                        matrimonioCheckbox.checked = false;
                        selectedServices.delete('matrimonio');
                    }
                }
            } else {
                selectedServices.delete(doc.id);
                // Hide carpeta fields only if carpeta is not selected
                if (doc.id === 'carpeta' && !selectedServices.has('carpeta')) {
                    carpetaFields.style.display = 'none';
                    document.getElementById('username').required = false;
                }
            }
            servicesError.style.display = 'none';
            updateDocumentoFieldVisibility();
            updateNextButtonState();
        });

        const label = document.createElement('label');
        label.htmlFor = `service-${doc.id}`;
        label.textContent = doc.label;
        if (!doc.enabled) {
            label.textContent += ' (No disponible - 2FA requerido)';
        }

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        groupDiv.appendChild(checkboxDiv);
    });

    servicesContainer.appendChild(groupDiv);
}

// Update documento field visibility based on Registro Civil selection
function updateDocumentoFieldVisibility() {
    const registroCivilDocs = ['matrimonio', 'nomatrimonio', 'nacimiento'];
    const hasRegistroCivil = Array.from(selectedServices).some(service => registroCivilDocs.includes(service));
    const documentoGroup = document.getElementById('documento')?.closest('.form-group');

    if (documentoGroup) {
        documentoGroup.style.display = hasRegistroCivil ? 'block' : 'none';
        document.getElementById('documento').required = hasRegistroCivil;
    }
}

// Update next button state based on service selection
function updateNextButtonState() {
    const nextBtn = document.getElementById('nextBtn');
    if (currentStep === 1) {
        nextBtn.disabled = selectedServices.size === 0;
    }
}

// Load documents on page load
loadDocuments();

// Wizard navigation
function showStep(step) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const stepElement = document.getElementById(`step${i}`);
        if (stepElement) {
            stepElement.style.display = i === step ? 'block' : 'none';
        }
    }

    currentStep = step;

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    prevBtn.style.display = 'inline-block';
    prevBtn.disabled = step === 1;
    nextBtn.style.display = step === totalSteps ? 'none' : 'inline-block';
    nextBtn.disabled = false;
    submitBtn.style.display = step === totalSteps ? 'inline-block' : 'none';

    // Update next button state for step 1 (services selection)
    if (step === 1) {
        updateNextButtonState();
    }

    // Populate confirmation summary on step 4
    if (step === 4) {
        populateConfirmationSummary();
    }

    // Update email preview in step 3
    if (step === 3) {
        const emailPreviewInStep = document.querySelector('#step3 #emailPreview');
        const email = document.getElementById('email').value;
        if (emailPreviewInStep && email) {
            emailPreviewInStep.textContent = email;
        }
    }
}

function validateStep(step) {
    if (step === 1) {
        // Validate services selection
        if (selectedServices.size === 0) {
            servicesError.style.display = 'block';
            servicesError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        servicesError.style.display = 'none';
        return true;
    } else if (step === 2) {
        // Validate credentials
        const rut = document.getElementById('rut');
        const claveunica = document.getElementById('claveunica');
        const documento = document.getElementById('documento');
        const email = document.getElementById('email');

        const fields = [rut, claveunica];
        if (documento.required) {
            fields.push(documento);
        }
        if (email.required) {
            fields.push(email);
        }

        for (const field of fields) {
            if (!field.value.trim()) {
                field.reportValidity();
                return false;
            }
        }

        // Validate RUT using Chilean algorithm
        if (!validateRut(rut.value)) {
            rut.setCustomValidity('RUT inválido');
            rut.reportValidity();
            rut.setCustomValidity(''); // Reset for next validation
            return false;
        }

        // Validate email format if required
        if (email.required && !email.checkValidity()) {
            email.reportValidity();
            return false;
        }

        // Validate carpeta fields if carpeta is selected
        if (selectedServices.has('carpeta')) {
            const username = document.getElementById('username');

            if (!username.value.trim()) {
                username.reportValidity();
                return false;
            }
        }

        return true;
    } else if (step === 3) {
        // Validate delivery method selection
        const selectedMethods = Array.from(document.querySelectorAll('#step3 .delivery-checkbox-input:checked'));
        const deliveryError = document.getElementById('deliveryError');

        if (selectedMethods.length === 0) {
            deliveryError.style.display = 'block';
            deliveryError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        deliveryError.style.display = 'none';
        return true;
    }

    return true;
}

function populateConfirmationSummary() {
    // Populate services
    const servicesList = document.getElementById('summary-services');
    servicesList.innerHTML = '';
    selectedServices.forEach(serviceId => {
        const serviceDoc = documentsData.find(d => d.id === serviceId);
        const serviceName = serviceDoc ? serviceDoc.label : serviceId;
        const li = document.createElement('li');
        li.textContent = serviceName;
        servicesList.appendChild(li);
    });

    // Populate credentials
    document.getElementById('summary-rut').textContent = document.getElementById('rut').value;
    document.getElementById('summary-email').textContent = document.getElementById('email').value;

    // Show/hide documento based on Registro Civil selection
    const registroCivilDocs = ['matrimonio', 'nomatrimonio', 'nacimiento'];
    const hasRegistroCivil = Array.from(selectedServices).some(service => registroCivilDocs.includes(service));
    const documentoRow = document.getElementById('summary-documento-row');

    if (hasRegistroCivil) {
        documentoRow.style.display = 'block';
        document.getElementById('summary-documento').textContent = document.getElementById('documento').value;
    } else {
        documentoRow.style.display = 'none';
    }

    // Populate delivery methods
    const deliveryList = document.getElementById('summary-delivery');
    deliveryList.innerHTML = '';
    const selectedMethods = Array.from(document.querySelectorAll('#step3 .delivery-checkbox-input:checked'));
    selectedMethods.forEach(checkbox => {
        const li = document.createElement('li');
        if (checkbox.value === 'email') {
            li.textContent = `Por email al correo ${document.getElementById('email').value}`;
        } else if (checkbox.value === 'jogi') {
            li.textContent = 'En mis carpetas en Jogi';
        }
        deliveryList.appendChild(li);
    });
}

// Next button handler
document.getElementById('nextBtn').addEventListener('click', () => {
    if (validateStep(currentStep)) {
        showStep(currentStep + 1);
    }
});

// Previous button handler
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
});

// Initialize wizard on first step
showStep(1);

// LocalStorage management for form inputs
const STORAGE_KEY_PREFIX = 'jogiscraper_';

function saveToLocalStorage(fieldName, value) {
    // Don't save claveunica
    if (fieldName === 'claveunica') return;
    try {
        localStorage.setItem(STORAGE_KEY_PREFIX + fieldName, value);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage(fieldName) {
    try {
        return localStorage.getItem(STORAGE_KEY_PREFIX + fieldName);
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}

// Set custom validation messages in Spanish
document.addEventListener('DOMContentLoaded', () => {
    const requiredInputs = document.querySelectorAll('input[required], select[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('invalid', () => {
            if (input.validity.valueMissing) {
                input.setCustomValidity('Por favor, complete este campo');
            } else if (input.validity.typeMismatch && input.type === 'email') {
                input.setCustomValidity('Por favor, ingrese un correo electrónico válido');
            }
        });

        input.addEventListener('input', () => {
            input.setCustomValidity('');
        });
    });

    // Load saved values from localStorage
    const formInputs = ['rut', 'documento', 'email', 'username'];
    formInputs.forEach(fieldName => {
        const input = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
        if (input) {
            const savedValue = loadFromLocalStorage(fieldName);
            if (savedValue) {
                input.value = savedValue;

                // Format RUT after loading from localStorage
                if (fieldName === 'rut') {
                    formatRut(input);
                }

                // Format documento after loading from localStorage
                if (fieldName === 'documento') {
                    formatDocumento(input);
                }
            }

            // Save on blur (except claveunica)
            if (fieldName !== 'claveunica') {
                input.addEventListener('blur', () => {
                    saveToLocalStorage(fieldName, input.value);
                });
            }
        }
    });
});

// Form submission handler (from step 4)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Final validation before submission
    if (selectedServices.size === 0) {
        servicesError.style.display = 'block';
        showStep(2);
        return;
    }

    // Get delivery methods from step 3
    const selectedMethods = Array.from(document.querySelectorAll('#step3 .delivery-checkbox-input:checked'))
        .map(cb => cb.value);

    if (selectedMethods.length === 0) {
        showStep(3);
        return;
    }

    // Prepare form data
    const formData = new FormData(form);
    const payload = {
        rut: formData.get('rut'),
        claveunica: formData.get('claveunica'),
        documento: formData.get('documento'),
        email: formData.get('email'),
        services: Array.from(selectedServices),
        deliveryMethod: selectedMethods
    };

    // Add carpeta fields if carpeta service is selected
    if (selectedServices.has('carpeta')) {
        payload.username = formData.get('username');
        payload.email = formData.get('email');
    }

    // Submit request
    await submitRequest(selectedMethods, payload);
});

async function submitRequest(deliveryMethod, payload) {
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
            // Show success message for background job
            showSuccessMessage(data.requestId, deliveryMethod, payload.email);
            // Reset form and go back to step 1
            form.reset();
            selectedServices.clear();
            showStep(1);
        } else {
            showResult('error', data.error || 'Error procesando la solicitud');
        }
    } catch (error) {
        showResult('error', 'Error de conexión', null, error.message);
    } finally {
        setLoading(false);
    }
}

function showSuccessMessage(requestId, deliveryMethods, email) {
    const modal = document.getElementById('resultsModal');
    const modalBody = document.getElementById('modalBody');

    // Handle array of delivery methods
    const methods = Array.isArray(deliveryMethods) ? deliveryMethods : [deliveryMethods];

    const deliveryTexts = methods.map(method => {
        if (method === 'email') {
            return `📧 Por correo electrónico a <strong>${email}</strong>`;
        } else if (method === 'jogi') {
            return `📁 En sus carpetas de Jogi`;
        }
        return method;
    });

    const deliveryList = deliveryTexts.map(text => `<li style="margin-bottom: 8px;">${text}</li>`).join('');

    const html = `
        <div class="modal-summary" style="background: #d4edda; border-left-color: #28a745;">
            <h3 style="color: #155724;">✓ Solicitud Recibida</h3>
            <p style="color: #155724; margin-top: 10px;">
                Su solicitud #${requestId} ha sido registrada exitosamente y está siendo procesada en segundo plano.
            </p>
        </div>
        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #0e7490;">Métodos de entrega seleccionados:</h4>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #555;">
                ${deliveryList}
            </ul>
            <p style="margin-top: 15px; color: #666; font-size: 0.9rem;">
                ⏱️ <strong>Tiempo estimado:</strong> La recopilación puede tomar varias horas dependiendo de los servicios solicitados.
            </p>
        </div>
    `;

    modalBody.innerHTML = html;
    openModal();
}

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
    const modal = document.getElementById('resultsModal');
    const modalBody = document.getElementById('modalBody');

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    let html = `<div class="modal-summary">
        <h3>Resumen de Resultados</h3>
        <p><strong>${successCount}</strong> de <strong>${totalCount}</strong> documentos procesados exitosamente</p>`;

    if (requestId) {
        html += `<p style="margin-top: 8px; font-size: 0.9rem;">ID de Solicitud: <strong>#${requestId}</strong></p>`;
    }

    html += `</div>`;

    results.forEach(result => {
        const serviceDoc = documentsData.find(d => d.id === result.service);
        const serviceName = serviceDoc ? serviceDoc.label : result.service;

        html += `<div class="result-item ${result.success ? 'success' : 'error'}">`;
        html += `<h4>${result.success ? '✓' : '✗'} ${serviceName}</h4>`;
        html += `<p>${result.msg || (result.success ? 'Completado exitosamente' : 'Error al procesar')}</p>`;

        if (result.error) {
            html += `<details style="margin-top: 8px;"><summary style="cursor: pointer; color: #666;">Ver detalles del error</summary><pre style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow-x: auto; font-size: 0.85rem;">${JSON.stringify(result.error, null, 2)}</pre></details>`;
        }

        if (result.data && result.success) {
            const blob = base64ToBlob(result.data, 'application/pdf');
            const url = URL.createObjectURL(blob);
            html += `<a href="${url}" download="${result.service}.pdf" class="download-btn">⬇ Descargar PDF</a>`;
        }

        html += `</div>`;
    });

    modalBody.innerHTML = html;
    openModal();
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

// Modal functions
function openModal() {
    const modal = document.getElementById('resultsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('resultsModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Results modal event listeners
const modal = document.getElementById('resultsModal');
const modalClose = document.querySelector('.modal-close');

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

// Close modal when clicking outside
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modal && modal.classList.contains('show')) {
            closeModal();
        }
    }
});

// Hide delivery error when user selects an option in step 3
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('delivery-checkbox-input')) {
        const deliveryError = document.getElementById('deliveryError');
        if (deliveryError) {
            deliveryError.style.display = 'none';
        }
    }
});
