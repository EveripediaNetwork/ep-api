import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ormConfig } from './database.config'

@Module({
  imports: [TypeOrmModule.forRootAsync(ormConfig)],
})
class DatabaseModule {}

export default DatabaseModule
