import { Html, Head, Main, NextScript } from 'next/document';

// Blocking script to prevent theme flash - runs before React hydration
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme-storage');
    var theme = stored ? JSON.parse(stored).state.theme : 'light';
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add('light');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/logo-icon.svg" />
        <meta name="theme-color" content="#1e3a5f" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
