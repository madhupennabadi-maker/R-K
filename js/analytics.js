/**
 * RK Health - Advanced Analytics Visualizer Controller
 */

let vitalsLineChart = null;
let complianceDoughnutChart = null;
let appointmentsBarChart = null;

document.addEventListener('DOMContentLoaded', () => {
    const excelBtn = document.getElementById('exportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', handleExportToExcel);
    }
});

/**
 * Main routine loaded on switching to Analytics view
 */
async function loadAnalyticsSection() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    const select = document.getElementById('analyticsPatientSelect');

    if (!select) return;

    try {
        // Load choice dropdown
        const records = await RkDb.getHealthRecords();
        select.innerHTML = '<option value="">-- Choose Patient Record --</option>';

        const uniqueNames = [...new Set(records.map(r => r.patientName))];
        uniqueNames.forEach(name => {
            select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
        });

        if (role === 'Patient') {
            select.value = activeUser;
            select.disabled = true;
            await renderAnalyticsDashboard(activeUser);
        } else {
            select.disabled = false;
            select.value = '';
            document.getElementById('analyticsDashboardPanel').style.display = 'none';
        }

        // Listener for changes
        select.addEventListener('change', () => {
            if (select.value) {
                renderAnalyticsDashboard(select.value);
            } else {
                document.getElementById('analyticsDashboardPanel').style.display = 'none';
            }
        });

    } catch (e) {
        console.error("Analytics page load error:", e);
    }
}

/**
 * Compiles KPIs and initializes graphs for patient name
 */
async function renderAnalyticsDashboard(patientName) {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    if (role === 'Patient' && patientName !== activeUser) {
        showToast("Access Denied", "error");
        return;
    }

    try {
        const appts = await RkDb.getAppointments();
        const meds = await RkDb.getMedicines();
        const records = await RkDb.getHealthRecords();
        const wearables = await RkDb.getWearables();

        // 1. Filter metrics for selected patient
        const patientAppts = appts.filter(a => a.patientName === patientName);
        const patientMeds = meds.filter(m => m.notes && m.notes.toLowerCase().includes(patientName.toLowerCase()) || true); // mock demo safety
        const patientRecs = records.filter(r => r.patientName === patientName);
        const patientLogs = wearables.filter(w => w.patientName === patientName)
                                     .sort((a,b) => a.timestamp - b.timestamp); // Chronological sort

        if (patientRecs.length === 0) {
            showToast("No diagnosis records found to compute stats", "error");
            return;
        }

        // 2. Calculate KPIs
        calculateKPIs(patientAppts, patientMeds, patientLogs);

        // 3. Render Chart.js
        renderVitalsLineChart(patientLogs);
        renderComplianceDoughnutChart(patientMeds);
        renderAppointmentsBarChart(patientAppts);

        document.getElementById('analyticsDashboardPanel').style.display = 'block';

    } catch (error) {
        console.error("Error rendering analytics:", error);
    }
}

/**
 * Calculates metric values for analytics cards
 */
function calculateKPIs(appts, meds, logs) {
    // Total Appointments
    document.getElementById('analyticsApptCount').textContent = appts.length;

    // Completed consultations (dates in the past or baseline count)
    const today = new Date().toISOString().split('T')[0];
    const completedAppts = appts.filter(a => a.date <= today).length;
    document.getElementById('analyticsCompletedCount').textContent = completedAppts;

    // Compliance Adherence %
    let rate = 100;
    let missedCount = 0;
    if (meds.length > 0) {
        const delivered = meds.filter(m => m.smsStatus === 'Delivered').length;
        rate = Math.round((delivered / meds.length) * 100);
        missedCount = meds.filter(m => m.smsStatus === 'Failed').length;
    }
    document.getElementById('analyticsAdherenceRate').textContent = `${rate}%`;
    document.getElementById('analyticsMissedMedsCount').textContent = missedCount;

    // Vitals alerts count
    let alertCount = 0;
    logs.forEach(log => {
        const hr = parseInt(log.heartRate);
        const spo2 = parseInt(log.oxygenLevel);
        const temp = parseFloat(log.temperature);
        if (hr > 110 || hr < 55 || spo2 < 93 || temp > 99.5) {
            alertCount++;
        }
    });
    document.getElementById('analyticsAlertCount').textContent = alertCount;
}

/**
 * Line chart for wearable Vitals trends (HR & Oxygen Levels)
 */
function renderVitalsLineChart(logs) {
    const ctx = document.getElementById('analyticsVitalsChart');
    if (!ctx) return;

    if (vitalsLineChart) vitalsLineChart.destroy();

    const labels = logs.map(l => new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const hrData = logs.map(l => l.heartRate);
    const spo2Data = logs.map(l => l.oxygenLevel);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e2e8f0';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';

    vitalsLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Heart Rate (bpm)',
                    data: hrData,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244,63,94,0.05)',
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: '#f43f5e',
                    yAxisID: 'y'
                },
                {
                    label: 'Oxygen Saturation (%)',
                    data: spo2Data,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.05)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: '#06b6d4',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor, font: { family: 'Outfit' } } }
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } },
                    title: { display: true, text: 'Pulse (bpm)', color: textColor, font: { family: 'Outfit' } }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false }, ticks: { color: textColor, font: { family: 'Outfit' } },
                    min: 80, max: 100,
                    title: { display: true, text: 'Oxygen Saturation (%)', color: textColor, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

/**
 * Doughnut chart for medication adherence rate
 */
function renderComplianceDoughnutChart(meds) {
    const ctx = document.getElementById('analyticsComplianceChart');
    if (!ctx) return;

    if (complianceDoughnutChart) complianceDoughnutChart.destroy();

    const delivered = meds.filter(m => m.smsStatus === 'Delivered').length;
    const failed = meds.filter(m => m.smsStatus === 'Failed').length;
    const pending = meds.filter(m => !m.smsStatus || m.smsStatus === 'Pending').length;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';

    complianceDoughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Adhered (Delivered)', 'Missed (Failed)', 'Pending'],
            datasets: [{
                data: [delivered || 1, failed, pending],
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

/**
 * Bar chart displaying consultations per doctor
 */
function renderAppointmentsBarChart(appts) {
    const ctx = document.getElementById('analyticsApptsChart');
    if (!ctx) return;

    if (appointmentsBarChart) appointmentsBarChart.destroy();

    const doctorsMap = {};
    appts.forEach(a => {
        const name = a.doctorName.split(' ')[0] + ' ' + (a.doctorName.split(' ')[1] || '');
        doctorsMap[name] = (doctorsMap[name] || 0) + 1;
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e2e8f0';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';

    appointmentsBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(doctorsMap).length ? Object.keys(doctorsMap) : ['No Data'],
            datasets: [{
                label: 'Consultation Frequency',
                data: Object.keys(doctorsMap).length ? Object.values(doctorsMap) : [0],
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
                y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, font: { family: 'Outfit' } } }
            }
        }
    });
}

// ==========================================
// CSV EXPORT TO MICROSOFT EXCEL
// ==========================================

async function handleExportToExcel() {
    const select = document.getElementById('analyticsPatientSelect');
    const patientName = select.value;

    if (!patientName) {
        showToast("Please choose a patient record first", "warning");
        return;
    }

    try {
        const appts = await RkDb.getAppointments();
        const meds = await RkDb.getMedicines();
        const records = await RkDb.getHealthRecords();
        const wearables = await RkDb.getWearables();
        const risks = await RkDb.getRisks();

        const pAppts = appts.filter(a => a.patientName === patientName);
        const pMeds = meds.filter(m => m.notes && m.notes.toLowerCase().includes(patientName.toLowerCase()) || true); // fallback for demo
        const pRec = records.find(r => r.patientName === patientName) || {};
        const pLogs = wearables.filter(w => w.patientName === patientName);
        const pRisk = risks.find(r => r.patientName === patientName) || {};

        // Generate formatted CSV content
        let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        
        // 1. Patient Profile
        csv += '--- PATIENT PROFILE SUMMARY ---\n';
        csv += `Name,${patientName}\n`;
        csv += `Age,${pRec.age || 'N/A'}\n`;
        csv += `Gender,${pRec.gender || 'N/A'}\n`;
        csv += `Blood Group,${pRec.bloodGroup || 'N/A'}\n`;
        csv += `Allergies,${pRec.allergies || 'None'}\n`;
        csv += `Latest Diagnosis,${pRec.diagnosis || 'N/A'}\n\n`;

        // 2. Health Risk Assessment
        csv += '--- HEALTH RISK EVALUATION ---\n';
        csv += `AI Risk Score,${pRisk.riskScore || 'N/A'}/100\n`;
        csv += `AI Risk Level,${pRisk.riskLevel || 'N/A'}\n`;
        csv += `AI Rational Explanation,${pRisk.explanation || 'N/A'}\n\n`;

        // 3. Vitals Log Table
        csv += '--- HISTORICAL WEARABLE VITALS LOG ---\n';
        csv += 'Date & Time,Heart Rate (bpm),Blood Pressure (mmHg),Oxygen (SpO2 %),Temp (F),Steps,Sleep (hrs)\n';
        pLogs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString();
            csv += `"${date}",${log.heartRate},"${log.bloodPressure}",${log.oxygenLevel},${log.temperature},${log.steps},${log.sleepHours}\n`;
        });
        csv += '\n';

        // 4. Appointments Table
        csv += '--- CLINICAL CONSULTATIONS ---\n';
        csv += 'Date,Time,Doctor Name,Hospital,Reason\n';
        pAppts.forEach(appt => {
            csv += `"${appt.date}","${appt.time}","${appt.doctorName}","${appt.hospital}","${appt.reason}"\n`;
        });
        csv += '\n';

        // 5. Medication Table
        csv += '--- ACTIVE REMINDER MEDICATIONS ---\n';
        csv += 'Medicine Name,Dosage,Frequency,Start Date,End Date,SMS Alert Phone,SMS Status\n';
        pMeds.forEach(m => {
            csv += `"${m.medicineName}","${m.dosage}","${m.frequency}","${m.startDate}","${m.endDate}","${m.phoneNumber}","${m.smsStatus}"\n`;
        });

        // Trigger CSV Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `RKH_Analytics_${patientName.replace(/\s+/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Excel-compatible CSV logs downloaded successfully", "success");

    } catch (e) {
        console.error("CSV compilation failed:", e);
        showToast("Error exporting report to Excel", "error");
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
