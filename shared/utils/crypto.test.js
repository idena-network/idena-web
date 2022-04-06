import {
  generateFlipKey,
  decryptMessage,
  serializeAnswers,
  generateShortAnswersSalt,
  privateKeyToAddress,
  signMessage,
  checkSignature,
  dnaSign,
} from './crypto'
import {toHexString} from './buffers'
import {FlipGrade} from '../types'

describe('generate keys', () => {
  const key = 'c6fccb1b926e774d7e3a1716eddeba55ae7d40db4fb7c22d2705835f48d5be1b'
  it('generate public flip key', () => {
    expect(toHexString(generateFlipKey(true, 1, key))).toBe(
      'ceed7ca1d3a03e990a9550120773691018d602944c16029de0e83254c33abb34'
    )
    expect(toHexString(generateFlipKey(true, 55, key))).toBe(
      '2492cf307edbae487973c61d5b6d4a0ec253383f4e3bdd0e59b7a1bb86cbfaa5'
    )
    expect(toHexString(generateFlipKey(true, 10000, key))).toBe(
      '34e79fdcb429f36967dbc54b43a85639f38cf8799ef6122f4e7ab35484147348'
    )
  })

  it('generate private flip key', () => {
    expect(toHexString(generateFlipKey(false, 1, key))).toBe(
      'adb761bcb88bcbe0f3001959be24a95c17975eae92ed042fa065ad1c3b056f27'
    )
    expect(toHexString(generateFlipKey(false, 14, key))).toBe(
      '0f88aee8cdc0bc87bcf2e8d9d213b28db6afe3931e07691bb5d9f42b92410202'
    )
    expect(toHexString(generateFlipKey(false, 567, key))).toBe(
      'ead91a59277d2846f437fdbf01651059aaa7a4dbadfbd366da5eef634028fa73'
    )
  })
})

describe('decrypt data', () => {
  const key1 =
    'ceed7ca1d3a03e990a9550120773691018d602944c16029de0e83254c33abb34'
  const key2 =
    'adb761bcb88bcbe0f3001959be24a95c17975eae92ed042fa065ad1c3b056f27'

  const data1 =
    '04f8391c8dcf65eb812a03db751ca3faeae7237badbd42082c459212d6cea24f268d56dc6547b9d84922db48656028777d691dcbf1786e3a17983dc3b8ef23fba0f3a9bd5c45861f45e40e975b6daafce28f32a8c2bf4712ba4a990d1a1ea2154bcebc583ba50b47c969754b881cadf20aab6979'
  const data2 =
    '04636dc36816d7782765289d82fae73a7412075705ce1e41e478c59367aa2367a24ce73a6f8b2a1117666934928cc100d35f4f8fdc6601ac6dbb11e4fe5d1f982c9759d031c56e7a785a4861a8c2a63325532723f18ab9e0da9da05c98a4f4bd348dd2dc780d738f4495643f7ad1754595a86c4e'

  it('decrypt flip parts', () => {
    expect(toHexString(decryptMessage(key1, data1))).toBe('010203')
    expect(toHexString(decryptMessage(key2, data2))).toBe('0a0b0c')
  })
})

describe('create answers attachment', () => {
  const key = 'c6fccb1b926e774d7e3a1716eddeba55ae7d40db4fb7c22d2705835f48d5be1b'

  it('generate short answers salt', () => {
    expect(toHexString(generateShortAnswersSalt(1, key))).toBe(
      'b48e37ca1691cbb155626574cf2e46422d041835d743986b65548ab1e39ca1ac'
    )

    expect(toHexString(generateShortAnswersSalt(10, key))).toBe(
      '896465aec39c31f3bd53d129bcd2b3ff82849e043c2f983df851cd7b1a61c82d'
    )

    expect(toHexString(generateShortAnswersSalt(555, key))).toBe(
      'b6260e0d4a9217933adf2f4f3863e2c61e744c2298475e7dae16ab53075f1147'
    )
  })

  it('short attachment', () => {
    const hashes = ['a', 'b', 'c', 'd', 'e']
    const answers = [
      {hash: 'a', answer: 1},
      {hash: 'd', answer: 2},
      {hash: 'b', answer: 0},
      {hash: 'e', answer: 1},
      {hash: 'c', answer: 2},
    ]

    const result = serializeAnswers(hashes, answers)

    // 0000 0001 1001 0001
    expect(result).toStrictEqual([1, 145])
  })

  it('long attachment', () => {
    const hashes = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'aa',
      'ab',
      'ac',
      'ad',
      'ae',
      'ba',
      'bb',
    ]
    const answers = [
      {hash: 'a', answer: 1},
      {hash: 'aa', answer: 2},
      {hash: 'ac', answer: 2},
      {hash: 'd', answer: 2},
      {hash: 'b', answer: 0},
      {hash: 'ab', answer: 1},
      {hash: 'ae', answer: 1},
      {hash: 'b', answer: 0},
      {hash: 'e', answer: 1},
      {hash: 'bb', answer: 2},
      {hash: 'c', answer: 2},
    ]

    const result = serializeAnswers(hashes, answers)

    // 1000 1010 1100 0010 0101 0001
    expect(result).toStrictEqual([138, 194, 81])
  })

  it('answer reports', () => {
    const hashes = ['a', 'b', 'c', 'd', 'e']
    const answers = [
      {hash: 'a', answer: 1, grade: FlipGrade.Reported},
      {hash: 'd', answer: 2},
      {hash: 'b', answer: 0},
      {hash: 'e', answer: 1},
      {hash: 'c', answer: 2, grade: FlipGrade.Reported},
    ]

    const result = serializeAnswers(hashes, answers)

    // 0000 0001 0000 0101 1001 0001
    expect(result).toStrictEqual([1, 5, 145])
  })

  it('key to address', () => {
    expect(privateKeyToAddress(key)).toBe(
      '0xa79b11814a162129a6dC136885C1c92EE1336Ffc'.toLowerCase()
    )
  })

  it('sign and check', () => {
    const data = '0x010203'

    const signature = signMessage(data, key)

    const addr = checkSignature(data, signature)

    expect(privateKeyToAddress(key)).toBe(addr)
  })

  it('check dna sign', () => {
    const data = `salt-0x010203-50`
    const shouldBe =
      '4adf3bb775e94b56ce0acbbbcede83cd6382841e4152a1956bff2b73105adc0c0292f84193648f83e0f2b66b7095055ded4a062330199970e26613dc392336eb01'

    expect(toHexString(dnaSign(data, key))).toBe(shouldBe)
  })
})
