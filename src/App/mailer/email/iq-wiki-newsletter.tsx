import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import Banner from './components/banner'
import Content from './components/content'
import Footer from './components/footer'
import ArrowRightDoubleIcon from './assets/arrow-right-double'

interface EmailProps {
  wiki: string
  url: string
  iqUrl: string
  wikiImage: string
  unsubscribeLink: string
  suggestions: {
    title: string
    summary: string
    category: string
    wikiUrl: string
    image: string
  }[]
}

export const BASE_URL = 'https://iq.wiki/'

export const emailTailwindConfig = {
  theme: {
    colors: {
      background: '#FFFFFF',
      'background-dark': '#17202B',
      card: '#F9FAFB',
      'card-dark': '#1B2430',
      brand: '#FF5CAA',
      'brand-dark': '#FF1A88',
      'brand-accent': '#FFE5F1',
      'brand-accent-dark': '#FFB3D7',
      foreground: '#0F172A',
      'foreground-dark': '#FAFCF8',
      'primary-foreground': '#FFFFFF',
      'muted-foreground': '#475569',
      'muted-foreground-dark': '#D2D2D2',
      border: '#E4E7EB',
      'border-dark': '#39414B',
      secondary: '#E5E7EB',
      'secondary-dark': '#202A37',
      'secondary-foreground': '#0F172A',
      'secondary-foreground-dark': '#FAFCF8',
      primary: '#FF5CAA',
      'primary-dark': '#FF1A88',
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
        <Container className="mx-auto max-w-[800px] px-5 py-5 sm:px-10 sm:py-8">
          <Banner />
          <Hr className="mt-2 mb-10 border-border dark:border-border-dark" />
          <Section>
            <Text className="text-2xl sm:text-[32px] font-bold text-center my-0 mb-2 sm:mb-4">
              Your Update from IQ.wiki
            </Text>
            <Text className="text-xs sm:text-base text-center my-0">
              What’s new and what to read next. 👀
            </Text>
          </Section>
          <Section className="bg-card dark:bg-card-dark max-w-full w-full p-3 sm:p-6 border border-border dark:border-border-dark mb-3 sm:mb-6 rounded-3xl mt-3 sm:mt-6">
            <Img
              src={wikiImage}
              alt={wiki}
              width={672}
              className="max-w-full rounded-xl h-[250px] object-cover object-center sm:h-[452px]"
            />
          </Section>
          <Section>
            <Text className="font-bold text-[16px] sm:text-[32px] mt-0 mb-1 sm:mb-5">
              {wiki}
            </Text>
            <Text className="text-xs sm:text-base my-0">
              Hey There! I have got some good news for you.
              <span className="text-brand dark:text-brand font-semibold">
                {wiki}
              </span>{' '}
              has been updated. You don’t want to miss. it. Click below to check
              out the lastest information.
            </Text>
            <Link
              className="bg-brand dark:bg-brand-dark text-white font-medium text-sm px-8 rounded-md sm:mt-3 inline-flex items-center py-0 h-12 mt-3"
              href={url}
            >
              <Text className="text-primary-foreground font-semibold">
                Check it out
              </Text>
              <ArrowRightDoubleIcon />
            </Link>
          </Section>
          <Content suggestions={suggestions} />
          <Footer />
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

export default Email
