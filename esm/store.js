var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { featureFlagEvaluatedTopic } from "./constants";
import { eventHub } from "./events";
import { logger } from "./logger";
import { FeatureFlagUpdateOperation, InsightType, } from "./types";
import { parseVariation } from "./utils";
var DataStoreStorageKey = "fbdatastore";
var Store = /** @class */ (function () {
    function Store(fb) {
        var _this = this;
        this._isDevMode = false;
        this._userId = null;
        this._store = {
            featureFlags: {},
        };
        this.fb = fb;
        eventHub.subscribe("devmode_ff_".concat(FeatureFlagUpdateOperation.update), function (data) {
            var updatedFfs = Object.keys(data)
                .map(function (key) {
                var changes = data[key];
                var ff = _this._store.featureFlags[key];
                var updatedFf = Object.assign({}, ff, {
                    variation: changes["newValue"],
                    timestamp: Date.now(),
                });
                return updatedFf;
            })
                .reduce(function (res, curr) {
                res.featureFlags[curr.id] = Object.assign({}, curr, {
                    timestamp: Date.now(),
                });
                return res;
            }, { featureFlags: {} });
            _this.updateStorageBulk(updatedFfs, "".concat(DataStoreStorageKey, "_dev_").concat(_this._userId), false).catch(function (err) {
                logger.logDebug("error while updating dev data store: " + err);
            });
            _this._loadFromStorage().catch(function (err) {
                logger.logDebug("error while loading from storage: " + err);
            });
        });
        eventHub.subscribe("devmode_ff_".concat(FeatureFlagUpdateOperation.createDevData), function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fb.removeItem("".concat(DataStoreStorageKey, "_dev_").concat(this._userId))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._loadFromStorage()];
                    case 2:
                        _a.sent();
                        eventHub.emit("devmode_ff_".concat(FeatureFlagUpdateOperation.devDataCreated), this._store.featureFlags);
                        return [2 /*return*/];
                }
            });
        }); });
    }
    Object.defineProperty(Store.prototype, "userId", {
        set: function (id) {
            this._userId = id;
            this._loadFromStorage();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Store.prototype, "isDevMode", {
        get: function () {
            return this._isDevMode;
        },
        set: function (devMode) {
            this._isDevMode = devMode;
            this._loadFromStorage();
        },
        enumerable: false,
        configurable: true
    });
    Store.prototype.getFeatureFlag = function (key) {
        return this._store.featureFlags[key];
    };
    Store.prototype.getVariation = function (key) {
        var featureFlag = this._store.featureFlags[key];
        if (!featureFlag) {
            return undefined;
        }
        eventHub.emit(featureFlagEvaluatedTopic, {
            insightType: InsightType.featureFlagUsage,
            id: featureFlag.id,
            timestamp: Date.now(),
            sendToExperiment: featureFlag.sendToExperiment,
            variation: featureFlag.variationOptions.find(function (o) { return o.value === featureFlag.variation; }),
        });
        var variationType = featureFlag.variationType, variation = featureFlag.variation;
        return parseVariation(variationType, variation);
    };
    Store.prototype.setFullData = function (data) {
        if (!this._isDevMode) {
            this._store = {
                featureFlags: {},
            };
            this._dumpToStorage(this._store).catch(function (err) {
                logger.logDebug("error while dumping to storage: " + err);
            });
        }
        this.updateBulkFromRemote(data);
    };
    Store.prototype.getFeatureFlags = function () {
        return this._store.featureFlags;
    };
    Store.prototype.updateStorageBulk = function (data, storageKey, onlyInsertNewElement) {
        return __awaiter(this, void 0, void 0, function () {
            var dataStoreStr, store, featureFlags_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fb.get(storageKey)];
                    case 1:
                        dataStoreStr = _a.sent();
                        store = null;
                        try {
                            if (dataStoreStr && dataStoreStr.trim().length > 0) {
                                store = JSON.parse(dataStoreStr);
                            }
                            else if (this.isDevMode || storageKey.indexOf("_dev_") === -1) {
                                store = {
                                    featureFlags: {},
                                };
                            }
                        }
                        catch (err) {
                            logger.logDebug("error while loading local data store: ".concat(storageKey) + err);
                        }
                        if (!!store) {
                            featureFlags_1 = data.featureFlags;
                            Object.keys(featureFlags_1).forEach(function (id) {
                                var remoteFf = featureFlags_1[id];
                                var localFf = store.featureFlags[id];
                                var predicate = !localFf || !onlyInsertNewElement;
                                if (predicate) {
                                    store.featureFlags[remoteFf.id] = Object.assign({}, remoteFf);
                                }
                            });
                            this._dumpToStorage(store, storageKey).catch(function (err) {
                                logger.logDebug("error while dumping to storage: " + err);
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Store.prototype.updateBulkFromRemote = function (data) {
        var storageKey = "".concat(DataStoreStorageKey, "_").concat(this._userId);
        var devStorageKey = "".concat(DataStoreStorageKey, "_dev_").concat(this._userId);
        this.updateStorageBulk(data, storageKey, false).catch(function (e) {
            logger.logDebug("error while updating data store: " + e);
        });
        this.updateStorageBulk(data, devStorageKey, true).catch(function (e) {
            logger.logDebug("error while updating dev data store: " + e);
        });
        this._loadFromStorage();
    };
    Store.prototype._emitUpdateEvents = function (updatedFeatureFlags) {
        if (updatedFeatureFlags.length > 0) {
            updatedFeatureFlags.forEach(function (_a) {
                var id = _a.id, operation = _a.operation, data = _a.data;
                return eventHub.emit("ff_".concat(operation, ":").concat(data.id), data);
            });
            eventHub.emit("ff_".concat(FeatureFlagUpdateOperation.update), updatedFeatureFlags.map(function (item) { return item.data; }));
        }
    };
    Store.prototype._dumpToStorage = function (store, localStorageKey) {
        return __awaiter(this, void 0, void 0, function () {
            var storageKey_1, storageKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!store) return [3 /*break*/, 2];
                        storageKey_1 = localStorageKey || "".concat(DataStoreStorageKey, "_").concat(this._userId);
                        return [4 /*yield*/, this.fb.set(storageKey_1, JSON.stringify(store))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        storageKey = this._isDevMode
                            ? "".concat(DataStoreStorageKey, "_dev_").concat(this._userId)
                            : "".concat(DataStoreStorageKey, "_").concat(this._userId);
                        return [4 /*yield*/, this.fb.set(storageKey, JSON.stringify(this._store))];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Store.prototype._loadFromStorage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storageKey, dataStoreStr, shouldDumpToStorage, devData, err_1, storageData_1, updatedFeatureFlags, err_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        storageKey = this._isDevMode
                            ? "".concat(DataStoreStorageKey, "_dev_").concat(this._userId)
                            : "".concat(DataStoreStorageKey, "_").concat(this._userId);
                        return [4 /*yield*/, this.fb.get(storageKey)];
                    case 1:
                        dataStoreStr = _a.sent();
                        shouldDumpToStorage = false;
                        if (!this._isDevMode) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 7]);
                        devData = JSON.parse(dataStoreStr);
                        if (!(devData === null ||
                            Object.keys(devData.featureFlags).length === 0)) return [3 /*break*/, 4];
                        shouldDumpToStorage = true;
                        return [4 /*yield*/, this.fb.get("".concat(DataStoreStorageKey, "_").concat(this._userId))];
                    case 3:
                        dataStoreStr = _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        err_1 = _a.sent();
                        shouldDumpToStorage = true;
                        return [4 /*yield*/, this.fb.get("".concat(DataStoreStorageKey, "_").concat(this._userId))];
                    case 6:
                        dataStoreStr = _a.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        if (dataStoreStr && dataStoreStr.trim().length > 0) {
                            storageData_1 = JSON.parse(dataStoreStr);
                            updatedFeatureFlags = Object.keys(storageData_1.featureFlags)
                                .filter(function (key) {
                                var storageFf = storageData_1.featureFlags[key];
                                var ff = _this._store.featureFlags[key];
                                return (!ff ||
                                    storageFf.variation !== ff.variation ||
                                    storageFf.variationType !== ff.variationType);
                            })
                                .map(function (key) {
                                var storageFf = storageData_1.featureFlags[key];
                                var ff = _this._store.featureFlags[key];
                                return {
                                    id: key,
                                    operation: FeatureFlagUpdateOperation.update,
                                    sendToExperiment: storageFf.sendToExperiment,
                                    data: {
                                        id: key,
                                        oldValue: ff
                                            ? parseVariation(ff.variationType, ff.variation)
                                            : undefined,
                                        newValue: parseVariation(storageFf.variationType, storageFf.variation),
                                    },
                                };
                            });
                            this._store = storageData_1;
                            this._emitUpdateEvents(updatedFeatureFlags);
                        }
                        else {
                            this._store = {
                                featureFlags: {},
                            };
                        }
                        if (shouldDumpToStorage) {
                            this._dumpToStorage().catch(function (err) {
                                logger.logDebug("error while dumping to storage: " + err);
                            });
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        err_2 = _a.sent();
                        logger.logDebug("error while loading local data store: " + err_2);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return Store;
}());
export { Store };
//# sourceMappingURL=store.js.map