export default {
  root: './src',
  server: {
    allowedHosts: ['fanhub-production.up.railway.app'],
  },
  preview: {
    allowedHosts: ['fanhub-production.up.railway.app'],
  },
  build: {
    outDir: '../dist',
  },
  publicDir: '../public'
}
