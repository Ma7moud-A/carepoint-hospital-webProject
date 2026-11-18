# CarePoint Hospital

CarePoint Hospital is an English-language hospital management web application
for the SWER353 Web Technologies course at Bethlehem University.

**Team:** Mahmoud Abu Amria and Lour Qumsiyeh

**Instructor:** Dr. Mohammad Ghattas

## Project status

The public homepage includes a fictional doctors directory with name and
specialty filters. The Staff Login frontend preview checks sample input in the
browser. The staff dashboard previews three roles with a fictional appointment
schedule. The Departments preview supports search and temporary administrator
edits. Doctors is the next frontend page. PHP authentication, database
integration, and deployment are planned.

## Main features

- A public Our Doctors page that will display the hospital's doctors.
- Staff login and role-specific dashboards for administrators, receptionists,
  and doctors.
- Management screens for departments, doctors, patients, appointments, and
  medical records.
- User account management for administrators.
- Search, filtering, form validation, and clear feedback for staff actions.
- A public read-only doctors API and a separate external weather integration.

## Staff roles

| Role | Responsibilities |
| --- | --- |
| Administrator | Manage hospital data and user accounts, subject to database constraints. |
| Receptionist | View departments and doctors, register and update patients, and manage appointments. |
| Doctor | View assigned appointments and relevant patients, and create or edit authorized medical records. |

PHP will enforce these permissions on the server.

## Technologies

- HTML5 and CSS3 for the interface
- Native JavaScript, Fetch API, and JSON for asynchronous interactions
- PHP sessions and procedural MySQLi with prepared statements
- MySQL using the supplied `HospitalDB` schema
- InfinityFree for the final hosted application and database

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/` | Public pages, staff screens, styles, and browser assets |
| `backend/` | PHP authentication, database access, API endpoints, and SQL setup |
| `README.md` | Project overview and setup instructions |

## Preview the frontend

1. Open the project folder in VS Code or your preferred editor.
2. Open `frontend/index.html` in a browser or launch it with VS Code Live Server.
3. Select **Our Doctors** to jump to the directory or **Staff Login** to try the
   sign-in form with fictional values.
4. Open `frontend/dashboard.html` directly or launch it with Live Server. Use
   **Preview role** to switch between Administrator, Receptionist, and Doctor.
   Use **Status** to filter that role's sample appointment schedule.
5. Choose **Departments** from the dashboard in the Administrator or
   Receptionist preview. Search the sample departments or switch to
   Administrator to practice adding, editing, and deleting. Reload to restore
   the sample records.

The preview can run locally without PHP or MySQL.

## Full application setup and deployment

During backend development, we will add instructions for configuring PHP,
importing HospitalDB into a dedicated development database, and creating demo
accounts. The supplied SQL script drops and recreates `HospitalDB`, so check
which database you are using before importing it.

The final release will include the InfinityFree HTTPS URL, hosted database
setup, and API documentation. Database credentials belong in server-side
configuration. All demonstration records use fictional data.
