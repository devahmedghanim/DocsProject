<?php
require_once __DIR__ . "/utils.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Method not allowed", 405);
//#region Edit By AI
require_admin_api_auth();
//#endregion Edit By AI

$route = slugify_route($_POST["route"] ?? "");
$id = trim($_POST["id"] ?? "");

if ($route === "" || $id === "") fail("بيانات غير صالحة");

$guidesPath = GUIDES_DIR . "/{$route}.json";
$guides = read_json_file($guidesPath, []);

$found = false;
$remaining = [];
foreach ($guides as $g) {
    if ($g["id"] === $id) { $found = true; continue; }
    $remaining[] = $g;
}

if (!$found) fail("الدليل غير موجود");

if (!write_json_file($guidesPath, $remaining)) fail("تعذر حذف الدليل", 500);

// best-effort cleanup of uploaded files
$guideDir = UPLOADS_DIR . "/{$route}/{$id}";
if (is_dir($guideDir)) {
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($guideDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $file) {
        $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
    }
    rmdir($guideDir);
}

json_response(["ok" => true]);
