import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

const procs = [
  ['server', spawn(process.execPath, [path.join(root, 'server', 'index.js')], { cwd: root })],
  ['client', spawn(process.execPath, [viteBin], { cwd: root })]
]

for (const [name, p] of procs) {
  p.stdout.on('data', d => process.stdout.write(`[${name}] ${d}`))
  p.stderr.on('data', d => process.stderr.write(`[${name}] ${d}`))
  p.on('exit', code => {
    if (code !== null && code !== 0) process.stderr.write(`[${name}] exited with code ${code}\n`)
  })
}

process.on('SIGINT', () => {
  procs.forEach(([, p]) => p.kill())
  process.exit(0)
})
