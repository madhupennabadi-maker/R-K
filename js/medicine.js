/**
 * RK Health - Medication Controller
 */

let medsState = [];
let medCurrentPage = 1;
const medPageSize = 5;

document.addEventListener('DOMContentLoaded', () => {
    // Form submission listener
    const medForm = document.getElementById('medicationForm');
    if (medForm) {
        medForm.addEventListener('submit', handleMedSubmit);
    }

    // Input listeners for search
    const searchInput = document.getElementById('medSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            medCurrentPage = 1;
            renderMedsTable();
        });
    }

    // Pagination listeners
    const prevBtn = document.getElementById('medPrevPage');
    const nextBtn = document.getElementById('medNextPage');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (medCurrentPage > 1) {
                medCurrentPage--;
                renderMedsTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredMeds().length / medPageSize);
            if (medCurrentPage < totalPages) {
                medCurrentPage++;
                renderMedsTable();
            }
        });
    }
});

/**
 * Loads medicines from database layer
 */
async function loadMedications() {
    try {
        medsState = await RkDb.getMedicines();
        renderMedsTable();
    } catch (error) {
        console.error("Error loading medications:", error);
    }
}

/**
 * Filter medicines state based on queries
 */
function getFilteredMeds() {
    const searchVal = document.getElementById('medSearch').value.toLowerCase().trim();
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    return medsState.filter(med => {
        // Enforce patient-level filtering
        if (role === 'Patient') {
            const isPatientMed = (med.patientName && med.patientName === activeUser) || 
                                 (med.notes && med.notes.toLowerCase().includes(activeUser.toLowerCase()));
            if (!isPatientMed) {
                return false;
            }
        }

        return !searchVal || 
            med.medicineName.toLowerCase().includes(searchVal) ||
            med.phoneNumber.includes(searchVal) ||
            (med.patientName && med.patientName.toLowerCase().includes(searchVal)) ||
            (med.notes && med.notes.toLowerCase().includes(searchVal));
    }).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Renders the filtered list of medications to the table layout
 */
function renderMedsTable() {
    const tableBody = document.querySelector('#medicationTable tbody');
    if (!tableBody) return;

    const filtered = getFilteredMeds();
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / medPageSize) || 1;

    if (medCurrentPage > totalPages) medCurrentPage = totalPages;

    const startIndex = (medCurrentPage - 1) * medPageSize;
    const endIndex = Math.min(startIndex + medPageSize, totalCount);

    tableBody.innerHTML = '';

    if (totalCount === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 40px;">
                    <span class="material-icons-round" style="font-size: 48px; margin-bottom: 10px; display: block; color: var(--text-light);">healing</span>
                    No active medication schedules recorded.
                </td>
            </tr>
        `;
        updateMedPaginationUI(0, 0, 0);
        return;
    }

    const pageSlice = filtered.slice(startIndex, endIndex);

    pageSlice.forEach(med => {
        const tr = document.createElement('tr');
        
        // Build beautiful badges for dosage frequencies
        let freqHtml = '';
        if (med.morning) freqHtml += `<span class="status-badge pending" style="margin-right: 4px; background: rgba(245, 158, 11, 0.08); color: #b45309;"><span class="material-icons-round" style="font-size: 11px; margin-right: 2px;">light_mode</span>Morning</span>`;
        if (med.afternoon) freqHtml += `<span class="status-badge pending" style="margin-right: 4px; background: rgba(245, 158, 11, 0.08); color: #d97706;"><span class="material-icons-round" style="font-size: 11px; margin-right: 2px;">wb_sunny</span>Afternoon</span>`;
        if (med.night) freqHtml += `<span class="status-badge active" style="background: rgba(37, 99, 235, 0.08); color: #1d4ed8;"><span class="material-icons-round" style="font-size: 11px; margin-right: 2px;">dark_mode</span>Night</span>`;
        
        if (!freqHtml) freqHtml = '<span class="text-light">As Needed</span>';

        // Format dates
        const dateOptions = { month: 'short', day: 'numeric' };
        const startStr = new Date(med.startDate).toLocaleDateString('en-US', dateOptions);
        const endStr = new Date(med.endDate).toLocaleDateString('en-US', dateOptions);

        // SMS delivery status badge classes
        let statusClass = 'pending';
        if (med.smsStatus === 'Delivered') statusClass = 'completed';
        if (med.smsStatus === 'Failed') statusClass = 'cancelled';

        let displayNotes = med.notes || '-';
        if (med.patientName && !displayNotes.toLowerCase().includes(med.patientName.toLowerCase())) {
            displayNotes = `[Patient: ${med.patientName}] ${displayNotes}`;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(med.medicineName)}</strong></td>
            <td><span class="status-badge active">${escapeHtml(med.dosage)}</span></td>
            <td><div>${freqHtml}</div></td>
            <td><span style="font-size: 12.5px;">${startStr} - ${endStr}</span></td>
            <td><code>${escapeHtml(med.phoneNumber)}</code></td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(med.smsStatus || 'Pending')}</span></td>
            <td><span style="font-size: 12px; color: var(--text-secondary); max-width: 150px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(displayNotes)}">${escapeHtml(displayNotes)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="openMedicationModal('${med.id}')" title="Edit Prescription">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteMedConfirm('${med.id}')" title="Delete Schedule">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateMedPaginationUI(startIndex + 1, endIndex, totalCount);
}

function updateMedPaginationUI(start, end, total) {
    const info = document.getElementById('medPaginationInfo');
    const prevBtn = document.getElementById('medPrevPage');
    const nextBtn = document.getElementById('medNextPage');

    if (info) info.textContent = `Showing ${start}-${end} of ${total}`;
    if (prevBtn) prevBtn.disabled = medCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = medCurrentPage >= Math.ceil(total / medPageSize);
}

// ==========================================
// MODAL & CRUD HANDLERS
// ==========================================

function openMedicationModal(id = '') {
    const modal = document.getElementById('medicationModal');
    const title = document.getElementById('medModalTitle');
    const form = document.getElementById('medicationForm');

    form.reset();
    document.getElementById('medId').value = '';
    
    // Clear validation borders
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');

    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    if (id) {
        title.textContent = "Edit Medication Schedule";
        const med = medsState.find(m => m.id === id);
        if (med) {
            document.getElementById('medId').value = med.id;
            document.getElementById('medPatientName').value = med.patientName || '';
            document.getElementById('medMedicineName').value = med.medicineName;
            document.getElementById('medDosage').value = med.dosage;
            document.getElementById('medMorning').checked = med.morning;
            document.getElementById('medAfternoon').checked = med.afternoon;
            document.getElementById('medNight').checked = med.night;
            document.getElementById('medStartDate').value = med.startDate;
            document.getElementById('medEndDate').value = med.endDate;
            document.getElementById('medPhoneNumber').value = med.phoneNumber;
            document.getElementById('medNotes').value = med.notes || '';

            // Try to extract patient name from notes if not set on the object (for initial mock data)
            if (!med.patientName && med.notes) {
                const match = med.notes.match(/Patient:\s*([^,\.\n\r]+)/i);
                if (match) {
                    document.getElementById('medPatientName').value = match[1].trim();
                }
            }

            if (role === 'Patient') {
                document.getElementById('medPatientName').disabled = true;
            }
        }
    } else {
        title.textContent = "Schedule Medication";
        if (role === 'Patient') {
            const input = document.getElementById('medPatientName');
            if (input) {
                input.value = activeUser;
                input.disabled = true;
            }
        }
    }

    modal.style.display = 'flex';
}

function closeMedicationModal() {
    document.getElementById('medicationModal').style.display = 'none';
}

async function handleMedSubmit(e) {
    e.preventDefault();

    const form = e.target;
    let isValid = true;

    // Field required checks
    const fields = [
        { id: 'medPatientName', errId: 'medPatientNameError' },
        { id: 'medMedicineName', errId: 'medMedicineNameError' },
        { id: 'medDosage', errId: 'medDosageError' },
        { id: 'medStartDate', errId: 'medStartDateError' },
        { id: 'medEndDate', errId: 'medEndDateError' },
        { id: 'medPhoneNumber', errId: 'medPhoneNumberError' }
    ];

    fields.forEach(f => {
        const input = document.getElementById(f.id);
        const err = document.getElementById(f.errId);

        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            if (err) err.style.display = 'block';
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
            if (err) err.style.display = 'none';
        }
    });

    // Check at least one frequency checkbox
    const morning = document.getElementById('medMorning').checked;
    const afternoon = document.getElementById('medAfternoon').checked;
    const night = document.getElementById('medNight').checked;
    
    if (!morning && !afternoon && !night) {
        showToast("Please choose at least one reminder timing checkbox (Morning/Afternoon/Night)", "warning");
        isValid = false;
    }

    // Phone format regex
    const phoneInput = document.getElementById('medPhoneNumber');
    const phoneVal = phoneInput.value.trim();
    const phoneRegex = /^\+?[0-9\s-]{8,15}$/; // Simple international check
    
    if (phoneVal && !phoneRegex.test(phoneVal)) {
        phoneInput.classList.add('is-invalid');
        const err = document.getElementById('medPhoneNumberError');
        if (err) {
            err.textContent = "Please enter a valid international phone format (e.g. +919876543210)";
            err.style.display = 'block';
        }
        isValid = false;
    }

    if (!isValid) return;

    const medData = {
        id: document.getElementById('medId').value || undefined,
        patientName: document.getElementById('medPatientName').value.trim(),
        medicineName: document.getElementById('medMedicineName').value.trim(),
        dosage: document.getElementById('medDosage').value.trim(),
        frequency: `${morning ? 'Morning ' : ''}${afternoon ? 'Afternoon ' : ''}${night ? 'Night' : ''}`.trim().replace(/\s+/g, ', '),
        morning: morning,
        afternoon: afternoon,
        night: night,
        startDate: document.getElementById('medStartDate').value,
        endDate: document.getElementById('medEndDate').value,
        phoneNumber: phoneVal,
        notes: document.getElementById('medNotes').value.trim()
    };

    try {
        await RkDb.saveMedicine(medData);
        showToast(medData.id ? "Medication schedule updated" : "Medication schedule and SMS alerts created!", "success");
        closeMedicationModal();
        loadMedications();

        if (document.getElementById('dashboardSection').classList.contains('active')) {
            initDashboardCharts();
        }
    } catch {
        showToast("Error scheduling medication", "error");
    }
}

async function deleteMedConfirm(id) {
    if (confirm("Are you sure you want to stop this medication schedule and alerts?")) {
        try {
            await RkDb.deleteMedicine(id);
            showToast("Prescription alert stopped", "success");
            loadMedications();

            if (document.getElementById('dashboardSection').classList.contains('active')) {
                initDashboardCharts();
            }
        } catch {
            showToast("Error stopping alerts", "error");
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
