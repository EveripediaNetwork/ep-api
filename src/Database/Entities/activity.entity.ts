/* eslint-disable import/no-cycle */
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from "typeorm";

import {
	Field,
	GraphQLISODateTime,
	ID,
	Int,
	ObjectType,
	registerEnumType,
} from "@nestjs/graphql";

import Wiki from "./wiki.entity";
import User from "./user.entity";
import Language from "./language.entity";

export enum Status {
	CREATED,
	UPDATED,
}

registerEnumType(Status, {
	name: "Status",
});

@ObjectType()
@Entity()
class Activity {
	@Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
	id!: string;

	@Field(() => User)
  @ManyToOne('User', 'user', { lazy: true })
  @Index('idx_activity_userId')
	user!: Relation<User>;

	@Field(() => String)
  @Column('varchar')
	wikiId!: string;

	@Field(() => Language)
  @ManyToOne('Language', 'language', { lazy: true, nullable: true })
  @Index('idx_activity_languageId')
	language!: Relation<Language>;

	@Field(() => Int)
  @Column('integer', { nullable: true })
	block!: number;

	@Field(() => Status)
  @Column('enum', { enum: Status })
	type!: Status;

	@Field(() => [Wiki])
  @Column('jsonb')
	content!: Wiki[];

	@Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  @Index('idx_activity_datetime')
	datetime!: Date;

	@Field()
  @Column('varchar', { nullable: true })
	ipfs!: string;
}

export default Activity;
