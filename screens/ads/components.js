import {StatLabel, StatNumber} from '@chakra-ui/react'

export function AdStatLabel(props) {
  return <StatLabel color="muted" fontSize="md" {...props} />
}

export function AdStatNumber(props) {
  return <StatNumber fontSize="md" fontWeight={500} {...props} />
}
