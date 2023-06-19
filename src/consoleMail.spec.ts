import { CommandFactory } from 'nest-commander'
import NotificationsModule from './App/notifications/notifications.module'
import bootstrapConsoleMail from './consoleMail'

describe('bootstrapConsoleMail', () => {
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

    await bootstrapConsoleMail()

    expect(runSpy).toHaveBeenCalledWith(NotificationsModule)

    expect(consoleErrorSpy).not.toHaveBeenCalled()

    runSpy.mockRestore()
  })

  it('should log error to console if CommandFactory.run throws an error', async () => {
    const error = new Error('Test error')
    jest.spyOn(CommandFactory, 'run').mockRejectedValueOnce(error)

    await bootstrapConsoleMail()

    expect(consoleErrorSpy).toHaveBeenCalledWith(error)
  })
})
