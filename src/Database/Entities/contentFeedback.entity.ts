import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: 'User subscriptions' })
@Entity()
class ContentFeedback {
	@Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
	id!: string;

	@Field({ nullable: true })
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
	userId?: string;

	@Field()
  @Column('varchar', {
    length: 255,
  })
	wikiId!: string;

	@Field()
  @Column('varchar', {
    length: 255,
  })
	ip!: string;

	@Field()
  @Column('boolean')
	choice!: boolean;
}

export default ContentFeedback;
