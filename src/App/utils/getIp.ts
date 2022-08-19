import { createParamDecorator } from '@nestjs/common'
import * as requestIp from 'request-ip'

const IpAddress = createParamDecorator((data, req) => {
  if (req.clientIp) return req.clientIp
  return requestIp.getClientIp(req)
})

export default IpAddress
