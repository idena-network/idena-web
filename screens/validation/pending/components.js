import {Center, HStack, Stack, Text} from '@chakra-ui/react'
import React from 'react'
import {useInterval} from '../../../shared/hooks/use-interval'

export function ValidationCountdown({duration}) {
  const [state, tick] = React.useReducer(
    prevState => ({
      elapsed: prevState.elapsed - 1,
      delay: prevState.elapsed > 1 ? prevState.delay : null,
    }),
    {elapsed: duration / 1000, delay: 1000}
  )

  useInterval(tick, state.delay)

  const elapsedSecondsInMinute = Math.round(state.elapsed % 60)
  const elapsedMinutes = Math.round(
    (state.elapsed - elapsedSecondsInMinute) / 60
  )

  return (
    <HStack spacing="3">
      <CountdownItem value={elapsedMinutes} unit="minutes" />
      <CountdownItem value={elapsedSecondsInMinute} unit="seconds" />
    </HStack>
  )
}

function CountdownItem({value, unit, ...props}) {
  return (
    <Stack spacing="3" align="center" {...props}>
      <Center
        bg="gray.500"
        borderRadius="lg"
        fontSize="2xl"
        fontWeight={500}
        w="20"
        h="72px"
        sx={{fontVariantNumeric: 'tabular-nums'}}
      >
        {String(value).padStart(2, '0')}
      </Center>
      <Text as="span" color="muted" fontSize="md">
        {unit}
      </Text>
    </Stack>
  )
}
