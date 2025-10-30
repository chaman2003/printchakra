import React from 'react';
import { Icon, IconProps, Box } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { Icon as IconifyIcon } from '@iconify/react';

interface IconifyProps extends Omit<IconProps, 'icon'> {
  icon: IconType | string;
}

const Iconify: React.FC<IconifyProps> = ({ icon, color, ...props }) => {
  // If icon is a string, use @iconify/react
  if (typeof icon === 'string') {
    const size = (props.width || props.height || props.boxSize || '1em').toString();
    return (
      <Box 
        as="span" 
        display="inline-flex" 
        alignItems="center" 
        justifyContent="center"
        color={color}
      >
        <IconifyIcon icon={icon} width={size} height={size} style={{ color: 'currentColor' }} />
      </Box>
    );
  }
  
  // Otherwise, treat as react-icons IconType
  const elementType = icon as unknown as React.ElementType;
  return <Icon as={elementType} color={color} {...props} />;
};

export default Iconify;
