<?php
// energiamudel.ee: the way in from the team's tools page without the password (D-179). Its button posts
// the token; when it equals the one kept one directory above the document root, this sets the cookie that
// .htaccess lets in for 30 days. Every answer is the same redirect to the site, so that nothing tells a right
// token from a wrong one; without the cookie the site asks for the password.
$file = dirname(__DIR__) . '/.sso-token-v5';
$want = is_readable($file) ? trim((string) file_get_contents($file)) : '';
$got = $_POST['t'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && preg_match('/^[0-9a-f]{64}$/', $want) === 1 && is_string($got) && hash_equals($want, $got)) {
  setcookie('energiamudel_sso', $want, ['expires' => time() + 30 * 86400, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
}
header('Cache-Control: no-store');
header('Location: /?lang=et', true, 303);
