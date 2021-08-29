import {
  CloseButton,
  Flex,
  Heading,
  Stack,
  Table,
  Tbody,
  Td,
  Thead,
  Tr,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../../screens/app/components'
import {
  DetailsPoints,
  FlipsTh,
  FlipsValueTd,
  GetReasonDesc,
  LongFlipWithIcon,
  ShortFlipWithIcon,
} from '../../../screens/try/components'
import {getCertificate} from '../../../shared/api/self'
import {Skeleton} from '../../../shared/components/components'
import {RightIcon, WrongIcon} from '../../../shared/components/icons'
import Layout from '../../../shared/components/layout'
import {AnswerType} from '../../../shared/types'

export default function Details() {
  const {t} = useTranslation()
  const router = useRouter()

  const {id} = router.query

  const {data, isLoading} = useQuery(
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

  return (
    <Layout>
      <Page p={0}>
        <Flex direction="column" flex={1} alignSelf="stretch" pb={10}>
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            mt={8}
            mb={4}
          >
            <PageTitle>Validation certificate</PageTitle>
            <CloseButton
              alignSelf="flex-start"
              onClick={() => {
                router.push('/try')
              }}
            />
          </Flex>
          <Stack width="720px" spacing={6}>
            <Flex
              bg="gray.50"
              px={6}
              py={5}
              rounded="lg"
              justifyContent="space-between"
              fontSize="md"
            >
              <DetailsPoints
                title={t('Short score')}
                isLoading={isLoading}
                value={`${data.shortScore || 0}/6`}
                isFailed={data.shortScore < 4}
              />
              <DetailsPoints
                title={t('Long score')}
                isLoading={isLoading}
                value={`${data.longScore || 0}/18`}
                isFailed={data.longScore < 14}
              />
              <DetailsPoints
                title={t('Reporting score')}
                isLoading={isLoading}
                value={`${data.reportScore || 0}/6`}
                isFailed={data.reportScore < 4}
              />
            </Flex>
            <Heading fontSize="lg" fontWeight="500">
              Short session
            </Heading>
            <Flex>
              <Table>
                <Thead bg="gray.50">
                  <Tr>
                    <FlipsTh>Flips</FlipsTh>
                    <FlipsTh textAlign="right" w={20}>
                      Answers
                    </FlipsTh>
                  </Tr>
                </Thead>
                <Tbody>
                  {isLoading
                    ? new Array(6).fill(0).map(() => (
                        <Tr>
                          <Td colSpan={2} px={0} py={2}>
                            <Skeleton h={7} />
                          </Td>
                        </Tr>
                      ))
                    : data.shortFlips.map(({hash, answer, correct}) => (
                        <Tr key={hash}>
                          <FlipsValueTd>
                            <ShortFlipWithIcon hash={hash} />
                          </FlipsValueTd>
                          <FlipsValueTd>
                            <Flex alignItems="center">
                              {correct ? (
                                <RightIcon color="green.500" boxSize={5} />
                              ) : (
                                <WrongIcon color="red.500" boxSize={5} />
                              )}
                              <Flex ml={2}>
                                {answer === AnswerType.Left
                                  ? t('Left')
                                  : t('Right')}
                              </Flex>
                            </Flex>
                          </FlipsValueTd>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Flex>
            <Heading fontSize="lg" fontWeight="500">
              Long session
            </Heading>
            <Flex>
              <Table style={{tableLayout: 'fixed'}}>
                <Thead bg="gray.50">
                  <Tr>
                    <FlipsTh w="35%">Flips</FlipsTh>
                    <FlipsTh>Answers</FlipsTh>
                    <FlipsTh>Qualification</FlipsTh>
                    <FlipsTh>Reason</FlipsTh>
                  </Tr>
                </Thead>
                <Tbody>
                  {isLoading
                    ? new Array(6).fill(0).map(() => (
                        <Tr>
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
                              <LongFlipWithIcon hash={hash} />
                            </FlipsValueTd>
                            <FlipsValueTd>
                              <Flex alignItems="center">
                                {correct ? (
                                  <RightIcon color="green.500" boxSize={5} />
                                ) : (
                                  <WrongIcon color="red.500" boxSize={5} />
                                )}
                                <Flex ml={2}>
                                  {answer === AnswerType.Left
                                    ? t('Left')
                                    : t('Right')}
                                </Flex>
                              </Flex>
                            </FlipsValueTd>
                            <FlipsValueTd>
                              <Flex alignItems="center">
                                {correctReport || !reason ? (
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
          </Stack>
        </Flex>
      </Page>
    </Layout>
  )
}
