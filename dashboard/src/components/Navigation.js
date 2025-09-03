import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Navigation = ({ onLogout, onToggleSidebar }) => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        <Button
          variant="outline-light"
          className="d-lg-none me-2"
          onClick={onToggleSidebar}
        >
          ☰
        </Button>
        
        <Navbar.Brand href="#home">
          PrintChakra Dashboard
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto d-lg-none">
            <LinkContainer to="/dashboard">
              <Nav.Link>Dashboard</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/documents">
              <Nav.Link>Documents</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/search">
              <Nav.Link>Search</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/settings">
              <Nav.Link>Settings</Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav className="ms-auto">
            <Button variant="outline-light" onClick={onLogout}>
              Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
