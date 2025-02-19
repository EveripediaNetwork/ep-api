import { Column, Img, Link, Row, Section, Text } from '@react-email/components'

const BASE_PATH = 'https://iq.wiki/images/emails'
export default function Banner() {
  return (
    <Section
      style={{ maxWidth: '100%' }}
      className="bg-[#FFFFFF] dark:bg-card-dark w-full py-3"
    >
      <Row>
        <Column align="center">
          <Link
            href="https://iq.wiki"
            className="inline-flex items-center gap-2 my-0"
          >
            <Img src={`${BASE_PATH}/braindao-logo.png`} className='w-[65px] h-[55px]' />
            <Text
              style={{ marginBlock: 0, marginLeft: '8px' }}
              className="my-0 text-center text-foreground dark:text-foreground-dark text-[27px] font-bold"
            >
              IQ.wiki
            </Text>
          </Link>
        </Column>
      </Row>
      <Text style={{ margin: 0 }} className="my-0 text-center text-sm text-foreground dark:text-foreground-dark">
        The World’s Largest{' '}
        <span className="text-brand dark:text-brand-dark">
          Blockchain & Crypto
        </span>{' '}
        Encyclopedia
      </Text>
    </Section>
  )
}
