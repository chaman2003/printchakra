import React, { forwardRef } from 'react';
import { Grid, GridProps, SystemStyleObject } from '@chakra-ui/react';
import { useComponentStyles } from '../../styles/useComponentStyles';

export interface StyledGridProps extends GridProps {
  componentKey: string;
  commands?: string | string[];
  styleOverrides?: SystemStyleObject;
}

const normalizeCommands = (commands?: string | string[]): string[] => {
  if (!commands) return [];
  return Array.isArray(commands) ? commands : [commands];
};

export const StyledGrid = forwardRef<HTMLDivElement, StyledGridProps>(
  ({ componentKey, commands, styleOverrides, children, ...rest }, ref) => {
    const computed = useComponentStyles(componentKey, {
      commands: normalizeCommands(commands),
      overrides: styleOverrides,
    });

    return (
      <Grid ref={ref} {...(computed as Record<string, any>)} {...rest}>
        {children}
      </Grid>
    );
  }
);

StyledGrid.displayName = 'StyledGrid';
