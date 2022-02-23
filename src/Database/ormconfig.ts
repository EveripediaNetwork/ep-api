import { ConnectionOptions } from 'typeorm'
import Wiki from './Entities/wiki.entity'
import Tag from './Entities/tag.entity'
import Category from './Entities/category.entity'
import User from './Entities/user.entity'
import Language from './Entities/language.entity'
import config from '../config'

const dbConfig: ConnectionOptions = {
  type: 'mysql',
  host: config.dbHost,
  port: 3306,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  // logging: 'all',
  debug: false,
  logger: 'advanced-console',
  entities: [Wiki, Tag, Category, User, Language],
  synchronize: false, // TODO: false in prod
}

export = dbConfig
