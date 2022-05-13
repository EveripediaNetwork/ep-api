import { Injectable, NestMiddleware } from '@nestjs/common'
import { graphqlUploadExpress } from 'graphql-upload'

@Injectable()
class PinMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    graphqlUploadExpress({ maxFileSize: 2000000, maxFiles: 3 })(req, res, next)
  }
}

export default PinMiddleware
