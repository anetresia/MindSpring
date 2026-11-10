import { useState } from "react";
import "../styles/faq.css";

function FAQ() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqItems = [
    {
      question: "What is MindSpring?",
      answer:
        "MindSpring is a child-friendly learning platform designed to support children with autism through simple, interactive and engaging learning activities.",
    },
    {
      question: "Who is MindSpring for?",
      answer:
        "MindSpring is designed for children with autism and their parents or caregivers who want to support their children's learning journey.",
    },
    {
      question: "How does MindSpring support children with autism?",
      answer:
        "MindSpring provides structured lessons, visual learning materials, videos and image-based quizzes. Children can learn at their own pace in a simple and supportive environment.",
    },
    {
      question: "What kind of activities are available?",
      answer:
        "Children can explore learning topics, watch lesson videos, answer image-based questions and earn stars based on their correct answers.",
    },
    {
      question: "Do I need a subscription to use MindSpring?",
      answer:
        "Please check the available subscription options on MindSpring to learn about the plans and access available.",
    },
    {
      question: "Is my child's data safe and private?",
      answer:
        "MindSpring is designed with parent and child accounts. Parents can access information associated with their own children. Please refer to our Privacy Policy for details about data handling and protection.",
    },
  ];

  const toggleFAQ = (index) => {
    setActiveIndex((currentIndex) =>
      currentIndex === index ? null : index
    );
  };

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">

        <div className="faq-header">
          <span className="faq-subtitle">
            Frequently Asked Questions
          </span>

          <h2>Got Questions?</h2>

          <p>
            Find quick answers to common questions about MindSpring.
          </p>
        </div>

        <div className="faq-card">
          {faqItems.map((item, index) => {
            const isOpen = activeIndex === index;

            return (
              <div
                className={`faq-item ${isOpen ? "faq-active" : ""}`}
                key={index}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{item.question}</span>

                  <span
                    className={`faq-arrow ${
                      isOpen ? "arrow-open" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ﹀
                  </span>
                </button>

                <div
                  id={`faq-answer-${index}`}
                  className={`faq-answer ${
                    isOpen ? "answer-open" : ""
                  }`}
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default FAQ;