/* eslint-disable no-nested-ternary */
import {
  Box,
  CloseButton,
  Flex,
  Heading,
  Stack,
  Table,
  Tbody,
  Text,
  Thead,
  Tr,
  useTheme,
  Divider,
} from '@chakra-ui/react'
import router from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page, PageTitleNew} from '../screens/app/components'
import {UserInlineCard} from '../screens/home/components'
import {
  TableFlipReportsDesc,
  TableFlipsDesc,
  TableHiddenDescRow,
  TableInvitationsDesc,
  TableValidationDesc,
  ValidationReportBlockOverview,
  ValidationReportCategoryLabel,
  ValidationReportColumn,
  ValidationReportGauge,
  ValidationReportGaugeBar,
  ValidationReportGaugeBox,
  ValidationReportGaugeIcon,
  ValidationReportGaugeStat,
  ValidationReportGaugeStatLabel,
  ValidationReportGaugeStatValue,
  ValidationReportStat,
  ValidationReportTh,
  ValidationReportThCorner,
} from '../screens/validation-report/components'
import {useValidationReportSummary} from '../screens/validation-report/hooks'
import {ValidationResult} from '../screens/validation-report/types'
import {
  ExternalLink,
  ErrorAlert,
  SuccessAlert,
  Skeleton,
} from '../shared/components/components'
import {
  AngleArrowBackIcon,
  SendOutIcon,
  TimerIcon,
} from '../shared/components/icons'
import Layout from '../shared/components/layout'
import {useEpoch} from '../shared/providers/epoch-context'
import {useIdentity} from '../shared/providers/identity-context'
import {toLocaleDna, toPercent} from '../shared/utils/utils'
import useMobile from '../shared/hooks/use-mobile'

export default function ValidationReport() {
  const {t, i18n} = useTranslation()

  const {colors} = useTheme()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const isMobile = useMobile()

  const {address, state, isValidated} = identity

  const {
    lastValidationScore,
    totalScore,
    earnings,
    earningsScore,
    validationReward,
    missedValidationReward,
    invitationReward,
    missedInvitationReward,
    flipReward,
    missedFlipReward,
    flipReportReward,
    missedFlipReportReward,
    totalMissedReward,
    validationResult,
    isLoading,
  } = useValidationReportSummary()

  const {
    short: {score: shortScore, ...shortResults},
    long: {score: longScore, ...longResults},
  } = lastValidationScore

  const toDna = toLocaleDna(i18n.language, {maximumFractionDigits: 3})

  const maybeDna = amount =>
    !amount || Number.isNaN(amount)
      ? '–'
      : amount.toLocaleString(i18n.language, {maximumFractionDigits: 3})

  const epochNumber = epoch?.epoch

  return (
    <Layout>
      <Page as={Stack} spacing={6}>
        <Flex
          justify="space-between"
          align="center"
          w="full"
          alignItems="center"
        >
          <AngleArrowBackIcon
            stroke="#578FFF"
            position="absolute"
            left={4}
            top={4}
            h="28px"
            w="28px"
            onClick={() => router.back()}
            display={['initial', 'none']}
          />
          <PageTitleNew mb={0} mt={[-2, 0]}>
            {t('Epoch #{{epochNumber}} validation report', {epochNumber})}
          </PageTitleNew>
          <CloseButton
            display={['none', 'initial']}
            onClick={() => router.push('/home')}
          />
        </Flex>
        <Stack spacing={6} w="full">
          <Box>
            <Skeleton isLoaded={!isLoading} alignSelf="start">
              {isValidated ? (
                <SuccessAlert>
                  {validationResult === ValidationResult.Success &&
                    t('Successfully validated')}
                  {validationResult === ValidationResult.Penalty &&
                    t('Validated')}
                </SuccessAlert>
              ) : (
                <ErrorAlert>{t('Validation failed')}</ErrorAlert>
              )}
            </Skeleton>
          </Box>
          <Box py={2} display={['none', 'block']}>
            <UserInlineCard address={address} state={state} />
          </Box>
          <Stack isInline={!isMobile} spacing={[4, 10]}>
            <ValidationReportBlockOverview>
              <Stack spacing={[6, 10]}>
                <Box>
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
                              ? colors.red['500']
                              : totalScore <= 0.9
                              ? colors.orange['500']
                              : colors.green['500']
                          }
                          bg="white"
                        />
                      ) : (
                        <ValidationReportGaugeBar
                          value={shortScore || 2}
                          color={colors.red['500']}
                          bg="white"
                        />
                      )}
                      <ValidationReportGaugeIcon
                        icon={<TimerIcon />}
                        display={['none', 'initial']}
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
                      <Skeleton isLoaded={!isLoading} w="auto">
                        <ValidationReportGaugeStatLabel>
                          {isValidated && t('Total score')}
                          {validationResult ===
                            ValidationResult.LateSubmission &&
                            t('Late submission')}
                          {validationResult ===
                            ValidationResult.MissedValidation &&
                            t('Missed validation')}
                          {validationResult === ValidationResult.WrongAnswers &&
                            t('Wrong answers')}
                        </ValidationReportGaugeStatLabel>
                      </Skeleton>
                    </ValidationReportGaugeStat>
                  </ValidationReportGauge>
                </Box>
                <Stack spacing={[2, 4]} isInline={!isMobile}>
                  <Flex justify="space-between">
                    <Skeleton isLoaded={!isLoading}>
                      <ValidationReportStat
                        label={t('Short session')}
                        value={
                          validationResult === ValidationResult.MissedValidation
                            ? '–'
                            : t('{{score}} ({{point}} out of {{flipsCount}})', {
                                score: toPercent(shortScore),
                                point: shortResults.point,
                                flipsCount: shortResults.flipsCount,
                              })
                        }
                      />
                    </Skeleton>
                  </Flex>
                  <Divider
                    orientation="horizontal"
                    display={['initial', 'none']}
                  />
                  <Flex justify="space-between">
                    <Skeleton isLoaded={!isLoading}>
                      <ValidationReportStat
                        label={t('Long session')}
                        value={
                          validationResult === ValidationResult.MissedValidation
                            ? '–'
                            : t('{{score}} ({{point}} out of {{flipsCount}})', {
                                score: toPercent(longScore),
                                point: longResults.point,
                                flipsCount: longResults.flipsCount,
                              })
                        }
                      />
                    </Skeleton>
                  </Flex>
                </Stack>
              </Stack>
            </ValidationReportBlockOverview>
            <ValidationReportBlockOverview>
              <Stack spacing={[6, 10]}>
                <Box>
                  <ValidationReportGauge>
                    <ValidationReportGaugeBox>
                      {isLoading ? (
                        <ValidationReportGaugeBar color={colors.gray['100']} />
                      ) : isValidated ? (
                        <ValidationReportGaugeBar
                          value={earningsScore * 100 || 2}
                          color={
                            // eslint-disable-next-line no-nested-ternary
                            earningsScore <= 0.5
                              ? colors.red['500']
                              : earningsScore <= 0.75
                              ? colors.orange['500']
                              : colors.green['500']
                          }
                          bg="white"
                        />
                      ) : (
                        <ValidationReportGaugeBar
                          value={2}
                          color={colors.red['500']}
                          bg="white"
                        />
                      )}
                      <ValidationReportGaugeIcon
                        icon={<SendOutIcon />}
                        display={['none', 'initial']}
                      />
                    </ValidationReportGaugeBox>
                    <ValidationReportGaugeStat>
                      <Skeleton isLoaded={!isLoading} w="auto">
                        {validationResult === ValidationResult.Success ? (
                          <ValidationReportGaugeStatValue>
                            {toDna(earnings)}
                          </ValidationReportGaugeStatValue>
                        ) : (
                          <ValidationReportGaugeStatValue color="red.500">
                            {toDna(totalMissedReward)}
                          </ValidationReportGaugeStatValue>
                        )}
                      </Skeleton>
                      <ValidationReportGaugeStatLabel>
                        {t('Earnings')}
                      </ValidationReportGaugeStatLabel>
                    </ValidationReportGaugeStat>
                  </ValidationReportGauge>
                </Box>

                <Flex justify="space-between" flexWrap="wrap">
                  <Flex mr={4} mb={[0, 4]}>
                    <Skeleton isLoaded={!isLoading}>
                      <ValidationReportStat
                        label={t('Missed invitation earnings')}
                        value={toDna(missedInvitationReward)}
                      />
                    </Skeleton>
                  </Flex>
                  <Divider
                    orientation="horizontal"
                    display={['initial', 'none']}
                    my={2}
                  />
                  <Flex mr={4} mb={[0, 4]}>
                    <Skeleton isLoaded={!isLoading}>
                      <ValidationReportStat
                        label={t('Missed reporting earnings')}
                        value={toDna(missedFlipReportReward)}
                      />
                    </Skeleton>
                  </Flex>
                  <Divider
                    orientation="horizontal"
                    display={['initial', 'none']}
                    my={2}
                  />
                  <Flex mr={4} mb={[0, 4]}>
                    <Skeleton isLoaded={!isLoading}>
                      <ValidationReportStat
                        label={t('Missed flip earnings')}
                        value={toDna(missedFlipReward)}
                      />
                    </Skeleton>
                  </Flex>
                </Flex>
              </Stack>
            </ValidationReportBlockOverview>
          </Stack>
          <Stack spacing={[0, 5]}>
            <Box display={['none', 'block']}>
              <Heading color="brandGray.500" fontSize="lg" fontWeight={500}>
                {t('Earnings summary')}
              </Heading>
              <ExternalLink
                href={`https://scan.idena.io/identity/${address}/epoch/${
                  epoch?.epoch
                }/${isValidated ? 'rewards' : 'validation'}`}
              >
                {t('See the full report in blockchain explorer')}
              </ExternalLink>
            </Box>
            <Text display={['block', 'none']} color="muted" fontWeight={500}>
              {t('Gains and losses')}
            </Text>
            <Table fontWeight={500}>
              <Thead display={['none', 'table-header-group']}>
                <Tr>
                  <ValidationReportTh>
                    {t('Category')}
                    <ValidationReportThCorner borderLeftRadius="md" />
                  </ValidationReportTh>
                  <ValidationReportTh>
                    {t('Earned, iDNA')}
                    <ValidationReportThCorner />
                  </ValidationReportTh>
                  <ValidationReportTh>
                    {t('Missed, iDNA')}
                    <ValidationReportThCorner />
                  </ValidationReportTh>
                  <ValidationReportTh style={{width: '260px'}}>
                    {t('How to get maximum reward')}
                    <ValidationReportThCorner borderRightRadius="md" />
                  </ValidationReportTh>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      isFirst
                      label={t('Validation')}
                      description={
                        isMobile
                          ? t('Category')
                          : t('Rewards for the successfull validation')
                      }
                      info={t('Rewards for the successfull validation')}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={maybeDna(validationReward)}
                      description={isMobile ? t('Earned') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={
                        <Text
                          color={missedValidationReward > 0 ? 'red.500' : ''}
                        >
                          {maybeDna(missedValidationReward)}
                        </Text>
                      }
                      description={isMobile ? t('Missed') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn display={['none', 'table-cell']}>
                    <TableValidationDesc
                      t={t}
                      validationResult={validationResult}
                      missedValidationReward={missedValidationReward}
                    />
                  </ValidationReportColumn>
                </Tr>
                <TableHiddenDescRow>
                  <TableValidationDesc
                    t={t}
                    validationResult={validationResult}
                    missedValidationReward={missedValidationReward}
                  />
                </TableHiddenDescRow>
                <Tr>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      isFirst
                      label={t('Flips')}
                      description={
                        isMobile
                          ? t('Category')
                          : t('Rewards for submitted and qualified flips')
                      }
                      info={t('Rewards for submitted and qualified flips')}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={maybeDna(flipReward)}
                      description={isMobile ? t('Earned') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={
                        <Text color={missedFlipReward > 0 ? 'red.500' : ''}>
                          {maybeDna(missedFlipReward)}
                        </Text>
                      }
                      description={isMobile ? t('Missed') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn display={['none', 'table-cell']}>
                    <TableFlipsDesc
                      t={t}
                      validationResult={validationResult}
                      missedFlipReward={missedFlipReward}
                      flipReward={flipReward}
                    />
                  </ValidationReportColumn>
                </Tr>
                <TableHiddenDescRow>
                  <TableFlipsDesc
                    t={t}
                    validationResult={validationResult}
                    missedFlipReward={missedFlipReward}
                    flipReward={flipReward}
                  />
                </TableHiddenDescRow>
                <Tr>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      isFirst
                      label={t('Invitations')}
                      description={
                        isMobile
                          ? t('Category')
                          : t('Rewards for invitee validation')
                      }
                      info={t('Rewards for invitee validation')}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={maybeDna(invitationReward)}
                      description={isMobile ? t('Earned') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={
                        <Text
                          color={missedInvitationReward > 0 ? 'red.500' : ''}
                        >
                          {maybeDna(missedInvitationReward)}
                        </Text>
                      }
                      description={isMobile ? t('Missed') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn display={['none', 'table-cell']}>
                    <TableInvitationsDesc
                      t={t}
                      validationResult={validationResult}
                      missedInvitationReward={missedInvitationReward}
                      invitationReward={invitationReward}
                    />
                  </ValidationReportColumn>
                </Tr>
                <TableHiddenDescRow>
                  <TableInvitationsDesc
                    t={t}
                    validationResult={validationResult}
                    missedInvitationReward={missedInvitationReward}
                    invitationReward={invitationReward}
                  />
                </TableHiddenDescRow>
                <Tr>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      isFirst
                      label={t('Flip reports')}
                      description={
                        isMobile
                          ? t('Category')
                          : t('Rewards for reporting bad flips')
                      }
                      info={t('Rewards for reporting bad flips')}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={maybeDna(flipReportReward)}
                      description={isMobile ? t('Earned') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn>
                    <ValidationReportCategoryLabel
                      label={
                        <Text
                          color={missedFlipReportReward > 0 ? 'red.500' : ''}
                        >
                          {maybeDna(missedFlipReportReward)}
                        </Text>
                      }
                      description={isMobile ? t('Missed') : ''}
                    />
                  </ValidationReportColumn>
                  <ValidationReportColumn display={['none', 'table-cell']}>
                    <TableFlipReportsDesc
                      t={t}
                      validationResult={validationResult}
                      missedFlipReportReward={missedFlipReportReward}
                      flipReportReward={flipReportReward}
                    />
                  </ValidationReportColumn>
                </Tr>
                <TableHiddenDescRow>
                  <TableFlipReportsDesc
                    t={t}
                    validationResult={validationResult}
                    missedFlipReportReward={missedFlipReportReward}
                    flipReportReward={flipReportReward}
                  />
                </TableHiddenDescRow>
              </Tbody>
            </Table>
          </Stack>
        </Stack>
      </Page>
    </Layout>
  )
}
