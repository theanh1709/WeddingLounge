export function shuffle(list) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function range(count, start = 1) {
  return Array.from({ length: count }, (_, index) => index + start)
}

export function generateLotoCard() {
  const start = Math.floor(Math.random() * 86) + 1
  const guaranteed = range(5, start)
  const pool = range(90).filter(
    (value) => value < start || value > start + 4,
  )
  const numbers = shuffle([...guaranteed, ...shuffle(pool).slice(0, 40)])
  const rows = []
  for (let i = 0; i < 9; i += 1) {
    const row = numbers.slice(i * 5, i * 5 + 5).sort((a, b) => a - b)
    rows.push(row)
  }
  return rows
}
