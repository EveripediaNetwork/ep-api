import { Controller, Get, Response } from '@nestjs/common'
import { SitemapStream, streamToPromise } from 'sitemap'
import staticPagesData from '../data/staticPagesData'

@Controller()
export default class SitemapController {
  sitemapXmlCache: any;
  sitemapTimeoutMs = 1000 * 60 * 60;
  @Get('sitemap')
  async sitemap(@Response() res: any) {
    res.set('Content-Type', 'text/xml')
    const smStream = new SitemapStream({
      hostname: 'https://iq.wiki',
      lastmodDateOnly: true
    })
    staticPagesData.map(url =>
      smStream.write({
        url,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: new Date()
      }),
    )
    smStream.end()
    streamToPromise(smStream).then((xml: any) => {
      res.send(xml)
    })
  }
}
