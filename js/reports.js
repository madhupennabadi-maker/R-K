/**
 * RK Health - Medical Report Compiler & Printer
 */

let compiledReportData = null;

document.addEventListener('DOMContentLoaded', () => {
    const viewBtn = document.getElementById('generateReportViewBtn');
    if (viewBtn) {
        viewBtn.addEventListener('click', compilePatientReport);
    }

    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    const pdfBtn = document.getElementById('pdfReportBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            showToast("Opening PDF print console. Choose 'Save as PDF' as your printer destination.", "info");
            setTimeout(() => {
                window.print();
            }, 500);
        });
    }

    const downloadBtn = document.getElementById('downloadDataReportBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadJsonReport);
    }
});

/**
 * Route function triggered on sidebar load
 */
async function populateReportsDropdown() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const activeUser = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';
    const select = document.getElementById('reportsPatientSelect');

    if (!select) return;

    if (role === 'Patient') {
        // Clear and add only the patient themselves
        select.innerHTML = `<option value="${escapeHtml(activeUser)}">${escapeHtml(activeUser)}</option>`;
        select.value = activeUser;
        select.disabled = true;
        
        // Hide the compile button because it runs automatically
        const compileBtn = document.getElementById('generateReportViewBtn');
        if (compileBtn) compileBtn.style.display = 'none';

        // Auto compile the report immediately
        await compilePatientReport();
    } else {
        if (typeof populatePatientDropdowns === 'function') {
            await populatePatientDropdowns();
        }
        select.disabled = false;
        const compileBtn = document.getElementById('generateReportViewBtn');
        if (compileBtn) compileBtn.style.display = '';
        select.value = '';
        document.getElementById('reportViewContainer').style.display = 'none';
    }
}

/**
 * Gathers complete records across sheets to build medical PDF paper
 */
async function compilePatientReport() {
    const select = document.getElementById('reportsPatientSelect');
    const patientName = select.value;

    if (!patientName) {
        showToast("Please choose a patient file to compile", "warning");
        return;
    }

    try {
        // Fetch raw data
        const records = await RkDb.getHealthRecords();
        const appts = await RkDb.getAppointments();
        const meds = await RkDb.getMedicines();
        const summaries = await RkDb.getAiSummaries();
        const wearables = await RkDb.getWearables();
        const risks = await RkDb.getRisks();

        // 1. Filter files for active patient
        const patientRecs = records.filter(r => r.patientName === patientName);
        if (patientRecs.length === 0) {
            showToast("No demographic records found for this patient", "error");
            return;
        }
        
        // Latest health log
        const latestRec = patientRecs.sort((a,b) => b.timestamp - a.timestamp)[0];

        // Appointments history
        const patientAppts = appts.filter(a => a.patientName === patientName);

        // Medications schedules
        const patientMeds = meds.filter(m => 
            (m.patientName && m.patientName === patientName) || 
            (m.notes && m.notes.toLowerCase().includes(patientName.toLowerCase()))
        );

        // AI Summary
        const latestSum = summaries.find(s => s.patientName === patientName);

        // 2. Compute compliance rate
        let complianceVal = "100%";
        if (patientMeds.length > 0) {
            const delivered = patientMeds.filter(m => m.smsStatus === 'Delivered').length;
            complianceVal = `${Math.round((delivered / patientMeds.length) * 100)}%`;
        }

        // Save active report context for downloads
        compiledReportData = {
            patientName: patientName,
            demographics: latestRec,
            appointments: patientAppts,
            medications: patientMeds,
            aiSummary: latestSum || null,
            compliance: complianceVal,
            wearables: wearables.filter(w => w.patientName === patientName).sort((a,b) => b.timestamp - a.timestamp),
            risk: risks.find(r => r.patientName === patientName) || null,
            compiledAt: new Date().toISOString()
        };

        // 3. Render into report elements
        renderReportPaper(compiledReportData);
        
        // Display report panel
        document.getElementById('reportViewContainer').style.display = 'block';
        showToast(`Report compiled for ${patientName}`, "success");

    } catch (error) {
        console.error("Report compilation error:", error);
        showToast("Error generating report", "error");
    }
}

/**
 * Binds report variables to A4 template
 */
function renderReportPaper(data) {
    // Report ID & Date
    document.getElementById('reportMetaId').textContent = `RKH-${Math.floor(1000 + Math.random()*9000)}-${new Date().getFullYear()}`;
    document.getElementById('reportMetaDate').textContent = new Date().toLocaleDateString();

    // Patient Info
    document.getElementById('reportPatientName').textContent = data.patientName;
    document.getElementById('reportPatientAgeGender').textContent = `${data.demographics.age} Years / ${data.demographics.gender}`;
    document.getElementById('reportPatientBlood').textContent = data.demographics.bloodGroup;
    document.getElementById('reportPatientHeightWeight').textContent = `${data.demographics.height} cm / ${data.demographics.weight} kg`;
    
    const allergiesText = data.demographics.allergies || 'None';
    document.getElementById('reportPatientAllergies').textContent = allergiesText;
    document.getElementById('reportPatientAllergies').style.color = (allergiesText.toLowerCase() === 'none') ? '#10b981' : '#ef4444';

    // Doctor Notes
    document.getElementById('reportDoctorNotes').textContent = data.demographics.visitNotes || 'No notes compiled.';
    document.getElementById('reportComplianceRate').textContent = data.compliance;

    // Appointments Table
    const apptsBody = document.querySelector('#reportApptsTable tbody');
    apptsBody.innerHTML = '';
    if (data.appointments.length === 0) {
        apptsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No scheduled clinical visits found.</td></tr>';
    } else {
        data.appointments.forEach(appt => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${appt.date} (${appt.time})</td>
                <td>${escapeHtml(appt.doctorName)}</td>
                <td>${escapeHtml(appt.hospital)}</td>
                <td>${escapeHtml(appt.reason)}</td>
                <td>${escapeHtml(appt.title)}</td>
            `;
            apptsBody.appendChild(tr);
        });
    }

    // Medications Table
    const medsBody = document.querySelector('#reportMedsTable tbody');
    medsBody.innerHTML = '';
    if (data.medications.length === 0) {
        medsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No scheduled active medication alerts found.</td></tr>';
    } else {
        data.medications.forEach(med => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(med.medicineName)}</strong></td>
                <td>${escapeHtml(med.dosage)}</td>
                <td>${escapeHtml(med.frequency)}</td>
                <td>${med.startDate} to ${med.endDate}</td>
                <td><code>${escapeHtml(med.phoneNumber)}</code> (${med.smsStatus})</td>
            `;
            medsBody.appendChild(tr);
        });
    }

    // Wearable Vitals Section Block
    const wearablesBody = document.querySelector('#reportWearablesTable tbody');
    if (wearablesBody) {
        wearablesBody.innerHTML = '';
        if (data.wearables.length === 0) {
            wearablesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No wearable vital sensor logs found.</td></tr>';
        } else {
            data.wearables.slice(0, 5).forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.timestamp).toLocaleDateString()}</td>
                    <td>${log.heartRate} bpm</td>
                    <td>${escapeHtml(log.bloodPressure)}</td>
                    <td>${log.oxygenLevel}%</td>
                    <td>${log.temperature} °F</td>
                    <td>${log.steps.toLocaleString()}</td>
                `;
                wearablesBody.appendChild(tr);
            });
        }
    }

    // Risk Assessment Block
    const riskBlock = document.getElementById('reportRiskBlock');
    if (riskBlock) {
        if (data.risk) {
            let badgeColor = '#10b981';
            if (data.risk.riskLevel.toLowerCase() === 'medium') badgeColor = '#f59e0b';
            if (data.risk.riskLevel.toLowerCase() === 'high') badgeColor = '#ef4444';
            
            riskBlock.innerHTML = `
                <p style="margin-bottom: 8px;">
                    <strong>AI Danger Score:</strong> 
                    <span style="color: ${badgeColor}; font-weight: 700;">${data.risk.riskScore}/100 (${data.risk.riskLevel} Risk)</span>
                </p>
                <p style="margin-bottom: 8px;"><strong>Diagnostic Explanation:</strong> ${data.risk.explanation}</p>
                <p style="margin-bottom: 8px;"><strong>Suggested Treatment Targets:</strong> ${data.risk.actions}</p>
                <p><strong>Predictive Lifestyle Improvements:</strong> ${data.risk.recommendations}</p>
            `;
        } else {
            riskBlock.innerHTML = `
                <div style="color: #64748b; font-style: italic; text-align: center;">
                    No AI Health Risk prediction has been calculated. Run risk evaluations in the Risk tab first.
                </div>
            `;
        }
    }

    // AI Summary Block
    const summaryBlock = document.getElementById('reportAiSummaryBlock');
    if (data.aiSummary) {
        try {
            const parsed = JSON.parse(data.aiSummary.summaryText);
            summaryBlock.innerHTML = `
                <p style="margin-bottom: 8px;"><strong>Visit Summary:</strong> ${parsed.visitSummary}</p>
                <p style="margin-bottom: 8px;"><strong>Diagnosis Explained:</strong> ${parsed.diagnosisExpl}</p>
                <p style="margin-bottom: 8px;"><strong>Instructions:</strong> ${parsed.medInstructions}</p>
                <p style="margin-bottom: 8px;"><strong>Lifestyle Guidelines:</strong> ${parsed.lifestyleSuggestions}</p>
                <p><strong>Emergency Red Flags:</strong> ${parsed.risks}</p>
            `;
        } catch {
            summaryBlock.innerHTML = `<p>${data.aiSummary.summaryText}</p>`;
        }
    } else {
        summaryBlock.innerHTML = `
            <div style="color: #64748b; font-style: italic; text-align: center;">
                No AI Visit Summary has been compiled for this patient. Go to AI Summary module to generate.
            </div>
        `;
    }
}

/**
 * Downloads the report payload as a JSON file
 */
function downloadJsonReport() {
    if (!compiledReportData) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(compiledReportData, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `RKH_Report_${compiledReportData.patientName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("JSON report downloaded successfully", "success");
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
