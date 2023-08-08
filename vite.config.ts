import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

import { spawn } from 'child_process'
import { resolve } from 'path'

let electronProcess = null

// https://vitejs.dev/config/
export default defineConfig({
  base: resolve(__dirname, './dist'),
  build: {
    watch: {
      include: 'src/**',
    },
  },
  plugins: [
    svelte(),
    {
      name: 'watch-electron',
      buildStart() {
        // kill electron to restart at the end of build
        if (electronProcess) {
          electronProcess.removeAllListeners('exit')
          electronProcess.kill()
          electronProcess = null
        }
        //additionally, watch electrons main and preload files
        this.addWatchFile(resolve(__dirname, 'main.ts'))
        this.addWatchFile(resolve(__dirname, 'preload.ts'))
      },
    },
    {
      name: 'start-electron',
      closeBundle: () => {
        // start electron after build is finished
        electronProcess = spawn('npm', ['run', 'electron:start'])
        // get console output for electron process
        electronProcess.stdout.on('data', (data: any) => {
          console.log(`${data}`)
        })
      },
    },
  ],
})
