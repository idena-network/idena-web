import React, {forwardRef} from 'react'
import NextLink from 'next/link'
import {
  Box,
  Flex,
  Stack,
  StackDivider,
  StatLabel,
  StatNumber,
  FormControl,
  Heading,
  Tab,
  NumberInputField,
  NumberInput,
  useTab,
  Button,
  CloseButton,
  HStack,
  AspectRatio,
  Image,
  InputRightElement,
  InputGroup,
  Badge,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {rem} from '../../shared/theme'
import {FormLabel} from '../../shared/components/components'
import {omit, pick} from '../../shared/utils/utils'

export function AdStatLabel(props) {
  return <StatLabel color="muted" fontSize="md" {...props} />
}

export function AdStatNumber(props) {
  return <StatNumber fontSize="md" fontWeight={500} {...props} />
}

export function SmallTargetFigure({children = 'Any', ...props}) {
  return (
    <AdStatNumber fontSize={rem(11)} {...props}>
      {children}
    </AdStatNumber>
  )
}

export function AdList(props) {
  return (
    <Stack
      spacing="8"
      divider={<StackDivider borderColor="gray.100" />}
      {...props}
    />
  )
}

export function EmptyAdList() {
  const {t} = useTranslation()
  return (
    <Flex
      flexDirection="column"
      align="center"
      alignSelf="stretch"
      justify="center"
      color="muted"
      my="auto"
    >
      {t(`You haven't created any ads yet`)}
    </Flex>
  )
}

// eslint-disable-next-line react/display-name
export const AdFormTab = forwardRef(({isSelected, ...props}, ref) => (
  <Tab
    ref={ref}
    isSelected={isSelected}
    color="muted"
    fontWeight={500}
    py={2}
    px={4}
    rounded="md"
    _selected={{bg: 'brandBlue.50', color: 'brandBlue.500'}}
    {...props}
  />
))

export function FormSection(props) {
  return <Box {...props} />
}

export function FormSectionTitle(props) {
  return (
    <Heading
      as="h3"
      pt="2"
      pb="3"
      mb={2}
      fontSize="mdx"
      fontWeight={500}
      lineHeight="5"
      {...props}
    />
  )
}

export function AdFormField({label, children}) {
  return (
    <FormControl>
      <Flex>
        <FormLabel color="muted" w="32" pt={2}>
          {label}
        </FormLabel>
        <Box w="sm">{children}</Box>
      </Flex>
    </FormControl>
  )
}

export function AdNumberInput({addon, ...props}) {
  return (
    <NumberInput {...props}>
      {addon ? (
        <InputGroup>
          <NumberInputField />
          <InputRightElement color="muted" right="3">
            {addon}
          </InputRightElement>
        </InputGroup>
      ) : (
        <NumberInputField />
      )}
    </NumberInput>
  )
}

export const NewAdFormTab = React.forwardRef((props, ref) => {
  const tabProps = useTab({...props, ref})
  const isSelected = Boolean(tabProps['aria-selected'])

  return <Button variant="tab" isActive={isSelected} {...tabProps} />
})

export function PageHeader(props) {
  return (
    <Flex
      as="header"
      justify="space-between"
      align="center"
      alignSelf="stretch"
      mb={4}
      {...props}
    />
  )
}

export function PageCloseButton({href, ...props}) {
  return (
    <NextLink href={href}>
      <CloseButton {...props} />
    </NextLink>
  )
}

export function PageFooter(props) {
  return (
    <HStack
      as="footer"
      spacing={2}
      justify="flex-end"
      bg="white"
      borderTop="1px"
      borderTopColor="gray.100"
      px={4}
      py={3}
      h={14}
      w="full"
      {...props}
    />
  )
}

export function AdImage({
  src: initialSrc,
  fallbackSrc = '/static/body-medium-pic-icn.svg',
  ...props
}) {
  const boxProps = pick(props, ['w', 'width', 'h', 'height', 'boxSize'])
  const imageProps = omit(props, Object.keys(boxProps))

  const [src, setSrc] = React.useState()

  React.useEffect(() => {
    setSrc(initialSrc)
  }, [initialSrc])

  return (
    <AspectRatio ratio={1} flexShrink={0} {...boxProps}>
      <Image
        src={src}
        ignoreFallback
        bg="gray.50"
        rounded="lg"
        onError={() => {
          setSrc(fallbackSrc)
        }}
        {...imageProps}
      />
    </AspectRatio>
  )
}

export function InputCharacterCount(props) {
  return (
    <InputRightElement
      color="muted"
      fontSize="sm"
      boxSize="fit-content"
      top="unset"
      right="2"
      bottom="1.5"
      {...props}
    />
  )
}

export function MiningBadge(props) {
  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      alignSelf="flex-start"
      colorScheme="orange"
      bg="orange.020"
      color="orange.500"
      fontWeight="normal"
      fontSize="md"
      rounded="xl"
      h="6"
      px={3}
      textTransform="initial"
      {...props}
    />
  )
}
