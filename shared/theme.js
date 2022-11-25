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
      '010': 'rgb(87 143 255 /0.1)',
      '012': 'rgb(87 143 255 /0.12)',
      '024': 'rgb(87 143 255 /.24)',
      '025': 'rgb(87 143 255 /.25)',
      '032': 'rgb(87 143 255 /.32)',
      '050': 'rgb(87 143 255 /.50)',
      200: '#578fff',
      300: 'rgba(87, 143, 255, .12)',
      500: 'rgb(87, 143, 255)',
    },
    gray: {
      50: 'rgb(245 246 247)',
      '016': 'rgb(83 86 92 /0.16)',
      '030': 'rgb(83 86 92 /0.30)',
      '064': 'rgb(83 86 92 /0.64)',
      '080': 'rgb(83 86 92 /0.80)',
      100: 'rgb(232 234 237)',
      200: 'rgb(210 212 217)',
      212: 'rgb(210 212 217 /0.12)',
      300: 'rgb(150 153 158)',
      500: 'rgb(83 86 92)',
      600: 'rgb(83 86 92)',
      800: 'rgb(83 86 92)',
      900: 'rgb(17 17 17)',
      980: 'rgba(17 17 17 /0.80)',
      5: '#A8ABAE',
    },
    red: {
      '010': 'rgb(255 102 102 /0.10)',
      '012': 'rgb(255 102 102 /0.12)',
      '020': 'rgb(255 102 102 /0.20)',
      '025': 'rgb(255 102 102 /0.25)',
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
      '010': 'rgba(255, 163, 102, 0.1)',
      '016': 'rgba(255, 163, 102, 0.16)',
      '020': 'rgba(255, 163, 102, 0.2)',
      '050': 'rgba(255, 163, 102, 0.5)',
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
      '012': 'rgb(83, 86, 92, 0.12)',
      '016': 'rgb(83, 86, 92, 0.16)',
      '060': 'rgb(83 86 92 /0.6)',
      '080': 'rgb(83 86 92 /0.8)',
      500: 'rgb(83, 86, 92)',
      700: 'rgb(232, 232, 232)',
      800: 'rgb(216, 216, 216)',
    },
    brandBlue: {
      10: 'rgba(87, 143, 255, 0.12)',
      20: 'rgba(87, 143, 255, 0.24)',
      '025': 'rgba(87, 143, 255, 0.25)',
      '032': 'rgba(87, 143, 255, 0.32)',
      50: 'rgba(87, 143, 255, 0.24)',
      100: '#578fff',
      200: '#578fff',
      300: '#447ceb',
      400: '#447ceb',
      500: 'rgb(87, 143, 255)',
      600: '#447ceb',
      700: '#447ceb',
      800: '#0388ef',
    },
    xblack: {
      '008': 'rgb(0 0 0 /0.08)',
      '016': 'rgb(0 0 0 /0.16)',
      '080': 'rgb(0 0 0 /0.8)',
    },
    xwhite: {
      '010': 'rgba(255, 255, 255, 0.1)',
      '016': 'rgba(255, 255, 255, 0.16)',
      '024': 'rgba(255, 255, 255, 0.24)',
      '040': 'rgba(255, 255, 255, 0.4)',
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
    mobile: '15px',
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
    mdx: '30rem',
  },
  radii: {
    ...chakraTheme.radii,
    sm: '0.25rem',
    md: rem(6),
    lg: rem(8),
    lgx: '12px',
    xl: '0.75rem',
    mobile: '28px',
  },
  components: {
    Radio: {
      sizes: {
        md: {},
        lg: {
          h: 14,
        },
      },
      variants: {
        bordered: {
          container: {
            borderColor: 'gray.100',
            borderWidth: 1,
            borderRadius: 'md',
          },
        },
        mobile: {
          container: {
            bg: 'gray.50',
            width: '100%',
            height: 14,
            my: '2px',
            borderRadius: 'md',
            _checked: {
              bg: 'blue.010',
            },
          },
          control: {w: 5, h: 5},
          label: {
            fontSize: 'base',
            fontWeight: '500',
            ml: 4,
          },
        },
        mobileDark: {
          container: {
            bg: 'xwhite.010',
            width: '100%',
            height: 14,
            borderRadius: 'md',
            _checked: {
              bg: 'xblack.016',
            },
          },
          control: {w: 5, h: 5},
          label: {
            fontSize: 'base',
            fontWeight: '500',
            ml: 4,
          },
        },
      },
    },
    Checkbox: {
      variants: {
        mobile: {
          control: {h: 5, w: 5},
          label: {fontSize: 'md'},
        },
      },
    },
    Button: {
      baseStyle: {fontWeight: 500},
      sizes: {
        md: {h: 8},
        mdx: {h: 10},
        lg: {
          h: 12,
          px: 3,
          borderRadius: 'lg',
          fontSize: '15px',
          fontWeight: '400',
        },
        lgx: {
          h: 14,
          px: 3,
          borderRadius: '14px',
          fontSize: '20px',
          fontWeight: '500',
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
        primaryFlat: {
          bg: 'transparent',
          color: 'brandBlue.500',
          borderRadius: 8,
        },
        secondaryFlat: {
          bg: 'transparent',
          color: 'muted',
          borderRadius: 8,
          _disabled: {
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
        tabMobile: {
          color: 'gray.500',
          fontSize: 'mobile',
          borderRadius: '8px',
          h: '34px',
          w: '100%',
          _hover: {
            bg: 'gray.500',
            color: 'white',
          },
          _selected: {
            bg: 'gray.500',
            color: 'white',
          },
          _active: {
            bg: 'gray.500',
            color: 'white',
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
              '-webkit-text-fill-color': '#96999E',
              opacity: 1,
            },
          },
        },
        outlineMobile: {
          field: {
            border: '2px solid',
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
              '-webkit-text-fill-color': '#96999E',
              opacity: 1,
            },
          },
        },
        mobile: {
          field: {
            border: '2px solid',
            borderColor: 'gray.100',
            _hover: {
              borderColor: 'gray.100',
            },
            _placeholder: {
              color: 'muted',
            },
            _disabled: {
              bg: 'xblack.016',
              color: 'xwhite.016',
              borderColor: 'xblack.008',
            },
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          bg: 'xblack.080',
        },
      },
      variants: {
        mobile: {
          dialogContainer: {alignItems: 'flex-end'},
        },
        primaryMobile: {
          overlay: {zIndex: 1401},
          dialogContainer: {
            zIndex: 1401,
            alignItems: 'flex-end',
          },
        },
      },
      sizes: {
        mdx: {
          dialog: {
            maxW: '400px',
          },
        },
        md: {
          dialog: {
            maxW: '480px',
          },
        },
        xl: {
          dialog: {
            maxW: '30%',
          },
        },
      },
    },
    Table: {
      baseStyle: {
        table: {
          fontVariantNumeric: 'normal',
          width: '100%',
        },
      },
      sizes: {
        md: {
          td: {
            px: 3,
            py: 2,
            lineHeight: 'inherit',
          },
        },
      },
    },
    Menu: {
      baseStyle: {
        button: {
          borderRadius: 'md',
          h: 8,
          w: 6,
          _hover: {bg: 'gray.50'},
          _expanded: {bg: 'gray.50'},
        },
        list: {
          border: 'none',
          borderRadius: 'lg',
          py: 2,
          minW: '145px',
          shadow:
            '0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)',
          '&:focus:not([data-focus-visible-added])': {
            shadow:
              '0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)',
          },
        },
        item: {
          fontWeight: 500,
          px: 3,
          py: '1.5',
          _hover: {bg: 'gray.50'},
          _focus: {bg: 'gray.50'},
        },
        divider: {
          borderColor: 'gray.100',
          borderWidth: 1,
          my: '2',
        },
      },
    },
    Drawer: {
      baseStyle: {
        overlay: {
          bg: 'xblack.080',
        },
        footer: {
          borderTopWidth: 1,
          borderTopColor: 'gray.100',
          py: 3,
          paddingX: 4,
          justify: 'flex-end',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
      },
    },
    NumberInput: {
      sizes: {
        md: {
          field: {
            h: 8,
            px: 3,
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
              '-webkit-text-fill-color': '#96999E',
              opacity: 1,
            },
          },
        },
      },
    },
    Textarea: {
      sizes: {
        md: {
          px: 3,
          py: 2,
          minH: '16',
        },
      },
      variants: {
        outline: {
          borderColor: 'gray.100',
          _hover: {
            borderColor: 'gray.100',
          },
          _placeholder: {
            color: 'muted',
          },
        },
      },
    },
    Select: {
      sizes: {
        md: {
          field: {
            px: '2',
          },
        },
      },
    },
    FormError: {
      baseStyle: {
        text: {
          fontSize: 'md',
          lineHeight: '4',
        },
        icon: {
          boxSize: '3',
          marginEnd: '1',
        },
      },
    },
    Alert: {
      variants: {
        validation: ({colorScheme}) => ({
          container: {
            bg: `${colorScheme}.500`,
            color: 'white',
            borderRadius: 'lg',
            boxShadow:
              '0 3px 12px 0 rgba(255, 102, 102, 0.1), 0 2px 3px 0 rgba(255, 102, 102, 0.2)',
            px: '4',
            py: '1',
            minH: '42px',
          },
          title: {
            fontSize: 'md',
            fontWeight: 400,
            lineHeight: '5',
            marginEnd: ['2', '6'],
            maxW: ['48', 'none'],
          },
          description: {
            lineHeight: '5',
          },
          icon: {
            flexShrink: 0,
            marginEnd: '3',
            w: '5',
            h: '5',
          },
          spinner: {
            flexShrink: 0,
            marginEnd: '3',
            w: '5',
            h: '5',
          },
        }),
      },
    },
    Form: {
      baseStyle: {
        container: {
          px: 'px',
          pb: 'px',
        },
      },
    },
    Tooltip: {
      variants: {
        'z-index-1000': {
          zIndex: 1000,
        },
      },
    },
  },
}
