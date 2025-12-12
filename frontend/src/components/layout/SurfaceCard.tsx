import React from 'react';
import { BoxProps, useColorModeValue } from '@chakra-ui/react';
import { StyledSection } from '../../ui/primitives';

interface SurfaceCardProps extends BoxProps {
  commands?: string | string[];
}

const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>((props, ref) => {
  const { children, commands, ...rest } = props;
  const background = useColorModeValue(
    'rgba(255, 255, 255, 0.85)',
    'linear-gradient(145deg, rgba(15, 20, 35, 0.95) 0%, rgba(12, 16, 30, 0.98) 100%)'
  );
  const borderColor = useColorModeValue(
    'rgba(121, 95, 238, 0.12)',
    'rgba(69, 202, 255, 0.15)'
  );
  const shadow = useColorModeValue(
    '0 8px 32px rgba(121, 95, 238, 0.12)',
    '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
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
        borderRadius: 'xl',
        p: { base: 4, md: 5, lg: 6 },
        position: 'relative',
        backdropFilter: 'blur(12px)',
      }}
      {...rest}
    >
      {children}
    </StyledSection>
  );
});

SurfaceCard.displayName = 'SurfaceCard';

export default SurfaceCard;
