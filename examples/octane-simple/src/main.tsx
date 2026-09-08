import { createRoot } from 'octane'
import { App } from './App'
import './style.css'

const container = document.getElementById('app')!
const root = createRoot(container)
root.render(App, {})
