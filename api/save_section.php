<?php
require_once __DIR__ . "/utils.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Method not allowed", 405);
//#region Edit By AI
require_admin_api_auth();

$original_route = slugify_route($_POST["original_route"] ?? "");
$is_update = $original_route !== "";
//#endregion Edit By AI

$route = slugify_route($_POST["route"] ?? "");
$icon = trim($_POST["icon"] ?? "📄");
$title_ar = trim($_POST["title_ar"] ?? "");
$title_en = trim($_POST["title_en"] ?? "");
$desc_ar = trim($_POST["desc_ar"] ?? "");
$desc_en = trim($_POST["desc_en"] ?? "");

if ($route === "") fail("الرجاء إدخال Route صحيح (أحرف إنجليزية وأرقام وشرطات فقط)");
if ($title_ar === "" || $title_en === "") fail("عنوان القسم مطلوب باللغتين");
if (in_array($route, ["api", "data", "uploads", "admin", "assets", "privatesettings", "private"])) {
    fail("هذا الاسم محجوز، الرجاء اختيار Route آخر");
}

$sectionsPath = DATA_DIR . "/sections.json";
$sections = read_json_file($sectionsPath, []);

//#region Edit By AI
$existingIndex = -1;

foreach ($sections as $index => $section) {
    if ($is_update && $section["route"] === $original_route) {
        $existingIndex = $index;
    }

    if ($section["route"] === $route && (!$is_update || $section["route"] !== $original_route)) {
        fail("يوجد قسم بنفس الـ Route بالفعل");
    }
}

if ($is_update) {
    if ($existingIndex < 0) fail("القسم المطلوب تعديله غير موجود");

    $existingSection = $sections[$existingIndex];
    $updatedSection = [
        "id" => $route,
        "route" => $route,
        "icon" => $icon !== "" ? $icon : "📄",
        "order" => $existingSection["order"] ?? ($existingIndex + 1),
        "title" => ["ar" => $title_ar, "en" => $title_en],
        "desc" => ["ar" => $desc_ar, "en" => $desc_en],
    ];

    $routeChanged = $route !== $original_route;
    $oldGuidesPath = GUIDES_DIR . "/{$original_route}.json";
    $newGuidesPath = GUIDES_DIR . "/{$route}.json";
    $oldUploadsDir = UPLOADS_DIR . "/{$original_route}";
    $newUploadsDir = UPLOADS_DIR . "/{$route}";
    $uploadsRenamed = false;

    if ($routeChanged) {
        $guides = read_json_file($oldGuidesPath, []);
        foreach ($guides as &$guide) {
            if (empty($guide["media"]) || !is_array($guide["media"])) continue;
            foreach ($guide["media"] as $lang => $media) {
                $src = $media["src"] ?? "";
                if (!is_string($src) || $src === "") continue;
                $guide["media"][$lang]["src"] = preg_replace(
                    '#^uploads/' . preg_quote($original_route, '#') . '/#',
                    "uploads/{$route}/",
                    $src
                );
            }
        }
        unset($guide);

        if (!write_json_file($newGuidesPath, $guides)) {
            fail("تعذر تحديث ملف الأدلة الخاص بالقسم", 500);
        }

        if (file_exists($newUploadsDir)) {
            @unlink($newGuidesPath);
            fail("يوجد مجلد وسائط مرتبط بهذا الـ Route بالفعل");
        }

        if (is_dir($oldUploadsDir)) {
            if (!@rename($oldUploadsDir, $newUploadsDir)) {
                @unlink($newGuidesPath);
                fail("تعذر تحديث مسار الوسائط الخاص بالقسم", 500);
            }
            $uploadsRenamed = true;
        }
    }

    $sections[$existingIndex] = $updatedSection;

    if (!write_json_file($sectionsPath, $sections)) {
        if ($routeChanged) {
            if ($uploadsRenamed && is_dir($newUploadsDir) && !is_dir($oldUploadsDir)) {
                @rename($newUploadsDir, $oldUploadsDir);
            }
            if (file_exists($newGuidesPath) && $newGuidesPath !== $oldGuidesPath) {
                @unlink($newGuidesPath);
            }
        }
        fail("تعذر حفظ بيانات القسم على الخادم", 500);
    }

    if ($routeChanged && file_exists($oldGuidesPath) && $oldGuidesPath !== $newGuidesPath) {
        @unlink($oldGuidesPath);
    }

    json_response(["ok" => true, "section" => $updatedSection, "updated" => true]);
}
//#endregion Edit By AI

$newSection = [
    "id" => $route,
    "route" => $route,
    "icon" => $icon !== "" ? $icon : "📄",
    "order" => count($sections) + 1,
    "title" => ["ar" => $title_ar, "en" => $title_en],
    "desc" => ["ar" => $desc_ar, "en" => $desc_en],
];

$sections[] = $newSection;

if (!write_json_file($sectionsPath, $sections)) fail("تعذر حفظ بيانات القسم على الخادم", 500);

// create empty guides file + uploads folder for this section
write_json_file(GUIDES_DIR . "/{$route}.json", []);
ensure_dir(UPLOADS_DIR . "/{$route}");

json_response(["ok" => true, "section" => $newSection]);
