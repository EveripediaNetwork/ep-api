import { Controller, Get, Response } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SitemapStream, streamToPromise } from 'sitemap'
import CategoryService from '../../App/category.service'
import WikiService from '../../App/Wiki/wiki.service'
import staticPagesData from '../data/staticPagesData'

@Controller()
export default class SitemapController {
  sitemapXmlCache!: Buffer | null

  sitemapTimeoutMs = 1000 * 60 * 60

  lastmod = new Date()

  constructor(
    private wikiService: WikiService,
    private configService: ConfigService,
    private categoryService: CategoryService,
  ) {}

  @Get('sitemap.xml')
  async sitemap(@Response() res: any) {
    res.set('Content-Type', 'text/xml')
    if (this.sitemapXmlCache) {
      res.send(this.sitemapXmlCache)
      return
    }
    const smStream = new SitemapStream({
      hostname: this.configService.get('WEBSITE_URL'),
      lastmodDateOnly: true,
    })
    staticPagesData.map((data) =>
      smStream.write({
        url: data.url,
        changefreq: data.changeFreq,
        priority: data.priority,
        lastmod: this.lastmod,
      }),
    )
    const [wikisIds, categoriesId] = await Promise.all([
      this.wikiService.wikisIds(),
      this.categoryService.categoriesIds(),
    ])
    wikisIds.map((wiki) =>
      smStream.write({
        url: `/wiki/${wiki.id}`,
        changefreq: 'daily',
        priority: 1,
        lastmod: wiki.updated,
      }),
    )
    categoriesId.map((category) =>
      smStream.write({
        url: `/categories/${category.id}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: this.lastmod,
      }),
    )
    smStream.end()
    streamToPromise(smStream).then((xml: Buffer) => {
      this.sitemapXmlCache = xml
      setTimeout(() => {
        this.sitemapXmlCache = null
      }, this.sitemapTimeoutMs)
      res.send(xml)
    })
  }
}
