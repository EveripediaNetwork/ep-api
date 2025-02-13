import { Column, Link, Row, Section, Text } from '@react-email/components'
import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  TelegramIcon,
  TwitterIcon,
} from '../assets'

export default function Footer() {
  return (
    <Section className="bg-card dark:bg-card-dark mt-10 p-10">
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
      <Section className="mt-10">
        <Row className="w-fit">
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10">
            <TwitterIcon />
          </Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
            <GithubIcon />
          </Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
            <InstagramIcon />
          </Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
            <FacebookIcon />
          </Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
            <DiscordIcon />
          </Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
            <TelegramIcon />
          </Column>
        </Row>
      </Section>
      <Text className="text-center mt-10">
        You are getting this email as a registered user of{' '}
        <span className="text-brand dark:text-brand-dark underline">
          IQ.wiki
        </span>
      </Text>
      <Text className="text-center mt-2">
        Manage your email preferences{' '}
        <span className="text-brand dark:text-brand-dark underline">here</span>{' '}
        or{' '}
        <span className="text-brand dark:text-brand-dark underline">
          unsuscribe
        </span>
      </Text>
    </Section>
  )
}
