import { eventHub } from "./events";
import { logger } from "./logger";
import {
  FeatureFlagValue,
  ICustomEvent,
  IFeatureFlag,
  IFeatureFlagBase,
  IFeatureFlagSet,
  IFeatureFlagVariationBuffer,
  IInsight,
  InsightType,
  IOption,
  IStreamResponse,
  IUser,
  StreamResponseEventType,
  VariationDataType,
} from "./types";
import {
  parseVariation,
  serializeUser,
  uuid,
  validateOption,
  validateUser,
} from "./utils";
import { Queue } from "./queue";
import {
  featureFlagEvaluatedBufferTopic,
  featureFlagEvaluatedTopic,
  insightsFlushTopic,
  insightsTopic,
  websocketReconnectTopic,
} from "./constants";
import { Storage } from "../node_modules/@plasmohq/storage/dist/index";
import { Store } from "./store";
import { NetworkService } from "./network.service";


function mapFeatureFlagsToFeatureFlagBaseList(featureFlags: {
  [key: string]: IFeatureFlag;
}): IFeatureFlagBase[] {
  return Object.keys(featureFlags).map((cur) => {
    const { id, variation } = featureFlags[cur];
    const variationType =
      featureFlags[cur].variationType || VariationDataType.string;
    return {
      id,
      variation: parseVariation(variationType, variation),
      variationType,
    };
  });
}

export class FB {
  private _readyEventEmitted = false;
  private _readyPromise: Promise<IFeatureFlagBase[]>;
  private store: Store;
  private networkService: NetworkService;

  private _insightsQueue: Queue<IInsight> = new Queue<IInsight>(
    1,
    insightsFlushTopic,
  );
  private _featureFlagEvaluationBuffer: Queue<IFeatureFlagVariationBuffer> =
    new Queue<IFeatureFlagVariationBuffer>();
  private _option: IOption = {
    secret: "",
    api: "",
    enableDataSync: true,
    appType: "javascript",
  };

  storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
    this.store = new Store(this);
    this.networkService = new NetworkService(this);
    this._readyPromise = new Promise<IFeatureFlagBase[]>((resolve) => {
      this.on("ready", () => {
        const featureFlags = this.store.getFeatureFlags();
        resolve(mapFeatureFlagsToFeatureFlagBaseList(featureFlags));
        if (this._option.enableDataSync) {
          const buffered = this._featureFlagEvaluationBuffer
            .flush()
            .map((f) => {
              const featureFlag = featureFlags[f.id];
              if (!featureFlag) {
                logger.log(`Called unexisting feature flag: ${f.id}`);
                return null;
              }

              const variation = featureFlag.variationOptions.find(
                (o) => o.value === f.variationValue,
              );
              if (!variation) {
                logger.log(
                  `Sent buffered insight for feature flag: ${f.id} with unexisting default variation: ${f.variationValue}`,
                );
              } else {
                logger.logDebug(
                  `Sent buffered insight for feature flag: ${f.id} with variation: ${variation.value}`,
                );
              }

              return {
                insightType: InsightType.featureFlagUsage,
                id: featureFlag.id,
                timestamp: f.timestamp,
                sendToExperiment: featureFlag.sendToExperiment,
                variation: variation || { id: -1, value: f.variationValue },
              };
            });

          this.networkService.sendInsights(buffered.filter((x) => !!x));
        }
      });
    });

    // reconnect to websocket
    eventHub.subscribe(websocketReconnectTopic, async () => {
      try {
        logger.logDebug("reconnecting");
        await this.dataSync();
        if (!this._readyEventEmitted) {
          this._readyEventEmitted = true;
          eventHub.emit(
            "ready",
            mapFeatureFlagsToFeatureFlagBaseList(this.store.getFeatureFlags()),
          );
        }
      } catch (err) {
        logger.log("data sync error", err);
      }
    });

    eventHub.subscribe(
      featureFlagEvaluatedBufferTopic,
      (data: IFeatureFlagVariationBuffer) => {
        this._featureFlagEvaluationBuffer.add(data);
      },
    );

    // track feature flag usage data
    eventHub.subscribe(insightsFlushTopic, () => {
      if (this._option.enableDataSync) {
        this.networkService.sendInsights(this._insightsQueue.flush());
      }
    });

    eventHub.subscribe(featureFlagEvaluatedTopic, (data: IInsight) => {
      this._insightsQueue.add(data);
    });

    eventHub.subscribe(insightsTopic, (data: IInsight) => {
      this._insightsQueue.add(data);
    });
  }

  get(key: string) {
    return this.storage.getItem(`fb_${key}`);
  }

  set(key: string, value: string) {
    return this.storage.setItem(`fb_${key}`, value);
  }

  removeItem(key: string) {
    return this.storage.removeItem(`fb_${key}`);
  }

  on(name: string, cb: Function) {
    eventHub.subscribe(name, cb);
  }

  waitUntilReady(): Promise<IFeatureFlagBase[]> {
    return this._readyPromise;
  }

  async init(option: IOption) {
    const validateOptionResult = validateOption({ ...this._option, ...option });
    if (validateOptionResult !== null) {
      logger.log(validateOptionResult);
      return;
    }

    this._option = {
      ...this._option,
      ...option,
      ...{ api: (option.api || this._option.api)?.replace(/\/$/, "") },
    };

    if (this._option.enableDataSync) {
      this.networkService.init(
        this._option.api!,
        this._option.secret,
        this._option.appType!,
      );
    }

    await this.identify(option.user || this.createOrGetAnonymousUser());
  }

  async identify(user: IUser): Promise<void> {
    const validateUserResult = validateUser(user);
    if (validateUserResult !== null) {
      logger.log(validateUserResult);
      return;
    }

    user.customizedProperties = user.customizedProperties?.map((p) => ({
      name: p.name,
      value: `${p.value}`,
    }));

    const isUserChanged =
      serializeUser(user) !== (await this.get("current_user"));
    this._option.user = Object.assign({}, user);
    await this.set("current_user", serializeUser(this._option.user));

    this.store.userId = this._option.user.keyId;
    this.networkService.identify(this._option.user, isUserChanged);

    await this.bootstrap(this._option.bootstrap, isUserChanged);
  }

  async logout(): Promise<IUser> {
    const anonymousUser = this.createOrGetAnonymousUser();
    await this.identify(anonymousUser);
    return anonymousUser;
  }

  /**
   * bootstrap with predefined feature flags.
   * @param {array} featureFlags the predefined feature flags.
   * @param {boolean} forceFullFetch if a forced full fetch should be made.
   * @return {Promise<void>} nothing.
   */
  async bootstrap(
    featureFlags?: IFeatureFlag[],
    forceFullFetch?: boolean,
  ): Promise<void> {
    featureFlags = featureFlags || this._option.bootstrap;
    if (featureFlags && featureFlags.length > 0) {
      const data = {
        featureFlags: featureFlags.reduce(
          (res, curr) => {
            const {
              id,
              variation,
              timestamp,
              variationOptions,
              sendToExperiment,
              variationType,
            } = curr;
            res[id] = {
              id,
              variation,
              timestamp,
              variationOptions: variationOptions || [
                { id: 1, value: variation },
              ],
              sendToExperiment,
              variationType: variationType || VariationDataType.string,
            };

            return res;
          },
          {} as { [key: string]: IFeatureFlag },
        ),
      };

      this.store.setFullData(data);
      logger.logDebug("bootstrapped with full data");
    }

    if (this._option.enableDataSync) {
      // start data sync
      try {
        await this.dataSync(forceFullFetch);
      } catch (err) {
        logger.log("data sync error", err);
      }
    }

    if (!this._readyEventEmitted) {
      this._readyEventEmitted = true;
      eventHub.emit(
        "ready",
        mapFeatureFlagsToFeatureFlagBaseList(this.store.getFeatureFlags()),
      );
    }
  }

  private async dataSync(forceFullFetch?: boolean): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      const timestamp = forceFullFetch
        ? 0
        : Math.max(
            ...Object.values(this.store.getFeatureFlags()).map((ff) => ff.timestamp),
            0,
          );

      this.networkService.createConnection(timestamp, (message: IStreamResponse) => {
        if (message && message.userKeyId === this._option.user?.keyId) {
          const { featureFlags } = message;

          switch (message.eventType) {
            case StreamResponseEventType.full: // full data
            case StreamResponseEventType.patch: // partial data
              const data = {
                featureFlags: featureFlags.reduce(
                  (res, curr) => {
                    const {
                      id,
                      variation,
                      timestamp,
                      variationOptions,
                      sendToExperiment,
                      variationType,
                    } = curr;
                    res[id] = {
                      id,
                      variation,
                      timestamp,
                      variationOptions,
                      sendToExperiment,
                      variationType: variationType || VariationDataType.string,
                    };

                    return res;
                  },
                  {} as { [key: string]: IFeatureFlag },
                ),
              };

              if (message.eventType === StreamResponseEventType.full) {
                this.store.setFullData(data);
                logger.logDebug("synchonized with full data");
              } else {
                this.store.updateBulkFromRemote(data);
                logger.logDebug("synchonized with partial data");
              }

              break;
            default:
              logger.logDebug(
                "invalid stream event type: " + message.eventType,
              );
              break;
          }
        }

        resolve();
      });
    });
  }

  variation(key: string, defaultResult: FeatureFlagValue): FeatureFlagValue {
    const variation = this.variationWithInsightBuffer(key, defaultResult);
    return variation === undefined ? defaultResult : variation;
  }

  /**
   * deprecated, you should use variation method directly
   */
  boolVariation(key: string, defaultResult: boolean): boolean {
    const variation = this.variationWithInsightBuffer(key, defaultResult);
    return variation === undefined
      ? defaultResult
      : variation?.toLocaleLowerCase() === "true";
  }

  getUser(): IUser {
    return { ...this._option.user! };
  }

  sendCustomEvent(data: ICustomEvent[]): void {
    (data || []).forEach((d) =>
      this._insightsQueue.add({
        insightType: InsightType.customEvent,
        timestamp: Date.now(),
        type: "CustomEvent",
        ...d,
      }),
    );
  }

  sendFeatureFlagInsight(key: string, variation: string) {
    this.variation(key, variation);
  }

  getAllFeatureFlags(): IFeatureFlagSet {
    const flags = this.store.getFeatureFlags();

    return Object.values(flags).reduce((acc, curr) => {
      acc[curr.id] = parseVariation(curr.variationType, curr.variation);
      return acc;
    }, {});
  }

  variationWithInsightBuffer(key: string, defaultResult: string | boolean) {
    const variation = this.store.getVariation(key);
    if (variation === undefined) {
      eventHub.emit(featureFlagEvaluatedBufferTopic, {
        id: key,
        timestamp: Date.now(),
        variationValue: `${defaultResult}`,
      } as IFeatureFlagVariationBuffer);
    }

    return variation;
  }

  generateGuid(): string {
    let guid = localStorage.getItem("fb-guid");
    if (guid) {
      return guid;
    } else {
      const id = uuid();
      localStorage.setItem("fb-guid", id);
      return id;
    }
  }

  createOrGetAnonymousUser(): IUser {
    const sessionId = this.generateGuid();
  
    return {
      name: sessionId,
      keyId: sessionId,
    };
  }
}
