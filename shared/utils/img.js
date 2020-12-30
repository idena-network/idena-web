export const imageResize = async (imgUrl, width, height) =>
  new Promise((resolve, reject) => {
    if (!imgUrl) {
      resolve()
    }
    try {
      const img = document.createElement('img')

      img.onload = function() {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = width
        canvas.height = height

        ctx.drawImage(this, 0, 0, width, height)
        const dataURI = canvas.toDataURL()
        resolve(dataURI)
      }

      img.onerror = reject

      img.src = imgUrl
    } catch (e) {
      reject(e.message)
    }
  })

export const imageResizeSoft = async (
  imgUrl,
  maxWidth = 400,
  maxHeight = 300,
  softResize = true
) =>
  new Promise((resolve, reject) => {
    if (!imgUrl) {
      resolve()
    }
    try {
      const img = document.createElement('img')

      img.onload = function() {
        const {width, height} = img

        const {newWidth, newHeight} = resizing(
          width,
          height,
          maxWidth,
          maxHeight,
          softResize
        )

        // resize
        if (width > maxWidth || height > maxHeight || !softResize) {
          return imageResize(imgUrl, newWidth, newHeight)
            .then(resolve)
            .catch(reject)
        }
        return resolve(imgUrl)
      }

      img.onerror = reject

      img.src = imgUrl
    } catch (e) {
      return reject(e.message)
    }
  })

export function resizing(
  width,
  height,
  maxWidth = 440,
  maxHeight = 330,
  softResize = true // no resize for small image
) {
  const ratio = height > 0 ? width / height : 1

  if (width > maxWidth || height > maxHeight) {
    const newWidth = width > height ? maxWidth : maxHeight * ratio
    const newHeight = width < height ? maxHeight : maxWidth / ratio
    return {newWidth, newHeight}
  }
  if (!softResize) {
    const newWidth = maxWidth / maxHeight < ratio ? maxWidth : maxHeight * ratio
    const newHeight =
      maxWidth / maxHeight > ratio ? maxHeight : maxWidth / ratio
    return {newWidth, newHeight}
  }
  return {width, height}
}

// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const imageTypes = [
  'image/apng',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/webp',
  'image/x-icon',
]

export function hasImageType(file) {
  return imageTypes.includes(file.type)
}
