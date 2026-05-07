import * as core from '@actions/core'
import {AppStoreConnectClient} from './app-store-connect'
import {waitForProcessing} from './wait-for-processing'

async function run(): Promise<void> {
  try {
    const apiKeyId = core.getInput('api-key-id', {required: true})
    const issuerId = core.getInput('issuer-id', {required: true})
    const apiPrivateKey = core.getInput('api-private-key', {required: true})
    const appId = core.getInput('app-id')
    const bundleId = core.getInput('bundle-id')
    const buildNumber = core.getInput('build-number', {required: true})
    const appVersion = core.getInput('app-version')
    const groupName = core.getInput('group-name', {required: true})
    const waitForBuild = core.getBooleanInput('wait-for-processing')
    const maxWaitMinutes = parseInt(core.getInput('max-wait-minutes'), 10) || 60

    if (!appId && !bundleId) {
      throw new Error('Either "app-id" or "bundle-id" must be provided')
    }

    // Mask the private key in logs
    core.setSecret(apiPrivateKey)

    const client = new AppStoreConnectClient({apiKeyId, issuerId, privateKey: apiPrivateKey})

    // Resolve app ID
    let resolvedAppId = appId
    if (!resolvedAppId) {
      core.info(`Resolving app ID from bundle ID "${bundleId}"...`)
      resolvedAppId = await client.getAppByBundleId(bundleId)
      core.info(`Resolved app ID: ${resolvedAppId}`)
    }
    core.setOutput('app-id', resolvedAppId)

    // Find the build
    core.info(`Finding build number "${buildNumber}"...`)
    const build = await client.findBuild(resolvedAppId, buildNumber, appVersion || undefined)
    core.info(`Found build: ${build.id} (state: ${build.attributes.processingState})`)
    core.setOutput('build-id', build.id)

    // Wait for processing if needed
    if (waitForBuild && build.attributes.processingState !== 'VALID') {
      await waitForProcessing(client, build.id, maxWaitMinutes)
    } else if (build.attributes.processingState !== 'VALID') {
      throw new Error(
        `Build is not ready for distribution (state: ${build.attributes.processingState}). ` +
          'Set "wait-for-processing" to "true" to wait for it.'
      )
    }

    // Find the beta group
    core.info(`Finding beta group "${groupName}"...`)
    const group = await client.findBetaGroup(resolvedAppId, groupName)
    core.info(`Found beta group: ${group.id}`)
    core.setOutput('group-id', group.id)

    // Add build to group
    core.info(`Adding build ${build.id} to beta group "${groupName}"...`)
    await client.addBuildToGroup(group.id, build.id)
    core.info('Build successfully distributed to beta group!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
