import { Injectable, NestMiddleware } from '@nestjs/common'
import { graphqlUploadExpress } from 'graphql-upload'

@Injectable()
class WikiMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    graphqlUploadExpress({ maxFileSize: 5000000, maxFiles: 3 })(req, res, next)
  }
}

export default WikiMiddleware
