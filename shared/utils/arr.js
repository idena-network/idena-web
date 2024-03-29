export const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
}

export const shuffle = arr => {
  let currentIndex = arr.length
  let temporaryValue
  let randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = arr[currentIndex]
    arr[currentIndex] = arr[randomIndex]
    arr[randomIndex] = temporaryValue
  }

  return arr
}

export const reorderList = (list, nextOrder) => {
  const nextList = []
  nextOrder.forEach(ord => {
    nextList.push(list[ord])
  })
  return nextList
}

export function areSame(arr1, arr2) {
  const b = new Set(arr2)
  return arr1.every(x => b.has(x)) && arr1.length === arr2.length
}

export function areEqual(arr1, arr2) {
  if (!arr1 || !arr2) return false

  if (arr1.length !== arr2.length) return false

  // eslint-disable-next-line no-plusplus
  for (let i = 0, l = arr1.length; i < l; i++) {
    if (arr1[i] instanceof Array && arr2[i] instanceof Array) {
      if (!areEqual(arr1[i], arr2[i])) return false
    } else if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  return true
}

export function areEqualExceptOne(arr1, arr2, ignoreId) {
  const newArr1 = [...arr1]
  const newArr2 = [...arr2]
  const ignoreIdx1 = arr1.findIndex(x => x === ignoreId)
  const ignoreIdx2 = arr2.findIndex(x => x === ignoreId)
  newArr1.splice(ignoreIdx1, 1)
  newArr2.splice(ignoreIdx2, 1)

  return areEqual(newArr1, newArr2)
}
