<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_PORT = getenv('DB_PORT') ?: '3306';
$DB_NAME = getenv('DB_NAME') ?: 'yuba_db';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'yuba_secret_key_2026');
define('FINE_AMOUNT', getenv('FINE_AMOUNT') ?: 50);
define('FINE_GRACE_DAY', getenv('FINE_GRACE_DAY') ?: 6);

function getDB(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    global $DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS;
    $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4";
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  }
  return $pdo;
}

function jsonResponse($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function errorResponse(string $msg, int $code = 400): void {
  jsonResponse(['error' => $msg], $code);
}

function getJsonInput(): array {
  $raw = file_get_contents('php://input');
  return json_decode($raw, true) ?: [];
}

function setCors(): void {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function generateToken(array $payload): string {
  $payload['iat'] = time();
  $payload['exp'] = time() + 7 * 86400;
  $data = json_encode($payload);
  $sig = hash_hmac('sha256', $data, JWT_SECRET);
  return base64_encode($data . '.' . $sig);
}

function verifyToken(string $token): ?object {
  $decoded = base64_decode($token, true);
  if ($decoded === false) return null;
  $dot = strrpos($decoded, '.');
  if ($dot === false) return null;
  $data = substr($decoded, 0, $dot);
  $sig = substr($decoded, $dot + 1);
  $expected = hash_hmac('sha256', $data, JWT_SECRET);
  if (!hash_equals($expected, $sig)) return null;
  $payload = json_decode($data);
  if (!$payload || !isset($payload->exp) || $payload->exp < time()) return null;
  return $payload;
}

function authenticate(): object {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (!$auth && function_exists('getallheaders')) {
    $h = getallheaders();
    $auth = $h['Authorization'] ?? $h['authorization'] ?? '';
  }
  if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
    errorResponse('No token provided', 401);
  }
  $user = verifyToken($m[1]);
  if (!$user) errorResponse('Invalid token', 401);
  return $user;
}

function adminOnly(object $user): void {
  if (!in_array($user->role, ['admin', 'superadmin'], true)) {
    errorResponse('Admin access required', 403);
  }
}

function superAdminOnly(object $user): void {
  if ($user->role !== 'superadmin') {
    errorResponse('Superadmin access required', 403);
  }
}

function getAction(): string {
  $path = $_GET['action'] ?? '';
  if ($path) return $path;
  $uri = $_SERVER['REQUEST_URI'] ?? '';
  $uri = parse_url($uri, PHP_URL_PATH);
  $uri = trim($uri, '/');
  $parts = explode('/', $uri);
  if (count($parts) >= 2 && $parts[0] === 'api.php') {
    return $parts[1] ?? '';
  }
  return $path;
}

function getParams(): array {
  $uri = $_SERVER['REQUEST_URI'] ?? '';
  $uri = parse_url($uri, PHP_URL_PATH);
  $uri = trim($uri, '/');
  $parts = explode('/', $uri);
  $params = [];
  if (count($parts) >= 2 && $parts[0] === 'api.php') {
    for ($i = 2; $i < count($parts); $i++) {
      $params[] = $parts[$i];
    }
  }
  if (isset($_GET['id'])) $params['id'] = $_GET['id'];
  if (isset($_GET['type'])) $params['type'] = $_GET['type'];
  return $params;
}

function runMigrations(PDO $db): void {
  $db->exec("CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    temporary_password VARCHAR(255) DEFAULT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    resolved_by INT DEFAULT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES members(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_member_id (member_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function getCurrency(float $amount): string {
  return 'Rs. ' . number_format($amount, 2);
}

function generateMemberId(PDO $db): string {
  $stmt = $db->query("SELECT MAX(id) as max_id FROM members");
  $row = $stmt->fetch();
  $next = ($row['max_id'] ?? 0) + 1;
  return 'M' . str_pad($next, 4, '0', STR_PAD_LEFT);
}
