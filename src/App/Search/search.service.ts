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
  private ai: GoogleGenAI

  private readonly modelName = 'gemini-2.5-flash'

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private dataSource: DataSource,
  ) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY'),
    })
  }

  async repository() {
    return this.dataSource.manager.getRepository(Wiki)
  }

  private async fetchAllWikis() {
    const { data } = await this.httpService.axiosRef.get(
      'https://api.iq.wiki/wiki',
    )
    return data as WikiData[]
  }

  private async getWikiSuggestions(wikis: WikiData[], query: string) {
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
      throw new Error(`Invalid JSON from Gemini response: ${e.message}`)
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
    const contextContent = wikiContents
      .map((wiki) => `WIKI: ${wiki.title}\nCONTENT: ${wiki.content}\n---`)
      .join('\n\n')

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: endent`Based on the following wiki content, please answer this question: "${query}"

      WIKI CONTEXT:
      ${contextContent}

      Please provide a comprehensive answer based on the information available in the wikis. If the information is not sufficient to answer the question completely, please indicate what is available and what might be missing.`,
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
