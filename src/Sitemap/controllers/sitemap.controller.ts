import { Controller, Get, Response } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SitemapStream, streamToPromise } from 'sitemap'
import CategoryService from '../../App/category.service'
import WikiService from '../../App/wikis.service'
import staticPagesData from '../data/staticPagesData'

@Controller()
export default class SitemapController {
  sitemapXmlCache: any

  sitemapTimeoutMs = 1000 * 60 * 60

  lastmod = new Date()

  constructor(
    private wikiService: WikiService,
    private configService: ConfigService,
    private categoryService: CategoryService,
  ) {}

  @Get('sitemap')
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
    staticPagesData.map(url =>
      smStream.write({
        url,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: this.lastmod,
      }),
    )
    const wikisIds: { id: string }[] = await this.wikiService.wikisIds()
    const categoriesId: { id: string }[] =
      await this.categoryService.categoriesIds()
    wikisIds.map(wiki =>
      smStream.write({
        url: `/wiki/${wiki.id}`,
        changefreq: 'daily',
        priority: 1,
        lastmod: this.lastmod,
      }),
    )
    categoriesId.map(category =>
      smStream.write({
        url: `/categories/${category.id}`,
        changefreq: 'weekly',
        priority: 1,
        lastmod: this.lastmod,
      }),
    )
    smStream.end()
    streamToPromise(smStream).then((xml: any) => {
      this.sitemapXmlCache = xml
      setTimeout(() => {
        this.sitemapXmlCache = null
      }, this.sitemapTimeoutMs)
      res.send(xml)
    })
  }
}
