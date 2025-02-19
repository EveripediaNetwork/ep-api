import { Injectable } from '@nestjs/common'

@Injectable()
class ActivityService {
  async createCustomQuery(
    selections: any[],
    user: string,
    offset: number,
    limit: number,
  ): Promise<string> {
    const topLevelColumns = selections.filter(
      (e: string) => typeof e === 'string',
    )
    const topLevelColumnsWithQueryAlias = topLevelColumns.map((e: string) =>
      e === 'user' ? `atv."userId"` : `atv."${e}"`,
    )
    const topLevelSelections =
      topLevelColumnsWithQueryAlias.join(',\n              ')
    const contentJSONB = selections.filter(
      (e: string) => typeof e === 'object',
    ) as any[]

    const contentSelections = contentJSONB[0].selections.filter(
      (e: string) =>
        typeof e === 'string' && e !== 'created' && e !== 'updated',
    )
    const contentSelectedFields = contentSelections
      .map((e: string) => `'${e}', elem->>'${e}'`)
      .join(',\n                    ')
    const contentSelectionObjects = contentJSONB[0].selections.filter(
      (e: string) => typeof e === 'object',
    )

    const contentFields = contentSelectionObjects.map((e: any) => {
      const nestedSelect = e.selections
        .map((n: string) => `'${n}', ${e.name}al->>'${n}'`)
        .join(', ')
      return e.name === 'user' || e.name === 'author'
        ? `'${e.name}', jsonb_build_object('id', elem->'${e.name}'->>'id')`
        : `
                      '${e.name}', COALESCE((
                      SELECT jsonb_agg(
                          jsonb_build_object(${nestedSelect})
                      )
                      FROM jsonb_array_elements(elem->'${e.name}') ${e.name}al
                      ), '[]'::jsonb)`
    })

    const finalQuery = `
          SELECT
              w.*,
              atv."created_timestamp",
              atv."updated_timestamp",
              atv."userAddress",
              ${topLevelSelections},
              jsonb_agg(
                  jsonb_build_object(
                      ${contentSelectedFields},
                      ${contentFields}
                  )
              ) AS content
          FROM
              activity atv
          LEFT JOIN wiki w
          ON w."id" = atv."wikiId" AND w."hidden" = false
          CROSS JOIN jsonb_array_elements(atv.content) elem
          WHERE atv."userId" = '${user}'
          GROUP BY w.id, atv.id
          ORDER BY atv."datetime" DESC
          OFFSET ${offset}
          LIMIT ${limit}
       `
    return finalQuery
  }
}

export default ActivityService
