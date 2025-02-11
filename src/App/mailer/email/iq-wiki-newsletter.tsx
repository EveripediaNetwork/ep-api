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
        <Container className="mx-auto max-w-[800px] px-10 py-8">
          <Section
            style={{ maxWidth: '100%' }}
            className="bg-card dark:bg-card-dark w-full"
          >
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
          <Hr className="mt-2 mb-10 border-border dark:border-border-dark" />
          <Section>
            <Text className="text-3xl sm:text-4xl md:text-5xl font-bold text-center">
              Your Update from IQ.wiki
            </Text>
            <Text className="text-xs text-center">
              What’s new and what to read next. 👀
            </Text>
          </Section>
          <Section className="bg-card dark:bg-card-dark max-w-full w-full p-6 border border-border dark:border-border-dark mb-6 rounded-3xl">
            <Img
              src={wikiImage}
              alt={wiki}
              width={672}
              className="max-w-full rounded-xl"
            />
          </Section>
          <Section>
            <Text className="font-bold text-2xl sm:text-3xl">{wiki}</Text>
            <Text className="text-sm sm:text-base">
              Hey There! I have got some good news for you.
              <span className="text-brand dark:text-brand font-semibold">
                {wiki}
              </span>{' '}
              has been updated. You don’t want to miss. it. Click below to check
              out the lastest information.
            </Text>
            <Link
              className="bg-brand dark:bg-brand-dark text-white font-medium text-sm px-8 rounded-md sm:mt-3 inline-flex items-center"
              href={url}
            >
              <Text className="text-primary-foreground font-semibold">
                Check it out
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
                  className="dark:fill-secondary-foreground fill-secondary-foreground-dark dark:stroke-secondary-foreground stroke-secondary-foreground-dark"
                />
              </svg>
            </Link>
          </Section>
          <Section className="mt-10 sm:mt-20">
            <Text className="font-bold text-3xl sm:text-4xl md:text-5xl">
              More wikis you'll love!
            </Text>
            <div className="mt-6 sm:mt-10">
              {suggestions.map(({ title, wikiUrl, image, summary }, index) => (
                <>
                  <Row key={title}>
                    <Column className="w-full block sm:table-cell sm:w-3/5">
                      <Text className="font-semibold text-2xl sm:text-3xl md:text-4xl">
                        {title}
                      </Text>
                      <Text className="text-sm text-muted-foreground dark:text-muted-foreground-dark">
                        {summary}
                      </Text>
                      <Link
                        className="border-border dark:border-border-dark bg-secondary dark:bg-secondary-dark font-medium text-sm sm:mt-2 inline-flex items-center px-8 rounded-md"
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
                        className="rounded-xl border w-full h-[250px] sm:h-[150px] border-border dark:border-border-dark md:max-w-full"
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
              ))}
            </div>
          </Section>
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
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.17 1.875H17.9267L11.9042 8.75833L18.9892 18.125H13.4417L9.09668 12.4442L4.12505 18.125H1.36672L7.80839 10.7625L1.01172 1.875H6.70005L10.6275 7.0675L15.17 1.875ZM14.2025 16.475H15.73L5.87005 3.43833H4.23089L14.2025 16.475Z"
                      className="fill-primary dark:fill-primary-dark"
                    />
                  </svg>
                </Column>
                <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_40800_13923)">
                      <path
                        d="M10.0001 1.6665C5.39592 1.6665 1.66675 5.39567 1.66675 9.99984C1.6658 11.7492 2.21576 13.4545 3.2386 14.8737C4.26143 16.293 5.7052 17.3541 7.36508 17.9065C7.78175 17.979 7.93758 17.729 7.93758 17.5098C7.93758 17.3123 7.92675 16.6565 7.92675 15.9582C5.83342 16.344 5.29175 15.4482 5.12508 14.979C5.03092 14.739 4.62508 13.9998 4.27092 13.8015C3.97925 13.6457 3.56258 13.2598 4.26008 13.2498C4.91675 13.239 5.38508 13.854 5.54175 14.104C6.29175 15.364 7.49008 15.0098 7.96842 14.7915C8.04175 14.2498 8.26008 13.8857 8.50008 13.6773C6.64592 13.469 4.70842 12.7498 4.70842 9.56234C4.70842 8.65567 5.03092 7.9065 5.56258 7.32234C5.47925 7.114 5.18758 6.25984 5.64592 5.114C5.64592 5.114 6.34342 4.89567 7.93758 5.969C8.61597 5.78072 9.31689 5.68596 10.0209 5.68734C10.7292 5.68734 11.4376 5.78067 12.1042 5.96817C13.6976 4.88484 14.3959 5.11484 14.3959 5.11484C14.8542 6.26067 14.5626 7.11484 14.4792 7.32317C15.0101 7.9065 15.3334 8.64567 15.3334 9.56234C15.3334 12.7607 13.3859 13.469 11.5317 13.6773C11.8334 13.9373 12.0942 14.4373 12.0942 15.219C12.0942 16.3332 12.0834 17.229 12.0834 17.5107C12.0834 17.729 12.2401 17.989 12.6567 17.9057C14.3109 17.3472 15.7483 16.284 16.7667 14.8658C17.785 13.4476 18.3329 11.7458 18.3334 9.99984C18.3334 5.39567 14.6042 1.6665 10.0001 1.6665Z"
                        className="fill-primary dark:fill-primary-dark"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_40800_13923">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Column>
                <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_40800_13925)">
                      <path
                        d="M12 2C14.717 2 15.056 2.01 16.122 2.06C17.187 2.11 17.912 2.277 18.55 2.525C19.21 2.779 19.766 3.123 20.322 3.678C20.8305 4.1779 21.224 4.78259 21.475 5.45C21.722 6.087 21.89 6.813 21.94 7.878C21.987 8.944 22 9.283 22 12C22 14.717 21.99 15.056 21.94 16.122C21.89 17.187 21.722 17.912 21.475 18.55C21.2247 19.2178 20.8311 19.8226 20.322 20.322C19.822 20.8303 19.2173 21.2238 18.55 21.475C17.913 21.722 17.187 21.89 16.122 21.94C15.056 21.987 14.717 22 12 22C9.283 22 8.944 21.99 7.878 21.94C6.813 21.89 6.088 21.722 5.45 21.475C4.78233 21.2245 4.17753 20.8309 3.678 20.322C3.16941 19.8222 2.77593 19.2175 2.525 18.55C2.277 17.913 2.11 17.187 2.06 16.122C2.013 15.056 2 14.717 2 12C2 9.283 2.01 8.944 2.06 7.878C2.11 6.812 2.277 6.088 2.525 5.45C2.77524 4.78218 3.1688 4.17732 3.678 3.678C4.17767 3.16923 4.78243 2.77573 5.45 2.525C6.088 2.277 6.812 2.11 7.878 2.06C8.944 2.013 9.283 2 12 2ZM12 7C10.6739 7 9.40215 7.52678 8.46447 8.46447C7.52678 9.40215 7 10.6739 7 12C7 13.3261 7.52678 14.5979 8.46447 15.5355C9.40215 16.4732 10.6739 17 12 17C13.3261 17 14.5979 16.4732 15.5355 15.5355C16.4732 14.5979 17 13.3261 17 12C17 10.6739 16.4732 9.40215 15.5355 8.46447C14.5979 7.52678 13.3261 7 12 7ZM18.5 6.75C18.5 6.41848 18.3683 6.10054 18.1339 5.86612C17.8995 5.6317 17.5815 5.5 17.25 5.5C16.9185 5.5 16.6005 5.6317 16.3661 5.86612C16.1317 6.10054 16 6.41848 16 6.75C16 7.08152 16.1317 7.39946 16.3661 7.63388C16.6005 7.8683 16.9185 8 17.25 8C17.5815 8 17.8995 7.8683 18.1339 7.63388C18.3683 7.39946 18.5 7.08152 18.5 6.75ZM12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9Z"
                        className="fill-primary dark:fill-primary-dark"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_40800_13925">
                        <rect width="24" height="24" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Column>
                <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_40800_13927)">
                      <path
                        d="M11.6668 11.2498H13.7502L14.5835 7.9165H11.6668V6.24984C11.6668 5.3915 11.6668 4.58317 13.3335 4.58317H14.5835V1.78317C14.3118 1.74734 13.286 1.6665 12.2027 1.6665C9.94016 1.6665 8.3335 3.04734 8.3335 5.58317V7.9165H5.8335V11.2498H8.3335V18.3332H11.6668V11.2498Z"
                        className="fill-primary dark:fill-primary-dark"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_40800_13927">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Column>
                <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_40800_13929)">
                      <path
                        d="M8.39667 9.1665C8.89667 9.1665 9.30167 9.5415 9.2925 9.99984C9.2925 10.4582 8.8975 10.8332 8.39667 10.8332C7.905 10.8332 7.5 10.4582 7.5 9.99984C7.5 9.5415 7.89583 9.1665 8.39667 9.1665ZM11.6033 9.1665C12.1042 9.1665 12.5 9.5415 12.5 9.99984C12.5 10.4582 12.1042 10.8332 11.6033 10.8332C11.1117 10.8332 10.7075 10.4582 10.7075 9.99984C10.7075 9.5415 11.1025 9.1665 11.6033 9.1665ZM15.7425 1.6665C16.7117 1.6665 17.5 2.4715 17.5 3.469V19.1665L15.6575 17.504L14.62 16.524L13.5225 15.4823L13.9775 17.1015H4.2575C3.28833 17.1015 2.5 16.2965 2.5 15.299V3.469C2.5 2.4715 3.28833 1.6665 4.2575 1.6665H15.7417H15.7425ZM12.4342 13.094C14.3283 13.0332 15.0575 11.764 15.0575 11.764C15.0575 8.9465 13.8225 6.66234 13.8225 6.66234C12.5892 5.71817 11.4142 5.744 11.4142 5.744L11.2942 5.884C12.7517 6.339 13.4283 6.99567 13.4283 6.99567C12.6326 6.54733 11.7555 6.26178 10.8483 6.15567C10.2729 6.09067 9.69161 6.09627 9.1175 6.17234C9.06583 6.17234 9.0225 6.1815 8.97167 6.18984C8.67167 6.2165 7.9425 6.32984 7.02583 6.7415C6.70917 6.88984 6.52 6.99567 6.52 6.99567C6.52 6.99567 7.23167 6.304 8.77417 5.849L8.68833 5.744C8.68833 5.744 7.51417 5.71817 6.28 6.66317C6.28 6.66317 5.04583 8.9465 5.04583 11.764C5.04583 11.764 5.76583 13.0323 7.66 13.094C7.66 13.094 7.97667 12.7007 8.235 12.3682C7.14583 12.0348 6.735 11.3348 6.735 11.3348C6.735 11.3348 6.82 11.3965 6.97417 11.484C6.9825 11.4923 6.99083 11.5015 7.00833 11.5098C7.03417 11.5282 7.06 11.5365 7.08583 11.554C7.3 11.6765 7.51417 11.7723 7.71083 11.8515C8.0625 11.9915 8.4825 12.1315 8.97167 12.2282C9.70443 12.3718 10.4578 12.3746 11.1917 12.2365C11.6191 12.1602 12.0361 12.0341 12.4342 11.8607C12.7342 11.7465 13.0683 11.5798 13.42 11.344C13.42 11.344 12.9917 12.0615 11.8683 12.3857C12.1258 12.7182 12.435 13.094 12.435 13.094H12.4342Z"
                        className="fill-primary dark:fill-primary-dark"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_40800_13929">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Column>
                <Column className="rounded-full bg-brand-accent dark:bg-brand-accent-dark inline-flex items-center justify-center w-10 h-10 ml-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.99984 18.3332C5.39734 18.3332 1.6665 14.6023 1.6665 9.99984C1.6665 5.39734 5.39734 1.6665 9.99984 1.6665C14.6023 1.6665 18.3332 5.39734 18.3332 9.99984C18.3332 14.6023 14.6023 18.3332 9.99984 18.3332ZM7.40817 10.9748L7.419 10.969L8.144 13.3607C8.23734 13.6198 8.36567 13.6665 8.5215 13.6448C8.67817 13.624 8.76067 13.5398 8.86317 13.4415L9.85317 12.4848L11.9782 14.0582C12.3665 14.2723 12.6457 14.1615 12.7423 13.6982L14.1232 7.17984C14.2757 6.57317 14.009 6.32984 13.5382 6.52317L5.42734 9.6565C4.874 9.87817 4.87734 10.1882 5.32734 10.3257L7.40817 10.9757V10.9748Z"
                      className="fill-primary dark:fill-primary-dark"
                    />
                  </svg>
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
