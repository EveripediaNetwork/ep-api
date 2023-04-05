import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export default class Relayer {
	@Field()
	hash!: string;
}
