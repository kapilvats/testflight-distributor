import {waitForProcessing} from '../src/wait-for-processing'
import {AppStoreConnectClient} from '../src/app-store-connect'

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
}))

describe('waitForProcessing', () => {
  let mockClient: jest.Mocked<Pick<AppStoreConnectClient, 'getBuild'>>

  beforeEach(() => {
    jest.useFakeTimers()
    mockClient = {
      getBuild: jest.fn(),
    }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns immediately if build is already VALID', async () => {
    mockClient.getBuild.mockResolvedValue({
      id: 'build-1',
      attributes: {version: '42', processingState: 'VALID'},
    })

    const promise = waitForProcessing(mockClient as any, 'build-1', 5)
    await promise
    expect(mockClient.getBuild).toHaveBeenCalledTimes(1)
  })

  it('polls until build becomes VALID', async () => {
    let callCount = 0
    mockClient.getBuild.mockImplementation(async () => {
      callCount++
      return {
        id: 'build-1',
        attributes: {
          version: '42',
          processingState: callCount < 3 ? 'PROCESSING' : 'VALID',
        },
      }
    })

    const promise = waitForProcessing(mockClient as any, 'build-1', 5)

    // Advance past two polling intervals
    await jest.advanceTimersByTimeAsync(30_000)
    await jest.advanceTimersByTimeAsync(30_000)

    await promise
    expect(callCount).toBe(3)
  })

  it('throws on FAILED state', async () => {
    mockClient.getBuild.mockResolvedValue({
      id: 'build-1',
      attributes: {version: '42', processingState: 'FAILED'},
    })

    await expect(waitForProcessing(mockClient as any, 'build-1', 5)).rejects.toThrow(
      'Build processing failed with state: FAILED'
    )
  })

  it('throws on INVALID state', async () => {
    mockClient.getBuild.mockResolvedValue({
      id: 'build-1',
      attributes: {version: '42', processingState: 'INVALID'},
    })

    await expect(waitForProcessing(mockClient as any, 'build-1', 5)).rejects.toThrow(
      'Build processing failed with state: INVALID'
    )
  })

  it('throws on timeout', async () => {
    mockClient.getBuild.mockResolvedValue({
      id: 'build-1',
      attributes: {version: '42', processingState: 'PROCESSING'},
    })

    // Use a very short timeout (0 minutes = immediate timeout)
    const promise = waitForProcessing(mockClient as any, 'build-1', 0)
    await expect(promise).rejects.toThrow('Build processing timed out after 0 minutes')
  })
})
