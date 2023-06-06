import staticPagesData from './staticPagesData'

it('should have correct structure and contents in staticPagesData', () => {
  expect(staticPagesData).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        url: expect.any(String),
        priority: expect.any(Number),
        changeFreq: expect.any(String),
      }),
    ]),
  )
})
