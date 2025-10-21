import React from 'react';
import { Icon, IconProps } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

interface IconifyProps extends IconProps {
  icon: IconType;
}

const Iconify: React.FC<IconifyProps> = ({ icon, ...props }) => {
  const elementType = icon as unknown as React.ElementType;
  return <Icon as={elementType} {...props} />;
};

export default Iconify;
