import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-EN',
  title: "One Beyond's AI Pills",
  base: '/ai-pills/',
  description: "Quick and clear tips related to Artificial Intelligence",
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Pills', link: '/pills/' },
      { text: 'Contribute', link: '/contribute'},
      { text: 'Team', link: '/contributors' },
      { text: 'AI Resources', link: 'https://one-beyond.notion.site/AI-Resources-553724a73e5943ddb469d52c846acf7d'},
    ],
    sidebar: {
      '/pills/': [
        {
          text: 'AI Pills',
          items: [
            { text: '', link: ''}
          ]
        }
      ]
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present One Beyond.'
    }
  }
})

