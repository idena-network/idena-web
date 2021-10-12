/* eslint-disable no-empty */
import TagManager from 'react-gtm-module'

export function sendSignIn(coinbase) {
  try {
    TagManager.dataLayer({dataLayer: {event: 'sign-in', userId: coinbase}})
  } catch {
    console.error('cannot send analytics')
  }
}

export function sendSignUp(coinbase) {
  try {
    TagManager.dataLayer({dataLayer: {event: 'sign-up', userId: coinbase}})
  } catch {
    console.error('cannot send analytics')
  }
}
