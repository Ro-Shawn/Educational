<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUBHA AARAMBHA YUBA SAMUHA | Financial Management System</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>

  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <script type="text/babel" data-presets="react" src="app.js"></script>

  <script type="text/babel" data-presets="react">
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      React.createElement(React.StrictMode, null,
        React.createElement(ToastProvider, null,
          React.createElement(AuthProvider, null,
            React.createElement(App)
          )
        )
      )
    );
  </script>
</body>
</html>
