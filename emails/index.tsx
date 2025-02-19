import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import Banner from './components/banner'
import Content from './components/content'
import Footer from './components/footer'

interface EmailProps {
  wiki: string
  url: string
  iqUrl: string
  wikiImage: string
  unsubscribeLink: string
  suggestions: {
    title: string
    summary: string
    category_id: string
    category_title: string
    wikiUrl: string
    image: string
  }[]
}

const emailTailwindConfig = {
  theme: {
    colors: {
      background: '#FFFFFF',
      'background-dark': '#17202B',
      card: '#F9FAFB',
      'card-dark': '#1B2430',
      'card-foreground': '#0F172A',
      'card-foreground-dark': '#FAFCF8',
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

const Email = ({ wiki, wikiImage, url, suggestions, iqUrl, unsubscribeLink }: EmailProps) => (
  <Tailwind config={emailTailwindConfig}>
    <Html lang="en">
      <Head />
      <Preview>IQ.wiki update - {wiki}</Preview>
      <Body style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica',
        }} className="bg-background dark:bg-background-dark text-foreground dark:text-foreground-dark">
        <Container className="mx-auto max-w-[800px] bg-[#FAFAFA] dark:bg-secondary-dark px-5 py-5 sm:px-10 sm:py-8">
          <Banner />
          <Hr className="mt-2 mb-10 border-border dark:border-border-dark" />
          <Section>
            <Text
              style={{ margin: 0 }}
              className="text-2xl sm:text-3xl font-semibold text-center pb-2 sm:pb-4 text-foreground dark:text-foreground-dark"
            >
              Your Update from IQ.wiki
            </Text>
            <Text
              style={{ margin: 0 }}
              className="text-base sm:text-xl text-center my-0 text-foreground dark:text-foreground-dark"
            >
              What’s new and what to read next. 👀
            </Text>
          </Section>
          <Section className="bg-[#FFFFFF] dark:bg-card-dark max-w-full w-full p-3 sm:p-6 border border-solid border-border dark:border-border-dark mb-3 sm:mb-6 rounded-[12px] sm:rounded-3xl mt-3 sm:mt-6">
            <Img
              src={wikiImage}
              alt={wiki}
              width={672}
              className="max-w-full rounded-xl h-[250px] object-cover object-center sm:h-[452px]"
            />
          </Section>
          <Section>
            <Text
              style={{ margin: 0 }}
              className="font-semibold text-xl sm:text-[30px] pb-2 sm:pb-3 text-foreground dark:text-foreground-dark"
            >
              {wiki}
            </Text>
            <Text
              style={{ margin: 0 }}
              className="text-base sm:text-xl text-foreground dark:text-foreground-dark"
            >
              Hey There! I have got some good news for you.{' '}
              <span className="text-brand dark:text-brand-dark font-semibold">
                {wiki}
              </span>{' '}
              has been updated. You don’t want to miss. it. Click below to check
              out the lastest information.
            </Text>
            <Button
              className="bg-brand dark:bg-brand-dark text-base px-7 sm:px-10 rounded-md sm:mt-3 py-3 sm:py-4 mt-3 text-primary-foreground"
              href={url}
            >
              Check it out
            </Button>
          </Section>
          <Content suggestions={suggestions} />
          <Footer iqUrl={iqUrl} unsubscribeLink={unsubscribeLink} />
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

export default Email
