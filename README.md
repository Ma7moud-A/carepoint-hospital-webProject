# CarePoint Hospital

CarePoint Hospital is an English-language hospital management web application
for the SWER353 Web Technologies course at Bethlehem University.

**Team:** Mahmoud Abu Amria and Lour Qumsiyeh

**Instructor:** Dr. Mohammad Ghattas

## Project status

The frontend previews are complete. They cover the public doctors directory,
Staff Login, the role-specific dashboard, Departments, Doctors, Patients,
Appointments, Medical Records, and User Management. PHP sessions, server-side
role checks, database integration, live API calls, and deployment are next.

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
5. Use the staff menu to open each module. Staff pages share fictional edits
   within a browser tab using session storage. From the dashboard, use **Reset
   sample data** to restore the original records. Staff Login and the public
   directory are independent of the sample staff data.

### Frontend checklist

| Preview | Try this |
| --- | --- |
| Departments and Doctors | Add a department, assign a new doctor to it, and check the assigned-doctor count. Search by name or ID and filter doctors by specialty and department. |
| Patients | Register a fictional patient as Receptionist, then search for the profile. Check that Doctor only sees patients from assigned visits. |
| Appointments | Schedule a visit for the new patient, change its status, and try the date, doctor, and status filters. |
| Medical Records | Create a record for that visit. Open the record again, edit it, and search by appointment ID. Check that a visit already linked to a record cannot be deleted. |
| User Management | As Administrator, add a fictional account, assign a role, change its active state, and try the password reset confirmation. The preview uses no passwords. |
| API states | Use the dashboard weather widget's state selector. Open `frontend/index.html?directory-preview=loading#our-doctors` or `frontend/index.html?directory-preview=error#our-doctors` to see public directory states and return to the sample list. |

The preview can run locally without PHP or MySQL.

## Full application setup and deployment

During backend development, we will add instructions for configuring PHP,
importing HospitalDB into a dedicated development database, and creating demo
accounts. The supplied SQL script drops and recreates `HospitalDB`, so check
which database you are using before importing it.

The final release will include the InfinityFree HTTPS URL, hosted database
setup, and API documentation. Database credentials belong in server-side
configuration. All demonstration records use fictional data.
