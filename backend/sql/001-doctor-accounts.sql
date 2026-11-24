-- Apply once after importing the supplied HospitalDB schema.
-- Nullable: administrators and receptionists do not represent a doctor.
ALTER TABLE Users
    ADD COLUMN DoctorID INT NULL UNIQUE,
    ADD CONSTRAINT fk_users_doctor FOREIGN KEY (DoctorID)
        REFERENCES Doctor(DoctorID) ON UPDATE CASCADE ON DELETE RESTRICT;

UPDATE Users SET DoctorID = 1 WHERE Username = 'doctor1' AND Role = 'Doctor';
