/**
 * Raw Perlin noise function - DO NOT MODIFY
 * All transformations should be done through middleware functions
 * Returns values between -1 and 1
 */
export const perlinNoise = (() => {
  const permutation = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[permutation[i], permutation[j]] = [permutation[j], permutation[i]]
  }
  const p = [...permutation, ...permutation]

  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (t: number, a: number, b: number): number => a + t * (b - a)
  const grad = (hash: number, x: number, y: number): number => {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = fade(x)
    const v = fade(y)
    const A = p[X] + Y
    const AA = p[A]
    const AB = p[A + 1]
    const B = p[X + 1] + Y
    const BA = p[B]
    const BB = p[B + 1]

    return lerp(v,
      lerp(u, grad(p[AA], x, y), grad(p[BA], x - 1, y)),
      lerp(u, grad(p[AB], x, y - 1), grad(p[BB], x - 1, y - 1))
    )
  }
})()

/**
 * Raw Simplex noise function - DO NOT MODIFY
 * All transformations should be done through middleware functions
 * Returns values between -1 and 1
 */
export const simplexNoise = (() => {
  const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ]

  const perm = Array.from({ length: 512 }, () => Math.floor(Math.random() * 256))
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6

  return (x: number, y: number): number => {
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0

    let i1: number, j1: number
    if (x0 > y0) {
      i1 = 1
      j1 = 0
    } else {
      i1 = 0
      j1 = 1
    }

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255
    const gi0 = perm[ii + perm[jj]] % 12
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12

    const dot = (g: number[], x: number, y: number): number => g[0] * x + g[1] * y

    const t0 = 0.5 - x0 * x0 - y0 * y0
    const n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * dot(grad3[gi0], x0, y0)

    const t1 = 0.5 - x1 * x1 - y1 * y1
    const n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * dot(grad3[gi1], x1, y1)

    const t2 = 0.5 - x2 * x2 - y2 * y2
    const n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * dot(grad3[gi2], x2, y2)

    return 70 * (n0 + n1 + n2)
  }
})()

/**
 * Raw Voronoi noise function - DO NOT MODIFY
 * All transformations should be done through middleware functions
 * Returns distance to nearest point
 */
export const voronoiNoise = (x: number, y: number, points: Array<[number, number]>): number => {
  let minDist = Infinity
  let secondMinDist = Infinity

  for (const [px, py] of points) {
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
    if (dist < minDist) {
      secondMinDist = minDist
      minDist = dist
    } else if (dist < secondMinDist) {
      secondMinDist = dist
    }
  }

  return secondMinDist - minDist
}

export const generateVoronoiPoints = (count: number, width: number, height: number): Array<[number, number]> => {
  return Array.from({ length: count }, () => [
    Math.random() * width,
    Math.random() * height
  ])
}