import { Injectable } from '@nestjs/common'
import { generateObject, jsonSchema } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

import LoopSearchService from './loop-search.service'
import SearchService from './search.service'

export const evaluationJsonSchema = jsonSchema<{
  verdict: 'loop' | 'largeContext' | 'tie'
  overall_scores: {
    accuracy: number
    completeness: number
    clarity: number
    citations: number
  }
  reasoning: string
  metadata: {
    judge_model: string
    judged_at: string
    query: string
  }
}>({
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['loop', 'largeContext', 'tie'],
      description:
        'Overall winner: which system produced the better final answer.',
    },
    overall_scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        accuracy: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'How factually correct the answer is',
        },
        completeness: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'How fully the answer covers the query',
        },
        clarity: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'How clear and easy to understand the answer is',
        },
        citations: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'How well the answer cites and uses sources',
        },
      },
      required: ['accuracy', 'completeness', 'clarity', 'citations'],
    },
    reasoning: {
      type: 'string',
      minLength: 20,
      maxLength: 2000,
      description:
        'Concise explanation summarizing the judgement and key differences.',
    },
    metadata: {
      type: 'object',
      properties: {
        judge_model: {
          type: 'string',
          description: 'The model used for judging (e.g. claude-3.5)',
        },
        judged_at: {
          type: 'string',
          format: 'date-time',
          description: 'UTC timestamp of when evaluation was performed',
        },
        query: {
          type: 'string',
          description: 'The original user query',
        },
      },
      required: ['judge_model', 'judged_at', 'query'],
      additionalProperties: false,
    },
  },
  required: ['verdict', 'overall_scores', 'reasoning', 'metadata'],
  additionalProperties: false,
})

const judgeSystemPrompt = `
You are "Aevaultor" — a professional, impartial AI evaluation agent created by Braindao.
Personality: rigorous, concise, and objective.

Task:
- You will receive: 1) the user query, 2) LoopSearchService's final answer, 3) LargeContextService's final answer.
- Judge which answer is better for accuracy, completeness, clarity, and citation quality.
- Reply ONLY with valid JSON matching the given schema.
- Do NOT output explanations, thoughts, or commentary outside the JSON.

Scoring rules:
1. Accuracy: Penalize factual errors and unsupported claims.
2. Completeness: Check if the answer covers the query fully.
3. Clarity: Consider readability and usefulness.
4. Citations: Consider use of provided sources.

If both are equal → "tie".
Always set metadata.judge_model to the model name and metadata.judged_at to current UTC datetime (ISO 8601).
`

@Injectable()
class SearchEvaluator {
  private readonly openrouter = createOpenRouter({
    apiKey: (() => {
      const key = process.env.OPENROUTER_API_KEY
      if (!key) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set')
      }
      return key
    })(),
  })

  private static readonly judgeModel = 'openai/gpt-4.1-mini'

  constructor(
    private loopService: LoopSearchService,
    private largeContextService: SearchService,
  ) {}

  async generateAnswers(query: string) {
    const [loop, largeContext] = await Promise.all([
      this.loopService.generateAnswer(query, true),
      this.largeContextService.searchWithoutCache(query, true),
    ])
    return { query, loop, largeContext }
  }

  async judge(query: string) {
    const { loop, largeContext } = await this.generateAnswers(query)

    const userPayload = `
          Query:
          ${query}

          Loop Answer:
          ${loop.answer}

          Large Context Answer:
          ${largeContext.answer}
        `

    const result = await generateObject({
      model: this.openrouter(SearchEvaluator.judgeModel),
      schema: evaluationJsonSchema,
      messages: [
        { role: 'system', content: judgeSystemPrompt },
        { role: 'user', content: userPayload },
      ],
    })

    return {
      query,
      loop,
      largeContext,
      evaluation: result.object,
    }
  }
}

export default SearchEvaluator
