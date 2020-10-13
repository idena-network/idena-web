import {Flex, Checkbox} from '@chakra-ui/core'
import {margin} from 'polished'
import {useState} from 'react'
import Router from 'next/router'
import {FiChevronRight} from 'react-icons/fi'
import theme, {rem} from '../shared/theme'
import {Label, Button} from '../shared/components'
import {Input, Avatar} from '../shared/components/components'
import {useAuthDispatch} from '../shared/providers/auth-context'
import {useSettingsState} from '../shared/providers/settings-context'
import {FlatButton} from '../shared/components/button'

function InitKey() {
  const [key, setKey] = useState(null)
  const [pass, setPass] = useState(null)
  const [storeKey, setStoreKey] = useState(true)
  const {setNewKey} = useAuthDispatch()
  const [error, setError] = useState()

  const addKey = () => {
    try {
      setError(null)
      setNewKey(key, pass, storeKey)
      Router.push('/')
    } catch (e) {
      setError('Key or password is invalid. Try again.')
      console.log(e)
    }
  }

  return (
    <section>
      <div>
        <>
          <Flex width="100%">
            <img src="/static/idena_white.svg" alt="logo" />
            <Flex direction="column" justify="space-between" flex="1">
              <h2>Import your private key</h2>

              <Flex justify="space-between">
                <div className="gray">
                  <span>
                    Enter your private key exported from the desktop version of
                    Idena App
                  </span>
                </div>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            width="100%"
            style={{
              ...margin(theme.spacings.normal, 0, 0, 0),
            }}
          >
            <form
              onSubmit={e => {
                e.preventDefault()
                addKey()
              }}
            >
              <Label htmlFor="key" style={{color: 'white', fontSize: rem(14)}}>
                Exported private key
              </Label>
              <Flex width="100%">
                <Input
                  id="key"
                  value={key}
                  style={{
                    ...margin(0, theme.spacings.normal, 0, 0),
                    width: rem(450),
                    backgroundColor: theme.colors.gray3,
                    borderColor: theme.colors.gray5,
                  }}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Enter your exported private key"
                />
              </Flex>
              <Label
                htmlFor="key"
                style={{
                  color: 'white',
                  fontSize: rem(14),
                  ...margin(theme.spacings.normal, 0, theme.spacings.normal, 0),
                }}
              >
                Password
              </Label>
              <Flex width="100%">
                <Input
                  id="pass"
                  value={pass}
                  type="password"
                  style={{
                    ...margin(0, theme.spacings.normal, 0, 0),
                    width: rem(450),
                    backgroundColor: theme.colors.gray3,
                    borderColor: theme.colors.gray5,
                  }}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Enter your password"
                />
                <Button type="submit" disabled={!key}>
                  Import
                </Button>
              </Flex>
              <Flex
                style={{
                  ...margin(theme.spacings.normal, 0, 0, 0),
                }}
              >
                <Checkbox
                  value={storeKey}
                  isChecked={storeKey}
                  onChange={e => setStoreKey(e.target.checked)}
                >
                  Save the encrypted key on this computer
                </Checkbox>
              </Flex>
              {error && (
                <Flex
                  style={{
                    marginTop: rem(30, theme.fontSizes.base),
                    backgroundColor: theme.colors.danger,
                    borderRadius: rem(9, theme.fontSizes.base),
                    fontSize: rem(14, theme.fontSizes.base),
                    padding: `${rem(18, theme.fontSizes.base)} ${rem(
                      24,
                      theme.fontSizes.base
                    )}`,
                  }}
                >
                  {error}
                </Flex>
              )}
            </form>
          </Flex>
        </>
      </div>
      <style jsx>{`
        section {
          background: ${theme.colors.darkGraphite};
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100vh;
        }
        section > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(600)};
        }

        input {
          background-color: ${theme.colors.darkGraphite}!important;
        }

        img {
          width: ${rem(60)};
          height: ${rem(60)};
          margin-right: ${rem(10)};
        }
        section .gray {
          opacity: 0.5;
        }

        h2 {
          font-size: ${rem(18, theme.fontSizes.base)};
          font-weight: 500;
          margin: 0;
          word-break: break-all;
        }
        span {
          font-size: ${rem(14, theme.fontSizes.base)};
          line-height: ${rem(20, theme.fontSizes.base)};
        }
        li {
          margin-bottom: ${rem(theme.spacings.small8, theme.fontSizes.base)};
        }
      `}</style>
    </section>
  )
}

export default function Auth() {
  const [pass, setPass] = useState(null)
  const {login, logout} = useAuthDispatch()
  const {encryptedKey, coinbase} = useSettingsState()
  const [error, setError] = useState()

  return !encryptedKey || !coinbase ? (
    <InitKey />
  ) : (
    <section>
      <div>
        <>
          <Flex width="100%">
            <Avatar address={coinbase} />
            <Flex
              direction="column"
              justify="space-between"
              flex="1"
              style={{
                ...margin(0, 0, 0, theme.spacings.normal),
              }}
            >
              <h2>Enter password to unlock your account</h2>

              <Flex justify="space-between">
                <div className="gray">
                  <span>{coinbase}</span>
                </div>
              </Flex>

              <Flex justify="space-between">
                <FlatButton
                  color={theme.colors.primary}
                  onClick={logout}
                  style={{
                    marginBottom: rem(19),
                    fontSize: rem(12),
                  }}
                >
                  <span>Remove private key from this computer</span>

                  <FiChevronRight
                    style={{
                      display: 'inline-block',
                    }}
                    fontSize={rem(19)}
                  />
                </FlatButton>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            width="100%"
            style={{
              ...margin(theme.spacings.normal, 0, 0, 0),
            }}
          >
            <form
              onSubmit={e => {
                try {
                  e.preventDefault()
                  setError(null)
                  login(pass)
                  Router.push('/')
                } catch (err) {
                  setError('Passowrd is invalid. Try again.')
                  console.log(err)
                }
              }}
            >
              <Label
                htmlFor="pass"
                style={{
                  color: 'white',
                  fontSize: rem(14),
                  ...margin(theme.spacings.normal, 0, theme.spacings.normal, 0),
                }}
              >
                Password
              </Label>
              <Flex width="100%">
                <Input
                  id="pass"
                  value={pass}
                  type="password"
                  style={{
                    ...margin(0, theme.spacings.normal, 0, 0),
                    width: rem(450),
                    backgroundColor: theme.colors.gray3,
                    borderColor: theme.colors.gray5,
                  }}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Enter your password"
                />
                <Button type="submit" disabled={!pass}>
                  Proceed
                </Button>
              </Flex>
              {error && (
                <Flex
                  style={{
                    marginTop: rem(30, theme.fontSizes.base),
                    backgroundColor: theme.colors.danger,
                    borderRadius: rem(9, theme.fontSizes.base),
                    fontSize: rem(14, theme.fontSizes.base),
                    padding: `${rem(18, theme.fontSizes.base)} ${rem(
                      24,
                      theme.fontSizes.base
                    )}`,
                  }}
                >
                  {error}
                </Flex>
              )}
            </form>
          </Flex>
        </>
      </div>
      <style jsx>{`
        section {
          background: ${theme.colors.darkGraphite};
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100vh;
        }
        section > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(600)};
        }

        input {
          background-color: ${theme.colors.darkGraphite}!important;
        }

        img {
          width: ${rem(60)};
          height: ${rem(60)};
          margin-right: ${rem(10)};
        }
        section .gray {
          opacity: 0.5;
        }

        h2 {
          font-size: ${rem(18, theme.fontSizes.base)};
          font-weight: 500;
          margin: 0;
          word-break: break-all;
        }
        span {
          font-size: ${rem(14, theme.fontSizes.base)};
          line-height: ${rem(20, theme.fontSizes.base)};
        }
        li {
          margin-bottom: ${rem(theme.spacings.small8, theme.fontSizes.base)};
        }
      `}</style>
    </section>
  )
}
