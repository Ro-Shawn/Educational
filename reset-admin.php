<?php
require_once __DIR__ . '/config.php';
try {
  $db = getDB();
  $newPwd = $argv[1] ?? 'admin123';
  $hash = password_hash($newPwd, PASSWORD_BCRYPT, ['cost' => 10]);

  // Reset superadmin (Roshan) - member_id may be 'Roshan'
  $stmt = $db->prepare("UPDATE members SET password_hash = ? WHERE id = 1 AND role = 'superadmin'");
  $stmt->execute([$hash]);
  if ($stmt->rowCount()) {
    echo "Password for Roshan (ID 1, superadmin) reset to: $newPwd\n";
  } else {
    echo "Superadmin not found.\n";
  }

  // Also reset admin (Admin User)
  $hash2 = password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 10]);
  $stmt = $db->prepare("UPDATE members SET password_hash = ? WHERE id = 2 AND role = 'admin'");
  $stmt->execute([$hash2]);
  if ($stmt->rowCount()) {
    echo "Password for Admin User (ID 2) reset to: admin123\n";
  }

  echo "\nLogin credentials:\n";
  echo "  Roshan: member_id='Roshan', password='$newPwd'\n";
  echo "  Admin:  member_id='Admin',  password='admin123'\n";
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}
