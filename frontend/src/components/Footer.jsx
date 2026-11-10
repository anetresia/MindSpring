import logo from "../assets/mindspring-logo.png";

function Footer() {
  return (
    <footer id="footer" className="footer">

      {/* Footer Main Content */}
      <div className="footer-main">
        {/* Brand */}
        <div className="footer-brand">
          <a href="#home">
            <img src={logo} alt="MindSpring Logo" />
          </a>

          <p>
            Bringing daily life skills to life through playful,
            personalized learning.
          </p>

          <div className="social-links">
            <a href="#footer" aria-label="Facebook">f</a>
            <a href="#footer" aria-label="Instagram">◎</a>
            <a href="#footer" aria-label="YouTube">▶</a>
            <a href="#footer" aria-label="LinkedIn">in</a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h3>Quick Links</h3>
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#categories">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#contact">Contact</a>
        </div>

        {/* Learning */}
        <div className="footer-column">
          <h3>Learning</h3>
          <a href="#categories">Personal Hygiene</a>
          <a href="#categories">Communication Skills</a>
          <a href="#categories">Public &amp; Community Skills</a>
        </div>

        {/* Contact */}
        <div className="footer-column">
          <h3>Contact</h3>
          <a href="mailto:info@mindspring.com">
            ✉ info@mindspring.com
          </a>
          <span>📍 Jaffna, Sri Lanka</span>
          <a href="tel:+94761234567">
            ☎ +94 76 123 4567
          </a>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <p>
          © 2026 MindSpring. Made with care for brighter tomorrows.
        </p>

        <div className="footer-bottom-links">
          <a href="#footer">Privacy Policy</a>
          <span>|</span>
          <a href="#footer">Terms of Service</a>
          <span>|</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;