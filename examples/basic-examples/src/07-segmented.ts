import './style.css'
import { bind } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>Segmented masks (default)</h1>
  <p class="subtitle">
    Every mask treats its literal separators as hard boundaries between independent
    fields by default: selecting a field and typing a shorter or longer replacement
    stays scoped to that field — it never bleeds digits into a neighboring one.
    Pass <code>segmented: false</code> to opt into the classic flat/reflow behavior
    instead, where deleting or replacing characters anywhere shifts everything
    after it to close the gap.
    <br><code>bind(input, mask, { segmented: false })</code>
  </p>

  <h2>Try it: select "12" (the month) below and type over it</h2>
  <div class="card">
    <div class="field">
      <label for="date-segmented">Date — default (<code>segmented: true</code>)</label>
      <input id="date-segmented" placeholder="DD/MM/YYYY" inputmode="numeric" value="25/12/2025" />
      <p class="hint"><code>bind(input, '99/99/9999')</code> — day and year stay put</p>
    </div>
    <div class="field">
      <label for="date-flat"><code>segmented: false</code> (legacy reflow)</label>
      <input id="date-flat" placeholder="DD/MM/YYYY" inputmode="numeric" value="25/12/2025" />
      <p class="hint"><code>bind(input, '99/99/9999', { segmented: false })</code> — type a single digit over "12" and watch the year get pulled forward</p>
    </div>
  </div>

  <h2>Another independent-fields example: time</h2>
  <div class="card">
    <div class="field">
      <label for="time">Time (HH:MM)</label>
      <input id="time" placeholder="HH:MM" inputmode="numeric" value="14:30" />
      <p class="hint"><code>bind(input, '99:99')</code> — select the minutes and retype without disturbing the hour</p>
    </div>
  </div>
</div>
`

bind(document.querySelector<HTMLInputElement>('#date-segmented')!, '99/99/9999')
bind(document.querySelector<HTMLInputElement>('#date-flat')!, '99/99/9999', { segmented: false })
bind(document.querySelector<HTMLInputElement>('#time')!, '99:99')
