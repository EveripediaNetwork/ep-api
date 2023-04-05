import {
	HttpException,
	HttpStatus,
	Injectable,
	ExecutionContext,
	CanActivate,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DataSource } from "typeorm";
import User from "../../Database/Entities/user.entity";

@Injectable()
export default class IsActiveGuard implements CanActivate {
	constructor(private dataSource: DataSource) {}

	private async authorizeUser(id: string) {
		const repository = this.dataSource.getRepository(User);
		const user = await repository.findOne({
			where: { id: `LOWER("User".id) = '${id.toLowerCase()}'` },
		});

		if (user?.active || !user) {
			return true;
		}
		throw new HttpException("User not allowed!", HttpStatus.FORBIDDEN);
	}

	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const ctx = GqlExecutionContext.create(context);
		const requestBody = ctx.getArgByIndex(1);
		if (ctx.getInfo().path.key === "pinJSON") {
			const { id } = JSON.parse(requestBody.data).user;
			return this.authorizeUser(id);
		}
		if (ctx.getInfo().path.key === "createProfile") {
			const { id } = JSON.parse(requestBody.profileInfo);
			return this.authorizeUser(id);
		}
		return this.authorizeUser(requestBody.id);
	}
}
