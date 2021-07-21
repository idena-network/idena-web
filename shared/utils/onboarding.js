export const promotingOnboardingStep = step => `${step}.promoting`
export const showingOnboardingStep = step => `${step}.showing`

export const shouldCreateFlips = ({isValidated, requiredFlips, flips}) =>
  isValidated && requiredFlips - (flips ?? []).length > 0
