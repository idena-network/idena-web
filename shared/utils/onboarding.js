export const onboardingPromotingStep = step => `${step}.promoting`
export const onboardingShowingStep = step => `${step}.showing`

export const shouldCreateFlips = ({isValidated, requiredFlips, flips}) =>
  isValidated && requiredFlips - (flips ?? []).length > 0
