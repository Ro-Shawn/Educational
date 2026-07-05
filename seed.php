<?php
require_once __DIR__ . '/config.php';

$isCLI = php_sapi_name() === 'cli';
$nl = $isCLI ? "\n" : "<br>\n";

function out($msg) { global $nl; echo $msg . $nl; }
function heading($msg) { global $nl, $isCLI; echo ($isCLI ? "== " : "<h3>") . $msg . ($isCLI ? " ==" : "</h3>") . $nl; }

try {
  $db = getDB();

  // Check if dummy data already exists
  $stmt = $db->query("SELECT COUNT(*) as c FROM members WHERE member_id LIKE '981234567%'");
  if ($stmt->fetch()['c'] > 0) {
    heading('DUMMY DATA ALREADY EXISTS');
    out('Members with phone IDs starting with 981234567 already exist. Run this to clear first:');
    out('DELETE FROM transactions WHERE member_id IN (SELECT id FROM members WHERE member_id LIKE "981234567%")');
    out('DELETE FROM fines WHERE member_id IN (SELECT id FROM members WHERE member_id LIKE "981234567%")');
    out('DELETE FROM loans WHERE member_id IN (SELECT id FROM members WHERE member_id LIKE "981234567%")');
    out('DELETE FROM deposits WHERE member_id IN (SELECT id FROM members WHERE member_id LIKE "981234567%")');
    out('DELETE FROM members WHERE member_id LIKE "981234567%"');
    exit;
  }

  $db->beginTransaction();

  // ===== MEMBERS =====
  heading('Inserting 5 dummy members');
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
    out("  Created: {$m[0]} - {$m[1]} {$m[2]} (password: {$m[7]})");
  }

  // Map phone (member_id) → actual DB id
  $midMap = [];
  $stmt = $db->query("SELECT id, member_id FROM members WHERE member_id LIKE '981234567%'");
  foreach ($stmt->fetchAll() as $row) {
    $midMap[$row['member_id']] = (int)$row['id'];
  }
  $R = $midMap['9812345670']; // Ram
  $S = $midMap['9812345671']; // Sita
  $H = $midMap['9812345672']; // Hari
  $G = $midMap['9812345673']; // Gita
  $K = $midMap['9812345674']; // Krishna
  $adminId = 1; // Roshan superadmin

  // ===== DEPOSITS =====
  heading('Inserting 10 dummy deposits');
  $deposits = [
    [$R, 1000, '2081-01', '2024-06-15', 'paid'],
    [$R, 1000, '2081-02', '2024-07-20', 'paid'],
    [$S, 1000, '2081-01', '2024-06-10', 'paid'],
    [$S, 1000, '2081-02', null, 'unpaid'],
    [$H, 1000, '2081-01', '2024-06-25', 'paid'],
    [$H, 1000, '2081-02', '2024-07-28', 'paid'],
    [$G, 1000, '2081-01', '2024-06-05', 'paid'],
    [$G, 1000, '2081-02', null, 'unpaid'],
    [$K, 1000, '2081-01', '2024-06-30', 'paid'],
    [$K, 1000, '2081-02', '2024-07-30', 'paid'],
  ];
  $insDep = $db->prepare("INSERT INTO deposits (member_id, amount, deposit_month, paid_date, status) VALUES (?,?,?,?,?)");
  $count = 0;
  foreach ($deposits as $d) {
    $insDep->execute($d);
    $count++;
  }
  out("  $count deposits created");

  // ===== LOANS =====
  heading('Inserting 2 dummy loans');
  $loans = [
    [$R, 5000, 10, '2024-03-01', 5500, 1500, 'active', 'General loan'],
    [$S, 3000, 5, '2024-01-15', 3150, 3150, 'closed', 'Emergency loan'],
  ];
  $insLoan = $db->prepare("INSERT INTO loans (member_id, loan_amount, interest_rate, start_date, total_payable, amount_paid, status, notes) VALUES (?,?,?,?,?,?,?,?)");
  $loanIds = [];
  foreach ($loans as $l) {
    $insLoan->execute($l);
    $loanIds[] = (int)$db->lastInsertId();
    out("  Loan created for member #{$l[0]} - amount: {$l[1]}");
  }

  // ===== FINES =====
  heading('Inserting 2 dummy fines');
  $fines = [
    [$S, 50, '2081-02 late deposit', '2024-08-01', 0, null],
    [$G, 50, '2081-02 late deposit', '2024-08-01', 0, null],
  ];
  $insFine = $db->prepare("INSERT INTO fines (member_id, amount, reason, fine_date, is_paid, paid_date) VALUES (?,?,?,?,?,?)");
  foreach ($fines as $f) {
    $insFine->execute($f);
    out("  Fine created for member #{$f[0]} - amount: {$f[1]}");
  }

  // ===== TRANSACTIONS =====
  heading('Inserting 14 dummy transactions');
  $txns = [
    [$R, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-15', $adminId],
    [$R, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-20', $adminId],
    [$S, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-10', $adminId],
    [$H, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-25', $adminId],
    [$H, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-28', $adminId],
    [$G, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-05', $adminId],
    [$K, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-30', $adminId],
    [$K, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-30', $adminId],
    [$R, 'loan_issued', 5000, 'Loan issued', '2024-03-01', $adminId],
    [$R, 'loan_payment', 1000, 'Loan installment 1', '2024-04-01', $adminId],
    [$R, 'loan_payment', 500, 'Loan installment 2', '2024-05-01', $adminId],
    [$S, 'loan_issued', 3000, 'Loan issued', '2024-01-15', $adminId],
    [$S, 'loan_payment', 3150, 'Loan full payment', '2024-06-15', $adminId],
    [$S, 'fine_applied', 50, 'Fine: 2081-02 late deposit', '2024-08-01', $adminId],
  ];
  $insTxn = $db->prepare("INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES (?,?,?,?,?,?)");
  foreach ($txns as $t) {
    $insTxn->execute($t);
  }
  out('  14 transactions created');

  $db->commit();
  heading('SEED COMPLETE');
  out('Dummy data inserted successfully!');
  out('');
  out('Login with phone number (Member ID = password):');
  out('  Ram Sharma     → 9812345670 / 9812345670');
  out('  Sita Devi      → 9812345671 / 9812345671');
  out('  Hari Prasad    → 9812345672 / 9812345672');
  out('  Gita Tamang    → 9812345673 / 9812345673');
  out('  Krishna Thapa  → 9812345674 / 9812345674');

} catch (Exception $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  heading('ERROR');
  out($e->getMessage());
}
