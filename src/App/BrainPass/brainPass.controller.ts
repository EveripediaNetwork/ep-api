import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common'
import { Response } from 'express'
import BrainPassRepository from './brainPass.repository'

@Controller('brainpass')
class BrainPassController {
  constructor(private brainPassRepository: BrainPassRepository) {}

  @Get('/:id')
  async getBrainPass(@Param('id') id: number, @Res() res: Response) {
    const brainPass = await this.brainPassRepository.findBrainPass(id)
    if (!brainPass) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Not found',
      })
    }
    return res.status(200).json(brainPass)
  }
}
export default BrainPassController
