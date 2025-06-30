import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { DataSource } from 'typeorm'
import { GoogleGenAI, Type } from '@google/genai'
import endent from 'endent'
import Wiki from '../../Database/Entities/wiki.entity'

type WikiData = Pick<Wiki, 'id' | 'title' | 'summary'>
type WikiSearchResult = {
  wikis: Pick<Wiki, 'id' | 'title'>[]
}
type WikiContent = Pick<Wiki, 'id' | 'title' | 'content'>

const wikiSuggestionSchema = {
  type: Type.OBJECT,
  properties: {
    wikis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'The wiki ID' },
          title: { type: Type.STRING, description: 'The wiki title' },
        },
        required: ['id', 'title'],
      },
      description: 'Array of most relevant wikis for the query (max 5)',
    },
  },
  required: ['wikis'],
} as const

@Injectable()
class SearchService {
  private ai: GoogleGenAI | null = null

  private readonly modelName = 'gemini-2.0-flash'

  private readonly isProduction: boolean

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private dataSource: DataSource,
  ) {
    this.isProduction = this.configService.get<string>('API_LEVEL') === 'prod'

    if (this.isProduction) {
      this.ai = new GoogleGenAI({
        apiKey: this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY'),
      })
    }
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private async fetchAllWikis(): Promise<WikiData[]> {
    const wikiApiUrl = this.configService.get<string>('WIKI_API_URL')
    if (!wikiApiUrl) {
      throw new Error('WIKI_API_URL is not defined in configuration.')
    }

    const { data } = await this.httpService.axiosRef.get(`${wikiApiUrl}/wiki`)

    return data as WikiData[]
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const wikiEntries = wikis
      .map(
        (wiki) =>
          `ID: ${wiki.id}\nTITLE: ${wiki.title}\nSUMMARY: ${wiki.summary}\n---`,
      )
      .join('\n\n')

    const wikiContent = endent`WIKI KNOWLEDGE BASE (${wikis.length} entries)
              ===========================================

              ${wikiEntries}
`

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`Based on the following wiki knowledge base, suggest the most relevant wikis (maximum 5) that would help answer this query: "${query}"

      ${wikiContent}

      Please analyze the titles and summaries to find the most relevant wikis.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: wikiSuggestionSchema,
      },
    })

    if (!response.text) {
      throw new Error('Gemini returned no response text')
    }

    try {
      const result = JSON.parse(response.text) as WikiSearchResult
      return result.wikis || []
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Invalid JSON from Gemini response: ${errorMessage}`)
    }
  }

  private async getIQWikiContent(wikiId: string) {
    try {
      const wiki = await (await this.repository())
        .createQueryBuilder('wiki')
        .where('wiki.languageId = :lang', { lang: 'en' })
        .andWhere('wiki.id = :id', { id: wikiId })
        .andWhere('wiki.hidden = false')
        .getOne()

      if (!wiki?.content) {
        return null
      }

      return {
        id: wikiId,
        title: wiki.title,
        content: wiki.content,
      }
    } catch (error) {
      console.error(`Error fetching wiki ${wikiId}:`, error)
      return null
    }
  }

  private async fetchWikiContents(wikiIds: string[]) {
    if (!wikiIds || wikiIds.length === 0) {
      return []
    }

    const promises = wikiIds.map((wikiId) => this.getIQWikiContent(wikiId))
    const results = await Promise.allSettled(promises)

    return results
      .filter(
        (result): result is PromiseFulfilledResult<WikiContent> =>
          result.status === 'fulfilled' && result.value !== null,
      )
      .map((result) => result.value)
  }

  private async answerQuestion(query: string, wikiContents: WikiContent[]) {
    if (!this.ai) {
      throw new Error('AI service not available - production mode required')
    }

    const contextContent = wikiContents
      .map((wiki) => `WIKI: ${wiki.title}\nCONTENT: ${wiki.content}\n---`)
      .join('\n\n')

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`You are a wiki expert. Answer this question directly and concisely: "${query}"

      CONTEXT:
      ${contextContent}

      Provide a comprehensive answer that includes:
      1. Main definition/explanation
      2. Key features and components
      3. How it works or functions
      4. Important relationships or connections
      5. Any relevant technical details

      Use all available information from the wikis to give a complete picture. `,
    })

    return response.text || 'No answer generated'
  }

  async searchWithoutCache(query: string) {
    try {
      const allWikis = await this.fetchAllWikis()
      const suggestions = await this.getWikiSuggestions(allWikis, query)
      const wikiIds = suggestions.map((wiki) => wiki.id)
      const wikiContents = await this.fetchWikiContents(wikiIds)

      let answer =
        'No wiki content was successfully fetched to answer the question.'

      if (wikiContents.length > 0) {
        answer = await this.answerQuestion(query, wikiContents)
      }

      return {
        suggestions,
        answer,
      }
    } catch (error) {
      console.error('Error in searchWithoutCache:', error)
      throw error
    }
  }

  async search(query: string) {
    const { suggestions, answer } = await this.searchWithoutCache(query)
    return {
      suggestions,
      answer,
    }
  }
}

export default SearchService
