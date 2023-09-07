import './index.css'
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

declare global {
  interface Window {
    api?: any
  }
}

export default app
