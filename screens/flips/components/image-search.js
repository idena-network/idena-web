/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {
  Box,
  Center,
  Flex,
  Image,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {createMachine} from 'xstate'
import {assign, log} from 'xstate/lib/actions'
import axios from 'axios'
import {SearchIcon} from '@chakra-ui/icons'
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

const imageSearchMachine = createMachine({
  context: {
    images: [],
  },
  initial: 'idle',
  states: {
    idle: {},
    searching: {
      invoke: {
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
      entry: ['onError', log()],
    },
  },
  on: {
    SEARCH: 'searching',
  },
})

export function ImageSearchDialog({onPick, onClose, onError, ...props}) {
  const {t} = useTranslation()

  const searchInputRef = React.useRef()

  const [current, send] = useMachine(imageSearchMachine, {
    actions: {
      onError: (_, {data: {message}}) => onError(message),
    },
  })
  const {images, selectedImage} = current.context

  const [query, setQuery] = useState()

  return (
    <Dialog
      size="md"
      initialFocusRef={searchInputRef}
      onClose={onClose}
      {...props}
    >
      <DialogBody display="flex">
        <Stack minH="sm" maxH="sm" spacing="4" flex={1}>
          <Stack
            isInline
            as="form"
            onSubmit={e => {
              e.preventDefault()
              send('SEARCH', {query})
            }}
          >
            <InputGroup w="full">
              <InputLeftElement w={5} h={5} top="1.5" left={3}>
                <SearchIcon boxSize={5} color="gray.300" />
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
                  <SearchIcon boxSize="14" color="gray.100" />
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
            <SimpleGrid
              columns={4}
              spacing={2}
              overflow="auto"
              px="8"
              sx={{
                marginInlineStart: '-32px !important',
                marginInlineEnd: '-32px !important',
              }}
            >
              {images.map(({thumbnail, image}, idx) => (
                <Center
                  key={`${image}-${idx}`}
                  h="88px"
                  w="88px"
                  borderColor="gray.50"
                  borderWidth={1}
                  borderRadius="md"
                  transition="all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                  position="relative"
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
                    h="88px"
                    w="88px"
                  />
                  {thumbnail === selectedImage && (
                    <Box
                      position="absolute"
                      inset="-px"
                      bg="blue.032"
                      borderColor="blue.500"
                      borderWidth={2}
                      borderRadius="md"
                    />
                  )}
                </Center>
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
