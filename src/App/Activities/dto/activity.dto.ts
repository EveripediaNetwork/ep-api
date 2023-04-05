import { ArgsType, Field, Int } from "@nestjs/graphql";
import { Validate } from "class-validator";
import PaginationArgs from "../../pagination.args";
import ValidStringParams from "../../utils/customValidator";
import { ActivityType } from "../../utils/queryHelpers";

@ArgsType()
export class ActivityArgs extends PaginationArgs {
	@Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
	wikiId!: string;

	@Field(() => String)
  @Validate(ValidStringParams)
	lang = "en";
}

@ArgsType()
export class ActivityArgsByUser extends PaginationArgs {
	@Field(() => String)
  @Validate(ValidStringParams)
	userId!: string;
}
@ArgsType()
export class ActivityByCategoryArgs extends PaginationArgs {
	@Field(() => ActivityType)
	type = ActivityType.CREATED;

	@Field(() => String)
  @Validate(ValidStringParams)
	category!: string;
}

@ArgsType()
export class ByIdAndBlockArgs extends ActivityArgs {
	@Field(() => Int)
	block!: number;
}
