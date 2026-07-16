<?php
//#region Edit By AI
$requestPath = urldecode(parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH) ?? "/");
$fullPath = __DIR__ . $requestPath;
$adminRoutes = ["/PrivateSettings", "/PrivateSettings/", "/admin", "/admin/", "/admin/index.html"];

if (preg_match('#^/private(?:/|$)#', $requestPath)) {
    http_response_code(404);
    exit;
}

if (in_array($requestPath, $adminRoutes, true)) {
    require __DIR__ . "/admin/portal.php";
    return true;
}

if ($requestPath !== "/" && file_exists($fullPath) && !is_dir($fullPath)) {
    return false;
}

if ($requestPath !== "/" && is_dir($fullPath)) {
    return false;
}

header("Content-Type: text/html; charset=UTF-8");
readfile(__DIR__ . "/index.html");
return true;
//#endregion Edit By AI