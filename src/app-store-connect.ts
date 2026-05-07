import * as crypto from 'crypto'
import {HttpClient} from '@actions/http-client'

const API_BASE = 'https://api.appstoreconnect.apple.com'

export interface AppStoreConnectConfig {
  apiKeyId: string
  issuerId: string
  privateKey: string
}

export interface Build {
  id: string
  attributes: {
    version: string
    processingState: string
    buildAudienceType?: string
  }
}

export interface BetaGroup {
  id: string
  attributes: {
    name: string
  }
}

export class AppStoreConnectClient {
  private config: AppStoreConnectConfig
  private http: HttpClient
  private tokenCache: {token: string; expiresAt: number} | null = null

  constructor(config: AppStoreConnectConfig) {
    this.config = config
    this.http = new HttpClient('distribute-testflight-action')
  }

  generateToken(): string {
    const now = Math.floor(Date.now() / 1000)

    // Return cached token if still valid (with 60s buffer)
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60) {
      return this.tokenCache.token
    }

    const expiresAt = now + 20 * 60 // 20 minutes

    const header = {alg: 'ES256', kid: this.config.apiKeyId, typ: 'JWT'}
    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: expiresAt,
      aud: 'appstoreconnect-v1',
    }

    const encodedHeader = base64url(JSON.stringify(header))
    const encodedPayload = base64url(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const sign = crypto.createSign('SHA256')
    sign.update(signingInput)
    const signature = sign.sign(this.config.privateKey)
    const encodedSignature = base64url(signature)

    const token = `${signingInput}.${encodedSignature}`
    this.tokenCache = {token, expiresAt}
    return token
  }

  private async request<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
    const token = this.generateToken()
    const url = `${API_BASE}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    let response
    if (method === 'GET') {
      response = await this.http.get(url, headers)
    } else {
      response = await this.http.post(url, JSON.stringify(body), headers)
    }

    const statusCode = response.message.statusCode ?? 0
    const responseBody = await response.readBody()

    if (statusCode < 200 || statusCode >= 300) {
      let errorMessage = `App Store Connect API error (${statusCode})`
      try {
        const errorData = JSON.parse(responseBody)
        if (errorData.errors?.length) {
          const errors = errorData.errors.map(
            (e: {detail?: string; title?: string}) => e.detail || e.title
          )
          errorMessage += `: ${errors.join('; ')}`
        }
      } catch {
        if (responseBody) {
          errorMessage += `: ${responseBody}`
        }
      }
      throw new Error(errorMessage)
    }

    // POST to relationships returns 204 No Content
    if (statusCode === 204 || !responseBody) {
      return {} as T
    }

    return JSON.parse(responseBody)
  }

  async getAppByBundleId(bundleId: string): Promise<string> {
    const response = await this.request<{data: {id: string}[]}>(
      `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`
    )

    if (!response.data?.length) {
      throw new Error(`No app found with bundle ID "${bundleId}"`)
    }

    return response.data[0].id
  }

  async findBuild(appId: string, buildNumber: string, appVersion?: string): Promise<Build> {
    let path = `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}`
    if (appVersion) {
      path += `&filter[preReleaseVersion.version]=${encodeURIComponent(appVersion)}`
    }

    const response = await this.request<{data: Build[]}>(path)

    if (!response.data?.length) {
      const versionInfo = appVersion ? ` and app version "${appVersion}"` : ''
      throw new Error(
        `No build found with build number "${buildNumber}"${versionInfo} for app ${appId}`
      )
    }

    return response.data[0]
  }

  async getBuild(buildId: string): Promise<Build> {
    const response = await this.request<{data: Build}>(`/v1/builds/${buildId}`)
    return response.data
  }

  async findBetaGroup(appId: string, groupName: string): Promise<BetaGroup> {
    const response = await this.request<{data: BetaGroup[]}>(
      `/v1/apps/${appId}/betaGroups?filter[name]=${encodeURIComponent(groupName)}`
    )

    if (!response.data?.length) {
      throw new Error(
        `No beta group found with name "${groupName}" for app ${appId}. ` +
          'Make sure the group exists in App Store Connect.'
      )
    }

    return response.data[0]
  }

  async addBuildToGroup(groupId: string, buildId: string): Promise<void> {
    await this.request(
      `/v1/betaGroups/${groupId}/relationships/builds`,
      'POST',
      {
        data: [{type: 'builds', id: buildId}],
      }
    )
  }

  async notifyBetaTesters(buildId: string): Promise<void> {
    await this.request(
      '/v1/buildBetaNotifications',
      'POST',
      {
        data: {
          type: 'buildBetaNotifications',
          relationships: {
            build: {
              data: {type: 'builds', id: buildId},
            },
          },
        },
      }
    )
  }
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64url')
}
