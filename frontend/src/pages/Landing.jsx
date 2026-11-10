
import { useState } from "react";

import heroBg from "../assets/hero-bg.png";
import aboutIllustration from "../assets/about-illustration.png";

import personalHygieneImage from "../assets/personal-hygiene.png";
import communicationImage from "../assets/communication-skills.png";
import communityImage from "../assets/community-skills.png";

// Contact background image
import contactBg from "../assets/contact-girl-bg.png";

// Hero feature card images
import dailyLifeImage from "../assets/daily-life.png";
import heroCommunicationImage from "../assets/communication.png";
import socialSkillsImage from "../assets/social-skills.png";
import independenceImage from "../assets/independence.png";

// Learning categories
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
  // Contact form states
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  // Handle Contact form input changes
  function handleContactChange(event) {
    const { name, value } = event.target;

    setContactData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setContactError("");
    setContactSuccess("");
  }

  // Submit Contact form to FastAPI
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

          {/* HERO FEATURE CARDS */}
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
      <section id="about" className="about-section section-padding">
        <div className="about-illustration">
          <img
            src={aboutIllustration}
            alt="MindSpring children learning illustration"
            className="about-illustration-image"
          />
        </div>

        <div className="about-content">
          <span className="eyebrow">ABOUT MINDSPRING</span>

          <h2>
            Learning that feels
            <br />
            like <span className="pink-text">play.</span>
          </h2>

          <p>
            Every child has their own way of discovering the world.
            MindSpring helps children explore daily life skills through
            friendly cartoon lessons and interactive activities.
          </p>

          <p>
            Parents can personalize learning based on their child's
            language and preferences, making learning more comfortable
            and enjoyable.
          </p>

          <a href="#categories" className="btn btn-outline-pink">
            Learn More →
          </a>
        </div>
      </section>

      {/* LEARNING CATEGORIES */}
      <section
        id="categories"
        className="categories-section section-padding"
      >
        <div className="section-heading">
          <span className="eyebrow">OUR LEARNING CATEGORIES</span>

          <h2>
            Real life skills for a{" "}
            <span className="pink-text">brighter tomorrow.</span>
          </h2>

          <p>
            Explore fun and simple video lessons in everyday life skills.
          </p>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <article
              className={`category-card ${category.color}-card`}
              key={category.title}
            >
              <div className="category-art">
                <img
                  src={category.image}
                  alt={`${category.title} learning illustration`}
                  className="category-art-image"
                />
              </div>

              <div className="category-info">
                <h3>{category.title}</h3>
                <p>{category.description}</p>

                <details className="topic-details">
                  <summary>Explore learning videos</summary>

                  <ul>
                    {category.topics.map((topic) => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                </details>

                <a
                  href="#categories"
                  className="category-arrow"
                  aria-label={`Explore ${category.title}`}
                >
                  →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

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
          {/* Left side contact text */}
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

          {/* Right side contact form */}
          <div className="contact-form-card">
            <div className="contact-form-heading">
              <h3>Send us a message</h3>

              <p>
                Fill in the form and we'll get back to you soon.
              </p>
            </div>

            <form
              className="contact-form"
              onSubmit={handleContactSubmit}
            >
              {/* Name and Email */}
              <div className="contact-form-row">
                <div className="contact-form-group">
                  <div className="contact-input-wrapper">
                    <span
                      className="contact-input-icon"
                      aria-hidden="true"
                    >
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
                    <span
                      className="contact-input-icon"
                      aria-hidden="true"
                    >
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

              {/* Subject */}
              <div className="contact-form-group">
                <div className="contact-input-wrapper">
                  <span
                    className="contact-input-icon"
                    aria-hidden="true"
                  >
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

              {/* Message */}
              <div className="contact-form-group">
                <div className="contact-input-wrapper contact-textarea-wrapper">
                  <span
                    className="contact-input-icon"
                    aria-hidden="true"
                  >
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

              {/* Error Message */}
              {contactError && (
                <p className="contact-error" role="alert">
                  {contactError}
                </p>
              )}

              {/* Success Message */}
              {contactSuccess && (
                <p className="contact-success" role="status">
                  {contactSuccess}
                </p>
              )}

              {/* Submit Button */}
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
