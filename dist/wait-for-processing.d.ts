import { AppStoreConnectClient } from './app-store-connect';
export declare function waitForProcessing(client: AppStoreConnectClient, buildId: string, maxWaitMinutes: number): Promise<void>;
