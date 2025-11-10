import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Prevent flash of unstyled content (FOUC) by applying theme before page renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme-storage');
                  if (theme) {
                    const { state } = JSON.parse(theme);
                    if (state && state.theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {
                  console.error('Failed to load theme:', e);
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
