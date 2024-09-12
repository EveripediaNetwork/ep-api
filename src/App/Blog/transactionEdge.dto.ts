import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { TransactionNode, TransactionNodeInput } from './transactionNode.dto'

@InputType()
export class TransactionEdgeInput {
  @Field(() => TransactionNodeInput)
  node?: TransactionNodeInput
}
@ObjectType()
export class TransactionEdge {
  @Field(() => TransactionNode)
  node?: TransactionNode
}
