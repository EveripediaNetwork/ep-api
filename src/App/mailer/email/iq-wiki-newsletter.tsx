import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface EmailProps {
  wiki: string
  url: string
  iqUrl: string
  wikiImage: string
  unsubscribeLink: string
  suggestions: {
    title: string
    summary: string
    wikiUrl: string
    image: string
  }[]
}

export const BASE_URL = 'https://iq.wiki/'
const root = process.cwd()

export const emailTailwindConfig = {
  theme: {
    colors: {
      background: '#FFFFFF',
      card: '#F9FAFB',
      brand: '#FF5CAA',
      'brand-accent': '#FFE5F1',
      foreground: '#0F172A',
      'muted-foreground': '#475569',
      border: '#E4E7EB',
      secondary: '#202A37',
      'background-dark': '#17202B',
      'card-dark': '#1B2430',
      'brand-dark': '#FF1A88',
      'brand-accent-dark': '#FFB3D7',
      'foreground-dark': '#FAFCF8',
      'muted-foreground-dark': '#D2D2D2',
      'border-dark': '#39414B',
      'secondary-dark': '#E5E7EBß',
    },
  },
}

const Email = ({ wiki, wikiImage, url, suggestions }: EmailProps) => (
  <Tailwind config={emailTailwindConfig}>
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Monteserrat"
          fallbackFontFamily="Verdana"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>IQ.wiki update - {wiki}</Preview>
      <Body className="bg-background dark:bg-background-dark text-foreground dark:text-foreground-dark">
        <Container className="mx-auto px-10 py-8">
          <Section style={{ maxWidth: '100%' }} className="bg-card w-full">
            <Text className="my-0 text-center text-2xl font-bold">
              <Img
                src={`${root}/public/braindao-logo.png`}
                width={65}
                height={55}
                className="inline pb-1 align-middle"
              />
              <span className="ml-1">IQ.wiki</span>
            </Text>
            <Text className="mt-2 text-center text-xs">
              The World’s Largest
              <span className="text-brand dark:text-brand">
                Blockchain & Crypto
              </span>
              Encyclopedia
            </Text>
          </Section>
          <Hr className="mt-2 mb-10" />
          <Section>
            <Text className="text-5xl text-center">
              Your Update from IQ.wiki
            </Text>
            <Text className="text-xs text-center">
              What’s new and what to read next. 👀
            </Text>
          </Section>
          <Section className="bg-card max-w-full w-full p-6 border border-border dark:border-border-dark mb-6">
            <Img
              src={wikiImage}
              alt={wiki}
              width={672}
              className="max-w-full"
            />
          </Section>
          <Section>
            <Text className="font-bold text-3xl">{wiki}</Text>
            <Text className="text-base">
              Hey There! I have got some good news for you.
              <span className="text-brand dark:text-brand font-semibold">
                {wiki}
              </span>
              has been updated. You don’t want to miss. it. Click below to check
              out the lastest information.
            </Text>
            <Link
              className="bg-brand dark:bg-brand-dark text-white font-medium text-sm px-4 py-2 rounded-md mt-3 inline-block"
              href={url}
            >
              <Text className="text-brand dark:text-brand font-semibold">
                Check it out
              </Text>
            </Link>
          </Section>
          <Section className="mt-20">
            <Text className="font-bold text-6xl">More wikis you'll love!</Text>
            <div className="mt-10">
              {suggestions.map(({ title, wikiUrl, image, summary }) => (
                <Row key={title} className="mt-10">
                  <Column className="w-3/5">
                    <Text className="font-semibold text-4xl">{title}</Text>
                    <Text className="text-sm text-muted-foreground dark:text-muted-foreground-dark">
                      {summary}
                    </Text>
                    <Link
                      className="border-border dark:border-border-dark bg-secondary dark:bg-secondary-dark font-medium text-sm mt-2 inline-block"
                      href={wikiUrl}
                    >
                      <Text className="text-brand dark:text-brand font-semibold">
                        Read more
                      </Text>
                    </Link>
                  </Column>
                  <Column>
                    <Img
                      src={image}
                      alt={title}
                      width={240}
                      height={150}
                      className="rounded-xl border border-border dark:border-border-dark max-w-full"
                    />
                  </Column>
                </Row>
              ))}
            </div>
          </Section>
          <Section className="bg-card dark:bg-card p-10">
            <Section className="bg-background dark:bg-background-dark w-full py-3">
              <Text className="text-center mx-auto">
                <Link href="/" className="text-brand dark:text-brand-dark">
                  Explore
                </Link>{' '}
                -{' '}
                <Link href="/" className="text-brand dark:text-brand-dark">
                  Tags
                </Link>{' '}
                -{' '}
                <Link href="/" className="text-brand dark:text-brand-dark">
                  Events
                </Link>{' '}
                -{' '}
                <Link href="/" className="text-brand dark:text-brand-dark">
                  IQ AI
                </Link>
              </Text>
            </Section>
            <Text className="text-center mt-10">
              You are getting this email as a registered user of{' '}
              <span className="text-brand dark:text-brand-dark underline">
                IQ.wiki
              </span>
            </Text>
            <Text className="text-center mt-2">
              Manage your email preferences{' '}
              <span className="text-brand dark:text-brand-dark underline">
                here
              </span>
              or{' '}
              <span className="text-brand dark:text-brand-dark underline">
                unsuscribe
              </span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

export default Email
