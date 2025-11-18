import React, { forwardRef } from 'react';
import { Flex, FlexProps, SystemStyleObject } from '@chakra-ui/react';
import { useComponentStyles } from '../../styles/useComponentStyles';

export interface StyledFlexProps extends FlexProps {
  componentKey: string;
  commands?: string | string[];
  styleOverrides?: SystemStyleObject;
}

const normalizeCommands = (commands?: string | string[]): string[] => {
  if (!commands) return [];
  return Array.isArray(commands) ? commands : [commands];
};

export const StyledFlex = forwardRef<HTMLDivElement, StyledFlexProps>(
  ({ componentKey, commands, styleOverrides, children, ...rest }, ref) => {
    const computed = useComponentStyles(componentKey, {
      commands: normalizeCommands(commands),
      overrides: styleOverrides,
    });

    return (
      <Flex ref={ref} {...(computed as Record<string, any>)} {...rest}>
        {children}
      </Flex>
    );
  }
);

StyledFlex.displayName = 'StyledFlex';
