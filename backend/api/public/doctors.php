<?php
define('CAREPOINT_PUBLIC_API', true);
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/hospital.php';

require_method('GET');
$doctors = hospital_rows('SELECT d.DoctorID AS id, d.FirstName AS firstName, d.LastName AS lastName,
    d.Specialization AS specialty, p.DepartmentName AS department, p.Location AS location
    FROM Doctor d JOIN Department p ON p.DepartmentID = d.DepartmentID
    ORDER BY d.LastName, d.FirstName, d.DoctorID');
respond(200, ['doctors' => $doctors]);
