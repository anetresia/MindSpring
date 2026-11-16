
import { useEffect, useState } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import { API_URL, getAuthHeaders } from "../api";
import "../styles/admin/admin-contact.css";

function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function requestApi(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(true),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let message = "Something went wrong.";

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail.map((item) => item.msg).join(", ");
      }

      throw new Error(message);
    }

    return data;
  }

  async function loadMessages() {
    try {
      setLoading(true);
      setError("");

      const data = await requestApi("/admin/contact-messages/");

      const list = Array.isArray(data) ? data : [];
      setMessages(list);

      setSelectedMessage((previous) => {
        if (!previous) return null;

        return (
          list.find((item) => item.id === previous.id) || null
        );
      });
    } catch (err) {
      console.error("Contact messages loading error:", err);
      setError(err.message || "Unable to load contact messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  function openMessage(message) {
    setSelectedMessage(message);
    setReply(message.admin_reply || "");
    setError("");
    setSuccess("");
  }

  async function handleReplySubmit(event) {
    event.preventDefault();

    if (!selectedMessage) return;

    if (!reply.trim()) {
      setError("Please enter a reply.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await requestApi(
        `/admin/contact-messages/${selectedMessage.id}/reply`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            admin_reply: reply.trim(),
          }),
        }
      );

      setSuccess("Reply sent successfully.");

      await loadMessages();

      setSelectedMessage((previous) => {
        const updated = messages.find(
          (item) => item.id === previous?.id
        );

        return updated
          ? { ...updated, admin_reply: reply.trim(), status: "Replied" }
          : previous;
      });
    } catch (err) {
      setError(err.message || "Unable to send reply.");
    } finally {
      setSaving(false);
    }
  }

  const filteredMessages = messages.filter((message) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (message.name || "").toLowerCase().includes(searchText) ||
      (message.email || "").toLowerCase().includes(searchText) ||
      (message.subject || "").toLowerCase().includes(searchText) ||
      (message.message || "").toLowerCase().includes(searchText);

    const matchesFilter =
      filter === "All" || message.status === filter;

    return matchesSearch && matchesFilter;
  });

  const unreadCount = messages.filter(
    (message) => message.status !== "Replied"
  ).length;

  const repliedCount = messages.filter(
    (message) => message.status === "Replied"
  ).length;

  function formatDate(date) {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString();
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader title="Contact Messages" />

        <div className="admin-contact-page">
          <div className="admin-contact-heading">
            <div>
              <h2>Contact Us Messages</h2>
              <p>
                View messages submitted through the MindSpring website
                and reply to parents.
              </p>
            </div>

            <button
              type="button"
              className="contact-refresh-btn"
              onClick={loadMessages}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="contact-stats">
            <div className="contact-stat-card">
              <span>Total Messages</span>
              <strong>{messages.length}</strong>
            </div>

            <div className="contact-stat-card">
              <span>Awaiting Reply</span>
              <strong>{unreadCount}</strong>
            </div>

            <div className="contact-stat-card">
              <span>Replied</span>
              <strong>{repliedCount}</strong>
            </div>
          </div>

          {error && (
            <div className="contact-alert contact-alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="contact-alert contact-alert-success">
              {success}
            </div>
          )}

          <div className="contact-toolbar">
            <input
              type="text"
              placeholder="Search name, email or subject..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Messages</option>
              <option value="Unread">Awaiting Reply</option>
              <option value="Replied">Replied</option>
            </select>
          </div>

          {loading ? (
            <div className="contact-empty">
              Loading contact messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="contact-empty">
              <span>✉️</span>
              <h3>No contact messages found</h3>
              <p>
                Messages submitted through the Contact Us form
                will appear here.
              </p>
            </div>
          ) : (
            <div className="contact-content">
              <section className="contact-message-list">
                <div className="contact-section-heading">
                  <h3>Messages</h3>
                  <span>{filteredMessages.length} messages</span>
                </div>

                {filteredMessages.map((message) => (
                  <button
                    type="button"
                    key={message.id}
                    className={`contact-message-item ${
                      selectedMessage?.id === message.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => openMessage(message)}
                  >
                    <div className="contact-message-top">
                      <strong>{message.name}</strong>

                      <span
                        className={`contact-status ${
                          message.status === "Replied"
                            ? "replied"
                            : "unread"
                        }`}
                      >
                        {message.status || "Unread"}
                      </span>
                    </div>

                    <span className="contact-message-email">
                      {message.email}
                    </span>

                    <strong className="contact-message-subject">
                      {message.subject}
                    </strong>

                    <p>{message.message}</p>

                    <small>{formatDate(message.created_at)}</small>
                  </button>
                ))}
              </section>

              <section className="contact-detail-panel">
                {!selectedMessage ? (
                  <div className="contact-select-message">
                    <span>📩</span>
                    <h3>Select a message</h3>
                    <p>
                      Select a message from the list to view its
                      details and send a reply.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="contact-detail-heading">
                      <div>
                        <span>CONTACT MESSAGE</span>
                        <h2>{selectedMessage.subject}</h2>
                      </div>

                      <span
                        className={`contact-status ${
                          selectedMessage.status === "Replied"
                            ? "replied"
                            : "unread"
                        }`}
                      >
                        {selectedMessage.status || "Unread"}
                      </span>
                    </div>

                    <div className="contact-sender-details">
                      <div className="contact-avatar">
                        {(selectedMessage.name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>{selectedMessage.name}</strong>
                        <a href={`mailto:${selectedMessage.email}`}>
                          {selectedMessage.email}
                        </a>
                      </div>
                    </div>

                    <div className="contact-original-message">
                      <div className="contact-original-heading">
                        <strong>Original Message</strong>
                        <small>
                          {formatDate(selectedMessage.created_at)}
                        </small>
                      </div>

                      <p>{selectedMessage.message}</p>
                    </div>

                    {selectedMessage.admin_reply && (
                      <div className="contact-previous-reply">
                        <strong>Previous Admin Reply</strong>
                        <p>{selectedMessage.admin_reply}</p>

                        {selectedMessage.replied_at && (
                          <small>
                            Replied on:{" "}
                            {formatDate(selectedMessage.replied_at)}
                          </small>
                        )}
                      </div>
                    )}

                    <form
                      className="contact-reply-form"
                      onSubmit={handleReplySubmit}
                    >
                      <label htmlFor="admin-contact-reply">
                        {selectedMessage.admin_reply
                          ? "Update Reply"
                          : "Write Your Reply"}
                      </label>

                      <textarea
                        id="admin-contact-reply"
                        value={reply}
                        onChange={(event) =>
                          setReply(event.target.value)
                        }
                        placeholder="Type your reply here..."
                        rows={6}
                        maxLength={5000}
                        required
                      />

                      <small>{reply.length}/5000 characters</small>

                      <button
                        type="submit"
                        disabled={saving || !reply.trim()}
                      >
                        {saving
                          ? "Sending..."
                          : selectedMessage.admin_reply
                          ? "Update Reply"
                          : "Send Reply"}
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminContact;
