import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminTicketsPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const { user, loading } = useAuth();

  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/");
  }, [user, loading]);

  const { data: tickets, refetch: refetchTickets } = api.tickets.listAll.useQuery();
  const { data: ticketDetail, refetch: refetchDetail } = api.tickets.getTicket.useQuery(
    { ticketId: selectedTicket! }, { enabled: !!selectedTicket },
  );

  const updateStatus = api.tickets.updateStatus.useMutation({
    onSuccess: () => { refetchTickets(); refetchDetail(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const addMsg = api.tickets.addMessage.useMutation({
    onSuccess: () => { refetchDetail(); refetchTickets(); setNewMsg(""); toast.success("Reply sent"); },
    onError: (e) => toast.error(e.message),
  });

  const inputStyle = { background: "var(--input)", border: `1.5px solid ${"var(--border)"}`, color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.65rem 1rem", fontSize: "0.9rem", fontFamily: "'Cairo', sans-serif", width: "100%", outline: "none" };
  const statusColor = (s: string) => s === "open" ? "var(--success)" : s === "in_progress" ? "var(--accent)" : s === "resolved" ? "var(--primary)" : "var(--muted-foreground)";

  if (loading || !user || user.role !== "admin") return null;

  if (selectedTicket && ticketDetail) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
        <div className="max-w-lg mx-auto">
          <button onClick={() => { setSelectedTicket(null); setNewMsg(""); }} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>
            ← {t("العودة للتذاكر", "Back to tickets")}
          </button>

          <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "1rem" }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h2 className="text-lg font-black">{ticketDetail.ticket.subject}</h2>
              <span style={{ background: statusColor(ticketDetail.ticket.status) + "20", color: statusColor(ticketDetail.ticket.status), padding: "0.2rem 0.6rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>{ticketDetail.ticket.status}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{ticketDetail.ticket.category} · {ticketDetail.ticket.priority} · {t("من", "By")} {ticketDetail.ticket.userId}</p>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {["open", "in_progress", "resolved", "closed"].map(st => (
              <button key={st} onClick={() => updateStatus.mutate({ ticketId: selectedTicket!, status: st as any })}
                style={{ background: "var(--input)", border: `1px solid ${"var(--border)"}`, color: "var(--foreground)", padding: "0.35rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>
                {st}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "1rem" }}>
            <h3 className="font-bold text-sm mb-3">{t("الرسائل", "Messages")}</h3>
            {ticketDetail.messages.length === 0 ? (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>{t("لا توجد رسائل بعد", "No messages yet")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ticketDetail.messages.map((m: any) => (
                  <div key={m.id} style={{ background: "var(--input)", borderRadius: "0.75rem", padding: "0.75rem" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{m.userId === user.id ? t("أنت", "You") : t("المستخدم", "User") + " " + m.userId}</p>
                    <p className="text-sm">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ticketDetail.ticket.status !== "closed" && (
            <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem" }}>
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={t("اكتب ردك...", "Write your reply...")} rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: "0.75rem" }} />
              <motion.button onClick={() => addMsg.mutate({ ticketId: selectedTicket!, message: newMsg })} disabled={addMsg.isPending || !newMsg}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: "var(--primary)", color: "white", padding: "0.6rem 1.5rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif" }}>
                {t("إرسال", "Send")}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/")} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>← {t("العودة", "Back")}</button>
        <h1 className="text-2xl font-black mb-6">{t("إدارة تذاكر الدعم", "Support Ticket Management")}</h1>

        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem" }}>
          {!tickets || tickets.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)" }}>{t("لا توجد تذاكر", "No tickets")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tickets.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedTicket(t.id)}
                  style={{ background: "var(--input)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.75rem", padding: "0.75rem", textAlign: dir === "rtl" ? "right" : "left", fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-sm">{t.subject}</span>
                    <span style={{ background: statusColor(t.status) + "20", color: statusColor(t.status), padding: "0.15rem 0.5rem", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 700 }}>{t.status}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{t.category} · {t.priority} · {t.userId}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
