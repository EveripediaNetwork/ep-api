import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { getMockRes } from '@jest-mock/express'
import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/common'
import WikiService from './wiki.service'
import WikiResolver from './wiki.resolver'
import {
  ByIdArgs,
  CategoryArgs,
  LangArgs,
  PromoteWikiArgs,
  TitleArgs,
} from './wiki.dto'
import { getProviders, ProviderEnum } from './utils/testHelpers'
import Language from '../Database/Entities/language.entity'
import User from '../Database/Entities/user.entity'
import Wiki from '../Database/Entities/wiki.entity'

jest.mock('fs')

const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

const ctx = {
  req: {
    ip: 'localhost',
  },
}

describe('WikiResolver', () => {
  let resolver: WikiResolver
  let service: WikiService
  let moduleRef: TestingModule

  const result = [
    {
      version: 1,
      promoted: 4,
      id: 'right-of-way',
      title: 'Right of way',
      hidden: false,
      block: 29053433,
      transactionHash:
        '0xbbd32825a412139494cb2c641e60c2d1b7d1dd0a0f9706d2b7b73e8050281d94',
      ipfs: 'QmWz3aaBqMvPfas3uqMyWdyARRFE9exc3tRQTr2raFjDfg',
      views: 2,
      content:
        'Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black **Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black** Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black ..you sha have to make it work somehow',
      summary: 'right of way',
      metadata: [
        {
          id: 'coingecko_profile',
          value: 'https://www.coingecko.com/en/nft/otherdeed-for-otherside',
        },
        {
          id: 'previous_cid',
          value: 'QmemMd7TaNiP2wNgBEEn2Z5aLqfxHkhv5j2X6BwnKYqhH6',
        },
        { id: 'words-changed', value: '2' },
        { id: 'percent-changed', value: '0.19' },
        { id: 'blocks-changed', value: 'content, tags' },
        { id: 'wiki-score', value: '19' },
      ],
      media: [],
      linkedWikis: { founders: [], blockchains: [] },
      images: [
        {
          id: 'QmRN6gvCn4bWSS4QZjBJGQrsBiBisJvNyvjjpWLdKu6e8Q',
          type: 'image/jpeg, image/png',
        },
      ],
      created: new Date(),
      updated: new Date(),
      language: 'en' as unknown as Language,
      user: {
        id: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
      } as unknown as User,
      tags: [],
      categories: [
        {
          id: 'dapps',
        },
      ],
    },
    {
      version: 1,
      promoted: 5,
      id: 'iqwiki',
      title: 'IQ.wiki',
      hidden: false,
      created: new Date(),
      updated: new Date(),
      block: 34203479,
      transactionHash:
        '0x3ff755e26e642c031fe1368195e068c24fa1dc4d3162633c5cd63fb3bf8ce007',
      ipfs: 'Qma2cuoL2v4DyE4YEFuYp73ZVq5yoonBhEzcHQ6EXaMnTK',
      views: 1,
      content:
        '**IQ.wiki formerly Everipedia** is the largest [cryptocurrency](https://iq.wiki/wiki/cryptocurrency) encyclopedia with pages on cryptocurrencies like [Ethereum](https://iq.wiki/wiki/ethereum), [NFTs](https://iq.wiki/wiki/non-fungible-token-nft-1) like [Bored Ape Yacht Club](https://iq.wiki/wiki/bored-ape-yacht-club), [DeFi](https://iq.wiki/wiki/defi) projects like [Frax Finance](https://iq.wiki/wiki/frax-finance), leaders in the space like [Vitalik Buterin](https://iq.wiki/wiki/vitalik-buterin), and several other aspects of the blockchain space. The [IQ token](https://iq.wiki/wiki/iq) powers IQ.wiki and all edits on the platform are recorded on-chain through [Polygon](https://iq.wiki/wiki/polygon) and the InterPlanetary File System (IPFS). The encyclopedia is governed by IQ token stakers who earn rewards for their contribution. [\\[23\\]](#cite-id-h2k8872ztli)  \n' +
        '  \n' +
        '## Blockchain  \n' +
        '  \n' +
        'All edits on IQ.wiki are recorded on the Polygon blockchain with the transaction hash for each edit stored on-chain. The data and images uploaded as part of each wiki are stored on IPFS and the hashes are included on each page for the users to verify.  \n' +
        '  \n' +
        'IQ.wiki was built on Polygon, the leading Ethereum sidechain to ensure that the platform was both scalable and accessible to the Ethereum ecosystem. IQ.wiki uses the OpenZepplin defender relayer to provide contributors with a gasless user experience.  \n' +
        '  \n' +
        '## IQ Token  \n' +
        '  \n' +
        'The [IQ token](https://iq.wiki/wiki/iq) is integral to IQ.wiki. IQ token holders who stake their tokens with the HiIQ staking system, vote on governance decisions involving both the platform and the IQ token itself. IQ token stakers also earn IQ token rewards from staking and contributing to the platform. They also govern [BrainDAO](https://iq.wiki/wiki/braindao), the native DAO and treasury of the IQ ecosystem.  \n' +
        '  \n' +
        'After the beta period, IQ.wiki plans on introducing HiIQ Brain Pass NFTs for IQ stakers which will provide several benefits including the ability to edit on IQ.wiki. Users will also be able to acquire the NFTs by purchasing them with IQ tokens.  \n' +
        '  \n' +
        '## Integrations  \n' +
        '  \n' +
        '### ENS  \n' +
        '  \n' +
        'IQ.wiki integrates [Ethereum Name Service (ENS)](https://iq.wiki/wiki/ens). If a user has resolved their ENS to their blockchain address, their ENS will automatically populate as their username when they log in.  \n' +
        '  \n' +
        '### Magic  \n' +
        '  \n' +
        'IQ.wiki integrates Magic, a leading user authentication and private key management solution, which allows users to log in to IQ.wiki with their email or social media.  \n' +
        '  \n' +
        '### The Graph  \n' +
        '  \n' +
        'IQ.wiki also integrates [The Graph](https://iq.wiki/wiki/the-graph), a decentralized protocol for indexing and querying data in networks like Ethereum and IPFS.  \n' +
        '  \n' +
        '### Market Data  \n' +
        '  \n' +
        'IQ.wiki pages on cryptocurrencies, NFT projects, and exchanges automatically pull market data and statistics from [Coingecko](https://iq.wiki/wiki/coingecko) and other reliable APIs.  \n' +
        '  \n' +
        '## Rebranding from Everipedia to IQ.wiki  \n' +
        '  \n' +
        'IQ.wiki was previously known as Everipedia. On October 11, 2022, Everipedia rebranded as IQ.wiki with the beta launch of the new IQ.wiki crypto encyclopedia platform on Polygon. The original Everipedia name came from the original vision of creating an encyclopedia of everything. After the launch of the IQ token and as Everipedia grew as a knowledge platform for the cryptocurrency space it made sense to create IQ.wiki a new crypto encyclopedia dedicated specifically to the crypto community with new technology and features. The new IQ.wiki name reflects the importance of the IQ token and the role that cryptocurrency and blockchain technology play in the platform.  \n' +
        '![iq.wiki-launch-image.png](https://ipfs.everipedia.org/ipfs/Qmeuj5aHib3xVVvwVjcZ24tR6r1HzPTiHTQPMFsTr5cwy7)  \n' +
        '  \n' +
        '## Leadership  \n' +
        '  \n' +
        "IQ.wiki is led by Head Brain [Navin Vethanayagam](https://iq.wiki/wiki/navin-vethanayagam) who leads IQ.wiki's Community, Content, and Growth team, and Chief Technology Officer [Cesar Rodriguez](https://iq.wiki/wiki/cesar-rodriguez) who leads IQ.wiki's Engineering Department. Navin previously served as Everipedia's Chief Community Officer for several years. Cesar Rodriguez was previously Everipedia's Director of Engineering and led development for the IQ.wiki platform.  \n" +
        '  \n' +
        "The managers of IQ.wiki's Community, Content & Growth team include Andy Cho who serves as IQ.wiki's Director of Business Development, Violetta Ziborova who serves as IQ.wiki's Content Manager, and Kevin Wang who serves as IQ.wiki's Director of China.  \n" +
        '  \n' +
        'IQ.wiki Blockchain Developer [Justin Castillo](https://iq.wiki/wiki/justin-castillo) works with Cesar Rodriguez to coordinate with the BrainDAO engineering team of project managers, backend engineers, front-end engineers, and UX designers. The IQ.wiki technical team also includes Senior Software Engineer [Justin Moore](https://iq.wiki/wiki/justin-moore) who focuses on scalability and [Richard Gee](https://iq.wiki/wiki/richard-gee) who focuses on [NFTs](https://iq.wiki/wiki/non-fungible-token-nft) and [smart contracts](https://iq.wiki/wiki/smart-contract).  \n' +
        '  \n' +
        'After the launch of the new IQ.wiki platform, Everipedia Co-founder and CEO [Theodor Forselius](https://iq.wiki/wiki/theodor-forselius) as well as CFO and COO [Suchet Dhindsa](https://iq.wiki/wiki/suchet-dhindsa-salvesen) transitioned over to the parent company of IQ.wiki, which is dedicated to more broadly investing in the future of knowledge. Everipedia co-founders [Sam Kazemian](https://iq.wiki/wiki/sam-kazemian) and [Travis Moore](https://iq.wiki/wiki/travis-moore) have also joined the parent company as board members.  \n' +
        '  \n' +
        '## OraQles with The Associated Press  \n' +
        '  \n' +
        '### 2020 US Presidential Election  \n' +
        '  \n' +
        'In 2020, IQ.wiki known as Everipedia at the time developed OraQles a service that allows for verified first parties to bring real-world information on-chain. In 2020, The Associated Press used the OraQles system to publish U.S. election race calls on Ethereum. AP signed the data with their own Ethereum address 0x436Ee8cB3a351893b77F8B57c9772DAEc3a96445 which is listed on their website. This marked the first time a US election was called on the blockchain. The historic moment was covered by publications including Forbes, CoinDesk, and Nasdaq News. The on-chain results from the election were also used to resolve a Yield Wars prediction market which saw over $200,000 in volume. [\\[9\\]](#cite-id-30mus6gjdfg) [\\[8\\]](#cite-id-4gwjmmx4x22) [\\[7\\]](#cite-id-cat7ilojtr8) [\\[2\\]](#cite-id-y4c891xvkhp) [\\[1\\]](#cite-id-6vp5en76iof) [\\[12\\]](#cite-id-otrvzi0m1v)  \n' +
        '  \n' +
        '$$widget0 [YOUTUBE@VID](_x_azFL1ANU)$$  \n' +
        '  \n' +
        '### 2020 US Senate Election Race  \n' +
        '  \n' +
        'In December 2020, the Associated Press (AP) expanded its partnership with Everipedia to bring the US senate election race calls on the blockchain through OraQles. The United States Senate elections on January 5, 2020, determined which party controls the United States Senate. Everipedia was offering AP’s senate race calls in a trusted and transparent manner through the use of oracles. AP signed the data cryptographically and published results with their Ethereum Public Key 0x436ee8cb3a351893b77f8b57c9772daec3a96445. [\\[1\\]](#cite-id-6vp5en76iof) [\\[2\\]](#cite-id-y4c891xvkhp) [\\[10\\]](#cite-id-ceevw0t2lx)  \n' +
        '  \n' +
        '### Super Bowl LV  \n' +
        '  \n' +
        "On February 7, 2021, The Associated Press used Everipedia's OraQles software to call the Tampa Bay Buccaneer's Super Bowl LV win on Ethereum. This marked the first time that Super Bowl game results had been recorded on-chain. [\\[11\\]](#cite-id-cnclj2ve4mj) [\\[12\\]](#cite-id-otrvzi0m1v)  \n" +
        '  \n' +
        "### AP's First NFT  \n" +
        '  \n' +
        'In March 2021, AP collaborated with Everipedia to create a one-of-one NFT artwork commemorating the first US election recorded on the blockchain titled *The Associated Press calls the 2020 Presidential Election on Blockchain - A View from Outer Space.* The NFT artwork was created and published on Ethereum by AP using their Ethereum address 0x436Ee8cB3a351893b77F8B57c9772DAEc3a96445. AP used this same address to declare the winner of the United States 2020 Presidential Election. AP’s unique Ethereum address acts as a cryptographic signature for *The Associated Press calls the 2020 Presidential Election on Blockchain - A View from Outer Space* and shows that AP has verified the historic election data displayed in the piece as well as the metadata in the NFT. Within the NFT’s metadata AP has included the exact date and time that AP called the election, the electoral college votes won by Republicans and Democrats, the names of both candidates, and the number of votes received by each candidate. [\\[13\\]](#cite-id-oh5ks4zawya) [\\[14\\]](#cite-id-dnhob089oyo) [\\[15\\]](#cite-id-6lgv1p9iocw)  \n' +
        '  \n' +
        'On March 11, 2021, *The Associated Press calls the 2020 Presidential Election on Blockchain - A View from Outer Space* sold for 100.888 ETH in an auction on [OpenSea](https://iq.wiki/wiki/opensea). [\\[14\\]](#cite-id-dnhob089oyo)[\\[13\\]](#cite-id-oh5ks4zawya)  \n' +
        '  \n' +
        '![ap-nft.png](https://ipfs.everipedia.org/ipfs/QmUeWZ8kgSSJkMrV6jTYNAgXSVbydwLVFdwjMxWJGCZ4W8)  \n' +
        '  \n' +
        '### 2021 March Madness  \n' +
        '  \n' +
        'In March 2021, AP used the Everipedia OraQles software to publish the results of all 67 March Madness games as well as the scores and schedules on the Ethereum blockchain. [\\[17\\]](#cite-id-us5p4j7zmsh) [\\[16\\]](#cite-id-85qhi0ncpcl)  \n' +
        '  \n' +
        '## History  \n' +
        '  \n' +
        '### Pre-blockchain Origins  \n' +
        '  \n' +
        "Everipedia was founded by Sam Kazemian and Theodor Forselius at UCLA in December 2014. The website was created as a side project out of Kazemian's dorm room. [\\[4\\]](#cite-id-89nn8pnm5lp) [\\[5\\]](#cite-id-q5d06vrq8j)  \n" +
        '  \n' +
        `Originally, Everipedia started with a mission to build a more modern and inclusive version of Wikipedia. Sam and Theodor were inspired by Y Combinator's co-founder Paul Graham's blog post published in 2008 entitled "Startup Ideas We'd Like to Fund." In his list of ideas, he called for "more open alternatives to Wikipedia": [\\[3\\]](#cite-id-sywi7r6x3a)  \n` +
        '  \n' +
        'In April 2015, Travis Moore joined ',
      summary:
        'IQ.wiki formerly Everipedia is the largest cryptocurrency encyclopedia.',
      metadata: [
        {
          id: 'references',
          value: `[{"id":"6vp5en76iof","url":"https://www.nasdaq.com/articles/immutable-calls%3A-ap-election-2020-results-will-be-recorded-on-a-blockchain-2020-10-15","description":"Immutable Calls: AP Election 2020 Results ","timestamp":1664854851366},{"id":"y4c891xvkhp","url":"https://www.forbes.com/sites/michaeldelcastillo/2020/11/03/how-to-track-official-election-results-on-ethereum-and-eos/?sh=6dc522873269","description":"How To Track Official Election Results On Ethereum And EOS","timestamp":1664854874146},{"id":"sywi7r6x3a","url":"https://coinrivet.com/the-time-is-now-for-everipedia-to-take-on-wikipedia/","description":"The time is now for Everipedia to take on Wikipedia","timestamp":1664855656362},{"id":"89nn8pnm5lp","url":"https://ventures.ucla.edu/member-spotlight-sam-kazemian/","description":"UCLA Ventures","timestamp":1664855710913},{"id":"q5d06vrq8j","url":"https://new.dailybruin.com/post/ucla-alumni-create-online-encyclopedia-powered-by-cryptocurrency","description":"UCLA alumni create online encyclopedia","timestamp":1664855761826},{"id":"jtlmgu7pwte","url":"https://www.reuters.com/article/us-blockchain-investment-galaxy/novogratzs-new-fund-others-invest-30-million-in-online-encyclopedia-idUSKBN1FS322?il=0","description":"Novogratz's new fund, others invest $30 million","timestamp":1664855808230},{"id":"cat7ilojtr8","url":"https://cointelegraph.com/news/ap-news-publishes-us-presidential-election-results-on-the-blockchain","description":"AP News publishes US presidential election","timestamp":1664855877735},{"id":"4gwjmmx4x22","url":"https://developer.ap.org/ap-elections-api/","description":"AP Elections API","timestamp":1664855926681},{"id":"30mus6gjdfg","url":"https://everipedia.org/oraqle/ap/eth","description":"Everipedia OraQles US Presidential Election Results","timestamp":1664855972909},{"id":"ceevw0t2lx","url":"https://oraqle.everipedia.org/oracles/jan-2021-senate","description":"US Senate Election Race OraQles Dashboard","timestamp":1664856059894},{"id":"cnclj2ve4mj","url":"https://oraqle.everipedia.org/oracles/superbowl-lv","description":"Super Bowl LV OraQle","timestamp":1664856101116},{"id":"otrvzi0m1v","url":"https://learn.everipedia.org/iq/oraqles/projects","description":"OraQles Page","timestamp":1664856130864},{"id":"oh5ks4zawya","url":"https://cointelegraph.com/news/everipedia-iq-rallies-400-after-an-nft-collaboration-with-the-associated-press","description":"Everipedia (IQ) rallies 400% after an NFT collaboration","timestamp":1664856211643},{"id":"dnhob089oyo","url":"https://opensea.io/assets/ethereum/0x9fc4e38da3a5f7d4950e396732ae10c3f0a54886/1","description":"OpenSea data on the AP NFT sale","timestamp":1664856309554},{"id":"6lgv1p9iocw","url":"https://learn.everipedia.org/iq/nft/projects","description":"IQ.wiki NFT projects","timestamp":1664856373172},{"id":"85qhi0ncpcl","url":"https://u.today/associated-press-to-record-basketball-scores-on-ethereum-blockchain","description":"Associated Press to Record Basketball Scores on Ethereum","timestamp":1664856405366},{"id":"us5p4j7zmsh","url":"https://oraqle.everipedia.org/oracles/march-madness","description":"March Madness OraQle","timestamp":1664856427285},{"id":"7taq6jnjmna","url":"https://www.wired.com/story/everipedia-blockchain/","description":"The Wikipedia Competitor That's Harnessing Blockchain","timestamp":1664856465714},{"id":"d1w357jg93","url":"https://larrysanger.org/2019/10/introducing-the-encyclosphere/","description":"Introducing the Encyclosphere","timestamp":1664856497701},{"id":"odmm4tdixrf","url":"https://www.newswire.ca/news-releases/everipedia-announces-iq-token-airdrop-to-take-place-in-june-2018-677425163.html","description":"Everipedia Announces IQ Token Airdrop","timestamp":1664856527042},{"id":"mjr8ksd4x3","url":"https://www.crunchbase.com/organization/everipedia/company_financials","description":"Everipedia Crunchbase","timestamp":1664856574532},{"id":"eg4dihcgd9","url":"https://pitchbook.com/profiles/investor/115006-15","description":"David Segura Pitchbook","timestamp":1664856630722},{"id":"h2k8872ztli","url":"https://learn.everipedia.org/iq/","description":"Learn page","timestamp":1665274848512}]`,
        },
        {
          id: 'previous_cid',
          value: 'QmSy3JG4H8XUCUaQPt7LKFHkzoUf8fr7n3qtBHZ2CqoQTH',
        },
        { id: 'words-changed', value: '37' },
        { id: 'percent-changed', value: '3.69' },
        { id: 'blocks-changed', value: 'content, tags, image' },
        { id: 'wiki-score', value: '64' },
      ],
      media: [
        {
          name: 'iq.wiki-edit.png',
          id: 'QmREy4ZM9NQ49yKs3KgsNsTE2ck7bQXfwNuhg5C6tDwEcL',
          size: '1.63',
          source: 'IPFS_IMG',
        },
        {
          name: '_x_azFL1ANU',
          id: 'https://www.youtube.com/watch?v=_x_azFL1ANU',
          size: '0',
          source: 'YOUTUBE',
        },
        {
          name: 'ap-nft.png',
          id: 'QmUeWZ8kgSSJkMrV6jTYNAgXSVbydwLVFdwjMxWJGCZ4W8',
          size: '2.24',
          source: 'IPFS_IMG',
        },
        {
          name: 'iq.wiki-launch-image.png',
          size: '0.75',
          id: 'Qmeuj5aHib3xVVvwVjcZ24tR6r1HzPTiHTQPMFsTr5cwy7',
          source: 'IPFS_IMG',
        },
      ],
      linkedWikis: null,
      images: [
        {
          id: 'QmYFA1smQ7JDhsRThV4advRjAKJuvefnvE8iTiPUQuCoci',
          type: 'image/jpeg, image/png',
        },
      ],
      categories: [
        {
          id: 'dapps',
        },
      ],
    },
  ] as unknown as Wiki[]

  const hiddenResult = [
    {
      version: 1,
      promoted: 0,
      id: 'flywheel',
      title: 'Flywheel',
      hidden: true,
      created: new Date(),
      updated: new Date(),
      block: 33734932,
      transactionHash:
        '0xf165a2e8e0288f944d37d0aa5db03c311b80ff3e62aed8eb8934a21de7945520',
      ipfs: 'QmYMk3iShNzixwBwk6GmVzaetNLsyaEH3yBC7aajrSVRGF',
      views: 0,
      content:
        'Flywheel is a podcast and content destination which covers the [Frax ecosystem](https://iq.wiki/wiki/frax-finance). [\\[6\\]](#cite-id-efmj7wikcqf)   \n' +
        '  \n' +
        '## Overview  \n' +
        '  \n' +
        'Flywheel was founded by DeFi Dave in April of 2022 with the mission of producing content covering the Frax ecosystem. The podcast quickly gained a following in the Frax community and broader DeFi space including endorsements by 0xWenMoon, Defi Advisor, Tarez, and Westwood. [\\[1\\]](#cite-id-r2u7e7qlvy)  \n' +
        '  \n' +
        'After 3 months of growth, Flywheel received a grant of $60,000 of FXS and FRAX to further its mission of covering the Frax ecosystem as well as to start hosting IRL events for the Frax community under the “Fraximalist” Brand. DeFi Dave has since hosted Fraximalist Meetups at both Madison Square Park in New York and at ETHCC in Paris. [\\[2\\]](#cite-id-p706zxeg7tr) [\\[3\\]](#cite-id-2hjzrxu0prd)  \n' +
        '  \n' +
        "Flywheel's flagship podcast is hosted by DeFi Dave and kapital\\_k and available on Spotify, Apple Podcasts, and several other outlets. In addition to the podcast which focuses on long-form content, Flywheel also shares video content through their YouTube channel [\\[4\\]](#cite-id-b4m6eemxzen) and articles through their Substack [\\[5\\]](#cite-id-6cj3klwlc7x).  \n" +
        '  \n' +
        'Stableclaire also produces short videos on [stablecoins](https://iq.wiki/wiki/stablecoin) for Flywheel.  \n' +
        '  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n' +
        '<br>  \n',
      summary:
        'Flywheel is a podcast and content destination which covers the FRAX ecosystem.',
      metadata: [
        {
          id: 'references',
          value:
            '[{"id":"r2u7e7qlvy","url":"https://gov.frax.finance/t/fip-99-flywheel-sponsorship-proposal/1746","description":"FIP 99 - Flywheel Sponsorship Proposal","timestamp":1664498409413},{"id":"p706zxeg7tr","url":"https://twitter.com/DeFiDave22/status/1539682974727274498","description":"Madison Square Park meetup","timestamp":1664498993907},{"id":"2hjzrxu0prd","url":"https://twitter.com/DeFiDave22/status/1550181650511925248","description":"Paris meetup","timestamp":1664499029874},{"id":"b4m6eemxzen","url":"https://www.youtube.com/channel/UChktQbmIzLZKSwEZh8yE1Kw/featured","description":"Flywheel Podcast","timestamp":1664499063268},{"id":"6cj3klwlc7x","url":"https://flywheeloutput.com/","description":"Substack","timestamp":1664499101028},{"id":"efmj7wikcqf","url":"https://linktr.ee/flywheeloutput","description":"Flywheel linktree","timestamp":1664499180514}]',
        },
        { id: 'website', value: 'https://linktr.ee/flywheeloutput' },
        { id: 'twitter_profile', value: 'https://twitter.com/flywheelpod' },
        {
          id: 'youtube_profile',
          value: 'https://www.youtube.com/channel/UChktQbmIzLZKSwEZh8yE1Kw',
        },
        {
          id: 'previous_cid',
          value: 'QmVoF92MssXrZtpo4gFvuvNWibceR3qXuJCZderMQW9E9R',
        },
        { id: 'words-changed', value: '119' },
        { id: 'percent-changed', value: '84.02' },
        { id: 'blocks-changed', value: 'content, tags' },
        { id: 'wiki-score', value: '48' },
      ],
      media: [
        {
          name: '5roDtzjX9ys',
          size: 0,
          id: 'https://www.youtube.com/watch?v=5roDtzjX9ys',
          source: 'YOUTUBE',
        },
        {
          name: 'D9a-Ll8EBFs',
          size: 0,
          id: 'https://www.youtube.com/watch?v=D9a-Ll8EBFs',
          source: 'YOUTUBE',
        },
        {
          name: 'VCRohb1D8S0',
          size: 0,
          id: 'https://www.youtube.com/watch?v=VCRohb1D8S0',
          source: 'YOUTUBE',
        },
        {
          name: 'VCRohb1D8S0',
          size: 0,
          id: 'https://www.youtube.com/watch?v=VCRohb1D8S0',
          source: 'YOUTUBE',
        },
        {
          name: 'VCRohb1D8S0',
          size: 0,
          id: 'https://www.youtube.com/watch?v=VCRohb1D8S0',
          source: 'YOUTUBE',
        },
      ],
      linkedWikis: null,
      images: [
        {
          id: 'QmfZJHArTUdiJKbBzLWTAfR6EB4pupWc3u1PUu9N2xUVd5',
          type: 'image/jpeg, image/png',
        },
      ],
    },
  ] as unknown as Wiki[]

  const wiki: any = getMockRes({
    data: {
      wiki: result[0],
    },
  })

  const validSlug: any = getMockRes({
    data: {
      validWikiSlug: {
        id: 'flywheel-1',
      },
    },
  })

  const wikisHidden: any = getMockRes({
    data: {
      wikisHidden: hiddenResult,
    },
  })

  const wikisByTitle: any = getMockRes({
    data: {
      wikis: [result[0]],
    },
  })

  const wikis: any = getMockRes({
    data: {
      wikis: result,
    },
  })

  const noWiki: any = getMockRes({
    data: {
      wiki: null,
    },
  })

  const noWikis: any = getMockRes({
    data: {
      wikis: [],
    },
  })

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.wikiResolver,
          ProviderEnum.wikiService,
          ProviderEnum.validSlug,
          ProviderEnum.eventEmitter2,
          ProviderEnum.configService,
          ProviderEnum.tokenValidator,
          ProviderEnum.webhookHandler,
          ProviderEnum.revalidatePageService,
        ]),
        {
          provide: DataSource,
          useFactory: () => ({
            findWiki: jest.fn(() => wiki),
          }),
        },
      ],
    }).compile()
    resolver = moduleRef.get<WikiResolver>(WikiResolver)
    service = moduleRef.get<WikiService>(WikiService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  it('should return a wiki', async () => {
    jest.spyOn(service, 'findWiki').mockResolvedValue(wiki)
    expect(await resolver.wiki({ id: 'right-of-way' } as ByIdArgs)).toBe(wiki)
  })

  it('should return undefined if wiki is not found', async () => {
    jest.spyOn(service, 'findWiki').mockResolvedValue(noWiki)
    expect(await resolver.wiki({ id: 'right' } as ByIdArgs)).toBe(noWiki)
  })

  it('should return an array of wikis', async () => {
    jest.spyOn(service, 'getWikis').mockResolvedValue(wikis)
    expect(await resolver.wikis({ lang: 'en' } as LangArgs)).toBe(wikis)
  })

  it('should return an empty array if no wikis were found', async () => {
    jest.spyOn(service, 'getWikis').mockResolvedValue(noWikis)
    expect(await resolver.wikis({ lang: 'za' } as LangArgs)).toBe(noWikis)
  })

  it('should return an array of wikis with promoted field greater than or equal to 1', async () => {
    jest.spyOn(service, 'getPromotedWikis').mockResolvedValue(wikis)
    expect(await resolver.promotedWikis({ lang: 'en' } as LangArgs)).toEqual(
      wikis,
    )
    const isAllGreaterThanZero = wikis.res.data.wikis.every(
      (val: Wiki) => val.promoted >= 1,
    )
    expect(isAllGreaterThanZero).toBe(true)
  })

  it('should return an array of wikis with the same category id', async () => {
    jest.spyOn(service, 'getWikisByCategory').mockResolvedValue(wikis)
    expect(
      await resolver.wikisByCategory({ category: 'dapps' } as CategoryArgs),
    ).toEqual(wikis)
    expect(wikis.res.data.wikis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categories: [{ id: 'dapps' }],
        }),
      ]),
    )
    expect(wikis.res.data.wikis).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categories: [{ id: 'nfts' }],
        }),
      ]),
    )
  })

  it('should return wiki/wikis with title matching the exact argument or contains a part of it', async () => {
    jest.spyOn(service, 'getWikisByTitle').mockResolvedValue(wikisByTitle)
    expect(
      await resolver.wikisByTitle({ title: 'right' } as TitleArgs),
    ).toEqual(wikisByTitle)
    const byTitle = wikisByTitle.res.data.wikis.every((val: Wiki) =>
      val.title.toLowerCase().includes('right'),
    )
    expect(byTitle).toBe(true)
  })

  it('should search for hidden wikis and create a new id by appending consecutive series of numbers', async () => {
    jest.spyOn(service, 'getValidWikiSlug').mockResolvedValue(validSlug)
    expect(await resolver.validWikiSlug({ id: 'flywheel' } as ByIdArgs)).toBe(
      validSlug,
    )
    const verifySlug = validSlug.res.data.validWikiSlug.id.split('-')
    expect(Number(verifySlug[verifySlug.length - 1])).toBeGreaterThanOrEqual(1)
  })

  it('should return an array of wikis if found with with hidden field set to true', async () => {
    jest.spyOn(service, 'getWikisHidden').mockResolvedValue(wikisHidden)
    expect(await resolver.wikisHidden({ lang: 'en' } as LangArgs)).toBe(
      wikisHidden,
    )
    const hidden = wikisHidden.res.data.wikisHidden.every((e: Wiki) => e.hidden)
    expect(hidden).toBe(true)
  })

  it('should promote a wiki to set level and return the initial state because typeorm update returns nothing', async () => {
    jest.spyOn(service, 'promoteWiki').mockResolvedValue(wiki)
    expect(
      await resolver.promoteWiki(
        { id: 'right-of-way', level: 4 } as PromoteWikiArgs,
        ctx,
      ),
    ).toBe(wiki)
    expect(wiki.res.data.wiki.promoted).toBe(4)
  })

  it('should hide a wiki by setting hidden true and promoted to 0 ', async () => {
    jest.spyOn(service, 'hideWiki').mockResolvedValue(wiki)
    expect(
      await resolver.hideWiki({ id: 'right-of-way' } as ByIdArgs, ctx),
    ).toBe(wiki)
  })
})
