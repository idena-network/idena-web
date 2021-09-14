import {WarningIcon} from '@chakra-ui/icons'
import {
  CloseButton,
  Flex,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Thead,
  Tr,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../../screens/app/components'
import {
  AlertBox,
  DetailsPoints,
  FlipsTh,
  FlipsThCorner,
  FlipsValueTd,
  FlipView,
  GetReasonDesc,
  LongFlipWithIcon,
  RoundedFlipsTh,
  ShortFlipWithIcon,
} from '../../../screens/try/components'
import {GetAnswerTitle} from '../../../screens/try/utils'
import {getCertificate} from '../../../shared/api/self'
import {Skeleton, TextLink} from '../../../shared/components/components'
import {
  CertificateIcon,
  RightIcon,
  WrongIcon,
} from '../../../shared/components/icons'
import Layout from '../../../shared/components/layout'
import {CertificateActionType} from '../../../shared/types'

export default function Details() {
  const {t} = useTranslation()
  const router = useRouter()

  const [flipView, setFlipView] = useState({
    isOpen: false,
  })

  const {id} = router.query

  const {data, isFetching} = useQuery(
    ['get-certificate-full', id],
    () => getCertificate(id, 1),
    {
      enabled: !!id,
      retry: false,
      refetchOnWindowFocus: false,
      initialData: {
        shortFlips: [],
        longFlips: [],
      },
    }
  )

  const openFlipView = (
    hash,
    answer,
    isCorrect,
    withWords,
    isCorrectReport,
    shouldBeReported
  ) => {
    setFlipView({
      isOpen: true,
      hash,
      answer,
      isCorrect,
      withWords,
      isCorrectReport,
      shouldBeReported,
    })
  }

  return (
    <Layout>
      <Page py={0}>
        <Flex direction="column" flex={1} alignSelf="stretch" pb={10}>
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            mt={8}
          >
            <PageTitle>{t('Training validation report')}</PageTitle>
            <CloseButton
              alignSelf="flex-start"
              onClick={() => {
                router.push('/try')
              }}
            />
          </Flex>
          <Flex width="720px" direction="column">
            {data.actionType === CertificateActionType.Passed && (
              <AlertBox>
                <Flex align="center">
                  <RightIcon boxSize={4} color="green.500" mr={2} />
                  <Text fontWeight={500}>{t('Passed successfully')}</Text>
                </Flex>
              </AlertBox>
            )}
            {data.actionType === CertificateActionType.Failed && (
              <AlertBox borderColor="red.050" bg="red.010">
                <Flex align="center">
                  <WarningIcon boxSize={4} color="red.500" mr={2} />
                  <Text fontWeight={500}>{t('Failed. Please try again')}</Text>
                </Flex>
              </AlertBox>
            )}
            <Flex
              justifyContent="space-between"
              fontSize="md"
              align="center"
              mt={8}
            >
              <Flex>
                <DetailsPoints
                  title={t('Short score')}
                  isLoading={isFetching}
                  value={`${data.shortScore || 0}/6`}
                  isFailed={data.shortScore < 4}
                />
                <DetailsPoints
                  title={t('Long score')}
                  isLoading={isFetching}
                  value={`${data.longScore || 0}/18`}
                  isFailed={data.longScore < 14}
                />
                <DetailsPoints
                  title={t('Reporting score')}
                  isLoading={isFetching}
                  value={`${data.reportScore || 0}/6`}
                  isFailed={data.reportScore < 4}
                />
              </Flex>
              {data.actionType === CertificateActionType.Passed && (
                <Flex>
                  <TextLink
                    href="/certificate/[id]"
                    as={`/certificate/${id}`}
                    fontWeight={500}
                    mr={4}
                    target="_blank"
                  >
                    <CertificateIcon boxSize={5} mr={1} />
                    {t('Show certificate')}
                  </TextLink>
                </Flex>
              )}
            </Flex>
            <Heading fontSize="lg" fontWeight="500" mt={8}>
              {t('Short session')}
            </Heading>
            <Flex mt={5}>
              <Table>
                <Thead>
                  <Tr>
                    <RoundedFlipsTh>
                      {t('Flips')}
                      <FlipsThCorner borderLeftRadius="md" />
                    </RoundedFlipsTh>
                    <RoundedFlipsTh w={32}>
                      {t('Answers')}
                      <FlipsThCorner borderRightRadius="md" />
                    </RoundedFlipsTh>
                  </Tr>
                </Thead>
                <Tbody>
                  {isFetching
                    ? new Array(6).fill(0).map((_, idx) => (
                        <Tr key={idx}>
                          <Td colSpan={2} px={0} py={2}>
                            <Skeleton h={7} />
                          </Td>
                        </Tr>
                      ))
                    : data.shortFlips.map(({hash, answer, correct}) => (
                        <Tr key={hash}>
                          <FlipsValueTd>
                            <ShortFlipWithIcon
                              hash={hash}
                              onClick={() =>
                                openFlipView(hash, answer, correct)
                              }
                            />
                          </FlipsValueTd>
                          <FlipsValueTd>
                            <Flex alignItems="center">
                              {correct ? (
                                <RightIcon color="green.500" boxSize={5} />
                              ) : (
                                <WrongIcon color="red.500" boxSize={5} />
                              )}
                              <Flex ml={2}>{GetAnswerTitle(t, answer)}</Flex>
                            </Flex>
                          </FlipsValueTd>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Flex>
            <Heading fontSize="lg" fontWeight="500" mt={8}>
              {t('Long session')}
            </Heading>
            <Flex mt={5}>
              <Table style={{tableLayout: 'fixed'}}>
                <Thead>
                  <Tr>
                    <RoundedFlipsTh w="35%">
                      {t('Flips')}
                      <FlipsThCorner borderLeftRadius="md" />
                    </RoundedFlipsTh>
                    <FlipsTh w={32}>{t('Answers')}</FlipsTh>
                    <FlipsTh>{t('Qualification')}</FlipsTh>
                    <RoundedFlipsTh>
                      {t('Reporting reason')}
                      <FlipsThCorner borderRightRadius="md" />
                    </RoundedFlipsTh>
                  </Tr>
                </Thead>
                <Tbody>
                  {isFetching
                    ? new Array(6).fill(0).map((_, idx) => (
                        <Tr key={idx}>
                          <Td colSpan={4} px={0} py={2}>
                            <Skeleton h={7} />
                          </Td>
                        </Tr>
                      ))
                    : data.longFlips.map(
                        ({
                          hash,
                          answer,
                          correct,
                          correctReport,
                          wrongWords,
                          reason,
                        }) => (
                          <Tr key={hash}>
                            <FlipsValueTd>
                              <LongFlipWithIcon
                                hash={hash}
                                onClick={() =>
                                  openFlipView(
                                    hash,
                                    answer,
                                    correct,
                                    true,
                                    correctReport,
                                    reason !== 0
                                  )
                                }
                              />
                            </FlipsValueTd>
                            <FlipsValueTd>
                              <Flex alignItems="center">
                                {correct ? (
                                  <RightIcon color="green.500" boxSize={5} />
                                ) : (
                                  <WrongIcon color="red.500" boxSize={5} />
                                )}
                                <Flex ml={2}>{GetAnswerTitle(t, answer)}</Flex>
                              </Flex>
                            </FlipsValueTd>
                            <FlipsValueTd>
                              <Flex alignItems="center">
                                {correctReport ? (
                                  <RightIcon color="green.500" boxSize={5} />
                                ) : (
                                  <WrongIcon color="red.500" boxSize={5} />
                                )}
                                <Flex ml={2}>
                                  {wrongWords
                                    ? t('Reported')
                                    : t('Not reported')}
                                </Flex>
                              </Flex>
                            </FlipsValueTd>
                            <FlipsValueTd>
                              {GetReasonDesc(t, reason)}
                            </FlipsValueTd>
                          </Tr>
                        )
                      )}
                </Tbody>
              </Table>
            </Flex>
          </Flex>
        </Flex>
        <FlipView {...flipView} onClose={() => setFlipView({isOpen: false})} />
      </Page>
    </Layout>
  )
}
