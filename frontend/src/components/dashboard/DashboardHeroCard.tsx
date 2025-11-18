import React from 'react';
import { Box, Flex, Heading, IconButton, Stack, Text } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';
import SurfaceCard from '../layout/SurfaceCard';
import { Iconify } from '../common';

interface DashboardHeroCardProps {
  statusDotColor: string;
  statusTextColor: string;
  statusText: string;
  description?: string;
  error?: string | null;
  onRefresh: React.MouseEventHandler<HTMLButtonElement>;
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
}) => {
  return (
    <SurfaceCard>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📊 Dashboard
          </Heading>
          <Text color="text.muted" maxW="lg">
            {description}
          </Text>
        </Stack>

        <Stack direction="row" spacing={3} align="center">
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
            <Text fontWeight="600" color={statusTextColor}>
              {statusText}
            </Text>
          </Flex>
          <IconButton
            aria-label="Refresh files"
            icon={<Iconify icon={FiRefreshCw} boxSize={5} />}
            onClick={onRefresh}
            variant="ghost"
            colorScheme="brand"
            size="lg"
          />
        </Stack>
      </Flex>
    </SurfaceCard>
  );
};
