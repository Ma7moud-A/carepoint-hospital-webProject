<?php
// The table and column names below are application constants. Request values are bound.
function hospital_modules(): array
{
    return [
        'departments' => ['Department', 'DepartmentID', 'departments', ['name'=>'DepartmentName','location'=>'Location','phone'=>'Phone'], ['name']],
        'doctors' => ['Doctor', 'DoctorID', 'doctors', ['firstName'=>'FirstName','lastName'=>'LastName','specialty'=>'Specialization','departmentId'=>'DepartmentID','phone'=>'Phone','email'=>'Email'], ['firstName','lastName','specialty','departmentId']],
        'patients' => ['Patient', 'PatientID', 'patients', ['firstName'=>'FirstName','lastName'=>'LastName','birthDate'=>'DateOfBirth','gender'=>'Gender','bloodType'=>'BloodType','phone'=>'Phone','email'=>'Email','address'=>'Address'], ['firstName','lastName','birthDate','gender']],
        'appointments' => ['Appointment', 'AppointmentID', 'appointments', ['patientId'=>'PatientID','doctorId'=>'DoctorID','dateTime'=>'AppointmentDate','status'=>'Status','reason'=>'Reason'], ['patientId','doctorId','dateTime','status']],
        'medical-records' => ['MedicalRecord', 'RecordID', 'records', ['appointmentId'=>'AppointmentID','date'=>'RecordDate','symptoms'=>'Symptoms','diagnosis'=>'Diagnosis','treatment'=>'Treatment','notes'=>'Notes'], ['appointmentId','date']],
        'users' => ['Users', 'UserID', 'users', ['username'=>'Username','fullName'=>'FullName','role'=>'Role','doctorId'=>'DoctorID','active'=>'IsActive'], ['username','fullName','role']],
    ];
}

function module_roles(string $module): array
{
    return match ($module) {
        'departments', 'doctors' => ['Administrator', 'Receptionist'],
        'medical-records' => ['Administrator', 'Doctor'],
        'users' => ['Administrator'],
        default => ['Administrator', 'Receptionist', 'Doctor'],
    };
}

function hospital_query(string $sql, array $values = []): mysqli_stmt
{
    $stmt = mysqli_prepare(database(), $sql);
    if ($values) {
        $types = implode('', array_map(fn($value) => is_int($value) ? 'i' : 's', $values));
        mysqli_stmt_bind_param($stmt, $types, ...$values);
    }
    mysqli_stmt_execute($stmt);
    return $stmt;
}

function hospital_rows(string $sql, array $values = []): array
{
    $stmt = hospital_query($sql, $values);
    $rows = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);
    return $rows;
}

function module_rows(string $module, array $user, array $filters = []): array
{
    [$table, $id, , $fields] = hospital_modules()[$module];
    $columns = ["t.$id AS id"];
    foreach ($fields as $key => $column) {
        $columns[] = $key === 'dateTime'
            ? "DATE_FORMAT(t.$column, '%Y-%m-%dT%H:%i:%s') AS `dateTime`"
            : "t.$column AS `$key`";
    }
    if ($module === 'departments') {
        $columns[] = '(SELECT COUNT(*) FROM Doctor d WHERE d.DepartmentID = t.DepartmentID) AS doctorCount';
    }
    if ($module === 'appointments') {
        $columns[] = 'EXISTS(SELECT 1 FROM MedicalRecord r WHERE r.AppointmentID = t.AppointmentID) AS hasRecord';
    }

    $conditions = [];
    $values = [];
    if ($user['Role'] === 'Doctor') {
        $conditions[] = match ($module) {
            'patients' => 'EXISTS(SELECT 1 FROM Appointment a WHERE a.PatientID = t.PatientID AND a.DoctorID = ?)',
            'appointments', 'medical-records', 'doctors' => 't.DoctorID = ?',
            default => '1 = 0',
        };
        if ($conditions[0] !== '1 = 0') $values[] = (int) $user['DoctorID'];
    }
    if ($module === 'medical-records') {
        $conditions[] = 'EXISTS(SELECT 1 FROM Appointment a WHERE a.AppointmentID = t.AppointmentID
            AND a.PatientID = t.PatientID AND a.DoctorID = t.DoctorID)';
    }

    $search = trim((string) ($filters['search'] ?? ''));
    if ($search !== '') {
        if (preg_match('/^#?\d+$/D', $search)) {
            $numeric = (int) ltrim($search, '#');
            $conditions[] = match ($module) {
                'medical-records' => '(t.RecordID = ? OR t.AppointmentID = ? OR t.PatientID = ?)',
                'appointments' => '(t.AppointmentID = ? OR t.PatientID = ? OR t.DoctorID = ?)',
                default => "t.$id = ?",
            };
            $values[] = $numeric;
            if (in_array($module, ['medical-records','appointments'], true)) array_push($values, $numeric, $numeric);
        } else {
            $expression = match ($module) {
                'departments' => "CONCAT_WS(' ', t.DepartmentName, t.Location, t.Phone)",
                'doctors', 'patients' => "CONCAT_WS(' ', t.FirstName, t.LastName)",
                'appointments' => "(SELECT CONCAT_WS(' ', p.FirstName, p.LastName, d.FirstName, d.LastName)
                    FROM Patient p JOIN Doctor d ON d.DoctorID = t.DoctorID WHERE p.PatientID = t.PatientID)",
                'medical-records' => "(SELECT CONCAT_WS(' ', p.FirstName, p.LastName) FROM Patient p WHERE p.PatientID = t.PatientID)",
                'users' => "CONCAT_WS(' ', t.Username, t.FullName)",
            };
            $conditions[] = "LOCATE(LOWER(?), LOWER($expression)) > 0";
            $values[] = $search;
        }
    }
    foreach (['specialty','departmentId','doctorId','status','role','dateTime'] as $key) {
        if (!isset($fields[$key]) || ($filters[$key] ?? '') === '') continue;
        $column = 't.' . $fields[$key];
        $conditions[] = ($key === 'dateTime' ? "DATE($column)" : $column) . ' = ?';
        $values[] = $filters[$key];
    }
    $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';
    $rows = hospital_rows('SELECT ' . implode(', ', $columns) . " FROM $table t$where ORDER BY t.$id", $values);
    foreach ($rows as &$row) {
        foreach (['id','departmentId','patientId','doctorId','appointmentId','doctorCount'] as $key) {
            if (isset($row[$key])) $row[$key] = (int) $row[$key];
        }
        foreach (['active','hasRecord'] as $key) {
            if (isset($row[$key])) $row[$key] = (bool) $row[$key];
        }
    }
    return $rows;
}

function module_data(string $module, array $user): array
{
    $related = match ($module) {
        'doctors' => ['departments'],
        'appointments', 'medical-records', 'dashboard' => ['appointments', 'patients', 'doctors'],
        'users' => ['doctors'],
        default => [],
    };
    $data = [];
    foreach (array_unique(array_merge($module === 'dashboard' ? [] : [$module], $related)) as $name) {
        $rows = module_rows($name, $user);
        if ($name !== $module && in_array($name, ['patients','doctors'], true)) {
            $keys = array_flip(['id','firstName','lastName']);
            $rows = array_map(fn($row) => array_intersect_key($row, $keys), $rows);
        }
        if ($module === 'dashboard' && $name === 'appointments') {
            $keys = array_flip(['id','patientId','doctorId','dateTime','status']);
            $rows = array_map(fn($row) => array_intersect_key($row, $keys), $rows);
        }
        $data[hospital_modules()[$name][2]] = $rows;
    }
    if ($module === 'dashboard' && $user['Role'] === 'Administrator') {
        foreach (['Department'=>'departments','Doctor'=>'doctors','Patient'=>'patients'] as $table => $key) {
            $data['totals'][$key] = (int) hospital_rows("SELECT COUNT(*) AS total FROM $table")[0]['total'];
        }
    }
    return $data;
}

function invalid_field(string $field): void
{
    respond(422, ['message' => "Enter a valid value for $field."]);
}

function record_id($value): int
{
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>2147483647]]);
    if ($id === false || (!is_string($value) && !is_int($value))) invalid_field('record ID');
    return $id;
}

function field_value(string $key, $value, bool $required)
{
    if (str_ends_with($key, 'Id') && $value !== null && $value !== '') return record_id($value);
    if ($value === null || $value === '') {
        if ($required) invalid_field($key);
        return null;
    }
    if (!is_string($value) || trim($value) === '' || str_contains($value, "\0")) invalid_field($key);
    $value = trim($value);
    $limits = ['name'=>100,'location'=>100,'phone'=>25,'firstName'=>50,'lastName'=>50,'specialty'=>100,
        'email'=>120,'address'=>255,'reason'=>255,'username'=>50,'fullName'=>120,
        'symptoms'=>12000,'diagnosis'=>12000,'treatment'=>12000,'notes'=>12000];
    if (preg_match_all('/./us', $value) > ($limits[$key] ?? 120)) invalid_field($key);
    $choices = ['role'=>['Administrator','Receptionist','Doctor'], 'gender'=>['Female','Male','Other'],
        'status'=>['Scheduled','Completed','Cancelled'], 'bloodType'=>['A+','A-','B+','B-','AB+','AB-','O+','O-']];
    if (isset($choices[$key]) && !in_array($value, $choices[$key], true)) invalid_field($key);
    if ($key === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) invalid_field($key);
    if (in_array($key, ['date','birthDate','dateTime'], true)) {
        $format = $key === 'dateTime' ? (strlen($value) === 19 ? 'Y-m-d\TH:i:s' : 'Y-m-d\TH:i') : 'Y-m-d';
        $date = DateTimeImmutable::createFromFormat('!' . $format, $value, new DateTimeZone('Asia/Hebron'));
        if (!$date || $date->format($format) !== $value || (int) $date->format('Y') < 1000 ||
            ($key === 'birthDate' && $date > new DateTimeImmutable('today', new DateTimeZone('Asia/Hebron')))) invalid_field($key);
        if ($key === 'dateTime') return $date->format('Y-m-d H:i:s');
    }
    return $value;
}

function account_password($password): string
{
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
        respond(422, ['message' => 'Use a password of 12 to 72 bytes.']);
    }
    return password_hash($password, PASSWORD_DEFAULT);
}

function change_module(string $module, array $user, array $body): array
{
    [$table, $pk, , $mapping, $required] = hospital_modules()[$module];
    $action = $body['action'] ?? '';
    $role = $user['Role'];
    $writers = match ($module) {
        'patients', 'appointments' => ['Administrator', 'Receptionist'],
        'medical-records' => ['Administrator', 'Doctor'],
        default => ['Administrator'],
    };
    if (!in_array($role, $writers, true) || ($action === 'delete' && ($role !== 'Administrator' || $module === 'users'))) {
        respond(403, ['message' => 'You do not have permission for this action.']);
    }
    if (!in_array($action, ['create','update','delete'], true) &&
        !($module === 'users' && in_array($action, ['active','password'], true))) invalid_field('action');
    $id = $action === 'create' ? null : record_id($body['id'] ?? null);
    $data = $body['data'] ?? [];
    if (!is_array($data)) invalid_field('request data');

    $db = database();
    mysqli_begin_transaction($db);
    try {
        $original = $id === null ? null : (hospital_rows("SELECT * FROM $table WHERE $pk = ? FOR UPDATE", [$id])[0] ?? null);
        if ($id !== null && (!$original || ($role === 'Doctor' && (int) $original['DoctorID'] !== (int) $user['DoctorID']))) {
            respond(404, ['message' => 'Record not found.']);
        }
        if ($action === 'delete') {
            hospital_query("DELETE FROM $table WHERE $pk = ?", [$id]);
        } elseif ($action === 'active') {
            if (!is_bool($data['active'] ?? null) || ($id === (int) $user['UserID'] && !$data['active'])) {
                respond(422, ['message' => 'You cannot deactivate the account you are using.']);
            }
            hospital_query('UPDATE Users SET IsActive = ? WHERE UserID = ?', [(int) $data['active'], $id]);
        } elseif ($action === 'password') {
            hospital_query('UPDATE Users SET PasswordHash = ? WHERE UserID = ?', [account_password($data['password'] ?? null), $id]);
        } else {
            unset($mapping['active']);
            $fields = [];
            foreach ($mapping as $key => $column) {
                $fields[$column] = field_value($key, $data[$key] ?? null, in_array($key, $required, true));
            }
            if ($module === 'appointments' && $original &&
                ((int) $original['PatientID'] !== $fields['PatientID'] || (int) $original['DoctorID'] !== $fields['DoctorID']) &&
                hospital_rows('SELECT RecordID FROM MedicalRecord WHERE AppointmentID = ?', [$id])) {
                respond(409, ['message' => 'A visit with a medical record cannot be reassigned.']);
            }
            if ($module === 'medical-records') {
                if ($original && (int) $original['AppointmentID'] !== $fields['AppointmentID']) {
                    respond(409, ['message' => 'The linked appointment cannot be changed.']);
                }
                $visit = hospital_rows('SELECT PatientID, DoctorID FROM Appointment WHERE AppointmentID = ? FOR UPDATE', [$fields['AppointmentID']])[0] ?? null;
                if (!$visit || ($role === 'Doctor' && (int) $visit['DoctorID'] !== (int) $user['DoctorID'])) {
                    respond(404, ['message' => 'Appointment not found.']);
                }
                $fields['PatientID'] = (int) $visit['PatientID'];
                $fields['DoctorID'] = (int) $visit['DoctorID'];
            }
            if ($module === 'users') {
                if ($id === (int) $user['UserID'] && $fields['Role'] !== 'Administrator') {
                    respond(422, ['message' => 'You cannot change the role of the account you are using.']);
                }
                if ($fields['Role'] === 'Doctor' && $fields['DoctorID'] === null) invalid_field('linked doctor');
                if ($fields['Role'] !== 'Doctor') $fields['DoctorID'] = null;
                if ($action === 'create') $fields['PasswordHash'] = account_password($data['password'] ?? null);
            }
            if ($action === 'create') {
                $columns = implode(', ', array_keys($fields));
                $parameters = implode(', ', array_fill(0, count($fields), '?'));
                hospital_query("INSERT INTO $table ($columns) VALUES ($parameters)", array_values($fields));
                $id = mysqli_insert_id($db);
            } else {
                $assignments = implode(', ', array_map(fn($column) => "$column = ?", array_keys($fields)));
                hospital_query("UPDATE $table SET $assignments WHERE $pk = ?", [...array_values($fields), $id]);
            }
        }
        mysqli_commit($db);
    } catch (mysqli_sql_exception $error) {
        mysqli_rollback($db);
        if (in_array($error->getCode(), [1062,1205,1213,1451,1452], true)) {
            $message = match ($error->getCode()) {
                1062 => 'A record already uses this unique value or linked appointment.',
                1451 => 'This record is linked to other records and cannot be deleted.',
                1452 => 'A selected related record no longer exists.',
                1205, 1213 => 'The record is being changed. Refresh and try again.',
            };
            respond(409, ['message' => $message]);
        }
        throw $error;
    }
    return ['id' => $id];
}
