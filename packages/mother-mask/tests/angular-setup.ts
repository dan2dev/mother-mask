// Boots Angular's JIT compiler and test environment for plain Vitest (no
// Angular CLI `@angular/build:unit-test` builder involved). Equivalent to
// what the CLI-generated `zone-testing`/`test-setup` files do, minus zone.js
// — Angular runs TestBed zoneless when zone.js is absent from the run.
import '@angular/compiler'
import { getTestBed } from '@angular/core/testing'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting())
