// MIT © 2017 azu
import { UseCase } from "almin";
import { InoreaderAPI } from "../../infra/api/InoreaderAPI";
import { repositoryContainer } from "../../infra/repository/RepositoryContainer";
import { AppRepository } from "../../infra/repository/AppRepository";

export const createGoToOAuthPageUseCase = () => {
    return new GoToOAuthPageUseCase(repositoryContainer.get());
};

export class GoToOAuthPageUseCase extends UseCase {
    constructor(
        private repo: {
            appRepository: AppRepository;
        }
    ) {
        super();
    }

    execute() {
        const app = this.repo.appRepository.get();
        const client = new InoreaderAPI(app.user.authority);
        location.href = client.getAuthorizeUrl();
    }
}
