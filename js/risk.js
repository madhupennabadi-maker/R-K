/**
 * RK Health - AI Health Risk Predictor Controller
 */

let riskPredictionsState = [];

document.addEventListener('DOMContentLoaded', () => {
    const riskBtn = document.getElementById('calculateRiskBtn');
    if (riskBtn) {
        riskBtn.addEventListener('click', handleRiskPrediction);
    }
});

/**
 * Main routine loaded on switching to Risk section
 */
async function loadRiskSection() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    const select = document.getElementById('riskPatientSelect');

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
            // Instantly render existing calculations if available
            await renderPatientRiskView(activeUser);
        } else {
            select.disabled = false;
            select.value = '';
            document.getElementById('riskAnalysisDisplay').style.display = 'none';
        }

        // Listener for changes
        select.addEventListener('change', () => {
            if (select.value) {
                renderPatientRiskView(select.value);
            } else {
                document.getElementById('riskAnalysisDisplay').style.display = 'none';
            }
        });

    } catch (e) {
        console.error("Risk page initialization error:", e);
    }
}

/**
 * Renders previous predictions for patient name
 */
async function renderPatientRiskView(patientName) {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    if (role === 'Patient' && patientName !== activeUser) {
        showToast("Access Denied", "error");
        return;
    }

    riskPredictionsState = await RkDb.getRisks();
    const prediction = riskPredictionsState.find(r => r.patientName === patientName);

    const displayCard = document.getElementById('riskAnalysisDisplay');

    if (prediction) {
        bindRiskAssessmentData(prediction);
        displayCard.style.display = 'block';
    } else {
        displayCard.style.display = 'none';
        showToast("No pre-computed risk file. Click 'Analyze Vitals Risk' to run calculations.", "info");
    }
}

/**
 * Collects clinical records context and triggers Groq AI prediction
 */
async function handleRiskPrediction() {
    const select = document.getElementById('riskPatientSelect');
    const patientName = select.value;

    if (!patientName) {
        showToast("Please choose a patient to analyze", "warning");
        return;
    }

    const loader = document.getElementById('riskAnalysisLoader');
    const displayPanel = document.getElementById('riskAnalysisDisplay');

    loader.style.display = 'block';
    displayPanel.style.display = 'none';

    try {
        // 1. Get EHR files
        const records = await RkDb.getHealthRecords();
        const patientRecs = records.filter(r => r.patientName === patientName);
        if (patientRecs.length === 0) {
            showToast("No electronic health records found for patient details", "error");
            loader.style.display = 'none';
            return;
        }
        const latestEhr = patientRecs.sort((a,b) => b.timestamp - a.timestamp)[0];

        // 2. Get Medications Adherence logs
        const meds = await RkDb.getMedicines();
        const patientMeds = meds.filter(m => m.notes && m.notes.toLowerCase().includes(patientName.toLowerCase()) || true); // mock demo safety

        // 3. Get Wearables Logs
        const wearables = await RkDb.getWearables();
        const patientLogs = wearables.filter(w => w.patientName === patientName)
                                     .sort((a,b) => b.timestamp - a.timestamp)
                                     .slice(0, 5); // Latest 5 vitals logs

        // 4. package payload
        const payload = {
            ehrRecord: latestEhr,
            meds: patientMeds,
            wearableLogs: patientLogs
        };

        // 5. Fire prediction query to Apps Script Groq API Proxy
        const riskResult = await RkDb.predictRisk(patientName, payload);

        // 6. Render Vitals Gauge values
        bindRiskAssessmentData(riskResult);
        displayPanel.style.display = 'block';
        showToast(`Health Risk Prediction calculated for ${patientName}`, "success");

        // Refresh dashboard recommendations if visible
        if (document.getElementById('dashboardSection').classList.contains('active')) {
            initDashboardCharts();
        }

    } catch (e) {
        console.error("AI Risk assessment failed:", e);
        showToast("AI Risk Prediction query failed. Please verify API configuration.", "error");
    } finally {
        loader.style.display = 'none';
    }
}

/**
 * Animate and bind AI risk prediction objects variables to dashboard HTML gauges
 */
function bindRiskAssessmentData(risk) {
    const scoreVal = parseInt(risk.riskScore);
    
    // Animate score counter
    const scoreEl = document.getElementById('riskScoreValue');
    if (scoreEl) {
        let current = 0;
        const interval = setInterval(() => {
            if (current >= scoreVal) {
                scoreEl.textContent = scoreVal;
                clearInterval(interval);
            } else {
                current += 2;
                scoreEl.textContent = Math.min(current, scoreVal);
            }
        }, 15);
    }

    // Set Level badge and styling
    const badge = document.getElementById('riskScoreBadge');
    const ring = document.getElementById('riskScoreRing');
    const scaleBar = document.getElementById('riskScaleFill');

    if (badge && ring && scaleBar) {
        badge.className = `risk-score-badge ${risk.riskLevel.toLowerCase()}`;
        badge.textContent = `${risk.riskLevel} Risk`;

        // Update colors based on risk severity
        let color = '#10b981'; // safe green
        if (risk.riskLevel.toLowerCase() === 'medium') color = '#f59e0b'; // orange
        if (risk.riskLevel.toLowerCase() === 'high') color = '#ef4444'; // red

        ring.style.borderColor = color;
        scaleBar.style.width = `${scoreVal}%`;
        scaleBar.style.backgroundColor = color;
    }

    // Text descriptions
    document.getElementById('riskExplanationText').textContent = risk.explanation || '-';
    document.getElementById('riskActionsText').textContent = risk.actions || '-';
    document.getElementById('riskRecommendationsText').textContent = risk.recommendations || '-';
    
    // Set Timestamp
    const dateStr = new Date(risk.timestamp || new Date()).toLocaleString();
    document.getElementById('riskTimestampText').textContent = `AI Analysis Compiled: ${dateStr}`;
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
