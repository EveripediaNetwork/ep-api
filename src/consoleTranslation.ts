import { CommandFactory } from 'nest-commander'
import TranslationModule from './App/Translation/translation.module'

async function bootstrapConsoleTranslation() {
  await CommandFactory.run(TranslationModule, {
    errorHandler: (err) => {
      console.error(err)
    },
  })
}

if (require.main === module) {
  bootstrapConsoleTranslation()
}

export default bootstrapConsoleTranslation
