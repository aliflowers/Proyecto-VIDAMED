import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcSrc = path.resolve(__dirname, '../../src')
const dstSrc = path.resolve(__dirname, '../src')
const srcPublic = path.resolve(__dirname, '../../public')
const dstPublic = path.resolve(__dirname, '../public')

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function copyDir(from, to) {
  try {
    const entries = await fs.readdir(from, { withFileTypes: true })
    await ensureDir(to)
    for (const entry of entries) {
      const srcPath = path.join(from, entry.name)
      const dstPath = path.join(to, entry.name)
      if (entry.isDirectory()) {
        await copyDir(srcPath, dstPath)
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, dstPath)
      }
    }
  } catch (err) {
    console.warn(`No se pudo copiar desde ${from}: ${err.message}`)
  }
}

async function main() {
  // Copiar ../src -> ./src
  await copyDir(srcSrc, dstSrc)
  // Copiar ../public -> ./public
  await copyDir(srcPublic, dstPublic)
}

main().catch(err => {
  console.error('Error en prebuild de web2:', err)
  process.exit(1)
})
