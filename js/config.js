/**
 * RK Health - System Configurations & Mock Data Store (Extended)
 */

const RK_CONFIG = {
    // Current active Google Apps Script deployment URL. Fallbacks to mock mode if blank.
    get backendUrl() {
        return localStorage.getItem('rk_backend_url') || '';
    },
    set backendUrl(url) {
        localStorage.setItem('rk_backend_url', url);
    },
    
    // Automatically determine if we are running in local mock sandbox database mode
    get isMock() {
        return !this.backendUrl;
    },

    // UI Configuration options
    doctors: [
        "Dr. Madhu S Reddy (Gen Physician)",
        "Dr. Shalini K (Cardiologist)",
        "Dr. Pranav Sharma (Dentist)",
        "Dr. Anjali Bose (Pediatrician)",
        "Dr. Rajesh Kumar (Orthopedic)"
    ],
    
    hospitals: [
        "RK Hospital - Main Branch",
        "RK Clinics - Whitefield",
        "RK Hospital - Indiranagar",
        "RK Care Center - Jayanagar"
    ]
};

// ==========================================
// MOCK DATABASE INITIALIZER (LOCAL STORAGE)
// ==========================================

const INITIAL_MOCK_USERS = [
    {
        id: "USR-001",
        username: "admin",
        email: "admin@rkhealth.com",
        passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin123
        role: "Admin",
        fullName: "Dr. Madhu S Reddy",
        timestamp: new Date().getTime()
    },
    {
        id: "USR-002",
        username: "doctor",
        email: "doctor@rkhealth.com",
        passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // password
        role: "Doctor",
        fullName: "Dr. Shalini K",
        timestamp: new Date().getTime()
    },
    {
        id: "USR-003",
        username: "sarah",
        email: "sarah@gmail.com",
        passwordHash: "921820468e2285db2c5598d9ad74e50eb1f106888ef978f828a2a89311684c17", // sarah123
        role: "Patient",
        fullName: "Sarah Jenkins",
        timestamp: new Date().getTime()
    },
    {
        id: "USR-004",
        username: "robert",
        email: "robert@gmail.com",
        passwordHash: "468971485608bdfdf3d9e03d42b91811a76c6eb0d3989c445e93df1eb270a6c6", // robert123
        role: "Patient",
        fullName: "Robert Miller",
        timestamp: new Date().getTime()
    }
];

const INITIAL_MOCK_APPOINTMENTS = [
    {
        id: "APT-1001",
        patientName: "Sarah Jenkins",
        doctorName: "Dr. Shalini K (Cardiologist)",
        title: "Cardiology Review",
        date: new Date().toISOString().split('T')[0], // Today
        time: "10:30",
        hospital: "RK Hospital - Main Branch",
        reason: "Routine ECG post-medication check",
        notes: "Patient reports slight fatigue after evening beta-blocker dose. Pulse rate stable at 72 bpm.",
        calendarLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Cardiology+Review&details=Routine+ECG+post-medication+check&dates=20260628T103000/20260628T110000",
        timestamp: new Date().getTime()
    },
    {
        id: "APT-1002",
        patientName: "Robert Miller",
        doctorName: "Dr. Rajesh Kumar (Orthopedic)",
        title: "Knee Surgery Follow-up",
        date: new Date().toISOString().split('T')[0], // Today
        time: "14:15",
        hospital: "RK Hospital - Indiranagar",
        reason: "Post-op suture evaluation",
        notes: "Incision healing nicely. Prescribe light physical therapy exercises twice a week.",
        calendarLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Knee+Followup&details=Post-op+evaluation&dates=20260628T141500/20260628T144500",
        timestamp: new Date().getTime() - 86400000
    },
    {
        id: "APT-1003",
        patientName: "Amelia Watson",
        doctorName: "Dr. Pranav Sharma (Dentist)",
        title: "Root Canal Session 2",
        date: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
        time: "09:00",
        hospital: "RK Clinics - Whitefield",
        reason: "Second phase nerve cleansing",
        notes: "No infection observed. Prepare cavity for permanent composite filling next week.",
        calendarLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Root+Canal&details=Second+phase+cleansing&dates=20260629T090000/20260629T093000",
        timestamp: new Date().getTime() - 172800000
    }
];

const INITIAL_MOCK_MEDICINES = [
    {
        id: "MED-2001",
        medicineName: "Atorvastatin (Lipitor)",
        dosage: "20mg (1 tablet)",
        frequency: "Once Daily",
        morning: false,
        afternoon: false,
        night: true,
        startDate: "2026-06-01",
        endDate: "2026-12-01",
        phoneNumber: "+15005550006",
        notes: "Take at bedtime. Avoid grapefruit juice. Patient: Sarah Jenkins",
        smsStatus: "Delivered",
        timestamp: new Date().getTime()
    },
    {
        id: "MED-2002",
        medicineName: "Amoxicillin Trihydrate",
        dosage: "500mg (1 capsule)",
        frequency: "Three Times Daily",
        morning: true,
        afternoon: true,
        night: true,
        startDate: new Date().toISOString().split('T')[0], // Today
        endDate: new Date(new Date().getTime() + 7 * 86400000).toISOString().split('T')[0], // 7 Days
        phoneNumber: "+15005550006",
        notes: "Complete entire course. Take with meals. Patient: Robert Miller",
        smsStatus: "Delivered",
        timestamp: new Date().getTime()
    },
    {
        id: "MED-2003",
        medicineName: "Metformin HCl",
        dosage: "850mg (1 tablet)",
        frequency: "Twice Daily",
        morning: true,
        afternoon: false,
        night: true,
        startDate: "2026-05-15",
        endDate: "2027-05-15",
        phoneNumber: "+15005550006",
        notes: "Take with breakfast and dinner. Patient: Sarah Jenkins",
        smsStatus: "Failed",
        timestamp: new Date().getTime() - 86400000
    }
];

const INITIAL_MOCK_HEALTH_RECORDS = [
    {
        id: "HLT-3001",
        patientName: "Sarah Jenkins",
        age: 45,
        gender: "Female",
        bloodGroup: "O+",
        height: 165,
        weight: 68,
        allergies: "Sulfonamides, Penicillin",
        doctor: "Dr. Shalini K (Cardiologist)",
        diagnosis: "Essential Hypertension & Hyperlipidemia",
        prescription: "Atorvastatin 20mg Once Daily (Bedtime)\nLisinopril 10mg Once Daily (Morning)",
        visitNotes: "Complaining of minor dry cough. Cardiac markers normal. Diet counseling provided (low sodium).",
        followUpDate: "2026-09-15",
        timestamp: new Date().getTime()
    },
    {
        id: "HLT-3002",
        patientName: "Robert Miller",
        age: 58,
        gender: "Male",
        bloodGroup: "A+",
        height: 178,
        weight: 84,
        allergies: "Aspirin (triggers asthma)",
        doctor: "Dr. Rajesh Kumar (Orthopedic)",
        diagnosis: "Osteoarthritis of right knee, Post meniscus-repair status",
        prescription: "Celecoxib 100mg Twice Daily as needed\nPhysiotherapy thrice weekly for range of motion",
        visitNotes: "Stitches removed safely. Flexion improved to 95 degrees. Advised ice compresses for mild swelling.",
        followUpDate: "2026-07-28",
        timestamp: new Date().getTime() - 86400000
    }
];

// Seed historical Wearable Logs for Analytics & Trends (Sarah Jenkins & Robert Miller)
const INITIAL_MOCK_WEARABLES = [
    // Today
    { id: "WEAR-001", patientName: "Sarah Jenkins", heartRate: 72, bloodPressure: "128/82", oxygenLevel: 98, temperature: 98.4, steps: 8420, calories: 420, sleepHours: 7.5, timestamp: new Date().getTime() },
    { id: "WEAR-002", patientName: "Robert Miller", heartRate: 85, bloodPressure: "135/88", oxygenLevel: 97, temperature: 98.6, steps: 4100, calories: 230, sleepHours: 6.2, timestamp: new Date().getTime() },
    // Yesterday
    { id: "WEAR-003", patientName: "Sarah Jenkins", heartRate: 75, bloodPressure: "130/85", oxygenLevel: 98, temperature: 98.2, steps: 9100, calories: 450, sleepHours: 8.0, timestamp: new Date().getTime() - 86400000 },
    { id: "WEAR-004", patientName: "Robert Miller", heartRate: 88, bloodPressure: "138/90", oxygenLevel: 96, temperature: 98.8, steps: 3500, calories: 195, sleepHours: 5.5, timestamp: new Date().getTime() - 86400000 },
    // Day before
    { id: "WEAR-005", patientName: "Sarah Jenkins", heartRate: 70, bloodPressure: "125/80", oxygenLevel: 99, temperature: 98.5, steps: 7200, calories: 380, sleepHours: 6.8, timestamp: new Date().getTime() - 172800000 },
    { id: "WEAR-006", patientName: "Robert Miller", heartRate: 82, bloodPressure: "132/86", oxygenLevel: 97, temperature: 98.4, steps: 5200, calories: 280, sleepHours: 7.0, timestamp: new Date().getTime() - 172800000 },
    // 3 days ago
    { id: "WEAR-007", patientName: "Sarah Jenkins", heartRate: 78, bloodPressure: "132/84", oxygenLevel: 98, temperature: 98.6, steps: 6500, calories: 340, sleepHours: 7.2, timestamp: new Date().getTime() - 259200000 },
    { id: "WEAR-008", patientName: "Robert Miller", heartRate: 90, bloodPressure: "140/92", oxygenLevel: 95, temperature: 99.1, steps: 3000, calories: 160, sleepHours: 5.0, timestamp: new Date().getTime() - 259200000 }
];

const INITIAL_MOCK_AI_SUMMARIES = [
    {
        id: "AIS-4001",
        patientName: "Sarah Jenkins",
        summaryText: JSON.stringify({
            visitSummary: "Sarah visited Dr. Shalini on June 28 for her Essential Hypertension and high cholesterol management. Her blood pressure was evaluated, and she was counselled on managing a low-sodium diet due to slight cough complaints.",
            diagnosisExpl: "Hypertension means chronically high pressure in your arteries, requiring heart medication. Hyperlipidemia means elevated fats/cholesterol in the bloodstream, which can deposit in blood vessels.",
            medInstructions: "Take Lisinopril 10mg in the morning to lower blood pressure. Take Atorvastatin 20mg at bedtime to control cholesterol levels. Complete daily routines.",
            lifestyleSuggestions: "Follow a heart-healthy dietary plan (DASH diet). Restrict daily sodium intake to under 1,500mg. Walk at a moderate pace for 30 minutes daily.",
            risks: "If you experience severe chest pain, extreme breathlessness, or facial swelling (rare lisinopril allergy), seek emergency support immediately.",
            followUp: "Return in three months (September 15, 2026) for repeat blood lipid panel and BP assessment."
        }),
        timestamp: new Date().getTime()
    }
];

const INITIAL_MOCK_RISK_PREDICTIONS = [
    {
        id: "RISK-001",
        patientName: "Sarah Jenkins",
        riskScore: 35,
        riskLevel: "Medium",
        explanation: "Risk score is elevated primarily due to moderate hypertension diagnosis combined with irregular adherence to Metformin, though cholesterol and ECG vitals remain stable.",
        actions: "Maintain Low Sodium Diet (under 1500mg/day). Monitor blood pressure daily at breakfast. Walk 30 minutes daily. Standard compliance checks on Lisinopril.",
        timestamp: new Date().getTime()
    },
    {
        id: "RISK-002",
        patientName: "Robert Miller",
        riskScore: 20,
        riskLevel: "Low",
        explanation: "Vitals show excellent post-op recovery. Knee mobility exercises are showing success and oxygen levels are stable. No cardiorespiratory complications noted.",
        actions: "Continue physiotherapy twice weekly. Monitor knee swelling. Maintain active hydration.",
        timestamp: new Date().getTime()
    }
];

const INITIAL_MOCK_RECOMMENDATIONS = [
    {
        id: "REC-001",
        patientName: "Sarah Jenkins",
        recommendationsText: "• Ensure to take Lisinopril strictly in the morning.\n• Restrict sodium intake to reduce blood pressure fluctuations.\n• Increase daily sleep to 7.5+ hours to lower cardiovascular stress.",
        timestamp: new Date().getTime()
    },
    {
        id: "REC-002",
        patientName: "Robert Miller",
        recommendationsText: "• Continue light range-of-motion physiotherapy.\n• Maintain low-impact leg workouts.\n• Consume anti-inflammatory nutrients (Omega-3 rich foods).",
        timestamp: new Date().getTime()
    }
];

// Setup storage if empty
const setupStorage = (key, initialValue) => {
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(initialValue));
    }
};

// Initialize Mock Databases
setupStorage('rk_mock_users', INITIAL_MOCK_USERS);
setupStorage('rk_mock_appointments', INITIAL_MOCK_APPOINTMENTS);
setupStorage('rk_mock_medicines', INITIAL_MOCK_MEDICINES);
setupStorage('rk_mock_health_records', INITIAL_MOCK_HEALTH_RECORDS);
setupStorage('rk_mock_wearables', INITIAL_MOCK_WEARABLES);
setupStorage('rk_mock_ai_summaries', INITIAL_MOCK_AI_SUMMARIES);
setupStorage('rk_mock_risk_predictions', INITIAL_MOCK_RISK_PREDICTIONS);
setupStorage('rk_mock_recommendations', INITIAL_MOCK_RECOMMENDATIONS);

setupStorage('rk_mock_activities', [
    { type: 'appointment', text: 'Appointment APT-1001 created for Sarah Jenkins', time: '10 mins ago', status: 'success' },
    { type: 'medicine', text: 'Medicine reminder MED-2002 scheduled for Robert Miller', time: '1 hour ago', status: 'success' },
    { type: 'summary', text: 'AI clinical summary generated for Sarah Jenkins', time: '2 hours ago', status: 'success' },
    { type: 'wearable', text: 'Wearable heart rate warning: 125 bpm detected for Sarah Jenkins', time: '3 hours ago', status: 'danger' }
]);
