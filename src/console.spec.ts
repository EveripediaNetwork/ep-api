import { CommandFactory } from 'nest-commander'
import IndexerModule from './Indexer/indexer.module'
import bootstrapConsole from './console'

describe('bootstrapConsole', () => {
  let consoleErrorSpy: jest.SpyInstance<
    void,
    [message?: any, ...optionalParams: any[]]
  >

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should run CommandFactory with the correct parameters', async () => {
    const runSpy = jest.spyOn(CommandFactory, 'run').mockResolvedValueOnce()

    await bootstrapConsole()

    expect(runSpy).toHaveBeenCalledWith(IndexerModule)

    expect(consoleErrorSpy).not.toHaveBeenCalled()

    runSpy.mockRestore()
  })

  it('should log error to console if errorHandler is called', async () => {
    const error = new Error('Test error')
    jest.spyOn(CommandFactory, 'run').mockRejectedValueOnce(error)

    await bootstrapConsole()

    expect(consoleErrorSpy).toHaveBeenCalledWith(error)
  })
})
