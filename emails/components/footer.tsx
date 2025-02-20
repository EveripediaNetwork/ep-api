import { Column, Img, Link, Row, Section, Text } from '@react-email/components'

const BASE_PATH = 'https://iq.wiki/images/emails/'

export default function Footer({iqUrl, unsubscribeLink}: {iqUrl: string, unsubscribeLink: string}) {
  return (
    <Section className="bg-card dark:bg-card-dark mt-10 p-10">
      <Section className="bg-background dark:bg-background-dark w-full py-3">
        <Text className="text-center mx-auto">
          <Link href="https://iq.wiki/categories" className="text-brand dark:text-brand-dark">
            Explore
          </Link>
          <span className='px-2'>-</span>
          <Link href="https://iq.wiki/#tags" className="text-brand dark:text-brand-dark">
            Tags
          </Link>
          <span className='px-2'>-</span>
          <Link href="https://iq.wiki/events" className="text-brand dark:text-brand-dark">
            Events
          </Link>
          <span className='px-2'>-</span>
          <Link href="https://iqai.com/" className="text-brand dark:text-brand-dark">
            IQ AI
          </Link>
        </Text>
      </Section>
      <Section className="mt-10 text-center">
        <Row className="w-fit">
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10" align='center'>
            <Img src={`${BASE_PATH}x.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}x-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
          <Column style={{ width: "8px" }}></Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10"  align='center'>
            <Img src={`${BASE_PATH}github.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}github-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
          <Column style={{ width: "8px" }}></Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10"  align='center'>
            <Img src={`${BASE_PATH}instagram.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}instagram-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
          <Column style={{ width: "8px" }}></Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10"  align='center'>
            <Img src={`${BASE_PATH}fb.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}fb-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
          <Column style={{ width: "8px" }}></Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10"  align='center'>
            <Img src={`${BASE_PATH}discord.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}discord-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
          <Column style={{ width: "8px" }}></Column>
          <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark w-10 h-10"  align='center'>
            <Img src={`${BASE_PATH}telegram.png`} className='w-5 h-5 dark:hidden' />
            <Img src={`${BASE_PATH}telegram-dark.png`} className='w-5 h-5 hidden dark:block' />
          </Column>
        </Row>
      </Section>
      <Text className="text-center mt-10 text-foreground dark:text-foreground-dark">
        You are getting this email as a registered user of{' '}
        <Link href={iqUrl} className="text-brand dark:text-brand-dark underline">
          IQ.wiki
        </Link>
      </Text>
      <Text className="text-center mt-2 text-foreground dark:text-foreground-dark">
        Manage your email preferences{' '}
        <Link href={iqUrl} className="text-brand dark:text-brand-dark underline">here</Link>{' '}
        or{' '}
        <Link href={unsubscribeLink} className="text-brand dark:text-brand-dark underline">
          unsuscribe
        </Link>
      </Text>
    </Section>
  )
}
