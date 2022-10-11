import React, {useEffect} from 'react'
import {useRouter} from 'next/router'
import {Box, Flex, useToast, Divider, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {Page} from '../../screens/app/components'
import {
  FlipMaster,
  FlipMasterFooter,
  FlipPageTitle,
  FlipMasterNavbar,
  FlipMasterNavbarItem,
  FlipStoryStep,
  FlipStepBody,
  FlipKeywordTranslationSwitch,
  CommunityTranslations,
  FlipKeywordPanel,
  FlipKeyword,
  FlipKeywordName,
  FlipStoryAside,
  FlipEditorStep,
  FlipShuffleStep,
  FlipSubmitStep,
  CommunityTranslationUnavailable,
  PublishFlipDrawer,
  FlipProtectStep,
} from '../../screens/flips/components'
import Layout from '../../shared/components/layout'
import {flipMasterMachine} from '../../screens/flips/machines'
import {
  publishFlip,
  isPendingKeywordPair,
  protectFlip,
  checkIfFlipNoiseEnabled,
} from '../../screens/flips/utils'
import {Step} from '../../screens/flips/types'
import {
  IconButton,
  SecondaryButton,
  PrimaryButton,
} from '../../shared/components/button'
import {Toast} from '../../shared/components/components'
import db from '../../shared/utils/db'
import {useAuthState} from '../../shared/providers/auth-context'
import {redact} from '../../shared/utils/logs'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {BadFlipDialog} from '../../screens/validation/components'
import {InfoIcon, RefreshIcon} from '../../shared/components/icons'
import {useTrackTx} from '../../screens/ads/hooks'
import {useFailToast} from '../../shared/hooks/use-toast'
import {eitherState} from '../../shared/utils/utils'

export default function EditFlipPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const {id} = router.query

  const toast = useToast()

  const epochState = useEpoch()
  const {privateKey} = useAuthState()
  const [, {waitFlipsUpdate}] = useIdentity()

  const failToast = useFailToast()

  const [current, send] = useMachine(flipMasterMachine, {
    context: {
      locale: 'en',
    },
    services: {
      // eslint-disable-next-line no-shadow
      prepareFlip: async ({id, wordPairs}) => {
        const persistedFlips = await db.table('ownFlips').toArray()

        const {
          // eslint-disable-next-line no-shadow
          images,
          // eslint-disable-next-line no-shadow
          protectedImages,
          keywordPairId = 0,
          ...flip
        } = persistedFlips.find(({id: flipId}) => flipId === id)

        // eslint-disable-next-line no-shadow
        const availableKeywords = Array.isArray(wordPairs)
          ? wordPairs.filter(
              pair =>
                !pair.used && !isPendingKeywordPair(persistedFlips, pair.id)
            )
          : [{id: 0, words: flip.keywords.words.map(w => w.id)}]

        return {
          ...flip,
          images,
          protectedImages,
          keywordPairId,
          availableKeywords,
        }
      },
      protectFlip: async flip => protectFlip(flip),
      submitFlip: async context => {
        const result = await publishFlip(context)
        waitFlipsUpdate()
        return result
      },
    },
    actions: {
      onError: (_, {data}) => {
        failToast(data.response?.data?.error ?? data.message)
      },
    },
    logger: msg => console.log(redact(msg)),
  })

  useEffect(() => {
    if (id && epochState && privateKey) {
      send('PREPARE_FLIP', {id, epoch: epochState.epoch, privateKey})
    }
  }, [epochState, id, privateKey, send])

  const {
    availableKeywords,
    keywords,
    images,
    protectedImages,
    originalOrder,
    order,
    showTranslation,
    isCommunityTranslationsExpanded,
    txHash,
  } = current.context

  const not = state => !current?.matches({editing: state})
  const is = state => current?.matches({editing: state})
  const either = (...states) =>
    eitherState(current, ...states.map(s => ({editing: s})))

  const isOffline = is('keywords.loaded.fetchTranslationsFailed')

  const {
    isOpen: isOpenBadFlipDialog,
    onOpen: onOpenBadFlipDialog,
    onClose: onCloseBadFlipDialog,
  } = useDisclosure()

  const publishDrawerDisclosure = useDisclosure()

  useTrackTx(txHash, {
    onMined: React.useCallback(() => {
      send({type: 'FLIP_MINED'})
      router.push('/flips/list')
    }, [router, send]),
  })

  const isFlipNoiseEnabled = checkIfFlipNoiseEnabled(epochState?.epoch)
  const maybeProtectedImages = isFlipNoiseEnabled ? protectedImages : images

  return (
    <Layout showHamburger={false}>
      <Page px={0} py={0}>
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          px={20}
          pb="36px"
          overflowY="auto"
        >
          <FlipPageTitle
            onClose={() => {
              if (images.some(x => x))
                toast({
                  status: 'success',
                  // eslint-disable-next-line react/display-name
                  render: () => (
                    <Toast title={t('Flip has been saved to drafts')} />
                  ),
                })
              router.push('/flips/list')
            }}
          >
            {t('Edit flip')}
          </FlipPageTitle>
          {current.matches('editing') && (
            <FlipMaster>
              <FlipMasterNavbar>
                <FlipMasterNavbarItem
                  step={is('keywords') ? Step.Active : Step.Completed}
                >
                  {t('Think up a story')}
                </FlipMasterNavbarItem>
                <FlipMasterNavbarItem
                  step={
                    // eslint-disable-next-line no-nested-ternary
                    is('images')
                      ? Step.Active
                      : is('keywords')
                      ? Step.Next
                      : Step.Completed
                  }
                >
                  {t('Select images')}
                </FlipMasterNavbarItem>
                {isFlipNoiseEnabled ? (
                  <FlipMasterNavbarItem
                    step={
                      // eslint-disable-next-line no-nested-ternary
                      is('protect')
                        ? Step.Active
                        : is('keywords') || is('images')
                        ? Step.Next
                        : Step.Completed
                    }
                  >
                    {t('Protect images')}
                  </FlipMasterNavbarItem>
                ) : null}
                <FlipMasterNavbarItem
                  step={
                    // eslint-disable-next-line no-nested-ternary
                    is('shuffle')
                      ? Step.Active
                      : not('submit')
                      ? Step.Next
                      : Step.Completed
                  }
                >
                  {t('Shuffle images')}
                </FlipMasterNavbarItem>
                <FlipMasterNavbarItem
                  step={is('submit') ? Step.Active : Step.Next}
                >
                  {t('Submit flip')}
                </FlipMasterNavbarItem>
              </FlipMasterNavbar>
              {is('keywords') && (
                <FlipStoryStep>
                  <FlipStepBody minH="180px">
                    <Box>
                      <FlipKeywordPanel>
                        {is('keywords.loaded') && (
                          <>
                            <FlipKeywordTranslationSwitch
                              keywords={keywords}
                              showTranslation={showTranslation}
                              locale={i18n.language}
                              onSwitchLocale={() => send('SWITCH_LOCALE')}
                            />
                            {(i18n.language || 'en').toUpperCase() !== 'EN' &&
                              !isOffline && (
                                <>
                                  <Divider
                                    borderColor="gray.100"
                                    mx={-10}
                                    mt={4}
                                    mb={6}
                                  />
                                  <CommunityTranslations
                                    keywords={keywords}
                                    onVote={e => send('VOTE', e)}
                                    onSuggest={e => send('SUGGEST', e)}
                                    isOpen={isCommunityTranslationsExpanded}
                                    onToggle={() =>
                                      send('TOGGLE_COMMUNITY_TRANSLATIONS')
                                    }
                                  />
                                </>
                              )}
                          </>
                        )}
                        {is('keywords.failure') && (
                          <FlipKeyword>
                            <FlipKeywordName>
                              {t('Missing keywords')}
                            </FlipKeywordName>
                          </FlipKeyword>
                        )}
                      </FlipKeywordPanel>
                      {isOffline && <CommunityTranslationUnavailable />}
                    </Box>
                    <FlipStoryAside>
                      <IconButton
                        icon={<RefreshIcon boxSize={5} />}
                        isDisabled={availableKeywords.length === 0}
                        onClick={() => send('CHANGE_KEYWORDS')}
                      >
                        {t('Change words')}
                      </IconButton>
                      <IconButton
                        icon={<InfoIcon boxSize={5} />}
                        onClick={onOpenBadFlipDialog}
                      >
                        {t('What is a bad flip')}
                      </IconButton>
                    </FlipStoryAside>
                  </FlipStepBody>
                </FlipStoryStep>
              )}
              {is('images') && (
                <FlipEditorStep
                  keywords={keywords}
                  showTranslation={showTranslation}
                  originalOrder={originalOrder}
                  images={images}
                  onChangeImage={(image, currentIndex) =>
                    send('CHANGE_IMAGES', {image, currentIndex})
                  }
                  // eslint-disable-next-line no-shadow
                  onChangeOriginalOrder={order =>
                    send('CHANGE_ORIGINAL_ORDER', {order})
                  }
                  onPainting={() => send('PAINTING')}
                />
              )}
              {is('protect') && (
                <FlipProtectStep
                  keywords={keywords}
                  showTranslation={showTranslation}
                  originalOrder={originalOrder}
                  images={images}
                  protectedImages={protectedImages}
                  onProtecting={() => send('PROTECTING')}
                  onProtectImage={(image, currentIndex) =>
                    send('CHANGE_PROTECTED_IMAGES', {image, currentIndex})
                  }
                />
              )}
              {is('shuffle') && (
                <FlipShuffleStep
                  images={maybeProtectedImages}
                  originalOrder={originalOrder}
                  order={order}
                  onShuffle={() => send('SHUFFLE')}
                  onManualShuffle={nextOrder =>
                    send('MANUAL_SHUFFLE', {order: nextOrder})
                  }
                  onReset={() => send('RESET_SHUFFLE')}
                />
              )}
              {is('submit') && (
                <FlipSubmitStep
                  keywords={keywords}
                  showTranslation={showTranslation}
                  locale={i18n.language}
                  onSwitchLocale={() => send('SWITCH_LOCALE')}
                  originalOrder={originalOrder}
                  order={order}
                  images={maybeProtectedImages}
                />
              )}
            </FlipMaster>
          )}
        </Flex>
        <FlipMasterFooter>
          {not('keywords') && (
            <SecondaryButton
              isDisabled={is('images.painting') || is('protect.protecting')}
              onClick={() => send('PREV')}
            >
              {t('Previous step')}
            </SecondaryButton>
          )}
          {not('submit') && (
            <PrimaryButton
              isDisabled={is('images.painting') || is('protect.protecting')}
              onClick={() => send('NEXT')}
            >
              {t('Next step')}
            </PrimaryButton>
          )}
          {is('submit') && (
            <PrimaryButton
              isDisabled={is('submit.submitting')}
              isLoading={is('submit.submitting')}
              loadingText={t('Publishing')}
              onClick={() => {
                publishDrawerDisclosure.onOpen()
              }}
            >
              {t('Submit')}
            </PrimaryButton>
          )}
        </FlipMasterFooter>

        <BadFlipDialog
          isOpen={isOpenBadFlipDialog}
          title={t('What is a bad flip?')}
          subtitle={t(
            'Please read the rules carefully. You can lose all your validation rewards if any of your flips is reported.'
          )}
          onClose={onCloseBadFlipDialog}
        />

        <PublishFlipDrawer
          {...publishDrawerDisclosure}
          isPending={either('submit.submitting', 'submit.mining')}
          flip={{
            keywords: showTranslation ? keywords.translations : keywords.words,
            images: maybeProtectedImages,
            originalOrder,
            order,
          }}
          onSubmit={() => {
            send('SUBMIT')
          }}
        />
      </Page>
    </Layout>
  )
}
