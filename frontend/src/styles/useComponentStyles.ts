import { useMemo } from 'react';
import { SystemStyleObject } from '@chakra-ui/react';
import { getComponentStyle } from './styleRegistry';
import { StyleResolutionOptions } from './types';

export const useComponentStyles = (
  componentKey: string,
  options: StyleResolutionOptions = {}
): SystemStyleObject => {
  return useMemo(() => {
    return getComponentStyle(componentKey, options);
  }, [componentKey, JSON.stringify(options.commands ?? []), JSON.stringify(options.overrides ?? {})]);
};
