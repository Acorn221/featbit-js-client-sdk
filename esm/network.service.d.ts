import { IExptMetricSetting, IStreamResponse, IUser, IZeroCode } from "./types";
declare class NetworkService {
    private user;
    private api;
    private secret;
    private appType;
    private retryCounter;
    constructor();
    init(api: string, secret: string, appType: string): void;
    identify(user: IUser, sendIdentifyMessage: boolean): void;
    private sendUserIdentifyMessage;
    private socket;
    private reconnect;
    private sendPingMessage;
    createConnection(timestamp: number, onMessage: (response: IStreamResponse) => any): void;
    private __getUserInfo;
    sendInsights: any;
    getActiveExperimentMetricSettings(): Promise<IExptMetricSetting[] | []>;
    getZeroCodeSettings(): Promise<IZeroCode[] | []>;
}
export declare const networkService: NetworkService;
export declare function post(url?: string, data?: any, headers?: {
    [key: string]: string;
}): Promise<any>;
export declare function get(url?: string, headers?: {
    [key: string]: string;
}): Promise<any>;
export {};
