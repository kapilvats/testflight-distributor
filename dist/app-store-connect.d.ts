export interface AppStoreConnectConfig {
    apiKeyId: string;
    issuerId: string;
    privateKey: string;
}
export interface Build {
    id: string;
    attributes: {
        version: string;
        processingState: string;
        buildAudienceType?: string;
    };
}
export interface BetaGroup {
    id: string;
    attributes: {
        name: string;
    };
}
export declare class AppStoreConnectClient {
    private config;
    private http;
    private tokenCache;
    constructor(config: AppStoreConnectConfig);
    generateToken(): string;
    private request;
    getAppByBundleId(bundleId: string): Promise<string>;
    findBuild(appId: string, buildNumber: string, appVersion?: string): Promise<Build>;
    getBuild(buildId: string): Promise<Build>;
    findBetaGroup(appId: string, groupName: string): Promise<BetaGroup>;
    addBuildToGroup(groupId: string, buildId: string): Promise<void>;
    notifyBetaTesters(buildId: string): Promise<void>;
}
