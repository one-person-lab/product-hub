import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin, type Connect } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DOCS as DOCS_ROOT } from './config/sources.mjs'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/**
 * 把 /prototypes/* 映射到 config/sources.mjs 里 DOCS 指向的目录，供原型库 iframe 内嵌。
 * 这样不必把原型资源复制进本仓库，文档仓库仍是唯一真源。
 * dev 与 preview 都挂载；生产构建时该工作台按内部工具使用（dev/preview）。
 */
function docsStatic(): Plugin {
  const handler = (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    const filePath = path.join(DOCS_ROOT, urlPath)
    if (!filePath.startsWith(DOCS_ROOT)) return next()
    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) return next()
      res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream')
      fs.createReadStream(filePath).pipe(res)
    })
  }
  return {
    name: 'docs-static',
    configureServer(server) {
      server.middlewares.use('/prototypes', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/prototypes', handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), docsStatic()],
})
