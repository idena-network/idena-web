/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {wordWrap, padding, margin, borderRadius} from 'polished'
import {Portal, Flex, Box as ChakraBox} from '@chakra-ui/react'
import {Box} from '.'
import theme, {rem} from '../theme'
import {
  useNotificationState,
  NotificationType,
  NOTIFICATION_DELAY,
} from '../providers/notification-context'
import {FlatButton} from './button'
import {Text} from './typo'

function Notifications() {
  const {notifications} = useNotificationState()
  return (
    <Snackbar>
      {notifications.map((notification, idx) => (
        <Notification key={`notification-${idx}`} {...notification} />
      ))}
    </Snackbar>
  )
}

export function Notification({
  title,
  body,
  type = NotificationType.Info,
  action = null,
  actionName = '',
  pinned,
  bg = theme.colors.white,
  color = theme.colors.text,
  iconColor = theme.colors.primary,
  actionColor = theme.colors.primary,
  icon,
  wrap = 'normal',
  delay = NOTIFICATION_DELAY,
}) {
  const [hidden, setHidden] = useState(false)

  return (
    !hidden && (
      <Flex justify="center" mb={5} zIndex={100}>
        <Flex
          align="center"
          background={bg}
          borderRadius="8px"
          color={color}
          mx={['12px', 0]}
          mt="auto"
          mb={['46px', 'auto']}
          py={['10px', '6px']}
          pl={['16px', '8px']}
          pr="16px"
          position="relative"
          fontSize="md"
          width={['auto', '480px']}
          zIndex={10000}
          css={{
            boxShadow: `0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)`,
          }}
        >
          {icon || (
            <i
              className="icon icon--Info"
              style={{
                color:
                  type === NotificationType.Error
                    ? theme.colors.danger
                    : iconColor,
                fontSize: rem(20),
                marginRight: rem(12),
              }}
            />
          )}
          <Box style={{lineHeight: rem(20), ...wordWrap(wrap)}}>
            <Box style={{fontWeight: theme.fontWeights.medium}}>{title}</Box>
            {body && <Text color={color}>{body}</Text>}
          </Box>
          <Box
            css={{
              ...margin(0, 0, 0, 'auto'),
              ...padding(rem(6), rem(12)),
            }}
          >
            {action && (
              <FlatButton
                style={{
                  color:
                    type === NotificationType.Error
                      ? theme.colors.danger
                      : actionColor,
                  lineHeight: rem(20),
                  ...padding(0),
                }}
                onClick={() => {
                  action()
                  setHidden(true)
                }}
              >
                {actionName}
              </FlatButton>
            )}
          </Box>
          {!pinned && (
            <Box
              style={{
                background: theme.colors.gray2,
                height: rem(3),
                ...borderRadius('bottom', rem(8)),
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                animation: `escape ${delay}ms linear forwards`,
              }}
            />
          )}
        </Flex>
        <style jsx global>{`
          @keyframes escape {
            from {
              right: 0;
            }
            to {
              right: 100%;
            }
          }
        `}</style>
      </Flex>
    )
  )
}

export function Snackbar(props) {
  return (
    <Portal>
      <ChakraBox
        position={['fixed', 'absolute']}
        bottom={0}
        left={0}
        right={0}
        {...props}
      />
    </Portal>
  )
}

export default Notifications
