/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import {InfoIcon} from '@chakra-ui/icons'
import {
  Box,
  Button,
  CloseButton,
  Divider,
  Flex,
  Heading,
  IconButton,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Td,
  Text,
  Th,
  Tr,
  useBreakpointValue,
  useDisclosure,
  useTheme,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  Skeleton,
  SmallText,
  TextLink,
} from '../../shared/components/components'
import {
  ChevronDownIcon,
  SendOutIcon,
  TimerIcon,
  TwitterIcon,
} from '../../shared/components/icons'
import {useIdentity} from '../../shared/providers/identity-context'
import {IdentityStatus} from '../../shared/types'
import {
  mapIdentityToFriendlyStatus,
  openExternalUrl,
  toLocaleDna,
  toPercent,
} from '../../shared/utils/utils'
import {useValidationReportSummary} from './hooks'
import {ValidationResult} from './types'

export function ValidationReportSummary({onClose, ...props}) {
  const {t, i18n} = useTranslation()

  const {colors} = useTheme()
  const router = useRouter()

  const [{isValidated, status}] = useIdentity()

  const {
    lastValidationScore,
    totalScore,
    earnings,
    earningsScore,
    totalMissedReward,
    validationResult,
    isLoading,
    isFailed,
  } = useValidationReportSummary()

  const maybeNew =
    !status ||
    [
      IdentityStatus.Undefined,
      IdentityStatus.Invite,
      IdentityStatus.Candidate,
    ].includes(status)

  if (isFailed || (isLoading && maybeNew)) return null

  const {
    short: {score: shortScore},
  } = lastValidationScore

  const dna = toLocaleDna(i18n.language, {maximumFractionDigits: 3})

  const tweet = () =>
    openExternalUrl(`
  https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `I've earned ${earnings.toLocaleString(i18n.language, {
      maximumFractionDigits: 3,
    })} $IDNA`
  )}&url=https://idena.io/join-idena&hashtags=Idena,ubi,blockchain,mining
`)

  return (
    <Box w="100%" pb={[2, 0]} {...props}>
      <Flex
        borderTop="4px solid"
        borderTopColor={
          // eslint-disable-next-line no-nested-ternary
          isLoading
            ? 'transparent'
            : // eslint-disable-next-line no-nested-ternary
            isValidated
            ? validationResult === ValidationResult.Penalty
              ? 'orange.500'
              : 'green.500'
            : 'red.500'
        }
        borderRadius="md"
        boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
        px={[7, 8]}
        pt={6}
        pb={[2, 6]}
        position="relative"
        w="100%"
      >
        <CloseButton
          w={6}
          h={6}
          pos="absolute"
          top={3}
          right={3}
          onClick={onClose}
        />
        <Stack spacing={6} w="full">
          <Skeleton isLoaded={!isLoading} alignSelf="start" w="auto">
            <Text fontSize="lg" fontWeight={500}>
              {(() => {
                switch (validationResult) {
                  case ValidationResult.Success:
                    return t('Successfully validated')
                  case ValidationResult.Penalty:
                    return t('Validated')
                  default:
                    return t('Validation failed')
                }
              })()}
            </Text>
          </Skeleton>
          <Stack spacing={[6, 10]}>
            <Flex justify="space-between" direction={['column', 'row']}>
              <ValidationReportGauge>
                <ValidationReportGaugeBox>
                  {isLoading ? (
                    <ValidationReportGaugeBar color={colors.gray['100']} />
                  ) : isValidated ? (
                    <ValidationReportGaugeBar
                      value={totalScore * 100}
                      color={
                        // eslint-disable-next-line no-nested-ternary
                        totalScore <= 0.75
                          ? colors.red[500]
                          : totalScore <= 0.9
                          ? colors.orange[500]
                          : colors.green[500]
                      }
                    />
                  ) : (
                    <ValidationReportGaugeBar
                      value={shortScore * 100 || 2}
                      color={colors.red[500]}
                    />
                  )}
                  <ValidationReportGaugeIcon
                    display={['none', 'initial']}
                    icon={<TimerIcon />}
                  />
                </ValidationReportGaugeBox>
                <ValidationReportGaugeStat>
                  <Skeleton isLoaded={!isLoading} w="auto">
                    {isValidated ? (
                      <ValidationReportGaugeStatValue>
                        {toPercent(totalScore)}
                      </ValidationReportGaugeStatValue>
                    ) : (
                      <ValidationReportGaugeStatValue color="red.500">
                        {t('Failed')}
                      </ValidationReportGaugeStatValue>
                    )}
                  </Skeleton>
                  <ValidationReportGaugeStatLabel>
                    {[
                      ValidationResult.Success,
                      ValidationResult.Penalty,
                    ].includes(validationResult) && t('Score')}
                    {validationResult === ValidationResult.LateSubmission &&
                      t('Late submission')}
                    {validationResult === ValidationResult.MissedValidation &&
                      t('Missed validation')}
                    {validationResult === ValidationResult.WrongAnswers &&
                      t('Wrong answers')}
                  </ValidationReportGaugeStatLabel>
                </ValidationReportGaugeStat>
              </ValidationReportGauge>
              <ValidationReportGauge mt={[6, 0]}>
                <ValidationReportGaugeBox>
                  {isLoading ? (
                    <ValidationReportGaugeBar color={colors.gray['100']} />
                  ) : isValidated ? (
                    <ValidationReportGaugeBar
                      value={earningsScore * 100 || 2}
                      color={
                        // eslint-disable-next-line no-nested-ternary
                        earningsScore <= 0.5
                          ? colors.red[500]
                          : earningsScore <= 0.75
                          ? colors.orange[500]
                          : colors.green[500]
                      }
                    />
                  ) : (
                    <ValidationReportGaugeBar
                      value={2}
                      color={colors.red[500]}
                    />
                  )}
                  <ValidationReportGaugeIcon
                    display={['none', 'initial']}
                    icon={<SendOutIcon />}
                  />
                </ValidationReportGaugeBox>
                <ValidationReportGaugeStat>
                  <Skeleton isLoaded={!isLoading} w="auto">
                    {validationResult === ValidationResult.Success ? (
                      <ValidationReportGaugeStatValue>
                        {dna(earnings)}
                      </ValidationReportGaugeStatValue>
                    ) : (
                      <ValidationReportGaugeStatValue color="red.500">
                        {dna(totalMissedReward)}
                      </ValidationReportGaugeStatValue>
                    )}
                  </Skeleton>
                  <ValidationReportGaugeStatLabel>
                    {t('Earnings')}
                  </ValidationReportGaugeStatLabel>
                </ValidationReportGaugeStat>
              </ValidationReportGauge>
            </Flex>
            <Flex display={['flex', 'none']} justify="space-around">
              <Button
                onClick={tweet}
                variant="primaryFlat"
                size="lg"
                fontWeight={500}
                isDisabled={!isValidated}
              >
                {t('Share')}
              </Button>
              <Divider
                display={['block', 'none']}
                h={10}
                orientation="vertical"
                color="gray.100"
              />
              <Button
                onClick={() => router.push('/validation-report')}
                variant="primaryFlat"
                size="lg"
                fontWeight={500}
              >
                {t('Details')}
              </Button>
            </Flex>
            <Flex
              display={['none', 'flex']}
              justify="space-between"
              alignItems="center"
            >
              <Box>
                <TextLink
                  href="/validation-report"
                  fontWeight={500}
                  display="inline-block"
                >
                  <Stack isInline spacing={0} align="center">
                    <Text as="span">{t('More details')}</Text>
                    <ChevronDownIcon boxSize={4} transform="rotate(-90deg)" />
                  </Stack>
                </TextLink>
              </Box>
              <Stack isInline color="muted">
                <IconButton
                  icon={<TwitterIcon boxSize={5} />}
                  size="xs"
                  variant="ghost"
                  color="blue.500"
                  fontSize={20}
                  _hover={{bg: 'blue.50'}}
                  onClick={tweet}
                />
              </Stack>
            </Flex>
          </Stack>
        </Stack>
      </Flex>
    </Box>
  )
}

export function ValidationReportGauge(props) {
  return <Stack spacing={0} align="center" {...props} />
}

export function ValidationReportGaugeBox(props) {
  return (
    <Box
      h={['auto', 103]}
      w={['100%', 'auto']}
      position="relative"
      {...props}
    />
  )
}

export function ValidationReportGaugeStat(props) {
  return (
    <Flex
      direction={['row-reverse', 'column']}
      justifyContent="space-between"
      alignItems="center"
      w="100%"
      {...props}
    />
  )
}

export function ValidationReportGaugeStatLabel(props) {
  return (
    <Text
      color="muted"
      textAlign="center"
      fontSize="mdx"
      fontWeight={500}
      {...props}
    />
  )
}

export function ValidationReportGaugeStatValue(props) {
  return <Box fontSize={['mdx', 'lg']} fontWeight={500} {...props} />
}

export function ValidationReportGaugeBar({value, bg, color}) {
  const {colors} = useTheme()
  const isMobile = useBreakpointValue([true, false])

  const radius = 84
  const innerRadius = 80
  const circumference = innerRadius * 2 * Math.PI
  const angle = 205

  const arc = circumference * (angle / 360)
  const dashArray = `${arc} ${circumference}`
  const transform = `rotate(${180 -
    Math.max(angle - 180, 0) / 2}, ${radius}, ${radius})`

  const percentNormalized = Math.min(Math.max(value, 0), 100)
  const offset = arc - (percentNormalized / 100) * arc

  return isMobile ? (
    <Box
      h={2}
      w="100%"
      borderRadius="md"
      bg={bg || colors.gray[50]}
      position="relative"
    >
      <Box
        position="absolute"
        h="100%"
        bg={color}
        w={`${percentNormalized}%`}
        borderRadius="md"
      ></Box>
    </Box>
  ) : (
    <svg
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      width={radius * 2}
      height={radius * 2}
    >
      <circle
        cx={radius}
        cy={radius}
        fill="transparent"
        r={innerRadius}
        stroke={bg || colors.gray[50]}
        strokeWidth={4}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        transform={transform}
      />
      <circle
        cx={radius}
        cy={radius}
        fill="transparent"
        r={innerRadius}
        stroke={color}
        strokeWidth={4}
        strokeDasharray={dashArray}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={transform}
      />
    </svg>
  )
}

export function ValidationReportGaugeIcon({
  icon,
  bg = 'gray.50',
  color = 'muted',
  ...props
}) {
  return (
    <Box
      bg={bg}
      p="10px"
      borderRadius="lg"
      pos="absolute"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      {...props}
    >
      {React.cloneElement(icon, {
        boxSize: 5,
        color,
      })}
    </Box>
  )
}

export function ValidationReportBlockOverview(props) {
  return (
    <Box
      flex={1}
      bg="gray.50"
      borderRadius="md"
      px={[7, 10]}
      py={[8, 10]}
      {...props}
    />
  )
}

export function ValidationReportStat({label, value, ...props}) {
  return (
    <Stat pr={0} {...props}>
      <StatLabel
        color={['gray.500', 'muted']}
        fontSize={['base', 'md']}
        fontWeight={[500, 400]}
      >
        {label}
      </StatLabel>
      <StatNumber
        fontSize={['base', 'md']}
        fontWeight={[400, 500]}
        color={['gray.300', 'gray.500']}
      >
        {value}
      </StatNumber>
    </Stat>
  )
}

export function ValidationReportColumn(props) {
  return (
    <Td
      fontWeight={500}
      borderBottomWidth={[0, '1px']}
      px={[0, 2]}
      py={3 / 2}
      {...props}
    />
  )
}

export function ValidationReportCategoryLabel({
  isFirst,
  label,
  description,
  info,
  ...props
}) {
  const disclosure = useDisclosure()
  const {t} = useTranslation()
  return (
    <Box fontWeight={500} {...props}>
      <Text
        fontSize={['base', 'md']}
        fontWeight={500}
        textAlign={[isFirst ? 'left' : 'right', 'left']}
      >
        {label}
        {info && (
          <>
            <InfoIcon
              color="blue.500"
              boxSize={4}
              ml={2}
              onClick={() => disclosure.onOpen()}
              display={['initial', 'none']}
            />
            <Dialog title={label} {...disclosure}>
              <DialogBody fontSize="mobile">{info}</DialogBody>
              <DialogFooter mb={2}>
                <Flex justifyContent="center" w="full">
                  <Button
                    variant="link"
                    fontSize="mobile"
                    color="blue.500"
                    onClick={() => disclosure.onClose()}
                  >
                    {t('Close')}
                  </Button>
                </Flex>
              </DialogFooter>
            </Dialog>
          </>
        )}
      </Text>
      <SmallText textAlign={[isFirst ? 'left' : 'right', 'left']}>
        {description}
      </SmallText>
    </Box>
  )
}

export function ValidationReportTh(props) {
  return (
    <Th
      textTransform="none"
      fontSize="md"
      fontWeight={400}
      bg="none"
      position="relative"
      color="muted"
      py={2}
      px={3}
      borderBottom="none"
      letterSpacing={0}
      {...props}
    />
  )
}

export function ValidationReportThCorner(props) {
  return (
    <Box
      position="absolute"
      inset={0}
      bg="gray.50"
      w="full"
      zIndex="hide"
      {...props}
    />
  )
}

export function ValidationReportTd(props) {
  return <Td color="gray.500" fontWeight="500" px={3} py={3 / 2} {...props} />
}

export function TableHiddenDescRow({children}) {
  return (
    <Tr display={['table-row', 'none']}>
      <Td colSpan={3} px={0} pt={1} pb={3}>
        <Box bg="gray.50" borderRadius="md" px={5} py={2}>
          {children}
        </Box>
      </Td>
    </Tr>
  )
}

export function TableDescText(props) {
  return <Text fontSize={['base', 'md']} {...props} />
}

export function TableValidationDesc({
  validationResult,
  missedValidationReward,
  t,
}) {
  return validationResult === ValidationResult.Penalty ? (
    <TableDescText color="red.500">
      {t('Your flips were reported.')}
    </TableDescText>
  ) : (
    <TableDescText color={missedValidationReward > 0 ? 'red.500' : ''}>
      {missedValidationReward > 0
        ? t('Attend every validation to get a higher reward')
        : t(`Great job! You have earned maximum reward`)}
    </TableDescText>
  )
}

export function TableFlipsDesc({
  validationResult,
  missedFlipReward,
  flipReward,
  t,
}) {
  return validationResult === ValidationResult.Penalty ? (
    <TableDescText color="red.500">
      {t('Your flips were reported.')}
    </TableDescText>
  ) : missedFlipReward > 0 ? (
    <TableDescText color="red.500">
      {t('Make all flips carefully')}
    </TableDescText>
  ) : flipReward ? (
    <TableDescText color="green.500">
      {t('Great job! You have earned maximum reward')}
    </TableDescText>
  ) : (
    '–'
  )
}

export function TableInvitationsDesc({
  validationResult,
  missedInvitationReward,
  invitationReward,
  t,
}) {
  return validationResult === ValidationResult.Penalty ? (
    <TableDescText color="red.500">
      {t('Your flips were reported.')}
    </TableDescText>
  ) : missedInvitationReward > 0 ? (
    <TableDescText color="red.500">
      {t('Invite your friends and help them to pass the first 3 validations')}
    </TableDescText>
  ) : invitationReward ? (
    <TableDescText color="green.500">
      {t('Great job! You have earned maximum reward')}
    </TableDescText>
  ) : (
    '–'
  )
}

export function TableFlipReportsDesc({
  validationResult,
  missedFlipReportReward,
  flipReportReward,
  t,
}) {
  return validationResult === ValidationResult.Penalty ? (
    <TableDescText color="red.500">
      {t('Your flips were reported.')}
    </TableDescText>
  ) : missedFlipReportReward > 0 ? (
    <TableDescText color="red.500">
      {t('Report all flips that break the rules')}
    </TableDescText>
  ) : flipReportReward ? (
    <TableDescText color="green.500">
      {t('Great job! You have earned maximum reward')}
    </TableDescText>
  ) : (
    <TableDescText>{t('Report all flips that break the rules')}</TableDescText>
  )
}

export function UserCard({identity: {address, state}, ...props}) {
  return (
    <Stack
      direction="row"
      spacing={6}
      align="center"
      width={['full', '480px']}
      wordBreak={['break-all', 'normal']}
      {...props}
    >
      <Avatar
        address={address}
        size="80px"
        bg={['gray.50', 'white']}
        borderWidth={[0, 1]}
        borderColor="gray.016"
        borderRadius={['24px', 'lg']}
      />
      <Stack spacing={[0, '1.5']} w="full">
        <Stack spacing={1}>
          <Heading as="h2" fontSize="lg" fontWeight={500} lineHeight="short">
            {mapIdentityToFriendlyStatus(state)}
          </Heading>
          <Heading
            as="h3"
            fontSize="mdx"
            fontWeight="normal"
            color="muted"
            lineHeight="shorter"
            w="full"
            pr={[4, 0]}
          >
            {address}
          </Heading>
        </Stack>
      </Stack>
    </Stack>
  )
}
