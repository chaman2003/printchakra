import React from 'react';
import { Box, Flex, Heading, IconButton, Stack, Text, Divider, useColorModeValue, Button } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';
import SurfaceCard from '../layout/SurfaceCard';
import { Iconify } from '../common';
import DeviceAndConnectivityPanel from './DeviceAndConnectivityPanel';

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
  const dividerColor = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');

  return (
    <SurfaceCard>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'start', md: 'center' }} gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📊 Dashboard
          </Heading>
          <Text color="text.muted" maxW="lg" fontSize="sm">
            {description}
          </Text>
        </Stack>

        <Stack direction="row" spacing={3} align="center">
          <DeviceAndConnectivityPanel onCheckConnectivity={onCheckConnectivity} />
          <Flex
            align="center"
            gap={2}
            px={4}
            py={2}
            borderRadius="full"
            bg="surface.blur"
            border="1px solid"
            borderColor="rgba(121,95,238,0.2)"
          >
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={error ? 'orange.400' : statusDotColor}
              boxShadow={`0 0 12px ${error ? 'rgba(246,164,76,0.6)' : 'rgba(129,230,217,0.8)'}`}
            />
            <Text fontWeight="600" color={statusTextColor} fontSize="sm">
              {statusText}
            </Text>
          </Flex>
          <IconButton
            aria-label="Refresh files"
            icon={<Iconify icon={FiRefreshCw} boxSize={5} />}
            onClick={onRefresh}
            variant="ghost"
            colorScheme="brand"
            size="md"
            _hover={{ transform: 'rotate(180deg)', transition: 'transform 0.3s' }}
          />
        </Stack>
      </Flex>
      
      {children && (
        <>
          <Divider my={4} borderColor={dividerColor} />
          <Box>
            {children}
          </Box>
        </>
      )}
    </SurfaceCard>
  );
};
