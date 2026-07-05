/**
 * RK Health - Electronic Health Records (EHR) Controller
 */

let healthState = [];
let healthCurrentPage = 1;
const healthPageSize = 5;

document.addEventListener('DOMContentLoaded', () => {
    // Form submission listener
    const healthForm = document.getElementById('healthForm');
    if (healthForm) {
        healthForm.addEventListener('submit', handleHealthSubmit);
    }

    // Input listeners for search
    const searchInput = document.getElementById('healthSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            healthCurrentPage = 1;
            renderHealthTable();
        });
    }

    const filterGender = document.getElementById('healthFilterGender');
    if (filterGender) {
        filterGender.addEventListener('change', () => {
            healthCurrentPage = 1;
            renderHealthTable();
        });
    }

    // Pagination listeners
    const prevBtn = document.getElementById('healthPrevPage');
    const nextBtn = document.getElementById('healthNextPage');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (healthCurrentPage > 1) {
                healthCurrentPage--;
                renderHealthTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredHealth().length / healthPageSize);
            if (healthCurrentPage < totalPages) {
                healthCurrentPage++;
                renderHealthTable();
            }
        });
    }
});

/**
 * Loads health records from database layer
 */
async function loadHealthRecords() {
    try {
        healthState = await RkDb.getHealthRecords();
        renderHealthTable();
    } catch (error) {
        console.error("Error loading health records:", error);
    }
}

/**
 * Filter health state records based on queries
 */
function getFilteredHealth() {
    const searchVal = document.getElementById('healthSearch').value.toLowerCase().trim();
    const genderVal = document.getElementById('healthFilterGender').value;
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    return healthState.filter(rec => {
        // Enforce patient-level filtering
        if (role === 'Patient' && rec.patientName !== activeUser) {
            return false;
        }

        const matchesSearch = !searchVal || 
            rec.patientName.toLowerCase().includes(searchVal) ||
            rec.doctor.toLowerCase().includes(searchVal) ||
            rec.diagnosis.toLowerCase().includes(searchVal) ||
            rec.prescription.toLowerCase().includes(searchVal);

        const matchesGender = !genderVal || rec.gender === genderVal;

        return matchesSearch && matchesGender;
    }).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Renders the filtered EHR list onto the table
 */
function renderHealthTable() {
    const tableBody = document.querySelector('#healthTable tbody');
    if (!tableBody) return;

    const filtered = getFilteredHealth();
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / healthPageSize) || 1;

    if (healthCurrentPage > totalPages) healthCurrentPage = totalPages;

    const startIndex = (healthCurrentPage - 1) * healthPageSize;
    const endIndex = Math.min(startIndex + healthPageSize, totalCount);

    tableBody.innerHTML = '';

    if (totalCount === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 40px;">
                    <span class="material-icons-round" style="font-size: 48px; margin-bottom: 10px; display: block; color: var(--text-light);">folder_zip</span>
                    No electronic health records found.
                </td>
            </tr>
        `;
        updateHealthPaginationUI(0, 0, 0);
        return;
    }

    const pageSlice = filtered.slice(startIndex, endIndex);

    pageSlice.forEach(rec => {
        const tr = document.createElement('tr');
        
        // Formulate allergy text formatting with colors
        const allergyLower = (rec.allergies || '').toLowerCase();
        const hasAllergy = allergyLower && allergyLower !== 'none' && allergyLower !== 'no';
        const allergyHtml = hasAllergy 
            ? `<span class="status-badge cancelled" style="white-space: normal; text-align: left; max-width: 140px;" title="${escapeHtml(rec.allergies)}">${escapeHtml(rec.allergies)}</span>` 
            : `<span class="status-badge completed" style="background: rgba(16,185,129,0.06); color: var(--color-success);">None</span>`;

        // Format dates
        let followUpStr = 'N/A';
        if (rec.followUpDate) {
            const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
            followUpStr = new Date(rec.followUpDate).toLocaleDateString('en-US', dateOptions);
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(rec.patientName)}</strong></td>
            <td>${rec.age} / ${escapeHtml(rec.gender)}</td>
            <td><span class="status-badge active" style="font-weight:700;">${escapeHtml(rec.bloodGroup)}</span></td>
            <td><span style="font-size:12.5px;">${rec.height}cm / ${rec.weight}kg</span></td>
            <td>${allergyHtml}</td>
            <td>
                <div style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(rec.diagnosis)}">
                    <strong>${escapeHtml(rec.diagnosis)}</strong>
                </div>
            </td>
            <td><span style="font-size:12.5px;">${followUpStr}</span></td>
            <td><span style="font-size:13px;">${escapeHtml(rec.doctor)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="openHealthModal('${rec.id}')" title="Modify Record">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteHealthConfirm('${rec.id}')" title="Delete Profile Record">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateHealthPaginationUI(startIndex + 1, endIndex, totalCount);
}

function updateHealthPaginationUI(start, end, total) {
    const info = document.getElementById('healthPaginationInfo');
    const prevBtn = document.getElementById('healthPrevPage');
    const nextBtn = document.getElementById('healthNextPage');

    if (info) info.textContent = `Showing ${start}-${end} of ${total}`;
    if (prevBtn) prevBtn.disabled = healthCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = healthCurrentPage >= Math.ceil(total / healthPageSize);
}

// ==========================================
// MODAL & CRUD HANDLERS
// ==========================================

function openHealthModal(id = '') {
    const modal = document.getElementById('healthModal');
    const title = document.getElementById('healthModalTitle');
    const form = document.getElementById('healthForm');

    form.reset();
    document.getElementById('healthId').value = '';
    
    // Clear validation borders
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');

    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    if (id) {
        title.textContent = "Modify Health Record File";
        const rec = healthState.find(r => r.id === id);
        if (rec) {
            document.getElementById('healthId').value = rec.id;
            document.getElementById('healthPatientName').value = rec.patientName;
            document.getElementById('healthAge').value = rec.age;
            document.getElementById('healthGender').value = rec.gender;
            document.getElementById('healthBloodGroup').value = rec.bloodGroup;
            document.getElementById('healthHeight').value = rec.height;
            document.getElementById('healthWeight').value = rec.weight;
            document.getElementById('healthAllergies').value = rec.allergies || '';
            document.getElementById('healthDoctor').value = rec.doctor;
            document.getElementById('healthFollowUpDate').value = rec.followUpDate || '';
            document.getElementById('healthDiagnosis').value = rec.diagnosis;
            document.getElementById('healthPrescription').value = rec.prescription;
            document.getElementById('healthVisitNotes').value = rec.visitNotes || '';
            
            if (role === 'Patient') {
                document.getElementById('healthPatientName').disabled = true;
            }
        }
    } else {
        title.textContent = "Create Health Record File";
        if (role === 'Patient') {
            const input = document.getElementById('healthPatientName');
            if (input) {
                input.value = activeUser;
                input.disabled = true;
            }
        }
    }

    modal.style.display = 'flex';
}

function closeHealthModal() {
    document.getElementById('healthModal').style.display = 'none';
}

async function handleHealthSubmit(e) {
    e.preventDefault();

    const form = e.target;
    let isValid = true;

    // Field required checks
    const fields = [
        { id: 'healthPatientName', errId: 'healthPatientNameError' },
        { id: 'healthAge', errId: 'healthAgeError' },
        { id: 'healthGender', errId: 'healthGenderError' },
        { id: 'healthBloodGroup', errId: 'healthBloodGroupError' },
        { id: 'healthHeight', errId: 'healthHeightError' },
        { id: 'healthWeight', errId: 'healthWeightError' },
        { id: 'healthDoctor', errId: 'healthDoctorError' },
        { id: 'healthDiagnosis', errId: 'healthDiagnosisError' },
        { id: 'healthPrescription', errId: 'healthPrescriptionError' }
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

    if (!isValid) {
        showToast("Please enter all required clinical information fields", "warning");
        return;
    }

    const recData = {
        id: document.getElementById('healthId').value || undefined,
        patientName: document.getElementById('healthPatientName').value.trim(),
        age: parseInt(document.getElementById('healthAge').value),
        gender: document.getElementById('healthGender').value,
        bloodGroup: document.getElementById('healthBloodGroup').value,
        height: parseFloat(document.getElementById('healthHeight').value),
        weight: parseFloat(document.getElementById('healthWeight').value),
        allergies: document.getElementById('healthAllergies').value.trim() || 'None',
        doctor: document.getElementById('healthDoctor').value.trim(),
        followUpDate: document.getElementById('healthFollowUpDate').value || undefined,
        diagnosis: document.getElementById('healthDiagnosis').value.trim(),
        prescription: document.getElementById('healthPrescription').value.trim(),
        visitNotes: document.getElementById('healthVisitNotes').value.trim()
    };

    try {
        await RkDb.saveHealthRecord(recData);
        showToast(recData.id ? "Patient health record file updated" : "EHR Health Record compiled and saved successfully!", "success");
        closeHealthModal();
        loadHealthRecords();

        if (document.getElementById('dashboardSection').classList.contains('active')) {
            initDashboardCharts();
        }
    } catch {
        showToast("Error compiling health record profile", "error");
    }
}

async function deleteHealthConfirm(id) {
    if (confirm("Are you sure you want to delete this patient health record folder from RK Database?")) {
        try {
            await RkDb.deleteHealthRecord(id);
            showToast("Health record folder deleted successfully", "success");
            loadHealthRecords();

            if (document.getElementById('dashboardSection').classList.contains('active')) {
                initDashboardCharts();
            }
        } catch {
            showToast("Error deleting profile record", "error");
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
