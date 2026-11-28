# CarePoint Hospital

CarePoint Hospital is an English-language hospital management web application
for the SWER353 Web Technologies course at Bethlehem University.

**Team:** Mahmoud Abu Amria and Lour Qumsiyeh

**Instructor:** Dr. Mohammad Ghattas

## Project status

The local application uses MySQL for staff authentication, the dashboard,
Departments, Doctors, Patients, Appointments, Medical Records, User Management,
and the public doctors directory. The dashboard gets Bethlehem weather from
Open-Meteo. Predeployment acceptance testing and InfinityFree deployment are
pending.

Implementation smoke checks passed locally for the public doctors endpoint,
the page and API permissions of all three staff roles, database searches, and
department create/update/delete and foreign-key protection. Browser acceptance
and verification against the hosting database are pending.

## Main features

- The homepage header uses a CP monogram. The welcome text explains how
  visitors can browse the doctors directory, and the panels describe staff work.
- A public welcome page with illustrated Reception, Doctor, and Medical Records
  panels that connect on page load. A teal halo follows the mouse across the
  navy hero outside the illustration frame. An ECG arrow circles the frame
  and stays at the front of the signal as the layout resizes. The signal traces a heart
  built into the border.
  Reduced motion shows a static design.
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

PHP enforces these permissions on the server.

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

## Run the complete application

Start MySQL and the PHP server as shown below. Open
`http://127.0.0.1:8080/frontend/index.html` for the public doctors directory or
`http://127.0.0.1:8080/frontend/login.html` for the staff area. Staff links open
the protected PHP pages. The older HTML staff pages are interface previews
that keep sample edits in browser storage.

### Predeployment acceptance checklist

| Page | Check using fictional data |
| --- | --- |
| Staff login | Check the full-width password field and toggle visibility with the eye icon using mouse and keyboard. Sign in as each role, then check failed login, sign-out, and direct access to protected URLs while signed out. |
| Departments | As Administrator, add, search, edit, and delete an unused department. Check that a linked department cannot be deleted and Receptionist cannot edit. |
| Doctors | Create or edit a doctor, filter by specialty or department, and check that the public directory reflects the saved data. |
| Patients | As Receptionist, register and edit a patient. Search by name and ID. As Doctor, verify only patients with assigned visits are listed. |
| Appointments | Schedule a fictional visit, change its status, and filter by patient/doctor name, date, or status. Check that Doctor sees only assigned visits. |
| Medical Records | As the assigned Doctor, add one record to the visit, edit it, and search by patient or appointment. Verify attempts to use another doctor's visit are rejected. Check that a visit with a record cannot be deleted or reassigned. |
| Users | As Administrator, create a fictional account, reset its password, deactivate it, and verify the old session and password no longer work. Check that other roles cannot access User Management. |
| Dashboard | Choose a date that has visits and verify the schedule, totals, status filter, role-specific links, and Bethlehem weather. Check loading/error feedback if the weather provider is unavailable. |
| Public directory | Verify live doctor cards, name and specialty filtering, and Retry during an API failure. Verify the public JSON includes only directory fields. |
| Browser and hosting | Check keyboard navigation, mobile layout, input feedback, and persistence after reload before publishing. Repeat the workflow against the HTTPS site after deployment. |

## Full application setup and deployment

### Local database and login

Requirements: PHP 8.0+ with MySQLi and mysqlnd, MySQL/MariaDB, and a PHP web server
(XAMPP is available on the development machine).

1. Start MySQL. Create a dedicated database, such as `carepoint_dev`, using
   phpMyAdmin. Import `backend/sql/hospital-hosted.sql` into that database.
   This copy preserves the supplied tables and sample data but omits database
   creation/deletion statements. Import only into an empty database.
2. Apply `backend/sql/001-doctor-accounts.sql` once.
3. Copy `backend/config/database.example.php` to
   `backend/config/database.local.php`. Enter your database settings in this
   ignored server-side file. Never commit it.
4. Create an ignored `backend/config/accounts.local.php` that returns a PHP
   array mapping `admin`, `receptionist`, and `doctor1` to separately chosen
   fictional demo passwords (12–72 bytes each). Do not publish this file.
5. Run `C:\xampp\php\php.exe backend/tools/set-demo-passwords.php backend/config/accounts.local.php`
   from the project root. This replaces the supplied placeholder hashes using
   `password_hash()`; the command never prints passwords. On macOS or a PHP
   installation on PATH, use `php` instead of the Windows executable path.
6. From the project root, run `C:\xampp\php\php.exe -S 127.0.0.1:8080 -t . router.php`.
   Open `http://127.0.0.1:8080/frontend/login.html`. The development server is
   for local use only. The router serves the frontend and API and blocks
   requests to project files such as database configuration and SQL scripts.

On this development machine, `carepoint_dev` has already been created, imported,
and migrated. Private local configuration and generated demo passwords are in
the ignored files above. MySQL and the local PHP server were started for testing.
Use the existing setup rather than importing it again. XAMPP's local root account
is used only for local development; use the hosting panel's assigned account live.

Live Server does not execute PHP. Use the PHP URL for authentication; frontend
and backend must share the same origin. No permissive CORS configuration is needed.
Opening the login HTML directly shows a link to the local PHP URL. The fields
remain editable when the server is unreachable, and sign-in becomes available
once the page has connected.

### Documented schema change

`001-doctor-accounts.sql` adds nullable, unique `Users.DoctorID`, referencing
`Doctor.DoctorID` with `ON UPDATE CASCADE ON DELETE RESTRICT`. Other roles can
leave it NULL. Doctor logins require a valid mapping; the supplied `doctor1`
account is linked to Doctor 1. This follows the assignment's recommended
extension. Existing keys, constraints, and tables are preserved.

### Authentication API

All paths below begin with `backend/api/auth/`. Responses are JSON with
`Cache-Control: no-store`. Password hashes never appear in responses.

| Endpoint | Method | Access and result |
| --- | --- | --- |
| `session.php` | GET | Starts/reads a session; returns `user` (null when signed out) and `csrfToken`. |
| `login.php` | POST | JSON `username` and `password`; requires the session's `X-CSRF-Token` header. Returns user and a rotated token. |
| `logout.php` | POST | Requires `X-CSRF-Token`; destroys the session and expires the cookie. |

Example session response before login:

```json
{"user":null,"csrfToken":"session-specific-random-token"}
```

Successful user objects contain `id`, `username`, `fullName`, `role`, and
`doctorId`. Errors return a `message`: 400 malformed JSON, 401 rejected login or
revoked session, 403 invalid CSRF or forbidden role, 405 unsupported method,
413 oversized body, 415 unsupported content type, 422 invalid fields, and
503 unavailable service. Cookies are HttpOnly and SameSite=Lax, and Secure
on HTTPS. Each authenticated request rechecks account activation and doctor
mapping. Future private endpoints must call `require_user()` with allowed roles
and enforce record ownership; write endpoints must also call `require_csrf()`.

Successful login opens `frontend/dashboard.php`. Protected pages check the
current role and account state before loading database data. Resetting an
account password invalidates sessions opened with the old password.

### Staff and public API

| Route | Method | Response and access |
| --- | --- | --- |
| `backend/api/staff.php?module=departments` | GET | `{"data":{"departments":[{"id":1,"name":"Cardiology","doctorCount":2}]}}` plus applicable reference lists. |
| `backend/api/staff.php?module=doctors&search=Ahmad` | GET | `{"ids":[1]}`. The server applies search and filters to accessible rows in MySQL. |
| `backend/api/staff.php?module=departments` | POST | Example body `{"action":"create","data":{"name":"Sample Unit","location":"Building A","phone":""}}`. Returns `{"id":7}` with 201 for create or 200 for other changes. Send the session's `X-CSRF-Token`. |
| `backend/api/public/doctors.php` | GET | Public list of doctor name, specialty, department, and location. Response example `{"doctors":[{"id":1,"firstName":"Ahmad","lastName":"Khalil","specialty":"Cardiology","department":"Cardiology","location":"Building A"}]}`. |

Allowed module names are `departments`, `doctors`, `patients`, `appointments`,
`medical-records`, and `users`. Staff searches support the relevant filters
from each page. Supported actions are `create`, `update`, and `delete`, subject
to role and foreign-key restrictions. The Users module uses `active` and
`password` actions for account status and reset. Include the numeric `id` for
operations on existing records. Specify `data.active` as a JSON boolean and
`data.password` as a string. Administrators cannot deactivate or remove their
own administrator role. The server returns 409 when database relationships or
unique values prevent a write.

### Hosted setup (pending deployment)

Create the database through the InfinityFree panel. Import
`backend/sql/hospital-hosted.sql` into its assigned database, then apply the
doctor-account migration once. Configure `database.local.php` with the panel's
database hostname, name, username, and password (do not assume localhost).
Generate demo password hashes locally with PHP and set those hashes through
the database panel; do not upload the private accounts file or CLI tools.
Upload the required frontend, PHP API, includes, and private server-side config;
keep SQL files and setup tools outside the public website. Use HTTPS and verify
login/logout for all roles on the hosted site. Repeat the acceptance checklist on the hosted site and record its public URL.
Share demo passwords privately and never include hosting secrets in Git.
