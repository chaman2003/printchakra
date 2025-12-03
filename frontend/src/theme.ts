import { extendTheme, ThemeConfig } from '@chakra-ui/react';
import { mode, StyleFunctionProps } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const fonts = {
  heading:
    '"Plus Jakarta Sans Variable", "Space Grotesk Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: '"Plus Jakarta Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"Space Grotesk Variable", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const colors = {
  brand: {
    50: '#f3f1ff',
    100: '#dcd6ff',
    200: '#c3b7ff',
    300: '#aa98ff',
    400: '#9279ff',
    500: '#795fee',
    600: '#5b47bf',
    700: '#422f8f',
    800: '#2b1b60',
    900: '#170d33',
  },
  nebula: {
    50: '#ebfaff',
    100: '#c4efff',
    200: '#9ae3ff',
    300: '#6fd7ff',
    400: '#45caff',
    500: '#2bb0e6',
    600: '#1d88b4',
    700: '#116182',
    800: '#053952',
    900: '#001322',
  },
  cyber: {
    50: '#e0ffff',
    100: '#b3f5ff',
    200: '#80ebff',
    300: '#4de0ff',
    400: '#1ad6ff',
    500: '#00bde6',
    600: '#0093b3',
    700: '#006980',
    800: '#003f4d',
    900: '#00161a',
  },
  neon: {
    50: '#fff0f5',
    100: '#ffd6e7',
    200: '#ffb3d9',
    300: '#ff80c4',
    400: '#ff4daf',
    500: '#e6339a',
    600: '#b32678',
    700: '#801a56',
    800: '#4d0f34',
    900: '#1a0512',
  },
};

const shadows = {
  outline: '0 0 0 3px rgba(143, 133, 255, 0.55)',
  halo: '0 18px 45px rgba(121, 95, 238, 0.35)',
  haloDark: '0 18px 45px rgba(69, 202, 255, 0.45)',
  subtle: '0 14px 30px rgba(12, 20, 56, 0.12)',
  subtleDark: '0 14px 30px rgba(0, 0, 0, 0.55)',
  neon: '0 0 20px rgba(29, 214, 255, 0.6), 0 0 40px rgba(121, 95, 238, 0.4)',
  glow: '0 0 30px rgba(255, 77, 175, 0.5)',
  xl: '0 20px 50px -12px rgba(0, 0, 0, 0.35)',
  '2xl': '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
};

const semanticTokens = {
  colors: {
    'surface.bg': {
      default: 'linear-gradient(135deg, #fff5eb 0%, #ffe8d6 100%)',
      _dark: 'linear-gradient(135deg, #050711 0%, #0a0e1a 100%)',
    },
    'surface.card': {
      default: 'rgba(255, 248, 240, 0.95)',
      _dark: 'rgba(12, 16, 35, 0.92)',
    },
    'surface.blur': {
      default: 'rgba(255, 245, 235, 0.75)',
      _dark: 'rgba(15,20,42,0.75)',
    },
    'surface.glass': {
      default: 'rgba(255, 245, 235, 0.65)',
      _dark: 'rgba(8,12,28,0.65)',
    },
    'border.focus': {
      default: 'rgba(121, 95, 238, 0.65)',
      _dark: 'rgba(69, 202, 255, 0.75)',
    },
    'border.default': {
      default: 'rgba(121, 95, 238, 0.18)',
      _dark: 'rgba(69, 202, 255, 0.25)',
    },
    'border.subtle': {
      default: 'rgba(121, 95, 238, 0.08)',
      _dark: 'rgba(69, 202, 255, 0.12)',
    },
    'text.primary': {
      default: '#1a1f36',
      _dark: '#e6ebff',
    },
    'text.muted': {
      default: 'rgba(60, 72, 88, 0.72)',
      _dark: 'rgba(196, 204, 255, 0.72)',
    },
    'text.inverse': {
      default: '#ffffff',
      _dark: '#0a0e1a',
    },
    'accent.primary': {
      default: 'brand.500',
      _dark: 'nebula.400',
    },
    'accent.secondary': {
      default: 'nebula.500',
      _dark: 'cyber.400',
    },
    'accent.tertiary': {
      default: 'purple.500',
      _dark: 'neon.400',
    },
  },
  radii: {
    glass: '22px',
  },
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: '18px',
      letterSpacing: '0.02em',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    variants: {
      solid: (props: StyleFunctionProps) => ({
        bg: mode('brand.500', 'nebula.500')(props),
        color: 'white',
        boxShadow: mode(
          '0 4px 14px rgba(121, 95, 238, 0.4)',
          '0 4px 20px rgba(69, 202, 255, 0.5)'
        )(props),
        _hover: {
          bg: mode('brand.600', 'nebula.600')(props),
          transform: 'translateY(-2px)',
          boxShadow: mode(
            '0 8px 20px rgba(121, 95, 238, 0.5)',
            '0 8px 30px rgba(69, 202, 255, 0.6)'
          )(props),
        },
        _active: {
          transform: 'translateY(0)',
          boxShadow: mode(
            '0 2px 8px rgba(121, 95, 238, 0.3)',
            '0 2px 12px rgba(69, 202, 255, 0.4)'
          )(props),
        },
      }),
      outline: (props: StyleFunctionProps) => ({
        borderColor: mode('brand.500', 'nebula.400')(props),
        color: mode('brand.600', 'nebula.300')(props),
        borderWidth: '2px',
        _hover: {
          bg: mode('brand.50', 'whiteAlpha.100')(props),
          transform: 'translateY(-2px)',
          boxShadow: mode(
            '0 4px 12px rgba(121, 95, 238, 0.2)',
            '0 4px 16px rgba(69, 202, 255, 0.3)'
          )(props),
        },
      }),
      ghost: (props: StyleFunctionProps) => ({
        color: mode('brand.600', 'nebula.300')(props),
        _hover: {
          bg: mode('brand.50', 'whiteAlpha.100')(props),
        },
      }),
    },
    defaultProps: {
      colorScheme: 'brand',
    },
  },
  Card: {
    baseStyle: (props: StyleFunctionProps) => ({
      container: {
        bg: mode('rgba(255, 255, 255, 0.95)', 'rgba(12, 16, 35, 0.92)')(props),
        borderRadius: '24px',
        backdropFilter: 'blur(18px)',
        boxShadow: mode(
          '0 14px 30px rgba(12, 20, 56, 0.12)',
          '0 14px 30px rgba(0, 0, 0, 0.55)'
        )(props),
        border: mode(
          '1px solid rgba(121, 95, 238, 0.12)',
          '1px solid rgba(69, 202, 255, 0.18)'
        )(props),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        _hover: {
          transform: 'translateY(-4px)',
          boxShadow: mode(
            '0 18px 40px rgba(121, 95, 238, 0.2)',
            '0 18px 45px rgba(69, 202, 255, 0.35)'
          )(props),
        },
      },
    }),
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: '16px',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
      },
    },
    variants: {
      filled: (props: StyleFunctionProps) => ({
        field: {
          bg: mode('rgba(255, 255, 255, 0.8)', 'rgba(20, 24, 45, 0.7)')(props),
          border: mode(
            '1px solid rgba(121, 95, 238, 0.08)',
            '1px solid rgba(69, 202, 255, 0.15)'
          )(props),
          _focus: {
            borderColor: mode('brand.500', 'nebula.400')(props),
            boxShadow: mode(
              '0 0 0 3px rgba(121, 95, 238, 0.15)',
              '0 0 0 3px rgba(69, 202, 255, 0.25)'
            )(props),
            bg: mode('rgba(255, 255, 255, 0.95)', 'rgba(26, 32, 55, 0.85)')(props),
          },
          _hover: {
            bg: mode('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 55, 0.8)')(props),
          },
        },
      }),
    },
    defaultProps: {
      variant: 'filled',
    },
  },
  Select: {
    baseStyle: {
      field: {
        borderRadius: '16px',
      },
    },
    defaultProps: {
      variant: 'filled',
    },
  },
  Menu: {
    baseStyle: (props: StyleFunctionProps) => ({
      list: {
        borderRadius: '16px',
        boxShadow: mode('lg', '0 20px 50px rgba(0, 0, 0, 0.6)')(props),
        border: mode(
          '1px solid rgba(121, 95, 238, 0.18)',
          '1px solid rgba(69, 202, 255, 0.25)'
        )(props),
        backdropFilter: 'blur(12px)',
        bg: mode('rgba(255, 255, 255, 0.95)', 'rgba(12, 16, 35, 0.95)')(props),
      },
      item: {
        borderRadius: '12px',
        _focus: {
          bg: mode('brand.50', 'whiteAlpha.100')(props),
        },
        _hover: {
          bg: mode('brand.50', 'whiteAlpha.100')(props),
        },
      },
    }),
  },
  Modal: {
    baseStyle: (props: StyleFunctionProps) => ({
      dialog: {
        bg: mode('rgba(255, 255, 255, 0.98)', 'rgba(12, 16, 35, 0.98)')(props),
        backdropFilter: 'blur(20px)',
        boxShadow: mode(
          '0 25px 60px rgba(121, 95, 238, 0.3)',
          '0 25px 60px rgba(0, 0, 0, 0.7)'
        )(props),
      },
      overlay: {
        backdropFilter: 'blur(8px)',
        bg: mode('rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)')(props),
      },
    }),
  },
  Drawer: {
    baseStyle: (props: StyleFunctionProps) => ({
      dialog: {
        bg: mode('rgba(255, 255, 255, 0.98)', 'rgba(12, 16, 35, 0.98)')(props),
        backdropFilter: 'blur(20px)',
      },
      overlay: {
        backdropFilter: 'blur(8px)',
        bg: mode('rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)')(props),
      },
    }),
  },
  Progress: {
    baseStyle: (props: StyleFunctionProps) => ({
      track: {
        bg: mode('gray.200', 'whiteAlpha.200')(props),
        borderRadius: 'full',
      },
      filledTrack: {
        bgGradient: mode(
          'linear(to-r, brand.400, nebula.400)',
          'linear(to-r, nebula.400, cyber.400)'
        )(props),
      },
    }),
  },
  Badge: {
    baseStyle: {
      borderRadius: 'full',
      px: 3,
      py: 1,
      fontWeight: '600',
      fontSize: 'xs',
    },
  },
  Tag: {
    baseStyle: {
      container: {
        borderRadius: 'full',
        fontWeight: '600',
      },
    },
  },
  Switch: {
    baseStyle: (props: StyleFunctionProps) => ({
      track: {
        bg: mode('gray.300', 'whiteAlpha.300')(props),
        _checked: {
          bg: mode('brand.500', 'nebula.500')(props),
        },
      },
    }),
  },
};

const styles = {
  global: (props: StyleFunctionProps) => ({
    'html, body': {
      bg: mode('#f6f8ff', '#050711')(props),
      color: mode('#1a1f36', '#e6ebff')(props),
      fontFeatureSettings: '"clig" off, "liga" off',
      minHeight: '100%',
    },
    body: {
      backgroundImage: mode(
        'radial-gradient(circle at 20% 20%, rgba(121,95,238,0.18), transparent 55%), radial-gradient(circle at 80% 0%, rgba(69,202,255,0.12), transparent 45%)',
        'radial-gradient(circle at 10% -10%, rgba(69,202,255,0.16), transparent 55%), radial-gradient(circle at 90% 10%, rgba(121,95,238,0.24), transparent 45%)'
      )(props),
      backgroundAttachment: 'fixed',
      position: 'relative',
      _before: {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgGradient: mode(
          'radial(circle at 50% 50%, brand.50 0%, transparent 70%)',
          'radial(circle at 50% 50%, nebula.900 0%, transparent 60%)'
        )(props),
        opacity: mode(0.5, 0.3)(props),
        pointerEvents: 'none',
        zIndex: -1,
        animation: 'pulse 10s ease-in-out infinite',
      },
    },
    '::selection': {
      background: mode('brand.200', 'nebula.600')(props),
      color: mode('brand.900', 'white')(props),
    },
    '*::placeholder': {
      color: mode('gray.400', 'whiteAlpha.500')(props),
    },
    '@keyframes pulse': {
      '0%, 100%': {
        opacity: mode(0.4, 0.25)(props),
      },
      '50%': {
        opacity: mode(0.6, 0.4)(props),
      },
    },
  }),
};

const theme = extendTheme({
  config,
  fonts,
  colors,
  semanticTokens,
  components,
  styles,
  shadows,
});

export default theme;
