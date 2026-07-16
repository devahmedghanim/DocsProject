<?php
//#region Edit By AI
if (!defined("ADMIN_CREDENTIALS_FILE")) {
    define("ADMIN_CREDENTIALS_FILE", dirname(__DIR__) . "/private/admin-credentials.json");
}

function start_admin_session() {
    if (session_status() === PHP_SESSION_NONE) {
        session_name("npms_admin");
        session_set_cookie_params([
            "httponly" => true,
            "samesite" => "Lax",
            "path" => "/",
        ]);
        session_start();
    }
}

function read_admin_credentials() {
    $defaults = [
        "user" => "Admin",
        "pass" => "P@ssw0rd4187",
    ];

    if (!is_file(ADMIN_CREDENTIALS_FILE)) {
        return $defaults;
    }

    $raw = file_get_contents(ADMIN_CREDENTIALS_FILE);
    $decoded = json_decode($raw ?: "", true);

    if (!is_array($decoded)) {
        return $defaults;
    }

    return [
        "user" => (string)($decoded["user"] ?? $defaults["user"]),
        "pass" => (string)($decoded["pass"] ?? $defaults["pass"]),
    ];
}

function is_admin_authenticated() {
    start_admin_session();
    return !empty($_SESSION["npms_admin_authenticated"]) && !empty($_SESSION["npms_admin_user"]);
}

function attempt_admin_login($username, $password) {
    $credentials = read_admin_credentials();

    if (!hash_equals($credentials["user"], (string)$username)) {
        return false;
    }

    if (!hash_equals($credentials["pass"], (string)$password)) {
        return false;
    }

    start_admin_session();
    session_regenerate_id(true);
    $_SESSION["npms_admin_authenticated"] = true;
    $_SESSION["npms_admin_user"] = $credentials["user"];

    return true;
}

function logout_admin() {
    start_admin_session();
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            "",
            time() - 42000,
            $params["path"],
            $params["domain"],
            (bool)$params["secure"],
            (bool)$params["httponly"]
        );
    }

    session_destroy();
}

function require_admin_auth_or_fail($message = "الرجاء تسجيل الدخول أولاً") {
    if (is_admin_authenticated()) {
        return;
    }

    if (function_exists("json_response")) {
        json_response(["ok" => false, "error" => $message], 401);
    }

    http_response_code(401);
    echo $message;
    exit;
}
//#endregion Edit By AI