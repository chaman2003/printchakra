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
import { motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Phone from './pages/Phone';
import Iconify from './components/Iconify';

const MotionBox = motion(Box);

function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const navBg = useColorModeValue('rgba(255,255,255,0.85)', 'rgba(8,11,25,0.85)');
  const navBorder = useColorModeValue('rgba(121,95,238,0.16)', 'rgba(69,202,255,0.16)');
  const navShadow = useColorModeValue('0 16px 40px rgba(121,95,238,0.12)', '0 16px 40px rgba(21,29,53,0.55)');

  return (
    <Router>
      <Box minH="100vh" bg="transparent">
        <Box position="sticky" top={0} zIndex={999} backdropFilter="blur(18px)" bg={navBg} borderBottom={`1px solid ${navBorder}`} boxShadow={navShadow}>
          <Container maxW="7xl" py={4}>
            <Flex align="center" justify="space-between">
              <HStack spacing={3}>
                <MotionBox
                  bgGradient="linear(to-r, brand.400, nebula.400)"
                  borderRadius="xl"
                  px={3}
                  py={2}
                  color="white"
                  fontSize="lg"
                  fontWeight="bold"
                  animate={{
                    boxShadow: [
                      '0 0 0 rgba(121,95,238,0.66)',
                      '0 0 28px rgba(69,202,255,0.45)',
                      '0 0 0 rgba(121,95,238,0.66)',
                    ],
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <Text as="span" mr={2}>
                    📄
                  </Text>
                  PrintChakra
                </MotionBox>
                <Text fontSize="sm" color="text.muted">
                  Neo-futuristic document operations hub
                </Text>
              </HStack>

              <HStack spacing={2}>
                <Button
                  as={RouterLink}
                  to="/"
                  variant="ghost"
                  leftIcon={<Iconify icon={FiLayout} boxSize={5} />}
                  fontWeight="600"
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                >
                  Dashboard
                </Button>
                <Button
                  as={RouterLink}
                  to="/phone"
                  variant="ghost"
                  leftIcon={<Iconify icon={FiSmartphone} boxSize={5} />}
                  fontWeight="600"
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                >
                  Phone Capture
                </Button>
                <IconButton
                  aria-label="Toggle color mode"
                  icon={<Iconify icon={colorMode === 'light' ? FiMoon : FiSun} boxSize={5} />}
                  onClick={toggleColorMode}
                  variant="ghost"
                  borderRadius="full"
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
  );
}

export default App;
