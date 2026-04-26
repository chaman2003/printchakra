import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
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

// Navigation items config
const navItems = [
  { path: '/dashboard', icon: FiLayout, label: 'Dashboard', badge: null },
  { path: '/playground', icon: FiPlay, label: 'Playground', badge: 'Beta' },
  { path: '/phone', icon: FiSmartphone, label: 'Phone Capture', badge: null },
];

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
        <HStack spacing={3} as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
          <Flex
            w={8}
            h={8}
            borderRadius="lg"
            bgGradient="linear(to-br, brand.400, nebula.500)"
            align="center"
            justify="center"
            boxShadow="0 2px 8px rgba(121,95,238,0.3)"
          >
            <Text fontSize="sm" fontWeight="900" color="white">PC</Text>
          </Flex>
          <Text
            fontWeight="800"
            fontSize="md"
            letterSpacing="-0.02em"
            bgGradient="linear(to-r, brand.400, nebula.400)"
            bgClip="text"
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
          >
            Pro
          </Badge>
        </HStack>

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
        <HStack spacing={1}>
          <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`} placement="bottom" hasArrow>
            <IconButton
              aria-label="Toggle color mode"
              icon={<Iconify icon={colorMode === 'light' ? FiMoon : FiSun} boxSize={4} />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
              borderRadius="lg"
              color={useColorModeValue('gray.500', 'gray.400')}
              _hover={{ bg: useColorModeValue('gray.100', 'whiteAlpha.100') }}
            />
          </Tooltip>
        </HStack>
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

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <Box minH="100vh" bg="transparent" position="relative">
      {!isLanding && <AnimatedBackground />}
      <TopBar />

      {isLanding ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      ) : (
        <Box py={{ base: 4, md: 6 }} pb={{ base: '80px', md: 6 }} px={{ base: 2, md: 4 }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/phone" element={<Phone />} />
          </Routes>
        </Box>
      )}

      {!isLanding && <MobileBottomNav />}
    </Box>
  );
}

function App() {
  return (
    <SocketProvider>
      <CalibrationProvider>
        <Router>
          <AppContent />
        </Router>
      </CalibrationProvider>
    </SocketProvider>
  );
}

export default App;
