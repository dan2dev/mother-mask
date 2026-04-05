import './style.css'
import { process } from 'mother-mask'

const examples = [
  { label: 'CPF',          raw: '12345678901',    mask: '999.999.999-99'      },
  // CNPJ alfanumérico (Receita Federal): 12 base + 2 dígitos verificadores; máscara com slots A.
  { label: 'CNPJ (alfa)',  raw: '1AB2C3D45E6F78', mask: 'AA.AAA.AAA/AAAA-99' },
  { label: 'Date',         raw: '25122025',       mask: '99/99/9999'          },
  { label: 'CEP',          raw: '01310100',       mask: '99999-999'           },
  { label: 'Phone',        raw: '11987654321',    mask: '(99) 99999-9999'     },
  { label: 'Plate',        raw: 'ABC1234',        mask: 'ZZZ-9999'            },
  { label: 'Mercosul',     raw: 'ABC1D23',        mask: 'ZZZ-9Z99'            },
  { label: 'Credit card',  raw: '4111111111111111', mask: '9999 9999 9999 9999' },
]

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>process()</h1>
  <p class="subtitle">
    Pure function — applies a mask pattern to a raw string. No DOM, no side effects.
    <br><code>process(value: string, mask: MaskPattern): string</code>
  </p>

  <div class="card">
    <table class="results">
      <thead>
        <tr>
          <th></th>
          <th>raw</th>
          <th>mask</th>
          <th>result</th>
        </tr>
      </thead>
      <tbody>
        ${examples.map(ex => `
        <tr>
          <td class="col-label">${ex.label}</td>
          <td>${ex.raw}</td>
          <td>${ex.mask}</td>
          <td class="col-result">${process(ex.raw, ex.mask)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <h2>Live playground</h2>
  <div class="card">
    <div class="field">
      <label for="raw">Raw value</label>
      <input id="raw" placeholder="type digits or letters…" />
    </div>
    <div class="field">
      <label for="mask-pat">Mask pattern &nbsp;<span class="badge">9 = digit &nbsp; Z = letter &nbsp; A = alphanumeric</span></label>
      <input id="mask-pat" value="999.999.999-99" />
    </div>
    <div class="output" id="live-out">—</div>
  </div>
</div>
`

const rawEl = document.querySelector<HTMLInputElement>('#raw')!
const maskEl = document.querySelector<HTMLInputElement>('#mask-pat')!
const outEl  = document.querySelector<HTMLDivElement>('#live-out')!

function refresh() {
  const result = process(rawEl.value, maskEl.value)
  outEl.innerHTML = result ? `<strong>${result}</strong>` : '—'
}

rawEl.addEventListener('input', refresh)
maskEl.addEventListener('input', refresh)
