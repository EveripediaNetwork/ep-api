import { Controller, Post, Get } from '@nestjs/common'

@Controller('/api')
export default class LogsController {
  @Post()
  findAll(): string {
    return 'This action returns all cats'
  }

  @Get()
  findAl(): string {
    return 'This action returns all cats'
  }
}
