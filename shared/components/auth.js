import {Flex, Checkbox, Box} from '@chakra-ui/core'
import {borderRadius, margin, padding} from 'polished'
import {useEffect, useState} from 'react'
import {FiChevronRight, FiEye, FiEyeOff} from 'react-icons/fi'
import axios from 'axios'
import theme, {rem} from '../theme'
import {Label, Button} from '.'
import {Input, Avatar} from './components'
import {useAuthDispatch} from '../providers/auth-context'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../providers/settings-context'
import {FlatButton} from './button'
import Link from './link'

function InitKey() {
  const settings = useSettingsState()
  const [state, setState] = useState({
    key: '',
    pass: '',
    saveKey: true,
    url: '',
    apiKey: '',
  })
  const {setNewKey, checkKey} = useAuthDispatch()
  const {saveConnection} = useSettingsDispatch()
  const [error, setError] = useState()
  const [step, setStep] = useState(0)

  useEffect(() => {
    setState({...state, url: settings.url, apiKey: settings.apiKey})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const addKey = () => {
    if (checkKey(state.key, state.pass)) {
      setError(null)
      setStep(1)
    } else {
      setError('Key or password is invalid. Try again.')
    }
  }

  const skipNodeSettings = () => {
    setNewKey(state.key, state.pass, state.saveKey)
  }

  const save = async () => {
    try {
      const {data} = await axios.post(state.url, {
        key: state.apiKey,
        method: 'dna_epoch',
        params: [],
        id: 1,
      })
      if (data.error) {
        setError('API key is invalid.')
      }
      saveConnection(state.url, state.apiKey)
      setNewKey(state.key, state.pass, state.saveKey)
    } catch (e) {
      setError('Node is unreachable.')
    }
  }

  return (
    <section key="init">
      {step === 0 && (
        <div>
          <>
            <Flex width="100%">
              <img src="/static/idena_white.svg" alt="logo" />
              <Flex direction="column" justify="center" flex="1">
                <h2>Import your private key</h2>

                <Flex justify="space-between">
                  <div className="gray">
                    <span>
                      Enter your private key exported from the desktop version
                      of Idena App
                    </span>
                  </div>
                </Flex>
              </Flex>
            </Flex>
            <Flex
              width="100%"
              style={{
                ...margin(theme.spacings.medium24, 0, 0, 0),
              }}
            >
              <form
                onSubmit={e => {
                  e.preventDefault()
                  addKey()
                }}
              >
                <Label
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  Exported private key
                </Label>
                <Flex width="100%" style={{marginBottom: rem(20)}}>
                  <Input
                    id="key"
                    value={state.key}
                    style={{
                      backgroundColor: theme.colors.gray3,
                      borderColor: theme.colors.gray5,
                    }}
                    onChange={e => setState({...state, key: e.target.value})}
                    placeholder="Enter your exported private key"
                  />
                </Flex>
                <Label
                  htmlFor="key"
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
                    value={state.pass}
                    type="password"
                    style={{
                      backgroundColor: theme.colors.gray3,
                      borderColor: theme.colors.gray5,
                    }}
                    onChange={e => setState({...state, pass: e.target.value})}
                    placeholder="Enter your password"
                  />
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.normal, 0, 0, 0),
                  }}
                  justify="space-between"
                >
                  <Checkbox
                    value={state.saveKey}
                    isChecked={state.saveKey}
                    onChange={e =>
                      setState({...state, saveKey: e.target.checked})
                    }
                  >
                    Save the encrypted key on this computer
                  </Checkbox>
                  <Button type="submit" disabled={!state.key}>
                    Import
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
      )}
      {step === 1 && (
        <div>
          <>
            <Flex width="100%">
              <img src="/static/idena_white.svg" alt="logo" />
              <Flex direction="column" justify="center" flex="1">
                <h2>Connect to Idena node</h2>

                <Flex justify="space-between">
                  <div className="gray">
                    <span>Enter an Idena shared node URL and API key</span>
                  </div>
                </Flex>
                <Flex>
                  <Link
                    href="https://t.me/IdenaSharedNodes"
                    target="_blank"
                    color={theme.colors.primary}
                    fontSize={rem(13)}
                  >
                    Ask idena community members to share their node for you
                    <FiChevronRight
                      style={{
                        display: 'inline-block',
                      }}
                      fontSize={rem(12)}
                    />
                  </Link>
                </Flex>
              </Flex>
            </Flex>
            <Flex
              width="100%"
              style={{
                ...margin(theme.spacings.medium24, 0, 0, 0),
              }}
            >
              <form
                onSubmit={e => {
                  e.preventDefault()
                  save()
                }}
              >
                <Label
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  Shared node URL
                </Label>
                <Flex width="100%" style={{marginBottom: rem(20)}}>
                  <Input
                    id="key"
                    value={state.url}
                    style={{
                      backgroundColor: theme.colors.gray3,
                      borderColor: theme.colors.gray5,
                    }}
                    onChange={e => setState({...state, url: e.target.value})}
                    placeholder="Enter your node address"
                  />
                </Flex>
                <Label
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: rem(13),
                  }}
                >
                  Shared node api key
                </Label>
                <Flex width="100%" style={{position: 'relative'}}>
                  <Input
                    id="pass"
                    value={state.apiKey}
                    type={state.showApiKey ? 'text' : 'password'}
                    style={{
                      backgroundColor: theme.colors.gray3,
                      borderColor: theme.colors.gray5,
                    }}
                    onChange={e => setState({...state, apiKey: e.target.value})}
                    placeholder="Enter your api key"
                  />
                  <Box
                    style={{
                      ...borderRadius('right', rem(6)),
                      cursor: 'pointer',
                      fontSize: rem(20),
                      position: 'absolute',
                      ...padding(0, rem(8)),
                      top: '-4px',
                      height: '100%',
                      right: '6px',
                      zIndex: 10,
                    }}
                    onClick={() =>
                      setState({...state, showApiKey: !state.showApiKey})
                    }
                  >
                    {state.showApiKey ? (
                      <FiEyeOff style={{transform: 'translate(0, 50%)'}} />
                    ) : (
                      <FiEye style={{transform: 'translate(0, 50%)'}} />
                    )}
                  </Box>
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.medium32, 0, 0, 0),
                  }}
                  justify="space-between"
                >
                  <Box
                    style={{padding: `${rem(6)} 0`, cursor: 'pointer'}}
                    onClick={() => setStep(0)}
                  >
                    {' '}
                    &lt;&nbsp;Back
                  </Box>
                  <Flex>
                    <Button
                      type="submit"
                      variant="secondary"
                      css={{marginRight: rem(10)}}
                      onClick={skipNodeSettings}
                    >
                      Skip
                    </Button>
                    <Button type="submit">Next</Button>
                  </Flex>
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
      )}
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
          width: ${rem(79)};
          height: ${rem(79)};
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

export default function Auth() {
  const {encryptedKey, coinbase} = useSettingsState()
  return !encryptedKey || !coinbase ? <InitKey /> : <RestoreKey />
}
