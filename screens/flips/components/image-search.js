/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {
  AspectRatioBox,
  Box,
  Flex,
  Icon,
  Image,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {Machine} from 'xstate'
import {assign, log} from 'xstate/lib/actions'
import axios from 'axios'
import {PrimaryButton, SecondaryButton} from '../../../shared/components/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  Input,
} from '../../../shared/components/components'
import {eitherState} from '../../../shared/utils/utils'

async function searchImages(q) {
  return axios.get('/api/image-search', {params: {q}}).then(x => x.data)
}

export function ImageSearchDialog({onPick, onClose, onError, ...props}) {
  const {t} = useTranslation()

  const searchInputRef = React.useRef()

  const [current, send] = useMachine(
    Machine({
      context: {
        images: [],
      },
      initial: 'idle',
      states: {
        idle: {},
        searching: {
          invoke: {
            // eslint-disable-next-line no-shadow
            src: (_, {query}) => searchImages(query),
            onDone: {
              target: 'done',
              actions: [
                assign({
                  images: (_, {data}) => data,
                }),
                log(),
              ],
            },
            onError: 'fail',
          },
        },
        done: {
          on: {
            PICK: {
              actions: [
                assign({
                  selectedImage: (_, {image}) => image,
                }),
                log(),
              ],
            },
          },
        },
        fail: {
          entry: [(_, {data: {message}}) => onError(message), log()],
        },
      },
      on: {
        SEARCH: 'searching',
      },
    })
  )

  const {images, selectedImage} = current.context
  const [query, setQuery] = useState()

  return (
    <Dialog
      size="38rem"
      initialFocusRef={searchInputRef}
      onClose={onClose}
      {...props}
    >
      <DialogBody d="flex">
        <Stack minH="sm" maxH="sm" spacing={4} flex={1}>
          <Stack
            isInline
            as="form"
            onSubmit={e => {
              e.preventDefault()
              send('SEARCH', {query})
            }}
          >
            <InputGroup w="full">
              <InputLeftElement w={5} h={5} top="3/2" left={3}>
                <Icon name="search" size={3} color="gray.100" />
              </InputLeftElement>
              <Input
                ref={searchInputRef}
                type="search"
                id="query"
                placeholder={t('Search the picture on the web')}
                bg="gray.50"
                pl={10}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </InputGroup>
            <PrimaryButton type="submit">Search</PrimaryButton>
          </Stack>
          {eitherState(current, 'idle') && (
            <Flex direction="column" flex={1} align="center" justify="center">
              <Stack spacing={4} align="center" w="3xs">
                <Box p={3}>
                  <Icon name="search" size="56px" color="gray.300" />
                </Box>
                <Text color="muted" textAlign="center" w="full">
                  {t(
                    'Type your search in the box above to find images using search box'
                  )}
                </Text>
              </Stack>
            </Flex>
          )}
          {eitherState(current, 'done') && (
            <SimpleGrid columns={4} spacing={2} overflow="auto" mx={-6} px={6}>
              {images.map(({thumbnail}) => (
                <AspectRatioBox
                  ratio={1}
                  w={32}
                  minH={32}
                  bg={thumbnail === selectedImage ? 'blue.032' : 'white'}
                  borderColor={
                    thumbnail === selectedImage ? 'blue.500' : 'gray.50'
                  }
                  borderWidth={1}
                  borderRadius="md"
                  overflow="hidden"
                  position="relative"
                  transition="all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                  onClick={() => {
                    send('PICK', {image: thumbnail})
                  }}
                  onDoubleClick={() => {
                    onPick(selectedImage)
                  }}
                >
                  <Image
                    src={thumbnail}
                    objectFit="contain"
                    objectPosition="center"
                    borderColor={
                      thumbnail === selectedImage ? 'blue.500' : 'transparent'
                    }
                    borderWidth={1}
                    borderRadius="md"
                  />
                </AspectRatioBox>
              ))}
            </SimpleGrid>
          )}
          {eitherState(current, 'searching') && (
            <Flex direction="column" flex={1} align="center" justify="center">
              <Spinner color="blue.500" />
            </Flex>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onClose}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton
          onClick={() => {
            onPick(selectedImage)
          }}
        >
          {t('Select')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}
