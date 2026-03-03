export default {
  root: './src',
  server: {
    allowedHosts: ['fanhub-deployment-production.up.railway.app'],
  },
  preview: {
    allowedHosts: ['fanhub-deployment-production.up.railway.app'],
  },
  build: {
    outDir: '../dist',
  },
  publicDir: '../public'
}

