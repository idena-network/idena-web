import dayjs from 'dayjs'
import React from 'react'
import {useInterval} from '../hooks/use-interval'

export const NOTIFICATION_DELAY = 5000

export const NotificationType = {
  Info: 'info',
  Error: 'error',
}

const NotificationStateContext = React.createContext()
const NotificationDispatchContext = React.createContext()

export function NotificationProvider(props) {
  const [notifications, setNotifications] = React.useState([])
  const [alerts, setAlerts] = React.useState([])

  useInterval(
    () => {
      const current = dayjs()
      setNotifications(notifications.filter(x => x.expired.isAfter(current)))
    },
    notifications.length > 0 ? 100 : null
  )

  const addNotificationWithAction = React.useCallback(
    ({title, body, type = NotificationType.Info, action, actionName}) => {
      setNotifications(n => [
        ...n,
        {
          title,
          body,
          type,
          action,
          actionName,
          expired: dayjs().add(NOTIFICATION_DELAY, 'ms'),
        },
      ])
    },
    []
  )

  const addNotification = React.useCallback(
    ({title, body, type = NotificationType.Info}) => {
      setNotifications(n => [
        ...n,
        {title, body, type, expired: dayjs().add(NOTIFICATION_DELAY, 'ms')},
      ])
    },
    []
  )

  const addError = React.useCallback(({title, body}) => {
    setNotifications(n => [
      ...n,
      {
        title,
        body,
        type: NotificationType.Error,
        expired: dayjs().add(NOTIFICATION_DELAY, 'ms'),
      },
    ])
  }, [])

  const addAlert = React.useCallback(({title, body}) => {
    setAlerts(a => [
      ...a,
      {
        title,
        body,
        type: NotificationType.Error,
        expired: dayjs().add(NOTIFICATION_DELAY, 'ms'),
      },
    ])
  }, [])

  return (
    <NotificationStateContext.Provider value={{notifications, alerts}}>
      <NotificationDispatchContext.Provider
        value={{addNotification, addError, addAlert, addNotificationWithAction}}
        {...props}
      />
    </NotificationStateContext.Provider>
  )
}

export function useNotificationState() {
  const context = React.useContext(NotificationStateContext)
  if (context === undefined) {
    throw new Error(
      'useNotificationState must be used within a NotificationProvider'
    )
  }
  return context
}

export function useNotificationDispatch() {
  const context = React.useContext(NotificationDispatchContext)
  if (context === undefined) {
    throw new Error(
      'useNotificationDispatch must be used within a NotificationProvider'
    )
  }
  return context
}
