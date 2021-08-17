import {theme as chakraTheme} from '@chakra-ui/react'
import {rem as remp, rgb, margin} from 'polished'
import {createBreakpoints} from '@chakra-ui/theme-tools'

const colors = {
  primary: 'rgb(87, 143, 255)',
  primary2: 'rgb(83, 86, 92)',
  text: 'rgb(83, 86, 92)',
  muted: 'rgb(150, 153, 158)',
  gray: 'rgb(245, 246, 247)',
  gray2: 'rgb(232, 234, 237)',
  gray3: 'rgba(83, 86, 92, 0.3)',
  gray4: 'rgb(210, 212, 217)',
  gray5: rgb(64, 64, 64),
  white: 'rgb(255, 255, 255)',
  white05: 'rgba(255, 255, 255, 0.5)',
  white01: 'rgba(255, 255, 255, 0.1)',
  danger: 'rgb(255, 102, 102)',
  danger02: 'rgba(255, 102, 102, 0.2)',
  warning: 'rgb(255, 163, 102)',
  warning02: 'rgba(255, 163, 102, 0.2)',
  warning04: 'rgba(255, 163, 102, 0.4)',
  success: 'rgb(39, 217, 128)',
  success02: 'rgba(39, 217, 128, 0.2)',
  success04: 'rgb(39, 217, 128, 0.4)',
  black: 'rgb(17,17,17)',
  black0: 'rgb(0,0,0)',
  darkGraphite: 'rgb(69 72 77)',
}

const baseFontSize = 16

const fontSizes = {
  base: baseFontSize,
  heading: rem(28),
  subHeading: rem(18),
  normal: rem(13),
  small: '0.72rem',
  medium: '1.2rem',
  large: '1.4em',
}

const fontWeights = {
  normal: 400,
  medium: 500,
  semi: 600,
  bold: 700,
}

const spacings = {
  xxsmall: '0.1em',
  small: '0.5em',
  small8: 8,
  small12: 12,
  normal: '1em',
  medium16: 16,
  medium24: 24,
  medium32: 32,
  large: 80,
  large48: 48,
  xlarge: '2em',
  xxlarge: '3em',
  xxxlarge: '4em',
}

export default {
  colors,
  spacings,
  fontSizes,
  fontWeights,
  Box: {
    w: '',
    bg: '',
  },
  Flex: {
    direction: 'initial',
    justify: 'initial',
    align: 'initial',
  },
  Heading: {
    color: colors.text,
    fontSize: fontSizes.heading,
    fontWeight: 500,
    lineHeight: rem(32),
    ...margin(0),
  },
  SubHeading: {
    color: colors.text,
    fontSize: fontSizes.subHeading,
    fontWeight: 500,
    lineHeight: rem(24),
    ...margin(0),
  },
  Text: {
    color: colors.text,
    fontSize: fontSizes.normal,
    fontWeight: fontWeights.normal,
    lineHeight: rem(20),
  },
  Link: {
    color: colors.text,
    fontSize: fontSizes.normal,
    fontWeight: fontWeights.normal,
    textDecoration: 'none',
  },
  Button: {
    color: colors.text,
    size: fontSizes.normal,
  },
}

export function rem(value) {
  return remp(value, baseFontSize)
}

export const uiTheme = {
  colors: {
    black: '#16161D',
    blue: {
      '012': 'rgb(87 143 255 /0.12)',
      '024': 'rgb(87 143 255 /.24)',
      '050': 'rgb(87 143 255 /.50)',
      200: '#578fff',
      300: 'rgba(87, 143, 255, .12)',
      500: 'rgb(87, 143, 255)',
    },
    gray: {
      50: 'rgb(245 246 247)',
      '030': 'rgb(83 86 92 /0.30)',
      100: 'rgb(232 234 237)',
      200: 'rgb(210 212 217)',
      300: 'rgb(150 153 158)',
      500: 'rgb(83 86 92)',
      600: 'rgb(83 86 92)',
      800: 'rgb(83 86 92)',
      900: 'rgb(17 17 17)',
    },
    red: {
      '010': 'rgb(255 102 102 /0.10)',
      '012': 'rgb(255 102 102 /0.12)',
      '020': 'rgb(255 102 102 /0.20)',
      '050': 'rgb(255 102 102 /0.50)',
      '090': 'rgb(255 102 102 /0.90)',
      500: 'rgb(255, 102, 102)',
    },
    green: {
      '010': 'rgb(39 217 128 /.1)',
      '020': 'rgb(39 217 128 /.2)',
      '050': 'rgb(39 217 128 /.5)',
      500: 'rgb(39 217 128)',
    },
    warning: {
      '016': 'rgba(255, 163, 102, 0.16)',
      '020': 'rgba(255, 163, 102, 0.2)',
      100: 'rgba(255, 163, 102, 0.2)',
      400: 'rgb(255, 163, 102)',
      500: 'rgb(255, 163, 102)',
    },
    success: {
      '016': 'rgba(39, 217, 128, 0.16)',
      100: 'rgba(39, 217, 128, 0.2)',
      400: 'rgb(39, 217, 128)',
    },
    muted: 'rgb(150, 153, 158)',
    brand: {
      gray: 'rgb(83, 86, 92)',
      blue: 'rgb(87, 143, 255)',
    },
    brandGray: {
      '016': 'rgb(83, 86, 92, 0.16)',
      '060': 'rgb(83 86 92 /0.6)',
      '080': 'rgb(83 86 92 /0.8)',
      500: 'rgb(83, 86, 92)',
    },
    brandBlue: {
      10: 'rgba(87, 143, 255, 0.12)',
      20: 'rgba(87, 143, 255, 0.24)',
      '025': 'rgba(87, 143, 255, 0.25)',
      50: 'rgba(87, 143, 255, 0.24)',
      100: '#578fff',
      200: '#578fff',
      300: '#447ceb',
      400: '#447ceb',
      500: 'rgb(87, 143, 255)',
      600: '#447ceb',
      700: '#447ceb',
    },
    xblack: {
      '008': 'rgb(0 0 0 /0.08)',
      '016': 'rgb(0 0 0 /0.16)',
      '080': 'rgb(0 0 0 /0.8)',
    },
    xwhite: {
      '010': 'rgba(255, 255, 255, 0.1)',
      '050': 'rgba(255, 255, 255, 0.5)',
      '080': 'rgba(255, 255, 255, 0.8)',
      '500': 'rgba(255, 255, 255)',
    },
    graphite: {
      500: 'rgb(69 72 77)',
    },
    orange: {
      '010': 'rgb(255 163 102 /0.1)',
      '020': 'rgb(255 163 102 /0.2)',
      '050': 'rgb(255 163 102 /0.5)',
      500: 'rgb(255, 163, 102)',
    },
  },
  fonts: {
    ...chakraTheme.fonts,
    body: ['Inter', chakraTheme.fonts.body].join(', '),
    heading: ['Inter', chakraTheme.fonts.heading].join(', '),
  },
  fontSizes: {
    ...chakraTheme.fontSizes,
    sm: '11px',
    md: '13px',
    mdx: '14px',
    base: '16px',
    lg: '18px',
    xl: '28px',
  },
  breakpoints: createBreakpoints({
    base: '0px',
    sm: '480px',
    md: '9999px',
    lg: '9999px',
    xl: '9999px',
    '2xl': '9999px',
  }),
  space: {
    ...chakraTheme.space,
    '1/2': '2px',
    '3/2': '6px',
  },
  sizes: {
    ...chakraTheme.sizes,
    sm: rem(360),
  },
  radii: {
    ...chakraTheme.radii,
    sm: '0.25rem',
    md: rem(6),
    lg: rem(8),
    xl: '0.75rem',
  },
  components: {
    Radio: {
      variants: {
        bordered: {
          container: {
            borderColor: 'gray.100',
            borderWidth: 1,
            borderRadius: 'md',
          },
        },
      },
    },
    Button: {
      baseStyle: {fontWeight: 500},
      sizes: {
        md: {h: 8},
        lg: {
          h: 12,
          px: 3,
          borderRadius: 'lg',
          fontSize: '15px',
          fontWeight: '400',
        },
      },
      variants: {
        primary: {
          bg: 'blue.500',
          color: 'white',
          borderRadius: 6,
          px: 4,
          _hover: {
            bg: 'rgb(68, 124, 235)',
            _disabled: {
              bg: 'blue.500',
            },
          },
          _active: {
            bg: 'rgb(68, 124, 235)',
          },
        },
        secondary: {
          bg: 'blue.012',
          color: 'blue.500',
          borderRadius: 6,
          px: 4,
          _hover: {
            bg: 'blue.024',
            _disabled: {
              bg: 'gray.100',
            },
          },
          _active: {
            bg: 'blue.024',
          },
          _disabled: {
            bg: 'gray.100',
            color: 'gray.300',
          },
        },
        tab: {
          color: 'gray.300',
          borderRadius: 6,
          h: 8,
          px: 4,
          _hover: {
            bg: 'gray.50',
            color: 'blue.500',
          },
          _selected: {
            bg: 'gray.50',
            color: 'blue.500',
          },
          _active: {
            bg: 'gray.50',
            color: 'blue.500',
          },
        },
      },
      defaultProps: {
        variant: 'primary',
      },
    },
    Input: {
      sizes: {
        md: {
          field: {
            h: 8,
            px: 3,
            borderRadius: 'md',
            fontSize: 'md',
          },
        },
        lg: {
          field: {
            h: 12,
            px: 3,
            borderRadius: 'lg',
            fontSize: '15px',
          },
        },
      },
      variants: {
        outline: {
          field: {
            borderColor: 'gray.100',
            _hover: {
              borderColor: 'gray.100',
            },
            _placeholder: {
              color: 'muted',
            },
            _disabled: {
              bg: 'gray.50',
              color: 'muted',
            },
          },
        },
      },
    },
  },
}
