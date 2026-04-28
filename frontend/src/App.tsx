import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  IconButton,
  Text,
  useColorMode,
  useColorModeValue,
  Tooltip,
  Badge,
  VStack,
  Divider,
  Image,
} from '@chakra-ui/react';
import {
  FiHome,
  FiLayout,
  FiMoon,
  FiSmartphone,
  FiSun,
  FiPlay,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCommand,
  FiBell,
  FiSearch,
  FiHelpCircle,
} from 'react-icons/fi';
import Dashboard from './pages/Dashboard';
import Phone from './pages/Phone';
import Playground from './pages/Playground';
import LandingPage from './pages/LandingPage';
import { Iconify, AnimatedBackground } from './components/common';
import { SocketProvider } from './context/SocketContext';
import { CalibrationProvider } from './context/CalibrationContext';
import { AIWorkspaceProvider, useAIWorkspace } from './context/AIWorkspaceContext';
import { PipecatVoiceBot } from './components';
import VoiceCommandBridge from './aiassist/VoiceCommandBridge';

// Navigation items config
const navItems = [
  { path: '/dashboard', icon: FiLayout, label: 'Dashboard', badge: null },
  { path: '/playground', icon: FiPlay, label: 'Playground', badge: 'Beta' },
  { path: '/phone', icon: FiSmartphone, label: 'Phone Capture', badge: null },
];

const logoSrc = (() => {
  const publicUrl = (process.env.PUBLIC_URL || '').trim();
  const base = !publicUrl || publicUrl === '.' ? '' : publicUrl.replace(/\/$/, '');
  return `${base}/logo.png`;
})();

function TopBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const location = useLocation();

  const bg = useColorModeValue(
    'rgba(255, 255, 255, 0.72)',
    'rgba(10, 14, 28, 0.72)'
  );
  const borderColor = useColorModeValue(
    'rgba(121, 95, 238, 0.08)',
    'rgba(69, 202, 255, 0.08)'
  );

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={999}
      bg={bg}
      backdropFilter="blur(24px) saturate(1.8)"
      borderBottom={`1px solid`}
      borderColor={borderColor}
      px={{ base: 4, md: 6 }}
      py={0}
    >
      <Flex align="center" justify="space-between" h="56px">
        {/* Left: Logo */}
        <Flex flex={1} align="center">
          <HStack spacing={3} as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
            <Box
              p={1.5}
              borderRadius="xl"
              bgGradient="linear(to-br, brand.400, nebula.500)"
              boxShadow="0 4px 15px rgba(121,95,238,0.3)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Image 
                src={logoSrc} 
                alt="PrintChakra Logo" 
                h={8} 
                w={8} 
                objectFit="contain"
                filter="brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
            </Box>
            <Text
              fontWeight="800"
              fontSize="md"
              letterSpacing="-0.02em"
              bgGradient="linear(to-r, brand.400, nebula.400)"
              bgClip="text"
              display={{ base: 'none', sm: 'block' }}
            >
              PrintChakra
            </Text>
            <Badge
              colorScheme="purple"
              variant="subtle"
              fontSize="9px"
              fontWeight="700"
              borderRadius="md"
              px={1.5}
              py={0.5}
              textTransform="uppercase"
              letterSpacing="0.05em"
              display={{ base: 'none', lg: 'block' }}
            >
              Pro
            </Badge>
          </HStack>
        </Flex>

        {/* Center: Navigation */}
        <HStack spacing={1} display={{ base: 'none', md: 'flex' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                as={RouterLink}
                to={item.path}
                variant="ghost"
                size="sm"
                h="36px"
                px={4}
                fontWeight="600"
                fontSize="13px"
                borderRadius="lg"
                bg={isActive ? useColorModeValue('brand.50', 'whiteAlpha.100') : 'transparent'}
                color={isActive ? useColorModeValue('brand.600', 'nebula.300') : useColorModeValue('gray.600', 'gray.400')}
                _hover={{
                  bg: useColorModeValue('gray.100', 'whiteAlpha.100'),
                  color: useColorModeValue('brand.600', 'nebula.300'),
                }}
                leftIcon={<Iconify icon={item.icon} boxSize={4} />}
                transition="all 0.15s ease"
                position="relative"
              >
                {item.label}
                {item.badge && (
                  <Badge
                    ml={2}
                    colorScheme="cyan"
                    variant="subtle"
                    fontSize="8px"
                    borderRadius="full"
                    px={1.5}
                  >
                    {item.badge}
                  </Badge>
                )}
                {isActive && (
                  <Box
                    position="absolute"
                    bottom="-10px"
                    left="50%"
                    transform="translateX(-50%)"
                    w="20px"
                    h="2px"
                    borderRadius="full"
                    bgGradient="linear(to-r, brand.400, nebula.400)"
                  />
                )}
              </Button>
            );
          })}
        </HStack>

        {/* Right: Actions */}
        <Flex flex={1} justify="flex-end" align="center">
          <HStack spacing={1}>
            <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`} placement="bottom" hasArrow>
              <IconButton
                aria-label="Toggle color mode"
                icon={<Iconify icon={colorMode === 'light' ? FiMoon : FiSun} boxSize={4} />}
              onClick={(e) => {
                // Circular theme transition using View Transitions API
                const x = e.clientX;
                const y = e.clientY;

                if (!(document as any).startViewTransition) {
                  toggleColorMode();
                  return;
                }

                const transition = (document as any).startViewTransition(() => {
                  toggleColorMode();
                });

                transition.ready.then(() => {
                  const endRadius = Math.hypot(
                    Math.max(x, window.innerWidth - x),
                    Math.max(y, window.innerHeight - y)
                  );

                  document.documentElement.animate(
                    {
                      clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`,
                      ],
                    },
                    {
                      duration: 600,
                      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      pseudoElement: '::view-transition-new(root)',
                    }
                  );
                });
              }}
              variant="ghost"
              size="sm"
              borderRadius="lg"
              color={useColorModeValue('gray.500', 'gray.400')}
              _hover={{ bg: useColorModeValue('gray.100', 'whiteAlpha.100') }}
            />
          </Tooltip>
          </HStack>
        </Flex>
      </Flex>
    </Box>
  );
}

// Mobile bottom nav for small screens
function MobileBottomNav() {
  const location = useLocation();
  const bg = useColorModeValue(
    'rgba(255, 255, 255, 0.9)',
    'rgba(10, 14, 28, 0.9)'
  );
  const borderColor = useColorModeValue(
    'rgba(121, 95, 238, 0.1)',
    'rgba(69, 202, 255, 0.1)'
  );

  return (
    <Box
      display={{ base: 'block', md: 'none' }}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={999}
      bg={bg}
      backdropFilter="blur(24px) saturate(1.8)"
      borderTop={`1px solid`}
      borderColor={borderColor}
      px={2}
      py={1}
      pb="env(safe-area-inset-bottom)"
    >
      <Flex justify="space-around" align="center">
        <IconButton
          as={RouterLink}
          to="/"
          aria-label="Home"
          icon={<Iconify icon={FiHome} boxSize={5} />}
          variant="ghost"
          size="lg"
          color={location.pathname === '/' ? useColorModeValue('brand.500', 'nebula.400') : useColorModeValue('gray.500', 'gray.500')}
          _hover={{ bg: 'transparent' }}
        />
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <IconButton
              key={item.path}
              as={RouterLink}
              to={item.path}
              aria-label={item.label}
              icon={<Iconify icon={item.icon} boxSize={5} />}
              variant="ghost"
              size="lg"
              color={isActive ? useColorModeValue('brand.500', 'nebula.400') : useColorModeValue('gray.500', 'gray.500')}
              _hover={{ bg: 'transparent' }}
              position="relative"
            />
          );
        })}
      </Flex>
    </Box>
  );
}

// Smooth page transition wrapper
const AP = AnimatePresence as any;

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { isPanelOpen, panelWidth, isResizing, startResize, setPanelOpen } = useAIWorkspace();
  const voicePanelBg = useColorModeValue('rgba(255, 255, 255, 0.94)', 'rgba(10, 14, 28, 0.9)');
  const voicePanelBorder = useColorModeValue('rgba(0,0,0,0.08)', 'rgba(255,255,255,0.08)');
  const voicePanelHeaderBorder = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');

  return (
    <Box minH="100vh" bg="transparent" position="relative">
      {!isLanding && <AnimatedBackground />}
      <TopBar />

      <AP mode="wait">
        {isLanding ? (
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          </Routes>
        ) : (
          <Box
            py={{ base: 4, md: 6 }}
            pb={{ base: '80px', md: 6 }}
            px={{ base: 2, md: 4 }}
            mr={isPanelOpen ? { base: 0, lg: `${panelWidth + 16}px` } : 0}
            transition={isResizing ? 'none' : 'margin-right 0.3s ease-out'}
          >
            <VoiceCommandBridge />
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/playground" element={<PageTransition><Playground /></PageTransition>} />
              <Route path="/phone" element={<PageTransition><Phone /></PageTransition>} />
            </Routes>
          </Box>
        )}
      </AP>

      {!isLanding && <MobileBottomNav />}

      {/* Global docked AI panel (persistent across routes) */}
      {!isLanding && isPanelOpen && (
        <Box
          position="fixed"
          top={{ base: 0, md: '56px' }}
          bottom="0"
          right="0"
          w={{ base: '100%', lg: `${panelWidth}px` }}
          bg={voicePanelBg}
          backdropFilter="blur(14px)"
          boxShadow="-4px 0 16px rgba(0,0,0,0.22)"
          display="flex"
          flexDirection="column"
          borderLeft="1px solid"
          borderColor={voicePanelBorder}
          overflowY="auto"
          zIndex={2000}
          transition={isResizing ? 'none' : 'transform 0.3s ease-out, z-index 0.1s'}
        >
          <Flex
            align="center"
            justify="space-between"
            px={3}
            py={2}
            borderBottomWidth="1px"
            borderBottomColor={voicePanelHeaderBorder}
          >
            <Text fontSize="sm" fontWeight="700">Voice Assistant</Text>
            <Tooltip label="Close panel" hasArrow>
              <IconButton
                aria-label="Close voice panel"
                size="sm"
                variant="ghost"
                icon={<Iconify icon={FiX} boxSize={4} />}
                onClick={() => setPanelOpen(false)}
              />
            </Tooltip>
          </Flex>
          <Box
            position="absolute"
            left="0"
            top="0"
            bottom="0"
            w="6px"
            cursor="ew-resize"
            bg="transparent"
            _hover={{ bg: 'blue.400', opacity: 0.5 }}
            _active={{ bg: 'blue.500', opacity: 0.7 }}
            onMouseDown={startResize}
            zIndex={2004}
            display={{ base: 'none', lg: 'block' }}
          />
          <PipecatVoiceBot compact={false} />
        </Box>
      )}
    </Box>
  );
}

function App() {
  return (
    <SocketProvider>
      <CalibrationProvider>
        <AIWorkspaceProvider>
          <Router>
            <AppContent />
          </Router>
        </AIWorkspaceProvider>
      </CalibrationProvider>
    </SocketProvider>
  );
}

export default App;
