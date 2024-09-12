import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { TransactionEdge, TransactionEdgeInput } from './transactionEdge.dto'

@InputType()
export class TransactionsInput {
  @Field(() => [TransactionEdgeInput])
  edges: TransactionEdgeInput[] = []
}
@ObjectType()
export class Transactions {
  @Field(() => [TransactionEdge])
  edges: TransactionEdge[] = []
}
@InputType()
export class RawTransactionsInput {
  @Field(() => TransactionsInput)
  transactions?: TransactionsInput
}
@InputType()
export class RawTransactions {
  @Field(() => Transactions)
  transactions?: Transactions
}
