import { NestFactory } from '@nestjs/core'
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants'
import AppModule from '../App/app.module'

const setup = async () => {
  const app = await NestFactory.create(AppModule)
  const typeOrmModuleOptions = app.get(TYPEORM_MODULE_OPTIONS)
  await app.close()

  return typeOrmModuleOptions
}

export = setup()
