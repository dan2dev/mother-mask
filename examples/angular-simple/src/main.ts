import '@angular/compiler'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideZonelessChangeDetection } from '@angular/core'
import { App } from './App'
import './style.css'

bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
}).catch((error) => console.error(error))
