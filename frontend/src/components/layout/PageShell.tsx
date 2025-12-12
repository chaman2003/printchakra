import React from 'react';
import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';
import { StyledSection } from '../../ui/primitives';

interface PageShellProps extends BoxProps {
  commands?: string | string[];
}

const PageShell: React.FC<PageShellProps> = ({ children, commands, ...rest }) => {
  const background = useColorModeValue(
    'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 50%, #e8ecff 100%)',
    'linear-gradient(180deg, #080c18 0%, #0a0f1c 100%)'
  );

  return (
    <StyledSection
      componentKey="PageShell.Container"
      commands={commands}
      styleOverrides={{
        bg: background,
        minH: '100dvh',
        px: { base: 3, sm: 4, md: 6, lg: 8 },
        py: { base: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        w: '100%',
      }}
      {...rest}
    >
      <Box maxW="1600px" mx="auto" w="100%">
        {children}
      </Box>
    </StyledSection>
  );
};

export default PageShell;
