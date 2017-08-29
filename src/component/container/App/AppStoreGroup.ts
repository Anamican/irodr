// MIT © 2017 azu
import { StoreGroup } from "almin";
import { SubscriptionListStore } from "./Subscription/SubscriptionList/SubscriptionListStore";
import { subscriptionRepository } from "../../../infra/repository/SubscriptionRepository";
import { SubscriptionContentsStore } from "./Subscription/SubscriptionContents/SubscriptionContentsStore";
import { AppHeaderStore } from "./AppHeader/AppHeaderStore";
import { appRepository } from "../../../infra/repository/AppRepository";
import { AppPreferencesStore } from "./Preferences/AppPreferencesStore";

export const appStoreGroup = new StoreGroup({
    subscriptionList: new SubscriptionListStore({
        appRepository,
        subscriptionRepository
    }),
    subscriptionContents: new SubscriptionContentsStore({
        appRepository,
        subscriptionRepository
    }),
    appHeader: new AppHeaderStore({
        subscriptionRepository
    }),
    appPreferences: new AppPreferencesStore({
        appRepository
    })
});
