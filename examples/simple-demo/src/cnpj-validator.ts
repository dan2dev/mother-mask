export function validarCNPJ(cnpj: string): boolean {
  const v = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (v.length !== 14 || /^(\w)\1+$/.test(v)) return false
  const val = (c: string) => c.charCodeAt(0) - 48
  const digit = (s: string, w: number[]) => {
    const r = s.split('').reduce((sum, c, i) => sum + val(c) * w[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return (
    digit(v.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(v[12]) &&
    digit(v.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(v[13])
  )
}
