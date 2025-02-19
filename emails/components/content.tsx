import {
  Button,
  Column,
  Hr,
  Img,
  Row,
  Section,
  Text,
} from '@react-email/components'

const BASE_PATH = 'https://iq.wiki/images/emails'

const TranformCategoryIcon = (categoryType: string) => {
  switch (categoryType) {
    case 'nfts':
      return (
        <>
          <Img src={`${BASE_PATH}/nfts.png`} className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden" />
          <Img
            src={`${BASE_PATH}/nfts-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'defi':
      return (
        <>
          <Img src={`${BASE_PATH}/defi.png`} className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden" />
          <Img
            src={`${BASE_PATH}/defi-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'cryptocurrencies':
      return (
        <>
          <Img
            src={`${BASE_PATH}/crypto.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden"
          />
          <Img
            src={`${BASE_PATH}/crypto-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'dao':
      return (
        <>
          <Img src={`${BASE_PATH}/dao.png`} className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden" />
          <Img
            src={`${BASE_PATH}/dao-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'dapps':
      return (
        <>
          <Img src={`${BASE_PATH}/dapps.png`} className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden" />
          <Img
            src={`${BASE_PATH}/dapps-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'exchanges':
      return (
        <>
          <Img
            src={`${BASE_PATH}/exchange.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden"
          />
          <Img
            src={`${BASE_PATH}/exchange-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'organization':
      return (
        <>
          <Img
            src={`${BASE_PATH}/organization.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden"
          />
          <Img
            src={`${BASE_PATH}/organization-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    case 'people':
      return (
        <>
          <Img
            src={`${BASE_PATH}/people.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden"
          />
          <Img
            src={`${BASE_PATH}/people-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
    default:
      return (
        <>
          <Img
            src={`${BASE_PATH}/crypto.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 dark:hidden"
          />
          <Img
            src={`${BASE_PATH}/crypto-dark.png`}
            className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block"
          />
        </>
      )
  }
}

export default function Content({
  suggestions,
}: {
  suggestions: {
    title: string
    summary: string
    category_id: string
    category_title: string
    wikiUrl: string
    image: string
  }[]
}) {
  return (
    <Section className="mt-10 sm:mt-20">
      <Text
        style={{ marginBlock: 0 }}
        className="font-semibold text-[24px] text-center sm:text-4xl text-foreground dark:text-foreground-dark"
      >
        More wikis you'll love!
      </Text>
      <div className="mt-3 sm:mt-10">
        {suggestions.map(
          (
            { title, wikiUrl, image, summary, category_id, category_title },
            index,
          ) => (
            <div key={`${title}-${index}`}>
              <Row>
                <Column className="sm:pl-4 block sm:hidden w-full mb-3 sm:mt-0 sm:w-2/5">
                  <Row style={{ margin: 0 }} className='block sm:hidden pb-2'>
                    <Column
                      style={{
                        verticalAlign: 'middle',
                        width: '20px',
                        lineHeight: 0,
                      }}
                    >
                      {TranformCategoryIcon(category_id)}
                    </Column>
                    <Column
                      style={{
                        verticalAlign: 'middle',
                        lineHeight: 0,
                      }}
                    >
                      <Text style={{margin: 0}} className="pl-[3px] sm:pl-[6px] text-foreground dark:text-foreground-dark font-medium text-base">
                        {category_title}
                      </Text>
                    </Column>
                  </Row>
                  <Img
                    src={image}
                    alt={title}
                    className="rounded-xl w-full h-[250px] sm:h-[200px] border border-solid border-[#E4E7EB] dark:border-border-dark md:max-w-full bg-contain"
                  />
                </Column>
                <Column className="w-full block sm:table-cell sm:w-3/5">
                  <Row style={{ margin: 0 }} className='hidden sm:block'>
                    <Column
                      style={{
                        verticalAlign: 'middle',
                        width: '20px',
                        lineHeight: 0,
                      }}
                    >
                      {TranformCategoryIcon(category_id)}
                    </Column>
                    <Column
                      style={{
                        verticalAlign: 'middle',
                        lineHeight: 0,
                      }}
                    >
                      <Text style={{margin: 0}} className="pl-[3px] sm:pl-[6px] text-foreground dark:text-foreground-dark font-medium text-base">
                        {category_title}
                      </Text>
                    </Column>
                  </Row>
                  <Text
                    style={{ margin: '0 0 6px 0' }}
                    className="text-xl sm:text-3xl font-semibold pt-1 sm:pt-2 text-card-foreground dark:text-card-foreground-dark"
                  >
                    {title}
                  </Text>
                  <Text
                    style={{ margin: 0 }}
                    className="text-base sm:text-xl text-foreground dark:text-foreground-dark"
                  >
                    {summary}
                  </Text>
                  <Button
                    className="border-1 border-solid border-border dark:border-border-dark bg-secondary dark:bg-secondary-dark font-medium text-base px-7 sm:px-10 rounded-md sm:mt-3 py-3 sm:py-4 mt-3 text-secondary-foreground dark:text-secondary-foreground-dark"
                    href={wikiUrl}
                  >
                    Read now
                  </Button>
                </Column>
                <Column className="sm:pl-4 hidden sm:table-cell w-full mt-0 sm:w-2/5">
                  <Img
                    src={image}
                    alt={title}
                    className="rounded-xl w-full h-[250px] sm:h-[200px] border border-solid border-[#E4E7EB] dark:border-border-dark md:max-w-full bg-contain"
                  />
                </Column>
              </Row>
              {index < suggestions.length - 1 && (
                <Row>
                  <Column>
                    <Hr className="border-border dark:border-border-dark my-6" />
                  </Column>
                </Row>
              )}
            </div>
          ),
        )}
      </div>
    </Section>
  )
}
