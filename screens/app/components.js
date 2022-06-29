/* eslint-disable react/prop-types */
import {HamburgerIcon} from '@chakra-ui/icons'
import {Flex, Heading} from '@chakra-ui/react'
import {forwardRef} from 'react'

export function LayoutContainer(props) {
  return (
    <Flex
      align="stretch"
      flexWrap="wrap"
      color="brand.gray"
      fontSize="md"
      minH="100vh"
      {...props}
    />
  )
}

export const Page = forwardRef(function Page(props, ref) {
  return (
    <Flex
      ref={ref}
      flexDirection="column"
      align="flex-start"
      flexGrow={999}
      maxH={['auto', '100vh']}
      minW="50%"
      px={[8, 20]}
      py={6}
      overflowY="auto"
      position="relative"
      {...props}
    />
  )
})

export function Hamburger({onClick, ...props}) {
  return (
    <Flex
      position="absolute"
      top={4}
      right={4}
      zIndex={7}
      onClick={onClick}
      display={['flex', 'none']}
      {...props}
    >
      <HamburgerIcon boxSize={7} color="blue.500" />
    </Flex>
  )
}

export function PageTitle(props) {
  return (
    <Heading as="h1" fontSize="xl" fontWeight={500} py={2} mb={4} {...props} />
  )
}

export function PageTitleNew(props) {
  return (
    <Heading
      as="h1"
      fontSize={['base', 'xl']}
      fontWeight={['bold', 500]}
      textAlign={['center', 'initial']}
      py={[1, 2]}
      mb={4}
      w={['100%', 'auto']}
      {...props}
    />
  )
}
