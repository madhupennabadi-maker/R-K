/**
 * RK Health - Appointments Controller
 */

let apptsState = [];
let apptCurrentPage = 1;
const apptPageSize = 5;

document.addEventListener('DOMContentLoaded', () => {
    // Form submission listener
    const apptForm = document.getElementById('appointmentForm');
    if (apptForm) {
        apptForm.addEventListener('submit', handleApptSubmit);
    }

    // Input listeners for search & filters
    const searchInput = document.getElementById('apptSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            apptCurrentPage = 1;
            renderApptsTable();
        });
    }

    const filterDoc = document.getElementById('apptFilterDoctor');
    if (filterDoc) {
        filterDoc.addEventListener('change', () => {
            apptCurrentPage = 1;
            renderApptsTable();
        });
    }

    const filterHosp = document.getElementById('apptFilterHospital');
    if (filterHosp) {
        filterHosp.addEventListener('change', () => {
            apptCurrentPage = 1;
            renderApptsTable();
        });
    }

    // Pagination listeners
    const prevBtn = document.getElementById('apptPrevPage');
    const nextBtn = document.getElementById('apptNextPage');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (apptCurrentPage > 1) {
                apptCurrentPage--;
                renderApptsTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredAppts().length / apptPageSize);
            if (apptCurrentPage < totalPages) {
                apptCurrentPage++;
                renderApptsTable();
            }
        });
    }
});

/**
 * Loads appointments data from database layer and populates filters
 */
async function loadAppointments() {
    try {
        apptsState = await RkDb.getAppointments();
        populateFilterDropdowns();
        renderApptsTable();
    } catch (error) {
        console.error("Error loading appointments:", error);
    }
}

/**
 * Populates filters based on configuration constants
 */
function populateFilterDropdowns() {
    const docSelect = document.getElementById('apptFilterDoctor');
    const hospSelect = document.getElementById('apptFilterHospital');

    if (!docSelect || !hospSelect) return;

    // Reset filters (keep first option)
    docSelect.innerHTML = '<option value="">All Doctors</option>';
    hospSelect.innerHTML = '<option value="">All Hospitals</option>';

    // Load from configuration
    RK_CONFIG.doctors.forEach(doc => {
        docSelect.innerHTML += `<option value="${doc}">${doc}</option>`;
    });

    RK_CONFIG.hospitals.forEach(hosp => {
        hospSelect.innerHTML += `<option value="${hosp}">${hosp}</option>`;
    });
}

/**
 * Filter the appointments list based on inputs
 */
function getFilteredAppts() {
    const searchVal = document.getElementById('apptSearch').value.toLowerCase().trim();
    const docVal = document.getElementById('apptFilterDoctor').value;
    const hospVal = document.getElementById('apptFilterHospital').value;
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    return apptsState.filter(appt => {
        // Enforce patient-level filtering
        if (role === 'Patient' && appt.patientName !== activeUser) {
            return false;
        }

        const matchesSearch = !searchVal || 
            appt.patientName.toLowerCase().includes(searchVal) ||
            appt.doctorName.toLowerCase().includes(searchVal) ||
            appt.title.toLowerCase().includes(searchVal) ||
            appt.reason.toLowerCase().includes(searchVal);

        const matchesDoc = !docVal || appt.doctorName === docVal;
        const matchesHosp = !hospVal || appt.hospital === hospVal;

        return matchesSearch && matchesDoc && matchesHosp;
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest timestamp
}

/**
 * Renders the filtered dataset onto appointments UI table
 */
function renderApptsTable() {
    const tableBody = document.querySelector('#appointmentsTable tbody');
    if (!tableBody) return;

    const filtered = getFilteredAppts();
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / apptPageSize) || 1;

    // Boundary check for pagination
    if (apptCurrentPage > totalPages) apptCurrentPage = totalPages;

    const startIndex = (apptCurrentPage - 1) * apptPageSize;
    const endIndex = Math.min(startIndex + apptPageSize, totalCount);

    tableBody.innerHTML = '';

    if (totalCount === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 40px;">
                    <span class="material-icons-round" style="font-size: 48px; margin-bottom: 10px; display: block; color: var(--text-light);">event_busy</span>
                    No appointments found matching your search.
                </td>
            </tr>
        `;
        updatePaginationUI(0, 0, 0);
        return;
    }

    const pageSlice = filtered.slice(startIndex, endIndex);

    pageSlice.forEach(appt => {
        const tr = document.createElement('tr');
        
        // Format Date beautifully
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        const displayDate = new Date(appt.date).toLocaleDateString('en-US', dateOptions);
        
        tr.innerHTML = `
            <td><strong>${escapeHtml(appt.patientName)}</strong></td>
            <td>${escapeHtml(appt.doctorName)}</td>
            <td>${escapeHtml(appt.title)}</td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span>${displayDate}</span>
                    <span style="font-size: 12px; color: var(--text-secondary);">${appt.time}</span>
                </div>
            </td>
            <td><span style="font-size: 13px;">${escapeHtml(appt.hospital)}</span></td>
            <td><span class="status-badge active">${escapeHtml(appt.reason)}</span></td>
            <td>
                <a href="${appt.calendarLink}" target="_blank" class="action-btn link" title="Google Calendar Event Link">
                    <span class="material-icons-round">today</span>
                </a>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="openAppointmentModal('${appt.id}')" title="Edit Schedule">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteApptConfirm('${appt.id}')" title="Cancel Appointment">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updatePaginationUI(startIndex + 1, endIndex, totalCount);
}

function updatePaginationUI(start, end, total) {
    const info = document.getElementById('apptPaginationInfo');
    const prevBtn = document.getElementById('apptPrevPage');
    const nextBtn = document.getElementById('apptNextPage');

    if (info) info.textContent = `Showing ${start}-${end} of ${total}`;
    if (prevBtn) prevBtn.disabled = apptCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = apptCurrentPage >= Math.ceil(total / apptPageSize);
}

// ==========================================
// MODAL & CRUD HANDLERS
// ==========================================

function openAppointmentModal(id = '') {
    const modal = document.getElementById('appointmentModal');
    const title = document.getElementById('apptModalTitle');
    const form = document.getElementById('appointmentForm');

    form.reset();
    document.getElementById('apptId').value = '';
    
    // Clear validation states
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');

    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    if (id) {
        title.textContent = "Edit Appointment";
        const appt = apptsState.find(a => a.id === id);
        if (appt) {
            document.getElementById('apptId').value = appt.id;
            document.getElementById('apptPatientName').value = appt.patientName;
            document.getElementById('apptDoctorName').value = appt.doctorName;
            document.getElementById('apptTitle').value = appt.title;
            document.getElementById('apptDate').value = appt.date;
            document.getElementById('apptTime').value = appt.time;
            document.getElementById('apptHospital').value = appt.hospital;
            document.getElementById('apptReason').value = appt.reason;
            document.getElementById('apptNotes').value = appt.notes || '';
            
            if (role === 'Patient') {
                document.getElementById('apptPatientName').disabled = true;
            }
        }
    } else {
        title.textContent = "Create Appointment";
        if (role === 'Patient') {
            const input = document.getElementById('apptPatientName');
            if (input) {
                input.value = activeUser;
                input.disabled = true;
            }
        }
    }

    modal.style.display = 'flex';
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

async function handleApptSubmit(e) {
    e.preventDefault();

    const form = e.target;
    let isValid = true;

    // Basic required validation fields
    const fields = [
        { id: 'apptPatientName', errId: 'apptPatientNameError' },
        { id: 'apptDoctorName', errId: 'apptDoctorNameError' },
        { id: 'apptTitle', errId: 'apptTitleError' },
        { id: 'apptDate', errId: 'apptDateError' },
        { id: 'apptTime', errId: 'apptTimeError' },
        { id: 'apptHospital', errId: 'apptHospitalError' },
        { id: 'apptReason', errId: 'apptReasonError' }
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
        showToast("Please correct form errors", "warning");
        return;
    }

    const apptData = {
        id: document.getElementById('apptId').value || undefined,
        patientName: document.getElementById('apptPatientName').value.trim(),
        doctorName: document.getElementById('apptDoctorName').value.trim(),
        title: document.getElementById('apptTitle').value.trim(),
        date: document.getElementById('apptDate').value,
        time: document.getElementById('apptTime').value,
        hospital: document.getElementById('apptHospital').value.trim(),
        reason: document.getElementById('apptReason').value.trim(),
        notes: document.getElementById('apptNotes').value.trim()
    };

    try {
        await RkDb.saveAppointment(apptData);
        showToast(apptData.id ? "Appointment updated" : "Appointment scheduled successfully!", "success");
        closeAppointmentModal();
        loadAppointments();
        
        // Refresh dashboard metrics if active
        if (document.getElementById('dashboardSection').classList.contains('active')) {
            initDashboardCharts();
        }
    } catch (err) {
        showToast("Failed to save appointment", "error");
    }
}

async function deleteApptConfirm(id) {
    if (confirm("Are you sure you want to cancel this scheduled appointment?")) {
        try {
            await RkDb.deleteAppointment(id);
            showToast("Appointment successfully cancelled", "success");
            loadAppointments();
            
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                initDashboardCharts();
            }
        } catch {
            showToast("Error canceling appointment", "error");
        }
    }
}

// Helper to escape HTML tags to avoid XSS injections
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
