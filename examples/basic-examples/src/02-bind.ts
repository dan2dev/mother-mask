import './style.css'
import { bind } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>bind()</h1>
  <p class="subtitle">
    Attaches a live mask to an <code>&lt;input&gt;</code> element. Handles keyboard events,
    paste, and caret positioning automatically. Calling it twice on the same element is safe (idempotent).
    <br><code>bind(input: HTMLInputElement, mask: MaskPattern): void</code>
  </p>

  <div class="card">
    <div class="field">
      <label for="cpf">CPF</label>
      <input id="cpf" placeholder="000.000.000-00" inputmode="numeric" />
      <p class="hint"><code>bind(input, '999.999.999-99')</code></p>
    </div>
    <div class="field">
      <label for="cnpj">CNPJ alfanumérico</label>
      <input id="cnpj" placeholder="AA.AAA.AAA/AAAA-99" inputmode="text" style="text-transform:uppercase" />
      <p class="hint"><code>bind(input, 'AA.AAA.AAA/AAAA-99')</code> — dígitos ou letras nas posições base</p>
    </div>
    <div class="field">
      <label for="date">Date</label>
      <input id="date" placeholder="DD/MM/YYYY" inputmode="numeric" />
      <p class="hint"><code>bind(input, '99/99/9999')</code></p>
    </div>
    <div class="field">
      <label for="cep">CEP</label>
      <input id="cep" placeholder="00000-000" inputmode="numeric" />
      <p class="hint"><code>bind(input, '99999-999')</code></p>
    </div>
    <div class="field">
      <label for="plate">License plate</label>
      <input id="plate" placeholder="ABC-1234" style="text-transform:uppercase" />
      <p class="hint"><code>bind(input, 'ZZZ-9999')</code></p>
    </div>
  </div>
</div>
`

bind(document.querySelector<HTMLInputElement>('#cpf')!,   '999.999.999-99')
bind(document.querySelector<HTMLInputElement>('#cnpj')!,  'AA.AAA.AAA/AAAA-99')
bind(document.querySelector<HTMLInputElement>('#date')!,  '99/99/9999')
bind(document.querySelector<HTMLInputElement>('#cep')!,   '99999-999')
bind(document.querySelector<HTMLInputElement>('#plate')!, 'ZZZ-9999')
