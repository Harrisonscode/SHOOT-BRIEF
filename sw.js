<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline — Shoot Brief</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d0d;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { color: rgba(255,255,255,0.5); font-size: 15px; line-height: 1.6; max-width: 300px; margin: 0 auto 24px; }
    button {
      background: #4f8a1f;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div>
    <div class="icon">📷</div>
    <h1>You're offline</h1>
    <p>Connect to the internet to access your shoots and plan with Shoot Brief.</p>
    <button onclick="window.location.reload()">Try again</button>
  </div>
</body>
</html>
