import * as core from '@actions/core'
import {AppStoreConnectClient} from './app-store-connect'

const POLL_INTERVAL_MS = 30_000
const FAILURE_STATES = new Set(['FAILED', 'INVALID'])

export async function waitForProcessing(
  client: AppStoreConnectClient,
  buildId: string,
  maxWaitMinutes: number
): Promise<void> {
  const deadline = Date.now() + maxWaitMinutes * 60 * 1000

  core.info(`Waiting for build ${buildId} to finish processing (timeout: ${maxWaitMinutes}m)...`)

  while (Date.now() < deadline) {
    const build = await client.getBuild(buildId)
    const state = build.attributes.processingState

    core.info(`Build processing state: ${state}`)

    if (FAILURE_STATES.has(state)) {
      throw new Error(`Build processing failed with state: ${state}`)
    }

    if (state === 'VALID') {
      core.info('Build processing complete.')
      return
    }

    const remaining = Math.ceil((deadline - Date.now()) / 60000)
    core.info(`Waiting 30s before next check... (${remaining}m remaining)`)
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`Build processing timed out after ${maxWaitMinutes} minutes`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
