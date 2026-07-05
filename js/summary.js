/**
 * RK Health - AI Patient Visit Summary Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateAiSummaryBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateAiSummary);
    }
});

/**
 * Populates patient choice selectors in AI and Report views
 */
async function populatePatientDropdowns() {
    const aiSelect = document.getElementById('summaryPatientSelect');
    const reportSelect = document.getElementById('reportsPatientSelect');

    if (!aiSelect) return;

    try {
        const records = await RkDb.getHealthRecords();
        
        // Clear previous options (keep default)
        aiSelect.innerHTML = '<option value="">-- Choose Patient Record --</option>';
        if (reportSelect) {
            reportSelect.innerHTML = '<option value="">-- Choose Patient Record --</option>';
        }

        if (records.length === 0) {
            return;
        }

        // Keep track of added names to ensure uniqueness
        const uniqueNames = new Set();

        records.forEach(rec => {
            if (!uniqueNames.has(rec.patientName)) {
                uniqueNames.add(rec.patientName);
                
                const optHtml = `<option value="${escapeHtml(rec.patientName)}">${escapeHtml(rec.patientName)} (ID: ${rec.id})</option>`;
                aiSelect.innerHTML += optHtml;
                if (reportSelect) {
                    reportSelect.innerHTML += optHtml;
                }
            }
        });

    } catch (error) {
        console.error("Error loading patient dropdowns:", error);
    }
}

/**
 * Aggregates clinical history and queries AI engine
 */
async function handleGenerateAiSummary() {
    const select = document.getElementById('summaryPatientSelect');
    const patientName = select.value;

    if (!patientName) {
        showToast("Please select a patient file from the list first", "warning");
        return;
    }

    const loader = document.getElementById('aiSummaryLoader');
    const displayCard = document.getElementById('aiSummaryDisplayCard');

    // Toggle panels
    loader.style.display = 'block';
    displayCard.style.display = 'none';

    try {
        // 1. Gather all EHR files for this patient
        const records = await RkDb.getHealthRecords();
        const patientRecs = records.filter(r => r.patientName === patientName);

        if (patientRecs.length === 0) {
            showToast("No diagnosis records found for this patient", "error");
            loader.style.display = 'none';
            return;
        }

        // Get the latest clinical record
        const latestRec = patientRecs.sort((a,b) => b.timestamp - a.timestamp)[0];

        // 2. Gather active medication plans
        const medicines = await RkDb.getMedicines();
        const patientMeds = medicines.filter(m => m.phoneNumber && m.phoneNumber.length > 0 && m.medicineName); // active filter
        // Simple matching logic
        const medsSummaryStr = patientMeds.map(m => `- ${m.medicineName} (${m.dosage}) ${m.frequency}`).join('\n');

        // Compile contextual prompt details
        const visitDetails = {
            age: latestRec.age,
            gender: latestRec.gender,
            diagnosis: latestRec.diagnosis,
            prescription: latestRec.prescription + "\n" + medsSummaryStr,
            allergies: latestRec.allergies,
            followUpDate: latestRec.followUpDate,
            doctor: latestRec.doctor,
            visitNotes: latestRec.visitNotes
        };

        // 3. Request summary from AI Layer (Groq API llama-3.3-70b-versatile)
        const summaryData = await RkDb.generateAiSummary(patientName, visitDetails);

        // 4. Render AI results
        renderSummaryData(patientName, summaryData);
        showToast(`AI Clinical Summary compiled for ${patientName}`, "success");

    } catch (error) {
        console.error("AI Summary compilation error:", error);
        showToast("Could not generate AI summary: check API variables", "error");
    } finally {
        loader.style.display = 'none';
    }
}

/**
 * Bind response JSON keys to summary UI elements
 */
function renderSummaryData(patientName, summaryObj) {
    const displayCard = document.getElementById('aiSummaryDisplayCard');
    if (!displayCard) return;

    // Parse summary text JSON
    let parsed = {};
    try {
        parsed = JSON.parse(summaryObj.summaryText);
    } catch {
        // Fallback for flat text strings if response formatting is straight text
        parsed = {
            visitSummary: summaryObj.summaryText || 'N/A',
            diagnosisExpl: 'Compiled diagnostics text.',
            medInstructions: 'Take medications as directed by physician.',
            lifestyleSuggestions: 'Maintain balanced hydration and light exercise routines.',
            risks: 'Consult primary care doctor if symptoms aggravate.',
            followUp: 'Check follow-up dates.'
        };
    }

    document.getElementById('summaryTitlePatient').innerHTML = `AI Smart Summary: <strong>${escapeHtml(patientName)}</strong>`;
    
    // Set timestamp
    const dateStr = new Date(summaryObj.timestamp || new Date()).toLocaleString();
    document.getElementById('summaryTimestampText').textContent = `Generated: ${dateStr}`;

    // Map fields
    document.getElementById('aiVisitSummaryText').textContent = parsed.visitSummary || '-';
    document.getElementById('aiDiagnosisExplText').textContent = parsed.diagnosisExpl || '-';
    document.getElementById('aiMedInstructionsText').textContent = parsed.medInstructions || '-';
    document.getElementById('aiLifestyleText').textContent = parsed.lifestyleSuggestions || '-';
    document.getElementById('aiRisksText').textContent = parsed.risks || '-';
    document.getElementById('aiFollowUpText').textContent = parsed.followUp || '-';

    displayCard.style.display = 'block';
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
