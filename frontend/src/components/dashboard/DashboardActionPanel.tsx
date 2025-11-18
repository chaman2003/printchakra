import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiLayers, FiMic, FiWifiOff } from 'react-icons/fi';
import { Iconify } from '../common';
import { DashboardToolbar } from '../layout/DashboardRegions';

const MotionBox = motion.create(Box);

interface DashboardActionPanelProps {
  isChatVisible: boolean;
  selectionMode: boolean;
  selectedFilesCount: number;
  orchestrateMode: 'print' | 'scan' | null;
  showReopenOrchestrate: boolean;
  onTriggerPrint: () => void;
  onToggleChat: () => void;
  onToggleSelectionMode: () => void;
  onOpenConversionModal: () => void;
  onCheckConnectivity: () => void;
  onToggleConvertedDrawer: () => void;
  isConvertedDrawerOpen: boolean;
  onReopenOrchestrate: () => void;
}

export const DashboardActionPanel: React.FC<DashboardActionPanelProps> = ({
  isChatVisible,
  selectionMode,
  selectedFilesCount,
  orchestrateMode,
  showReopenOrchestrate,
  onTriggerPrint,
  onToggleChat,
  onToggleSelectionMode,
  onOpenConversionModal,
  onCheckConnectivity,
  onToggleConvertedDrawer,
  isConvertedDrawerOpen,
  onReopenOrchestrate,
}) => {
  return (
    <DashboardToolbar
      w="100%"
      direction={{ base: 'column', lg: 'row' }}
      flexWrap="wrap"
      gap={{ base: 3, lg: 4 }}
      align="stretch"
    >
      <MotionBox
        w={{ base: '100%', lg: 'auto' }}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          size="lg"
          colorScheme="brand"
          variant="solid"
          onClick={onTriggerPrint}
          leftIcon={<Iconify icon={FiLayers} boxSize={5} />}
          boxShadow="0 4px 14px rgba(121,95,238,0.4)"
          _hover={{ boxShadow: '0 6px 20px rgba(121,95,238,0.6)' }}
          transition="all 0.3s"
          w="100%"
        >
          Orchestrate Print Capture
        </Button>
      </MotionBox>

      <MotionBox
        w={{ base: '100%', lg: 'auto' }}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          size="lg"
          colorScheme="purple"
          variant="solid"
          onClick={onToggleChat}
          leftIcon={<Iconify icon={FiMic} boxSize={5} />}
          boxShadow="0 4px 14px rgba(147,51,234,0.4)"
          _hover={{ boxShadow: '0 6px 20px rgba(147,51,234,0.6)' }}
          transition="all 0.3s"
          w="100%"
        >
          {isChatVisible ? 'Hide' : 'Show'} AI Chat
        </Button>
      </MotionBox>

      <MotionBox
        w={{ base: '100%', lg: 'auto' }}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          size="lg"
          variant={selectionMode ? 'solid' : 'ghost'}
          colorScheme={selectionMode ? 'orange' : 'brand'}
          onClick={onToggleSelectionMode}
          w="100%"
        >
          {selectionMode ? 'Cancel Selection' : 'Select Files'}
        </Button>
      </MotionBox>

      {selectionMode && selectedFilesCount > 0 && (
        <MotionBox
          w={{ base: '100%', lg: 'auto' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" colorScheme="brand" variant="outline" onClick={onOpenConversionModal} w="100%">
            Convert {selectedFilesCount} Selected
          </Button>
        </MotionBox>
      )}

      <MotionBox
        w={{ base: '100%', lg: 'auto' }}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          size="lg"
          colorScheme="cyan"
          variant="solid"
          onClick={onCheckConnectivity}
          leftIcon={<Iconify icon={FiWifiOff} boxSize={5} />}
          boxShadow="0 4px 14px rgba(34,211,238,0.4)"
          _hover={{ boxShadow: '0 6px 20px rgba(34,211,238,0.6)' }}
          transition="all 0.3s"
          position="relative"
          overflow="hidden"
          w="100%"
        >
          Check Connectivity
        </Button>
      </MotionBox>

      <MotionBox
        w={{ base: '100%', lg: 'auto' }}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button size="lg" variant="ghost" onClick={onToggleConvertedDrawer} w="100%">
          {isConvertedDrawerOpen ? 'Hide Converted Files' : 'Show Converted Files'}
        </Button>
      </MotionBox>

      {showReopenOrchestrate && orchestrateMode && (
        <MotionBox
          w={{ base: '100%', lg: 'auto' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            colorScheme="brand"
            variant="outline"
            onClick={onReopenOrchestrate}
            leftIcon={<Iconify icon="solar:redo-bold-duotone" boxSize={5} />}
            w="100%"
          >
            Re-open {orchestrateMode === 'print' ? 'Print' : 'Scan'} Configuration
          </Button>
        </MotionBox>
      )}
    </DashboardToolbar>
  );
};
