const { spawn } = require('child_process')
const electronPath = require('electron')

const startUrl = process.argv[2]
const env = { ...process.env }

delete env.ELECTRON_RUN_AS_NODE

if (startUrl) {
  env.ELECTRON_START_URL = startUrl
}

const child = spawn(electronPath, ['.'], {
  env,
  shell: false,
  stdio: 'inherit',
  windowsHide: false,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
