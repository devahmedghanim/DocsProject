<?php
require_once __DIR__ . "/utils.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Method not allowed", 405);
//#region Edit By AI
require_admin_api_auth();

$guide_id = trim($_POST["id"] ?? "");
$is_update = $guide_id !== "";
//#endregion Edit By AI

$route = slugify_route($_POST["route"] ?? "");
$number = intval($_POST["number"] ?? 0);
$title_ar = trim($_POST["title_ar"] ?? "");
$title_en = trim($_POST["title_en"] ?? "");
$desc_ar = trim($_POST["desc_ar"] ?? "");
$desc_en = trim($_POST["desc_en"] ?? "");

if ($route === "") fail("قسم غير صالح");
if ($number <= 0) fail("رقم الدليل مطلوب");
if ($title_ar === "" || $desc_ar === "") fail("العنوان والشرح بالعربي مطلوبان على الأقل");

$sections = read_json_file(DATA_DIR . "/sections.json", []);
$sectionExists = false;
foreach ($sections as $s) { if ($s["route"] === $route) { $sectionExists = true; break; } }
if (!$sectionExists) fail("القسم غير موجود");

$guidesPath = GUIDES_DIR . "/{$route}.json";
$guides = read_json_file($guidesPath, []);

//#region Edit By AI
$existingIndex = -1;
$existingGuide = null;

if ($is_update) {
    foreach ($guides as $index => $guide) {
        if ((string)($guide["id"] ?? "") === $guide_id) {
            $existingIndex = $index;
            $existingGuide = $guide;
            break;
        }
    }

    if ($existingIndex < 0) fail("الدليل المطلوب تعديله غير موجود");
}

$id = $is_update ? $guide_id : uniqid();
$guideDir = UPLOADS_DIR . "/{$route}/{$id}";
$media = $is_update && !empty($existingGuide["media"]) && is_array($existingGuide["media"])
    ? $existingGuide["media"]
    : [];
//#endregion Edit By AI

foreach (["ar", "en"] as $lang) {
    $fieldName = "media_{$lang}";
    if (isset($_FILES[$fieldName]) && $_FILES[$fieldName]["error"] === UPLOAD_ERR_OK) {
        $file = $_FILES[$fieldName];
        if (!is_allowed_ext($file["name"])) {
            fail("صيغة الملف غير مدعومة (يسمح بصور: jpg/png/gif/webp أو فيديو: mp4/webm/mov)");
        }
        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        $langDir = "{$guideDir}/{$lang}";
        ensure_dir($langDir);
        //#region Edit By AI
        foreach (glob($langDir . "/*") ?: [] as $existingFile) {
            if (is_file($existingFile)) {
                @unlink($existingFile);
            }
        }
        //#endregion Edit By AI
        $destName = "media." . $ext;
        $destPath = "{$langDir}/{$destName}";
        if (!move_uploaded_file($file["tmp_name"], $destPath)) {
            fail("تعذر رفع الملف ({$lang})", 500);
        }
        $relPath = "uploads/{$route}/{$id}/{$lang}/{$destName}";
        $media[$lang] = ["type" => detect_media_type($destName), "src" => $relPath];
    }
}

$newGuide = [
    "id" => $id,
    "number" => $number,
    "title" => ["ar" => $title_ar, "en" => $title_en],
    "desc" => ["ar" => $desc_ar, "en" => $desc_en],
    "media" => $media,
];

//#region Edit By AI
if ($is_update) {
    $guides[$existingIndex] = $newGuide;
} else {
    $guides[] = $newGuide;
}
//#endregion Edit By AI

if (!write_json_file($guidesPath, $guides)) fail("تعذر حفظ بيانات الدليل على الخادم", 500);

//#region Edit By AI
json_response(["ok" => true, "guide" => $newGuide, "updated" => $is_update]);
//#endregion Edit By AI
