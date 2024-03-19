var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { websocketReconnectTopic } from "./constants";
import { eventHub } from "./events";
import { logger } from "./logger";
import { InsightType, } from "./types";
import { generateConnectionToken } from "./utils";
import throttleUtil from "./throttleutil";
var socketConnectionIntervals = [250, 500, 1000, 2000, 4000, 8000];
var NetworkService = /** @class */ (function () {
    function NetworkService(fb) {
        var _this = this;
        this.retryCounter = 0;
        this.sendInsights = throttleUtil.throttleAsync(function (data) { return __awaiter(_this, void 0, void 0, function () {
            var payload, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.secret || !this.user || !data || data.length === 0) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        payload = [
                            {
                                user: this.__getUserInfo(),
                                variations: data
                                    .filter(function (d) { return d.insightType === InsightType.featureFlagUsage; })
                                    .map(function (v) { return ({
                                    featureFlagKey: v.id,
                                    sendToExperiment: v.sendToExperiment,
                                    timestamp: v.timestamp,
                                    variation: {
                                        id: v.variation.id,
                                        value: v.variation.value,
                                    },
                                }); }),
                                metrics: data
                                    .filter(function (d) { return d.insightType !== InsightType.featureFlagUsage; })
                                    .map(function (d) { return ({
                                    route: location.pathname,
                                    timestamp: d.timestamp,
                                    numericValue: d.numericValue === null || d.numericValue === undefined
                                        ? 1
                                        : d.numericValue,
                                    appType: _this.appType,
                                    eventName: d.eventName,
                                    type: d.type,
                                }); }),
                            },
                        ];
                        return [4 /*yield*/, post("".concat(this.api, "/api/public/insight/track"), payload, {
                                Authorization: this.secret,
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        logger.logDebug(err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        this.fb = fb;
    }
    NetworkService.prototype.init = function (api, secret, appType) {
        this.api = api;
        this.secret = secret;
        this.appType = appType;
    };
    NetworkService.prototype.identify = function (user, sendIdentifyMessage) {
        var _a;
        this.user = __assign({}, user);
        throttleUtil.setKey((_a = this.user) === null || _a === void 0 ? void 0 : _a.keyId);
        if (sendIdentifyMessage && this.socket) {
            this.sendUserIdentifyMessage(0);
        }
    };
    NetworkService.prototype.sendUserIdentifyMessage = function (timestamp) {
        var _a, _b;
        var _c = this.user, name = _c.name, keyId = _c.keyId, customizedProperties = _c.customizedProperties;
        var payload = {
            messageType: "data-sync",
            data: {
                user: {
                    name: name,
                    keyId: keyId,
                    customizedProperties: customizedProperties,
                },
                timestamp: timestamp,
            },
        };
        try {
            if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
                logger.logDebug("sending user identify message");
                (_b = this.socket) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify(payload));
            }
            else {
                logger.logDebug("didn't send user identify message because socket not open");
            }
        }
        catch (err) {
            logger.logDebug(err);
        }
    };
    NetworkService.prototype.reconnect = function () {
        this.socket = null;
        var waitTime = socketConnectionIntervals[Math.min(this.retryCounter++, socketConnectionIntervals.length - 1)];
        setTimeout(function () {
            logger.logDebug("emit reconnect event");
            eventHub.emit(websocketReconnectTopic, {});
        }, waitTime);
        logger.logDebug(waitTime);
    };
    NetworkService.prototype.sendPingMessage = function () {
        var _this = this;
        var payload = {
            messageType: "ping",
            data: null,
        };
        setTimeout(function () {
            var _a;
            try {
                if (((_a = _this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
                    logger.logDebug("sending ping");
                    _this.socket.send(JSON.stringify(payload));
                    _this.sendPingMessage();
                }
                else {
                    logger.logDebug("socket closed at ".concat(new Date()));
                    _this.reconnect();
                }
            }
            catch (err) {
                logger.logDebug(err);
            }
        }, 18000);
    };
    NetworkService.prototype.createConnection = function (timestamp, onMessage) {
        var _a;
        var that = this;
        if (that.socket) {
            onMessage({});
            return;
        }
        var startTime = Date.now();
        // Create WebSocket connection.
        var url = ((_a = this.api) === null || _a === void 0 ? void 0 : _a.replace(/^http/, "ws")) +
            "/streaming?type=client&token=".concat(generateConnectionToken(this.secret));
        that.socket = new WebSocket(url);
        // Connection opened
        that.socket.addEventListener("open", function (event) {
            that.retryCounter = 0;
            // this is the websocket instance to which the current listener is binded to, it's different from that.socket
            logger.logDebug("Connection time: ".concat(Date.now() - startTime, " ms"));
            that.sendUserIdentifyMessage(timestamp);
            that.sendPingMessage();
        });
        // Connection closed
        that.socket.addEventListener("close", function (event) {
            logger.logDebug("close");
            if (event.code === 4003) {
                // do not reconnect when 4003
                return;
            }
            that.reconnect();
        });
        // Connection error
        that.socket.addEventListener("error", function (event) {
            // reconnect
            logger.logDebug("error");
        });
        // Listen for messages
        that.socket.addEventListener("message", function (event) {
            var message = JSON.parse(event.data);
            if (message.messageType === "data-sync") {
                onMessage(message.data);
                if (message.data.featureFlags.length > 0) {
                    logger.logDebug("socket push update time(ms): ", Date.now() - message.data.featureFlags[0].timestamp);
                }
            }
        });
    };
    NetworkService.prototype.__getUserInfo = function () {
        var _a = this.user, name = _a.name, keyId = _a.keyId, customizedProperties = _a.customizedProperties;
        return {
            name: name,
            keyId: keyId,
            customizedProperties: customizedProperties,
        };
    };
    NetworkService.prototype.getActiveExperimentMetricSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var exptMetricSettingLocalStorageKey, result, error_1, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        exptMetricSettingLocalStorageKey = "fb_expt_metric";
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 9]);
                        return [4 /*yield*/, get("".concat(this.api, "/api/public/sdk/experiments"), {
                                Authorization: this.secret,
                            })];
                    case 2:
                        result = _d.sent();
                        return [4 /*yield*/, this.fb.set(exptMetricSettingLocalStorageKey, JSON.stringify(result.data))];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, result.data];
                    case 4:
                        error_1 = _d.sent();
                        logger.log(error_1);
                        return [4 /*yield*/, this.fb.get(exptMetricSettingLocalStorageKey)];
                    case 5:
                        if (!!!(_d.sent())) return [3 /*break*/, 7];
                        _c = (_b = JSON).parse;
                        return [4 /*yield*/, this.fb.get(exptMetricSettingLocalStorageKey)];
                    case 6:
                        _a = _c.apply(_b, [(_d.sent())]);
                        return [3 /*break*/, 8];
                    case 7:
                        _a = [];
                        _d.label = 8;
                    case 8: return [2 /*return*/, _a];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    NetworkService.prototype.getZeroCodeSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var zeroCodeSettingLocalStorageKey, result, error_2, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        zeroCodeSettingLocalStorageKey = "fb_zcs";
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 9]);
                        return [4 /*yield*/, get("".concat(this.api, "/api/public/sdk/zero-code"), {
                                Authorization: this.secret,
                            })];
                    case 2:
                        result = _d.sent();
                        return [4 /*yield*/, this.fb.set(zeroCodeSettingLocalStorageKey, JSON.stringify(result.data))];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, result.data];
                    case 4:
                        error_2 = _d.sent();
                        logger.log(error_2);
                        return [4 /*yield*/, this.fb.get(zeroCodeSettingLocalStorageKey)];
                    case 5:
                        if (!!!(_d.sent())) return [3 /*break*/, 7];
                        _c = (_b = JSON).parse;
                        return [4 /*yield*/, this.fb.get(zeroCodeSettingLocalStorageKey)];
                    case 6:
                        _a = _c.apply(_b, [(_d.sent())]);
                        return [3 /*break*/, 8];
                    case 7:
                        _a = [];
                        _d.label = 8;
                    case 8: return [2 /*return*/, _a];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return NetworkService;
}());
export { NetworkService };
export function post() {
    return __awaiter(this, arguments, void 0, function (url, data, headers) {
        var response, err_2;
        if (url === void 0) { url = ""; }
        if (data === void 0) { data = {}; }
        if (headers === void 0) { headers = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch(url, {
                            method: "POST",
                            headers: Object.assign({
                                "Content-Type": "application/json",
                            }, headers),
                            body: JSON.stringify(data), // body data type must match "Content-Type" header
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.status === 200 ? response.json() : {}];
                case 2:
                    err_2 = _a.sent();
                    logger.logDebug(err_2);
                    return [2 /*return*/, {}];
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function get() {
    return __awaiter(this, arguments, void 0, function (url, headers) {
        var response, err_3;
        if (url === void 0) { url = ""; }
        if (headers === void 0) { headers = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch(url, {
                            method: "GET",
                            headers: Object.assign({
                                Accept: "application/json",
                                "Content-Type": "application/json",
                            }, headers),
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.status === 200 ? response.json() : {}];
                case 2:
                    err_3 = _a.sent();
                    logger.logDebug(err_3);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=network.service.js.map