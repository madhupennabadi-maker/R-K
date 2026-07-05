# RK Health – AI Smart Patient Appointment & Medication Reminder System

RK Health is a production-ready, cloud-based healthcare management platform. It allows medical practitioners and patients to manage doctor appointments, medication schedules with SMS warnings, electronic health records (EHR), and compile AI-generated visit summaries from a single beautiful dashboard.

---

## 🌟 Key Features

1. **Dashboard & Metrics**: Visualizes patient visit numbers and medication compliance metrics using dual-axis Chart.js graphs.
2. **Secure Login**: Session-guarded login with client validation, remember me settings, recovery screens, and UI lock pin screen.
3. **Appointment Scheduling**: Form validation, full CRUD sheets integration, and auto-generated Google Calendar event links.
4. **Medication & SMS Alerts**: Dosage timers (Morning/Afternoon/Night), medication period tracking, and Twilio SMS notification status log.
5. **Electronic Health Records (EHR)**: Full patient vital files (Age, Blood Group, Allergies, Diagnosis, Prescriptions, Follow-ups).
6. **AI Smart Clinical Summary**: Compiles the patient's records and invokes Groq's **llama-3.3-70b-versatile** model to translate clinical descriptions into patient-friendly summaries, risks, lifestyle changes, and follow-ups.
7. **Report Compiler**: Compiles demographic profiles, visit logs, prescription alerts, and compliance statistics into an A4 print-optimized letterhead sheet supporting Printing, PDF Exports, and JSON downloads.
8. **Hybrid Storage Sync**: Seamlessly falls back to local browser storage (`localStorage` mock database) if a backend URL is empty, allowing immediate local execution and testing.

---

## 📂 Project Structure

```text
RK Health/
│
├── index.html            # Main entry point (Redirects to dashboard or login)
├── login.html            # Secure login UI (validations, modals, lock-screen)
├── dashboard.html        # Core application wrapper (Single-page view switcher)
│
├── css/
│   ├── style.css         # Main stylesheet (vars, layouts, table grids, buttons, glassmorphism)
│   └── responsive.css    # Responsive styles (mobiles overlay sidebar, tablet reflows, printing style)
│
├── js/
│   ├── config.js         # Configuration keys and localStorage mock databases
│   ├── app.js            # Base system initialization (routing, notifications, API fetch wrapper)
│   ├── dashboard.js      # Dashboard charts and timeline logger
│   ├── appointments.js   # Appointment CRUD form handling & table logs
│   ├── medicine.js       # Medication alerts & phone SMS bindings
│   ├── health.js         # Vital charts & diagnosis records management
│   ├── summary.js        # AI data parsing & summary visual renderers
│   └── reports.js        # Report compilation, PDF layout styles, and downloads
│
└── backend/
    └── Code.gs           # Google Apps Script API (CORS headers, Sheets CRUD, Groq & Twilio HTTP posts)
```

---

## 🚀 Cloud Setup & Deployment Guide

Follow these steps to connect your frontend to a live Google Sheets database with Groq and Twilio active integrations:

### Phase 1: Google Spreadsheet & Apps Script Setup
1. Create a new Google Spreadsheet on your Google Drive.
2. Click on **Extensions** -> **Apps Script**.
3. Clear any existing code in the editor, and paste the code from [backend/Code.gs](file:///d:/R%20K%20hospital/backend/Code.gs).
4. Save the project (e.g., rename to `RK-Health-Backend`).

### Phase 2: Environment Variables / Credentials
To safely store your secret API keys, we store them in the Google Apps Script **Script Properties**:
1. Inside the Apps Script editor, click on the **Project Settings** gear icon in the left sidebar.
2. Scroll down to the **Script Properties** section.
3. Add the following property names and your corresponding keys:
   - `GROQ_API_KEY`: Your Groq API key (to run llama-3.3-70b-versatile).
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID (for SMS).
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token.
   - `TWILIO_NUMBER`: Your Twilio purchasing phone number (e.g., `+15005550006`).
4. Click **Save script properties**.

### Phase 3: Deploy as Web App
1. Inside the Apps Script editor, click **Deploy** -> **New deployment**.
2. Select **Web app** as the deployment type.
3. Configure the settings:
   - **Description**: `RK Health Web App API`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Copy the **Web App URL** generated (it will look like `https://script.google.com/macros/s/.../exec`).

### Phase 4: Configure Frontend
You can link the frontend to the deployed Apps Script URL in one of two ways:
- **Method A (Settings Panel - Recommended)**:
  1. Open `login.html` and log in with `admin` / `admin123`.
  2. Navigate to **Settings** in the sidebar.
  3. Paste the Web App URL into the **Google Apps Script Web App URL** input.
  4. Click **Save Configuration**. The portal will reload and connect live!
- **Method B (Codebase Default)**:
  1. Open `js/config.js` in your editor.
  2. Locate `backendUrl` or update the localStorage item defaults.
  3. Change the empty return value or set your default URL inside `config.js` directly.

---

## 🛠️ Verification & Testing

### 1. Verification of Local Mock Mode
- Launch the application by opening `login.html` directly in any web browser.
- Login with the credentials:
  - **Username**: `admin`
  - **Password**: `admin123`
- The dashboard will load with pre-populated medical data.
- Try creating an appointment, adding a medication alert, creating health logs, and generating an AI clinical summary. Everything operates immediately in the local browser database!

### 2. Verification of Live API Mode
- Configure the Web App URL in the Settings tab.
- Submit a new appointment: check that a new row is appended to the `Appointments` sheet inside your Google Spreadsheet, and click the Calendar link to verify Google Calendar bindings.
- Submit a medication alert: check the `Medicines` sheet and check Twilio logs to verify the SMS reminder delivery status.
- Generate an AI Summary: verify that a prompt is securely sent to Groq and that the returned response is logged in the `AISummaries` sheet.
- Generate a Report: print or save as PDF, then inspect the formatted document.
