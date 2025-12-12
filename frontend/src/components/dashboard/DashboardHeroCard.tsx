import React from 'react';
import { Box, Flex, Heading, IconButton, Stack, Text, Divider, useColorModeValue, Button } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiRefreshCw } from 'react-icons/fi';
import SurfaceCard from '../layout/SurfaceCard';
import { Iconify } from '../common';
import DeviceAndConnectivityPanel from './DeviceAndConnectivityPanel';

// Pulse animation for live connection indicator
const pulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(72, 187, 120, 0.6); }
  50% { box-shadow: 0 0 16px rgba(72, 187, 120, 1); }
`;

const pulseRed = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(245, 101, 101, 0.6); }
  50% { box-shadow: 0 0 16px rgba(245, 101, 101, 1); }
`;

interface DashboardHeroCardProps {
  statusDotColor: string;
  statusTextColor: string;
  statusText: string;
  description?: string;
  error?: string | null;
  onRefresh: React.MouseEventHandler<HTMLButtonElement>;
  onCheckConnectivity?: () => void;
  children?: React.ReactNode;
}

const DEFAULT_DESCRIPTION =
  'Monitor document ingestion, inspect OCR output, and orchestrate premium conversions in real time.';

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  statusDotColor,
  statusTextColor,
  statusText,
  description = DEFAULT_DESCRIPTION,
  error,
  onRefresh,
  onCheckConnectivity,
  children,
}) => {
  const dividerColor = useColorModeValue('rgba(0,0,0,0.08)', 'rgba(69, 202, 255, 0.1)');
  const isConnected = statusDotColor === 'green.400';
  const pulseAnimation = isConnected ? `${pulseGreen} 2s ease-in-out infinite` : `${pulseRed} 1.5s ease-in-out infinite`;

  return (
    <SurfaceCard>
      <Flex 
        direction={{ base: 'column', lg: 'row' }} 
        justify="space-between" 
        align={{ base: 'stretch', lg: 'center' }} 
        gap={{ base: 4, md: 5 }}
        flexWrap="wrap"
      >
        <Stack spacing={1} flex="1" minW="0">
          <Heading 
            size={{ base: 'md', md: 'lg' }} 
            display="flex" 
            alignItems="center" 
            gap={2}
            whiteSpace="nowrap"
          >
            📊 Dashboard
          </Heading>
          <Text color="text.muted" maxW="xl" fontSize={{ base: 'xs', md: 'sm' }} lineHeight="short">
            {description}
          </Text>
        </Stack>

        <Flex 
          direction={{ base: 'column', sm: 'row' }}
          gap={{ base: 2, md: 3 }} 
          align={{ base: 'stretch', sm: 'center' }}
          flexWrap="wrap"
          justify="flex-end"
        >
          <DeviceAndConnectivityPanel onCheckConnectivity={onCheckConnectivity} />
          <Flex
            align="center"
            gap={2}
            px={{ base: 3, md: 4 }}
            py={{ base: 1.5, md: 2 }}
            borderRadius="full"
            bg="surface.blur"
            border="1px solid"
            borderColor={isConnected ? "rgba(72, 187, 120, 0.3)" : "rgba(245, 101, 101, 0.3)"}
            flexShrink={0}
            whiteSpace="nowrap"
            cursor={!isConnected ? "pointer" : "default"}
            onClick={!isConnected ? onCheckConnectivity : undefined}
            _hover={!isConnected ? { borderColor: "rgba(245, 101, 101, 0.5)" } : undefined}
            title={!isConnected ? "Click to check connectivity" : "Connected to backend"}
          >
            <Box
              w={{ base: 2, md: 3 }}
              h={{ base: 2, md: 3 }}
              borderRadius="full"
              bg={error ? 'orange.400' : statusDotColor}
              animation={pulseAnimation}
              flexShrink={0}
            />
            <Text fontWeight="600" color={statusTextColor} fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
              {statusText}
            </Text>
          </Flex>
          <IconButton
            aria-label="Refresh files"
            icon={<Iconify icon={FiRefreshCw} boxSize={{ base: 4, md: 5 }} />}
            onClick={onRefresh}
            variant="ghost"
            colorScheme="brand"
            size={{ base: 'sm', md: 'md' }}
            _hover={{ transform: 'rotate(180deg)', transition: 'transform 0.3s' }}
            flexShrink={0}
          />
        </Flex>
      </Flex>
      
      {children && (
        <>
          <Divider my={{ base: 3, md: 4 }} borderColor={dividerColor} />
          <Box>
            {children}
          </Box>
        </>
      )}
    </SurfaceCard>
  );
};
