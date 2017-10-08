import * as React from "react";
import { BaseContainer } from "../../../BaseContainer";
import classnames from "classnames";
import { SubscriptionContentsState, SubscriptionContentType } from "./SubscriptionContentsStore";
import {
    SubscriptionContent,
    SubscriptionContentIdentifier
} from "../../../../../domain/Subscriptions/SubscriptionContent/SubscriptionContent";
import { Link, ImageFit, Image, Toggle, Button } from "office-ui-fabric-react";
import { FocusContentUseCase } from "./use-case/FocusContentUseCase";
import { HTMLContent } from "../../../../ui-kit/HTMLContent";
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import format from "date-fns/format";
import { ProgressColorBar } from "../../../../project/ProgressColorBar/ProgressColorBar";
import { Subscription } from "../../../../../domain/Subscriptions/Subscription";
import { Time } from "../../../../ui-kit/Time/Time";
import { TurnOffContentsFilterUseCase, TurnOnContentsFilterUseCase } from "./use-case/ToggleFilterContents";
import { createFetchMoreSubscriptContentsUseCase } from "../../../../../use-case/subscription/FetchMoreSubscriptContentsUseCase";

export interface SubscriptionContentsContainerProps {
    subscriptionContents: SubscriptionContentsState;
}

/**
 * get Active Item from the scroll position
 * @see https://gist.github.com/azu/c306c1efa31f0f41aa01c5b69576d00c#file-reader_main-0-3-8-js-L1205
 * @returns {string}
 */
export function getActiveContentIdString(): string | undefined {
    const contentContainer = document.querySelector(".SubscriptionContentsContainer") as HTMLElement;
    const contentElements = document.querySelectorAll(".SubscriptionContentsContainer-content") as NodeListOf<
        HTMLElement
    >;
    const containerScrollTop = contentContainer.scrollTop;
    const containerOffsetHeight = contentContainer.offsetHeight;
    // TODO: should be computable
    // AppHeader's height = 32px
    const marginTopOfContentContainer = 32;
    const contentCount = contentElements.length;
    if (!contentCount) return;
    const offsets: number[] = [];
    for (let i = 0; i < contentCount; i++) {
        offsets.push(contentElements[i].offsetTop - marginTopOfContentContainer);
    }
    if (!contentContainer) {
        return;
    }
    const screen = [containerScrollTop, containerScrollTop + containerOffsetHeight];
    const pairs = offsets.map(function(v, i, element) {
        if (element[i + 1]) {
            return [v, element[i + 1]];
        } else {
            return [v, containerOffsetHeight];
        }
    });
    const full_contain: number[] = [];
    const intersections = pairs.map(function(pair, i) {
        if (pair[1] < screen[0]) return 0;
        if (pair[0] > screen[1]) return 0;
        const top = Math.max(screen[0], pair[0]);
        const bottom = Math.min(screen[1], pair[1]);
        if (top == pair[0] && bottom == pair[1]) {
            full_contain.push(i);
        }
        return bottom - top;
    });
    if (contentCount == 1) {
        const content = contentElements[0];
        return content.dataset.contentId;
    } else {
        if (full_contain.length > 0) {
            const offset = full_contain.shift();
            if (offset === undefined) {
                return;
            }
            const content = contentElements[offset];
            return content.dataset.contentId;
        } else {
            const max_intersection = Math.max.apply(null, intersections);
            const offset = max_intersection === 0 ? contentCount - 1 : intersections.indexOf(max_intersection);
            if (offset === undefined) {
                return;
            }
            const content = contentElements[offset];
            return content.dataset.contentId;
        }
    }
}

export class SubscriptionContentsContainer extends BaseContainer<SubscriptionContentsContainerProps, {}> {
    element: HTMLDivElement | null;
    private onChangedToggleContentsFilter = (checked: boolean) => {
        if (checked) {
            this.useCase(new TurnOnContentsFilterUseCase()).executor(useCase => useCase.execute());
        } else {
            this.useCase(new TurnOffContentsFilterUseCase()).executor(useCase => useCase.execute());
        }
    };
    private onClickReadMore = () => {
        const subscription = this.props.subscriptionContents.subscription;
        if (!subscription) {
            return;
        }
        this.useCase(createFetchMoreSubscriptContentsUseCase()).executor(useCase => useCase.execute(subscription.id));
    };

    render() {
        const header = this.makeHeaderContent(this.props.subscriptionContents.subscription);
        if (!this.props.subscriptionContents.contents) {
            return (
                <div className="SubscriptionContentsContainer is-noContents">
                    <div className="SubscriptionContentsContainer-body">
                        <p className="SubscriptionContentsContainer-bodyMessage">No contents</p>
                    </div>
                </div>
            );
        }
        const contents = this.props.subscriptionContents.contents
            .getContentList()
            .map((content, index) => this.makeContent(content, index));
        return (
            <div
                ref={c => (this.element = c)}
                className={classnames("SubscriptionContentsContainer", this.props.className)}
            >
                <ProgressColorBar
                    color="#a5c5ff"
                    height={3}
                    isCompleted={!this.props.subscriptionContents.isContentsLoadings}
                />
                {header}
                <div role="main" className="SubscriptionContentsContainer-body">
                    {contents}
                </div>
                <footer className="SubscriptionContentsContainer-footer">
                    <div className="SubscriptionContentsContainer-readMore">
                        <Button className="SubscriptionContentsContainer-readMoreButton" onClick={this.onClickReadMore}>
                            Read More
                        </Button>
                    </div>
                    <div
                        className="SubscriptionContentsContainer-footerPadding"
                        style={{
                            height: 1000
                        }}
                    />
                </footer>
            </div>
        );
    }

    componentDidUpdate(prevProps: SubscriptionContentsContainerProps) {
        if (
            prevProps.subscriptionContents.subscription &&
            !prevProps.subscriptionContents.subscription.equals(this.props.subscriptionContents.subscription)
        ) {
            if (this.element) {
                this.element.scrollTo(0, 0);
            }
            this.onContentChange();
        }
        const scrollContentId = this.props.subscriptionContents.scrollContentId;
        if (scrollContentId && prevProps.subscriptionContents.scrollContentId !== scrollContentId) {
            this.scrollToContentId(scrollContentId);
        }
        this.updateCurrentFocus();
    }

    private makeHeaderContent(subscription?: Subscription) {
        if (!subscription) {
            return null;
        }
        const editLink = (
            <Link
                className="SubscriptionContentsContainer-subscriptionEditLink"
                title="Edit subscription"
                href={`https://www.inoreader.com/feed/${encodeURIComponent(subscription.url)}`}
            >
                <i className="ms-Icon ms-Icon--Settings" aria-hidden="true" />
            </Link>
        );
        const updatedCount =
            this.props.subscriptionContents.updatedContentsCount !== 0
                ? this.props.subscriptionContents.updatedContentsCount
                : undefined;
        return (
            <header className="SubscriptionContentsContainer-header">
                <div className="SubscriptionContentsContainer-headerLeft">
                    <h2 className="SubscriptionContentsContainer-subscriptionTitle">
                        <Image
                            className="SubscriptionContentsContainer-subscriptionImage"
                            src={subscription.iconUrl}
                            width={18}
                            height={18}
                            imageFit={ImageFit.cover}
                        />
                        <Link className="SubscriptionContentsContainer-subscriptionLink" href={subscription.htmlUrl}>
                            {subscription.title}
                        </Link>
                        <span className="SubscriptionContentsContainer-subscriptionUnreadCount">
                            ({subscription.unread.formatString + (updatedCount ? ` + ${updatedCount}` : "")}
                            )
                        </span>
                        {editLink}
                        <span className="SubscriptionContentsContainer-subscriptionUpdatedDate">
                            First Item:
                            <Time dateTime={subscription.lastUpdated.isoString}>
                                {format(subscription.lastUpdated.date, "YYYY-MM-DD mm:ss")}
                            </Time>
                        </span>
                    </h2>
                </div>
                <div className="SubscriptionContentsContainer-headerRight">
                    <Toggle
                        defaultChecked={true}
                        onAriaLabel="Show all contents"
                        offAriaLabel="Show only unread contents"
                        onText="Unread"
                        offText="All"
                        onChanged={this.onChangedToggleContentsFilter}
                    />
                </div>
            </header>
        );
    }

    private onContentChange() {
        if (this.element) {
            const observer = new IntersectionObserver(
                entries => {
                    this.updateCurrentFocus();
                },
                {
                    root: this.element,
                    threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
                }
            );
            Array.from(document.querySelectorAll(".SubscriptionContentsContainer-content")).forEach(element => {
                observer.observe(element);
            });
        }
    }

    private updateCurrentFocus() {
        const activeItemId = getActiveContentIdString();
        if (activeItemId) {
            const contentId = this.props.subscriptionContents.getContentId(activeItemId);
            if (!contentId.equals(this.props.subscriptionContents.focusContentId)) {
                this.useCase(new FocusContentUseCase()).executor(useCase => useCase.execute(contentId));
            }
        }
    }

    private makeContent(content: SubscriptionContent, index: number) {
        const isFocus = this.props.subscriptionContents.isFocusContent(content);
        const updateType = this.props.subscriptionContents.getTypeOfContent(content);
        const contentIdString = content.id.toValue();
        const author = content.author ? (
            <span>
                <span> by </span>
                <span className="SubscriptionContentsContainer-contentAuthor">{content.author}</span>
            </span>
        ) : null;
        const updatedFooter = content.publishedDate.equals(content.updatedDate) ? null : (
            <span>
                <span> | </span>
                <label>Updated: </label>
                <time
                    className="SubscriptionContentsContainer-contentUpdatedTime"
                    dateTime={content.updatedDate.isoString}
                >
                    {format(content.updatedDate.date, "YYYY-MM-DD mm:ss")}
                </time>
            </span>
        );
        return (
            <div
                className={classnames("SubscriptionContentsContainer-content", {
                    "is-focus": isFocus,
                    "is-new": updateType === SubscriptionContentType.NEW,
                    "is-updated": updateType === SubscriptionContentType.UPDATED
                })}
                key={`${contentIdString}-${index}`}
                data-content-id={contentIdString}
            >
                <header className="SubscriptionContentsContainer-contentHeader">
                    <h2 className="SubscriptionContentsContainer-contentTitle">
                        <Link
                            className="SubscriptionContentsContainer-contentTitleLink"
                            href={content.url}
                            target="_blank"
                            rel="noopener"
                        >
                            {content.title}
                        </Link>
                    </h2>
                    <div className="SubscriptionContentsContainer-contentMeta">
                        <Link
                            className="SubscriptionContentsContainer-contentOriginalLink"
                            href={content.url}
                            target="_blank"
                            rel="noopener"
                        >
                            Original
                        </Link>
                        <span> | </span>
                        <time
                            className="SubscriptionContentsContainer-contentUpdatedTime"
                            dateTime={content.updatedDate.isoString}
                        >
                            {distanceInWordsToNow(content.updatedDate.date)}
                        </time>
                        {author}
                    </div>
                </header>
                <HTMLContent className="SubscriptionContentsContainer-contentBody">
                    {content.body.HTMLString}
                </HTMLContent>
                <footer className="SubscriptionContentsContainer-contentFooter">
                    <label>Posted: </label>
                    <time
                        className="SubscriptionContentsContainer-contentPostedTime"
                        dateTime={content.publishedDate.isoString}
                    >
                        {format(content.publishedDate.date, "YYYY-MM-DD mm:ss")}
                    </time>
                    {updatedFooter}
                </footer>
            </div>
        );
    }

    private scrollToContentId(scrollContentId: SubscriptionContentIdentifier) {
        const targetElement = document.querySelector(`[data-content-id="${scrollContentId.toValue()}"]`);
        if (targetElement) {
            targetElement.scrollIntoView();
        }
    }
}
