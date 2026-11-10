import { useState } from "react";

import heroBg from "../assets/hero-bg.png";
import aboutBg from "../assets/about-bg.png";

import personalHygieneImage from "../assets/personal-hygiene.png";
import communicationImage from "../assets/communication-skills.png";
import communityImage from "../assets/community-skills.png";

import contactBg from "../assets/contact-girl-bg.png";

import dailyLifeImage from "../assets/daily-life.png";
import heroCommunicationImage from "../assets/communication.png";
import socialSkillsImage from "../assets/social-skills.png";
import independenceImage from "../assets/independence.png";

import FAQ from "../components/FAQ";

const categories = [
  {
    icon: "🪥",
    title: "Personal Hygiene",
    description: "Daily care for a healthy me.",
    color: "hygiene",
    image: personalHygieneImage,
    topics: [
      "Brushing Teeth",
      "Washing Hands",
      "Combing Hair",
      "Nail Trimming",
      "Washing Face",
      "Using a Tissue",
    ],
  },
  {
    icon: "💬",
    title: "Communication Skills",
    description: "Express, share and connect.",
    color: "communication",
    image: communicationImage,
    topics: [
      "Saying Hello and Goodbye",
      "Asking for Help",
      "Expressing Feelings",
      "Saying Yes or No",
      "Asking for What You Need",
      "Saying Please and Thank You",
    ],
  },
  {
    icon: "🚦",
    title: "Public & Community Skills",
    description: "Be safe and confident outside.",
    color: "community",
    image: communityImage,
    topics: [
      "Road Safety",
      "Waiting in a Queue",
      "Shopping at a Store",
      "Following Public Place Rules",
      "Asking a Trusted Adult for Help",
      "Staying with Your Caregiver",
    ],
  },
];

function Landing({ onRegisterClick }) {
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  function handleContactChange(event) {
    const { name, value } = event.target;

    setContactData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setContactError("");
    setContactSuccess("");
  }

  async function handleContactSubmit(event) {
    event.preventDefault();

    setContactError("");
    setContactSuccess("");

    if (
      !contactData.name.trim() ||
      !contactData.email.trim() ||
      !contactData.subject.trim() ||
      !contactData.message.trim()
    ) {
      setContactError("Please fill in all fields.");
      return;
    }

    setContactLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/contact/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactData.name.trim(),
          email: contactData.email.trim(),
          subject: contactData.subject.trim(),
          message: contactData.message.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg).join(", ")
          : result.detail || "Unable to send your message. Please try again.";

        throw new Error(errorMessage);
      }

      setContactSuccess(
        "Thank you for contacting us! Your message has been sent successfully."
      );

      setContactData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setContactError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <main>
      {/* HERO SECTION */}
      <section
        id="home"
        className="hero-section"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-purple">Brighter Skills</span>
            <span className="hero-pink">Happier</span>
            <span className="hero-green">Tomorrows</span>
          </h1>

          <p>
            An AI-powered learning platform for children with autism to build daily
            <br />
            life skills through fun, interactive and personalized learning.
          </p>

          <div className="hero-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onRegisterClick}
            >
              Get Started →
            </button>

            <a href="#about" className="hero-watch-button">
              <span className="watch-play-icon">▶</span>
              Watch Video
            </a>
          </div>

          <div className="hero-feature-cards">
            <div className="hero-feature-card">
              <img
                src={dailyLifeImage}
                alt="Daily Life Skills"
                className="hero-feature-image"
              />
              <span>
                Daily Life
                <br />
                Skills
              </span>
            </div>

            <div className="hero-feature-card">
              <img
                src={heroCommunicationImage}
                alt="Communication"
                className="hero-feature-image"
              />
              <span>Communication</span>
            </div>

            <div className="hero-feature-card">
              <img
                src={socialSkillsImage}
                alt="Social Skills"
                className="hero-feature-image"
              />
              <span>Social Skills</span>
            </div>

            <div className="hero-feature-card">
              <img
                src={independenceImage}
                alt="Independence"
                className="hero-feature-image"
              />
              <span>Independence</span>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        className="about-section section-padding"
        style={{
          backgroundImage: `url(${aboutBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="about-content">
          <span className="eyebrow">ABOUT MINDSPRING</span>

          <h2>
            Learning that
            <br />
            feels like <span className="pink-text">play.</span>
          </h2>

          <p>
            MindSpring is a fun and friendly learning platform
            that helps children build real life skills through
            simple, engaging and interactive lessons.
          </p>

          <a
            href="#categories"
            className="btn btn-outline-pink about-learn-more"
          >
            Learn More →
          </a>
        </div>

        <div className="about-highlights">
          <article className="about-highlight-card goal-card">
            <div className="about-highlight-icon" aria-hidden="true">
              🎯
            </div>

            <div className="about-highlight-text">
              <h3>Our Goal</h3>
              <p>
                To make everyday learning easy,
                fun and meaningful for children.
              </p>
            </div>
          </article>

          <article className="about-highlight-card approach-card">
            <div className="about-highlight-icon" aria-hidden="true">
              💗
            </div>

            <div className="about-highlight-text">
              <h3>Our Approach</h3>
              <p>
                Real life skills, short lessons and
                child-friendly activities.
              </p>
            </div>
          </article>

          <article className="about-highlight-card impact-card">
            <div className="about-highlight-icon" aria-hidden="true">
              🌱
            </div>

            <div className="about-highlight-text">
              <h3>Our Impact</h3>
              <p>
                Helping children grow into confident,
                independent and caring individuals.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="categories" className="categories-section">
        <div className="features-heading">
          <span className="features-badge">
            <span aria-hidden="true">✨</span>
            Features
          </span>

          <h2>
            Everything your child needs to <span>grow.</span>
          </h2>

          <p>
            Simple, fun and practical lessons for real life skills.
          </p>
        </div>

        <div className="category-grid">
          {categories.map((category, index) => (
            <article
              className={`category-card ${category.color}-card`}
              key={category.title}
            >
              <div className="feature-number">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="category-info">
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="features-action">
          <a href="#categories" className="features-explore-button">
            Explore All Learning Videos <span>→</span>
          </a>
        </div>

        <span className="features-decoration features-decoration-left">
          ✦
        </span>

        <span className="features-decoration features-decoration-right">
          ✦
        </span>
      </section>

      {/* FAQ SECTION */}
      <FAQ />

      {/* CONTACT SECTION */}
      <section id="contact" className="contact-section">
        <div
          className="contact-container"
          style={{
            backgroundImage: `url(${contactBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="contact-copy">
            <span className="contact-eyebrow">CONTACT US</span>

            <h2>
              Let's Talk!
              <br />
              <span>We're Here for You</span>
            </h2>

            <p>
              Have questions, suggestions, or need support?
              We'd love to hear from you. Our team is here
              to help you and your child's learning journey.
            </p>
          </div>

          <div className="contact-form-card">
            <div className="contact-form-heading">
              <h3>Send us a message</h3>
              <p>Fill in the form and we'll get back to you soon.</p>
            </div>

            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="contact-form-row">
                <div className="contact-form-group">
                  <div className="contact-input-wrapper">
                    <span className="contact-input-icon" aria-hidden="true">
                      ♙
                    </span>

                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      placeholder="Your Name"
                      value={contactData.name}
                      onChange={handleContactChange}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="contact-form-group">
                  <div className="contact-input-wrapper">
                    <span className="contact-input-icon" aria-hidden="true">
                      ✉
                    </span>

                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      placeholder="Your Email"
                      value={contactData.email}
                      onChange={handleContactChange}
                      maxLength={150}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="contact-form-group">
                <div className="contact-input-wrapper">
                  <span className="contact-input-icon" aria-hidden="true">
                    ▤
                  </span>

                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    placeholder="Subject"
                    value={contactData.subject}
                    onChange={handleContactChange}
                    maxLength={150}
                    required
                  />
                </div>
              </div>

              <div className="contact-form-group">
                <div className="contact-input-wrapper contact-textarea-wrapper">
                  <span className="contact-input-icon" aria-hidden="true">
                    ▤
                  </span>

                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="Your Message"
                    rows="5"
                    value={contactData.message}
                    onChange={handleContactChange}
                    maxLength={5000}
                    required
                  />
                </div>
              </div>

              {contactError && (
                <p className="contact-error" role="alert">
                  {contactError}
                </p>
              )}

              {contactSuccess && (
                <p className="contact-success" role="status">
                  {contactSuccess}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary contact-submit-btn"
                disabled={contactLoading}
              >
                {contactLoading ? "Sending..." : "Let's Connect →"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Landing;