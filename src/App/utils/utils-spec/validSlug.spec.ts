import { ValidSlug } from '../validSlug'


describe('ValidSlug', () => {
  let validSlug: ValidSlug

  beforeEach(() => {
    validSlug = new ValidSlug()
  })

  describe('validateSlug', () => {
    it('should return a new slug with an incremented identifier if the given slug already exists', async () => {
      const id = 'test-1'
      const result = await validSlug.validateSlug(id)
      expect(result).toEqual({ id: 'test-2' })
    })

    it('should return a new slug with identifier 1 if the given slug does not exist', async () => {
      const id = 'test'
      const result = await validSlug.validateSlug(id)
      expect(result).toEqual({ id: 'test-1' })
    })

    it('should return { valid: true } if no slug is provided', async () => {
      const result = await validSlug.validateSlug()
      expect(result).toEqual({ valid: true })
    })
  })
})
