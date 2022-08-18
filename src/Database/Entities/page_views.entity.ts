
import { Column, Entity, PrimaryColumn } from 'typeorm'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
@Entity()
class PageViews {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  wiki_id!: string

  @Field(() => Int)
  @Column('integer')
  views!: number

}

export default PageViews
