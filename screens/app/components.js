/* eslint-disable react/prop-types */
import {HamburgerIcon} from '@chakra-ui/icons'
import {Flex, Heading} from '@chakra-ui/react'

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

export function Page(props) {
  return (
    <Flex
      flexDirection="column"
      align={['center', 'flex-start']}
      flexBasis={0}
      flexGrow={999}
      maxH="100vh"
      minW="50%"
      px={[8, 20]}
      py={6}
      overflowY="auto"
      position="relative"
      {...props}
    />
  )
}

export function Hamburger({onClick}) {
  return (
    <Flex
      position="absolute"
      top={4}
      right={4}
      zIndex={2}
      onClick={onClick}
      display={['flex', 'none']}
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
