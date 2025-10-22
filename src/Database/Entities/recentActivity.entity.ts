import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType()
@Entity()
class RecentActivity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field(() => String)
  @Column('varchar', { unique: true })
  wikiId!: string

  @Field(() => String)
  @Column('json')
  recentActivity!: string
}

export default RecentActivity
