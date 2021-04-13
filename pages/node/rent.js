import {Box, CloseButton, Flex, Link, Radio, Stack} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {rem} from 'polished'
import {useState} from 'react'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../screens/app/components'
import {BuySharedNodeForm} from '../../screens/node/components'
import {getProviders} from '../../shared/api/marketplace'
import {
  Table,
  TableCol,
  TableHeaderCol,
  TableRow,
} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'

export default function Rent() {
  const router = useRouter()
  const {coinbase} = useAuthState()

  const [showDrawer, setShowDrawer] = useState(false)

  const [state, setState] = useState(0)

  const fetchProviders = () => getProviders()

  const {data: providers} = useQuery(['providers'], fetchProviders, {
    initialData: [],
  })

  const availableProviders = providers
    .filter(x => x.slots)
    .sort((a, b) => b.slots - a.slots)

  const selectedProvider =
    availableProviders.length && availableProviders[state]

  return (
    <Layout canRedirect={false}>
      <Page>
        <Flex align="center" alignSelf="stretch" justify="space-between">
          <PageTitle>Rent a shared node</PageTitle>
          <CloseButton onClick={() => router.back()} />
        </Flex>
        <Flex width="100%">
          <Table height="90%">
            <thead>
              <TableRow>
                <TableHeaderCol width={rem(40)}></TableHeaderCol>
                <TableHeaderCol>Node URL</TableHeaderCol>
                <TableHeaderCol>Owner</TableHeaderCol>
                <TableHeaderCol>Location</TableHeaderCol>
                <TableHeaderCol className="text-right">
                  Slots available
                </TableHeaderCol>
                <TableHeaderCol className="text-right">
                  Price per validation
                </TableHeaderCol>
              </TableRow>
            </thead>
            <tbody>
              {availableProviders.map((p, idx) => (
                <TableRow>
                  <TableCol>
                    <Radio
                      isChecked={state === idx}
                      onClick={() => setState(idx)}
                      borderColor="#d2d4d9"
                    ></Radio>
                  </TableCol>
                  <TableCol>{p.data.url}</TableCol>
                  <TableCol>
                    <Link
                      target="_blank"
                      rel="noreferrer"
                      color="brandBlue.100"
                      href={`https://t.me/${p.data.ownerName}`}
                    >
                      {p.data.ownerName}
                    </Link>
                  </TableCol>
                  <TableCol>{p.data.location}</TableCol>
                  <TableCol className="text-right">{p.slots}</TableCol>
                  <TableCol className="text-right">
                    {p.data.price} iDNA
                  </TableCol>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </Flex>
        <Box
          alignSelf="stretch"
          borderTop="1px"
          borderTopColor="gray.300"
          mt="auto"
          pt={5}
        >
          <Stack isInline spacing={2} justify="flex-end">
            <SecondaryButton onClick={() => router.back()}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={() => setShowDrawer(true)}>
              Continue
            </PrimaryButton>
          </Stack>
        </Box>
        <BuySharedNodeForm
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          providerId={selectedProvider && selectedProvider.id}
          url={selectedProvider && selectedProvider.data.url}
          from={coinbase}
          amount={selectedProvider && selectedProvider.data.price}
        />
      </Page>
    </Layout>
  )
}
