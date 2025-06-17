import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { Container, Row, Col, Nav, NavLink } from 'react-bootstrap';


const Sidebar = () => {
  return (
    <Container fluid style={{ height: '100vh', width: '250px', backgroundColor: '#f8f9fa', padding: '0' }}>
      <Row>
        <Col>
          <h4 className="text-center py-3">Admin Panel</h4>
          <Nav defaultActiveKey="/home" className="flex-column">
            <NavLink href="#">Dashboard</NavLink>
            <NavLink href="#">Users</NavLink>
            <NavLink href="#">Settings</NavLink>
          </Nav>
        </Col>
      </Row>
    </Container>
  );
};

export default Sidebar;