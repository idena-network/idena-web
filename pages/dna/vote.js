import * as React from 'react'
import {Spinner} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {DnaLinkMethod, useDnaLinkRedirect} from '../../screens/dna/hooks'
import {useAuthState} from '../../shared/providers/auth-context'

export default function DnaVotePage() {
  useDnaVoteRedirect()

  return (
    <Layout canRedirect={false}>
      <Spinner />
    </Layout>
  )
}

function useDnaVoteRedirect() {
  const {auth} = useAuthState()

  useDnaLinkRedirect(
    auth && DnaLinkMethod.Vote,
    ({address}) => `/oracles/view?id=${address}`
  )
}
