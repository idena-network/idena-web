import axios from 'axios'
import {callRpcAny, callRpcBest} from './api-client'
import {persistState} from '../utils/persist'

jest.mock('axios')
const mockedAxios = axios
mockedAxios.create = jest.fn(() => mockedAxios)
const mockedResponses = []
const RESPONSE_REJECTED = {
  rejectReason: 'rejected',
}

beforeAll(() => {
  persistState('settings', {
    url: 'http://primary',
    key: 'primaryKey',
    useSecondary: true,
    secondaryNodes: [
      {
        url: 'http://secondary1',
        key: 'secondaryKey1',
      },
      {
        url: 'http://secondary2',
        key: 'secondaryKey2',
      },
    ],
  })

  mockedAxios.post.mockImplementation(async (url, config) => {
    if (!mockedResponses.length) {
      return Promise.reject(new Error('fail'))
    }
    const response = mockedResponses.shift()
    if (response.rejectReason) {
      const err = new Error(response.rejectReason)
      err.response = {
        data: response.rejectReason,
      }
      return Promise.reject(err)
    }
    return response
  })
})

afterAll(() => {
  persistState('settings', null)
})

beforeEach(() => {})

afterEach(() => {
  mockedResponses.length = 0
  jest.clearAllMocks()
})

describe('callRpcAny', () => {
  it('Should return any success response', async () => {
    mockedResponses.push({
      data: {
        result: 5,
      },
    })
    mockedResponses.push({
      data: {
        error: {
          message: 'some rpc error',
        },
      },
    })

    const result = await callRpcAny({})

    expect(mockedAxios.post).toBeCalledTimes(3)
    expect(result).toEqual({
      data: {
        result: 5,
      },
    })
  })

  it('Should return asserted success response', async () => {
    mockedResponses.push({
      data: {
        result: false,
      },
    })
    mockedResponses.push({
      data: {
        result: true,
      },
    })

    const result = await callRpcAny(
      {},
      {
        assert: res => !!res,
      }
    )

    expect(result).toEqual({
      data: {
        result: true,
      },
    })
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return error response in case of failed assertions', async () => {
    mockedResponses.push({
      data: {
        result: false,
      },
    })
    mockedResponses.push({
      data: {
        result: false,
      },
    })

    await expect(
      callRpcAny(
        {},
        {
          assert: res => !!res,
        }
      )
    ).rejects.toThrow('All promises were rejected')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return rpc error response', async () => {
    mockedResponses.push(RESPONSE_REJECTED)
    mockedResponses.push({
      data: {
        error: {
          message: 'some rpc error',
        },
      },
    })

    await expect(callRpcAny({})).rejects.toThrow('some rpc error')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return first rpc error response', async () => {
    mockedResponses.push({
      data: {
        error: {
          message: 'some rpc error 1',
        },
      },
    })
    mockedResponses.push({
      data: {
        error: {
          message: 'some rpc error 2',
        },
      },
    })

    await expect(callRpcAny({})).rejects.toThrow('some rpc error 1')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return error response', async () => {
    mockedResponses.push(RESPONSE_REJECTED)
    mockedResponses.push(RESPONSE_REJECTED)

    await expect(callRpcAny({})).rejects.toThrow('All promises were rejected')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })
})

describe('callRpcBest', () => {
  it('Should return the most actual success response', async () => {
    mockedResponses.push({
      data: [
        {
          result: 4,
        },
        {
          result: {
            currentBlock: 9,
          },
        },
      ],
    })
    mockedResponses.push({
      data: [
        {
          result: 5,
        },
        {
          result: {
            currentBlock: 10,
          },
        },
      ],
    })

    const result = await callRpcBest({})

    expect(result).toEqual({
      data: {
        result: 5,
      },
    })
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return success response with missing sync data', async () => {
    mockedResponses.push({
      data: [
        {
          result: 6,
        },
        {
          result: {
            currentBlock: 10,
          },
        },
      ],
    })
    mockedResponses.push({
      data: {
        result: 5,
      },
    })

    const result = await callRpcBest({})

    expect(result).toEqual({
      data: {
        result: 5,
      },
    })
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return the first most actual success response', async () => {
    mockedResponses.push({
      data: [
        {
          result: 5,
        },
        {
          result: {
            currentBlock: 10,
          },
        },
      ],
    })
    mockedResponses.push({
      data: [
        {
          result: 6,
        },
        {
          result: {
            currentBlock: 10,
          },
        },
      ],
    })

    const result = await callRpcBest({})

    expect(result).toEqual({
      data: {
        result: 5,
      },
    })
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return response in case of retry after rejected batch request', async () => {
    mockedResponses.push({
      data: [
        {
          result: 5,
        },
        {
          result: {
            currentBlock: 10,
          },
        },
      ],
    })
    mockedResponses.push({
      data: [
        {
          result: 7,
        },
        {
          result: {
            currentBlock: 9,
          },
        },
      ],
    })
    mockedResponses.push({rejectReason: 'method not available'})
    mockedResponses.push({
      data: {
        result: 6,
      },
    })

    const result = await callRpcBest({})

    expect(result).toEqual({
      data: {
        result: 6,
      },
    })
    expect(mockedAxios.post).toBeCalledTimes(4)
  })

  it('Should return rpc error response', async () => {
    mockedResponses.push(RESPONSE_REJECTED)
    mockedResponses.push({
      data: [
        {
          error: {
            message: 'some rpc error 1',
          },
        },
        {
          error: {
            message: 'some rpc sync error',
          },
        },
      ],
    })
    mockedResponses.push({
      data: [
        {
          error: {
            message: 'some rpc error 2',
          },
        },
        {
          result: {
            currentBlock: 9,
          },
        },
      ],
    })

    await expect(callRpcBest({})).rejects.toThrow('some rpc error 1')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return rpc sync error response', async () => {
    mockedResponses.push(RESPONSE_REJECTED)
    mockedResponses.push({
      data: [
        {
          result: 5,
        },
        {
          error: {
            message: 'some rpc sync error 1',
          },
        },
      ],
    })
    mockedResponses.push({
      data: [
        {
          result: 5,
        },
        {
          error: {
            message: 'some rpc sync error 2',
          },
        },
      ],
    })

    await expect(callRpcBest({})).rejects.toThrow('some rpc sync error 1')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })

  it('Should return error response', async () => {
    mockedResponses.push(RESPONSE_REJECTED)
    mockedResponses.push(RESPONSE_REJECTED)

    await expect(callRpcBest({})).rejects.toThrow('rejected')
    expect(mockedAxios.post).toBeCalledTimes(3)
  })
})
