<?php
require_once __DIR__ . "/../lib/admin_auth.php";

//#region Edit By AI
start_admin_session();

if (isset($_GET["logout"])) {
    logout_admin();
    header("Location: /PrivateSettings");
    exit;
}

$errorMessage = "";
$submittedUsername = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $submittedUsername = trim((string)($_POST["username"] ?? ""));
    $password = (string)($_POST["password"] ?? "");

    if (attempt_admin_login($submittedUsername, $password)) {
        header("Location: /PrivateSettings");
        exit;
    }

    $errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة";
}

if (is_admin_authenticated()) {
    header("Content-Type: text/html; charset=UTF-8");
    readfile(__DIR__ . "/index.html");
    exit;
}

header("Content-Type: text/html; charset=UTF-8");
?>
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>تسجيل دخول الإدارة | Nexus PMS</title>
    <base href="/admin/" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../assets/css/style.css" />
    <link rel="stylesheet" href="admin.css" />
  </head>
  <body class="admin-login-page">
    <div class="topbar">
      <div class="brand">
        <span class="logo-dot"></span> Nexus PMS
        <span class="sub">| تسجيل دخول الإدارة</span>
      </div>
      <div class="tools">
        <a href="/" class="home-btn">🌐 العودة للموقع</a>
      </div>
    </div>

    <main class="login-shell">
      <section class="login-card">
        <div class="login-badge">🔐</div>
        <h1>تسجيل الدخول إلى لوحة التحكم</h1>
        <p>أدخل بيانات حساب الإدارة للوصول إلى إدارة الأقسام والأدلة.</p>

        <?php if ($errorMessage !== ""): ?>
        <div class="login-alert" role="alert"><?php echo htmlspecialchars($errorMessage, ENT_QUOTES, "UTF-8"); ?></div>
        <?php endif; ?>

        <form class="login-form" method="post" action="/PrivateSettings">
          <div>
            <label for="username">اسم المستخدم</label>
            <input
              id="username"
              name="username"
              type="text"
              value="<?php echo htmlspecialchars($submittedUsername, ENT_QUOTES, "UTF-8"); ?>"
              autocomplete="username"
              required
            />
          </div>

          <div>
            <label for="password">كلمة المرور</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <button type="submit" class="btn-primary login-submit">دخول لوحة التحكم</button>
        </form>

        <div class="login-meta">يتم التحقق من بيانات الدخول من ملف JSON مخصص للإدارة.</div>
      </section>
    </main>
  </body>
</html>
<?php
//#endregion Edit By AI