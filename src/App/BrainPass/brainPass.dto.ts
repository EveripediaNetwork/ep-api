import { IsNumber, IsString } from 'class-validator'

class BrainPassDto {
  @IsNumber()
  nftId!: number

  @IsString()
  address!: string

  @IsString()
  image!: string

  @IsString()
  name!: string

  @IsString()
  description!: string

  @IsString()
  externalUrl!: string

  @IsNumber()
  amount!: number

  @IsString()
  transactionHash!: string
}

export default BrainPassDto
