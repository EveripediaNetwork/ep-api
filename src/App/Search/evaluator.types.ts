import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
class EvaluationScores {
  @Field(() => Number)
  accuracy!: number

  @Field(() => Number)
  completeness!: number

  @Field(() => Number)
  clarity!: number

  @Field(() => Number)
  citations!: number
}

@ObjectType()
class EvaluationMetadata {
  @Field(() => String)
  judge_model!: string

  @Field(() => String)
  judged_at!: string

  @Field(() => String)
  query!: string
}

@ObjectType()
class EvaluationResult {
  @Field(() => String)
  verdict!: 'loop' | 'largeContext' | 'tie'

  @Field(() => EvaluationScores)
  overall_scores!: EvaluationScores

  @Field(() => String)
  reasoning!: string

  @Field(() => EvaluationMetadata)
  metadata!: EvaluationMetadata
}

export default EvaluationResult
