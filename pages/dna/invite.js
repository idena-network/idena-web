import * as React from 'react'
import {Spinner} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {DnaLinkMethod, useDnaLinkRedirect} from '../../screens/dna/hooks'

export default function DnaInvitePage() {
  useDnaLinkRedirect(
    DnaLinkMethod.Invite,
    ({address}) => `/contacts?new&address=${address}`
  )

  return (
    <Layout canRedirect={false}>
      <Spinner />
    </Layout>
  )
}
