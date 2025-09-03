import React from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useLocation } from 'react-router-dom';

const Sidebar = ({ visible, onHide }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/documents', label: 'Documents', icon: '📄' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {visible && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 999 }}
          onClick={onHide}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar d-lg-block ${visible ? 'show' : ''}`} style={{ width: '250px', zIndex: 1000 }}>
        <div className="p-3">
          <Nav className="flex-column">
            {menuItems.map((item) => (
              <LinkContainer key={item.path} to={item.path}>
                <Nav.Link
                  className={`d-flex align-items-center ${
                    location.pathname === item.path ? 'active' : ''
                  }`}
                  onClick={() => window.innerWidth < 992 && onHide()}
                >
                  <span className="me-2">{item.icon}</span>
                  {item.label}
                </Nav.Link>
              </LinkContainer>
            ))}
          </Nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
