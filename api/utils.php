<?php
/**
 * Nexus PMS Documentation — Shared backend utilities.
 * No database: all content is stored as JSON files under /data
 * and uploaded media under /uploads. Simple file-locking is used
 * to avoid corruption when reading/writing the JSON files.
 */

header("Content-Type: application/json; charset=utf-8");

define("ROOT_DIR", realpath(__DIR__ . "/.."));
define("DATA_DIR", ROOT_DIR . "/data");
define("GUIDES_DIR", DATA_DIR . "/guides");
define("UPLOADS_DIR", ROOT_DIR . "/uploads");
//#region Edit By AI
require_once ROOT_DIR . "/lib/admin_auth.php";

function require_admin_api_auth() {
    require_admin_auth_or_fail("الرجاء تسجيل الدخول أولاً");
}
//#endregion Edit By AI

function json_response($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function fail($msg, $code = 400) {
    json_response(["ok" => false, "error" => $msg], $code);
}

function read_json_file($path, $default) {
    if (!file_exists($path)) return $default;
    $fp = fopen($path, "r");
    if (!$fp) return $default;
    flock($fp, LOCK_SH);
    $content = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode($content, true);
    return $data === null ? $default : $data;
}

function write_json_file($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $fp = fopen($path, "c+");
    if (!$fp) return false;
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function slugify_route($str) {
    $str = strtolower(trim($str));
    $str = preg_replace('/[^a-z0-9\-]+/', '-', $str);
    $str = preg_replace('/-+/', '-', $str);
    return trim($str, '-');
}

function ensure_dir($path) {
    if (!is_dir($path)) mkdir($path, 0775, true);
}

function detect_media_type($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $videoExts = ["mp4", "webm", "mov", "m4v"];
    if (in_array($ext, $videoExts)) return "video";
    return "image"; // covers jpg/png/gif/webp (gif/webp animated included)
}

$allowed_ext = ["jpg","jpeg","png","gif","webp","mp4","webm","mov","m4v"];

function is_allowed_ext($filename) {
    global $allowed_ext;
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, $allowed_ext);
}
