// MIT © 2017 azu
import { UseCase } from "almin";
import { subscriptionRepository, SubscriptionRepository } from "../../infra/repository/SubscriptionRepository";
import { SubscriptionContentIdentifier } from "../../domain/Subscriptions/SubscriptionContent/SubscriptionContent";
import { SubscriptionIdentifier } from "../../domain/Subscriptions/Subscription";

export const createOpenSubscriptionContentInNewTabUseCase = () => {
    return new OpenSubscriptionContentInNewTabUseCase({
        subscriptionRepository
    });
};

export class OpenSubscriptionContentInNewTabUseCase extends UseCase {
    constructor(private repo: { subscriptionRepository: SubscriptionRepository }) {
        super();
    }

    execute(subscriptionId: SubscriptionIdentifier, subscriptionContentId: SubscriptionContentIdentifier) {
        const subscription = this.repo.subscriptionRepository.findById(subscriptionId);
        if (!subscription) {
            throw new Error(`Not found subscription: ${subscriptionId}`);
        }
        const content = subscription.contents.findContentById(subscriptionContentId);
        if (!content) {
            throw new Error(`Not found content ${subscriptionContentId} in subscription ${subscriptionContentId}`);
        }
        window.open(content.url, "_blank");
    }
}
