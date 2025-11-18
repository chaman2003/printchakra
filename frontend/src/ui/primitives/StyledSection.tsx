import React, { forwardRef } from 'react';
import { Box, BoxProps, SystemStyleObject } from '@chakra-ui/react';
import { useComponentStyles } from '../../styles/useComponentStyles';

export interface StyledPrimitiveProps extends BoxProps {
  componentKey: string;
  commands?: string | string[];
  styleOverrides?: SystemStyleObject;
}

const normalizeCommands = (commands?: string | string[]): string[] => {
  if (!commands) return [];
  return Array.isArray(commands) ? commands : [commands];
};

export const StyledSection = forwardRef<HTMLDivElement, StyledPrimitiveProps>(
  ({ componentKey, commands, styleOverrides, children, ...rest }, ref) => {
    const computed = useComponentStyles(componentKey, {
      commands: normalizeCommands(commands),
      overrides: styleOverrides,
    });

    return (
      <Box ref={ref} {...(computed as Record<string, any>)} {...rest}>
        {children}
      </Box>
    );
  }
);

StyledSection.displayName = 'StyledSection';
