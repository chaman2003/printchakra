import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

const AnimatedBackground: React.FC = () => {
  const particleColor1 = useColorModeValue('rgba(255, 150, 100, 0.08)', 'rgba(121,95,238,0.12)');
  const particleColor2 = useColorModeValue('rgba(255, 200, 150, 0.08)', 'rgba(69,202,255,0.12)');
  const particleColor3 = useColorModeValue('rgba(255, 100, 100, 0.08)', 'rgba(147,51,234,0.12)');
  const gradientOverlay = useColorModeValue(
    'radial(circle at 50% 50%, rgba(255, 230, 200, 0.4) 0%, transparent 70%)',
    'radial(circle at 50% 50%, brand.50 0%, transparent 70%)'
  );

  const particles = [
    { size: 400, color: particleColor1, x: '10%', y: '20%' },
    { size: 350, color: particleColor2, x: '70%', y: '60%' },
    { size: 300, color: particleColor3, x: '40%', y: '80%' },
    { size: 250, color: particleColor1, x: '80%', y: '10%' },
    { size: 200, color: particleColor2, x: '20%', y: '50%' },
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
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.2); }
        }
        .particle { animation: float 25s ease-in-out infinite; }
        .gradient-overlay { animation: rotate 30s linear infinite; }
      `}</style>
      
      {particles.map((particle, index) => (
        <Box
          key={index}
          position="absolute"
          width={`${particle.size}px`}
          height={`${particle.size}px`}
          borderRadius="full"
          bg={particle.color}
          filter="blur(80px)"
          left={particle.x}
          top={particle.y}
          className="particle"
          style={{ animationDelay: `${index * -5}s` }}
        />
      ))}

      <Box
        position="absolute"
        top="-50%"
        left="-50%"
        right="-50%"
        bottom="-50%"
        bgGradient={gradientOverlay}
        opacity={0.3}
        className="gradient-overlay"
      />
    </Box>
  );
};

export default AnimatedBackground;
