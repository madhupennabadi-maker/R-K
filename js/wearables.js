/**
 * RK Health - Wearable Health Vitals Controller
 */

let wearablesState = [];
let simIntervalId = null;
let simulatedPatientName = "Sarah Jenkins"; // Default patient for simulation if Doctor/Admin is viewing

document.addEventListener('DOMContentLoaded', () => {
    const simToggle = document.getElementById('wearableSimToggle');
    if (simToggle) {
        simToggle.addEventListener('change', handleSimulationToggle);
    }

    const form = document.getElementById('wearableManualForm');
    if (form) {
        form.addEventListener('submit', handleManualVitalsSubmit);
    }
});

/**
 * Main routine called when switching to wearables section
 */
async function loadWearableSection() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    // Lock simulation checkbox for Patient role to their own data
    if (role === 'Patient') {
        simulatedPatientName = activeUser;
        const patientInput = document.getElementById('wearablePatientName');
        if (patientInput) {
            patientInput.value = activeUser;
            patientInput.disabled = true;
        }
    } else {
        // Pre-fill dropdown option or input for Doctor/Admin
        populateSimulatedPatientDropdown();
    }

    await fetchWearableLogs();
}

/**
 * Fills patient choice selector in wearables form
 */
async function populateSimulatedPatientDropdown() {
    const dropdown = document.getElementById('wearablePatientName');
    if (!dropdown) return;
    
    // Clear and reload names
    dropdown.innerHTML = '<option value="">-- Select Patient --</option>';
    
    try {
        const records = await RkDb.getHealthRecords();
        const uniqueNames = [...new Set(records.map(r => r.patientName))];
        
        uniqueNames.forEach(name => {
            dropdown.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
        });
        
        // Match active selection
        dropdown.value = simulatedPatientName;
    } catch (e) {
        console.error("Vitals patient load error:", e);
    }
}

/**
 * Fetches wearable readings and updates visual KPI cards
 */
async function fetchWearableLogs() {
    try {
        wearablesState = await RkDb.getWearables();
        renderWearablesDashboard();
        renderWearablesHistoryTable();
    } catch (error) {
        console.error("Vitals load error:", error);
    }
}

/**
 * Renders indicators cards with the latest wearable sensors readings
 */
function renderWearablesDashboard() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    const targetPatient = (role === 'Patient') ? activeUser : simulatedPatientName;

    // Filter logs for targeted patient
    const patientLogs = wearablesState.filter(log => log.patientName === targetPatient)
                                      .sort((a,b) => b.timestamp - a.timestamp);

    // If no logs, show defaults
    const latest = (patientLogs.length > 0) ? patientLogs[0] : {
        heartRate: '--', bloodPressure: '--/--', oxygenLevel: '--', temperature: '--', steps: '--', calories: '--', sleepHours: '--'
    };

    // Vitals bindings
    bindVitalMetric('hr', latest.heartRate, 55, 100, 'bpm');
    bindVitalMetric('bp', latest.bloodPressure, null, null, 'mmHg');
    bindVitalMetric('spo2', latest.oxygenLevel, 94, 100, '%');
    bindVitalMetric('temp', latest.temperature, 96.8, 99.1, '°F');
    bindVitalMetric('steps', latest.steps, null, null, 'steps');
    bindVitalMetric('calories', latest.calories, null, null, 'kcal');
    bindVitalMetric('sleep', latest.sleepHours, 6.0, 9.0, 'hrs');
}

/**
 * Helper to update card value and alert visual state classes (normal, warning, danger)
 */
function bindVitalMetric(type, value, min, max, unit) {
    const card = document.querySelector(`.wearable-card.${type}`);
    if (!card) return;

    const valueEl = card.querySelector('.wearable-card-value');
    const statusEl = card.querySelector('.wearable-card-status');
    const iconEl = card.querySelector('.wearable-card-status .material-icons-round');
    const labelEl = card.querySelector('.wearable-card-status span:last-child');

    if (!valueEl || !statusEl) return;

    valueEl.textContent = value === '--' ? '--' : `${value} ${unit}`;

    if (value === '--') {
        statusEl.className = 'wearable-card-status';
        if (labelEl) labelEl.textContent = 'No sensor feed';
        return;
    }

    let status = 'normal';
    let statusText = 'Normal';
    let icon = 'check_circle';

    // Parse abnormal thresholds
    if (type === 'hr') {
        const hr = parseInt(value);
        if (hr > 110 || hr < 50) { status = 'danger'; statusText = hr > 110 ? 'Tachycardia' : 'Bradycardia'; icon = 'warning'; }
        else if (hr > 95 || hr < 60) { status = 'warning'; statusText = 'Borderline'; icon = 'info'; }
    } else if (type === 'spo2') {
        const spo2 = parseInt(value);
        if (spo2 < 92) { status = 'danger'; statusText = 'Hypoxia warning'; icon = 'error'; }
        else if (spo2 < 95) { status = 'warning'; statusText = 'Caution'; icon = 'info'; }
    } else if (type === 'temp') {
        const temp = parseFloat(value);
        if (temp > 99.5 || temp < 95.0) { status = 'danger'; statusText = temp > 99.5 ? 'High Fever' : 'Hypothermia'; icon = 'thermostat'; }
        else if (temp > 98.9) { status = 'warning'; statusText = 'Sub-febrile'; icon = 'info'; }
    } else if (type === 'bp') {
        const parts = value.split('/');
        if (parts.length === 2) {
            const sys = parseInt(parts[0]);
            const dia = parseInt(parts[1]);
            if (sys > 140 || dia > 90) { status = 'danger'; statusText = 'Hypertension'; icon = 'warning'; }
            else if (sys > 125 || dia > 82) { status = 'warning'; statusText = 'Elevated'; icon = 'info'; }
        }
    } else if (type === 'steps') {
        const steps = parseInt(value);
        if (steps >= 8000) { status = 'normal'; statusText = 'Target met'; icon = 'emoji_events'; }
        else { status = 'warning'; statusText = 'Active'; icon = 'directions_run'; }
    } else if (type === 'sleep') {
        const sleep = parseFloat(value);
        if (sleep < 5.5) { status = 'danger'; statusText = 'Rest deprived'; icon = 'bed'; }
        else if (sleep < 7.0) { status = 'warning'; statusText = 'Light rest'; icon = 'info'; }
    }

    statusEl.className = `wearable-card-status ${status}`;
    if (iconEl) iconEl.textContent = icon;
    if (labelEl) labelEl.textContent = statusText;
}

/**
 * Historical vitals logging table populator
 */
function renderWearablesHistoryTable() {
    const tableBody = document.querySelector('#wearableHistoryTable tbody');
    if (!tableBody) return;

    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    const targetPatient = (role === 'Patient') ? activeUser : simulatedPatientName;

    const filtered = wearablesState.filter(log => log.patientName === targetPatient)
                                   .sort((a,b) => b.timestamp - a.timestamp);

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:20px;">No sensor records recorded for this patient.</td></tr>';
        return;
    }

    filtered.forEach(log => {
        const displayDate = new Date(log.timestamp).toLocaleString();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${displayDate}</strong></td>
            <td><span class="status-badge active" style="background:rgba(244,63,94,0.06); color:#f43f5e;"><span class="material-icons-round" style="font-size:11px; margin-right:2px;">favorite</span>${log.heartRate} bpm</span></td>
            <td><code>${escapeHtml(log.bloodPressure)}</code></td>
            <td><span class="status-badge active" style="background:rgba(6,182,212,0.06); color:#06b6d4;">${log.oxygenLevel}%</span></td>
            <td>${log.temperature} °F</td>
            <td>${log.steps.toLocaleString()}</td>
            <td>${log.sleepHours} hrs</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// VITAL ALERTS MONITORING SYSTEMS
// ==========================================

function inspectVitalAlerts(log) {
    const hr = parseInt(log.heartRate);
    const spo2 = parseInt(log.oxygenLevel);
    const temp = parseFloat(log.temperature);
    const bp = log.bloodPressure.split('/');

    let alertTriggered = false;

    // Heart Rate alert checks
    if (hr > 120) {
        sendBrowserNotification("Wearable Alarm: High Heart Rate!", `Abnormal Tachycardia detected: ${hr} bpm for ${log.patientName}. Avoid physical exhaustion.`);
        alertTriggered = true;
    } else if (hr < 50) {
        sendBrowserNotification("Wearable Alarm: Low Heart Rate!", `Bradycardia alert: ${hr} bpm detected. Rest recommended.`);
        alertTriggered = true;
    }

    // Oxygen level hypoxia check
    if (spo2 < 92) {
        sendBrowserNotification("Wearable Alarm: Low SpO₂ Hypoxia Alert!", `Critical: Oxygen Saturation is low at ${spo2}% for ${log.patientName}. Initiate ventilation.`);
        alertTriggered = true;
    }

    // Fever thermology check
    if (temp > 100.4) {
        sendBrowserNotification("Wearable Alarm: High Fever!", `Fever indicator: Body temperature has reached ${temp}°F for ${log.patientName}. Consult clinical guide.`);
        alertTriggered = true;
    }

    // Hypertensive crisis check
    if (bp.length === 2) {
        const sys = parseInt(bp[0]);
        const dia = parseInt(bp[1]);
        if (sys > 145 || dia > 95) {
            sendBrowserNotification("Wearable Alarm: Hypertensive Alert!", `Severe: Blood Pressure spikes at ${log.bloodPressure} mmHg for ${log.patientName}. Contact physician.`);
            alertTriggered = true;
        }
    }

    if (alertTriggered) {
        // Dynamically append alert to the notification list badge
        addNotificationLog(`Critical wearable vital warning for ${log.patientName}`, 'wearable');
    }
}

// ==========================================
// MANUAL VITALS FORM SUBMISSION
// ==========================================

async function handleManualVitalsSubmit(e) {
    e.preventDefault();

    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    let patientName = activeUser;
    if (role !== 'Patient') {
        const dropdown = document.getElementById('wearablePatientName');
        patientName = dropdown.value;
        if (!patientName) {
            showToast("Please select a patient file.", "warning");
            return;
        }
    }

    const hr = parseInt(document.getElementById('manualHR').value);
    const bp = document.getElementById('manualBP').value.trim();
    const spo2 = parseInt(document.getElementById('manualSPO2').value);
    const temp = parseFloat(document.getElementById('manualTemp').value);
    const steps = parseInt(document.getElementById('manualSteps').value) || 0;
    const cals = parseInt(document.getElementById('manualCals').value) || 0;
    const sleep = parseFloat(document.getElementById('manualSleep').value) || 0.0;

    // Validate fields
    if (!hr || !bp || !spo2 || !temp) {
        showToast("Please enter all required sensor vitals parameters", "warning");
        return;
    }

    const log = {
        patientName: patientName,
        heartRate: hr,
        bloodPressure: bp,
        oxygenLevel: spo2,
        temperature: temp,
        steps: steps,
        calories: cals,
        sleepHours: sleep
    };

    try {
        await RkDb.addWearable(log);
        showToast("Sensor readings uploaded successfully", "success");
        e.target.reset();
        
        // Pre-fill locked Patient name again if necessary
        if (role === 'Patient') {
            document.getElementById('wearablePatientName').value = activeUser;
        }

        // Run vital analysis
        inspectVitalAlerts(log);

        // Refresh views
        await fetchWearableLogs();

    } catch (e) {
        showToast("Vitals uploading failed", "error");
    }
}

// ==========================================
// LIVE WEARABLES SIMULATION MODULE
// ==========================================

function handleSimulationToggle(e) {
    const isChecked = e.target.checked;
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    if (isChecked) {
        if (role !== 'Patient') {
            const dropdown = document.getElementById('wearablePatientName');
            simulatedPatientName = dropdown.value || 'Sarah Jenkins';
        } else {
            simulatedPatientName = activeUser;
        }

        showToast(`Simulation Mode Enabled for ${simulatedPatientName}. Oscillating vital logs...`, "success");
        startVitalsSimulation();
    } else {
        showToast("Simulation Mode Stopped", "info");
        stopVitalsSimulation();
    }
}

function startVitalsSimulation() {
    if (simIntervalId) clearInterval(simIntervalId);

    // Generate simulated vital sensors updates every 6 seconds
    simIntervalId = setInterval(async () => {
        // Fluctuating values around healthy metrics
        const hr = Math.round(70 + Math.random() * 20); // 70 to 90
        const sys = Math.round(115 + Math.random() * 15); // 115 to 130
        const dia = Math.round(75 + Math.random() * 10); // 75 to 85
        const spo2 = Math.round(96 + Math.random() * 4); // 96 to 100
        const temp = parseFloat((97.8 + Math.random() * 1.2).toFixed(1)); // 97.8 to 99.0
        const stepsDiff = Math.round(50 + Math.random() * 200);
        const sleep = parseFloat((6.5 + Math.random() * 1.5).toFixed(1));

        // Get latest steps from wearables
        const patientLogs = wearablesState.filter(log => log.patientName === simulatedPatientName);
        let steps = 4000 + stepsDiff;
        if (patientLogs.length > 0) {
            steps = parseInt(patientLogs[0].steps || 4000) + stepsDiff;
        }

        const log = {
            patientName: simulatedPatientName,
            heartRate: hr,
            bloodPressure: `${sys}/${dia}`,
            oxygenLevel: spo2,
            temperature: temp,
            steps: steps,
            calories: Math.round(steps * 0.05), // ~0.05 kcal per step
            sleepHours: sleep
        };

        // Occasional abnormal sensor readings spike to test vital triggers (4% probability)
        if (Math.random() < 0.04) {
            log.heartRate = 125; // High HR
            log.temperature = 101.2; // Fever
            log.oxygenLevel = 90; // Hypoxia
        }

        try {
            await RkDb.addWearable(log);
            inspectVitalAlerts(log);
            await fetchWearableLogs();
            
            // If main dashboard is visible, refresh its stats
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                initDashboardCharts();
            }
        } catch (e) {
            console.error("Simulation tick log error:", e);
        }
    }, 6000);
}

function stopVitalsSimulation() {
    if (simIntervalId) {
        clearInterval(simIntervalId);
        simIntervalId = null;
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
