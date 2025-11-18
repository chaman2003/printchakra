import React from 'react';
import { BoxProps, useColorModeValue } from '@chakra-ui/react';
import { StyledSection } from '../../ui/primitives';

interface SurfaceCardProps extends BoxProps {
  commands?: string | string[];
}

const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>((props, ref) => {
  const { children, commands, ...rest } = props;
  const background = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(12, 16, 35, 0.88)');
  const borderColor = useColorModeValue('rgba(121, 95, 238, 0.18)', 'rgba(69, 202, 255, 0.25)');
  const shadow = useColorModeValue(
    '0 20px 35px rgba(5, 6, 30, 0.12)',
    '0 25px 50px rgba(0, 0, 0, 0.8)'
  );

  return (
    <StyledSection
      ref={ref}
      componentKey="SurfaceCard.Root"
      commands={commands}
      styleOverrides={{
        bg: background,
        borderColor,
        boxShadow: shadow,
        borderWidth: '1px',
        p: { base: 5, md: 6 },
        position: 'relative',
      }}
      {...rest}
    >
      {children}
    </StyledSection>
  );
});

SurfaceCard.displayName = 'SurfaceCard';

export default SurfaceCard;
