<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recruiting-Cockpit</title>
  <meta name="theme-color" content="#1f4f8f" />
  <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png" />
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png" />
  <link rel="manifest" href="manifest.json" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
  <script>
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
    }
  </script>
</body>
</html>
