import React from 'react';
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
} from '@chakra-ui/react';
import { FiHome, FiLayout, FiMoon, FiSmartphone, FiSun, FiPlay } from 'react-icons/fi';
import Dashboard from './pages/Dashboard';
import Phone from './pages/Phone';
import Playground from './pages/Playground';
import LandingPage from './pages/LandingPage';
import { Iconify, AnimatedBackground } from './components/common';
import { SocketProvider } from './context/SocketContext';
import { CalibrationProvider } from './context/CalibrationContext';

function NavBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navBg = useColorModeValue(
    isLanding ? 'rgba(248,249,255,0.8)' : 'rgba(248,249,255,0.85)',
    isLanding ? 'rgba(8,11,25,0.7)' : 'rgba(8,11,25,0.85)'
  );
  const navBorder = useColorModeValue('rgba(121,95,238,0.12)', 'rgba(69,202,255,0.12)');
  const navShadow = useColorModeValue(
    '0 8px 32px rgba(121,95,238,0.08)',
    '0 8px 32px rgba(0,0,0,0.3)'
  );
  const activeBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const activeColor = useColorModeValue('brand.600', 'nebula.300');

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={999}
      bg={navBg}
      backdropFilter="blur(20px)"
      borderBottom={`1px solid ${navBorder}`}
      boxShadow={navShadow}
    >
      <Container maxW="7xl" py={3}>
        <Flex align="center" justify="space-between">
          <HStack spacing={3} as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
            <Box
              bgGradient="linear(to-r, brand.400, nebula.400)"
              borderRadius="xl"
              px={3}
              py={2}
              color="white"
              fontSize="lg"
              fontWeight="bold"
              transition="all 0.3s ease"
              _hover={{ transform: 'scale(1.05)' }}
            >
              📄 PrintChakra
            </Box>
          </HStack>

          <HStack spacing={1}>
            <Button
              as={RouterLink}
              to="/"
              variant="ghost"
              size="sm"
              leftIcon={<Iconify icon={FiHome} boxSize={4} />}
              fontWeight="600"
              bg={isActive('/') ? activeBg : 'transparent'}
              color={isActive('/') ? activeColor : undefined}
              _hover={{ bg: activeBg, color: activeColor, transform: 'translateY(-1px)' }}
              transition="all 0.2s ease"
            >
              Home
            </Button>
            <Button
              as={RouterLink}
              to="/dashboard"
              variant="ghost"
              size="sm"
              leftIcon={<Iconify icon={FiLayout} boxSize={4} />}
              fontWeight="600"
              bg={isActive('/dashboard') ? activeBg : 'transparent'}
              color={isActive('/dashboard') ? activeColor : undefined}
              _hover={{ bg: activeBg, color: activeColor, transform: 'translateY(-1px)' }}
              transition="all 0.2s ease"
            >
              Dashboard
            </Button>
            <Button
              as={RouterLink}
              to="/playground"
              variant="ghost"
              size="sm"
              leftIcon={<Iconify icon={FiPlay} boxSize={4} />}
              fontWeight="600"
              bg={isActive('/playground') ? activeBg : 'transparent'}
              color={isActive('/playground') ? activeColor : undefined}
              _hover={{ bg: activeBg, color: activeColor, transform: 'translateY(-1px)' }}
              transition="all 0.2s ease"
            >
              Playground
            </Button>
            <Button
              as={RouterLink}
              to="/phone"
              variant="ghost"
              size="sm"
              leftIcon={<Iconify icon={FiSmartphone} boxSize={4} />}
              fontWeight="600"
              bg={isActive('/phone') ? activeBg : 'transparent'}
              color={isActive('/phone') ? activeColor : undefined}
              _hover={{ bg: activeBg, color: activeColor, transform: 'translateY(-1px)' }}
              transition="all 0.2s ease"
            >
              Phone
            </Button>
            <IconButton
              aria-label="Toggle color mode"
              icon={<Iconify icon={colorMode === 'light' ? FiMoon : FiSun} boxSize={4} />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
              borderRadius="full"
              transition="all 0.2s ease"
              _hover={{ transform: 'scale(1.1)' }}
            />
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <Box minH="100vh" bg="transparent" position="relative">
      {!isLanding && <AnimatedBackground />}
      <NavBar />

      {isLanding ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      ) : (
        <Box py={8}>
          <Container maxW="7xl">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/phone" element={<Phone />} />
            </Routes>
          </Container>
        </Box>
      )}
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
