import React from 'react';
import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';

const PageShell: React.FC<BoxProps> = ({ children, ...rest }) => {
  const background = useColorModeValue(
    'radial-gradient(circle at 10% -20%, rgba(121, 95, 238, 0.35), transparent 45%), linear-gradient(180deg, #f8f6ff 0%, #ffffff 60%, #eef2ff 100%)',
    'radial-gradient(circle at 20% -10%, rgba(69, 202, 255, 0.25), transparent 45%), linear-gradient(180deg, #050711 0%, #090f19 55%, #03050b 100%)'
  );

  return (
    <Box
      minH="100vh"
      bg={background}
      py={{ base: 6, md: 10 }}
      px={{ base: 4, md: 6, lg: 10 }}
      position="relative"
      overflow="hidden"
      {...rest}
    >
      <Box maxW="1400px" mx="auto">
        {children}
      </Box>
    </Box>
  );
};

export default PageShell;
