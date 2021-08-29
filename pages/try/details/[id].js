import {
  CloseButton,
  Flex,
  Heading,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../../screens/app/components'
import {
  FlipsTh,
  FlipsValueTd,
  GetReasonDesc,
} from '../../../screens/try/components'
import {getCertificate} from '../../../shared/api/self'
import Layout from '../../../shared/components/layout'
import {useAuthState} from '../../../shared/providers/auth-context'
import {AnswerType} from '../../../shared/types'

const temp = [
  {
    hash: 'bafkreiegngisqdb6z3lmfpmspl57w3xwwlpoxrmax5pgcf4ol2rh3jmy6y',
    answer: 1,
    correct: true,
  },
  {
    hash: 'bafkreiayvbrmvdxqrr56kawhjp77s2n46y64u3jpj2ufgqawnjuv7aur44',
    answer: 1,
    correct: false,
  },
  {
    hash: 'bafkreieo5zgbjuxlntuo4oqyri22cw3rluiyxppfozhf4b2ftpazkbkmw4',
    answer: 1,
    correct: true,
  },
  {
    hash: 'bafkreidsq3ymfflpqhe34cdqgcjiovvldnhvobzqmgk5iqqyqdqbbb2ufq',
    answer: 2,
    correct: true,
  },
  {
    hash: 'bafkreidb5nl6xwte6focuiattodjmibqshmimy3ttzpomdrvu2bjey5jmm',
    answer: 1,
    correct: true,
  },
  {
    hash: 'bafkreiggx5lcj4zuu2pxtlqsaov4uljtmabgkripopx63wza5uzro5hgoy',
    answer: 1,
    correct: true,
  },
]

export default function Details() {
  const {t} = useTranslation()
  const router = useRouter()

  const {id} = router.query

  const {data, isLoading: certificateIsLoading, isError} = useQuery(
    ['get-certificate-full', id],
    () => getCertificate(id, 1),
    {
      enabled: !!id,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  console.log(data)

  return (
    <Layout>
      <Page p={0}>
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          px={20}
          pb="36px"
          overflowY="auto"
        >
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
                router.push('/')
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
              <Stack flex={1}>
                <Flex color="muted">Short score</Flex>
                <Flex fontSize="base" fontWeight="500">
                  2/6
                </Flex>
              </Stack>
              <Stack flex={1}>
                <Flex color="muted">Long score</Flex>
                <Flex fontSize="base" fontWeight="500">
                  2/6
                </Flex>
              </Stack>
              <Stack flex={1}>
                <Flex color="muted">Reporting score</Flex>
                <Flex fontSize="base" fontWeight="500">
                  2/6
                </Flex>
              </Stack>
            </Flex>
            <Heading fontSize="lg" fontWeight="500">
              Short session
            </Heading>
            <Flex>
              <Table>
                <Thead bg="gray.50">
                  <Tr>
                    <FlipsTh>Flips</FlipsTh>
                    <FlipsTh>Answers</FlipsTh>
                  </Tr>
                </Thead>
                <Tbody>
                  {temp.map(({hash, answer, correct}) => (
                    <Tr key={hash}>
                      <Td color="blue.500" cursor="pointer" px={3} py={3}>
                        {hash}
                      </Td>
                      <FlipsValueTd textAlign="right">
                        {answer === AnswerType.Left ? t('Left') : t('Right')}
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
                  {temp.map(({hash, answer, wrongWords, reason}) => (
                    <Tr key={hash}>
                      <Td
                        color="blue.500"
                        cursor="pointer"
                        px={3}
                        py={3}
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {hash}
                      </Td>
                      <FlipsValueTd>
                        {answer === AnswerType.Left ? t('Left') : t('Right')}
                      </FlipsValueTd>
                      <FlipsValueTd>
                        {wrongWords ? t('Reported') : t('Not reported')}
                      </FlipsValueTd>
                      <FlipsValueTd>{GetReasonDesc(t, reason)}</FlipsValueTd>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Flex>
          </Stack>
        </Flex>
      </Page>
    </Layout>
  )
}
