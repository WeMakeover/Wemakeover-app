/** Fisher–Yates shuffle (returns a new array). */
export function shuffleArray(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandom(items = [], count = 5) {
  return shuffleArray(items).slice(0, count);
}
