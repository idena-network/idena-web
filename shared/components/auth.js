import {Flex} from '@chakra-ui/core'
import {margin} from 'polished'
import {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router from 'next/router'
import theme, {rem} from '../theme'
import {Label, Button} from '.'
import {Input, Avatar} from './components'
import {useAuthDispatch} from '../providers/auth-context'
import {useSettingsState} from '../providers/settings-context'
import {FlatButton} from './button'

function RestoreKey() {
  const [pass, setPass] = useState('')
  const {login, logout} = useAuthDispatch()
  const {coinbase} = useSettingsState()
  const [error, setError] = useState()

  return (
    <section key="restore">
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
                } catch (err) {
                  setError('Password is invalid. Try again.')
                  console.log(err)
                }
              }}
            >
              <Label
                htmlFor="pass"
                style={{
                  color: 'white',
                  fontSize: rem(13),
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
          width: ${rem(480)};
        }

        form {
          width: 100%;
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

function Init() {
  return (
    <section>
      <div>
        <Flex width="100%" direction="column">
          <Flex justifyContent="center">
            <img src="/static/idena_white.svg" alt="logo" />
          </Flex>
          <Flex
            style={{
              ...margin(33, 18, 5, 19),
            }}
          >
            <h2>Proof-Of-Person Blockchain</h2>
          </Flex>

          <Flex
            style={{
              ...margin(5, 0, 45),
              opacity: 0.5,
              textAlign: 'center',
              fontSize: rem(14),
            }}
          >
            Join the mining of the first human-centric cryptocurrency
          </Flex>
          <Button onClick={() => Router.push('/key/create')}>
            Create an account
          </Button>

          <Flex justifyContent="center">
            <FlatButton
              color={theme.colors.primary}
              onClick={() => Router.push('/key/import')}
              style={{
                marginTop: rem(20),
                fontSize: rem(13),
                textAlign: 'center',
              }}
            >
              Import private key
            </FlatButton>
          </Flex>
        </Flex>
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
          width: ${rem(360)};
          background-color: rgba(0, 0, 0, 0.16);
          padding: 52px 40px 36px;
          border-radius: 8px;
        }

        img {
          width: ${rem(79)};
          height: ${rem(79)};
        }

        form {
          width: 100%;
        }
        input {
          background-color: ${theme.colors.darkGraphite}!important;
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
  const {encryptedKey, coinbase, initialized} = useSettingsState()
  if (!initialized) {
    return (
      <section>
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
        `}</style>
      </section>
    )
  }
  return !encryptedKey || !coinbase ? <Init /> : <RestoreKey />
}
