import {Flex} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {ActivateInvite} from '../../screens/key/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import theme, {rem} from '../../shared/theme'

export default function Offline() {
  const {privateKey} = useAuthState()
  const router = useRouter()

  return (
    <Layout canRedirect={false}>
      <Flex
        style={{backgroundColor: theme.colors.darkGraphite}}
        alignItems="center"
        justifyContent="center"
        height="100%"
        direction="column"
        justify="center"
        flex="1"
      >
        <Flex direction="column" maxWidth={rem(480)}>
          <ActivateInvite
            privateKey={privateKey}
            onBack={() => router.back()}
            onNext={() => {
              router.push('/')
            }}
          ></ActivateInvite>
        </Flex>
      </Flex>
    </Layout>
  )
}
