import {WarningIcon} from '@chakra-ui/icons'
import {
  Box,
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
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitleNew} from '../../../screens/app/components'
import {
  AlertBox,
  DetailsPoints,
  FlipsHiddenDescRow,
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
  AngleArrowBackIcon,
  CertificateIcon,
  RightIcon,
  WrongIcon,
} from '../../../shared/components/icons'
import Layout from '../../../shared/components/layout'
import {CertificateActionType} from '../../../shared/types'
import {WideLink} from '../../../screens/home/components'
import {useIsDesktop} from '../../../shared/utils/utils'
import {useAutoCloseTestValidationToast} from '../../../screens/try/hooks/use-test-validation-toast'

export default function Details() {
  const {t} = useTranslation()
  const router = useRouter()
  const isDesktop = useIsDesktop()

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

  useAutoCloseTestValidationToast()

  return (
    <Layout>
      <Page py={0}>
        <Flex direction="column" flex={1} alignSelf="stretch" pb={10}>
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            mt={[4, 8]}
          >
            <AngleArrowBackIcon
              stroke="#578FFF"
              display={['block', 'none']}
              position="absolute"
              left={4}
              top={4}
              h="28px"
              w="28px"
              onClick={() => {
                router.push('/try')
              }}
            />
            <PageTitleNew>{t('Training validation report')}</PageTitleNew>
            <CloseButton
              display={['none', 'flex']}
              alignSelf="flex-start"
              onClick={() => {
                router.push('/try')
              }}
            />
          </Flex>
          <Flex width={['100%', '720px']} direction="column">
            {data.actionType === CertificateActionType.Passed && (
              <AlertBox>
                <Flex align="center">
                  <RightIcon boxSize={[5, 4]} color="green.500" mr={[3, 2]} />
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
              direction={['column', 'row']}
              justifyContent="space-between"
              fontSize="md"
              align="center"
              mt={8}
            >
              <Flex direction={['column', 'row']} w={['100%', 'auto']}>
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
                  mb={[8, 0]}
                />
              </Flex>
              {data.actionType === CertificateActionType.Passed && (
                <Flex w={['100%', 'auto']}>
                  {isDesktop ? (
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
                  ) : (
                    <WideLink
                      href={`/certificate/${id}`}
                      target="_blank"
                      label={t('Show certificate')}
                    >
                      <Box
                        boxSize={8}
                        backgroundColor="brandBlue.10"
                        borderRadius="10px"
                      >
                        <CertificateIcon boxSize={5} mr={1} mt="6px" ml="6px" />
                      </Box>
                    </WideLink>
                  )}
                </Flex>
              )}
            </Flex>
            <Heading
              fontSize={['md', 'lg']}
              fontWeight="500"
              color={['muted', 'brandGray.500']}
              mt={[10, 8]}
            >
              {t('Short session')}
            </Heading>
            <Flex mt={[0, 5]}>
              <Table>
                <Thead display={['none', 'table-header-group']}>
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
                          <FlipsValueTd w={['60px', 'auto']}>
                            <Flex alignItems="center">
                              {correct ? (
                                <RightIcon color="green.500" boxSize={5} />
                              ) : (
                                <WrongIcon color="red.500" boxSize={5} />
                              )}
                              <Flex fontSize={['base', 'md']} ml={[1, 2]}>
                                {GetAnswerTitle(t, answer)}
                              </Flex>
                            </Flex>
                          </FlipsValueTd>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Flex>
            <Heading
              fontSize={['md', 'lg']}
              fontWeight="500"
              color={['muted', 'brandGray.500']}
              mt={[10, 8]}
            >
              {t('Long session')}
            </Heading>
            <Flex mt={[0, 5]}>
              <Table style={{tableLayout: 'fixed'}}>
                <Thead display={['none', 'table-header-group']}>
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
                          <>
                            <Tr position={['relative', 'initial']} key={hash}>
                              <FlipsValueTd
                                borderBottom={[0, '1px solid #e8eaed']}
                              >
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
                              <FlipsValueTd
                                borderBottom={[0, '1px solid #e8eaed']}
                                w={['75px', 'auto']}
                              >
                                <Flex direction={['column', 'row']}>
                                  <Flex alignItems="center">
                                    {correct ? (
                                      <RightIcon
                                        color="green.500"
                                        boxSize={5}
                                      />
                                    ) : (
                                      <WrongIcon color="red.500" boxSize={5} />
                                    )}
                                    <Text
                                      textOverflow="ellipsis"
                                      overflow="hidden"
                                      whiteSpace="nowrap"
                                      fontSize={['base', 'md']}
                                      ml={[1, 2]}
                                    >
                                      {GetAnswerTitle(t, answer)}
                                    </Text>
                                  </Flex>
                                  <Text
                                    display={['block', 'none']}
                                    color="muted"
                                    fontSize="md"
                                    fontWeight={500}
                                  >
                                    {t('Answer')}
                                  </Text>
                                </Flex>
                              </FlipsValueTd>
                              <FlipsValueTd
                                borderBottom={[0, '1px solid #e8eaed']}
                                w={['90px', 'auto']}
                              >
                                <Flex direction={['column', 'row']}>
                                  <Flex alignItems="center">
                                    {correctReport ? (
                                      <RightIcon
                                        color="green.500"
                                        boxSize={5}
                                      />
                                    ) : (
                                      <WrongIcon color="red.500" boxSize={5} />
                                    )}
                                    <Text
                                      textOverflow="ellipsis"
                                      overflow="hidden"
                                      whiteSpace="nowrap"
                                      fontSize={['base', 'md']}
                                      ml={[1, 2]}
                                    >
                                      {wrongWords
                                        ? t('Reported')
                                        : t('Not reported')}
                                    </Text>
                                  </Flex>
                                  <Text
                                    display={['block', 'none']}
                                    color="muted"
                                    fontSize="md"
                                    fontWeight={500}
                                  >
                                    {t('Qualification')}
                                  </Text>
                                </Flex>
                              </FlipsValueTd>
                              <FlipsValueTd display={['none', 'table-cell']}>
                                {GetReasonDesc(t, reason)}
                              </FlipsValueTd>
                            </Tr>
                            <FlipsHiddenDescRow>
                              <Flex
                                direction="column"
                                w="100%"
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
                              >
                                <Text fontSize="base" fontWeight={500}>
                                  {GetReasonDesc(t, reason)}
                                </Text>
                                <Text
                                  color="muted"
                                  fontSize="md"
                                  fontWeight={500}
                                >
                                  {t('Reason')}
                                </Text>
                              </Flex>
                            </FlipsHiddenDescRow>
                          </>
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
