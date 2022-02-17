import { Command, CommandRunner, Option } from 'nest-commander'

interface CommandOptions {
  block: number
}

@Command({ name: 'indexer', description: 'A blockchain indexer' })
class RunCommand implements CommandRunner {
  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    // TODO: infinite loop from block X parsing and storing hashes
    if (options?.block !== undefined) {
      this.runWithNumber(passedParam, options.block)
    } else {
      this.runWithNone(passedParam)
    }
  }

  @Option({
    flags: '-b, --block [block]',
    description: 'A basic number parser',
  })
  parseNumber(val: string): number {
    return Number(val)
  }

  runWithNumber(param: string[], option: number): void {
    console.log({ param, block: option })
  }

  runWithNone(param: string[]): void {
    console.log({ param })
  }
}

export default RunCommand
