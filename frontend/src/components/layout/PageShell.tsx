import React from 'react';
import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';
import { StyledSection } from '../../ui/primitives';

interface PageShellProps extends BoxProps {
  commands?: string | string[];
}

const PageShell: React.FC<PageShellProps> = ({ children, commands, ...rest }) => {
  const background = useColorModeValue(
    'radial-gradient(circle at 10% -20%, rgba(121, 95, 238, 0.35), transparent 45%), linear-gradient(180deg, #f8f6ff 0%, #ffffff 60%, #eef2ff 100%)',
    'radial-gradient(circle at 20% -10%, rgba(69, 202, 255, 0.25), transparent 45%), linear-gradient(180deg, #050711 0%, #090f19 55%, #03050b 100%)'
  );

  return (
    <StyledSection
      componentKey="PageShell.Container"
      commands={commands}
      styleOverrides={{
        bg: background,
        minH: '100vh',
        px: { base: 4, md: 6, lg: 10 },
        py: { base: 6, md: 10 },
        position: 'relative',
        overflow: 'hidden',
        w: '100%',
      }}
      {...rest}
    >
      <Box maxW="1400px" mx="auto" w="100%">
        {children}
      </Box>
    </StyledSection>
  );
};

export default PageShell;
