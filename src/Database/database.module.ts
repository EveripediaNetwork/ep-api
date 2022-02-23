import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as ormconfig from './ormconfig'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...ormconfig,
      autoLoadEntities: true,
      keepConnectionAlive: true,
    }),
  ],
})
class DatabaseModule {}

export default DatabaseModule
