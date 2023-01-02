import { Controller, Get, Response } from '@nestjs/common'
import { SitemapStream, streamToPromise } from 'sitemap'
import staticPagesData from '../data/staticPagesData'

@Controller()
export default class SitemapController {
  @Get('sitemap')
  async sitemap(@Response() res: any) {
    res.set('Content-Type', 'text/xml')
    const smStream = new SitemapStream({
      hostname: 'https://iq.wiki',
    })
    staticPagesData.map(url =>
      smStream.write({
        url,
        changefreq: 'monthly',
        priority: 0.7,
      }),
    )
    smStream.end()
    streamToPromise(smStream).then((xml: any) => {
      res.send(xml)
    })
  }
}
