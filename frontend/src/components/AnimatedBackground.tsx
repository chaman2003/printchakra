import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const AnimatedBackground: React.FC = () => {
  const particleColor1 = useColorModeValue('rgba(121,95,238,0.08)', 'rgba(121,95,238,0.12)');
  const particleColor2 = useColorModeValue('rgba(69,202,255,0.08)', 'rgba(69,202,255,0.12)');
  const particleColor3 = useColorModeValue('rgba(147,51,234,0.08)', 'rgba(147,51,234,0.12)');

  const particles = [
    { size: 400, color: particleColor1, x: '10%', y: '20%', duration: 20 },
    { size: 350, color: particleColor2, x: '70%', y: '60%', duration: 25 },
    { size: 300, color: particleColor3, x: '40%', y: '80%', duration: 22 },
    { size: 250, color: particleColor1, x: '80%', y: '10%', duration: 18 },
    { size: 200, color: particleColor2, x: '20%', y: '50%', duration: 24 },
  ];

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={-1}
      overflow="hidden"
      pointerEvents="none"
    >
      {particles.map((particle, index) => (
        <MotionBox
          key={index}
          position="absolute"
          width={`${particle.size}px`}
          height={`${particle.size}px`}
          borderRadius="full"
          bg={particle.color}
          filter="blur(80px)"
          initial={{ x: particle.x, y: particle.y }}
          animate={{
            x: [particle.x, `calc(${particle.x} + 100px)`, particle.x],
            y: [particle.y, `calc(${particle.y} - 50px)`, particle.y],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Animated gradient overlay */}
      <MotionBox
        position="absolute"
        top="-50%"
        left="-50%"
        right="-50%"
        bottom="-50%"
        bgGradient="radial(circle at 50% 50%, brand.50 0%, transparent 70%)"
        opacity={0.3}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </Box>
  );
};

export default AnimatedBackground;
