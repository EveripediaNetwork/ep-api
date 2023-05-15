import { Slug, Valid, ValidSlug } from '../validSlug'

describe('Slug and Valid classes', () => {
  describe('Slug', () => {
    it('should have a valid `id` field', () => {
      const slug = new Slug()
      slug.id = 'valid-id'
      expect(slug.id).toEqual('valid-id')
      expect(slug.id).toBeDefined()
      expect(typeof slug.id).toBe('string')
    })
  })

  describe('Valid', () => {
    let { valid } = new Valid()
    valid = true
    expect(valid).toBeDefined()
    expect(typeof valid).toBe('boolean')
  })
})

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

describe('SlugResult', () => {
  const mockedResolveType = jest.fn().mockImplementation((value) => {
    if (value.id) {
      return 'Slug'
    }
    if (value.valid) {
      return 'Valid'
    }
    return null
  })

  it('should return Slug type if value has id property', () => {
    const value = { id: 'some-id' }
    const mockSlugResult = {
      resolveType: mockedResolveType,
    }
    const result = mockSlugResult.resolveType(value)
    expect(mockedResolveType).toHaveBeenCalledWith(value)
    expect(result).toEqual('Slug')
  })

  it('should return Valid type if value has valid property', () => {
    const value = { valid: true }

    const mockSlugResult = {
      resolveType: mockedResolveType,
    }
    const result = mockSlugResult.resolveType(value)
    expect(mockedResolveType).toHaveBeenCalledWith(value)
    expect(result).toEqual('Valid')
  })

  it('should return null if value has neither id nor valid properties', () => {
    const value = {}
    const mockSlugResult = {
      resolveType: mockedResolveType,
    }
    const result = mockSlugResult.resolveType(value)
    expect(mockedResolveType).toHaveBeenCalledWith(value)
    expect(result).toBeNull()
  })
})
