import { Column, Link, Row, Section, Text } from '@react-email/components'
import { Logo } from '../assets'

export default function Banner() {
  return (
    <Section
      style={{ maxWidth: '100%' }}
      className="bg-card dark:bg-card-dark w-full py-3"
    >
      <Row>
        <Column align="center">
          <Link
            href="https://iq.wiki"
            className="inline-flex items-center gap-2 my-0"
          >
            <Logo />
            <Text
              style={{ marginBlock: 0 }}
              className="my-0 text-center text-foreground dark:text-foreground-dark text-[27px] font-bold"
            >
              IQ.wiki
            </Text>
          </Link>
        </Column>
      </Row>
      <Text style={{ marginBlock: 0 }} className="my-0 text-center text-sm">
        The World’s Largest{' '}
        <span className="text-brand dark:text-brand-dark">
          Blockchain & Crypto
        </span>{' '}
        Encyclopedia
      </Text>
    </Section>
  )
}
