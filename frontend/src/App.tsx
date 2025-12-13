import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
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
import { FiLayout, FiMoon, FiSmartphone, FiSun } from 'react-icons/fi';
import Dashboard from './pages/Dashboard';
import Phone from './pages/Phone';
import { Iconify, AnimatedBackground } from './components/common';
import { SocketProvider } from './context/SocketContext';

function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const navBg = useColorModeValue('rgba(255, 248, 240, 0.85)', 'rgba(8,11,25,0.85)');
  const navBorder = useColorModeValue('rgba(121,95,238,0.16)', 'rgba(69,202,255,0.16)');
  const navShadow = useColorModeValue(
    '0 16px 40px rgba(121,95,238,0.12)',
    '0 16px 40px rgba(21,29,53,0.55)'
  );

  return (
    <SocketProvider>
      <Router>
        <Box minH="100vh" bg="transparent" position="relative">
          <AnimatedBackground />
          <Box
            position="sticky"
            top={0}
            zIndex={999}
            bg={navBg}
            borderBottom={`1px solid ${navBorder}`}
            boxShadow={navShadow}
          >
            <Container maxW="7xl" py={4}>
              <Flex align="center" justify="space-between">
                <HStack spacing={3}>
                  <Box
                    bgGradient="linear(to-r, brand.400, nebula.400)"
                    borderRadius="xl"
                    px={3}
                    py={2}
                    color="white"
                    fontSize="lg"
                    fontWeight="bold"
                  >
                    <Text as="span" mr={2}>
                      📄
                    </Text>
                    PrintChakra
                  </Box>
                  <Text fontSize="sm" color="text.muted">
                    All in One Document Solution is here!
                  </Text>
                </HStack>

                <HStack spacing={2}>
                  <Button
                    as={RouterLink}
                    to="/"
                    variant="ghost"
                    leftIcon={<Iconify icon={FiLayout} boxSize={5} />}
                    fontWeight="600"
                    _hover={{ bg: 'brand.50', color: 'brand.600', transform: 'translateY(-2px)' }}
                    transition="all 0.3s ease"
                  >
                    Dashboard
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/phone"
                    variant="ghost"
                    leftIcon={<Iconify icon={FiSmartphone} boxSize={5} />}
                    fontWeight="600"
                    _hover={{ bg: 'brand.50', color: 'brand.600', transform: 'translateY(-2px)' }}
                    transition="all 0.3s ease"
                  >
                    Phone Capture
                  </Button>
                  <IconButton
                    aria-label="Toggle color mode"
                    icon={<Iconify icon={colorMode === 'light' ? FiMoon : FiSun} boxSize={5} />}
                    onClick={toggleColorMode}
                    variant="ghost"
                    borderRadius="full"
                    transition="all 0.3s ease"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </HStack>
              </Flex>
            </Container>
          </Box>

          <Box py={10}>
            <Container maxW="7xl">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/phone" element={<Phone />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </SocketProvider>
  );
}

export default App;
