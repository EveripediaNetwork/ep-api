import {
  Column,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components'
import {
  NFTsIcon,
  DefiIcon,
  Cryptocurrency,
  DaoIcon,
  DappsIcon,
  ExchangeIcon,
  Organization,
  PeopleOfCryptoIcon,
} from '../assets'

const TranformCategoryIcon = (categoryType: string) => {
  switch (categoryType) {
    case 'nfts':
      return <NFTsIcon />
    case 'defi':
      return <DefiIcon />
    case 'crypto':
      return <Cryptocurrency />
    case 'dao':
      return <DaoIcon />
    case 'dapps':
      return <DappsIcon />
    case 'exchange':
      return <ExchangeIcon />
    case 'organization':
      return <Organization />
    case 'people-of-crypto':
      return <PeopleOfCryptoIcon />
    default:
      return <Cryptocurrency />
  }
}

export default function Content({
  suggestions,
}: {
  suggestions: {
    title: string
    summary: string
    category: string
    wikiUrl: string
    image: string
  }[]
}) {
  return (
    <Section className="mt-10 sm:mt-20">
      <Text
        style={{ marginBlock: 0 }}
        className="font-bold text-[24px] text-center sm:text-[32px]"
      >
        More wikis you'll love!
      </Text>
      <div className="mt-3 sm:mt-10">
        {suggestions.map(
          ({ title, wikiUrl, image, summary, category }, index) => (
            <>
              <Row key={`${title}-${index}`}>
                <Column className="w-full block sm:table-cell sm:w-3/5">
                  <Text
                    style={{ marginBlock: 0 }}
                    className="font-medium text-xs inline-flex items-center gap-2"
                  >
                    {TranformCategoryIcon(category)}
                    <span>{category}</span>
                  </Text>
                  <Text
                    style={{ marginBlock: 0 }}
                    className="font-medium text-2xl sm:text-4xl"
                  >
                    {title}
                  </Text>
                  <Text
                    style={{ marginBlock: 0 }}
                    className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground-dark pb-2"
                  >
                    {summary}
                  </Text>
                  <Link
                    className="border-1 border-solid border-border dark:border-border-dark bg-secondary dark:bg-secondary-dark font-medium text-sm sm:mt-2 inline-flex items-center px-8 rounded-md h-12"
                    href={wikiUrl}
                  >
                    <Text className="text-secondary-foreground dark:text-secondary-foreground-dark font-semibold">
                      Read more
                    </Text>
                    <svg
                      className="pl-1.5"
                      width="24"
                      height="25"
                      viewBox="0 0 24 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.6894 12.2207L12.2501 7.7814L12.9572 7.0743L18.4571 12.5743L12.9572 18.0743L12.2501 17.3672L16.6894 12.9278L17.043 12.5743L16.6894 12.2207ZM11.0395 12.2207L6.60017 7.7814L7.30728 7.07429L12.8073 12.5743L7.30727 18.0743L6.60017 17.3672L11.0395 12.9278L11.3931 12.5743L11.0395 12.2207Z"
                        className="fill-secondary-foreground dark:fill-secondary-foreground-dark stroke-secondary-foreground dark:stroke-secondary-foreground-dark"
                      />
                    </svg>
                  </Link>
                </Column>
                <Column className="md:pl-4 block sm:table-cell w-full mt-3 sm:mt-0 sm:w-2/5">
                  <Img
                    src={image}
                    alt={title}
                    className="rounded-xl w-full bg-cover h-[250px] sm:h-[155px] border-border dark:border-border-dark md:max-w-full"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
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
            </>
          ),
        )}
      </div>
    </Section>
  )
}
