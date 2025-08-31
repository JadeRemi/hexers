export const SPRITES = {
  wizards: {
    wizard1: {
      path: '/assets/wizard1.png',
      width: 192,
      height: 192
    },
    wizard2: {
      path: '/assets/wizard2.png',
      width: 192,
      height: 192
    },
    wizard3: {
      path: '/assets/wizard3.png',
      width: 192,
      height: 192
    },
    wizard4: {
      path: '/assets/wizard4.png',
      width: 192,
      height: 192
    },
    wizard5: {
      path: '/assets/wizard5.png',
      width: 192,
      height: 192
    }
  }
} as const

export type SpriteAsset = typeof SPRITES.wizards[keyof typeof SPRITES.wizards]

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}