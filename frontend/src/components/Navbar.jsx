
import { useState } from "react";
import logo from "../assets/mindspring-logo.png";

function Navbar({ onLoginClick, onRegisterClick }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogin() {
    closeMenu();
    onLoginClick?.();
  }

  function handleRegister() {
    closeMenu();
    onRegisterClick?.();
  }

  return (
    <header className="site-header">
      <nav className="navbar">
        <a href="#home" className="brand" onClick={closeMenu}>
          <img src={logo} alt="MindSpring Logo" />
        </a>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-content ${menuOpen ? "nav-open" : ""}`}>
          <div className="nav-links">
            <a href="#home" onClick={closeMenu}>Home</a>
            <a href="#about" onClick={closeMenu}>About</a>
            <a href="#categories" onClick={closeMenu}>Features</a>
            <a href="#contact" onClick={closeMenu}>Contact</a>
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleLogin}
            >
              Login
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRegister}
            >
              Get Started →
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
