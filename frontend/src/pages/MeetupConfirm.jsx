import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function MeetupConfirm({ notify }) {
  const { token } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await api.confirmMeetup(token);
      setStatus(res);
      if (res.completed) notify("Meetup confirmed by both parties!");
      else notify("Your confirmation recorded!");
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{"\ud83e\udd1d"}</div>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Meetup Confirmation</div>
      <div className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Tap below to confirm you've met and completed the transaction.
      </div>

      {!status ? (
        <Button onClick={confirm} disabled={busy}>
          {busy ? "Confirming..." : "Confirm Meetup"}
        </Button>
      ) : (
        <Card>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
            <div style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: status.seller_confirmed ? "rgba(46,204,113,.15)" : "var(--panel2)",
              border: `1px solid ${status.seller_confirmed ? "var(--green, #2ecc71)" : "var(--border)"}`,
              color: status.seller_confirmed ? "var(--green, #2ecc71)" : "var(--muted)",
            }}>
              Seller {status.seller_confirmed ? "\u2713" : "pending"}
            </div>
            <div style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: status.buyer_confirmed ? "rgba(46,204,113,.15)" : "var(--panel2)",
              border: `1px solid ${status.buyer_confirmed ? "var(--green, #2ecc71)" : "var(--border)"}`,
              color: status.buyer_confirmed ? "var(--green, #2ecc71)" : "var(--muted)",
            }}>
              Buyer {status.buyer_confirmed ? "\u2713" : "pending"}
            </div>
          </div>
          {status.completed ? (
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--green, #2ecc71)" }}>
              {"\u2705"} Transaction Complete!
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              Waiting for the other party to confirm...
            </div>
          )}
        </Card>
      )}

      <div style={{ marginTop: 24 }}>
        <button onClick={() => nav("/")} style={{
          background: "none", border: "none", color: "var(--cyan)",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
