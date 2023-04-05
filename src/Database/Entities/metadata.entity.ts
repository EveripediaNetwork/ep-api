import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
class Metadata {
	@Field()
	id!: string;

	@Field()
	value!: string;
}

export default Metadata;
