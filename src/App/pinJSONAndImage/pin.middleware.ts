import { Injectable, NestMiddleware } from '@nestjs/common'
import { graphqlUploadExpress } from 'graphql-upload'

@Injectable()
class PinMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    graphqlUploadExpress({
      maxFieldSize: 1000000, // 1MB
      maxFileSize: 10000000, // 10MB
      maxFiles: 3,
    })(req, res, next)
  }
}

export default PinMiddleware
