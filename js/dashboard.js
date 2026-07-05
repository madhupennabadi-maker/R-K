/**
 * RK Health - Dashboard Metrics & Analytics Visualization
 */

let combinedChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial load of dashboard indicators
    if (document.getElementById('dashboardSection').classList.contains('active')) {
        initDashboardCharts();
    }
});

/**
 * Initializes and fetches data for dashboard charts and summaries
 */
async function initDashboardCharts() {
    try {
        const role = sessionStorage.getItem('rk_user_role') || 'Patient';
        const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

        if (role === 'Patient') {
            ensureMockDataForUser(activeUser);
        }

        // Fetch fresh datasets
        const appointments = await RkDb.getAppointments();
        const medicines = await RkDb.getMedicines();
        const records = await RkDb.getHealthRecords();
        const summaries = await RkDb.getAiSummaries();

        // Enforce patient-level data partitioning on the dashboard
        let filteredAppts = appointments;
        let filteredMeds = medicines;
        let filteredRecords = records;
        let filteredSummaries = summaries;

        if (role === 'Patient') {
            filteredAppts = appointments.filter(a => a.patientName === activeUser);
            filteredMeds = medicines.filter(m => 
                (m.patientName && m.patientName === activeUser) || 
                (m.notes && m.notes.toLowerCase().includes(activeUser.toLowerCase()))
            );
            filteredRecords = records.filter(r => r.patientName === activeUser);
            filteredSummaries = summaries.filter(s => s.patientName === activeUser);
        }

        // 1. Calculate Stats counters
        await calculateStats(filteredAppts, filteredMeds, filteredRecords, filteredSummaries, role);

        // 2. Populate Recent Activities Timeline
        populateActivitiesTimeline(role, activeUser);

        // 3. Render Chart.js Analytics / Vitals Chart depending on role
        const chartHeaderEl = document.querySelector('#dashboardSection .dashboard-card-header h3');
        if (role === 'Patient') {
            if (chartHeaderEl) {
                chartHeaderEl.innerHTML = '<span class="material-icons-round" style="color: #f43f5e; margin-right: 8px;">timeline</span> My Wearables Vitals History (HR & SpO2)';
            }
            await renderPatientVitalsChart(activeUser);
        } else {
            if (chartHeaderEl) {
                chartHeaderEl.innerHTML = '<span class="material-icons-round text-primary" style="margin-right: 8px;">analytics</span> Medicine Compliance & Monthly Visits';
            }
            renderAnalyticsCharts(filteredAppts, filteredMeds);
        }

        // 4. Render recommendations & predictive score on Dashboard landing
        renderDashboardRiskAlerts(activeUser, role);

    } catch (error) {
        console.error("Dashboard initialization failure:", error);
        showToast("Error updating dashboard analytics", "error");
    }
}

/**
 * Perform math counts on raw datasets for indicator panels
 */
async function calculateStats(appointments, medicines, records, summaries, role) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's appointments count
    const todayAppts = appointments.filter(a => a.date === todayStr).length;
    document.getElementById('statsTodayAppts').textContent = todayAppts;

    // Medicines counts
    const pendingMeds = medicines.length; // Active schedules
    document.getElementById('statsPendingMeds').textContent = pendingMeds;

    // Medicine compliance calculation
    if (medicines.length === 0) {
        document.getElementById('statsMedicineCompliance').textContent = "100%";
    } else {
        const delivered = medicines.filter(m => m.smsStatus === 'Delivered').length;
        const total = medicines.length;
        const rate = Math.round((delivered / total) * 100);
        document.getElementById('statsMedicineCompliance').textContent = `${rate}%`;
    }

    const label0 = document.querySelectorAll('.stats-grid .stats-card-title')[0];
    const icon0 = document.querySelectorAll('.stats-grid .stats-card-icon')[0];
    const label1 = document.querySelectorAll('.stats-grid .stats-card-title')[1];
    const icon1 = document.querySelectorAll('.stats-grid .stats-card-icon')[1];
    const label2 = document.querySelectorAll('.stats-grid .stats-card-title')[2];
    const icon2 = document.querySelectorAll('.stats-grid .stats-card-icon')[2];
    const label3 = document.querySelectorAll('.stats-grid .stats-card-title')[3];
    const icon3 = document.querySelectorAll('.stats-grid .stats-card-icon')[3];

    if (role === 'Patient') {
        if (label0) label0.textContent = "My Appointments Today";
        if (icon0) icon0.textContent = "event";
        
        if (label1) label1.textContent = "My Active Medicines";
        if (icon1) icon1.textContent = "medical_services";
        
        if (label2) label2.textContent = "My Adherence Rate";
        if (icon2) icon2.textContent = "check_circle";
        
        if (label3) label3.textContent = "My Medical Files";
        if (icon3) icon3.textContent = "folder";
        
        document.getElementById('statsHealthRecords').textContent = records.length;
    } else if (role === 'Doctor') {
        if (label0) label0.textContent = "Today's Clinic Visits";
        if (icon0) icon0.textContent = "today";
        
        if (label1) label1.textContent = "Clinic Active Medicines";
        if (icon1) icon1.textContent = "hourglass_empty";
        
        if (label2) label2.textContent = "Clinic Compliance Rate";
        if (icon2) icon2.textContent = "check_circle";
        
        if (label3) label3.textContent = "High Risk Patients";
        if (icon3) icon3.textContent = "warning";
        
        try {
            const risks = await RkDb.getRisks();
            const highCount = risks.filter(r => r.riskLevel.toLowerCase() === 'high').length;
            document.getElementById('statsHealthRecords').textContent = highCount;
        } catch {
            document.getElementById('statsHealthRecords').textContent = "0";
        }
    } else {
        if (label0) label0.textContent = "Today's Clinic Visits";
        if (icon0) icon0.textContent = "today";
        
        if (label1) label1.textContent = "Clinic Active Medicines";
        if (icon1) icon1.textContent = "hourglass_empty";
        
        if (label2) label2.textContent = "Clinic Compliance Rate";
        if (icon2) icon2.textContent = "check_circle";
        
        if (label3) label3.textContent = "Clinic Health Files";
        if (icon3) icon3.textContent = "folder_open";
        
        document.getElementById('statsHealthRecords').textContent = records.length;
    }
}

/**
 * Render the activity list from localStorage logs
 */
function populateActivitiesTimeline(role, activeUser) {
    const timeline = document.getElementById('recentActivitiesTimeline');
    if (!timeline) return;

    const logs = JSON.parse(localStorage.getItem('rk_mock_activities') || '[]');
    timeline.innerHTML = '';

    let filteredLogs = logs;
    if (role === 'Patient') {
        filteredLogs = logs.filter(log => log.text && log.text.toLowerCase().includes(activeUser.toLowerCase()));
    }

    if (filteredLogs.length === 0) {
        timeline.innerHTML = `
            <li class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <p class="timeline-title">No actions logged</p>
                    <span class="timeline-time">System Ready</span>
                </div>
            </li>
        `;
        return;
    }

    filteredLogs.slice(0, 4).forEach(log => {
        let statusClass = 'success';
        if (log.status) statusClass = log.status;
        else if (log.type === 'system') statusClass = 'warning';

        const item = document.createElement('li');
        item.className = `timeline-item ${statusClass}`;
        item.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-title">${log.text}</div>
                <div class="timeline-time">${log.time}</div>
            </div>
        `;
        timeline.appendChild(item);
    });
}

/**
 * Visualizes medical trends using Chart.js
 */
function renderAnalyticsCharts(appointments, medicines) {
    const ctx = document.getElementById('dashboardCombinedChart');
    if (!ctx) return;

    // Destroy existing instance to prevent visual glitches on re-draws
    if (combinedChartInstance) {
        combinedChartInstance.destroy();
    }

    // Process visits per month (Jan-Jun)
    const monthlyVisits = {
        'Jan': 4, 'Feb': 8, 'Mar': 5, 'Apr': 12, 'May': 15, 'Jun': 18
    };

    // Calculate dynamic data based on appointments if dates fall in these ranges
    appointments.forEach(appt => {
        if (!appt.date) return;
        const dateObj = new Date(appt.date);
        const monthName = dateObj.toLocaleString('default', { month: 'short' });
        if (monthlyVisits[monthName] !== undefined) {
            monthlyVisits[monthName]++;
        }
    });

    const labels = Object.keys(monthlyVisits);
    const visitsData = Object.values(monthlyVisits);
    
    // Simulate medicine compliance rate variations over months
    const complianceRates = [85, 88, 82, 90, 93, 95];
    // Dynamic adjustment of last month's compliance rate based on medicine data
    if (medicines.length > 0) {
        const delivered = medicines.filter(m => m.smsStatus === 'Delivered').length;
        complianceRates[complianceRates.length - 1] = Math.round((delivered / medicines.length) * 100);
    }

    // Chart.js Configuration
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e2e8f0';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';

    combinedChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Monthly Patient Visits',
                    data: visitsData,
                    backgroundColor: 'rgba(37, 99, 235, 0.65)',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Medication Compliance (%)',
                    data: complianceRates,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    padding: 10,
                    bodyFont: { family: 'Outfit' },
                    titleFont: { family: 'Outfit', weight: 'bold' }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Outfit' } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Outfit' } },
                    title: {
                        display: true,
                        text: 'Total Appointments / Visits',
                        color: textColor,
                        font: { family: 'Outfit', weight: 'bold' }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }, // Only show grids for the left axis
                    ticks: { color: textColor, font: { family: 'Outfit' } },
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Compliance Rate (%)',
                        color: textColor,
                        font: { family: 'Outfit', weight: 'bold' }
                    }
                }
            }
        }
    });
}

/**
 * Renders predictive suggestions and alert states on dashboard landing cards
 */
async function renderDashboardRiskAlerts(patientName, role) {
    const riskBadgeContainer = document.getElementById('dashboardRiskBadgeArea');
    const recsList = document.getElementById('dashboardRecommendationsList');
    const riskHeader = document.querySelector('#dashboardSection .dashboard-grid h3'); // AI Health Risk Evaluation header
    const riskFooter = document.getElementById('dashboardRiskFooter');

    if (!recsList) return;

    try {
        const risks = await RkDb.getRisks();

        if (role === 'Patient') {
            const patientRisk = risks.find(r => r.patientName === patientName);
            if (riskHeader) riskHeader.innerHTML = '<span class="material-icons-round text-primary">psychology</span> AI Health Risk Evaluation';
            if (riskFooter) {
                riskFooter.textContent = 'Based on live wearable vital logs and prescriptions adherence.';
                riskFooter.style.display = '';
            }

            if (patientRisk) {
                if (riskBadgeContainer) {
                    let badgeClass = 'low';
                    if (patientRisk.riskLevel.toLowerCase() === 'medium') { badgeClass = 'medium'; }
                    if (patientRisk.riskLevel.toLowerCase() === 'high') { badgeClass = 'high'; }
                    
                    riskBadgeContainer.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="risk-score-badge ${badgeClass}">${patientRisk.riskLevel} Risk (${patientRisk.riskScore}/100)</span>
                            <span style="font-size: 12.5px; color: var(--text-secondary);">AI Evaluation active</span>
                        </div>
                    `;
                }

                recsList.innerHTML = '';
                const actions = (patientRisk.actions || '').split('\n').filter(Boolean);
                const recs = (patientRisk.recommendations || '').split('\n').filter(Boolean);
                const combined = [...actions, ...recs];

                if (combined.length === 0) {
                    recsList.innerHTML = '<li style="color: var(--text-secondary);">Maintain baseline healthy diagnostics.</li>';
                } else {
                    combined.forEach(item => {
                        const cleanText = item.replace(/^[•\-\*\d\.\s]+/, '').trim();
                        if (cleanText) {
                            recsList.innerHTML += `
                                <li style="display: flex; gap: 8px; font-size: 13.5px; line-height: 1.4; color: var(--text-secondary); margin-bottom: 8px;">
                                    <span class="material-icons-round" style="font-size: 16px; color: var(--color-primary);">offline_pin</span>
                                    <span>${escapeHtml(cleanText)}</span>
                                </li>
                            `;
                        }
                    });
                }
            } else {
                if (riskBadgeContainer) {
                    riskBadgeContainer.innerHTML = `<span style="font-size: 13px; color: var(--text-light); font-style: italic;">No AI evaluation yet.</span>`;
                }
                recsList.innerHTML = `
                    <li style="display: flex; gap: 8px; font-size: 13.5px; color: var(--text-light); font-style: italic;">
                        <span class="material-icons-round" style="font-size: 16px;">help_outline</span>
                        <span>Navigate to the "Health Risk" tab in the sidebar and run "Analyze Vitals Risk" to generate AI predictive suggestions.</span>
                    </li>
                `;
            }
        } else {
            // Admin/Doctor view - Show risk alerts across all patients
            if (riskHeader) riskHeader.innerHTML = '<span class="material-icons-round text-primary">warning</span> AI Patient Risk Alerts';
            if (riskFooter) {
                riskFooter.textContent = 'Vitals anomaly detection active across all patient feeds.';
            }

            const mediumHighRisks = risks.filter(r => r.riskLevel.toLowerCase() === 'high' || r.riskLevel.toLowerCase() === 'medium');

            if (riskBadgeContainer) {
                if (mediumHighRisks.length > 0) {
                    const highCount = mediumHighRisks.filter(r => r.riskLevel.toLowerCase() === 'high').length;
                    const medCount = mediumHighRisks.filter(r => r.riskLevel.toLowerCase() === 'medium').length;
                    riskBadgeContainer.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="risk-score-badge high">${highCount} High Risk</span>
                                <span class="risk-score-badge medium">${medCount} Medium Risk</span>
                            </div>
                            <span style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Requires attention from medical staff.</span>
                        </div>
                    `;
                } else {
                    riskBadgeContainer.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="risk-score-badge low">0 Patients Flagged</span>
                            <span style="font-size: 12.5px; color: var(--text-secondary);">All patient vitals normal</span>
                        </div>
                    `;
                }
            }

            // In recommendations list, show active recommendations summaries for doctors/admins
            recsList.innerHTML = '';
            if (mediumHighRisks.length === 0) {
                recsList.innerHTML = '<li style="color: var(--text-secondary); font-style: italic; font-size: 13px;">No patient intervention warnings computed. All profiles stable.</li>';
            } else {
                mediumHighRisks.forEach(r => {
                    const iconColor = r.riskLevel.toLowerCase() === 'high' ? '#ef4444' : '#f59e0b';
                    recsList.innerHTML += `
                        <li style="display: flex; gap: 8px; font-size: 13px; line-height: 1.4; color: var(--text-secondary); margin-bottom: 6px;">
                            <span class="material-icons-round" style="font-size: 16px; color: ${iconColor};">error_outline</span>
                            <span><strong>${escapeHtml(r.patientName)}</strong>: ${escapeHtml(r.explanation)}</span>
                        </li>
                    `;
                });
            }
        }
    } catch (e) {
        console.error("Dashboard risk widget render failure:", e);
    }
}

/**
 * Line chart for wearable Vitals trends (HR & Oxygen Levels) for patient on their dashboard
 */
async function renderPatientVitalsChart(patientName) {
    const ctx = document.getElementById('dashboardCombinedChart');
    if (!ctx) return;

    if (combinedChartInstance) {
        combinedChartInstance.destroy();
    }

    try {
        const wearables = await RkDb.getWearables();
        const logs = wearables.filter(w => w.patientName === patientName)
                              .sort((a,b) => a.timestamp - b.timestamp); // Chronological

        const labels = logs.map(l => new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const hrData = logs.map(l => l.heartRate);
        const spo2Data = logs.map(l => l.oxygenLevel);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? '#1f2937' : '#e2e8f0';
        const textColor = isDark ? '#f3f4f6' : '#0f172a';

        combinedChartInstance = new Chart(ctx, {
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
    } catch (e) {
        console.error("Error drawing vitals line chart on dashboard:", e);
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

function ensureMockDataForUser(fullName) {
    if (!fullName) return;
    
    // Check if the user already has health records
    const records = JSON.parse(localStorage.getItem('rk_mock_health_records') || '[]');
    const userRecords = records.filter(r => r.patientName === fullName);
    
    if (userRecords.length > 0) {
        return; // Already has data, no need to seed
    }
    
    console.log("Seeding mock data for user:", fullName);
    
    // 1. Seed Health Record
    const newRecord = {
        id: `HLT-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        age: 32,
        gender: "Male",
        bloodGroup: "O+",
        height: 175,
        weight: 72,
        allergies: "None",
        doctor: "Dr. Madhu S Reddy (Gen Physician)",
        diagnosis: "General Wellness Checkup & Mild Fatigue",
        prescription: "Multivitamin daily (Morning)\nVitamin D3 1000IU once daily",
        visitNotes: "Patient reports feeling tired. Vitals are stable. Advised 7-8 hours of sleep and regular exercise.",
        followUpDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
        timestamp: new Date().getTime() - 24 * 60 * 60 * 1000 // Yesterday
    };
    records.push(newRecord);
    localStorage.setItem('rk_mock_health_records', JSON.stringify(records));
    
    // 2. Seed Appointments
    const appointments = JSON.parse(localStorage.getItem('rk_mock_appointments') || '[]');
    const newAppt1 = {
        id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        doctorName: "Dr. Madhu S Reddy (Gen Physician)",
        title: "Follow-up Consultation",
        date: new Date().toISOString().split('T')[0], // Today
        time: "11:00",
        hospital: "RK Hospital - Main Branch",
        reason: "Review fatigue symptoms and lab reports",
        notes: "General checkup follow-up.",
        calendarLink: "",
        timestamp: new Date().getTime()
    };
    const newAppt2 = {
        id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        doctorName: "Dr. Shalini K (Cardiologist)",
        title: "Cardio Preventive Review",
        date: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days later
        time: "15:30",
        hospital: "RK Hospital - Main Branch",
        reason: "Routine ECG post-stress review",
        notes: "Preventive cardiology check.",
        calendarLink: "",
        timestamp: new Date().getTime() - 2 * 24 * 60 * 60 * 1000
    };
    appointments.push(newAppt1, newAppt2);
    localStorage.setItem('rk_mock_appointments', JSON.stringify(appointments));
    
    // 3. Seed Medicines
    const medicines = JSON.parse(localStorage.getItem('rk_mock_medicines') || '[]');
    const newMed1 = {
        id: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        medicineName: "Daily Multivitamin",
        dosage: "1 tablet",
        frequency: "Morning",
        morning: true,
        afternoon: false,
        night: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        phoneNumber: "+15005550006",
        notes: "Take after breakfast. Patient: " + fullName,
        smsStatus: "Delivered",
        timestamp: new Date().getTime()
    };
    const newMed2 = {
        id: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        medicineName: "Vitamin D3",
        dosage: "1000 IU (1 capsule)",
        frequency: "Night",
        morning: false,
        afternoon: false,
        night: true,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        phoneNumber: "+15005550006",
        notes: "Take at bedtime with milk. Patient: " + fullName,
        smsStatus: "Delivered",
        timestamp: new Date().getTime() - 12 * 60 * 60 * 1000
    };
    medicines.push(newMed1, newMed2);
    localStorage.setItem('rk_mock_medicines', JSON.stringify(medicines));
    
    // 4. Seed Wearables Vitals
    const wearables = JSON.parse(localStorage.getItem('rk_mock_wearables') || '[]');
    const baseTime = new Date().getTime();
    for (let i = 4; i >= 0; i--) {
        const time = baseTime - i * 24 * 60 * 60 * 1000;
        const hr = 70 + Math.floor(Math.random() * 12);
        const sys = 115 + Math.floor(Math.random() * 10);
        const dia = 75 + Math.floor(Math.random() * 8);
        const steps = 6000 + Math.floor(Math.random() * 4000);
        wearables.push({
            id: `WEAR-${Math.floor(1000 + Math.random() * 9000)}`,
            patientName: fullName,
            heartRate: hr,
            bloodPressure: `${sys}/${dia}`,
            oxygenLevel: 97 + Math.floor(Math.random() * 3),
            temperature: (98.0 + Math.random() * 0.8).toFixed(1),
            steps: steps,
            calories: Math.floor(steps * 0.045),
            sleepHours: (6.5 + Math.random() * 2).toFixed(1),
            timestamp: time
        });
    }
    localStorage.setItem('rk_mock_wearables', JSON.stringify(wearables));
    
    // 5. Seed Risk assessment
    const risks = JSON.parse(localStorage.getItem('rk_mock_risk_predictions') || '[]');
    const newRisk = {
        id: `RISK-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: fullName,
        riskScore: 18,
        riskLevel: "Low",
        explanation: "All vitals are in optimal ranges. The reports suggest stable cardiac activity and good recovery metrics.",
        actions: "Maintain balanced dietary plan.\nMonitor heart rate twice weekly.",
        recommendations: "Drink 2.5L water daily.\nAim for 7.5 hours of sleep.",
        timestamp: new Date().getTime()
    };
    risks.push(newRisk);
    localStorage.setItem('rk_mock_risk_predictions', JSON.stringify(risks));
    
    // 6. Seed Activities
    const activities = JSON.parse(localStorage.getItem('rk_mock_activities') || '[]');
    activities.unshift(
        { type: 'appointment', text: `Appointment APT-1011 created for ${fullName}`, time: 'Just Now', status: 'success' },
        { type: 'medicine', text: `Medicine schedule created for ${fullName}`, time: '5 mins ago', status: 'success' }
    );
    localStorage.setItem('rk_mock_activities', JSON.stringify(activities));
}
