import * as crypto from 'crypto'
import {AppStoreConnectClient} from '../src/app-store-connect'

// Generate a real ES256 key pair for testing
const {privateKey} = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
  publicKeyEncoding: {type: 'spki', format: 'pem'},
})

const mockConfig = {
  apiKeyId: 'TEST_KEY_ID',
  issuerId: 'test-issuer-id',
  privateKey,
}

// Mock HttpClient
jest.mock('@actions/http-client', () => {
  return {
    HttpClient: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      post: jest.fn(),
    })),
  }
})

describe('AppStoreConnectClient', () => {
  let client: AppStoreConnectClient

  beforeEach(() => {
    client = new AppStoreConnectClient(mockConfig)
  })

  describe('generateToken', () => {
    it('generates a valid JWT with correct structure', () => {
      const token = client.generateToken()
      const parts = token.split('.')
      expect(parts).toHaveLength(3)

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
      expect(header).toEqual({alg: 'ES256', kid: 'TEST_KEY_ID', typ: 'JWT'})

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      expect(payload.iss).toBe('test-issuer-id')
      expect(payload.aud).toBe('appstoreconnect-v1')
      expect(payload.exp).toBeGreaterThan(payload.iat)
    })

    it('caches tokens', () => {
      const token1 = client.generateToken()
      const token2 = client.generateToken()
      expect(token1).toBe(token2)
    })
  })

  describe('getAppByBundleId', () => {
    it('returns app ID when found', async () => {
      mockGetResponse(client, {data: [{id: 'app-123'}]})
      const id = await client.getAppByBundleId('com.example.app')
      expect(id).toBe('app-123')
    })

    it('throws when no app found', async () => {
      mockGetResponse(client, {data: []})
      await expect(client.getAppByBundleId('com.example.missing')).rejects.toThrow(
        'No app found with bundle ID "com.example.missing"'
      )
    })
  })

  describe('findBuild', () => {
    it('returns build when found', async () => {
      const build = {id: 'build-1', attributes: {version: '42', processingState: 'VALID'}}
      mockGetResponse(client, {data: [build]})
      const result = await client.findBuild('app-1', '42')
      expect(result.id).toBe('build-1')
    })

    it('throws when no build found', async () => {
      mockGetResponse(client, {data: []})
      await expect(client.findBuild('app-1', '99')).rejects.toThrow(
        'No build found with build number "99"'
      )
    })
  })

  describe('findBetaGroup', () => {
    it('returns group when found', async () => {
      const group = {id: 'group-1', attributes: {name: 'Testers'}}
      mockGetResponse(client, {data: [group]})
      const result = await client.findBetaGroup('app-1', 'Testers')
      expect(result.id).toBe('group-1')
    })

    it('throws when group not found', async () => {
      mockGetResponse(client, {data: []})
      await expect(client.findBetaGroup('app-1', 'Missing')).rejects.toThrow(
        'No beta group found with name "Missing"'
      )
    })
  })

  describe('addBuildToGroup', () => {
    it('posts correct payload', async () => {
      const postMock = mockPostResponse(client, 204, '')
      await client.addBuildToGroup('group-1', 'build-1')
      expect(postMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/betaGroups/group-1/relationships/builds'),
        JSON.stringify({data: [{type: 'builds', id: 'build-1'}]}),
        expect.any(Object)
      )
    })
  })

  describe('API error handling', () => {
    it('surfaces API error details', async () => {
      mockGetResponse(
        client,
        {errors: [{title: 'NOT_AUTHORIZED', detail: 'Invalid API key'}]},
        403
      )
      await expect(client.getAppByBundleId('com.example.app')).rejects.toThrow(
        'App Store Connect API error (403): Invalid API key'
      )
    })
  })
})

function mockGetResponse(client: AppStoreConnectClient, body: unknown, status = 200) {
  const httpClient = (client as any).http
  httpClient.get = jest.fn().mockResolvedValue({
    message: {statusCode: status},
    readBody: jest.fn().mockResolvedValue(JSON.stringify(body)),
  })
  return httpClient.get
}

function mockPostResponse(client: AppStoreConnectClient, status = 204, body = '') {
  const httpClient = (client as any).http
  httpClient.post = jest.fn().mockResolvedValue({
    message: {statusCode: status},
    readBody: jest.fn().mockResolvedValue(body),
  })
  return httpClient.post
}
