// pm2.module.ts
import { Module } from '@nestjs/common'
import Pm2Service from './pm2Service'

@Module({
  providers: [Pm2Service],
  exports: [Pm2Service],
})
export default class Pm2Module {}
