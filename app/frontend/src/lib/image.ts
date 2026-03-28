/**
 * Compresse une image côté navigateur et retourne un base64.
 * Résultat typique : 3MB → 60-100KB (facteur 30x).
 */
export interface CompressOptions {
  maxWidth?: number   // largeur max en pixels (défaut 800)
  maxHeight?: number  // hauteur max en pixels (défaut 800)
  quality?: number    // qualité JPEG 0-1 (défaut 0.72)
  maxSizeKB?: number  // taille cible max en KB (défaut 150)
}

export async function compressToBase64(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth  = 800,
    maxHeight = 800,
    quality   = 0.72,
    maxSizeKB = 150,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture fichier échouée'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Chargement image échoué'))
      img.onload = () => {
        // Calculer les nouvelles dimensions en conservant le ratio
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width  = Math.round(width  * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        // Compression progressive si la taille dépasse maxSizeKB
        let q = quality
        let base64 = canvas.toDataURL('image/jpeg', q)

        while (base64SizeKB(base64) > maxSizeKB && q > 0.2) {
          q -= 0.05
          base64 = canvas.toDataURL('image/jpeg', q)
        }

        resolve(base64)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Compresse plusieurs fichiers en parallèle.
 */
export async function compressMultiple(
  files: File[],
  options?: CompressOptions
): Promise<string[]> {
  return Promise.all(files.map(f => compressToBase64(f, options)))
}

/**
 * Calcule la taille approximative d'un base64 en KB.
 */
export function base64SizeKB(base64: string): number {
  // Retirer le header "data:image/jpeg;base64,"
  const base = base64.split(',')[1] ?? base64
  return Math.round((base.length * 3) / 4 / 1024)
}

/**
 * Vérifie qu'un fichier est bien une image et ne dépasse pas maxMB.
 */
export function validateImageFile(file: File, maxMB = 10): string | null {
  if (!file.type.startsWith('image/')) return 'Fichier non supporté (image requise)'
  if (file.size > maxMB * 1024 * 1024) return `Image trop lourde (max ${maxMB}MB)`
  return null
}
