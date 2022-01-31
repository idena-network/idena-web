/* eslint-disable no-empty */
import TagManager from 'react-gtm-module'

const LS_EVENT_NAME = 'sign-up-event'

export function sendSignIn(coinbase) {
  try {
    const stored = localStorage.getItem(LS_EVENT_NAME)
    if (!stored) return
    const data = JSON.parse(stored)
    if (data.coinbase === coinbase) {
      localStorage.removeItem(LS_EVENT_NAME)
      TagManager.dataLayer({
        dataLayer: {event: 'app.create_account', userId: coinbase},
      })
    }
  } catch {
    console.error('cannot send analytics')
  }
}

export function sendSignUp(coinbase) {
  try {
    localStorage.setItem(LS_EVENT_NAME, JSON.stringify({coinbase}))
  } catch {
    console.error('cannot store sign-up')
  }
}

export function sendSuccessTrainingValidation(coinbase) {
  try {
    TagManager.dataLayer({
      dataLayer: {event: 'app.training_success', userId: coinbase},
    })
  } catch {
    console.error('cannot send training-success')
  }
}

export function sendActivateInvitation(coinbase) {
  try {
    TagManager.dataLayer({
      dataLayer: {event: 'app.invite_activation', userId: coinbase},
    })
  } catch {
    console.error('cannot send invite-activation')
  }
}

export function sendSuccessValidation(coinbase) {
  try {
    TagManager.dataLayer({
      dataLayer: {event: 'app.validation_success', userId: coinbase},
    })
  } catch {
    console.error('cannot send validation-success')
  }
}
