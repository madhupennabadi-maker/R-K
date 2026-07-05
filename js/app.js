/**
 * RK Health - Core Application Manager & API Layer
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Session Guard (Skip for login.html and register.html)
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        if (sessionStorage.getItem('rk_session_active') !== 'true') {
            window.location.href = 'login.html';
            return;
        }
        // Apply permissions
        applyRoleAccessControls();
    }

    // 2. Load Theme preferences
    initThemeSettings();

    // 3. Initialize Sidebar & Nav Router
    initNavigationRouter();

    // 4. Initialize Notifications Drawer
    initNotifications();

    // 5. Initialize Search Handler
    initGlobalSearch();
});

// ==========================================
// TOAST NOTIFICATIONS DISPATCHER
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    let title = 'Notification';
    if (type === 'success') { icon = 'check_circle'; title = 'Success'; }
    else if (type === 'error') { icon = 'error'; title = 'Error'; }
    else if (type === 'warning') { icon = 'warning'; title = 'Warning'; }

    toast.innerHTML = `
        <span class="material-icons-round toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove toast
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.35s reverse ease-in forwards';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ==========================================
// SYSTEM THEME MANAGER
// ==========================================
function initThemeSettings() {
    const htmlEl = document.documentElement;
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeToggleIcon');
    const darkToggle = document.getElementById('settingsDarkModeToggle');

    // Default configuration checking
    const currentTheme = localStorage.getItem('rk_theme') || 'light';
    htmlEl.setAttribute('data-theme', currentTheme);
    if (themeIcon) {
        themeIcon.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
    if (darkToggle) {
        darkToggle.checked = currentTheme === 'dark';
    }

    // Handle Theme toggles
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const newTheme = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            htmlEl.setAttribute('data-theme', newTheme);
            localStorage.setItem('rk_theme', newTheme);
            themeIcon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
            if (darkToggle) darkToggle.checked = newTheme === 'dark';
            showToast(`Theme changed to ${newTheme} mode`, 'info');
        });
    }

    if (darkToggle) {
        darkToggle.addEventListener('change', () => {
            const newTheme = darkToggle.checked ? 'dark' : 'light';
            htmlEl.setAttribute('data-theme', newTheme);
            localStorage.setItem('rk_theme', newTheme);
            if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
            showToast(`Theme changed to ${newTheme} mode`, 'info');
        });
    }

    // Color theme pickers
    const colorOptions = document.querySelectorAll('.color-option');
    const savedAccent = localStorage.getItem('rk_theme_accent') || 'blue';
    applyThemeAccent(savedAccent);

    colorOptions.forEach(opt => {
        const color = opt.getAttribute('data-theme-color');
        if (color === savedAccent) opt.classList.add('active');
        else opt.classList.remove('active');

        opt.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            localStorage.setItem('rk_theme_accent', color);
            applyThemeAccent(color);
            showToast(`Accent color updated`, 'success');
        });
    });
}

function applyThemeAccent(accent) {
    const root = document.documentElement;
    if (accent === 'teal') {
        root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)');
        root.style.setProperty('--color-primary', '#0d9488');
    } else if (accent === 'indigo') {
        root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)');
        root.style.setProperty('--color-primary', '#4f46e5');
    } else if (accent === 'green') {
        root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)');
        root.style.setProperty('--color-primary', '#16a34a');
    } else { // default blue
        root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)');
        root.style.setProperty('--color-primary', '#2563eb');
    }
}

// ==========================================
// NAVIGATION ROUTER (SINGLE PAGE UI SWITCHES)
// ==========================================
function initNavigationRouter() {
    const sidebarItems = document.querySelectorAll('.sidebar-menu .sidebar-item');
    const sections = document.querySelectorAll('.page-section');
    const sidebar = document.getElementById('appSidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const logoutBtn = document.getElementById('sidebarLogout');

    // Section switcher
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            // Set active class in sidebar
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Swap visible page sections
            sections.forEach(sec => {
                if (sec.id === targetId) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('remove', 'active');
                }
            });

            // If mobile, collapse drawer upon click selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }

            // Fire page specific triggers
            if (targetId === 'dashboardSection' && typeof initDashboardCharts === 'function') {
                initDashboardCharts();
            } else if (targetId === 'appointmentsSection' && typeof loadAppointments === 'function') {
                loadAppointments();
            } else if (targetId === 'medicationSection' && typeof loadMedications === 'function') {
                loadMedications();
            } else if (targetId === 'healthSection' && typeof loadHealthRecords === 'function') {
                loadHealthRecords();
            } else if (targetId === 'summarySection' && typeof populatePatientDropdowns === 'function') {
                populatePatientDropdowns();
            } else if (targetId === 'wearablesSection' && typeof loadWearableSection === 'function') {
                loadWearableSection();
            } else if (targetId === 'riskSection' && typeof loadRiskSection === 'function') {
                loadRiskSection();
            } else if (targetId === 'analyticsSection' && typeof loadAnalyticsSection === 'function') {
                loadAnalyticsSection();
            } else if (targetId === 'reportsSection' && typeof populateReportsDropdown === 'function') {
                populateReportsDropdown();
            }
        });
    });

    // Expand / Collapse Sidebar
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Logout controller
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('rk_session_active');
            sessionStorage.removeItem('rk_user');
            sessionStorage.removeItem('rk_user_role');
            sessionStorage.removeItem('rk_username');
            showToast('Logging out...', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        });
    }
}

// ==========================================
// NOTIFICATIONS BAR SYSTEM
// ==========================================
function initNotifications() {
    const notifBtn = document.getElementById('notifToggleBtn');
    const dropdown = document.getElementById('notificationsDropdown');
    const clearBtn = document.getElementById('clearNotifBtn');
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');

    if (!notifBtn || !dropdown) return;

    // Toggle dropdown
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Load active notifications
    const renderNotifications = () => {
        const activities = JSON.parse(localStorage.getItem('rk_mock_activities') || '[]');
        list.innerHTML = '';
        
        if (activities.length === 0) {
            badge.style.display = 'none';
            list.innerHTML = `
                <li class="notification-item empty-state">
                    <span class="material-icons-round">notifications_off</span>
                    <p>No new notifications</p>
                </li>
            `;
            return;
        }

        badge.style.display = 'block';
        badge.textContent = activities.length;

        activities.slice(0, 5).forEach((act, idx) => {
            let icon = 'notifications';
            if (act.type === 'appointment') icon = 'calendar_month';
            if (act.type === 'medicine') icon = 'vaccines';
            if (act.type === 'summary') icon = 'psychology';

            const item = document.createElement('li');
            item.className = 'notification-item unread';
            item.innerHTML = `
                <div class="notification-item-icon ${act.type || 'system'}">
                    <span class="material-icons-round">${icon}</span>
                </div>
                <div class="notification-item-content">
                    <p>${act.text}</p>
                    <span class="notification-time">${act.time}</span>
                </div>
            `;
            list.appendChild(item);
        });
    };

    renderNotifications();

    clearBtn.addEventListener('click', () => {
        localStorage.setItem('rk_mock_activities', JSON.stringify([]));
        renderNotifications();
        showToast('All notifications cleared', 'info');
    });
}

function addNotificationLog(text, type = 'system') {
    const activities = JSON.parse(localStorage.getItem('rk_mock_activities') || '[]');
    activities.unshift({
        type: type,
        text: text,
        time: 'Just Now',
        status: 'success'
    });
    localStorage.setItem('rk_mock_activities', JSON.stringify(activities));
    
    // Update live panel if possible
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.style.display = 'block';
        badge.textContent = Math.min(activities.length, 9);
    }
}

// ==========================================
// GLOBAL SEARCH INPUT ROUTER
// ==========================================
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        
        // Feed text queries to standard table listings depending on what section is active
        const activeSection = document.querySelector('.page-section.active');
        if (!activeSection) return;

        if (activeSection.id === 'appointmentsSection') {
            const input = document.getElementById('apptSearch');
            if (input) {
                input.value = query;
                input.dispatchEvent(new Event('input'));
            }
        } else if (activeSection.id === 'medicationSection') {
            const input = document.getElementById('medSearch');
            if (input) {
                input.value = query;
                input.dispatchEvent(new Event('input'));
            }
        } else if (activeSection.id === 'healthSection') {
            const input = document.getElementById('healthSearch');
            if (input) {
                input.value = query;
                input.dispatchEvent(new Event('input'));
            }
        } else if (activeSection.id === 'dashboardSection' && query.length > 2) {
            // Suggest which page contains what
            showToast(`Searching globally for "${query}" - navigate to list panels to view results.`, 'info');
        }
    });
}

// ==========================================
// DATA API ACCESS LAYER (LOCAL / WEB APP HYBRID)
// ==========================================
const RkDb = {
    // Show loading screens during syncing
    setLoading(state, message = "Syncing with cloud...") {
        const loader = document.getElementById('globalLoaderScreen');
        const label = document.getElementById('globalLoaderMessage');
        if (loader && label) {
            label.textContent = message;
            loader.style.display = state ? 'flex' : 'none';
        }
    },

    // Secure POST fetching wrapper to Apps Script web app
    async fetchBackend(action, payload = {}) {
        const url = RK_CONFIG.backendUrl;
        if (!url) throw new Error("Backend URL not configured");

        const fetchParams = {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain' // Workaround for Apps Script CORS Pre-flight issues
            },
            body: JSON.stringify({
                action: action,
                payload: payload
            })
        };

        try {
            const response = await fetch(url, fetchParams);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message || 'API Exception');
            return result.data;
        } catch (error) {
            console.error("RK-Backend Fetch Failure:", error);
            showToast(`Cloud Sync Error: ${error.message}`, 'error');
            throw error;
        }
    },

    // --- 1. APPOINTMENTS API ---
    async getAppointments() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_appointments') || '[]');
        }
        this.setLoading(true, "Fetching clinical appointments...");
        try {
            const list = await this.fetchBackend('getAppointments');
            return list;
        } finally {
            this.setLoading(false);
        }
    },

    async saveAppointment(appt) {
        if (RK_CONFIG.isMock) {
            const appts = JSON.parse(localStorage.getItem('rk_mock_appointments') || '[]');
            if (appt.id) {
                const idx = appts.findIndex(a => a.id === appt.id);
                if (idx !== -1) {
                    appts[idx] = { ...appts[idx], ...appt, timestamp: new Date().getTime() };
                }
            } else {
                appt.id = `APT-${Math.floor(1000 + Math.random() * 9000)}`;
                appt.timestamp = new Date().getTime();
                // Autogenerate Mock Calendar Event Link
                appt.calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appt.title)}&details=${encodeURIComponent(appt.reason)}&location=${encodeURIComponent(appt.hospital)}&dates=${new Date(appt.date + 'T' + appt.time).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(new Date(appt.date + 'T' + appt.time).getTime() + 1800000).toISOString().replace(/-|:|\.\d\d\d/g, "")}`;
                appts.push(appt);
            }
            localStorage.setItem('rk_mock_appointments', JSON.stringify(appts));
            addNotificationLog(`Appointment ${appt.id} saved for ${appt.patientName}`, 'appointment');
            return appt;
        }

        this.setLoading(true, "Saving appointment schedule...");
        try {
            const result = await this.fetchBackend(appt.id ? 'updateAppointment' : 'addAppointment', appt);
            addNotificationLog(`Appointment ${result.id} synced with Google Sheets`, 'appointment');
            return result;
        } finally {
            this.setLoading(false);
        }
    },

    async deleteAppointment(id) {
        if (RK_CONFIG.isMock) {
            const appts = JSON.parse(localStorage.getItem('rk_mock_appointments') || '[]');
            const filtered = appts.filter(a => a.id !== id);
            localStorage.setItem('rk_mock_appointments', JSON.stringify(filtered));
            addNotificationLog(`Appointment ${id} cancelled`, 'appointment');
            return true;
        }

        this.setLoading(true, "Deleting appointment from database...");
        try {
            await this.fetchBackend('deleteAppointment', { id: id });
            addNotificationLog(`Appointment ${id} removed from Google Sheets`, 'appointment');
            return true;
        } finally {
            this.setLoading(false);
        }
    },

    // --- 2. MEDICATION REMINDERS API ---
    async getMedicines() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_medicines') || '[]');
        }
        this.setLoading(true, "Fetching medication files...");
        try {
            return await this.fetchBackend('getMedicines');
        } finally {
            this.setLoading(false);
        }
    },

    async saveMedicine(med) {
        if (RK_CONFIG.isMock) {
            const meds = JSON.parse(localStorage.getItem('rk_mock_medicines') || '[]');
            if (med.id) {
                const idx = meds.findIndex(m => m.id === med.id);
                if (idx !== -1) {
                    meds[idx] = { ...meds[idx], ...med, timestamp: new Date().getTime() };
                }
            } else {
                med.id = `MED-${Math.floor(1000 + Math.random() * 9000)}`;
                med.timestamp = new Date().getTime();
                med.smsStatus = "Delivered"; // Default simulated status
                meds.push(med);
            }
            localStorage.setItem('rk_mock_medicines', JSON.stringify(meds));
            addNotificationLog(`Medicine schedule ${med.id} created`, 'medicine');
            return med;
        }

        this.setLoading(true, "Saving medication schedule to Sheets...");
        try {
            const result = await this.fetchBackend(med.id ? 'updateMedicine' : 'addMedicine', med);
            addNotificationLog(`Medicine ${result.id} synced with Sheets & Twilio`, 'medicine');
            return result;
        } finally {
            this.setLoading(false);
        }
    },

    async deleteMedicine(id) {
        if (RK_CONFIG.isMock) {
            const meds = JSON.parse(localStorage.getItem('rk_mock_medicines') || '[]');
            const filtered = meds.filter(m => m.id !== id);
            localStorage.setItem('rk_mock_medicines', JSON.stringify(filtered));
            addNotificationLog(`Medicine schedule ${id} deleted`, 'medicine');
            return true;
        }

        this.setLoading(true, "Deleting medication from database...");
        try {
            await this.fetchBackend('deleteMedicine', { id: id });
            addNotificationLog(`Medication ${id} removed from Google Sheets`, 'medicine');
            return true;
        } finally {
            this.setLoading(false);
        }
    },

    // --- 3. HEALTH RECORDS API ---
    async getHealthRecords() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_health_records') || '[]');
        }
        this.setLoading(true, "Fetching EHR databases...");
        try {
            return await this.fetchBackend('getHealthRecords');
        } finally {
            this.setLoading(false);
        }
    },

    async saveHealthRecord(rec) {
        if (RK_CONFIG.isMock) {
            const recs = JSON.parse(localStorage.getItem('rk_mock_health_records') || '[]');
            if (rec.id) {
                const idx = recs.findIndex(r => r.id === rec.id);
                if (idx !== -1) {
                    recs[idx] = { ...recs[idx], ...rec, timestamp: new Date().getTime() };
                }
            } else {
                rec.id = `HLT-${Math.floor(1000 + Math.random() * 9000)}`;
                rec.timestamp = new Date().getTime();
                recs.push(rec);
            }
            localStorage.setItem('rk_mock_health_records', JSON.stringify(recs));
            addNotificationLog(`EHR health profile created for ${rec.patientName}`, 'system');
            return rec;
        }

        this.setLoading(true, "Saving clinical profile to Sheets...");
        try {
            const result = await this.fetchBackend(rec.id ? 'updateHealthRecord' : 'addHealthRecord', rec);
            addNotificationLog(`Health Record ${result.id} synced with Google Sheets`, 'system');
            return result;
        } finally {
            this.setLoading(false);
        }
    },

    async deleteHealthRecord(id) {
        if (RK_CONFIG.isMock) {
            const recs = JSON.parse(localStorage.getItem('rk_mock_health_records') || '[]');
            const filtered = recs.filter(r => r.id !== id);
            localStorage.setItem('rk_mock_health_records', JSON.stringify(filtered));
            addNotificationLog(`Health Record ${id} deleted`, 'system');
            return true;
        }

        this.setLoading(true, "Deleting record file...");
        try {
            await this.fetchBackend('deleteHealthRecord', { id: id });
            addNotificationLog(`Health record ${id} removed from Google Sheets`, 'system');
            return true;
        } finally {
            this.setLoading(false);
        }
    },

    // --- 4. AI VISIT SUMMARIZER PROXIES ---
    async getAiSummaries() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_ai_summaries') || '[]');
        }
        try {
            return await this.fetchBackend('getAiSummaries');
        } catch {
            return [];
        }
    },

    async generateAiSummary(patientName, visitDetails) {
        if (RK_CONFIG.isMock) {
            // Simulate Groq AI model response delays locally
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            const generatedMockObj = {
                visitSummary: `${patientName} was checked for complaints about ${visitDetails.diagnosis || 'symptoms'}. The patient requires consistent monitoring of blood count metrics and rest.`,
                diagnosisExpl: `${visitDetails.diagnosis || 'The diagnosed condition'} involves biological strain on immune response pathways, which can cause symptoms of discomfort.`,
                medInstructions: `Take medications exactly as prescribed: ${visitDetails.prescription || 'completed dose schedule'}.`,
                lifestyleSuggestions: "Stay hydrated by consuming at least 2.5L of water daily. Walk lightly for 15-20 minutes in the morning. Avoid heavy meals close to bedtime.",
                risks: "Seek immediate medical attention if you experience breathing complications, continuous chest pain, or sudden high fever.",
                followUp: `Schedule next follow-up evaluation by ${visitDetails.followUpDate || '2 weeks from now'}.`
            };

            const summaries = JSON.parse(localStorage.getItem('rk_mock_ai_summaries') || '[]');
            const newSum = {
                id: `AIS-${Math.floor(1000 + Math.random() * 9000)}`,
                patientName: patientName,
                summaryText: JSON.stringify(generatedMockObj),
                timestamp: new Date().getTime()
            };
            
            // Overwrite or push
            const idx = summaries.findIndex(s => s.patientName === patientName);
            if (idx !== -1) {
                summaries[idx] = newSum;
            } else {
                summaries.push(newSum);
            }
            
            localStorage.setItem('rk_mock_ai_summaries', JSON.stringify(summaries));
            addNotificationLog(`AI Clinical Summary compiled for ${patientName}`, 'summary');
            return newSum;
        }

        // Live API call triggers Groq API
        try {
            const responseObj = await this.fetchBackend('generateSummary', {
                patientName: patientName,
                visitDetails: visitDetails
            });
            addNotificationLog(`AI clinical summary synced for ${patientName}`, 'summary');
            return responseObj;
        } catch (error) {
            showToast("Failed to fetch AI response from Groq. Please verify API configuration in Google Apps Script Script Properties.", "error");
            throw error;
        }
    },

    // --- 5. WEARABLES API ---
    async getWearables() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_wearables') || '[]');
        }
        this.setLoading(true, "Fetching wearable sensor logs...");
        try {
            return await this.fetchBackend('getWearableData');
        } finally {
            this.setLoading(false);
        }
    },

    async addWearable(log) {
        if (RK_CONFIG.isMock) {
            const list = JSON.parse(localStorage.getItem('rk_mock_wearables') || '[]');
            log.id = `WEAR-${Math.floor(1000 + Math.random() * 9000)}`;
            log.timestamp = new Date().getTime();
            list.push(log);
            localStorage.setItem('rk_mock_wearables', JSON.stringify(list));
            addNotificationLog(`Wearable vitals uploaded for ${log.patientName}`, 'wearable');
            return log;
        }
        this.setLoading(true, "Syncing wearable vitals to Sheets...");
        try {
            const res = await this.fetchBackend('addWearableData', log);
            addNotificationLog(`Wearable vitals synced for ${log.patientName}`, 'wearable');
            return res;
        } finally {
            this.setLoading(false);
        }
    },

    // --- 6. HEALTH RISK & RECOMMENDATIONS API ---
    async getRisks() {
        if (RK_CONFIG.isMock) {
            return JSON.parse(localStorage.getItem('rk_mock_risk_predictions') || '[]');
        }
        try {
            return await this.fetchBackend('getRiskPredictions');
        } catch {
            return [];
        }
    },

    async predictRisk(patientName, recordsPayload) {
        if (RK_CONFIG.isMock) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            let score = 15;
            let explanation = "Vitals are stable and adherence is high.";
            let level = "Low";
            
            const ehr = recordsPayload.ehrRecord;
            const meds = recordsPayload.meds;
            const logs = recordsPayload.wearableLogs;
            
            if (ehr) {
                if (ehr.allergies && ehr.allergies.toLowerCase() !== 'none') score += 10;
                if (ehr.age > 50) score += 10;
                if (ehr.diagnosis.toLowerCase().includes('hypertension') || ehr.diagnosis.toLowerCase().includes('pressure')) score += 15;
            }
            if (logs && logs.length > 0) {
                const latest = logs[0];
                if (latest.heartRate > 100 || latest.heartRate < 60) score += 15;
                if (latest.oxygenLevel < 95) score += 20;
                if (latest.temperature > 99.5) score += 15;
            }
            if (meds && meds.length > 0) {
                const failedCount = meds.filter(m => m.smsStatus === 'Failed').length;
                score += failedCount * 10;
            }
            
            score = Math.min(score, 100);
            if (score > 60) {
                level = "High";
                explanation = "Clinical indicators reveal elevated cardiovascular stress, fluctuating vitals, and inconsistent treatment adherence.";
            } else if (score > 30) {
                level = "Medium";
                explanation = "Vitals reflect mild abnormalities, needing regular monitoring and routine exercise adjustments.";
            }
            
            const localResult = {
                id: `RISK-${Math.floor(1000 + Math.random() * 9000)}`,
                patientName: patientName,
                riskScore: score,
                riskLevel: level,
                explanation: explanation,
                actions: "Monitor blood pressure daily at breakfast. Walk 30 minutes daily. Avoid high-stress tasks.",
                recommendations: "Maintain balanced nutrition. Practice mindfulness. Improve overall sleep.",
                timestamp: new Date().getTime()
            };
            
            const list = JSON.parse(localStorage.getItem('rk_mock_risk_predictions') || '[]');
            const idx = list.findIndex(r => r.patientName === patientName);
            if (idx !== -1) list[idx] = localResult;
            else list.push(localResult);
            
            localStorage.setItem('rk_mock_risk_predictions', JSON.stringify(list));
            addNotificationLog(`AI Health Risk prediction calculated for ${patientName}`, 'summary');
            return localResult;
        }

        // Live Mode calling Apps Script Groq API
        try {
            return await this.fetchBackend('predictHealthRisk', {
                patientName: patientName,
                ehrRecord: recordsPayload.ehrRecord,
                meds: recordsPayload.meds,
                wearableLogs: recordsPayload.wearableLogs
            });
        } catch (error) {
            console.error("predictRisk failed:", error);
            throw error;
        }
    }
};

// ==========================================
// SETTINGS PAGE FORM CONTROLS INITIALIZER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsBackendForm');
    const backendUrlInput = document.getElementById('settingsBackendUrl');
    const resetBtn = document.getElementById('resetBackendUrlBtn');

    if (backendUrlInput) {
        backendUrlInput.value = RK_CONFIG.backendUrl;
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = backendUrlInput.value.trim();
            if (url && !url.startsWith('https://script.google.com/')) {
                showToast("Invalid URL. Apps Script Web Apps must start with https://script.google.com", "error");
                return;
            }
            
            RK_CONFIG.backendUrl = url;
            showToast(url ? "Backend synced successfully! Connecting to Live Sheets..." : "Set to local mock database.", "success");
            
            // Reload active states
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem('rk_backend_url');
            backendUrlInput.value = '';
            showToast("Reset to mock data mode.", "info");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    }
});

// ==========================================
// CLIENT-SIDE CRYPTO HASH & AUTH LAYERS
// ==========================================

const RkAuth = {
    // Hashes string using browser native Web Crypto API SHA-256
    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async login(username, password) {
        if (RK_CONFIG.isMock) {
            const users = JSON.parse(localStorage.getItem('rk_mock_users') || '[]');
            const hashed = await this.hashPassword(password);
            const user = users.find(u => 
                (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) && 
                u.passwordHash === hashed
            );
            
            if (!user) throw new Error("Invalid username/email or password.");
            return user;
        }

        // Live Mode
        return await RkDb.fetchBackend('loginUser', {
            username: username,
            password: password
        });
    },

    async register(user) {
        if (RK_CONFIG.isMock) {
            const users = JSON.parse(localStorage.getItem('rk_mock_users') || '[]');
            const usernameLower = user.username.toLowerCase();
            const emailLower = user.email.toLowerCase();
            
            const exists = users.some(u => u.username.toLowerCase() === usernameLower || u.email.toLowerCase() === emailLower);
            if (exists) throw new Error("Username or Email already registered.");

            const hashedPassword = await this.hashPassword(user.password);
            const newUser = {
                id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
                username: user.username,
                email: user.email,
                passwordHash: hashedPassword,
                role: user.role,
                fullName: user.fullName,
                timestamp: new Date().getTime()
            };
            
            users.push(newUser);
            localStorage.setItem('rk_mock_users', JSON.stringify(users));
            addNotificationLog(`Account created for ${user.fullName} (${user.role})`, 'system');
            return newUser;
        }

        // Live Mode
        return await RkDb.fetchBackend('registerUser', user);
    }
};

// ==========================================
// ROLE BASED ACCESS & INTERFACE GATING
// ==========================================

function applyRoleAccessControls() {
    const role = sessionStorage.getItem('rk_user_role') || 'Patient';
    const userRealName = sessionStorage.getItem('rk_user') || 'Sarah Jenkins';

    // Set layout labels
    const initialsEl = document.getElementById('userInitials');
    const profileNameEl = document.getElementById('profileNavName');
    const profileRoleEl = document.querySelector('.user-info-text p');
    
    if (initialsEl) {
        const parts = userRealName.split(' ');
        initialsEl.textContent = (parts.length > 1) ? (parts[0][0] + parts[1][0]).toUpperCase() : userRealName.substring(0, 2).toUpperCase();
    }
    if (profileNameEl) {
        profileNameEl.textContent = userRealName;
    }
    if (profileRoleEl) {
        profileRoleEl.textContent = role;
    }

    // Sidebar Navigation Gating
    const sidebarItems = document.querySelectorAll('.sidebar-menu .sidebar-item');
    sidebarItems.forEach(item => {
        const target = item.getAttribute('data-target');
        if (!target) return; // e.g. logout button has no data-target
        
        if (role === 'Patient') {
            // Patient can only see: dashboardSection, appointmentsSection, medicationSection, wearablesSection, riskSection, reportsSection
            const allowedForPatient = ['dashboardSection', 'appointmentsSection', 'medicationSection', 'wearablesSection', 'riskSection', 'reportsSection'];
            if (allowedForPatient.includes(target)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        } else if (role === 'Doctor') {
            // Doctor can see everything except settingsSection
            if (target === 'settingsSection') {
                item.style.display = 'none';
            } else {
                item.style.display = '';
            }
        } else {
            // Admin can see everything
            item.style.display = '';
        }
    });

    // Gating HTML elements
    if (role === 'Patient') {
        // Hide all modify actions
        document.querySelectorAll('.hide-for-patients').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
        
        // Hide settings configuration cards
        const backendConfigForm = document.getElementById('settingsBackendForm');
        if (backendConfigForm) {
            const card = backendConfigForm.closest('.dashboard-card');
            if (card) card.style.setProperty('display', 'none', 'important');
        }

        // Lock form inputs to patient's own name in modals
        const apptPatient = document.getElementById('apptPatientName');
        const healthPatient = document.getElementById('healthPatientName');
        const medPatient = document.getElementById('medPatientName');
        
        if (apptPatient) {
            apptPatient.value = userRealName;
            apptPatient.disabled = true;
        }
        if (healthPatient) {
            healthPatient.value = userRealName;
            healthPatient.disabled = true;
        }
        if (medPatient) {
            medPatient.value = userRealName;
            medPatient.disabled = true;
        }
    } else {
        // Unlock inputs for Doctor & Admin
        document.querySelectorAll('.hide-for-patients').forEach(el => {
            el.style.display = '';
        });
        
        const apptPatient = document.getElementById('apptPatientName');
        const healthPatient = document.getElementById('healthPatientName');
        const medPatient = document.getElementById('medPatientName');
        
        if (apptPatient) apptPatient.disabled = false;
        if (healthPatient) healthPatient.disabled = false;
        if (medPatient) medPatient.disabled = false;
    }
}

// ==========================================
// HTML5 BROWSER DESKTOP NOTIFICATIONS
// ==========================================

function requestBrowserNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendBrowserNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png'
            });
        } catch (e) {
            console.error("Browser notification failed to compile:", e);
        }
    }
    // Always trigger visual dashboard toast as well
    showToast(message, 'info');
}

// Request permission on boot
if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    requestBrowserNotificationPermission();
}
