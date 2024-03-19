import { FB } from "./featbit";
import { FeatureFlagValue, IDataStore, IFeatureFlag } from "./types";
export declare class Store {
    private _isDevMode;
    private _userId;
    private fb;
    private _store;
    constructor(fb: FB);
    set userId(id: string);
    set isDevMode(devMode: boolean);
    get isDevMode(): boolean;
    getFeatureFlag(key: string): IFeatureFlag;
    getVariation(key: string): FeatureFlagValue;
    setFullData(data: IDataStore): Promise<void>;
    getFeatureFlags(): {
        [key: string]: IFeatureFlag;
    };
    updateStorageBulk(data: IDataStore, storageKey: string, onlyInsertNewElement: boolean): Promise<void>;
    updateBulkFromRemote(data: IDataStore): Promise<void>;
    private _emitUpdateEvents;
    private _dumpToStorage;
    private _loadFromStorage;
}
