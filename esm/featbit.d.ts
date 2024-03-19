import { FeatureFlagValue, ICustomEvent, IFeatureFlag, IFeatureFlagBase, IFeatureFlagSet, IOption, IUser } from "./types";
import { Storage } from "../node_modules/@plasmohq/storage/dist/index";
export declare class FB {
    private _readyEventEmitted;
    private _readyPromise;
    private store;
    private networkService;
    private _insightsQueue;
    private _featureFlagEvaluationBuffer;
    private _option;
    storage: Storage;
    constructor(storage: Storage);
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<null>;
    removeItem(key: string): Promise<void>;
    on(name: string, cb: Function): void;
    waitUntilReady(): Promise<IFeatureFlagBase[]>;
    init(option: IOption): Promise<void>;
    identify(user: IUser): Promise<void>;
    logout(): Promise<IUser>;
    /**
     * bootstrap with predefined feature flags.
     * @param {array} featureFlags the predefined feature flags.
     * @param {boolean} forceFullFetch if a forced full fetch should be made.
     * @return {Promise<void>} nothing.
     */
    bootstrap(featureFlags?: IFeatureFlag[], forceFullFetch?: boolean): Promise<void>;
    private dataSync;
    variation(key: string, defaultResult: FeatureFlagValue): FeatureFlagValue;
    /**
     * deprecated, you should use variation method directly
     */
    boolVariation(key: string, defaultResult: boolean): boolean;
    getUser(): IUser;
    sendCustomEvent(data: ICustomEvent[]): void;
    sendFeatureFlagInsight(key: string, variation: string): void;
    getAllFeatureFlags(): IFeatureFlagSet;
    variationWithInsightBuffer(key: string, defaultResult: string | boolean): any;
    generateGuid(): Promise<string>;
    createOrGetAnonymousUser(): Promise<IUser>;
}
