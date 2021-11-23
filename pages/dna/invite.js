import * as React from 'react'
import {Spinner} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {DnaLinkMethod, useDnaLinkRedirect} from '../../screens/dna/hooks'
import {useAuthState} from '../../shared/providers/auth-context'

export default function DnaInvitePage() {
  useDnaInviteRedirect()

  return (
    <Layout canRedirect={false}>
      <Spinner />
    </Layout>
  )
}

function useDnaInviteRedirect() {
  const {auth} = useAuthState()

  useDnaLinkRedirect(
    auth && DnaLinkMethod.Invite,
    ({address}) => `/contacts?new&address=${address}`
  )
}
