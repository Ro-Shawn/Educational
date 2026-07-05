<?php
require_once __DIR__ . '/config.php';
setCors();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = getAction();
$params = getParams();
$id = $params['id'] ?? null;
$sub = $params['type'] ?? null;

try {
  $db = getDB();
  runMigrations($db);
  switch ($action) {

    // ==================== AUTH ====================
    case 'login':
      if ($method !== 'POST') errorResponse('Method not allowed', 405);
      $in = getJsonInput();
      $mid = $in['member_id'] ?? '';
      $pwd = $in['password'] ?? '';
      if (!$mid || !$pwd) errorResponse('member_id and password required');
      $stmt = $db->prepare("SELECT id, member_id, CONCAT(first_name, ' ', last_name) AS full_name, role, position, password_hash, is_active FROM members WHERE member_id = ?");
      $stmt->execute([$mid]);
      $m = $stmt->fetch();
      if (!$m || !password_verify($pwd, $m['password_hash'])) errorResponse('Invalid credentials', 401);
      if (!$m['is_active']) errorResponse('Account is inactive', 403);
      $token = generateToken(['id'=>(int)$m['id'],'member_id'=>$m['member_id'],'role'=>$m['role'],'name'=>$m['full_name'],'position'=>$m['position']]);
      jsonResponse(['token'=>$token,'user'=>['id'=>(int)$m['id'],'member_id'=>$m['member_id'],'name'=>$m['full_name'],'role'=>$m['role'],'position'=>$m['position']]]);

    case 'change-password':
      if ($method !== 'PUT') errorResponse('Method not allowed', 405);
      $user = authenticate();
      $in = getJsonInput();
      $old = $in['old_password'] ?? '';
      $new = $in['new_password'] ?? '';
      if (!$old || !$new) errorResponse('old_password and new_password required');
      if (strlen($new) < 6) errorResponse('Password must be at least 6 characters');
      $stmt = $db->prepare("SELECT password_hash FROM members WHERE id = ?");
      $stmt->execute([$user->id]);
      $m = $stmt->fetch();
      if (!$m || !password_verify($old, $m['password_hash'])) errorResponse('Current password is incorrect', 401);
      $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 10]);
      $db->prepare("UPDATE members SET password_hash = ? WHERE id = ?")->execute([$hash, $user->id]);
      jsonResponse(['message'=>'Password updated']);

    // ==================== MEMBERS ====================
    case 'members':
      $ctrl = new MembersController($db);
      if ($method === 'GET' && !$id) { authenticate(); $ctrl->getAll(); }
      elseif ($method === 'GET' && $id && $sub !== 'summary') { authenticate(); $ctrl->getOne($id); }
      elseif ($method === 'GET' && $id && $sub === 'summary') { authenticate(); $ctrl->getSummary($id); }
      elseif ($method === 'POST' && $id === 'bulk') { $u=authenticate(); adminOnly($u); $ctrl->bulkCreate(); }
      elseif ($method === 'POST' && $id === 'import-csv') { $u=authenticate(); adminOnly($u); $ctrl->importCSV(); }
      elseif ($method === 'POST' && $id === 'opening-balances') { $u=authenticate(); adminOnly($u); $ctrl->saveOpeningBalances(); }
      elseif ($method === 'POST' && !$id) { $u=authenticate(); adminOnly($u); $ctrl->create(); }
      elseif ($method === 'POST' && $id && $sub === 'exit') { $u=authenticate(); adminOnly($u); $ctrl->processExit($id); }
      elseif ($method === 'PUT' && $id && $sub === 'reset-password') { $u=authenticate(); superAdminOnly($u); $ctrl->resetPassword($id); }
      elseif ($method === 'PUT' && $id) { $u=authenticate(); adminOnly($u); $ctrl->update($id); }
      elseif ($method === 'DELETE' && $id) { $u=authenticate(); adminOnly($u); $ctrl->remove($id); }
      else errorResponse('Not found', 404);
      break;

    // ==================== DEPOSITS ====================
    case 'deposits':
      $ctrl = new DepositsController($db);
      if ($method === 'GET') { authenticate(); $ctrl->getAll(); }
      elseif ($method === 'POST' && $id === 'generate-monthly') { $u=authenticate(); adminOnly($u); $ctrl->generateMonthly(); }
      elseif ($method === 'POST' && !$id) { $u=authenticate(); adminOnly($u); $ctrl->create(); }
      elseif ($method === 'PUT' && $id) { $u=authenticate(); adminOnly($u); $ctrl->update($id); }
      elseif ($method === 'DELETE' && $id) { $u=authenticate(); adminOnly($u); $ctrl->remove($id); }
      else errorResponse('Not found', 404);
      break;

    // ==================== LOANS ====================
    case 'loans':
      $ctrl = new LoansController($db);
      if ($method === 'GET' && !$id) { authenticate(); $ctrl->getAll(); }
      elseif ($method === 'GET' && $id) { authenticate(); $ctrl->getOne($id); }
      elseif ($method === 'POST' && $id && $sub === 'pay') { $u=authenticate(); adminOnly($u); $ctrl->recordPayment($id); }
      elseif ($method === 'POST' && !$id) { $u=authenticate(); adminOnly($u); $ctrl->create(); }
      elseif ($method === 'PUT' && $id) { $u=authenticate(); adminOnly($u); $ctrl->update($id); }
      else errorResponse('Not found', 404);
      break;

    // ==================== FINES ====================
    case 'fines':
      $ctrl = new FinesController($db);
      if ($method === 'GET') { authenticate(); $ctrl->getAll(); }
      elseif ($method === 'POST' && $id === 'apply-auto') { $u=authenticate(); adminOnly($u); $ctrl->applyAutoFines(); }
      elseif ($method === 'POST' && !$id) { $u=authenticate(); adminOnly($u); $ctrl->create(); }
      elseif ($method === 'PUT' && $id && $sub === 'pay') { $u=authenticate(); adminOnly($u); $ctrl->payFine($id); }
      elseif ($method === 'DELETE' && $id) { $u=authenticate(); adminOnly($u); $ctrl->remove($id); }
      else errorResponse('Not found', 404);
      break;

    // ==================== TRANSACTIONS ====================
    case 'transactions':
      $ctrl = new TransactionsController($db);
      if ($method === 'GET' && $id === 'export' && $sub === 'csv') { $u=authenticate(); adminOnly($u); $ctrl->exportCSV(); }
      elseif ($method === 'GET' && $id === 'export' && $sub === 'pdf') { $u=authenticate(); adminOnly($u); $ctrl->exportPDF(); }
      elseif ($method === 'GET' && $id === 'summary') { $u=authenticate(); adminOnly($u); $ctrl->getMonthlySummary(); }
      elseif ($method === 'POST' && $id === 'import-csv') { $u=authenticate(); adminOnly($u); $ctrl->importCSV($u->id); }
      elseif ($method === 'POST' && !$id) { $u=authenticate(); adminOnly($u); $ctrl->create($u->id); }
      elseif ($method === 'GET') { authenticate(); $ctrl->getAll(); }
      else errorResponse('Not found', 404);
      break;

    // ==================== DASHBOARD ====================
    case 'dashboard':
      if ($method !== 'GET') errorResponse('Method not allowed', 405);
      if ($id === 'alerts') { authenticate(); (new DashboardController($db))->getAlerts(); }
      elseif ($id === 'settings') { $u=authenticate(); adminOnly($u); (new DashboardController($db))->getSettings(); }
      else { $u=authenticate(); adminOnly($u); (new DashboardController($db))->getDashboard(); }
      break;

    case 'settings-update':
      if ($method !== 'PUT') errorResponse('Method not allowed', 405);
      $u = authenticate(); adminOnly($u);
      $in = getJsonInput();
      $allowed = ['monthly_deposit_amount','fine_amount','fine_grace_day'];
      foreach ($in as $k => $v) {
        if (in_array($k, $allowed)) {
          $db->prepare("UPDATE settings SET `value` = ? WHERE `key` = ?")->execute([$v, $k]);
        }
      }
      jsonResponse(['message'=>'Settings updated']);

    // ==================== INCOME ====================
    case 'income':
      if ($method !== 'GET') errorResponse('Method not allowed', 405);
      $u = authenticate(); adminOnly($u);
      (new IncomeController($db))->getReport();

    // ==================== SEED ====================
    case 'seed':
      if ($method === 'GET') {
        $u = authenticate(); adminOnly($u);
        $stmt = $db->query("SELECT COUNT(*) as c FROM members WHERE member_id LIKE 'M%'");
        jsonResponse(['seeded' => $stmt->fetch()['c'] > 0]);
      } elseif ($method === 'POST') {
        $u = authenticate(); adminOnly($u);
        // Check already seeded
        $stmt = $db->query("SELECT COUNT(*) as c FROM members WHERE member_id LIKE '981234567%'");
        if ($stmt->fetch()['c'] > 0) {
          errorResponse('Sample data already exists. Delete seeded phone members first to re-seed.');
        }
        $db->beginTransaction();
        try {
          // Members
          $members = [
            ['9812345670', 'Ram', 'Sharma', '9812345670', '2024-01-15', 'member', 'Member', '9812345670'],
            ['9812345671', 'Sita', 'Devi', '9812345671', '2024-02-01', 'member', 'Treasurer', '9812345671'],
            ['9812345672', 'Hari', 'Prasad', '9812345672', '2024-03-10', 'member', 'Secretary', '9812345672'],
            ['9812345673', 'Gita', 'Tamang', '9812345673', '2024-04-05', 'member', 'Member', '9812345673'],
            ['9812345674', 'Krishna', 'Thapa', '9812345674', '2024-05-20', 'member', 'Vice-Chairperson', '9812345674'],
          ];
          $insMember = $db->prepare("INSERT INTO members (member_id, first_name, last_name, phone, join_date, role, position, password_hash, is_active) VALUES (?,?,?,?,?,?,?,?,1)");
          foreach ($members as $m) {
            $hash = password_hash($m[7], PASSWORD_BCRYPT, ['cost' => 10]);
            $insMember->execute([$m[0], $m[1], $m[2], $m[3], $m[4], $m[5], $m[6], $hash]);
          }
          // Map IDs
          $midMap = [];
          $rows = $db->query("SELECT id, member_id FROM members WHERE member_id LIKE '981234567%'")->fetchAll();
          foreach ($rows as $row) $midMap[$row['member_id']] = (int)$row['id'];
          $R = $midMap['9812345670']; $S = $midMap['9812345671']; $H = $midMap['9812345672']; $G = $midMap['9812345673']; $K = $midMap['9812345674'];
          // Deposits
          $deposits = [
            [$R, 1000, '2081-01', '2024-06-15', 'paid'], [$R, 1000, '2081-02', '2024-07-20', 'paid'],
            [$S, 1000, '2081-01', '2024-06-10', 'paid'], [$S, 1000, '2081-02', null, 'unpaid'],
            [$H, 1000, '2081-01', '2024-06-25', 'paid'], [$H, 1000, '2081-02', '2024-07-28', 'paid'],
            [$G, 1000, '2081-01', '2024-06-05', 'paid'], [$G, 1000, '2081-02', null, 'unpaid'],
            [$K, 1000, '2081-01', '2024-06-30', 'paid'], [$K, 1000, '2081-02', '2024-07-30', 'paid'],
          ];
          $insDep = $db->prepare("INSERT INTO deposits (member_id, amount, deposit_month, paid_date, status) VALUES (?,?,?,?,?)");
          foreach ($deposits as $d) $insDep->execute($d);
          // Loans
          $loans = [
            [$R, 5000, 10, '2024-03-01', 5500, 1500, 'active', 'General loan'],
            [$S, 3000, 5, '2024-01-15', 3150, 3150, 'closed', 'Emergency loan'],
          ];
          $insLoan = $db->prepare("INSERT INTO loans (member_id, loan_amount, interest_rate, start_date, total_payable, amount_paid, status, notes) VALUES (?,?,?,?,?,?,?,?)");
          foreach ($loans as $l) $insLoan->execute($l);
          // Fines
          $fines = [[$S, 50, '2081-02 late deposit', '2024-08-01', 0, null], [$G, 50, '2081-02 late deposit', '2024-08-01', 0, null]];
          $insFine = $db->prepare("INSERT INTO fines (member_id, amount, reason, fine_date, is_paid, paid_date) VALUES (?,?,?,?,?,?)");
          foreach ($fines as $f) $insFine->execute($f);
          // Transactions
          $txns = [
            [$R,'deposit',1000,'Monthly deposit 2081-01','2024-06-15',1],
            [$R,'deposit',1000,'Monthly deposit 2081-02','2024-07-20',1],
            [$S,'deposit',1000,'Monthly deposit 2081-01','2024-06-10',1],
            [$H,'deposit',1000,'Monthly deposit 2081-01','2024-06-25',1],
            [$H,'deposit',1000,'Monthly deposit 2081-02','2024-07-28',1],
            [$G,'deposit',1000,'Monthly deposit 2081-01','2024-06-05',1],
            [$K,'deposit',1000,'Monthly deposit 2081-01','2024-06-30',1],
            [$K,'deposit',1000,'Monthly deposit 2081-02','2024-07-30',1],
            [$R,'loan_issued',5000,'Loan issued','2024-03-01',1],
            [$R,'loan_payment',1000,'Loan installment 1','2024-04-01',1],
            [$R,'loan_payment',500,'Loan installment 2','2024-05-01',1],
            [$S,'loan_issued',3000,'Loan issued','2024-01-15',1],
            [$S,'loan_payment',3150,'Loan full payment','2024-06-15',1],
            [$S,'fine_applied',50,'Fine: 2081-02 late deposit','2024-08-01',1],
          ];
          $insTxn = $db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,?,?,?,?,?)");
          foreach ($txns as $t) $insTxn->execute($t);
          $db->commit();
          jsonResponse(['message'=>'Sample data created successfully! Members can log in using their phone number as both Member ID and password (e.g. 9812345670 / 9812345670).']);
        } catch (Exception $e) {
          $db->rollBack();
          errorResponse('Seed failed: ' . $e->getMessage(), 500);
        }
      } else errorResponse('Method not allowed', 405);
      break;

    // ==================== PASSWORD RESET ====================
    case 'password-reset':
      if ($method === 'POST' && !$id) {
        // Member requests a password reset (no auth needed)
        $in = getJsonInput();
        $memberId = $in['member_id'] ?? '';
        if (!$memberId) errorResponse('member_id is required');
        $stmt = $db->prepare("SELECT id FROM members WHERE member_id = ? AND is_active = 1");
        $stmt->execute([$memberId]);
        $m = $stmt->fetch();
        if (!$m) errorResponse('Member not found or inactive', 404);
        $check = $db->prepare("SELECT id FROM password_resets WHERE member_id = ? AND status = 'pending'");
        $check->execute([$m['id']]);
        if ($check->fetch()) errorResponse('A pending request already exists for this member');
        $db->prepare("INSERT INTO password_resets (member_id, status) VALUES (?,'pending')")->execute([$m['id']]);
        jsonResponse(['message'=>'Password reset request submitted. Please contact your admin.'], 201);
      } elseif ($method === 'GET') {
        $u = authenticate(); adminOnly($u);
        $rows = $db->query("SELECT pr.*, m.member_id, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM password_resets pr JOIN members m ON pr.member_id = m.id WHERE pr.status = 'pending' ORDER BY pr.requested_at DESC")->fetchAll();
        jsonResponse($rows);
      } elseif ($method === 'POST' && $id && $sub === 'approve') {
        $u = authenticate(); adminOnly($u);
        $in = getJsonInput();
        $tempPwd = $in['temporary_password'] ?? '';
        if (!$tempPwd) errorResponse('temporary_password is required');
        if (strlen($tempPwd) < 6) errorResponse('Password must be at least 6 characters');
        $stmt = $db->prepare("SELECT * FROM password_resets WHERE id = ? AND status = 'pending'");
        $stmt->execute([$id]);
        $req = $stmt->fetch();
        if (!$req) errorResponse('Request not found or already processed', 404);
        $hash = password_hash($tempPwd, PASSWORD_BCRYPT, ['cost' => 10]);
        $db->prepare("UPDATE members SET password_hash = ? WHERE id = ?")->execute([$hash, $req['member_id']]);
        $db->prepare("UPDATE password_resets SET status = 'approved', temporary_password = ?, resolved_at = NOW(), resolved_by = ? WHERE id = ?")->execute([$tempPwd, $u->id, $id]);
        jsonResponse(['message'=>'Password reset approved. Member can now log in with the temporary password.']);
      } elseif ($method === 'POST' && $id && $sub === 'reject') {
        $u = authenticate(); adminOnly($u);
        $stmt = $db->prepare("SELECT * FROM password_resets WHERE id = ? AND status = 'pending'");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) errorResponse('Request not found or already processed', 404);
        $db->prepare("UPDATE password_resets SET status = 'rejected', resolved_at = NOW(), resolved_by = ? WHERE id = ?")->execute([$u->id, $id]);
        jsonResponse(['message'=>'Password reset request rejected']);
      } else errorResponse('Not found', 404);
      break;

    default:
      errorResponse('Not found', 404);
  }
} catch (PDOException $e) {
  errorResponse('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
  errorResponse($e->getMessage(), 500);
}

// ==================== CONTROLLERS ====================

class MembersController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getAll(): void {
    $stmt = $this->db->query("SELECT id, member_id, first_name, last_name, CONCAT(first_name, ' ', last_name) AS full_name, email, phone, address, join_date, role, position, is_active, opening_balance, exit_date, created_at FROM members ORDER BY id");
    jsonResponse($stmt->fetchAll());
  }
  public function getOne(string $id): void {
    $stmt = $this->db->prepare("SELECT id, member_id, first_name, last_name, CONCAT(first_name, ' ', last_name) AS full_name, email, phone, address, join_date, role, position, is_active, opening_balance, exit_date, created_at FROM members WHERE id = ? OR member_id = ?");
    $stmt->execute([$id, $id]);
    $m = $stmt->fetch();
    if (!$m) errorResponse('Member not found', 404);
    jsonResponse($m);
  }
  public function getSummary(string $id): void {
    $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? OR member_id = ?");
    $stmt->execute([$id, $id]);
    $m = $stmt->fetch();
    if (!$m) errorResponse('Member not found', 404);
    $mid = $m['id'];
    $dep = $this->db->prepare("SELECT COUNT(*) as total, SUM(amount) as amt FROM deposits WHERE member_id = ? AND status = 'paid'");
    $dep->execute([$mid]); $d = $dep->fetch();
    $loans = $this->db->prepare("SELECT COUNT(*) as total, SUM(loan_amount) as amt FROM loans WHERE member_id = ? AND status = 'active'");
    $loans->execute([$mid]); $l = $loans->fetch();
    $fines = $this->db->prepare("SELECT COUNT(*) as total, SUM(amount) as amt FROM fines WHERE member_id = ? AND is_paid = 0");
    $fines->execute([$mid]); $f = $fines->fetch();
    $bal = $this->db->prepare("SELECT SUM(amount) as total FROM transactions WHERE member_id = ?");
    $bal->execute([$mid]); $b = $bal->fetch();
    jsonResponse([
      'total_deposits' => (float)($d['amt'] ?? 0),
      'deposit_count' => (int)($d['total'] ?? 0),
      'active_loans' => (int)($l['total'] ?? 0),
      'loan_amount' => (float)($l['amt'] ?? 0),
      'unpaid_fines' => (int)($f['total'] ?? 0),
      'fine_amount' => (float)($f['amt'] ?? 0),
      'balance' => (float)($b['total'] ?? 0),
    ]);
  }
  public function create(): void {
    $in = getJsonInput();
    $required = ['first_name','last_name','phone','join_date','role'];
    foreach ($required as $r) if (empty($in[$r])) errorResponse("$r is required");
    $mid = $in['phone'];
    $pwd = $in['phone'];
    $hash = password_hash($pwd, PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt = $this->db->prepare("INSERT INTO members (member_id, first_name, last_name, email, phone, address, join_date, role, position, password_hash, opening_balance) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$mid, $in['first_name'], $in['last_name'], $in['email']??null, $in['phone'], $in['address']??null, $in['join_date'], $in['role'], $in['position']??null, $hash, $in['opening_balance']??0]);
    $id = $this->db->lastInsertId();
    if (!empty($in['opening_balance'])) {
      $this->db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,'opening_balance',?,?,?,?)")->execute([$id, $in['opening_balance'], 'Opening balance', $in['join_date'], $_SESSION['user_id'] ?? 1]);
    }
    jsonResponse(['message'=>'Member created','id'=>(int)$id], 201);
  }
  public function update(string $id): void {
    $in = getJsonInput();
    $fields = []; $vals = [];
    foreach (['first_name','last_name','email','phone','address','join_date','role','position','is_active','opening_balance'] as $f) {
      if (isset($in[$f])) { $fields[] = "$f = ?"; $vals[] = $in[$f]; }
    }
    if (isset($in['phone'])) {
      $fields[] = 'member_id = ?';
      $vals[] = $in['phone'];
    }
    if (isset($in['password']) && $in['password']) {
      $fields[] = 'password_hash = ?';
      $vals[] = password_hash($in['password'], PASSWORD_BCRYPT, ['cost' => 10]);
    }
    if (empty($fields)) errorResponse('No fields to update');
    $vals[] = $id;
    $this->db->prepare("UPDATE members SET " . implode(', ', $fields) . " WHERE id = ? OR member_id = ?")->execute($vals);
    jsonResponse(['message'=>'Member updated']);
  }
  public function remove(string $id): void {
    $stmt = $this->db->prepare("DELETE FROM members WHERE id = ? OR member_id = ?");
    $stmt->execute([$id, $id]);
    jsonResponse(['message'=>'Member deleted']);
  }
  public function resetPassword(string $id): void {
    $in = getJsonInput();
    $newPwd = $in['password'] ?? '';
    if (!$newPwd) errorResponse('password is required');
    if (strlen($newPwd) < 6) errorResponse('Password must be at least 6 characters');
    $hash = password_hash($newPwd, PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt = $this->db->prepare("UPDATE members SET password_hash = ? WHERE id = ? OR member_id = ?");
    $stmt->execute([$hash, $id, $id]);
    if ($stmt->rowCount() === 0) errorResponse('Member not found', 404);
    jsonResponse(['message'=>'Password reset successfully']);
  }
  public function bulkCreate(): void {
    $in = getJsonInput();
    $members = $in['members'] ?? [];
    if (empty($members)) errorResponse('No members provided');
    $count = 0;
    foreach ($members as $m) {
      if (empty($m['first_name']) || empty($m['last_name']) || empty($m['phone'])) continue;
      $mid = $m['phone'];
      $hash = password_hash($m['phone'], PASSWORD_BCRYPT, ['cost' => 10]);
      $stmt = $this->db->prepare("INSERT INTO members (member_id, first_name, last_name, email, phone, address, join_date, role, position, password_hash, opening_balance) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      $stmt->execute([$mid, $m['first_name'], $m['last_name'], $m['email']??null, $m['phone'], $m['address']??null, $m['join_date']??date('Y-m-d'), $m['role']??'member', $m['position']??null, $hash, $m['opening_balance']??0]);
      $count++;
    }
    jsonResponse(['message'=>"$count members created"]);
  }
  public function importCSV(): void {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
      errorResponse('CSV file is required');
    }
    $handle = fopen($_FILES['file']['tmp_name'], 'r');
    if (!$handle) errorResponse('Failed to read file');
    $headers = fgetcsv($handle);
    if (!$headers) { fclose($handle); errorResponse('Empty CSV file'); }
    $headers = array_map('trim', $headers);
    $expected = ['first_name','last_name','role','phone','position'];
    $missing = array_diff($expected, $headers);
    if (!empty($missing)) {
      fclose($handle);
      errorResponse('Missing columns: ' . implode(', ', $missing));
    }
    $count = 0;
    while (($row = fgetcsv($handle)) !== false) {
      if (count($row) < count($expected)) continue;
      $data = array_combine($headers, $row);
      $firstName = trim($data['first_name'] ?? '');
      $lastName = trim($data['last_name'] ?? '');
      $phone = trim($data['phone'] ?? '');
      if (empty($firstName) || empty($phone)) continue;
      $mid = $phone;
      $password = $phone;
      $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
      $role = in_array(trim($data['role'] ?? ''), ['admin','member']) ? trim($data['role']) : 'member';
      $position = trim($data['position'] ?? '');
      $stmt = $this->db->prepare("INSERT INTO members (member_id, first_name, last_name, phone, role, position, password_hash, join_date) VALUES (?,?,?,?,?,?,?,?)");
      $stmt->execute([$mid, $firstName, $lastName, $phone, $role, $position ?: null, $hash, date('Y-m-d')]);
      $count++;
    }
    fclose($handle);
    jsonResponse(['message' => "$count members imported successfully"]);
  }

  public function saveOpeningBalances(): void {
    $in = getJsonInput();
    $balances = $in['balances'] ?? [];
    foreach ($balances as $b) {
      if (empty($b['member_id'])) continue;
      $stmt = $this->db->prepare("UPDATE members SET opening_balance = ? WHERE id = ?");
      $stmt->execute([$b['amount'] ?? 0, $b['member_id']]);
      $stmt2 = $this->db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,'opening_balance',?,?,?,?)");
      $stmt2->execute([$b['member_id'], $b['amount'] ?? 0, 'Opening balance update', $b['date'] ?? date('Y-m-d'), $in['user_id'] ?? 1]);
    }
    jsonResponse(['message'=>'Opening balances saved']);
  }
  public function processExit(string $id): void {
    $in = getJsonInput();
    $stmt = $this->db->prepare("SELECT id, CONCAT(first_name, ' ', last_name) AS full_name, opening_balance FROM members WHERE id = ? OR member_id = ?");
    $stmt->execute([$id, $id]);
    $m = $stmt->fetch();
    if (!$m) errorResponse('Member not found', 404);
    $mid = $m['id'];
    $dep = $this->db->prepare("SELECT COALESCE(SUM(amount),0) as total FROM deposits WHERE member_id = ? AND status = 'paid'");
    $dep->execute([$mid]); $d = $dep->fetch();
    $loans = $this->db->prepare("SELECT COALESCE(SUM(loan_amount - amount_paid),0) as due FROM loans WHERE member_id = ? AND status = 'active'");
    $loans->execute([$mid]); $l = $loans->fetch();
    $exitDate = $in['exit_date'] ?? date('Y-m-d');
    $refund = ($m['opening_balance'] + $d['total']) - $l['due'];
    $this->db->prepare("UPDATE members SET is_active = 0, exit_date = ? WHERE id = ?")->execute([$exitDate, $mid]);
    if ($refund > 0) {
      $this->db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,'refund',?,?,?,?)")->execute([$mid, $refund, "Exit refund for {$m['full_name']}", $exitDate, $in['user_id']??1]);
    }
    jsonResponse(['message'=>'Member exited','refund_amount'=>$refund]);
  }
}

class DepositsController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getAll(): void {
    $memberId = $_GET['member_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $sql = "SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name, m.member_id FROM deposits d JOIN members m ON d.member_id = m.id WHERE 1=1";
    $params = [];
    if ($memberId) { $sql .= " AND d.member_id = ?"; $params[] = $memberId; }
    if ($status) { $sql .= " AND d.status = ?"; $params[] = $status; }
    $sql .= " ORDER BY d.deposit_month DESC, CONCAT(m.first_name, ' ', m.last_name) ASC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
  }
  public function create(): void {
    $in = getJsonInput();
    if (empty($in['member_id']) || empty($in['amount']) || empty($in['deposit_month'])) errorResponse('member_id, amount, deposit_month required');
    $stmt = $this->db->prepare("INSERT INTO deposits (member_id, amount, deposit_month, paid_date, status, notes) VALUES (?,?,?,?,?,?)");
    $paidDate = ($in['status'] ?? 'paid') === 'paid' ? ($in['paid_date'] ?? date('Y-m-d')) : null;
    $stmt->execute([$in['member_id'], $in['amount'], $in['deposit_month'], $paidDate, $in['status'] ?? 'paid', $in['notes'] ?? null]);
    $id = $this->db->lastInsertId();
    if ($in['status'] !== 'unpaid') {
      $this->db->prepare("INSERT INTO transactions (member_id, type, amount, reference_id, description, transaction_date, created_by) VALUES (?,'deposit',?,?,?,?,?)")->execute([$in['member_id'], $in['amount'], $id, "Monthly deposit {$in['deposit_month']}", $paidDate, $_SESSION['user_id'] ?? 1]);
    }
    jsonResponse(['message'=>'Deposit created','id'=>(int)$id], 201);
  }
  public function update(string $id): void {
    $in = getJsonInput();
    $fields = []; $vals = [];
    foreach (['amount','deposit_month','status','notes','paid_date'] as $f) {
      if (isset($in[$f])) { $fields[] = "$f = ?"; $vals[] = $in[$f]; }
    }
    if (empty($fields)) errorResponse('No fields to update');
    $vals[] = $id;
    $this->db->prepare("UPDATE deposits SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    jsonResponse(['message'=>'Deposit updated']);
  }
  public function remove(string $id): void {
    $this->db->prepare("DELETE FROM deposits WHERE id = ?")->execute([$id]);
    jsonResponse(['message'=>'Deposit deleted']);
  }
  public function generateMonthly(): void {
    $month = $_GET['month'] ?? date('Y-m');
    $stmt = $this->db->query("SELECT s.`value` FROM settings WHERE s.`key` = 'monthly_deposit_amount'");
    $s = $stmt->fetch();
    $amount = $s ? (float)$s['value'] : 1000;
    $members = $this->db->query("SELECT id FROM members WHERE is_active = 1 AND role != 'superadmin'")->fetchAll();
    $count = 0;
    foreach ($members as $m) {
      $check = $this->db->prepare("SELECT id FROM deposits WHERE member_id = ? AND deposit_month = ?");
      $check->execute([$m['id'], $month]);
      if (!$check->fetch()) {
        $this->db->prepare("INSERT INTO deposits (member_id, amount, deposit_month, status) VALUES (?,?,?,'unpaid')")->execute([$m['id'], $amount, $month]);
        $count++;
      }
    }
    jsonResponse(['message'=>"$count deposits generated for $month"]);
  }
}

class LoansController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getAll(): void {
    $memberId = $_GET['member_id'] ?? null;
    $sql = "SELECT l.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name, m.member_id FROM loans l JOIN members m ON l.member_id = m.id WHERE 1=1";
    $params = [];
    if ($memberId) { $sql .= " AND l.member_id = ?"; $params[] = $memberId; }
    $sql .= " ORDER BY l.created_at DESC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
  }
  public function getOne(string $id): void {
    $stmt = $this->db->prepare("SELECT l.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name, m.member_id FROM loans l JOIN members m ON l.member_id = m.id WHERE l.id = ?");
    $stmt->execute([$id]);
    $l = $stmt->fetch();
    if (!$l) errorResponse('Loan not found', 404);
    $pymts = $this->db->prepare("SELECT * FROM transactions WHERE type = 'loan_payment' AND reference_id = ? ORDER BY transaction_date DESC");
    $pymts->execute([$id]);
    $l['payments'] = $pymts->fetchAll();
    jsonResponse($l);
  }
  public function create(): void {
    $in = getJsonInput();
    if (empty($in['member_id']) || empty($in['loan_amount'])) errorResponse('member_id, loan_amount required');
    $rate = $in['interest_rate'] ?? 0;
    $totalPayable = $in['loan_amount'] * (1 + ($rate / 100));
    $stmt = $this->db->prepare("INSERT INTO loans (member_id, loan_amount, interest_rate, start_date, total_payable, notes) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$in['member_id'], $in['loan_amount'], $rate, $in['start_date'] ?? date('Y-m-d'), $totalPayable, $in['notes'] ?? null]);
    $id = $this->db->lastInsertId();
    $this->db->prepare("INSERT INTO transactions (member_id, type, amount, reference_id, description, transaction_date, created_by) VALUES (?,'loan_issued',?,?,?,?,?)")->execute([$in['member_id'], $in['loan_amount'], $id, "Loan issued", $in['start_date'] ?? date('Y-m-d'), $_SESSION['user_id'] ?? 1]);
    jsonResponse(['message'=>'Loan created','id'=>(int)$id], 201);
  }
  public function update(string $id): void {
    $in = getJsonInput();
    $fields = []; $vals = [];
    foreach (['loan_amount','interest_rate','start_date','total_payable','status','notes'] as $f) {
      if (isset($in[$f])) { $fields[] = "$f = ?"; $vals[] = $in[$f]; }
    }
    if (empty($fields)) errorResponse('No fields to update');
    if (isset($in['loan_amount']) && isset($in['interest_rate'])) {
      $in['total_payable'] = $in['loan_amount'] * (1 + ($in['interest_rate'] / 100));
      $fields[] = 'total_payable = ?';
      $vals[] = $in['total_payable'];
    }
    $vals[] = $id;
    $this->db->prepare("UPDATE loans SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    jsonResponse(['message'=>'Loan updated']);
  }
  public function recordPayment(string $id): void {
    $in = getJsonInput();
    $amount = $in['amount'] ?? 0;
    if ($amount <= 0) errorResponse('Invalid payment amount');
    $stmt = $this->db->prepare("SELECT * FROM loans WHERE id = ?");
    $stmt->execute([$id]);
    $loan = $stmt->fetch();
    if (!$loan) errorResponse('Loan not found', 404);
    $newPaid = $loan['amount_paid'] + $amount;
    $status = $newPaid >= $loan['total_payable'] ? 'closed' : 'active';
    $this->db->prepare("UPDATE loans SET amount_paid = ?, status = ? WHERE id = ?")->execute([$newPaid, $status, $id]);
    $this->db->prepare("INSERT INTO transactions (member_id, type, amount, reference_id, description, transaction_date, created_by) VALUES (?,'loan_payment',?,?,?,?,?)")->execute([$loan['member_id'], $amount, $id, "Loan payment", $in['payment_date'] ?? date('Y-m-d'), $_SESSION['user_id'] ?? 1]);
    jsonResponse(['message'=>'Payment recorded','remaining'=>$loan['total_payable'] - $newPaid]);
  }
}

class FinesController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getAll(): void {
    $memberId = $_GET['member_id'] ?? null;
    $sql = "SELECT f.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name, m.member_id FROM fines f JOIN members m ON f.member_id = m.id WHERE 1=1";
    $params = [];
    if ($memberId) { $sql .= " AND f.member_id = ?"; $params[] = $memberId; }
    $sql .= " ORDER BY f.fine_date DESC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
  }
  public function create(): void {
    $in = getJsonInput();
    if (empty($in['member_id']) || empty($in['amount'])) errorResponse('member_id, amount required');
    $stmt = $this->db->prepare("INSERT INTO fines (member_id, fine_type, reference_id, amount, reason, fine_date) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$in['member_id'], $in['fine_type']??'late_deposit', $in['reference_id']??null, $in['amount'], $in['reason']??null, $in['fine_date']??date('Y-m-d')]);
    $id = $this->db->lastInsertId();
    $this->db->prepare("INSERT INTO transactions (member_id, type, amount, reference_id, description, transaction_date, created_by) VALUES (?,'fine_applied',?,?,?,?,?)")->execute([$in['member_id'], $in['amount'], $id, "Fine: {$in['reason']}", $in['fine_date']??date('Y-m-d'), $_SESSION['user_id'] ?? 1]);
    jsonResponse(['message'=>'Fine created','id'=>(int)$id], 201);
  }
  public function payFine(string $id): void {
    $in = getJsonInput();
    $stmt = $this->db->prepare("SELECT * FROM fines WHERE id = ?");
    $stmt->execute([$id]);
    $fine = $stmt->fetch();
    if (!$fine) errorResponse('Fine not found', 404);
    $paidDate = $in['paid_date'] ?? date('Y-m-d');
    $this->db->prepare("UPDATE fines SET is_paid = 1, paid_date = ? WHERE id = ?")->execute([$paidDate, $id]);
    $this->db->prepare("INSERT INTO transactions (member_id, type, amount, reference_id, description, transaction_date, created_by) VALUES (?,'fine_paid',?,?,?,?,?)")->execute([$fine['member_id'], $fine['amount'], $id, "Fine paid", $paidDate, $_SESSION['user_id'] ?? 1]);
    jsonResponse(['message'=>'Fine paid']);
  }
  public function remove(string $id): void {
    $this->db->prepare("DELETE FROM fines WHERE id = ?")->execute([$id]);
    jsonResponse(['message'=>'Fine deleted']);
  }
  public function applyAutoFines(): void {
    $stmt = $this->db->query("SELECT `value` FROM settings WHERE `key` = 'fine_amount'");
    $row = $stmt->fetch();
    $fineAmount = $row ? (float)$row['value'] : 50;
    $grace = FINE_GRACE_DAY;
    $month = date('Y-m', strtotime("-1 month"));
    $deposits = $this->db->prepare("SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM deposits d JOIN members m ON d.member_id = m.id WHERE d.deposit_month = ? AND d.status = 'unpaid'");
    $deposits->execute([$month]);
    $count = 0;
    foreach ($deposits as $d) {
      $check = $this->db->prepare("SELECT id FROM fines WHERE reference_id = ? AND fine_type = 'late_deposit'");
      $check->execute([$d['id']]);
      if (!$check->fetch()) {
        $this->db->prepare("INSERT INTO fines (member_id, fine_type, reference_id, amount, reason, fine_date) VALUES (?,'late_deposit',?,?,?,?)")->execute([$d['member_id'], $d['id'], $fineAmount, "Late deposit for {$d['deposit_month']}", date('Y-m-d')]);
        $count++;
      }
    }
    jsonResponse(['message'=>"$count fines applied"]);
  }
}

class TransactionsController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getAll(): void {
    $memberId = $_GET['member_id'] ?? null;
    $type = $_GET['type'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $sql = "SELECT t.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name, m.member_id, CONCAT(cb.first_name, ' ', cb.last_name) AS created_by_name FROM transactions t LEFT JOIN members m ON t.member_id = m.id LEFT JOIN members cb ON t.created_by = cb.id WHERE 1=1";
    $params = [];
    if ($memberId) { $sql .= " AND t.member_id = ?"; $params[] = $memberId; }
    if ($type) { $sql .= " AND t.type = ?"; $params[] = $type; }
    if ($from) { $sql .= " AND t.transaction_date >= ?"; $params[] = $from; }
    if ($to) { $sql .= " AND t.transaction_date <= ?"; $params[] = $to; }
    $sql .= " ORDER BY t.created_at DESC LIMIT 500";
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
  }
  public function create(int $createdBy): void {
    $in = getJsonInput();
    $required = ['member_id', 'type', 'amount', 'transaction_date'];
    foreach ($required as $r) {
      if (!isset($in[$r]) || (string)$in[$r] === '') errorResponse("$r is required");
    }
    $allowedTypes = ['deposit','loan_payment','fine_paid','fine_applied','opening_balance','refund','adjustment','loan_issued','interest'];
    if (!in_array($in['type'], $allowedTypes)) errorResponse('Invalid transaction type');
    $stmt = $this->db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$in['member_id'], $in['type'], $in['amount'], $in['description'] ?? null, $in['transaction_date'], $createdBy]);
    jsonResponse(['message' => 'Transaction created', 'id' => (int)$this->db->lastInsertId()], 201);
  }

  public function importCSV(int $createdBy): void {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
      errorResponse('CSV file is required');
    }
    $handle = fopen($_FILES['file']['tmp_name'], 'r');
    if (!$handle) errorResponse('Failed to read file');
    $headers = fgetcsv($handle);
    if (!$headers) { fclose($handle); errorResponse('Empty CSV file'); }
    $headers = array_map('trim', $headers);
    $expected = ['member_code', 'type', 'amount', 'date', 'description'];
    $missing = array_diff($expected, $headers);
    if (!empty($missing)) {
      fclose($handle);
      errorResponse('Missing columns: ' . implode(', ', $missing));
    }
    $allowedTypes = ['deposit', 'fine', 'interest', 'loan_issued', 'loan_payment', 'opening_balance', 'adjustment'];
    $count = 0;
    while (($row = fgetcsv($handle)) !== false) {
      if (count($row) < count($expected)) continue;
      $data = array_combine($headers, $row);
      $memberCode = trim($data['member_code'] ?? '');
      $type = trim($data['type'] ?? '');
      $amount = trim($data['amount'] ?? '');
      $date = trim($data['date'] ?? '');
      $desc = trim($data['description'] ?? '');
      if (empty($memberCode) || empty($type) || !is_numeric($amount) || empty($date)) continue;
      if (!in_array($type, $allowedTypes)) continue;
      // Map 'fine' → 'fine_applied', 'interest' → 'interest'
      if ($type === 'fine') $type = 'fine_applied';
      $stmt = $this->db->prepare("SELECT id FROM members WHERE member_id = ?");
      $stmt->execute([$memberCode]);
      $m = $stmt->fetch();
      if (!$m) continue;
      // Check for duplicate (same member, type, amount, date)
      $dup = $this->db->prepare("SELECT id FROM transactions WHERE member_id = ? AND type = ? AND amount = ? AND transaction_date = ?");
      $dup->execute([$m['id'], $type, $amount, $date]);
      if ($dup->fetch()) continue;
      $this->db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,?,?,?,?,?)")
        ->execute([$m['id'], $type, $amount, $desc ?: null, $date, $createdBy]);
      $count++;
    }
    fclose($handle);
    jsonResponse(['message' => "$count transactions imported successfully"]);
  }

  public function getMonthlySummary(): void {
    $stmt = $this->db->query("SELECT DATE_FORMAT(transaction_date, '%Y-%m') as month, type, SUM(amount) as total FROM transactions GROUP BY month, type ORDER BY month DESC LIMIT 12");
    jsonResponse($stmt->fetchAll());
  }
  public function exportCSV(): void {
    $stmt = $this->db->query("SELECT t.id, t.type, t.amount, t.description, t.transaction_date, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM transactions t LEFT JOIN members m ON t.member_id = m.id ORDER BY t.created_at DESC");
    $rows = $stmt->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=transactions.csv');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['ID','Type','Amount','Description','Date','Member']);
    foreach ($rows as $r) fputcsv($out, $r);
    fclose($out);
    exit;
  }
  public function exportPDF(): void {
    $stmt = $this->db->query("SELECT t.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM transactions t LEFT JOIN members m ON t.member_id = m.id ORDER BY t.created_at DESC LIMIT 200");
    $rows = $stmt->fetchAll();
    $html = '<html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}h2{margin-bottom:10px}</style></head><body>';
    $html .= '<h2>Transaction Report</h2><table><thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>Description</th><th>Date</th><th>Member</th></tr></thead><tbody>';
    foreach ($rows as $r) {
      $html .= '<tr><td>'.$r['id'].'</td><td>'.$r['type'].'</td><td>'.getCurrency($r['amount']).'</td><td>'.htmlspecialchars($r['description']??'').'</td><td>'.$r['transaction_date'].'</td><td>'.htmlspecialchars($r['full_name']??'N/A').'</td></tr>';
    }
    $html .= '</tbody></table></body></html>';
    require_once __DIR__ . '/vendor/autoload.php';
    $dompdf = new Dompdf\Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'landscape');
    $dompdf->render();
    $dompdf->stream('transactions.pdf', ['Attachment' => true]);
    exit;
  }
}

class DashboardController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getDashboard(): void {
    $members = $this->db->query("SELECT COUNT(*) as total, SUM(is_active) as active FROM members")->fetch();
    $deposits = $this->db->query("SELECT COALESCE(SUM(amount),0) as total FROM deposits WHERE status='paid'")->fetch();
    $opening = $this->db->query("SELECT COALESCE(SUM(opening_balance),0) as total FROM members")->fetch();
    $interest = $this->db->query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='loan_payment' OR type='interest'")->fetch();
    $fines = $this->db->query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='fine_paid'")->fetch();
    $loans = $this->db->query("SELECT COUNT(*) as active, COALESCE(SUM(loan_amount),0) as amt FROM loans WHERE status='active'")->fetch();
    $pendingDep = $this->db->query("SELECT COUNT(*) as c FROM deposits WHERE status='unpaid'")->fetch();
    $unpaidFines = $this->db->query("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as t FROM fines WHERE is_paid=0")->fetch();
    $txns = $this->db->query("SELECT t.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM transactions t LEFT JOIN members m ON t.member_id = m.id ORDER BY t.created_at DESC LIMIT 10")->fetchAll();
    jsonResponse([
      'members' => ['total'=>(int)$members['total'],'active'=>(int)$members['active']],
      'total_monthly_deposits' => (float)$deposits['total'],
      'total_opening_balance' => (float)$opening['total'],
      'total_interest_collected' => (float)$interest['total'],
      'total_fines_collected' => (float)$fines['total'],
      'total_surplus' => (float)($interest['total'] + $fines['total']),
      'total_funds' => (float)($deposits['total'] + $opening['total']),
      'loans' => ['active'=>(int)$loans['active'],'active_amount'=>(float)$loans['amt']],
      'pending_deposits' => ['count'=>(int)$pendingDep['c']],
      'unpaid_fines' => ['count'=>(int)$unpaidFines['c'],'total'=>(float)$unpaidFines['t']],
      'recent_transactions' => $txns,
    ]);
  }
  public function getAlerts(): void {
    $user = authenticate();
    $depAlerts = $this->db->prepare("SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM deposits d JOIN members m ON d.member_id = m.id WHERE d.status='unpaid' AND (d.member_id = ? OR 1=?) ORDER BY d.deposit_month ASC LIMIT 20");
    $depAlerts->execute([$user->id, $user->role === 'member' ? 0 : 1]);
    $fineAlerts = $this->db->prepare("SELECT f.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.is_paid=0 AND (f.member_id = ? OR 1=?) ORDER BY f.fine_date ASC LIMIT 20");
    $fineAlerts->execute([$user->id, $user->role === 'member' ? 0 : 1]);
    $overdue = $this->db->prepare("SELECT l.*, CONCAT(m.first_name, ' ', m.last_name) AS full_name FROM loans l JOIN members m ON l.member_id = m.id WHERE l.status='active' AND l.amount_paid < l.total_payable AND (l.member_id = ? OR 1=?) ORDER BY l.start_date ASC LIMIT 20");
    $overdue->execute([$user->id, $user->role === 'member' ? 0 : 1]);
    jsonResponse(['unpaid_deposits'=>$depAlerts->fetchAll(),'unpaid_fines'=>$fineAlerts->fetchAll(),'overdue_emis'=>$overdue->fetchAll()]);
  }
  public function getSettings(): void {
    $stmt = $this->db->query("SELECT `key`, `value` FROM settings");
    $settings = [];
    foreach ($stmt->fetchAll() as $s) $settings[$s['key']] = $s['value'];
    jsonResponse($settings);
  }
}

class IncomeController {
  private PDO $db;
  public function __construct(PDO $db) { $this->db = $db; }
  public function getReport(): void {
    $from = $_GET['from'] ?? date('Y-m-01', strtotime('-11 months'));
    $to = $_GET['to'] ?? date('Y-m-t');
    $interest = $this->db->prepare("SELECT DATE_FORMAT(transaction_date,'%Y-%m') as month, SUM(amount) as total FROM transactions WHERE (type='loan_payment' OR type='interest') AND transaction_date BETWEEN ? AND ? GROUP BY month ORDER BY month");
    $interest->execute([$from, $to]);
    $fines = $this->db->prepare("SELECT DATE_FORMAT(transaction_date,'%Y-%m') as month, SUM(amount) as total FROM transactions WHERE type='fine_paid' AND transaction_date BETWEEN ? AND ? GROUP BY month ORDER BY month");
    $fines->execute([$from, $to]);
    jsonResponse(['interest'=>$interest->fetchAll(),'fines'=>$fines->fetchAll()]);
  }
}
