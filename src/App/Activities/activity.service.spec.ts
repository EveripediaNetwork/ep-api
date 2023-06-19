import ActivityService from './activity.service'

export const selections = [
  'ipfs',
  'created',
  'user',
  {
    name: 'content',
    selections: [
      'id',
      { name: 'user', selections: ['id'] },
      { name: 'metadata', selections: ['id'] },
    ],
  },
]

export const expectedQuery = `
          SELECT
              w.*,
              atv."created_timestamp",
              atv."updated_timestamp",
              atv."userAddress",
              atv."ipfs",
              atv."created",
              atv."userId",
              jsonb_agg(
                  jsonb_build_object(
                      'id', elem->>'id',
                      'user', jsonb_build_object('id', elem->'user'->>'id'),
                      'metadata', COALESCE((
                      SELECT jsonb_agg(
                          jsonb_build_object('id', metadataal->>'id')
                      )
                      FROM jsonb_array_elements(elem->'metadata') metadataal
                      ), '[]'::jsonb)
                  )
              ) AS content
          FROM
              activity atv
          LEFT JOIN wiki w
          ON w."id" = atv."wikiId" AND w."hidden" = false
          CROSS JOIN jsonb_array_elements(atv.content) elem
          WHERE atv."userId" = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e'
          GROUP BY w.id, atv.id
          ORDER BY atv."datetime" DESC
          OFFSET 0
          LIMIT 10
       `

describe('ActivityService', () => {
  let activityService: ActivityService

  beforeEach(() => {
    activityService = new ActivityService()
  })

  describe('getDBQuery', () => {
    it('should return the expected DB query string', async () => {
      const user = '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e'
      const offset = 0
      const limit = 10

      const query = await activityService.createCustomQuery(
        selections,
        user,
        offset,
        limit,
      )
      expect(typeof query).toBe('string')
      expect(query).toEqual(expectedQuery)
    })
  })
})
