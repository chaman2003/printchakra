import React from 'react';
import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';

const SurfaceCard = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
  const { children, ...rest } = props;
  const background = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(12, 16, 35, 0.88)');
  const borderColor = useColorModeValue('rgba(121, 95, 238, 0.18)', 'rgba(69, 202, 255, 0.25)');
  const shadow = useColorModeValue(
    '0 20px 35px rgba(5, 6, 30, 0.12)',
    '0 25px 50px rgba(0, 0, 0, 0.8)'
  );

  return (
    <Box
      ref={ref}
      bg={background}
      borderRadius="24px"
      border="1px solid"
      borderColor={borderColor}
      boxShadow={shadow}
      p={{ base: 5, md: 6 }}
      position="relative"
      {...rest}
    >
      {children}
    </Box>
  );
});

SurfaceCard.displayName = 'SurfaceCard';

export default SurfaceCard;
